#!/usr/bin/env node
/**
 * generate-slot-binding-features.mjs — system-viz augmentation:
 * slot-worktree-binding health.
 *
 * [SLOT-BRIDGE-MS0]/U-SBB06 (2026-05-26, slot:alpha) — closes the
 * PSN+/system-viz synergy gap on top of U-SBB01..U-SBB05. The bridge
 * milestone made every NEW slot claim auto-arm; this generator makes
 * the CURRENT armed/unarmed state visible in /system-viz so an
 * operator (or any chat) can see at a glance which slots are
 * route-correct vs drifting.
 *
 * SOURCE: state/shared/slot-branch-bindings.json (bound-set) +
 *         state/shared/chat-slots.json (live state)
 * EMITS:
 *   - parent roost  `ghost.slot_binding_health` (kind ghost-roost,
 *     under `ghost.planned_features`).
 *   - one child per slot: `ghost.slot-binding.<slot>`, tier-coloured.
 *
 * TIER COLORS:
 *   armed:           green  — slot has chatId AND branch starts with "slot/"
 *   unarmed-bound:   amber  — bound in sidecar but live branch != slot/<nato>
 *                            (will arm on next heartbeat — transient)
 *   unarmed-unbound: red    — NEITHER bound NOR slot/<nato> (regression)
 *   integrator:     blue   — golf, exempt by design (NOT a problem)
 *   empty:          grey   — slot not claimed (informational)
 *
 * Modeled on scripts/generate-bridge-priority-features.mjs (P1-U03).
 *
 * Register in:
 *   scripts/regen-viz.mjs FAST[]                (entry: "generate-slot-binding-features.mjs")
 *   scripts/merge-augmentations.mjs splice list (filename auto-detect)
 *
 * Usage:  node scripts/generate-slot-binding-features.mjs
 * Exit:   0 ok · 1 source missing · 2 runtime error
 *
 * Distinct from generate-slot-synergy-features.mjs (SLOT-SYNERGY-MAP-MS0)
 * which surfaces the slot↔subsystem PIPELINE; this surfaces the slot
 * BINDING HEALTH specifically. Both compose in /system-viz.
 */

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { SLOT_NAMES } from "../.claude/helpers/chat-slots.mjs";
import { INTEGRATOR_SLOT_NAME } from "../.claude/helpers/slot-constants.mjs";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
export const ROOT = path.resolve(__dirname, "..");

export const SCHEMA_VERSION = "1.0.0";
export const ROOST_ID = "ghost.slot_binding_health";
export const PLANNED_PARENT = "ghost.planned_features";
export const ROOST_LAYER = "L8";
export const UNIT_LAYER = "L9";
export const MAX_LABEL = 80;
export const MAX_INFO = 360;

export const TIER_COLOR = {
  armed:           "#33CC66",  // green
  "unarmed-bound": "#FFAA33",  // amber
  "unarmed-unbound": "#FF3333",// red — silent regression
  integrator:      "#3399FF",  // blue
  empty:           "#999999",  // grey
};

export const TIER_ICON = {
  armed:           "✅",
  "unarmed-bound": "⚠️",
  "unarmed-unbound": "🔴",
  integrator:      "🛟",
  empty:           "⚪",
};

const VIZ_DIR = path.join(ROOT, "state/shared/system-viz");
const BINDINGS_PATH = path.join(ROOT, "state/shared/slot-branch-bindings.json");
const SLOTS_PATH = path.join(ROOT, "state/shared/chat-slots.json");
const OUT_PATH = path.join(VIZ_DIR, "slot-binding-augmentation.json");

/**
 * Pure: classify a single slot.
 * @returns {"armed"|"unarmed-bound"|"unarmed-unbound"|"integrator"|"empty"}
 */
