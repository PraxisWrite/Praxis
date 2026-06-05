const test = require("node:test");
const assert = require("node:assert/strict");

function loadApiServiceWithFetch(apiFetch) {
  delete require.cache[require.resolve("../public/api-service.js")];
  globalThis.CoreUtils = { safeArray: (value) => Array.isArray(value) ? value : [] };
  globalThis.Auth = { apiFetch };
  return require("../public/api-service.js");
}

function createSubmission(overrides = {}) {
  return {
    id: "submission-local",
    assignmentId: "assignment-1",
    draftText: "Draft text",
    ...overrides,
  };
}

test("syncStudentSubmission loads the student row before patching a local submission", async () => {
  const calls = [];
  const apiService = loadApiServiceWithFetch(async (path, options = {}) => {
    calls.push({ path, options });
    if (path === "/api/assignments/assignment-1/my-submission") {
      return { submission: { id: "server-1", assignment_id: "assignment-1", student_id: "student-1" } };
    }
    if (path === "/api/submissions/server-1") {
      return {
        submission: {
          id: "server-1",
          assignment_id: "assignment-1",
          student_id: "student-1",
          draft_text: "Draft text",
        },
      };
    }
    throw new Error(`Unexpected path: ${path}`);
  });

  const result = await apiService.syncStudentSubmission(createSubmission());

  assert.equal(result.id, "server-1");
  assert.deepEqual(calls.map(({ path }) => path), [
    "/api/assignments/assignment-1/my-submission",
    "/api/submissions/server-1",
  ]);
});

test("syncStudentSubmission retries with a refreshed server id when the cached id fails", async () => {
  const calls = [];
  const apiService = loadApiServiceWithFetch(async (path, options = {}) => {
    calls.push({ path, options });
    if (path === "/api/submissions/stale-server-id") {
      return { error: "Submission not found" };
    }
    if (path === "/api/assignments/assignment-1/my-submission") {
      return { submission: { id: "server-2", assignment_id: "assignment-1", student_id: "student-1" } };
    }
    if (path === "/api/submissions/server-2") {
      return {
        submission: {
          id: "server-2",
          assignment_id: "assignment-1",
          student_id: "student-1",
          draft_text: "Draft text",
        },
      };
    }
    throw new Error(`Unexpected path: ${path}`);
  });

  const result = await apiService.syncStudentSubmission(createSubmission({ id: "stale-server-id" }));

  assert.equal(result.id, "server-2");
  assert.deepEqual(calls.map(({ path }) => path), [
    "/api/submissions/stale-server-id",
    "/api/assignments/assignment-1/my-submission",
    "/api/submissions/server-2",
  ]);
});

test("syncStudentSubmission sends the full event arrays on the first sync, then only appends", async () => {
  const bodies = [];
  const apiService = loadApiServiceWithFetch(async (path, options = {}) => {
    if (path === "/api/submissions/server-1") {
      bodies.push(JSON.parse(options.body));
      return {
        submission: {
          id: "server-1",
          assignment_id: "assignment-1",
          student_id: "student-1",
          updated_at: `t${bodies.length}`,
        },
      };
    }
    throw new Error(`Unexpected path: ${path}`);
  });

  const submission = createSubmission({
    id: "server-1",
    writingEvents: [{ i: 0 }, { i: 1 }],
    updatedAt: "t0",
  });

  // First sync: no cursor yet, so the whole array goes up to establish a baseline.
  await apiService.syncStudentSubmission(submission);
  assert.deepEqual(bodies[0].writing_events, [{ i: 0 }, { i: 1 }]);
  assert.equal(bodies[0].writing_events_append, undefined);

  // Student keeps writing; the next sync should carry only the new tail.
  submission.writingEvents.push({ i: 2 });
  await apiService.syncStudentSubmission(submission);
  assert.equal(bodies[1].writing_events, undefined);
  assert.deepEqual(bodies[1].writing_events_append, [{ i: 2 }]);
  assert.equal(bodies[1].writing_events_base, 2);
});

