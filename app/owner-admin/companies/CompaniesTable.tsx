"use client";

import { useState } from "react";
import { deleteCompany } from "../actions";
import { updateCompanyPlan, updateFreeAccount } from "./actions";
import { extendedEnd } from "@/lib/billing/access";
import { BASIC_PRICING, inr, pricingFromCompany } from "@/lib/billing/plans";
import { IndianRupee, Loader2, SlidersHorizontal, Trash2, X } from "lucide-react";

export interface FreeAccount {
  kind: "Trial" | "Demo";
  endsAt: string;
  locked: boolean;
  seats: number;
  seatsUsed: number;
}

const dateLabel = (d: string | Date) =>
  new Date(d).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric", timeZone: "Asia/Kolkata" });

const QUICK_DAYS = [3, 7, 14, 30];

function ManageFreeAccount({
  company,
  account,
  onClose,
}: {
  company: { id: string; name: string };
  account: FreeAccount;
  onClose: () => void;
}) {
  const [openedAt] = useState(() => Date.now());
  const [days, setDays] = useState("0");
  const [seats, setSeats] = useState(String(account.seats));
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const extendDays = Number(days) || 0;

  const save = async () => {
    setSaving(true);
    setError(null);
    const res = await updateFreeAccount(company.id, { extendDays, seats: Number(seats) });
    setSaving(false);
    if ("error" in res) setError(res.error ?? "Could not save.");
    else onClose();
  };

  const field =
    "w-full rounded-md border border-zinc-700 bg-zinc-950 px-3 py-2 text-sm text-white outline-none focus:border-indigo-500";

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
      <div className="w-full max-w-md rounded-xl border border-zinc-800 bg-zinc-900 p-6 text-left">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h2 className="text-lg font-semibold text-white">{company.name}</h2>
            <p className="mt-1 text-sm text-zinc-400">
              {account.kind} {account.locked ? "ended" : "ends"} {dateLabel(account.endsAt)}
            </p>
          </div>
          <button onClick={onClose} aria-label="Close" className="p-1 text-zinc-400 hover:text-white">
            <X className="w-4 h-4" />
          </button>
        </div>

        <label className="mt-6 block text-sm font-medium text-zinc-300" htmlFor="extend-days">
          Extend by (days)
        </label>
        <div className="mt-2 flex gap-2">
          {QUICK_DAYS.map((d) => (
            <button
              key={d}
              type="button"
              onClick={() => setDays(String(d))}
              className={`flex-1 rounded-md border px-2 py-1.5 text-sm transition-colors ${
                extendDays === d
                  ? "border-indigo-500 bg-indigo-500/10 text-indigo-300"
                  : "border-zinc-700 text-zinc-300 hover:bg-zinc-800"
              }`}
            >
              +{d}
            </button>
          ))}
        </div>
        <input
          id="extend-days"
          type="number"
          min={0}
          max={365}
          value={days}
          onChange={(e) => setDays(e.target.value)}
          className={`${field} mt-2`}
        />
        <p className="mt-1.5 text-xs text-zinc-500">
          {extendDays > 0
            ? `New end date: ${dateLabel(extendedEnd(account.endsAt, extendDays, openedAt))}`
            : "End date stays the same."}
        </p>

        <label className="mt-5 block text-sm font-medium text-zinc-300" htmlFor="seat-limit">
          Agents they can add (seats)
        </label>
        <input
          id="seat-limit"
          type="number"
          min={Math.max(1, account.seatsUsed)}
          max={200}
          value={seats}
          onChange={(e) => setSeats(e.target.value)}
          className={`${field} mt-2`}
        />
        <p className="mt-1.5 text-xs text-zinc-500">{account.seatsUsed} in use, including the account owner.</p>

        {error && <p className="mt-4 text-sm text-red-400">{error}</p>}

        <div className="mt-6 flex justify-end gap-2">
          <button onClick={onClose} className="rounded-md px-4 py-2 text-sm text-zinc-300 hover:bg-zinc-800">
            Cancel
          </button>
          <button
            onClick={save}
            disabled={saving}
            className="inline-flex items-center gap-2 rounded-md bg-indigo-600 px-4 py-2 text-sm font-semibold text-white hover:bg-indigo-500 disabled:opacity-50"
          >
            {saving && <Loader2 className="w-4 h-4 animate-spin" />}
            Save
          </button>
        </div>
      </div>
    </div>
  );
}

