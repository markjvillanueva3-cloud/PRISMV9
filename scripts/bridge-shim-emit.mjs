#!/usr/bin/env node
/**
 * bridge-shim-emit.mjs — Stage 4 of the lego-stacking plan.
 *
 * Reads COHORT-COMPAT-MATRIX.json (Stage 2 output) and emits synthetic
 * 3-hop graph edges (cohortA._shim_anchor → shim:<id> → cohortB._shim_anchor)
 * into the same staging JSONL that bridge-auto-wire.mjs writes to. The next
 * /system-viz regen splices the file into the live graph so the shim layer
 * becomes navigable in the 3D viewer + queryable through master-index.
 *
 * Each emitted edge carries the same R12 honesty fields the bridge-auto-wire
 * script uses: `synthesized:true` + `provenance:bridge-shim-emit.mjs` +
 * `mustHumanVerify:true`. Operator MUST inspect before treating any shim
 * recommendation as a production wiring.
 *
 * Idempotency: edge id = sha1(from|to|kind|shimKind) — re-runs append nothing
 * already in the JSONL.
 *
 * Inputs:
 *   state/shared/specs/COHORT-COMPAT-MATRIX.json    (Stage 2 META artifact)
 *
 * Outputs:
 *   state/shared/system-viz/staging/bridge-edges-auto.jsonl  (append-only)
 *   state/shared/specs/BRIDGE-SHIM-EMIT-LOG.md               (operator log)
 *
 * Usage:
 *   node H:/prism/scripts/bridge-shim-emit.mjs              # emit top-10
 *   node H:/prism/scripts/bridge-shim-emit.mjs --top 25     # emit top-25
 *   node H:/prism/scripts/bridge-shim-emit.mjs --dry-run    # preview only
 */

import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = path.resolve(__dirname, "..");
const MATRIX_PATH = path.join(REPO_ROOT, "state/shared/specs/COHORT-COMPAT-MATRIX.json");
const STAGING_DIR = path.join(REPO_ROOT, "state/shared/system-viz/staging");
const EDGES_JSONL = path.join(STAGING_DIR, "bridge-edges-auto.jsonl");
const LOG_MD = path.join(REPO_ROOT, "state/shared/specs/BRIDGE-SHIM-EMIT-LOG.md");

const args = Object.fromEntries(
  process.argv.slice(2).flatMap((a, i, arr) => {
    if (!a.startsWith("--")) return [];
    const k = a.slice(2);
    const next = arr[i + 1];
    if (next === undefined || next.startsWith("--")) return [[k, true]];
    return [[k, next]];
  }),
);
const TOP_K = Number(args.top ?? 10);
const DRY_RUN = args["dry-run"] === true || args.dryRun === true;

// ─── Load Stage 2 output ────────────────────────────────────────────
if (!fs.existsSync(MATRIX_PATH)) {
  console.error(`[bridge-shim-emit] FATAL: ${MATRIX_PATH} missing — run scripts/batch-compat-scorer.mjs first`);
  process.exit(1);
}
const matrix = JSON.parse(fs.readFileSync(MATRIX_PATH, "utf8"));
const bridges = (matrix.topMediumCostBridges || []).slice(0, TOP_K);
const profiles = new Map((matrix.cohortProfiles || []).map(p => [p.cohort, p]));

// ─── Existing-edge dedupe set ───────────────────────────────────────
const seen = new Set();
if (fs.existsSync(EDGES_JSONL)) {
  const lines = fs.readFileSync(EDGES_JSONL, "utf8").split(/\r?\n/).filter(l => l.trim());
  for (const line of lines) {
    try {
      const e = JSON.parse(line);
      if (e.id) seen.add(e.id);
    } catch { /* skip malformed */ }
  }
}

// ─── Emit ───────────────────────────────────────────────────────────
function edgeId(from, to, kind, shimKind) {
  return "edge.shim." + crypto.createHash("sha1").update(`${from}|${to}|${kind}|${shimKind}`).digest("hex").slice(0, 12);
}

function cohortAnchor(cohortName) {
  // Stable, viz-friendly anchor id derived from the cohort name.
  return `cohort.${cohortName.toLowerCase().replace(/[^a-z0-9]+/g, "_").slice(0, 40)}._shim_anchor`;
}

const emitted = [];
let skippedDup = 0, skippedNoShim = 0;

