/**
 * NEXA UI demo — link and asset audit.
 *
 * Scans every page and page script for internal references (`href="x.html"`,
 * `src="assets/y.js"`, `location.href = '...'`, `<link href>`) and reports any
 * target that does not exist on disk. Catches the classic prototype rot where a
 * screen links to a page that was never built, or an icon/asset path is wrong.
 *
 * Run:  node docs/ui-demo/tools/check-links.mjs
 */

import { readdirSync, readFileSync, existsSync } from 'node:fs';
import { dirname, resolve, join, basename } from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(HERE, '..');

const htmlFiles = readdirSync(ROOT).filter((f) => f.endsWith('.html'));
const assetFiles = readdirSync(join(ROOT, 'assets')).filter((f) => f.endsWith('.js'));
const files = [...htmlFiles, ...assetFiles.map((f) => `assets/${f}`)];

/** Every internal target we care about, per source file. */
const REFERENCE_PATTERNS = [
  /href="([^"#][^"]*\.html)(?:[?#][^"]*)?"/g, // <a href> / <link href> to a page
  /href="(assets\/[^"]+)"/g, // <link href="assets/*.css">
  /src="(assets\/[^"]+)"/g, // <script src="assets/*.js">
  /location\.href\s*=\s*'([^']+)'/g, // JS navigation
  /location\.href\s*=\s*"([^"]+)"/g,
  /^\s*\[([a-z0-9-]+\.html)\]:/gm, // manifest-style key
];

const problems = [];
const seen = new Map();

for (const file of files) {
  const full = join(ROOT, file);
  const text = readFileSync(full, 'utf8');
  for (const pattern of REFERENCE_PATTERNS) {
    pattern.lastIndex = 0;
    let match;
    while ((match = pattern.exec(text)) !== null) {
      const target = match[1];
      // Skip external references and generated screenshots.
      if (/^(https?:|mailto:|#)/.test(target)) continue;
      if (target.startsWith('.shots/')) continue;
      if (target.endsWith('.md')) continue; // docs are read outside the browser

      const exists = existsSync(join(ROOT, target));
      if (!exists) {
        problems.push({ from: file, target });
      } else if (!seen.has(target)) {
        seen.set(target, []);
      }
      if (exists && !seen.get(target)?.includes(file)) seen.get(target)?.push(file);
    }
  }
}

const orphans = files.filter(
  (f) => f.endsWith('.js') && f.startsWith('assets/') && !seen.has(f) && !['assets/screens.js'].includes(f),
);

if (!problems.length) {
  console.log(`OK — ${files.length} files checked, every internal reference resolves.`);
} else {
  console.log(`BROKEN REFERENCES (${problems.length}):`);
  for (const p of problems) console.log(`  ${p.from}  →  ${p.target}`);
}

if (orphans.length) {
  console.log(`\nNOT REFERENCED BY ANY PAGE (${orphans.length}):`);
  for (const o of orphans) console.log(`  ${o}`);
}

process.exit(problems.length ? 1 : 0);
