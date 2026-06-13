# Praxis — To Do

Items from pilot testing and teacher feedback. Bugs first, then features.

> **Single source of truth.** This file absorbed the former `docs/todo.md`
> on 2026-05-28; that file now just points here. Nothing was lost in the merge.

---

## Security audit findings (pre-pilot, 2026-06-13)

Full read-only audit ahead of the 20–40 student pilot (~14 concurrent). No
cross-tenant data leaks found; the IRB data-layer grant changes broke no live
flow; student work is protected by synchronous localStorage persistence. Items
below are the residual findings, ranked by pilot impact.

### Fixed in the security batch (2026-06-13)

- [x] **Stored XSS in grade-sheet export** — `public/app.js:6163` interpolated the
  student-set display name unescaped into the chat log (every other field in the
  builder was escaped); fired in the teacher's browser on "Download student work".
  Fixed: wrapped in `escapeHtml(studentName)`.
- [x] **AI rate-limit burst hard-errored students** — `server.js` `/api/generate`
  relayed Anthropic 429/503/529 with no `retryable` flag, so the client never
  retried and every student got an instant error during a synchronized class
  burst. Fixed: map upstream 429/503/529 → retryable 429. Also bumped the client
  AI timeout (20s→25s) above the server's 20s Anthropic timeout to kill the
  tie-race that wasted near-20s responses.
- [x] **AI velocity breaker could 24h-lock a legitimate student** — `server.js`
  `checkAiVelocity`: `offences` never decayed and the velocity hit was recorded
  *before* the concurrency gate, so classroom congestion (busy-429s + client
  retries) pushed students toward the burst limit and its escalating cooldowns.
  Fixed: concurrency gate now runs first (busy-rejected calls don't count), and
  the escalation tier decays after 1h with no new trip (`AI_OFFENCE_DECAY_MS`).
- [x] **Self-registerable teacher accounts** — `server.js` signup took `role` from
  the body with no gate. Added an **opt-in** `TEACHER_SIGNUP_CODE` env gate:
  inert by default (no behavior change), and when set, teacher self-signup
  requires the code. **ACTION: set `TEACHER_SIGNUP_CODE` in Railway before the
  pilot URL is shared** (note: activating it blocks teacher self-signup via the
  current client form — existing teacher accounts are unaffected; create new
  teachers by calling the API with the code or temporarily unsetting it).
- [x] **Password reset landed on the marketing page, not the reset form** —
  `server.js` `/` route only swapped in the app (`index.html`) for `?join`, so a
  reset callback (`/?reset=1#access_token…`) fell through to `landing.html`,
  which has no recovery-token handling — the reset form never showed. Fixed:
  `/` now also serves the app for `?reset`. (Found during the dashboard fix
  below: with Supabase Site URL/allow-list corrected, the link reached
  praxiswrite.com but showed the landing page.)

### Manual config done / to do (Supabase dashboard)

- [x] **Supabase URL config fixed** — Site URL was `http://localhost:3000` with
  an empty redirect allow-list, so every reset email redirected to localhost
  (resets silently broken for everyone). Set Site URL = `https://praxiswrite.com`
  and redirect allow-list = `https://praxiswrite.com/**` (domain-locked, which
  also keeps the off-site-redirect finding closed).
- [ ] **Move Supabase Auth emails to Resend SMTP + rebrand** — reset emails
  currently send via Supabase's built-in test SMTP: unbranded ("Supabase Auth",
  "powered by Supabase"), heavily rate-limited, and landing in spam. Point
  Supabase → Authentication → SMTP Settings at Resend (host `smtp.resend.com`,
  port 465, user `resend`, password = existing `RESEND_API_KEY`, sender = the
  verified `NOTIFY_FROM_EMAIL` domain), then rebrand the "Reset Password" email
  template (Authentication → Email Templates) as Praxis. Raises the send rate
  limit and fixes deliverability before the pilot.

### Fix before / early in pilot

