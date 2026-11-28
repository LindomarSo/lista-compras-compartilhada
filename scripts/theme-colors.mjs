import { readFile, writeFile } from 'node:fs/promises';

const root = new URL('../', import.meta.url);
const tokens = await readFile(new URL('src/design-system/tokens.css', root), 'utf8');
const check = process.argv.includes('--check');
const targets = [
  ['index.html', [[/(<meta name="theme-color" content=")[^"]+("\s*\/?>)/g, 'browser-theme']]],
  ['privacidade.html', [[/(<meta name="theme-color" content=")[^"]+("\s*\/?>)/g, 'browser-theme']]],
  ['manifest.webmanifest', [
    [/("background_color"\s*:\s*")[^"]+(")/g, 'pwa-background'],
    [/("theme_color"\s*:\s*")[^"]+(")/g, 'pwa-theme'],
  ]],
];

function readColor(name) {
  const token = `--lj-color-${name}`;
  const pattern = new RegExp(`^\\s*${token}:\\s*(#[\\da-f]{3}(?:[\\da-f]{3})?);`, 'gim');
  const matches = [...tokens.matchAll(pattern)];
  if (matches.length !== 1) throw new Error(`Defina ${token} uma vez como cor hexadecimal em tokens.css.`);
  return matches[0][1];
}

const updates = await Promise.all(targets.map(async ([filename, fields]) => {
  const path = new URL(filename, root);
  const original = await readFile(path, 'utf8');
  let updated = original;
  for (const [pattern, token] of fields) {
    if ([...original.matchAll(pattern)].length !== 1) {
      throw new Error(`Esperado um campo para --lj-color-${token} em ${filename}.`);
    }
    updated = updated.replace(pattern, (_, before, after) => `${before}${readColor(token)}${after}`);
  }
  return { filename, path, original, updated };
}));

const stale = updates.filter(({ original, updated }) => original !== updated);
if (check && stale.length) {
  console.error(`Cores do tema desatualizadas em ${stale.map(({ filename }) => filename).join(', ')}. Rode npm run tokens:sync.`);
  process.exitCode = 1;
} else if (!check) {
  await Promise.all(stale.map(({ path, updated }) => writeFile(path, updated)));
}
