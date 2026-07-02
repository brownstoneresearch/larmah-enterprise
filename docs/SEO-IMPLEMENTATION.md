# Hey Larmah SEO Implementation

This package implements the strongest SEO architecture recommendation for Hey Larmah Enterprise Limited.

## Implemented

- Official entity foundation on the homepage: exact company name, RC: 9488632, Lagos service area and admin@heylarmah.xyz.
- Canonical domain updated to `https://heylarmah.xyz` across metadata, robots and sitemap.
- Public sitemap rebuilt with homepage, pillar pages, contact, service map, blog library, 14 focused service pages and 7 static blog guides.
- Private pages are set to `noindex,nofollow`: admin, dashboard, auth, register and reset password.
- Organization, LocalBusiness, WebSite, OfferCatalog, Service, FAQPage, BlogPosting, CollectionPage, ContactPage and BreadcrumbList structured data added.
- `llms.txt` added for AI search and answer engines.
- Cloudflare Pages `_headers` added for basic security, asset caching and noindex headers on private pages.
- Cloudflare Pages `_redirects` added for clean login/blog/services routes.
- Optimized WebP variants added for the logo and key public images.
- Homepage now links into dedicated service pages and practical blog guides.
- Pillar pages now link to focused service pages.
- Insights now surfaces static SEO article links in addition to admin-published dynamic posts.

## Next live steps

1. Deploy the full package to the production domain.
2. In Google Search Console, add the domain property and submit `https://heylarmah.xyz/sitemap.xml`.
3. In Bing Webmaster Tools, add the domain and submit the same sitemap.
4. Create/verify Google Business Profile and keep the same NAP: `Hey Larmah Enterprise Limited`, `RC: 9488632`, Lagos, Nigeria, `admin@heylarmah.xyz`.
5. Publish real project photos, catalogue media and client-safe case notes from the admin dashboard.
6. Keep adding static long-form blog pages for high-intent searches. Admin blog posts are useful for freshness, but static pages are stronger for indexing on this static site.

## Important note

If the production domain is not `https://heylarmah.xyz`, update canonical URLs, sitemap, robots, llms.txt, Open Graph URLs and the site URL in `.env.example` before deployment.
