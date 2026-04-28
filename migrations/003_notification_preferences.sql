-- Migration: Add notification preference columns for per-user advance notice windows
-- and organization-level notification defaults

BEGIN;

-- New columns on user_notification_preferences for per-user advance notice windows
-- and a dedicated calendar event email toggle
ALTER TABLE user_notification_preferences
  ADD COLUMN IF NOT EXISTS email_on_calendar_event BOOLEAN NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS task_overdue_hours_offset INTEGER,
  ADD COLUMN IF NOT EXISTS inspection_advance_days INTEGER,
  ADD COLUMN IF NOT EXISTS invoice_advance_days INTEGER,
  ADD COLUMN IF NOT EXISTS calendar_advance_minutes INTEGER;

-- notification_defaults column was already added to orgs in an earlier migration
-- (no-op if already present)
ALTER TABLE orgs
  ADD COLUMN IF NOT EXISTS notification_defaults JSONB DEFAULT '{}'::jsonb;

-- email_invoice_reminders opt-in flag on portal_users
ALTER TABLE portal_users
  ADD COLUMN IF NOT EXISTS email_invoice_reminders BOOLEAN NOT NULL DEFAULT true;

COMMIT;
