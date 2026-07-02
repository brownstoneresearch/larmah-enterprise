-- Hey Larmah Enterprise Limited — Premium user bio/profile dashboard upgrade
-- Run this in Supabase SQL Editor after deployment to enable editable user bio data.

create extension if not exists "pgcrypto";

alter table public.profiles add column if not exists phone text;
alter table public.profiles add column if not exists company text;
alter table public.profiles add column if not exists country text;
alter table public.profiles add column if not exists state text;
alter table public.profiles add column if not exists city text;
alter table public.profiles add column if not exists address text;
alter table public.profiles add column if not exists occupation text;
alter table public.profiles add column if not exists preferred_pillar text;
alter table public.profiles add column if not exists bio text;
alter table public.profiles add column if not exists updated_at timestamptz not null default now();

alter table public.profiles drop constraint if exists profiles_preferred_pillar_check;
alter table public.profiles add constraint profiles_preferred_pillar_check
check (preferred_pillar is null or preferred_pillar = '' or preferred_pillar in ('real-estate','fintech','logistics','shipping','premium'));

create or replace function public.update_my_profile_bio(
  profile_full_name text default '',
  profile_phone text default '',
  profile_company text default '',
  profile_country text default '',
  profile_state text default '',
  profile_city text default '',
  profile_address text default '',
  profile_occupation text default '',
  profile_preferred_pillar text default '',
  profile_bio text default ''
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
  clean_pillar text := nullif(trim(coalesce(profile_preferred_pillar,'')), '');
  result public.profiles;
begin
  if user_id is null then
    raise exception 'Authenticated user required';
  end if;

  if clean_pillar is not null and clean_pillar not in ('real-estate','fintech','logistics','shipping','premium') then
    clean_pillar := null;
  end if;

  insert into public.profiles (
    id, email, role, full_name, phone, company, country, state, city, address, occupation, preferred_pillar, bio,
    account_status, is_verified, verified_at, updated_at
  ) values (
    user_id,
    user_email,
    case when admin_match then 'admin' else 'premium' end,
    trim(coalesce(profile_full_name,'')),
    trim(coalesce(profile_phone,'')),
    trim(coalesce(profile_company,'')),
    trim(coalesce(profile_country,'')),
    trim(coalesce(profile_state,'')),
    trim(coalesce(profile_city,'')),
    trim(coalesce(profile_address,'')),
    trim(coalesce(profile_occupation,'')),
    clean_pillar,
    trim(coalesce(profile_bio,'')),
    case when admin_match then 'verified' else 'pending' end,
    admin_match,
    case when admin_match then now() else null end,
    now()
  )
  on conflict (id) do update
  set email = coalesce(nullif(excluded.email,''), public.profiles.email),
      role = case when admin_match then 'admin' else public.profiles.role end,
      full_name = excluded.full_name,
      phone = excluded.phone,
      company = excluded.company,
      country = excluded.country,
      state = excluded.state,
      city = excluded.city,
      address = excluded.address,
      occupation = excluded.occupation,
      preferred_pillar = excluded.preferred_pillar,
      bio = excluded.bio,
      account_status = case when admin_match then 'verified' else public.profiles.account_status end,
      is_verified = case when admin_match then true else public.profiles.is_verified end,
      verified_at = case when admin_match then coalesce(public.profiles.verified_at, now()) else public.profiles.verified_at end,
      updated_at = now()
  returning * into result;

  return result;
end;
$$;

drop function if exists public.sync_my_profile(text, text, text);
create or replace function public.sync_my_profile(
  profile_full_name text default '',
  profile_phone text default '',
  profile_company text default '',
  profile_country text default '',
  profile_state text default '',
  profile_city text default '',
  profile_address text default '',
  profile_occupation text default '',
  profile_preferred_pillar text default '',
  profile_bio text default ''
)
returns public.profiles
language plpgsql
security definer
set search_path = public
as $$
begin
  return public.update_my_profile_bio(
    profile_full_name,
    profile_phone,
    profile_company,
    profile_country,
    profile_state,
    profile_city,
    profile_address,
    profile_occupation,
    profile_preferred_pillar,
    profile_bio
  );
end;
$$;

grant execute on function public.update_my_profile_bio(text, text, text, text, text, text, text, text, text, text) to authenticated;
grant execute on function public.sync_my_profile(text, text, text, text, text, text, text, text, text, text) to authenticated;

alter table public.profiles enable row level security;

drop policy if exists profiles_read_own on public.profiles;
create policy profiles_read_own on public.profiles for select using (auth.uid() = id);

drop policy if exists profiles_admin_read_all on public.profiles;
create policy profiles_admin_read_all on public.profiles for select using (public.current_user_is_admin());

drop policy if exists profiles_admin_all on public.profiles;
create policy profiles_admin_all on public.profiles for all using (public.current_user_is_admin()) with check (public.current_user_is_admin());

-- Signup trigger enhancement for bio data metadata.
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
  clean_pillar text := nullif(trim(coalesce(meta ->> 'preferred_pillar','')), '');
begin
  if clean_pillar is not null and clean_pillar not in ('real-estate','fintech','logistics','shipping','premium') then
    clean_pillar := null;
  end if;

  insert into public.profiles (
    id, email, role, full_name, phone, company, country, state, city, address, occupation, preferred_pillar, bio,
    account_status, is_verified, verified_at, updated_at
  )
  values (
    new.id,
    new.email,
    case when admin_match then 'admin' when requested_role in ('user','premium') then requested_role else 'premium' end,
    coalesce(meta ->> 'full_name', meta ->> 'name', ''),
    coalesce(meta ->> 'phone', ''),
    coalesce(meta ->> 'company', ''),
    coalesce(meta ->> 'country', ''),
    coalesce(meta ->> 'state', ''),
    coalesce(meta ->> 'city', ''),
    coalesce(meta ->> 'address', ''),
    coalesce(meta ->> 'occupation', meta ->> 'job_title', ''),
    clean_pillar,
    coalesce(meta ->> 'bio', meta ->> 'note', ''),
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
      country = coalesce(nullif(excluded.country,''), public.profiles.country),
      state = coalesce(nullif(excluded.state,''), public.profiles.state),
      city = coalesce(nullif(excluded.city,''), public.profiles.city),
      address = coalesce(nullif(excluded.address,''), public.profiles.address),
      occupation = coalesce(nullif(excluded.occupation,''), public.profiles.occupation),
      preferred_pillar = coalesce(excluded.preferred_pillar, public.profiles.preferred_pillar),
      bio = coalesce(nullif(excluded.bio,''), public.profiles.bio),
      account_status = case when admin_match then 'verified' else coalesce(public.profiles.account_status, 'pending') end,
      is_verified = case when admin_match then true else public.profiles.is_verified end,
      verified_at = case when admin_match then coalesce(public.profiles.verified_at, now()) else public.profiles.verified_at end,
      updated_at = now();
  return new;
exception when others then
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
after insert on auth.users
for each row execute procedure public.handle_new_user();

