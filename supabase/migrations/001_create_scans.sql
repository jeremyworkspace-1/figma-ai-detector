-- ProofMade: scans table
create table if not exists scans (
  id           uuid        primary key default gen_random_uuid(),
  user_id      text,                          -- Clerk user ID (nullable for guests)
  student_name text,                          -- Figma file name or uploaded file name
  figma_url    text,                          -- source Figma share link
  page_name    text,                          -- selected page
  ai_score     integer     not null,          -- 0–100
  analysis     jsonb,                         -- full Claude response
  created_at   timestamptz not null default now()
);

-- Indexes
create index if not exists scans_created_at_idx on scans (created_at desc);
create index if not exists scans_user_id_idx    on scans (user_id);

-- RLS: enable, then allow anon key full access (prototype mode)
alter table scans enable row level security;

drop policy if exists "allow_all" on scans;
create policy "allow_all" on scans
  for all
  using (true)
  with check (true);
