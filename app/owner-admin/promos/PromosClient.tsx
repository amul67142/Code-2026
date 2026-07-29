"use client";

import { useState, useTransition } from "react";
import { toast } from "sonner";
import { Ticket, Plus, Loader2, Copy, Power } from "lucide-react";
import { createPromoCode, togglePromoCode, getPromoCodes } from "./actions";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Promo = any;

interface Plan {
  id: string;
  name: string;
  price_inr: number;
}

export default function PromosClient({
  initialPromos,
  plans,
}: {
  initialPromos: Promo[];
  plans: Plan[];
}) {
  const [promos, setPromos] = useState<Promo[]>(initialPromos);
  const [isPending, startTransition] = useTransition();

  // form
  const [code, setCode] = useState("");
  const [description, setDescription] = useState("");
  const [planId, setPlanId] = useState(plans[0]?.id || "");
  const [days, setDays] = useState(30);
  const [maxUses, setMaxUses] = useState(1);

  async function refresh() {
    const res = await getPromoCodes();
    setPromos(res.promos);
  }

  function handleCreate() {
    startTransition(async () => {
      const res = await createPromoCode({
        code,
        description,
        planId: planId || null,
        durationDays: days,
        maxUses,
      });
      if (res.error) {
        toast.error(res.error);
        return;
      }
      toast.success(`Promo ${res.code} created`);
      setCode("");
      setDescription("");
      await refresh();
    });
  }

  function handleToggle(p: Promo) {
    startTransition(async () => {
      const res = await togglePromoCode(p.id, !p.is_active);
      if (res.error) toast.error(res.error);
      else await refresh();
    });
  }

  function copy(c: string) {
    navigator.clipboard.writeText(c).then(() => toast.success("Copied"));
  }

  const input =
    "h-10 rounded-md border border-zinc-700 bg-zinc-900 px-3 text-sm text-zinc-100 placeholder:text-zinc-600 focus:outline-none focus:ring-1 focus:ring-indigo-500";

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <Ticket className="size-5 text-indigo-400" /> Promo Codes
        </h1>
        <p className="text-sm text-zinc-400 mt-1">
          Zero-cost access for investors and testing. A redeemed code activates the granted plan for
          its duration — the workspace locks again when it lapses.
        </p>
      </div>

      {/* Create */}
      <div className="rounded-xl border border-zinc-800 bg-zinc-900/50 p-5 space-y-4">
        <h2 className="text-sm font-semibold text-zinc-300">Create a code</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
          <input
            value={code}
            onChange={(e) => setCode(e.target.value.toUpperCase())}
            placeholder="Code (blank = auto)"
            className={`${input} font-mono uppercase`}
          />
          <input
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Note (e.g. Investor demo)"
            className={input}
          />
          <select value={planId} onChange={(e) => setPlanId(e.target.value)} className={input}>
            {plans.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name} (₹{p.price_inr})
              </option>
            ))}
          </select>
          <input
            type="number"
            min={1}
            value={days}
            onChange={(e) => setDays(parseInt(e.target.value) || 30)}
            placeholder="Days"
            className={input}
            title="Access duration (days)"
          />
          <input
            type="number"
            min={1}
            value={maxUses}
            onChange={(e) => setMaxUses(parseInt(e.target.value) || 1)}
            placeholder="Max uses"
            className={input}
            title="How many companies can redeem it"
          />
        </div>
        <button
          onClick={handleCreate}
          disabled={isPending}
          className="inline-flex items-center gap-2 h-10 px-5 rounded-md bg-indigo-600 hover:bg-indigo-500 text-sm font-semibold disabled:opacity-50"
        >
          {isPending ? <Loader2 className="size-4 animate-spin" /> : <Plus className="size-4" />}
          Generate code
        </button>
        <p className="text-[11px] text-zinc-500">
          Duration = days of free access. Max uses = how many different companies can redeem it.
        </p>
      </div>

      {/* List */}
      <div className="rounded-xl border border-zinc-800 overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-zinc-900 text-left text-xs text-zinc-500">
            <tr>
              <th className="px-4 py-3 font-medium">Code</th>
              <th className="px-4 py-3 font-medium hidden md:table-cell">Note</th>
              <th className="px-4 py-3 font-medium">Plan</th>
              <th className="px-4 py-3 font-medium">Days</th>
              <th className="px-4 py-3 font-medium">Uses</th>
              <th className="px-4 py-3 font-medium">Status</th>
              <th className="px-4 py-3 font-medium text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-zinc-800/80">
            {promos.length === 0 ? (
              <tr>
                <td colSpan={7} className="px-4 py-10 text-center text-zinc-500">
                  No promo codes yet — generate one above.
                </td>
              </tr>
            ) : (
              promos.map((p) => (
                <tr key={p.id} className="hover:bg-zinc-900/40">
                  <td className="px-4 py-3 font-mono font-semibold text-indigo-300">{p.code}</td>
                  <td className="px-4 py-3 text-zinc-400 hidden md:table-cell max-w-[220px] truncate">
                    {p.description || "—"}
                  </td>
                  <td className="px-4 py-3 text-zinc-300">{p.pricing_plans?.name || "Top plan"}</td>
                  <td className="px-4 py-3 tabular-nums text-zinc-300">{p.duration_days}</td>
                  <td className="px-4 py-3 tabular-nums text-zinc-300">
                    {p.used_count}/{p.max_uses}
                  </td>
                  <td className="px-4 py-3">
                    {p.is_active ? (
                      <span className="text-[11px] font-bold text-emerald-400 bg-emerald-500/10 rounded-full px-2 py-0.5">
                        Active
                      </span>
                    ) : (
                      <span className="text-[11px] font-bold text-zinc-500 bg-zinc-800 rounded-full px-2 py-0.5">
                        Disabled
                      </span>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center justify-end gap-1.5">
                      <button
                        onClick={() => copy(p.code)}
                        className="p-1.5 rounded hover:bg-zinc-800 text-zinc-400"
                        title="Copy code"
                      >
                        <Copy className="size-3.5" />
                      </button>
                      <button
                        onClick={() => handleToggle(p)}
                        className={`p-1.5 rounded hover:bg-zinc-800 ${p.is_active ? "text-emerald-400" : "text-zinc-500"}`}
                        title={p.is_active ? "Disable" : "Enable"}
                        disabled={isPending}
                      >
                        <Power className="size-3.5" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
