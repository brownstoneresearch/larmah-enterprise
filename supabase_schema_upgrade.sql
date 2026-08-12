-- ============================================================
-- Hey Larmah Enterprise — Supabase schema upgrade
-- Run in Supabase SQL Editor (as project owner)
-- ============================================================

-- 1) Profiles table columns
alter table if exists public.profiles
  add column if not exists full_name text,
  add column if not exists phone text,
  add column if not exists company text,
  add column if not exists country text default 'Nigeria',
  add column if not exists address text,
  add column if not exists preferred_pillar text,
  add column if not exists bio text,
  add column if not exists website text,
  add column if not exists rc_bn text,
  add column if not exists rc_bn_verified boolean default false,
  add column if not exists role text default 'premium',
  add column if not exists account_status text default 'pending',
  add column if not exists is_verified boolean default false,
  add column if not exists verified_at timestamptz,
  add column if not exists verified_by uuid,
  add column if not exists last_admin_note text,
  add column if not exists email text,
  add column if not exists updated_at timestamptz default now();

-- 2) Pending invites (Edge Function fallback)
create table if not exists public.pending_invites (
  id uuid primary key default gen_random_uuid(),
  email text not null,
  full_name text,
  invited_by uuid,
  status text default 'pending',
  created_at timestamptz default now()
);

-- 3) Catalogue + insights (ensure tables exist)
create table if not exists public.catalog_items (
  id uuid primary key default gen_random_uuid(),
  category text,
  title text,
  description text,
  price text,
  tags text[] default '{}',
  active boolean default true,
  featured boolean default false,
  sort_order int default 0,
  image_url text,
  media_url text,
  media_type text,
  video_url text,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create table if not exists public.insights_posts (
  id uuid primary key default gen_random_uuid(),
  category text,
  title text,
  slug text,
  excerpt text,
  body text,
  author text default 'Hey Larmah Editorial Desk',
  read_time text default '4 min read',
  tags text[] default '{}',
  pinned boolean default false,
  active boolean default true,
  image_url text,
  media_url text,
  media_type text,
  video_url text,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- 4) sync_my_profile RPC (matches frontend payload keys)
create or replace function public.sync_my_profile(
  profile_full_name text default null,
  profile_phone text default null,
  profile_company text default null,
  profile_country text default null,
  profile_address text default null,
  profile_preferred_pillar text default null,
  profile_bio text default null,
  profile_website text default null,
  profile_rc_bn text default null
)
returns public.profiles
language plpgsql
security definer
set search_path = public
as $$
declare
  uid uuid := auth.uid();
  result public.profiles;
begin
  if uid is null then
    raise exception 'Not authenticated';
  end if;

  insert into public.profiles as p (id, email, full_name, phone, company, country, address, preferred_pillar, bio, website, rc_bn, updated_at)
  values (
    uid,
    coalesce(auth.jwt()->>'email', ''),
    nullif(profile_full_name, ''),
    nullif(profile_phone, ''),
    nullif(profile_company, ''),
    nullif(profile_country, ''),
    nullif(profile_address, ''),
    nullif(profile_preferred_pillar, ''),
    nullif(profile_bio, ''),
    nullif(profile_website, ''),
    nullif(profile_rc_bn, ''),
    now()
  )
  on conflict (id) do update set
    full_name = coalesce(nullif(excluded.full_name, ''), p.full_name),
    phone = coalesce(nullif(excluded.phone, ''), p.phone),
    company = coalesce(nullif(excluded.company, ''), p.company),
    country = coalesce(nullif(excluded.country, ''), p.country),
    address = coalesce(nullif(excluded.address, ''), p.address),
    preferred_pillar = coalesce(nullif(excluded.preferred_pillar, ''), p.preferred_pillar),
    bio = coalesce(nullif(excluded.bio, ''), p.bio),
    website = coalesce(nullif(excluded.website, ''), p.website),
    rc_bn = coalesce(nullif(excluded.rc_bn, ''), p.rc_bn),
    email = coalesce(nullif(excluded.email, ''), p.email),
    updated_at = now()
  returning * into result;

  return result;
end;
$$;

grant execute on function public.sync_my_profile(
  text, text, text, text, text, text, text, text, text
) to authenticated, anon;

-- 5) Auto-create profile on signup
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, email, full_name, role, account_status, is_verified, created_at, updated_at)
  values (
    new.id,
    new.email,
    coalesce(new.raw_user_meta_data->>'full_name', new.raw_user_meta_data->>'name', ''),
    'premium',
    'pending',
    false,
    now(),
    now()
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- 6) RLS helpers
alter table public.profiles enable row level security;
alter table public.catalog_items enable row level security;
alter table public.insights_posts enable row level security;
alter table public.pending_invites enable row level security;

-- Profiles: users manage own row; admin email can manage all
drop policy if exists "profiles_select_own" on public.profiles;
create policy "profiles_select_own" on public.profiles
  for select to authenticated
  using (
    id = auth.uid()
    or lower(coalesce(auth.jwt()->>'email','')) = 'heylarmahtech@outlook.com'
  );

drop policy if exists "profiles_update_own" on public.profiles;
create policy "profiles_update_own" on public.profiles
  for update to authenticated
  using (
    id = auth.uid()
    or lower(coalesce(auth.jwt()->>'email','')) = 'heylarmahtech@outlook.com'
  );

drop policy if exists "profiles_insert_own" on public.profiles;
create policy "profiles_insert_own" on public.profiles
  for insert to authenticated
  with check (
    id = auth.uid()
    or lower(coalesce(auth.jwt()->>'email','')) = 'heylarmahtech@outlook.com'
  );

-- Catalogue / insights: public read active; admin write
drop policy if exists "catalog_public_read" on public.catalog_items;
create policy "catalog_public_read" on public.catalog_items
  for select using (active = true or lower(coalesce(auth.jwt()->>'email','')) = 'heylarmahtech@outlook.com');

drop policy if exists "catalog_admin_all" on public.catalog_items;
create policy "catalog_admin_all" on public.catalog_items
  for all to authenticated
  using (lower(coalesce(auth.jwt()->>'email','')) = 'heylarmahtech@outlook.com')
  with check (lower(coalesce(auth.jwt()->>'email','')) = 'heylarmahtech@outlook.com');

drop policy if exists "insights_public_read" on public.insights_posts;
create policy "insights_public_read" on public.insights_posts
  for select using (active = true or lower(coalesce(auth.jwt()->>'email','')) = 'heylarmahtech@outlook.com');

drop policy if exists "insights_admin_all" on public.insights_posts;
create policy "insights_admin_all" on public.insights_posts
  for all to authenticated
  using (lower(coalesce(auth.jwt()->>'email','')) = 'heylarmahtech@outlook.com')
  with check (lower(coalesce(auth.jwt()->>'email','')) = 'heylarmahtech@outlook.com');

drop policy if exists "invites_admin" on public.pending_invites;
create policy "invites_admin" on public.pending_invites
  for all to authenticated
  using (lower(coalesce(auth.jwt()->>'email','')) = 'heylarmahtech@outlook.com')
  with check (lower(coalesce(auth.jwt()->>'email','')) = 'heylarmahtech@outlook.com');

-- 7) Reload schema cache
notify pgrst, 'reload schema';
