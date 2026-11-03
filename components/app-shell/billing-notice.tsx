import Link from "next/link";
import { formatDistanceToNowStrict } from "date-fns";
import { AlertTriangle, Gift } from "lucide-react";

/**
 * A thin strip under the header: days left on the free trial, or a paid month
 * that has run out and is inside its grace days. Rendered by the app layout
 * from data it already fetched for the access check.
 */
export function BillingNotice({
  kind,
  endsAt,
  soon,
}: {
  kind: "TRIAL" | "GRACE";
  endsAt: string;
  /** Under 36 hours left — worked out by the caller, not during render. */
  soon: boolean;
}) {
  const end = new Date(endsAt);

  if (kind === "TRIAL") {
    return (
      <div
        className={`flex flex-wrap items-center justify-center gap-x-3 gap-y-1 border-b px-4 py-2 text-center text-xs ${
          soon ? "border-amber-200 bg-amber-50 text-amber-800" : "border-emerald-100 bg-emerald-50 text-emerald-800"
        }`}
      >
        <span className="flex items-center gap-1.5">
          <Gift className="size-3.5" />
          Free trial — ends {formatDistanceToNowStrict(end, { addSuffix: true })}. The AI agent is not included in the
          trial.
        </span>
        <Link href="/settings/billing" className="font-semibold underline underline-offset-2">
          Choose a plan
        </Link>
      </div>
    );
  }

  return (
    <div className="flex flex-wrap items-center justify-center gap-x-3 gap-y-1 border-b border-red-200 bg-red-50 px-4 py-2 text-center text-xs text-red-800">
      <span className="flex items-center gap-1.5">
        <AlertTriangle className="size-3.5" />
        Your plan expired {formatDistanceToNowStrict(end, { addSuffix: true })}. Renew now to avoid the dashboard locking.
      </span>
      <Link href="/settings/billing" className="font-semibold underline underline-offset-2">
        Renew
      </Link>
    </div>
  );
}
