import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { razorpayClient } from "@/lib/billing/razorpay";
import { rateLimit } from "@/lib/rate-limit";
import { UserRole } from "@/types";

const RAZORPAY_KEY_ID = process.env.RAZORPAY_KEY_ID;

export async function POST(request: Request) {
  try {
    const supabase = await createClient();

    // 1. Authenticate user
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Rate limit: checkout creates Razorpay subscriptions — 5/min per user is plenty.
    const rl = rateLimit(`billing-checkout:${user.id}`, 5, 60 * 1000);
    if (!rl.ok) {
      return NextResponse.json(
        { error: "Too many checkout attempts. Please wait a minute and try again." },
        { status: 429, headers: { "Retry-After": String(rl.retryAfterSec) } }
      );
    }

    // 2. Fetch user profile
    let { data: userProfile, error: profileError } = await supabase
      .from("users")
      .select("id, role, company_id, name, email, phone")
      .eq("auth_user_id", user.id)
      .maybeSingle();

    if (!userProfile) {
      // User has just signed up and hasn't paid or onboarded yet.
      // Let's create a pending company and a pending user profile so they can pay.
      // Use Admin Client to bypass RLS policies for initial guest checkout.
      const adminClient = createAdminClient();
      const baseSubdomain = `pending-${Date.now()}-${Math.floor(Math.random() * 10000)}`;
      const { data: newCompany, error: compErr } = await adminClient
        .from("companies")
        .insert({
          name: "Pending Onboarding",
          subdomain: baseSubdomain,
          status: "TRIAL",
          timezone: "Asia/Kolkata",
          currency: "INR",
        })
        .select("id")
        .single();

      if (compErr || !newCompany) {
        console.error("❌ Failed to create pending company:", compErr);
        return NextResponse.json({ error: "Failed to initialize company for checkout" }, { status: 500 });
      }

      const { data: newUserProfile, error: usrErr } = await adminClient
        .from("users")
        .insert({
          auth_user_id: user.id,
          company_id: newCompany.id,
          name: user.email?.split("@")[0] || "User",
          email: user.email,
          role: "SUPER_ADMIN",
          status: "ACTIVE",
          phone: user.user_metadata?.phone || null,
        })
        .select("id, role, company_id, name, email, phone")
        .single();

      if (usrErr || !newUserProfile) {
        console.error("❌ Failed to create pending user profile:", usrErr);
        // rollback
        await adminClient.from("companies").delete().eq("id", newCompany.id);
        return NextResponse.json({ error: "Failed to initialize user profile for checkout" }, { status: 500 });
      }

      userProfile = newUserProfile;
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
    const adminClient = createAdminClient();
    const { error: upsertError } = await adminClient
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

    // 12. Return subscription data for frontend Razorpay Checkout.js inline popup
    return NextResponse.json({
      subscriptionId: rzpSubscription.id,
      razorpayKeyId: RAZORPAY_KEY_ID,
      plan: {
        name: plan.name,
        price_inr: plan.price_inr,
        description: plan.description,
      },
      customer: {
        name: userProfile.name || company?.name || "Company Admin",
        email: company?.billing_email || userProfile.email,
        phone: userProfile.phone || "",
      },
    });

  } catch (err: any) {
    console.error("❌ Checkout Route Error:", err);
    return NextResponse.json(
      { error: err.message || "Internal Server Error" },
      { status: 500 }
    );
  }
}
