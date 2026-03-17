# Functional Requirements Document (FRD)
## Feed the Wolf — Workout Tracker App
**Version:** 1.0
**Last Updated:** 2026-03-16

---

## 1. Overview

Feed the Wolf is a mobile-first web application that enables athletes to log workouts, track progress, and collaborate with their trainers. Trainers can prescribe workouts, review form videos, and monitor athlete progress. The app is gamified to keep athletes engaged and motivated.

---

## 2. User Roles

### 2.1 Athlete
- Log completed workouts (via voice or manual input)
- View prescribed workout plans from trainer
- Track personal progress over time via charts
- Upload photos/videos of exercises for form review
- Earn points and badges (gamification)
- View trainer feedback on uploaded media

### 2.2 Trainer
- View all assigned athletes and their activity
- Design and prescribe workout plans to athletes
- Review athlete-uploaded media and leave feedback
- Monitor athlete progress charts
- Log workouts on behalf of an athlete (optional)

### 2.3 Admin
- Manage all user accounts (view, edit role, deactivate)
- Assign trainers to athletes
- View app-wide activity and usage stats
- Access all data across all users

---

## 3. Authentication

- Email + password login
- Magic link (passwordless) login option
- Email verification on signup
- Password reset via email
- Role assigned at account creation or by admin
- Session persists across browser/app restarts
- Trainer-Athlete relationship must be established by admin before shared data is accessible

---

## 4. Feature Requirements

### 4.1 Dashboard

#### Athlete Dashboard
- Current workout streak (days in a row with a logged workout)
- Total points accumulated and current level (500 pts per level, levels have fun names)
- Weekly activity ring: visual indicator of days worked out this week (7 circles)
- Next prescribed workout card (name, scheduled date, exercise count)
- Last 3 personal records (exercise name, new weight/reps)
- Quick "Start Workout" button
- Recently earned badges (last 3)
- Shortcut to upload media

#### Trainer Dashboard
- List of all assigned athletes with:
  - Name, avatar
  - Last workout date
  - Current streak
  - Weekly points
- Athletes with unreviewed media uploads (badge count)
- Workout plans assigned this week
- Quick action: "Assign Workout" button per athlete

#### Admin Dashboard
- Total user counts by role
- Total workouts logged (all time, this week)
- New signups this week
- User management table (search, filter by role, edit role, deactivate)
- Trainer-athlete assignment interface

---

### 4.2 Workout Logging

#### Starting a Workout
- Option A: Start from a prescribed plan (pre-populated exercises)
- Option B: Start a blank/ad hoc workout and add exercises manually
- Display workout name, date, and a running timer from start

#### Logging Sets
For each exercise in the workout:
- Add sets one at a time
- Per set fields:
  - Reps (integer, optional)
  - Weight in lbs (decimal, optional)
  - Duration in seconds (optional)
  - Distance in meters (optional)
  - Notes (short text, optional)
- Previous session's data shown as reference (ghost text)
- Mark set as complete with a checkmark

#### Voice Input
- Microphone button always visible during active workout
- Tap to start listening (Web Speech API)
- Speak naturally, e.g.:
  - "3 sets of 10 bench press at 135 pounds"
  - "ran for 20 minutes"
  - "deadlift 225 for 5 reps"
  - "5 pull-ups bodyweight"
- Parsed result shown as a confirmation card before saving
- User can edit parsed values before confirming
- Falls back to manual entry if speech API not available
- Entry tagged as `logged_via: voice`

#### During Workout
- Rest timer: starts automatically after completing a set (configurable 30s–5min)
- Rest timer shows countdown with option to skip
- Perceived effort slider (1–10) at end of workout
- Overall workout notes field
- Auto-save every 30 seconds to prevent data loss

#### Completing a Workout
- Summary screen showing:
  - Total duration
  - Total volume (weight × reps summed)
  - Exercises completed
  - Any new PRs achieved
  - Points earned this session
- Animated confetti if PR is set or badge earned
- Option to add post-workout media before finalizing

---

### 4.3 Workout Plan Builder

#### Creating a Plan
- Accessible by both trainer and athlete
- Plan fields:
  - Name (required)
  - Description (optional)
  - Scheduled date (optional — for prescribing to a specific date)
  - Save as template (toggle)
  - Assigned athlete (trainer only — dropdown of their athletes)

#### Adding Exercises to a Plan
- Search exercise library by name or muscle group
- Filter by category (strength, cardio, flexibility, sports)
- Add exercise to plan
- For each exercise, set:
  - Prescribed sets
  - Prescribed reps
  - Prescribed weight (lbs)
  - Prescribed duration (seconds)
  - Notes/instructions for athlete
