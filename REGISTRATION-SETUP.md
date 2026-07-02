# New user registration

This package enables public client registration on `register.html`.

Required Supabase dashboard setting:

1. Go to Supabase Dashboard > Authentication > Providers > Email.
2. Keep Email provider enabled.
3. Ensure new user signups are allowed.
4. Keep email confirmation enabled if you want users to confirm their email before login.
5. Run `schema.sql` in the Supabase SQL Editor so new signups create pending premium profiles.

New users register as pending premium users. Admin can verify them from the admin dashboard.
