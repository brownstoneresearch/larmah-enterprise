-- Hey Larmah Enterprise Limited — Supabase schema
-- Run this file in the Supabase SQL editor for project: ipohjsdhakjbetyievmv
-- Brand pillars: Real Estate • Fintech • Logistics • Shipping
-- Registration: RC: 9488632

create extension if not exists "pgcrypto";

-- =========================================================
-- 1) Profiles / admin gate
-- =========================================================
create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  email text,
  role text not null default 'user' check (role in ('user','admin')),
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
$$ language plpgsql security definer set search_path = public;

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
using (exists (select 1 from public.profiles p where p.id = auth.uid() and p.role = 'admin'));

-- =========================================================
-- 2) Catalogue items
-- =========================================================
create table if not exists public.catalog_items (
  id uuid primary key default gen_random_uuid(),
  category text not null,
  title text not null,
  description text,
  price text,
  image_url text,
  tags text[] not null default '{}'::text[],
  active boolean not null default true,
  sort_order integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.catalog_items drop constraint if exists catalog_items_category_check;
alter table public.catalog_items add constraint catalog_items_category_check
check (category in ('real-estate','fintech','logistics','shipping','premium','insights'));

alter table public.catalog_items enable row level security;

drop policy if exists catalog_public_read_active on public.catalog_items;
create policy catalog_public_read_active
on public.catalog_items for select
using (active = true);

drop policy if exists catalog_admin_all on public.catalog_items;
create policy catalog_admin_all
on public.catalog_items for all
using (exists (select 1 from public.profiles p where p.id = auth.uid() and p.role = 'admin'))
with check (exists (select 1 from public.profiles p where p.id = auth.uid() and p.role = 'admin'));

-- =========================================================
-- 3) Website / WhatsApp enquiries
-- =========================================================
create table if not exists public.requests (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete set null,
  category text not null,
  name text,
  phone text,
  details jsonb not null default '{}'::jsonb,
  status text not null default 'new' check (status in ('new','contacted','in-progress','closed')),
  created_at timestamptz not null default now()
);

alter table public.requests drop constraint if exists requests_category_check;
alter table public.requests add constraint requests_category_check
check (category in ('real-estate','fintech','logistics','shipping','premium','contact','insights','whatsapp','general'));

alter table public.requests enable row level security;

drop policy if exists requests_public_insert on public.requests;
create policy requests_public_insert
on public.requests for insert
with check (true);

drop policy if exists requests_read_own on public.requests;
create policy requests_read_own
on public.requests for select
using (user_id = auth.uid());

drop policy if exists requests_admin_read_all on public.requests;
create policy requests_admin_read_all
on public.requests for select
using (exists (select 1 from public.profiles p where p.id = auth.uid() and p.role = 'admin'));

drop policy if exists requests_admin_update on public.requests;
create policy requests_admin_update
on public.requests for update
using (exists (select 1 from public.profiles p where p.id = auth.uid() and p.role = 'admin'))
with check (exists (select 1 from public.profiles p where p.id = auth.uid() and p.role = 'admin'));

-- =========================================================
-- 4) Insights posts
-- =========================================================
create table if not exists public.insights_posts (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  body text not null,
  category text not null default 'insights',
  pinned boolean not null default false,
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.insights_posts enable row level security;

drop policy if exists insights_public_read_active on public.insights_posts;
create policy insights_public_read_active
on public.insights_posts for select
using (active = true);

drop policy if exists insights_admin_all on public.insights_posts;
create policy insights_admin_all
on public.insights_posts for all
using (exists (select 1 from public.profiles p where p.id = auth.uid() and p.role = 'admin'))
with check (exists (select 1 from public.profiles p where p.id = auth.uid() and p.role = 'admin'));

-- =========================================================
-- 5) Helpful indexes
-- =========================================================
create index if not exists idx_catalog_items_category_sort on public.catalog_items (category, sort_order, created_at desc);
create index if not exists idx_requests_category_created on public.requests (category, created_at desc);
create index if not exists idx_requests_status_created on public.requests (status, created_at desc);
create index if not exists idx_insights_pinned_created on public.insights_posts (pinned desc, created_at desc);

-- =========================================================
-- 6) Optional seed catalogue
-- =========================================================
insert into public.catalog_items (category, title, description, tags, sort_order)
values
('real-estate','Verified Property Sourcing','Curated property options with inspection and documentation guidance.', array['property','inspection'], 10),
('fintech','Merchant Payment Setup','Digital payment readiness support for SMEs and trade-focused businesses.', array['payments','sme'], 20),
('logistics','Corporate Delivery Coordination','Structured local movement and delivery coordination for businesses.', array['delivery','fleet'], 30),
('shipping','Import & Export Coordination','Trade documentation and freight support for importers and exporters.', array['freight','trade'], 40),
('logistics','Interstate Movement Planning','Route, timing and movement coordination for business cargo and project needs.', array['route','cargo'], 45),
('premium','Premium Enterprise Desk','Priority enquiry handling across all four business pillars.', array['priority','enterprise'], 50)
on conflict do nothing;

-- =========================================================
-- 7) Make a user admin after signup
-- =========================================================
-- update public.profiles set role = 'admin' where lower(email) = lower('your-admin-email@example.com');
