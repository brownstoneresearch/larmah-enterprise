# Hey Larmah Enterprise Limited Website

Premium enterprise website for:

**Real Estate • Fintech • Logistics • Shipping**

Registration: **RC: 9488632**

## Included upgrades

- Mature brand styling in black, deep green and gold
- Homepage catalogue preview with six containers
- Paginated catalogue pages
- Blog-structured Insights page
- Supabase-backed catalogue, insights and enquiry records
- Admin workspace for catalogue uploads, insight posts and premium user invitations
- Premium dashboards secured with user email and password
- Confirm sign up, password reset, verified email change and password-based reauthentication flows
- Sign in with Google button wired through Supabase Auth
- Cloudflare-ready cookie consent
- WhatsApp enquiry flow

## Important setup

Run `schema.sql` inside Supabase SQL Editor.

Read `AUTH-SETUP.md` before going live. Google sign-in and user invitations require project-level Supabase configuration and a deployed Edge Function.

Admin email:

`heylarmahtech@outlook.com`

Company email:

`admin@heylarmah.xyz`


## Latest admin upgrade

This package adds professional admin tools for catalogue photo/video uploads, blog publishing, premium user verification and profile editing through Supabase Auth, Storage, RLS and secured Edge Functions. Run `schema.sql`, create the `larmah-media` storage bucket through the SQL, and deploy `invite-user` plus `admin-users` before launch.
