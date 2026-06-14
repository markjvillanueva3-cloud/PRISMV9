#!/usr/bin/env node
/**
 * enrich-db-manifest-consumers.mjs
 *
 * GOAL (juliett, 2026-06-01): "all databases properly wired and bridged to all domains,
 * nodes and galaxies that will intake them. strategically wire based off necessity and logic."
 *
 * The 3 juliett directory stores already carry `consumers` (wired by wire-db-stores-to-consumers).
 * The other 22 registered databases in DB_MANIFEST.json (MaterialDB, ToolDB, ...) are
 * runtime-discoverable via DatabaseRegistry but carry NO `consumers` field, so the awareness
 * wirer can't surface them into the consuming galaxies' PATHS.md. This script attaches a
 * domain-logic `consumers` array to every non-deferred DB that lacks one — the necessity+logic
 * mapping below is the source of truth for WHICH galaxy intakes WHICH database.
 *
 * After running this, `node scripts/wire-db-stores-to-consumers.mjs` propagates ALL databases
 * (not just the 3 juliett stores) into every consumer galaxy's PATHS.md.
 *
 * IDEMPOTENT: only fills a `consumers` array when ABSENT (never overwrites a hand-tuned one).
 * Atomic write (tmp + rename). Skips `deferred` entries (not yet real).
 *
 * Usage:
 *   node scripts/enrich-db-manifest-consumers.mjs            # apply
 *   node scripts/enrich-db-manifest-consumers.mjs --check    # dry-run (exit 2 if entries need consumers)
 *
 * Karpathy: CLASSIFY=structured enrichment · EDGE=deferred skip / already-has-consumers / unknown id /
 * galaxy-without-PATHS (wirer filters) · FAIL=manifest malformed → exit 1.
 */
import * as fs from "node:fs";
import * as path from "node:path";
import { fileURLToPath } from "node:url";

const REPO = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const MANIFEST = path.join(REPO, "data/databases/DB_MANIFEST.json");

/**
 * Necessity+logic consumer map: DB id → galaxies that intake it (galaxy dir names under
 * mcp-server/src/engines/). Only galaxies that actually exist + have a PATHS.md get wired
 * (the wirer's discoverGalaxies filters). Rationale per line.
 */
export const CONSUMER_MAP = Object.freeze({
  // Core physics/material/tool references — the cutting-physics + DFM backbone.
  MaterialDB: ["speed-feed", "mill", "lathe", "wedm", "cam", "cad", "quality"],
  ToolDB: ["speed-feed", "mill", "lathe", "cam", "quoting"],
  MachineDB: ["mill", "lathe", "wedm", "cam", "post-processor", "shop-floor"],
  AlarmDB: ["post-processor", "mill", "lathe", "wedm"],
  FormulaDB: ["speed-feed", "mill", "lathe", "wedm", "cam", "quality"],
  AlgorithmDB: ["cam", "cad", "ai-training", "discovery"],
  KnowledgeDB: ["academy", "ai-training", "tribal-knowledge"],
  // Specialty file-backed stores — domain-targeted.
  ThreadDB: ["mill", "lathe"],
  WorkflowDB: ["agent-orchestration", "ai-training"],
  DecisionTreeDB: ["ai-training", "discovery"],
  ToolpathStrategyDB: ["cam", "mill", "lathe"],
  ToleranceDB: ["cad", "quality", "cam", "mill"],
  CoolantDB: ["speed-feed", "mill", "lathe", "cam"],
  WorkholdingDB: ["cam", "mill", "lathe", "cad"],
  SpindleDB: ["mill", "lathe", "speed-feed"],
  CollisionDB: ["cam", "post-processor"],
  GCodeTemplateDB: ["post-processor", "cam"],
  ProcessDataDB: ["speed-feed", "mill", "lathe", "quality"],
  GenomeDB: ["ai-training", "discovery"],
  CAMSystemDB: ["cam", "post-processor"],
  ReportTemplateDB: ["business", "quality", "quoting"],
  SourceCatalogDB: ["discovery", "database-expansion", "ai-training"],
});

/** Pure: returns {patched:[], skippedDeferred:[], alreadyHad:[], unmapped:[]} + the new manifest object. */
export function enrich(manifest) {
  const patched = [];
  const skippedDeferred = [];
  const alreadyHad = [];
  const unmapped = [];
  const dbs = Array.isArray(manifest.databases) ? manifest.databases : [];
  for (const d of dbs) {
    if (Array.isArray(d.consumers) && d.consumers.length > 0) { alreadyHad.push(d.id); continue; }
    if (d.status === "deferred") { skippedDeferred.push(d.id); continue; }
    const map = CONSUMER_MAP[d.id];
    if (!map) { unmapped.push(d.id); continue; }
    d.consumers = [...map];
    patched.push(d.id);
  }
  return { manifest, patched, skippedDeferred, alreadyHad, unmapped };
}

function main() {
  const check = process.argv.includes("--check");
  if (!fs.existsSync(MANIFEST)) { console.error(`[enrich-consumers] FATAL: manifest not found: ${MANIFEST}`); process.exit(1); }
  let manifest;
  try { manifest = JSON.parse(fs.readFileSync(MANIFEST, "utf-8")); }
  catch (e) { console.error(`[enrich-consumers] FATAL: manifest malformed: ${e.message}`); process.exit(1); }

  const { patched, skippedDeferred, alreadyHad, unmapped } = enrich(manifest);

  console.log(`[enrich-consumers] ${check ? "CHECK (no writes)" : "APPLIED"}`);
  console.log(`  patched (consumers added) : ${patched.length}  [${patched.join(", ")}]`);
  console.log(`  already had consumers     : ${alreadyHad.length}  [${alreadyHad.join(", ")}]`);
  console.log(`  skipped (deferred)        : ${skippedDeferred.length}  [${skippedDeferred.join(", ")}]`);
  if (unmapped.length) console.log(`  UNMAPPED (no map entry)   : ${unmapped.length}  [${unmapped.join(", ")}]  ← add to CONSUMER_MAP`);

  if (patched.length > 0 && !check) {
    const out = JSON.stringify(manifest, null, 2) + "\n";
    const tmp = MANIFEST + ".tmp-" + process.pid;
    fs.writeFileSync(tmp, out);
    fs.renameSync(tmp, MANIFEST); // atomic
    console.log(`  wrote ${MANIFEST}`);
  }
  if (check && patched.length > 0) {
    console.error("[enrich-consumers] --check: consumers missing — run without --check to apply.");
    process.exit(2);
  }
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  main();
}
