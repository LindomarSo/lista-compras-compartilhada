import { copyFile } from 'node:fs/promises';

await copyFile(new URL('../dist/ngsw-worker.js', import.meta.url), new URL('../dist/sw.js', import.meta.url));
