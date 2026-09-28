# AdPulse — Meta Ads Dashboard

A modern, customizable analytics dashboard for **Meta (Facebook & Instagram) Ads**. Connect your ad account and see
spend, CPC, CPM, CTR, CPA, ROAS, AOV, funnel and video metrics in one clear view. It works on phones, tablets and desktops.

![Stack](https://img.shields.io/badge/React-19-61dafb) ![Vite](https://img.shields.io/badge/Vite-8-646cff) ![TypeScript](https://img.shields.io/badge/TypeScript-strict-3178c6)

## Features

- **Connect three ways:** paste an access token, use *Continue with Facebook* (Facebook Login), or explore with **demo data**. You don't need an account to try it.
- **30+ metrics:** Amount spent, impressions, reach, frequency, clicks, link clicks, CTR, link CTR, CPC (all and link), CPM, landing page views, conversions, **CPA**, conversion rate, conversion value, **ROAS**, AOV, purchases, adds to cart, checkouts, leads, cost per result, 3-second views, hook rate, ThruPlays and more.
- **Pick your conversion event:** purchases, leads, registrations, adds to cart, app installs, messaging, or any custom action type. CPA, ROAS and conversion rate update everywhere.
- **Customizable dashboards:**
  - **Customize** mode: drag widgets to reorder them (mouse, touch or keyboard). Change each widget's metric, chart type, grouping and width.
  - Six widget types: KPI cards (with change vs. previous period and a sparkline), trend charts (line, area or columns; daily, weekly or monthly; previous-period overlay), top performers, audience and placement breakdowns (age, gender, platform, placement, device, country, region), conversion funnel, and a sortable, searchable performance table with the columns you choose. At ad level the table shows each
    ad's creative thumbnail; click it for a larger preview with the ad's numbers.
  - Multiple dashboards (tabs), each started from a template or blank.
  - Layouts save in your browser automatically. You can export them to JSON and import them on another device.
- **Filters:** date presets or a custom range, previous-period comparison, a multi-campaign filter, an ad account
  switcher, and an **All ads / Active ads** toggle. "Active ads" counts only ads that are delivering right now (the ad,
  its ad set and its campaign are all on). It's applied in the Meta API request, so every KPI, chart, table and PDF
  reflects it.
- **Visual PDF reports:** download the dashboard as a polished A4 PDF (landscape or portrait). It has a header with the
  account, date range, comparison period and conversion event, followed by your KPI cards, charts and tables, laid out
  the way you arranged them. Rows never split across pages. Any single widget can also be downloaded as a PDF or PNG.
  PDFs always use the light theme, so they print cleanly.
- **Light and dark mode**, accessible charts with colorblind-checked colors, and a "view as table" option on every chart.

## Quick start

```bash
npm install
npm run dev        # http://localhost:5173
```

Click **Explore with demo data** to try it right away.

```bash
npm run build      # production build in dist/
npm run preview    # serve the build locally
npm test           # unit tests (vitest)
npm run lint && npm run typecheck
```

## Connecting your Meta ad account

The dashboard only reads data, and it runs entirely in your browser. Your token is sent **only** to
`graph.facebook.com`. There is no backend. You choose whether the token is remembered on this device or only kept for
the current tab.

### Option A: access token (simplest)

- **Quick test (expires in about 1–2 hours):** open the [Graph API Explorer](https://developers.facebook.com/tools/explorer/),
  select your app, add the `ads_read` permission, then click *Generate Access Token* and paste the token into AdPulse.
- **Long-lived (recommended):** in *Business Settings → Users → System users*, create a system user and assign your ad
  account(s) to it (at least *View performance*). Then generate a token for your app with `ads_read`.

### Option B: Facebook Login

1. Create an app at [developers.facebook.com](https://developers.facebook.com/) and add the **Facebook Login** product.
2. Add your dashboard's domain to *App Domains* and *Valid OAuth Redirect URIs*. Facebook Login requires **HTTPS**
   (`localhost` works for development).
3. Put the App ID in `.env` (see `.env.example`) or type it on the connect screen:

```bash
cp .env.example .env
# VITE_META_APP_ID=1234567890
```

Anyone other than the app's admins, developers and testers needs your app to have *Advanced Access* to `ads_read`
(this requires Meta App Review).

## Deploying

This is a static site. Run `npm run build` and host the `dist/` folder anywhere: Vercel, Netlify, Cloudflare Pages,
GitHub Pages or S3. Asset paths are relative, so it also works from a sub-path.

### On your own VPS (Ubuntu / Debian + Nginx)

`deploy/deploy.sh` builds the app and publishes it behind Nginx. Point your domain's DNS **A record** at the server,
then run the following on the VPS as a user with `sudo` (or as root):

```bash
git clone https://github.com/tejassparky2/Ads-dashboard.git
cd Ads-dashboard
cp .env.example .env          # optional: set VITE_META_APP_ID for Facebook Login

# First time: installs Node 22, Nginx and Certbot, configures the site and turns on HTTPS
./deploy/deploy.sh --setup --domain ads.example.com --email you@example.com
```

To update later, pull the latest code, rebuild and go live:

```bash
./deploy/deploy.sh
```

If a deploy goes wrong, switch back to the previous version:

```bash
./deploy/deploy.sh --rollback
```

How it works:

- Each deploy is copied to `/var/www/adpulse/releases/<timestamp>`. Nginx serves `/var/www/adpulse/current`, a symlink
  that is swapped in one atomic step, so visitors never see a half-updated site. The last 5 releases are kept for
  rollback.
- The Nginx site ([`deploy/nginx.conf`](deploy/nginx.conf)) caches hashed assets for a year, always revalidates
  `index.html`, enables gzip, adds basic security headers and blocks dotfiles such as `.env`.
- Certbot adds HTTPS, redirects HTTP to HTTPS and renews the certificate automatically. Without `--email`, the site is
  set up on plain HTTP; you can enable HTTPS later with `sudo certbot --nginx -d ads.example.com`.
- Other options: `--web-root DIR` (default `/var/www/adpulse`) and `--no-pull` (build the code as it is).
  Run `./deploy/deploy.sh --help` for details.
- `VITE_*` values from `.env` are built into the site, so re-run the script after changing them.

**Keep it private (optional):** your ad data only loads with a valid Meta token, but anyone can open the page. To add
a password, run `sudo apt-get install -y apache2-utils && sudo htpasswd -c /etc/nginx/.htpasswd yourname`. Then
uncomment the two `auth_basic` lines in `/etc/nginx/sites-available/adpulse` and run `sudo systemctl reload nginx`.

## How the numbers are calculated

- Data comes from the Marketing API `/{ad-account}/insights` endpoint (Graph API `v23.0` by default; you can change it
  under *Advanced* on the connect screen or with `VITE_META_API_VERSION`).
- Ratios such as CPC, CPA, CTR and ROAS are calculated from summed base values (spend, clicks, conversions and so on), so
  totals and weekly or monthly groupings are mathematically correct rather than averages of averages.
- Meta reports some conversions under several overlapping action types (for example `omni_purchase`, `purchase` and
  `offsite_conversion.fb_pixel_purchase`). AdPulse counts the first one that is present, so conversions are never
  double counted.
- Reach isn't additive across days. KPI totals therefore use Meta's own de-duplicated total for the period.

## Project structure

```
src/
  lib/
    meta/        Graph API client, response parsing, Facebook SDK loader
    metrics.ts   metric catalog: formulas, formats, which direction is "good"
    events.ts    conversion event aliases
    demo.ts      deterministic demo data shaped like real API responses
    pdf.ts       visual PDF report (widget snapshots laid out on A4 pages)
    export.ts    PNG snapshots and layout backup files
  store/         zustand stores: auth, settings, dashboards and widgets (saved in localStorage)
  hooks/         react-query data hooks, theme hooks
  components/
    widgets/     KPI, trend, top performers, breakdown, funnel, table
    dashboard/   grid, drag and drop, widget frame, configuration dialogs
    layout/      header, filters, export menu, settings
```

Built with React 19, TypeScript, Vite, Tailwind CSS v4, Recharts, TanStack Query, Zustand, dnd-kit, jsPDF and
html-to-image.
