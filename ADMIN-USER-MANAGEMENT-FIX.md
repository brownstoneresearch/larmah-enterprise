# Admin User Management Fix

This package fixes the admin dashboard message:

> User management is not connected yet. Failed to send a request to the Edge Function.

## What changed

The admin dashboard now loads user management records directly from the `profiles` table when the optional `admin-users` Edge Function is unavailable or not deployed.

The Edge Function is still included for advanced Auth operations, but the dashboard can now:

- list registered users,
- verify users,
- edit user profile data,
- update role/status/admin notes,

without breaking when the Edge Function is missing.

## Required Supabase step

Run `fix_admin_user_management.sql` or the full `schema.sql` in Supabase SQL Editor.

Then sign in to the admin dashboard with:

`heylarmahtech@outlook.com`

The frontend does not store the admin password.

## Optional Edge Function deployment

To enable advanced Auth operations through the server-side function, deploy:

```bash
supabase functions deploy admin-users
supabase secrets set ADMIN_EMAIL=heylarmahtech@outlook.com
supabase secrets set SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
```

Never place the service-role key in frontend JavaScript.
