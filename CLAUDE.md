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
git push "https://x-access-token:TOKEN@github.com/PraxisWrite/Praxis.git" BRANCH
git fetch "https://x-access-token:TOKEN@github.com/PraxisWrite/Praxis.git" BRANCH:refs/remotes/origin/BRANCH
```
The second line syncs the remote-tracking ref so the stop-hook doesn't flag the push as missing.

PR creation also requires curl with PAT — MCP `create_pull_request` returns 403:
```bash
curl -s -X POST \
  -H "Authorization: token TOKEN" \
  -H "Accept: application/vnd.github.v3+json" \
  https://api.github.com/repos/PraxisWrite/Praxis/pulls \
  -d '{"title":"...","body":"...","head":"BRANCH","base":"main","draft":true}' \
  | python3 -c "import sys,json; d=json.load(sys.stdin); print(d.get('html_url') or d)"
```
Always check whether a PR already exists for the branch before creating one.

---

## Active branch

`claude/affectionate-archimedes-yIHlh` — **PR #295 open (draft)**, awaiting CI/SonarCloud.  
Start a **new branch off main** for the next session's work once #295 merges.

### Recently merged (main is up to date through PR #294)

- **PR #294** — Sonar batch 1: `window` → `globalThis` (353 sites, S7764); `Number.parseInt`/`Number.parseFloat` (S7773); `a.remove()` (S7762); `require('node:...')` (S7772); `TypeError` for type-checking throws (S7786); real S2681 bug fixed: `getRenderableDraftFeedbackEntries` was being exported inside a function body after an early `return`, meaning the global export only existed when `feedbackHistory` was non-empty
- **PR #293** — fix E2E selector for `<summary aria-label="Account menu">`: `getByRole('button')` doesn't match `<summary>` elements (Playwright limitation); changed to `locator('[aria-label="Account menu"]')` in both `login()` and `logout()`
- **PR #292** — *(merged earlier this session — see PR for details)*
- **PR #291** — fix E2E helpers for avatar menu: `login()` now waits for `aria-label="Account menu"`, `logout()` opens the menu before clicking Sign out; dropdown z-index fix (topbar `position:relative`/`z-index:70`); dismissable notice banner (× button, `dismiss-notice` action)
- **PR #290** — fix 401 mid-session AI calls + UX: `Auth.refreshToken()` added, called on 401 in `requestAiGenerate` before surfacing error; teacher-assist error message now shows `err.message` instead of "Check console"; `accept-suggested-grade` preserves manually-written `finalNotes`; account actions collapsed behind avatar `<details>` dropdown (B1 UX audit)
- **PR #289** — Sentry double-init fix: `sentry-init.js` uses `addIntegration()` not a second `init()` call
- **PR #288** — AI concurrency cap 10→20 (`AI_MAX_CONCURRENT`), busy 429 flagged `retryable:true`, client retries up to 3×; E2E `workers:1`, cross-role-smoke moved to nightly cron
- **PR #284** — security/stability hardening: auth-gate AI+rubric endpoints, velocity breaker (5m→15m→1h→24h), 200k-char input cap, teacher-only + 10/day rubric quota, Sentry `captureException`, boot-time error screen
- **PR #281** — teacher grading autosave + Discard changes + Resubmit grade

### Open / in flight

- **PR #295** (draft) — Sonar batch 2: `replaceAll` for literal escapes S7781 ×22; `Array.at(-1)` for last-element access S7755 ×12; dead stores / unused locals S1481/S1854 ×11; unused catch bindings → bindingless `catch {}` S2486 ×19. Clears Reliability bucket to zero.

---

## SonarCloud rules (enforced on every PR)

- No `innerHTML`, `outerHTML`, or `Math.random` — use `createElement`/`textContent`/fixed arrays
- No `window.*` — use `globalThis.*`
- No `removeChild` — use `.remove()`
- No `parseInt`/`parseFloat` — use `Number.parseInt`/`Number.parseFloat`
- No single-char global-regex `.replace(/x/g,…)` — use `.replaceAll("x",…)`
- Prefer `Array.at(-1)` over `arr[arr.length - 1]`
- Drop unused `catch (e)` bindings — use bindingless `catch {}` (ES2019)
- Cognitive complexity ≤ 15 per function — extract named helpers when loops get deep
- Contrast: avoid `rgba()` text on `rgba()` backgrounds; use opaque hex approximations
- No nested ternaries — extract to named `let` variables or `if/else if`
- No backtracking regexes (S5852) — avoid `\s*` before `\d+`, alternation inside unbounded repetition, etc.

---

## Key files

| File | Role |
|------|------|
| `public/auth.js` | Auth module: `getToken()`, `refreshToken()` (new), `restoreSession()`, `apiFetch()` |
| `public/app.js` | Event handlers + `requestAiGenerate` / `attemptAiGenerate` (AI call + 401 refresh logic) |
| `public/teacher-render.js` | All teacher-side HTML rendering (IIFE, globals via `globalThis.window`) |
| `public/chrome-render.js` | Shared chrome: topbar (avatar dropdown), modals, hero |
| `public/annotation-render.js` | `renderAnnotatedText`, paste highlight, annotation list |
| `public/rubric-render.js` | `renderRubricSchemaLayout`, `levelTheme`, `getCriterionBands` (full card grid) |
| `public/review-utils.js` | `getCriterionBands`, `calculateTeacherReviewSummary`, `buildTeacherReviewRowScore` |
| `public/app-constants.js` | `BASE_ERROR_CODES`, `getErrorCodes()`, `loadCustomErrorCodes()`, `saveCustomErrorCodes()` |
| `public/rich-text-render.js` | `renderRichTextHtml` — bold/italic/underline markdown in rubric descriptors |
| `public/styles.css` | All CSS |
| `tests/e2e/helpers.js` | Shared E2E helpers: `login()`, `logout()`, `runCrossRoleFlow()`, `deleteAssignment()` |

---

## Account menu (added PR #290)

Sign out and Change password are now inside a `<details class="account-menu">` dropdown in the topbar. The trigger `<summary>` has `aria-label="Account menu"`. The avatar shows initials from `currentProfile.name`.

**E2E impact**: `login()` waits for `aria-label="Account menu"`, not the hidden Sign out button. `logout()` clicks the menu open first. Any new tests that need to sign out must follow the same pattern.

**CSS stacking**: `.topbar` has `position:relative; z-index:70` so the open dropdown paints above the notice banner (backdrop-filter created a stacking context that previously trapped the dropdown).

---

## AI call architecture (`public/app.js`)

```
requestAiGenerate(payload, options)
  → aiRequestSemaphore.acquire()           — client-side concurrency gate (MAX_CONCURRENT=3)
  → for attempt 0..retries:
      attemptAiGenerate(payload, timeoutMs, signal)
        → fetch /api/generate  Authorization: Bearer Auth.getToken()
        → 20s AbortController timeout
      on 401 + !tokenRefreshed:
        → Auth.refreshToken()              — POST /api/auth/refresh with refresh_token
        → if refreshed: retry (attempt--)
        → if not: throw "Your session has expired…"
      on retryable 429 (server busy):
        → wait BUSY_BACKOFF_MS * busyRetries, retry (separate budget, max 3)
      on other 4xx: throw immediately
  → aiRequestSemaphore.release()
