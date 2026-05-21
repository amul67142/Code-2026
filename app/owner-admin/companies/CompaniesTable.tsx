"use client";

import { useState } from "react";
import { deleteCompany } from "../actions";
import { Trash2 } from "lucide-react";

export function CompaniesTable({ companies }: { companies: any[] }) {
  const [deletingId, setDeletingId] = useState<string | null>(null);

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
    <div className="rounded-md border border-zinc-800 overflow-hidden">
      <table className="w-full text-sm text-left text-zinc-300">
        <thead className="text-xs text-zinc-400 bg-zinc-950/50 uppercase">
          <tr>
            <th className="px-6 py-4 font-medium">Company Name</th>
            <th className="px-6 py-4 font-medium">Plan</th>
            <th className="px-6 py-4 font-medium">Status</th>
            <th className="px-6 py-4 font-medium">Users</th>
            <th className="px-6 py-4 font-medium">Joined Date</th>
            <th className="px-6 py-4 font-medium text-right">Actions</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-zinc-800 bg-zinc-900">
          {!companies?.length ? (
            <tr>
              <td colSpan={6} className="px-6 py-8 text-center text-zinc-500">
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
                <td className="px-6 py-4 text-zinc-400">
                  {new Date(company.created_at).toLocaleDateString()}
                </td>
                <td className="px-6 py-4 text-right">
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
