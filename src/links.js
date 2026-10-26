export function readShareToken(locationLike = globalThis.location) {
  const fragment = new URLSearchParams(locationLike.hash.replace(/^#/, ""));
  const token = fragment.get("token");
  return token && /^[a-f0-9]{64}$/.test(token) ? token : null;
}
export function makeShareLink(baseUrl, token) {
  if (typeof token !== "string" || !/^[a-f0-9]{64}$/.test(token)) throw new TypeError("Token de compartilhamento inválido.");
  const url = new URL(baseUrl);
  url.hash = new URLSearchParams({ token }).toString();
  return url.toString();
}
