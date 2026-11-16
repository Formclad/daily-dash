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

## 4. Show your calendars (Google and Outlook)

The app reads each calendar's **private iCal link**. A small free Supabase function fetches them for you (browsers can't), so this is a one-off setup.

**A. Deploy the function (once)**
1. Supabase dashboard > **Edge Functions** > **Deploy a new function** > **Via Editor**.
2. Name it exactly `calendar`. Delete the sample code and paste the whole of `supabase/functions/calendar/index.ts`.
3. Leave **Verify JWT** switched ON, then **Deploy**.

**B. Get the links**
- **Google Calendar** (calendar.google.com on a computer): hover a calendar in the left list > three dots > **Settings and sharing** > scroll to **Secret address in iCal format** > copy. Do this for each calendar (personal, family, business, study).
- **Outlook (outlook.office.com or outlook.live.com)**: Settings (cog) > **Calendar** > **Shared calendars** > **Publish a calendar** > choose the calendar and **Can view all details** > **Publish** > copy the **ICS** link. If "Publish a calendar" is missing or greyed out, your organisation has switched it off for work calendars.

**C. Add them in the app:** Settings > Calendars > give each a name and paste the link. They are saved only in your database, never in the repo.

Treat these links like passwords: anyone with a link can read that calendar. In Google you can reset a link ("Reset secret address") if one is ever shared by mistake.

## 5. Link Strava (runs, workouts; Garmin and Runna too if they sync to Strava)

Garmin Connect has no personal-use data link, but Garmin watches and Runna can both send activities to Strava, so Strava covers all three. Your Strava secret and tokens stay inside Supabase, never in the browser or this repo.

1. **Create a Strava app:** <https://www.strava.com/settings/api> > create an app. Website: your GitHub Pages address. **Authorization Callback Domain:** just the domain part, for example `<account>.github.io` (no https://, no path). Note the **Client ID** and **Client Secret**. Never paste the secret in chat, GitHub or the app.
2. **Create the private table:** Supabase **SQL Editor** > new snippet > paste `supabase/strava.sql` > Run.
3. **Add the secrets:** **Edge Functions** > **Secrets** (or Project Settings > Edge Functions) > add `STRAVA_CLIENT_ID` and `STRAVA_CLIENT_SECRET`.
4. **Deploy the function:** Edge Functions > Deploy a new function > Via Editor > name it exactly `strava` > paste `supabase/functions/strava/index.ts` > keep **Verify JWT** on > Deploy.
5. In the app open **Health** (under More on a phone) > **Connect Strava** > approve on Strava. You land back in the app and your activity appears. Garmin and Runna activities show once they have synced into Strava.

Activities also appear on the day's schedule (tagged Strava), and Home has a Movement tile.

## How syncing works
Each day (and each setting) is one record. Edits save on the device instantly, so the app opens fast and works offline, then upload automatically when online. If two devices edit the same day, the most recent edit wins. Use **Settings > Export backup** regularly (the app nudges you weekly).

## Updating the app
After changing any file, bump `VERSION` in `sw.js` (e.g. `dd-v2`) so phones pick up the new files.

## Code map
- `js/defaults.js` starter prompts, habits, ratings (no personal data)
- `js/store.js` local storage; `js/sync.js` Supabase sync; `js/habits.js` streak logic
- `js/calendar.js` plug-in point for Google Calendar / Outlook
- `js/pages/*.js` one file per page; `js/app.js` routing; `css/style.css` look and feel (colours at the top)