- Drag-and-drop reordering of exercises

#### Plan Management
- Trainer: view all plans they created, filter by athlete or template status
- Athlete: view all plans assigned to them, sorted by scheduled date
- Edit or delete plans (trainer can edit athlete's assigned plans; athlete can edit their own ad hoc plans)
- Duplicate a plan (useful for recurring weekly programs)

---

### 4.4 Progress & Charts

#### Available Charts (all per-exercise or per-workout)
- **Max weight over time** — line chart, one point per session
- **Total volume over time** — bar or line chart (sets × reps × weight)
- **Reps over time** — line chart per exercise
- **Workout duration** — bar chart by day/week
- **Cardio: pace or distance over time** — line chart

#### Filters
- Time range: 7 days, 30 days, 90 days, 1 year, all time
- Exercise selector (dropdown of all exercises logged by athlete)
- Chart type toggle where applicable

#### Personal Records (PRs)
- Auto-detected when a new max weight or max reps is logged for any exercise
- PR feed on progress page showing all-time bests per exercise
- PR triggers confetti animation and +20 points

#### Trainer View
- Trainer can view any assigned athlete's progress charts
- Athlete selector at top of progress page (trainer context)

---

### 4.5 Media Upload & Form Review

#### Uploading Media
- Upload from device camera roll or capture in-browser
- Accepted formats: JPEG, PNG, MP4, MOV
- Max file size: 100MB per video, 10MB per photo
- Attach to:
  - A specific workout log (overall)
  - A specific exercise within a workout log
- Add a caption/note with the upload
- Upload triggers +2 points

#### Trainer Review Feed
- Trainer sees a chronological feed of all athlete media
- Filter by athlete
- Each media item shows: athlete name, exercise name (if linked), upload date, caption
- Trainer can leave text feedback on any item
- Athlete receives in-app notification badge when feedback is posted

#### Athlete View
- Can view all their own uploaded media
- Feedback from trainer displayed below each item
- Badge/notification cleared when athlete views new feedback

---

### 4.6 Gamification

#### Points
| Action | Points |
|---|---|
| Complete any workout | +10 |
| Log a set via voice | +5 |
| Hit a personal record | +20 |
| Complete a trainer-prescribed workout | +15 |
| Upload a form photo or video | +2 |
| Log workout 7 days in a row (streak bonus) | +50 |

#### Levels
- Every 500 points = 1 level
- Level names (fun, fitness-themed):
  - Level 1: Couch Potato
  - Level 2: Weekend Warrior
  - Level 3: Gym Rat
  - Level 4: Iron Addict
  - Level 5: Beast Mode
  - Level 6: Swole Patrol
  - Level 7: Unstoppable
  - Level 8: Legend
  - Level 9+: Hall of Fame

#### Badges
| Badge | Trigger |
|---|---|
| First Rep | Log first workout |
| On Fire | 3 workouts in one week |
| Streak Master | 7-day workout streak |
| Consistent | 30-day streak |
| PR Crusher | 10 lifetime personal records |
| Form Check | Upload 5 form videos |
| Heavy Lifter | Log a set with 300+ lbs |
| Century Club | Log 100 total workouts |
| Voice Activated | Log 10 sets via voice |

#### Leaderboard
- Optional — admin can enable/disable per app
- Shows athlete rankings by weekly points
- Displayed on dashboard if enabled
- Shows rank, name, avatar, weekly points, streak

---

### 4.7 Notifications (In-App Only)
- Notification bell in header with unread badge count
- Notification types:
  - Trainer assigned a new workout plan
  - Trainer left feedback on your media
  - New badge earned
  - New PR achieved
  - Streak at risk (no workout today and it's after 6pm)

---

### 4.8 Profile & Settings
- Edit display name and avatar (upload photo)
- Toggle dark/light mode
- Toggle leaderboard visibility (opt out)
- View all earned badges
- View full points history
- Change password
- Notification preferences

---

## 5. Non-Functional Requirements

- **Performance:** Pages load within 2 seconds on 4G mobile connection
- **Responsiveness:** Works on screens 375px wide (iPhone SE) through 1440px (desktop)
- **Browser Support:** iOS Safari 15+, Android Chrome 100+, Desktop Chrome/Firefox/Safari
- **Offline Behavior:** Show graceful error if offline; no offline-first caching required for v1
- **Accessibility:** Buttons have accessible labels; color contrast meets WCAG AA
- **Security:** All data access enforced by Supabase RLS; no sensitive data in client-side code
- **Media Storage:** Videos/photos stored in Supabase Storage, never in DB columns