- [ ] **[HIGH] No rate limiting on auth endpoints** — `server.js` has no
  `express-rate-limit`/`helmet`; `/api/auth/signin|signup|forgot-password|refresh`
  rely solely on Supabase's limits. **Design note:** key any limiter by **email,
  not IP** — 14 students behind one university NAT share a public IP, so an
  IP-based limit would lock out a whole classroom at sign-in. Per-email (signin
  brute-force) + generous per-IP ceiling is the safe shape. Deferred from the
  batch because a misconfigured limiter is itself a pilot-breaking risk; needs
  testing against the real deploy.
- [ ] **[HIGH] E2E does not gate PRs / can't validate PR code** — the Playwright
  suite targets **production** (`baseURL || "https://praxiswrite.com"`, no
  `webServer` block), so a `pull_request` trigger would test prod (old code), not
  the PR. Real fix: add a `webServer` block that boots the PR's server with test
  Supabase creds (or a Railway preview deploy) and point E2E at it, then add the
  `pull_request` gate. **Pilot-week mitigation:** freeze merges to `main` during
  live sessions; rely on the post-merge smoke + manual login→write→submit→grade.
- [ ] **[MEDIUM] `restoreSession` logs the user out on a transient network error**
  — `public/auth.js:113-147`: the catch wipes the stored session on any thrown
  error (e.g. a `fetch` TypeError when a laptop wakes before WiFi), bouncing the
  student to login mid-class. Written work is safe (localStorage). Fix: on a
  network error (vs a parsed `data.error`), keep the session and soft-fail.
- [ ] **[MEDIUM] Unload flush has no `keepalive`/`sendBeacon`** —
  `public/app.js:1816-1823`: the `pagehide`/`beforeunload` sync is a normal fetch
  the browser aborts on close, so the final few seconds of writing-events may not
  reach the server until the student reopens on the same device. Bounded (text is
  in localStorage), but fix with `keepalive:true`/`navigator.sendBeacon`.

### Post-pilot backlog

- [ ] **[MEDIUM] Teacher grading list pulls full keystroke logs for the whole
  class** — `server.js:2317` `select('*, profiles(id,name)')`, no pagination;
  largest server memory spike. Select only list-view columns; lazy-load heavy
  arrays per submission.
- [ ] **[MEDIUM] Deploy hardening** — add `engines.node: "20.x"` to package.json
  (CI runs Node 20; Railway picks its own) and a `/healthz` route + Railway
  healthcheck (no health endpoint today, so Railway can't auto-restart an
  OOM-thrashing instance).
- [ ] **[MEDIUM] Server→Anthropic timeout race** — partly addressed (client now
  25s > server 20s). Consider making the intent explicit/configurable.
- [ ] **[MEDIUM] CSP is report-only** — `server.js:51-62` blocks nothing; promote
  to enforcing once inline event handlers are removed.
- [ ] **[MEDIUM] Open redirect in password reset** — `server.js:272-296` passes a
  client-controlled `redirectTo` to Supabase. Harmless **iff** the Supabase
  "Redirect URLs" allowlist is locked to the domain (see manual checklist); stop
  accepting the client value regardless.
- [ ] **[LOW] `error.message` leaked to clients** in auth/AI handlers (DB/internal
  details); harden like the submission handlers (generic message + `errorClassForLog`).
- [ ] **[LOW] Unauthenticated `/api/classes/:classId/invite`** leaks class +
  teacher name; account-existence leak on signin/forgot-password.
- [ ] **[LOW] Withdrawal-delete guards only `P1-S*` names** (`server.js:3240`),
  not test accounts or the "AWG 1001" pilot class — admin mis-click is
  unrecoverable. Extend the guard.
- [ ] **[LOW] No multi-tab session sync** — Supabase rotates refresh tokens; a
  student with two tabs can get logged out of both. Add a `storage` listener.
- [ ] **[LOW] `/api/rubric/parse` raw fetch has no 401 refresh** —
  `public/app.js:4504`: expired token → misleading "Could not read the rubric
  file." (teacher-only, pre-class).
- [ ] **[LOW] In-memory quota/velocity maps never prune** (`aiUsageByUser`,
  `rubricUsageByUser`) — negligible at pilot scale; add a periodic sweep before
  scaling.
