# Hey Larmah Enterprise Limited — Supabase Auth Setup

This package includes the frontend wiring for a mature Supabase authentication flow:

- Confirm sign up / email confirmation
- Invite premium users through the admin workspace
- Magic link / email OTP sign-in
- Password reset email
- Verified email change
- Reauthentication code before sensitive password updates
- Sign in with Google

## 1. Run the database schema

Open Supabase Dashboard → SQL Editor and run:

```sql
schema.sql
```

The schema marks `heylarmahtech@outlook.com` as the admin account when that Auth user exists.

## 2. Create or update the admin Auth user

Supabase Dashboard → Authentication → Users.

Create the admin user with:

- Email: `heylarmahtech@outlook.com`
- Password: set privately in Supabase Auth

Do not hard-code the password in public frontend files.

## 3. Enable email confirmation and secure changes

Supabase Dashboard → Authentication → Providers → Email.

Enable:

- Confirm email
- Secure email change
- Secure password change / reauthentication, when available in your project settings

Add your production domain to the redirect URL allow list, for example:

- `https://heylarmah.xyz/**`
- `https://www.heylarmah.xyz/**`
- `http://localhost:*/**` for local testing only

## 4. Enable Google sign-in

Supabase Dashboard → Authentication → Providers → Google.

Add your Google OAuth Client ID and Client Secret. In Google Cloud Console, use the callback URL shown in your Supabase Google provider page. Also add your website origin to the authorized JavaScript origins.

## 5. Deploy the admin invite Edge Function

The admin invite form calls the `invite-user` Edge Function because user invitation requires secure server-side admin privileges.

Deploy:

```bash
supabase functions deploy invite-user
```

Set secrets:

```bash
supabase secrets set ADMIN_EMAIL=heylarmahtech@outlook.com
supabase secrets set SITE_URL=https://heylarmah.xyz
supabase secrets set SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
```

Never place the service-role key in frontend JavaScript.

## 6. Confirm bucket setup

The schema creates a public `larmah-media` bucket for catalogue and insight images. If your Supabase project already has policies, review Storage → Policies and confirm admin upload access.
