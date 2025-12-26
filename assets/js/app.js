-- =========================================
-- 0) EXTENSIONS
-- =========================================
create extension if not exists pgcrypto;

-- =========================================
-- 1) ADMINS SYSTEM (allow-list)
-- =========================================
create table if not exists public.admins (
  user_id uuid primary key references auth.users(id) on delete cascade,
  created_at timestamptz not null default now()
);

create or replace function public.is_admin()
returns boolean
language sql
stable
as $$
  select exists (
    select 1 from public.admins a
    where a.user_id = auth.uid()
  );
$$;

-- =========================================
-- 2) updated_at trigger helper
-- =========================================
create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

-- =========================================
-- 3) PROFILES (schema + RLS)
-- =========================================
create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  email text,
  full_name text,
  avatar_url text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create unique index if not exists profiles_email_unique
on public.profiles (email)
where email is not null;

drop trigger if exists set_profiles_updated_at on public.profiles;
create trigger set_profiles_updated_at
before update on public.profiles
for each row execute function public.set_updated_at();

-- Optional: auto-create profile on signup
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, email, full_name, avatar_url)
  values (
    new.id,
    new.email,
    coalesce(new.raw_user_meta_data->>'full_name', new.raw_user_meta_data->>'name', ''),
    coalesce(new.raw_user_meta_data->>'avatar_url', '')
  )
  on conflict (id) do nothing;

  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
after insert on auth.users
for each row execute function public.handle_new_user();

alter table public.profiles enable row level security;

drop policy if exists "Profiles: read own" on public.profiles;
create policy "Profiles: read own"
on public.profiles
for select
to authenticated
using (auth.uid() = id);

drop policy if exists "Profiles: insert own" on public.profiles;
create policy "Profiles: insert own"
on public.profiles
for insert
to authenticated
with check (auth.uid() = id);

drop policy if exists "Profiles: update own" on public.profiles;
create policy "Profiles: update own"
on public.profiles
for update
to authenticated
using (auth.uid() = id)
with check (auth.uid() = id);

