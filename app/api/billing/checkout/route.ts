import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { cashfree } from "@/lib/billing/cashfree";
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
    const subscriptionId = `sub_${crypto.randomUUID().replace(/-/g, "")}`;
    const returnUrl = `${origin}/settings/billing?session_id=${subscriptionId}`;

    // 9. Prepare deterministic Plan ID on Cashfree
    const planIdOnCashfree = `plan_${plan.name.toLowerCase()}_${plan.price_inr}`;
    let cashfreePlanExists = false;

    try {
      console.log(`🔍 Checking if plan ${planIdOnCashfree} already exists on Cashfree...`);
      await cashfree.getPlan(planIdOnCashfree);
      cashfreePlanExists = true;
      console.log(`✅ Plan ${planIdOnCashfree} exists on Cashfree.`);
    } catch (getPlanError) {
      console.log(`ℹ️ Plan ${planIdOnCashfree} not found on Cashfree. Proceeding to create it...`);
    }

    // Register plan dynamically on Cashfree if it doesn't exist
    if (!cashfreePlanExists) {
      try {
        await cashfree.createPlan({
          plan_id: planIdOnCashfree,
          plan_name: `${plan.name} Plan - ${plan.price_inr} INR/mo`,
          plan_type: "PERIODIC",
          plan_currency: "INR",
          plan_max_amount: plan.price_inr,
          plan_recurring_amount: plan.price_inr,
          plan_intervals: 1,
          plan_interval_type: "MONTH",
        });
        console.log(`✅ Plan ${planIdOnCashfree} successfully registered on Cashfree.`);
      } catch (createPlanError: any) {
        console.error(`❌ Failed to create plan ${planIdOnCashfree} on Cashfree:`, createPlanError);
        throw new Error(`Plan creation failed: ${createPlanError.message}`);
      }
    }

    // 10. Call Cashfree to initiate Subscription Session referencing the Plan ID
    console.log(`🚀 Creating subscription ${subscriptionId} on Cashfree linked to plan: ${planIdOnCashfree}`);
    const response = await cashfree.createSubscription({
      subscription_id: subscriptionId,
      customer_details: {
        customer_name: userProfile.name || company?.name || "Company Admin",
        customer_email: company?.billing_email || userProfile.email,
        customer_phone: userProfile.phone || "9999999999", // Fallback dummy to pass schema validation
      },
      plan_details: {
        plan_id: planIdOnCashfree,
      },
      return_url: returnUrl,
    });

    console.log("✅ Cashfree Subscription created successfully:", response);

    // 11. Write/Upsert record to local database under company context
    const { error: upsertError } = await supabase
      .from("subscriptions")
      .upsert({
        company_id: userProfile.company_id,
        plan_id: plan.id,
        cashfree_sub_id: subscriptionId,
        cashfree_plan_id: planIdOnCashfree,
        status: "TRIALING", // Set initial status as trialing until webhook confirms mandate active
        amount_inr: plan.price_inr,
        current_period_start: new Date().toISOString(),
        current_period_end: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(), // Temporary 30 days period extension
      }, { onConflict: "company_id" });

    if (upsertError) {
      console.error("❌ Failed to write subscription to DB:", upsertError);
      throw upsertError;
    }

    // 12. Return the authorization checkout link to frontend redirect
    return NextResponse.json({
      subscriptionId,
      authLink: response.subscription_meta?.authorization_link || response.authorization_link,
    });

  } catch (err: any) {
    console.error("❌ Checkout Route Error:", err);
    return NextResponse.json(
      { error: err.message || "Internal Server Error" },
      { status: 500 }
    );
  }
}
