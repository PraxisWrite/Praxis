# Praxis — Claude Code Handoff

## Project

**Praxis** — a structured writing platform for EFL teachers.  
Repo: `PraxisWrite/Praxis` on GitHub.  
No build step — plain JS served by Express/Railway from `public/`.  
Supabase backend (MCP tools available for DB work).

---

## Git / push setup

`origin` is a local proxy at `127.0.0.1:38081` — **pushes via `origin` are always blocked**.  
Push using a PAT directly (user rotates PAT often):
```bash
git push -u "https://x-access-token:TOKEN@github.com/PraxisWrite/Praxis.git" BRANCH
```
After every push, scrub the upstream so the PAT doesn't linger:
```bash
git branch --unset-upstream && git config --remove-section "branch.BRANCHNAME"
```
PR creation also requires curl with PAT — MCP `create_pull_request` returns 403:
```bash
curl -s -X POST \
  -H "Authorization: token TOKEN" \
  -H "Accept: application/vnd.github.v3+json" \
  https://api.github.com/repos/PraxisWrite/Praxis/pulls \
  -d '{"title":"...","body":"...","head":"BRANCH","base":"main","draft":true}' \
  | python3 -c "import sys,json; d=json.load(sys.stdin); print(d.get('html_url') or d)"
```

---

## Active branch

`claude/relaxed-goldberg-XYY4F` — **PR #282 open** (draft, Sentry loader guard). Otherwise reuse this branch for new work.

### Recently merged (main is up to date)

- **PR #281** — teacher grading autosave + Discard changes + Resubmit grade (this session)
- **PR #280** — removed Sentry feedback widget from landing page
- **PR #279** — Sentry user-feedback widget (`sentry-init.js`) + dedupe
- **PR #278** — point Sentry loader at real `praxis` project DSN
- **PR #277** — add Sentry error monitoring (loader script)
- **PR #276** — CLAUDE.md handoff (all 7 pre-pilot fixes confirmed shipped)
- **PR #275** — updated CLAUDE.md handoff
- **PR #274** — half-point stepper, softer rubric pills, cleaner annotation bubbles, S5852 fix
- **PR #273** — full grading view redesign (split pane, compact pill rubric, annotation highlights)
- **PR #272–267** — earlier grading redesign, unit-test CI, sync deltas, approval gate (see git log)

### Open / in flight

- **PR #282** (draft) — guard `sentry-init.js` so a blocked Sentry CDN (ad-blocker/VPN) doesn't throw an uncaught `ReferenceError`. Verify CI then merge.

---

## SonarCloud rules (enforced on every PR)

- No `innerHTML`, `outerHTML`, or `Math.random` — use `createElement`/`textContent`/fixed arrays
- No `window.*` — use `globalThis.*`
- No `removeChild` — use `.remove()`
- No `parseInt` — use `Number.parseInt`
- Cognitive complexity ≤ 15 per function — extract named helpers when loops get deep
- Contrast: avoid `rgba()` text on `rgba()` backgrounds; use opaque hex approximations
- No nested ternaries — extract to named `let` variables or `if/else if`
- No backtracking regexes (S5852) — avoid `\s*` before `\d+`, alternation inside unbounded repetition, etc.

---

## Key files

| File | Role |
|------|------|
| `public/teacher-render.js` | All teacher-side HTML rendering (IIFE, globals via `globalThis.window`) |
| `public/annotation-render.js` | `renderAnnotatedText`, `renderAnnotationHighlight`, paste highlight, annotation list |
| `public/rubric-render.js` | `renderRubricSchemaLayout`, `levelTheme`, `getCriterionBands` (full card grid — NOT used in grading pane) |
| `public/review-utils.js` | `getCriterionBands`, `calculateTeacherReviewSummary`, `buildTeacherReviewRowScore`, `getTeacherReviewRowScoreMap` |
| `public/app-constants.js` | `BASE_ERROR_CODES`, `getErrorCodes()`, `loadCustomErrorCodes()`, `saveCustomErrorCodes()` |
| `public/app.js` | Event handlers (`select-rubric-band`, `bump-rubric-band`, `add-custom-error-code`, etc.) |
| `public/rich-text-render.js` | `renderRichTextHtml` — bold/italic/underline markdown in rubric descriptors |
| `public/styles.css` | All CSS; grading-specific classes below |

### Grading pane CSS classes (added this session)
`.rubric-pane-head/body/foot`, `.rubric-pane-name/meta`,
`.rubric-total-number .score-val/.score-max`, `.rubric-total-sub`, `.rubric-foot-actions`,
`.grading-criterion`, `.grading-criterion-title/name/range`, `.grading-score-pills`,
`.grading-pill`, `.grading-pill.is-selected/.is-suggested`, `.grading-pill-label`,
`.grading-criterion-desc`, `.grading-score-field`,
`.grading-stepper`, `.grading-step-btn`, `.grading-step-value`,
`.error-code-btn-note`, `.error-code-add-btn`,
`.custom-code-manage`, `.custom-code-chip`, `.custom-code-remove`,
`.review-notes-block`, `.review-secondary-row`

---

## Grading view architecture

```
renderTeacherGrading(assignment, submission)
  renderGradingNav(...)                         — nav + roster breadcrumb
  renderTeacherSubmissionStatusPanel(...)        — status ABOVE split
  <div class="review-split">
    renderGradingTextPane(submission, ctx)        — left: student text + annotation toolbar
    renderGradingRubricPane(submission, ctx)      — right: pills + score field
      buildGradingRubricModel(ctx)               — iterates reviewSummary.rubric
        renderGradingRubricCriterion(...)        — one criterion row
          renderGradingRubricPill(...)           — one pill button
          renderGradingScoreStepper(...)         — ▼ value ▲ bumper
  renderGradingSecondary(assignment, submission, ctx)
    — "Feedback for student" textarea (always visible)
    — "Writing behaviour & replay" collapsible (side by side)
    — "Planning chat & AI feedback used" collapsible (side by side)
```

