/**
 * NEXA UI demo — sweep summary.
 * Reads .shots/sweep.json (written by cdp-check.mjs) and prints one line per
 * page plus an aggregate verdict.
 *
 * Run:  node docs/ui-demo/tools/summarize-sweep.mjs
 */

import { readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(HERE, '..');

const file = resolve(ROOT, '.shots', 'sweep.json');
const buf = readFileSync(file);
// PowerShell redirection writes UTF-16LE with a BOM on some hosts; accept both
// encodings so the summary works whichever shell produced the file.
const isUtf16 = buf[0] === 0xff && buf[1] === 0xfe;
const raw = isUtf16 ? buf.toString('utf16le').replace(/^\uFEFF/, '') : buf.toString('utf8');
const data = JSON.parse(raw.slice(raw.indexOf('[')));

let bad = 0;
for (const r of data) {
  const flags = [];
  if (r.error) flags.push(`ERROR ${r.error}`);
  if (r.overflow !== 0) flags.push(`overflow ${r.overflow}px`);
  if (r.viewportWarning) flags.push(`viewport ${r.viewportWarning}`);
  if (r.consoleErrors?.length) flags.push(`console x${r.consoleErrors.length}`);
  if (r.loadFailures?.length) flags.push(`failed loads x${r.loadFailures.length}`);
  if (r.invisible?.length) flags.push(`invisible x${r.invisible.length}`);
  if (r.clipped?.length) flags.push(`clipped x${r.clipped.length}`);
  if (r.lowContrast?.length) flags.push(`contrast x${r.lowContrast.length}`);

  if (flags.length) {
    bad++;
    console.log(`X  ${r.file.padEnd(28)} ${flags.join(' | ')}`);
  } else {
    console.log(`.  ${r.file.padEnd(28)} ok  ${r.vw}x${r.sh}  ${r.heading ?? ''}`);
  }
}

console.log(`\n${data.length} pages swept · ${data.length - bad} clean · ${bad} with findings`);
process.exit(bad ? 1 : 0);
