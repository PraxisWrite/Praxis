// app-constants.js
// Shared application-wide constants and error-code helpers.
// Extracted from app.js (Phase 1 refactor).
// Exposes window.AppConstants for use by app.js and any other modules.

(function () {
  const STORAGE_KEY = "AUIZero-v1";
  const RUBRIC_LIBRARY_KEY = "AUIZero-rubric-library-v1";
  const STORAGE_BACKUP_KEY = "AUIZero-v1-backup";
  const ACTIVE_CLASS_KEY = "AUIZero-active-class-v1";
  const ACTIVE_STUDENT_ASSIGNMENT_KEY = "AUIZero-active-student-assignment-v1";
  const CUSTOM_ERROR_CODES_KEY = "AUIZero-custom-error-codes-v1";
  const CUSTOM_ASSIGNMENT_TYPES_KEY = "AUIZero-custom-assignment-types-v1";
  const LARGE_PASTE_LIMIT = 220;
  const PRODUCT_NAME = "praxis";
  const PRODUCT_TAGLINE = "Think clearly. Write clearly.";
  const REVIEW_REFRESH_MS = 30000;
  const ADMIN_REFRESH_MS = 30000;

  const BASE_ERROR_CODES = [
    { code: "CS",  label: "Comma splice: two complete sentences joined with only a comma" },
    { code: "RO",  label: "Run-on: two or more sentences run together without correct punctuation" },
    { code: "FR",  label: "Fragment: incomplete sentence — missing a subject or verb" },
    { code: "P",   label: "Missing punctuation: a period, comma, or other mark is needed here" },
    { code: "VT",  label: "Wrong verb tense: doesn't match the tense of the rest of the text" },
    { code: "WF",  label: "Wrong word form: e.g. adjective used where an adverb is needed" },
    { code: "AGR", label: "Agreement error: subject and verb, or noun and pronoun, don't agree" },
    { code: "SP",  label: "Spelling error" },
  ];

  // Base assignment types offered when building an assignment. "other" must
  // stay last because selecting it reveals the free-text "describe" input.
  const BASE_ASSIGNMENT_TYPES = [
    "argument",
    "opinion",
    "narrative",
    "informational",
    "process",
    "definition",
    "compare/contrast",
    "cause and effect",
    "classification",
    "intro only",
    "body only",
    "conclusion only",
    "response",
    "other",
  ];

  function loadCustomAssignmentTypes() {
    try {
      const storage = (globalThis.window !== undefined && globalThis.localStorage) || null;
      if (!storage) return [];
      const parsed = JSON.parse(storage.getItem(CUSTOM_ASSIGNMENT_TYPES_KEY) || "[]");
      return Array.isArray(parsed) ? parsed : [];
    } catch {
      return [];
    }
  }

  function saveCustomAssignmentTypes(types) {
    try {
      const storage = (globalThis.window !== undefined && globalThis.localStorage) || null;
      if (!storage) return;
      storage.setItem(CUSTOM_ASSIGNMENT_TYPES_KEY, JSON.stringify(types || []));
    } catch {
      // Ignore localStorage failures and keep assignment creation usable.
    }
  }

  function getAssignmentTypes() {
    const custom = loadCustomAssignmentTypes()
      .map((entry) => String(entry || "").trim().toLowerCase())
      .filter(Boolean);
    const seen = new Set();
    const ordered = [];
    for (const type of [...BASE_ASSIGNMENT_TYPES, ...custom]) {
      // Pin "other" to the very end (added after the loop) so the free-text
      // input always sits last regardless of any custom additions.
      if (type === "other" || seen.has(type)) continue;
      seen.add(type);
      ordered.push(type);
    }
    ordered.push("other");
    return ordered;
  }

  function loadCustomErrorCodes() {
    try {
      const storage = (globalThis.window !== undefined && globalThis.localStorage) || null;
      if (!storage) return [];
      return JSON.parse(storage.getItem(CUSTOM_ERROR_CODES_KEY) || "[]");
    } catch {
      return [];
    }
  }

  function saveCustomErrorCodes(entries) {
    try {
      const storage = (globalThis.window !== undefined && globalThis.localStorage) || null;
      if (!storage) return;
      storage.setItem(CUSTOM_ERROR_CODES_KEY, JSON.stringify(entries || []));
    } catch {
      // Ignore localStorage failures and keep grading usable.
    }
  }

  function getErrorCodes() {
    const custom = loadCustomErrorCodes()
      .filter((entry) => entry?.code && entry?.label)
      .map((entry) => ({
        code: String(entry.code).trim().toUpperCase().slice(0, 8),
        label: String(entry.label).trim(),
        custom: true,
      }))
      .filter((entry) => entry.code && entry.label);
    const seen = new Set();
    return [...BASE_ERROR_CODES, ...custom].filter((entry) => {
      if (seen.has(entry.code)) return false;
      seen.add(entry.code);
      return true;
    });
  }

  function getErrorCodeLabel(code) {
    return getErrorCodes().find((entry) => entry.code === code)?.label || "";
  }

  const AppConstants = {
    STORAGE_KEY,
    RUBRIC_LIBRARY_KEY,
    STORAGE_BACKUP_KEY,
    ACTIVE_CLASS_KEY,
    ACTIVE_STUDENT_ASSIGNMENT_KEY,
    CUSTOM_ERROR_CODES_KEY,
    CUSTOM_ASSIGNMENT_TYPES_KEY,
    LARGE_PASTE_LIMIT,
    PRODUCT_NAME,
    PRODUCT_TAGLINE,
    REVIEW_REFRESH_MS,
    ADMIN_REFRESH_MS,
    BASE_ERROR_CODES,
    BASE_ASSIGNMENT_TYPES,
    loadCustomErrorCodes,
    saveCustomErrorCodes,
    getErrorCodes,
    getErrorCodeLabel,
    loadCustomAssignmentTypes,
    saveCustomAssignmentTypes,
    getAssignmentTypes,
  };

  if (globalThis.window !== undefined) {
    globalThis.AppConstants = AppConstants;
  }
  if (typeof module !== "undefined" && module.exports) {
    module.exports = AppConstants;
  }
})();