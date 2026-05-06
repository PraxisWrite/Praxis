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
  createOpenTeacherReview,
  isOpenTeacherReview,
  normalizeStudentVisibleSubmission,
  sanitizeStudentSubmissionPayload,
  sanitizeTeacherSubmissionPayload,
  STUDENT_SUBMISSION_ALLOWED_FIELDS,
  TEACHER_SUBMISSION_ALLOWED_FIELDS,
};
