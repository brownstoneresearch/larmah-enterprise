-- schema.sql (FULL UPDATED - Hey Larmah)
-- Supports: Real Estate, Logistics, Insights
-- Includes: Admin gate (profiles), RLS policies, catalog, requests, insights (pinned),
-- and safe seeds.
-- Safe to run multiple times.

create extension if not exists "pgcrypto";

-- =========================================================
-- 1) PROFILES (Admin gate)
-- =========================================================
create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  email text,
  role text not null default 'user',
  created_at timestamptz not null default now()
);

create or replace function public.handle_new_user()
returns trigger as $$
begin
  insert into public.profiles (id, email, role)
  values (new.id, new.email, 'user')
  on conflict (id) do update set email = excluded.email;
  return new;
end;
$$ language plpgsql security definer;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
after insert on auth.users
for each row execute procedure public.handle_new_user();

alter table public.profiles enable row level security;

drop policy if exists profiles_read_own on public.profiles;
create policy profiles_read_own
on public.profiles for select
using (auth.uid() = id);

drop policy if exists profiles_admin_read_all on public.profiles;
create policy profiles_admin_read_all
on public.profiles for select
using (
  exists (select 1 from public.profiles p where p.id = auth.uid() and p.role = 'admin')
);

-- =========================================================
-- 2) CATALOG ITEMS (Real Estate / Logistics)
-- =========================================================
create table if not exists public.catalog_items (
  id uuid primary key default gen_random_uuid(),
  category text not null,
  title text not null,
  price text,
  description text,
  image_url text,
  tags text[] default '{}',
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- enforce allowed categories
alter table public.catalog_items
drop constraint if exists catalog_items_category_check;

alter table public.catalog_items
add constraint catalog_items_category_check
check (category in ('real-estate','logistics'));

alter table public.catalog_items enable row level security;

-- public: read only active
drop policy if exists catalog_public_read_active on public.catalog_items;
create policy catalog_public_read_active
on public.catalog_items for select
using (active = true);

-- admin: full CRUD
drop policy if exists catalog_admin_all on public.catalog_items;
create policy catalog_admin_all
on public.catalog_items for all
using (
  exists (select 1 from public.profiles p where p.id = auth.uid() and p.role = 'admin')
)
with check (
  exists (select 1 from public.profiles p where p.id = auth.uid() and p.role = 'admin')
);

-- =========================================================
-- 3) REQUESTS (Public insert, Admin read)
-- =========================================================
create table if not exists public.requests (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id),
  category text not null,
  name text,
  phone text,
  details jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

alter table public.requests enable row level security;

-- public: allow inserts
drop policy if exists requests_public_insert on public.requests;
create policy requests_public_insert
on public.requests for insert
with check (true);

-- admin: read all
drop policy if exists requests_admin_read on public.requests;
create policy requests_admin_read
on public.requests for select
using (
  exists (select 1 from public.profiles p where p.id = auth.uid() and p.role = 'admin')
);

-- =========================================================
-- 4) INSIGHTS POSTS (Public read, Admin CRUD, Pinned support)
-- =========================================================
create table if not exists public.insights_posts (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  body text not null,
  created_at timestamptz not null default now()
);

-- migrate pinned column if table existed without it
alter table public.insights_posts
add column if not exists pinned boolean not null default false;

alter table public.insights_posts enable row level security;

-- public read
drop policy if exists insights_public_read on public.insights_posts;
create policy insights_public_read
on public.insights_posts for select
using (true);

-- admin CRUD
drop policy if exists insights_admin_all on public.insights_posts;
create policy insights_admin_all
on public.insights_posts for all
using (
  exists (select 1 from public.profiles p where p.id = auth.uid() and p.role = 'admin')
)
with check (
  exists (select 1 from public.profiles p where p.id = auth.uid() and p.role = 'admin')
);

-- seed pinned post if none exists
insert into public.insights_posts (title, body, pinned)
select
  'Pinned: Welcome to Larmah',
  'Real Estate | Logistics | Insights. Every enquiry includes a reference ID for traceability. Use WhatsApp for fast support.',
  true
where not exists (select 1 from public.insights_posts where pinned = true);


-- =========================================================
-- 6) Helpful Indexes
-- =========================================================
create index if not exists idx_catalog_items_category_updated
on public.catalog_items (category, updated_at desc);

create index if not exists idx_requests_created
on public.requests (created_at desc);

create index if not exists idx_insights_pinned_created
on public.insights_posts (pinned desc, created_at desc);

-- =========================================================
-- 7) Admin Promotion (run manually after signup)
-- =========================================================
-- update public.profiles set role='admin' where lower(email)=lower('YOUR_ADMIN_EMAIL');

-- =========================================================
-- 8) Realtime (enable in Supabase dashboard)
-- =========================================================
-- Enable Realtime replication for:
--   - insights_posts
-- Supabase Dashboard -> Realtime -> Replication
