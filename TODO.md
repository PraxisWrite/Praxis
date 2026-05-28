# Praxis — To Do

Items from pilot testing and teacher feedback. Bugs first, then features.

---

## Bugs

### High priority

- [x] **Ghost sign-in** — visiting the invite URL on a device with a stored teacher session auto-logged in as the wrong account. Fixed: non-student sessions are now signed out and the auth screen shown when opening `?join=classId`. *(PR #257)*
- [x] **Chat coach renders `**markdown**` as literal asterisks** — AI coach responses were passed through `escapeHtml` with no markdown conversion. Fixed: `parseCoachMarkdown()` now converts `**bold**` → `<strong>` and newlines → `<br>` for assistant messages only. *(PR #257)*
- [x] **Annotate function** — annotations were reported not showing in the grading area. Investigated: rendering path in `teacher-render.js` is complete (inline highlights + panel). Likely a display/scroll issue — needs manual recheck in staging.
- [x] **AI buttons double-pressable** — investigated: the `request-ideas` action has no rendered button in the current UI (dead handler). Feedback button has `draftFeedbackLoading` guard; chat Send has `chatLoading` guard. No change needed.
- [ ] **"Final work submitted" message persists when switching to a different assignment** — stale `ui.notice` not cleared on assignment switch.
- [ ] **Copy-to-notes then changing rubric deletes teacher's note** — data loss in the teacher grading panel.
- [ ] **Paste violet highlight only fires on first paste** — subsequent pastes are not detected/highlighted.
- [ ] **Clicking rubric sections causes page to jump** up and down.
- [ ] **Admin view counts deleted assignments** — deleted items still appear in admin counts.
- [ ] **Keystroke data deleted when class/assignment deleted** — should be preserved for algorithm training. *Also applies to: if a class is deleted by a teacher the keystroke data should not be deleted.*
- [ ] **"Next: Write draft" button grayed out until second chat message** — confusing. Should always be enabled; if student clicks early, show a gentle modal asking if they're done with the coach rather than blocking.
- [ ] **Blank "Guided outline Part 3: —"** appears in student downloaded work — needs stripping from the download template.
- [ ] **Teacher should be able to see and grade student's work even if submit was not triggered** — in case of a submit error the work is inaccessible.
- [ ] **"Likely natural" writing behaviour label unexplained** — in the teacher grading panel, the Writing Behaviour section shows a label ("Likely natural", "Uncertain", or "Needs review") with a summary line like "Mostly natural writing behaviour with some variation — consistent with B1." There is no explanation of *why* that rating was given or what the metrics mean. Needs a `?` info button or tooltip next to the label that explains the scoring criteria.

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

