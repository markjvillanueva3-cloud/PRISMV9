#!/usr/bin/env node
/**
 * inject-tribal-pipeline-into-atomic-roadmap.mjs
 *
 * Injects the user's generated "tribal-pipeline" roadmap (TRAINING-LEARNING-MS0
 * + MACRO-PROGRAM-PIPELINE-MS0 + BLUEPRINT-OCR-TRAINING-MS1) into the
 * canonical state/shared/atomic-roadmap.json that /pick-unit reads.
 *
 * Why: the user (2026-05-13) said "add the road map to the /pick-unit pipeline
 * so that road map also populates the selection." These 3 milestone envelopes
 * exist on disk but were never harvested into atomic-roadmap.json, so
 * /pick-unit could not surface their units.
 *
 * Tagging: track="training-pipeline", roadmap_priority=0 (devtools-equivalent
 * priority — these milestones build the foundational pipeline that lets PRISM
 * convert tribal knowledge + JM Die programs + docustra into end-to-end
 * mill/lathe/wire-EDM pipelines).
 *
 * Lane: all pending units assigned to chat 1 (slot alpha — the chat that owns
 * the tribal-pipeline drive). Operator can re-lane with /pick-unit --slot.
 *
 * Idempotent: re-running detects existing keys via the `milestone::unit_id`
 * compound key and is a no-op for already-injected units.
 *
 * Usage:
 *   node scripts/inject-tribal-pipeline-into-atomic-roadmap.mjs           # apply
 *   node scripts/inject-tribal-pipeline-into-atomic-roadmap.mjs --dry-run # preview
 */

import { readFileSync, writeFileSync, existsSync } from "node:fs";
import path from "node:path";

const ROOT = "H:/prism";
const ROADMAP_PATH = path.join(ROOT, "state/shared/atomic-roadmap.json");
const MILESTONES_DIR = path.join(ROOT, "mcp-server/data/milestones");

const TRIBAL_PIPELINE_MILESTONES = [
  "TRAINING-LEARNING-MS0",
  "MACRO-PROGRAM-PIPELINE-MS0",
  "BLUEPRINT-OCR-TRAINING-MS1",
];

const DEFAULT_LANE_CHAT = 1; // alpha
const TRACK = "training-pipeline";
const ROADMAP_PRIORITY = 0; // surfaces alongside devtools (first)
const DEFAULT_TIER = 1;     // most units are non-blocking infra; tier-0 reserved for safety-gate units

const DRY = process.argv.includes("--dry-run");

function loadEnvelope(milestoneId) {
  const p = path.join(MILESTONES_DIR, `${milestoneId}.json`);
  if (!existsSync(p)) return null;
  try {
    return JSON.parse(readFileSync(p, "utf8"));
  } catch (err) {
    console.error(`warn: ${milestoneId} envelope unreadable — ${err.message}`);
    return null;
  }
}

function extractUnits(envelope) {
  // Handle both nested phases[].units[] and flat units[].
  const flat = Array.isArray(envelope?.units) ? envelope.units : [];
  const nested = Array.isArray(envelope?.phases)
    ? envelope.phases.flatMap((ph) =>
        Array.isArray(ph?.units)
          ? ph.units.map((u) => ({ ...u, _phase: ph.id ?? null }))
          : []
      )
    : [];
  return [...flat, ...nested];
}

function deriveTier(unit, envelope) {
  if (Number.isFinite(unit?.tier)) return Number(unit.tier);
  // Safety-critical → tier 0 (gates other units).
  if (unit?.safety_critical === true) return 0;
  // Otherwise inherit envelope priority (P0 → tier 0, P1 → 1, etc).
  const p = envelope?.priority;
  if (typeof p === "string" && /^P(\d+)$/.test(p)) return Number(p.slice(1));
  return DEFAULT_TIER;
}

const roadmap = JSON.parse(readFileSync(ROADMAP_PATH, "utf8"));
if (!Array.isArray(roadmap.roadmap) || !Array.isArray(roadmap.laneAssignments)) {
  console.error("atomic-roadmap.json missing required arrays");
  process.exit(2);
}

// Build existing key set so we can skip already-injected units.
const existingKeys = new Set(
  roadmap.roadmap.map((u) => `${u.milestone}::${u.unit_id ?? "?"}`)
);

const additions = [];
const skipped = [];