/** "Basic" / "Custom" with the price underneath, for the Plan column. */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function PlanBadge({ company }: { company: any }) {
  const pr = pricingFromCompany(company);
  return (
    <div>
      <span
        className={`text-[10px] uppercase font-bold px-2 py-1 rounded-full ${
          pr.custom ? "bg-amber-500/10 text-amber-400" : "bg-indigo-500/10 text-indigo-400"
        }`}
      >
        {pr.custom ? "Custom" : "Basic"}
      </span>
      <p className="mt-1 text-xs text-zinc-500 whitespace-nowrap">
        {inr(pr.platformFee)} + {inr(pr.seatPrice)}/seat
        {pr.promoSeats > pr.includedSeats ? ` · ${pr.promoSeats} free${pr.seatPromoPaused ? " (off)" : ""}` : ""}
      </p>
    </div>
  );
}

/** Basic or custom pricing for one company, and free seats. */
function PlanEditor({
  company,
  onClose,
}: {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  company: any;
  onClose: () => void;
}) {
  const current = pricingFromCompany(company);
  const [custom, setCustom] = useState(current.custom);
  const [platformFee, setPlatformFee] = useState(String(current.platformFee));
  const [includedSeats, setIncludedSeats] = useState(String(current.includedSeats));
  const [seatPrice, setSeatPrice] = useState(String(current.seatPrice));
  // promoSeats, not freeSeats: a promo the client switched off must not be wiped on save.
  const [freeSeats, setFreeSeats] = useState(String(current.promoSeats));
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fee = custom ? Number(platformFee) || 0 : BASIC_PRICING.platformFee;
  const included = custom ? Number(includedSeats) || 0 : BASIC_PRICING.includedSeats;
  const price = custom ? Number(seatPrice) || 0 : BASIC_PRICING.seatPrice;
  const free = Number(freeSeats) || 0;
  const covered = Math.max(included, free);
  // An example bill, so the numbers mean something at a glance.
  const exampleSeats = Math.max(covered + 5, 10);
  const example = fee + Math.max(0, exampleSeats - covered) * price;

  const save = async () => {
    setSaving(true);
    setError(null);
    const res = await updateCompanyPlan(company.id, {
      custom,
      platformFee: Number(platformFee),
      includedSeats: Number(includedSeats),
      seatPrice: Number(seatPrice),
      freeSeats: Number(freeSeats),
    });
    setSaving(false);
    if ("error" in res) setError(res.error ?? "Could not save.");
    else onClose();
  };

  const field =
    "w-full rounded-md border border-zinc-700 bg-zinc-950 px-3 py-2 text-sm text-white outline-none focus:border-indigo-500 disabled:opacity-50";

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
      <div className="w-full max-w-md rounded-xl border border-zinc-800 bg-zinc-900 p-6 text-left">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h2 className="text-lg font-semibold text-white">{company.name}</h2>
            <p className="mt-1 text-sm text-zinc-400">What this company pays each month</p>
          </div>
          <button onClick={onClose} aria-label="Close" className="p-1 text-zinc-400 hover:text-white">
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="mt-5 grid grid-cols-2 gap-2">
          {[
            {
              v: false,
              label: "Basic",
              sub: `${inr(BASIC_PRICING.platformFee)} + ${inr(BASIC_PRICING.seatPrice)}/seat`,
            },
            { v: true, label: "Custom", sub: "Your own prices" },
          ].map((o) => (
            <button
              key={o.label}
              type="button"
              onClick={() => setCustom(o.v)}
              className={`rounded-md border px-3 py-2 text-left transition-colors ${
                custom === o.v ? "border-indigo-500 bg-indigo-500/10" : "border-zinc-700 hover:bg-zinc-800"
              }`}
            >
              <p className="text-sm font-semibold text-white">{o.label}</p>
              <p className="text-xs text-zinc-400">{o.sub}</p>
            </button>
          ))}
        </div>

        <div className="mt-5 grid grid-cols-3 gap-3">
          <label className="block text-xs font-medium text-zinc-300">
            Platform fee (₹)
            <input
              type="number"
              min={1}
              value={custom ? platformFee : BASIC_PRICING.platformFee}
              onChange={(e) => setPlatformFee(e.target.value)}
              disabled={!custom}
              className={`${field} mt-1.5`}
            />
          </label>
          <label className="block text-xs font-medium text-zinc-300">
            Seats included
            <input
              type="number"
              min={0}
              value={custom ? includedSeats : BASIC_PRICING.includedSeats}
              onChange={(e) => setIncludedSeats(e.target.value)}
              disabled={!custom}
              className={`${field} mt-1.5`}
            />
          </label>
          <label className="block text-xs font-medium text-zinc-300">
            Per seat (₹)
            <input
              type="number"
              min={1}
              value={custom ? seatPrice : BASIC_PRICING.seatPrice}
              onChange={(e) => setSeatPrice(e.target.value)}
              disabled={!custom}
              className={`${field} mt-1.5`}
            />
          </label>
        </div>

        <label className="mt-5 block text-xs font-medium text-zinc-300">
          Free seats (seat promo)
          <input
            type="number"
            min={0}
            max={1000}
            value={freeSeats}
            onChange={(e) => setFreeSeats(e.target.value)}
            className={`${field} mt-1.5`}
          />
        </label>
        <p className="mt-1.5 text-xs text-zinc-500">
          Seats up to {covered} cost nothing (included or free seats, whichever is more).
          {current.freeSeatsCode ? ` Set by promo ${current.freeSeatsCode}.` : ""}
          {current.seatPromoPaused ? " The client has switched it off, so these seats are charged right now." : ""}
        </p>

        <div className="mt-5 rounded-md border border-zinc-800 bg-zinc-950 px-3 py-2.5 text-xs text-zinc-400">
          Example: {exampleSeats} seats = {inr(fee)} + {Math.max(0, exampleSeats - covered)} × {inr(price)} ={" "}
          <span className="font-semibold text-white">{inr(example)}/month</span>
        </div>
        <p className="mt-2 text-xs text-zinc-500">Applies from their next payment. A month already paid is not changed.</p>

        {error && <p className="mt-4 text-sm text-red-400">{error}</p>}

        <div className="mt-6 flex justify-end gap-2">
          <button onClick={onClose} className="rounded-md px-4 py-2 text-sm text-zinc-300 hover:bg-zinc-800">
            Cancel
          </button>
          <button
            onClick={save}
            disabled={saving}
            className="inline-flex items-center gap-2 rounded-md bg-indigo-600 px-4 py-2 text-sm font-semibold text-white hover:bg-indigo-500 disabled:opacity-50"
          >
            {saving && <Loader2 className="w-4 h-4 animate-spin" />}
            Save
          </button>
        </div>
      </div>
    </div>
  );
}

