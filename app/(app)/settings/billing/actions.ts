"use server";

import { createClient } from "@/lib/supabase/server";
import { cashfree } from "@/lib/billing/cashfree";
import { revalidatePath } from "next/cache";

export async function cancelSubscriptionAction(subscriptionId: string) {
  try {
    const supabase = await createClient();

    // 1. Authenticate user
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return { success: false, error: "Unauthorized" };
    }

    // 2. Fetch user profile and ensure SUPER_ADMIN role
    const { data: userProfile } = await supabase
      .from("users")
      .select("role, company_id")
      .eq("auth_user_id", user.id)
      .single();

    if (!userProfile || userProfile.role !== "SUPER_ADMIN") {
      return { success: false, error: "Only the company Super Admin can manage billing." };
    }

    // 3. Call Cashfree to cancel the active subscription mandate
    console.log(`🔌 Requesting Cashfree to cancel subscription ${subscriptionId}...`);
    try {
      await cashfree.cancelSubscription(subscriptionId);
    } catch (cfErr: any) {
      console.warn("⚠️ Cashfree cancellation API warning/error:", cfErr.message);
      // Even if Cashfree throws an error (e.g. subscription already inactive), 
      // we still proceed to update our local state to keep tables in sync.
    }

    // 4. Update local subscriptions table to status CANCELLED
    const { error: subError } = await supabase
      .from("subscriptions")
      .update({
        status: "CANCELLED",
        cancelled_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .eq("cashfree_sub_id", subscriptionId);

    if (subError) {
      console.error("❌ Failed to update subscription status to CANCELLED in DB:", subError);
      return { success: false, error: "Failed to update subscription row" };
    }

    // 5. Update companies table to status CANCELLED
    const { error: companyError } = await supabase
      .from("companies")
      .update({
        status: "CANCELLED",
        updated_at: new Date().toISOString(),
      })
      .eq("id", userProfile.company_id);

    if (companyError) {
      console.error("❌ Failed to update company status to CANCELLED in DB:", companyError);
      return { success: false, error: "Failed to update company row" };
    }

    console.log(`✅ Subscription ${subscriptionId} cancelled successfully.`);
    revalidatePath("/settings/billing");
    return { success: true };

  } catch (err: any) {
    console.error("❌ Cancel Subscription Server Action Error:", err);
    return { success: false, error: err.message || "Failed to cancel subscription." };
  }
}
