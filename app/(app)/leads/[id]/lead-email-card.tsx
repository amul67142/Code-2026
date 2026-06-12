"use client";

import { useState, useTransition } from "react";
import { resendLeadEmail } from "./actions";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Mail, Send, CheckCircle2, AlertCircle, Loader2, Clock, Eye } from "lucide-react";
import { format } from "date-fns";
import { toast } from "sonner";

interface EmailStatus {
  id: string;
  status: string;
  to_address: string | null;
  subject: string | null;
  error_message: string | null;
  is_auto: boolean;
  created_at: string;
  opened_at: string | null;
  replied_at: string | null;
}

const STATUS_STYLE: Record<string, { label: string; cls: string; icon: typeof CheckCircle2 }> = {
  SENT: { label: "Sent", cls: "bg-blue-100 text-blue-700", icon: CheckCircle2 },
  DELIVERED: { label: "Delivered", cls: "bg-emerald-100 text-emerald-700", icon: CheckCircle2 },
  OPENED: { label: "Opened", cls: "bg-emerald-100 text-emerald-700", icon: Eye },
  REPLIED: { label: "Replied", cls: "bg-violet-100 text-violet-700", icon: CheckCircle2 },
  FAILED: { label: "Failed", cls: "bg-red-100 text-red-700", icon: AlertCircle },
  BOUNCED: { label: "Bounced", cls: "bg-red-100 text-red-700", icon: AlertCircle },
};

export function LeadEmailCard({
  leadId,
  leadEmail,
  initial,
}: {
  leadId: string;
  leadEmail: string | null;
  initial: EmailStatus | null;
}) {
  const [status, setStatus] = useState<EmailStatus | null>(initial);
  const [isPending, startTransition] = useTransition();

  function handleResend() {
    startTransition(async () => {
      const res = await resendLeadEmail(leadId);
      if (res.error) {
        toast.error(res.error);
      } else {
        toast.success("Email sent to the lead");
        setStatus({
          id: "local",
          status: "SENT",
          to_address: leadEmail,
          subject: null,
          error_message: null,
          is_auto: false,
          created_at: new Date().toISOString(),
          opened_at: null,
          replied_at: null,
        });
      }
    });
  }

  const style = status ? STATUS_STYLE[status.status] || STATUS_STYLE.SENT : null;
  const StatusIcon = style?.icon || Clock;

  return (
    <Card>
      <CardHeader className="pb-3 flex flex-row items-center justify-between space-y-0">
        <CardTitle className="text-base flex items-center gap-2">
          <Mail className="size-4 text-muted-foreground" />
          Welcome Email
        </CardTitle>
        <Button
          variant="outline"
          size="sm"
          onClick={handleResend}
          disabled={isPending || !leadEmail}
          title={!leadEmail ? "Lead has no email address" : "Send the welcome email again"}
        >
          {isPending ? (
            <Loader2 className="mr-2 size-3.5 animate-spin" />
          ) : (
            <Send className="mr-2 size-3.5" />
          )}
          {status ? "Resend" : "Send"}
        </Button>
      </CardHeader>
      <CardContent>
        {!leadEmail ? (
          <p className="text-sm text-muted-foreground">
            No email address on this lead — nothing to send.
          </p>
        ) : !status ? (
          <p className="text-sm text-muted-foreground">
            No email sent yet. Click <span className="font-medium">Send</span> to email this lead.
          </p>
        ) : (
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <Badge className={`${style?.cls} hover:${style?.cls} gap-1`}>
                <StatusIcon className="size-3" />
                {style?.label}
              </Badge>
              <span className="text-xs text-muted-foreground">
                {status.is_auto ? "Auto-sent" : "Manually sent"} ·{" "}
                {format(new Date(status.created_at), "MMM d, h:mm a")}
              </span>
            </div>
            <p className="text-xs text-muted-foreground">
              To: <span className="font-medium text-foreground">{status.to_address}</span>
            </p>
            {status.status === "FAILED" && status.error_message && (
              <p className="text-xs text-red-600">Reason: {status.error_message}</p>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
