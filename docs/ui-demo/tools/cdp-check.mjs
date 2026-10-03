/**
 * NEXA UI demo — headless Chrome check.
 *
 * Loads one or every page of docs/ui-demo/ in headless Chrome through the
 * DevTools Protocol and reports:
 *   · console errors and failed sub-resource loads
 *   · horizontal overflow (scrollWidth vs clientWidth) and the widest offender
 *   · whether the shell actually rendered (heading text)
 * and writes a PNG of each page at its natural device size.
 *
 * Run:  node docs/ui-demo/tools/cdp-check.mjs [page.html …]
 *       (no arguments = every screen in tools/pages.mjs)
 */

import { spawn } from 'node:child_process';
import { mkdirSync, writeFileSync, existsSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, resolve, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { PAGES } from './pages.mjs';

const HERE = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(HERE, '..');
const SHOTS = resolve(ROOT, '.shots');

const CHROME_CANDIDATES = [
  'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
  'C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe',
  'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe',
];

const PORT = 9333;
const LOAD_TIMEOUT_MS = 20000;

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

function findChrome() {
  const hit = CHROME_CANDIDATES.find((p) => existsSync(p));
  if (!hit) throw new Error('No Chrome/Edge binary found.');
  return hit;
}

async function launch() {
  // The Chrome profile lives in the OS temp directory, not in .shots/ — a profile
  // is hundreds of megabytes and must never end up inside the reviewed artefact.
  const profileDir = join(tmpdir(), `nexa-ui-demo-chrome-${process.pid}`);
  const proc = spawn(
    findChrome(),
    [
      '--headless=new',
      '--disable-gpu',
      '--no-first-run',
      '--no-default-browser-check',
      '--disable-extensions',
      '--hide-scrollbars',
      '--allow-file-access-from-files',
      `--remote-debugging-port=${PORT}`,
      `--user-data-dir=${profileDir}`,
      'about:blank',
    ],
    { stdio: 'ignore', detached: false },
  );

  for (let i = 0; i < 60; i++) {
    try {
      const res = await fetch(`http://127.0.0.1:${PORT}/json/version`);
      if (res.ok) return proc;
    } catch {
      /* not up yet */
    }
    await sleep(250);
  }
  throw new Error('Chrome DevTools endpoint never came up.');
}

async function newTarget() {
  const res = await fetch(`http://127.0.0.1:${PORT}/json/new?about:blank`, { method: 'PUT' });
  return res.json();
}

/** Minimal CDP client over the built-in WebSocket. */
class Session {
  constructor(ws) {
    this.ws = ws;
    this.id = 0;
    this.pending = new Map();
    this.events = [];
    ws.addEventListener('message', (ev) => {
      const msg = JSON.parse(ev.data);
      if (msg.id && this.pending.has(msg.id)) {
        const { resolve: done, reject } = this.pending.get(msg.id);
        this.pending.delete(msg.id);
        msg.error ? reject(new Error(msg.error.message)) : done(msg.result);
      } else if (msg.method) {
        this.events.push(msg);
      }
    });
  }
  send(method, params = {}) {
    const id = ++this.id;
    this.ws.send(JSON.stringify({ id, method, params }));
    return new Promise((resolve_, reject) => this.pending.set(id, { resolve: resolve_, reject }));
  }
}

async function connect(wsUrl) {
  const ws = new WebSocket(wsUrl);
  await new Promise((res, rej) => {
    ws.addEventListener('open', res, { once: true });
    ws.addEventListener('error', rej, { once: true });
  });
  return new Session(ws);
}

const MEASURE = `(() => {
  const de = document.documentElement;
  const vw = de.clientWidth;

  // ── Horizontal overflow ────────────────────────────────────────────────────
  const offenders = [];
  document.querySelectorAll('body *').forEach((el) => {
    const r = el.getBoundingClientRect();
    if (r.width > vw + 1 || r.right > vw + 1) {
      const cs = getComputedStyle(el);
      if (cs.position === 'fixed') return;
      offenders.push({
        tag: el.tagName.toLowerCase(),
        cls: (el.className || '').toString().slice(0, 70),
        w: Math.round(r.width),
        right: Math.round(r.right),
      });
    }
  });
  offenders.sort((a, b) => b.right - a.right);

  // ── Invisible text: a node with content whose box collapsed ────────────────
  const hiddenByAncestor = (el) => {
    let node = el;
    while (node && node !== document.documentElement) {
      const cs = getComputedStyle(node);
      if (cs.display === 'none' || cs.visibility === 'hidden') return true;
      if (node.classList.contains('hidden')) return true; // closed sheet / scrim
      node = node.parentElement;
    }
    return false;
  };

  const invisible = [];
  document.querySelectorAll('body *').forEach((el) => {
    if (el.children.length) return;
    // Native <option>/<optgroup> have no layout box while the select is closed.
    if (el.tagName === 'OPTION' || el.tagName === 'OPTGROUP') return;
    const text = (el.textContent || '').trim();
    if (text.length < 2) return;
    if (hiddenByAncestor(el)) return;
    const cs = getComputedStyle(el);
    if (Number(cs.opacity) === 0) return;
    if (cs.position === 'absolute' && cs.clip !== 'auto') return; // .sr-only
    const r = el.getBoundingClientRect();
    if (r.width === 0 || r.height === 0) {
      invisible.push({ tag: el.tagName.toLowerCase(), cls: (el.className || '').toString().slice(0, 50), text: text.slice(0, 32) });
    }
  });

  // ── Clipped text: content wider than its own box with no ellipsis ──────────
  const clipped = [];
  document.querySelectorAll('body *').forEach((el) => {
    if (el.children.length) return;
    const cs = getComputedStyle(el);
    if (cs.overflow !== 'hidden' && cs.overflowX !== 'hidden') return;
    if (cs.textOverflow === 'ellipsis') return;
    if (el.scrollWidth > el.clientWidth + 2 && el.clientWidth > 0) {
      clipped.push({ tag: el.tagName.toLowerCase(), cls: (el.className || '').toString().slice(0, 50), over: el.scrollWidth - el.clientWidth });
    }
  });

  // ── Contrast: text colour vs the nearest opaque ancestor background ───────
  const lum = (rgb) => {
    const [r, g, b] = rgb.map((v) => {
      const s = v / 255;
      return s <= 0.03928 ? s / 12.92 : Math.pow((s + 0.055) / 1.055, 2.4);
    });
    return 0.2126 * r + 0.7152 * g + 0.0722 * b;
  };
  const parse = (s) => {
    const m = s.match(/rgba?\\(([^)]+)\\)/);
    if (!m) return null;
    const parts = m[1].split(',').map((x) => parseFloat(x));
    const alpha = parts.length > 3 ? parts[3] : 1;
    if (alpha === 0) return null;
    // Contrast is only meaningful against an opaque backdrop. Product fragments
    // sit on translucent white over a saturated card, where compositing the
    // alpha chain is not worth the complexity — skip those instead of guessing.
    return alpha < 0.9 ? null : parts.slice(0, 3);
  };
  const bgOf = (el) => {
    let node = el;
    while (node && node !== document.documentElement) {
      const bg = parse(getComputedStyle(node).backgroundColor);
      if (bg) return bg;
      node = node.parentElement;
    }
    return [255, 255, 255];
  };
  const lowContrast = [];
  document.querySelectorAll('body *').forEach((el) => {
    if (el.children.length) return;
    const text = (el.textContent || '').trim();
    if (text.length < 3) return;
    if (hiddenByAncestor(el)) return;
    const cs = getComputedStyle(el);
    const fg = parse(cs.color);
    if (!fg) return;
    const bg = bgOf(el);
    const l1 = lum(fg);
    const l2 = lum(bg);
    const ratio = (Math.max(l1, l2) + 0.05) / (Math.min(l1, l2) + 0.05);
    // 2.2 is deliberately lenient: this flags *invisible* text (same colour on
    // same colour), not merely imperfect contrast, so it produces no noise.
    if (ratio < 2.2) {
      lowContrast.push({ tag: el.tagName.toLowerCase(), cls: (el.className || '').toString().slice(0, 50), ratio: Math.round(ratio * 100) / 100, text: text.slice(0, 32) });
    }
  });

  const h1 = document.querySelector('h1, .appbar-title, .t-display-lg');
  return JSON.stringify({
    vw,
    sw: de.scrollWidth,
    sh: de.scrollHeight,
    overflow: de.scrollWidth - vw,
    heading: h1 ? h1.textContent.trim().slice(0, 60) : null,
    offenders: offenders.slice(0, 6),
    invisible: invisible.slice(0, 6),
    clipped: clipped.slice(0, 6),
    lowContrast: lowContrast.slice(0, 6),
  });
})()`;

async function checkPage(session, file, viewport) {
  session.events.length = 0;
  // `mobile: true` is what actually permits a sub-500px layout viewport —
  // Chrome enforces an OS minimum window width otherwise, which silently
  // reports phantom overflow on 430px screens.
  await session.send('Emulation.setDeviceMetricsOverride', {
    width: viewport.w,
    height: viewport.h,
    deviceScaleFactor: 1,
    mobile: viewport.w < 620,
    screenWidth: viewport.w,
    screenHeight: viewport.h,
  });
  const url = `file:///${ROOT.replace(/\\/g, '/')}/${file}`;
  await session.send('Page.navigate', { url });

  // Wait for the document to settle by polling readyState plus the page's own
  // mount event. Relying on Page.loadEventFired alone hangs when a previous run
  // left the target mid-navigation or two runs share a profile directory.
  const deadline = Date.now() + LOAD_TIMEOUT_MS;
  for (;;) {
    const { result: state } = await session.send('Runtime.evaluate', {
      expression: 'document.readyState',
      returnByValue: true,
    });
    if (state.value === 'complete') break;
    if (Date.now() > deadline) throw new Error(`timed out waiting for ${file} to load`);
    await sleep(120);
  }
  // One more tick for the DOMContentLoaded mount() to swap the template in.
  await sleep(500);

  // The emulated viewport is applied on navigation, so confirm it took effect.
  const { result: vpCheck } = await session.send('Runtime.evaluate', {
    expression: 'window.innerWidth',
    returnByValue: true,
  });
  const actualViewport = vpCheck.value;

  const { result } = await session.send('Runtime.evaluate', {
    expression: MEASURE,
    returnByValue: true,
  });
  const metrics = JSON.parse(result.value);

  const problems = session.events
    .filter((e) => e.method === 'Runtime.consoleAPICalled' && e.params.type === 'error')
    .map((e) => e.params.args.map((a) => a.value ?? a.description).join(' '));
  const failures = session.events
    .filter((e) => e.method === 'Network.loadingFailed')
    .map((e) => e.params.errorText);

  mkdirSync(SHOTS, { recursive: true });
  const base = `${file.replace(/\.html$/, '')}${viewport.w === (PAGES[file]?.w ?? 0) ? '' : `@${viewport.w}`}`;
  // Device-sized frame (fixed chrome in place) plus a full-page capture.
  const framed = await session.send('Page.captureScreenshot', { format: 'png' });
  writeFileSync(resolve(SHOTS, `${base}.png`), Buffer.from(framed.data, 'base64'));
  const full = await session.send('Page.captureScreenshot', { format: 'png', captureBeyondViewport: true });
  writeFileSync(resolve(SHOTS, `${base}.full.png`), Buffer.from(full.data, 'base64'));

  const mismatch = actualViewport !== viewport.w ? `viewport is ${actualViewport}px, expected ${viewport.w}px` : null;
  return { file, ...metrics, viewportWarning: mismatch, consoleErrors: problems, loadFailures: failures };
}

const requested = process.argv.slice(2);
/** Accepts `page.html` or `page.html@1024` to override the width, so responsive
 *  states (collapsed sidebar at 1024, stacked grids at 768) can be checked. */
const targets = (requested.length ? requested : Object.keys(PAGES)).map((arg) => {
  const [file, width] = arg.split('@');
  const base = PAGES[file] ?? { w: 430, h: 932 };
  return { file, viewport: width ? { w: Number(width), h: base.h + 400 } : base };
});

const proc = await launch();
const target = await newTarget();
const session = await connect(target.webSocketDebuggerUrl);
await session.send('Page.enable');
await session.send('Runtime.enable');
await session.send('Network.enable');

const results = [];
for (const { file, viewport } of targets) {
  try {
    results.push(await checkPage(session, file, viewport));
  } catch (err) {
    results.push({ file, error: String(err.message ?? err) });
  }
}

console.log(JSON.stringify(results, null, 2));
session.ws.close();
proc.kill();
process.exit(0);