for (const b of bridges) {
  const fromProf = profiles.get(b.from);
  const toProf = profiles.get(b.to);

  // Determine shim kinds (mirrors CohortBridgeShimEngine.recommendShimsForTopBridges)
  const shimKinds = [];
  if (fromProf?.era === "preESM" || toProf?.era === "preESM") {
    skippedNoShim++;
    continue; // No shim viable for pre-ESM cohorts — Stage 3 doctrine
  }
  if (fromProf?.era !== toProf?.era ||
      (fromProf?.era === "earlyESM" && toProf?.era === "earlyESM" && b.from !== b.to)) {
    shimKinds.push("nodenext-path");
  }
  const fromTopShape = fromProf?.topShapes?.[0]?.shape;
  const toTopShape = toProf?.topShapes?.[0]?.shape;
  if (fromTopShape && toTopShape && fromTopShape !== toTopShape) {
    shimKinds.push("shape-coerce");
  }
  if (shimKinds.length === 0) {
    skippedNoShim++;
    continue;
  }

  const fromAnchor = cohortAnchor(b.from);
  const toAnchor = cohortAnchor(b.to);

  for (const shimKind of shimKinds) {
    const id = edgeId(fromAnchor, toAnchor, "cohort-shim", shimKind);
    if (seen.has(id)) { skippedDup++; continue; }
    seen.add(id);
    emitted.push({
      id,
      source: fromAnchor,
      target: toAnchor,
      kind: "cohort-shim-bridge",
      shimKind,
      fromCohort: b.from,
      toCohort: b.to,
      score: b.total,
      combinedEngineCount: b.combinedEngineCount,
      synthesized: true,
      provenance: "bridge-shim-emit.mjs",
      mustHumanVerify: true,
      generatedAt: new Date().toISOString(),
    });
  }
}

// ─── Persist ────────────────────────────────────────────────────────

if (DRY_RUN) {
  console.error(`[bridge-shim-emit] DRY-RUN — would emit ${emitted.length} edges (${skippedDup} dup, ${skippedNoShim} no-shim-viable)`);
  for (const e of emitted) {
    console.error(`  ${e.shimKind.padEnd(15)} ${e.fromCohort} → ${e.toCohort}  (covers ${e.combinedEngineCount})`);
  }
  process.exit(0);
}

if (!fs.existsSync(STAGING_DIR)) fs.mkdirSync(STAGING_DIR, { recursive: true });
const fd = fs.openSync(EDGES_JSONL, "a");
try {
  for (const e of emitted) fs.writeSync(fd, JSON.stringify(e) + "\n");
} finally {
  fs.closeSync(fd);
}

// ─── Operator log ───────────────────────────────────────────────────

const log = [];
log.push(`# Bridge shim emit log (Stage 4)`);
log.push(``);
log.push(`**Last run:** ${new Date().toISOString()}`);
log.push(`**Edges emitted this run:** ${emitted.length}`);
log.push(`**Skipped (already in JSONL):** ${skippedDup}`);
log.push(`**Skipped (no shim viable — preESM or same shape):** ${skippedNoShim}`);
log.push(`**Cumulative shim edges in JSONL:** ${seen.size}`);
log.push(``);
log.push(`## Emitted this run`);
log.push(``);
log.push(`| shim kind | from cohort → to cohort | score | engines covered |`);
log.push(`|---|---|---:|---:|`);
for (const e of emitted) {
  log.push(`| ${e.shimKind} | ${e.fromCohort} → ${e.toCohort} | ${e.score} | ${e.combinedEngineCount} |`);
}
if (emitted.length === 0) log.push(`| — | _nothing new — all top-K shims already emitted_ | — | — |`);
log.push(``);
log.push(`## What these edges represent`);
log.push(``);
log.push(`Each line in \`${path.relative(REPO_ROOT, EDGES_JSONL)}\` whose \`kind:"cohort-shim-bridge"\` represents a synthetic adapter-shim edge between two cohort anchor nodes. On the next \`/system-viz\` regen, the edge surfaces in the 3D viewer as a navigable bridge between the two cohort groups.`);
log.push(``);
log.push(`> **R12 honesty:** every edge carries \`synthesized:true\` + \`provenance:bridge-shim-emit.mjs\` + \`mustHumanVerify:true\`. These are PROGRAMMATIC SHIM SUGGESTIONS derived from COHORT-COMPAT-MATRIX scores — they are NOT validated wirings of specific engine APIs (those need Stage 3's \`buildShapeCoerceShim()\` filled with a real \`methodMap\`). Operator MUST inspect before promoting to production.`);
log.push(``);
log.push(`## Re-run`);
log.push(``);
log.push(`\`\`\`bash`);
log.push(`node H:/prism/scripts/bridge-shim-emit.mjs              # apply top-10 (idempotent)`);
log.push(`node H:/prism/scripts/bridge-shim-emit.mjs --dry-run    # preview only`);
log.push(`node H:/prism/scripts/bridge-shim-emit.mjs --top 25     # apply top-25`);
log.push(`\`\`\``);

fs.writeFileSync(LOG_MD, log.join("\n"));

console.error(``);
console.error(`─── bridge-shim-emit — done ──────────────────────────────`);
console.error(`  Emitted this run:             ${emitted.length}`);
console.error(`  Skipped (already in JSONL):   ${skippedDup}`);
console.error(`  Skipped (no shim viable):     ${skippedNoShim}`);
console.error(`  Cumulative shim edges:        ${seen.size}`);
console.error(`  Edges JSONL:                  ${EDGES_JSONL}`);
console.error(`  Log:                          ${LOG_MD}`);
console.error(`──────────────────────────────────────────────────────────`);