**Important**: the grading pane sources criteria from `reviewSummary.rubric` (= `assignment.rubric`), not `rubricSchema`. The `select-rubric-band` and `bump-rubric-band` handlers in `app.js` also look up from `assignment.rubric` via `getCriterionBands`. Don't mix the two.

---

## CSS variables (app palette)

```css
--bg:#f5f8ff; --surface:#ffffff; --ink:#1a2740; --muted:#687a98;
--accent:#5f8fff; --accent-deep:#456ddb; --accent-soft:#e8f0ff;
--sage:#34a587; --sage-soft:#edf4ea; --line:#dbe5f5;
--dark:#111827; --violet:#9b4dca; --violet-soft:#e9d0f7;
--pin:#d66782; --annot:#fff176; --annot-ink:#2f2416;
--danger: (red, check styles.css)
```

`levelTheme(label)` in `rubric-render.js` maps band labels to `{ ring, bg, text, badge }` colour tokens:
- Excellent → green (`#23824c`)
- Good → blue (`#2f67d8`)
- Satisfactory → amber (`#cf8b1f`)
- Needs Improvement → orange (`#c46a2b`)
- Unsatisfactory/Weak → red (`#c24d4d`)

---

## Pre-pilot stability fixes — ALL SHIPPED

All seven issues identified in the performance audit are done. No action needed.

| # | Issue | Status | Where |
|---|-------|--------|-------|
| 1 | Append-only sync deltas | ✅ Done | PR #269 — `public/api-service.js` |
| 2 | Optimistic locking on saves | ✅ Already existed | `server.js` `expected_updated_at` → 409 |
| 3 | AI endpoint timeout | ✅ Done | `server.js:1246` — `AbortController` 20s + 504 |
| 4 | Client-side AI request queue | ✅ Done | `public/app.js:1874` — `inFlight`/`MAX_CONCURRENT` |
| 5 | Missing DB indexes | ✅ Done | PR #269 — migration applied to production |
| 6 | Uncompressed JS bundle | ✅ Done | `server.js:4,34` — `compression` middleware |
| 7 | Polling too aggressive | ✅ Done | `app-constants.js:16–17` — both at 30000 ms |

---

## Sentry (error monitoring + user feedback) — LIVE

Set up this session. Org `praxiswrite`, project **`praxis`** (slug `praxis`, id `4511474897715280`).

- **Loader script** in `public/index.html` head: `js-de.sentry-cdn.com/ce9396547e963ef331dbb030435c4d46.min.js`. DSN key `ce9396547e963ef331dbb030435c4d46`. Loader options: replay + performance + **feedback** on.
- **`public/sentry-init.js`** — shared init (loaded only on `index.html`, NOT landing). Calls `Sentry.feedbackIntegration()` ("Report a problem" button). **Guarded** with `typeof Sentry !== "undefined"` so a blocked CDN (ad-blocker/VPN) doesn't throw — see PR #282.
- **NOT on `landing.html`** (removed in #280) — feedback only inside the app.
- **Alerts** (email to owner `scmc2789@hotmail.com` / `praxiswrite` team): new-issue, error spike (5+/hr), regression, high-volume (20+/hr).
- **Inbound filters on**: browser-extensions, web-crawlers, localhost, plus `401*`/`Unauthorized*` error-message filter (expected auth noise).
- **Config via REST API**, not MCP: `mcp.sentry.dev` is **blocked by this env's network allowlist**; `sentry.io` REST API is reachable. User holds a `sntryu_…` auth token (full scopes) — ask them for it to make Sentry changes. The user's own machine runs NordVPN Threat Protection which intermittently blocks the CDN (returns 204) — that's why the widget/events sometimes don't load for them but will for students. A long obfuscated `/...` script on the live page is NordVPN injection, not ours — safe.

## Grading autosave / publish model (PR #281) — LIVE

Teacher grading no longer loses work and editing a returned grade is explicit:

- `teacherReview` = **working draft** (autosaved ~1.8s on rubric/annotation/feedback change via `scheduleTeacherReviewSync` → `syncTeacherReviewToServer`, which PATCHes `teacher_review` only, no status change, no `expected_updated_at`).
- `teacherReview.publishedReview` = **snapshot the student sees** (set on submit/resubmit via `snapshotPublishedReview`). Students read this, never the working draft — see `studentVisibleGradeSubmission()` in `student-render.js`. Back-compat: old graded work lazily adopts its current grade as baseline in `createDefaultTeacherReview`.
- **Submit → "Resubmit grade"** label once `savedAt` is set. **"Discard changes"** button appears only when `teacherReviewHasUnpublishedEdits()` (working draft ≠ published); reverts to published.
- Reopen clears `publishedReview` too (`resetTeacherReviewForReopen` in `review-utils.js`).
- Feedback textarea now has an `input` handler (previously had none).
- No server change needed — `teacher_review` jsonb stores the new field as-is.

---

## Pending / next steps

- [ ] Merge PR #282 once CI passes (Sentry loader guard)
- [ ] After deploy, hard-refresh and confirm console is clean + feedback widget shows inside app
- [ ] More grading-view UX feedback from live use (next UI session)
- [ ] Mark the legit test feedback report in Sentry as "not spam" (AI spam filter caught it)
