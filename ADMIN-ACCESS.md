# Hey Larmah Admin Access

Approved admin email: `heylarmahtech@outlook.com`

The public frontend does not store the admin password or service-role key. Create or update this admin user in Supabase Auth, then run `schema.sql` to promote the profile to admin.

## Admin functions included

- Upload catalogue photos and videos to Supabase Storage.
- Publish blog/insight posts.
- Invite premium users.
- Verify new users.
- Edit premium user profile data.

## Required Edge Functions

Deploy both functions in `supabase/functions`:

- `invite-user`
- `admin-users`

Set these Edge Function secrets:

- `SUPABASE_URL`
- `SUPABASE_ANON_KEY`
- `SUPABASE_SERVICE_ROLE_KEY`
- `ADMIN_EMAIL=heylarmahtech@outlook.com`
- `SITE_URL=https://heylarmah.xyz`
