"use client";

import { useState } from "react";
import { Edit, Trash2, Plus, Star, Sparkles } from "lucide-react";
import { deletePricingPlan } from "../actions";
import { PricingEditor } from "./PricingEditor";

export function PricingPageClient({ initialPlans }: { initialPlans: any[] }) {
  const [plans, setPlans] = useState(initialPlans);
  const [editorOpen, setEditorOpen] = useState(false);
  const [selectedPlan, setSelectedPlan] = useState<any | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const handleEdit = (plan: any) => {
    setSelectedPlan(plan);
    setEditorOpen(true);
  };

  const handleCreate = () => {
    setSelectedPlan(null);
    setEditorOpen(true);
  };

  const handleDelete = async (id: string, name: string) => {
    if (
      window.confirm(
        `Are you sure you want to delete plan "${name}"? This will remove it from the homepage instantly.`
      )
    ) {
      setDeletingId(id);
      try {
        await deletePricingPlan(id);
        setPlans(plans.filter((p) => p.id !== id));
      } catch (err: any) {
        alert(err.message || "Failed to delete plan");
      } finally {
        setDeletingId(null);
      }
    }
  };

  const handleRefresh = async () => {
    setEditorOpen(false);
    // Reload plans from public API or trigger route refresh
    const res = await fetch("/api/pricing?t=" + Date.now());
    const data = await res.json();
    if (Array.isArray(data)) {
      // Map API names back or refetch direct
      window.location.reload();
    }
  };

  return (
    <div className="space-y-6">
      {/* Create Button Banner */}
      <div className="flex justify-end">
        <button
          onClick={handleCreate}
          className="flex items-center gap-2 px-4 py-2 text-sm font-semibold rounded-lg bg-white text-black hover:bg-zinc-200 transition-all font-bold shadow-md"
        >
          <Plus className="w-4 h-4" />
          Add Pricing Plan
        </button>
      </div>

      {/* Grid of Plans */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {!plans?.length ? (
          <div className="col-span-full py-12 border border-dashed border-zinc-800 rounded-2xl flex flex-col items-center justify-center text-zinc-500 gap-2">
            <Sparkles className="w-8 h-8 opacity-25" />
            <p>No pricing plans configured yet.</p>
          </div>
        ) : (
          plans.map((plan) => (
            <div
              key={plan.id}
              className={`rounded-2xl border p-6 flex flex-col relative transition-all duration-300 bg-zinc-900 ${
                plan.is_popular
                  ? "border-indigo-500 shadow-2xl shadow-indigo-950/20"
                  : "border-zinc-800 hover:border-zinc-700"
              }`}
            >
              {plan.is_popular && (
                <div className="absolute -top-3 left-6 bg-indigo-600 text-white text-[10px] font-bold px-3 py-1 rounded-full uppercase tracking-wider flex items-center gap-1 shadow-md">
                  <Star className="w-3 h-3 fill-current" />
                  Popular Plan
                </div>
              )}

              <div className="flex justify-between items-start mb-2">
                <h3 className="text-lg font-bold text-white">{plan.name}</h3>
                <span className="text-xs text-zinc-500 font-mono">Sort: {plan.sort_order}</span>
              </div>

              <p className="text-xs text-zinc-400 min-h-[36px] line-clamp-2 mb-4">
                {plan.description || "No description provided."}
              </p>

              <div className="flex items-baseline mb-4">
                <span className="text-3xl font-extrabold text-white">
                  {plan.is_custom_price ? "Custom" : `₹${plan.price_inr}`}
                </span>
                {plan.period && !plan.is_custom_price && (
                  <span className="text-zinc-500 text-sm ml-1">{plan.period}</span>
                )}
              </div>

              {/* Features List Preview */}
              <div className="flex-1 space-y-2 mb-6">
                <div className="text-[10px] uppercase font-bold tracking-wider text-zinc-500">
                  Included Features ({plan.features?.filter((f: any) => f.included).length || 0})
                </div>
                <div className="max-h-24 overflow-y-auto pr-1 text-xs text-zinc-400 space-y-1.5">
                  {plan.features?.slice(0, 3).map((f: any, idx: number) => (
                    <div key={idx} className="flex items-center gap-1.5 min-w-0">
                      <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${f.included ? "bg-emerald-500" : "bg-zinc-750"}`} />
                      <span className={`truncate ${!f.included && "line-through opacity-40"}`}>{f.text}</span>
                    </div>
                  ))}
                  {plan.features?.length > 3 && (
                    <div className="text-[10px] text-zinc-500 pl-3">
                      + {plan.features.length - 3} more features
                    </div>
                  )}
                </div>
              </div>

              {/* Action Buttons */}
              <div className="pt-4 border-t border-zinc-800 flex gap-2 justify-end">
                <button
                  onClick={() => handleEdit(plan)}
                  className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded bg-zinc-800 text-zinc-300 hover:bg-zinc-750 hover:text-white transition-all"
                >
                  <Edit className="w-3.5 h-3.5" />
                  Edit Plan
                </button>
                <button
                  onClick={() => handleDelete(plan.id, plan.name)}
                  disabled={deletingId === plan.id}
                  className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded bg-red-950/20 text-red-400 border border-red-900/30 hover:bg-red-900/20 hover:text-red-300 transition-all disabled:opacity-50"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  Delete
                </button>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Editor Modal */}
      {editorOpen && (
        <PricingEditor plan={selectedPlan} onClose={() => setEditorOpen(false)} onSave={handleRefresh} />
      )}
    </div>
  );
}
