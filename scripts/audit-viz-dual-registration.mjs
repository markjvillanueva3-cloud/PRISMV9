#!/usr/bin/env node
// CLI for the system-viz FAST[]+merge-splice dual-registration auditor.
// Usage: node scripts/audit-viz-dual-registration.mjs [--json] [--strict]
//   --json    machine-readable report (full structured object)
//   --strict  exit 2 if ANY crash-risk (a FAST[] entry whose generator is missing -> regen crash)
// Exit: 0 clean | 1 issues found (advisory) | 2 crash-risk under --strict.
//
// Pairs with the regen-viz preflight (same audit, runs automatically before every regen).
// Lib: scripts/lib/viz-dual-registration-audit.mjs (sierra galaxy).
import path from "node:path";
import { fileURLToPath } from "node:url";
import { auditDualRegistration } from "./lib/viz-dual-registration-audit.mjs";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const args = process.argv.slice(2);
const r = auditDualRegistration({ root: ROOT });

if (args.includes("--json")) {
  console.log(JSON.stringify(r, null, 2));
} else {
  const s = r.summary;
  console.log(`viz dual-registration audit -- FAST ${s.fastCount} | HEAVY ${s.heavyCount} | merge loadOptional ${s.loadOptionalCount} | viz producers ${s.vizProducerCount}`);
  console.log(`  crashRisks(P0)=${s.crashRisks} silentDiscards(P1)=${s.silentDiscards} orphanGenerators(P2)=${s.orphanGenerators} danglingConsumers=${s.danglingConsumers} unverifiable=${s.unverifiable}`);
  if (r.crashRisks.length) {
    console.log("  P0 CRASH-RISK (FAST entry, missing generator -> regen MODULE_NOT_FOUND):");
    for (const e of r.crashRisks) console.log(`    - ${e}`);
  }
  if (r.silentDiscards.length) {
    console.log("  P1 SILENT-DISCARD (in FAST, no merge loadOptional -> ghost data dropped):");
    for (const d of r.silentDiscards) console.log(`    - ${d.file} -> ${d.outputs.join(", ")}`);
  }
  if (r.orphanGenerators.length) {
    console.log("  P2 ORPHAN (emits a fold output but not in FAST[] -> never runs):");
    for (const o of r.orphanGenerators) console.log(`    - ${o.file} -> ${o.outputs.join(", ")}`);
  }
  if (r.danglingConsumers.length) {
    console.log("  ADVISORY dangling consumers (merge loadOptional with no on-disk producer):");
    for (const n of r.danglingConsumers) console.log(`    - ${n}`);
  }
  console.log(s.clean ? "  RESULT: CLEAN (no crash/discard/orphan)" : "  RESULT: ISSUES FOUND (see above)");
}

const exitCode = r.crashRisks.length && args.includes("--strict") ? 2 : r.summary.clean ? 0 : 1;
process.exit(exitCode);
