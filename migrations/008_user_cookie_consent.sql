-- Cookie consent persistence per authenticated user.
CREATE TABLE IF NOT EXISTS user_cookie_consent (
  user_id varchar PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
  version integer NOT NULL DEFAULT 1,
  essential boolean NOT NULL DEFAULT true,
  analytics boolean NOT NULL DEFAULT false,
  marketing boolean NOT NULL DEFAULT false,
  decided_at timestamp NOT NULL DEFAULT now(),
  updated_at timestamp DEFAULT now()
);

-- Portal users have their own cookie consent table since they auth via a
-- separate session/token system rather than OIDC.
CREATE TABLE IF NOT EXISTS portal_user_cookie_consent (
  portal_user_id uuid PRIMARY KEY REFERENCES portal_users(id) ON DELETE CASCADE,
  version integer NOT NULL DEFAULT 1,
  essential boolean NOT NULL DEFAULT true,
  analytics boolean NOT NULL DEFAULT false,
  marketing boolean NOT NULL DEFAULT false,
  decided_at timestamp NOT NULL DEFAULT now(),
  updated_at timestamp DEFAULT now()
);
