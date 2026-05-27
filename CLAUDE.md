# Praxis — Claude Code Handoff

## First thing to check

Run this and tell the user the result:
```bash
git remote -v
```
Then try: `mcp__github__get_me` (or any GitHub MCP tool targeting `PraxisWrite/Praxis`).  
The previous session's GitHub MCP was scoped only to `lingoshots/auizero`, which blocked PR creation. The user is reconfiguring the environment to point at `PraxisWrite/Praxis` — please confirm whether that is now working.

---

## Project

**Praxis** — a structured writing platform for EFL teachers.  
Landing page lives at `public/landing.html` (self-contained HTML+CSS+JS, no build step).  
Real app: `PraxisWrite/Praxis` on GitHub.

---

## Active branch

`feature/landing-improvements` — **pushed, not yet PR'd** (MCP was blocked last session).  
Create a draft PR from `feature/landing-improvements` → `main` if one doesn't exist yet.

### What's in this branch (commit `bca6a1d`)

1. **Rubric demo** — band cells now show score + descriptor text; clicking a lit cell expands to show the full band descriptor; demo auto-expands after grading.
2. **Annotations demo** — paragraph text visible from start (was blank due to `opacity:0`); marks animate background+badge in one by one; teacher comment types in below after all marks placed.
3. **AI section** — student feedback is sentence-specific and uses guiding questions without giving answers; teacher comment names student, cites CEFR level (B1+), flags specific error patterns.
4. **Logo** — 'a' and 'i' in the nav/footer "praxis" wordmark render in `var(--accent-deep)` blue.

---

## Git / push setup

The local git proxy points to `lingoshots/auizero` but the real GitHub repo is `PraxisWrite/Praxis`.  
Previous sessions pushed using a PAT directly:
```bash
git push -u "https://x-access-token:TOKEN@github.com/PraxisWrite/Praxis.git" BRANCH
```
**That PAT must be rotated by the user — do not use it.**  
If MCP is now scoped to `PraxisWrite/Praxis`, use the MCP tools for all GitHub work instead.

---

## SonarCloud rules (enforced on every PR)

- No `innerHTML`, `outerHTML`, or `Math.random` — use `createElement`/`textContent`/fixed arrays
- No `window.*` — use `globalThis.*`
- No `removeChild` — use `.remove()`
- No `parseInt` — use `Number.parseInt`
- Cognitive complexity ≤ 15 per function — extract named async helpers when loops get deep
- Contrast: avoid `rgba()` text on `rgba()` backgrounds; use opaque hex approximations

---

## CSS variables (landing page palette)

```css
--bg:#f5f8ff; --surface:#ffffff; --ink:#1a2740; --muted:#687a98;
--accent:#5f8fff; --accent-deep:#456ddb; --accent-soft:#e8f0ff;
--sage:#34a587; --sage-soft:#edf4ea; --line:#dbe5f5;
--dark:#111827; --violet:#9b4dca; --violet-soft:#e9d0f7;
--pin:#d66782; --annot:#fff176; --annot-ink:#2f2416;
```

---

## Demo sections in `public/landing.html`

| # | `data-demo` | Runner fn | Description |
|---|-------------|-----------|-------------|
| 1 | `chat` | `runChat` | EFL B1 outline coach conversation, tourism essay |
| 2 | `playback` | `runPlayback` | Typewriter + paste-alert timeline |
| 3 | `rubric` | `runRubric` | Upload → parse → grade with expandable band cells |
| 4 | `annotation` | `runAnnotation` | Progressive marks + teacher comment |
| 5 | `ai` | `runAI` | Student feedback list + teacher score/comment |

All demos auto-loop via `IntersectionObserver` at 0.3 threshold; stop when scrolled out.

---

## Pre-pilot stability fixes (branch: `claude/relaxed-hypatia-MYoa1`)

Seven issues identified in performance audit. Implement all before semester pilot (20–40 students/class).

