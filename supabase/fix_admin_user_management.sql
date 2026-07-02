-- Hey Larmah Enterprise Limited — Admin user management fix
-- Run this in Supabase SQL Editor if admin dashboard users do not load.

create extension if not exists "pgcrypto";

create or replace function public.admin_email()
returns text language sql immutable as $$ select 'heylarmahtech@outlook.com'::text $$;

alter table public.profiles enable row level security;

alter table public.profiles add column if not exists email text;
alter table public.profiles add column if not exists role text not null default 'premium';
alter table public.profiles add column if not exists full_name text;
alter table public.profiles add column if not exists phone text;
alter table public.profiles add column if not exists company text;
alter table public.profiles add column if not exists account_status text not null default 'pending';
alter table public.profiles add column if not exists is_verified boolean not null default false;
alter table public.profiles add column if not exists verified_at timestamptz;
alter table public.profiles add column if not exists verified_by uuid references auth.users(id) on delete set null;
alter table public.profiles add column if not exists last_admin_note text;
alter table public.profiles add column if not exists created_at timestamptz not null default now();
alter table public.profiles add column if not exists updated_at timestamptz not null default now();

alter table public.profiles drop constraint if exists profiles_role_check;
alter table public.profiles add constraint profiles_role_check check (role in ('user','premium','admin'));
alter table public.profiles drop constraint if exists profiles_account_status_check;
alter table public.profiles add constraint profiles_account_status_check check (account_status in ('pending','verified','suspended'));

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

grant usage on schema public to anon, authenticated;
grant select, insert, update on public.profiles to authenticated;

drop policy if exists profiles_read_own on public.profiles;
create policy profiles_read_own on public.profiles for select using (auth.uid() = id);

drop policy if exists profiles_admin_read_all on public.profiles;
create policy profiles_admin_read_all on public.profiles for select using (public.current_user_is_admin());

drop policy if exists profiles_admin_all on public.profiles;
create policy profiles_admin_all on public.profiles for all using (public.current_user_is_admin()) with check (public.current_user_is_admin());

update public.profiles
set role = 'admin',
    account_status = 'verified',
    is_verified = true,
    verified_at = coalesce(verified_at, now()),
    updated_at = now()
where lower(email) = lower(public.admin_email());
