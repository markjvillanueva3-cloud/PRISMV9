#!/usr/bin/env node
/**
 * generate-bridge-synergy-features.mjs — system-viz augmentation: bridge layer.
 *
 * Spec: ROADMAP-CONSOLIDATION (slot juliett, forge7, 2026-05-16).
 *
 * Reads `state/shared/specs/ROADMAP-CONSOLIDATED.json` (produced by
 * consolidate-roadmaps.mjs) and emits a system-viz augmentation that adds:
 *   - parent roost `ghost.bridge_synergy` (kind ghost-roost, under
 *     `ghost.planned_features`).
 *   - one `bridge-unit` child per wiring unit + per deep-integration unit.
 *
 * The 4,497 pending units are already in the graph as `generate-stagnant-
 * features` ghosts; the NEW graph content is this bridge/synergy layer — the
 * units that wire and connect the built galaxy into one organism.
 *
 * Modeled on generate-misc-tasks-features.mjs. Registered in
 * scripts/regen-viz.mjs FAST[] and spliced by scripts/merge-augmentations.mjs.
 *
 * Usage:  node scripts/generate-bridge-synergy-features.mjs
 * Exit:   0 ok · 1 inventory missing · 2 runtime error
 */

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { detectAllBridgeStatuses } from "./lib/bridge-evidence-detector.mjs";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
export const ROOT = path.resolve(__dirname, "..");

export const SCHEMA_VERSION = "1.0.0";
export const BRIDGE_ROOST_ID = "ghost.bridge_synergy";
export const PLANNED_PARENT = "ghost.planned_features";
export const ROOST_LAYER = "L8";
export const UNIT_LAYER = "L9";
export const MAX_LABEL = 80;
export const MAX_INFO = 180;

const VIZ_DIR = path.join(ROOT, "state/shared/system-viz");
const INVENTORY_PATH = path.join(ROOT, "state/shared/specs/ROADMAP-CONSOLIDATED.json");
const OUT_PATH = path.join(VIZ_DIR, "bridge-synergy-augmentation.json");

/** Filesystem-safe node id fragment (letters/digits/dash/underscore). */
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
 * Pure: build {newNodes,newEdges,stats} from a consolidated-roadmap inventory.
 * `existingNodeIds` — optional Set/array of graph ids to skip (dedupe is also
 * enforced authoritatively by merge-augmentations.mjs).
 * `opts.statusByBridgeId` — optional Map<bridgeId,{status, evidence[]}> from
 * the evidence detector (U-BRIDGE-STATUS-RECONCILE, 2026-05-19). When
 * provided, a matched bridge's status is flipped from default 'ghost' to
 * the detector's verdict ('built' | 'partial' | 'ghost') and its evidence
 * lines are appended to the node's `info` so the system-viz hover surfaces
 * "why this bridge is marked built". Unsupplied = back-compat (all ghost).
 * `opts.repoRoot` + `opts.fsImpl` — when statusByBridgeId is not pre-supplied,
 * the generator runs `detectAllBridgeStatuses(repoRoot, {fsImpl})` itself
 * (this is the DEFAULT behavior for production / regen-viz runs).
 * Set `opts.skipDetector = true` to force the old "all ghost" behavior
 * (used by hermetic tests that want byte-stable status assertions). Per
 * Arm C P1 scrutiny fix (2026-05-19): the prior docstring said the default
 * was "all ghost" — that was wrong; the default runs the detector.
 */
