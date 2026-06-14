#!/usr/bin/env node
/**
 * generate-quoting-pipeline-features.mjs — system-viz augmentation: quoting-pipeline roost.
 *
 * Spec: QUOTING-PIPELINE-MS0/SYSTEM-VIZ-SYNERGY (slot charlie /goal-13, 2026-05-24).
 *
 * Emits a system-viz augmentation that adds:
 *   - parent roost `ghost.quoting_pipeline` (kind ghost-roost, under
 *     `ghost.planned_features`).
 *   - one `quoting-engine` child per QUOTING-PIPELINE-MS0 engine (7 nodes).
 *   - one `quoting-action` child per prism_quoting dispatcher action (12 nodes).
 *   - one `quoting-surface` child per UI/HTTP surface (4 nodes).
 *
 * Modeled on generate-bridge-synergy-features.mjs. Register in
 * scripts/regen-viz.mjs FAST[] and merge-augmentations.mjs splice list.
 *
 * Usage:  node scripts/generate-quoting-pipeline-features.mjs
 * Exit:   0 ok · 2 runtime error
 */

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
export const ROOT = path.resolve(__dirname, "..");

export const SCHEMA_VERSION = "1.0.0";
export const QUOTING_ROOST_ID = "ghost.quoting_pipeline";
export const PLANNED_PARENT = "ghost.planned_features";
export const ROOST_LAYER = "L8";
export const UNIT_LAYER = "L9";

const VIZ_DIR = path.join(ROOT, "state/shared/system-viz");
const OUT_PATH = path.join(VIZ_DIR, "quoting-pipeline-augmentation.json");

// Canonical inventory of QUOTING-PIPELINE-MS0 surface
export const QUOTING_ENGINES = [
  { id: "engine.camera-intake-router", label: "CameraIntakeRouter", unit: "U-QP02", color: "#10b981" },
  { id: "engine.insert-box-catalog-bridge", label: "InsertBoxToCatalogBridge", unit: "U-QP03", color: "#10b981" },
  { id: "engine.machine-service-tag-ocr", label: "MachineServiceTagOCR", unit: "U-QP04", color: "#10b981" },
  { id: "engine.machine-parts-bom-resolver", label: "MachinePartsBOMResolver", unit: "U-QP05", color: "#10b981" },
  { id: "engine.vendor-realtime-pricing-client", label: "VendorRealtimePricingClient", unit: "U-QP06", color: "#10b981" },
  { id: "engine.live-chat-router", label: "LiveChatRouter", unit: "U-QP07", color: "#10b981" },
  { id: "engine.quoting-accuracy-enhancement", label: "QuotingAccuracyEnhancement (Platt+OCR-edit+Weibull+Interval)", unit: "U-QP13", color: "#8b5cf6" },
];

export const QUOTING_ACTIONS = [
  { id: "action.camera-intake-route", label: "camera_intake_route" },
  { id: "action.insert-box-lookup", label: "insert_box_lookup" },
  { id: "action.machine-tag-extract", label: "machine_tag_extract" },
  { id: "action.machine-parts-bom-resolve", label: "machine_parts_bom_resolve" },
  { id: "action.vendor-realtime-price", label: "vendor_realtime_price" },
  { id: "action.live-chat-session-open", label: "live_chat_session_open" },
  { id: "action.live-chat-session-turn", label: "live_chat_session_turn" },
  { id: "action.live-chat-session-close", label: "live_chat_session_close" },
  { id: "action.accuracy-platt-calibrate", label: "accuracy_platt_calibrate" },
  { id: "action.accuracy-fuzzy-match-sku", label: "accuracy_fuzzy_match_sku" },
  { id: "action.accuracy-bom-urgency", label: "accuracy_bom_urgency" },
  { id: "action.accuracy-quote-interval", label: "accuracy_quote_interval" },
];

export const QUOTING_SURFACES = [
  { id: "surface.mobile-camera-quote-page", label: "MobileCameraQuotePage.tsx (web/src/pages, U-QP09)" },
  { id: "surface.live-chat-widget", label: "LiveChatWidget.tsx (web/src/components/chat, U-QP10)" },
  { id: "surface.quoting-router-http", label: "Express /api/mcp/quoting + /api/v1/quoting (routes/quoting.ts, U-QP08-HTTP)" },
  { id: "surface.pwa-service-worker", label: "sw.ts + quoting-manifest.webmanifest (U-QP11)" },
];