- [ ] **[LOW] Rubric AI endpoints** (teacher, 10/day) aren't covered by the 200k
  input cap or velocity breaker; accept 5MB files.
- [ ] **[LOW] Research-layer hardening** — `writeWithRequestScopedFallback`
  catches RLS but not column-grant denials (latent footgun if profiles writes
  ever route through it); `research_deletion_log` insert failure is only logged;
  `fluency_summary`/`metrics` copied into the archive without a key whitelist;
  IRB helper functions (`sanitizeProfileForClient`, `sanitizeProcessAnalysisForViewer`,
  `archiveSubmissionsForDeletion`) are untested.
- [ ] **[LOW] Client load** — 31 separate `<script defer>` (~830KB unminified);
  Sentry loader is synchronous in `<head>` (consider `async`).
- [ ] Run `npm audit --omit=dev` before the pilot (not run in the audit sandbox).

### Manual verification checklist (could not be checked from the audit sandbox)

- [ ] **Supabase "Redirect URLs" allowlist** — confirm it's locked to the Praxis
  domain (gates the password-reset open-redirect severity).
- [ ] **Anthropic account RPM/TPM** — confirm it covers ~14 near-simultaneous
  `claude-sonnet-4-6` calls (determines whether the rate-limit path is hit).
- [ ] **Production smoke test** — manual login → write → submit → grade (sandbox
  egress blocked `praxiswrite.com`).
- [ ] **Live DB grants** — static audit verified migration/code consistency;
  confirm with `\dp profiles` / `submission_process_analyses` if convenient.

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

- [x] **UI/integration test: complete a student submission against a 3-criteria / 15-point rubric** — covered: `tests/e2e/cross-role-smoke.spec.js` creates an AI assignment scoring ideas/organization/language (3 criteria) and runs a full student submission incl. self-assessment; the rubric-mismatch unit regression (`browser-utils.test.js`) covers the 15-vs-declared-20 total.
- [ ] **Failed-submit protection test** — student final work stays saved locally / server-queued when submit fails, and the UI does not show false success.
- [ ] **Draft persistence regression test** — student draft survives refresh/reload after Save Draft / autosave.
- [ ] **Teacher-receives-submission regression test** — outside the currently-skipped full-flow E2E test.
- [ ] **4-criteria / 20-point rubric regression test** — keep the normal rubric path covered.
- [ ] **Verify publish email fires only after server-confirmed publish** — and that a publish failure shows a clear failure message.
- [x] **Verify AI provider rate limits and concurrent request capacity** for pilot-scale usage (12+ students simultaneously).

---

## Features

### Teacher workflow

