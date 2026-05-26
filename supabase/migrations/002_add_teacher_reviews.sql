-- Add teacher review column to scans
alter table scans
  add column if not exists teacher_reviews jsonb not null default '{}'::jsonb;
