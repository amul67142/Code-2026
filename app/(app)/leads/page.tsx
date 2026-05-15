/**
 * Leads list page — scaffold.
 * Full implementation in Phase 7.
 */
export default function LeadsPage() {
  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold text-gray-900">Leads</h1>
          <p className="text-sm text-gray-500 mt-0.5">
            Manage and track all your leads
          </p>
        </div>
      </div>
      <div className="rounded-lg border border-gray-200 bg-white p-8 text-center text-sm text-gray-400">
        Lead table and filters will be built in Phase 7
      </div>
    </div>
  );
}
