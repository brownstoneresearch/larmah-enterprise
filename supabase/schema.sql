-- Hey Larmah Enterprise Limited — Supabase schema
-- Project URL: https://ipohjsdhakjbetyievmv.supabase.co
-- Registration: RC: 9488632
-- Admin email: heylarmahtech@outlook.com

create extension if not exists "pgcrypto";

-- =========================================================
-- Helpers
-- =========================================================
create or replace function public.admin_email()
returns text language sql immutable as $$ select 'heylarmahtech@outlook.com'::text $$;

-- =========================================================
-- Profiles / secured users
-- =========================================================
create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  email text,
  role text not null default 'premium' check (role in ('user','premium','admin')),
  full_name text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create or replace function public.current_user_is_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select lower(coalesce(auth.jwt() ->> 'email','')) = lower(public.admin_email())
     or exists (select 1 from public.profiles p where p.id = auth.uid() and p.role = 'admin');
$$;

create or replace function public.handle_new_user()
returns trigger as $$
begin
  insert into public.profiles (id, email, role, full_name)
  values (
    new.id,
    new.email,
    case when lower(new.email) = lower(public.admin_email()) then 'admin' else coalesce(new.raw_user_meta_data ->> 'account_type','premium') end,
    coalesce(new.raw_user_meta_data ->> 'full_name','')
  )
  on conflict (id) do update
  set email = excluded.email,
      role = case when lower(excluded.email) = lower(public.admin_email()) then 'admin' else public.profiles.role end,
      full_name = coalesce(nullif(excluded.full_name,''), public.profiles.full_name),
      updated_at = now();
  return new;
end;
$$ language plpgsql security definer set search_path = public;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
after insert on auth.users
for each row execute procedure public.handle_new_user();

-- Migration safety for existing installations where tables were created by earlier packages.
alter table public.profiles add column if not exists email text;
alter table public.profiles add column if not exists role text not null default 'premium';
alter table public.profiles add column if not exists full_name text;
alter table public.profiles add column if not exists created_at timestamptz not null default now();
alter table public.profiles add column if not exists updated_at timestamptz not null default now();
alter table public.profiles drop constraint if exists profiles_role_check;
alter table public.profiles add constraint profiles_role_check check (role in ('user','premium','admin'));

alter table public.profiles enable row level security;

drop policy if exists profiles_read_own on public.profiles;
create policy profiles_read_own on public.profiles for select using (auth.uid() = id);


drop policy if exists profiles_admin_read_all on public.profiles;
create policy profiles_admin_read_all on public.profiles for select using (lower(coalesce(auth.jwt() ->> 'email','')) = lower(public.admin_email()));

-- =========================================================
-- Catalogue items
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
  featured boolean not null default false,
  sort_order integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Migration safety for existing catalogue tables.
alter table public.catalog_items add column if not exists category text;
alter table public.catalog_items add column if not exists title text;
alter table public.catalog_items add column if not exists description text;
alter table public.catalog_items add column if not exists price text;
alter table public.catalog_items add column if not exists image_url text;
alter table public.catalog_items add column if not exists tags text[] not null default '{}'::text[];
alter table public.catalog_items add column if not exists active boolean not null default true;
alter table public.catalog_items add column if not exists featured boolean not null default false;
alter table public.catalog_items add column if not exists sort_order integer not null default 0;
alter table public.catalog_items add column if not exists created_at timestamptz not null default now();
alter table public.catalog_items add column if not exists updated_at timestamptz not null default now();

alter table public.catalog_items drop constraint if exists catalog_items_category_check;
alter table public.catalog_items add constraint catalog_items_category_check check (category in ('real-estate','fintech','logistics','shipping','premium'));

alter table public.catalog_items enable row level security;

drop policy if exists catalog_public_read_active on public.catalog_items;
create policy catalog_public_read_active on public.catalog_items for select using (active = true);

drop policy if exists catalog_admin_all on public.catalog_items;
create policy catalog_admin_all on public.catalog_items for all using (public.current_user_is_admin()) with check (public.current_user_is_admin());

-- =========================================================
-- Website / WhatsApp enquiries
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

-- Migration safety for existing enquiry/request tables.
alter table public.requests add column if not exists user_id uuid references auth.users(id) on delete set null;
alter table public.requests add column if not exists category text;
alter table public.requests add column if not exists name text;
alter table public.requests add column if not exists phone text;
alter table public.requests add column if not exists details jsonb not null default '{}'::jsonb;
alter table public.requests add column if not exists status text not null default 'new';
alter table public.requests add column if not exists created_at timestamptz not null default now();

alter table public.requests drop constraint if exists requests_category_check;
alter table public.requests add constraint requests_category_check check (category in ('real-estate','fintech','logistics','shipping','premium','contact','insights','whatsapp','general'));

alter table public.requests enable row level security;

drop policy if exists requests_public_insert on public.requests;
create policy requests_public_insert on public.requests for insert with check (user_id is null or user_id = auth.uid());

drop policy if exists requests_read_own on public.requests;
create policy requests_read_own on public.requests for select using (user_id = auth.uid());

drop policy if exists requests_admin_read_all on public.requests;
create policy requests_admin_read_all on public.requests for select using (public.current_user_is_admin());

drop policy if exists requests_admin_update on public.requests;
create policy requests_admin_update on public.requests for update using (public.current_user_is_admin()) with check (public.current_user_is_admin());

