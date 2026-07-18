#!/usr/bin/env node
/**
 * auto-reconcile-drift.mjs
 *
 * Reads MILESTONE_PROGRESS.json, identifies the envelope-vs-git drift cases,
 * and emits a patch proposal per drift. Each proposal contains:
 *   - milestoneId + envelope path
 *   - claimedStatus (current envelope) + derivedStatus (git reality)
 *   - proposedStatus (what to set) + rationale
 *
 * Output: H:/prism/state/shared/drift-reconcile-proposals.json
 *
 * --apply flag: patches each envelope's `status` field to derivedStatus.
 *               Updates roadmap-index.json to match. Idempotent.
 *
 * Closes the system-viz-completeness-check Blocker 6:
 *   "envelope_drift_zero — 3 envelope drift case(s)"
 */

import fs from "node:fs";
import path from "node:path";

const MP = "H:/prism/state/shared/MILESTONE_PROGRESS.json";
const ENV_DIR = "H:/prism/mcp-server/data/milestones";
const INDEX = "H:/prism/mcp-server/data/roadmap-index.json";
const OUT = "H:/prism/state/shared/drift-reconcile-proposals.json";
const APPLY = process.argv.includes("--apply");

const REAL_DRIFT_VALUES = new Set([
  "claims_completed_but_units_pending",
  "claims_not_started_but_has_shipped_units",
]);

const STATUS_MAP = {
  not_started_real: "not_started",
  in_progress_real: "in_progress",
  complete_real: "complete",
  no_units: "deprecated",
};

function readJSON(p, fallback = null) {
  if (!fs.existsSync(p)) return fallback;
  try { return JSON.parse(fs.readFileSync(p, "utf8")); }
  catch { return fallback; }
}

function main() {
  const mp = readJSON(MP);
  if (!mp) {
    console.error(`MILESTONE_PROGRESS not found at ${MP}`);
    process.exit(2);
  }

  const drifts = (mp.milestones || []).filter(
    (m) => m.drift && REAL_DRIFT_VALUES.has(m.drift),
  );

  const proposals = drifts.map((d) => {
    const proposed = STATUS_MAP[d.derivedStatus] || d.derivedStatus;
    const envelopePath = path.join(ENV_DIR, `${d.id}.json`);
    return {
      milestoneId: d.id,
      title: d.title,
      track: d.track,
      envelopePath,
      envelopeExists: fs.existsSync(envelopePath),
      claimedStatus: d.claimedStatus,
      derivedStatus: d.derivedStatus,
      proposedStatus: proposed,
      rationale: d.drift === "claims_completed_but_units_pending"
        ? `Envelope claims completed but git shows ${d.shipped}/${d.total} units shipped. Demote to ${proposed}.`
        : `Envelope claims ${d.claimedStatus} but git shows shipped units. Promote to ${proposed}.`,
      shipped: d.shipped,
      total: d.total,
      lastShippedDate: d.lastShippedDate,
    };
  });

  const out = {
    generatedAt: new Date().toISOString(),
    count: proposals.length,
    proposals,
  };
  fs.writeFileSync(OUT, JSON.stringify(out, null, 2));
  console.log(`wrote ${OUT}`);
  console.log(`  ${proposals.length} drift case(s):`);
  for (const p of proposals) {
    console.log(`    ${p.milestoneId}: ${p.claimedStatus} → ${p.proposedStatus}  (${p.rationale.slice(0, 60)}...)`);
  }

  if (!APPLY) {
    console.log("(emit-only; pass --apply to patch envelopes + roadmap-index)");
    return;
  }

  // Apply patches
  const idx = readJSON(INDEX, { milestones: [] });
  let envPatched = 0;
  let idxPatched = 0;
  for (const p of proposals) {
    if (!p.envelopeExists) {
      console.warn(`  SKIP ${p.milestoneId} — envelope missing`);
      continue;
    }
    try {
      const env = JSON.parse(fs.readFileSync(p.envelopePath, "utf8"));
      env.status = p.proposedStatus;
      env.lastReconciledAt = new Date().toISOString();
      env.driftReconciliation = {
        from: p.claimedStatus,
        to: p.proposedStatus,
        rationale: p.rationale,
      };
      fs.writeFileSync(p.envelopePath, JSON.stringify(env, null, 2));
      envPatched++;
    } catch (e) {
      console.warn(`  FAIL ${p.milestoneId} envelope: ${e.message}`);
    }
    // Patch index
    const found = (idx.milestones || []).find((m) => m.id === p.milestoneId);
    if (found) {
      found.status = p.proposedStatus;
      idxPatched++;
    }
  }
  fs.writeFileSync(INDEX, JSON.stringify(idx, null, 2));
  console.log(`applied: ${envPatched} envelopes, ${idxPatched} index entries`);
}

main();
