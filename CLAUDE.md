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

`claude/relaxed-goldberg-XYY4F` — no open PR yet (start here for new work).

### Recently merged (main is up to date)

- **PR #275** — updated CLAUDE.md handoff
- **PR #274** — half-point stepper, softer rubric pills, cleaner annotation bubbles, S5852 fix
- **PR #273** — full grading view redesign (split pane, compact pill rubric, annotation highlights)
- **PR #272** — status order, rubric fit, merged behaviour corrections
- **PR #271** — Phase A grading view redesign
- **PR #270** — fixed broken unit tests + added unit CI job
- **PR #269** — append-only sync deltas (Issue 1) + submission lookup indexes (Issue 5)
- **PR #267** — student approval gate + click-to-grade from roster

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

## Pending / next steps

- [ ] User to review live grading view and give UX feedback
- [ ] Add Sentry error tracking after pilot launch (deferred — known issues already fixed)
