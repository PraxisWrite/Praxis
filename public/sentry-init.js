Sentry.onLoad(function() {
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
