-- Feed the Wolf - Initial schema and RLS
-- Run this in Supabase SQL Editor after creating your project

-- Enable UUID extension
create extension if not exists "uuid-ossp";

-- 1. profiles
create table profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  full_name text not null,
  avatar_url text,
  role text not null check (role in ('admin', 'trainer', 'athlete')) default 'athlete',
  leaderboard_visible boolean default true,
  created_at timestamptz default now()
);

-- 2. trainer_athletes
create table trainer_athletes (
  id uuid primary key default gen_random_uuid(),
  trainer_id uuid not null references profiles(id) on delete cascade,
  athlete_id uuid not null references profiles(id) on delete cascade,
  created_at timestamptz default now(),
  unique(trainer_id, athlete_id)
);

-- 3. exercises (library)
create table exercises (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  category text not null check (category in ('strength', 'cardio', 'flexibility', 'sports')),
  muscle_groups text[] default '{}',
  description text,
  demo_video_url text,
  created_at timestamptz default now()
);

-- 4. workout_plans
create table workout_plans (
  id uuid primary key default gen_random_uuid(),
  created_by uuid not null references profiles(id) on delete cascade,
  athlete_id uuid references profiles(id) on delete cascade,
  name text not null,
  description text,
  scheduled_date date,
  is_template boolean default false,
  created_at timestamptz default now()
);

-- 5. workout_plan_exercises
create table workout_plan_exercises (
  id uuid primary key default gen_random_uuid(),
  plan_id uuid not null references workout_plans(id) on delete cascade,
  exercise_id uuid not null references exercises(id) on delete cascade,
  order_index integer not null default 0,
  prescribed_sets integer,
  prescribed_reps integer,
  prescribed_weight_lbs decimal(6,2),
  prescribed_duration_seconds integer,
  notes text,
  created_at timestamptz default now()
);

-- 6. workout_logs
create table workout_logs (
  id uuid primary key default gen_random_uuid(),
  athlete_id uuid not null references profiles(id) on delete cascade,
  plan_id uuid references workout_plans(id) on delete set null,
  started_at timestamptz not null default now(),
  completed_at timestamptz,
  overall_notes text,
  perceived_effort integer check (perceived_effort between 1 and 10),
  created_at timestamptz default now()
);

-- 7. exercise_logs
create table exercise_logs (
  id uuid primary key default gen_random_uuid(),
  workout_log_id uuid not null references workout_logs(id) on delete cascade,
  exercise_id uuid not null references exercises(id) on delete cascade,
  set_number integer not null,
  reps integer,
  weight_lbs decimal(6,2),
  duration_seconds integer,
  distance_meters decimal(8,2),
  notes text,
  logged_via text check (logged_via in ('voice', 'manual')) default 'manual',
  created_at timestamptz default now()
);

-- 8. media_uploads
create table media_uploads (
  id uuid primary key default gen_random_uuid(),
  workout_log_id uuid references workout_logs(id) on delete cascade,
  exercise_log_id uuid references exercise_logs(id) on delete set null,
  uploader_id uuid not null references profiles(id) on delete cascade,
  url text not null,
  type text not null check (type in ('photo', 'video')),
  caption text,
  trainer_feedback text,
  feedback_read boolean default false,
  created_at timestamptz default now()
);

-- 9. achievements
create table achievements (
  id uuid primary key default gen_random_uuid(),
  athlete_id uuid not null references profiles(id) on delete cascade,
  type text not null,
  title text not null,
  description text,
  earned_at timestamptz default now(),
  metadata jsonb default '{}'
);

-- 10. points_ledger
create table points_ledger (
  id uuid primary key default gen_random_uuid(),
  athlete_id uuid not null references profiles(id) on delete cascade,
  points integer not null,
  reason text not null,
  created_at timestamptz default now()
);

-- 11. notifications
create table notifications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references profiles(id) on delete cascade,
  type text not null,
  title text not null,
  body text,
  read boolean default false,
  metadata jsonb default '{}',
  created_at timestamptz default now()
);

