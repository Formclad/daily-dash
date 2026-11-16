-- Daily Dash: Strava link. Paste into Supabase > SQL Editor > Run (once).
-- Holds your Strava access tokens. Row-level security is ON and there are deliberately NO policies,
-- so the browser (even when signed in) can never read this table. Only the "strava" function can,
-- using Supabase's server-side key, which never leaves Supabase.
create table if not exists public.private_tokens (
  user_id  uuid not null references auth.users (id) on delete cascade,
  provider text not null,
  data     jsonb not null,
  primary key (user_id, provider)
);
alter table public.private_tokens enable row level security;
