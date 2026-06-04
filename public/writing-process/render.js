(() => {
  const root = globalThis.window === undefined ? {} : globalThis.PraxisWritingProcess || {};

  function escapeHtml(value) {
    return String(value || "")
      .replaceAll("&", "&amp;")
      .replaceAll("<", "&lt;")
      .replaceAll(">", "&gt;")
      .replaceAll('"', "&quot;")
      .replaceAll("'", "&#39;");
  }

  function statusStyle(status) {
    if (status === root.STATUS?.CLOSE) return { bg: "#fff1f4", border: "#e07a93", color: "#9b3651" };
    if (status === root.STATUS?.REVIEW) return { bg: "#fff8e8", border: "#f0c870", color: "#8a5a00" };
    if (status === root.STATUS?.INSUFFICIENT) return { bg: "#f5f6f8", border: "#d8dee8", color: "#647084" };
    return { bg: "#eef9f1", border: "#bfe2ca", color: "#1f6b42" };
  }

  function formatMetricValue(key, value) {
    if (value === null || value === undefined) return "—";
    if (key === "productProcessRatio" || key === "pasteShare") return `${Math.round(Number(value) * 100)}%`;
    if (key === "typingRate") return `${value} chars/min`;
    if (key === "longPauses") return `${value}/100w`;
    if (key === "localRevisions") return `${value}/100w`;
    return String(value);
  }

  // Plain-language reading of where this student sits, so a teacher does not
  // have to decode the range bar. Wording is deliberately non-accusatory —
  // every line is a "might suggest", never a verdict.
  const METRIC_INTERPRETATIONS = {
    typingRate: {
      within: "Typical typing pace for this level.",
      below: "Slower typing than typical — often just careful or less fluent typing.",
      above: "Faster typing than typical — worth a glance at the timeline and paste evidence.",
    },
    longPauses: {
      within: "A typical amount of thinking pauses.",
      below: "Fewer thinking pauses than typical — some text may have been planned elsewhere.",
      above: "More thinking pauses than typical — usually careful composing.",
    },
    localRevisions: {
      within: "A typical amount of in-line revising.",
      below: "Less in-line revising than typical — little reworking while writing.",
      above: "More in-line revising than typical — lots of reworking while drafting.",
    },
    productProcessRatio: {
      within: "A typical share of typed text survived into the final.",
      below: "Less text survived than typical — heavy rewriting.",
      above: "Most typed text survived unchanged — little revising.",
    },
  };

  function metricStatusKind(position) {
    if (position === "within") return "within";
    if (position === "below" || position === "above") return "out";
    return "none";
  }

  function renderMetricCard({ key, label, value, coachValue, range, position, help }) {
    const [low, high] = Array.isArray(range) ? range : [0, 1];
    const numeric = Number(value || 0);
    const pct = high > low ? Math.max(0, Math.min(100, ((numeric - low) / (high - low)) * 100)) : 50;
    // Comparative wording (vs peers, not a pass/fail "range"), with a symbol so
    // it reads without relying on colour perception.
    const tagTexts = { within: "✓ like peers", below: "↓ below peers", above: "↑ above peers" };
    const tag = tagTexts[position] || "— no peer data";
    const kind = metricStatusKind(position);
    const interpretation = METRIC_INTERPRETATIONS[key]?.[position] || "";
    return `
      <div class="process-metric-card process-metric-card--${kind}">
        <div style="display:flex;justify-content:space-between;gap:10px;align-items:flex-start;">
          <div>
            <div class="mini-label" title="${escapeHtml(help || "")}">${escapeHtml(label)}</div>
            <div class="process-metric-value">${escapeHtml(formatMetricValue(key, value))}</div>
          </div>
          <span class="process-metric-tag process-metric-tag--${kind}">${escapeHtml(tag)}</span>
        </div>
        <div class="process-range">
          <div class="process-range-band"></div>
          <div class="process-range-dot process-range-dot--${kind}" style="left:calc(${pct}% - 5px);"></div>
        </div>
        <div style="display:flex;justify-content:space-between;margin-top:4px;font-size:0.72rem;color:var(--muted);">
          <span>${escapeHtml(formatMetricValue(key, low))}</span>
          <span>${escapeHtml(formatMetricValue(key, high))}</span>
        </div>
        ${interpretation ? `<p class="process-metric-read" style="margin:8px 0 0;font-size:0.76rem;">${escapeHtml(interpretation)}</p>` : ""}
        <p style="margin:6px 0 0;font-size:0.74rem;color:var(--muted);">Coach/outline baseline: ${coachValue === null || coachValue === undefined ? "not enough data yet" : escapeHtml(formatMetricValue(key, coachValue))}</p>
      </div>
    `;
  }

  function renderTimeline(timeline = []) {
    if (!timeline.length) return "";
    // Skip the leading empty segments (before any typing) so the chart starts
    // at the first writing activity instead of a row of flat bars.
    const firstActive = timeline.findIndex((bucket) => Number(bucket.typedChars || 0) > 0 || Number(bucket.pasteChars || 0) > 0);
    const visible = firstActive > 0 ? timeline.slice(firstActive) : timeline;
    return `
      <div class="process-timeline-header">
        <span>Activity timeline</span>
        <span>Blue bars show typed characters in each time segment. Pink dot = paste or bulk insert. The bar highlights as the replay plays.</span>
      </div>
      <div class="process-timeline" id="process-timeline" aria-label="Writing process timeline" style="grid-template-columns:repeat(${visible.length}, minmax(8px, 1fr));">
        ${visible.map((bucket) => {
          const height = Math.max(8, Math.round(58 * Number(bucket.intensity || 0)));
          const paste = Number(bucket.pasteChars || 0) > 0;
          return `
            <div class="process-timeline-bucket" data-start-ms="${Math.round(Number(bucket.startMs || 0))}" data-end-ms="${Math.round(Number(bucket.endMs || 0))}" title="${escapeHtml(bucket.label)} · ${bucket.typedChars} typed chars${paste ? ` · ${bucket.pasteChars} paste chars` : ""}">
              ${paste ? `<span class="process-paste-pin"></span>` : ""}
              <span class="process-timeline-bar" style="height:${height}px;"></span>
            </div>
          `;
        }).join("")}
      </div>
    `;
  }

  function renderTeacherPanel(submission = {}, assignment = {}, options = {}) {
    if (!root.analyzeSubmission) return "";
    const analysis = root.analyzeSubmission(submission, assignment, options);
    const style = statusStyle(analysis.status);
    const defs = root.METRIC_DEFINITIONS || {};
    const ranges = analysis.cohortComparison?.ranges || {};
    const positions = analysis.cohortComparison?.positions || {};
    const metrics = analysis.metrics || {};
    const coach = analysis.coachBaseline || {};
    const idlePauseNote = Number(metrics.ignoredIdlePauseCount || 0) > 0
      ? `<p class="subtle" style="margin:0 0 12px;font-size:0.78rem;">${escapeHtml(String(metrics.ignoredIdlePauseCount))} longer gap${Number(metrics.ignoredIdlePauseCount) === 1 ? "" : "s"} over 2 minutes treated as idle or away time, not thinking pauses.</p>`
      : "";
    const pasteEventCount = Number(metrics.pasteEventCount || 0);
    let pasteFlagMarkup = "";
    if (pasteEventCount > 0) {
      const pasteEventPlural = pasteEventCount === 1 ? "" : "s";
      pasteFlagMarkup = `<span class="process-paste-flag" title="${escapeHtml(String(metrics.pasteEventCount))} paste-like event${pasteEventPlural} detected while writing — check the timeline pins and the replay.">⚠ Paste flag</span>`;
    }
    const metricCards = [
      { key: "typingRate", label: defs.typingRate?.label || "Typing rate", value: metrics.typingRate, coachValue: coach.typingRate, range: ranges.typingRate, position: positions.typingRate, help: defs.typingRate?.help },
      { key: "longPauses", label: defs.longPauses?.label || "Long thinking pauses", value: metrics.longPausesPer100w, coachValue: null, range: ranges.longPauses, position: positions.longPauses, help: defs.longPauses?.help },
      { key: "localRevisions", label: defs.localRevisions?.label || "Local revisions", value: metrics.localRevisionsPer100w, coachValue: coach.localRevisionsPer100w, range: ranges.localRevisions, position: positions.localRevisions, help: defs.localRevisions?.help },
      { key: "productProcessRatio", label: defs.productProcessRatio?.label || "Text survival", value: metrics.productProcessRatio, coachValue: null, range: ranges.productProcessRatio, position: positions.productProcessRatio, help: defs.productProcessRatio?.help },
    ];

    return `
      <section class="process-panel" style="border-color:${style.border};background:${style.bg};">
        <div class="process-panel-header">
          <div>
            <p class="mini-label" style="margin:0 0 4px;">Writing process check</p>
            <div style="display:flex;align-items:center;gap:10px;flex-wrap:wrap;position:relative;">
              <span class="process-status-pill" style="color:${style.color};border-color:${style.border};background:#fff;">${escapeHtml(analysis.statusLabel)}</span>
              ${pasteFlagMarkup}
              <span onclick="var t=this.nextElementSibling;var wasHidden=t.style.display==='none';t.style.display=wasHidden?'block':'none';if(wasHidden){setTimeout(function(){document.addEventListener('click',function h(){t.style.display='none';document.removeEventListener('click',h);},{once:true});},0);}" style="cursor:pointer;font-size:0.75rem;color:var(--muted);border:1px solid var(--line);border-radius:50%;width:18px;height:18px;display:inline-flex;align-items:center;justify-content:center;flex-shrink:0;" title="What do these labels mean?">?</span>
              <div style="display:none;position:absolute;top:100%;left:0;z-index:100;width:min(360px,85vw);margin-top:6px;padding:12px 14px;background:#fff;border:1px solid var(--line);border-radius:10px;box-shadow:0 4px 16px rgba(0,0,0,0.10);font-size:0.80rem;line-height:1.55;color:var(--ink);">
                <p style="margin:0 0 6px;font-weight:600;">How this label is determined</p>
                <p style="margin:0 0 8px;">This single label combines every process signal into one of four bands: keystroke checks (pastes, fluency, revision) plus any metric that sits clearly outside the peer range for this level. The chips below the label show which signals contributed.</p>
                <p style="margin:0 0 4px;"><strong>Typical process</strong> — no unusual patterns; the writing looks like normal drafting with revisions and pauses.</p>
                <p style="margin:0 0 4px;"><strong>Review suggested</strong> — one moderate signal worth checking (e.g. a large paste, very little revision, or unusual pause distribution).</p>
                <p style="margin:0 0 4px;"><strong>Close review needed</strong> — three or more independent signals are unusual together. Look at the timeline, paste evidence, and playback before deciding.</p>
                <p style="margin:0 0 8px;"><strong>Not enough writing data</strong> — fewer than 80 final words, so process signals can't be interpreted reliably.</p>
                <p style="margin:0;color:var(--muted);font-style:italic;">This panel is one signal — always interpret alongside the playback. No single indicator is conclusive.</p>
              </div>
              ${analysis.excludedFromAnalytics ? `<span class="process-excluded-pill">Excluded from analytics pool</span>` : ""}
            </div>
          </div>
          <div class="process-summary-stats">
            <span>${escapeHtml(String(metrics.finalWords || 0))} words</span>
            <span>${escapeHtml(String(metrics.pasteEventCount || 0))} paste-like events</span>
            <span>${escapeHtml(String(metrics.localRevisions || 0))} local revisions</span>
          </div>
        </div>
        <p class="process-reason" style="color:${style.color};">${escapeHtml(analysis.reason)}</p>
        ${analysis.evidence.length ? `
          <div class="process-chip-row">
            ${analysis.evidence.map((item) => `<span class="process-chip" title="${escapeHtml(item.detail)}">${escapeHtml(item.label)}</span>`).join("")}
          </div>
        ` : `<p class="subtle" style="margin:0 0 12px;">No specific process signals were flagged.</p>`}
        ${idlePauseNote}
        ${renderTimeline(analysis.timeline)}
        <div class="process-detail-head">
          <p class="mini-label" style="margin:0;">Writing-style detail</p>
          <p class="subtle" style="margin:2px 0 0;font-size:0.78rem;">
            Peer comparison for each measure. Deviations from the reference group feed the check above — hover the chips above to see which ones contributed.
          </p>
        </div>
        <div class="process-metric-grid">
          ${metricCards.map(renderMetricCard).join("")}
        </div>
        <p class="subtle" style="font-size:0.76rem;margin:12px 0 0;">
          Reference ranges are preliminary L2 writing-process ranges for ${escapeHtml(analysis.cohortComparison?.level || "B1")} (n=${escapeHtml(String(analysis.cohortComparison?.n || 0))}) and should be interpreted with playback and teacher judgment.
        </p>
      </section>
    `;
  }

  const api = { renderTeacherPanel };

  if (typeof module !== "undefined" && module.exports) {
    module.exports = api;
  }

  if (globalThis.window !== undefined) {
    globalThis.PraxisWritingProcess = {
      ...(globalThis.PraxisWritingProcess || {}),
      ...api,
    };
  }
})();
