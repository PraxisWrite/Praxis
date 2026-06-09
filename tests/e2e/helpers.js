const { expect } = require("@playwright/test");

const TEST_CLASS_ID = "1bd11112-fb3b-4fa3-8317-e30dda9881bc";

function getCredentials(role) {
  const prefix = role.toUpperCase();
  return {
    email: process.env[`${prefix}_EMAIL`] || "",
    password: process.env[`${prefix}_PASSWORD`] || "",
  };
}

function hasCredentials(role) {
  const { email, password } = getCredentials(role);
  return Boolean(email && password);
}

function hasAllCredentials() {
  return hasCredentials("teacher") && hasCredentials("student");
}

async function login(page, role) {
  const { email, password } = getCredentials(role);

  await page.goto("/index.html");

  // The sign-in form uses placeholder text rather than visible labels.
  await page.getByPlaceholder("Email").first().fill(email);
  await page.getByPlaceholder("Password", { exact: true }).fill(password);

  // VERIFY: This scopes the button to the sign-in form because the auth tabs also
  // contain visible "Sign in" text.
  await page.locator("#auth-signin-form").getByRole("button", { name: /^sign in$/i }).click();

  // "Sign out" is now inside the avatar <details> dropdown and hidden until opened.
  // Wait for the avatar trigger (aria-label="Account menu") which is always visible
  // after a successful login. Use attribute selector — Playwright's getByRole('button')
  // does not match <summary> elements even when their implicit ARIA role is button.
  await expect(page.locator('[aria-label="Account menu"]')).toBeVisible({ timeout: 30_000 });
}

async function logout(page) {
  // Sign out is inside the avatar dropdown — open it first.
  const accountMenu = page.locator('[aria-label="Account menu"]');
  await accountMenu.click();
  await page.getByRole("button", { name: /sign out/i }).click();
  await expect(page.getByRole("button", { name: /^sign in$/i }).last()).toBeVisible({ timeout: 15_000 });
}

async function selectTeacherTestClass(page) {
  // VERIFY: The production test class is selected by its database id. This is more
  // stable than relying on a class name that may be renamed in the UI.
  const classSelect = page.locator(`select:has(option[value="${TEST_CLASS_ID}"])`).first();
  if (await classSelect.count()) {
    await classSelect.selectOption(TEST_CLASS_ID);
    await page.waitForLoadState("networkidle").catch(() => {});
  }

  // Scope to the .topbar class, not getByRole("banner"): the topbar <header> is
  // nested inside <main id="app">, so it no longer exposes an implicit banner role.
  await expect(page.locator(".topbar").getByText(/current class:/i)).toBeVisible({ timeout: 20_000 });
}

async function selectStudentTestClass(page) {
  // Student accounts may belong to more than one class, so switch explicitly when
  // the class dropdown is present.
  const studentClassSelect = page.getByLabel(/switch class/i);
  if (await studentClassSelect.count()) {
    await studentClassSelect.selectOption(TEST_CLASS_ID);
    await page.waitForLoadState("networkidle").catch(() => {});
  }
}

async function createAiAssistedAssignment(page, title) {
  const brief = [
    "Write one paragraph about a learning goal that matters to you.",
    "Aim for 250 to 400 words.",
    "Give one feedback check.",
    "Include a simple rubric that scores ideas, organization, and language.",
  ].join(" ");

  await page.locator("#teacher-brief").fill(brief);
  console.log("[TEACHER FLOW CHECKPOINT] AI brief filled");
  await page.getByRole("button", { name: /generate assignment draft/i }).click();
  console.log("[TEACHER FLOW CHECKPOINT] AI generation started");

  const generatedAssignment = page.locator("#teacher-generated-assignment");
  const generatedTitleInput = generatedAssignment.locator('[data-assist-field="title"]').first();
  await expect(generatedTitleInput).toBeVisible({ timeout: 90_000 });
  console.log("[TEACHER FLOW CHECKPOINT] AI generation completed");
  await generatedTitleInput.fill(title);
  console.log("[TEACHER FLOW CHECKPOINT] generated title overridden");

  // The generated path must include rubric rows so the student self-assessment step works.
  await expect(generatedAssignment.locator('[data-rubric-field="name"]').first()).toBeVisible({ timeout: 30_000 });
  console.log("[TEACHER FLOW CHECKPOINT] generated rubric visible");

  const saveButton = generatedAssignment.getByRole("button", { name: /^save assignment$/i });
  await expect(saveButton).toBeEnabled({ timeout: 60_000 });
  await saveButton.click();
  console.log("[TEACHER FLOW CHECKPOINT] generated assignment saved");

  // TODO: add data-testid="assignment-card" to assignment cards for stability.
  const assignmentCard = page.locator(".assignment-card").filter({ hasText: title }).first();
  await expect(assignmentCard).toBeVisible({ timeout: 30_000 });
  console.log("[TEACHER FLOW CHECKPOINT] assignment card visible");
}