export function generate(inventory, existingNodeIds = [], opts = {}) {
  const ids = existingNodeIds instanceof Set ? new Set(existingNodeIds) : new Set(existingNodeIds || []);
  const bridge = inventory && inventory.bridge_units ? inventory.bridge_units : {};
  const wiring = Array.isArray(bridge.wiring) ? bridge.wiring : [];
  const deep = Array.isArray(bridge.deep_integration) ? bridge.deep_integration : [];

  // Resolve per-bridge status verdicts. Three modes:
  //   1. opts.statusByBridgeId pre-supplied (hermetic tests inject this)
  //   2. opts.skipDetector === true (force ghost everywhere — back-compat)
  //   3. default: invoke detector against opts.repoRoot (or ROOT)
  // Detector failure paths already graceful-degrade to 'ghost' verdicts,
  // so a Map miss for any bridge id is the canonical "still ghost" answer.
  let statusByBridgeId = opts.statusByBridgeId instanceof Map ? opts.statusByBridgeId : null;
  if (!statusByBridgeId && !opts.skipDetector) {
    try {
      statusByBridgeId = detectAllBridgeStatuses(opts.repoRoot || ROOT, { fsImpl: opts.fsImpl });
    } catch {
      // Detector module-level failure → degrade to status quo (all ghost).
      // The detector itself catches per-bridge throws, so reaching this
      // catch means something truly broken — preserve invariant.
      statusByBridgeId = new Map();
    }
  }
  if (!statusByBridgeId) statusByBridgeId = new Map();

  const newNodes = [];
  let roostEmitted = 0;

  if (!ids.has(BRIDGE_ROOST_ID)) {
    newNodes.push({
      id: BRIDGE_ROOST_ID,
      label: "Bridge / Synergy Layer (wire + connect the galaxy)",
      layer: ROOST_LAYER,
      ghost: true,
      status: "ghost",
      kind: "ghost-roost",
      parent: PLANNED_PARENT,
      info: `${wiring.length} wiring + ${deep.length} deep-integration units that connect every built PRISM subsystem into one organism. Source: state/shared/specs/ROADMAP-CONSOLIDATED.md.`,
    });
    ids.add(BRIDGE_ROOST_ID);
    roostEmitted = 1;
  }

  let wiringEmitted = 0, deepEmitted = 0, skipped = 0;
  let builtCount = 0, partialCount = 0;

  /**
   * Resolve a bridge's status against the detector verdict map. Map miss →
   * 'ghost' (status quo). When `built` or `partial`, append evidence to the
   * node's info so the hover surfaces the reconciliation reason.
   */
  function applyStatus(node, bridgeId) {
    const verdict = statusByBridgeId.get(bridgeId);
    if (!verdict || verdict.status === "ghost") return node; // status quo
    node.status = verdict.status;
    if (verdict.status === "built") {
      node.ghost = false;
      builtCount++;
    } else if (verdict.status === "partial") {
      partialCount++;
    }
    const evidenceLine = Array.isArray(verdict.evidence) && verdict.evidence.length > 0
      ? ` | reconciled: ${verdict.evidence[0]}`
      : ` | reconciled: ${verdict.status}`;
    // Append evidence without breaching MAX_INFO too aggressively — leave
    // room for the trailing evidence so the hover stays informative.
    const room = Math.max(0, MAX_INFO * 2 - node.info.length);
    node.info = node.info + evidenceLine.slice(0, room);
    return node;
  }

  for (const u of wiring) {
    const nid = "ghost.bridge." + safeId(u.id || u.domain);
    if (!u.id || ids.has(nid)) { skipped++; continue; }
    const node = {
      id: nid,
      label: `${u.id} · ${String(u.title || "").trim()}`.slice(0, MAX_LABEL),
      layer: UNIT_LAYER,
      ghost: true,
      status: "ghost",
      kind: "bridge-unit",
      parent: BRIDGE_ROOST_ID,
      info: `[wiring · ${u.domain || "?"} · ${u.engine_count || 0} engines] ${String(u.intent || "").slice(0, MAX_INFO)}`,
    };
    applyStatus(node, u.id);
    newNodes.push(node);
    ids.add(nid);
    wiringEmitted++;
  }

  for (const u of deep) {
    const nid = "ghost.bridge." + safeId(u.id);
    if (!u.id || ids.has(nid)) { skipped++; continue; }
    const node = {
      id: nid,
      label: `${u.id} · ${String(u.title || "").trim()}`.slice(0, MAX_LABEL),
      layer: UNIT_LAYER,
      ghost: true,
      status: "ghost",
      kind: "bridge-unit",
      parent: BRIDGE_ROOST_ID,
      info: `[deep-integration · ${u.from || "?"} → ${u.to || "?"}] ${String(u.intent || "").slice(0, MAX_INFO)}`,
    };
    applyStatus(node, u.id);
    newNodes.push(node);
    ids.add(nid);
    deepEmitted++;
  }

  return {
    newNodes,
    newEdges: [],
    stats: {
      roostEmitted,
      wiringUnits: wiring.length,
      deepIntegrationUnits: deep.length,
      wiringEmitted,
      deepEmitted,
      skipped,
      builtCount,
      partialCount,
    },
  };
}

export function main() {
  if (!fs.existsSync(INVENTORY_PATH)) {
    console.error(`FATAL: ${INVENTORY_PATH} missing — run scripts/consolidate-roadmaps.mjs first`);
    return 1;
  }
  let inventory;
  try { inventory = JSON.parse(fs.readFileSync(INVENTORY_PATH, "utf8")); }
  catch (e) { console.error(`FATAL: inventory parse failed — ${e.message}`); return 2; }

  let result;
  try {
    const { newNodes, newEdges, stats } = generate(inventory, []);
    result = {
      schemaVersion: SCHEMA_VERSION,
      generatedAt: new Date().toISOString(),
      source: "state/shared/specs/ROADMAP-CONSOLIDATED.json",
      newNodes,
      newEdges,
      stats,
    };
  } catch (e) { console.error(`FATAL: generate failed — ${e.message}`); return 2; }

  try { fs.writeFileSync(OUT_PATH, JSON.stringify(result, null, 2)); }
  catch (e) { console.error(`FATAL: write failed — ${e.message}`); return 2; }

  console.log(`wrote ${OUT_PATH}`);
  console.log(`  roost emitted:        ${result.stats.roostEmitted}`);
  console.log(`  wiring children:      ${result.stats.wiringEmitted}/${result.stats.wiringUnits}`);
  console.log(`  deep-integration:     ${result.stats.deepEmitted}/${result.stats.deepIntegrationUnits}`);
  console.log(`  total new nodes:      ${result.newNodes.length}`);
  console.log(`  status reconciled:    ${result.stats.builtCount} built · ${result.stats.partialCount} partial · ${(result.stats.wiringEmitted + result.stats.deepEmitted) - result.stats.builtCount - result.stats.partialCount} ghost`);
  return 0;
}

const isMain = (() => {
  try { return process.argv[1] && path.normalize(fs.realpathSync(process.argv[1])) === path.normalize(fileURLToPath(import.meta.url)); }
  catch { return false; }
})();
if (isMain) process.exit(main());
