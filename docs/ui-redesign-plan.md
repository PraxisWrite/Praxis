# Praxis — UI Redesign Plan

**Source:** UX audit (`praxis_ux_audit.md`) + grading mockup (`praxis_grading_mockup.html`)  
**Scope:** Teacher grading view + assignment creation flow  
**Branch:** `claude/relaxed-hypatia-MYoa1`

All 8 audit findings are addressed here. Implementation is split into phases; within each phase items are ordered by impact.

---

## Design principles (from audit)

1. **Organise around task, not feature.** The grading page should be built around "grade this student's work", not "analytics section / annotation section / rubric section."
2. **Progressive disclosure.** Optional content starts collapsed. Future steps stay as progress indicators, not expanded cards.
3. **Remove all steps between user and their goal.** The Uber principle: the rubric and the student text are one task; they belong in one view.
4. **Visual hierarchy reflects frequency.** Account management belongs behind the avatar, not competing with class navigation.

---

## Phase A — Grading view: structural redesign

> **✅ IMPLEMENTED (verified in code 2026-06-04).** A1 split-pane is live
> (`.review-split` / `.review-split-text` / `.review-split-rubric` in
> `teacher-render.js`). A2 analytics is now a collapsible `<details>` panel
> (`#teacher-review-panel`, defaults open only once grades exist). A3 toolbar
> shows full labels (`.error-code-toolbar` with `.error-code-btn-labeled`:
> badge + name, descriptor in `title`). A4 rubric renders as compact pills with
> the descriptor revealed for the selected band. Remaining nuance: A2's
> default-open-when-graded is a deliberate tweak vs. the original "always
> collapsed" spec.

These are the three High-severity findings from the audit plus one Medium. All are grading-view only.

### A1 — Split-pane layout (Finding 1, highest ROI)

**File:** `public/teacher-render.js` — `renderTeacherGrading()`  
**Problem:** Student text and rubric are at opposite ends of a long scroll. Every grade requires a round-trip scroll. This is the core repeated action of the workflow.  
**Fix:**
- Replace the current `review-grid` two-card vertical stack with a fixed-height horizontal split pane
- Left pane (~54%): student text (scrollable), annotation toolbar at top, text metadata footer (time/words/replay button)
- Right pane (~46%): rubric (scrollable), sticky total + Save grade footer
- Below the pane: all secondary content (analytics, coaching chat, playback) in collapsible sections
- Mobile fallback (<768px): tabbed view — "Text" tab / "Rubric" tab — rather than stacked scroll

**CSS approach:** Use Praxis existing variables throughout. Do not copy mockup palette.
```
.review-split { display:flex; height:calc(100vh - 120px); min-height:500px; }
.review-split-left  { flex: 0 0 54%; display:flex; flex-direction:column; overflow:hidden; border-right:1px solid var(--line); }
.review-split-right { flex:1; display:flex; flex-direction:column; overflow:hidden; }
```

**Content moved out of primary view:**
- Writing behaviour analytics → collapsible below split (already labelled Optional, now behaves as such)
- Letter-by-letter playback → small "Replay" button in text metadata footer; full controls in a collapsible
- Coaching chat + reflection → collapsible below split
- Status panel (submitted/in-progress/missing), paste evidence, writing time note, AI feedback evidence → small pill badges in the assignment context bar, or collapsed into a "Flags" section below split

### A2 — Analytics collapsed by default (Finding 2)

**File:** `public/teacher-render.js`  
**Problem:** Writing behaviour analytics takes ~40% of visible page height before teacher sees student text. It is labelled "Optional" but rendered expanded.  
**Fix:** Wrap analytics in a collapsed `<details>` by default. The toggle label stays "Writing behaviour analytics · Optional". Teachers who need it open it; everyone else lands directly on student text.  
**Note:** The analytics section is valuable — this change is purely about placement (below the split) and default state (collapsed). No data is removed.

### A3 — Full annotation labels in toolbar (Finding 3)

**File:** `public/teacher-annotation-help.js`  
**Problem:** Toolbar shows cryptic two-letter codes (CS, RO, FR…). Teachers must consult the "What do these codes mean?" help link — a workaround for a labelling problem.  
**Fix:** Show full name as the primary label on each annotation tag button. The code is still stored and shown to students as inline notation — it just isn't the primary UI element for the teacher.  
**"What do these codes mean?" link:** Remove it. The full labels make it redundant.

**Annotation code data model — 3 fields required:**

The current model has `{ code, label }`. The new model needs a third field:

```js
{
  code:        "CS",              // short code shown inline in student text (e.g. ¹CS)
  name:        "Comma splice",    // full label shown on toolbar button (primary)
  explanation: "Two independent clauses joined with only a comma, without a conjunction or semicolon."
                                  // shown as tooltip on hover over toolbar button, or on click
}
```

Where each field is used:
- `code` — inline annotation bubble in student text; stored in `teacherReview.annotations[].code`; used in student download legend
- `name` — annotation toolbar button label (replaces current `label`/`shortLabel`); used in annotation panel list
- `explanation` — tooltip (`title` attribute) on toolbar button; shown in a `<details>` panel below the code list for reference; passed through to student download so students know what the code means

