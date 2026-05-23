const test = require("node:test");
const assert = require("node:assert/strict");

function loadApiServiceWithFetch(apiFetch) {
  delete require.cache[require.resolve("../api-service.js")];
  globalThis.CoreUtils = { safeArray: (value) => Array.isArray(value) ? value : [] };
  globalThis.Auth = { apiFetch };
  return require("../api-service.js");
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
