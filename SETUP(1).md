# Larmah Supabase Website — Setup

## 1) Create Supabase project
- Create project in Supabase
- Copy Project URL + anon key

## 2) Run schema
- Supabase → SQL Editor → run `supabase/schema.sql`

## 3) Storage for catalogue images
- Storage → create bucket: `catalog` (Public)
- Policies:
  - Public read
  - Admin upload (based on profiles.role = 'admin')

## 4) Make an admin
Sign up using `auth.html`, then run:

```sql
update public.profiles set role='admin' where email='business@heylarmah.tech';
```

## 5) Configure website
Edit `assets/js/app.js`:

- `LARMAH.SUPABASE_URL`
- `LARMAH.SUPABASE_ANON_KEY`
- (Optional) `LARMAH.PAYSTACK_PUBLIC_KEY`

## 6) Auth settings
Supabase → Auth → URL Configuration:
- Site URL: your domain
- Redirect URLs: add your deployed URLs (index.html, auth.html)

## Notes
- Public pages load catalog items from Supabase.
- Admin page manages catalog + publishes insights.
- Requests are stored to `requests` and also open WhatsApp for immediate response.


## 7) Your deployed domain (already provided)
Use these in Supabase → Auth → URL Configuration:

- Site URL: https://larmahenterprise.42web.io
- Redirect URLs (add all):
  - https://larmahenterprise.42web.io/
  - https://larmahenterprise.42web.io/index.html
  - https://larmahenterprise.42web.io/auth.html
  - https://larmahenterprise.42web.io/admin.html


## Localhost deployment (recommended for testing)

### Option A: Python (no install needed)
From the project folder:
```bash
python -m http.server 8000
```
Open:
- http://localhost:8000/index.html

### Option B: Node
```bash
npx http-server -p 8000
```

### Supabase Auth URL Configuration for localhost
In Supabase → Auth → URL Configuration set:

- Site URL: http://localhost:8000
- Redirect URLs:
  - http://localhost:8000
  - http://localhost:8000/index.html
  - http://localhost:8000/auth.html
  - http://localhost:8000/admin.html


## Save items troubleshooting (Admin)

If Save fails, the admin page now shows the exact error message.

Common fixes:
- Ensure your user is admin in `public.profiles`.
- Ensure catalog_items RLS admin policy exists.
- For image upload: ensure Storage bucket `catalog` exists and policies allow admin insert/update.
