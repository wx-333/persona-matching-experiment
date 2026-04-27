/**
 * Persona Matching Experiment v4 — Google Sheets Backend
 *
 * 部署步骤:
 * 1. 打开 Google Sheets，新建一个空白表格，复制 URL 中的表格 ID
 *    → URL 格式: https://docs.google.com/spreadsheets/d/{表格ID}/edit
 * 2. 菜单: "扩展程序 > Apps Script"
 * 3. 粘贴此文件全部代码，替换 YOUR_SPREADSHEET_ID 为你的表格 ID
 * 4. 点击 "部署 > 新部署 > 网页应用"，执行身份设为"我"，访问权限设为"任何人"
 * 5. 复制部署 URL（以 /exec 结尾），填入前端 HTML 的 GAS_URL 占位符
 */

// ========== 你的 Google Sheets 表格 ID ==========
// 从表格 URL 中复制: https://docs.google.com/spreadsheets/d/{这个ID}/edit
var SPREADSHEET_ID = 'YOUR_SPREADSHEET_ID';

// ========== 每页列名 ==========
// 与 analyze_results_v4.py 的 trials CSV 字段对齐
var TRIAL_HEADERS = [
  "timestamp",
  "participant_id",
  "question_id",
  "order",
  "task_type",
  "target_dimension",
  "prompt_text",
  "text_content",
  "audio_A",
  "audio_B",
  "selected_answer",
  "correct_answer",
  "is_correct",
  "response_time_ms",
];

var META_HEADERS = [
  "questions_file",
  "audio_dir",
  "total_questions",
  "answered",
  "correct",
  "accuracy",
];

function getSpreadsheet_() {
  // 容器绑定脚本优先用 getActiveSpreadsheet，否则用 openById
  try {
    var ss = SpreadsheetApp.getActiveSpreadsheet();
    if (ss) return ss;
  } catch (e) {}
  return SpreadsheetApp.openById(SPREADSHEET_ID);
}

function doPost(e) {
  try {
    var payload = JSON.parse(e.postData.contents);
    return handleSubmission_(payload);
  } catch (err) {
    return ContentService.createTextOutput(
      JSON.stringify({ ok: false, error: err.message })
    ).setMimeType(ContentService.MimeType.JSON);
  }
}

function doGet(e) {
  return ContentService.createTextOutput(
    JSON.stringify({ ok: true, message: "Persona Matching Experiment backend is alive." })
  ).setMimeType(ContentService.MimeType.JSON);
}

function handleSubmission_(payload) {
  var sheet = getSpreadsheet_();
  var trialSheet = ensureSheet_(sheet, "trials", TRIAL_HEADERS);
  var metaSheet = ensureSheet_(sheet, "meta", META_HEADERS);

  var trials = payload.question_results || [];
  if (!Array.isArray(trials) || trials.length === 0) {
    return ContentService.createTextOutput(
      JSON.stringify({ ok: false, error: "Empty question_results" })
    ).setMimeType(ContentService.MimeType.JSON);
  }

  var timestamp = payload.timestamp || new Date().toISOString();
  var participantId = Utilities.getUuid();

  var trialRows = trials.map(function (trial) {
    return TRIAL_HEADERS.map(function (h) {
      if (h === "timestamp") return timestamp;
      if (h === "participant_id") return participantId;
      if (h === "is_correct") return trial.is_correct === true ? "TRUE" : trial.is_correct === false ? "FALSE" : "";
      if (h === "response_time_ms") return trial.response_time_ms != null ? trial.response_time_ms : "";
      var val = trial[h] != null ? trial[h] : "";
      return typeof val === "string" ? val : JSON.stringify(val);
    });
  });

  if (trialRows.length > 0) {
    trialSheet
      .getRange(trialSheet.getLastRow() + 1, 1, trialRows.length, TRIAL_HEADERS.length)
      .setValues(trialRows);
  }

  var metaRow = META_HEADERS.map(function (h) {
    if (h === "timestamp") return timestamp;
    if (h === "participant_id") return participantId;
    var val = payload[h] != null ? payload[h] : "";
    return typeof val === "string" ? val : JSON.stringify(val);
  });
  metaSheet
    .getRange(metaSheet.getLastRow() + 1, 1, 1, META_HEADERS.length)
    .setValues([metaRow]);

  return ContentService.createTextOutput(
    JSON.stringify({ ok: true, participant_id: participantId, trials_saved: trialRows.length })
  ).setMimeType(ContentService.MimeType.JSON);
}

function ensureSheet_(spreadsheet, name, headers) {
  var sheet = spreadsheet.getSheetByName(name);
  if (!sheet) {
    sheet = spreadsheet.insertSheet(name);
    sheet.appendRow(headers);
  } else if (sheet.getLastRow() === 0) {
    sheet.appendRow(headers);
  }
  return sheet;
}
