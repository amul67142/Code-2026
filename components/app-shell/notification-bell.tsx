"use client";

import { useState, useEffect, useCallback } from "react";
import { Bell, Check, CheckCheck, ExternalLink } from "lucide-react";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  getNotifications,
  markNotificationAsRead,
  markAllNotificationsAsRead,
} from "@/app/(app)/notifications/actions";
import { useRouter } from "next/navigation";
import { formatDistanceToNow } from "date-fns";
import { createClient } from "@/lib/supabase/client";
import { useUser } from "@/lib/user-context";
import { toast } from "sonner";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type NotificationRow = any;

// Icon shown in the native desktop notification.
const NOTIF_ICON =
  "https://res.cloudinary.com/dy2zpgv6q/image/upload/v1779118448/Gemini_Generated_Image_2kpsnp2kpsnp2kps_1_-Photoroom_ddqkxb.png";

/** Ask the browser for desktop-notification permission (call from a user gesture). */
function requestDesktopPermission() {
  try {
    if (typeof window === "undefined" || !("Notification" in window)) return;
    if (window.Notification.permission === "default") {
      window.Notification.requestPermission().catch(() => {});
    }
  } catch {
    /* ignore */
  }
}

/** Short, pleasant two-note chime via the Web Audio API (no asset needed). */
function playChime() {
  try {
    const AudioCtx =
      window.AudioContext ||
      (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!AudioCtx) return;
    const ctx = new AudioCtx();
    if (ctx.state === "suspended") ctx.resume();
    const now = ctx.currentTime;
    ([
      [880, 0],
      [1318.5, 0.12],
    ] as const).forEach(([freq, t]) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = "sine";
      osc.frequency.value = freq;
      gain.gain.setValueAtTime(0.0001, now + t);
      gain.gain.exponentialRampToValueAtTime(0.18, now + t + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.0001, now + t + 0.3);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(now + t);
      osc.stop(now + t + 0.32);
    });
    setTimeout(() => ctx.close().catch(() => {}), 900);
  } catch {
    // audio not available / blocked — ignore
  }
}