### Issue 1 — Full submission payload on every sync (HIGHEST IMPACT)
- **File:** `public/api-service.js:96–121` (`buildSubmissionServerPayload`)
- **Problem:** Sends entire `writingEvents`, `chatHistory`, `keystrokeLog` arrays on every auto-sync — 150–300 KB per call at ~30s intervals. Multiplies badly under concurrent users.
- **Fix:** Track a `lastSyncedEventCount` cursor client-side; send only new events as a delta; server appends rather than overwrites.

### Issue 2 — Race condition on submission saves (HIGH IMPACT)
- **File:** `server.js:2217–2223` (submission UPDATE handler)
- **Problem:** No optimistic locking — if a student edit and a teacher reopen land simultaneously, the last writer wins and silently drops the other's changes.
- **Fix:** Add `.eq('updated_at', expectedTimestamp)` to the Supabase `.update()` call; return 409 on mismatch; client retries with fresh fetch.

### Issue 3 — No timeout on AI endpoint
- **File:** `server.js:1139–1147` (`/api/generate`)
- **Problem:** If the upstream LLM hangs, the request never resolves — server holds the connection open indefinitely, exhausting the connection pool under load.
- **Fix:** Wrap the LLM call in an `AbortController` with a 20 s timeout; return 504 on abort.

### Issue 4 — No client-side AI request queue
- **File:** `public/app.js:4129–4164` and `1858–1907` (AI send handlers)
- **Problem:** Rapid-clicking "Generate" or fast navigation fires multiple concurrent AI requests. Under 20–40 simultaneous students this can spike server load and return out-of-order responses.
- **Fix:** A simple client-side queue (max 3–4 in-flight); new requests wait or discard the oldest pending.

### Issue 5 — Missing database indexes
- **Tables:** `submissions.assignment_id`, `submissions.student_id`
- **Problem:** Every submission lookup does a sequential scan. At 30+ students per assignment this degrades linearly.
- **Fix:** Supabase migration adding `CREATE INDEX` on both columns.

### Issue 6 — Uncompressed JS bundle (~658 KB)
- **File:** `server.js` (Express static middleware)
- **Problem:** No gzip/brotli. Every page load transfers the full bundle; slow on school networks.
- **Fix:** Add `compression` npm package as Express middleware before static serving.

### Issue 7 — Polling too aggressive (20 s intervals)
- **File:** `public/app-constants.js` — `REVIEW_REFRESH_MS` and `ADMIN_REFRESH_MS`
- **Problem:** 20 s polling under 40 concurrent users = 120 req/min just for refresh ticks.
- **Fix:** Raise both to `30000` (30 s); reduces polling load by 33%.

---

## Active branch

`claude/relaxed-hypatia-MYoa1` — Phase 16 complete (all `Auth.apiFetch` calls → `ApiService`). PR #256 open.  
Next: implement the 7 pre-pilot stability fixes above.

---

## Git / push setup

`origin` is a local proxy at `127.0.0.1:38081` — pushes via `origin` are blocked.  
Push using PAT directly (user rotates PAT often by regenerating):
```bash
git push -u "https://x-access-token:TOKEN@github.com/PraxisWrite/Praxis.git" BRANCH
```
PR creation also requires curl with PAT (MCP `create_pull_request` returns 403).

---

## Pending / next steps

- [ ] Implement Issue 1: delta sync (`api-service.js`)
- [ ] Implement Issue 2: optimistic locking (`server.js`)
- [ ] Implement Issue 3: AI timeout (`server.js`)
- [ ] Implement Issue 4: AI request queue (`app.js`)
- [ ] Implement Issue 5: DB indexes (Supabase migration)
- [ ] Implement Issue 6: gzip middleware (`server.js` + `package.json`)
- [ ] Implement Issue 7: polling interval (`app-constants.js`)
- [ ] Confirm GitHub MCP now resolves to `PraxisWrite/Praxis` (first thing to check above)
- [ ] Create draft PR for `feature/landing-improvements` if not already open
- [ ] Watch SonarCloud on the new PR for any new issues
- [ ] User may have further landing page feedback after reviewing this iteration
