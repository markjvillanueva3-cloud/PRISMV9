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
 *   roadmap_priority === 2  →  CLEANUP-MS0 (golf hygiene, alongside the 2 primary)
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
import { peerClaimedSet, readStore as readClaimStore } from "../.claude/helpers/slot-task-claim.mjs";

const ROOT = "H:/prism";
const ROADMAP_PATH = path.join(ROOT, "state/shared/atomic-roadmap.json");
const PROGRESS_PATH = path.join(ROOT, "state/shared/MILESTONE_PROGRESS.json");
const MILESTONES_DIR = path.join(ROOT, "mcp-server/data/milestones");

const SLOT_TO_CHAT = { alpha: 1, bravo: 2, charlie: 3, delta: 4, echo: 5, foxtrot: 6, golf: 7 };

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
// PER-SLOT-CLAIM-MS0/U-PSC02: identity for slot-task-claim filter. When
// --chatId is provided, peer-claimed units are filtered out of the pool.
// When omitted, NO filter is applied (so legacy callers behave identically).
// --no-claim-filter disables the filter even when --chatId is provided
// (for debugging or admin pick-unit invocations).
const chatId = argVal("--chatId", "");
const noClaimFilter = args.includes("--no-claim-filter");

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
  if (p === 2) return "cleanup";
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

// Cleanup is fleet-shared (golf-owned), not chat-laned. slot=golf also has
// no laneAssignment by design. Both cases use the full roadmap pool; the
// priority filter below scopes to roadmap_priority=2.
const isCleanupQuery = priorityFilter === "cleanup" || slot === "golf";
const lane = isCleanupQuery
  ? null
  : (roadmap.laneAssignments ?? []).find((l) => l.chat === chat);
if (!isCleanupQuery && !lane) {
  console.error(`pick-unit: no lane assignment for chat ${chat} (slot ${slot})`);
  process.exit(3);
}

const shipped = buildShippedSet(progress);

// Cleanup queries use the full roadmap (no lane scoping); lane queries
// resolve lane.units keys into entries the normal way.
let pool = isCleanupQuery
  ? roadmap.roadmap.slice()
  : (lane.units ?? [])
      .map((k) => byKey.get(k))
      .filter(Boolean);

const beforeShipped = pool.length;
pool = pool.filter((u) => !shipped.has(`${u.milestone}::${u.unit_id ?? "?"}`));
const afterShipped = pool.length;

// PER-SLOT-CLAIM-MS0/U-PSC02: filter peer-claimed units. Only applies when
// caller passes --chatId (identity required for safe filtering — without it
// we have no way to tell self-claims from peer-claims). Defaults to no-filter
// to preserve legacy `node scripts/pick-unit.mjs` behavior.
let peerClaimedCount = 0;
if (chatId && !noClaimFilter) {
  const claimStore = readClaimStore();
  // Note: readOnly stores (corrupt/schema-mismatch) still let us READ peer
  // claims — we just can't write. That's correct for pick-unit (read-only).
  const unitIds = pool.map((u) => `${u.milestone}::${u.unit_id ?? "?"}`);
  const claimedByPeers = peerClaimedSet(claimStore, slot, chatId, unitIds, new Date().toISOString());
  peerClaimedCount = claimedByPeers.size;
  if (peerClaimedCount > 0) {
    pool = pool.filter((u) => !claimedByPeers.has(`${u.milestone}::${u.unit_id ?? "?"}`));
  }
}
const afterClaimFilter = pool.length;

if (priorityFilter === "devtools") pool = pool.filter((u) => u.roadmap_priority === 0);
else if (priorityFilter === "revenue") pool = pool.filter((u) => u.roadmap_priority === 1);
else if (priorityFilter === "cleanup") pool = pool.filter((u) => u.roadmap_priority === 2);
// "any" → keep all

if (tierFilter !== null && Number.isFinite(tierFilter)) {
  pool = pool.filter((u) => Number(u.tier) === tierFilter);
}

// Sort: priority asc (0 devtools first, 1 revenue), then tier asc, then milestone, then unit.
// Use ?? semantics for tier so tier=0 isn't treated as missing (the `0 || 99 === 99` trap
// was demoting tier-0 units to the bottom of the listing).
const tierKey = (u) => {
  const n = Number(u?.tier);
  return Number.isFinite(n) ? n : 99;
};
pool.sort((a, b) =>
  (a.roadmap_priority ?? 9) - (b.roadmap_priority ?? 9) ||
  tierKey(a) - tierKey(b) ||
  (a.milestone || "").localeCompare(b.milestone || "") ||
  (a.unit_id || "").localeCompare(b.unit_id || ""));

