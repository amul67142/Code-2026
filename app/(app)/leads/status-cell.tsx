"use client";

import { useState, useTransition } from "react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Input } from "@/components/ui/input";
import { Loader2, Pencil } from "lucide-react";
import { toast } from "sonner";
import { updateLeadStatus } from "./[id]/actions";
import {
  STATUS_OPTIONS,
  allStatusesUsed,
  openStatusSlots,
  remarkKey,
  savedStatuses,
  statusClass,
  statusDraft,
  statusKey,
  statusSavedMessage,
  type LeadStatuses,
  type StatusDraft,
  type StatusField,
  type StatusSlot,
} from "./status-options";

const SELECT_CLASS =
  "h-8 w-full rounded-md border border-input bg-background px-2 text-xs focus:outline-none focus:ring-2 focus:ring-ring";

/**
 * Inline status editor for the leads table.
 *
 * Opening a lead just to log "called, not picking up" was the slowest thing
 * in the list — a full page load and a round trip back. This keeps the rep on
 * the row: pick a status, type the remark, save.
 *
 * The saved values are pushed back to the table through `onSaved` rather than
 * re-fetching, so the row updates the moment the server confirms.
 */
export function StatusCell({
  leadId,
  leadName,
  value,
  onSaved,
}: {
  leadId: string;
  leadName: string;
  value: Partial<LeadStatuses>;
  onSaved: (next: LeadStatuses) => void;
}) {
  const [open, setOpen] = useState(false);
  const [pending, startTransition] = useTransition();

  // Draft state, seeded from the row each time the editor opens so an
  // abandoned edit never leaks into the next one.
  const [draft, setDraft] = useState<StatusDraft>(() => statusDraft(value));
  const set = (field: StatusField, text: string) => setDraft((d) => ({ ...d, [field]: text }));

  function handleOpenChange(next: boolean) {
    if (next) setDraft(statusDraft(value));
    setOpen(next);
  }

  function save() {
    startTransition(async () => {
      // Empty strings are sent deliberately — that is how a status gets
      // cleared. Omitting the key would leave the old value in place.
      const res = await updateLeadStatus(leadId, draft);

      if (res?.error) {
        toast.error(res.error);
        return;
      }

      const next = savedStatuses(draft);
      onSaved(next);
      setOpen(false);
      toast.success(statusSavedMessage(value, next));
    });
  }

  const slots = openStatusSlots(value);
  const hasAny = slots.some((n) => value[statusKey(n)]);

  return (
    <Popover open={open} onOpenChange={handleOpenChange}>
      <PopoverTrigger
        className="group -mx-1.5 -my-1 flex w-full max-w-[280px] cursor-pointer flex-col gap-1 rounded px-1.5 py-1 text-left transition-colors hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        aria-label={`Edit status for ${leadName}`}
      >
        {hasAny ? (
          <span className="grid grid-cols-2 gap-x-2 gap-y-1">
            {slots.map((n) => (
              <StatusLine key={n} slot={n} status={value[statusKey(n)]} remark={value[remarkKey(n)]} />
            ))}
          </span>
        ) : (
          <span className="flex items-center gap-1 text-xs text-muted-foreground">
            <Pencil className="size-3 opacity-0 transition-opacity group-hover:opacity-100" />
            <span className="group-hover:text-foreground">Set status</span>
          </span>
        )}
      </PopoverTrigger>

      <PopoverContent
        align="start"
        className="max-h-[80vh] w-[440px] max-w-[calc(100vw-2rem)] gap-0 overflow-y-auto p-3"
      >
        <p className="mb-2 truncate text-xs font-medium text-muted-foreground">{leadName}</p>

        <div className="grid grid-cols-2 gap-3">
          {slots.map((n) => (
            <Slot
              key={n}
              label={`Status ${n}`}
              status={draft[statusKey(n)]}
              remark={draft[remarkKey(n)]}
              onStatus={(v) => set(statusKey(n), v)}
              onRemark={(v) => set(remarkKey(n), v)}
              disabled={pending}
            />
          ))}
        </div>

        {allStatusesUsed(value) && (
          <p className="mt-3 text-[11px] text-muted-foreground">
            All 6 statuses are used. Open the lead to add further updates in its activity log.
          </p>
        )}

        <div className="mt-3 flex items-center justify-end gap-2">
          <button
            type="button"
            onClick={() => setOpen(false)}
            disabled={pending}
            className="h-8 rounded-md px-3 text-xs text-muted-foreground hover:bg-muted disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={save}
            disabled={pending}
            className="inline-flex h-8 items-center rounded-md bg-primary px-3 text-xs font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-50"
          >
            {pending && <Loader2 className="mr-1.5 size-3 animate-spin" />}
            Save
          </button>
        </div>
      </PopoverContent>
    </Popover>
  );
}

function StatusLine({
  slot,
  status,
  remark,
}: {
  slot: StatusSlot;
  status?: string | null;
  remark?: string | null;
}) {
  return (
    <span className="flex min-w-0 flex-col">
      {status ? (
        <span
          className={`inline-block w-fit max-w-full truncate rounded border px-1.5 py-0.5 text-[10px] ${statusClass(status)}`}
        >
          {slot}: {status}
        </span>
      ) : (
        <span className="w-fit rounded border border-dashed px-1.5 py-0.5 text-[10px] text-muted-foreground">
          {slot}: —
        </span>
      )}
      {remark && (
        <span className="truncate text-[10px] text-muted-foreground" title={remark}>
          {remark}
        </span>
      )}
    </span>
  );
}

function Slot({
  label,
  status,
  remark,
  onStatus,
  onRemark,
  disabled,
}: {
  label: string;
  status: string;
  remark: string;
  onStatus: (v: string) => void;
  onRemark: (v: string) => void;
  disabled: boolean;
}) {
  return (
    <div className="space-y-1.5">
      <label className="text-[11px] font-medium text-muted-foreground">{label}</label>
      <select
        className={SELECT_CLASS}
        value={status}
        disabled={disabled}
        onChange={(e) => onStatus(e.target.value)}
      >
        <option value="">— None —</option>
        {STATUS_OPTIONS.map((s) => (
          <option key={s} value={s}>
            {s}
          </option>
        ))}
      </select>
      <Input
        className="h-8 text-xs"
        placeholder="Remark (optional)"
        value={remark}
        disabled={disabled}
        onChange={(e) => onRemark(e.target.value)}
      />
    </div>
  );
}
