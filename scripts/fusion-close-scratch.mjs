#!/usr/bin/env node
/**
 * fusion-close-scratch.mjs — CLI to close PRISM scratch Fusion documents on demand.
 *
 * Run this any time during or after a CAM/CAD drive session to reclaim the throwaway
 * documents PRISM opened, freeing RAM/CPU/GPU (R14). Safe: only PRISM-registered scratch
 * docs are closed (discard-only); delta's live CAD docs are never touched.
 *
 *   node scripts/fusion-close-scratch.mjs              # close scratch on :18365
 *   node scripts/fusion-close-scratch.mjs --list       # show open docs, close NOTHING
 *   node scripts/fusion-close-scratch.mjs --ports 18365,18362
 *   node scripts/fusion-close-scratch.mjs --json
 */
import { closeFusionScratch, parsePorts, DEFAULT_PORTS } from "./lib/fusion-scratch-close.mjs";

const argv = process.argv.slice(2);
const has = (f) => argv.includes(f);
const val = (f) => { const i = argv.indexOf(f); return i >= 0 ? argv[i + 1] : undefined; };

const dryRun = has("--list") || has("--dry-run");
const asJson = has("--json");
const ports = parsePorts(val("--ports") || process.env.PRISM_FUSION_CLOSE_PORTS, DEFAULT_PORTS);

const res = await closeFusionScratch({ ports, dryRun });

if (asJson) {
  process.stdout.write(JSON.stringify(res, null, 2) + "\n");
  process.exit(0);
}

for (const p of res.byPort) {
  if (!p.up) { console.log(`:${p.port}  Fusion not reachable (${p.error}) — skipped`); continue; }
  if (!p.capable) { console.log(`:${p.port}  up but no /doc/close — ${p.error}`); continue; }
  const verb = dryRun ? "would close" : "closed";
  const n = dryRun ? p.scratchCount : p.closed;
  console.log(
    `:${p.port}  ${p.totalDocs} open · ${p.scratchCount} scratch · ${verb} ${n}` +
    (p.skipped ? ` · ${p.skipped} skipped(promoted)` : "") +
    (p.error ? ` · err=${p.error}` : "")
  );
  if (p.closedNames?.length) console.log(`        ${p.closedNames.join(", ")}`);
}
console.log(`${dryRun ? "[dry-run] " : ""}total ${dryRun ? "to close" : "closed"}: ${dryRun ? res.byPort.reduce((a, b) => a + (b.scratchCount || 0), 0) : res.totalClosed}`);
process.exit(0);
