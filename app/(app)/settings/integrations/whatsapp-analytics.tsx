"use client";

import { Send, XCircle, MessageSquareReply, Percent, ShieldCheck, ShieldAlert, ShieldX, HelpCircle } from "lucide-react";
import type { WhatsAppAnalytics } from "./whatsapp-analytics-actions";

const LIMIT_LABELS: Record<string, string> = {
  TIER_50: "50 customers / 24h",
  TIER_250: "250 customers / 24h",
  TIER_1K: "1,000 customers / 24h",
  TIER_10K: "10,000 customers / 24h",
  TIER_100K: "100,000 customers / 24h",
  TIER_UNLIMITED: "Unlimited",
};

export function WhatsAppAnalyticsPanel({ data }: { data: WhatsAppAnalytics }) {
  if (!data.connected) return null;

  const tiles = [
    { label: "Sent (30d)", value: data.sent, icon: Send, cls: "text-gray-700" },
    { label: "Failed (30d)", value: data.failed, icon: XCircle, cls: data.failed > 0 ? "text-red-600" : "text-gray-700" },
    { label: "Replies (30d)", value: data.replies, icon: MessageSquareReply, cls: "text-gray-700" },
    { label: "Reply rate", value: data.replyRatePct === null ? "—" : `${data.replyRatePct}%`, icon: Percent, cls: "text-gray-700" },
  ];

  const q = data.quality;
  const quality =
    q === "HIGH"
      ? {
          icon: ShieldCheck,
          badge: "High",
          box: "border-emerald-200 bg-emerald-50 text-emerald-900",
          chip: "bg-emerald-600",
          msg: "Facebook rates this number's message quality as High — recipients are happy. Keep it up.",
        }
      : q === "MEDIUM"
        ? {
            icon: ShieldAlert,
            badge: "Medium",
            box: "border-amber-200 bg-amber-50 text-amber-900",
            chip: "bg-amber-500",
            msg: "Facebook rates this number's quality as Medium — some recipients are blocking or reporting your messages. Slow down, message only genuine leads, and make sure content matches what they asked for. If it drops to Low, Facebook can restrict how many messages you can send.",
          }
        : q === "LOW"
          ? {
              icon: ShieldX,
              badge: "Low",
              box: "border-red-200 bg-red-50 text-red-900",
              chip: "bg-red-600",
              msg: "⚠️ Facebook rates this number's quality as Low — too many recipients are blocking or reporting you. This is a spam warning: Facebook may limit or pause your sending. Stop bulk messaging, only message people who asked to hear from you, and let the rating recover.",
            }
          : {
              icon: HelpCircle,
              badge: "Not rated yet",
              box: "border-gray-200 bg-gray-50 text-gray-700",
              chip: "bg-gray-400",
              msg: "Facebook hasn't rated this number yet — it needs more messaging history. The rating appears after you've messaged more customers.",
            };

  const QIcon = quality.icon;

  return (
    <div className="rounded-md border p-4 space-y-4 bg-muted/20">
      <div>
        <h4 className="text-sm font-semibold">WhatsApp analytics</h4>
        <p className="text-xs text-muted-foreground">Last 30 days, from your message log.</p>
      </div>

      {/* Stat tiles */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {tiles.map((t) => (
          <div key={t.label} className="rounded-lg border bg-background p-3">
            <div className="flex items-center gap-1.5 text-[11px] text-muted-foreground">
              <t.icon className="size-3.5" /> {t.label}
            </div>
            <p className={`text-xl font-bold mt-1 ${t.cls}`}>{t.value}</p>
          </div>
        ))}
      </div>

      {/* Quality rating (from Facebook) */}
      <div className={`rounded-lg border p-3.5 ${quality.box}`}>
        <div className="flex items-center gap-2 mb-1">
          <QIcon className="size-4" />
          <span className="text-sm font-semibold">Message quality:</span>
          <span className={`text-[11px] font-bold text-white px-2 py-0.5 rounded-full ${quality.chip}`}>
            {quality.badge}
          </span>
          {data.messagingLimit && (
            <span className="ml-auto text-[11px] opacity-80">
              Sending limit: {LIMIT_LABELS[data.messagingLimit] || data.messagingLimit}
            </span>
          )}
        </div>
        <p className="text-xs leading-relaxed">{quality.msg}</p>
      </div>
    </div>
  );
}
