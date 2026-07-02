# Setup Guide — Hey Larmah Enterprise Limited

1. Upload the site files to your hosting account.
2. Open Supabase SQL Editor and run `schema.sql`.
3. In Supabase Authentication, create the admin user:
   - Email: `heylarmahtech@outlook.com`
   - Password: set the assigned admin password privately.
4. Login through `admin.html` to upload catalogue records and insight blog posts.
5. Premium users should register via `register.html` or sign in through `auth.html`.
6. `dashboard.html` is protected and redirects unauthenticated users to login.
7. Cookie consent is built in and Cloudflare-ready.

WhatsApp buttons and enquiry forms direct users to WhatsApp and attempt to save records to Supabase.
