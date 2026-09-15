# GhostCrew — website

Marketing site + waitlist for [GhostCrew](https://ghostcrewrobotics.com): the autonomous
robot that drags and chalks baseball & softball fields.

One static page, no build step on deploy. `index.html` + `styles.css` is the whole site.

## Stack

- **Site**: `index.html` (markup + inline vanilla JS for the hero reel controls, ROI calculator,
  and waitlist form), `styles.css` (compiled Tailwind v4, committed), `logo.png`
- **Styles**: Tailwind source + brand tokens live in [`tools/tailwind/input.css`](tools/tailwind/input.css).
  After changing classes in `index.html`, rebuild and commit `styles.css`:
  `cd tools/tailwind && npm install && npm run build` (or `npm run watch` while editing)
- **Hero reel**: `media/ghostcrew-sim-reel.mp4` (exported from CapCut; H.264, ~12s loop). To swap it,
  replace that file. If it fails to load, the hero falls back to an animated SVG simulation.
- **Font**: Inter via Google Fonts, with a system-font fallback
- **Hosting**: Vercel — auto-deploys `main` on every push (project connected in the Vercel dashboard)
- **Domain**: `ghostcrewrobotics.com`, registered at Vercel; DNS managed in Vercel → Domains
- **Waitlist backend**: Google Apps Script web app that appends each signup to a private
  Google Sheet and emails both founders. Source in [`google-sheets-backend.gs`](google-sheets-backend.gs);
  it runs deployed inside the Google Sheet (Extensions → Apps Script), not from this repo.
- **Email**: Zoho Mail (free plan) — `riya@` / `jasmine@ghostcrewrobotics.com`; MX/SPF/DKIM/DMARC
  records live in Vercel DNS

## Editing

Serve the folder locally (asset paths are root-relative), e.g. `npx http-server . -p 5173`,
then open http://localhost:5173. Push to `main` to deploy.

Brand tokens (colors extracted from the pitch deck), copy inventory, and the form contract
are documented in [`design/BRIEF.md`](design/BRIEF.md). The short version:
background `#040C08`, brand green `#10D975`, dark-green rules `#0A5C25`, body gray `#E7E6E6`.

## Waitlist backend notes

- Submissions land in the "GhostCrew Waitlist" Google Sheet (Waitlist tab), one row per signup,
  plus a notification email to both founders (`NOTIFY_EMAIL` in the script).
- **Changing the script** (e.g. notification recipients): edit it in the Sheet's Apps Script
  editor, then **Deploy → Manage deployments → ✏️ → Version: New version → Deploy**.
  Edits do nothing until a new version is deployed. The URL never changes.
- The form posts via `fetch(..., {mode: 'no-cors'})` — Apps Script doesn't serve readable
  CORS responses, so the site treats a delivered request as success.
- Spam protection: hidden `_gotcha` honeypot field; the script pretends success but saves
  nothing when it's filled.

## Contacts

- Riya Sharda (hardware) — riya@ghostcrewrobotics.com
- Jasmine Chao (software) — jasmine@ghostcrewrobotics.com
