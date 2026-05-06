function getTeacherReviewSavedAt(review) {
  return String(review?.savedAt || review?.saved_at || "").trim();
}

function teacherReviewWasNewlySaved(previousReview, nextReview) {
  const nextSavedAt = getTeacherReviewSavedAt(nextReview);
  if (!nextSavedAt) return false;
  return nextSavedAt !== getTeacherReviewSavedAt(previousReview);
}

function submissionWasReopened(previousSubmission, nextSubmission) {
  const previousStatus = String(previousSubmission?.status || "").toLowerCase();
  const nextStatus = String(nextSubmission?.status || "").toLowerCase();
  return nextStatus === "draft" && previousStatus && previousStatus !== "draft";
}

function appendResetQuery(urlValue = "") {
  const raw = String(urlValue || "").trim();
  if (!raw) return "";

  try {
    const url = new URL(raw);
    url.searchParams.set("reset", "1");
    url.hash = "";
    return url.toString();
  } catch (_) {
    const stripped = raw.replace(/[?#].*$/, "").replace(/\/+$/, "");
    return `${stripped}/?reset=1`;
  }
}

function forceActionLinkRedirect(actionLink = "", redirectTo = "") {
  const rawLink = String(actionLink || "").trim();
  const targetRedirect = String(redirectTo || "").trim();
  if (!rawLink || !targetRedirect) return rawLink;

  try {
    const url = new URL(rawLink);
    url.searchParams.set("redirect_to", targetRedirect);
    return url.toString();
  } catch (_) {
    return rawLink;
  }
}

module.exports = {
  appendResetQuery,
  forceActionLinkRedirect,
  getTeacherReviewSavedAt,
  submissionWasReopened,
  teacherReviewWasNewlySaved,
};
