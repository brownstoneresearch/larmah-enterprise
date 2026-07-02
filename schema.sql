-- Hey Larmah Enterprise Limited — Supabase schema
-- Project URL: https://ipohjsdhakjbetyievmv.supabase.co
-- Registration: RC: 9488632
-- Admin email: heylarmahtech@outlook.com

create extension if not exists "pgcrypto";

-- =========================================================
-- Helpers
-- =========================================================
create or replace function public.admin_email()
returns text language sql immutable as $$ select 'heylarmahtech@outlook.com'::text $$;

-- =========================================================
-- Profiles / secured users
-- =========================================================
create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  email text,
  role text not null default 'premium' check (role in ('user','premium','admin')),
  full_name text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create or replace function public.current_user_is_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select lower(coalesce(auth.jwt() ->> 'email','')) = lower(public.admin_email())
     or exists (select 1 from public.profiles p where p.id = auth.uid() and p.role = 'admin');
$$;

create or replace function public.handle_new_user()
returns trigger as $$
begin
  insert into public.profiles (id, email, role, full_name)
  values (
    new.id,
    new.email,
    case when lower(new.email) = lower(public.admin_email()) then 'admin' else coalesce(new.raw_user_meta_data ->> 'account_type','premium') end,
    coalesce(new.raw_user_meta_data ->> 'full_name','')
  )
  on conflict (id) do update
  set email = excluded.email,
      role = case when lower(excluded.email) = lower(public.admin_email()) then 'admin' else public.profiles.role end,
      full_name = coalesce(nullif(excluded.full_name,''), public.profiles.full_name),
      updated_at = now();
  return new;
end;
$$ language plpgsql security definer set search_path = public;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
after insert on auth.users
for each row execute procedure public.handle_new_user();

-- Migration safety for existing installations where tables were created by earlier packages.
alter table public.profiles add column if not exists email text;
alter table public.profiles add column if not exists role text not null default 'premium';
alter table public.profiles add column if not exists full_name text;
alter table public.profiles add column if not exists created_at timestamptz not null default now();
alter table public.profiles add column if not exists updated_at timestamptz not null default now();
alter table public.profiles drop constraint if exists profiles_role_check;
alter table public.profiles add constraint profiles_role_check check (role in ('user','premium','admin'));

alter table public.profiles enable row level security;

drop policy if exists profiles_read_own on public.profiles;
create policy profiles_read_own on public.profiles for select using (auth.uid() = id);


drop policy if exists profiles_admin_read_all on public.profiles;
create policy profiles_admin_read_all on public.profiles for select using (lower(coalesce(auth.jwt() ->> 'email','')) = lower(public.admin_email()));

