const { test, expect } = require("@playwright/test");
const {
  hasAllCredentials,
  runCrossRoleFlow,
  gradeSubmittedAssignment,
} = require("./helpers");

test.describe("Full teacher to student to teacher flow", () => {
  test.skip(!hasAllCredentials(), "Set all four TEACHER_* and STUDENT_* secrets to run the full flow.");

  test("teacher creates, student submits, and teacher grades an assignment", async ({ browser }, testInfo) => {
    // VERIFY: This was previously skipped due to a flake on the AI suggestion
    // panel in the grading step. Re-enabling to see whether recent refactors
    // (AppState bridge, teacher-assist extraction, abort-controller logic in
    // requestAiGenerate) have fixed it. If it still flakes, re-skip it.
    //
    // This path intentionally exercises multiple AI-backed calls, so it needs a
    // longer timeout than the smaller smoke tests.
    test.setTimeout(420_000);
    const title = `E2E Test Assignment ${Date.now()}`;
    await runCrossRoleFlow(browser, testInfo, title, async (teacherPage) => {
      await gradeSubmittedAssignment(teacherPage, title);
      await expect(teacherPage.getByText(/last saved/i).first()).toBeVisible();
    });
  });
});
