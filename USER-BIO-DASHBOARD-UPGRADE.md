# User Bio Dashboard Upgrade

This package adds an editable Bio Data section to the premium user dashboard.

Users can update:

- Full name
- Phone / WhatsApp number
- Country
- State / region
- City
- Address / location note
- Company / organisation
- Preferred service pillar
- Bio / important profile details

Run `schema.sql` or the standalone `fix_user_bio_dashboard.sql` in Supabase SQL Editor before testing the save button. The dashboard uses the `update_my_bio_profile` RPC so users can update only their own allowed bio/contact fields, without giving public access to admin-only columns such as role, verification status or admin notes.
