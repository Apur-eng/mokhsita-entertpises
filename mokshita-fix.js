/**
 * mokshita-fix.js
 * ─────────────────────────────────────────────────────────────────────────────
 * One-shot maintenance script for the Mokshita Enterprises frontend.
 *
 * What it does
 * ────────────
 * 1. SYMBOL FIX   – Corrects Windows-1252 double-encoding mojibake (â€", â˜…,
 *                   âœ", â†', â‚¹, Ã—) in ALL HTML/JS/CSS files in this folder.
 *
 * 2. NaN FIX      – Already applied directly to main.js (the [data-target]
 *                   selector was scoped so the stats countUp() animation no
 *                   longer overwrites tab-button text with NaN).
 *                   This script documents the fix and can re-apply it if
 *                   main.js is ever regenerated.
 *
 * Usage
 * ─────
 *   node mokshita-fix.js          – dry run (shows what would change)
 *   node mokshita-fix.js --apply  – writes changes to disk
 *
 * ─────────────────────────────────────────────────────────────────────────────
 */

'use strict';

const fs   = require('fs');
const path = require('path');

const DRY_RUN = !process.argv.includes('--apply');
const ROOT    = __dirname;

// ── 1. SYMBOL REPLACEMENT TABLE ───────────────────────────────────────────────
// Each entry maps a mojibake sequence (as Unicode codepoints) → correct char.
// The sequences are Windows-1252 misreadings of raw UTF-8 bytes.

function seq(...codes) {
  return codes.map(n => String.fromCodePoint(n)).join('');
}

const SYMBOL_FIXES = [
  // — em dash (U+2014):  UTF-8 E2 80 94 → cp1252 U+00E2,U+20AC,U+201D
  [seq(0x00e2, 0x20ac, 0x201d), '\u2014'],
  // ★ black star (U+2605): UTF-8 E2 98 85 → cp1252 U+00E2,U+02DC,U+2026
  [seq(0x00e2, 0x02dc, 0x2026), '\u2605'],
  // ✓ check mark (U+2713): UTF-8 E2 9C 93 → cp1252 U+00E2,U+0153,U+201C
  [seq(0x00e2, 0x0153, 0x201c), '\u2713'],
  // → right arrow (U+2192): UTF-8 E2 86 92 → cp1252 U+00E2,U+2020,U+2019
  [seq(0x00e2, 0x2020, 0x2019), '\u2192'],
  // ₹ rupee sign (U+20B9): UTF-8 E2 82 B9 → cp1252 U+00E2,U+201A,U+00B9
  [seq(0x00e2, 0x201a, 0x00b9), '\u20b9'],
  // × multiplication (U+00D7): UTF-8 C3 97 → cp1252 U+00C3,U+2014
  [seq(0x00c3, 0x2014), '\u00d7'],
  // · middle dot (U+00B7): UTF-8 C2 B7 → cp1252 U+00C2,U+00B7 (already ok usually)
  [seq(0x00c2, 0x00b7), '\u00b7'],
  // © copyright (U+00A9): UTF-8 C2 A9 → cp1252 U+00C2,U+00A9 (already ok usually)
  [seq(0x00c2, 0x00a9), '\u00a9'],
];

const FILE_EXTS = new Set(['.html', '.js', '.css']);
const SKIP_FILES = new Set(['mokshita-fix.js']); // don't rewrite ourselves

// ── 2. NaN FIX — document & optionally re-apply ───────────────────────────────
const MAIN_JS_PATH   = path.join(ROOT, 'main.js');
const NAN_BAD_PATTERN  = "document.querySelectorAll('[data-target]').forEach(el => statsObserver.observe(el));";
const NAN_GOOD_PATTERN = `document.querySelectorAll('[data-target][data-suffix], .stat-number[data-target]').forEach(el => {
  // Only observe elements whose data-target is a numeric stat counter, not tab buttons
  const val = parseInt(el.dataset.target, 10);
  if (!isNaN(val)) statsObserver.observe(el);
});`;

// ── HELPERS ───────────────────────────────────────────────────────────────────

function fixSymbols(content) {
  let out = content;
  let total = 0;
  for (const [bad, good] of SYMBOL_FIXES) {
    const n = out.split(bad).length - 1;
    if (n > 0) {
      out = out.split(bad).join(good);
      total += n;
    }
  }
  return { out, total };
}

function applyNaNFix(content) {
  if (!content.includes(NAN_BAD_PATTERN)) return { out: content, applied: false };
  return { out: content.replace(NAN_BAD_PATTERN, NAN_GOOD_PATTERN), applied: true };
}

// ── MAIN ──────────────────────────────────────────────────────────────────────

const files = fs.readdirSync(ROOT).filter(f => {
  const ext = path.extname(f).toLowerCase();
  return FILE_EXTS.has(ext) && !SKIP_FILES.has(f);
});

let totalSymbolFixes = 0;
let nanFixApplied    = false;

console.log(DRY_RUN ? '🔍 DRY RUN (use --apply to write changes)\n' : '✍️  Applying changes…\n');

for (const f of files) {
  const filePath = path.join(ROOT, f);
  let content;
  try { content = fs.readFileSync(filePath, 'utf8'); } catch { continue; }

  let changed = false;
  let out = content;

  // Symbol fixes
  const { out: symOut, total: symCount } = fixSymbols(out);
  if (symCount > 0) {
    console.log(`  [symbols] ${f}: ${symCount} fix(es)`);
    out = symOut;
    totalSymbolFixes += symCount;
    changed = true;
  }

  // NaN fix for main.js
  if (f === 'main.js') {
    const { out: nanOut, applied } = applyNaNFix(out);
    if (applied) {
      console.log(`  [NaN fix] main.js: statsObserver selector scoped to numeric targets only`);
      out = nanOut;
      nanFixApplied = true;
      changed = true;
    } else {
      console.log(`  [NaN fix] main.js: already patched ✓`);
    }
  }

  if (changed && !DRY_RUN) {
    fs.writeFileSync(filePath, out, 'utf8');
  }
}

console.log(`\n✅ Done.`);
console.log(`   Symbol replacements : ${totalSymbolFixes}`);
console.log(`   NaN fix in main.js  : ${nanFixApplied ? 'applied' : 'already done ✓'}`);
if (DRY_RUN && totalSymbolFixes > 0) {
  console.log(`\n   Run with --apply to write these changes to disk.`);
}
