import { parseDecimal } from '../../../shared/locale-preferences.ts';

export function priceCandidates(text: string): number[] {
  const matches = text.matchAll(/(?<![\d.,-])(?:\d{1,3}(?:\.\d{3})+,\s*\d{2}|\d{1,3}(?:,\d{3})+\.\s*\d{2}|\d+\s*[,.]\s*\d{2})(?![\d.,])/g);
  const values = Array.from(matches, match => parseDecimal(match[0].replace(/\s/g, ''), 2));
  return [...new Set(values.filter((value): value is number => value !== null && Number.isFinite(value) && value <= 100000000))];
}