-- Trigger: auto-insert profile when auth.users row is created
create or replace function public.handle_new_user()
returns trigger as $$
declare
  user_role text := coalesce(
    nullif(new.raw_user_meta_data->>'role', ''),
    'athlete'
  );
begin
  -- Only allow athlete or trainer in meta; admin must be set by existing admin
  if user_role not in ('athlete', 'trainer') then
    user_role := 'athlete';
  end if;
  insert into public.profiles (id, full_name, role)
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'full_name', 'User'),
    user_role
  );
  return new;
end;
$$ language plpgsql security definer;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

-- Storage buckets (workout-media, avatars)
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'workout-media',
  'workout-media',
  true,
  104857600, -- 100MB
  array['image/jpeg', 'image/png', 'image/webp', 'video/mp4', 'video/quicktime']
)
on conflict (id) do nothing;

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'avatars',
  'avatars',
  true,
  5242880, -- 5MB
  array['image/jpeg', 'image/png', 'image/webp']
)
on conflict (id) do nothing;

-- Storage policies for workout-media
create policy "Authenticated users can upload workout media"
  on storage.objects for insert
  with check (bucket_id = 'workout-media' and auth.role() = 'authenticated');

create policy "Public read for workout media"
  on storage.objects for select
  using (bucket_id = 'workout-media');

create policy "Users can update own workout media"
  on storage.objects for update
  using (bucket_id = 'workout-media' and auth.uid()::text = (storage.foldername(name))[1]);

-- Storage policies for avatars
create policy "Authenticated users can upload avatars"
  on storage.objects for insert
  with check (bucket_id = 'avatars' and auth.role() = 'authenticated');

create policy "Public read for avatars"
  on storage.objects for select
  using (bucket_id = 'avatars');

create policy "Users can update own avatar"
  on storage.objects for update
  using (bucket_id = 'avatars' and auth.uid()::text = (storage.foldername(name))[1]);

-- Enable RLS on all tables
alter table profiles enable row level security;
alter table trainer_athletes enable row level security;
alter table exercises enable row level security;
alter table workout_plans enable row level security;
alter table workout_plan_exercises enable row level security;
alter table workout_logs enable row level security;
alter table exercise_logs enable row level security;
alter table media_uploads enable row level security;
alter table achievements enable row level security;
alter table points_ledger enable row level security;
alter table notifications enable row level security;

-- profiles policies
create policy "Users can read own profile"
  on profiles for select using (auth.uid() = id);

create policy "Users can update own profile"
  on profiles for update using (auth.uid() = id);

create policy "Admins can read all profiles"
  on profiles for select using (
    exists (select 1 from profiles where id = auth.uid() and role = 'admin')
  );

create policy "Admins can update all profiles"
  on profiles for update using (
    exists (select 1 from profiles where id = auth.uid() and role = 'admin')
  );

create policy "Trainers can read athlete profiles"
  on profiles for select using (
    exists (
      select 1 from trainer_athletes
      where trainer_id = auth.uid() and athlete_id = profiles.id
    )
  );

-- trainer_athletes policies (admin only for management)
create policy "Admins can manage trainer_athletes"
  on trainer_athletes for all using (
    exists (select 1 from profiles where id = auth.uid() and role = 'admin')
  );

create policy "Trainers can read own assignments"
  on trainer_athletes for select using (trainer_id = auth.uid());

create policy "Athletes can read own assignments"
  on trainer_athletes for select using (athlete_id = auth.uid());

-- exercises: public read (library)
create policy "Anyone can read exercises"
  on exercises for select using (true);

create policy "Admins can manage exercises"
  on exercises for all using (
    exists (select 1 from profiles where id = auth.uid() and role = 'admin')
  );

-- workout_plans & workout_plan_exercises
create policy "Users can CRUD plans they created"
  on workout_plans for all using (created_by = auth.uid());

create policy "Trainers can CRUD plans they created"
  on workout_plans for all using (created_by = auth.uid());

