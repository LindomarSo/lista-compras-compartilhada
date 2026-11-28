import { computed } from '@angular/core';
import { preferences } from '../core/locale.ts';
import type { Currency } from './locale-preferences.ts';

const currencyFormats = computed(() => ({ locale: preferences().locale, formats: new Map<string, Intl.NumberFormat>() }));

export function formatCurrency(value: number, currency: Currency, showCode = false): string {
  const { locale, formats } = currencyFormats();
  const key = currency + (showCode ? ':code' : ':symbol');
  let formatter = formats.get(key);
  if (!formatter) {
    formatter = new Intl.NumberFormat(locale, {
      style: 'currency', currency, currencyDisplay: showCode ? 'code' : 'symbol',
    });
    formats.set(key, formatter);
  }
  return formatter.format(value);
}
