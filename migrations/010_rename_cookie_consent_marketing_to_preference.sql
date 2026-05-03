-- Rename the second cookie-consent category column from `marketing` to
-- `preference` so the database matches the UI/Privacy-Policy wording.
-- Idempotent: only renames when the old column still exists and the new
-- one does not. Where both exist (mid-deploy), backfill `preference` from
-- `marketing` and drop the old column.

DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'user_cookie_consent' AND column_name = 'marketing'
  ) AND NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'user_cookie_consent' AND column_name = 'preference'
  ) THEN
    ALTER TABLE user_cookie_consent RENAME COLUMN marketing TO preference;
  ELSIF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'user_cookie_consent' AND column_name = 'marketing'
  ) AND EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'user_cookie_consent' AND column_name = 'preference'
  ) THEN
    UPDATE user_cookie_consent SET preference = marketing WHERE preference IS DISTINCT FROM marketing;
    ALTER TABLE user_cookie_consent DROP COLUMN marketing;
  END IF;

  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'portal_user_cookie_consent' AND column_name = 'marketing'
  ) AND NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'portal_user_cookie_consent' AND column_name = 'preference'
  ) THEN
    ALTER TABLE portal_user_cookie_consent RENAME COLUMN marketing TO preference;
  ELSIF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'portal_user_cookie_consent' AND column_name = 'marketing'
  ) AND EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'portal_user_cookie_consent' AND column_name = 'preference'
  ) THEN
    UPDATE portal_user_cookie_consent SET preference = marketing WHERE preference IS DISTINCT FROM marketing;
    ALTER TABLE portal_user_cookie_consent DROP COLUMN marketing;
  END IF;
END $$;
