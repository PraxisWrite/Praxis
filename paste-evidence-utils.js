(() => {
  function compactWhitespace(text = "") {
    return String(text || "").replace(/\s+/g, " ").trim();
  }

  function buildBoundaryExcerpt(text = "", options = {}) {
    const compact = compactWhitespace(text);
    const excerptLength = Math.max(80, Number(options.excerptLength || 180));
    if (!compact) {
      return {
        start: "",
        end: "",
        truncated: false,
      };
    }

    if (compact.length <= (excerptLength * 2) + 40) {
      return {
        start: compact,
        end: "",
        truncated: false,
      };
    }

    return {
      start: compact.slice(0, excerptLength).trim(),
      end: compact.slice(-excerptLength).trim(),
      truncated: true,
    };
  }

  function getEvidenceKindLabel(kind) {
    return kind === "paste" ? "Paste event" : "Large single insert";
  }

  function getEvidenceStatusLabel(foundExact) {
    return foundExact ? "Still found in final text" : "Edited or removed";
  }

  window.PasteEvidenceUtils = {
    buildBoundaryExcerpt,
    compactWhitespace,
    getEvidenceKindLabel,
    getEvidenceStatusLabel,
  };
})();
