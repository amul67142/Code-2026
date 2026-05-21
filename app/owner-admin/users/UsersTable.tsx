"use client";

import { useState } from "react";
import { deleteUser } from "../actions";
import { Trash2 } from "lucide-react";

export function UsersTable({ users }: { users: any[] }) {
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const handleDelete = async (id: string, name: string) => {
    if (window.confirm(`Are you sure you want to delete user "${name}"? This action cannot be undone.`)) {
      setDeletingId(id);
      try {
        await deleteUser(id);
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
            <th className="px-6 py-4 font-medium">Name</th>
            <th className="px-6 py-4 font-medium">Email</th>
            <th className="px-6 py-4 font-medium">Company</th>
            <th className="px-6 py-4 font-medium">Role</th>
            <th className="px-6 py-4 font-medium">Joined</th>
            <th className="px-6 py-4 font-medium text-right">Actions</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-zinc-800 bg-zinc-900">
          {!users?.length ? (
            <tr>
              <td colSpan={6} className="px-6 py-8 text-center text-zinc-500">
                No users found.
              </td>
            </tr>
          ) : (
            users.map((user) => (
              <tr key={user.id} className="hover:bg-zinc-800/50 transition-colors">
                <td className="px-6 py-4 font-medium text-white flex items-center gap-3">
                  <div className="w-8 h-8 rounded-full bg-indigo-500/20 text-indigo-400 flex items-center justify-center font-bold">
                    {(user.name || "U").charAt(0).toUpperCase()}
                  </div>
                  {user.name || "Unnamed User"}
                </td>
                <td className="px-6 py-4 text-zinc-400">{user.email}</td>
                <td className="px-6 py-4 text-zinc-300">
                  {user.companies?.name || "No Company"}
                </td>
                <td className="px-6 py-4">
                  <span className="text-[10px] uppercase font-bold px-2 py-1 rounded-full bg-zinc-800 text-zinc-300">
                    {user.role}
                  </span>
                </td>
                <td className="px-6 py-4 text-zinc-400">
                  {new Date(user.created_at).toLocaleDateString()}
                </td>
                <td className="px-6 py-4 text-right">
                  <button 
                    onClick={() => handleDelete(user.id, user.name || user.email)}
                    disabled={deletingId === user.id}
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
