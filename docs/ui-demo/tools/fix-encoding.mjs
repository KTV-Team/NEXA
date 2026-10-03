/**
 * NEXA UI demo — UTF-8 repair.
 *
 * A Windows PowerShell `Get-Content | Set-Content` round trip decoded UTF-8 bytes
 * as cp1252 and wrote them back as UTF-8, so every multi-byte character became a
 * mojibake run (`—` → `â€"`, `·` → `Â·`). This reverses exactly that transform:
 * each code point is mapped back to the byte cp1252 would have produced, and the
 * byte sequence is re-decoded as UTF-8.
 *
 * Safety: the reversal is applied only when EVERY non-ASCII code point is one
 * that cp1252 maps into 0x80–0x9F (or a literal Latin-1 byte). If a file contains
 * any genuinely non-Latin-1 character — Vietnamese, an emoji, a real em dash that
 * survived — the file is skipped rather than risked. A BOM is dropped.
 *
 * Run:  node docs/ui-demo/tools/fix-encoding.mjs [file …]
 *       (no arguments = assets/*.css, assets/*.js, *.html, *.md)
 */

import { readdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, resolve, join, extname } from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(HERE, '..');

/** The cp1252 code points that live in the 0x80–0x9F C1 range. */
const CP1252 = {
  0x20ac: 0x80, 0x201a: 0x82, 0x0192: 0x83, 0x201e: 0x84, 0x2026: 0x85,
  0x2020: 0x86, 0x2021: 0x87, 0x02c6: 0x88, 0x2030: 0x89, 0x0160: 0x8a,
  0x2039: 0x8b, 0x0152: 0x8c, 0x017d: 0x8e, 0x2018: 0x91, 0x2019: 0x92,
  0x201c: 0x93, 0x201d: 0x94, 0x2022: 0x95, 0x2013: 0x96, 0x2014: 0x97,
  0x02dc: 0x98, 0x2122: 0x99, 0x0161: 0x9a, 0x203a: 0x9b, 0x0153: 0x9c,
  0x017e: 0x9e, 0x0178: 0x9f,
};

/** cp1252 bytes 0x80–0x9F decoded straight into their Unicode code points. */
const MOJIBAKE_TRIPLES = ['â€', 'Â', 'Ã', 'â€"', 'â€™', 'â€œ'];

/**
 * Reverse the cp1252→UTF-8 corruption.
 *
 * Every character is re-encoded to the byte(s) it would have produced under
 * cp1252 and the byte stream is decoded as UTF-8. Characters cp1252 cannot
 * represent (an arrow, an emoji) were never part of the corruption, so they are
 * kept as their own UTF-8 bytes.
 *
 * @returns {string|null} the repaired text, or null when the file is unaffected.
 */
function repair(text) {
  const bytes = [];
  let changed = false;

  for (const ch of text) {
    const cp = ch.codePointAt(0);
    if (cp === 0xfeff) {
      changed = true; // drop the BOM
      continue;
    }
    if (CP1252_REVERSE[cp] != null) {
      bytes.push(CP1252_REVERSE[cp]);
      changed = true;
      continue;
    }
    if (cp <= 0xff) {
      // A Latin-1 code point is byte-identical to its cp1252 byte.
      bytes.push(cp);
      continue;
    }
    // Not representable in cp1252: it came through the corruption untouched.
    // Re-emit its real UTF-8 bytes so a later decode restores it exactly.
    for (const b of Buffer.from(ch, 'utf8')) bytes.push(b);
  }

  if (!changed) return null;

  const decoded = Buffer.from(bytes).toString('utf8');
  // A surviving U+FFFD means the reverse mapping was wrong — refuse to write.
  return decoded.includes('\uFFFD') ? null : decoded;
}

/** Unicode code point → the cp1252 byte that would have produced it. */
const CP1252_REVERSE = (() => {
  const out = {};
  for (const [point, byte] of Object.entries(CP1252)) out[Number(point)] = byte;
  return out;
})();

const args = process.argv.slice(2);
let files;
if (args.length) {
  files = args;
} else {
  files = [
    ...readdirSync(ROOT).filter((f) => ['.html', '.md'].includes(extname(f))),
    ...readdirSync(join(ROOT, 'assets')).filter((f) => ['.js', '.css'].includes(extname(f))).map((f) => `assets/${f}`),
  ];
}

let repaired = 0;
let clean = 0;
let skipped = 0;

for (const file of files) {
  const path = join(ROOT, file);
  let text;
  try {
    text = readFileSync(path, 'utf8');
  } catch {
    continue;
  }
  const hasBom = text.charCodeAt(0) === 0xfeff;
  const looksCorrupt = MOJIBAKE_TRIPLES.some((t) => text.includes(t));
  if (!hasBom && !looksCorrupt) {
    clean++;
    continue;
  }
  const fixed = repair(text);
  if (!fixed) {
    skipped++;
    console.log(`skipped (real non-Latin-1 content)  ${file}`);
    continue;
  }
  writeFileSync(path, fixed, 'utf8');
  repaired++;
  console.log(`repaired  ${file}`);
}

console.log(`\n${repaired} repaired · ${clean} already clean · ${skipped} skipped · ${files.length} scanned`);
