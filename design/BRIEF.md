# GhostCrew website — design & build brief

## What this is
A simple, minimalistic single-page marketing website for GhostCrew, a startup building an
autonomous robot that drags and chalks baseball & softball fields. The page has ONE
conversion goal: get visitors to join the waitlist (a form collecting their information).
The visual theme must match the pitch deck exactly (tokens below are extracted from the
deck PDF itself).

Source deck (for visual grounding, optional): `/home/jachao/personal/GhostCrew Pitch Deck.pdf`
— if you read it you MUST pass a page range, e.g. pages "1-6" (it is 11 pages).

## Brand tokens (exact, extracted from the deck's PDF drawing commands)
- Page background: `#040C08` (near-black with green cast)
- Subtle grid/rule lines on background: `#091209` (the deck has faint vertical grid lines in this color — a signature detail worth echoing subtly)
- Brand green (accent): `#10D975`
- Dark green (rules/dividers, e.g. under headings): `#0A5C25`
- Body text gray: `#E7E6E6`
- Headings: `#FFFFFF`
- Panels/cards in the deck: same bg or a hair lighter, 1px green borders, slightly rounded corners, sometimes a solid green top bar
- The deck's title slide has a thin solid green strip along the left page edge; content slides have a `GHOSTCREW` wordmark header with a 2px green rule under it

## Wordmark & logo
- Wordmark: "GHOST" in white + "CREW" in brand green, bold, tight tracking (deck uses an Arial-class grotesque, very heavy). Use the system font stack — external fonts are BLOCKED: `Arial, "Helvetica Neue", Helvetica, sans-serif`.
- Logo: white ghost with green swoosh perched on a home-plate outline. Use an `<img>` with `src="__LOGO_DATA_URI__"` (literal placeholder string — it will be substituted with a transparent-background PNG data URI at assembly time; aspect ratio 420×309, white artwork, works only on dark backgrounds). Give it explicit width/height or aspect-ratio to avoid layout shift. `alt="GhostCrew logo"`.

## Theme commitment
Single dark theme, deliberately (the brand is dark-only). No prefers-color-scheme media
queries needed — but paint EVERY color explicitly (body background, all text colors);
never rely on host/browser defaults.

## Content inventory (use real copy; select a tight subset — this is a minimal page, not the whole deck)
- Name: GHOSTCREW
- Tagline: "Autonomous robot that drags and chalks baseball & softball fields"
- Motto (deck slide 5): "The crew that works without being seen."
- Problem stats: field prep labor costs a single facility up to **$200K/year**; **25 min** to manually drag and chalk one field; **0** autonomous drag+chalk solutions exist at any price
- Solution stats: **95% cheaper** ($10,000 one-time), **50% faster** (entire field set up in under 12 min), **100% automated** (0 staff)
- How it works (condense to 3–4): Jetson Orin + depth camera, real-time visual field detection, no GPS · precision chalk system for baselines, foul lines, batter's boxes · folding drag arm that folds flat for transport and auto-lifts over the mound · phone app: select baseball or softball layout, schedule fields in advance (Field 1 at 6:00 AM, Field 2 at 6:20), start, walk away — the robot sends notifications
- Pricing (optional teaser): own outright $10,000 one-time · lease $2,500/yr · lease-to-own $2,500/yr × 5 · software $750/robot/yr (remote monitoring + live camera feed, multi-field scheduling, GameChanger/Tourney Machine integration)
- ROI line: pays for itself in under two tournament weekends
- Closing CTA (deck's closer): "GhostCrew is ready. Are you ready?"
- Status/credibility (optional, one line): built by two Carnegie Mellon engineers and former collegiate softball athletes; 25+ customer discovery calls across 15 states; working prototype
- Footer contacts: Riya Sharda — rsharda@andrew.cmu.edu · Jasmine Chao — jchao2@andrew.cmu.edu · © 2026 GhostCrew

## Waitlist form (the whole point of the page — make it prominent and frictionless)
Fields:
- Name (required, autocomplete="name")
- Email (required, type=email, autocomplete="email")
- Facility / organization (optional)
- Role (select: Facility director / Tournament director / Coach / Parks & recreation / Other)
- Number of fields (optional; select: 1–3 / 4–7 / 8+ or similar)

Markup & behavior (exactly this contract):
- `<form id="waitlist-form" action="https://formspree.io/f/YOUR_FORM_ID" method="POST">`
- Hidden honeypot: `<input type="text" name="_gotcha" style="display:none" tabindex="-1" autocomplete="off">`
- JS intercepts submit: HTML5 validation first; disable the button and show a "Joining…" state; if the action URL still contains `YOUR_FORM_ID`, simulate success after ~600ms (demo mode until the founders paste their real Formspree ID); otherwise `fetch(action, {method:'POST', body: new FormData(form), headers:{Accept:'application/json'}})`. On success replace the form with an on-brand confirmation (e.g. "You're on the list. We'll reach out before the robot does."); on failure show an inline error above the button that tells the user what to do (email rsharda@andrew.cmu.edu as fallback), keep their input intact, re-enable the button.
- Inputs: dark fields (`#071009`-ish bg, 1px `#0A5C25` border, `#FFFFFF` text, visible focus ring in `#10D975`), generous touch targets, labels always visible (no placeholder-only labels).

## Technical requirements (hard)
- ONE completely self-contained standalone HTML file: `<!doctype html>`, `<html lang="en">`, `<head>` with `<meta charset>`, `<meta name="viewport">`, `<title>GhostCrew — Autonomous field prep for baseball & softball</title>`, meta description, and `<link rel="icon" href="__LOGO_DATA_URI__">`. All CSS in one `<style>`, all JS in one `<script>`. ZERO external requests (no CDNs, fonts, images, analytics).
- Responsive from 360px to wide desktop. No horizontal page scroll ever.
- Semantic HTML (header/main/section/footer, one h1), labels tied to inputs, visible keyboard focus states, honest button copy ("Join the waitlist").
- `prefers-reduced-motion: reduce` disables/simplifies any animation.
- Smooth-scroll nav links to the waitlist section are fine (`scroll-behavior: smooth` guarded by reduced-motion).
- Keep it genuinely minimal: this is a pre-launch waitlist page, not the full deck. Roughly: hero → proof stats → how it works → waitlist → footer. Cut anything that doesn't move a visitor toward the form.

## Design craft (non-negotiable)
- Typography carries the page: set a deliberate type scale, heavy weights for display (the deck is very bold), `text-wrap: balance` on headings, body text ≤ ~65ch, uppercase labels with letter-spacing for eyebrows.
- Space with flex/grid + `gap`, not ad-hoc margins. `font-variant-numeric: tabular-nums` where digits align.
- The green is the ONE bold move; keep everything around it quiet. Use `#0A5C25` for structure (rules, borders) and `#10D975` sparingly for emphasis/CTA/wordmark.
- Stats should feel like the deck's stat cards: huge number, small label, thin green rule.
- Write real, specific copy in active voice; no lorem, no filler, no emoji section markers.
