-- Hey Larmah Enterprise Limited — set approved admin email
-- Run this in Supabase SQL Editor after creating/signing up the Auth user.

create or replace function public.admin_email()
returns text
language sql
immutable
as $$ select 'heylarmahtech@outlook.com'::text $$;

-- Promote an existing Auth user with the approved email to admin.
insert into public.profiles (id, email, role)
select id, email, 'admin'
from auth.users
where lower(email) = lower(public.admin_email())
on conflict (id) do update
set email = excluded.email,
    role = 'admin',
    updated_at = now();

-- Verify result.
select id, email, role, updated_at
from public.profiles
where lower(email) = lower(public.admin_email());
