# Registration Fix

This package fixes the `{}` registration error by improving frontend error handling and adding a resilient Supabase profile trigger/RPC migration.

## Required database step

Run `fix_registration_signup.sql` in Supabase SQL Editor. This repairs the `profiles` table, the `handle_new_user` trigger, and the `sync_my_profile` helper used after login.

Then test `register.html` with a new email address.
