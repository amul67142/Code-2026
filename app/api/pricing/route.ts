import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { getINRtoUSDRate, formatINR } from "@/lib/currency";

export const revalidate = 300; // revalidate every 5 minutes

export async function GET() {
  try {
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    );

    const { data: plans, error } = await supabase
      .from("pricing_plans")
      .select("*")
      .order("sort_order", { ascending: true });

    if (error) throw error;

    const rate = await getINRtoUSDRate();

    const enrichedPlans = (plans || []).map((plan) => ({
      ...plan,
      priceINR: plan.is_custom_price ? "Custom" : formatINR(plan.price_inr),
      priceUSD: plan.is_custom_price
        ? "Custom"
        : `$${Math.round(plan.price_inr / rate)}`,
    }));

    return NextResponse.json(enrichedPlans);
  } catch (err: any) {
    console.error("[pricing API]", err);
    return NextResponse.json(
      { error: "Failed to fetch pricing" },
      { status: 500 }
    );
  }
}
