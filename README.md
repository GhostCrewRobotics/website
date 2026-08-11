# GhostCrew — website

Marketing site + waitlist for [GhostCrew](https://ghostcrewrobotics.com): the autonomous
robot that drags and chalks baseball & softball fields.

One static page, zero dependencies, zero build step. `index.html` is the whole site.

## Stack

- **Site**: a single self-contained `index.html` (all CSS/JS inline) + `logo.png`
- **Hosting**: Vercel — auto-deploys `main` on every push (project connected in the Vercel dashboard)
- **Domain**: `ghostcrewrobotics.com`, registered at Vercel; DNS managed in Vercel → Domains
- **Waitlist backend**: Google Apps Script web app that appends each signup to a private
  Google Sheet and emails both founders. Source in [`google-sheets-backend.gs`](google-sheets-backend.gs);
  it runs deployed inside the Google Sheet (Extensions → Apps Script), not from this repo.
- **Email**: Zoho Mail (free plan) — `riya@` / `jasmine@ghostcrewrobotics.com`; MX/SPF/DKIM/DMARC
  records live in Vercel DNS

## Editing

Open `index.html` in a browser to preview locally. Push to `main` to deploy.

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
