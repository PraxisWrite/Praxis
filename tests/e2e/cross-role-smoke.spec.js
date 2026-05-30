const { test, expect } = require("@playwright/test");
const {
  hasAllCredentials,
  login,
  selectTeacherTestClass,
  createAndPublishAssignment,
  openStudentAssignment,
  completeStudentDraftFlow,
  deleteAssignment,
} = require("./helpers");

test.describe("Cross-role smoke: teacher creates, student submits", () => {
  test.skip(!hasAllCredentials(), "Set all four TEACHER_* and STUDENT_* secrets to run the cross-role smoke.");

  test("teacher creates and publishes, student opens and submits", async ({ browser }, testInfo) => {
    // Exercises the full student workflow (chat, draft, AI feedback, submit)
    // and confirms the submission surfaces in the teacher's review list.
    // Grading is omitted — the AI suggest-scores panel is tested in full-flow.spec.js.
    test.setTimeout(360_000);

    const title = `E2E Smoke ${Date.now()}`;

    const teacherContext = await browser.newContext();
    const studentContext = await browser.newContext();
    const teacherPage = await teacherContext.newPage();
    const studentPage = await studentContext.newPage();

    try {
      await login(teacherPage, "teacher");
      await createAndPublishAssignment(teacherPage, title);
      await teacherContext.storageState({ path: testInfo.outputPath("teacher-storage-state.json") });

      await login(studentPage, "student");
      await openStudentAssignment(studentPage, title);
      await completeStudentDraftFlow(studentPage);

      // Reload the teacher view and confirm the submission landed.
      await teacherPage.reload();
      await selectTeacherTestClass(teacherPage);
      const assignmentCard = teacherPage.locator(".assignment-card").filter({ hasText: title }).first();
      await expect(assignmentCard).toBeVisible({ timeout: 30_000 });
      await assignmentCard.getByRole("button", { name: /review students/i }).click();
      await expect(
        teacherPage.locator(".submission-card").filter({ hasText: /submitted/i }).first()
      ).toBeVisible({ timeout: 30_000 });
    } finally {
      try { await deleteAssignment(teacherPage, title); } catch (e) { console.warn("Cleanup:", e.message); }
      await studentContext.close();
      await teacherContext.close();
    }
  });
});