test("a newly generated feedback entry survives a conflict retry (regression)", async () => {
  // The student loads with no feedback, generates one entry, and the first sync
  // hits a 409 (its expected_updated_at is the freshly bumped local time). The
  // retry must keep the new entry, not overwrite it with the server's empty copy.
  const bodies = [];
  let serverTime = "t-load";
  const apiService = loadApiServiceWithFetch(async (path, options = {}) => {
    if (path === "/api/student/submissions?assignmentIds=assignment-1") {
      return { submissions: [{ id: "server-1", assignment_id: "assignment-1", student_id: "student-1", feedback_history: [], updated_at: serverTime }] };
    }
    if (path === "/api/assignments/assignment-1/my-submission") {
      return { submission: { id: "server-1", assignment_id: "assignment-1", student_id: "student-1", feedback_history: [], updated_at: serverTime } };
    }
    if (path === "/api/submissions/server-1") {
      const body = JSON.parse(options.body);
      bodies.push(body);
      // The optimistic-concurrency guard: stale expected_updated_at → conflict.
      if (body.expected_updated_at !== serverTime) {
        return { conflict: true, updated_at: serverTime };
      }
      const fb = body.feedback_history ?? [];
      serverTime = "t-after";
      return { submission: { id: "server-1", assignment_id: "assignment-1", student_id: "student-1", feedback_history: fb, updated_at: serverTime } };
    }
    throw new Error(`Unexpected path: ${path}`);
  });

  // Seed the baseline from the server load (feedback = []).
  await apiService.loadStudentSubmissions(["assignment-1"]);

  const submission = createSubmission({
    id: "server-1",
    feedbackHistory: [{ id: "fb-new", items: ["tip"] }],
    updatedAt: "t-local-bumped",
  });
  const result = await apiService.syncStudentSubmission(submission);

  // The conflicting first attempt, then the retry that preserves the new entry.
  assert.equal(bodies.length, 2);
  assert.deepEqual(result.feedbackHistory, [{ id: "fb-new", items: ["tip"] }]);
  assert.deepEqual(bodies[1].feedback_history, [{ id: "fb-new", items: ["tip"] }]);
});

test("stale local feedback does not resurrect a server-side reset", async () => {
  // The tab loaded when the server held two entries (baseline = 2). A teacher
  // then cleared feedback server-side. A later sync (driven by, e.g., typing)
  // hits a conflict; the retry must adopt the server's empty array, not re-push
  // the two stale local entries.
  const bodies = [];
  let serverTime = "t-load";
  let serverFeedback = [{ id: "old-1" }, { id: "old-2" }];
  const apiService = loadApiServiceWithFetch(async (path, options = {}) => {
    if (path === "/api/student/submissions?assignmentIds=assignment-1") {
      return { submissions: [{ id: "server-1", assignment_id: "assignment-1", student_id: "student-1", feedback_history: serverFeedback, updated_at: serverTime }] };
    }
    if (path === "/api/assignments/assignment-1/my-submission") {
      return { submission: { id: "server-1", assignment_id: "assignment-1", student_id: "student-1", feedback_history: serverFeedback, updated_at: serverTime } };
    }
    if (path === "/api/submissions/server-1") {
      const body = JSON.parse(options.body);
      bodies.push(body);
      if (body.expected_updated_at !== serverTime) {
        return { conflict: true, updated_at: serverTime };
      }
      const fb = body.feedback_history ?? serverFeedback;
      serverTime = "t-after";
      serverFeedback = fb;
      return { submission: { id: "server-1", assignment_id: "assignment-1", student_id: "student-1", feedback_history: fb, updated_at: serverTime } };
    }
    throw new Error(`Unexpected path: ${path}`);
  });

  // Load while the server still holds the two entries → baseline = 2.
  await apiService.loadStudentSubmissions(["assignment-1"]);

  // Teacher clears feedback server-side; the row's timestamp moves on.
  serverFeedback = [];
  serverTime = "t-reset";

  // The stale tab still has the two old entries in memory and syncs.
  const submission = createSubmission({
    id: "server-1",
    feedbackHistory: [{ id: "old-1" }, { id: "old-2" }],
    updatedAt: "t-local-old",
  });
  const result = await apiService.syncStudentSubmission(submission);

  assert.deepEqual(result.feedbackHistory, []);
  assert.deepEqual(bodies.at(-1).feedback_history, []);
});

test("loadAdminClassDetail normalizes missing admin arrays", async () => {
  const calls = [];
  const apiService = loadApiServiceWithFetch(async (path, options = {}) => {
    calls.push({ path, options });
    return { assignments: [{ id: "assignment-1" }] };
  });

  const result = await apiService.loadAdminClassDetail("class-1");

  assert.deepEqual(calls.map(({ path }) => path), [
    "/api/admin/classes/class-1/detail",
  ]);
  assert.deepEqual(result.assignments, [{ id: "assignment-1" }]);
  assert.deepEqual(result.members, []);
  assert.deepEqual(result.submissions, []);
});

