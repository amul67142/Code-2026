/**
 * Files on a support message: images as thumbnails, videos playable inline,
 * anything else as a download link. Links are signed and last an hour.
 */
import { FileText } from "lucide-react";
import { formatBytes, type AttachmentView } from "@/lib/support/constants";
import { cn } from "@/lib/utils";

export function AttachmentList({ files, dark = false }: { files: AttachmentView[]; dark?: boolean }) {
  if (!files.length) return null;
  const border = dark ? "border-zinc-700" : "border-gray-200";
  const muted = dark ? "text-zinc-400" : "text-gray-500";
  return (
    <div className="mt-3 grid grid-cols-1 gap-2 sm:grid-cols-2">
      {files.map((f) =>
        !f.url ? (
          <div key={f.id} className={cn("rounded-lg border px-3 py-2 text-xs", border, muted)}>
            {f.name} — file unavailable
          </div>
        ) : f.kind === "IMAGE" ? (
          <a key={f.id} href={f.url} target="_blank" rel="noreferrer" className={cn("block overflow-hidden rounded-lg border", border)}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={f.url} alt={f.name} className="max-h-64 w-full object-contain bg-black/5" />
            <div className={cn("truncate px-3 py-1.5 text-xs", muted)}>{f.name} · {formatBytes(f.size)}</div>
          </a>
        ) : f.kind === "VIDEO" ? (
          <div key={f.id} className={cn("overflow-hidden rounded-lg border", border)}>
            <video src={f.url} controls preload="metadata" className="max-h-72 w-full bg-black" />
            <div className={cn("flex justify-between gap-2 px-3 py-1.5 text-xs", muted)}>
              <span className="truncate">{f.name} · {formatBytes(f.size)}</span>
              <a href={f.url} target="_blank" rel="noreferrer" className="shrink-0 underline">Open</a>
            </div>
          </div>
        ) : (
          <a key={f.id} href={f.url} target="_blank" rel="noreferrer" className={cn("flex items-center gap-2 rounded-lg border px-3 py-2 text-sm hover:underline", border)}>
            <FileText className="size-4 shrink-0" />
            <span className="truncate">{f.name}</span>
            <span className={cn("ml-auto shrink-0 text-xs", muted)}>{formatBytes(f.size)}</span>
          </a>
        )
      )}
    </div>
  );
}
