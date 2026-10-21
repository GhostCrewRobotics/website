# How to send a GhostCrew newsletter

Use this guide whenever we have an update to share. It assumes you already have
access to our MailerLite account and this repository.

The flow is: **write → build the email → test → choose recipients → send → save a copy.**

MailerLite calls each newsletter a **campaign**. A **group** is a list of people
we can choose to send it to.

## Before you start

- Our design is in [`templates/ghostcrew-update.html`](templates/ghostcrew-update.html).
- Our newsletter group in MailerLite is **GhostCrew Updates**.
- Copies of newsletters we actually send go in [`sent/`](sent/).

**Current status (October 21, 2026):** existing Google Sheet contacts have not been imported, and
website-to-MailerLite signup syncing is paused. Being on the Sheet does not mean
someone is in MailerLite. Leave imports and syncing alone while preparing or testing
an issue. Before the first public send, coordinate with Jasmine to make sure our
intended audience is ready.

## 1. Write the update

Start with a copy of the HTML template. Open it in a code editor to change the words.
You can open it in a browser to see the design, but MailerLite's special links will
not work there.

Update:

- **Issue number:** change `UPDATE 001` to the next number.
- **Headline and introduction:** what is the main thing we are sharing?
- **Spotlight box:** our biggest update, photo, or milestone.
- **Three update sections:** what we built, what we learned, and what is next.
  Change their headings if different ones fit better.
- **Main button:** give readers one useful action, such as watching a demo or
  replying with feedback. Change both its wording and its link.
- **Mailing address:** replace `[Add your company mailing address]` with our chosen
  company mailing address, or use MailerLite's company-details footer.

Keep it short and specific. Only include progress and dates we can stand behind.
The current template has introductory copy; we should not repeat that every issue.

Leave these link values exactly as they are:

- `{$url}` — MailerLite fills in “View in browser.”
- `{$unsubscribe}` — MailerLite fills in the unsubscribe link.

## 2. Put it in MailerLite

1. Open **Campaigns → Create** and choose a **Regular campaign**.
2. Start from scratch and choose the **Custom HTML** editor.
3. Copy your entire edited HTML file, from `<!doctype html>` through `</html>`, into
   the editor. Replace any starter HTML already there.
4. Save / click **Done editing**.
5. Fill in the campaign details:
   - **Internal name:** something the team recognizes, like
     `GhostCrew Update 002 — Chalking progress`. Readers do not see this name.
   - **Subject:** the subject line readers see in their inbox.
   - **Sender name:** `GhostCrew`.
   - **Sender email:** our authenticated GhostCrew email address.
   - **Reply-to:** an inbox someone on the team checks.
   - **Preheader:** a short sentence that previews the update beside the subject.

The HTML has a hidden preview sentence near the top. Update that to match the
preheader you enter in MailerLite. Update the HTML `<title>` for this issue too;
changing that title alone does not set the email subject.

You can reuse a previous campaign's design instead of starting from scratch. Always
create a new campaign for each issue and check for old copy, links, and recipients.

## 3. Test it before sending to our audience

### Check how it looks

1. In the editor, choose **Preview and test → Send a test email**.
2. Send the test to your own address.
3. Open it on your phone and laptop. Check the text, spacing, images, and spelling.
4. Click the normal links and main button. Reply and check that the reply reaches
   the right inbox.
5. Fix anything wrong, save, and test again if needed.

Test emails have `[TEST]` in the subject. Some features do not work in these
previews: unsubscribe is one example, and some variables may not resolve. A broken
browser-view link in a preview does not tell us whether it works in a real campaign.

To share a browser preview with a teammate: open **Campaigns → Drafts**, click the
campaign preview image, then **Share preview URL**. Share the URL and passcode
privately with the team.

### First time, or after changing the template: check a real delivery

This extra check lets us try the MailerLite links before contacting our audience.

1. Make sure there are no active automations that would email someone when added
   to MailerLite or a group.
2. Create **GhostCrew Internal Test**, if that group does not exist yet.
3. Add only your own email address manually. Do not import the Google Sheet.
4. Duplicate the newsletter draft. Name the copy `INTERNAL TEST — [issue name]`.
5. On that copy, select **only GhostCrew Internal Test** as recipients.
6. Verify there is **exactly 1 recipient**, and that it is your address. Fix the
   selection before continuing if the count or address is wrong.
