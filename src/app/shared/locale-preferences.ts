export type Language = 'pt-BR' | 'en' | 'es';
export type Currency = 'BRL' | 'USD' | 'EUR' | 'MXN';

const euroRegions = new Set('AD AT AX BE BG BL CY DE EE ES FI FR GF GP GR HR IE IT LT LU LV MC ME MF MQ MT NL PM PT RE SI SK SM TF VA XK YT'.split(' '));

export function isCurrency(value: unknown): value is Currency {
  return value === 'BRL' || value === 'USD' || value === 'EUR' || value === 'MXN';
}

export function listCurrency(list?: { currency?: Currency } | null): Currency {
  return list?.currency ?? 'BRL';
}

export function resolvePreferences(tags: readonly string[]) {
  const locales = tags.flatMap(tag => {
    try { return [new Intl.Locale(tag)]; }
    catch { return []; }
  });
  const primaryRegion = locales[0]?.region;
  const currency: Currency = primaryRegion === 'US' ? 'USD' : primaryRegion === 'MX' ? 'MXN'
    : primaryRegion && euroRegions.has(primaryRegion) ? 'EUR' : 'BRL';
  const locale = locales.find(entry => ['pt', 'en', 'es'].includes(entry.language));
  const language: Language = locale?.language === 'en' || locale?.language === 'es' ? locale.language : 'pt-BR';
  return { language, locale: locale?.baseName ?? 'pt-BR', currency };
}

export function parseDecimal(text: string, maxFractionDigits = 20): number | null {
  const raw = text.trim();
  if (!raw) return null;
  // Accept either decimal separator. Grouped prices are unambiguous when both separators appear.
  const normalized = /^\d{1,3}(\.\d{3})+,\d+$/.test(raw) ? raw.replaceAll('.', '').replace(',', '.')
    : /^\d{1,3}(,\d{3})+\.\d+$/.test(raw) ? raw.replaceAll(',', '') : raw.replace(',', '.');
  if (!/^\d*(?:\.\d*)?$/.test(normalized) || !/\d/.test(normalized)
    || (normalized.split('.')[1]?.length ?? 0) > maxFractionDigits) return NaN;
  return Number(normalized);
}
