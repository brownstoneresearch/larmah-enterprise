# Setup Guide — Hey Larmah Enterprise Limited

## 1. Upload files
Upload all files in this folder to your web host public directory.

## 2. Confirm brand details
The site is configured with:

- **Hey Larmah Enterprise Limited**
- **RC: 9488632**
- **Real Estate • Fintech • Logistics • Shipping**
- **Lagos, Nigeria**

## 3. Supabase database setup
Open Supabase → SQL Editor and run `schema.sql`.

This creates:

- `profiles` for client/admin roles
- `catalog_items` for future catalogue management
- `requests` for WhatsApp and website enquiries
- `insights_posts` for future insights management
- Row Level Security policies for public inserts and protected admin reads

The frontend Supabase configuration is in `assets/js/supabase-client.js`.

## 4. WhatsApp contact
The WhatsApp number is set as `2347063080605` in `assets/js/supabase-client.js` and `assets/js/app.js`.

## 5. Social links
Header social icons are active for Instagram, X.com, TikTok and WhatsApp. Footer social icons were removed for a cleaner layout.

## 6. Admin access
Create a user through `register.html`, then promote the account in Supabase SQL editor:

```sql
update public.profiles set role = 'admin' where lower(email) = lower('your-admin-email@example.com');
```

## 7. SEO files
Update `sitemap.xml` if your final domain changes from `https://heylarmah.tech`.
