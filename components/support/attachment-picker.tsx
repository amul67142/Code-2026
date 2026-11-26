"use client";

/**
 * Attach screenshots, videos and screen recordings to a support message.
 * Each file uploads straight to storage the moment it's added (through a
 * one-time link from the server), so sending the message is instant.
 *
 *   - Pick files (images, videos, PDF)
 *   - Paste a screenshot (Ctrl+V anywhere on the form)
 *   - Record the screen in the browser (up to 3 minutes)
 */
import { useCallback, useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { Circle, FileText, Film, ImageIcon, Loader2, Paperclip, Square, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { createClient } from "@/lib/supabase/client";
import { getSupportUploadLink } from "@/app/(app)/support/actions";
import {
  MAX_FILES_PER_MESSAGE,
  MAX_RECORDING_SECONDS,
  SUPPORT_BUCKET,
  attachmentKind,
  baseMime,
  formatBytes,
  type UploadedFile,
} from "@/lib/support/constants";

interface Item {
  key: string;
  name: string;
  size: number;
  mime: string;
  preview: string | null;
  status: "uploading" | "done" | "error";
  uploaded?: UploadedFile;
}

type UploadLink = { path?: string; token?: string; contentType?: string; error?: string };

export function AttachmentPicker({
  onChange,
  onBusyChange,
  pasteTarget,
  getLink = getSupportUploadLink,
  dark = false,
}: {
  onChange: (files: UploadedFile[]) => void;
  onBusyChange?: (busy: boolean) => void;
  /** Element that listens for pasted screenshots (defaults to the window). */
  pasteTarget?: React.RefObject<HTMLElement | null>;
  /** Where upload links come from (the owner portal passes its own). */
  getLink?: (name: string, mime: string, size: number) => Promise<UploadLink>;
  /** Owner portal styling. */
  dark?: boolean;
}) {
  const [items, setItems] = useState<Item[]>([]);
  const inputRef = useRef<HTMLInputElement>(null);
  const [recording, setRecording] = useState(false);
  const [seconds, setSeconds] = useState(0);
  const recorderRef = useRef<MediaRecorder | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Report finished uploads and whether anything is still uploading.
  useEffect(() => {
    onChange(items.filter((i) => i.status === "done" && i.uploaded).map((i) => i.uploaded!));
    onBusyChange?.(items.some((i) => i.status === "uploading") || recording);
  }, [items, recording, onChange, onBusyChange]);

  // Free the local previews when the picker goes away (parents remount it to clear).
  const itemsRef = useRef<Item[]>([]);
  useEffect(() => {
    itemsRef.current = items;
  }, [items]);
  useEffect(() => () => itemsRef.current.forEach((i) => i.preview && URL.revokeObjectURL(i.preview)), []);

  const upload = useCallback(async (file: File) => {
    const key = `${Date.now()}-${Math.random().toString(36).slice(2)}`;
    const mime = baseMime(file.type) || "application/octet-stream";
    const preview = attachmentKind(mime) !== "FILE" ? URL.createObjectURL(file) : null;
    setItems((prev) => [...prev, { key, name: file.name, size: file.size, mime, preview, status: "uploading" }]);

    const fail = (msg: string) => {
      toast.error(msg);
      setItems((prev) => prev.filter((i) => i.key !== key));
      if (preview) URL.revokeObjectURL(preview);
    };

    try {
      const link = await getLink(file.name, mime, file.size);
      if (link.error) return fail(link.error);
      if (!link.token || !link.path) return fail("Could not prepare the upload.");
      const path = link.path;
      const supabase = createClient();
      const { error } = await supabase.storage
        .from(SUPPORT_BUCKET)
        .uploadToSignedUrl(link.path, link.token, file, { contentType: link.contentType });
      if (error) return fail(`${file.name} did not upload. Please try again.`);
      setItems((prev) =>
        prev.map((i) =>
          i.key === key
            ? { ...i, status: "done", uploaded: { path, name: file.name, mime, size: file.size } }
            : i
        )
      );
    } catch {
      fail(`${file.name} did not upload. Check your connection and try again.`);
    }
  }, [getLink]);

  const addFiles = useCallback(
    (files: File[]) => {
      const room = MAX_FILES_PER_MESSAGE - items.length;
      if (room <= 0) {
        toast.error(`You can attach up to ${MAX_FILES_PER_MESSAGE} files.`);
        return;
      }
      if (files.length > room) toast.error(`Only the first ${room} file${room > 1 ? "s were" : " was"} added (limit ${MAX_FILES_PER_MESSAGE}).`);
      files.slice(0, room).forEach((f) => void upload(f));
    },
    [items.length, upload]
  );

  // Paste a screenshot straight from the clipboard.
  useEffect(() => {
    const target: HTMLElement | Window = pasteTarget?.current || window;
    const onPaste = (e: Event) => {
      const ev = e as ClipboardEvent;
      const files = Array.from(ev.clipboardData?.files || []).filter((f) => f.type.startsWith("image/"));
      if (!files.length) return;
      ev.preventDefault();
      addFiles(
        files.map((f, i) => new File([f], f.name && f.name !== "image.png" ? f.name : `screenshot-${Date.now()}-${i + 1}.png`, { type: f.type }))
      );
    };
    target.addEventListener("paste", onPaste);
    return () => target.removeEventListener("paste", onPaste);
  }, [addFiles, pasteTarget]);

  const stopTracks = () => {
    streamRef.current?.getTracks().forEach((t) => t.stop());
    streamRef.current = null;
    if (timerRef.current) clearInterval(timerRef.current);
    timerRef.current = null;
  };

  useEffect(() => () => stopTracks(), []);

  async function startRecording() {
    if (!navigator.mediaDevices?.getDisplayMedia || typeof MediaRecorder === "undefined") {
      toast.error("Screen recording isn't supported in this browser. Use Chrome or Edge on a computer, or attach a video file.");
      return;
    }
    if (items.length >= MAX_FILES_PER_MESSAGE) {
      toast.error(`You can attach up to ${MAX_FILES_PER_MESSAGE} files.`);
      return;
    }
    let stream: MediaStream;
    try {
      stream = await navigator.mediaDevices.getDisplayMedia({ video: { frameRate: 15 }, audio: true });
    } catch {
      return; // the user cancelled the share picker
    }
    streamRef.current = stream;
    const type = ["video/webm;codecs=vp9", "video/webm;codecs=vp8", "video/webm", "video/mp4"].find((t) => MediaRecorder.isTypeSupported(t)) || "";
    const recorder = new MediaRecorder(stream, { mimeType: type || undefined, videoBitsPerSecond: 1_200_000 });
    const chunks: Blob[] = [];
    recorder.ondataavailable = (e) => e.data.size && chunks.push(e.data);
    recorder.onstop = () => {
      stopTracks();
      setRecording(false);
      const mime = baseMime(recorder.mimeType || type || "video/webm");
      const blob = new Blob(chunks, { type: mime });
      if (!blob.size) return;
      const ext = mime === "video/mp4" ? "mp4" : "webm";
      void upload(new File([blob], `screen-recording-${new Date().toISOString().slice(0, 19).replace(/[:T]/g, "-")}.${ext}`, { type: mime }));
    };
    // Stopping the share from the browser's own bar ends the recording too.
    stream.getVideoTracks()[0]?.addEventListener("ended", () => recorder.state !== "inactive" && recorder.stop());
    recorderRef.current = recorder;
    recorder.start(1000);
    setSeconds(0);
    setRecording(true);
    timerRef.current = setInterval(() => {
      setSeconds((s) => {
        if (s + 1 >= MAX_RECORDING_SECONDS && recorder.state !== "inactive") recorder.stop();
        return s + 1;
      });
    }, 1000);
  }

  function stopRecording() {
    if (recorderRef.current && recorderRef.current.state !== "inactive") recorderRef.current.stop();
  }

  function remove(key: string) {
    setItems((prev) => {
      const it = prev.find((i) => i.key === key);
      if (it?.preview) URL.revokeObjectURL(it.preview);
      return prev.filter((i) => i.key !== key);
    });
  }

  const mmss = (s: number) => `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`;

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center gap-2">
        <input
          ref={inputRef}
          type="file"
          multiple
          accept="image/png,image/jpeg,image/webp,image/gif,video/webm,video/mp4,video/quicktime,application/pdf"
          className="hidden"
          onChange={(e) => {
            addFiles(Array.from(e.target.files || []));
            e.target.value = "";
          }}
        />
        <Button type="button" variant="outline" size="sm" onClick={() => inputRef.current?.click()} disabled={recording}>
          <Paperclip className="size-4" /> Attach files
        </Button>
        {recording ? (
          <Button type="button" variant="destructive" size="sm" onClick={stopRecording}>
            <Square className="size-3.5 fill-current" /> Stop recording · {mmss(seconds)}
          </Button>
        ) : (
          <Button type="button" variant="outline" size="sm" onClick={startRecording}>
            <Circle className="size-3.5 fill-red-500 text-red-500" /> Record screen
          </Button>
        )}
        <span className={cn("text-xs", dark ? "text-zinc-500" : "text-muted-foreground")}>
          or paste a screenshot (Ctrl+V). Up to {MAX_FILES_PER_MESSAGE} files · images 10 MB · videos 50 MB · recordings up to {MAX_RECORDING_SECONDS / 60} min
        </span>
      </div>

      {items.length > 0 && (
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 md:grid-cols-5">
          {items.map((it) => {
            const kind = attachmentKind(it.mime);
            return (
              <div key={it.key} className={cn("group relative overflow-hidden rounded-lg border", dark ? "border-zinc-700 bg-zinc-900" : "bg-muted/30")}>
                <div className={cn("relative flex aspect-video items-center justify-center", dark ? "bg-zinc-800" : "bg-muted")}>
                  {kind === "IMAGE" && it.preview ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={it.preview} alt={it.name} className="size-full object-cover" />
                  ) : kind === "VIDEO" && it.preview ? (
                    <video src={it.preview} className="size-full object-cover" muted />
                  ) : (
                    <FileText className="size-6 text-muted-foreground" />
                  )}
                  {it.status === "uploading" && (
                    <div className="absolute inset-0 flex items-center justify-center bg-background/60">
                      <Loader2 className="size-5 animate-spin" />
                    </div>
                  )}
                </div>
                <div className="flex items-center gap-1.5 px-2 py-1.5 text-xs">
                  {kind === "IMAGE" ? <ImageIcon className="size-3 shrink-0" /> : kind === "VIDEO" ? <Film className="size-3 shrink-0" /> : <FileText className="size-3 shrink-0" />}
                  <span className="truncate" title={it.name}>{it.name}</span>
                  <span className="ml-auto shrink-0 text-muted-foreground">{formatBytes(it.size)}</span>
                </div>
                <button
                  type="button"
                  onClick={() => remove(it.key)}
                  className="absolute right-1 top-1 rounded-full bg-background/90 p-1 shadow-sm hover:bg-background"
                  aria-label={`Remove ${it.name}`}
                >
                  <X className="size-3" />
                </button>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