-- =========================================================
-- Insight blog posts
-- =========================================================
create table if not exists public.insights_posts (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  excerpt text,
  body text not null,
  category text not null default 'Enterprise',
  read_time text not null default '4 min read',
  image_url text,
  pinned boolean not null default false,
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Migration safety for existing blog tables.
alter table public.insights_posts add column if not exists title text;
alter table public.insights_posts add column if not exists excerpt text;
alter table public.insights_posts add column if not exists body text;
alter table public.insights_posts add column if not exists category text not null default 'Enterprise';
alter table public.insights_posts add column if not exists read_time text not null default '4 min read';
alter table public.insights_posts add column if not exists image_url text;
alter table public.insights_posts add column if not exists pinned boolean not null default false;
alter table public.insights_posts add column if not exists active boolean not null default true;
alter table public.insights_posts add column if not exists created_at timestamptz not null default now();
alter table public.insights_posts add column if not exists updated_at timestamptz not null default now();

alter table public.insights_posts enable row level security;

drop policy if exists insights_public_read_active on public.insights_posts;
create policy insights_public_read_active on public.insights_posts for select using (active = true);

drop policy if exists insights_admin_all on public.insights_posts;
create policy insights_admin_all on public.insights_posts for all using (public.current_user_is_admin()) with check (public.current_user_is_admin());

-- =========================================================
-- Invitations audit trail (optional)
-- =========================================================
create table if not exists public.invitations (
  id uuid primary key default gen_random_uuid(),
  email text not null,
  full_name text,
  invited_by uuid references auth.users(id) on delete set null,
  status text not null default 'sent' check (status in ('sent','accepted','revoked')),
  created_at timestamptz not null default now()
);

alter table public.invitations add column if not exists email text;
alter table public.invitations add column if not exists full_name text;
alter table public.invitations add column if not exists invited_by uuid references auth.users(id) on delete set null;
alter table public.invitations add column if not exists status text not null default 'sent';
alter table public.invitations add column if not exists created_at timestamptz not null default now();

alter table public.invitations enable row level security;

drop policy if exists invitations_admin_all on public.invitations;
create policy invitations_admin_all on public.invitations for all using (public.current_user_is_admin()) with check (public.current_user_is_admin());

-- =========================================================
-- Storage bucket for admin uploads
-- =========================================================
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('larmah-media', 'larmah-media', true, 5242880, array['image/jpeg','image/png','image/webp','image/gif'])
on conflict (id) do update set public = true, file_size_limit = 5242880, allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists "larmah_media_public_read" on storage.objects;
create policy "larmah_media_public_read" on storage.objects for select using (bucket_id = 'larmah-media');
drop policy if exists "larmah_media_admin_insert" on storage.objects;
create policy "larmah_media_admin_insert" on storage.objects for insert with check (bucket_id = 'larmah-media' and public.current_user_is_admin());
drop policy if exists "larmah_media_admin_update" on storage.objects;
create policy "larmah_media_admin_update" on storage.objects for update using (bucket_id = 'larmah-media' and public.current_user_is_admin()) with check (bucket_id = 'larmah-media' and public.current_user_is_admin());
drop policy if exists "larmah_media_admin_delete" on storage.objects;
create policy "larmah_media_admin_delete" on storage.objects for delete using (bucket_id = 'larmah-media' and public.current_user_is_admin());

-- =========================================================
-- Indexes
-- =========================================================
create index if not exists idx_catalog_items_category_sort on public.catalog_items (category, featured desc, sort_order, created_at desc);
create index if not exists idx_requests_user_created on public.requests (user_id, created_at desc);
create index if not exists idx_requests_category_created on public.requests (category, created_at desc);
create index if not exists idx_insights_pinned_created on public.insights_posts (pinned desc, created_at desc);


-- Ensure the approved admin email is promoted when the Auth user already exists.
insert into public.profiles (id, email, role)
select id, email, 'admin'
from auth.users
where lower(email) = lower(public.admin_email())
on conflict (id) do update
set email = excluded.email,
    role = 'admin',
    updated_at = now();

-- =========================================================
-- Seed catalogue previews and blog content
-- =========================================================
insert into public.catalog_items (category, title, description, tags, featured, sort_order)
values
('real-estate','Verified Property Sourcing','Curated property options with inspection and documentation guidance.', array['property','inspection'], true, 10),
('real-estate','Land Acquisition Support','Structured guidance for title checks, surveys and acquisition coordination.', array['land','documentation'], true, 12),
('fintech','Merchant Payment Setup','Digital payment readiness support for SMEs and trade-focused businesses.', array['payments','sme'], true, 20),
('logistics','Corporate Delivery Coordination','Structured local and interstate movement support for businesses.', array['delivery','movement'], true, 30),
('shipping','Import & Export Coordination','Trade documentation and freight coordination for importers and exporters.', array['freight','trade'], true, 40),
('premium','Priority Enterprise Desk','A private support lane for serious enquiries across all four pillars.', array['priority','enterprise'], true, 50)
on conflict do nothing;

insert into public.insights_posts (title, excerpt, body, category, read_time, pinned)
values
('Building a mature enterprise brand across four serious pillars','A practical note on positioning property, fintech, logistics and shipping under one coordinated enterprise desk.','Hey Larmah Enterprise Limited is positioned around property, fintech support, logistics coordination and shipping facilitation. A mature enterprise brand needs clarity, documentation and consistent follow-through.', 'Enterprise', '5 min read', true)
on conflict do nothing;

-- Important: create the admin user in Supabase Auth using:
-- Email: heylarmahtech@outlook.com
-- Password: set the assigned admin password in Supabase Auth, not in public frontend code.
-- The trigger above automatically marks this email as admin when the Auth user exists.
