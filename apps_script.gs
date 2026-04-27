/**
 * Persona Matching Experiment v4 — Google Sheets Backend
 *
 * 部署步骤:
 * 1. 打开 Google Sheets，新建一个空白表格
 * 2. 点击 "扩展程序 > Apps Script"
 * 3. 粘贴此文件全部代码
 * 4. 点击 "部署 > 新部署 > 网页应用"，执行身份设为"我"，访问权限设为"任何人"
 * 5. 复制部署 URL（以 /exec 结尾），填入下方的 GAS_URL 占位符
 */

// ========== 每页列名 ==========
// 与 analyze_results_v4.py 的 trials CSV 字段对齐
const TRIAL_HEADERS = [
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

// 每个 question 的顶层字段记录一次
const META_HEADERS = [
  "questions_file",
  "audio_dir",
  "total_questions",
  "answered",
  "correct",
  "accuracy",
];

function doPost(e) {
  try {
    const payload = JSON.parse(e.postData.contents);
    return handleSubmission(payload);
  } catch (err) {
    return ContentService.createTextOutput(
      JSON.stringify({ ok: false, error: err.message })
    ).setMimeType(ContentService.MimeType.JSON);
  }
}

// GET 用于连接测试
function doGet(e) {
  return ContentService.createTextOutput(
    JSON.stringify({ ok: true, message: "Persona Matching Experiment backend is alive." })
  ).setMimeType(ContentService.MimeType.JSON);
}

function handleSubmission(payload) {
  const sheet = SpreadsheetApp.getActiveSpreadsheet();
  const trialSheet = ensureSheet(sheet, "trials", TRIAL_HEADERS);
  const metaSheet = ensureSheet(sheet, "meta", META_HEADERS);

  const trials = payload.question_results || [];
  if (!Array.isArray(trials) || trials.length === 0) {
    return ContentService.createTextOutput(
      JSON.stringify({ ok: false, error: "Empty question_results" })
    ).setMimeType(ContentService.MimeType.JSON);
  }

  const timestamp = payload.timestamp || new Date().toISOString();
  const participantId = Utilities.getUuid();

  // 逐行写入 trials
  const trialRows = trials.map(function (trial) {
    return TRIAL_HEADERS.map(function (h) {
      if (h === "timestamp") return timestamp;
      if (h === "participant_id") return participantId;
      if (h === "is_correct") return trial.is_correct === true ? "TRUE" : trial.is_correct === false ? "FALSE" : "";
      if (h === "response_time_ms") return trial.response_time_ms != null ? trial.response_time_ms : "";
      const val = trial[h] != null ? trial[h] : "";
      return typeof val === "string" ? val : JSON.stringify(val);
    });
  });

  if (trialRows.length > 0) {
    trialSheet
      .getRange(trialSheet.getLastRow() + 1, 1, trialRows.length, TRIAL_HEADERS.length)
      .setValues(trialRows);
  }

  // 写入一条 meta
  const metaRow = META_HEADERS.map(function (h) {
    if (h === "timestamp") return timestamp;
    if (h === "participant_id") return participantId;
    const val = payload[h] != null ? payload[h] : "";
    return typeof val === "string" ? val : JSON.stringify(val);
  });
  metaSheet
    .getRange(metaSheet.getLastRow() + 1, 1, 1, META_HEADERS.length)
    .setValues([metaRow]);

  return ContentService.createTextOutput(
    JSON.stringify({ ok: true, participant_id: participantId, trials_saved: trialRows.length })
  ).setMimeType(ContentService.MimeType.JSON);
}

function ensureSheet(spreadsheet, name, headers) {
  let sheet = spreadsheet.getSheetByName(name);
  if (!sheet) {
    sheet = spreadsheet.insertSheet(name);
    sheet.appendRow(headers);
  } else if (sheet.getLastRow() === 0) {
    sheet.appendRow(headers);
  }
  return sheet;
}
