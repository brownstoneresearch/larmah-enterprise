# Hey Larmah Enterprise Limited — Professional Website Upgrade

This package remodels and rebrands the site for **Real Estate • Fintech • Logistics • Shipping** with **RC: 9488632**.

## Included upgrades

- Mature black, deep-green and gold enterprise styling.
- Header logo icon only, with Instagram, X.com and TikTok icons.
- No Home nav link and no WhatsApp button in the navigation area.
- WhatsApp enquiry CTAs still direct users to the WhatsApp chat.
- Homepage catalogue preview uses exactly six containers from all pillars.
- Pillar pages use paginated catalogue containers.
- Insights page is rebuilt as a blog with featured article, filters, modal reading and pagination.
- Admin page uploads catalogue records and insight blog posts to Supabase.
- Premium user dashboard is secured by Supabase email/password authentication.
- Cloudflare-ready cookie consent banner and preferences panel.

## Supabase setup

Project URL: `https://ipohjsdhakjbetyievmv.supabase.co`

Run `schema.sql` in the Supabase SQL Editor. Then create the admin Auth user with:

- Email: `heylarmahtech@outlook.com`
- Password: use the assigned admin password privately in Supabase Auth.

Do not hard-code the admin password in frontend files.

## Media uploads

Admin image uploads use the public Supabase Storage bucket `larmah-media`, created by `schema.sql`.
