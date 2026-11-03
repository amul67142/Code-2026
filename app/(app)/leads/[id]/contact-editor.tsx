"use client";

import { useState, useTransition } from "react";
import { format } from "date-fns";
import { toast } from "sonner";
import { Calendar, Check, Loader2, Lock, Mail, Pencil, Phone, X } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { updateLeadContact } from "./actions";

/**
 * The lead's name, phone and email at the top of the detail page.
 *
 * Name and email are editable in place — portals and ad forms deliver plenty
 * of "raju 9541547393" style names and mistyped addresses, and opening a
 * separate edit screen to fix a typo is more ceremony than the job deserves.
 *
 * Phone is read-only on purpose. It is the lead's identity: inbound WhatsApp
 * replies are matched to a lead by its last ten digits, duplicate detection
 * keys on it, and the source portal quotes it back. Editing it would orphan a
 * live conversation. The server refuses it too, not just this form.
 *
 * A placeholder address (one BigLead generated because the portal sent a
 * masked relay — see lib/leads/portal-email.ts) is labelled as such. BigLead
 * will not mail it, but a rep who thinks it is real will paste it into their
 * own mail client, which is exactly the mistake the label prevents. Typing a
 * real address over it clears the placeholder.
 */
export function LeadContactHeader({
  leadId,
  name,
  email,
  phone,
  createdAt,
  canEdit,
  emailIsSynthetic = false,
  emailOriginal = null,
}: {
  leadId: string;
  name: string;
  email: string | null;
  phone: string | null;
  createdAt: string;
  canEdit: boolean;
  emailIsSynthetic?: boolean;
  emailOriginal?: string | null;
}) {
  const [current, setCurrent] = useState({
    name,
    email: email || "",
    synthetic: emailIsSynthetic,
  });
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState({ name, email: email || "" });
  const [pending, startTransition] = useTransition();

  function open() {
    // Re-seed from what is saved, so an abandoned edit never carries over.
    setDraft({ name: current.name, email: current.email });
    setEditing(true);
  }

  function save() {
    startTransition(async () => {
      const res = await updateLeadContact(leadId, draft);
      if (res.error) {
        toast.error(res.error);
        return;
      }
      // The "unchanged" reply carries no fields, so fall back to the draft
      // (identical to what is on screen) rather than blanking the address.
      setCurrent((prev) => ({
        name: res.name ?? draft.name.trim(),
        email: res.email ?? draft.email.trim().toLowerCase(),
        synthetic: res.emailIsSynthetic ?? prev.synthetic,
      }));
      setEditing(false);
      toast.success(res.unchanged ? "No changes" : "Details updated");
    });
  }

  if (editing) {
    return (
      <div className="w-full max-w-md space-y-2">
        <Input
          autoFocus
          className="text-lg font-semibold"
          placeholder="Lead name"
          value={draft.name}
          disabled={pending}
          onChange={(e) => setDraft({ ...draft, name: e.target.value })}
          onKeyDown={(e) => {
            if (e.key === "Enter") save();
            if (e.key === "Escape") setEditing(false);
          }}
        />
        {current.synthetic && (
          <p className="text-xs text-amber-600 dark:text-amber-500">
            {emailOriginal
              ? `The portal sent ${emailOriginal} — its own relay, not the lead's address.`
              : "The portal never sent a real address."}{" "}
            The email below is a placeholder. Replace it if you learn the real one.
          </p>
        )}
        <Input
          type="email"
          className="text-sm"
          placeholder="Email (optional)"
          value={draft.email}
          disabled={pending}
          onChange={(e) => setDraft({ ...draft, email: e.target.value })}
          onKeyDown={(e) => {
            if (e.key === "Enter") save();
            if (e.key === "Escape") setEditing(false);
          }}
        />

        {/* Shown, not editable — so it is obvious the number is intact. */}
        <p className="flex items-center gap-1.5 text-xs text-muted-foreground">
          <Lock className="size-3" />
          {phone || "No phone"} — the number cannot be changed, it is what links
          WhatsApp replies to this lead.
        </p>

        <div className="flex items-center gap-2 pt-1">
          <Button size="sm" onClick={save} disabled={pending}>
            {pending ? (
              <Loader2 className="mr-1.5 size-3.5 animate-spin" />
            ) : (
              <Check className="mr-1.5 size-3.5" />
            )}
            Save
          </Button>
          <Button size="sm" variant="outline" onClick={() => setEditing(false)} disabled={pending}>
            <X className="mr-1.5 size-3.5" /> Cancel
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="group">
      <div className="flex items-center gap-2">
        <h1 className="text-2xl font-bold tracking-tight">{current.name}</h1>
        {canEdit && (
          <button
            onClick={open}
            aria-label="Edit name and email"
            title="Edit name and email"
            className="rounded p-1 text-muted-foreground opacity-0 transition-opacity hover:bg-muted hover:text-foreground focus-visible:opacity-100 group-hover:opacity-100"
          >
            <Pencil className="size-3.5" />
          </button>
        )}
      </div>
      <div className="mt-1 flex flex-wrap items-center gap-3 text-sm text-muted-foreground">
        {phone && (
          <span className="flex items-center gap-1">
            <Phone className="h-3 w-3" /> {phone}
          </span>
        )}
        {current.email ? (
          <span
            className="flex items-center gap-1"
            title={
              current.synthetic
                ? `Placeholder. ${emailOriginal ? `The portal sent ${emailOriginal}, its own relay.` : "The portal sent no real address."} Nothing reaches this inbox — use the phone number.`
                : undefined
            }
          >
            <Mail className="h-3 w-3" />
            <span className={current.synthetic ? "italic" : undefined}>{current.email}</span>
            {current.synthetic && (
              <span className="rounded bg-amber-100 px-1 text-[10px] font-medium uppercase tracking-wide text-amber-700 dark:bg-amber-950 dark:text-amber-500">
                placeholder
              </span>
            )}
          </span>
        ) : canEdit ? (
          <button onClick={open} className="flex items-center gap-1 hover:text-foreground">
            <Mail className="h-3 w-3" /> Add email
          </button>
        ) : null}
        <span className="flex items-center gap-1">
          <Calendar className="h-3 w-3" />
          {format(new Date(createdAt), "MMM d, yyyy")}
        </span>
      </div>
    </div>
  );
}
