-- Migration 007: Platform-wide feature flags + per-org overrides
-- Idempotent: safe to re-run.

-- 1. feature_flags table (Super Admin owned, key is canonical snake_case identifier)
CREATE TABLE IF NOT EXISTS feature_flags (
  key VARCHAR PRIMARY KEY,
  display_name VARCHAR NOT NULL,
  description TEXT,
  default_enabled BOOLEAN NOT NULL DEFAULT FALSE,
  beta BOOLEAN NOT NULL DEFAULT FALSE,
  category VARCHAR,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- 2. orgs.feature_flags JSONB column for per-org overrides
--    Shape: { "<flag_key>": true | false }
--    Missing key falls back to feature_flags.default_enabled.
ALTER TABLE orgs ADD COLUMN IF NOT EXISTS feature_flags JSONB DEFAULT '{}'::jsonb;

-- 3. Seed canonical flags. ON CONFLICT DO NOTHING preserves any operator changes
--    made via the Super Admin UI.
INSERT INTO feature_flags (key, display_name, description, default_enabled, beta, category) VALUES
  ('mobile_field_mode',         'Field Mode',                 'Touch-first mobile interface for field staff (banner, dropdown, /field route).', TRUE,  FALSE, 'mobile'),
  ('task_cost_tracking',        'Task Cost Tracking',         'Track labor and material costs per task.',                                       TRUE,  TRUE,  'tasks'),
  ('community_profiles',        'Community Profiles',         'HOA community management features.',                                             FALSE, TRUE,  'communities'),
  ('zapier_integration',        'Zapier Integration',         'Third-party automation integration via Zapier.',                                 TRUE,  FALSE, 'integrations'),
  ('advanced_reporting',        'Advanced Reporting',         'Custom report builder and analytics.',                                           FALSE, TRUE,  'reporting'),
  ('mobile_push_notifications', 'Mobile Push Notifications',  'Native mobile push notifications.',                                              TRUE,  FALSE, 'notifications'),
  ('white_label_branding',      'White Label Branding',       'Custom branding and domain options.',                                            FALSE, TRUE,  'branding')
ON CONFLICT (key) DO NOTHING;
