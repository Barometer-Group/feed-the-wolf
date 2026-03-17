# Supabase Setup Guide for Feed the Wolf

Since you're relying on this setup to handle everything, follow these steps to get your app running.

## Step 1: Create a Supabase Project

1. Go to [supabase.com](https://supabase.com) and sign in (or create an account).
2. Click **"New Project"**.
3. Choose your organization, pick a name (e.g. "feed-the-wolf"), set a database password (store it somewhere safe), and choose a region.
4. Click **"Create new project"** and wait for it to finish provisioning.

## Step 2: Get Your API Keys

1. In your project dashboard, go to **Settings** (gear icon) → **API**.
2. Under **Project URL**, copy the URL.
3. Under **Project API keys**, copy:
   - **anon public** (for client-side)
   - **service_role** (for server-side, keep this secret)

## Step 3: Create .env.local

1. In the project root, copy `.env.local.example` to `.env.local`:

   ```
   cp .env.local.example .env.local
   ```

2. Open `.env.local` and replace the placeholders:
   - `NEXT_PUBLIC_SUPABASE_URL` → your Project URL
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY` → your anon public key
   - `SUPABASE_SERVICE_ROLE_KEY` → your service_role key
   - `NEXT_PUBLIC_APP_URL` → `http://localhost:3000` (or your URL)

## Step 4: Run the Database Migration

1. In the Supabase dashboard, open the **SQL Editor**.
2. Click **"New query"**.
3. Open the file `supabase/migrations/001_initial.sql` in your editor, copy all of it, and paste it into the SQL Editor.
4. Click **"Run"** (or Ctrl/Cmd+Enter).
5. Confirm there are no errors.

## Step 5: Run the Seed (Exercise Library)

1. In the SQL Editor, start another new query.
2. Open `supabase/seed.sql`, copy all of it, and paste it into the SQL Editor.
3. Click **"Run"**.
4. Confirm there are no errors.

## Step 6: Configure Auth (Optional but Recommended)

1. Go to **Authentication** → **Providers**.
2. Under **Email**:
   - For development, you can turn off "Confirm email" so signup works immediately without email verification.
   - If you leave it on, new users must confirm their email before signing in.

3. Under **URL Configuration** (Authentication → URL Configuration):
   - Add `http://localhost:3000` to **Redirect URLs**.
   - Add your production URL later when you deploy.

## Step 7: Run the App

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000). You should be able to sign up, log in, and see the dashboard.

**Note:** The build (`npm run build`) requires `.env.local` to exist with valid Supabase URL and keys. Create it before building.

## Making Yourself Admin

1. Sign up a normal account.
2. In Supabase, go to **Table Editor** → **profiles**.
3. Find your row and change the `role` column from `athlete` or `trainer` to `admin`.
