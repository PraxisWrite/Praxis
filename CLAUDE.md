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

## Pending / next steps

- [ ] Confirm GitHub MCP now resolves to `PraxisWrite/Praxis` (first thing to check above)
- [ ] Create draft PR for `feature/landing-improvements` if not already open
- [ ] Watch SonarCloud on the new PR for any new issues
- [ ] User may have further landing page feedback after reviewing this iteration