/** Pure: build {newNodes, newEdges, stats}. existingNodeIds optional dedupe. */
export function generate(existingNodeIds = []) {
  const ids = existingNodeIds instanceof Set ? new Set(existingNodeIds) : new Set(existingNodeIds || []);
  const newNodes = [];
  const newEdges = [];

  // The roost itself
  const roost = {
    id: QUOTING_ROOST_ID,
    kind: "ghost-roost",
    layer: ROOST_LAYER,
    label: "QUOTING-PIPELINE-MS0 (camera→quote + chat AI, 12 units shipped)",
    info: "PRISM camera-intake quoting pipeline. 7 engines + 12 dispatcher actions + 4 UI/HTTP surfaces. Full call chain: mobile camera → OCR → CameraIntakeRouter → bridge engine → quote/catalog/BOM/price → React render. Plus LiveChatWidget → TroubleshootingAssistant via citation provenance.",
    color: "#2563eb",
    parent: PLANNED_PARENT,
  };
  if (!ids.has(roost.id)) {
    newNodes.push(roost);
    ids.add(roost.id);
  }

  // Engines
  for (const e of QUOTING_ENGINES) {
    const nodeId = `${QUOTING_ROOST_ID}.${e.id}`;
    if (ids.has(nodeId)) continue;
    newNodes.push({
      id: nodeId,
      kind: "quoting-engine",
      layer: UNIT_LAYER,
      label: e.label.slice(0, 80),
      info: `Engine for ${e.unit}`,
      color: e.color,
      parent: QUOTING_ROOST_ID,
    });
    newEdges.push({ from: QUOTING_ROOST_ID, to: nodeId, kind: "contains" });
    ids.add(nodeId);
  }

  // Actions
  for (const a of QUOTING_ACTIONS) {
    const nodeId = `${QUOTING_ROOST_ID}.${a.id}`;
    if (ids.has(nodeId)) continue;
    newNodes.push({
      id: nodeId,
      kind: "quoting-action",
      layer: UNIT_LAYER,
      label: `prism_quoting:${a.label}`.slice(0, 80),
      info: `Dispatcher action ${a.label}`,
      color: "#f59e0b",
      parent: QUOTING_ROOST_ID,
    });
    newEdges.push({ from: QUOTING_ROOST_ID, to: nodeId, kind: "contains" });
    ids.add(nodeId);
  }

  // Surfaces
  for (const s of QUOTING_SURFACES) {
    const nodeId = `${QUOTING_ROOST_ID}.${s.id}`;
    if (ids.has(nodeId)) continue;
    newNodes.push({
      id: nodeId,
      kind: "quoting-surface",
      layer: UNIT_LAYER,
      label: s.label.slice(0, 80),
      info: s.label,
      color: "#0ea5e9",
      parent: QUOTING_ROOST_ID,
    });
    newEdges.push({ from: QUOTING_ROOST_ID, to: nodeId, kind: "contains" });
    ids.add(nodeId);
  }

  return {
    newNodes,
    newEdges,
    stats: {
      schemaVersion: SCHEMA_VERSION,
      enginesAdded: QUOTING_ENGINES.length,
      actionsAdded: QUOTING_ACTIONS.length,
      surfacesAdded: QUOTING_SURFACES.length,
      totalAdded: newNodes.length,
    },
  };
}

function main() {
  try {
    const out = generate([]);
    fs.mkdirSync(VIZ_DIR, { recursive: true });
    const payload = { ...out, generatedAt: new Date().toISOString() };
    fs.writeFileSync(OUT_PATH, JSON.stringify(payload, null, 2), "utf8");
    console.log(`OK wrote ${OUT_PATH} - ${out.stats.totalAdded} nodes (${out.stats.enginesAdded} engines + ${out.stats.actionsAdded} actions + ${out.stats.surfacesAdded} surfaces)`);
    return 0;
  } catch (err) {
    console.error("FAIL generate-quoting-pipeline-features:", err);
    return 2;
  }
}

const isMain = (() => {
  try { return process.argv[1] && path.normalize(fs.realpathSync(process.argv[1])) === path.normalize(fileURLToPath(import.meta.url)); }
  catch { return false; }
})();
if (isMain) main();
