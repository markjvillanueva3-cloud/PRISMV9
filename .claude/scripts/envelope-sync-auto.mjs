#!/usr/bin/env node
/**
 * envelope-sync-auto.mjs
 *
 * Auto-applies the drift patches that auto-reconcile-drift.mjs already
 * proposes. Removes the recurring "envelope claims X but git shows Y"
 * audit finding without human intervention.
 *
 * Workflow:
 *   1. Read state/shared/drift-reconcile-proposals.json
 *   2. For each proposal:
 *      - Open the envelope
 *      - Set status = proposedStatus
 *      - Append rationale to history
 *      - Bump generatedAt or schemaVersion if present
 *   3. Re-run build-state-snapshot to refresh BUILD_STATE.json
 *
 * Safety rails:
 *   - --dry-run prints diff without writing
 *   - Skips proposals with `proposedStatus` that doesn't match a known
 *     envelope status enum (not_started | in_progress | complete | etc.)
 *   - Backs up each envelope to .bak before writing
 *   - Refuses to act on a proposal older than 24h (stale signal)
 *
 * Usage:
 *   node envelope-sync-auto.mjs                # apply all
 *   node envelope-sync-auto.mjs --dry-run      # show diff only
 *   node envelope-sync-auto.mjs --milestone X  # only that one
 */

import fs from "node:fs";
import path from "node:path";
import { spawnSync } from "node:child_process";

const PRISM = "H:/prism";
const PROPOSALS = `${PRISM}/state/shared/drift-reconcile-proposals.json`;
const ENV_DIR = `${PRISM}/mcp-server/data/milestones`;
const SNAPSHOT = `${PRISM}/scripts/build-state-snapshot.mjs`;
const STALE_HOURS = 24;

const VALID_STATUSES = new Set([
  "not_started", "in_progress", "complete", "completed",
  "blocked", "deferred",
]);

function args() {
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

function readJSON(p, fb) {
  if (!fs.existsSync(p)) return fb;
  try { return JSON.parse(fs.readFileSync(p, "utf8")); } catch { return fb; }
}

const opts = args();

if (!fs.existsSync(PROPOSALS)) {
  console.error(`No drift proposals at ${PROPOSALS}`);
  console.error(`Run: node H:/prism/.claude/scripts/auto-reconcile-drift.mjs first`);
  process.exit(2);
}

const data = readJSON(PROPOSALS, null);
if (!data || !data.proposals) {
  console.error("Empty or malformed proposals file");
  process.exit(2);
}

const ageHours = (Date.now() - new Date(data.generatedAt).getTime()) / 3600000;
if (ageHours > STALE_HOURS && !opts["force-stale"]) {
  console.error(`Proposals are ${ageHours.toFixed(1)}h old (>${STALE_HOURS}h). Re-run auto-reconcile-drift.mjs.`);
  console.error(`Override with --force-stale if you've verified git state hasn't changed.`);
  process.exit(2);
}

let applied = 0;
let skipped = 0;
const log = [];

for (const p of data.proposals) {
  if (opts.milestone && p.milestoneId !== opts.milestone) {
    skipped++;
    continue;
  }
  if (!VALID_STATUSES.has(p.proposedStatus)) {
    log.push(`  SKIP ${p.milestoneId}: invalid proposed status "${p.proposedStatus}"`);
    skipped++;
    continue;
  }
  if (!p.envelopeExists) {
    log.push(`  SKIP ${p.milestoneId}: envelope does not exist`);
    skipped++;
    continue;
  }
  const envPath = p.envelopePath || path.join(ENV_DIR, `${p.milestoneId}.json`);
  if (!fs.existsSync(envPath)) {
    log.push(`  SKIP ${p.milestoneId}: ${envPath} not found`);
    skipped++;
    continue;
  }
  const env = readJSON(envPath, null);
  if (!env) {
    log.push(`  SKIP ${p.milestoneId}: envelope JSON parse failed`);
    skipped++;
    continue;
  }
  if (env.status === p.proposedStatus) {
    log.push(`  SKIP ${p.milestoneId}: already at ${p.proposedStatus}`);
    skipped++;
    continue;
  }

  const before = env.status;
  log.push(`  APPLY ${p.milestoneId}: ${before} → ${p.proposedStatus}  (${p.rationale})`);

  if (!opts["dry-run"]) {
    // Backup
    fs.writeFileSync(envPath + ".bak", JSON.stringify(env, null, 2));
    env.status = p.proposedStatus;
    env.history = env.history || [];
    env.history.push({
      ts: new Date().toISOString(),
      action: "envelope-sync-auto",
      from: before,
      to: p.proposedStatus,
      rationale: p.rationale,
      shipped: p.shipped,
      total: p.total,
    });
    fs.writeFileSync(envPath, JSON.stringify(env, null, 2));
    applied++;
  } else {
    applied++; // count for dry-run preview
  }
}

console.log("ENVELOPE-SYNC-AUTO" + (opts["dry-run"] ? " (DRY RUN)" : ""));
console.log("===================");
console.log(`Proposals age: ${ageHours.toFixed(1)}h`);
console.log(`Applied:       ${applied}`);
console.log(`Skipped:       ${skipped}`);
for (const l of log) console.log(l);

if (!opts["dry-run"] && applied > 0) {
  console.log("");
  console.log("Refreshing BUILD_STATE.json…");
  if (fs.existsSync(SNAPSHOT)) {
    const r = spawnSync(process.execPath, [SNAPSHOT], { stdio: "inherit", cwd: PRISM, timeout: 30_000 });
    console.log(`build-state-snapshot exit: ${r.status}`);
  } else {
    console.log("(build-state-snapshot.mjs missing; skipping refresh)");
  }
}
