// GhostCrew waitlist -> Google Sheets backend
// Paste this into Extensions > Apps Script of your Google Sheet (see setup steps).

const SHEET_NAME = 'Waitlist';
// Optional: who gets an email for each signup ('' = off).
// Multiple emails work — just separate them with commas:
const NOTIFY_EMAIL = 'rsharda@andrew.cmu.edu, jchao2@andrew.cmu.edu';

function doPost(e) {
  const lock = LockService.getScriptLock();
  lock.tryLock(10000);
  try {
    const p = (e && e.parameter) || {};
    if (p._gotcha) return out({ ok: true }); // spam honeypot: pretend success, save nothing

    const ss = SpreadsheetApp.getActiveSpreadsheet();
    let sheet = ss.getSheetByName(SHEET_NAME);
    if (!sheet) {
      sheet = ss.insertSheet(SHEET_NAME);
      sheet.appendRow(['Timestamp', 'Name', 'Email', 'Facility / organization', 'Role', 'Number of fields']);
      sheet.setFrozenRows(1);
    }
    sheet.appendRow([new Date(), p.name || '', p.email || '', p.organization || '', p.role || '', p.fields || '']);

    if (NOTIFY_EMAIL) {
      MailApp.sendEmail(
        NOTIFY_EMAIL,
        'New GhostCrew waitlist signup: ' + (p.name || 'unknown'),
        'Name: ' + (p.name || '') + '\nEmail: ' + (p.email || '') +
        '\nFacility: ' + (p.organization || '') + '\nRole: ' + (p.role || '') +
        '\nFields: ' + (p.fields || '')
      );
    }
    return out({ ok: true });
  } catch (err) {
    return out({ ok: false, error: String(err) });
  } finally {
    lock.releaseLock();
  }
}

function out(obj) {
  return ContentService.createTextOutput(JSON.stringify(obj))
    .setMimeType(ContentService.MimeType.JSON);
}
