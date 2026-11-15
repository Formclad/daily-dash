-- Daily Dash: paste this whole file into Supabase > SQL Editor > Run (once).
-- One simple table holds everything: each row is one "page" of data (a day, or a setting).

create table if not exists public.entries (
  user_id    uuid   not null default auth.uid() references auth.users (id) on delete cascade,
  key        text   not null,                    -- e.g. 'day:2026-11-15' or 'config:habits'
  data       jsonb  not null default '{}'::jsonb,
  updated_at bigint not null,                    -- time of the edit in ms; newest edit wins
  primary key (user_id, key)
);

-- Row-level security: you can only ever see and change your own rows.
alter table public.entries enable row level security;

create policy "read own"   on public.entries for select using (auth.uid() = user_id);
create policy "insert own" on public.entries for insert with check (auth.uid() = user_id);
create policy "update own" on public.entries for update using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "delete own" on public.entries for delete using (auth.uid() = user_id);

-- If a slow device uploads an OLDER edit, quietly keep the newer one already stored.
create or replace function public.keep_newest() returns trigger
language plpgsql set search_path = '' as $$
begin
  if new.updated_at < old.updated_at then return old; end if;
  return new;
end $$;

drop trigger if exists entries_keep_newest on public.entries;
create trigger entries_keep_newest before update on public.entries
  for each row execute function public.keep_newest();
