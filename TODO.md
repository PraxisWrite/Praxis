# Praxis — To Do

Items from pilot testing and teacher feedback. Bugs first, then features.

---

## Bugs

### High priority

- [x] **Ghost sign-in** — visiting the invite URL on a device with a stored teacher session auto-logged in as the wrong account. Fixed: non-student sessions are now signed out and the auth screen shown when opening `?join=classId`. *(PR #257)*
- [x] **Chat coach renders `**markdown**` as literal asterisks** — AI coach responses were passed through `escapeHtml` with no markdown conversion. Fixed: `parseCoachMarkdown()` now converts `**bold**` → `<strong>` and newlines → `<br>` for assistant messages only. *(PR #257)*
- [x] **Annotate function** — annotations were reported not showing in the grading area. Investigated: rendering path in `teacher-render.js` is complete (inline highlights + panel). Likely a display/scroll issue — needs manual recheck in staging.
- [x] **AI buttons double-pressable** — investigated: the `request-ideas` action has no rendered button in the current UI (dead handler). Feedback button has `draftFeedbackLoading` guard; chat Send has `chatLoading` guard. No change needed.
- [x] **"Final work submitted" message persists when switching to a different assignment** — was actually `ui.draftSaveMessage` ("Submitted successfully.") not `ui.notice`. Fixed: cleared on `switch-class`, `open-assignment`, and `student-assignment-select` handlers.
- [x] **Copy-to-notes then changing rubric deletes teacher's note** — Fixed: `use-suggested-comment` now writes the AI text into `submission.teacherReview.finalNotes` and persists, instead of only setting textarea.value. `select-rubric-band` also captures any in-progress notes textarea value into state before `render()` wipes the DOM.
- [ ] **Paste violet highlight only fires on first paste** — subsequent pastes are not detected/highlighted.
- [x] **Clicking rubric sections causes page to jump** up and down. — Fixed: `select-rubric-band` handler now snapshots `window.scrollY` before `render()` and restores it immediately after, so the full-page re-render no longer shifts the teacher's scroll position. Mobile auto-scroll to next criterion still fires.
- [x] **Admin view counts deleted assignments** — Fixed: `admin-back-to-teachers` now refreshes `loadAdminData()` in the background so deleted assignments disappear from teacher counts. Also refresh after an admin-initiated `delete-assignment` action.
- [ ] **Keystroke data deleted when class/assignment deleted** — should be preserved for algorithm training. *Also applies to: if a class is deleted by a teacher the keystroke data should not be deleted.*
- [x] **"Next: Write draft" button grayed out until second chat message** — Fixed: button is always enabled. If student clicks early (not enough chat / outline incomplete), a gentle `confirm()` modal asks "Are you ready to move on?" rather than blocking. Tooltip on the button still hints that chatting + outlining first helps.
- [ ] **Blank "Guided outline Part 3: —"** appears in student downloaded work — needs stripping from the download template. *Investigation needed: the phrase "Guided outline" isn't anywhere in the codebase, suggesting it comes from AI-generated chat content. Need a sample download to see exactly where it's rendered.*
- [x] **Teacher should be able to see and grade student's work even if submit was not triggered** — The infrastructure to grade unsubmitted work already existed (`ensureTeacherReviewSubmission` creates placeholders; `getSubmissionReviewText` falls back to `draftText`). Fixed: added a clear amber banner at the top of the grading panel when status isn't submitted/late/missing/graded but draft/final text exists: "In-progress draft. This student has not submitted yet, but you can still review and grade their current work."
- [x] **Writing behaviour label unexplained** — Fixed: added a `?` tooltip next to the status pill in the modern writing-process panel (`writing-process/render.js`). Tooltip explains all four labels (Typical process / Review suggested / Close review needed / Not enough writing data) and how severity is determined. The actual labels in code are these four — the TODO described them as "Likely natural / Uncertain / Needs review" from memory.

- [x] **Unexpected password-strength message** — Fixed: `shouldShowUpgradePrompt()` now also returns false for accounts created on/after the security hardening date (2026-05-01) — new signups never see the banner. Legacy accounts still see it until dismissed. *(Issue #110, PR #259)*
- [x] **Profiles RLS policy too broad** — Fixed: replaced `qual=true, roles=public` SELECT policy with `authenticated`-only. Unauthenticated users can no longer read profiles. Per-class scoping deferred to a follow-up migration. *(Issue #109, PR #259)*
- [x] **Submissions endpoints return 500 on auth/access failures** — Fixed: added `isRlsDenial()` helper; five submission endpoints now return 403 instead of 400 on RLS denial. Catch blocks no longer expose raw `error.message`; log `error.name` (class only) to avoid Sonar S5145. *(Issue #111, PR #259)*

### Medium priority

- [ ] **What happens when a teacher deletes a class or assignment that had submissions?** — data should be preserved (archive) not deleted. Needs an explicit archive/soft-delete flow or at minimum a confirmation warning.
- [ ] **Sign-up by class link needs an "accept student?" gate on the teacher side** — currently anyone with the link can join. Clicking a student's name should also show their assignment list and let teacher grade directly.

---

## Features

### Teacher workflow

- [ ] **Manual assignment creation needs its own Save button** — current Save is locked to Format with AI. Fix: remove the lock; move Format with AI button next to Teacher Brief box; let teachers save manually or via AI.
- [ ] **Add assignment type and min/max word limits to Format with AI setup** — currently these only appear after AI formats the assignment.
- [ ] **Notification when assignment is created and ready to publish** — teacher should see a confirmation message and a prompt to publish.
- [ ] **Save assignment button should change to "Saving…" on click**, then scroll to the created assignment in the tray, highlight the Publish button, and suggest publishing.
- [ ] **Submit grade message** — should say "Grade submitted to student" rather than "Last saved".
- [ ] **Suggest rubric score button** — rename to "Suggest score" and move from its current position to just below the collapsible "▶ Planning chat with coach (2 student messages)" section in the teacher grading panel (i.e. after the process/chat context, before the rubric rows).
- [ ] **"1 paste flag" in assignment tray should be clickable** — should take the teacher directly to that student.
- [ ] **Copy grade → rename to "Copy grade and feedback"** with a brief tooltip explaining what it copies (rubric scores + comments).
- [ ] **Coaching chat under the heat map should show the student's Reflection ("what I improved")** so teacher sees the full process.
- [ ] **Rubric score should be bumpable in 0.5 increments** — each rubric criterion row has a selected band shown in the top-right corner (e.g. "Good · 4 pts"). Add up/down nudge controls there so the teacher can fine-tune the score by ±0.5 without having to click a different band cell.
- [ ] **Hide manual assignment setup box when in AI-support mode**.
- [ ] **Fix AI feedback** *(needs more detail — what specifically is broken?)*
- [ ] **Ability to accept or reject AI suggestions**.
- [ ] **Two reusable Praxis-supported writing task models** — listed as "Demo task" for every teacher when they set up a class.
- [ ] **Class rules** — when teacher creates a class, give them the chance to add class rules with a template suggestion.
- [ ] **Make sure test teacher/student assignment submissions don't skew keystroke data** — delete or flag test data.

### Student workflow

- [ ] **"Graded work available" notification on student side** — student sees the notification but can't find how to view or download graded report, rubric, and teacher comments. Needs a clear "View feedback" button.
- [ ] **Make the assignment brief more obvious and unmissable** on the student assignment page.
- [ ] **Toggleable: auto-generate outline after chat conversation** — like the chatbot on/off switch, let teachers enable auto-outline generation after the chat, viewable on the drafting page.
- [ ] **Download "my work" filename** — should be `AssignmentName-ClassName-Date` not a generic name.
- [ ] **Remove student focus box from all workflows**.
- [ ] **Remove skip chat button**.
- [ ] **+code: Contraction field** — "don't" instead of "do not" should give 3 fields: 1. Error code, 2. Name, 3. Explanation (shown on hover).
- [ ] **"Good sample" green highlight** — a positive annotation type to show students well-written sections (complement to the existing error annotations).

### Writing fluency / analytics

- [ ] **All five writing fluency items should show the trend line (Kline)**, not just the first three. Clarify which items are weighted lower.