// Heuristic: extract candidate asset names from a unit title for tailored
// graph queries. Captures `XxxEngine`, `XxxScript`, `XxxHook`, `XxxSkill`,
// `/skill-name`, and bare PascalCase tokens that look like type identifiers.
// Returns up to 3 unique tokens — used to generate per-unit research commands.
function extractAssetTokens(title) {
  if (!title || typeof title !== "string") return [];
  const out = new Set();
  // PascalCase + suffix
  const m1 = title.match(/\b[A-Z][A-Za-z0-9]+(?:Engine|Script|Hook|Skill|Dispatcher|Bridge|Service|Validator|Optimizer)\b/g);
  if (m1) m1.forEach((t) => out.add(t));
  // Slash-prefixed skill names like /broadcast or /pick-unit
  const m2 = title.match(/\/[a-z][a-z0-9-]+/g);
  if (m2) m2.forEach((t) => out.add(t));
  // Bare PascalCase identifiers (fallback when no engine suffix)
  if (out.size === 0) {
    const m3 = title.match(/\b[A-Z][A-Za-z0-9]{4,}\b/g);
    if (m3) m3.slice(0, 2).forEach((t) => out.add(t));
  }
  return [...out].slice(0, 3);
}

// Build a per-pick "research pack" — concrete commands the chat should run
// BEFORE writing code, ordered by leverage. Always includes /system-viz +
// /master-index + /awareness-snapshot; adds per-unit graph queries when
// the title surfaces a likely asset name.
function researchPack(pick) {
  const tokens = extractAssetTokens(pick.title);
  const cmds = [];
  // Always-applicable surfaces
  cmds.push({
    cmd: "/system-viz",
    why: "open the 3D system map (layer view, in/out-degree, orphans) in browser at :8765",
  });
  cmds.push({
    cmd: `node scripts/system-viz-query.mjs find ${tokens[0] || pick.milestone}`,
    why: "graph search — locate related nodes (engines, dispatchers, actions, hooks, wiki) by name",
  });
  if (tokens.length > 0) {
    cmds.push({
      cmd: `node scripts/system-viz-query.mjs blast-radius ${tokens[0]}`,
      why: "wiring impact — who depends on this and what it depends on (refactor blast-radius)",
    });
  }
  cmds.push({
    cmd: `prism_session:master_index_query  q="${tokens[0] || pick.title?.slice(0, 40) || pick.unit_id}"`,
    why: "unified text/semantic search across engines + actions + wiki + memory (use BEFORE Grep/Glob)",
  });
  cmds.push({
    cmd: "/awareness-snapshot",
    why: "15-line built/wired/drifted digest — see whether the unit's deliverables already exist",
  });
  cmds.push({
    cmd: "/orphan-inventory",
    why: "built-but-unwired engine punch list — candidates that could be wired to satisfy this unit",
  });
  cmds.push({
    cmd: "/dedup",
    why: "mandatory before creating ANY new engine / hook / skill / script",
  });
  return cmds;
}

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
  research: researchPack({ milestone: u.milestone, unit_id: u.unit_id, title: u.title }),
}));

const summary = {
  slot,
  chat,
  lane_size: lane?.units?.length ?? (isCleanupQuery ? roadmap.roadmap.length : 0),
  before_shipped_filter: beforeShipped,
  after_shipped_filter: afterShipped,
  peer_claimed_filtered: peerClaimedCount,
  after_claim_filter: afterClaimFilter,
  filter: { priority: priorityFilter, tier: tierFilter, chatId: chatId || null, claimFilter: !!chatId && !noClaimFilter },
  candidates: picks.length,
  pool_remaining: pool.length,
};

if (wantJson) {
  console.log(JSON.stringify({ summary, picks }, null, 2));
} else {
  console.log(`# pick-unit — slot=${slot} chat=${chat} priority=${priorityFilter}${tierFilter !== null ? ` tier=${tierFilter}` : ""}${chatId ? ` chatId=${chatId.slice(0, 15)}` : ""}`);
  const laneSize = lane?.units?.length ?? (isCleanupQuery ? roadmap.roadmap.length : 0);
  const claimLine = peerClaimedCount > 0 ? ` · peer-claimed ${peerClaimedCount}` : "";
  console.log(`Lane size ${laneSize} · after-shipped ${afterShipped}${claimLine} · pool after filter ${pool.length} · showing top ${picks.length}`);
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

    // Research pack — emits AFTER the picks so the chat sees the next-step
    // command surface without re-deriving it. Per user directive 2026-05-13:
    // pick-unit must guide the chat to /system-viz for file search, research,
    // wiring, and overall system visual BEFORE touching code.
    const top = picks[0];
    console.log("");
    console.log("─── 💡 Research before claiming (run BEFORE Grep/Glob) ───");
    console.log(`   Top pick: ${top.milestone} / ${top.unit_id ?? "?"} — ${(top.title || "").slice(0, 60)}`);
    console.log("");
    console.log("   System-viz first (overall visual + wiring impact):");
    top.research
      .filter((r) => r.cmd.includes("system-viz") || r.cmd.includes("blast-radius") || r.cmd.includes("find "))
      .forEach((r) => console.log(`     • ${r.cmd}\n         → ${r.why}`));
    console.log("");
    console.log("   Search + state (file location + dedup):");
    top.research
      .filter((r) => !r.cmd.includes("system-viz") && !r.cmd.includes("blast-radius") && !r.cmd.includes("find "))
      .forEach((r) => console.log(`     • ${r.cmd}\n         → ${r.why}`));
    console.log("");
    console.log("   Order: system-viz → master_index → awareness-snapshot → orphan-inventory → dedup → code.");
    if (picks.length > 1) {
      console.log("   (Each picked unit has its own research pack — pass --json to see all.)");
    }
  }
}
