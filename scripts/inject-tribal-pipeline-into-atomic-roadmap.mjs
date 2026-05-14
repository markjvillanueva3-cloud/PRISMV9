#!/usr/bin/env node
/**
 * inject-tribal-pipeline-into-atomic-roadmap.mjs
 *
 * Injects priority-0 milestone envelopes into state/shared/atomic-roadmap.json
 * that /pick-unit + /pick-dev read.
 *
 * Originally scoped (2026-05-13) for the 3 tribal-pipeline milestones
 * (TRAINING-LEARNING-MS0 / MACRO-PROGRAM-PIPELINE-MS0 / BLUEPRINT-OCR-TRAINING-MS1).
 * Generalized (2026-05-14, COMMAND-KERNEL-MS0 registration) to accept any
 * envelope that declares `track` + `roadmap_priority` at the top level — these
 * fields now override the legacy defaults (training-pipeline / 0).
 *
 * Why: the user (2026-05-13) said "add the road map to the /pick-unit pipeline
 * so that road map also populates the selection." The 3 tribal-pipeline
 * milestones exist on disk but were never harvested into atomic-roadmap.json,
 * so /pick-unit could not surface their units. COMMAND-KERNEL-MS0 follows the
 * same gap; it also ships as a priority-0 BACKEND-DEVTOOLS milestone.
 *
 * Tagging: each injected unit carries `track` + `roadmap_priority` read from
 * the envelope. If the envelope omits those fields, falls back to the legacy
 * defaults (track="training-pipeline", roadmap_priority=0) so the 3
 * pre-existing tribal-pipeline milestones inject unchanged from before.
 *
 * Lane: all pending units assigned to chat 1 (slot alpha). Operator can
 * re-lane via /pick-unit --slot.
 *
 * Idempotent: re-running detects existing keys via the `milestone::unit_id`
 * compound key and is a no-op for already-injected units.
 *
 * Usage:
 *   node scripts/inject-tribal-pipeline-into-atomic-roadmap.mjs           # apply all
 *   node scripts/inject-tribal-pipeline-into-atomic-roadmap.mjs --dry-run # preview
 *
 * Add a new milestone to the pickable pool by appending its ID to
 * INJECT_MILESTONES below. The script reads track + roadmap_priority from the
 * envelope itself, so no per-milestone constants needed.
 */

import { readFileSync, writeFileSync, existsSync } from "node:fs";
import path from "node:path";

const ROOT = "H:/prism";
const ROADMAP_PATH = path.join(ROOT, "state/shared/atomic-roadmap.json");
const MILESTONES_DIR = path.join(ROOT, "mcp-server/data/milestones");

// Milestone envelopes to inject. Each must exist at
// mcp-server/data/milestones/<id>.json. Track + roadmap_priority come from the
// envelope's top-level fields; missing fields fall back to LEGACY_DEFAULT_*.
const INJECT_MILESTONES = [
  "TRAINING-LEARNING-MS0",
  "MACRO-PROGRAM-PIPELINE-MS0",
  "BLUEPRINT-OCR-TRAINING-MS1",
  "COMMAND-KERNEL-MS0",
];

// Backward-compat alias for any external caller importing this const.
const TRIBAL_PIPELINE_MILESTONES = INJECT_MILESTONES;

const DEFAULT_LANE_CHAT = 1; // alpha
const LEGACY_DEFAULT_TRACK = "training-pipeline";
const LEGACY_DEFAULT_ROADMAP_PRIORITY = 0; // surfaces alongside devtools (first)
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

function deriveDomain(msId, envelope) {
  // Prefer the envelope's own `track` for routing, fall back to the
  // milestone-id heuristic that the tribal-pipeline milestones relied on.
  const track = (envelope?.track ?? "").toString().toLowerCase();
  if (track === "backend-devtools") return "devtools";
  if (track === "training-pipeline") {
    if (msId.includes("MACRO")) return "lathe";
    if (msId.includes("BLUEPRINT")) return "cad";
    return "training";
  }
  if (msId.includes("COMMAND-KERNEL")) return "kernel";
  if (msId.includes("MACRO")) return "lathe";
  if (msId.includes("BLUEPRINT")) return "cad";
  return "training";
}

function deriveAiCategory(envelope) {
  const track = (envelope?.track ?? "").toString().toLowerCase();
  if (track === "backend-devtools") return "backend-devtools";
  if (track === "training-pipeline") return "tribal-pipeline";
  return track || "tribal-pipeline";
}

for (const msId of INJECT_MILESTONES) {
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
  const envTrack = typeof envelope.track === "string" && envelope.track.length > 0
    ? envelope.track
    : LEGACY_DEFAULT_TRACK;
  const envPriority = Number.isFinite(envelope.roadmap_priority)
    ? Number(envelope.roadmap_priority)
    : LEGACY_DEFAULT_ROADMAP_PRIORITY;
  const aiCategory = deriveAiCategory(envelope);
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
      aiCategory,
      leverage_score: 10,
      domain: deriveDomain(msId, envelope),
      track: envTrack,
      roadmap_priority: envPriority,
      shippedFraction: 0,
      tribalVerdict: "medium",
      tribalCount: 0,
      blastRadius: 0,
      blastRadiusBoost: 0,
      evidenceScore: 2,
      driftFlag: false,
      _injectedFrom: aiCategory,
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

console.log(`\n# inject-milestones → atomic-roadmap`);
console.log(`mode: ${DRY ? "DRY-RUN (no write)" : "APPLY"}`);
console.log(`milestones: ${INJECT_MILESTONES.join(", ")}`);
console.log(`tagging: track + roadmap_priority read per-envelope (fallback: "${LEGACY_DEFAULT_TRACK}" / ${LEGACY_DEFAULT_ROADMAP_PRIORITY})`);
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
  source: "inject-milestones",
  milestones: INJECT_MILESTONES,
  added: additions.length,
  laneAssignments: newLaneKeys.length,
};

// Preserve the file's single-line minified format (peer chats hit huge diffs
// if we pretty-print). atomic-roadmap.json has historically been minified.
writeFileSync(ROADMAP_PATH, JSON.stringify(roadmap) + "\n", "utf8");
console.log(`\n✓ wrote ${ROADMAP_PATH}`);
console.log(`  +${additions.length} units · +${newLaneKeys.length} lane assignments to chat ${DEFAULT_LANE_CHAT}`);
console.log(`  verify with: node scripts/pick-unit.mjs --slot alpha --priority devtools --limit 10`);
