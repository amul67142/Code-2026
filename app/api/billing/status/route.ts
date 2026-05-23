import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function GET() {
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
      .select("id, company_id")
      .eq("auth_user_id", user.id)
      .single();

    if (profileError || !userProfile) {
      return NextResponse.json({ error: "User profile not found" }, { status: 404 });
    }

    // 3. Fetch company trial & legacy info
    const { data: company, error: companyError } = await supabase
      .from("companies")
      .select("id, name, plan, status, trial_ends_at, billing_email")
      .eq("id", userProfile.company_id)
      .single();

    if (companyError || !company) {
      return NextResponse.json({ error: "Company details not found" }, { status: 404 });
    }

    // 4. Fetch subscription row with joined dynamic plan
    const { data: subscription } = await supabase
      .from("subscriptions")
      .select(`
        id,
        status,
        cashfree_sub_id,
        current_period_start,
        current_period_end,
        cancelled_at,
        amount_inr,
        plan_id,
        pricing_plans:plan_id (
          id,
          name,
          description,
          price_inr,
          period,
          features
        )
      `)
      .eq("company_id", company.id)
      .maybeSingle();

    // 5. Fetch invoice history for this company
    const { data: invoices } = await supabase
      .from("invoices")
      .select("*")
      .eq("company_id", company.id)
      .order("created_at", { ascending: false });

    // 6. Calculate trial statistics
    const now = new Date();
    const trialEnds = company.trial_ends_at ? new Date(company.trial_ends_at) : null;
    const isTrialActive = trialEnds ? trialEnds > now : false;
    const trialDaysRemaining = trialEnds 
      ? Math.max(0, Math.ceil((trialEnds.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)))
      : 0;

    return NextResponse.json({
      company: {
        id: company.id,
        name: company.name,
        legacyPlan: company.plan,
        status: company.status,
        billingEmail: company.billing_email,
      },
      subscription: subscription || null,
      trial: {
        endsAt: company.trial_ends_at,
        isActive: isTrialActive && company.status === "TRIAL",
        daysRemaining: trialDaysRemaining,
      },
      invoices: invoices || [],
    });

  } catch (err: any) {
    console.error("❌ Billing Status Route Error:", err);
    return NextResponse.json(
      { error: err.message || "Internal Server Error" },
      { status: 500 }
    );
  }
}
