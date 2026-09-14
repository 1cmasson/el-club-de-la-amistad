/**
 * Club de la Amistad — por un Hialeah Mejor
 * Netlify Forms → Google Sheet ingest.
 *
 * Netlify posts here on "New form submission" (Netlify → Project configuration →
 * Notifications → Emails and webhooks → Outgoing webhook). Netlify stays the
 * system of record; this sheet is a working projection Edith can phone people from.
 *
 * INVARIANT — append-only. One new row per submission. The script writes the
 * ingest columns and seeds `Estado` on the row it has just created, and nothing
 * else. It never rewrites an existing row, so a note she typed can never be
 * clobbered by an automation.
 *
 * This file is version-controlled but NOT deployed by the repo. Paste it into the
 * bound script (Extensions → Apps Script) and redeploy after any change, via
 * Deploy → Manage deployments → pencil → New version. Creating a *new deployment*
 * mints a new /exec URL and silently orphans the Netlify webhook.
 *
 * The shared token lives in Script Properties, never in this file.
 */

// ------------------------------------------------------------------ config ---

var SHEET_NAME       = 'Voluntarios';
var GUIDE_NAME       = 'Cómo usar';
var ERROR_SHEET_NAME = 'Errores';
var QUARANTINE_NAME  = 'Revisar';

var ACCEPTED_FORMS = ['volunteer-signup'];   // add 'issue-report' if /report returns
var TIMEZONE       = 'America/New_York';

/** Optional: an address for hard failures. Leave '' to disable e-mail alerts. */
var NOTIFY_EMAIL = '';

/**
 * Which spreadsheet this writes to.
 *
 * Leave '' when the script is **bound** to the sheet (Extensions → Apps Script):
 * getActive() then resolves it. Set it to the sheet id when the script is a
 * **standalone** project, which is how this is actually deployed — a bound script
 * can only be created through the Sheets UI, and the deployment needs to be
 * reproducible from this file alone.
 *
 * This is the ONLY difference between the two setups. Keeping it a config value
 * rather than an edited copy is what stops the deployed code from drifting away
 * from the code in this repo.
 */
var SPREADSHEET_ID = '';

/** The target spreadsheet, bound or standalone. */
function ss_() {
  return SPREADSHEET_ID
    ? SpreadsheetApp.openById(SPREADSHEET_ID)
    : SpreadsheetApp.getActive();
}

/** Who she should call if the sheet looks wrong. Leave the phone '' to omit it. */
var HELP_NAME  = 'Carlos';
var HELP_PHONE = '';

/**
 * TAP-TO-CALL: TESTED, AND IT IS NOT POSSIBLE. Do not try it again.
 *
 * Sheets offers two ways to put a link in a cell and both refuse `tel:`:
 *   - `=HYPERLINK("tel:+13055550142", "Llamar")` — the function rejects the scheme.
 *   - `RichTextValue.setLinkUrl('tel:+13055550142')` — throws, verified live against
 *     a real spreadsheet on 14 Sep 2026:
 *         Exception: Illegal argument.  at writeRow_
 *     It is not a mobile-rendering question; the write itself is refused.
 *
 * So the phone is stored as plain text in `Teléfono`. That is not a consolation
 * prize: the Sheets mobile app linkifies phone-shaped strings by itself, and a
 * long press offers copy. If a real dial button is ever wanted, the route is a
 * Google Contacts import (export name/phone/email to CSV, import under a "Club de
 * la Amistad" label), NOT a link in this sheet.
 *
 * Rejected: routing through a third-party redirector such as call.ctrlq.org, which
 * would send every volunteer's phone number through a stranger's server.
 */

// ----------------------------------------------------------------- columns ---

/** Single source of truth for the layout. Indices are derived, never hardcoded. */
var COLUMNS = [
  { key: 'RECIBIDO', header: 'Recibido',                              owner: 'script', width: 150 },
  { key: 'NOMBRE',   header: 'Nombre',                                owner: 'script', width: 190 },
  { key: 'TELEFONO', header: 'Teléfono',                              owner: 'script', width: 135 },
  { key: 'CORREO',   header: 'Correo',                                owner: 'script', width: 230 },
  { key: 'IDIOMA',   header: 'Idioma',                                owner: 'script', width:  95 },
  { key: 'SMS',      header: '¿Permitió mensajes? (aún no enviamos)', owner: 'script', width: 165 },
  { key: 'ESTADO',   header: 'Estado',                                owner: 'edith',  width: 150 },
  { key: 'ULTIMA',   header: 'Última llamada',                        owner: 'edith',  width: 125 },
  { key: 'NOTAS',    header: 'Notas',                                 owner: 'edith',  width: 330 },
  { key: 'ID',       header: 'ID Netlify',                            owner: 'script', width: 250 }
];

