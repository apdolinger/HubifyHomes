-- Migration: Add photoUrls array column to task_checklist_items for multiple photo attachments

BEGIN;

ALTER TABLE task_checklist_items
  ADD COLUMN IF NOT EXISTS photo_urls text[] NOT NULL DEFAULT '{}';

COMMIT;