```

`Auth.refreshToken()` in `auth.js`: fetches `/api/auth/refresh`, updates `session` in memory + localStorage/sessionStorage. Returns `true` on success.

---

## Grading view architecture

```
renderTeacherGrading(assignment, submission)
  renderGradingNav(...)
  renderTeacherSubmissionStatusPanel(...)
  <div class="review-split">
    renderGradingTextPane(submission, ctx)
    renderGradingRubricPane(submission, ctx)
      buildGradingRubricModel(ctx)
        renderGradingRubricCriterion(...)
          renderGradingRubricPill(...)
          renderGradingScoreStepper(...)
  renderGradingSecondary(assignment, submission, ctx)
```

**Important**: grading pane sources criteria from `reviewSummary.rubric` (= `assignment.rubric`), not `rubricSchema`. `select-rubric-band` and `bump-rubric-band` handlers also use `assignment.rubric` via `getCriterionBands`. Don't mix the two.

**accept-suggested-grade**: only copies `suggestedGrade.studentComment` into `finalNotes` when `finalNotes` is currently empty — preserves manually-written teacher feedback.

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

`levelTheme(label)` in `rubric-render.js` maps band labels → `{ ring, bg, text, badge }`:
- Excellent → green (`#23824c`) · Good → blue (`#2f67d8`) · Satisfactory → amber (`#cf8b1f`)
- Needs Improvement → orange (`#c46a2b`) · Unsatisfactory/Weak → red (`#c24d4d`)

---

## Grading autosave / publish model (PR #281) — LIVE

- `teacherReview` = working draft (autosaved ~1.8s via `scheduleTeacherReviewSync`)
- `teacherReview.publishedReview` = snapshot the student sees (set on submit/resubmit)
- Submit → "Resubmit grade" once `savedAt` is set
- "Discard changes" appears only when draft ≠ published (`teacherReviewHasUnpublishedEdits()`)
- Reopen clears `publishedReview` too (`resetTeacherReviewForReopen` in `review-utils.js`)

---

## Sentry — LIVE

Org `praxiswrite`, project **`praxis`** (id `4511474897715280`).

- Loader in `public/index.html` head: `js-de.sentry-cdn.com/ce9396547e963ef331dbb030435c4d46.min.js`
- `public/sentry-init.js` — calls `Sentry.addIntegration(Sentry.feedbackIntegration(...))` (not `init()`). Guarded with `typeof Sentry !== "undefined"`.
- NOT on `landing.html`.
- Config via REST API only (`mcp.sentry.dev` blocked). User holds a `sntryu_…` token — ask them for it to make Sentry changes.

---

## SonarCloud status (as of PR #295)

Remaining issues after #295 merges (from the pre-#294 export of 638):
- **Reliability: 0** — fully cleared
- **Maintainability: ~540** — mostly S3358 (nested ternaries ×86), S7735 (negated conditions ×17), S7721 (inner-scope functions ×16), S4624 (nested template literals ×16), S3776 (cognitive complexity ×12). Do NOT refactor high-complexity functions before pilot — regression risk. S3626 (3 redundant `return;` flags) skipped — loads of false positives in the action-dispatch chain.

The export lives at `/tmp/sonar-raw.json` in the current remote session (638 issues, pre-#294 baseline). Any new session needs a fresh export or a new token.

---

## Pending / next steps

- [ ] **PR #295** — merge once CI/SonarCloud green
- [ ] More grading-view UX feedback from live pilot use
- [ ] C2 (progressive step disclosure in student flow) — deferred, needs flow design
- [ ] Student-side notice banners don't have a dismiss button yet (only teacher/admin banner does)
