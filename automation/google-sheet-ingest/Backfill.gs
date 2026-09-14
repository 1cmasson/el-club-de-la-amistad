/**
 * One-time import of submissions that predate the webhook.
 *
 * The webhook only fires on NEW submissions, so anything already sitting in the
 * Netlify dashboard has to be brought over by hand once.
 *
 *   1. Netlify → the project → Forms → volunteer-signup. Check the Spam tab first
 *      and mark anything legitimate as "not spam" — the export skips spam.
 *   2. Download as CSV.
 *   3. In the Sheet: File → Import → Upload → "Insert new sheet(s)". Rename the
 *      new tab to exactly  CSV
 *   4. Run `backfillFromCsvTab` from the Apps Script editor.
 *   5. Delete the CSV tab once the rows look right.
 *
 * Safe to re-run: the second pass skips everything it already imported.
 */
function backfillFromCsvTab() {
  var ss  = ss_();
  var src = ss.getSheetByName('CSV');
  if (!src) throw new Error('No existe una pestaña llamada "CSV".');

  var values = src.getDataRange().getValues();
  if (values.length < 2) throw new Error('La pestaña CSV no tiene filas.');

  // Map by header NAME, never by position — Netlify's export column order and
  // metadata columns vary by dashboard version.
  var head = values[0].map(function (h) { return String(h).trim().toLowerCase(); });
  var at   = function (name) { return head.indexOf(name); };

  var iId    = at('id');
  var iName  = at('name');
  var iMail  = at('email');
  var iPhone = at('phone');
  var iSms   = at('smsconsent');
  var iLang  = at('language');
  var iWhen  = at('created_at') >= 0 ? at('created_at')
             : (at('date') >= 0 ? at('date') : at('submitted at'));

  var rows = values.slice(1).filter(function (row) {
    return String((iName >= 0 ? row[iName] : '') ||
                  (iMail >= 0 ? row[iMail] : '')).trim() !== '';
  }).map(function (row) {
    var when  = iWhen >= 0 ? parseDate_(row[iWhen]) : new Date(0);
    var email = String(iMail >= 0 ? row[iMail] : '').trim();

    // Where the export carries no id, synthesise one. The "csv:" prefix cannot
    // collide with a Netlify id, so a later webhook retry still dedupes correctly,
    // and a genuinely new signup from the same person gets a real id and correctly
    // produces a second row — this is a contact log, not a people table.
    var id = (iId >= 0 && String(row[iId]).trim())
      ? String(row[iId]).trim()
      : 'csv:' + when.toISOString() + '|' + email.toLowerCase();

    return {
      when:  when,
      id:    id,
      name:  String(iName  >= 0 ? row[iName]  : '').trim(),
      email: email,
      phone: String(iPhone >= 0 ? row[iPhone] : '').trim(),
      sms:   iSms  >= 0 ? row[iSms]  : 'no',
      lang:  iLang >= 0 ? row[iLang] : 'es'
    };
  });

  rows.sort(function (a, b) { return a.when - b.when; });   // oldest first: bottom stays newest

  var lock = LockService.getScriptLock();
  lock.waitLock(60000);
  try {
    var sheet = getSheet_();
    if (!headersOk_(sheet)) throw new Error('Los encabezados no coinciden. Ejecute setup() primero.');

    var added = 0, skipped = 0;
    rows.forEach(function (x) {
      if (findRowById_(sheet, x.id)) { skipped++; return; }
      writeRow_(sheet,
        { created_at: x.when.toISOString() },
        { name: x.name, email: x.email, phone: x.phone,
          smsConsent: x.sms, language: x.lang },
        x.id);
      added++;
    });
    console.log('Backfill: ' + added + ' agregadas, ' + skipped + ' ya existían.');
  } finally {
    lock.releaseLock();
  }
}
