const { test } = require("@playwright/test");
const {
  hasAllCredentials,
  runCrossRoleFlow,
  verifyStudentSubmissionAppeared,
} = require("./helpers");

test.describe("Cross-role smoke: teacher creates, student submits", () => {
  test.skip(!hasAllCredentials(), "Set all four TEACHER_* and STUDENT_* secrets to run the cross-role smoke.");

  test("teacher creates and publishes, student opens and submits", async ({ browser }, testInfo) => {
    // Exercises the full student workflow (chat, draft, AI feedback, submit)
    // and confirms the submission surfaces in the teacher's review list.
    // Grading is omitted — the AI suggest-scores panel is tested in full-flow.spec.js.
    test.setTimeout(360_000);
    const title = `E2E Smoke ${Date.now()}`;
    await runCrossRoleFlow(browser, testInfo, title, (teacherPage) =>
      verifyStudentSubmissionAppeared(teacherPage, title)
    );
  });
});