**Migration:** The existing `label` field becomes `name`. `explanation` is new and optional — falls back to empty string. `FALLBACK_CODES` in `teacher-annotation-help.js` gets full explanations added. Custom codes added by teachers get an explanation field in the "Add code" form.

**Add annotation code form — updated fields:**
1. Code (2-8 chars, uppercase) — e.g. `CS`
2. Name — e.g. `Comma splice`
3. Explanation (optional) — e.g. `Two independent clauses joined with only a comma`

### A4 — Rubric pills compact → expand on click (Finding 4)

**File:** `public/teacher-render.js` — rubric rendering in `renderTeacherGrading()`  
**Problem:** Each rubric cell shows 3–5 sentences of criteria description at all times. 4 criteria × 5 levels = up to 20 dense text blocks visible simultaneously. Hard to scan.  
**Fix:**
- Default state: pill shows only score label + points (e.g. "Good · 4 pts")
- On click: pill becomes selected AND its criteria description appears inline below the pill row
- Only one description visible at a time per criterion (selecting a different band swaps the description)
- Applies to both the simple-band view and the matrix `renderRubricSchemaLayout`
- The ±0.5 nudge controls (from TODO.md) fit naturally into the expanded state

**Implementation:** Small JS state — `ui.expandedBandByCriterion = Map<criterionId, bandId>` — already conceptually similar to how `rowScoreMap` works.

---

## Phase B — Grading view: quick-win polish

These are lower-severity findings and rename/label fixes.

### B1 — Account items behind avatar dropdown (Finding 7)

**File:** wherever the teacher header/nav is rendered  
**Problem:** "Change password" and "Sign out" share the header with "Change class", "Invite students", "Back to admin". Account management competes with task navigation.  
**Fix:** Move "Change password" and "Sign out" behind the user avatar/initials in the top-right corner as a dropdown menu. Header reduces to ~4 clean navigation elements.

### B2 — Submission filter active state (Finding 8)

**File:** `public/teacher-render.js` — submission list filter pills  
**Problem:** Active filter pill uses a border variant only — not strong enough contrast at a glance.  
**Fix:** Active pill gets a solid filled background (e.g. `background:var(--accent-deep); color:#fff; border-color:var(--accent-deep)`), not just a border. Inactive pills stay as ghost outline.

### B3 — Button renames (from TODO.md)

| Current label | New label | File / action |
|---|---|---|
| "Suggest rubric scores" | "Suggest score" | `teacher-render.js:865` |
| "Copy Grade" | "Copy grade and feedback" | `teacher-render.js:867` |
| "Submit grade" + "✓ Grade saved" | "Submit grade" + "✓ Grade submitted to student" | `teacher-render.js:868,862` |

### B4 — Suggest score button reposition (from TODO.md)

Move the "Suggest score" button from its current position (above the notes textarea) to after the coaching chat `<details>` section — after the teacher has seen the student's process, before the rubric rows.

---

## Phase C — Assignment creation redesign

### C1 — Hide manual setup box in AI mode (TODO.md item + Finding 6)

**File:** `public/teacher-render.js` — lines 300–327  
**Problem:** When a teacher is in the AI-assisted flow (Steps 1–3 visible), the "Manual assignment setup" card still appears at the bottom of the panel, even though they've already chosen AI-assisted. This creates ambiguity — it looks like both paths are available simultaneously.  
**Fix:** Only render the manual setup card when `!ui.teacherAssist` AND the teacher has explicitly chosen the manual path. In AI mode, the card should never appear.  
**How to detect mode:** A `ui.creationMode` flag (`"ai"` | `"manual"` | null) — set when teacher makes their path choice. If null, show the path selection UI. If `"ai"`, show only the AI steps. If `"manual"`, show only the manual form.

### C2 — Progressive step disclosure (Finding 5)

**File:** `public/teacher-render.js`  
**Problem:** Steps 1, 2, and 3 are all rendered simultaneously before the teacher has done anything. Step 3 is labelled "After draft" — correct — but it still renders as a collapsed card competing for attention.  
**Fix:** The stepper at top governs what is shown, not just what is highlighted:
- Step 1 (Rubric): Rendered in full. Steps 2–3 shown as future indicators only.
- After rubric choice (or skip): Step 2 (Brief) renders in full.
- After "Format with AI" click: Step 3 (Review + save) renders. Steps 1–2 collapse to completed indicators.  
**Note:** This is a meaningful flow change. Implement after C1 (hide manual in AI mode) as a prerequisite.

### C3 — AI path visually dominant (Finding 6)

**File:** wherever the initial path-selection UI renders  
**Problem:** "Create with AI support" and "Set up manually" are presented as two equal-weight cards.  
**Fix:**
- "Create with AI support" → full-width primary card with strong CTA
- "Set up manually" → small secondary text link below: "Prefer to write it yourself?"
- Same access, less visual competition

---

## Phase D — Bug fixes from TODO.md (grading / teacher side)

These are distinct from the UX audit but affect the same screens. Grouped here for sequencing.

