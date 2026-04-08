# Feed the Wolf — UX Redesign Plan
**Created:** 2026-04-08
**Status:** Ready to execute

---

## Context

The app scaffold, database, auth, and backend are all working. The front-end was AI-generated without real mobile testing and needs to be rebuilt screen by screen. The goal is a clean, fast, mobile-first experience that feels great on your phone.

---

## What's Working (Don't Touch)
- Supabase database + auth
- Vercel deployment + auto-deploy on push
- API routes (`/api/workouts`, `/api/dashboard`, `/api/plans`, etc.)
- Bottom navigation
- Login / Signup / Reset Password screens (these are fine)

---

## The Plan — 5 Phases

### Phase 1 — Active Workout Screen (MOST IMPORTANT) ✅ Next
**Why first:** This is the core feature. Everything else supports it.

The current screen has a 6-stage state machine per exercise that causes confusing behavior. Rebuild it as a simple, clear flow:

**New flow:**
1. Screen opens → timer running, "Add Exercise" button prominent
2. Tap "Add Exercise" → search sheet slides up, pick exercise
3. Exercise appears as a card with: name, big reps input, big weight input, green "Log Set" button
4. Tap "Log Set" → set is saved, rest timer starts (60s default), shows "Set 1 logged ✓"
5. Rest timer counts down with option to skip → when done, inputs reset for next set
6. Repeat for as many sets as needed
7. Tap "Finish Workout" → summary screen

**Key design principles:**
- Inputs must be large (number pad on mobile)
- One tap to log a set repeat with same weight/reps
- Rest timer must be visible but not blocking
- Previous session's numbers shown as placeholder/hint

---

### Phase 2 — Dashboard
**Why:** It's the first thing you see. Should motivate you, not confuse you.

Rebuild as:
- Big greeting + streak (most prominent)
- Level + progress bar
- "Start Workout" button (the biggest thing on screen)
- Weekly rings (7 days)
- Last 3 workouts (compact)
- Recent PRs if any

---

### Phase 3 — Plans Screen
**Why:** Currently unclear how to create or use a plan.

Rebuild as:
- Clear "Create Plan" button
- List of your plans, sorted by upcoming date
- Tap a plan → see exercises, tap "Start This Workout"
- Simple exercise adder: search, set prescribed sets/reps/weight

---

### Phase 4 — Progress Screen
**Why:** Charts aren't loading correctly and the layout is broken on mobile.

Rebuild as:
- Exercise selector at top
- One clean chart (max weight over time)
- Toggle for: volume / reps / duration
- PR list below chart

---

### Phase 5 — Profile + PWA
**Why:** Polish + installability.

- Clean profile screen
- Add to home screen prompt (PWA)
- Fix notification bell (currently does nothing)

---

## Current Bug List (as of 2026-04-08)

| # | Issue | Status |
|---|-------|--------|
| 1 | Log tab showed skeleton forever on mobile | ✅ Fixed (Suspense wrapper) |
| 2 | Supabase client recreated every render in useWorkout | ✅ Fixed (useRef) |
| 3 | Mobile viewport not set correctly | ✅ Fixed (app/layout.tsx) |
| 4 | NEXT_PUBLIC_SITE_URL missing on Vercel | ✅ Fixed (added in Vercel dashboard) |
| 5 | Active workout state machine too complex, causes weird behavior | 🔴 Phase 1 |
| 6 | Number inputs don't trigger number keyboard on mobile | 🔴 Phase 1 |
| 7 | Touch targets too small in several places | 🔴 Phase 1 |
| 8 | Dashboard API calls could fail silently | 🟡 Phase 2 |
| 9 | Progress charts broken on mobile | 🟡 Phase 4 |
| 10 | PWA not installable (SVG icons not valid for PWA) | 🟡 Phase 5 |

---

## How We Work

- Claude makes code changes and pushes to GitHub
- Vercel auto-deploys in ~2 minutes
- You test on your phone and report back
- One screen at a time — fully working before moving on

---

## Files That Will Change (Phase 1)

| File | What Changes |
|------|-------------|
| `app/(app)/log/[workoutId]/page.tsx` | Full rebuild — simpler state machine |
| `hooks/useWorkout.ts` | Simplify, add better error handling |
| `components/workout/ExerciseSet.tsx` | Rebuild with large inputs, number keyboard |
| `components/workout/RestTimer.tsx` | Keep but make non-blocking |
| `components/workout/WorkoutSummary.tsx` | Keep, minor polish |
