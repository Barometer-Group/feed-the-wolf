-- Feed the Wolf — Trainer/Athlete associations
-- Run this in Supabase SQL Editor

-- ── 1. Add is_athlete / is_trainer booleans to profiles ──────────────────────
alter table profiles
  add column if not exists is_athlete boolean not null default true,
  add column if not exists is_trainer boolean not null default false;

-- Backfill from existing role column so nothing breaks
update profiles set is_trainer = true where role = 'trainer';
update profiles set is_athlete = true;  -- everyone is an athlete by default


-- ── 2. Extend trainer_athletes with status, notes, invite tracking ────────────
alter table trainer_athletes
  add column if not exists status       text        not null default 'accepted'
    check (status in ('pending', 'accepted')),
  add column if not exists invited_by   uuid        references profiles(id) on delete set null,
  add column if not exists invited_at   timestamptz not null default now(),
  add column if not exists accepted_at  timestamptz,
  add column if not exists trainer_notes text,
  add column if not exists client_info  text;

-- Existing rows have no invite — mark them accepted
update trainer_athletes set accepted_at = now() where accepted_at is null;


-- ── 3. Add trainer_endorsed flag to workout_plans ─────────────────────────────
alter table workout_plans
  add column if not exists trainer_endorsed boolean not null default false;


-- ── 4. RLS for trainer_athletes ───────────────────────────────────────────────
alter table trainer_athletes enable row level security;

-- Trainer can see all their rows (as trainer or athlete)
create policy "trainer_athletes_select" on trainer_athletes
  for select using (
    trainer_id = auth.uid() or athlete_id = auth.uid()
  );

-- Only the person who initiated the invite can insert
create policy "trainer_athletes_insert" on trainer_athletes
  for insert with check (
    trainer_id = auth.uid() or athlete_id = auth.uid()
  );

-- Either party can update (e.g. athlete accepts invite, trainer adds notes)
create policy "trainer_athletes_update" on trainer_athletes
  for update using (
    trainer_id = auth.uid() or athlete_id = auth.uid()
  );

-- Either party can delete (remove the relationship)
create policy "trainer_athletes_delete" on trainer_athletes
  for delete using (
    trainer_id = auth.uid() or athlete_id = auth.uid()
  );
