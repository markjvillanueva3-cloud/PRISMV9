#!/usr/bin/env node
/**
 * generate-chat-slot-nodes-features.mjs — system-viz augmentation: chat fleet.
 *
 * Spec: ZEBRA-CHAT-SLOT-NODES-MS0 (slot bravo, 2026-05-25 follow-up to
 * ZEBRA-OMNISCIENT-MS0 envelope close).
 *
 * Reads `state/shared/chat-slots.json` + per-slot context bundle (via
 * loadSlotContext from scripts/lib/zebra-context-bundle.mjs) and emits a
 * system-viz augmentation that adds:
 *   - parent roost `ghost.chat_fleet` (kind ghost-roost, under ghost.planned_features).
 *   - one `chat-slot` child node per NATO slot (alpha..zulu, 26 nodes).
 *   - cross-substrate synergy edges per slot:
 *       - soul edge       (PSN leg 19) → state/shared/slot-souls/<slot>.md
 *       - loop edge       (PSN leg 29) → state/shared/loop-state/loop-<sid>.json
 *       - token edge      (PSN leg 21) → state/shared/token-budget-<slot>.json
 *       - branch edge     → slot/<name> git branch designation
 *       - domain edge     → primary domain inferred from soul.hermes_role
 *
 * MS0 scope (this commit): foundation — every slot gets a node, baseline
 * info from chat-slots + soul + loop + token bundle, basic synergy edges.
 *
 * MS1+ scope (next session, 5-parallel agents): per-slot deep population:
 *   - engine refs (mill engines for bravo, lathe for charlie, etc.)
 *   - tribal-knowledge refs (per-domain tip clusters)
 *   - CAD/print/resource refs (if applicable — JM Die programs for shop slots)
 *   - PRISM-AI feature refs (per-slot AI capability bindings)
 *   - active-work refs (current unit being shipped per slot)
 *
 * Modeled on generate-bridge-synergy-features.mjs. Registered in
 * scripts/regen-viz.mjs FAST[] and spliced by scripts/merge-augmentations.mjs.
 *
 * Usage:  node scripts/generate-chat-slot-nodes-features.mjs
 * Exit:   0 ok · 1 chat-slots.json missing · 2 runtime error
 */

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { pathToFileURL } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
export const ROOT = path.resolve(__dirname, "..");

export const SCHEMA_VERSION = "1.0.0";
export const FLEET_ROOST_ID = "ghost.chat_fleet";
export const PLANNED_PARENT = "ghost.planned_features";
export const ROOST_LAYER = "L8";
export const SLOT_LAYER = "L9";
export const MAX_LABEL = 80;
export const MAX_INFO = 220;

const VIZ_DIR = path.join(ROOT, "state/shared/system-viz");
const SLOTS_PATH = path.join(ROOT, "state/shared/chat-slots.json");
const OUT_PATH = path.join(VIZ_DIR, "chat-slot-nodes-augmentation.json");

// 26 NATO slot canonical list — MUST stay in lockstep with
// .claude/helpers/chat-slots.mjs SLOT_NAMES.
export const KNOWN_SLOTS = Object.freeze([
  "alpha", "bravo", "charlie", "delta", "echo", "foxtrot",
  "golf", "hotel", "india", "juliett", "kilo", "lima", "mike",
  "november", "oscar", "papa", "quebec", "romeo", "sierra", "tango",
  "uniform", "victor", "whiskey", "xray", "yankee", "zulu",
]);

// Skipped slots per current operator config (LAUNCH-PRISM-FLEET.bat).
// Generator still emits these nodes (so /system-viz shows their inert state)
// but flags them so the dashboard surfaces "configured-but-not-launched".
export const FLEET_LAUNCH_SKIPPED = Object.freeze(["romeo", "uniform", "victor", "yankee"]);

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

export function truncate(s, max) {
  if (!s) return "";
  const str = String(s);
  return str.length <= max ? str : str.slice(0, max - 1) + "…";
}

/**
 * Pure: build {newNodes, newEdges, stats} from chat-slots + per-slot context.
 *   slotsDoc — parsed chat-slots.json
 *   contextBySlot — Map<slotName, contextEnvelope> from loadSlotContext (optional;
 *                   when omitted, nodes degrade to soul-less placeholders)
 *   existingNodeIds — optional Set/array to dedupe against existing graph
 */
