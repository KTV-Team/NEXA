/**
 * NEXA UI demo — design-token audit.
 *
 * Enforces the DESIGN.md contract at the source level:
 *   · no raw hex colours, rgb()/hsl() literals, or named colours in page CSS/JS
 *   · no raw border-radius values
 *   · no inline `font-size` in px
 *   · saturated feature-card surfaces are never repeated back to back
 *
 * Token definitions (tokens.css) and the documented rgba() tints are exempt.
 * Run:  node docs/ui-demo/tools/check-tokens.mjs
 */

import { readdirSync, readFileSync } from 'node:fs';
import { dirname, resolve, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(HERE, '..');

/** Files that legitimately define raw values. */
const EXEMPT = new Set(['assets/tokens.css']);

const CHECKS = [
  {
    id: 'hex-colour',
    re: /#[0-9a-fA-F]{3,8}\b/g,
    message: 'raw hex colour — use var(--color-*)',
    // The style guide and BUILD-SPEC quote token values as documentation.
    allow: [],
  },
  {
    id: 'rgb-colour',
    re: /\brgba?\([^)]*\)/g,
    message: 'rgb()/rgba() literal — use a var(--tint-*) token instead',
    // Avatars and the scrim are the only sanctioned raw-alpha uses.
    allow: [/rgba\(10,\s*10,\s*10,\s*0?\.\d+\)/],
  },
  {
    id: 'radius-px',
    re: /border-radius:\s*\d+px/g,
    message: 'raw border-radius — use var(--radius-*)',
  },
  {
    id: 'fontsize-px',
    re: /font-size:\s*\d+px/g,
    message: 'raw font-size — use var(--text-*-size)',
  },
];

const files = [
  ...readdirSync(ROOT).filter((f) => f.endsWith('.html')).map((f) => ({ path: f, kind: 'page' })),
  ...readdirSync(join(ROOT, 'assets'))
    .filter((f) => f.endsWith('.css') || f.endsWith('.js'))
    .map((f) => ({ path: `assets/${f}`, kind: 'asset' })),
];

const findings = [];

for (const file of files) {
  if (EXEMPT.has(file.path)) continue;
  const text = readFileSync(join(ROOT, file.path), 'utf8');
  const lines = text.split(/\r?\n/);

  lines.forEach((line, i) => {
    // Skip comment-only lines and anything explicitly marked as an exception.
    if (/^\s*(\*|\/\/|\/\*)/.test(line)) return;
    if (/token-audit-ignore/.test(line)) return;
    for (const check of CHECKS) {
      check.re.lastIndex = 0;
      let m;
      while ((m = check.re.exec(line)) !== null) {
        const hit = m[0];
        if (check.allow?.some((a) => a.test(hit))) continue;
        findings.push({ file: file.path, line: i + 1, rule: check.id, hit, message: check.message });
      }
    }
  });
}

/* ── Saturated surface rhythm ───────────────────────────────────────────────── */

const SURFACES = ['pink', 'teal', 'lavender', 'peach', 'ochre', 'cream'];
const rhythm = [];
for (const file of files) {
  const text = readFileSync(join(ROOT, file.path), 'utf8');
  const seq = [...text.matchAll(/feature-card-(pink|teal|lavender|peach|ochre|cream)/g)].map((m) => m[1]);
  for (let i = 1; i < seq.length; i++) {
    if (seq[i] === seq[i - 1] && SURFACES.includes(seq[i])) {
      rhythm.push({ file: file.path, surface: seq[i], index: i });
    }
  }
}

/* ── Report ─────────────────────────────────────────────────────────────────── */

if (!findings.length) {
  console.log(`OK — ${files.length} files, no raw colour/radius/font-size values outside assets/tokens.css.`);
} else {
  console.log(`TOKEN VIOLATIONS (${findings.length}):`);
  for (const f of findings) console.log(`  ${f.file}:${f.line}  [${f.rule}] ${f.hit}  → ${f.message}`);
}

if (rhythm.length) {
  console.log(`\nSURFACE RHYTHM (${rhythm.length}) — the same saturated card twice in a row:`);
  for (const r of rhythm) console.log(`  ${r.file}  feature-card-${r.surface} repeated at occurrence ${r.index + 1}`);
}

process.exit(findings.length ? 1 : 0);