var HEADERS = COLUMNS.map(function (c) { return c.header; });

var COL = (function () {
  var m = {};
  COLUMNS.forEach(function (c, i) { m[c.key] = i + 1; });
  return m;
})();

/** Estado values. Each drives exactly one conditional-format rule. */
var ESTADO_NUEVO = 'Nuevo';
var ESTADO_ROJO  = ['Llamado', 'No contestó', 'Dejé mensaje'];   // ya di seguimiento
var ESTADO_VERDE = ['Confirmado'];
var ESTADO_GRIS  = ['No interesado', 'Número equivocado'];

var ESTADOS = [ESTADO_NUEVO]
  .concat(ESTADO_ROJO)
  .concat(ESTADO_VERDE)
  .concat(ESTADO_GRIS);

/** The colour code. Mirrored verbatim into the "Cómo usar" tab. */
var C_AMARILLO = '#FFF3C4';
var C_ROJO     = '#F8D7DA';
var C_VERDE    = '#E6F4EA';
var C_GRIS     = '#F1F1F1';
var C_CREMA    = '#F3E7CE';   // header band, matches the site palette

// --------------------------------------------------------------- endpoints ---

function doPost(e) {
  try {
    if (!e || !e.postData) return ok_('ignored:no-body');

    var expected = PropertiesService.getScriptProperties().getProperty('WEBHOOK_TOKEN');
    if (!expected || !e.parameter || e.parameter.token !== expected) {
      console.warn('Rechazado: token ausente o incorrecto.');
      return ok_('ignored:token');
    }

    var body = JSON.parse(e.postData.contents);
    // Outgoing webhooks send the submission at top level; the serverless
    // "submission-created" event wraps it in .payload. Accept either and the
    // question stops mattering.
    var s = body.payload || body;

    var formName = String(s.form_name || '');
    if (ACCEPTED_FORMS.indexOf(formName) === -1) return ok_('ignored:form:' + formName);

    // `data` is the authoritative field bag. Never read `human_fields` — its keys
    // are title-cased display labels and their casing is not contractual.
    var data = s.data || {};
    var id   = String(s.id || s.number || ('sin-id-' + new Date().getTime()));

    var lock = LockService.getScriptLock();
    if (!lock.tryLock(45000)) {
      logError_(new Error('No se pudo obtener el bloqueo'), e);
      return ok_('busy');
    }

    try {
      var sheet = getSheet_();
      if (!headersOk_(sheet)) {            // a column was deleted or reordered
        quarantine_(id, formName, data, 'Los encabezados no coinciden');
        return ok_('quarantined:headers');
      }
      if (findRowById_(sheet, id)) return ok_('duplicate:' + id);
      writeRow_(sheet, s, data, id);
    } finally {
      lock.releaseLock();
    }

    return ok_('stored:' + id);

  } catch (err) {
    logError_(err, e);
    return ok_('error-logged');   // 200 on purpose — see ok_() below
  }
}

/** Health check: paste the /exec URL in a browser and expect {"ok":true}. */
function doGet() {
  return ok_('alive');
}

// ------------------------------------------------------------------- write ---

function writeRow_(sheet, s, data, id) {
  var phone = String(data.phone || '').trim();

  var row = COLUMNS.map(function (c) {
    switch (c.key) {
      // A real Date, not a string: sortable, and rendered in the spreadsheet's
      // timezone (set to America/New_York by setup()), DST included, forever.
      case 'RECIBIDO': return parseDate_(s.created_at);
      case 'NOMBRE':   return String(data.name || '').trim();
      case 'TELEFONO': return phone;               // arrives as "(305) 555-0142"
      case 'CORREO':   return String(data.email || '').trim();
      case 'IDIOMA':   return langLabel_(data.language);
      case 'SMS':      return smsLabel_(data.smsConsent);
      // The only column of hers the script ever touches — on a row that did not
      // exist a millisecond ago, so the never-clobber invariant holds exactly.
      case 'ESTADO':   return ESTADO_NUEVO;
      case 'ID':       return id;
      default:         return '';                  // Última llamada, Notas: hers
    }
  });

  // data.ip, data.user_agent and data.referrer are deliberately NOT written.
  // They are noise on a phone screen and personal data with no operational use.
  // Do not "helpfully" add them later.

  sheet.appendRow(row);
}

// ------------------------------------------------------------------ lookup ---

/** Cheap dedupe: one TextFinder pass over the hidden id column. */
function findRowById_(sheet, id) {
  var last = sheet.getLastRow();
  if (last < 2) return 0;
  var hit = sheet.getRange(2, COL.ID, last - 1, 1)
                 .createTextFinder(id)
                 .matchEntireCell(true)
                 .findNext();
  return hit ? hit.getRow() : 0;
}

