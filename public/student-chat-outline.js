// Student draft-page feature: when the teacher enables "Auto-build an outline
// from the coach chat", this module turns the student's planning chat into an
// editable, notes-only outline shown above the draft editor.
//
// It is deliberately self-contained (same pattern as teacher-assignment-choice.js)
// so the feature logic stays OUT of app.js. The only things it borrows from app.js
// are two exposed helpers: globalThis.requestAiGenerate (shared AI pipeline) and
// globalThis.scheduleSubmissionSync (server flush). Student edits autosave for free
// because the textarea carries data-outline-field, which app.js's delegated input
// handler already persists into submission.outline (a free-form jsonb column).
(() => {
  const PANEL_ID = "chat-outline-panel";
  const TEXT_ID = "chat-outline-text";
  const STATUS_ID = "chat-outline-status";
  const inFlight = new Set();
  // Per-page-load guard so we auto-build once per draft visit without spamming
  // the AI pipeline on every MutationObserver tick. A full reload retries,
  // which lets a transiently-failed build self-heal. (Intentionally NOT
  // persisted — a stuck "already attempted" flag was why builds never retried.)
  const autoTried = new Set();

  let enhanceScheduled = false;
  let enhancing = false;

  const safeArray = (value) => (Array.isArray(value) ? value : []);
  const outlineText = (submission) => (submission?.outline?.chatOutlineText || "");
  const outlineMeta = (submission) => (submission?.outline?.chatOutlineMeta || {});

  function chatTranscript(submission) {
    return safeArray(submission.chatHistory)
      .filter((message) => message?.content)
      .map((message) => `${message.role === "assistant" ? "Coach" : "Student"}: ${String(message.content).trim()}`)
      .join("\n");
  }

  function buildPayload(assignment, submission) {
    return {
      maxTokens: 500,
      temperature: 0.3,
      system: `You are a writing coach helping a ${assignment.languageLevel || "B1"} student turn their planning chat into a working outline.

Return ONLY JSON in this shape:
{ "sections": [ { "heading": "short label", "points": ["idea", "idea"] } ] }

Rules:
- Use ONLY the student's own ideas from the chat. Do not invent new content.
- IDEAS ONLY: short note-form phrases, never full sentences the student could copy into their essay.
- 2 to 5 sections, each with 1 to 4 short bullet points.
- Keep each bullet under about 10 words and use simple language.`,
      prompt: `Assignment title: ${assignment.title}
Assignment type: ${assignment.assignmentType || "response"}
Student-facing task:
${assignment.prompt}

Planning chat between the student and the coach:
${chatTranscript(submission)}

Build the student's outline as JSON now.`,
    };
  }

  // Strip a leading/trailing markdown code fence without using a regex
  // (avoids a ReDoS-flavoured security hotspot on user-influenced text).
  function stripCodeFence(value) {
    let text = String(value || "").trim();
    if (text.startsWith("```")) {
      const firstBreak = text.indexOf("\n");
      text = firstBreak >= 0 ? text.slice(firstBreak + 1) : text.slice(3);
    }
    if (text.endsWith("```")) {
      text = text.slice(0, -3);
    }
    return text.trim();
  }

  function firstBraceIndex(text) {
    const square = text.indexOf("[");
    const curly = text.indexOf("{");
    if (square < 0) return curly;
    if (curly < 0) return square;
    return Math.min(square, curly);
  }

  function safeJsonParse(raw) {
    const text = stripCodeFence(raw);
    if (!text) return null;
    try {
      return JSON.parse(text);
    } catch {
      // Fall back to slicing out the first balanced JSON-looking span.
    }
    const start = firstBraceIndex(text);
    const end = Math.max(text.lastIndexOf("]"), text.lastIndexOf("}"));
    if (start >= 0 && end > start) {
      try {
        return JSON.parse(text.slice(start, end + 1));
      } catch {
        return null;
      }
    }
    return null;
  }

  function parseSections(raw) {
    const data = safeJsonParse(raw);
    if (!data) return [];
    const list = Array.isArray(data) ? data : safeArray(data.sections);
    return list
      .map((section) => ({
        heading: String(section?.heading || "").trim(),
        points: safeArray(section?.points)
          .map((point) => String(point || "").trim())
          .filter(Boolean),
      }))
      .filter((section) => section.heading || section.points.length)
      .slice(0, 6);
  }

  function sectionsToText(sections) {
    return sections
      .map((section) => {
        const heading = section.heading || "Ideas";
        const bullets = section.points.map((point) => `  • ${point}`).join("\n");
        return bullets ? `${heading}\n${bullets}` : heading;
      })
      .join("\n\n");
  }

  function setStatus(text, busy) {
    const el = document.getElementById(STATUS_ID);
    if (!el) return;
    el.textContent = text || "";
    el.style.color = busy ? "var(--accent-deep)" : "var(--muted)";
  }

  function writeOutlineText(submission, text) {
    submission.outline = submission.outline || {};
    submission.outline.chatOutlineText = text;
    const textarea = document.getElementById(TEXT_ID);
    if (textarea) textarea.value = text;
    globalThis.persistState?.();
    globalThis.scheduleSubmissionSync?.();
  }

  function markAttempted(submission, extra = {}) {
    submission.outline = submission.outline || {};
    submission.outline.chatOutlineMeta = {
      ...submission.outline.chatOutlineMeta,
      autoAttempted: true,
      ...extra,
    };
  }

  async function generate(assignment, submission, { force }) {
    if (typeof globalThis.requestAiGenerate !== "function") return;
    const id = submission.id;
    if (inFlight.has(id)) return;

    const existing = outlineText(submission);
    const meta = outlineMeta(submission);
    if (force && existing.trim() && meta.edited &&
      !globalThis.confirm("Rebuild your outline from the chat? This replaces your current outline text.")) {
      return;
    }

    inFlight.add(id);
    setStatus("Building your outline from the chat…", true);
    try {
      const result = await globalThis.requestAiGenerate(buildPayload(assignment, submission), {
        retries: 1,
        timeoutMs: 22000,
      });
      const sections = parseSections(result?.response);
      markAttempted(submission, {
        generatedAt: new Date().toISOString(),
        sourceChatLen: safeArray(submission.chatHistory).length,
        edited: false,
      });
      if (sections.length) {
        writeOutlineText(submission, sectionsToText(sections));
        setStatus("Outline ready — edit it freely before you write.", false);
      } else {
        globalThis.persistState?.();
        setStatus("Couldn't turn the chat into an outline. You can write your own below.", false);
      }
    } catch {
      markAttempted(submission);
      setStatus("Outline help is unavailable right now. Try “Rebuild from chat”, or write your own.", false);
    } finally {
      inFlight.delete(id);
    }
  }

  function buildPanel(submission) {
    const panel = document.createElement("div");
    panel.id = PANEL_ID;
    panel.className = "teacher-ready-card";
    panel.style.cssText = "margin-bottom:14px;border-left:4px solid var(--accent);";

    const header = document.createElement("div");
    header.style.cssText = "display:flex;justify-content:space-between;align-items:center;gap:10px;flex-wrap:wrap;margin-bottom:6px;";

    const label = document.createElement("p");
    label.className = "mini-label";
    label.style.margin = "0";
    label.textContent = "📋 Your outline (from your chat)";

    const regen = document.createElement("button");
    regen.className = "button-ghost";
    regen.type = "button";
    regen.dataset.chatOutlineRegen = "true";
    regen.style.cssText = "font-size:0.8rem;min-height:30px;padding:0 10px;";
    regen.textContent = "↻ Rebuild from chat";

    header.append(label, regen);

    const status = document.createElement("p");
    status.className = "subtle";
    status.id = STATUS_ID;
    status.style.cssText = "margin:0 0 8px;font-size:0.82rem;min-height:1em;";

    const textarea = document.createElement("textarea");
    textarea.id = TEXT_ID;
    textarea.dataset.outlineField = "chatOutlineText";
    textarea.rows = 8;
    textarea.placeholder = "Your outline will appear here. You can edit it freely before you write.";
    textarea.style.cssText = "width:100%;resize:vertical;line-height:1.6;";
    textarea.value = outlineText(submission);

    const hint = document.createElement("p");
    hint.className = "subtle";
    hint.style.cssText = "margin:8px 0 0;font-size:0.8rem;";
    hint.textContent = "These are your ideas from the coaching chat. Edit or add to them, then write your draft below.";

    panel.append(header, status, textarea, hint);
    return panel;
  }

  function ensurePanel(submission) {
    if (document.getElementById(PANEL_ID)) return;
    const editor = document.getElementById("draft-editor");
    if (!editor) return;
    const anchor = editor.closest(".editor-with-lines") || editor;
    if (!anchor.parentElement) return;
    enhancing = true;
    anchor.parentElement.insertBefore(buildPanel(submission), anchor);
    enhancing = false;
  }

  function enhance() {
    const assignment = globalThis.getStudentAssignment?.();
    const submission = globalThis.getStudentSubmission?.();
    if (!assignment || !submission) return;
    if (!assignment.autoOutlineFromChat) return;
    // #draft-editor only exists on the editable draft step (step 2), so the
    // panel and any auto-build only happen once the student is on the draft page.
    if (!document.getElementById("draft-editor")) return;
    if (safeArray(submission.chatHistory).length < 2) return;

    ensurePanel(submission);

    // Auto-build only when the outline is still empty. Existing text (even an
    // earlier auto-build) is left alone — the student rebuilds via the button.
    const id = submission.id;
    if (!outlineText(submission).trim() && !inFlight.has(id) && !autoTried.has(id)) {
      autoTried.add(id);
      generate(assignment, submission, { force: false });
    }
  }

  function scheduleEnhance() {
    if (enhanceScheduled || enhancing) return;
    enhanceScheduled = true;
    globalThis.requestAnimationFrame(() => {
      enhanceScheduled = false;
      enhance();
    });
  }

  // Student edits flip the "edited" flag so Rebuild warns before overwriting.
  // (The actual value autosaves via app.js's data-outline-field input handler.)
  document.addEventListener("input", (event) => {
    if (event.target?.id !== TEXT_ID) return;
    const submission = globalThis.getStudentSubmission?.();
    if (!submission?.outline) return;
    submission.outline.chatOutlineMeta = {
      ...submission.outline.chatOutlineMeta,
      edited: true,
    };
  });

  document.addEventListener("click", (event) => {
    const button = event.target?.closest?.("[data-chat-outline-regen]");
    if (!button) return;
    event.preventDefault();
    const assignment = globalThis.getStudentAssignment?.();
    const submission = globalThis.getStudentSubmission?.();
    if (assignment && submission) generate(assignment, submission, { force: true });
  });

  function init() {
    enhance();
    const app = document.getElementById("app");
    if (!app) return;
    new MutationObserver(scheduleEnhance).observe(app, { childList: true, subtree: true });
  }

  if (document.readyState === "loading") {
    globalThis.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }
})();