for (const msId of TRIBAL_PIPELINE_MILESTONES) {
  const envelope = loadEnvelope(msId);
  if (!envelope) {
    console.error(`skip ${msId}: envelope not found at ${MILESTONES_DIR}/${msId}.json`);
    continue;
  }
  const units = extractUnits(envelope);
  if (units.length === 0) {
    console.error(`skip ${msId}: envelope has 0 units`);
    continue;
  }
  for (const unit of units) {
    const unitId = unit?.id ?? unit?.unit_id ?? null;
    if (!unitId) {
      console.error(`skip ${msId} unit: missing id`);
      continue;
    }
    const key = `${msId}::${unitId}`;
    if (existingKeys.has(key)) {
      skipped.push({ key, reason: "already in atomic-roadmap" });
      continue;
    }
    // Don't inject already-completed units — they'd just clutter /pick-unit
    // (which subtracts shipped units from MILESTONE_PROGRESS anyway).
    if (unit?.status === "completed") {
      skipped.push({ key, reason: "completed in envelope" });
      continue;
    }
    additions.push({
      milestone: msId,
      unit_id: unitId,
      title: unit?.title ?? "(no title)",
      tier: deriveTier(unit, envelope),
      aiPriorityScore: 60, // mid-priority, devtools-equivalent
      aiCategory: "tribal-pipeline",
      leverage_score: 10,
      domain: msId.includes("MACRO") ? "lathe" :
              msId.includes("BLUEPRINT") ? "cad" : "training",
      track: TRACK,
      roadmap_priority: ROADMAP_PRIORITY,
      shippedFraction: 0,
      tribalVerdict: "medium",
      tribalCount: 0,
      blastRadius: 0,
      blastRadiusBoost: 0,
      evidenceScore: 2,
      driftFlag: false,
      _injectedFrom: "tribal-pipeline-roadmap",
    });
    existingKeys.add(key);
  }
}

// Assign all new keys to chat 1 (slot alpha).
const lane = roadmap.laneAssignments.find((l) => l.chat === DEFAULT_LANE_CHAT);
if (!lane) {
  console.error(`lane chat=${DEFAULT_LANE_CHAT} not found in atomic-roadmap`);
  process.exit(3);
}
const existingLaneKeys = new Set(lane.units ?? []);
const newLaneKeys = [];
for (const add of additions) {
  const key = `${add.milestone}::${add.unit_id}`;
  if (!existingLaneKeys.has(key)) {
    newLaneKeys.push(key);
    existingLaneKeys.add(key);
  }
}

const summary = {
  willAdd: additions.length,
  willSkip: skipped.length,
  newLaneAssignments: newLaneKeys.length,
  totalRoadmapBefore: roadmap.total ?? roadmap.roadmap.length,
  totalRoadmapAfter: (roadmap.total ?? roadmap.roadmap.length) + additions.length,
};

console.log(`\n# inject-tribal-pipeline → atomic-roadmap`);
console.log(`mode: ${DRY ? "DRY-RUN (no write)" : "APPLY"}`);
console.log(`milestones: ${TRIBAL_PIPELINE_MILESTONES.join(", ")}`);
console.log(`track tag: "${TRACK}" · roadmap_priority: ${ROADMAP_PRIORITY} (devtools-equivalent)`);
console.log(`lane: chat=${DEFAULT_LANE_CHAT} (slot alpha)`);
console.log(`will add: ${summary.willAdd} units`);
console.log(`will skip: ${summary.willSkip} units (already present or completed)`);
console.log(`new lane assignments: ${summary.newLaneAssignments}`);
console.log(`roadmap total: ${summary.totalRoadmapBefore} → ${summary.totalRoadmapAfter}`);

if (additions.length > 0) {
  console.log(`\nNew units (first 15):`);
  additions.slice(0, 15).forEach((a, i) => {
    console.log(`  ${i + 1}. [t${a.tier}] ${a.milestone} / ${a.unit_id} — ${a.title.slice(0, 80)}`);
  });
  if (additions.length > 15) console.log(`  ... +${additions.length - 15} more`);
}
if (skipped.length > 0) {
  console.log(`\nSkipped (first 5):`);
  skipped.slice(0, 5).forEach((s) => console.log(`  - ${s.key} (${s.reason})`));
}

if (DRY) {
  console.log(`\n(dry-run — no changes written)`);
  process.exit(0);
}

if (additions.length === 0) {
  console.log(`\n(nothing to inject — exiting clean)`);
  process.exit(0);
}

// Apply.
roadmap.roadmap.push(...additions);
lane.units = [...(lane.units ?? []), ...newLaneKeys];
lane.count = lane.units.length;
roadmap.total = roadmap.roadmap.length;
roadmap.generatedAt = new Date().toISOString();
roadmap._lastInject = {
  at: new Date().toISOString(),
  source: "tribal-pipeline-roadmap",
  added: additions.length,
  laneAssignments: newLaneKeys.length,
};

// Preserve the file's single-line minified format (peer chats hit huge diffs
// if we pretty-print). atomic-roadmap.json has historically been minified.
writeFileSync(ROADMAP_PATH, JSON.stringify(roadmap) + "\n", "utf8");
console.log(`\n✓ wrote ${ROADMAP_PATH}`);
console.log(`  +${additions.length} units · +${newLaneKeys.length} lane assignments to chat ${DEFAULT_LANE_CHAT}`);
console.log(`  verify with: node scripts/pick-unit.mjs --slot alpha --priority devtools --limit 10`);