test("admin service loads teachers and CEFR benchmarks from admin endpoints", async () => {
  const calls = [];
  const apiService = loadApiServiceWithFetch(async (path, options = {}) => {
    calls.push({ path, options });
    if (path === "/api/admin/teachers") {
      return { teachers: [{ id: "teacher-1" }] };
    }
    if (path === "/api/admin/writing-process/benchmarks") {
      return { byLevel: { B1: { included: 4 } } };
    }
    throw new Error(`Unexpected path: ${path}`);
  });

  const teachers = await apiService.loadAdminTeachers();
  const benchmarks = await apiService.loadAdminCefrBenchmarks();

  assert.deepEqual(teachers, [{ id: "teacher-1" }]);
  assert.deepEqual(benchmarks, { B1: { included: 4 } });
  assert.deepEqual(calls.map(({ path }) => path), [
    "/api/admin/teachers",
    "/api/admin/writing-process/benchmarks",
  ]);
});

test("admin service throws API errors with the server message", async () => {
  const apiService = loadApiServiceWithFetch(async () => ({
    error: "Admin access required",
  }));

  await assert.rejects(
    () => apiService.loadAdminTeachers(),
    /Admin access required/
  );
});

test("recomputeStaleAdminProcessAnalyses posts the requested limit", async () => {
  const calls = [];
  const apiService = loadApiServiceWithFetch(async (path, options = {}) => {
    calls.push({ path, options });
    return { result: { recomputed: 3 } };
  });

  const result = await apiService.recomputeStaleAdminProcessAnalyses({ limit: 25 });

  assert.deepEqual(result, { recomputed: 3 });
  assert.equal(calls[0].path, "/api/admin/process-analytics/recompute-stale");
  assert.equal(calls[0].options.method, "POST");
  assert.deepEqual(JSON.parse(calls[0].options.body), { limit: 25 });
});

test("updateAdminStudentFlags preserves migration metadata on API errors", async () => {
  const apiService = loadApiServiceWithFetch(async () => ({
    error: "Admin test-account flags are not active yet.",
    needsMigration: true,
    migration: "20260507_profile_admin_flags.sql",
  }));

  await assert.rejects(
    () => apiService.updateAdminStudentFlags("student-1", { isTestAccount: true }),
    (error) => {
      assert.equal(error.message, "Admin test-account flags are not active yet.");
      assert.equal(error.needsMigration, true);
      assert.equal(error.migration, "20260507_profile_admin_flags.sql");
      return true;
    }
  );
});

test("loadSubmissionDebugState builds a scoped debug query", async () => {
  const calls = [];
  const apiService = loadApiServiceWithFetch(async (path, options = {}) => {
    calls.push({ path, options });
    return { assignmentId: "assignment 1", studentId: "student 1" };
  });

  const result = await apiService.loadSubmissionDebugState("assignment 1", "student 1");

  assert.deepEqual(result, { assignmentId: "assignment 1", studentId: "student 1" });
  assert.deepEqual(calls.map(({ path }) => path), [
    "/api/debug/submission-state?assignmentId=assignment+1&studentId=student+1",
  ]);
});

test("loadSubmissionEmailDiagnosis builds the notification diagnosis query", async () => {
  const calls = [];
  const apiService = loadApiServiceWithFetch(async (path, options = {}) => {
    calls.push({ path, options });
    return { emailEnabled: true };
  });

  const result = await apiService.loadSubmissionEmailDiagnosis("assignment-1", "student-1");

  assert.deepEqual(result, { emailEnabled: true });
  assert.deepEqual(calls.map(({ path }) => path), [
    "/api/notifications/diagnose-submission?assignmentId=assignment-1&studentId=student-1",
  ]);
});

test("class read helpers load teacher classes, student classes, and members", async () => {
  const calls = [];
  const apiService = loadApiServiceWithFetch(async (path, options = {}) => {
    calls.push({ path, options });
    if (path === "/api/classes") {
      return { classes: [{ id: "teacher-class" }] };
    }
    if (path === "/api/student/classes") {
      return { classes: [{ id: "student-class" }] };
    }
    if (path === "/api/classes/class-1/members") {
      return { members: [{ id: "student-1" }] };
    }
    throw new Error(`Unexpected path: ${path}`);
  });

  assert.deepEqual(await apiService.loadTeacherClasses(), [{ id: "teacher-class" }]);
  assert.deepEqual(await apiService.loadStudentClasses(), [{ id: "student-class" }]);
  assert.deepEqual(await apiService.loadClassMembers("class-1"), [{ id: "student-1" }]);
  assert.deepEqual(calls.map(({ path }) => path), [
    "/api/classes",
    "/api/student/classes",
    "/api/classes/class-1/members",
  ]);
});

test("class read helpers throw server errors", async () => {
  const apiService = loadApiServiceWithFetch(async () => ({
    error: "Class access denied",
  }));

  await assert.rejects(
    () => apiService.loadClassMembers("class-1"),
    /Class access denied/
  );
});

