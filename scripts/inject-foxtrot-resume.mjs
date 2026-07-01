#!/usr/bin/env node
// scripts/inject-foxtrot-resume.mjs
// One-shot: compile foxtrot tasks from 17 prior handoffs + prepend to foxtrot
// slot queue ahead of RGS/juliett-allocated DOMAIN/GAP/BRIDGE/PROSE waves.
// Authored 2026-05-18 by claude-3c737257 per operator /goal.

import fs from "node:fs";

const QUEUE_PATH = "H:/prism/state/shared/slot-task-queues.json";

// Verified UNWIRED as of 2026-05-18 via:
//   grep -l "$Engine" mcp-server/src/tools/dispatchers/*.ts
// 14 engines confirmed truly-unwired; 7 prior-handoff candidates already shipped
// since their handoffs (TurningInspectionPlanEngine, LathePartoffSafetyRailEngine,
// LatheWorkholdingEngine, LatheSequenceOptimizerEngine, TurningWearPredictionEngine,
// VendorTurningCatalogExtractorEngine, MachineVocabularyNormalizerEngine).
// Pattern proven: U-WIRE-INTAMP commit 812e05b141 (5-file: adapter + Zod schemas +
// dispatcher switch case + behavioral test + close-out).
const FOXTROT_RESUME = [
  // -- Tier-1: tribal / lathe (foxtrot domain) --
  {
    unit_id: "U-WIRE-LATHE-TRANSFER-LEARNING",
    wave: "FOXTROT-RESUME",
    cost: 30,
    spec: "turnkey",
    depends_on: [],
    summary: "Wire LatheTransferLearningEngine -> prism_turning (tribal/transfer learning)",
    engine: "LatheTransferLearningEngine",
    dispatcher: "turningDispatcher",
    domain: "tribal",
    source: "handoff:claude-dacc6809-foxtrot-work",
    pattern: "U-WIRE-INTAMP commit 812e05b141"
  },
  {
    unit_id: "U-WIRE-TURNING-STRATEGY-CATALOG",
    wave: "FOXTROT-RESUME",
    cost: 30,
    spec: "turnkey",
    depends_on: [],
    summary: "Wire TurningStrategyCatalog -> prism_turning (tribal turning strategies)",
    engine: "TurningStrategyCatalog",
    dispatcher: "turningDispatcher",
    domain: "tribal",
    source: "handoff:claude-dacc6809-foxtrot-work"
  },
  {
    unit_id: "U-WIRE-LATHE-MASTER-POST-SELF-AWARENESS",
    wave: "FOXTROT-RESUME",
    cost: 30,
    spec: "turnkey",
    depends_on: [],
    summary: "Wire LatheMasterPostSelfAwarenessEngine -> prism_turning (self-awareness/tribal)",
    engine: "LatheMasterPostSelfAwarenessEngine",
    dispatcher: "turningDispatcher",
    domain: "tribal",
    source: "handoff:claude-dacc6809-foxtrot-work"
  },
  {
    unit_id: "U-WIRE-LATHE-LORA-NEURAL-BRIDGE",
    wave: "FOXTROT-RESUME",
    cost: 30,
    spec: "turnkey",
    depends_on: [],
    summary: "Wire LatheLoRANeuralBridgeEngine -> prism_turning (tribal LoRA training)",
    engine: "LatheLoRANeuralBridgeEngine",
    dispatcher: "turningDispatcher",
    domain: "tribal",
    source: "handoff:claude-dacc6809-foxtrot-work"
  },
  {
    unit_id: "U-WIRE-LATHE-LORA-TRAINING-MONITOR",
    wave: "FOXTROT-RESUME",
    cost: 30,
    spec: "turnkey",
    depends_on: [],
    summary: "Wire LatheLoRATrainingMonitorEngine -> prism_turning (tribal LoRA cadence)",
    engine: "LatheLoRATrainingMonitorEngine",
    dispatcher: "turningDispatcher",
    domain: "tribal",
    source: "handoff:claude-dacc6809-foxtrot-work"
  },
  // -- Tier-2: claude-4d582e19 iter-4 deferred --
  {
    unit_id: "U-WIRE-NX-OPEN-ASSEMBLY-DRAWING",
    wave: "FOXTROT-RESUME",
    cost: 35,
    spec: "turnkey",
    depends_on: [],
    summary: "Wire NXOpenAssemblyDrawingEngine -> prism_cad (40K, dedicated schema, cleanest next wire)",
    engine: "NXOpenAssemblyDrawingEngine",
    dispatcher: "cadDispatcher",
    domain: "cad",
    source: "handoff:claude-4d582e19-foxtrot-work"
  },
  {
    unit_id: "U-WIRE-FOURTH-AXIS-DECISION",
    wave: "FOXTROT-RESUME",
    cost: 40,
    spec: "turnkey",
    depends_on: [],
    summary: "Wire FourthAxisDecisionEngine -> prism_5axis (static + 4 sibling deps)",
    engine: "FourthAxisDecisionEngine",
    dispatcher: "fiveAxisDispatcher",
    domain: "cam",
    source: "handoff:claude-4d582e19-foxtrot-work"
  },
  // -- Tier-3: WIRE-UNWIRED-MS0 wave 2 (claude-32a39c0c/6655163e) --
  {
    unit_id: "U-WIRE-PREMOU-KICKOFF-CHECKLIST",
    wave: "FOXTROT-RESUME",
    cost: 30,
    spec: "turnkey",
    depends_on: [],
    summary: "Wire PreMOUKickoffChecklistEngine -> prism_business (operator checklist)",
    engine: "PreMOUKickoffChecklistEngine",
    dispatcher: "businessDispatcher",
    domain: "business",
    source: "handoff:claude-6655163e-foxtrot-slash-cmd-fi"
  },
  {
    unit_id: "U-WIRE-ERP-TOOL-INVENTORY",
    wave: "FOXTROT-RESUME",
    cost: 30,
    spec: "turnkey",
    depends_on: [],
    summary: "Wire ERPToolInventoryEngine -> prism_business (ERP tool inventory)",
    engine: "ERPToolInventoryEngine",
    dispatcher: "businessDispatcher",
    domain: "business",
    source: "handoff:claude-6655163e-foxtrot-slash-cmd-fi"
  },
  {
    unit_id: "U-WIRE-LATHE-QUALITY-GATE",
    wave: "FOXTROT-RESUME",
    cost: 30,
    spec: "turnkey",
    depends_on: [],
    summary: "Wire LatheQualityGateEngine -> prism_turning (lathe quality gate)",
    engine: "LatheQualityGateEngine",
    dispatcher: "turningDispatcher",
    domain: "tribal",
    source: "handoff:claude-32a39c0c-foxtrot-docustrata-p"
  },
  {
    unit_id: "U-WIRE-MULTI-TURRET-SYNC",
    wave: "FOXTROT-RESUME",
    cost: 30,
    spec: "turnkey",
    depends_on: [],
    summary: "Wire MultiTurretSyncEngine -> prism_turning (multi-turret sync)",
    engine: "MultiTurretSyncEngine",
    dispatcher: "turningDispatcher",
    domain: "tribal",
    source: "handoff:claude-32a39c0c-foxtrot-docustrata-p"
  },
  {
    unit_id: "U-WIRE-MACHINE-AWARE-SPEED-FEED",
    wave: "FOXTROT-RESUME",
    cost: 30,
    spec: "turnkey",
    depends_on: [],
    summary: "Wire MachineAwareSpeedFeedEngine -> prism_calc (machine-aware S/F)",
    engine: "MachineAwareSpeedFeedEngine",
    dispatcher: "calcDispatcher",
    domain: "speed-feed",
    source: "handoff:claude-32a39c0c-foxtrot-docustrata-p"
  },
  {
    unit_id: "U-WIRE-MULTI-SPINDLE-AUTOMATIC",
    wave: "FOXTROT-RESUME",
    cost: 30,
    spec: "turnkey",
    depends_on: [],
    summary: "Wire MultiSpindleAutomaticEngine -> prism_turning (multi-spindle automatic)",
    engine: "MultiSpindleAutomaticEngine",
    dispatcher: "turningDispatcher",
    domain: "tribal",
    source: "handoff:claude-32a39c0c-foxtrot-docustrata-p"
  },
  // -- Tier-4: print-program-loop carryover --
  {
    unit_id: "U-PPL-B2",
    wave: "FOXTROT-RESUME",
    cost: 60,
    spec: "turnkey",
    depends_on: [],
    summary: "Wire prism_cam:program_optimize (mill+lathe) + prism_mill:mill_program_optimize. ALL-OR-NOTHING.",
    domain: "cam",
    source: "handoff:claude-32a39c0c-foxtrot-print-progra"
  },
  {
    unit_id: "U-PPL-C3",
    wave: "FOXTROT-RESUME",
    cost: 50,
    spec: "turnkey",
    depends_on: [],
    summary: "Wire prism_machining_kb into TurningProgramAssemblerEngine (5 of 7 Track C units remain)",
    domain: "cam",
    source: "handoff:claude-2081f435-foxtrot-docustrata-l"
  }
];

