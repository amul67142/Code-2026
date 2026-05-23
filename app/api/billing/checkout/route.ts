import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { razorpayClient } from "@/lib/billing/razorpay";
import { UserRole } from "@/types";

export async function POST(request: Request) {
  try {
    const supabase = await createClient();
    
    // 1. Authenticate user
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // 2. Fetch user profile
    const { data: userProfile, error: profileError } = await supabase
      .from("users")
      .select("id, role, company_id, name, email, phone")
      .eq("auth_user_id", user.id)
      .single();

    if (profileError || !userProfile) {
      return NextResponse.json({ error: "User profile not found" }, { status: 404 });
    }

    // 3. Ensure role is SUPER_ADMIN
    if (userProfile.role !== UserRole.SUPER_ADMIN) {
      return NextResponse.json({ error: "Only the company Super Admin can manage billing." }, { status: 403 });
    }

    // 4. Parse payload
    const body = await request.json().catch(() => ({}));
    const { planId } = body;
    if (!planId) {
      return NextResponse.json({ error: "Missing planId parameter" }, { status: 400 });
    }

    // 5. Fetch plan from database
    const { data: plan, error: planError } = await supabase
      .from("pricing_plans")
      .select("*")
      .eq("id", planId)
      .single();

    if (planError || !plan) {
      return NextResponse.json({ error: "Selected plan not found" }, { status: 404 });
    }

    // 6. Block checkout for manual Enterprise plans
    if (plan.is_custom_price) {
      return NextResponse.json({ 
        error: "Enterprise plans are managed manually. Please contact our support team to upgrade." 
      }, { status: 400 });
    }

    // 7. Get company details
    const { data: company } = await supabase
      .from("companies")
      .select("name, billing_email")
      .eq("id", userProfile.company_id)
      .single();

    // 8. Generate dynamic checkout return URL
    const origin = request.headers.get("origin") || process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
    const returnUrl = `${origin}/settings/billing`;

    // 9. Sync Plan with Razorpay dynamically on checkout
    let razorpayPlanId = (plan as any).razorpay_plan_id;

    if (!razorpayPlanId) {
      try {
        const rzpPlan = await razorpayClient.createPlan(plan.name, plan.price_inr);
        razorpayPlanId = rzpPlan.id;

        // Save generated Razorpay Plan ID back to our local pricing_plans table
        const { error: updatePlanError } = await supabase
          .from("pricing_plans")
          .update({ razorpay_plan_id: razorpayPlanId })
          .eq("id", plan.id);

        if (updatePlanError) {
          console.error("⚠️ Failed to store razorpay_plan_id in database pricing_plans table:", updatePlanError);
        } else {
          console.log(`✅ Dynamically registered plan ${plan.name} on Razorpay: ${razorpayPlanId}`);
        }
      } catch (createPlanError: any) {
        console.error("❌ Failed to create plan on Razorpay:", createPlanError);
        const errorMsg = 
          createPlanError.error?.description || 
          createPlanError.description || 
          createPlanError.message || 
          JSON.stringify(createPlanError);
        throw new Error(`Razorpay plan creation failed: ${errorMsg}`);
      }
    }

    // 10. Call Razorpay Subscriptions API to initialize mandate
    console.log(`🚀 Creating subscription on Razorpay linked to Plan ID: ${razorpayPlanId}`);
    const rzpSubscription = await razorpayClient.createSubscription({
      plan_id: razorpayPlanId,
      customer_name: userProfile.name || company?.name || "Company Admin",
      customer_email: company?.billing_email || userProfile.email,
      customer_phone: userProfile.phone || "9999999999", // Fallback to pass schema validation
      return_url: returnUrl,
    });

    console.log("✅ Razorpay Subscription created successfully:", rzpSubscription);

    // 11. Write/Upsert record to local database under company context
    const { error: upsertError } = await supabase
      .from("subscriptions")
      .upsert({
        company_id: userProfile.company_id,
        plan_id: plan.id,
        razorpay_sub_id: rzpSubscription.id,
        razorpay_plan_id: razorpayPlanId,
        status: "TRIALING", // Initial status as trialing until webhook confirms active payment
        amount_inr: plan.price_inr,
        current_period_start: new Date().toISOString(),
        current_period_end: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
      }, { onConflict: "company_id" });

    if (upsertError) {
      console.error("❌ Failed to write subscription to DB:", upsertError);
      throw upsertError;
    }

    // 12. Return the hosted redirect short_url to the frontend!
    return NextResponse.json({
      subscriptionId: rzpSubscription.id,
      shortUrl: rzpSubscription.short_url,
    });

  } catch (err: any) {
    console.error("❌ Checkout Route Error:", err);
    return NextResponse.json(
      { error: err.message || "Internal Server Error" },
      { status: 500 }
    );
  }
}
