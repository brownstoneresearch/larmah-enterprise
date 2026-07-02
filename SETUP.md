# Setup Guide

1. Upload the website files to your hosting provider.
2. In Supabase SQL Editor, run `schema.sql`.
3. In Supabase Authentication, create the admin user: `heylarmahtech@outlook.com`.
4. Enable email confirmation, secure email change and secure password change where available.
5. Configure Google provider under Authentication → Providers → Google.
6. Deploy the `supabase/functions/invite-user` Edge Function and set the required secrets listed in `AUTH-SETUP.md`.
7. Add your final domain to Supabase Auth redirect URL allow list.
8. Test: register, confirm email, login, reset password, Google login, admin invite and catalogue upload.

Do not publish Supabase service-role keys in frontend code.
