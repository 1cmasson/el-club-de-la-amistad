/**
 * One-time (and safely repeatable) sheet construction.
 *
 * Run `setup` from the Apps Script editor after pasting the files. It rebuilds
 * headers, widths, number formats, the Estado dropdown, the colour rules, the
 * header notes and the entire "Cómo usar" tab. It never touches data rows, so
 * re-running it after a config change is safe.
 */
function setup() {
  var ss = SpreadsheetApp.getActive();

  // Real Dates are written into the cells; the spreadsheet's timezone is what
  // renders them in Eastern time, DST included, forever. Never hand-shift dates.
  ss.setSpreadsheetTimeZone(TIMEZONE);

  var sheet = ss.getSheetByName(SHEET_NAME) || ss.insertSheet(SHEET_NAME);

  buildHeader_(sheet);
  buildFormats_(sheet);
  buildValidation_(sheet);
  buildColours_(sheet);
  buildNotes_(sheet);
  buildProtection_(sheet);

  sheet.hideColumns(COL.ID);

  buildGuide_(ss);

  // The list opens first; the guide sits immediately to its right.
  ss.setActiveSheet(sheet);
  ss.moveActiveSheet(1);
  ss.setActiveSheet(ss.getSheetByName(GUIDE_NAME));
  ss.moveActiveSheet(2);
  ss.setActiveSheet(sheet);

  SpreadsheetApp.flush();
  console.log('setup() listo. Columnas: ' + HEADERS.join(' | '));
}

// ------------------------------------------------------------------ pieces ---

function buildHeader_(sheet) {
  var head = sheet.getRange(1, 1, 1, HEADERS.length);
  head.setValues([HEADERS])
      .setFontWeight('bold')
      .setFontSize(11)
      .setBackground(C_CREMA)
      .setWrap(true)
      .setVerticalAlignment('middle');
  sheet.setFrozenRows(1);
  sheet.setRowHeight(1, 52);
  COLUMNS.forEach(function (c, i) { sheet.setColumnWidth(i + 1, c.width); });
}

function buildFormats_(sheet) {
  var rows = sheet.getMaxRows() - 1;
  if (rows < 1) return;

  // Column-level formats, set once and inherited by every appended row.
  sheet.getRange(2, COL.RECIBIDO, rows, 1).setNumberFormat('dd/mm/yyyy  hh:mm AM/PM');
  sheet.getRange(2, COL.TELEFONO, rows, 1).setNumberFormat('@');  // keep "(305) 555-0142"
  sheet.getRange(2, COL.ULTIMA,   rows, 1).setNumberFormat('dd/mm/yyyy');
  sheet.getRange(2, COL.NOTAS,    rows, 1).setWrap(true).setVerticalAlignment('top');
  sheet.getRange(2, COL.NOMBRE,   rows, 1).setWrap(false);
  sheet.getRange(2, COL.ESTADO,   rows, 1).setFontWeight('bold');
}

function buildValidation_(sheet) {
  var rows = sheet.getMaxRows() - 1;
  if (rows < 1) return;
  sheet.getRange(2, COL.ESTADO, rows, 1).setDataValidation(
    SpreadsheetApp.newDataValidation()
      .requireValueInList(ESTADOS, true)
      .setAllowInvalid(false)          // a typo is rejected, not silently uncoloured
      .setHelpText('Toque aquí y elija de la lista. La fila cambia de color sola.')
      .build());
}

/**
 * The colour code. Red means "ya di seguimiento" — chosen deliberately, and
 * documented in the guide tab so it is never ambiguous.
 *
 * Every rule is a plain equality formula. No OR() or COUNTIF(), so the
 * spreadsheet's argument separator (comma vs semicolon under a Spanish locale)
 * cannot break them.
 */
function buildColours_(sheet) {
  var rows = sheet.getMaxRows() - 1;
  if (rows < 1) return;

  var all = sheet.getRange(2, 1, rows, HEADERS.length);
  var e   = '$' + colLetter_(COL.ESTADO) + '2';
  var rules = [];

  function rule(value, background, bold, fontColour) {
    var b = SpreadsheetApp.newConditionalFormatRule()
      .whenFormulaSatisfied('=' + e + '="' + value + '"')
      .setBackground(background)
      .setRanges([all]);
    if (bold) b.setBold(true);
    if (fontColour) b.setFontColor(fontColour);
    rules.push(b.build());
  }

  rule(ESTADO_NUEVO, C_AMARILLO, true, null);                  // por llamar
  ESTADO_ROJO.forEach(function (v)  { rule(v, C_ROJO,  false, null); });
  ESTADO_VERDE.forEach(function (v) { rule(v, C_VERDE, false, '#4B5563'); });
  ESTADO_GRIS.forEach(function (v)  { rule(v, C_GRIS,  false, '#8A8A8A'); });

  sheet.setConditionalFormatRules(rules);
}

function buildNotes_(sheet) {
  sheet.getRange(1, COL.RECIBIDO).setNote(
    'Fecha y hora en que la persona se inscribió (hora de Miami).');

  sheet.getRange(1, COL.TELEFONO).setNote(
    'Mantenga el dedo sobre el número para copiarlo, o tóquelo: el teléfono ' +
    'suele reconocerlo y ofrecerle llamar.');

  sheet.getRange(1, COL.SMS).setNote(
    'La persona marcó la casilla que permite mensajes de texto.\n\n' +
    'TODAVÍA NO PODEMOS ENVIAR MENSAJES DE TEXTO. Este dato es solo un registro ' +
    'para el futuro. Por ahora, llame por teléfono.');

  sheet.getRange(1, COL.ESTADO).setNote(
    'Toque la casilla y elija de la lista. La fila se pinta sola:\n' +
    'amarillo = por llamar, rojo = ya llamé, verde = ya es voluntaria.\n\n' +
    'Vea la pestaña "' + GUIDE_NAME + '" para más detalles.');
}

/**
 * Warning-only protection on the script-owned columns: an accidental edit prompts
 * rather than blocking. Her columns are deliberately left wide open.
 *
 * This works alongside script writes only because the web app is deployed with
 * "Execute as: Me" (the sheet's owner). Do not change that setting.
 */
function buildProtection_(sheet) {
  sheet.getProtections(SpreadsheetApp.ProtectionType.RANGE).forEach(function (p) {
    if (p.getDescription() === 'Columnas del sistema') p.remove();
  });

  var rows = sheet.getMaxRows();
  COLUMNS.forEach(function (c, i) {
    if (c.owner !== 'script') return;
    sheet.getRange(1, i + 1, rows, 1)
         .protect()
         .setDescription('Columnas del sistema')
         .setWarningOnly(true);
  });
}