-- =========================================================
-- Catalogue items
-- =========================================================
create table if not exists public.catalog_items (
  id uuid primary key default gen_random_uuid(),
  category text not null,
  title text not null,
  description text,
  price text,
  image_url text,
  tags text[] not null default '{}'::text[],
  active boolean not null default true,
  featured boolean not null default false,
  sort_order integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Migration safety for existing catalogue tables.
alter table public.catalog_items add column if not exists category text;
alter table public.catalog_items add column if not exists title text;
alter table public.catalog_items add column if not exists description text;
alter table public.catalog_items add column if not exists price text;
alter table public.catalog_items add column if not exists image_url text;
alter table public.catalog_items add column if not exists tags text[] not null default '{}'::text[];
alter table public.catalog_items add column if not exists active boolean not null default true;
alter table public.catalog_items add column if not exists featured boolean not null default false;
alter table public.catalog_items add column if not exists sort_order integer not null default 0;
alter table public.catalog_items add column if not exists created_at timestamptz not null default now();
alter table public.catalog_items add column if not exists updated_at timestamptz not null default now();

alter table public.catalog_items drop constraint if exists catalog_items_category_check;
alter table public.catalog_items add constraint catalog_items_category_check check (category in ('real-estate','fintech','logistics','shipping','premium'));

alter table public.catalog_items enable row level security;

drop policy if exists catalog_public_read_active on public.catalog_items;
create policy catalog_public_read_active on public.catalog_items for select using (active = true);

drop policy if exists catalog_admin_all on public.catalog_items;
create policy catalog_admin_all on public.catalog_items for all using (public.current_user_is_admin()) with check (public.current_user_is_admin());

-- =========================================================
-- Website / WhatsApp enquiries
-- =========================================================
create table if not exists public.requests (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete set null,
  category text not null,
  name text,
  phone text,
  details jsonb not null default '{}'::jsonb,
  status text not null default 'new' check (status in ('new','contacted','in-progress','closed')),
  created_at timestamptz not null default now()
);

-- Migration safety for existing enquiry/request tables.
alter table public.requests add column if not exists user_id uuid references auth.users(id) on delete set null;
alter table public.requests add column if not exists category text;
alter table public.requests add column if not exists name text;
alter table public.requests add column if not exists phone text;
alter table public.requests add column if not exists details jsonb not null default '{}'::jsonb;
alter table public.requests add column if not exists status text not null default 'new';
alter table public.requests add column if not exists created_at timestamptz not null default now();

alter table public.requests drop constraint if exists requests_category_check;
alter table public.requests add constraint requests_category_check check (category in ('real-estate','fintech','logistics','shipping','premium','contact','insights','whatsapp','general'));

alter table public.requests enable row level security;

drop policy if exists requests_public_insert on public.requests;
create policy requests_public_insert on public.requests for insert with check (user_id is null or user_id = auth.uid());

drop policy if exists requests_read_own on public.requests;
create policy requests_read_own on public.requests for select using (user_id = auth.uid());

drop policy if exists requests_admin_read_all on public.requests;
create policy requests_admin_read_all on public.requests for select using (public.current_user_is_admin());

drop policy if exists requests_admin_update on public.requests;
create policy requests_admin_update on public.requests for update using (public.current_user_is_admin()) with check (public.current_user_is_admin());

-- =========================================================
-- Insight blog posts
-- =========================================================
create table if not exists public.insights_posts (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  excerpt text,
  body text not null,
  category text not null default 'Enterprise',
  read_time text not null default '4 min read',
  image_url text,
  pinned boolean not null default false,
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Migration safety for existing blog tables.
alter table public.insights_posts add column if not exists title text;
alter table public.insights_posts add column if not exists excerpt text;
alter table public.insights_posts add column if not exists body text;
alter table public.insights_posts add column if not exists category text not null default 'Enterprise';
alter table public.insights_posts add column if not exists read_time text not null default '4 min read';
alter table public.insights_posts add column if not exists image_url text;
alter table public.insights_posts add column if not exists pinned boolean not null default false;
alter table public.insights_posts add column if not exists active boolean not null default true;
alter table public.insights_posts add column if not exists created_at timestamptz not null default now();
alter table public.insights_posts add column if not exists updated_at timestamptz not null default now();

alter table public.insights_posts enable row level security;

drop policy if exists insights_public_read_active on public.insights_posts;
create policy insights_public_read_active on public.insights_posts for select using (active = true);

drop policy if exists insights_admin_all on public.insights_posts;
create policy insights_admin_all on public.insights_posts for all using (public.current_user_is_admin()) with check (public.current_user_is_admin());

-- =========================================================
-- Invitations audit trail (optional)
-- =========================================================
create table if not exists public.invitations (
  id uuid primary key default gen_random_uuid(),
  email text not null,
  full_name text,
  invited_by uuid references auth.users(id) on delete set null,
  status text not null default 'sent' check (status in ('sent','accepted','revoked')),
  created_at timestamptz not null default now()
);

alter table public.invitations add column if not exists email text;
alter table public.invitations add column if not exists full_name text;
alter table public.invitations add column if not exists invited_by uuid references auth.users(id) on delete set null;
alter table public.invitations add column if not exists status text not null default 'sent';
alter table public.invitations add column if not exists created_at timestamptz not null default now();

alter table public.invitations enable row level security;

drop policy if exists invitations_admin_all on public.invitations;
create policy invitations_admin_all on public.invitations for all using (public.current_user_is_admin()) with check (public.current_user_is_admin());

-- =========================================================
-- Storage bucket for admin uploads
-- =========================================================
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('larmah-media', 'larmah-media', true, 5242880, array['image/jpeg','image/png','image/webp','image/gif'])
on conflict (id) do update set public = true, file_size_limit = 5242880, allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists "larmah_media_public_read" on storage.objects;
create policy "larmah_media_public_read" on storage.objects for select using (bucket_id = 'larmah-media');
drop policy if exists "larmah_media_admin_insert" on storage.objects;
create policy "larmah_media_admin_insert" on storage.objects for insert with check (bucket_id = 'larmah-media' and public.current_user_is_admin());
drop policy if exists "larmah_media_admin_update" on storage.objects;
create policy "larmah_media_admin_update" on storage.objects for update using (bucket_id = 'larmah-media' and public.current_user_is_admin()) with check (bucket_id = 'larmah-media' and public.current_user_is_admin());
drop policy if exists "larmah_media_admin_delete" on storage.objects;
create policy "larmah_media_admin_delete" on storage.objects for delete using (bucket_id = 'larmah-media' and public.current_user_is_admin());

-- =========================================================
-- Indexes
-- =========================================================
create index if not exists idx_catalog_items_category_sort on public.catalog_items (category, featured desc, sort_order, created_at desc);
create index if not exists idx_requests_user_created on public.requests (user_id, created_at desc);
create index if not exists idx_requests_category_created on public.requests (category, created_at desc);
create index if not exists idx_insights_pinned_created on public.insights_posts (pinned desc, created_at desc);


-- Ensure the approved admin email is promoted when the Auth user already exists.
insert into public.profiles (id, email, role)
select id, email, 'admin'
from auth.users
where lower(email) = lower(public.admin_email())
on conflict (id) do update
set email = excluded.email,
    role = 'admin',
    updated_at = now();


-- =========================================================
-- Catalogue editability and duplicate-safe featured records
-- =========================================================
with ranked_catalogue as (
  select id,
         row_number() over (partition by lower(coalesce(category,'')), lower(coalesce(title,'')) order by created_at asc, id asc) as rn
  from public.catalog_items
  where title is not null and category is not null
)
delete from public.catalog_items c
using ranked_catalogue r
where c.id = r.id and r.rn > 1;

alter table public.catalog_items drop constraint if exists catalog_items_category_title_unique;
alter table public.catalog_items add constraint catalog_items_category_title_unique unique (category, title);

-- =========================================================
-- Seed catalogue previews and blog content
-- =========================================================
insert into public.catalog_items (category, title, description, tags, featured, sort_order, active)
values
('shipping','Import & Export Coordination','Trade documentation and freight coordination for importers and exporters.', array['freight','trade'], true, 10, true),
('real-estate','Land Acquisition Support','Structured guidance for title checks, surveys and acquisition coordination.', array['land','documentation'], true, 20, true),
('fintech','Merchant Payment Setup','Digital payment readiness support for SMEs and trade-focused businesses.', array['payments','sme'], true, 30, true),
('logistics','Corporate Delivery Coordination','Structured local and interstate movement support for businesses.', array['delivery','movement'], true, 40, true),
('real-estate','Verified Property Sourcing','Curated property options with inspection and documentation guidance.', array['property','inspection'], true, 50, true),
('premium','Priority Enterprise Desk','A private support lane for serious enquiries across all four pillars.', array['priority','enterprise'], true, 60, true)
on conflict (category, title) do update
set description = excluded.description,
    tags = excluded.tags,
    featured = excluded.featured,
    sort_order = excluded.sort_order,
    active = excluded.active,
    updated_at = now();

insert into public.insights_posts (title, excerpt, body, category, read_time, pinned)
values
('Building a mature enterprise brand across four serious pillars','A practical note on positioning property, fintech, logistics and shipping under one coordinated enterprise desk.','Hey Larmah Enterprise Limited is positioned around property, fintech support, logistics coordination and shipping facilitation. A mature enterprise brand needs clarity, documentation and consistent follow-through.', 'Enterprise', '5 min read', true)
on conflict do nothing;

-- Important: create the admin user in Supabase Auth using:
-- Email: heylarmahtech@outlook.com
-- Password: set the assigned admin password in Supabase Auth, not in public frontend code.
-- The trigger above automatically marks this email as admin when the Auth user exists.


-- =========================================================
-- Professional admin media/user-management upgrade
-- Enables catalogue photos/videos, blog media, user verification and profile editing.
-- =========================================================

alter table public.profiles add column if not exists phone text;
alter table public.profiles add column if not exists company text;
alter table public.profiles add column if not exists account_status text not null default 'pending';
alter table public.profiles add column if not exists is_verified boolean not null default false;
alter table public.profiles add column if not exists verified_at timestamptz;
alter table public.profiles add column if not exists verified_by uuid references auth.users(id) on delete set null;
alter table public.profiles add column if not exists last_admin_note text;
alter table public.profiles drop constraint if exists profiles_account_status_check;
alter table public.profiles add constraint profiles_account_status_check check (account_status in ('pending','verified','suspended'));

drop policy if exists profiles_admin_all on public.profiles;
create policy profiles_admin_all on public.profiles for all using (public.current_user_is_admin()) with check (public.current_user_is_admin());

-- Profile edits are admin-only in this public website package.
drop policy if exists profiles_update_own_basic on public.profiles;

alter table public.catalog_items add column if not exists media_url text;
alter table public.catalog_items add column if not exists media_type text not null default 'image';
alter table public.catalog_items add column if not exists video_url text;
alter table public.catalog_items add column if not exists gallery jsonb not null default '[]'::jsonb;
alter table public.catalog_items drop constraint if exists catalog_items_media_type_check;
alter table public.catalog_items add constraint catalog_items_media_type_check check (media_type in ('image','video','external'));

alter table public.insights_posts add column if not exists slug text;
alter table public.insights_posts add column if not exists author text not null default 'Hey Larmah Editorial Desk';
alter table public.insights_posts add column if not exists tags text[] not null default '{}'::text[];
alter table public.insights_posts add column if not exists media_url text;
alter table public.insights_posts add column if not exists media_type text not null default 'image';
alter table public.insights_posts add column if not exists video_url text;
alter table public.insights_posts add column if not exists gallery jsonb not null default '[]'::jsonb;
alter table public.insights_posts add column if not exists published_at timestamptz;
alter table public.insights_posts drop constraint if exists insights_posts_media_type_check;
alter table public.insights_posts add constraint insights_posts_media_type_check check (media_type in ('image','video','external'));

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'larmah-media',
  'larmah-media',
  true,
  104857600,
  array['image/jpeg','image/png','image/webp','image/gif','image/avif','video/mp4','video/webm','video/quicktime','video/mpeg']
)
on conflict (id) do update
set public = true,
    file_size_limit = 104857600,
    allowed_mime_types = excluded.allowed_mime_types;

create index if not exists idx_profiles_status_role on public.profiles (account_status, role, created_at desc);
create index if not exists idx_catalog_items_media_type on public.catalog_items (media_type, created_at desc);
create index if not exists idx_insights_slug on public.insights_posts (slug);
with ranked_insight_slugs as (
  select id,
         row_number() over (partition by lower(slug) order by pinned desc, active desc, created_at desc, id asc) as rn
  from public.insights_posts
  where slug is not null and trim(slug) <> ''
)
delete from public.insights_posts p
using ranked_insight_slugs r
where p.id = r.id and r.rn > 1;
alter table public.insights_posts drop constraint if exists insights_posts_slug_unique;
alter table public.insights_posts add constraint insights_posts_slug_unique unique (slug);

update public.profiles
set role = 'admin', account_status = 'verified', is_verified = true, verified_at = coalesce(verified_at, now()), updated_at = now()
where lower(email) = lower(public.admin_email());


-- =========================================================
-- Starter catalogue editorial control upgrade
-- Keeps the six requested core records editable from the admin dashboard and prevents repeated setup runs from duplicating them.
-- =========================================================
with ranked as (
  select id,
         row_number() over (partition by lower(category), lower(title) order by active desc, featured desc, sort_order asc, created_at asc, id asc) as rn
  from public.catalog_items
  where (lower(category), lower(title)) in (
    ('shipping','import & export coordination'),
    ('real-estate','land acquisition support'),
    ('fintech','merchant payment setup'),
    ('logistics','corporate delivery coordination'),
    ('real-estate','verified property sourcing'),
    ('premium','priority enterprise desk')
  )
)
delete from public.catalog_items c
using ranked r
where c.id = r.id and r.rn > 1;

insert into public.catalog_items (category, title, description, tags, featured, active, sort_order, updated_at)
select v.category, v.title, v.description, v.tags, v.featured, v.active, v.sort_order, now()
from (values
  ('shipping','Import & Export Coordination','Trade documentation and freight coordination for importers and exporters.', array['freight','trade']::text[], true, true, 40),
  ('real-estate','Land Acquisition Support','Structured guidance for title checks, surveys and acquisition coordination.', array['land','documentation']::text[], true, true, 12),
  ('fintech','Merchant Payment Setup','Digital payment readiness support for SMEs and trade-focused businesses.', array['payments','sme']::text[], true, true, 20),
  ('logistics','Corporate Delivery Coordination','Structured local and interstate movement support for businesses.', array['delivery','movement']::text[], true, true, 30),
  ('real-estate','Verified Property Sourcing','Curated property options with inspection and documentation guidance.', array['property','inspection']::text[], true, true, 10),
  ('premium','Priority Enterprise Desk','A private support lane for serious enquiries across all four pillars.', array['priority','enterprise']::text[], true, true, 50)
) as v(category,title,description,tags,featured,active,sort_order)
where not exists (
  select 1 from public.catalog_items c
  where lower(c.category) = lower(v.category) and lower(c.title) = lower(v.title)
);


-- SEO content seed: static service catalogue names and indexable blog guide slugs.
-- These records support the admin dashboard and public catalogue. Static HTML pages remain the primary SEO surface.
alter table public.catalog_items add column if not exists slug text;
alter table public.catalog_items add column if not exists seo_title text;
alter table public.catalog_items add column if not exists meta_description text;
create index if not exists idx_catalog_items_slug on public.catalog_items (slug);

insert into public.catalog_items (category, title, slug, description, tags, featured, active, sort_order, updated_at) values
('real-estate', 'Land Acquisition Support in Lagos', 'real-estate/land-acquisition-support-lagos', 'Structured land acquisition support in Lagos for buyers and investors who need title checks, survey review, inspection coordination and documented next steps.', ARRAY['seo','service','real-estate'], true, true, 1, now()),
('real-estate', 'Verified Property Sourcing in Nigeria', 'real-estate/verified-property-sourcing-nigeria', 'Verified property sourcing support for clients who want curated property options, inspection discipline, document checks and safer property decision flow in Nigeria.', ARRAY['seo','service','real-estate'], true, true, 2, now()),
('real-estate', 'Property Investment Support in Lagos', 'real-estate/property-investment-support-lagos', 'Property investment support in Lagos for buyers and investors who need location logic, documentation checks, exit planning and structured opportunity review.', ARRAY['seo','service','real-estate'], true, true, 3, now()),
('fintech', 'Merchant Payment Setup in Nigeria', 'fintech/merchant-payment-setup-nigeria', 'Merchant payment setup support for SMEs that need cleaner payment channels, settlement readiness, business records and digital transaction preparation in Nigeria.', ARRAY['seo','service','fintech'], true, true, 4, now()),
('fintech', 'Business Payment Support for SMEs in Nigeria', 'fintech/business-payment-support-smes-nigeria', 'Business payment support for Nigerian SMEs that need payment readiness, reconciliation structure, customer payment clarity and operational documentation.', ARRAY['seo','service','fintech'], true, true, 5, now()),
('fintech', 'Enterprise Transaction Support in Nigeria', 'fintech/enterprise-transaction-support-nigeria', 'Enterprise transaction support for companies that need better transaction documentation, settlement clarity and business payment coordination in Nigeria.', ARRAY['seo','service','fintech'], true, true, 6, now())
on conflict (category, title) do update set slug = excluded.slug, description = excluded.description, featured = excluded.featured, active = true, updated_at = now();

insert into public.insights_posts (title, slug, excerpt, body, category, read_time, author, tags, pinned, active, published_at, updated_at) values
('How to Verify Land Before Buying in Lagos', 'how-to-verify-land-before-buying-in-lagos', 'A practical Lagos land verification checklist covering seller identity, title documents, survey plan, physical inspection, neighbourhood context and safer decision steps.', 'Buying land in Lagos can create long-term value, but the decision should never be rushed. The safest first step is to treat every opportunity as a file that must be verified, inspected and documented before money moves.

Start with the seller and ownership story
Ask who is selling, why the land is available, what documents support the claim and whether any family, community or third-party interest is involved. A clear ownership story does not replace verification, but it helps you know what must be checked.

Review title documents and survey details
Request available documents early. Survey details, title status and location description should be checked for consistency. Names, coordinates, plot size and boundaries should not be assumed.

Inspect the physical site
Physical inspection helps confirm access roads, neighbourhood development, encroachment risk, drainage concerns and whether the land description matches what was presented.

Document questions before commitment
Keep a written list of questions, observations and unresolved issues. A professional decision is easier when every risk point is visible before negotiation moves forward.', 'Real Estate', '7 min read', 'Hey Larmah Editorial Desk', ARRAY['seo','guide'], true, true, now(), now()),
('Import and Export Documentation Checklist in Nigeria', 'import-export-documentation-checklist-nigeria', 'A practical checklist for Nigerian importers and exporters preparing cargo details, invoices, packing lists, consignee information and shipment instructions.', 'Import and export movement becomes smoother when the documentation brief is organised before freight conversations begin. A good brief helps partners quote properly, ask better questions and avoid preventable delays.

Confirm cargo identity
Write down the cargo description, quantity, weight, dimensions, packaging type, sensitivity and estimated value. Freight support becomes difficult when cargo information is vague.

Prepare commercial records
Invoices, packing lists and consignee details should be reviewed for consistency. Names, addresses and quantities must align across the paperwork.

Define route and timeline
Origin, destination, preferred movement window and receiving contact should be clear. This helps coordinators understand urgency and possible route options.

Keep proof and communication records
Every update, quote, handover and document request should be traceable. Clear records reduce confusion between client, sender, receiver and freight contacts.', 'Shipping', '6 min read', 'Hey Larmah Editorial Desk', ARRAY['seo','guide'], false, true, now(), now()),
('Merchant Payment Setup for Nigerian SMEs', 'merchant-payment-systems-nigeria-smes', 'How Nigerian SMEs can prepare business records, payment channels, settlement details and customer confirmation flow before setting up merchant payments.', 'A growing SME needs more than a bank account. It needs a clear payment flow customers can trust, records that can be reviewed and settlement details that reduce confusion.

Map how customers pay today
List every current channel: transfers, cash, card, wallet, checkout links or invoices. Identify where customers get confused and where confirmation delays happen.

Prepare business and settlement details
Payment partners usually need business information, contact details, settlement account information and a clear description of what the business sells.

Define receipt and confirmation flow
Customers should know when payment is confirmed, who confirms it and what proof they receive. This is especially important for delivery and trade-focused businesses.

Review transaction records regularly
Payment readiness is not only setup. Businesses should check settlement patterns, failed payments, disputed confirmations and gaps in customer communication.', 'Fintech', '5 min read', 'Hey Larmah Editorial Desk', ARRAY['seo','guide'], false, true, now(), now()),
('Corporate Delivery Planning for Lagos Businesses', 'corporate-delivery-planning-lagos-businesses', 'A logistics planning guide for Lagos businesses covering pickup details, delivery windows, receiver confirmation, route risks and proof-of-delivery expectations.', 'Many delivery issues begin before dispatch. Lagos businesses can reduce confusion by creating a simple but disciplined movement brief for every important delivery.

Confirm pickup and receiver details
A complete delivery brief should include pickup address, contact person, receiver name, receiver phone number and any access instructions.

Set delivery windows
Delivery windows help manage expectations. They also reduce missed deliveries when the receiving party is not available.

Identify cargo sensitivity
Fragile, urgent, high-value or temperature-sensitive items need special notes before movement begins.

Close with proof
Proof-of-delivery may be a photo, signed note, receiver confirmation or timestamped update. Businesses should decide what proof is needed before dispatch.', 'Logistics', '5 min read', 'Hey Larmah Editorial Desk', ARRAY['seo','guide'], false, true, now(), now()),
('What Investors Should Know Before Acquiring Property in Nigeria', 'property-investment-nigeria-due-diligence', 'A practical property investment due diligence guide for Nigeria covering objective, location logic, document review, inspection and exit planning.', 'Property investment should begin with purpose. A buyer looking for rental income may judge an opportunity differently from a buyer seeking long-term appreciation or quick resale.

Define the investment objective
Clarify whether the property is for income, appreciation, business use, resale or personal occupation. The objective determines what risks matter most.

Test the location logic
Look at access, surrounding development, infrastructure, demand drivers and practical use. A property is not attractive simply because it is available.

Review documents and inspection notes together
Documents should be compared with the physical site and seller claims. Any inconsistency should be resolved before commitment.

Think about exit before entry
Investors should consider who the future buyer, tenant or user could be. Exit thinking helps avoid emotional purchases.', 'Real Estate', '7 min read', 'Hey Larmah Editorial Desk', ARRAY['seo','guide'], false, true, now(), now())
on conflict (slug) do update set title = excluded.title, excerpt = excluded.excerpt, body = excluded.body, active = true, updated_at = now();
