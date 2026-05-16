import { getDashboardMetrics } from "./actions";
import ReportsClient from "./reports-client";

export default async function ReportsPage() {
  const initialData = await getDashboardMetrics(30); // Default to last 30 days

  return (
    <div className="flex-1 w-full p-4 md:p-8 pt-6">
      <ReportsClient initialData={initialData} />
    </div>
  );
}
