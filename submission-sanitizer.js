const TEACHER_SUBMISSION_ALLOWED_FIELDS = new Set([
  'idea_responses',
  'draft_text',
  'final_text',
  'reflections',
  'outline',
  'chat_history',
  'writing_events',
  'feedback_history',
  'focus_annotations',
  'teacher_review',
  'self_assessment',
  'status',
  'chat_started_at',
  'chat_skipped_at',
  'chat_expired_at',
  'chat_elapsed_ms',
  'started_at',
  'submitted_at',
  'keystroke_log',
  'fluency_summary',
  'final_unlocked',
]);

const STUDENT_SUBMISSION_ALLOWED_FIELDS = new Set([
  'idea_responses',
  'draft_text',
  'final_text',
  'reflections',
  'outline',
  'chat_history',
  'writing_events',
  'feedback_history',
  'focus_annotations',
  'self_assessment',
  'chat_started_at',
  'chat_skipped_at',
  'chat_expired_at',
  'chat_elapsed_ms',
  'started_at',
  'keystroke_log',
  'fluency_summary',
  'final_unlocked',
]);

// Research archive de-identification (IRB): the long-term archive may hold
// only timing/process data — never text of student work. Revision events
// embed text via insertedText / removedText / preview, so every event is
// reduced to this whitelist before it reaches public.submission_archive.
const ARCHIVE_WRITING_EVENT_ALLOWED_KEYS = ['id', 'type', 'timestamp', 'start', 'end', 'delta', 'flagged'];

// Keystroke events are timing-only ({at, gap}) by construction, but whitelist
// them anyway so a future client field can never smuggle text into the archive.
const ARCHIVE_KEYSTROKE_EVENT_ALLOWED_KEYS = ['at', 'gap'];

function pickAllowedKeys(event, allowedKeys) {
  if (!event || typeof event !== 'object' || Array.isArray(event)) return {};
  const stripped = {};
  for (const key of allowedKeys) {
    if (event[key] !== undefined) stripped[key] = event[key];
  }
  return stripped;
}

function stripWritingEventsForArchive(events) {
  if (!Array.isArray(events)) return [];
  return events.map((event) => pickAllowedKeys(event, ARCHIVE_WRITING_EVENT_ALLOWED_KEYS));
}

function stripKeystrokeLogForArchive(events) {
  if (!Array.isArray(events)) return [];
  return events.map((event) => pickAllowedKeys(event, ARCHIVE_KEYSTROKE_EVENT_ALLOWED_KEYS));
}

// Builds one de-identified submission_archive row. studentToken must be a
// freshly generated random UUID (never derived from the student id) and
// analysis is the linked submission_process_analyses row, if any.
function buildDeidentifiedArchiveRow(submission, { reason, classId = null, studentToken, analysis = {} }) {
  return {
    original_submission_id: submission.id,
    assignment_id: submission.assignment_id ?? null,
    class_id: classId,
    student_token: studentToken,
    status: submission.status ?? null,
    writing_events: stripWritingEventsForArchive(submission.writing_events),
    keystroke_log: stripKeystrokeLogForArchive(submission.keystroke_log),
    fluency_summary: submission.fluency_summary ?? {},
    analysis_version: analysis?.analysis_version ?? null,
    metrics: analysis?.metrics ?? {},
    original_submitted_at: submission.submitted_at ?? null,
    original_started_at: submission.started_at ?? null,
    original_updated_at: submission.updated_at ?? null,
    archive_reason: reason,
  };
}

function sanitizePayload(payload = {}, allowedFields = new Set()) {
  return Object.fromEntries(
    Object.entries(payload || {}).filter(([key, value]) => allowedFields.has(key) && value !== undefined)
  );
}

function sanitizeTeacherSubmissionPayload(payload = {}) {
  return sanitizePayload(payload, TEACHER_SUBMISSION_ALLOWED_FIELDS);
}

function sanitizeStudentSubmissionPayload(payload = {}) {
  return sanitizePayload(payload, STUDENT_SUBMISSION_ALLOWED_FIELDS);
}

function createOpenTeacherReview(review = {}) {
  return {
    ...review,
    status: "ungraded",
    rowScores: [],
    suggestedRowScores: [],
    suggestedGrade: null,
    finalScore: "",
    finalNotes: "",
    annotations: [],
    savedAt: null,
    acceptedAt: null,
  };
}

function getReviewRowScores(review = {}) {
  return Array.isArray(review.rowScores)
    ? review.rowScores
    : (Array.isArray(review.row_scores) ? review.row_scores : []);
}

function isOpenTeacherReview(review = {}) {
  const reviewStatus = String(review.status || "").trim().toLowerCase();
  const hasSavedAt = Boolean(review.savedAt || review.saved_at);
  const finalScore = review.finalScore ?? review.final_score ?? "";
  const finalNotes = String(review.finalNotes || review.final_notes || "").trim();
  const rowScores = getReviewRowScores(review);
  const annotations = Array.isArray(review.annotations) ? review.annotations : [];
  return ["", "draft", "ungraded", "returned", "reopened"].includes(reviewStatus)
    && !hasSavedAt
    && finalScore === ""
    && !finalNotes
    && rowScores.length === 0
    && annotations.length === 0;
}

function isOpenForStudentEditing(status) {
  return ["draft", "returned", "reopened"].includes(String(status || "").trim().toLowerCase());
}

function normalizeStudentVisibleSubmission(submission = {}) {
  if (!submission || typeof submission !== "object") return submission;
  const status = String(submission.status || "").trim().toLowerCase();
  const review = submission.teacher_review || {};
  const shouldTreatAsOpen = isOpenForStudentEditing(status)
    || (status === "graded" && isOpenTeacherReview(review));
  if (!shouldTreatAsOpen) return submission;
  return {
    ...submission,
    status: status === "graded" ? "draft" : submission.status,
    teacher_review: createOpenTeacherReview(submission.teacher_review),
  };
}

module.exports = {
  buildDeidentifiedArchiveRow,
  stripKeystrokeLogForArchive,
  stripWritingEventsForArchive,
  createOpenTeacherReview,
  isOpenTeacherReview,
  normalizeStudentVisibleSubmission,
  sanitizeStudentSubmissionPayload,
  sanitizeTeacherSubmissionPayload,
  STUDENT_SUBMISSION_ALLOWED_FIELDS,
  TEACHER_SUBMISSION_ALLOWED_FIELDS,
};
