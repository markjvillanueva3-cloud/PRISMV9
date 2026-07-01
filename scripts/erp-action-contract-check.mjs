#!/usr/bin/env node
/**
 * erp-action-contract-check.mjs — the §6.5 PRE-WIRE CI GATE for the PRISM ERP (QuickBooks-parity) UX.
 *
 * Resolves the P0 GROUND-TRUTH WARNING from the UX design spec: the screen→action contract uses MAIN's
 * canonical 879-action names, but the target tree's dispatchers may expose different/old literals. This
 * greps EVERY action in erp-screen-action-manifest.mjs against the LIVE dispatched `case "..."` set across
 * ALL dispatchers in the target tree, then reports LIVE / MISSING per screen + group. Frontend client.ts
 * must NOT bind a method to any action this reports MISSING. Pure fs + regex (no child process, no network).
 *
 * Usage:
 *   node scripts/erp-action-contract-check.mjs [--root <repoRoot>] [--json] [--strict]
 *     --root    repo root to scan (default: two levels up from this script = H:/prism)
 *     --json    write a machine-readable report to state/shared/erp-ux-action-coverage.json
 *     --strict  exit non-zero if ANY non-marketplace action is MISSING (use as the CI gate)
 *
 * Coverage rule (alias-aware): an action is LIVE if its own literal OR any alias-group sibling resolves to
 * a dispatched `case "..."` in some dispatcher. Determinism: pure fs + regex, no network/clock.
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { ERP_SCREEN_ACTION_MANIFEST as M } from "./erp-screen-action-manifest.mjs";

const here = path.dirname(fileURLToPath(import.meta.url));
const args = process.argv.slice(2);
const rootArg = args.indexOf("--root");
const REPO = rootArg >= 0 ? args[rootArg + 1] : path.resolve(here, "..");
const EMIT_JSON = args.includes("--json");
const STRICT = args.includes("--strict");

const DISPATCH_DIR = path.join(REPO, "mcp-server", "src", "tools", "dispatchers");
if (!fs.existsSync(DISPATCH_DIR)) {
  console.error(`[erp-contract-check] dispatcher dir not found: ${DISPATCH_DIR} (wrong --root?)`);
  process.exit(2);
}

// ---- build the LIVE action set from every dispatcher's `case "..."` literals ----
const CASE_RE = /case\s+["']([A-Za-z0-9_]+)["']\s*:/g;
const live = new Map(); // action -> dispatcher file it is handled in (first seen)
let dispatcherCount = 0;
for (const f of fs.readdirSync(DISPATCH_DIR).filter((n) => n.endsWith("Dispatcher.ts"))) {
  dispatcherCount++;
  const text = fs.readFileSync(path.join(DISPATCH_DIR, f), "utf8");
  for (const m of text.matchAll(CASE_RE)) {
    if (!live.has(m[1])) live.set(m[1], f);
  }
}

// ---- alias resolution ----
const aliasOf = new Map(); // action -> Set of equivalent actions
for (const grp of M.aliasGroups || []) {
  const set = new Set(grp);
  for (const a of grp) aliasOf.set(a, set);
}
const resolve = (action) => {
  const candidates = aliasOf.get(action) ?? new Set([action]);
  for (const c of candidates) if (live.has(c)) return live.get(c);
  return null; // MISSING
};

const isMarketplace = (action) =>
  action.startsWith("marketplace_") || action.startsWith("geo_") || action === "vendor_catalog_ingest" || action.startsWith("supplier_reputation");

// ---- evaluate the manifest ----
const report = { schemaVersion: M.schemaVersion, dispatchersScanned: dispatcherCount, liveActionCount: live.size, groups: {}, missing: [], missingNonMarketplace: [] };
let total = 0, liveCount = 0;
for (const [group, screens] of Object.entries(M.groups)) {
  report.groups[group] = [];
  for (const s of screens) {
    const screenRow = { screen: s.screen, route: s.route, live: [], missing: [] };
    for (const action of s.actions) {
      total++;
      const where = resolve(action);
      if (where) { liveCount++; screenRow.live.push(action); }
      else {
        screenRow.missing.push(action);
        report.missing.push({ group, screen: s.screen, action });
        if (!isMarketplace(action)) report.missingNonMarketplace.push({ group, screen: s.screen, action });
      }
    }
    report.groups[group].push(screenRow);
  }
}
report.coverage = { total, live: liveCount, missing: total - liveCount, pct: Math.round((liveCount / total) * 1000) / 10 };

// ---- print summary ----
console.log(`[erp-contract-check] root=${REPO}`);
console.log(`  dispatchers scanned: ${dispatcherCount} · live dispatched actions: ${live.size}`);
console.log(`  contract actions: ${total} · LIVE: ${liveCount} · MISSING: ${total - liveCount} · coverage ${report.coverage.pct}%`);
for (const [group, screens] of Object.entries(report.groups)) {
  const gMissing = screens.reduce((n, r) => n + r.missing.length, 0);
  const gTotal = screens.reduce((n, r) => n + r.live.length + r.missing.length, 0);
  console.log(`  ${gMissing === 0 ? "✓" : "✗"} ${group}: ${gTotal - gMissing}/${gTotal}`);
  for (const r of screens) if (r.missing.length) console.log(`      MISSING ${r.screen} (${r.route}): ${r.missing.join(", ")}`);
}
if (report.missing.length) {
  console.log(`\n  ALL MISSING (${report.missing.length}) — no live dispatch case in the target tree:`);
  for (const x of report.missing) console.log(`    - ${x.action}  [${x.screen}]${isMarketplace(x.action) ? " (marketplace — web-client pending)" : ""}`);
  console.log(`  → resolve before frontend client.ts binding: rename to the live literal, or build/expose the action.`);
} else {
  console.log(`\n  ✓ every contract action resolves to a live dispatch case — frontend wiring is clear.`);
}

if (EMIT_JSON) {
  const outDir = path.join(REPO, "state", "shared");
  fs.mkdirSync(outDir, { recursive: true });
  const outPath = path.join(outDir, "erp-ux-action-coverage.json");
  fs.writeFileSync(outPath, JSON.stringify(report, null, 2), "utf8");
  console.log(`\n  JSON report → ${outPath}`);
}

if (STRICT && report.missingNonMarketplace.length) {
  console.error(`\n[erp-contract-check] STRICT FAIL: ${report.missingNonMarketplace.length} non-marketplace action(s) MISSING.`);
  process.exit(1);
}
process.exit(0);
