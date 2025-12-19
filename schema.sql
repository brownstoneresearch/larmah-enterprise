-- supabase/schema.sql
-- Run in Supabase SQL editor

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

create table if not exists public.catalog_items (
  id uuid primary key default gen_random_uuid(),
  category text not null check (category in ('real-estate','logistics','fintech','insights')),
  title text not null,
  description text,
  price text,
  image_url text,
  tags text[] default '{}'::text[],
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.requests (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id),
  category text not null,
  name text,
  phone text,
  details jsonb,
  created_at timestamptz not null default now()
);

create table if not exists public.insights_posts (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  body text not null,
  created_at timestamptz not null default now()
);

alter table public.profiles enable row level security;
alter table public.catalog_items enable row level security;
alter table public.requests enable row level security;
alter table public.insights_posts enable row level security;

drop policy if exists "profiles_read_own" on public.profiles;
create policy "profiles_read_own" on public.profiles
for select using (auth.uid() = id);

drop policy if exists "catalog_read_public" on public.catalog_items;
create policy "catalog_read_public" on public.catalog_items
for select using (active = true);

drop policy if exists "catalog_admin_manage" on public.catalog_items;
create policy "catalog_admin_manage" on public.catalog_items
for all using (
  exists (select 1 from public.profiles p where p.id = auth.uid() and p.role = 'admin')
) with check (
  exists (select 1 from public.profiles p where p.id = auth.uid() and p.role = 'admin')
);

drop policy if exists "requests_insert" on public.requests;
create policy "requests_insert" on public.requests
for insert with check (true);

drop policy if exists "requests_read_own" on public.requests;
create policy "requests_read_own" on public.requests
for select using (user_id = auth.uid());

drop policy if exists "insights_read_public" on public.insights_posts;
create policy "insights_read_public" on public.insights_posts
for select using (true);

drop policy if exists "insights_admin_insert" on public.insights_posts;
create policy "insights_admin_insert" on public.insights_posts
for insert with check (
  exists (select 1 from public.profiles p where p.id = auth.uid() and p.role = 'admin')
);

-- Storage:
-- Create bucket 'catalog' (public read). Add policies for admin upload.


-- Allow admin to update/delete insights posts too
drop policy if exists "insights_admin_manage" on public.insights_posts;
create policy "insights_admin_manage"
on public.insights_posts
for all
using (
  exists (select 1 from public.profiles p where p.id = auth.uid() and p.role = 'admin')
)
with check (
  exists (select 1 from public.profiles p where p.id = auth.uid() and p.role = 'admin')
);