async function publishAssignment(page, title) {
  // TODO: add data-testid="assignment-card" and data-testid="publish-assignment"
  // so this can stop relying on card text plus button text.
  const assignmentCard = page.locator(".assignment-card").filter({ hasText: title }).first();
  await expect(assignmentCard).toBeVisible({ timeout: 30_000 });

  const publishButton = assignmentCard.getByRole("button", { name: /^publish$/i });
  if (await publishButton.count()) {
    await publishButton.click();
  }

  await expect(assignmentCard.locator(".pill", { hasText: /^published$/i })).toBeVisible({ timeout: 30_000 });
}

async function createAndPublishAssignment(page, title) {
  await selectTeacherTestClass(page);
  await createAiAssistedAssignment(page, title);
  await publishAssignment(page, title);
}

async function openStudentAssignment(page, title) {
  await selectStudentTestClass(page);

  // The assignment tray (list view) lists each assignment as a row; open it by
  // clicking that row's action button.
  const assignmentRow = page.locator(".upcoming-assignment-row").filter({ hasText: title }).first();
  await expect(assignmentRow).toBeVisible({ timeout: 60_000 });

  await assignmentRow.locator('[data-action="open-assignment"]').first().click();
  await expect(page.getByRole("heading", { name: title })).toBeVisible({ timeout: 20_000 });
}

async function openFirstStudentAssignment(page) {
  await selectStudentTestClass(page);

  const firstOpenButton = page.locator('.assignment-tray [data-action="open-assignment"]').first();
  await expect(firstOpenButton, "student should have at least one published assignment").toBeVisible({ timeout: 20_000 });

  await firstOpenButton.click();
  await expect(page.getByText(/your task/i).first()).toBeVisible({ timeout: 20_000 });
}

async function sendChatMessage(page, message) {
  await page.getByPlaceholder(/type your answer here/i).fill(message);
  await page.getByRole("button", { name: /^send$/i }).click();

  await expect(page.getByText(message).first()).toBeVisible();

  // VERIFY: The loading dots use a CSS class rather than an accessible label.
  await expect(page.locator(".chat-loading")).toHaveCount(0, { timeout: 60_000 });
}

