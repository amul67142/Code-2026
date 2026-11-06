"use client";

import { useState } from "react";
import { deleteCompany } from "../actions";
import { updateFreeAccount } from "./actions";
import { extendedEnd } from "@/lib/billing/access";
import { Loader2, SlidersHorizontal, Trash2, X } from "lucide-react";

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

export function CompaniesTable({
  companies,
  freeAccounts,
}: {
  companies: any[];
  freeAccounts: Record<string, FreeAccount>;
}) {
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [managingId, setManagingId] = useState<string | null>(null);
  const managing = companies.find((c) => c.id === managingId);

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
                  <span className="text-[10px] uppercase font-bold px-2 py-1 rounded-full bg-indigo-500/10 text-indigo-400">
                    {company.plan || "UNKNOWN"}
                  </span>
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
