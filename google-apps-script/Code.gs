const SHEET_NAME = 'Resultados';
const TIME_ZONE = 'America/Guayaquil';
const DEFAULT_LIMIT = 10;

function doGet(e) {
  try {
    const action = String((e && e.parameter && e.parameter.action) || 'leaderboard').toLowerCase();
    if (action !== 'leaderboard') return json_({ ok: false, error: 'Acción no válida' });

    const limit = Math.min(50, Math.max(1, Number(e.parameter.limit || DEFAULT_LIMIT)));
    const sheet = getSheet_();
    const lastRow = sheet.getLastRow();
    if (lastRow < 2) return json_({ ok: true, scores: [] });

    const values = sheet.getRange(2, 1, lastRow - 1, 12).getValues();
    const scores = values.map(row => ({
      serverTimestamp: row[0] instanceof Date ? row[0].toISOString() : String(row[0] || ''),
      submittedLocal: String(row[1] || ''),
      name: String(row[2] || ''),
      course: String(row[3] || ''),
      correct: Number(row[4] || 0),
      durationSeconds: Number(row[5] || 0),
      accuracyPoints: Number(row[6] || 0),
      timeBonus: Number(row[7] || 0),
      score: Number(row[8] || 0),
      submittedAt: String(row[9] || ''),
      questionIds: String(row[10] || ''),
      fingerprint: String(row[11] || ''),
    })).sort((a, b) => b.score - a.score || a.durationSeconds - b.durationSeconds).slice(0, limit);

    return json_({ ok: true, scores });
  } catch (err) {
    return json_({ ok: false, error: String(err && err.message || err) });
  }
}

function doPost(e) {
  try {
    const raw = e && e.postData ? e.postData.contents : '{}';
    const data = JSON.parse(raw || '{}');
    if (String(data.action || '').toLowerCase() !== 'submit') return json_({ ok: false, error: 'Acción no válida' });

    const clean = validate_(data);
    const lock = LockService.getScriptLock();
    lock.waitLock(10000);
    try {
      const sheet = getSheet_();
      const fingerprint = Utilities.base64EncodeWebSafe(
        Utilities.computeDigest(Utilities.DigestAlgorithm.SHA_256, `${clean.name}|${clean.submittedAt}|${clean.score}|${clean.durationSeconds}`)
      ).slice(0, 24);

      sheet.appendRow([
        new Date(),
        Utilities.formatDate(new Date(), TIME_ZONE, 'yyyy-MM-dd HH:mm:ss'),
        clean.name,
        clean.course,
        clean.correct,
        clean.durationSeconds,
        clean.accuracyPoints,
        clean.timeBonus,
        clean.score,
        clean.submittedAt,
        clean.questionIds,
        fingerprint,
      ]);
      return json_({ ok: true, fingerprint });
    } finally {
      lock.releaseLock();
    }
  } catch (err) {
    return json_({ ok: false, error: String(err && err.message || err) });
  }
}

function getSheet_() {
  const spreadsheet = SpreadsheetApp.getActiveSpreadsheet();
  if (!spreadsheet) throw new Error('Este script debe estar vinculado a un Google Sheets.');
  spreadsheet.setSpreadsheetTimeZone(TIME_ZONE);
  let sheet = spreadsheet.getSheetByName(SHEET_NAME);
  if (!sheet) sheet = spreadsheet.insertSheet(SHEET_NAME);

  const headers = ['Marca de tiempo servidor','Fecha/hora Ecuador','Participante','Curso','Correctas','Duración (s)','Puntos precisión','Bono tiempo','Puntaje final','ISO cliente','IDs preguntas','Fingerprint'];
  if (sheet.getLastRow() === 0) {
    sheet.getRange(1,1,1,headers.length).setValues([headers]);
    sheet.setFrozenRows(1);
    sheet.getRange(1,1,1,headers.length).setFontWeight('bold');
    sheet.autoResizeColumns(1, headers.length);
  }
  return sheet;
}

function validate_(data) {
  const name = String(data.name || '').trim().slice(0, 70);
  const course = String(data.course || '').trim().slice(0, 40);
  const correct = clampInt_(data.correct, 0, 10);
  const durationSeconds = clampInt_(data.durationSeconds, 1, 86400);
  const accuracyPoints = clampInt_(data.accuracyPoints, 0, 10000);
  const timeBonus = clampInt_(data.timeBonus, 0, 2000);
  const score = clampInt_(data.score, 0, 12000);
  const submittedAt = String(data.submittedAt || '').slice(0, 40);
  const questionIds = String(data.questionIds || '').slice(0, 300);
  if (name.length < 2) throw new Error('Nombre no válido.');
  if (!/^\d{4}-\d{2}-\d{2}T/.test(submittedAt)) throw new Error('Fecha ISO no válida.');

  // Verificación básica del cálculo para reducir alteraciones accidentales desde el cliente.
  const expectedAccuracy = Math.round((correct / 10) * 10000);
  const speedRatio = Math.max(0, 1 - durationSeconds / 900);
  const expectedTimeBonus = Math.round(speedRatio * (correct / 10) * 2000);
  const expectedScore = expectedAccuracy + expectedTimeBonus;
  if (Math.abs(score - expectedScore) > 2) throw new Error('Puntaje inconsistente.');

  return { name, course, correct, durationSeconds, accuracyPoints, timeBonus, score, submittedAt, questionIds };
}

function clampInt_(value, min, max) {
  const n = Math.round(Number(value));
  if (!Number.isFinite(n)) return min;
  return Math.min(max, Math.max(min, n));
}

function json_(data) {
  return ContentService.createTextOutput(JSON.stringify(data)).setMimeType(ContentService.MimeType.JSON);
}
