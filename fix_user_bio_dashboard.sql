-- =========================================================
-- Premium user bio-data profile upgrade
-- Allows users to safely edit only their own bio/contact fields from dashboard.
-- =========================================================
alter table public.profiles add column if not exists country text;
alter table public.profiles add column if not exists state_region text;
alter table public.profiles add column if not exists city text;
alter table public.profiles add column if not exists address text;
alter table public.profiles add column if not exists preferred_pillar text;
alter table public.profiles add column if not exists bio text;

create or replace function public.update_my_bio_profile(
  profile_full_name text default '',
  profile_phone text default '',
  profile_company text default '',
  profile_country text default '',
  profile_state_region text default '',
  profile_city text default '',
  profile_address text default '',
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
  safe_pillar text := lower(coalesce(profile_preferred_pillar,''));
  result public.profiles;
begin
  if user_id is null then
    raise exception 'Authenticated user required';
  end if;

  if safe_pillar not in ('real-estate','fintech','logistics','shipping','premium','') then
    safe_pillar := '';
  end if;

  insert into public.profiles (
    id, email, role, full_name, phone, company, country, state_region, city, address, preferred_pillar, bio,
    account_status, is_verified, verified_at, updated_at
  ) values (
    user_id,
    user_email,
    case when admin_match then 'admin' else 'premium' end,
    coalesce(profile_full_name,''),
    coalesce(profile_phone,''),
    coalesce(profile_company,''),
    coalesce(profile_country,''),
    coalesce(profile_state_region,''),
    coalesce(profile_city,''),
    coalesce(profile_address,''),
    nullif(safe_pillar,''),
    coalesce(profile_bio,''),
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
      state_region = excluded.state_region,
      city = excluded.city,
      address = excluded.address,
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

grant execute on function public.update_my_bio_profile(text, text, text, text, text, text, text, text, text) to authenticated;
