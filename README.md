# GhostCrew — website

Marketing site + waitlist for [GhostCrew](https://ghostcrewrobotics.com): the autonomous
robot that drags and chalks baseball & softball fields.

One static page, plus a Vercel signup function. The page has no build step on deploy.

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
- **Waitlist backend**: [`api/waitlist.mjs`](api/waitlist.mjs) on Vercel (Node 24), backed by
  [`lib/waitlist.mjs`](lib/waitlist.mjs). Saves new submissions to Google Sheets and can
  add waitlist subscribers to MailerLite. Uses built-in Node APIs, with no runtime packages.
- **Newsletter**: Write and send campaigns manually in MailerLite. Subscriber syncing is
  paused by default. Deploying does not send email or process existing Sheet contacts.
- **Email**: Zoho Mail (free plan) — `riya@` / `jasmine@ghostcrewrobotics.com`; MX/SPF/DKIM/DMARC
  records live in Vercel DNS

## Editing

For a static preview, serve the folder locally (asset paths are root-relative), e.g.
`python3 -m http.server 5173`, then open http://localhost:5173. That static server does not
run `/api/waitlist`. Use a Vercel preview to verify the deployed function. Push to `main`
to deploy production only after configuration and review.

Run `npm test` with Node 24. All service requests are simulated, with temporary test keys
and fake email addresses. The tests do not read real credentials, contact APIs, import
subscribers, or send email.

Brand tokens (colors extracted from the pitch deck), copy inventory, and the form contract
are documented in [`design/BRIEF.md`](design/BRIEF.md). The short version:
background `#040C08`, brand green `#10D975`, dark-green rules `#0A5C25`, body gray `#E7E6E6`.

## Signup configuration

Configure these server-only environment variables in Vercel:

| Variable | Value |
| --- | --- |
| `GOOGLE_SERVICE_ACCOUNT_JSON` | Entire service-account JSON object, including the outer braces |
| `GOOGLE_SHEET_ID` | Spreadsheet URL segment between `/d/` and `/edit` |
| `GOOGLE_SHEET_NAME` | Optional; defaults to `Waitlist` |
| `MAILERLITE_API_TOKEN` | Private MailerLite API token |
| `MAILERLITE_GROUP_ID` | Numeric ID of GhostCrew Updates |
| `MAILERLITE_SYNC_ENABLED` | Defaults to false. Leave absent or set `false` until subscriber syncing is authorized. |

Enable the Sheets API in the service account's Google Cloud project, then share only the
signup spreadsheet with the service account as an Editor. Keep all credentials in Vercel,
not in HTML, Git, or chat. `.env.example` contains names only, with no credentials.

### Spreadsheet layout

The function uses the existing `Waitlist` tab. Columns A–F match the original Apps Script:
Timestamp, Name, Email, Facility / organization, Role, Number of fields. New submissions
also write G–K: Newsletter opt-in, Newsletter consent text, MailerLite status, Signup ID,
Sync updated at. The timestamp is UTC ISO 8601, and RAW writes keep submitted text literal.

The first request adds missing header labels. If existing columns have different labels,
the request fails rather than overwrite them. Review the layout before deployment. The
function never reads existing signup rows or imports them to MailerLite.

Joining the waitlist also subscribes the person to GhostCrew email updates, as explained
above the form. There is no separate newsletter checkbox. New signups record `yes` and
the displayed signup wording in columns G–H, with `queued` in column I while syncing is
paused. Existing rows retain their original consent values. Queued rows are retained for
later review; enabling syncing does **not** automatically import or send to them.

When syncing is explicitly enabled, only the new submission is sent to MailerLite. Existing
unsubscribed, bounced, junk, or unconfirmed subscribers are preserved. Subscriber errors
are recorded as `error` without losing the waitlist signup. If the final status write fails,
the row stays `queued`; check Vercel logs by Signup ID before attempting any manual retry.
There are no scheduled jobs or automatic batch retries.

### Rollout without sending email

1. Keep `MAILERLITE_SYNC_ENABLED` absent or `false`. Test with simulated services locally.
2. For a real preview test, configure Preview variables using a separate test Sheet and a
   founder-owned email. Production-only variables are not available in Preview deployments.
3. Verify the signup appears in the test Sheet and that a save failure keeps the form's
   error state and input. With syncing paused, no MailerLite requests are made.
4. Review the code and deploy the production configuration. Do not import existing contacts.
5. Before enabling future signup syncing, inspect MailerLite welcome automations, group
   triggers, and API double opt-in settings: adding a subscriber can trigger those emails.
   Only set `MAILERLITE_SYNC_ENABLED=true` and redeploy when that behavior is authorized.

No campaign-sending, welcome-email, bulk-import, or newsletter-scheduling code is included.
The old founder notification emails belonged to Apps Script; this endpoint does not send
them. MailerLite offers Account settings → Email notifications for new newsletter subscribers
once syncing is enabled. All waitlist signups remain visible in the Sheet.

The old [`google-sheets-backend.gs`](google-sheets-backend.gs) is retained as a rollback
reference. The form no longer calls it. The Vercel endpoint validates input, checks browser
origins, and preserves the `_gotcha` honeypot. For additional abuse controls, use the existing
Vercel firewall. The browser shows success only after a confirmed Sheet save.

## Contacts

- Riya Sharda (hardware) — riya@ghostcrewrobotics.com
- Jasmine Chao (software) — jasmine@ghostcrewrobotics.com
- Madison Heiman (co-founder) — madison@ghostcrewrobotics.com
