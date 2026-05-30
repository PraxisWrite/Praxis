# Praxis — To Do

Items from pilot testing and teacher feedback. Bugs first, then features.

> **Single source of truth.** This file absorbed the former `docs/todo.md`
> on 2026-05-28; that file now just points here. Nothing was lost in the merge.

---

## Bugs

### High priority

- [x] **Ghost sign-in** — visiting the invite URL on a device with a stored teacher session auto-logged in as the wrong account. Fixed: non-student sessions are now signed out and the auth screen shown when opening `?join=classId`. *(PR #257)*
- [x] **Chat coach renders `**markdown**` as literal asterisks** — AI coach responses were passed through `escapeHtml` with no markdown conversion. Fixed: `parseCoachMarkdown()` now converts `**bold**` → `<strong>` and newlines → `<br>` for assistant messages only. *(PR #257)*
- [x] **Annotate function** — annotations were reported not showing in the grading area. Investigated: rendering path in `teacher-render.js` is complete (inline highlights + panel). Likely a display/scroll issue — needs manual recheck in staging.
- [x] **AI buttons double-pressable** — investigated: the `request-ideas` action has no rendered button in the current UI (dead handler). Feedback button has `draftFeedbackLoading` guard; chat Send has `chatLoading` guard. No change needed.
- [x] **"Final work submitted" message persists when switching to a different assignment** — was actually `ui.draftSaveMessage` ("Submitted successfully.") not `ui.notice`. Fixed: cleared on `switch-class`, `open-assignment`, and `student-assignment-select` handlers.
- [x] **Copy-to-notes then changing rubric deletes teacher's note** — Fixed: `use-suggested-comment` now writes the AI text into `submission.teacherReview.finalNotes` and persists, instead of only setting textarea.value. `select-rubric-band` also captures any in-progress notes textarea value into state before `render()` wipes the DOM.
- [x] **Paste violet highlight only fires on first paste** — Fixed: clipboards carry `\r\n` line endings but the textarea value is normalized to `\n`, so saved paste-event text never matched the submission text via `indexOf`/`slice` and the violet highlight was dropped (the "first paste" was just whichever paste happened to be single-line). `handlePaste` now normalizes `\r\n?` → `\n` at the source; `getPasteEvidenceItems` and `renderTextWithPasteHighlights` normalize when searching so legacy events highlight too.
- [x] **Clicking rubric sections causes page to jump** up and down. — Fixed: `select-rubric-band` handler now snapshots `window.scrollY` before `render()` and restores it immediately after, so the full-page re-render no longer shifts the teacher's scroll position. Mobile auto-scroll to next criterion still fires.
- [x] **Admin view counts deleted assignments** — Fixed: `admin-back-to-teachers` now refreshes `loadAdminData()` in the background so deleted assignments disappear from teacher counts. Also refresh after an admin-initiated `delete-assignment` action.
- [x] **Keystroke data deleted when class/assignment deleted** — Fixed: added a `public.submission_archive` table (admin-only RLS). The class- and assignment-delete endpoints now snapshot every affected submission (incl. `writing_events` + `keystroke_log`) into the archive *before* the hard delete, so writing-process data is preserved for algorithm training. Archive write happens first; if it fails the delete aborts (no silent data loss). Migration: `migrations/20260528_submission_archive.sql`.
- [x] **"Next: Write draft" button grayed out until second chat message** — Fixed: button is always enabled. If student clicks early (not enough chat / outline incomplete), a gentle `confirm()` modal asks "Are you ready to move on?" rather than blocking. Tooltip on the button still hints that chatting + outlining first helps.
- [x] **Teacher should be able to see and grade student's work even if submit was not triggered** — The infrastructure to grade unsubmitted work already existed (`ensureTeacherReviewSubmission` creates placeholders; `getSubmissionReviewText` falls back to `draftText`). Fixed: added a clear amber banner at the top of the grading panel when status isn't submitted/late/missing/graded but draft/final text exists: "In-progress draft. This student has not submitted yet, but you can still review and grade their current work."
- [x] **Writing behaviour label unexplained** — Fixed: added a `?` tooltip next to the status pill in the modern writing-process panel (`writing-process/render.js`). Tooltip explains all four labels (Typical process / Review suggested / Close review needed / Not enough writing data) and how severity is determined. The actual labels in code are these four — the TODO described them as "Likely natural / Uncertain / Needs review" from memory.

- [x] **Unexpected password-strength message** — Fixed: `shouldShowUpgradePrompt()` now also returns false for accounts created on/after the security hardening date (2026-05-01) — new signups never see the banner. Legacy accounts still see it until dismissed. *(Issue #110, PR #259)*
- [x] **Profiles RLS policy too broad** — Fixed: replaced `qual=true, roles=public` SELECT policy with `authenticated`-only. Unauthenticated users can no longer read profiles. Per-class scoping deferred to a follow-up migration. *(Issue #109, PR #259)*
- [x] **Submissions endpoints return 500 on auth/access failures** — Fixed: added `isRlsDenial()` helper; five submission endpoints now return 403 instead of 400 on RLS denial. Catch blocks no longer expose raw `error.message`; log `error.name` (class only) to avoid Sonar S5145. *(Issue #111, PR #259)*

### Medium priority

- [x] **What happens when a teacher deletes a class or assignment that had submissions?** — Fixed: submissions are now archived to `public.submission_archive` before deletion (see keystroke-data item above), so data is preserved not destroyed. The class- and assignment-delete confirmation dialogs were also reworded to make clear the work is removed from the dashboard and archived for research (no longer "permanently deleted").
- [x] **Sign-up by class link needs an "accept student?" gate on the teacher side** — Fixed: new joins via invite link land in `pending` state; teacher sees Approve/Decline in the roster; student sees a waiting screen until approved. Clicking a student name in the roster now navigates directly to their grading view (requires an assignment to be selected first). *(PR #267)*

---

## Tests / QA

- [ ] **UI/integration test: complete a student submission against a 3-criteria / 15-point rubric** — guards against future changes re-introducing a gate on rubric completeness. *(A regression test for the mismatch case is already done — see Done section.)*
- [ ] **Failed-submit protection test** — student final work stays saved locally / server-queued when submit fails, and the UI does not show false success.
- [ ] **Draft persistence regression test** — student draft survives refresh/reload after Save Draft / autosave.
- [ ] **Teacher-receives-submission regression test** — outside the currently-skipped full-flow E2E test.
- [ ] **4-criteria / 20-point rubric regression test** — keep the normal rubric path covered.
- [ ] **Verify publish email fires only after server-confirmed publish** — and that a publish failure shows a clear failure message.
- [ ] **Verify AI provider rate limits and concurrent request capacity** for pilot-scale usage (12+ students simultaneously).

---

## Features

### Teacher workflow

- [ ] **Manual assignment creation needs its own Save button** — current Save is locked to Format with AI. Fix: remove the lock; move Format with AI button next to Teacher Brief box; let teachers save manually or via AI.
- [ ] **Add assignment type and min/max word limits to Format with AI setup** — currently these only appear after AI formats the assignment.
- [ ] **Notification when assignment is created and ready to publish** — teacher should see a confirmation message and a prompt to publish.
- [ ] **Save assignment button should change to "Saving…" on click**, then scroll to the created assignment in the tray, highlight the Publish button, and suggest publishing.
- [x] **Submit grade message** — Already implemented: submitting a grade sets the notice to "Grade submitted to student." and shows it in a green confirmation banner in the grading panel (`app.js` `save-teacher-review` handler + `teacher-render.js`).
- [~] **Suggest rubric score button** — Renamed "Suggest rubric scores" → "Suggest score" (`teacher-render.js`). Repositioning it below the collapsible "▶ Planning chat with coach" section (after the process/chat context, before the rubric rows) is deferred to the Phase A grading redesign, which restructures this panel.
- [ ] **"1 paste flag" in assignment tray should be clickable** — should take the teacher directly to that student.
- [x] **Copy grade → rename to "Copy grade and feedback"** — Done: button relabelled in `teacher-render.js` with a `title` tooltip ("Copies the score, rubric breakdown, teacher feedback and annotation comments so you can paste them into your LMS."). Removed the now-stale runtime relabel in `teacher-ui-cleanup.js`.
- [ ] **Coaching chat under the heat map should show the student's Reflection ("what I improved")** so teacher sees the full process.
- [ ] **Rubric score should be bumpable in 0.5 increments** — each rubric criterion row has a selected band shown in the top-right corner (e.g. "Good · 4 pts"). Add up/down nudge controls there so the teacher can fine-tune the score by ±0.5 without having to click a different band cell.
- [ ] **Hide manual assignment setup box when in AI-support mode**.
- [ ] **Fix AI feedback** *(needs more detail — what specifically is broken?)*
- [ ] **Ability to accept or reject AI suggestions**.
- [ ] **Two reusable Praxis-supported writing task models** — listed as "Demo task" for every teacher when they set up a class.
- [ ] **Class rules** — when teacher creates a class, give them the chance to add class rules with a template suggestion.
- [ ] **Make sure test teacher/student assignment submissions don't skew keystroke data** — *flagging mechanism exists* (`is_test_account` + per-submission writing-behaviour exclusion in `admin-render.js`). Remaining: bulk-delete or auto-flag obvious test data so it never enters analytics in the first place.

### Student workflow

- [ ] **"Graded work available" notification on student side** — student sees the notification but can't find how to view or download graded report, rubric, and teacher comments. Needs a clear "View feedback" button.
- [ ] **Student assignment tray needs structure** — separate sections for new, submitted, and graded assignments. Look at how Canvas / other LMS organise students' assignments.
- [ ] **Make the assignment brief more obvious and unmissable** on the student assignment page.
- [ ] **Toggleable: auto-generate outline after chat conversation** — like the chatbot on/off switch, let teachers enable auto-outline generation after the chat, viewable on the drafting page.
- [ ] **Download "my work" filename** — should be `AssignmentName-ClassName-Date` not a generic name.
- [ ] **Remove student focus box from all workflows**.
- [ ] **Remove skip chat button** — *note:* the old `docs/todo.md` marked this done, but `skip-chat-to-draft` + the `chat-skip-notes` textarea are still live in `student-render.js`/`app.js`, so it is **not** actually done.
- [ ] **+code: Contraction field** — "don't" instead of "do not" should give 3 fields: 1. Error code, 2. Name, 3. Explanation (shown on hover).
- [ ] **"Good sample" green highlight** — a positive annotation type to show students well-written sections (complement to the existing error annotations).

### Naming / labels

- [ ] **Remove all mentions of "AUIZero"** — replace with "praxis" throughout the app (UI text, page titles, emails, etc.). UI/branding only — do **not** rename the GitHub repo, Railway project, env vars, or the `AUIZero-v1` localStorage keys without a migration plan.
- [ ] **Rename "Teacher notes" label → "Feedback for student"** (or similar). After the PR consolidating AI feedback into one `studentComment` field, the textbox is pre-filled with student-facing content, so the current label is misleading. Optional alternative: split into two fields — "Feedback for student" (public) + "Teacher notes" (private). The split is more product work and probably overkill unless teachers ask for it.

### Writing fluency / analytics

- [ ] **All five writing fluency items should show the trend line (Kline)**, not just the first three. Clarify which items are weighted lower.

---

## Known minor issues (defer unless teachers complain)

- [ ] **Pre-save rubric header flicker** — the rubric panel header still shows the auto-total while the teacher is editing the Final score override input; it only updates after Submit grade. Could fix with an `oninput` handler on the override input that writes to a UI state field. Current behaviour is acceptable since the input itself shows what they typed.

---

## Open product decisions

- [ ] **Attempt history** — should re-submission create a new attempt record with separate grading, or keep updating the same submission as iteration? Needs a product decision before implementation.

---

## Refactor / architecture

- [ ] **Fix stop-hook git check false positive** — `~/.claude/stop-hook-git-check.sh` compares against `origin/main` rather than the actual remote branch, so it always fires after the upstream ref is scrubbed post-push (per CLAUDE.md PAT hygiene). Hook should detect and compare against `origin/<current-branch>` instead.
- [ ] **Continue modularizing only after pilot-critical bugs/tests are stable.**
- [ ] Consider `student-workflow.js` for step navigation, draft/final transitions, submit, and feedback request handlers.
- [ ] Consider `teacher-assignments.js` for create/edit/publish/delete assignment handlers.
- [ ] Consider `teacher-review.js` for grading handlers, annotation controls, and playback controls.
- [ ] Keep large render extraction for later; render functions are still tightly coupled to global state.
- [ ] **Enable Anthropic prompt caching on AI calls** (chat, draft feedback, grade suggestion). Requires restructuring prompt builders in `app.js` so static content (assignment context, rubric, system prompts) comes BEFORE dynamic content (student draft, chat history) — currently interleaved as template literals. Also requires updating `/api/generate` in `server.js` to support a `cache_control` field. Estimated savings: 50–70% on input tokens for cache hits (mostly grade suggestion + feedback during concurrent pilot use). Note: 2048-token minimum on Sonnet means short chat turns may not qualify. Best done during the prompt-builder refactor. Revisit when AI costs exceed ~$50/month.

---

## Done (historical — consolidated from docs/todo.md)

- [x] Delete test assignments + submission data so they don't skew real keystroke analytics
- [x] RLS recursion bug fix
- [x] Signup flow hardening with friendly error messages
- [x] Supabase admin/user client session separation *(PR #115)*
- [x] Playwright E2E test suite (auth ✅ teacher ✅ student ✅ full-flow skipped with reason)
- [x] Reopen submission flow: clears graded review fields server-side AND fixed `mergeStudentSubmission` so locally-cached graded state doesn't override the server's cleared state on reopen
- [x] AI buttons disable while thinking — prevents double-requests on assignment creation and student AI feedback
- [x] Regression test: pilot rubric mismatch (3 criteria / 15 points) does not block student submission
- [x] Rename "Suggest rubric scores" → "Grade with AI" (clearer action label)
- [x] Submit grade button disables + shows "Submitting…" during request
- [x] Show "Grade submitted to student" confirmation in grading panel after submit
- [x] Optional reflection textarea on self-assessment screen (non-blocking for submit)
- [x] Editable Final score input on grading screen — teacher can override rubric total
- [x] Fixed flicker: Final score input briefly showed auto total instead of override during save
- [x] Hide "Auto total" labels when teacher has set a manual override
- [x] Consolidated AI feedback: one `studentComment` used for both the suggested-grade panel and the Teacher Notes default; removed the duplicate justification field

