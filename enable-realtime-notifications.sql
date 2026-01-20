-- Enable Realtime for the notifications table
-- This allows the client to subscribe to changes (INSERT, UPDATE, DELETE)
-- so we can update the notification count instantly without polling.

begin;
  -- Add the table to the publication
  alter publication supabase_realtime add table notifications;
commit;
