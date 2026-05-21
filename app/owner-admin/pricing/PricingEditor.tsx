"use client";

import { useState } from "react";
import { Plus, Trash2, Check, X } from "lucide-react";
import { upsertPricingPlan } from "../actions";

interface Feature {
  text: string;
  included: boolean;
}

interface Plan {
  id?: string;
  name: string;
  description: string;
  price_inr: number;
  period: string | null;
  is_popular: boolean;
  is_custom_price: boolean;
  cta_text: string;
  sort_order: number;
  features: Feature[];
}

interface PricingEditorProps {
  plan: Plan | null;
  onClose: () => void;
  onSave: () => void;
}

export function PricingEditor({ plan, onClose, onSave }: PricingEditorProps) {
  const [name, setName] = useState(plan?.name || "");
  const [description, setDescription] = useState(plan?.description || "");
  const [priceInr, setPriceInr] = useState(plan?.price_inr || 0);
  const [period, setPeriod] = useState<string>(plan?.period || "");
  const [isPopular, setIsPopular] = useState(plan?.is_popular || false);
  const [isCustomPrice, setIsCustomPrice] = useState(plan?.is_custom_price || false);
  const [ctaText, setCtaText] = useState(plan?.cta_text || "Get Demo");
  const [sortOrder, setSortOrder] = useState(plan?.sort_order || 1);
  const [features, setFeatures] = useState<Feature[]>(plan?.features || []);
  const [newFeatureText, setNewFeatureText] = useState("");
  const [newFeatureIncluded, setNewFeatureIncluded] = useState(true);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleAddFeature = () => {
    if (!newFeatureText.trim()) return;
    setFeatures([...features, { text: newFeatureText.trim(), included: newFeatureIncluded }]);
    setNewFeatureText("");
  };

  const handleRemoveFeature = (index: number) => {
    setFeatures(features.filter((_, i) => i !== index));
  };

  const handleToggleFeatureIncluded = (index: number) => {
    setFeatures(
      features.map((f, i) => (i === index ? { ...f, included: !f.included } : f))
    );
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      setError("Plan Name is required");
      return;
    }

    setLoading(true);
    setError(null);

    try {
      await upsertPricingPlan({
        id: plan?.id,
        name: name.trim(),
        description: description.trim(),
        price_inr: Number(priceInr),
        period: period.trim() ? period.trim() : null,
        is_popular: isPopular,
        is_custom_price: isCustomPrice,
        cta_text: ctaText.trim(),
        sort_order: Number(sortOrder),
        features,
      });
      onSave();
    } catch (err: any) {
      setError(err.message || "Failed to save plan");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
      <div className="w-full max-w-xl bg-zinc-900 border border-zinc-800 rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        
        {/* Header */}
        <div className="px-6 py-4 border-b border-zinc-800 flex items-center justify-between">
          <h2 className="text-lg font-bold text-white">
            {plan ? "Edit Pricing Plan" : "Add New Pricing Plan"}
          </h2>
          <button
            onClick={onClose}
            className="p-1.5 rounded-full hover:bg-zinc-800 text-zinc-400 hover:text-white transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Scrollable Content */}
        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-6 space-y-5">
          {error && (
            <div className="p-3 text-sm rounded-lg bg-red-500/10 border border-red-500/20 text-red-400">
              {error}
            </div>
          )}

          {/* Form Fields Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-bold text-zinc-400 uppercase">Plan Name</label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g. Basic, Pro, Enterprise"
                className="w-full px-3 py-2 text-sm rounded-lg bg-zinc-950 border border-zinc-800 text-white focus:outline-none focus:border-indigo-500 transition-colors"
                required
              />
            </div>

            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-bold text-zinc-400 uppercase">Sort Order</label>
              <input
                type="number"
                value={sortOrder}
                onChange={(e) => setSortOrder(Number(e.target.value))}
                placeholder="e.g. 1, 2, 3"
                className="w-full px-3 py-2 text-sm rounded-lg bg-zinc-950 border border-zinc-800 text-white focus:outline-none focus:border-indigo-500 transition-colors"
                required
              />
            </div>

            <div className="flex flex-col gap-1.5 md:col-span-2">
              <label className="text-xs font-bold text-zinc-400 uppercase">Description</label>
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Brief summary of the plan's ideal audience"
                rows={2}
                className="w-full px-3 py-2 text-sm rounded-lg bg-zinc-950 border border-zinc-800 text-white focus:outline-none focus:border-indigo-500 transition-colors resize-none"
              />
            </div>

            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-bold text-zinc-400 uppercase">Price (₹ INR)</label>
              <input
                type="number"
                value={priceInr}
                onChange={(e) => setPriceInr(Number(e.target.value))}
                disabled={isCustomPrice}
                placeholder="e.g. 749"
                className="w-full px-3 py-2 text-sm rounded-lg bg-zinc-950 border border-zinc-800 text-white focus:outline-none focus:border-indigo-500 transition-colors disabled:opacity-50"
                required
              />
            </div>

            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-bold text-zinc-400 uppercase">Billing Period</label>
              <input
                type="text"
                value={period}
                onChange={(e) => setPeriod(e.target.value)}
                disabled={isCustomPrice}
                placeholder="e.g. /mo, /yr, or leave blank"
                className="w-full px-3 py-2 text-sm rounded-lg bg-zinc-950 border border-zinc-800 text-white focus:outline-none focus:border-indigo-500 transition-colors disabled:opacity-50"
              />
            </div>

            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-bold text-zinc-400 uppercase">CTA Text</label>
              <input
                type="text"
                value={ctaText}
                onChange={(e) => setCtaText(e.target.value)}
                placeholder="e.g. Get Demo, Contact Sales"
                className="w-full px-3 py-2 text-sm rounded-lg bg-zinc-950 border border-zinc-800 text-white focus:outline-none focus:border-indigo-500 transition-colors"
                required
              />
            </div>

            {/* Toggles */}
            <div className="flex flex-col gap-4 py-2">
              <label className="flex items-center gap-3 cursor-pointer group">
                <input
                  type="checkbox"
                  checked={isPopular}
                  onChange={(e) => setIsPopular(e.target.checked)}
                  className="sr-only peer"
                />
                <div className="w-9 h-5 bg-zinc-800 rounded-full peer peer-focus:ring-2 peer-focus:ring-indigo-500/20 peer-checked:after:translate-x-full after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-zinc-400 after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-indigo-600 peer-checked:after:bg-white relative"></div>
                <span className="text-sm font-semibold text-zinc-300 group-hover:text-white transition-colors">
                  Is Popular Plan
                </span>
              </label>

              <label className="flex items-center gap-3 cursor-pointer group">
                <input
                  type="checkbox"
                  checked={isCustomPrice}
                  onChange={(e) => {
                    setIsCustomPrice(e.target.checked);
                    if (e.target.checked) {
                      setPriceInr(0);
                      setPeriod("");
                    } else {
                      setPeriod("/mo");
                    }
                  }}
                  className="sr-only peer"
                />
                <div className="w-9 h-5 bg-zinc-800 rounded-full peer peer-focus:ring-2 peer-focus:ring-indigo-500/20 peer-checked:after:translate-x-full after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-zinc-400 after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-indigo-600 peer-checked:after:bg-white relative"></div>
                <span className="text-sm font-semibold text-zinc-300 group-hover:text-white transition-colors">
                  Is Custom Price ("Custom")
                </span>
              </label>
            </div>
          </div>

          <div className="h-px bg-zinc-800 my-4" />

          {/* Features Section */}
          <div className="space-y-3">
            <label className="text-xs font-bold text-zinc-400 uppercase tracking-wide">Features</label>
            
            {/* Features list */}
            <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
              {!features.length ? (
                <p className="text-xs text-zinc-500 italic">No features added yet.</p>
              ) : (
                features.map((f, i) => (
                  <div
                    key={i}
                    className="flex items-center justify-between p-2.5 rounded-lg bg-zinc-950 border border-zinc-800"
                  >
                    <div className="flex items-center gap-2.5 min-w-0">
                      <button
                        type="button"
                        onClick={() => handleToggleFeatureIncluded(i)}
                        className={`p-1 rounded-full border transition-all ${
                          f.included
                            ? "bg-emerald-500/10 border-emerald-500/30 text-emerald-400"
                            : "bg-red-500/10 border-red-500/30 text-red-400"
                        }`}
                        title={f.included ? "Included (Click to toggle)" : "Not Included (Click to toggle)"}
                      >
                        {f.included ? <Check className="w-3 h-3" /> : <X className="w-3 h-3" />}
                      </button>
                      <span className={`text-sm truncate ${f.included ? "text-zinc-200" : "text-zinc-500 line-through"}`}>
                        {f.text}
                      </span>
                    </div>
                    <button
                      type="button"
                      onClick={() => handleRemoveFeature(i)}
                      className="p-1 hover:text-red-450 hover:bg-red-500/10 text-zinc-500 rounded transition-all"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                ))
              )}
            </div>

            {/* Add new feature input */}
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => setNewFeatureIncluded(!newFeatureIncluded)}
                className={`px-3 py-2 rounded-lg border text-xs font-bold transition-all shrink-0 ${
                  newFeatureIncluded
                    ? "bg-emerald-500/10 border-emerald-500/35 text-emerald-400 hover:bg-emerald-500/20"
                    : "bg-red-500/10 border-red-500/35 text-red-400 hover:bg-red-500/20"
                }`}
              >
                {newFeatureIncluded ? "Included" : "Excluded"}
              </button>
              <input
                type="text"
                value={newFeatureText}
                onChange={(e) => setNewFeatureText(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    handleAddFeature();
                  }
                }}
                placeholder="e.g. 5 team members, Dedicated manager"
                className="flex-1 px-3 py-2 text-sm rounded-lg bg-zinc-950 border border-zinc-800 text-white focus:outline-none focus:border-indigo-500 transition-colors"
              />
              <button
                type="button"
                onClick={handleAddFeature}
                className="px-3 bg-zinc-850 hover:bg-zinc-800 text-white rounded-lg border border-zinc-700 transition-all font-semibold text-sm flex items-center justify-center shrink-0"
              >
                <Plus className="w-4 h-4" />
              </button>
            </div>
          </div>
        </form>

        {/* Footer Actions */}
        <div className="px-6 py-4 border-t border-zinc-800 flex justify-end gap-3 bg-zinc-950/20">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-sm font-semibold rounded-lg border border-zinc-800 text-zinc-300 hover:bg-zinc-800 hover:text-white transition-all"
          >
            Cancel
          </button>
          <button
            onClick={handleSubmit}
            disabled={loading}
            className="px-4 py-2 text-sm font-semibold rounded-lg bg-white text-black hover:bg-zinc-200 transition-all font-bold disabled:opacity-50"
          >
            {loading ? "Saving..." : "Save Plan"}
          </button>
        </div>
      </div>
    </div>
  );
}