const j = JSON.parse(fs.readFileSync(QUEUE_PATH, "utf8"));
const existing = j.queues.foxtrot || [];

// Dedup-guard: skip any unit_id already in queue (idempotent re-runs)
const existingIds = new Set(existing.map(e => String(e.unit_id || "").toUpperCase()));
const toInject = FOXTROT_RESUME.filter(u => !existingIds.has(String(u.unit_id).toUpperCase()));
const skipped = FOXTROT_RESUME.length - toInject.length;

j.queues.foxtrot = [...toInject, ...existing];

j.lastInject = {
  at: new Date().toISOString(),
  by: "claude-3c737257 (foxtrot)",
  slot: "foxtrot",
  source: "handoff-aggregation:17-files",
  wave: "FOXTROT-RESUME",
  injected_count: toInject.length,
  skipped_already_queued: skipped,
  position: "prepend",
  note: "Compiled from 17 foxtrot handoffs prior sessions; placed ahead of juliett-allocated DOMAIN/GAP/BRIDGE/PROSE waves per operator /goal"
};
j.updatedAt = new Date().toISOString();
j.updatedBy = "claude-3c737257 (foxtrot)";

const tmp = QUEUE_PATH + ".tmp-foxtrot-" + process.pid;
fs.writeFileSync(tmp, JSON.stringify(j, null, 2));
fs.renameSync(tmp, QUEUE_PATH);

console.log(JSON.stringify({
  ok: true,
  injected: toInject.length,
  skipped: skipped,
  total_foxtrot_now: j.queues.foxtrot.length,
  first_5: j.queues.foxtrot.slice(0, 5).map(u => ({ id: u.unit_id, wave: u.wave }))
}, null, 2));