create policy "Trainers can CRUD plans for their athletes"
  on workout_plans for all using (
    exists (
      select 1 from trainer_athletes
      where trainer_id = auth.uid() and athlete_id = workout_plans.athlete_id
    )
  );

create policy "Athletes can read plans assigned to them"
  on workout_plans for select using (athlete_id = auth.uid());

create policy "Admins can CRUD all plans"
  on workout_plans for all using (
    exists (select 1 from profiles where id = auth.uid() and role = 'admin')
  );

create policy "Plan exercises follow plan access"
  on workout_plan_exercises for all using (
    exists (
      select 1 from workout_plans p
      where p.id = plan_id
      and (
        p.created_by = auth.uid()
        or p.athlete_id = auth.uid()
        or exists (
          select 1 from trainer_athletes ta
          where ta.trainer_id = auth.uid() and ta.athlete_id = p.athlete_id
        )
        or exists (select 1 from profiles where id = auth.uid() and role = 'admin')
      )
    )
  );

-- workout_logs & exercise_logs
create policy "Athletes can CRUD own workout logs"
  on workout_logs for all using (athlete_id = auth.uid());

create policy "Trainers can read logs of assigned athletes"
  on workout_logs for select using (
    exists (
      select 1 from trainer_athletes
      where trainer_id = auth.uid() and athlete_id = workout_logs.athlete_id
    )
  );

create policy "Admins can read all workout logs"
  on workout_logs for select using (
    exists (select 1 from profiles where id = auth.uid() and role = 'admin')
  );

create policy "Athletes can CRUD own exercise logs"
  on exercise_logs for all using (
    exists (
      select 1 from workout_logs wl
      where wl.id = workout_log_id and wl.athlete_id = auth.uid()
    )
  );

create policy "Trainers can read athlete exercise logs"
  on exercise_logs for select using (
    exists (
      select 1 from workout_logs wl
      join trainer_athletes ta on ta.athlete_id = wl.athlete_id and ta.trainer_id = auth.uid()
      where wl.id = workout_log_id
    )
  );

create policy "Admins can read all exercise logs"
  on exercise_logs for select using (
    exists (select 1 from profiles where id = auth.uid() and role = 'admin')
  );

-- media_uploads
create policy "Uploaders can CRUD own media"
  on media_uploads for all using (uploader_id = auth.uid());

create policy "Trainers can read athlete media"
  on media_uploads for select using (
    exists (
      select 1 from trainer_athletes
      where trainer_id = auth.uid() and athlete_id = media_uploads.uploader_id
    )
  );

create policy "Trainers can update feedback on athlete media"
  on media_uploads for update using (
    exists (
      select 1 from trainer_athletes
      where trainer_id = auth.uid() and athlete_id = media_uploads.uploader_id
    )
  );

create policy "Admins can read all media"
  on media_uploads for select using (
    exists (select 1 from profiles where id = auth.uid() and role = 'admin')
  );

-- achievements & points_ledger (read only for users, inserts via service role)
create policy "Athletes can read own achievements"
  on achievements for select using (athlete_id = auth.uid());

create policy "Trainers can read athlete achievements"
  on achievements for select using (
    exists (
      select 1 from trainer_athletes
      where trainer_id = auth.uid() and athlete_id = achievements.athlete_id
    )
  );

create policy "Admins can read all achievements"
  on achievements for select using (
    exists (select 1 from profiles where id = auth.uid() and role = 'admin')
  );

create policy "Athletes can read own points"
  on points_ledger for select using (athlete_id = auth.uid());

create policy "Trainers can read athlete points"
  on points_ledger for select using (
    exists (
      select 1 from trainer_athletes
      where trainer_id = auth.uid() and athlete_id = points_ledger.athlete_id
    )
  );

create policy "Admins can read all points"
  on points_ledger for select using (
    exists (select 1 from profiles where id = auth.uid() and role = 'admin')
  );

-- notifications
create policy "Users can read own notifications"
  on notifications for select using (user_id = auth.uid());

create policy "Users can update own notifications"
  on notifications for update using (user_id = auth.uid());
