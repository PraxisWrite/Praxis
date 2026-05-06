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

function isOpenForStudentEditing(status) {
  return ["draft", "returned", "reopened"].includes(String(status || "").trim().toLowerCase());
}

function normalizeStudentVisibleSubmission(submission = {}) {
  if (!submission || typeof submission !== "object") return submission;
  if (!isOpenForStudentEditing(submission.status)) return submission;
  return {
    ...submission,
    teacher_review: createOpenTeacherReview(submission.teacher_review),
  };
}

module.exports = {
  createOpenTeacherReview,
  normalizeStudentVisibleSubmission,
  sanitizeStudentSubmissionPayload,
  sanitizeTeacherSubmissionPayload,
  STUDENT_SUBMISSION_ALLOWED_FIELDS,
  TEACHER_SUBMISSION_ALLOWED_FIELDS,
};
