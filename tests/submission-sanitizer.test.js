const test = require("node:test");
const assert = require("node:assert/strict");

const {
  buildDeidentifiedArchiveRow,
  stripKeystrokeLogForArchive,
  stripWritingEventsForArchive,
} = require("../submission-sanitizer");

test("stripWritingEventsForArchive removes every text payload but keeps process fields", () => {
  const events = [
    {
      id: "ev-1",
      type: "insert",
      timestamp: "2026-06-01T10:00:00Z",
      start: 12,
      end: 30,
      delta: 18,
      flagged: true,
      insertedText: "the whole pasted paragraph",
      removedText: "old words",
      preview: "the whole pasted…",
      field: "draft",
      phase: "draft",
      detectionReason: "clipboard",
    },
  ];
  const stripped = stripWritingEventsForArchive(events);
  assert.deepEqual(stripped, [
    {
      id: "ev-1",
      type: "insert",
      timestamp: "2026-06-01T10:00:00Z",
      start: 12,
      end: 30,
      delta: 18,
      flagged: true,
    },
  ]);
});

test("stripWritingEventsForArchive tolerates malformed input", () => {
  assert.deepEqual(stripWritingEventsForArchive(null), []);
  assert.deepEqual(stripWritingEventsForArchive("not-an-array"), []);
  assert.deepEqual(stripWritingEventsForArchive([null, "text", 7]), [{}, {}, {}]);
});

test("stripKeystrokeLogForArchive keeps only timing fields", () => {
  const stripped = stripKeystrokeLogForArchive([
    { at: 1200, gap: 80, smuggledText: "hello" },
    { at: 1300, gap: 100 },
  ]);
  assert.deepEqual(stripped, [
    { at: 1200, gap: 80 },
    { at: 1300, gap: 100 },
  ]);
});

test("buildDeidentifiedArchiveRow keeps only process data under the random token", () => {
  const submission = {
    id: "sub-1",
    assignment_id: "assign-1",
    student_id: "student-secret-id",
    status: "graded",
    draft_text: "my draft",
    final_text: "my final essay",
    chat_history: [{ role: "user", content: "help" }],
    reflections: { improved: "I fixed my verbs" },
    outline: { partOne: "intro" },
    self_assessment: { confidence: 4 },
    teacher_review: { finalNotes: "well done" },
    feedback_history: [{ text: "feedback" }],
    writing_events: [{ id: "ev-1", type: "insert", insertedText: "secret" }],
    keystroke_log: [{ at: 10, gap: 5 }],
    fluency_summary: { wpm: 22 },
    submitted_at: "2026-06-02T09:00:00Z",
    started_at: "2026-06-02T08:00:00Z",
    updated_at: "2026-06-02T09:05:00Z",
  };
  const row = buildDeidentifiedArchiveRow(submission, {
    reason: "assignment_deleted",
    classId: "class-1",
    studentToken: "11111111-2222-3333-4444-555555555555",
    analysis: { analysis_version: "v3", metrics: { typingRate: 90 } },
  });

  assert.equal(row.student_token, "11111111-2222-3333-4444-555555555555");
  assert.equal(row.archive_reason, "assignment_deleted");
  assert.equal(row.class_id, "class-1");
  assert.equal(row.analysis_version, "v3");
  assert.deepEqual(row.metrics, { typingRate: 90 });
  assert.deepEqual(row.writing_events, [{ id: "ev-1", type: "insert" }]);
  assert.deepEqual(row.keystroke_log, [{ at: 10, gap: 5 }]);
  assert.equal(row.original_submitted_at, "2026-06-02T09:00:00Z");

  // The archive row must never carry identity or text content.
  const serialized = JSON.stringify(row);
  for (const banned of ["student-secret-id", "my draft", "my final essay", "help", "I fixed my verbs", "intro", "well done", "feedback", "secret"]) {
    assert.ok(!serialized.includes(banned), `archive row leaked: ${banned}`);
  }
  for (const bannedKey of ["student_id", "archived_by", "draft_text", "final_text", "chat_history", "reflections", "outline", "self_assessment", "teacher_review", "feedback_history", "submission_snapshot"]) {
    assert.ok(!(bannedKey in row), `archive row has banned column: ${bannedKey}`);
  }
});

test("buildDeidentifiedArchiveRow defaults cleanly when no analysis row exists", () => {
  const row = buildDeidentifiedArchiveRow(
    { id: "sub-2", status: "draft" },
    { reason: "class_deleted", studentToken: "tok" }
  );
  assert.equal(row.analysis_version, null);
  assert.deepEqual(row.metrics, {});
  assert.deepEqual(row.writing_events, []);
  assert.deepEqual(row.keystroke_log, []);
  assert.equal(row.class_id, null);
});
