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

`claude/admiring-brown-rkIXr` — **PR #274 open** (draft).  
Latest commit: `eda1209` — fix backtracking regex in annotation bubble label strip (SonarCloud S5852).

### What's in PR #274 (on top of merged PR #273)

PR #273 (merged) contained the full grading view redesign:
- Compact pill rubric (head / scrollable body / pinned foot), sourcing bands from `assignment.rubric`
- Mockup-style annotation highlights: amber underline + rounded code bubble
- Toolbar: pencil on Note, `+` add button, custom chips show full name
- Writing behaviour + Replay merged into one collapsible, side-by-side body
- Submission status above the split pane
- Teacher feedback always-visible below split

PR #274 adds on top:
- **Annotation bubbles**: show only the code (`SP`), not `SP 1` — number still in list below
- **Rubric pills**: soft tinted fill + coloured border (not saturated solid); clicking selected band again toggles/folds descriptor
- **Pill labels**: `Exc.`, `Sat.`, `Unsat.`, `Needs` — no per-pill point number
- **±0.5 score stepper**: `▼ value ▲` bumper per criterion row, clamped to `[0, max]`
- **AI `adjust` field**: AI grade suggestion can shave a band down in 0.5 steps, reaching 0
- **Planning chat + AI feedback used**: side by side in one collapsible
- **S5852 fix**: `/\s*\d+$/` → `/\s\d+$/` in `annotation-render.js`

SonarCloud scan is pending — **watch for any new hotspots and fix before merge**.

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

## Pre-pilot stability fixes (all still pending)

Seven issues identified in a performance audit. Implement before semester pilot (20–40 students/class).

### Issue 1 — Full submission payload on every sync (HIGHEST IMPACT)
- **File:** `public/api-service.js:96–121` (`buildSubmissionServerPayload`)
- **Problem:** Sends entire `writingEvents`, `chatHistory`, `keystrokeLog` arrays on every auto-sync — 150–300 KB per call at ~30s intervals.
- **Fix:** Track a `lastSyncedEventCount` cursor client-side; send only new events as a delta; server appends rather than overwrites.

### Issue 2 — Race condition on submission saves (HIGH IMPACT)
- **File:** `server.js:2217–2223` (submission UPDATE handler)
- **Problem:** No optimistic locking — last writer wins silently.
- **Fix:** Add `.eq('updated_at', expectedTimestamp)` to the Supabase `.update()` call; return 409 on mismatch; client retries with fresh fetch.

### Issue 3 — No timeout on AI endpoint
- **File:** `server.js:1139–1147` (`/api/generate`)
- **Problem:** If the upstream LLM hangs, server holds the connection open indefinitely.
- **Fix:** Wrap the LLM call in an `AbortController` with a 20 s timeout; return 504 on abort.

### Issue 4 — No client-side AI request queue
- **File:** `public/app.js` (AI send handlers)
- **Problem:** Rapid-clicking "Generate" fires multiple concurrent AI requests.
- **Fix:** Simple client-side queue (max 3–4 in-flight); new requests wait or discard oldest pending.

### Issue 5 — Missing database indexes
- **Tables:** `submissions.assignment_id`, `submissions.student_id`
- **Fix:** Supabase migration adding `CREATE INDEX` on both columns.

### Issue 6 — Uncompressed JS bundle (~658 KB)
- **File:** `server.js` (Express static middleware)
- **Fix:** Add `compression` npm package as Express middleware before static serving.

### Issue 7 — Polling too aggressive (20 s intervals)
- **File:** `public/app-constants.js` — `REVIEW_REFRESH_MS` and `ADMIN_REFRESH_MS`
- **Fix:** Raise both to `30000` (30 s).

---

## Pending / next steps

- [ ] Watch SonarCloud on PR #274 — fix any new hotspots, then the user will merge
- [ ] After #274 merges: start a new branch for the pre-pilot stability fixes (Issues 1–7)
- [ ] User may have further grading-view UX feedback after reviewing the live result