### D1 — Stale "Final work submitted" notice on assignment switch

**File:** `public/app.js` — assignment switch handler  
**Fix:** `ui.notice = null` whenever `selectedAssignmentId` or `selectedSubmissionStudentId` changes.

### D2 — Rubric page jump on criterion click

**File:** `public/app.js:668–672` — `scrollToNextRubricCriterionMobile()`  
**Fix:** The guard `window.matchMedia("(max-width: 900px)").matches` must be strict. Currently fires on all devices. Add early return if not mobile.

### D3 — Paste violet highlight only fires on first paste

**File:** `public/teacher-annotation-help.js` or paste detection handler in `app.js`  
**Investigation needed:** Likely a one-time event listener that isn't re-registered after re-render. Look for `paste` event attachment and whether `MutationObserver` re-runs it.

### D4 — Copy-to-notes + rubric change deletes teacher's note

**File:** `public/app.js` — rubric change handler  
**Fix:** Track whether `teacherReview.finalNotes` has been manually edited (dirty flag). Only overwrite with AI-suggested text if the field is clean/untouched.

### D5 — Teacher can see/grade unsubmitted work

**File:** `server.js` + `public/app.js` — submission query guard  
**Fix:** Allow teacher to open any student's submission record regardless of `status`. Show a banner: "Work not yet submitted — viewing in-progress draft." Do not block grading.

### D6 — "Next: Write draft" grayed out until second chat message

**File:** student-side `app.js` — draft navigation button condition  
**Fix:** Always render the button enabled. On first click (before threshold), show a gentle modal: "Have you finished with the coach? You can return to chat later." rather than blocking navigation.

### D7 — Blank "Guided outline Part 3" in student download

**File:** download template (wherever HTML grade sheet is built)  
**Fix:** Strip empty guided-outline sections before inserting into download. Check for empty/whitespace-only content before including the section header.

### D8 — "Likely natural" writing behaviour label unexplained

**File:** `public/teacher-render.js` — `renderWritingBehaviour()`  
**Fix:** Add a `?` info button (or `title` tooltip) next to the label explaining: what "Likely natural", "Uncertain", and "Needs review" mean, and which metrics contribute to the rating.

---

## Annotation codes — current state reference

**`teacher-annotation-help.js` `FALLBACK_CODES`** (current):
```js
{ code: "CS", label: "Comma splice" }
{ code: "RO", label: "Run-on" }
{ code: "FR", label: "Fragment" }
{ code: "P",  label: "Punctuation" }
{ code: "VT", label: "Verb tense" }
{ code: "WF", label: "Word form" }
{ code: "AGR", label: "Agreement" }
{ code: "SP", label: "Spelling" }
```

**Target (after A3):**
```js
{ code: "CS",  name: "Comma splice",    explanation: "Two independent clauses joined with only a comma, without a conjunction or semicolon." }
{ code: "RO",  name: "Run-on",          explanation: "Two or more independent clauses joined without any punctuation or conjunction." }
{ code: "FR",  name: "Fragment",        explanation: "A group of words that cannot stand alone as a complete sentence — missing subject, verb, or complete thought." }
{ code: "MP",  name: "Missing punct.",  explanation: "Required punctuation (comma, period, apostrophe, etc.) is absent." }
{ code: "VT",  name: "Wrong verb tense",explanation: "The verb tense does not match the time frame of the surrounding context." }
{ code: "WF",  name: "Wrong word form", explanation: "Incorrect form of a word used (e.g. noun instead of adjective, or verb instead of noun)." }
{ code: "AGR", name: "Agreement",       explanation: "Subject and verb, or noun and pronoun, do not agree in number or person." }
{ code: "SP",  name: "Spelling",        explanation: "The word is misspelled." }
{ code: "CT",  name: "Contraction",     explanation: "A contraction (e.g. don't, can't) is used where formal writing requires the full form." }
{ code: "INF", name: "Informal",        explanation: "Word, phrase, or tone is too informal for the academic register required." }
```

---

## Implementation sequence

```
Phase A — Grading structural (highest impact, implement together)
  A1  Split-pane layout
  A2  Analytics collapsed by default
  A3  Full annotation labels + 3-field code model
  A4  Rubric pills compact/expand

Phase B — Grading polish (lower effort, ship with A or separately)
  B1  Account items behind avatar
  B2  Submission filter solid active state
  B3  Button renames
  B4  Suggest score button reposition

Phase C — Assignment creation (separate screen, separate PR)
  C1  Hide manual setup in AI mode
  C2  Progressive step disclosure
  C3  AI path visually dominant

Phase D — Bug fixes (can interleave with above)
  D1  Stale notice (trivial — 1 line)
  D2  Rubric page jump (trivial — 1 guard)
  D3  Paste highlight re-registration (needs investigation)
  D4  Copy-to-notes dirty flag
  D5  Teacher sees unsubmitted work
  D6  Next: Write draft always enabled
  D7  Blank guided outline in download
  D8  Writing behaviour tooltip
```

---

*Mockup reference: `praxis_grading_mockup.html` (uploaded)*  
*Audit source: `praxis_ux_audit.md` (uploaded)*