test("createClass posts the trimmed name and returns the new class", async () => {
  const calls = [];
  const apiService = loadApiServiceWithFetch(async (path, options = {}) => {
    calls.push({ path, options });
    return { class: { id: "class-1", name: "Beginners" } };
  });

  const newClass = await apiService.createClass("  Beginners  ");

  assert.deepEqual(newClass, { id: "class-1", name: "Beginners" });
  assert.equal(calls[0].path, "/api/classes");
  assert.equal(calls[0].options.method, "POST");
  assert.deepEqual(JSON.parse(calls[0].options.body), { name: "Beginners" });
});

test("createClass rejects empty names without calling the server", async () => {
  let called = false;
  const apiService = loadApiServiceWithFetch(async () => {
    called = true;
    return {};
  });

  await assert.rejects(() => apiService.createClass("   "), /Missing class name/);
  assert.equal(called, false);
});

test("createClass surfaces server errors with the original message", async () => {
  const apiService = loadApiServiceWithFetch(async () => ({
    error: "Class name already in use",
  }));

  await assert.rejects(
    () => apiService.createClass("Beginners"),
    /Class name already in use/
  );
});

test("deleteClass sends DELETE to the class endpoint", async () => {
  const calls = [];
  const apiService = loadApiServiceWithFetch(async (path, options = {}) => {
    calls.push({ path, options });
    return { ok: true };
  });

  const result = await apiService.deleteClass("class-1");

  assert.deepEqual(result, { ok: true });
  assert.equal(calls[0].path, "/api/classes/class-1");
  assert.equal(calls[0].options.method, "DELETE");
});

test("deleteClass throws when the server returns an error", async () => {
  const apiService = loadApiServiceWithFetch(async () => ({
    error: "Class not found",
  }));

  await assert.rejects(() => apiService.deleteClass("class-1"), /Class not found/);
});

test("inviteStudent posts the trimmed email to the class members endpoint", async () => {
  const calls = [];
  const apiService = loadApiServiceWithFetch(async (path, options = {}) => {
    calls.push({ path, options });
    return { ok: true };
  });

  const result = await apiService.inviteStudent("class-1", "  student@example.com  ");

  assert.deepEqual(result, { ok: true });
  assert.equal(calls[0].path, "/api/classes/class-1/members");
  assert.equal(calls[0].options.method, "POST");
  assert.deepEqual(JSON.parse(calls[0].options.body), { studentEmail: "student@example.com" });
});

test("inviteStudent surfaces server errors", async () => {
  const apiService = loadApiServiceWithFetch(async () => ({
    error: "No matching student account",
  }));

  await assert.rejects(
    () => apiService.inviteStudent("class-1", "student@example.com"),
    /No matching student account/
  );
});

test("patchClassMember sends the supplied payload", async () => {
  const calls = [];
  const apiService = loadApiServiceWithFetch(async (path, options = {}) => {
    calls.push({ path, options });
    return { profile: { id: "student-1", name: "Renamed" } };
  });

  const result = await apiService.patchClassMember("class-1", "student-1", { name: "Renamed" });

  assert.deepEqual(result, { profile: { id: "student-1", name: "Renamed" } });
  assert.equal(calls[0].path, "/api/classes/class-1/members/student-1");
  assert.equal(calls[0].options.method, "PATCH");
  assert.deepEqual(JSON.parse(calls[0].options.body), { name: "Renamed" });
});

test("removeClassMember sends DELETE to the member endpoint", async () => {
  const calls = [];
  const apiService = loadApiServiceWithFetch(async (path, options = {}) => {
    calls.push({ path, options });
    return { ok: true };
  });

  const result = await apiService.removeClassMember("class-1", "student-1");

  assert.deepEqual(result, { ok: true });
  assert.equal(calls[0].path, "/api/classes/class-1/members/student-1");
  assert.equal(calls[0].options.method, "DELETE");
});

test("class write helpers reject missing ids", async () => {
  const apiService = loadApiServiceWithFetch(async () => ({}));

  await assert.rejects(() => apiService.deleteClass(""), /Missing class for delete/);
  await assert.rejects(() => apiService.inviteStudent("", "a@b.c"), /Missing class for invite/);
  await assert.rejects(() => apiService.inviteStudent("class-1", ""), /Missing student email/);
  await assert.rejects(
    () => apiService.patchClassMember("", "student-1", {}),
    /Missing class or student for member update/
  );
  await assert.rejects(
    () => apiService.removeClassMember("class-1", ""),
    /Missing class or student for member removal/
  );
});
