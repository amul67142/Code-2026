"use client";

import { useState, useTransition } from "react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Input } from "@/components/ui/input";
import { Loader2, Pencil } from "lucide-react";
import { toast } from "sonner";
import { updateLeadStatus } from "./[id]/actions";
import { STATUS_OPTIONS, statusClass } from "./status-options";

export interface LeadStatuses {
  status_1: string | null;
  status_1_remark: string | null;
  status_2: string | null;
  status_2_remark: string | null;
}

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
  value: LeadStatuses;
  onSaved: (next: LeadStatuses) => void;
}) {
  const [open, setOpen] = useState(false);
  const [pending, startTransition] = useTransition();

  // Draft state, seeded from the row each time the editor opens so an
  // abandoned edit never leaks into the next one.
  const [s1, setS1] = useState(value.status_1 || "");
  const [r1, setR1] = useState(value.status_1_remark || "");
  const [s2, setS2] = useState(value.status_2 || "");
  const [r2, setR2] = useState(value.status_2_remark || "");

  function handleOpenChange(next: boolean) {
    if (next) {
      setS1(value.status_1 || "");
      setR1(value.status_1_remark || "");
      setS2(value.status_2 || "");
      setR2(value.status_2_remark || "");
    }
    setOpen(next);
  }

  function save() {
    startTransition(async () => {
      // Empty strings are sent deliberately — that is how a status gets
      // cleared. Omitting the key would leave the old value in place.
      const res = await updateLeadStatus(leadId, {
        status_1: s1,
        status_1_remark: r1.trim(),
        status_2: s2,
        status_2_remark: r2.trim(),
      });

      if (res?.error) {
        toast.error(res.error);
        return;
      }

      onSaved({
        status_1: s1 || null,
        status_1_remark: r1.trim() || null,
        status_2: s2 || null,
        status_2_remark: r2.trim() || null,
      });
      setOpen(false);
      toast.success("Status updated");
    });
  }

  const hasAny = !!(value.status_1 || value.status_2);

  return (
    <Popover open={open} onOpenChange={handleOpenChange}>
      <PopoverTrigger
        className="group -mx-1.5 -my-1 flex w-full max-w-[170px] cursor-pointer flex-col gap-1 rounded px-1.5 py-1 text-left transition-colors hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        aria-label={`Edit status for ${leadName}`}
      >
        {hasAny ? (
          <>
            {value.status_1 && (
              <StatusLine slot={1} status={value.status_1} remark={value.status_1_remark} />
            )}
            {value.status_2 && (
              <StatusLine slot={2} status={value.status_2} remark={value.status_2_remark} />
            )}
          </>
        ) : (
          <span className="flex items-center gap-1 text-xs text-muted-foreground">
            <Pencil className="size-3 opacity-0 transition-opacity group-hover:opacity-100" />
            <span className="group-hover:text-foreground">Set status</span>
          </span>
        )}
      </PopoverTrigger>

      <PopoverContent align="start" className="w-[280px] gap-0 p-3">
        <p className="mb-2 truncate text-xs font-medium text-muted-foreground">{leadName}</p>

        <Slot
          label="Status 1"
          status={s1}
          remark={r1}
          onStatus={setS1}
          onRemark={setR1}
          disabled={pending}
        />
        <div className="mt-3">
          <Slot
            label="Status 2"
            status={s2}
            remark={r2}
            onStatus={setS2}
            onRemark={setR2}
            disabled={pending}
          />
        </div>

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
  slot: 1 | 2;
  status: string;
  remark: string | null;
}) {
  return (
    <span className="flex flex-col">
      <span
        className={`inline-block w-fit rounded border px-1.5 py-0.5 text-[10px] ${statusClass(status)}`}
      >
        {slot}: {status}
      </span>
      {remark && (
        <span className="max-w-[150px] truncate text-[10px] text-muted-foreground" title={remark}>
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