7. Send that copy as a regular campaign. This sends a real email to that one address.
8. Try “View in browser,” the main button, and replies. Test unsubscribe last:
   it really unsubscribes your address. Use an internal address you can leave
   unsubscribed afterward.

Keep the original draft for the public newsletter. Do not use the internal-test
copy for the public send. Internal tests do not go in our `sent/` archive.

## 4. Choose who gets it

Return to the **original newsletter draft** and open its recipient settings.

1. Select **GhostCrew Updates** for a normal newsletter.
2. Check that no extra groups or “all subscribers” selection is included by accident.
3. Check the recipient count. Does it make sense for the audience we intend to contact?
   If it looks empty, too small, or too large, stop and check the list. Do not import
   the Google Sheet just to make the number larger.

Selecting recipients does not send the newsletter. Sending or scheduling is a
separate action. Signup syncing, when enabled later, also does not send a regular
newsletter campaign by itself.

## 5. Review and send

On the final review screen, check:

- [ ] This is the public newsletter draft, not the internal test.
- [ ] The subject, issue number, and preheader are correct.
- [ ] The sender and reply-to addresses are correct.
- [ ] There is no leftover sample copy or mailing-address placeholder.
- [ ] The phone and desktop previews look good.
- [ ] The links go to the right places.
- [ ] The recipient group and count are correct.
- [ ] The plain-text version reads sensibly. Edit it if needed.

Keep a local copy of the final HTML now, including any edits made inside MailerLite.
We will use that exact version for the archive after sending.

Choose **Send now**, or **Schedule** for later. If scheduling, check the date, time,
and timezone shown before confirming. Then check that MailerLite shows the campaign
as sent or scheduled as expected.

## 6. Save what we sent

Do this **after it actually sends**. If it is scheduled for later, wait until then.

1. Use the final HTML you saved in step 5, including any last-minute changes.
   Use the source HTML, not “Save page” on an email in your inbox.
2. Save it in `newsletters/sent/` as `YYYY-MM-DD-short-title.html`, using the actual
   send date. For example, the short title could be `chalking-progress`.
3. Add a matching `.md` file beside it. Use the same filename before the extension:

   ```markdown
   # GhostCrew Update 002 — Chalking progress

   - Subject: [actual subject]
   - Preheader: [actual preheader]
   - Sent at: [date, time, and timezone]
   - MailerLite campaign ID: [ID, if available]
   - Public campaign web URL: [link from MailerLite]
   - HTML: [Issue HTML](YYYY-MM-DD-short-title.html)
   ```

4. Get the public link from **Campaigns → Sent → View report → View email**.
   Copy the campaign URL above the preview.
5. Commit and push both files to GitHub. Using the GitHub website? Open
   `newsletters/sent/`, choose **Add file → Upload files**, upload both files, and
   commit them through the repository's usual workflow.

Keep these copies as they were sent. Improve the design in `templates/` for future
issues instead of changing old issues.

This repository is public. Save newsletter content and the public campaign link
only. Keep subscriber lists, private account details, and personalized unsubscribe
or tracking links out of it. Leaving `{$url}` and `{$unsubscribe}` in the source is fine.

## 7. Check how it went

Later, open the MailerLite campaign report. Check delivery problems, bounces,
unsubscribes, and clicks. Check the reply inbox for questions. Use what we learn for
the next issue. Open counts are a rough signal, not an exact count of readers.

## Remember

- Editing or pushing files here does not send email.
- Sending in MailerLite does not automatically save a copy here; step 6 is manual.
- The Google Sheet and MailerLite recipient list are separate. Do not assume they
  contain the same people.
- If “View in browser” fails in a real delivered campaign too, check the saved HTML
  and link destination. Do not dismiss that as a test-email limitation.

## Official MailerLite help

Menu wording can change. These guides cover the MailerLite steps above:

- [Create, review, and schedule a campaign](https://www.mailerlite.com/help/how-to-create-and-schedule-a-campaign)
- [Test emails and their limitations](https://www.mailerlite.com/help/everything-about-test-emails)
- [Send a campaign to just one person](https://www.mailerlite.com/help/how-to-send-a-campaign-to-an-individual-subscriber)
- [Browser-view and unsubscribe variables](https://www.mailerlite.com/help/how-to-use-variables-in-mailerlite)
- [Find a draft preview or public campaign URL](https://www.mailerlite.com/help/how-to-share-your-newsletter-beyond-email)
