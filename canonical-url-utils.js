function stripTrailingSlash(value) {
  return String(value || "").replace(/\/+$/, "");
}

function normalizeHost(value) {
  return String(value || "")
    .split(",")[0]
    .trim()
    .toLowerCase()
    .replace(/^https?:\/\//, "")
    .replace(/\/.*$/, "")
    .replace(/:443$/, "")
    .replace(/:80$/, "");
}

function isLocalHost(value) {
  const host = normalizeHost(value);
  return host === "localhost" ||
    host.startsWith("localhost:") ||
    host === "127.0.0.1" ||
    host.startsWith("127.0.0.1:") ||
    host === "::1" ||
    host === "[::1]" ||
    host.startsWith("[::1]:");
}

function getConfiguredBaseUrl(env = process.env) {
  return stripTrailingSlash(
    env.PUBLIC_APP_URL ||
    env.APP_URL ||
    env.SITE_URL ||
    env.PUBLIC_SITE_URL ||
    ""
  );
}

function getSafeRedirectPath(originalUrl = "/") {
  const raw = String(originalUrl || "/").trim();

  if (!raw || /[\r\n]/.test(raw)) return "/";
  if (!raw.startsWith("/")) return "/";
  if (raw.startsWith("//")) return "/";
  if (raw.startsWith("/\\")) return "/";

  return raw;
}

function getCanonicalRedirectTarget({ method, host, originalUrl = "/", configuredBase }) {
  const verb = String(method || "GET").toUpperCase();
  if (verb !== "GET" && verb !== "HEAD") return "";

  const base = stripTrailingSlash(configuredBase);
  if (!/^https?:\/\//i.test(base)) return "";
  if (isLocalHost(base) || isLocalHost(host)) return "";

  const canonicalHost = normalizeHost(base);
  const requestHost = normalizeHost(host);
  if (!canonicalHost || !requestHost || canonicalHost === requestHost) return "";

  const path = getSafeRedirectPath(originalUrl);
  if (path.startsWith("/api/")) return "";

  return `${base}${path}`;
}

module.exports = {
  getCanonicalRedirectTarget,
  getConfiguredBaseUrl,
  getSafeRedirectPath,
  isLocalHost,
  normalizeHost,
};
