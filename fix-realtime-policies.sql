-- Fix RLS policies to allow Realtime subscriptions for Notifications
-- Realtime respects RLS. If a user cannot SELECT a row, they won't receive INSERT/UPDATE events for it.

BEGIN;

-- 1. Ensure RLS is enabled on the table (it should be, but good to be sure)
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;

-- 2. Create the policy for users to see their own notifications
-- We use "CREATE OR REPLACE" logic by dropping first to avoid conflicts if it exists
DROP POLICY IF EXISTS "Users can view their own notifications" ON notifications;

CREATE POLICY "Users can view their own notifications"
ON notifications
FOR SELECT
USING (auth.uid()::text = "userId");

-- 3. The table is already in the publication (confirmed by error 42710)
-- ALTER PUBLICATION supabase_realtime ADD TABLE notifications;

COMMIT;
