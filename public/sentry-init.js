// Error monitoring. This file is loaded *before* the (async) Sentry loader, so
// it defines the loader's `sentryOnLoad` hook up front. The loader invokes
// `sentryOnLoad` once the SDK has downloaded — regardless of the async timing —
// so the feedback widget always attaches even though the loader no longer blocks
// rendering.
//
// We deliberately do NOT call Sentry.init() here: the loader runs its own init()
// using the Sentry dashboard config (Replay + performance). We only attach the
// feedback widget, post-init, via Sentry.onLoad().
(function () {
  let feedbackRegistered = false;

  function registerSentryFeedback() {
    if (feedbackRegistered) return;
    if (typeof Sentry === "undefined" || typeof Sentry.onLoad !== "function") return;
    feedbackRegistered = true;
    Sentry.onLoad(function () {
      if (typeof Sentry.feedbackIntegration !== "function") return;
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

  // Normal path: the async loader runs after this file and calls sentryOnLoad.
  globalThis.sentryOnLoad = registerSentryFeedback;

  // Fallback: if the loader already executed (e.g. served from cache and run
  // before this file), register now. The guard keeps it to a single widget.
  if (typeof Sentry !== "undefined" && typeof Sentry.onLoad === "function") {
    registerSentryFeedback();
  }

  // Capture unhandled JS errors and promise rejections automatically. Safe even
  // when Sentry is blocked (ad-blocker / VPN) — they no-op if the global is
  // absent. Registered immediately so they cover the deferred app scripts.
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
})();
