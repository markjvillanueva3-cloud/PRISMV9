#!/usr/bin/env node
// scripts/path-ledger-derive.mjs — CLI for U-WPC-DERIVE-ALLDOMAINS (alpha, 2026-05-31).
// Harvest working-paths from the fleet-wide outcome-bus (every domain's plotted path) → path-ledger.
//   node scripts/path-ledger-derive.mjs [--since 24h] [--apply] [--json]
// Dry-run by default (prints candidates). --apply captures them (idempotent via path-ledger dedup).
import fs from "node:fs";
import { deriveWorkingPaths, applyDerived } from "./lib/path-derive.mjs";
import { DEFAULT_ROOTS } from "./lib/path-ledger.mjs";

const argv = process.argv.slice(2);
const flag = (n) => argv.includes(`--${n}`);
const opt = (n, d) => { const i = argv.indexOf(`--${n}`); return i >= 0 && argv[i + 1] ? argv[i + 1] : d; };

function parseSinceMs(s) {
  if (!s) return 24 * 3600 * 1000;
  const m = String(s).match(/^(\d+)\s*([hmd])?$/);
  if (!m) return 24 * 3600 * 1000;
  const n = Number(m[1]); const unit = m[2] || "h";
  return n * (unit === "d" ? 86400 : unit === "m" ? 60 : 3600) * 1000;
}

const sinceMs = parseSinceMs(opt("since", "24h"));
const cutoff = Date.now() - sinceMs;
const busFile = process.env.PRISM_OUTCOME_BUS_FILE || DEFAULT_ROOTS.outcomeBus;

let rows = [];
try {
  rows = fs.readFileSync(busFile, "utf8").split("\n").filter(Boolean)
    .map((l) => { try { return JSON.parse(l); } catch { return null; } })
    .filter((r) => r && r.ts && Date.parse(r.ts) >= cutoff);
} catch (e) {
  process.stderr.write(`path-ledger-derive: cannot read bus ${busFile}: ${e && e.code}\n`);
  process.exit(3);
}

const candidates = deriveWorkingPaths(rows);
const summary = {
  busFile, sinceHours: Math.round(sinceMs / 3600000), busRows: rows.length,
  candidates: candidates.length,
  byDomain: candidates.reduce((a, c) => { a[c.domain] = (a[c.domain] || 0) + 1; return a; }, {}),
};

if (flag("apply")) {
  const res = applyDerived(candidates);
  const out = { ...summary, applied: res };
  process.stdout.write(JSON.stringify(out, null, flag("json") ? 0 : 2) + "\n");
} else {
  const out = { ...summary, dryRun: true, sample: candidates.slice(0, 10).map((c) => ({ domain: c.domain, goalType: c.goalType, steps: c.steps.length })) };
  process.stdout.write(JSON.stringify(out, null, flag("json") ? 0 : 2) + "\n");
}
