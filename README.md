# Two River Communications Website

Production-ready static single-page website for Two River Communications, LLC. The site uses semantic HTML, modern CSS, minimal vanilla JavaScript, and an optional Cloudflare Pages Function for the contact form.

## Project Structure

```text
/
├── index.html
├── privacy-policy.html
├── wrangler.jsonc
├── .assetsignore
├── css/
│   └── styles.css
├── js/
│   └── main.js
├── _worker.js
├── assets/
│   └── two-river-communications-logo.png
├── functions/
│   └── api/
│       └── contact.js
├── README.md
├── robots.txt
└── sitemap.xml
```

## Local Preview

Open `index.html` directly in a browser for a quick static preview.

For a closer Cloudflare Pages style preview, run:

```bash
python3 -m http.server 4173
```

Then open `http://localhost:4173`.

The contact form endpoint requires Cloudflare Pages Functions or a compatible local functions runtime. Without backend configuration, the form displays an error message instead of reporting a false success.

## Cloudflare Pages Deployment

1. Push this repository to GitHub.
2. In Cloudflare Pages, create a project from the GitHub repository.
3. Use no build command.
4. Set the output directory to `/`.
5. Add the Microsoft Graph environment variables listed below.
6. Add the Turnstile environment variable listed below.
7. Deploy.

Cloudflare Pages should detect `functions/api/contact.js` and expose it at `/api/contact`.

This repo also includes `_worker.js` as the Cloudflare Worker route. It handles `POST /api/contact` directly and passes all other requests through to static assets with `env.ASSETS.fetch(request)`. The `wrangler.jsonc` file points Cloudflare to `_worker.js`, and `.assetsignore` prevents server-side files from being uploaded as public static assets.

## GitHub Deployment

This repo can be published as a normal static website repository. For GitHub Pages only, the contact form function will not run unless it is replaced with another backend. For Cloudflare Pages, keep the current structure.

## Editable Business Details

Update the clearly marked `BUSINESS_CONFIG` object in `js/main.js`:

- `phone`
- `email`
- `domain`
- `serviceArea`
- `businessHours`
- `streetAddress`, only when an address should be displayed

When `phone` is still `[PHONE NUMBER]`, the final call button is hidden automatically. Footer phone and email links only appear when configured.

## Logo Updates

The current logo file is `assets/two-river-communications-logo.png`.

To replace it, use the same filename or update the image paths in `index.html`. Preserve the original aspect ratio and do not recolor, crop, stretch, or recreate the logo.

## Contact Form Configuration

The optional Cloudflare Pages Function sends mail through Microsoft Graph and verifies Cloudflare Turnstile tokens before sending. Configure these environment variables in Cloudflare Pages:

- `MS_TENANT_ID`
- `MS_CLIENT_ID`
- `MS_CLIENT_SECRET`
- `MS_FROM_EMAIL`
- `CONTACT_TO_EMAIL`
- `TURNSTILE_SECRET`

The browser never receives the Microsoft client secret or the Turnstile secret. If any required variable is missing, `/api/contact` returns `503` and the form tells the visitor the form is not configured.

Microsoft Graph notes:

- `MS_FROM_EMAIL` should be the shared mailbox address used to send contact form emails.
- `CONTACT_TO_EMAIL` is where form submissions are delivered. Use a comma-separated list for multiple recipients.
- The Entra app must have Microsoft Graph `Mail.Send` application permission and admin consent.
- Restrict the app to the shared mailbox in Exchange Online so it cannot send as every mailbox in the tenant.

Turnstile is already embedded with the public site key in `js/main.js` and `index.html`. To finish the backend protection:

1. Add the existing widget secret key as `TURNSTILE_SECRET` in Cloudflare Pages environment variables.
2. Redeploy the site.

`/api/contact` requires a valid Turnstile token before sending email. Keep the existing honeypot field as a low-cost first filter.

For additional protection, add a Cloudflare WAF rate limiting rule for `POST /api/contact` so repeated submissions from the same client are challenged or blocked before they reach the Pages Function.

## SEO Checks

Before launch, confirm these values are still correct:

- Canonical URL in `index.html`
- Open Graph URL and image URL in `index.html`
- Twitter image URL in `index.html`
- `Sitemap` URL in `robots.txt`
- URL in `sitemap.xml`

Only add structured-data fields when the information is real and approved. Do not add reviews, ratings, hours, coordinates, prices, or other unsupported claims.

## Launch Placeholders

Replace every placeholder before launch:

- `[PHONE NUMBER]`
- `[EMAIL ADDRESS]`
- Business hours, if they should be shown
- Street address, only if it should be public

## Prelaunch Checks

- Confirm all navigation links scroll to the correct section.
- Confirm the logo displays undistorted.
- Confirm no unsupported claims or unapproved contact details have been added.
- Confirm the contact form reports success only after `/api/contact` returns `success: true`.
- Test responsive layouts at 360px, 390px, 768px, 1024px, and 1440px.
