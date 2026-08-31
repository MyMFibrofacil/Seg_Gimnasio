const SPREADSHEET_ID = '1jevlhKwOlNe-LJHrhUrcVO3-w7edNC1N81L6oYqRA1k';
const SHEETS = {
  plan: 'Plan 12 semanas',
  sessions: 'Registro sesiones',
  daily: 'Peso y medidas',
  recovery: 'Recuperación'
};

function doGet(event) {
  try {
    if ((event.parameter.action || 'bootstrap') !== 'bootstrap') return jsonResponse({ ok: false, error: 'Acción GET no válida.' });
    return jsonResponse(buildBootstrap());
  } catch (error) { return jsonResponse({ ok: false, error: error.message }); }
}

function doPost(event) {
  try {
    const request = JSON.parse(event.postData.contents || '{}');
    if (request.type === 'session') appendSession(request.data);
    else if (request.type === 'daily') appendDailyAndRecovery(request.data);
    else throw new Error('Tipo de registro no válido.');
    return jsonResponse({ ok: true });
  } catch (error) { return jsonResponse({ ok: false, error: error.message }); }
}

function buildBootstrap() {
  return {
    ok: true,
    plan: readRows(SHEETS.plan).slice(1).map((row) => ({
      week: row[0], day: row[1], block: row[2], power: row[3], strength: row[4], accessories: row[5],
      reaction: row[6], duration: row[7], objective: row[8], adjustment: row[9]
    })),
    recentSessions: readRows(SHEETS.sessions).slice(1).filter((row) => row[0]).slice(-500).map((row) => ({
      date: row[0], week: row[1], day: row[2], exercise: row[3], barWeight: row[4], discPerSide: row[5],
      totalWeight: row[6], repetitions: row[7], setNumber: row[12] || ''
    })),
    recentDaily: readRows(SHEETS.daily).slice(1).filter((row) => row[0]).slice(-100).map((row) => ({ date: row[0], weight: row[1], waist: row[2] }))
  };
}

function appendSession(data) {
  requireFields(data, ['date', 'week', 'day', 'exercise', 'repetitions']);
  const series = Array.isArray(data.series) ? data.series : [{
    barWeight: data.barWeight || '',
    discPerSide: data.discPerSide || '',
    totalWeight: data.totalWeight || '',
    repetitions: data.repetitions
  }];
  const sheet = getSheet(SHEETS.sessions);
  if (sheet.getRange(1, 13).getDisplayValue() !== 'Serie') sheet.getRange(1, 13).setValue('Serie');
  const rows = series.map((set, index) => [
    data.date, data.week, data.day, data.exercise,
    set.barWeight ?? '', set.discPerSide ?? '', set.totalWeight ?? '', set.repetitions ?? '',
    '', '', '', index === 0 ? data.notes || '' : '', index + 1
  ]);
  sheet.getRange(sheet.getLastRow() + 1, 1, rows.length, 13).setValues(rows);
}

function appendDailyAndRecovery(data) {
  requireFields(data, ['date', 'weight']);
  getSheet(SHEETS.daily).appendRow([data.date, data.weight, data.waist || '', '', data.notes || '']);
  getSheet(SHEETS.recovery).appendRow([data.date, data.sleepHours || '', data.sleepQuality || '', data.fatigue || '', '', data.pain || '', data.energy || '', '', data.notes || '']);
}

function readRows(sheetName) {
  const sheet = getSheet(sheetName);
  const lastRow = sheet.getLastRow();
  const lastColumn = sheet.getLastColumn();
  return lastRow && lastColumn ? sheet.getRange(1, 1, lastRow, lastColumn).getDisplayValues() : [[]];
}

function getSheet(sheetName) {
  const sheet = SpreadsheetApp.openById(SPREADSHEET_ID).getSheetByName(sheetName);
  if (!sheet) throw new Error('No existe la pestaña: ' + sheetName);
  return sheet;
}

function requireFields(data, fields) {
  fields.forEach((field) => { if (data[field] === undefined || data[field] === null || data[field] === '') throw new Error('Falta completar: ' + field); });
}

function jsonResponse(payload) {
  return ContentService.createTextOutput(JSON.stringify(payload)).setMimeType(ContentService.MimeType.JSON);
}
