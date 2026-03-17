# Technical Requirements Document (TRD)
## Feed the Wolf — Workout Tracker App
**Version:** 1.0
**Last Updated:** 2026-03-16

---

## 1. Tech Stack

| Layer | Technology | Reason |
|---|---|---|
| Framework | Next.js 14 (App Router) | Vercel-native, SSR + client components, file-based routing |
| Language | TypeScript | Type safety across full stack |
| Styling | Tailwind CSS + shadcn/ui | Rapid mobile-first UI, accessible components |
| Database | Supabase (PostgreSQL) | Managed Postgres, built-in auth, RLS, storage |
| Auth | Supabase Auth | Email/password + magic link, session management |
| File Storage | Supabase Storage | Photos and videos, CDN-served URLs |
| Charts | Recharts | Lightweight, responsive, composable |
| Drag & Drop | @dnd-kit/core | Accessible, touch-friendly (required for mobile) |
| Voice Input | Web Speech API | Browser-native, no API key or cost |
| Animations | canvas-confetti | Lightweight confetti for PRs and badges |
| Notifications | sonner | Toast notifications |
| Deployment | Vercel | Zero-config Next.js deployment, edge functions |

---

## 2. Project Structure

```
/fittrack
├── app/
│   ├── (auth)/
│   │   ├── login/page.tsx
│   │   ├── signup/page.tsx
│   │   └── reset-password/page.tsx
│   ├── (app)/
│   │   ├── layout.tsx              # App shell: bottom nav, header
│   │   ├── dashboard/page.tsx
│   │   ├── log/
│   │   │   ├── page.tsx            # Start workout screen
│   │   │   └── [workoutId]/page.tsx # Active workout logging
│   │   ├── plans/
│   │   │   ├── page.tsx            # Plan list
│   │   │   ├── new/page.tsx        # Plan builder
│   │   │   └── [planId]/page.tsx   # Plan detail/edit
│   │   ├── progress/
│   │   │   └── page.tsx            # Charts + PR feed
│   │   ├── media/
│   │   │   └── page.tsx            # Media feed + trainer review
│   │   ├── profile/
│   │   │   └── page.tsx
│   │   └── admin/
│   │       └── page.tsx
│   ├── api/
│   │   ├── workouts/route.ts
│   │   ├── plans/route.ts
│   │   ├── media/route.ts
│   │   └── gamification/route.ts
│   └── layout.tsx                  # Root layout, providers
├── components/
│   ├── ui/                         # shadcn/ui components (auto-generated)
│   ├── workout/
│   │   ├── WorkoutCard.tsx
│   │   ├── ExerciseSet.tsx
│   │   ├── VoiceInput.tsx
│   │   ├── RestTimer.tsx
│   │   └── WorkoutSummary.tsx
│   ├── plans/
│   │   ├── PlanCard.tsx
│   │   ├── ExerciseSearch.tsx
│   │   └── DraggableExerciseList.tsx
│   ├── progress/
│   │   ├── VolumeChart.tsx
│   │   ├── MaxWeightChart.tsx
│   │   ├── DurationChart.tsx
│   │   └── PRFeed.tsx
│   ├── media/
│   │   ├── MediaUploadButton.tsx
│   │   ├── MediaCard.tsx
│   │   └── TrainerFeedback.tsx
│   ├── gamification/
│   │   ├── PointsBadge.tsx
│   │   ├── BadgeCard.tsx
│   │   ├── StreakRing.tsx
│   │   └── Leaderboard.tsx
│   └── shared/
│       ├── BottomNav.tsx
│       ├── Header.tsx
│       ├── NotificationBell.tsx
│       ├── AvatarUpload.tsx
│       └── RoleGuard.tsx
├── lib/
│   ├── supabase/
│   │   ├── client.ts               # Browser Supabase client
│   │   ├── server.ts               # Server Supabase client (cookies)
│   │   └── types.ts                # Generated DB types (supabase gen types)
│   ├── speech/
│   │   └── parseVoiceInput.ts      # Voice string → exercise log parser
│   ├── gamification/
│   │   ├── points.ts               # Award points logic
│   │   └── badges.ts               # Check and award badge logic
│   └── utils.ts
├── hooks/
│   ├── useWorkout.ts               # Active workout state management
│   ├── useVoice.ts                 # Web Speech API wrapper
│   ├── useProgress.ts              # Chart data fetching
│   └── useGamification.ts         # Points + badge state
├── supabase/
│   └── migrations/
│       └── 001_initial.sql         # Full schema + RLS policies
├── public/
│   └── icons/                      # Badge SVG icons
├── .env.local.example
├── next.config.ts
├── tailwind.config.ts
└── package.json
```

