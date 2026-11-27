export const tokenPattern = /^[a-f0-9]{64}$/;
export const sharedPrefix = 'a112da7a';

export function readShareToken(locationLike: { hash: string } = globalThis.location): string | null {
  const token = new URLSearchParams(locationLike.hash.replace(/^#/, '')).get('token');
  return token && tokenPattern.test(token) ? token : null;
}

export function readShareTokenFromUrl(input: string, expectedBaseUrl: string): string | null {
  try {
    const incoming = new URL(input);
    const expected = new URL(expectedBaseUrl);
    if (incoming.protocol !== 'https:' || incoming.origin !== expected.origin || incoming.pathname !== expected.pathname) return null;
    return readShareToken(incoming);
  } catch {
    return null;
  }
}

export function makeShareLink(baseUrl: string, token: string): string {
  if (!tokenPattern.test(token)) throw new TypeError('Token de compartilhamento inválido.');
  const url = new URL(baseUrl);
  url.hash = new URLSearchParams({ token }).toString();
  return url.toString();
}

export function legacyRoute(fragment: string): string | null {
  const value = fragment.replace(/^#?\/?/, '');
  if (value === 'balanco') return '/balanco';
  const params = new URLSearchParams(value);
  if (params.has('token')) {
    const token = readShareToken({ hash: value });
    return token ? '/listas/compartilhada/' + token + '?convite=1' : '/listas?aviso=convite';
  }
  if (params.has('local')) {
    const token = params.get('local');
    return token && tokenPattern.test(token) ? '/listas/local/' + token : '/listas?aviso=local';
  }
  return null;
}