async function completeStudentDraftFlow(page) {
  const draftText = [
    "My learning goal is to become more confident when I write in English.",
    "This goal matters to me because I want people to understand my ideas without confusion.",
    "At the moment I can explain simple opinions, but sometimes my sentences are too short or not connected well.",
    "I will improve by planning before I write, checking my verbs, and adding examples after each main point.",
    "If I keep practising, I think my writing will become clearer and more organized.",
  ].join(" ");

  console.log("[STUDENT FLOW CHECKPOINT] starting chat");
  await sendChatMessage(page, "Hello, I have a question about the prompt");
  console.log("[STUDENT FLOW CHECKPOINT] first chat message sent");
  await sendChatMessage(page, "Thanks for the help");
  console.log("[STUDENT FLOW CHECKPOINT] second chat message sent");

  await page.getByRole("button", { name: /next:\s*write draft/i }).click();
  await expect(page.getByRole("heading", { name: /write your draft/i })).toBeVisible();
  console.log("[STUDENT FLOW CHECKPOINT] draft step opened");

  await page.getByPlaceholder(/start your draft here/i).fill(draftText);
  console.log("[STUDENT FLOW CHECKPOINT] draft filled");

  await page.locator('button[data-action="save-draft-and-next"]').click();
  console.log("[STUDENT FLOW CHECKPOINT] draft saved and next clicked");
  const feedbackModalButton = page.getByRole("button", { name: /yes, get ai feedback/i });
  const feedbackModalAppeared = await feedbackModalButton.waitFor({ state: "visible", timeout: 10_000 })
    .then(() => true)
    .catch(() => false);
  if (feedbackModalAppeared) {
    console.log("[STUDENT FLOW CHECKPOINT] draft feedback modal visible");
    await feedbackModalButton.click();
    console.log("[STUDENT FLOW CHECKPOINT] feedback modal accepted");
  } else {
    console.log("[STUDENT FLOW CHECKPOINT] draft feedback modal not shown");
  }
  await expect(page.getByRole("heading", { name: /write your final version and get ai feedback/i })).toBeVisible({ timeout: 30_000 });
  console.log("[STUDENT FLOW CHECKPOINT] feedback/final step opened");

  const feedbackCard = page.locator(".feedback-card");
  if (!feedbackModalAppeared) {
    const feedbackButton = page.getByRole("button", { name: /get ai feedback/i }).first();
    await expect(feedbackButton).toBeEnabled({ timeout: 10_000 });
    await feedbackButton.click();
    console.log("[STUDENT FLOW CHECKPOINT] manual feedback button clicked");
  }

  // TODO: add data-testid="feedback-card" so this waits on a stable element.
  await expect(feedbackCard).toHaveCount(1, { timeout: 90_000 });
  console.log("[STUDENT FLOW CHECKPOINT] AI feedback received");

  const finalEditor = page.getByPlaceholder(/write your final version here/i);
  await expect(finalEditor).toBeVisible();
  await finalEditor.fill(`${draftText} I also checked that my conclusion connects back to my main idea.`);
  console.log("[STUDENT FLOW CHECKPOINT] final text filled");

  // VERIFY: There are several "Next" buttons across the wizard; this one is scoped
  // by the current step's data-action because the visible label is intentionally simple.
  const finalNext = page.locator('button[data-action="student-next-step"][data-step="4"]');
  await expect(finalNext).toBeEnabled({ timeout: 15_000 });
  await finalNext.click();
  // The step-3→4 transition may prompt "get more AI feedback?" if the assignment
  // has remaining feedback checks. Dismiss it so the test reaches step 4 cleanly.
  const secondFeedbackModal = page.getByRole("button", { name: /continue without feedback/i });
  const secondModalAppeared = await secondFeedbackModal.waitFor({ state: "visible", timeout: 5_000 })
    .then(() => true)
    .catch(() => false);
  if (secondModalAppeared) {
    await secondFeedbackModal.click();
    console.log("[STUDENT FLOW CHECKPOINT] second feedback modal dismissed");
  }
  await expect(page.getByRole("heading", { name: /rate yourself and submit/i })).toBeVisible({ timeout: 15_000 });
  console.log("[STUDENT FLOW CHECKPOINT] self-assessment step opened");

  // TODO: add data-testid="self-assessment-rubric-option" to the rubric cells.
  const selfAssessmentButtons = page.locator('button[data-action="select-self-assessment-band"]');
  const criterionIds = await selfAssessmentButtons.evaluateAll((buttons) => {
    return [...new Set(buttons.map((button) => button.dataset.criterionId).filter(Boolean))];
  });
  console.log(`[STUDENT FLOW CHECKPOINT] found ${criterionIds.length} rubric criteria`);

  for (const criterionId of criterionIds) {
    await page
      .locator(`button[data-action="select-self-assessment-band"][data-criterion-id="${criterionId}"]`)
      .first()
      .click();
    await expect(
      page.locator(`button[data-action="select-self-assessment-band"][data-criterion-id="${criterionId}"].is-selected`),
    ).toHaveCount(1, { timeout: 5_000 });
    console.log(`[STUDENT FLOW CHECKPOINT] criterion ${criterionId} scored`);
  }
  console.log(`[STUDENT FLOW CHECKPOINT] all ${criterionIds.length} rubric scores selected`);

  const selfAssessmentScore = await page.locator(".rubric-schema-score").first().textContent();
  console.log(`[STUDENT FLOW CHECKPOINT] self-assessment score before submit: ${selfAssessmentScore?.trim()}`);
  await page.getByRole("button", { name: /submit assignment/i }).click();
  console.log("[STUDENT FLOW CHECKPOINT] submit clicked");

  await expect(page.getByText(/submitted!/i).first()).toBeVisible({ timeout: 45_000 });
  console.log("[STUDENT FLOW CHECKPOINT] submission confirmed");
}