- [x] **Manual assignment creation needs its own Save button** — implemented: "Set up manually" mode has its own Save bar (`renderManualSaveBarHtml`, `renderManualProxyHtml` in `teacher-assignment-choice.js`); AI-assist and manual are independent workflows.
- [ ] **Add assignment type and min/max word limits to Format with AI setup** — currently these only appear after AI formats the assignment.
- [ ] **Notification when assignment is created and ready to publish** — teacher should see a confirmation message and a prompt to publish.
- [ ] **Save assignment button should change to "Saving…" on click**, then scroll to the created assignment in the tray, highlight the Publish button, and suggest publishing.
- [x] **Submit grade message** — Already implemented: submitting a grade sets the notice to "Grade submitted to student." and shows it in a green confirmation banner in the grading panel (`app.js` `save-teacher-review` handler + `teacher-render.js`).
- [~] **Suggest rubric score button** — Renamed "Suggest rubric scores" → "Suggest score" (`teacher-render.js`). Repositioning it below the collapsible "▶ Planning chat with coach" section (after the process/chat context, before the rubric rows) is deferred to the Phase A grading redesign, which restructures this panel.
- [x] **"1 paste flag" in assignment tray should be clickable** — implemented: pill is now a `<button data-action="open-paste-flag">` that loads the assignment's submissions, finds the first paste-flagged one, and opens grading for that student.
- [x] **Copy grade → rename to "Copy grade and feedback"** — Done: button relabelled in `teacher-render.js` with a `title` tooltip ("Copies the score, rubric breakdown, teacher feedback and annotation comments so you can paste them into your LMS."). Removed the now-stale runtime relabel in `teacher-ui-cleanup.js`.
- [ ] **Coaching chat under the heat map should show the student's Reflection ("what I improved")** so teacher sees the full process.
- [x] **Rubric score should be bumpable in 0.5 increments** — done: each grading criterion row has a ±0.5 stepper (`bump-rubric-band` action, ▲/▼ buttons in `teacher-render.js`) that nudges only that row's selected cell, plus a `step="0.5"` editable final-score input. Floor/ceiling clamp the band range.
- [ ] **Hide manual assignment setup box when in AI-support mode**.
- [ ] **Fix AI feedback** *(needs more detail — what specifically is broken?)*
- [ ] **Ability to accept or reject AI suggestions**.
- [ ] **Two reusable Praxis-supported writing task models** — listed as "Demo task" for every teacher when they set up a class.
- [ ] **Class rules** — when teacher creates a class, give them the chance to add class rules with a template suggestion.
- [ ] **Make sure test teacher/student assignment submissions don't skew keystroke data** — *flagging mechanism exists* (`is_test_account` + per-submission writing-behaviour exclusion in `admin-render.js`). Remaining: bulk-delete or auto-flag obvious test data so it never enters analytics in the first place.

### Student workflow

- [x] **"Graded work available" notification on student side** — implemented: assignment list rows show a "Graded" pill + "View feedback" button (direct to step 4); a "Feedback returned" card appears above the workspace when graded work exists but isn't selected.
- [ ] **Student assignment tray needs structure** — separate sections for new, submitted, and graded assignments. Look at how Canvas / other LMS organise students' assignments.
- [ ] **Make the assignment brief more obvious and unmissable** on the student assignment page.
- [x] **Toggleable: auto-generate outline after chat conversation** — done: teacher toggle `autoOutlineFromChat` (next to "Disable chatbot"). When on, the student draft page auto-builds an **editable** idea-outline (notes only, no sentences) from the coach chat, with a "Rebuild from chat" button. Logic lives in a self-contained `public/student-chat-outline.js` (kept out of app.js); outline text nests in the `submission.outline` jsonb so it persists with no submission-schema change. New `assignments.auto_outline_from_chat` column (migration `20260601_assignment_auto_outline.sql`).
- [ ] **Download "my work" filename** — should be `AssignmentName-ClassName-Date` not a generic name.
- [ ] **Remove student focus box from all workflows**.
- [ ] **Remove skip chat button** — *note:* the old `docs/todo.md` marked this done, but `skip-chat-to-draft` + the `chat-skip-notes` textarea are still live in `student-render.js`/`app.js`, so it is **not** actually done.
- [ ] **+code: Contraction field** — "don't" instead of "do not" should give 3 fields: 1. Error code, 2. Name, 3. Explanation (shown on hover).
- [x] **"Good sample" green highlight** — implemented: `GOOD` annotation code renders a green highlight + green card in the annotation list. A "✓ Good" button sits in the toolbar between the error codes and the Note button.

### Naming / labels

- [x] **Remove all mentions of "AUIZero"** — no UI-facing text remains; all remaining occurrences are localStorage/sessionStorage key strings (`AUIZero-v1`, `auizero_session`) which must not be renamed without a migration plan.
- [x] **Rename "Teacher notes" label → "Feedback for student"** — done: `teacher-render.js:1047` uses "Feedback for student"; student-side grading view already uses "Teacher feedback".

### Writing fluency / analytics

- [x] **All writing fluency items show scale bars** — the modern panel (`writing-process/render.js`) shows 4 metric cards (Typing rate, Long thinking pauses, Local revisions, Text survival), all rendered as scale indicators. The legacy `writing-behaviour-render.js` with 5 items (3 scale + 2 badge) is never shown when keystroke data exists. No action needed.

---

## Known minor issues (defer unless teachers complain)

