// The Sentry loader defines a global `Sentry` stub synchronously. If a student's
// ad-blocker, VPN, or network blocks the Sentry CDN, that global never appears —
// so guard before touching it rather than throwing at the top of the page.
if (typeof Sentry !== "undefined" && typeof Sentry.onLoad === "function") {
  Sentry.onLoad(function () {
    // The loader script already called Sentry.init() (with Replay + performance
    // enabled via the dashboard config). Calling init() again would register a
    // second Replay instance and throw. Use addIntegration() to attach the
    // feedback widget to the already-running SDK instead.
    Sentry.addIntegration(Sentry.feedbackIntegration({
      colorScheme: "light",
      buttonLabel: "Report a problem",
      submitButtonLabel: "Send report",
      formTitle: "Report a problem",
      messagePlaceholder: "What happened? What were you trying to do?",
      showBranding: false,
    }));
  });
}

// Capture unhandled JS errors and promise rejections automatically.
// These listeners are safe even when Sentry is blocked — they no-op if the
// global isn't present. Registered outside onLoad so they fire immediately.
globalThis.addEventListener("unhandledrejection", function (event) {
  if (typeof Sentry !== "undefined" && typeof Sentry.captureException === "function") {
    Sentry.captureException(event.reason instanceof Error ? event.reason : new Error(String(event.reason || "Unhandled promise rejection")));
  }
});

globalThis.addEventListener("error", function (event) {
  if (typeof Sentry !== "undefined" && typeof Sentry.captureException === "function") {
    Sentry.captureException(event.error instanceof Error ? event.error : new Error(event.message || "Uncaught error"));
  }
});
