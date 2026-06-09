// Sentry error monitoring + user feedback widget.
//
// The Sentry *Loader Script* (in index.html) downloads the SDK, but since the
// SDK auto-upgraded to v10 the loader stopped initialising a client on its own
// (Sentry.getClient() stayed null — so nothing was captured and the "Report a
// problem" widget never attached). So we take control: define the loader's
// `window.sentryOnLoad` hook (which must be set BEFORE the loader script runs)
// and call Sentry.init() ourselves.
//
// The DSN is the project's public client key — safe to ship to the browser; it
// is already embedded in the loader URL on every page.
(function () {
  const DSN = "https://ce9396547e963ef331dbb030435c4d46@o4511474685771776.ingest.de.sentry.io/4511474897715280";

  globalThis.sentryOnLoad = function () {
    if (typeof Sentry === "undefined" || typeof Sentry.init !== "function") return;
    // Don't double-initialise if the loader (or a previous call) already did.
    if (typeof Sentry.getClient === "function" && Sentry.getClient()) return;

    const integrations = [];
    if (typeof Sentry.browserTracingIntegration === "function") {
      integrations.push(Sentry.browserTracingIntegration());
    }
    if (typeof Sentry.replayIntegration === "function") {
      integrations.push(Sentry.replayIntegration());
    }
    if (typeof Sentry.feedbackIntegration === "function") {
      integrations.push(Sentry.feedbackIntegration({
        colorScheme: "light",
        buttonLabel: "Report a problem",
        submitButtonLabel: "Send report",
        formTitle: "Report a problem",
        messagePlaceholder: "What happened? What were you trying to do?",
        showBranding: false,
      }));
    }

    Sentry.init({
      dsn: DSN,
      integrations,
      // Conservative pilot-scale sampling — adjust here as needed.
      tracesSampleRate: 0.1,
      replaysSessionSampleRate: 0.1,
      replaysOnErrorSampleRate: 1,
    });
  };

  // Safety net: capture unhandled errors/rejections directly too. Guarded so
  // they no-op when Sentry is blocked (ad-blocker / VPN); Sentry's default
  // dedupe integration drops any duplicates of events its own handlers catch.
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
