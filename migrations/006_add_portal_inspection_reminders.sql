ALTER TABLE portal_users ADD COLUMN IF NOT EXISTS email_inspection_reminders boolean NOT NULL DEFAULT true;