---

## 3. Database Schema

### 3.1 profiles
```sql
create table profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  full_name text not null,
  avatar_url text,
  role text not null check (role in ('admin', 'trainer', 'athlete')) default 'athlete',
  leaderboard_visible boolean default true,
  created_at timestamptz default now()
);
```

### 3.2 trainer_athletes
```sql
create table trainer_athletes (
  id uuid primary key default gen_random_uuid(),
  trainer_id uuid not null references profiles(id) on delete cascade,
  athlete_id uuid not null references profiles(id) on delete cascade,
  created_at timestamptz default now(),
  unique(trainer_id, athlete_id)
);
```

### 3.3 exercises (library)
```sql
create table exercises (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  category text not null check (category in ('strength', 'cardio', 'flexibility', 'sports')),
  muscle_groups text[] default '{}',
  description text,
  demo_video_url text,
  created_at timestamptz default now()
);
```

### 3.4 workout_plans
```sql
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
```

### 3.5 workout_plan_exercises
```sql
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
```

### 3.6 workout_logs
```sql
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
```

### 3.7 exercise_logs
```sql
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
```

### 3.8 media_uploads
```sql
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
```

### 3.9 achievements
```sql
create table achievements (
  id uuid primary key default gen_random_uuid(),
  athlete_id uuid not null references profiles(id) on delete cascade,
  type text not null,
  title text not null,
  description text,
  earned_at timestamptz default now(),
  metadata jsonb default '{}'
);
```

### 3.10 points_ledger
```sql
create table points_ledger (
  id uuid primary key default gen_random_uuid(),
  athlete_id uuid not null references profiles(id) on delete cascade,
  points integer not null,
  reason text not null,
  created_at timestamptz default now()
);
```

### 3.11 notifications
```sql
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
```

---

## 4. Row Level Security (RLS) Policies

All tables have RLS enabled. Key policies:

### profiles
- Users can read and update their own profile
- Admins can read and update all profiles
- Trainers can read profiles of their assigned athletes

### workout_logs & exercise_logs
- Athletes can CRUD their own logs
- Trainers can read logs of their assigned athletes
- Admins can read all logs

### workout_plans & workout_plan_exercises
- Athletes can CRUD plans they created
- Trainers can CRUD plans they created or assigned to their athletes
- Athletes can read plans assigned to them
- Admins can CRUD all plans

### media_uploads
- Uploaders can CRUD their own uploads
- Trainers can read uploads from their assigned athletes and update `trainer_feedback` field only
- Admins can read all

### achievements & points_ledger
- Athletes can read their own
- Trainers can read their athletes'
- Admins can read all
- Inserts only via service role (server-side logic)

### notifications
- Users can only read/update their own notifications

---

## 5. Supabase Storage

### Buckets
- `workout-media` — public read, authenticated write
  - Path convention: `{athlete_id}/{workout_log_id}/{filename}`
  - Max upload size: 100MB
  - Allowed MIME types: image/jpeg, image/png, image/webp, video/mp4, video/quicktime
- `avatars` — public read, authenticated write
  - Path convention: `{user_id}/avatar.{ext}`

