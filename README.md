# Daily Dash

A calm, planner-style daily dashboard. Plain HTML/CSS/JS, no build step, no tracking.
Hosts free on GitHub Pages, installs on your phone, and syncs through a free Supabase database.

**This repo is public. Never put personal details in the code.** Everything you type lives only in your Supabase database (and in each device's browser storage).

## 1. Create the free Supabase database (about 10 minutes)

1. Go to <https://supabase.com>, sign up (free), click **New project**. Name it `daily-dash`, choose a strong database password (save it in a password manager) and the region **Sydney** (closest to Adelaide). Wait ~2 minutes for it to finish.
2. **Create the table:** left menu **SQL Editor** > **New query**. Open `supabase/setup.sql` from this repo, copy everything, paste it in and press **Run**. You should see "Success". This creates one table (`entries`), turns on row-level security so only your login can read or write it, and makes sure the newest edit always wins.
3. **Create your one login:** left menu **Authentication** > **Users** > **Add user** > **Create new user**. Enter your email and a password, and tick **Auto confirm user**.
4. **Lock out everyone else:** **Authentication** > **Sign In / Providers** (or **Settings**) and switch **Allow new users to sign up** OFF. Make sure the Email provider is on.
5. **Find your connection details:** **Project Settings** (cog) > **API** (or **API Keys**). You need two things:
   - **Project URL** (looks like `https://abcd1234.supabase.co`)
   - **anon / publishable key** (a long string)

### Which key is safe?
- **anon / publishable key and Project URL: safe to expose.** They are meant to be in public websites. They only identify your project; row-level security means they cannot read anything without your login.
- **service_role / secret key: never use it anywhere in this app, and never put it in GitHub.** It bypasses all security.

By default the app doesn't need keys in the repo at all: you paste the URL and anon key into **Settings > Sync** on each device (stored only in that browser). Alternatively, put them in `js/config.js` if you'd rather not type them on each device (still safe, but optional).

## 2. Publish with GitHub Pages
1. Merge your work into the repo's main branch (the branch Pages publishes).
2. On GitHub: repo **Settings** > **Pages** > **Build and deployment** > Source **Deploy from a branch**, Branch **main**, folder **/ (root)** > **Save**.
3. After a minute the page shows your address, like `https://<account>.github.io/daily-dash/`. Open it.

## 3. Install on your phone
- **iPhone (Safari):** open the address > Share button > **Add to Home Screen**.
- **Android (Chrome):** open the address > menu (three dots) > **Install app** / **Add to Home screen**.
Then open it, go to **Settings > Sync**, paste the URL and anon key, sign in with your email and password. Repeat once on each device (home desktop, work desktop, phone).

## How syncing works
Each day (and each setting) is one record. Edits save on the device instantly, so the app opens fast and works offline, then upload automatically when online. If two devices edit the same day, the most recent edit wins. Use **Settings > Export backup** regularly (the app nudges you weekly).

## Updating the app
After changing any file, bump `VERSION` in `sw.js` (e.g. `dd-v2`) so phones pick up the new files.

## Code map
- `js/defaults.js` starter prompts, habits, ratings (no personal data)
- `js/store.js` local storage; `js/sync.js` Supabase sync; `js/habits.js` streak logic
- `js/calendar.js` plug-in point for Google Calendar / Outlook
- `js/pages/*.js` one file per page; `js/app.js` routing; `css/style.css` look and feel (colours at the top)
