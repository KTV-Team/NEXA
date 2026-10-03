/**
 * NEXA UI demo — source hygiene check.
 *
 * Guards the two ways this prototype got hurt during construction:
 *   1. UTF-8 corruption from a PowerShell text round trip (mojibake / BOM).
 *   2. Files that no longer parse as JavaScript.
 *
 * Run:  node docs/ui-demo/tools/check-hygiene.mjs
 */

import { readdirSync, readFileSync } from 'node:fs';
import { dirname, resolve, join, extname } from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(HERE, '..');
const TOOLS = HERE;

const TEXT_EXT = new Set(['.js', '.css', '.html', '.md', '.mjs']);
/** Byte sequences that only appear when UTF-8 was decoded as cp1252. */
const MOJIBAKE = ['\u00e2\u20ac', '\u00c2\u00b7', '\u00c3\u00a9', '\u00e2\u20ac\u201d', '\u00c3\u00a8'];
/** Files that legitimately contain mojibake tokens: the repair tool's detection
 *  literals, and the README warning that shows the failure mode. */
const MOJIBAKE_EXEMPT = new Set(['tools/fix-encoding.mjs', 'README.md']);

const problems = [];
let scanned = 0;

function scan(dir) {
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const full = join(dir, entry.name);
    if (entry.isDirectory()) {
      if (entry.name.startsWith('.') || entry.name === 'node_modules') continue;
      scan(full);
      continue;
    }
    if (!TEXT_EXT.has(extname(entry.name))) continue;
    scanned++;
    const rel = full.slice(ROOT.length + 1).replace(/\\/g, '/');
    const text = readFileSync(full, 'utf8');

    if (text.charCodeAt(0) === 0xfeff) problems.push(`${rel}: UTF-8 BOM`);
    if (!MOJIBAKE_EXEMPT.has(rel)) {
      for (const token of MOJIBAKE) {
        if (text.includes(token)) {
          problems.push(`${rel}: mojibake (cp1252 round trip)`);
          break;
        }
      }
    }

    // Only the browser-facing classic scripts can be parsed with `new Function`.
    // The tools are ESM and are verified by running them.
    const isEsm = dir.startsWith(TOOLS) && extname(entry.name) === '.mjs';
    if (!isEsm && (extname(entry.name) === '.js' || extname(entry.name) === '.mjs')) {
      try {
        new Function(text);
      } catch (err) {
        problems.push(`${rel}: does not parse — ${err.message}`);
      }
    }
  }
}

scan(ROOT);

if (!problems.length) {
  console.log(`OK — ${scanned} text files, valid UTF-8, no BOM, all scripts parse.`);
  process.exit(0);
}

console.log(`HYGIENE PROBLEMS (${problems.length}):`);
for (const p of problems) console.log(`  ${p}`);
process.exit(1);
