#!/usr/bin/env node
/**
 * subagent-scrutiny-merge.mjs — Track B / rgs6 S2.6.C
 *
 * After all subagents from subagent-scrutiny-orders.json return, the primary chat
 * writes their verdicts to subagent-scrutiny-results.json (one key per subagent
 * order). This script merges the three batches:
 *
 *   batch1.* (per-domain conflict audit)        → conflicts merged into predicted-collisions.json
 *   batch2.chat-N (per-chat slice scrutiny)     → per-lane confidence; gate at 0.7
 *   batch3.chunk-N (per-unit tribal classify)   → precedent tips appended to atomic-roadmap.json
 *
 * Outputs:
 *   subagent-scrutiny-summary.json — mean confidence, blocker count, fail-fast verdict
 *   atomic-roadmap.json patched in-place to add `precedents` per unit
 *   predicted-collisions.json patched to merge new conflicts
 *
 * Exit code: 0 if all confidence gates pass, 1 if any slice <0.7 (rerun signal).
 *
 * Usage:
 *   node subagent-scrutiny-merge.mjs
 *   node subagent-scrutiny-merge.mjs --json
 *   node subagent-scrutiny-merge.mjs --gate 0.65   # custom confidence threshold
 */

import fs from "node:fs";

const PRISM = "H:/prism";
const ORDERS = `${PRISM}/state/shared/subagent-scrutiny-orders.json`;
const RESULTS = `${PRISM}/state/shared/subagent-scrutiny-results.json`;
const SUMMARY = `${PRISM}/state/shared/subagent-scrutiny-summary.json`;
const ATOMIC = `${PRISM}/state/shared/atomic-roadmap.json`;
const COLLISIONS = `${PRISM}/state/shared/predicted-collisions.json`;

const DEFAULT_CONFIDENCE_GATE = 0.7;

function args() {
  const a = process.argv.slice(2);
  const o = {};
  for (let i = 0; i < a.length; i++) {
    if (a[i].startsWith("--")) {
      const k = a[i].slice(2);
      const v = a[i + 1] && !a[i + 1].startsWith("--") ? a[++i] : true;
      o[k] = v;
    }
  }
  return o;
}

function readJSON(p, fb) {
  if (!fs.existsSync(p)) return fb;
  try { return JSON.parse(fs.readFileSync(p, "utf8")); } catch { return fb; }
}

function writeJSONAtomic(p, obj) {
  const tmp = `${p}.tmp`;
  fs.writeFileSync(tmp, JSON.stringify(obj, null, 2));
  fs.renameSync(tmp, p);
}

function main() {
  const opts = args();
  const gate = Number(opts.gate) || DEFAULT_CONFIDENCE_GATE;

  const orders = readJSON(ORDERS, null);
  const results = readJSON(RESULTS, null);
  if (!orders) { console.error("subagent-scrutiny-orders.json missing — run --with-subagent-scrutiny first"); process.exit(2); }
  if (!results) { console.error("subagent-scrutiny-results.json missing — primary must write subagent verdicts before merge"); process.exit(2); }

  const summary = {
    schemaVersion: "1.0.0",
    passId: orders.passId,
    mergedAt: new Date().toISOString(),
    confidence_gate: gate,
    batch1: { conflicts_added: 0, mean_confidence: null },
    batch2: { lane_confidences: {}, mean_confidence: null, failing_lanes: [] },
    batch3: { precedents_added: 0, thin_coverage_units: [] },
    verdict: "pass",
  };

  // Batch 1 — merge conflicts into predicted-collisions
  const collisions = readJSON(COLLISIONS, { predictedCollisions: [] });
  if (!Array.isArray(collisions.predictedCollisions)) collisions.predictedCollisions = [];
  let b1conf = [];
  for (const sa of orders.batches.find(b => b.name === "per-domain-conflict-audit")?.subagents || []) {
    const key = `batch1.${sa.domain_category}`;
    const v = results[key];
    if (!v) continue;
    if (Array.isArray(v.conflicts)) {
      for (const c of v.conflicts) collisions.predictedCollisions.push({ ...c, source: key });
      summary.batch1.conflicts_added += v.conflicts.length;
    }
    if (typeof v.confidence === "number") b1conf.push(v.confidence);
  }
  if (b1conf.length) summary.batch1.mean_confidence = Number((b1conf.reduce((a, b) => a + b, 0) / b1conf.length).toFixed(3));
  writeJSONAtomic(COLLISIONS, collisions);

  // Batch 2 — per-lane confidence + failing-lane list
  let b2conf = [];
  for (const sa of orders.batches.find(b => b.name === "per-chat-slice-scrutiny")?.subagents || []) {
    const key = `batch2.chat-${sa.chat}`;
    const v = results[key];
    if (!v) continue;
    if (typeof v.confidence === "number") {
      summary.batch2.lane_confidences[`chat-${sa.chat}`] = v.confidence;
      b2conf.push(v.confidence);
      if (v.confidence < gate) summary.batch2.failing_lanes.push({ chat: sa.chat, confidence: v.confidence, blockers: v.blockers || [] });
    }
  }
  if (b2conf.length) summary.batch2.mean_confidence = Number((b2conf.reduce((a, b) => a + b, 0) / b2conf.length).toFixed(3));

  // Batch 3 — append precedents to atomic-roadmap
  const atomic = readJSON(ATOMIC, null);
  if (atomic && Array.isArray(atomic.roadmap)) {
    const byKey = new Map();
    for (const r of atomic.roadmap) byKey.set(`${r.milestone}/${r.unit_id}`, r);
    for (const sa of orders.batches.find(b => b.name === "per-unit-tribal-classification")?.subagents || []) {
      const key = `batch3.chunk-${sa.chunk_index}`;
      const v = results[key];
      if (!v) continue;
      if (v.precedents) {
        for (const [unitKey, tips] of Object.entries(v.precedents)) {
          const r = byKey.get(unitKey);
          if (!r) continue;
          r.precedents = (tips || []).slice(0, 3);
          summary.batch3.precedents_added++;
        }
      }
      if (Array.isArray(v.thin_coverage_flags)) summary.batch3.thin_coverage_units.push(...v.thin_coverage_flags);
    }
    writeJSONAtomic(ATOMIC, atomic);
  }

  // Verdict — fail if any lane below gate (signals S2.5 rerun)
  if (summary.batch2.failing_lanes.length > 0) summary.verdict = "fail-rerun";

  writeJSONAtomic(SUMMARY, summary);

  if (opts.json) {
    console.log(JSON.stringify(summary, null, 2));
  } else {
    console.log(`subagent-scrutiny merge — ${summary.verdict.toUpperCase()}`);
    console.log(`  Batch 1 conflicts added: ${summary.batch1.conflicts_added} (mean conf ${summary.batch1.mean_confidence ?? "—"})`);
    console.log(`  Batch 2 lane mean conf: ${summary.batch2.mean_confidence ?? "—"}, failing lanes: ${summary.batch2.failing_lanes.map(f => f.chat).join(", ") || "none"}`);
    console.log(`  Batch 3 precedents added: ${summary.batch3.precedents_added}, thin-coverage units: ${summary.batch3.thin_coverage_units.length}`);
    console.log(`  Wrote: ${SUMMARY}`);
  }

  process.exit(summary.verdict === "pass" ? 0 : 1);
}

try { main(); } catch (e) { console.error(`subagent-scrutiny-merge error: ${e.message}`); process.exit(2); }
