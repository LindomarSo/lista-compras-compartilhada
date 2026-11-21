import { cp, mkdir, readFile, rm, writeFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { build } from "esbuild";

const dist = new URL("../dist/", import.meta.url);

await rm(dist, { recursive: true, force: true });
await mkdir(dist, { recursive: true });

const html = await readFile(new URL("../index.html", import.meta.url), "utf8");
const builtHtml = html.replace(
  '<script type="module" src="./src/app.js"></script>',
  '<script type="module" src="./app.js"></script>',
);
await writeFile(new URL("../dist/index.html", import.meta.url), builtHtml);
const worker = await readFile(new URL("../sw.js", import.meta.url), "utf8");

await Promise.all([
  cp(new URL("../src/", import.meta.url), new URL("../dist/src/", import.meta.url), { recursive: true }),
  cp(new URL("../icons/", import.meta.url), new URL("../dist/icons/", import.meta.url), { recursive: true }),
  cp(new URL("../manifest.webmanifest", import.meta.url), new URL("../dist/manifest.webmanifest", import.meta.url)),
  writeFile(new URL("../dist/sw.js", import.meta.url), worker.replace('"./src/app.js"', '"./app.js"')),
]);

await build({
  entryPoints: [fileURLToPath(new URL("../src/app.js", import.meta.url))],
  outfile: fileURLToPath(new URL("../dist/app.js", import.meta.url)),
  bundle: true,
  format: "esm",
  platform: "browser",
  target: ["es2022"],
  sourcemap: false,
});

console.log(`Built static app at ${new URL("../dist/", import.meta.url).pathname}`);
