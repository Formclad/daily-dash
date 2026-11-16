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

## 6. Show your scheduled Claude briefings and tasks on the dashboard

Scheduled tasks send a copy of their result to a private drop-box (a Supabase function). It appears on **Home** (Briefings tile) and the **Briefings** page, with anything that needs you pulled out as a tick-off list (and a "+ Matrix" button).

1. **Find your user id:** Supabase > Authentication > Users > copy the **User UID** for your login.
2. **Add two secrets** (Edge Functions > Secrets): `BRIEFING_USER_ID` (that UID) and `BRIEFING_KEY` (a long random password you invent). Keep the key out of chat and GitHub; it is entered into the scheduled tasks' environment through Claude's secure credential form.
3. **Deploy** a function named exactly `briefing` from `supabase/functions/briefing/index.ts` with **Verify JWT switched OFF** (scheduled tasks have no login, so the secret key is the lock).
4. Each scheduled task then ends with a short "dashboard step" that posts: `source`, `title`, `kind` (`briefing` or `task`), `summary` (plain text; `**bold**`, `- ` bullets and `## ` headings display nicely) and `items` (`t`, optional `due` as `YYYY-MM-DD`, and `action: true` for things that need you).

## 7. Easiest route for calendars and Strava: let Claude bring them in

Instead of sections 4 and 5, a **scheduled Claude task** can read your Google Calendar, Outlook and Strava through Claude's own connectors and send the results to the same drop-box as your briefings (the `briefing` function, redeployed with the latest code). No calendar links, no Strava developer app and no extra functions are needed. The task sends two data feeds:

- `{"feed": "calendar", "events": [{"d": "YYYY-MM-DD", "time": "HH:MM", "text": "...", "source": "calendar name"}]}`: shown on the schedule, with a colour per calendar.
- `{"feed": "strava", "athlete": "...", "activities": [{"id", "name", "sport", "date", "time", "km", "secs", "up", "hr"}]}`: shown on Health and Home, and used for the "count it?" habit prompts.

Each run replaces the previous feed, so the dashboard always shows the latest picture. Sections 4 and 5 still work and can be used alongside this.

## How syncing works
Each day (and each setting) is one record. Edits save on the device instantly, so the app opens fast and works offline, then upload automatically when online. If two devices edit the same day, the most recent edit wins. Use **Settings > Export backup** regularly (the app nudges you weekly).

## Updating the app
After changing any file, bump `VERSION` in `sw.js` (e.g. `dd-v2`) so phones pick up the new files.

## Code map
- `js/defaults.js` starter prompts, habits, ratings (no personal data)
- `js/store.js` local storage; `js/sync.js` Supabase sync; `js/habits.js` streak logic
- `js/calendar.js` plug-in point for Google Calendar / Outlook
- `js/pages/*.js` one file per page; `js/app.js` routing; `css/style.css` look and feel (colours at the top)