export function CompaniesTable({
  companies,
  freeAccounts,
}: {
  companies: any[];
  freeAccounts: Record<string, FreeAccount>;
}) {
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [managingId, setManagingId] = useState<string | null>(null);
  const [pricingId, setPricingId] = useState<string | null>(null);
  const managing = companies.find((c) => c.id === managingId);
  const pricingCompany = companies.find((c) => c.id === pricingId);

  const handleDelete = async (id: string, name: string) => {
    if (window.confirm(`Are you sure you want to delete company "${name}"? This action cannot be undone and will delete all associated users and data.`)) {
      setDeletingId(id);
      try {
        await deleteCompany(id);
      } catch (err: any) {
        alert(err.message);
      } finally {
        setDeletingId(null);
      }
    }
  };

  return (
    <div className="rounded-md border border-zinc-800 overflow-x-auto">
      {managing && freeAccounts[managing.id] && (
        <ManageFreeAccount
          key={managing.id}
          company={managing}
          account={freeAccounts[managing.id]}
          onClose={() => setManagingId(null)}
        />
      )}
      {pricingCompany && (
        <PlanEditor key={pricingCompany.id} company={pricingCompany} onClose={() => setPricingId(null)} />
      )}
      <table className="w-full text-sm text-left text-zinc-300">
        <thead className="text-xs text-zinc-400 bg-zinc-950/50 uppercase">
          <tr>
            <th className="px-6 py-4 font-medium">Company Name</th>
            <th className="px-6 py-4 font-medium">Plan</th>
            <th className="px-6 py-4 font-medium">Status</th>
            <th className="px-6 py-4 font-medium">Users</th>
            <th className="px-6 py-4 font-medium">Free plan</th>
            <th className="px-6 py-4 font-medium">Joined Date</th>
            <th className="px-6 py-4 font-medium text-right">Actions</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-zinc-800 bg-zinc-900">
          {!companies?.length ? (
            <tr>
              <td colSpan={7} className="px-6 py-8 text-center text-zinc-500">
                No companies found.
              </td>
            </tr>
          ) : (
            companies.map((company) => (
              <tr key={company.id} className="hover:bg-zinc-800/50 transition-colors">
                <td className="px-6 py-4 font-medium text-white flex items-center gap-3">
                  <div className="w-8 h-8 rounded-full bg-indigo-500/20 text-indigo-400 flex items-center justify-center font-bold">
                    {company.name.charAt(0).toUpperCase()}
                  </div>
                  {company.name}
                </td>
                <td className="px-6 py-4">
                  {company.is_platform ? (
                    <span className="text-[10px] uppercase font-bold px-2 py-1 rounded-full bg-zinc-500/10 text-zinc-400">
                      Platform
                    </span>
                  ) : (
                    <PlanBadge company={company} />
                  )}
                </td>
                <td className="px-6 py-4">
                  <span className={`text-[10px] uppercase font-bold px-2 py-1 rounded-full ${
                    company.status === 'ACTIVE' ? 'bg-emerald-500/10 text-emerald-400' :
                    company.status === 'TRIAL' ? 'bg-amber-500/10 text-amber-400' :
                    'bg-zinc-500/10 text-zinc-400'
                  }`}>
                    {company.status || "UNKNOWN"}
                  </span>
                </td>
                <td className="px-6 py-4 text-zinc-400">
                  {company.users?.[0]?.count || 0} Members
                </td>
                <td className="px-6 py-4 text-zinc-400 whitespace-nowrap">
                  {freeAccounts[company.id] ? (
                    <>
                      <p className={freeAccounts[company.id].locked ? "text-red-400" : "text-zinc-300"}>
                        {freeAccounts[company.id].kind} {freeAccounts[company.id].locked ? "ended" : "ends"}{" "}
                        {dateLabel(freeAccounts[company.id].endsAt)}
                      </p>
                      <p className="text-xs text-zinc-500">
                        {freeAccounts[company.id].seatsUsed} of {freeAccounts[company.id].seats} seats used
                      </p>
                    </>
                  ) : (
                    "—"
                  )}
                </td>
                <td className="px-6 py-4 text-zinc-400">
                  {dateLabel(company.created_at)}
                </td>
                <td className="px-6 py-4 text-right whitespace-nowrap">
                  {!company.is_platform && (
                    <button
                      onClick={() => setPricingId(company.id)}
                      title="Set plan and prices"
                      aria-label={`Set plan for ${company.name}`}
                      className="p-2 text-zinc-400 hover:text-amber-400 hover:bg-amber-400/10 rounded-md transition-colors"
                    >
                      <IndianRupee className="w-4 h-4" />
                    </button>
                  )}
                  {freeAccounts[company.id] && (
                    <button
                      onClick={() => setManagingId(company.id)}
                      title="Extend trial or change seats"
                      aria-label={`Manage ${company.name}`}
                      className="p-2 text-zinc-400 hover:text-indigo-400 hover:bg-indigo-400/10 rounded-md transition-colors"
                    >
                      <SlidersHorizontal className="w-4 h-4" />
                    </button>
                  )}
                  <button
                    onClick={() => handleDelete(company.id, company.name)}
                    disabled={deletingId === company.id}
                    className="p-2 text-zinc-400 hover:text-red-400 hover:bg-red-400/10 rounded-md transition-colors disabled:opacity-50"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </td>
              </tr>
            ))
          )}
        </tbody>
      </table>
    </div>
  );
}
