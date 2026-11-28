import { computed, signal } from '@angular/core';
import { Capacitor, registerPlugin } from '@capacitor/core';
import { resolvePreferences } from '../shared/locale-preferences.ts';
import { translations } from './translations.ts';

const storedPreferences = signal(resolvePreferences([]));
export const preferences = storedPreferences.asReadonly();

const nativeLocale = registerPlugin<{
  getLocales(): Promise<{ locales: string[] }>;
}>('DeviceLocales');

let revision = 0;

export function t(source: string, values: Record<string, string | number> = {}): string {
  const { language } = preferences();
  const pair = Object.hasOwn(translations, source) ? translations[source] : undefined;
  const pattern = pair && language !== 'pt-BR' ? pair[language === 'en' ? 0 : 1] : source;
  return pattern.replace(/\{(\w+)\}/g, (placeholder, key: string) => String(values[key] ?? placeholder));
}

const numberFormat = computed(() => new Intl.NumberFormat(preferences().locale, { maximumFractionDigits: 20 }));
const priceFormat = computed(() => new Intl.NumberFormat(preferences().locale, { minimumFractionDigits: 2, maximumFractionDigits: 2 }));
export const numberLabel = (value: number) => numberFormat().format(value);
export const examplePrice = () => priceFormat().format(5.9);

export function unitLabel(unit: string): string {
  if (unit === 'un' || unit === 'pacote' || unit === 'caixa') return t(unit);
  return unit;
}

export async function initializeLocale(): Promise<void> {
  const refresh = async () => {
    const request = ++revision;
    const browserLocales = navigator.languages?.length ? navigator.languages : [navigator.language];
    const device = Capacitor.getPlatform() === 'android' && Capacitor.isPluginAvailable('DeviceLocales')
      ? await nativeLocale.getLocales().catch(() => null) : null;
    if (request !== revision) return;
    const next = resolvePreferences(device?.locales.length ? device.locales : browserLocales);
    storedPreferences.set(next);
    document.documentElement.lang = next.language;
  };
  window.addEventListener('languagechange', () => void refresh());
  document.addEventListener('visibilitychange', () => { if (!document.hidden) void refresh(); });
  window.addEventListener('lista-junto-native-active', event => {
    if ((event as CustomEvent<boolean>).detail) void refresh();
  });
  await refresh();
}
