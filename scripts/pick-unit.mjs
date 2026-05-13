#!/usr/bin/env node
/**
 * pick-unit.mjs — Deterministic "next unit" picker from the two master roadmaps.
 *
 * User directive (2026-05-13): "when I say pick a unit, units are picked
 * from those 2 road maps with development tools taking first priority."
 *
 * The two master roadmaps are encoded in state/shared/atomic-roadmap.json via
 *   roadmap_priority === 0  →  BACKEND-DEVTOOLS-RGS6-MEGA-ROADMAP   (FIRST)
 *   roadmap_priority === 1  →  REVENUE-ROADMAP-v7.6 (track === "revenue")
 *
 * This script:
 *   1. Resolves the caller's chat lane (slot → chat 1..6 mapping).
 *   2. Filters atomic-roadmap units to that lane.
 *   3. Subtracts already-shipped units (cross-ref MILESTONE_PROGRESS.json).
 *   4. Sorts: roadmap_priority asc (devtools first), tier asc, milestone asc.
 *   5. Prints top-N candidates with the path to the milestone envelope so the
 *      caller can read the full spec before claiming.
 *
 * Usage:
 *   node scripts/pick-unit.mjs                       # top 5 from alpha (chat 1)
 *   node scripts/pick-unit.mjs --slot bravo          # lane for chat 2
 *   node scripts/pick-unit.mjs --priority revenue    # revenue only
 *   node scripts/pick-unit.mjs --priority devtools   # devtools only (default)
 *   node scripts/pick-unit.mjs --priority any        # both (devtools sort first)
 *   node scripts/pick-unit.mjs --tier 0              # tier-0 only
 *   node scripts/pick-unit.mjs --limit 1             # just the top
 *   node scripts/pick-unit.mjs --json                # machine-readable
 */

import { readFileSync, existsSync } from "node:fs";
import path from "node:path";

const ROOT = "H:/prism";
const ROADMAP_PATH = path.join(ROOT, "state/shared/atomic-roadmap.json");
const PROGRESS_PATH = path.join(ROOT, "state/shared/MILESTONE_PROGRESS.json");
const MILESTONES_DIR = path.join(ROOT, "mcp-server/data/milestones");

const SLOT_TO_CHAT = { alpha: 1, bravo: 2, charlie: 3, delta: 4, echo: 5, foxtrot: 6 };

const args = process.argv.slice(2);
function argVal(name, fallback) {
  const i = args.indexOf(name);
  return i >= 0 && i + 1 < args.length ? args[i + 1] : fallback;
}
const slot = argVal("--slot", "alpha");
const chat = SLOT_TO_CHAT[slot] ?? Number(slot) ?? 1;
const priorityFilter = argVal("--priority", "devtools").toLowerCase();
const tierFilter = args.includes("--tier") ? Number(argVal("--tier", "")) : null;
const limit = Math.max(1, Number(argVal("--limit", "5")) || 5);
const wantJson = args.includes("--json");

function safeJson(p) {
  try {
    if (!existsSync(p)) return null;
    return JSON.parse(readFileSync(p, "utf8"));
  } catch { return null; }
}

function buildShippedSet(progress) {
  // MILESTONE_PROGRESS.json shape: { milestones: [{ id, units: [{ id, shipped }] }] }
  const shipped = new Set();
  for (const m of progress?.milestones ?? []) {
    for (const u of m?.units ?? []) {
      if (u?.shipped === true) shipped.add(`${m.id}::${u.id}`);
    }
  }
  return shipped;
}

function priorityLabel(p) {
  if (p === 0) return "devtools";
  if (p === 1) return "revenue";
  return "other";
}

function envelopePath(milestoneId) {
  if (!milestoneId) return null;
  const p = path.join(MILESTONES_DIR, `${milestoneId}.json`);
  return existsSync(p) ? p.replace(/\\/g, "/") : null;
}

const roadmap = safeJson(ROADMAP_PATH);
const progress = safeJson(PROGRESS_PATH);