export function NotificationBell() {
  const [notifications, setNotifications] = useState<NotificationRow[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [open, setOpen] = useState(false);
  const router = useRouter();
  const { id: userId } = useUser();

  const fetchNotifications = useCallback(async () => {
    try {
      const data = await getNotifications();
      setNotifications(data.notifications);
      setUnreadCount(data.unreadCount);
    } catch {
      // silently fail
    }
  }, []);

  // Fetch on mount + a slow safety poll (realtime handles the live updates).
  useEffect(() => {
    fetchNotifications();
    const interval = setInterval(fetchNotifications, 60000);
    return () => clearInterval(interval);
  }, [fetchNotifications]);

  // ── Realtime: push new notifications instantly with a chime + toast ──
  useEffect(() => {
    if (!userId) return;
    const supabase = createClient();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let channel: any = null;
    let cancelled = false;

    (async () => {
      // CRITICAL: Realtime + RLS. The notifications SELECT policy checks
      // auth.uid(); without the user's JWT on the socket, RLS delivers nothing.
      // Explicitly authenticate the realtime connection before subscribing.
      const {
        data: { session },
      } = await supabase.auth.getSession();
      if (session?.access_token) {
        await supabase.realtime.setAuth(session.access_token);
      }
      if (cancelled) return;

      channel = supabase
        .channel(`notifications:${userId}`)
        .on(
          "postgres_changes",
          {
            event: "INSERT",
            schema: "public",
            table: "notifications",
            filter: `user_id=eq.${userId}`,
          },
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          (payload: any) => {
            const n = payload.new;
            setNotifications((prev) =>
              prev.some((x) => x.id === n.id) ? prev : [n, ...prev]
            );
            setUnreadCount((c) => c + 1);
            playChime();
            toast(n.title, {
              description: n.message,
              action: n.metadata?.lead_id
                ? {
                    label: "View",
                    onClick: () => router.push(`/leads/${n.metadata.lead_id}`),
                  }
                : undefined,
            });

            // Desktop notification when the tab isn't focused (works cross-tab/app).
            if (
              "Notification" in window &&
              window.Notification.permission === "granted" &&
              document.hidden
            ) {
              try {
                const native = new window.Notification(n.title, {
                  body: n.message || "",
                  icon: NOTIF_ICON,
                  tag: n.id,
                });
                native.onclick = () => {
                  window.focus();
                  if (n.metadata?.lead_id) router.push(`/leads/${n.metadata.lead_id}`);
                  native.close();
                };
              } catch {
                /* ignore */
              }
            }
          }
        )
        .subscribe((status: string) => {
          if (status === "CHANNEL_ERROR" || status === "TIMED_OUT") {
            console.warn("[notifications] realtime status:", status);
          }
        });
    })();

    return () => {
      cancelled = true;
      if (channel) supabase.removeChannel(channel);
    };
  }, [userId, router]);

  // Refetch when popover opens
  useEffect(() => {
    if (open) fetchNotifications();
  }, [open, fetchNotifications]);

  async function handleMarkRead(id: string) {
    await markNotificationAsRead(id);
    setNotifications((prev) =>
      prev.map((n) => (n.id === id ? { ...n, read_at: new Date().toISOString() } : n))
    );
    setUnreadCount((c) => Math.max(0, c - 1));
  }

  async function handleMarkAllRead() {
    await markAllNotificationsAsRead();
    setNotifications((prev) =>
      prev.map((n) => ({ ...n, read_at: n.read_at || new Date().toISOString() }))
    );
    setUnreadCount(0);
  }

  function handleClick(notification: NotificationRow) {
    if (!notification.read_at) handleMarkRead(notification.id);
    const leadId = notification.metadata?.lead_id;
    if (leadId) {
      router.push(`/leads/${leadId}`);
      setOpen(false);
    }
  }

  return (
    <Popover
      open={open}
      onOpenChange={(v) => {
        setOpen(v);
        // Opening the bell is a user gesture — ask for desktop-notification
        // permission (and it also unlocks audio autoplay for the chime).
        if (v) requestDesktopPermission();
      }}
    >
      <PopoverTrigger
        className="relative inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-md text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0 hover:bg-accent hover:text-accent-foreground h-8 px-3 text-gray-500 hover:text-gray-900"
      >
        <Bell className="size-4" />
        {unreadCount > 0 && (
          <span className="absolute -top-0.5 -right-0.5 min-w-[16px] h-4 flex items-center justify-center bg-red-500 text-white text-[10px] font-bold rounded-full px-1">
            {unreadCount > 9 ? "9+" : unreadCount}
          </span>
        )}
      </PopoverTrigger>
      <PopoverContent align="end" className="w-[360px] p-0">
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b">
          <h3 className="text-sm font-semibold">Notifications</h3>
          {unreadCount > 0 && (
            <button
              onClick={handleMarkAllRead}
              className="text-xs text-primary hover:underline flex items-center gap-1"
            >
              <CheckCheck className="size-3" />
              Mark all read
            </button>
          )}
        </div>

        {/* List */}
        <div className="max-h-[360px] overflow-y-auto">
          {notifications.length === 0 ? (
            <div className="px-4 py-8 text-center text-sm text-muted-foreground">
              No notifications yet
            </div>
          ) : (
            notifications.map((n) => (
              <div
                key={n.id}
                onClick={() => handleClick(n)}
                className={`flex items-start gap-3 px-4 py-3 border-b last:border-0 cursor-pointer hover:bg-muted/50 transition-colors ${
                  !n.read_at ? "bg-primary/5" : ""
                }`}
              >
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    {!n.read_at && (
                      <span className="size-2 rounded-full bg-primary flex-shrink-0" />
                    )}
                    <p className="text-sm font-medium truncate">{n.title}</p>
                  </div>
                  <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2">
                    {n.message}
                  </p>
                  <p className="text-[10px] text-muted-foreground mt-1">
                    {formatDistanceToNow(new Date(n.created_at), { addSuffix: true })}
                  </p>
                </div>
                <div className="flex items-center gap-1 flex-shrink-0 mt-1">
                  {!n.read_at && (
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleMarkRead(n.id);
                      }}
                      className="p-1 rounded hover:bg-muted text-muted-foreground hover:text-foreground"
                      title="Mark as read"
                    >
                      <Check className="size-3" />
                    </button>
                  )}
                  {n.metadata?.lead_id && (
                    <ExternalLink className="size-3 text-muted-foreground" />
                  )}
                </div>
              </div>
            ))
          )}
        </div>
      </PopoverContent>
    </Popover>
  );
}
