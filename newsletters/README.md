# GhostCrew newsletters

Reusable email designs live in [`templates/`](templates/). Copies of newsletters that
have actually been sent belong in [`sent/`](sent/). Saving or deploying these files
does not create a MailerLite campaign, import contacts, or send email.

## Current template

[`templates/ghostcrew-update.html`](templates/ghostcrew-update.html) is the dark and
green GhostCrew update email. Its current copy is an introductory issue, still a draft.

- **Subject:** GhostCrew Update 001 — From the workshop to the field
- **Preheader:** A first look at what we’re building, and what’s ahead for the crew.

Copy the full HTML into MailerLite's custom HTML editor. Set the subject separately.
For each issue, update the issue number, headline, preheader, spotlight, three update
sections, and primary action. Replace the company mailing-address placeholder before
sending, or use MailerLite's company-details footer. Keep the inline styles, table
layout, absolute image URLs, and MailerLite unsubscribe link.

### “View in browser” and test emails

The browser link uses `href="{$url}"`. MailerLite replaces that variable with the web
version of the specific campaign. The unsubscribe link uses `href="{$unsubscribe}"`.
Neither is a literal website URL. Opening the HTML directly does not resolve them.

MailerLite [documents these variables and notes that some do not work in test
emails](https://www.mailerlite.com/help/how-to-use-variables-in-mailerlite). A broken
browser link in a test email can therefore be a test limitation. Keep `{$url}` in the
template so future issues link to their own campaign, rather than to a changing template.

To view the draft in a browser without sending a campaign: in MailerLite, go to
**Campaigns → Drafts**, click the campaign's preview image, then **Share preview URL**.
MailerLite provides a preview URL and passcode. For sent campaigns, the web URL is in
**View report → View email**. See [MailerLite's sharing
instructions](https://www.mailerlite.com/help/how-to-share-your-newsletter-beyond-email).

If a browser link also fails in a real sent campaign, inspect its destination and the
HTML saved in MailerLite; the test limitation alone would not explain that.

## Keeping sent issues

After an issue has actually been sent:

1. Save the final HTML used in MailerLite as `sent/YYYY-MM-DD-short-title.html`, using
   the actual send date. Save a copy; keep the reusable template in `templates/`.
2. Add `sent/YYYY-MM-DD-short-title.md` using the metadata outline in the sent-folder
   README. Record the subject, preheader, send time and timezone, campaign ID, and
   public campaign web URL.
3. Commit both files. Preserve that snapshot; make future design changes in the template.

GitHub and this site's static deployment are public. Archive campaign content only;
keep subscriber exports, recipient-specific unsubscribe links, tracking URLs, API
tokens, and other private account data out of the repository. Keep MailerLite merge
tags in archived source HTML instead of saving a personalized email from an inbox.

The archive is manual. Committing an issue does not send it, and sending in MailerLite
does not automatically add a file here. Existing Google Sheet contacts remain
unimported, and signup syncing remains controlled separately by the Vercel settings.