export function generate(slotsDoc, contextBySlot = null, existingNodeIds = []) {
  const ids = existingNodeIds instanceof Set ? new Set(existingNodeIds) : new Set(existingNodeIds || []);
  const ctxMap = contextBySlot instanceof Map ? contextBySlot : new Map();
  const slots = (slotsDoc && slotsDoc.slots) || {};

  const newNodes = [];
  const newEdges = [];
  let roostEmitted = 0;
  let slotsEmitted = 0;
  let slotsBound = 0;
  let slotsRunning = 0;
  let slotsSuppressed = 0;

  // 1. Emit parent roost (ghost.chat_fleet).
  if (!ids.has(FLEET_ROOST_ID)) {
    newNodes.push({
      id: FLEET_ROOST_ID,
      label: "💬 PRISM Chat Fleet (26 NATO slots)",
      layer: ROOST_LAYER,
      kind: "ghost-roost",
      group: "chat_fleet",
      info: truncate(
        "PSN leg-aggregator for the 26-slot Claude Code fleet. Each child is a NATO chat-slot node with current bind state, soul, loop, token-zone, and decision. Edges synergize each slot to its soul, loop-state, token sidecar, git branch, and primary domain. MS0 foundation — per-slot deep refs (engines, tribal, CAD) land in MS1 via parallel-agent population.",
        MAX_INFO * 2
      ),
      status: "ghost",
      parent: PLANNED_PARENT,
    });
    ids.add(FLEET_ROOST_ID);
    roostEmitted = 1;
    newEdges.push({
      from: FLEET_ROOST_ID,
      to: PLANNED_PARENT,
      kind: "parent",
    });
  }

  // 2. Emit one node per NATO slot.
  for (const slotName of KNOWN_SLOTS) {
    const nodeId = `ghost.chat_slot.${safeId(slotName)}`;
    if (ids.has(nodeId)) continue;
    ids.add(nodeId);

    const slotState = slots[slotName] || null;
    const ctx = ctxMap.get(slotName) || null;
    const skipped = FLEET_LAUNCH_SKIPPED.includes(slotName);
    const bound = !!(slotState && slotState.chatId);
    if (bound) slotsBound += 1;

    // Derive info from soul + loop + token zone + decision.
    const soulRole = ctx?.soul?.hermesRole || "(no-role)";
    const refuseCount = (ctx?.soul?.refuseList || []).length;
    const loopRunning = !!(ctx?.loop?.ok && ctx.loop.running);
    if (loopRunning) slotsRunning += 1;
    const tokenZone = ctx?.tokenZone?.zone || "(no-zone)";
    const decision = ctx?.decision?.recommend || "?";
    const suppress = ctx?.decision?.suppressCompact ? "+suppress" : "";
    if (ctx?.decision?.suppressCompact) slotsSuppressed += 1;

    const labelParts = [
      `🎭 ${slotName}`,
      bound ? "" : "[unbound]",
      skipped ? "[skipped]" : "",
      loopRunning ? "[loop:run]" : "",
    ].filter(Boolean);
    const label = truncate(labelParts.join(" "), MAX_LABEL);

    const branch = slotState?.branch || `slot/${slotName}`;
    const topic = slotState?.topic || "(no-topic)";
    const sessionId = slotState?.chatId || "(unbound)";
    const activity = slotState?.activity || "(idle)";

    const infoLines = [
      `slot: ${slotName} · role: ${soulRole} · refuses: ${refuseCount}`,
      `bind: ${bound ? sessionId : "unbound"} · activity: ${activity}`,
      `branch: ${branch} · topic: ${topic}`,
      `token: ${tokenZone} · loop: ${loopRunning ? "RUNNING" : "idle"} · decide: ${decision}${suppress}`,
    ];
    if (skipped) infoLines.push(`(skipped by LAUNCH-PRISM-FLEET — operator config)`);

    newNodes.push({
      id: nodeId,
      label,
      layer: SLOT_LAYER,
      kind: skipped ? "chat-slot-skipped" : (bound ? "chat-slot-bound" : "chat-slot-unbound"),
      group: "chat_fleet",
      info: truncate(infoLines.join(" · "), MAX_INFO * 2),
      status: bound ? "built" : "ghost",
      parent: FLEET_ROOST_ID,
      metadata: {
        slot: slotName,
        sessionId: bound ? sessionId : null,
        branch,
        topic,
        loopRunning,
        tokenZone,
        decision,
        refuseCount,
        hermesRole: soulRole,
        skipped,
      },
    });
    slotsEmitted += 1;

    // Parent edge: slot → fleet roost.
    newEdges.push({
      from: nodeId,
      to: FLEET_ROOST_ID,
      kind: "parent",
    });

    // Synergy edges — wire each slot to its PSN substrate touch-points.
    // These edges create the cross-substrate visualisation per the operator's
    // /goal directive ("synergize each chat node to PSN, /system-viz, etc.").
    const synergyEdges = [
      { to: `file:state/shared/slot-souls/${slotName}.md`, kind: "synergy", label: "soul" },
      { to: `file:state/shared/token-budget-${slotName}.json`, kind: "synergy", label: "token-zone" },
      { to: `branch:${branch}`, kind: "synergy", label: "git-branch" },
    ];
    if (bound && ctx?.loop?.ok && sessionId.startsWith("claude-")) {
      const sidShort = sessionId.replace(/^claude-/, "");
      synergyEdges.push({
        to: `file:state/shared/loop-state/loop-${sidShort}.json`,
        kind: "synergy",
        label: "loop-state",
      });
    }
    // Domain edge — per Hermes role from soul. Maps role → primary engine domain.
    if (ctx?.soul?.hermesRole) {
      const role = ctx.soul.hermesRole;
      const domainHint = role.startsWith("specialist-") ? role.slice("specialist-".length) : role;
      synergyEdges.push({
        to: `domain:${safeId(domainHint)}`,
        kind: "synergy",
        label: "domain",
      });
    }

    for (const se of synergyEdges) {
      newEdges.push({
        from: nodeId,
        to: se.to,
        kind: se.kind,
        label: se.label,
      });
    }
  }

  return {
    newNodes,
    newEdges,
    stats: {
      schemaVersion: SCHEMA_VERSION,
      roostEmitted,
      slotsEmitted,
      slotsBound,
      slotsRunning,
      slotsSuppressed,
      slotsSkipped: FLEET_LAUNCH_SKIPPED.length,
    },
  };
}