async function gradeSubmittedAssignment(page, title) {
  await verifyStudentSubmissionAppeared(page, title);

  // The student rail is the click target: open the first student showing a
  // Submitted status. The whole rail row navigates into the grading view.
  await page.locator(".rail-student").filter({ hasText: /submitted/i }).first().click();

  await expect(page.getByText(/student text/i).first()).toBeVisible({ timeout: 20_000 });
  await page.getByRole("button", { name: /suggest rubric scores/i }).click();

  await expect(page.getByText(/ai suggested grade/i).first()).toBeVisible({ timeout: 90_000 });
  await page.getByRole("button", { name: /use this score/i }).click();
  await page.getByRole("button", { name: /^submit grade$/i }).click();

  // "Resubmit grade" only appears after savedAt is set by a successful grade
  // submission — unlike "last saved" which also appears from autosave alone.
  await expect(page.getByRole("button", { name: /^resubmit grade$/i })).toBeVisible({ timeout: 30_000 });
}

async function verifyStudentSubmissionAppeared(page, title) {
  await page.reload();
  await selectTeacherTestClass(page);
  const assignmentCard = page.locator(".assignment-card").filter({ hasText: title }).first();
  await expect(assignmentCard).toBeVisible({ timeout: 30_000 });
  await assignmentCard.getByRole("button", { name: /review students/i }).click();
  // "Review students" now opens the grading workspace; the student appears in
  // the persistent rail rather than a full-width submission card.
  await expect(
    page.locator(".rail-student").filter({ hasText: /submitted/i }).first()
  ).toBeVisible({ timeout: 30_000 });
}

// Shared scaffolding for tests that need both a teacher and student context.
// Creates both browser contexts, runs the common teacher-creates → student-submits
// path, calls onTeacherReturn(teacherPage) for test-specific assertions, then cleans up.
async function runCrossRoleFlow(browser, testInfo, title, onTeacherReturn) {
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

    await onTeacherReturn(teacherPage);
  } finally {
    try { await deleteAssignment(teacherPage, title); } catch (e) { console.warn("Cleanup:", e.message); }
    await studentContext.close();
    await teacherContext.close();
  }
}

async function deleteAssignment(page, title) {
  // Cleanup runs from a finally block, so the page may be mid-wizard or in a
  // failed state when a test bails early. Reload first to get a known dashboard
  // state — otherwise selectTeacherTestClass can't find the class banner and the
  // assignment is left orphaned in the test class.
  await page.goto("/index.html");
  await selectTeacherTestClass(page);
  const assignmentCard = page.locator(".assignment-card").filter({ hasText: title }).first();
  if (!(await assignmentCard.count())) return;
  page.once("dialog", (dialog) => dialog.accept());
  await assignmentCard.getByRole("button", { name: /^delete$/i }).click();
  await expect(assignmentCard).toHaveCount(0, { timeout: 15_000 });
}

// Attaches console.error and uncaught-exception listeners to a page.
// Returns a getter so tests can assert on collected errors after the fact.
// Filters out known noisy-but-harmless browser messages.
function collectPageErrors(page) {
  const errors = [];

  page.on("pageerror", (err) => {
    errors.push(`[uncaught] ${err.message}`);
  });

  page.on("console", (msg) => {
    if (msg.type() !== "error") return;
    const text = msg.text();
    // Ignore browser-level noise that isn't caused by app code.
    if (/favicon|net::ERR_|Failed to load resource/.test(text)) return;
    errors.push(`[console.error] ${text}`);
  });

  return { getErrors: () => errors };
}

module.exports = {
  TEST_CLASS_ID,
  getCredentials,
  hasCredentials,
  hasAllCredentials,
  login,
  logout,
  selectTeacherTestClass,
  selectStudentTestClass,
  createAndPublishAssignment,
  openFirstStudentAssignment,
  openStudentAssignment,
  completeStudentDraftFlow,
  verifyStudentSubmissionAppeared,
  runCrossRoleFlow,
  gradeSubmittedAssignment,
  deleteAssignment,
  collectPageErrors,
};
