ALTER TABLE user_notification_preferences
  ADD COLUMN IF NOT EXISTS push_notifications_enabled BOOLEAN NOT NULL DEFAULT FALSE;