/** I/O wrapper: read chat-slots + per-slot context, write augmentation. */
async function runCli() {
  if (!fs.existsSync(SLOTS_PATH)) {
    process.stderr.write(`error: ${SLOTS_PATH} not found\n`);
    return 1;
  }
  const slotsDoc = JSON.parse(fs.readFileSync(SLOTS_PATH, "utf8"));

  // Lazy-import loadSlotContext via file:// URL (Windows ESM requirement
  // discovered during U-ZO-MS0-FLEET-PRECHECK).
  let loadSlotContext;
  try {
    const libUrl = pathToFileURL(path.join(ROOT, "scripts/lib/zebra-context-bundle.mjs")).href;
    const mod = await import(libUrl);
    loadSlotContext = mod.loadSlotContext;
  } catch (e) {
    process.stderr.write(`warn: loadSlotContext unavailable (${e?.message || e}); slots will render without context\n`);
  }

  const ctxMap = new Map();
  if (typeof loadSlotContext === "function") {
    for (const slotName of KNOWN_SLOTS) {
      try {
        const sessionId = slotsDoc?.slots?.[slotName]?.chatId || null;
        ctxMap.set(slotName, loadSlotContext(slotName, { sessionId }));
      } catch {
        // Silent skip per fail-soft contract.
      }
    }
  }

  const result = generate(slotsDoc, ctxMap);
  const augmentation = {
    schemaVersion: SCHEMA_VERSION,
    generated_at: new Date().toISOString(),
    source: "scripts/generate-chat-slot-nodes-features.mjs",
    newNodes: result.newNodes,
    newEdges: result.newEdges,
    stats: result.stats,
  };

  try {
    fs.mkdirSync(VIZ_DIR, { recursive: true });
    fs.writeFileSync(OUT_PATH, JSON.stringify(augmentation, null, 2));
  } catch (e) {
    process.stderr.write(`error writing ${OUT_PATH}: ${e?.message || e}\n`);
    return 2;
  }

  process.stdout.write(JSON.stringify({
    ok: true,
    out: OUT_PATH,
    ...result.stats,
  }, null, 2) + "\n");
  return 0;
}

if (import.meta.url === pathToFileURL(process.argv[1]).href) {
  runCli().then(code => process.exit(code)).catch(e => {
    process.stderr.write(`fatal: ${e?.stack || e}\n`);
    process.exit(2);
  });
}
