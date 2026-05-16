"use server";

import { createClient } from "@/lib/supabase/server";

// ── Helper: get current user's profile ──────────────────────────
async function getUserProfile() {
  const supabase = await createClient();
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();
  if (authError || !user) return null;

  const { data: profile } = await supabase
    .from("users")
    .select("id, company_id, role")
    .eq("auth_user_id", user.id)
    .single();

  return profile;
}

// ── Get notifications for current user ─────────────────────────
export async function getNotifications() {
  const supabase = await createClient();
  const profile = await getUserProfile();
  if (!profile) return { notifications: [], unreadCount: 0 };

  const { data: notifications } = await supabase
    .from("notifications")
    .select("*")
    .eq("user_id", profile.id)
    .order("created_at", { ascending: false })
    .limit(20);

  const unreadCount = (notifications || []).filter((n) => !n.read_at).length;

  return { notifications: notifications || [], unreadCount };
}

// ── Mark a single notification as read ─────────────────────────
export async function markNotificationAsRead(notificationId: string) {
  const supabase = await createClient();
  const profile = await getUserProfile();
  if (!profile) return { error: "Unauthorized" };

  const { error } = await supabase
    .from("notifications")
    .update({ read_at: new Date().toISOString() })
    .eq("id", notificationId)
    .eq("user_id", profile.id);

  if (error) {
    console.error("markNotificationAsRead error:", error);
    return { error: "Failed to mark notification as read" };
  }

  return { success: true };
}

// ── Mark all notifications as read ─────────────────────────────
export async function markAllNotificationsAsRead() {
  const supabase = await createClient();
  const profile = await getUserProfile();
  if (!profile) return { error: "Unauthorized" };

  const { error } = await supabase
    .from("notifications")
    .update({ read_at: new Date().toISOString() })
    .eq("user_id", profile.id)
    .is("read_at", null);

  if (error) {
    console.error("markAllNotificationsAsRead error:", error);
    return { error: "Failed to mark all as read" };
  }

  return { success: true };
}