export function classifySlot(slot, bindings, slotState) {
  // Empty slots (no chat) classify as "empty" REGARDLESS of slot name —
  // including golf. Integrator status only applies to a LIVE golf chat
  // (otherwise the health-pct numerator inflates beyond 100%). Fixed
  // 2026-05-26 post-smoke-run; original formula counted empty golf as
  // armed-equivalent, returning healthPct=105%.
  if (!slotState || !slotState.chatId) return "empty";
  if (slot === INTEGRATOR_SLOT_NAME) return "integrator";
  const branch = slotState.branch || "";
  const wantedBranch = `slot/${slot}`;
  if (branch === wantedBranch) return "armed";
  if (bindings[slot] === wantedBranch) return "unarmed-bound";
  return "unarmed-unbound";
}

/** Filesystem-safe node id fragment. */
export function safeId(raw) {
  const s = String(raw == null ? "" : raw)
    .toLowerCase()
    .replace(/[^a-z0-9_-]+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^[-_]+|[-_]+$/g, "")
    .slice(0, 80);
  if (!s || s.includes("..")) return "x";
  return s;
}

/**
 * Pure: build {newNodes, newEdges, stats} from bindings + slots maps.
 * Both inputs are tolerant of missing/malformed shape (fail-soft).
 */
export function generate(bindings, slots, existingNodeIds = []) {
  const ids = existingNodeIds instanceof Set ? new Set(existingNodeIds) : new Set(existingNodeIds || []);
  const slotsObj = slots && slots.slots && typeof slots.slots === "object" && !Array.isArray(slots.slots) ? slots.slots : {};
  const bindingsObj = bindings && typeof bindings === "object" && !Array.isArray(bindings) ? bindings : {};

  const newNodes = [];
  let roostEmitted = 0;

  /** @type {Record<string, number>} */
  const counts = { armed: 0, "unarmed-bound": 0, "unarmed-unbound": 0, integrator: 0, empty: 0 };
  /** @type {Array<{slot:string, tier:string, branch:string|null, chatId:string|null, pid:number|null}>} */
  const perSlot = [];

  for (const slot of SLOT_NAMES) {
    const s = slotsObj[slot] || null;
    const tier = classifySlot(slot, bindingsObj, s);
    counts[tier] += 1;
    perSlot.push({
      slot,
      tier,
      branch: s && s.branch ? s.branch : null,
      chatId: s && s.chatId ? s.chatId : null,
      pid: s && s.pid != null ? s.pid : null,
    });
  }

  const liveCount = perSlot.filter(p => p.chatId).length;
  const driftCount = counts["unarmed-bound"] + counts["unarmed-unbound"];
  const healthPct = liveCount > 0 ? Math.round(((counts.armed + counts.integrator) / liveCount) * 100) : 100;

  if (!ids.has(ROOST_ID)) {
    const summary = `${counts.armed} armed · ${counts["unarmed-bound"]} amber · ${counts["unarmed-unbound"]} red · ${counts.integrator} integrator (golf) · ${counts.empty} empty. Live fleet health ${healthPct}% (${counts.armed + counts.integrator}/${liveCount} live slots route-correct).`;
    newNodes.push({
      id: ROOST_ID,
      label: `Slot-Binding Health — ${counts.armed + counts.integrator}/${liveCount} live armed (${healthPct}%)`,
      layer: ROOST_LAYER,
      ghost: true,
      status: "ghost",
      kind: "ghost-roost",
      parent: PLANNED_PARENT,
      info: `Per-slot worktree binding health. ${summary} Source: state/shared/slot-branch-bindings.json + chat-slots.json. Drift = ${driftCount} slot(s) need attention. Recovery: node scripts/seed-slot-branch-bindings.mjs && node scripts/backfill-chat-slots-branch.mjs. Bridge: [[slot-bridge-auto-seed]].`.slice(0, MAX_INFO * 2),
    });
    ids.add(ROOST_ID);
    roostEmitted = 1;
  }

  let unitsEmitted = 0;
  for (const p of perSlot) {
    const nid = `ghost.slot-binding.${safeId(p.slot)}`;
    if (ids.has(nid)) continue;
    const icon = TIER_ICON[p.tier] || "⚪";
    const color = TIER_COLOR[p.tier] || TIER_COLOR.empty;
    const branchDesc = p.branch || "(none)";
    const liveDesc = p.chatId ? `chat=${p.chatId}, pid=${p.pid ?? "?"}` : "(empty)";
    let action;
    if (p.tier === "armed") action = "OK — enforcement hooks armed.";
    else if (p.tier === "integrator") action = "OK — golf is integrator (intentionally exempt).";
    else if (p.tier === "unarmed-bound") action = "TRANSIENT — bound in sidecar, will arm on next heartbeat.";
    else if (p.tier === "unarmed-unbound") action = "REGRESSION — slot has NO binding. Run scripts/seed-slot-branch-bindings.mjs.";
    else action = "no chat claimed this slot.";
    newNodes.push({
      id: nid,
      label: `${icon} ${p.slot} → ${branchDesc}`.slice(0, MAX_LABEL),
      layer: UNIT_LAYER,
      ghost: true,
      status: "ghost",
      kind: "slot-binding",
      parent: ROOST_ID,
      color,
      info: `[${p.tier}] slot=${p.slot}, branch=${branchDesc}, live=${liveDesc}. ${action}`.slice(0, MAX_INFO * 2),
    });
    ids.add(nid);
    unitsEmitted++;
  }

  return {
    newNodes,
    newEdges: [],
    stats: {
      roostEmitted,
      slotCount: SLOT_NAMES.length,
      unitsEmitted,
      liveSlots: liveCount,
      driftSlots: driftCount,
      healthPct,
      tierCounts: counts,
    },
  };
}

