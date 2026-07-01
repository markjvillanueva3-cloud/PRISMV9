#!/usr/bin/env node
/**
 * scan-lone-surrogates.mjs (slot:alpha 2026-06-11) -- find the lone UTF-16 surrogate
 * that makes the Anthropic API reject a request body with
 *   `400 ... no low surrogate in string: line 1 column N`.
 *
 * A lone surrogate is an unpaired half of a non-BMP character (emoji, CJK-ext):
 *   high D800-DBFF NOT followed by low DC00-DFFF, or low DC00-DFFF NOT preceded by high.
 * It enters injected context when a hook truncates a string mid-pair
 * (str.slice(0,N) landing between the two code units) or a source file is corrupt.
 *
 * Scans the directories whose contents get injected into the request body every
 * turn (handoffs, dashboards, briefs, galaxy cards, memory, sidecars). Reports
 * file + char offset + a hex snippet so the corrupt source is pinpointed.
 *
 * Pure scan, no mutation. Usage: node scripts/scan-lone-surrogates.mjs [dir...]
 */
import fs from "fs";
import path from "path";

const LONE = /[\uD800-\uDBFF](?![\uDC00-\uDFFF])|(?<![\uD800-\uDBFF])[\uDC00-\uDFFF]/g;

const DEFAULT_ROOTS = [
  "state/shared/handoffs",
  "state/shared/dashboards",
  "state/shared/galaxy-cards",
  "state/shared/system-viz/staging",
  "state/shared/CLAUDE-BRIEF.md",
  "state/shared/AGENT_CHAT.jsonl",
  "C:/Users/wompu/.claude/projects/H--PRISM/memory",
];

const SKIP_EXT = new Set([".png", ".jpg", ".jpeg", ".gif", ".pdf", ".zip", ".gz", ".stp", ".step", ".stl", ".node", ".wasm"]);
const MAX_BYTES = 80 * 1024 * 1024;
const SAMPLE_LIMIT = 3;

function scanFile(fp, hits) {
  let st;
  try { st = fs.statSync(fp); } catch { return; }
  if (!st.isFile() || st.size > MAX_BYTES) return;
  if (SKIP_EXT.has(path.extname(fp).toLowerCase())) return;
  let s;
  try { s = fs.readFileSync(fp, "utf8"); } catch { return; }
  LONE.lastIndex = 0;
  let m, n = 0;
  while ((m = LONE.exec(s)) !== null) {
    n++;
    if (n <= SAMPLE_LIMIT) {
      const cp = s.charCodeAt(m.index).toString(16).toUpperCase();
      const ctx = JSON.stringify(s.slice(Math.max(0, m.index - 24), m.index + 8));
      hits.push({ fp, offset: m.index, code: "U+" + cp, ctx });
    }
    if (m.index === LONE.lastIndex) LONE.lastIndex++;
  }
  if (n > SAMPLE_LIMIT) hits.push({ fp, offset: -1, code: "...", ctx: `(+${n - SAMPLE_LIMIT} more lone surrogates)` });
}

function walk(root, hits) {
  let st;
  try { st = fs.statSync(root); } catch { return; }
  if (st.isFile()) { scanFile(root, hits); return; }
  let entries;
  try { entries = fs.readdirSync(root, { withFileTypes: true }); } catch { return; }
  for (const e of entries) {
    const fp = path.join(root, e.name);
    if (e.isDirectory()) {
      if (e.name === "node_modules" || e.name === ".git") continue;
      walk(fp, hits);
    } else if (e.isFile()) {
      scanFile(fp, hits);
    }
  }
}

const roots = process.argv.slice(2).length ? process.argv.slice(2) : DEFAULT_ROOTS;
const hits = [];
for (const r of roots) {
  const abs = path.isAbsolute(r) ? r : path.join("H:/prism", r);
  walk(abs, hits);
}

if (!hits.length) {
  console.log("CLEAN: no lone surrogates in", roots.length, "root(s).");
} else {
  console.log(`FOUND ${hits.length} file(s)/hit(s) with lone surrogates:\n`);
  for (const h of hits) {
    console.log(`  ${h.fp}`);
    console.log(`    @char ${h.offset}  ${h.code}  ctx=${h.ctx}`);
  }
}