- [ ] **Pre-save rubric header flicker** — the rubric panel header still shows the auto-total while the teacher is editing the Final score override input; it only updates after Submit grade. Could fix with an `oninput` handler on the override input that writes to a UI state field. Current behaviour is acceptable since the input itself shows what they typed.

---

## Open product decisions

- [ ] **Attempt history** — should re-submission create a new attempt record with separate grading, or keep updating the same submission as iteration? Needs a product decision before implementation.

---

## Refactor / architecture

- [ ] **Continue modularizing only after pilot-critical bugs/tests are stable.**
- [ ] Consider `student-workflow.js` for step navigation, draft/final transitions, submit, and feedback request handlers.
- [ ] Consider `teacher-assignments.js` for create/edit/publish/delete assignment handlers.
- [ ] Consider `teacher-review.js` for grading handlers, annotation controls, and playback controls.
- [ ] Keep large render extraction for later; render functions are still tightly coupled to global state.
- [ ] **Enable Anthropic prompt caching on AI calls** (chat, draft feedback, grade suggestion). Requires restructuring prompt builders in `app.js` so static content (assignment context, rubric, system prompts) comes BEFORE dynamic content (student draft, chat history) — currently interleaved as template literals. Also requires updating `/api/generate` in `server.js` to support a `cache_control` field. Estimated savings: 50–70% on input tokens for cache hits (mostly grade suggestion + feedback during concurrent pilot use). Note: 2048-token minimum on Sonnet means short chat turns may not qualify. Best done during the prompt-builder refactor. Revisit when AI costs exceed ~$50/month.

---

## Performance & Lighthouse follow-ups

Deferred from the Lighthouse audit shipped in **PR #329** (instant first-paint skeleton, lazy-loaded `jszip`, text-contrast fixes, `<main>` landmark, login meta description, security headers). These were held out of that pilot-safe batch because they each need either a **build step** (the project deliberately has none) or the **Sentry dashboard token**.

- [ ] **Code-split role modules** — `teacher-render.js` / `student-render.js` / `admin-render.js` (plus the ~285 KB `app.js`) currently load for every visitor regardless of role. Needs a bundler (dynamic `import()`), or a no-build-step alternative: inject the role's `<script>` on demand after auth resolves in `bootApp()`. Touches the boot path for all three roles, so it carries regression risk — do it with per-role testing, ideally after the pilot.
- [ ] **Minify + content-hash static assets** — `app.js` / `styles.css` etc. ship unminified with no cache-busting filenames. Needs a build step. Lower value than it looks (the server already gzips via `compression`). If a build step is added, do minify + content-hashing + long `Cache-Control` together.
- [ ] **Sentry: lighten + stop render-blocking** — the loader in `index.html` / `landing.html` pulls the full tracing+replay+feedback bundle (~90 KB) and isn't `async`. Switch to an errors-only bundle (or lazy-load Replay/Feedback only inside the authenticated app) and make the loader non-render-blocking. Requires the Sentry dashboard / `sntryu_…` token, and the loader init-ordering (`onLoad` / `sentryOnLoad` hooks) must be validated against the live config so the feedback widget keeps working.
- [ ] **Enforce CSP + Trusted Types** — `server.js` currently sends `Content-Security-Policy-Report-Only`. Before flipping to an enforcing `Content-Security-Policy`: confirm the reported origins (`'self'`, Sentry CDN/ingest) from real violation reports, and remove the one inline `onclick="location.reload()"` in the boot-error path (`app.js`). Trusted Types (`require-trusted-types-for 'script'`) is higher-risk — add it Report-Only first, as a separate task.
- [ ] **Re-run Lighthouse to verify** — the contrast fixes (`--muted`, login active tab) are *calculated* to clear WCAG AA 4.5:1, not Lighthouse-verified in-environment. Re-run on the login + landing pages after deploy to confirm the A11y/SEO scores rise. Also audit the inner views (grading, student editor, admin) with DevTools Lighthouse **Snapshot** mode — they share the same URL and weren't covered by the cold-boot run.

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