---

## 6. Voice Input Parsing

File: `lib/speech/parseVoiceInput.ts`

The parser receives a raw transcript string and returns a structured object or null.

### Pattern Examples
| Input | Output |
|---|---|
| "3 sets of 10 bench press at 135 pounds" | `{ exercise: "bench press", sets: 3, reps: 10, weight: 135 }` |
| "deadlift 225 for 5 reps" | `{ exercise: "deadlift", reps: 5, weight: 225 }` |
| "ran for 20 minutes" | `{ exercise: "run", duration: 1200 }` |
| "5 pull-ups bodyweight" | `{ exercise: "pull-up", reps: 5, weight: 0 }` |
| "plank for 60 seconds" | `{ exercise: "plank", duration: 60 }` |

### Parser Strategy
1. Normalize transcript to lowercase
2. Extract numbers with regex
3. Match exercise names against exercise library (fuzzy match)
4. Infer field mapping based on context words ("pounds", "reps", "sets", "minutes", "seconds")
5. Return parsed object for confirmation UI
6. If no match: return null and prompt manual entry

---

## 7. Gamification Logic

### Points (server-side, called after each relevant action)
- Implemented in `lib/gamification/points.ts`
- Always insert into `points_ledger` table
- Never award duplicate points for same workout/action

### Badge Checks (server-side)
- Implemented in `lib/gamification/badges.ts`
- Called after workout completion
- Check conditions against DB aggregates
- Insert into `achievements` table if not already earned
- Create notification entry for new badge

### PR Detection
- On each `exercise_log` insert, query for previous max `weight_lbs` and max `reps` for that exercise + athlete
- If new value exceeds previous max: it's a PR
- Insert into `achievements` with type `'pr'`
- Award +20 points
- Trigger confetti on client

---

## 8. API Routes

All routes live under `/app/api/` and use Next.js Route Handlers.

| Route | Method | Description |
|---|---|---|
| `/api/workouts` | GET | List workouts for current athlete (or trainer's athletes) |
| `/api/workouts` | POST | Create new workout log |
| `/api/workouts/[id]` | GET/PUT/DELETE | CRUD single workout |
| `/api/workouts/[id]/complete` | POST | Complete workout, run gamification checks |
| `/api/plans` | GET/POST | List/create workout plans |
| `/api/plans/[id]` | GET/PUT/DELETE | CRUD single plan |
| `/api/media` | GET/POST | List/create media uploads |
| `/api/media/[id]/feedback` | PUT | Trainer adds feedback |
| `/api/gamification/points` | GET | Get total points + level for current user |
| `/api/gamification/leaderboard` | GET | Weekly leaderboard (if enabled) |
| `/api/notifications` | GET | List unread notifications |
| `/api/notifications/[id]/read` | PUT | Mark notification as read |
| `/api/admin/users` | GET/PUT | Admin: list and manage users |

---

## 9. Environment Variables

```env
# .env.local
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

---

## 10. Key Implementation Notes

### Mobile-First
- Bottom navigation bar (fixed, 5 tabs): Home, Log, Plans, Progress, Profile
- All tap targets minimum 44×44px
- Forms optimized for mobile keyboard (correct input types: `inputMode="numeric"` for numbers)
- No hover-only interactions
- Pull-to-refresh via scroll position detection

### Dark Mode
- Default: dark mode
- Toggle stored in localStorage and applied to `<html>` class
- All Tailwind classes use `dark:` variants
- shadcn/ui components respect theme automatically

### Loading States
- All data-fetching pages use React Suspense with skeleton components
- Skeletons match the shape of the real content

### Error Handling
- All Supabase calls wrapped in try/catch
- User-facing errors shown as toast notifications via sonner
- No raw error messages exposed to users

### TypeScript
- Run `supabase gen types typescript` to generate `lib/supabase/types.ts`
- All components and hooks typed; no `any` types
