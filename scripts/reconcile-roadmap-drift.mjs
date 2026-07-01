#!/usr/bin/env node
// Reconcile roadmap-index.json using the drift report + per-milestone envelope
// files. SAFE: never decreases status or completed_units. Envelope file wins
// only when its `shipped[]` array (or non-zero completed_units) proves
// progress greater than what the index already records.

import { readFileSync, existsSync } from "node:fs";
import { resolve, join } from "node:path";
import { atomicWriteJson } from "./lib/atomic-json.mjs";

const REPO = "H:/prism";
const INDEX_PATH = resolve(REPO, "mcp-server/data/roadmap-index.json");
const REPORT_PATH = resolve(REPO, "mcp-server/data/state/roadmap-drift-report.json");
const MILESTONE_DIR = resolve(REPO, "mcp-server/data/milestones");
const NOW = new Date().toISOString();

// Status ordering — reconciler is monotonic forward only.
const STATUS_RANK = {
  not_started: 0,
  ready: 1,
  in_progress: 2,
  paused: 2,
  blocked: 2,
  complete: 3,
  consolidated: 4,
  superseded: 4,
  deprecated: 4,
};
const rank = (s) => (s in STATUS_RANK ? STATUS_RANK[s] : -1);

const index = JSON.parse(readFileSync(INDEX_PATH, "utf8"));
const report = JSON.parse(readFileSync(REPORT_PATH, "utf8"));
const driftById = new Map(report.drifts.map((d) => [d.id, d]));

const changes = [];

function loadEnvelope(m) {
  const candidates = [];
  if (m.envelope_path) candidates.push(resolve(REPO, m.envelope_path));
  candidates.push(join(MILESTONE_DIR, `${m.id}.json`));
  for (const p of candidates) {
    if (existsSync(p)) {
      try {
        return { path: p, data: JSON.parse(readFileSync(p, "utf8")) };
      } catch (e) {
        // A corrupt envelope that EXISTS must not be silently skipped (R12): it
        // would make the milestone reconcile as envelope-less, letting the stale
        // index status win (silent close-out debt the discovery sweep flagged).
        process.stderr.write(`[reconcile-drift] WARN corrupt envelope ${p} for ${m.id}: ${e.message}\n`);
      }
    }
  }
  return null;
}

for (const m of index.milestones) {
  // Skip terminal statuses entirely
  if (["superseded", "consolidated", "deprecated"].includes(m.status)) continue;

  const envelope = loadEnvelope(m);
  const drift = driftById.get(m.id);

  // Build candidate values from each source
  const candidates = [];

  // Index current state — baseline floor
  candidates.push({
    source: "index",
    status: m.status,
    completed_units: m.completed_units || 0,
  });

  // Envelope — trust only when it has a shipped[] array OR explicit non-zero
  // completed_units AND a forward-progressing status.
  if (envelope?.data) {
    const env = envelope.data;
    const shippedCount = Array.isArray(env.shipped) ? env.shipped.length : 0;
    const envCompleted = Math.max(env.completed_units || 0, shippedCount);
    if (envCompleted > 0 || (env.status && rank(env.status) > rank(m.status))) {
      candidates.push({
        source: "envelope",
        status: env.status || m.status,
        completed_units: envCompleted,
      });
    }
  }

  // Git observed
  if (drift) {
    const total = m.total_units || 0;
    const observed = total > 0
      ? Math.min(drift.observed_completed, total)
      : drift.observed_completed;
    let proposedStatus = m.status;
    if (total > 0 && observed >= total) proposedStatus = "complete";
    else if (observed > 0 && rank("in_progress") > rank(m.status)) proposedStatus = "in_progress";
    candidates.push({
      source: "git",
      status: proposedStatus,
      completed_units: observed,
    });
  }

  // Pick the candidate with the highest combined progress
  // Score: status rank * 10000 + completed_units (status weighted higher)
  let best = candidates[0];
  for (const c of candidates) {
    const cScore = rank(c.status) * 100000 + c.completed_units;
    const bScore = rank(best.status) * 100000 + best.completed_units;
    if (cScore > bScore) best = c;
  }

  // Monotonic forward only — never regress
  if (rank(best.status) < rank(m.status)) best.status = m.status;
  if (best.completed_units < (m.completed_units || 0)) {
    best.completed_units = m.completed_units || 0;
  }

  if (best.status === m.status && best.completed_units === (m.completed_units || 0)) continue;

  changes.push({
    id: m.id,
    source: best.source,
    before: { status: m.status, completed_units: m.completed_units || 0 },
    after: { status: best.status, completed_units: best.completed_units },
  });

  m.status = best.status;
  m.completed_units = best.completed_units;
  m._reconciled_at = NOW;
  m._reconciled_source = best.source;

  if (best.status === "complete" && !m.completed_at) {
    m.completed_at = NOW;
  }
}

index.updated_at = NOW;
index._last_reconcile = {
  at: NOW,
  changed_count: changes.length,
  drift_report: REPORT_PATH,
};

if (changes.length === 0) {
  console.log("No reconciliation needed.");
  process.exit(0);
}

// U-ROADMAP-INDEX-WRITER-CONSOLIDATE: atomic write via the shared helper
// (scripts/lib/atomic-json.mjs) — replaces an inline fixed-".tmp" copy.
atomicWriteJson(INDEX_PATH, index);

console.log(`Reconciled ${changes.length} milestones (forward-only):`);
for (const c of changes) {
  const b = `${c.before.status}@${c.before.completed_units}`;
  const a = `${c.after.status}@${c.after.completed_units}`;
  console.log(`  ${c.id.padEnd(28)} ${b.padEnd(20)} -> ${a.padEnd(20)} [${c.source}]`);
}
