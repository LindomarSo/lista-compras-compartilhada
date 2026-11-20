export function readShareToken(locationLike = globalThis.location) {
  const fragment = new URLSearchParams(locationLike.hash.replace(/^#/, ""));
  const token = fragment.get("token");
  return token && /^[a-f0-9]{64}$/.test(token) ? token : null;
}
export function readShareTokenFromUrl(input, expectedBaseUrl) {
  try {
    const incoming = new URL(input);
    const expected = new URL(expectedBaseUrl);
    if (incoming.protocol !== "https:" || incoming.origin !== expected.origin || incoming.pathname !== expected.pathname) return null;
    const token = new URLSearchParams(incoming.hash.replace(/^#/, "")).get("token");
    return token && /^[a-f0-9]{64}$/.test(token) ? token : null;
  } catch {
    return null;
  }
}
export function makeShareLink(baseUrl, token) {
  if (typeof token !== "string" || !/^[a-f0-9]{64}$/.test(token)) throw new TypeError("Token de compartilhamento inválido.");
  const url = new URL(baseUrl);
  url.hash = new URLSearchParams({ token }).toString();
  return url.toString();
}
