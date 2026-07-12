-- ============================================================================
-- 017_realtime_notifications.sql
-- Enable Supabase Realtime on the notifications table so the app can push live
-- alerts (e.g. a lead qualifying on WhatsApp) to the assigned agent instantly,
-- instead of polling every 30s. RLS ("Users can view own notifications") still
-- applies — each user only receives their own rows.
-- Idempotent: only adds the table if it isn't already in the publication.
-- ============================================================================

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime'
      AND schemaname = 'public'
      AND tablename = 'notifications'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE notifications;
  END IF;
END $$;
