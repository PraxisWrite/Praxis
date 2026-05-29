// The Sentry loader defines a global `Sentry` stub synchronously. If a student's
// ad-blocker, VPN, or network blocks the Sentry CDN, that global never appears —
// so guard before touching it rather than throwing at the top of the page.
if (typeof Sentry !== "undefined" && typeof Sentry.onLoad === "function") {
  Sentry.onLoad(function () {
    Sentry.init({
      integrations: [
        Sentry.feedbackIntegration({
          colorScheme: "light",
          buttonLabel: "Report a problem",
          submitButtonLabel: "Send report",
          formTitle: "Report a problem",
          messagePlaceholder: "What happened? What were you trying to do?",
          showBranding: false,
        }),
      ],
    });
  });
}