-- =========================================
-- 4) LISTINGS (public read active, admin write)
-- =========================================
create table if not exists public.listings (
  id uuid primary key default gen_random_uuid(),
  category text not null check (category in ('real-estate','logistics')),
  title text not null,
  description text,
  price text,
  image_url text,
  tags text[] not null default '{}'::text[],
  status text not null default 'draft' check (status in ('active','draft','sold')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists listings_category_idx on public.listings(category);
create index if not exists listings_status_idx on public.listings(status);
create index if not exists listings_created_at_idx on public.listings(created_at desc);

drop trigger if exists set_listings_updated_at on public.listings;
create trigger set_listings_updated_at
before update on public.listings
for each row execute function public.set_updated_at();

alter table public.listings enable row level security;

drop policy if exists "Listings: public read active" on public.listings;
create policy "Listings: public read active"
on public.listings
for select
to anon, authenticated
using (status = 'active' or public.is_admin());

drop policy if exists "Listings: admin insert" on public.listings;
create policy "Listings: admin insert"
on public.listings
for insert
to authenticated
with check (public.is_admin());

drop policy if exists "Listings: admin update" on public.listings;
create policy "Listings: admin update"
on public.listings
for update
to authenticated
using (public.is_admin())
with check (public.is_admin());

drop policy if exists "Listings: admin delete" on public.listings;
create policy "Listings: admin delete"
on public.listings
for delete
to authenticated
using (public.is_admin());

-- =========================================
-- 5) RATES (public read active, admin write)
-- =========================================
create table if not exists public.rates (
  id uuid primary key default gen_random_uuid(),
  asset text not null check (asset in ('USD','GBP','EUR','USDT','BTC')),
  buy numeric(18,2),
  sell numeric(18,2),
  status text not null default 'active' check (status in ('active','draft')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Important for admin upsert-by-asset
create unique index if not exists rates_asset_unique on public.rates(asset);

drop trigger if exists set_rates_updated_at on public.rates;
create trigger set_rates_updated_at
before update on public.rates
for each row execute function public.set_updated_at();

alter table public.rates enable row level security;

drop policy if exists "Rates: public read active" on public.rates;
create policy "Rates: public read active"
on public.rates
for select
to anon, authenticated
using (status = 'active' or public.is_admin());

drop policy if exists "Rates: admin insert" on public.rates;
create policy "Rates: admin insert"
on public.rates
for insert
to authenticated
with check (public.is_admin());

drop policy if exists "Rates: admin update" on public.rates;
create policy "Rates: admin update"
on public.rates
for update
to authenticated
using (public.is_admin())
with check (public.is_admin());

drop policy if exists "Rates: admin delete" on public.rates;
create policy "Rates: admin delete"
on public.rates
for delete
to authenticated
using (public.is_admin());

-- =========================================
-- 6) INSIGHTS (public read active, admin write)
-- =========================================
create table if not exists public.insights (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  category text not null default 'all' check (category in ('all','real-estate','logistics','exchange')),
  summary text,
  image_url text,
  status text not null default 'active' check (status in ('active','draft')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists insights_status_idx on public.insights(status);
create index if not exists insights_created_at_idx on public.insights(created_at desc);
create index if not exists insights_category_idx on public.insights(category);

drop trigger if exists set_insights_updated_at on public.insights;
create trigger set_insights_updated_at
before update on public.insights
for each row execute function public.set_updated_at();

alter table public.insights enable row level security;

drop policy if exists "Insights: public read active" on public.insights;
create policy "Insights: public read active"
on public.insights
for select
to anon, authenticated
using (status = 'active' or public.is_admin());

drop policy if exists "Insights: admin insert" on public.insights;
create policy "Insights: admin insert"
on public.insights
for insert
to authenticated
with check (public.is_admin());

drop policy if exists "Insights: admin update" on public.insights;
create policy "Insights: admin update"
on public.insights
for update
to authenticated
using (public.is_admin())
with check (public.is_admin());

drop policy if exists "Insights: admin delete" on public.insights;
create policy "Insights: admin delete"
on public.insights
for delete
to authenticated
using (public.is_admin());

-- =========================================
-- 7) REQUESTS (user insert/read own, admin read all + update status + delete)
-- =========================================
create table if not exists public.requests (
  id uuid primary key default gen_random_uuid(),
  category text not null default 'general',
  payload jsonb not null default '{}'::jsonb,
  user_id uuid references auth.users(id) on delete set null,
  status text not null default 'new',  -- new | processing | done | closed
  created_at timestamptz not null default now()
);

create index if not exists requests_user_id_idx on public.requests(user_id);
create index if not exists requests_created_at_idx on public.requests(created_at desc);
create index if not exists requests_category_idx on public.requests(category);

alter table public.requests enable row level security;

-- User read own
drop policy if exists "Requests: user read own" on public.requests;
create policy "Requests: user read own"
on public.requests
for select
to authenticated
using (user_id = auth.uid());

-- Admin read all
drop policy if exists "Requests: admin read all" on public.requests;
create policy "Requests: admin read all"
on public.requests
for select
to authenticated
using (public.is_admin());

-- User insert own (THIS is why app.js logs only when authenticated)
drop policy if exists "Requests: user insert own" on public.requests;
create policy "Requests: user insert own"
on public.requests
for insert
to authenticated
with check (user_id = auth.uid());

-- Admin update status (and other fields if needed)
drop policy if exists "Requests: admin update" on public.requests;
create policy "Requests: admin update"
on public.requests
for update
to authenticated
using (public.is_admin())
with check (public.is_admin());

-- Admin delete
drop policy if exists "Requests: admin delete" on public.requests;
create policy "Requests: admin delete"
on public.requests
for delete
to authenticated
using (public.is_admin());