// ------------------------------------------------------------- sheet state ---

function getSheet_() {
  var ss = ss_();
  var sheet = ss.getSheetByName(SHEET_NAME);
  if (!sheet) {
    // Renamed or deleted. Recreating is the only branch that never loses a row.
    sheet = ss.insertSheet(SHEET_NAME);
    console.warn('La pestaña "' + SHEET_NAME + '" no existía; fue recreada.');
    notify_('La pestaña "' + SHEET_NAME + '" fue recreada',
            'El script no encontró la pestaña y creó una nueva. Si usted la ' +
            'renombró, los registros nuevos están en la pestaña nueva.');
  }
  if (sheet.getLastRow() === 0) {
    sheet.getRange(1, 1, 1, HEADERS.length).setValues([HEADERS]);
    sheet.setFrozenRows(1);
  }
  return sheet;
}

/**
 * Guards positional writes. Only the script-owned headers must still match — she
 * is free to rename Estado/Última llamada/Notas if she likes.
 */
function headersOk_(sheet) {
  if (sheet.getLastColumn() < HEADERS.length) return false;
  var row = sheet.getRange(1, 1, 1, HEADERS.length).getValues()[0];
  for (var i = 0; i < COLUMNS.length; i++) {
    if (COLUMNS[i].owner !== 'script') continue;
    if (String(row[i]).trim() !== COLUMNS[i].header) return false;
  }
  return true;
}

function quarantine_(id, formName, data, reason) {
  var ss = ss_();
  var t = ss.getSheetByName(QUARANTINE_NAME) || ss.insertSheet(QUARANTINE_NAME);
  if (t.getLastRow() === 0) {
    t.appendRow(['Cuándo', 'Motivo', 'Formulario', 'ID', 'Datos']);
    t.setFrozenRows(1);
  }
  t.appendRow([new Date(), reason, formName, id, JSON.stringify(data)]);
  console.error('Fila enviada a "' + QUARANTINE_NAME + '": ' + reason);
  notify_('Un registro no se pudo guardar en la lista',
          reason + ' — está en la pestaña "' + QUARANTINE_NAME + '".');
}

// ------------------------------------------------------------------ format ---

function parseDate_(iso) {
  if (!iso) return new Date();
  var d = new Date(iso);
  return isNaN(d.getTime()) ? new Date() : d;
}

function onlyDigits_(v) {
  var d = String(v || '').replace(/\D/g, '');
  if (d.length === 11 && d.charAt(0) === '1') d = d.substring(1);
  return d;
}

function langLabel_(v) {
  return String(v || '').toLowerCase().indexOf('es') === 0 ? 'Español' : 'English';
}

function smsLabel_(v) {
  var t = String(v || '').toLowerCase();
  return (t === 'yes' || t === 'on' || t === 'true' ||
          t === 'si'  || t === 'sí' || t === '1') ? 'Sí' : 'No';
}

/** 1 → A, 27 → AA. Used to build conditional-format formulas. */
function colLetter_(n) {
  var s = '';
  while (n > 0) {
    var r = (n - 1) % 26;
    s = String.fromCharCode(65 + r) + s;
    n = (n - r - 1) / 26;
  }
  return s;
}

// ------------------------------------------------------------------ errors ---

function logError_(err, e) {
  console.error(err && err.stack ? err.stack : String(err));
  try {
    var ss = ss_();
    var t = ss.getSheetByName(ERROR_SHEET_NAME) || ss.insertSheet(ERROR_SHEET_NAME);
    if (t.getLastRow() === 0) {
      t.appendRow(['Cuándo', 'Error', 'Cuerpo recibido']);
      t.setFrozenRows(1);
    }
    var raw = (e && e.postData && e.postData.contents) ? e.postData.contents : '';
    t.appendRow([new Date(), String(err), raw.substring(0, 40000)]);
  } catch (ignored) {}
  notify_('Error al guardar un registro', String(err));
}

function notify_(subject, bodyText) {
  if (!NOTIFY_EMAIL) return;
  try {
    MailApp.sendEmail(NOTIFY_EMAIL, 'Club de la Amistad — ' + subject, bodyText);
  } catch (ignored) {}   // a mail quota must never cascade into a lost row
}

/**
 * Always 200. ContentService cannot emit a non-2xx status — the only way to
 * produce a 5xx is to let an exception escape, which returns an HTML error page.
 * "Please retry" is therefore unexpressible, so nothing here depends on retries:
 * failures are logged to the Errores tab and Netlify keeps the durable copy.
 */
function ok_(result) {
  return ContentService
    .createTextOutput(JSON.stringify({ ok: true, result: result }))
    .setMimeType(ContentService.MimeType.JSON);
}
