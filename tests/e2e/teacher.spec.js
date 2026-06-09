const { test, expect } = require("@playwright/test");
const {
  hasCredentials,
  login,
  selectTeacherTestClass,
  createAndPublishAssignment,
  deleteAssignment,
  collectPageErrors,
} = require("./helpers");

test.describe("Teacher workflow", () => {
  test.skip(!hasCredentials("teacher"), "Set TEACHER_EMAIL and TEACHER_PASSWORD to run teacher tests.");

  test("teacher dashboard loads after login", async ({ page }) => {
    const { getErrors } = collectPageErrors(page);
    await login(page, "teacher");

    await expect(page.getByText(/class work/i).first()).toBeVisible({ timeout: 20_000 });
    await expect(page.locator(".topbar").getByText(/current class:/i)).toBeVisible();
    expect(getErrors(), "no JS errors on teacher dashboard").toEqual([]);
  });

  test("teacher can navigate to the existing test class", async ({ page }) => {
    const { getErrors } = collectPageErrors(page);
    await login(page, "teacher");
    await selectTeacherTestClass(page);

    await expect(page.getByRole("heading", { name: /^assignments$/i })).toBeVisible();
    expect(getErrors(), "no JS errors after class navigation").toEqual([]);
  });

  test("teacher can create and publish a new assignment", async ({ page }) => {
    const { getErrors } = collectPageErrors(page);
    const title = `E2E Teacher Assignment ${Date.now()}`;

    await login(page, "teacher");
    await createAndPublishAssignment(page, title);

    await expect(page.locator(".assignment-card").filter({ hasText: title }).first()).toContainText(/published/i);
    expect(getErrors(), "no JS errors during create+publish flow").toEqual([]);

    try { await deleteAssignment(page, title); } catch (e) { console.warn("Cleanup: could not delete test assignment:", e.message); }
  });

  test("teacher can view their assignments list", async ({ page }) => {
    const { getErrors } = collectPageErrors(page);
    await login(page, "teacher");
    await selectTeacherTestClass(page);

    await expect(page.getByRole("heading", { name: /^assignments$/i })).toBeVisible({ timeout: 20_000 });
    expect(getErrors(), "no JS errors on assignments list").toEqual([]);
  });

  test("teacher grading panel renders for an existing submission", async ({ page }) => {
    const { getErrors } = collectPageErrors(page);
    await login(page, "teacher");
    await selectTeacherTestClass(page);

    // VERIFY: This test scopes to any assignment that has at least one submission.
    // It does NOT trigger the "Suggest rubric scores" AI panel (that's flake-prone).
    // The intent is to catch render regressions in the grading view itself.
    const reviewButton = page.getByRole("button", { name: /review students/i }).first();
    if (!(await reviewButton.count())) {
      test.skip(true, "No assignments with review-students button in test class.");
    }
    await reviewButton.click();

    // "Review students" opens the grading workspace; students live in the rail.
    const submittedStudent = page.locator(".rail-student").filter({ hasText: /submitted/i }).first();
    if (!(await submittedStudent.count())) {
      test.skip(true, "No submitted submissions in test class.");
    }
    await submittedStudent.click();

    // Grading view: student text panel + rubric must render without errors.
    await expect(page.getByText(/student text/i).first()).toBeVisible({ timeout: 20_000 });
    expect(getErrors(), "no JS errors when opening grading panel").toEqual([]);
  });
});
