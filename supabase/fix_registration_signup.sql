-- Hey Larmah Enterprise Limited — registration/signup fix
-- Fixes registration errors such as "{}" or "Database error saving new user".
-- Run this in Supabase SQL Editor once, then test register.html again.

create extension if not exists "pgcrypto";

create or replace function public.admin_email()
returns text
language sql
immutable
as $$ select 'heylarmahtech@outlook.com'::text $$;

create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  email text,
  role text not null default 'premium',
  full_name text,
  phone text,
  company text,
  account_status text not null default 'pending',
  is_verified boolean not null default false,
  verified_at timestamptz,
  verified_by uuid references auth.users(id) on delete set null,
  last_admin_note text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

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

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  meta jsonb := coalesce(new.raw_user_meta_data, '{}'::jsonb);
  requested_role text := lower(coalesce(meta ->> 'account_type', meta ->> 'role', 'premium'));
  admin_match boolean := lower(coalesce(new.email,'')) = lower(public.admin_email());
begin
  insert into public.profiles (
    id, email, role, full_name, phone, company,
    account_status, is_verified, verified_at, updated_at
  )
  values (
    new.id,
    new.email,
    case when admin_match then 'admin' when requested_role in ('user','premium') then requested_role else 'premium' end,
    coalesce(meta ->> 'full_name', meta ->> 'name', ''),
    coalesce(meta ->> 'phone', ''),
    coalesce(meta ->> 'company', ''),
    case when admin_match then 'verified' else 'pending' end,
    admin_match,
    case when admin_match then now() else null end,
    now()
  )
  on conflict (id) do update
  set email = excluded.email,
      role = case when admin_match then 'admin' else public.profiles.role end,
      full_name = coalesce(nullif(excluded.full_name,''), public.profiles.full_name),
      phone = coalesce(nullif(excluded.phone,''), public.profiles.phone),
      company = coalesce(nullif(excluded.company,''), public.profiles.company),
      account_status = case when admin_match then 'verified' else coalesce(public.profiles.account_status, 'pending') end,
      is_verified = case when admin_match then true else public.profiles.is_verified end,
      verified_at = case when admin_match then coalesce(public.profiles.verified_at, now()) else public.profiles.verified_at end,
      updated_at = now();
  return new;
exception when others then
  -- Never let a public.profiles sync issue block Supabase Auth sign-up.
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
after insert on auth.users
for each row execute procedure public.handle_new_user();

create or replace function public.sync_my_profile(
  profile_full_name text default '',
  profile_phone text default '',
  profile_company text default ''
)
returns public.profiles
language plpgsql
security definer
set search_path = public
as $$
declare
  user_id uuid := auth.uid();
  user_email text := coalesce(auth.jwt() ->> 'email', '');
  admin_match boolean := lower(coalesce(auth.jwt() ->> 'email','')) = lower(public.admin_email());
  result public.profiles;
begin
  if user_id is null then
    raise exception 'Authenticated user required';
  end if;

  insert into public.profiles (
    id, email, role, full_name, phone, company,
    account_status, is_verified, verified_at, updated_at
  ) values (
    user_id,
    user_email,
    case when admin_match then 'admin' else 'premium' end,
    coalesce(profile_full_name,''),
    coalesce(profile_phone,''),
    coalesce(profile_company,''),
    case when admin_match then 'verified' else 'pending' end,
    admin_match,
    case when admin_match then now() else null end,
    now()
  )
  on conflict (id) do update
  set email = coalesce(nullif(excluded.email,''), public.profiles.email),
      role = case when admin_match then 'admin' else public.profiles.role end,
      full_name = coalesce(nullif(excluded.full_name,''), public.profiles.full_name),
      phone = coalesce(nullif(excluded.phone,''), public.profiles.phone),
      company = coalesce(nullif(excluded.company,''), public.profiles.company),
      account_status = case when admin_match then 'verified' else public.profiles.account_status end,
      is_verified = case when admin_match then true else public.profiles.is_verified end,
      verified_at = case when admin_match then coalesce(public.profiles.verified_at, now()) else public.profiles.verified_at end,
      updated_at = now()
  returning * into result;

  return result;
end;
$$;

grant usage on schema public to anon, authenticated;
grant select, insert, update on public.profiles to authenticated;
grant execute on function public.sync_my_profile(text, text, text) to authenticated;

alter table public.profiles enable row level security;

drop policy if exists profiles_read_own on public.profiles;
create policy profiles_read_own on public.profiles for select using (auth.uid() = id);

drop policy if exists profiles_admin_read_all on public.profiles;
create policy profiles_admin_read_all on public.profiles for select using (public.current_user_is_admin());

drop policy if exists profiles_admin_all on public.profiles;
create policy profiles_admin_all on public.profiles for all using (public.current_user_is_admin()) with check (public.current_user_is_admin());

update public.profiles
set role = 'admin', account_status = 'verified', is_verified = true, verified_at = coalesce(verified_at, now()), updated_at = now()
where lower(email) = lower(public.admin_email());
