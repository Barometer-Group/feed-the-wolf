! 
=!!!!!!
# Deploy Feed the Wolf to Vercel

Follow these steps in order.

---

## Step 1: Create a GitHub account (if needed)

If you don't have GitHub: go to [github.com](https://github.com) and sign up.

---

## Step 2: Install GitHub Desktop (easiest) or use Terminal

**Option A: GitHub Desktop (recommended if you're new to Git)**

1. Download [GitHub Desktop](https://desktop.github.com) and install it
2. Sign in with your GitHub account
3. Go to **File → Add Local Repository**
4. Click **Choose...** and select: `/Users/barclaymissen/Cursor Projects/FeedTheWolf`
5. If it says "This directory does not appear to be a Git repository", click **Create a repository** instead:
   - Click **File → New Repository**
   - Name: `feed-the-wolf`
   - Local Path: `/Users/barclaymissen/Cursor Projects`
   - Click **Create Repository** — this will create a new folder. Then copy your project files into it, or we can initialize Git in the existing folder (see Option B)

**Option B: Terminal**

In Cursor, open the terminal and run:

```bash
cd "/Users/barclaymissen/Cursor Projects/FeedTheWolf"
git init
git add .
git commit -m "Initial commit"
```

---

## Step 3: Create a GitHub repo and push

**If using GitHub Desktop:**
1. After adding the repo, click **Publish repository**
2. Uncheck "Keep this code private" if you want it public (or leave checked for private)
3. Click **Publish Repository**

**If using Terminal:**
1. Go to [github.com/new](https://github.com/new)
2. Repository name: `feed-the-wolf`
3. Click **Create repository**
4. Then run (replace `YOUR_USERNAME` with your GitHub username):

```bash
cd "/Users/barclaymissen/Cursor Projects/FeedTheWolf"
git remote add origin https://github.com/YOUR_USERNAME/feed-the-wolf.git
git branch -M main
git push -u origin main
```

---

## Step 4: Deploy on Vercel

1. Go to [vercel.com](https://vercel.com) and sign in (use **Continue with GitHub**)
2. Click **Add New...** → **Project**
3. Find **feed-the-wolf** in the list and click **Import**
4. On the Configure page, click **Environment Variables**
5. Add these (copy from your `.env.local` file):

   | Name | Value |
   |------|-------|
   | `NEXT_PUBLIC_SUPABASE_URL` | `https://dxkyvylusyouiqrdsduz.supabase.co` |
   | `NEXT_PUBLIC_SUPABASE_ANON_KEY` | (your anon key – the long `eyJ...` one) |
   | `SUPABASE_SERVICE_ROLE_KEY` | (your service role key) |
   | `NEXT_PUBLIC_APP_URL` | Leave blank for now – we'll add it after deploy |

6. Click **Deploy**
7. Wait for the build to finish
8. Copy your deployment URL (e.g. `https://feed-the-wolf-xxx.vercel.app`)

---

## Step 5: Update Supabase

1. Go to [Supabase Dashboard](https://supabase.com/dashboard) → your project
2. **Authentication** → **URL Configuration**
3. Click **Add URL** under Redirect URLs
4. Add your Vercel URL, e.g. `https://feed-the-wolf-xxx.vercel.app`
5. Add another: `https://feed-the-wolf-xxx.vercel.app/**` (with the wildcard)
6. Click **Save changes**

---

## Step 6: Update Vercel env var (optional)

1. In Vercel: **Project** → **Settings** → **Environment Variables**
2. Add or edit `NEXT_PUBLIC_APP_URL` and set it to your Vercel URL (e.g. `https://feed-the-wolf-xxx.vercel.app`)
3. Go to **Deployments** → click the **...** on the latest deployment → **Redeploy**

---

## Done

Open your Vercel URL in the browser. Try **Go to Login** → **Sign up** and create an account. It should work since the app runs on Vercel's servers.
