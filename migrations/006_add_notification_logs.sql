CREATE TABLE IF NOT EXISTS notification_logs (
  id SERIAL PRIMARY KEY,
  org_id UUID NOT NULL REFERENCES orgs(id),
  type VARCHAR NOT NULL,
  recipient_email VARCHAR NOT NULL,
  recipient_name VARCHAR,
  subject TEXT NOT NULL,
  status VARCHAR NOT NULL DEFAULT 'sent',
  error_message TEXT,
  related_entity_type VARCHAR,
  related_entity_id VARCHAR,
  sent_at TIMESTAMP DEFAULT NOW(),
  created_at TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS notification_logs_org_idx ON notification_logs(org_id);
CREATE INDEX IF NOT EXISTS notification_logs_type_idx ON notification_logs(type);
CREATE INDEX IF NOT EXISTS notification_logs_recipient_idx ON notification_logs(recipient_email);
