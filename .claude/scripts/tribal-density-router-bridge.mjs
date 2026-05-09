#!/usr/bin/env node
/**
 * tribal-density-router-bridge.mjs
 *
 * Reads the unified tribal index and reports per-domain entry counts
 * with a cheap/escalate/mixed verdict — used by the routing layer
 * to decide whether a domain is "well-covered" by tribal knowledge
 * (cheap path: keyword + tribal lookup) or "thin" (escalate to
 * deep-reasoning / cross-domain synthesis).
 *
 * Thresholds (configurable via env):
 *   ≥20 entries  → cheap     (tribal is strong, prefer fast retrieval)
 *   <5  entries  → escalate  (need synthesis from related domains)
 *   else         → mixed     (combine tribal with reasoning)
 *
 * Usage:
 *   node tribal-density-router-bridge.mjs                 # all domains
 *   node tribal-density-router-bridge.mjs --domain mill   # one domain
 *   node tribal-density-router-bridge.mjs --json
 */

import fs from "node:fs";

const PRISM = "H:/prism";
const INDEX_PATH = `${PRISM}/state/shared/tribal-embed-index.json`;
const CHEAP_THRESHOLD = Number(process.env.TRIBAL_DENSITY_CHEAP) || 20;
const ESCALATE_THRESHOLD = Number(process.env.TRIBAL_DENSITY_ESCALATE) || 5;

function parseArgs() {
  const a = process.argv.slice(2);
  const opts = {};
  for (let i = 0; i < a.length; i++) {
    if (a[i].startsWith("--")) {
      const k = a[i].slice(2);
      const v = a[i + 1] && !a[i + 1].startsWith("--") ? a[++i] : true;
      opts[k] = v;
    }
  }
  return opts;
}

function verdict(n) {
  if (n >= CHEAP_THRESHOLD) return "cheap";
  if (n < ESCALATE_THRESHOLD) return "escalate";
  return "mixed";
}

function loadCounts() {
  if (!fs.existsSync(INDEX_PATH)) {
    throw new Error(`index not found at ${INDEX_PATH}`);
  }
  const idx = JSON.parse(fs.readFileSync(INDEX_PATH, "utf8"));
  const counts = {};
  for (const e of idx.entries || []) {
    counts[e.domain] = (counts[e.domain] || 0) + 1;
  }
  return { counts, total: (idx.entries || []).length, generatedAt: idx.generatedAt };
}

const opts = parseArgs();

try {
  const { counts, total, generatedAt } = loadCounts();
  if (opts.domain) {
    const d = String(opts.domain).toLowerCase();
    const n = counts[d] || 0;
    const v = verdict(n);
    if (opts.json) {
      process.stdout.write(JSON.stringify({ domain: d, count: n, verdict: v, total, generatedAt }));
    } else {
      console.log(`${d}: ${n} entries → ${v}`);
    }
  } else {
    const rows = Object.entries(counts).sort((a, b) => b[1] - a[1])
      .map(([d, n]) => ({ domain: d, count: n, verdict: verdict(n) }));
    if (opts.json) {
      process.stdout.write(JSON.stringify({ rows, total, generatedAt }));
    } else {
      console.log(`TRIBAL DENSITY (total=${total})`);
      console.log(`thresholds: cheap≥${CHEAP_THRESHOLD}, escalate<${ESCALATE_THRESHOLD}`);
      for (const r of rows) {
        console.log(`  ${r.domain.padEnd(12)} ${String(r.count).padStart(4)} → ${r.verdict}`);
      }
    }
  }
} catch (e) {
  if (opts.json) {
    process.stdout.write(JSON.stringify({ ok: false, error: e.message }));
    process.exit(2);
  }
  console.error(`error: ${e.message}`);
  process.exit(2);
}
