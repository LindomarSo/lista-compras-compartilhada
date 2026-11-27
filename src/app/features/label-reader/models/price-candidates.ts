export function priceCandidates(text: string): number[] {
  const matches = [...text.matchAll(/(?<![\d.,-])(?:R\$\s*)?((?:\d{1,3}(?:\.\d{3})+|\d+)\s*[,\.]\s*\d{2})(?![\d.,])/gi)];
  const values = matches.map(match => {
    const raw = (match[1] ?? '').replace(/\s/g, '');
    return Number(raw.includes(',') ? raw.replace(/\./g, '').replace(',', '.') : raw);
  });
  return [...new Set(values.filter(value => Number.isFinite(value) && value <= 100000000))];
}
