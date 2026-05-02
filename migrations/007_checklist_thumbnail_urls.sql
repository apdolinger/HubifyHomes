-- Migration: Add thumbnailUrls array column to task_checklist_items for auto-generated photo thumbnails

BEGIN;

ALTER TABLE task_checklist_items
  ADD COLUMN IF NOT EXISTS thumbnail_urls text[] NOT NULL DEFAULT '{}';

COMMIT;
