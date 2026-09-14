/**
 * The "Cómo usar" tab — the legend.
 *
 * This is a deliverable, not a comment. It is the difference between a tool Edith
 * uses and one she abandons, so it is built in code (reproducible, re-runnable)
 * rather than typed by hand once and lost the next time the sheet is rebuilt.
 *
 * Rules it follows, and they are the point:
 *   - Large type. 13pt body, 15pt headings, 22pt title.
 *   - Short sentences, plain Spanish, no jargon, no English.
 *   - Real colour swatches, not the names of colours.
 *   - It never documents an affordance that does not work. Sheets refuses `tel:`
 *     links outright (see the note in Code.gs), so the guide tells her to press
 *     and hold the number rather than promising a dial button that cannot exist.
 *
 * Column A holds the swatches, column B holds every piece of text. Nothing is
 * merged, because merged cells do not auto-fit their row height and the whole
 * page would need hand-tuned heights forever.
 */

var GUIDE_TEXT_WIDTH    = 560;
var GUIDE_SWATCH_WIDTH  = 72;
var GUIDE_INK           = '#2A1A0C';   // the site's brown
var GUIDE_MUTED         = '#7A6A58';

function buildGuide_(ss) {
  var g = ss.getSheetByName(GUIDE_NAME) || ss.insertSheet(GUIDE_NAME);

  g.clear();
  g.setConditionalFormatRules([]);
  g.getRange(1, 1, g.getMaxRows(), g.getMaxColumns()).clearDataValidations().clearNote();
  g.setHiddenGridlines(true);
  g.setColumnWidth(1, GUIDE_SWATCH_WIDTH);
  g.setColumnWidth(2, GUIDE_TEXT_WIDTH);

  var r = 1;   // row cursor

  function title(text) {
    g.getRange(r, 2).setValue(text)
      .setFontSize(22).setFontWeight('bold').setFontColor(GUIDE_INK).setWrap(true);
    g.setRowHeight(r, 40);
    r++;
  }

  function subtitle(text) {
    g.getRange(r, 2).setValue(text)
      .setFontSize(12).setFontColor(GUIDE_MUTED).setWrap(true);
    r++;
  }

  function heading(text) {
    g.getRange(r, 2).setValue(text)
      .setFontSize(15).setFontWeight('bold').setFontColor(GUIDE_INK)
      .setWrap(true).setVerticalAlignment('middle');
    g.setRowHeight(r, 34);
    r++;
  }

  function body(text) {
    g.getRange(r, 2).setValue(text)
      .setFontSize(13).setFontColor(GUIDE_INK)
      .setWrap(true).setVerticalAlignment('middle');
    r++;
  }

  function swatch(colour, text) {
    g.getRange(r, 1).setBackground(colour)
      .setBorder(true, true, true, true, false, false, '#D8CBB6',
                 SpreadsheetApp.BorderStyle.SOLID);
    g.getRange(r, 2).setValue(text)
      .setFontSize(13).setFontColor(GUIDE_INK)
      .setWrap(true).setVerticalAlignment('middle');
    g.setRowHeight(r, 34);
    r++;
  }

  function blank(height) {
    g.setRowHeight(r, height || 16);
    r++;
  }

  // ---------------------------------------------------------------- content ---

  title('Cómo usar esta hoja');
  subtitle('Club de la Amistad — por un Hialeah Mejor');
  blank(20);

  heading('1. ¿Qué es esta hoja?');
  body('Es la lista de las personas que se inscriben en el sitio web.');
  body('Cada vez que alguien se inscribe, aparece solo en una fila nueva, al ' +
       'final de la lista. Usted no tiene que copiar nada ni pedirle nada a nadie.');
  body('Las inscripciones nuevas siempre van abajo. Las más recientes están al ' +
       'final.');
  blank();

  heading('2. Las columnas que se llenan solas');
  body('Estas las escribe la computadora. No hace falta que usted escriba en ellas:');
  body('      •  Recibido — el día y la hora en que se inscribió' +
       '\n      •  Nombre' +
       '\n      •  Teléfono' +
       '\n      •  Correo' +
       '\n      •  Idioma — en qué idioma prefiere que le hablen' +
       '\n      •  ¿Permitió mensajes?');
  body('Si toca una de ellas por equivocación, la hoja le va a preguntar antes de ' +
       'cambiar nada. No se preocupe.');
  blank();

  heading('3. Sus columnas');
  body('Estas tres son suyas. Escriba lo que usted quiera; la computadora nunca ' +
       'las borra ni las cambia:');
  body('      •  Estado — en qué va con esa persona' +
       '\n      •  Última llamada — cuándo la llamó' +
       '\n      •  Notas — lo que usted quiera recordar');
  blank();

  heading('4. Los colores');
  body('El color de la fila le dice, de un vistazo, qué falta por hacer:');
  blank(8);
  swatch(C_AMARILLO, 'Amarillo  —  Todavía no la he llamado');
  swatch(C_ROJO,     'Rojo  —  Ya la llamé. Ya di seguimiento.');
  swatch(C_VERDE,    'Verde  —  Ya es voluntaria del club');
  swatch(C_GRIS,     'Gris  —  No está interesada, o el número está equivocado');
  blank(8);
  body('Así, cuando abra la hoja, las filas amarillas son las que le faltan.');
  blank();

  heading('5. Cómo marcar que ya llamó');
  body('1)  Toque la casilla de esa fila en la columna Estado.');
  body('2)  Elija de la lista: Llamado, No contestó o Dejé mensaje.');
  body('3)  La fila se pone roja sola. Usted no tiene que pintar nada.');
  blank(8);
  body('Si prefiere pintarla usted misma: seleccione la fila, toque el bote de ' +
       'pintura y elija el rojo. Las dos formas están bien y ninguna daña la hoja.');
  blank();

  heading('6. Cómo llamar a una persona');
  body('Mantenga el dedo sobre el número en la columna Teléfono. El teléfono le ' +
       'va a ofrecer llamar, o copiar el número para marcarlo usted.');
  blank();

  heading('7. Importante: todavía no enviamos mensajes de texto');
  body('La columna "¿Permitió mensajes?" solo guarda si la persona nos dio permiso ' +
       'para escribirle en el futuro.');
  body('Por ahora el club no puede enviar mensajes de texto. Llame por teléfono.');
  blank();

  heading('8. Si algo se ve raro');
  body('No se preocupe: nada se pierde nunca. Todo queda guardado también fuera ' +
       'de esta hoja, y se puede volver a traer.');
  body('Si borró algo sin querer, puede deshacerlo con Archivo → Historial de versiones.');
  body(HELP_PHONE
    ? 'Y si prefiere, llame a ' + HELP_NAME + ': ' + HELP_PHONE
    : 'Y si prefiere, llame a ' + HELP_NAME + '.');

  // Nothing below the text should look like part of the page.
  g.getRange(1, 1, g.getMaxRows(), 1).setHorizontalAlignment('center');
  g.setFrozenRows(0);
}