function readJsonSafe(p) {
  if (!fs.existsSync(p)) return null;
  try { return JSON.parse(fs.readFileSync(p, "utf8")); }
  catch { return null; }
}

export function main() {
  const bindingsRaw = readJsonSafe(BINDINGS_PATH);
  const slotsRaw = readJsonSafe(SLOTS_PATH);
  if (!bindingsRaw) {
    console.error(`FATAL: ${BINDINGS_PATH} missing — run scripts/seed-slot-branch-bindings.mjs first`);
    return 1;
  }
  if (!slotsRaw) {
    console.error(`FATAL: ${SLOTS_PATH} missing — no live fleet state`);
    return 1;
  }
  const bindings = bindingsRaw.bindings && typeof bindingsRaw.bindings === "object" ? bindingsRaw.bindings : {};

  let result;
  try {
    const { newNodes, newEdges, stats } = generate(bindings, slotsRaw, []);
    result = {
      schemaVersion: SCHEMA_VERSION,
      generatedAt: new Date().toISOString(),
      source: "state/shared/slot-branch-bindings.json + state/shared/chat-slots.json",
      newNodes,
      newEdges,
      stats,
    };
  } catch (e) { console.error(`FATAL: generate failed — ${e.message}`); return 2; }

  try {
    fs.mkdirSync(VIZ_DIR, { recursive: true });
    fs.writeFileSync(OUT_PATH, JSON.stringify(result, null, 2));
  } catch (e) { console.error(`FATAL: write failed — ${e.message}`); return 2; }

  console.log(JSON.stringify({
    ok: true,
    written: OUT_PATH,
    roostEmitted: result.stats.roostEmitted,
    unitsEmitted: result.stats.unitsEmitted,
    liveSlots: result.stats.liveSlots,
    driftSlots: result.stats.driftSlots,
    healthPct: result.stats.healthPct,
    tierCounts: result.stats.tierCounts,
  }));
  return 0;
}

const isMain = (() => {
  try {
    const invokedAs = process.argv[1] && path.resolve(process.argv[1]);
    const selfPath = fileURLToPath(import.meta.url);
    return invokedAs && path.resolve(selfPath) === invokedAs;
  } catch { return false; }
})();
if (isMain) {
  process.exit(main());
}
