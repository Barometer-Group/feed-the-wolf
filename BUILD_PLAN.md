# Build Plan
## Feed the Wolf — Workout Tracker App
**Version:** 1.0
**Last Updated:** 2026-03-16

---

## How to Use This Document

1. Complete each phase fully before moving to the next
2. After each phase, return to your coach (Claude) and report:
   - What was built (brief description or screenshot)
   - Any errors Cursor couldn't resolve
   - Any deviations from the spec
3. Claude will review and hand you the next phase prompt, adjusted if needed
4. All prompts reference FRD.md and TRD.md — keep those files in your project root

---

## Phase Overview

| Phase | Focus | Status |
|---|---|---|
| 1 | Foundation — scaffold, Supabase, auth, schema, RLS | [ ] |
| 2 | Core Logging — workout logging UI, voice input, manual entry | [ ] |
| 3 | Plans — workout plan builder, prescription, athlete plan view | [ ] |
| 4 | Progress — charts, personal records, PR detection | [ ] |
| 5 | Media — photo/video upload, trainer feedback, media feed | [ ] |
| 6 | Gamification — points, badges, streaks, leaderboard | [ ] |
| 7 | Polish — mobile UX, dark mode, empty states, notifications, deployment | [ ] |

---

## Phase 1 — Foundation

### Goal
Set up the entire project scaffold, Supabase integration, authentication flow, and database schema with RLS. No UI features yet beyond auth pages. Everything built here is the foundation all other phases depend on.

### Deliverables
- [ ] Next.js 14 project with TypeScript, Tailwind CSS, shadcn/ui initialized
- [ ] Supabase client (browser + server) configured
- [ ] Auth pages: login, signup, magic link, reset password
- [ ] Role-based redirect after login (admin → /admin, trainer → /dashboard, athlete → /dashboard)
- [ ] App shell: bottom nav, header with notification bell and avatar
- [ ] `RoleGuard` component that protects routes by role
- [ ] Full Supabase migration SQL (all tables + RLS policies from TRD.md)
- [ ] `.env.local.example` file
- [ ] Exercise library seed data (at least 30 common exercises)
- [ ] Supabase generated types in `lib/supabase/types.ts`

### Prompt to Give Cursor

```
You are building a fitness tracking web app called Feed the Wolf. Reference FRD.md and TRD.md in this project root for full requirements.

Your task is Phase 1 — Foundation only. Do not build any workout logging, plans, charts, or gamification yet.

Complete the following:

1. Initialize a Next.js 14 project with:
   - TypeScript
   - Tailwind CSS
   - App Router
   - shadcn/ui (run the init command, add components: button, input, label, card, avatar, badge, separator, sheet, toast, skeleton, dialog, select, textarea, dropdown-menu)

2. Install additional dependencies:
   - @supabase/supabase-js
   - @supabase/ssr
   - sonner
   - canvas-confetti
   - @types/canvas-confetti

3. Create Supabase clients:
   - lib/supabase/client.ts (browser client using createBrowserClient)
   - lib/supabase/server.ts (server client using createServerClient with cookies)

4. Create auth pages at app/(auth)/:
   - login/page.tsx — email + password form + magic link option
   - signup/page.tsx — name, email, password, role selector (athlete or trainer only; admin not self-assignable)
   - reset-password/page.tsx — email input to trigger reset
   All auth pages should use Supabase Auth. After successful login, redirect to /dashboard.

5. Create middleware.ts at project root:
   - Protect all routes under /dashboard, /log, /plans, /progress, /media, /profile, /admin
   - Redirect unauthenticated users to /login
   - Redirect authenticated users away from /login and /signup to /dashboard

6. Create the app shell at app/(app)/layout.tsx:
   - Header: app name "FitTrack" on left, notification bell icon + avatar on right
   - Bottom navigation bar (fixed bottom): Home, Log, Plans, Progress, Profile
   - Each tab uses the correct icon (lucide-react)
   - Active tab highlighted
   - Shell is responsive (bottom nav on mobile, left sidebar on desktop 1024px+)

7. Create components/shared/RoleGuard.tsx:
   - Accepts a `roles` prop (array of 'admin' | 'trainer' | 'athlete')
   - Reads current user's role from profiles table
   - If role not allowed, renders a "Not authorized" message or redirects

8. Create the Supabase migration file at supabase/migrations/001_initial.sql:
   - Include ALL tables from TRD.md Section 3 (profiles, trainer_athletes, exercises, workout_plans, workout_plan_exercises, workout_logs, exercise_logs, media_uploads, achievements, points_ledger, notifications)
   - Include ALL RLS policies from TRD.md Section 4
   - Include a trigger: when a new auth.users row is created, auto-insert a row into profiles with default role 'athlete'

9. Create supabase/seed.sql with at least 30 exercises covering:
   - Strength: bench press, squat, deadlift, overhead press, barbell row, pull-up, dip, lunge, leg press, Romanian deadlift, bicep curl, tricep pushdown, lat pulldown, cable row, incline bench press
   - Cardio: run, bike, row, jump rope, stair climber, elliptical
   - Flexibility: static stretch, yoga flow, foam roll
   - Sports: box jump, kettlebell swing, battle ropes, sled push, burpee

10. Create .env.local.example with the variables from TRD.md Section 9.

11. Create a placeholder dashboard at app/(app)/dashboard/page.tsx that:
    - Shows "Welcome, [user name]"
    - Shows the user's role
    - Has placeholder sections for the athlete/trainer/admin dashboards (just headings and "Coming soon" text for now)

Do not leave TODO comments. Every file should be complete and working. The app should run with `npm run dev` and allow a user to sign up, log in, and see the placeholder dashboard.
```

---

## Phase 2 — Core Logging
*(Prompt provided by coach after Phase 1 is complete)*

### Goal
Build the full workout logging experience: start a workout, log sets (manual and voice), rest timer, complete workout with summary screen.

---

## Phase 3 — Plans
*(Prompt provided by coach after Phase 2 is complete)*

### Goal
Build the workout plan builder, trainer prescription flow, and athlete plan view.

---

## Phase 4 — Progress
*(Prompt provided by coach after Phase 3 is complete)*

### Goal
Build all progress charts, PR detection, and the PR feed.

---

## Phase 5 — Media
*(Prompt provided by coach after Phase 4 is complete)*

### Goal
Build photo/video upload, Supabase Storage integration, trainer feedback, and athlete media view.

---

## Phase 6 — Gamification
*(Prompt provided by coach after Phase 5 is complete)*

### Goal
Build points, badges, streak tracking, level system, leaderboard, and confetti animations.

---

## Phase 7 — Polish
*(Prompt provided by coach after Phase 6 is complete)*

### Goal
Mobile UX refinement, dark mode, empty states, in-app notifications, and Vercel deployment prep.

---

## Checkpoint Questions (bring back to coach after each phase)

After each phase, report:
1. Did Cursor complete all deliverables in the checklist?
2. What (if anything) is not working or was skipped?
3. Did Cursor deviate from the file structure in TRD.md?
4. Any surprising design decisions Cursor made?
5. Screenshot or description of what the UI looks like

---

## Notes for Cursor

- Always reference FRD.md for feature behavior
- Always reference TRD.md for file structure, schema, and stack decisions
- Do not use `any` TypeScript types
- Do not use `useEffect` for data fetching — use server components or React Query patterns
- All Supabase queries go through the typed client from `lib/supabase/types.ts`
- Mobile-first: design for 375px width first, then scale up
- Dark mode is default; use `dark:` Tailwind variants throughout
