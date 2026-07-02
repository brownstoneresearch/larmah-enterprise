# Hey Larmah Enterprise — Moatify-Style Structure Upgrade

This package adds a more mature product-style structure inspired by Moatify-style SaaS page flow: hero, operational console, problem, shift, five-step workflow, comparison, premium access lanes and CTA.

Functional updates included:

- Dedicated `reset-password.html` page.
- Reset password is now a link inside the client login card.
- Supabase password recovery redirects to the dedicated reset page.
- Premium page has product-style workflow, comparison and access-lane cards.
- Admin dashboard lists catalogue records for direct editing, including the requested core records.
- Requested editable starter records: Import & Export Coordination, Land Acquisition Support, Merchant Payment Setup, Corporate Delivery Coordination, Verified Property Sourcing and Priority Enterprise Desk.
- Schema includes a migration-safe duplicate cleanup for these starter records.

Before deployment, run the updated `schema.sql` in Supabase SQL Editor and redeploy the existing Edge Functions.