if (!roadmap || !Array.isArray(roadmap.roadmap)) {
  console.error(`pick-unit: atomic-roadmap.json missing or malformed at ${ROADMAP_PATH}`);
  process.exit(2);
}

// Index by milestone::unit_id key.
const byKey = new Map();
for (const u of roadmap.roadmap) {
  if (!u || typeof u.milestone !== "string") continue;
  const key = `${u.milestone}::${u.unit_id ?? "?"}`;
  byKey.set(key, u);
}

const lane = (roadmap.laneAssignments ?? []).find((l) => l.chat === chat);
if (!lane) {
  console.error(`pick-unit: no lane assignment for chat ${chat} (slot ${slot})`);
  process.exit(3);
}

const shipped = buildShippedSet(progress);

// Resolve lane units → real entries, then filter.
let pool = (lane.units ?? [])
  .map((k) => byKey.get(k))
  .filter(Boolean);

const beforeShipped = pool.length;
pool = pool.filter((u) => !shipped.has(`${u.milestone}::${u.unit_id ?? "?"}`));
const afterShipped = pool.length;

if (priorityFilter === "devtools") pool = pool.filter((u) => u.roadmap_priority === 0);
else if (priorityFilter === "revenue") pool = pool.filter((u) => u.roadmap_priority === 1);
// "any" → keep all

if (tierFilter !== null && Number.isFinite(tierFilter)) {
  pool = pool.filter((u) => Number(u.tier) === tierFilter);
}

// Sort: priority asc (0 devtools first, 1 revenue), then tier asc, then milestone, then unit.
pool.sort((a, b) =>
  (a.roadmap_priority ?? 9) - (b.roadmap_priority ?? 9) ||
  (Number(a.tier) || 99) - (Number(b.tier) || 99) ||
  (a.milestone || "").localeCompare(b.milestone || "") ||
  (a.unit_id || "").localeCompare(b.unit_id || ""));

const picks = pool.slice(0, limit).map((u) => ({
  milestone: u.milestone,
  unit_id: u.unit_id,
  title: u.title,
  tier: u.tier,
  priority: priorityLabel(u.roadmap_priority),
  roadmap_priority: u.roadmap_priority,
  track: u.track,
  envelope: envelopePath(u.milestone),
  effort_minutes: u.effort_minutes ?? u.effort ?? null,
  dependencies: u.dependencies ?? [],
}));

const summary = {
  slot,
  chat,
  lane_size: lane.units?.length ?? 0,
  before_shipped_filter: beforeShipped,
  after_shipped_filter: afterShipped,
  filter: { priority: priorityFilter, tier: tierFilter },
  candidates: picks.length,
  pool_remaining: pool.length,
};

if (wantJson) {
  console.log(JSON.stringify({ summary, picks }, null, 2));
} else {
  console.log(`# pick-unit — slot=${slot} chat=${chat} priority=${priorityFilter}${tierFilter !== null ? ` tier=${tierFilter}` : ""}`);
  console.log(`Lane size ${lane.units?.length ?? 0} · after-shipped ${afterShipped} · pool after filter ${pool.length} · showing top ${picks.length}`);
  console.log("");
  if (picks.length === 0) {
    console.log("(no candidates match — relax filters or pick another lane)");
  } else {
    picks.forEach((p, i) => {
      console.log(`${i + 1}. [${p.priority}/t${p.tier ?? "?"}] ${p.milestone} / ${p.unit_id ?? "?"}`);
      console.log(`   ${(p.title || "").slice(0, 100)}`);
      if (p.envelope) console.log(`   spec: ${p.envelope}`);
      if (Array.isArray(p.dependencies) && p.dependencies.length > 0) {
        console.log(`   depends_on: ${p.dependencies.slice(0, 4).join(", ")}${p.dependencies.length > 4 ? ` (+${p.dependencies.length - 4})` : ""}`);
      }
      if (p.effort_minutes) console.log(`   effort: ~${p.effort_minutes} min`);
    });
  }
}
