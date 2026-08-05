-- Add dedicated column to track when the platform-ready provisioning email was sent,
-- separate from the legacy welcome-stage email tracked by welcome_email_sent_at.
ALTER TABLE onboarding_prospects
  ADD COLUMN IF NOT EXISTS platform_ready_email_sent_at TIMESTAMP;
