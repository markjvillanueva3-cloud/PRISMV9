#!/usr/bin/env node
/**
 * MILL-MASTER envelope builder (v2 — synergy-focused revision).
 *
 * Revision drivers from user directives + /forge audit:
 *  1. Drop PowerMill + CATIA (defer; minimal assets exist).
 *  2. CAM bridge priority: Mastercam → hyperMILL → InventorCAM/HSM → SolidCAM → Fusion 360.
 *  3. Factor in existing mill-specific AI stack (audited 2026-04-20):
 *     - MillMasterOrchestratorFacadeEngine (single-entry facade, UNWIRED)
 *     - MillingAGIMasterEngine (PhD-level AGI, 8 reasoning modes)
 *     - MillingAGIOrchestrationEngine, MillingUnifiedScienceOrchestrationEngine
 *     - MillingEndToEndOrchestrationEngine, MillingDigitalTwinEngine
 *     - MillingDeepAIHardeningEngine, MillingDeepReasoningEngine
 *     - MillingReinforcementLearningEngine, MillingMetaLearningEngine
 *     - MillingNeuralCognitiveEngine, MillComprehensiveNeuralEngine
 *     - MillPatternMinerEngine, MillingProgramPatternEngine
 *     - MillingPrintToProgramEngine, MultiAxisPrintToProgramEngine
 *     - 44+ HyperMill* engines, 18 Mastercam* engines, 20+ Fusion360* engines
 *     - 7 InventorCAM/HSM engines (PARTIAL — needs parity fill)
 *     - 5 SolidCAM engines (PARTIAL — needs parity fill)
 *     - CAMAGIMasterOrchestratorEngine (multi-CAM AGI router, UNWIRED)
 *     - MillAISelfAwarenessIntegrationEngine (114-engine registry)
 *  4. CRITICAL GAP: NO millDispatcher.ts exists — mill work scattered across
 *     camDispatcher/fiveAxisDispatcher/multiAxisProgramDispatcher/multiOpDispatcher.
 *  5. PRISM Master AI integration: wire MillMasterOrchestratorFacadeEngine →
 *     PRISMSelfAwarenessEngine → CAMAGIMasterOrchestratorEngine end-to-end,
 *     then expose via NEW millDispatcher + existing prism_ai/prism_cam.
 *  6. Terminal exhaustive test suite (P16) with extreme variability.
 *
 * Outcome: a SYNERGIZED, COHESIVE roadmap that wires what's already there,
 * fills parity gaps, and validates end-to-end — not a rebuild.
 */
import fs from "node:fs";
import path from "node:path";

const ENVELOPE_OUT = "H:/prism/mcp-server/data/milestones/MILL-MASTER.json";
const INDEX_FILE = "H:/prism/mcp-server/data/roadmap-index.json";
const NOW = new Date().toISOString();

// ── Unit factory ──────────────────────────────────────────────────
function U(phase, seq, idSuffix, title, opts = {}) {
  const unitId = `${phase}-U${String(seq).padStart(2, "0")}${idSuffix ? "-" + idSuffix : ""}`;
  const deliverables = opts.deliverables || [];
  const hasSource = deliverables.some((d) => d.type === "source" && !/test|__tests__/i.test(d.path || ""));
  const hasExplicitTest = deliverables.some((d) => d.type === "test" || /\.test\./.test(d.path || ""));
  // Auto-append a test deliverable for engine/source units that forgot to list one
  if (hasSource && !hasExplicitTest) {
    const firstSource = deliverables.find((d) => d.type === "source");
    const base = (firstSource?.path || "").replace(/\.(ts|tsx)$/, "").split("/").pop() || unitId;
    deliverables.push({
      path: `mcp-server/src/__tests__/${base}.test.ts`,
      type: "test",
      description: `Vitest suite for ${unitId} — ≥10 real-input cases + edge cases + integration with MillMasterOrchestratorFacadeEngine.`,
      line_count_est: 260,
    });
  }
  // Auto-populate index_entry for every source/command deliverable when unit indexes in MASTER (v12 F2)
  const indexInMaster = opts.index_in_master ?? true;
  if (indexInMaster) {
    for (const d of deliverables) {
      if ((d.type === "source" || d.type === "command") && !d.index_entry) {
        const label = (d.path || "").split("/").pop() || unitId;
        d.index_entry = `${unitId} · ${label}${d.description ? " — " + d.description.slice(0, 80) : ""}`;
      }
    }
  }
  // Unit-specific rollback built from deliverable paths or unit-id fallback
  const deliverablePaths = deliverables.map((d) => d.path).filter(Boolean);
  const rollback = opts.rollback
    || (deliverablePaths.length > 0
      ? `git restore ${deliverablePaths.slice(0, 4).join(" ")}${deliverablePaths.length > 4 ? " …" : ""}  # revert ${unitId}`
      : `git log --oneline -n 20 | grep "${unitId}" | awk '{print $1}' | xargs -r -I{} git revert --no-edit {}`);
  // Auto-upgrade role_name so it matches role code (v12 F3 — eliminates role_mismatch false positives).
  // Also upgrades when role_name was accidentally set to the role code itself (legacy bug).
  const role = opts.role || "R2";
  const defaultRoleName = role === "R1" ? "Systems Architect"
                        : role === "R4" ? "Tester"
                        : role === "R3" ? "Reviewer"
                        : "Implementer";
  const nameIsRoleCode = typeof opts.role_name === "string" && /^R\d$/.test(opts.role_name.trim());
  const role_name = (!opts.role_name || nameIsRoleCode) ? defaultRoleName : opts.role_name;
  return {
    id: unitId,
    title,
    phase,
    sequence: seq,
    role,
    role_name,
    role_waiver: opts.role_waiver,
    model: opts.model || "sonnet-4.6",
    effort: opts.effort ?? 80,
    rationale: opts.rationale,
    tools: opts.tools || [],
    skills: opts.skills || (opts.creates_command ? ["prism-navigate", "forge-from-scout", "verify-loop"] : []),
    scripts: opts.scripts || [],
    hooks: opts.hooks || [],
    features: opts.features || [],
    dependencies: opts.dependencies || [],
    entry_conditions: opts.entry_conditions || [
      "Prior phase gate passed",
      "Build clean (npx tsc --noEmit → 0 errors)",
      "Duplication guard clean (duplicationGuardEngine.mustCheckBeforeCreating for any new asset)",
    ],
    exit_conditions: opts.exit_conditions || [
      "Unit deliverables created/wired + committed",
      "Tests added or extended (≥10 cases per engine, ≥3 actions per dispatcher unit)",
      "Build + typecheck clean",
      "Physics constants sourced from src/physics/constants.ts (no inlined values)",
    ],
    rollback,
    steps: opts.steps || [
      { number: 1, instruction: "Read affected engines + PRISMSelfAwarenessEngine route", validation: "Files read" },
      { number: 2, instruction: "Implement deliverables — prefer wiring existing engines over creating new", validation: "Files created/edited" },
      { number: 3, instruction: "Add/extend tests — real inputs + edge cases + integration", validation: "vitest green" },
      { number: 4, instruction: "Typecheck + build", validation: "tsc clean, esbuild success" },
      { number: 5, instruction: "Wire to dispatcher + update MASTER_INDEX", validation: "MCP action callable" },
    ],
    deliverables,
    estimated_tokens: opts.estimated_tokens,
    estimated_minutes: opts.estimated_minutes,
    index_in_master: indexInMaster,
    creates_skill: opts.creates_skill ?? false,
    creates_script: opts.creates_script ?? false,
    creates_hook: opts.creates_hook ?? false,
    creates_command: opts.creates_command ?? false,
  };
}

function gate(extraChecks = [], overrides = {}) {
  return {
    omega_floor: 1.0,
    safety_floor: 0.7,
    ralph_required: overrides.ralph_required ?? true,
    ralph_grade_floor: "A",
    anti_regression: true,
    test_required: true,
    build_required: true,
    checkpoint: true,
    learning_save: true,
    custom_checks: [
      "No duplicate engines (duplicationGuardEngine clean)",
      "Kienzle kc + Taylor exponents imported from constants.ts",
      "No silent catches (hook_no_silent_catch)",
      "Test legitimacy — no placeholder asserts (hook_test_legitimacy)",
      "PRISMSelfAwarenessEngine.recommendAIFeatures called for any create-intent step",
      "MillAISelfAwarenessIntegrationEngine registry updated if engine added/renamed",
      ...extraChecks,
    ],
    ...overrides,
  };
}

// ── Phases ────────────────────────────────────────────────────────
const phases = [];

// ── P0: Mill Wizard/Studio Parity ─────────────────────────────────
phases.push({
  id: "P0",
  title: "Mill Wizard/Studio Parity — Web Hub + Context (match Lathe + Wire EDM)",
  description:
    "Close wizard-parity gap. Mill has MillingWizardPage + MillingUploadPage + MillingResultsPage but NO MillStudioPage or MillStudioContext. LatheStudioPage + LatheStudioContext and WireEdmStudioPage exist — mirror them exactly. Add /mill-studio slash command parity with /lathe-studio and /wire-edm-studio.",
  sessions: "3",
  primary_role: "R2",
  primary_model: "sonnet-4.6",
  scrutiny_checkpoint: true,
  scrutiny_focus: [
    "UI parity matrix vs LatheStudioPage/WireEdmStudioPage (zero missing actions)",
    "Context reducer purity",
    "Dispatcher route exposed via /mill-studio",
  ],
  units: [
    U("P0", 1, "STUDIO-CTX", "MillStudioContext — React Context + Reducer (parity with LatheStudioContext)", {
      deliverables: [
        { path: "mcp-server/web/src/contexts/MillStudioContext.tsx", type: "source", description: "State container mirroring LatheStudioContext exactly: LOAD_PRINT, SELECT_MACHINE, SELECT_STRATEGY, GENERATE_PROGRAM, RUN_SIM, EXPORT_NC, persist to MillMasterOrchestratorFacadeEngine.", line_count_est: 340 },
        { path: "mcp-server/web/src/contexts/__tests__/MillStudioContext.test.tsx", type: "test", description: "Reducer pure-function tests (≥12 cases).", line_count_est: 260 },
      ],
    }),
    U("P0", 2, "STUDIO-PAGE", "MillStudioPage — Hub Component (4-pane parity)", {
      deliverables: [
        { path: "mcp-server/web/src/pages/MillStudioPage.tsx", type: "source", description: "4-pane hub: Print Panel / Strategy Panel / Program Preview / Sim & Verify. Parity with LatheStudioPage spacing, panel sizes, toolbar.", line_count_est: 440 },
      ],
    }),
    U("P0", 3, "STUDIO-ROUTE", "Router + Nav + Keyboard Shortcuts", {
      deliverables: [
        { path: "mcp-server/web/src/App.tsx", type: "source", description: "Add /mill-studio route + nav link + Ctrl+U/Ctrl+G/Ctrl+S shortcuts matching lathe.", line_count_est: 12 },
      ],
    }),
    U("P0", 4, "STUDIO-PANELS", "Strategy + Preview + Sim Panels wired to MillMaster facade", {
      deliverables: [
        { path: "mcp-server/web/src/components/mill/StrategyPanel.tsx", type: "source", description: "Calls ToolpathStrategyRegistry via millMasterOrchestratorFacadeEngine.", line_count_est: 280 },
        { path: "mcp-server/web/src/components/mill/ProgramPreview.tsx", type: "source", description: "G-code viewer with per-block physics overlay from PostProcessorPipelineEngine.", line_count_est: 260 },
        { path: "mcp-server/web/src/components/mill/SimPanel.tsx", type: "source", description: "Collision/force/thermal sim via MillKinematicsCollisionEngine + CuttingForceEngine + ThermalWearCouplingEngine.", line_count_est: 240 },
      ],
    }),
    U("P0", 5, "STUDIO-SKILL", "Slash command + skill — /mill-studio (parity with /lathe-studio, /wire-edm-studio)", {
      deliverables: [
        { path: ".claude/commands/mill-studio.md", type: "command", description: "Slash command opening Mill Studio hub + inline param help.", line_count_est: 90 },
      ],
      creates_command: true,
      creates_skill: true,
    }),
    U("P0", 6, "STUDIO-E2E", "E2E test — Upload → Strategy → Program → Sim round-trip", {
      deliverables: [
        { path: "mcp-server/web/src/__tests__/MillStudioPage.test.tsx", type: "test", description: "Testing-Library E2E: load sample print, pick strategy, generate program, verify sim output. ≥ 15 assertions.", line_count_est: 360 },
      ],
    }),
  ],
  gate: gate(["Mill Studio parity matrix published; 100% parity with Lathe + Wire EDM"]),
});

// ── P1: Mill Dispatcher Creation + Master AI Wiring (SYNERGY CORE) ─
phases.push({
  id: "P1",
  title: "Mill Dispatcher Creation + Master AI Wiring — Cohesion Core",
  description:
    "THE critical synergy phase. Creates the missing millDispatcher.ts so mill work has a first-class MCP surface (today it is scattered across camDispatcher/fiveAxis/multiAxis/multiOp). Wires MillMasterOrchestratorFacadeEngine as THE single entry; binds it to MillingAGIMasterEngine, CAMAGIMasterOrchestratorEngine, MillAISelfAwarenessIntegrationEngine, and PRISMSelfAwarenessEngine. Every downstream phase consumes through this dispatcher.",
  sessions: "4",
  primary_role: "R1",
  primary_model: "opus-4.6",
  scrutiny_checkpoint: true,
  scrutiny_focus: ["End-to-end call graph from MCP action → facade → sub-orchestrator → engine"],
  units: [
    U("P1", 1, "MILL-DISP", "Create src/tools/dispatchers/millDispatcher.ts — 40+ actions (print_to_program, scientific, agi, validate, quick, wisdom, adaptive, strategy_select, pattern_mine, digital_twin, ...)", {
      role: "R1", role_name: "Systems Architect", effort: 95,
      deliverables: [
        { path: "mcp-server/src/tools/dispatchers/millDispatcher.ts", type: "source", description: "First-class mill dispatcher with z.enum action list routing to millMasterOrchestratorFacadeEngine + every sub-orchestrator. Mirror structure of turningDispatcher + fiveAxisDispatcher.", line_count_est: 680 },
        { path: "mcp-server/src/schemas/millActionSchemas.ts", type: "schema", description: "Per-action Zod schemas (parity with turningActionSchemas).", line_count_est: 520 },
      ],
    }),
    U("P1", 2, "FACADE-WIRE", "Wire MillMasterOrchestratorFacadeEngine as primary entry — verify every route reachable", {
      deliverables: [
        { path: "mcp-server/src/__tests__/MillMasterOrchestratorFacadeEngine.wiring.test.ts", type: "test", description: "For each MillOrchRequestType (print_to_program, scientific, agi, validate, quick, wisdom, adaptive), call facade → assert correct sub-orchestrator invoked → verify provenance stamped. ≥ 14 tests.", line_count_est: 420 },
      ],
    }),
    U("P1", 3, "AGI-BIND", "Bind MillingAGIMasterEngine ↔ MillMasterOrchestratorFacadeEngine ↔ CAMAGIMasterOrchestratorEngine", {
      deliverables: [
        { path: "mcp-server/src/engines/MillingAGIMasterEngine.ts", type: "source", description: "Add bidirectional binding so CAMAGIMasterOrchestratorEngine requests route here for mill AGI reasoning; MillingAGIMasterEngine delegates CAM-vendor choice to CAMAGIMasterOrchestratorEngine.", line_count_est: 120 },
      ],
    }),
    U("P1", 4, "SA-INTEG", "Wire PRISMSelfAwarenessEngine ↔ MillAISelfAwarenessIntegrationEngine", {
      deliverables: [
        { path: "mcp-server/src/engines/PRISMSelfAwarenessEngine.ts", type: "source", description: "Add recommendMillFeatures(task) that delegates to MillAISelfAwarenessIntegrationEngine; update 114-engine registry to match live scan.", line_count_est: 80 },
        { path: "mcp-server/src/engines/MillAISelfAwarenessIntegrationEngine.ts", type: "source", description: "Add registry refresh hook that scans src/engines/Mill*.ts + Milling*.ts and auto-updates MILL_ENGINE_REGISTRY on build.", line_count_est: 140 },
      ],
    }),
    U("P1", 5, "PRISM-AI-ROUTE", "Extend prism_ai dispatcher — add route_mill_pipeline, mill_agi_reason, mill_awareness_query", {
      deliverables: [
        { path: "mcp-server/src/tools/dispatchers/aiReasoningDispatcher.ts", type: "source", description: "Add 6 mill-targeted actions dispatching through MillMasterOrchestratorFacadeEngine.", line_count_est: 180 },
      ],
    }),
    U("P1", 6, "CAM-AGI-WIRE", "Wire CAMAGIMasterOrchestratorEngine into camDispatcher (today unwired — orphan facade)", {
      deliverables: [
        { path: "mcp-server/src/tools/dispatchers/camDispatcher.ts", type: "source", description: "Add cam_agi_route, cam_compare_systems, cam_ensemble actions routing through CAMAGIMasterOrchestratorEngine (hyperMILL/Mastercam/Fusion360/InventorCAM).", line_count_est: 220 },
      ],
    }),
    U("P1", 7, "MCP-INDEX", "MASTER_INDEX_COMPACT + ENGINE_DIGEST refresh — publish new dispatcher + facade wiring", {
      deliverables: [
        { path: "mcp-server/MASTER_INDEX_COMPACT.md", type: "doc", description: "Append millDispatcher section + facade chain diagram + 40+ new actions.", line_count_est: 60 },
        { path: "mcp-server/data/docs/ENGINE_DIGEST.md", type: "doc", description: "Update MillMasterOrchestratorFacadeEngine + CAMAGIMasterOrchestratorEngine entries with wired-status tag.", line_count_est: 40 },
      ],
    }),
    U("P1", 8, "COHESION-TEST", "Cohesion smoke test — one MCP call per facade route exercises full chain", {
      deliverables: [
        { path: "mcp-server/src/__tests__/mill-cohesion.smoke.test.ts", type: "test", description: "Fire an MCP call per mill action and assert facade routed correctly, provenance present, no orphaned engines called directly. ≥ 40 smoke tests.", line_count_est: 620 },
      ],
    }),
    U("P1", 9, "L2-AGG", "Create L2 aggregator orchestrators — FiveAxisOrchestrationEngine, MillTurnOrchestrationEngine, MillingAILearningOrchestratorEngine (binds 38 unwired AI engines under single facade call)", {
      role: "R1", role_name: "Systems Architect", effort: 90,
      deliverables: [
        { path: "mcp-server/src/engines/MillingAILearningOrchestratorEngine.ts", type: "source", description: "Aggregator that routes to MillingUltimateAI, MillingStrategyLibrary, MillingReinforcementLearning, MillPatternMiner, MillingOnlineLearningTracker, MillingReasoningTraceLedger, MillingMetaLearning, and 31 other AI engines — single entry from MillMasterOrchestratorFacadeEngine.", line_count_est: 420 },
        { path: "mcp-server/src/engines/MillTurnOrchestrationEngine.ts", type: "source", description: "Wraps MillTurnCAMEngine + MillTurnSwissPipelineEngine for mill-turn routing via facade.", line_count_est: 240 },
        { path: "mcp-server/src/engines/FiveAxisAggregatorEngine.ts", type: "source", description: "Wraps 9 FiveAxis* engines (Orchestration, AIUltra, DeepLearning, CAMIntegration, ToolpathIntegration, ToolpathSynthesis, Post, Decision, CADTemplate) under facade.", line_count_est: 280 },
        { path: "mcp-server/src/engines/MultiAxisAggregatorEngine.ts", type: "source", description: "Wraps MultiAxisKinematicEngine + MultiAxisPrintToProgramEngine.", line_count_est: 180 },
      ],
    }),
    U("P1", 10, "FACADE-EXTEND", "Extend MillMasterOrchestratorFacadeEngine — new route types: ai_learning, mill_turn, five_axis, multi_axis, tribal_writeback, pattern_sync, blueprint_bridge, model_load, hive_sync, customer_learn, outcome_replan, jmdie_refresh", {
      role: "R1", role_name: "Systems Architect", effort: 90,
      deliverables: [
        { path: "mcp-server/src/engines/MillMasterOrchestratorFacadeEngine.ts", type: "source", description: "Extend MillOrchRequestType union with 12 new types + implement routing branches. Default include_tribal to true on print_to_program.", line_count_est: 220 },
      ],
    }),
    U("P1", 11, "AUTO-TRIBAL", "Default print_to_program to include_tribal=true (agent finding: tribal tips bypassed by default)", {
      effort: 70,
      deliverables: [
        { path: "mcp-server/src/engines/MillMasterOrchestratorFacadeEngine.ts", type: "source", description: "One-line default change + material-iso-based tribal filter injection.", line_count_est: 20 },
      ],
    }),
    U("P1", 12, "SKILL-CMDS", "Slash commands — /mill-master, /mill-agi, /mill-awareness (parity with /lathe-master, /wire-edm-studio)", {
      deliverables: [
        { path: ".claude/commands/mill-master.md", type: "command", description: "Invoke MillMasterOrchestratorFacadeEngine via MCP.", line_count_est: 90 },
        { path: ".claude/commands/mill-agi.md", type: "command", description: "Invoke MillingAGIMasterEngine directly via MCP.", line_count_est: 80 },
        { path: ".claude/commands/mill-awareness.md", type: "command", description: "Query MillAISelfAwarenessIntegrationEngine registry.", line_count_est: 70 },
      ],
      creates_command: true,
    }),
  ],
  gate: gate([
    "millDispatcher.ts exists with ≥ 40 actions",
    "MillMasterOrchestratorFacadeEngine callable via MCP for all 7 MillOrchRequestType values",
    "CAMAGIMasterOrchestratorEngine callable via camDispatcher",
    "MillAISelfAwarenessIntegrationEngine registry matches live scan of src/engines/Mill*.ts",
    "Cohesion smoke test green on ≥ 40 scenarios",
  ]),
});

// ── P2: CAM Bridge Completion (Mastercam → hyperMILL → InventorHSM → SolidCAM → Fusion 360) ─
phases.push({
  id: "P2",
  title: "CAM Bridge Completion — Mastercam, hyperMILL, Inventor HSM, SolidCAM, Fusion 360 (priority order)",
  description:
    "User priority order. No PowerMill, no CATIA (deferred). Audit shows: Mastercam (18 engines) + hyperMILL (60+ engines) + Fusion 360 (20+ engines) are DEEP; Inventor CAM (7 engines) + SolidCAM (5 engines) are PARTIAL — bring them to Mastercam/hyperMILL-level parity. Finish hyperMILL Automation Center production integration. Complete MastercamAutomationBridge wiring. Fusion 360 final handshake.",
  sessions: "7-9",
  primary_role: "R3",
  primary_model: "sonnet-4.6",
  scrutiny_checkpoint: true,
  scrutiny_focus: ["Parity matrix Mastercam vs hyperMILL vs Fusion360 vs InventorCAM vs SolidCAM"],
  units: [
    // Mastercam (priority 1) — already strong; close last-mile gaps
    U("P2", 1, "MC-FINISH", "Mastercam — complete MastercamAutomationBridge end-to-end (NET-Hook + Chook plugin handshake)"),
    U("P2", 2, "MC-AI", "Mastercam — wire MastercamAIOrchestrationEngine into CAMAGIMasterOrchestratorEngine"),
    U("P2", 3, "MC-5X", "Mastercam — Mastercam5AxisEngine + MastercamMultiAxisEngine output parity test vs known-good Mastercam 2024"),
    U("P2", 4, "MC-TESTS", "Mastercam — 30-case integration test matrix (18 engines × key scenarios)", { role: "R4", role_name: "Tester" }),
    // hyperMILL (priority 2) — already huge; AC production integration
    U("P2", 5, "HM-AC-PROD", "hyperMILL AC — production integration (HyperMillACConnectionManager + HyperMillACScriptExecutor + HyperMillJobMonitor end-to-end)"),
    U("P2", 6, "HM-AGI", "hyperMILL — wire HyperMillAIOrchestrationEngine into CAMAGIMasterOrchestratorEngine"),
    U("P2", 7, "HM-IM-DB", "hyperMILL — finalize DB extractors (HyperMillDemoDbExtractor + HyperMillIMDbExtractor + HyperMillOmCyclesExtractor) round-trip"),
    U("P2", 8, "HM-TESTS", "hyperMILL — 50-case integration test matrix (60+ engines × AC sequence control)", { role: "R4", role_name: "Tester" }),
    // Inventor HSM/CAM (priority 3) — PARTIAL; needs parity fill
    U("P2", 9, "INV-SAFETY", "Inventor CAM — create InventorCAMSafetyHooksEngine (parity with Mastercam/hyperMILL)", { effort: 85 }),
    U("P2", 10, "INV-MAT", "Inventor CAM — InventorCAMMaterialBridgeEngine + InventorCAMMaterialPhysicsBridge"),
    U("P2", 11, "INV-5X", "Inventor CAM — InventorCAM5AxisEngine + InventorCAMMultiAxisEngine"),
    U("P2", 12, "INV-CYCLE", "Inventor CAM — InventorCAMCycleCatalogEngine + InventorCAMControllerCatalogEngine"),
    U("P2", 13, "INV-BRIDGE", "Inventor CAM — InventorCAMMillTurnBridge + InventorCAMSPCBridge + InventorCAMFAIBridge + InventorCAMProbingBridge"),
    U("P2", 14, "INV-DL", "Inventor CAM — InventorCAMDeepLearningEngine (parity with MastercamDeepLearningEngine)"),
    U("P2", 15, "INV-TESTS", "Inventor CAM — 25-case integration test suite", { role: "R4", role_name: "Tester" }),
    // SolidCAM (priority 4) — PARTIAL; needs parity fill
    U("P2", 16, "SC-MAT", "SolidCAM — SolidCAMMaterialBridgeEngine + SolidCAMMaterialPhysicsBridge"),
    U("P2", 17, "SC-5X", "SolidCAM — SolidCAM5AxisEngine + SolidCAMMultiAxisEngine + iMachining HSS strategy extension"),
    U("P2", 18, "SC-CYCLE", "SolidCAM — SolidCAMCycleCatalogEngine + SolidCAMControllerCatalogEngine"),
    U("P2", 19, "SC-BRIDGE", "SolidCAM — SolidCAMMillTurnBridge + SolidCAMSPCBridge + SolidCAMFAIBridge + SolidCAMProbingBridge"),
    U("P2", 20, "SC-DL", "SolidCAM — SolidCAMDeepLearningEngine + SolidCAMToolExportEngine"),
    U("P2", 21, "SC-TESTS", "SolidCAM — 25-case integration test suite", { role: "R4", role_name: "Tester" }),
    // Fusion 360 (priority 5) — already strong; final handshake
    U("P2", 22, "F360-AI", "Fusion 360 — wire FusionAIOrchestrationEngine into CAMAGIMasterOrchestratorEngine"),
    U("P2", 23, "F360-BRIDGE", "Fusion 360 — finalize Fusion360LiveBridgeEngine + Fusion360AutomationBridge handshake"),
    U("P2", 24, "F360-MULTI", "Fusion 360 — Fusion5AxisEngine + FusionMultiAxisEngine → multi-axis F360 pipeline end-to-end (absorbs F360-REV-MS9)"),
    U("P2", 25, "F360-TESTS", "Fusion 360 — 30-case test matrix + multi-axis round-trip parity vs F360 desktop", { role: "R4", role_name: "Tester" }),
    // Cross-system AGI
    U("P2", 26, "AGI-ROUTE", "Wire all 5 CAM orchestration engines into CAMAGIMasterOrchestratorEngine with reasoning-mode selection"),
    U("P2", 27, "AGI-COMPARE", "Cross-system strategy comparison endpoint — same part run through all 5, diff + score"),
  ],
  gate: gate([
    "Parity matrix published: all 5 CAM systems at Mastercam-level feature depth",
    "Every CAM orchestration engine callable via camDispatcher → CAMAGIMasterOrchestratorEngine",
    "Cross-system comparison produces ranked recommendation for 20+ benchmark parts",
    "No PowerMill/CATIA units present (deferred per user directive)",
  ]),
});

// ── P3: Critical Bug Fixes (absorbs CAMX-V17-P0B) ────────────────
phases.push({
  id: "P3",
  title: "Critical Bug Fixes — Multi-Start Threading, Facing, MillTurn, Routing, Kienzle Approach",
  description:
    "Absorbs CAMX-V17-P0B. 7 CRITICAL fixes unblock 3-axis/5-axis/mill-turn. Regression test per fix.",
  sessions: "3",
  primary_role: "R2",
  primary_model: "sonnet-4.6",
  units: [
    U("P3", 1, "THREAD-MULTI", "Multi-start threading — N G76 blocks with Q offset 360/starts°"),
    U("P3", 2, "FACE-G72", "Facing cycles — G72 multi-pass with DOC from physics"),
    U("P3", 3, "MT-ASSEMBLE", "MillTurnSwissPipelineEngine.assembleProgram() — multi-channel G-code + sync codes (6 dialects)", { effort: 90 }),
    U("P3", 4, "ROUTE-FIX", "Routing mismatches — fix 9 mismapped routes (turning_program↔turning_print_to_program, .generate↔.calculate)"),
    U("P3", 5, "KIENZLE-APPROACH", "Kienzle approach angle — b=ap/sin(κr), h=f·sin(κr); VNMG/CNMG differentiation"),
    U("P3", 6, "ROBUST-TUNE", "robustness_weight tuning — 0.00→0.15"),
    U("P3", 7, "GROOVE-Q", "Grooving G75 Q parameter — insert_width minus overlap"),
  ],
  gate: gate(["All 7 regression tests pass", "Downstream phases unblocked"]),
});

// ── P4: 3-Axis Pipeline Hardening ─────────────────────────────────
phases.push({
  id: "P4",
  title: "3-Axis Pipeline Hardening — Collision/Dialect/Machine/Tool/Workholding/E2E",
  description:
    "Hardens already-complete CAMX-V17-P5. Gap-fill where tests or physics drift.",
  sessions: "5-6",
  primary_role: "R2",
  primary_model: "sonnet-4.6",
  units: [
    U("P4", 1, "COL3", "3-axis collision at every XYZ, rapid clearance planes, adaptive step-down (uses MillKinematicsCollisionEngine)"),
    U("P4", 2, "DIALECT", "Dialect reconciliation — Haas/Fanuc/Siemens/Makino/Okuma/Heidenhain (existing 6)"),
    U("P4", 3, "MACHDB", "Machine DB gap-fill — JM Die's Hurco TM10i, Roku-Roku BA-8, Haas UMC-750 validated"),
    U("P4", 4, "TOOL-FORCE", "Tooling geometry → Kienzle lookup (existing KienzleForceModelEngine wiring verification)"),
    U("P4", 5, "VISE", "Workholding — vise pressure/clamping/deflection under load"),
    U("P4", 6, "E2E-MULTI", "E2E multi-pass roughing → semi-finish → finish optimal DOC/feed sequencing"),
    U("P4", 7, "OPT-MRR", "MRR/tool-life trade-off Pareto with surface finish constraint"),
    U("P4", 8, "JM-CAL", "JM Die calibration — predictions vs 483 Mastercam + 509 Hurco production programs", { role: "R4", role_name: "Tester" }),
  ],
  gate: gate(["Kienzle predictions within ±15% of measured on JM Die dataset"]),
});

// ── P5: 5-Axis Pipeline Hardening ─────────────────────────────────
phases.push({
  id: "P5",
  title: "5-Axis Pipeline Hardening — RTCP/Singularity/Barrel/Trunnion + Fusion 360 Wiring",
  description:
    "Leverages existing FiveAxisOrchestrationEngine, FiveAxisAIUltraIntelligenceEngine, FiveAxisDeepLearningEngine, FiveAxisPostEngine (all COMPLETE). Gap-fill + F360 multi-axis wiring (absorbs F360-REV-MS9 into P2-U24).",
  sessions: "4",
  primary_role: "R2",
  primary_model: "opus-4.6",
  units: [
    U("P5", 1, "COL5", "5-axis collision at every AB angle, RTCP verify, singularity avoidance"),
    U("P5", 2, "DIALECT5", "TRAORI (Fanuc), M128 (Siemens), DWO (Okuma), Heidenhain FUNCTION TCPM"),
    U("P5", 3, "ARCH", "Machine archetypes — trunnion, swivel, gantry, head-head, table-table, mixed"),
    U("P5", 4, "BARREL", "Barrel/lollipop tooling geometry + force model"),
    U("P5", 5, "SCALLOP", "Scallop-height physics — FEA lookup, tool orientation optimization"),
    U("P5", 6, "SING", "Singularity avoidance — gimbal-lock detection near B=0/90°"),
    U("P5", 7, "TESTS5", "Regression — 10 parts × 4 machine types", { role: "R4", role_name: "Tester" }),
  ],
  gate: gate(["5-axis RTCP round-trip exact", "Singularity handler green on Heidenhain iTNC 530"]),
});

// ── P6: Mill-Turn/Swiss Completion ───────────────────────────────
phases.push({
  id: "P6",
  title: "Mill-Turn/Swiss Completion — Multi-Channel G-Code + Sync Codes",
  description:
    "Absorbs LATHE-PRO-MS6a + CAMX-V17-P7. Uses existing MillTurnSwissPipelineEngine + MillTurnCAMEngine. Finalize Integrex/Cincom/Star DB + sync codes.",
  sessions: "4",
  primary_role: "R2",
  primary_model: "opus-4.6",
  units: [
    U("P6", 1, "TURRET-COL", "Multi-turret collision + tool-to-tool clearance"),
    U("P6", 2, "MCH-DIALECT", "Multi-channel dialect — simultaneous spindle+turret codes + sync M codes"),
    U("P6", 3, "MT-DB", "Mill-turn machine DB — Integrex, Cincom L20/L32, Star SW/SR, Tornos"),
    U("P6", 4, "TURRET-TOOL", "Turret tooling multi-axis engagement"),
    U("P6", 5, "GRIP", "Grip force — chuck clamping + deflection under turret engagement"),
    U("P6", 6, "MC-CTRL", "Multi-channel controllers — 6 dialects"),
    U("P6", 7, "SWISS-GB", "Swiss guide-bushing clearance + bar feed coordination"),
    U("P6", 8, "TESTS-MT", "Regression — 8 parts × 4 machine types", { role: "R4", role_name: "Tester" }),
  ],
  gate: gate(["Mill-turn multi-channel G-code posts clean on Integrex/Cincom simulation"]),
});

// ── P7: Electrode Milling Pipeline (ELEC-PIPE-MS1 expansion) ─────
phases.push({
  id: "P7",
  title: "Electrode Milling Pipeline — Graphite + Copper + EDM Bridge",
  description:
    "Expands ELEC-PIPE-MS1 stub. Routes through MillMasterOrchestratorFacadeEngine + HyperMillEDMBridge.",
  sessions: "3",
  primary_role: "R2",
  primary_model: "sonnet-4.6",
  units: [
    U("P7", 1, "ELEC-GEOM", "ElectrodeGeometryEngine — extraction from CAD"),
    U("P7", 2, "GRAPHITE", "GraphiteMillingPhysics — dust, fragile edge, sacrificial tool"),
    U("P7", 3, "COPPER", "CopperElectrodeMilling — work-hardening avoidance"),
    U("P7", 4, "OVERBURN", "OverburnAllowance — EDM gap compensation (rough/skim/mirror)"),
    U("P7", 5, "STOCK", "ElectrodeStockManagement — family allocation + reuse tracking"),
    U("P7", 6, "EA12S", "Mitsubishi EA12S sinker EDM post dialect"),
    U("P7", 7, "BRIDGE", "ElectrodeMilling → SinkerEDM handoff via HyperMillEDMBridge"),
    U("P7", 8, "TESTS-EL", "Regression — 6 electrode families × 2 materials", { role: "R4", role_name: "Tester" }),
  ],
  gate: gate(["EDM gap compensation within ±5µm", "Mill-to-sinker handshake green"]),
});

// ── P8: Wear/Life/Thermal/GD&T (LATHE transferables) ─────────────
phases.push({
  id: "P8",
  title: "Wear/Life/Thermal/GD&T — Mill-Specific Adaptation of Lathe Patterns",
  description:
    "Endmill wear, spindle/table thermal, multi-axis offset coupling, GD&T perpendicularity/parallelism/composite.",
  sessions: "4",
  primary_role: "R2",
  primary_model: "sonnet-4.6",
  units: [
    U("P8", 1, "EM-WEAR", "EndmillWearProgressionEngine — flank/chip/fracture Weibull"),
    U("P8", 2, "EM-LIFE", "Taylor life for endmills — C exponent 0.2–0.35 by grade/coating"),
    U("P8", 3, "COATING", "Coating selection — TiN/TiAlN/CrN/DLC/ZrN vs material"),
    U("P8", 4, "TABLE-THERM", "Table thermal growth — α·L·ΔT comp"),
    U("P8", 5, "SPINDLE-THERM", "Spindle taper (BT30/40/50) growth + floating-bearing lag"),
    U("P8", 6, "OFFSET5", "Multi-axis offset coupling — X/Y/Z/A/B joint compensation"),
    U("P8", 7, "GDT", "GD&T — perpendicularity, parallelism, composite (profile+location)"),
    U("P8", 8, "RUNOUT", "Runout sources — spindle+fixture+clamping additive variance"),
    U("P8", 9, "TESTS-COMP", "Regression — thermal+GD&T on 8 part families", { role: "R4", role_name: "Tester" }),
  ],
  gate: gate(["Thermal comp within ±5µm of measured", "GD&T stack matches CMM within 10%"]),
});

// ── P9: Workholding + Fixtures (+RES-MS19) ───────────────────────
phases.push({
  id: "P9",
  title: "Workholding + Fixtures + Tombstone + Intelligent Fixture Selection",
  description:
    "Absorbs RES-MS19 (520+ assemblies + hyperMILL fixture automation via HyperMillFixtureArtifactGeneratorEngine).",
  sessions: "4",
  primary_role: "R2",
  primary_model: "sonnet-4.6",
  units: [
    U("P9", 1, "VISE-DB", "Vise DB — 50+ makes + soft-jaw handling"),
    U("P9", 2, "TOMBSTONE", "Tombstone DB — 30+ configs, A-axis balancing"),
    U("P9", 3, "ROTARY", "Rotary fixture DB — 4th/5th axis chucks, faceplates, indexers"),
    U("P9", 4, "CLAMP-FORCE", "ClampForceAnalyzer"),
    U("P9", 5, "FIX-SELECT", "IntelligentFixtureSelectionEngine — uses HyperMillFixtureArtifactGeneratorEngine"),
    U("P9", 6, "SETUP-SHEET", "Setup-sheet generator auto-draw"),
    U("P9", 7, "TESTS-FIX", "Regression — 50 JM Die real setup comparisons", { role: "R4", role_name: "Tester" }),
  ],
  gate: gate(["Fixture selection matches shop choice ≥ 80% on JM Die archive"]),
});

// ── P10: Quality + SPC + FAI + Compliance ────────────────────────
phases.push({
  id: "P10",
  title: "Quality + SPC + FAI + Compliance (AS9100/ISO13485/ITAR/FDA)",
  description: "Uses existing MastercamSPCBridge, MastercamFAIBridge, HyperMillSPCBridge, HyperMillFAIBridge.",
  sessions: "4",
  primary_role: "R2",
  primary_model: "sonnet-4.6",
  units: [
    U("P10", 1, "INLINE", "Inline inspection — Renishaw/Blum probe cycle gen"),
    U("P10", 2, "CMM", "CMM integration — Zeiss/Mitutoyo DMIS export"),
    U("P10", 3, "CPK", "Cpk/Ppk + Nelson rules chart per feature"),
    U("P10", 4, "FAI", "FAI AS9102 auto-report"),
    U("P10", 5, "ISO13485", "ISO 13485 medical traceability + 21 CFR 820"),
    U("P10", 6, "FDA-PART11", "FDA 21 CFR Part 11 — electronic record + e-sig"),
    U("P10", 7, "ITAR", "ITAR/EAR flagging + controlled-drawing vault"),
    U("P10", 8, "AUDIT", "Audit-log engine — immutable run history"),
    U("P10", 9, "TESTS-QUAL", "Regression — 20 parts through full QA chain", { role: "R4", role_name: "Tester" }),
  ],
  gate: gate(["FAI AS9102 passes Alcoa acceptance", "ITAR flagging 100% sensitivity on defense prints"]),
});

// ── P11: Cost + Shop Floor + ERP ─────────────────────────────────
phases.push({
  id: "P11",
  title: "Cost + Batch Economics + Shop Floor + ERP Integration",
  description: "DNC links (Haas/Hurco/Makino/Okuma), job state machine, ATC optimization, cost/part tracking.",
  sessions: "4",
  primary_role: "R2",
  primary_model: "sonnet-4.6",
  units: [
    U("P11", 1, "TOOL-COST", "Tool cost/part — endmill+insert amortization"),
    U("P11", 2, "ATC-OPT", "ATC retrieval optimization — carousel rotation minimization"),
    U("P11", 3, "BATCH", "Batch economics — tool reuse, residual life"),
    U("P11", 4, "DNC-HAAS", "DNC — Haas NGC + Hurco WinMax"),
    U("P11", 5, "DNC-OKUMA", "DNC — Okuma OSP-P300M + Makino PRO5/6"),
    U("P11", 6, "JOB-SM", "Job state machine — queued→setup→running→done"),
    U("P11", 7, "ERP", "ERP integration — SAP/Epicor/E2"),
    U("P11", 8, "TESTS-COST", "Regression — $/part vs JM Die actuals ±10%", { role: "R4", role_name: "Tester" }),
  ],
  gate: gate(["Cost predictions within ±10% of JM Die actuals on 20+ recent jobs"]),
});

// ── P12: AI Layer Wiring (engines exist — WIRE, not build) ───────
phases.push({
  id: "P12",
  title: "AI Layer Wiring — Deep Reasoning + Neural + RL + Meta-Learning (engines exist; wire them)",
  description:
    "AUDITED: MillingDeepReasoningEngine, MillingCriticalThinkingEngine, MillingMetaLearningEngine, MillingNeuralCognitiveEngine, MillComprehensiveNeuralEngine, MillingReinforcementLearningEngine, MillDeepLearningEngine, MillNeuralNetworkEngine, MillStrategyNeuralEngine, MillingHybridStrategySynthesizer, MillPatternMinerEngine, MillingProgramPatternEngine, MillingOnlineLearningTrackerEngine — ALL EXIST. This phase wires them through MillMasterOrchestratorFacadeEngine + millDispatcher and validates end-to-end.",
  sessions: "4",
  primary_role: "R1",
  primary_model: "opus-4.6",
  units: [
    U("P12", 1, "REASON-WIRE", "Wire MillingDeepReasoningEngine + MillingCriticalThinkingEngine through facade → millDispatcher (action: agi_reason)"),
    U("P12", 2, "META-WIRE", "Wire MillingMetaLearningEngine + MillingNeuralCognitiveEngine (action: meta_learn)"),
    U("P12", 3, "NN-WIRE", "Wire MillDeepLearningEngine + MillNeuralNetworkEngine + MillComprehensiveNeuralEngine (action: neural_predict)"),
    U("P12", 4, "RL-WIRE", "Wire MillingReinforcementLearningEngine + MillingOnlineLearningTrackerEngine (action: rl_optimize)"),
    U("P12", 5, "PATTERN-WIRE", "Wire MillPatternMinerEngine + MillingProgramPatternEngine + MillingStrategyLibraryEngine (action: pattern_mine)"),
    U("P12", 6, "SYNTH-WIRE", "Wire MillingHybridStrategySynthesizer + MillingDeepKnowledgeSynthesisEngine (action: strategy_synthesize)"),
    U("P12", 7, "TRACE-WIRE", "Wire MillingReasoningTraceLedgerEngine — every AI call writes a trace (action: trace_query)"),
    U("P12", 8, "AI-TESTS", "End-to-end AI test — 40 scenarios, each wired engine invoked through facade", { role: "R4", role_name: "Tester" }),
  ],
  gate: gate([
    "Every AI engine in MILL_ENGINE_REGISTRY callable via millDispatcher or aiReasoningDispatcher",
    "No AI engine called directly from web or dispatcher — all route through facade",
    "Trace ledger populated for all 40 test scenarios",
  ]),
});

// ── P13: Physics-Informed + Digital Twin Wiring ─────────────────
phases.push({
  id: "P13",
  title: "Physics-Informed AI + Digital Twin — Wire Existing + Gap-Fill",
  description:
    "MillingDigitalTwinEngine + MillingPhysicsKernelEngine EXIST. Wire them to OPC-UA/MTConnect, add Kalman fusion via SensorFusionEngine (exists) + RUL prediction. Minimal new engine creation.",
  sessions: "4",
  primary_role: "R1",
  primary_model: "opus-4.6",
  units: [
    U("P13", 1, "PINN-WIRE", "Wire MillingPhysicsKernelEngine — thermal + deflection + wear validation gates"),
    U("P13", 2, "CHIP", "MillChipFormationEngine — segmented vs continuous + evac force (NEW; checked against ENGINE_DIGEST first)"),
    U("P13", 3, "TWIN-SYNC", "Wire MillingDigitalTwinEngine to OPC-UA / MTConnect <100ms"),
    U("P13", 4, "KALMAN", "Wire SensorFusionEngine for mill EKF — force/temp/vib"),
    U("P13", 5, "RUL", "MillPredictiveMaintenanceEngine — RUL for spindle/cooling/servo (NEW)"),
    U("P13", 6, "ADAPT", "Wire AdaptiveMachiningIntegrationEngine + AdaptivePhysicsBridgeEngine for online S/F adaptation"),
    U("P13", 7, "TESTS-TWIN", "Regression — 10 live-machine replay scenarios", { role: "R4", role_name: "Tester" }),
  ],
  gate: gate(["Twin sync < 100ms p99", "RUL MAPE ≤ 15%"]),
});

// ── P14: Legacy Migration + Tribal Mining (CAD-COMPLETE inherit) ─
phases.push({
  id: "P14",
  title: "Legacy Migration + Customer Onboarding + Tribal Mining",
  description:
    "Mill .mcx/.mcx-8 parsers, DXF→feature, tribal-tip mining from 20K+ programs, customer intake extension for 100+ JM Die customers.",
  sessions: "5",
  primary_role: "R2",
  primary_model: "sonnet-4.6",
  units: [
    U("P14", 1, "MCX-V15", "Mastercam .mcx parser — v9–v15"),
    U("P14", 2, "MCX-8", "Mastercam .mcx-8 parser — 3,713 JM Die files"),
    U("P14", 3, "DXF-FEAT", "DXF → feature extraction — 1,445 legacy prints"),
    U("P14", 4, "NC-RECON", "NC-code reconstruction — legacy G-code → toolpath+strategy"),
    U("P14", 5, "TRIBAL-MINE", "Tribal tip mining — 20K+ programs → ≥ 1,200 mill-specific tips injected into MillTribalKnowledgeEngine"),
    U("P14", 6, "CUST-MILL", "Customer schema extension — mill-specific job templates"),
    U("P14", 7, "TESTS-LEG", "Regression — parse 500 legacy programs, round-trip ≥ 95%", { role: "R4", role_name: "Tester" }),
  ],
  gate: gate(["≥ 95% of 20K+ JM Die mill programs parse cleanly"]),
});

// ── P15: hyperMILL AC + Fusion Automation + SDK ─────────────────
phases.push({
  id: "P15",
  title: "hyperMILL Automation Center + Fusion Automation + SDK Deep Integration",
  description:
    "Absorbs RES-MS23. Leverages EXISTING HyperMillACConnectionManager, HyperMillACScriptExecutor, HyperMillJobMonitor, HyperMillMacroDBEngine, HyperMillACStandardToolDBEngine, HyperMillPPPFileWriter. Deep SDK integration (2,110 Python scripts indexed) + drawing-template learning (272 .idw) + macro conversion (15,504 → parametric).",
  sessions: "4",
  primary_role: "R2",
  primary_model: "sonnet-4.6",
  units: [
    U("P15", 1, "AC-SEQ", "hyperMILL AC sequence control — job tree + dependency resolution"),
    U("P15", 2, "SDK-INDEX", "hyperMILL SDK index — 2,110 Python scripts categorized"),
    U("P15", 3, "IDW-LEARN", "Inventor .idw drawing-template learning — 272 examples"),
    U("P15", 4, "NC-FMT", "NC output-format understanding — NcGenerator + Report Generator"),
    U("P15", 5, "MACRO-CONV", "Macro conversion — 15,504 hardcoded → 8-12 parametric families"),
    U("P15", 6, "AUTO-JOB", "Automated job pipeline — print→program closed loop (Excel macro bridge)"),
    U("P15", 7, "VSIX", "hyperMILL .vsix extension integration + handshake"),
    U("P15", 8, "TESTS-HM", "Regression — 20 hyperMILL jobs end-to-end", { role: "R4", role_name: "Tester" }),
  ],
  gate: gate(["hyperMILL AC round-trip: PRISM-gen → hyperMILL → NC exact"]),
});

// ── P17: Ingestion / Learning Bus Wiring (10-agent audit finding) ─
phases.push({
  id: "P17",
  title: "Ingestion + Learning Bus Wiring — 7 Mill Connectors (close ingestion synergy gap)",
  description:
    "10-agent audit (Agent 4) found 50% ingestion synergy. Seven ingestion pipelines exist (pdf-learn, video-learn, shop-knowledge, blueprint-read, pattern-search, acquire-models, hive-mind, customer-onboarding, outcome-logging, JM Die mining) but only 2 are fully wired to mill. This phase creates the 7 mill-side connectors that bring synergy to 100%.",
  sessions: "4",
  primary_role: "R2",
  primary_model: "sonnet-4.6",
  units: [
    U("P17", 1, "BP-BRIDGE", "MillBlueprintIntegrationEngine — /blueprint-read → MillMasterOrchestratorFacadeEngine (CAD constraints → strategy layer)", {
      deliverables: [
        { path: "mcp-server/src/engines/MillBlueprintIntegrationEngine.ts", type: "source", description: "Subscribes to blueprint-read output; injects dimensional constraints + GD&T + material callouts into MillingPrintToProgramEngine.", line_count_est: 280 },
      ],
    }),
    U("P17", 2, "PATTERN-SYNC", "MillPatternSyncEngine — ReasoningBank patterns → MillingHybridStrategySynthesizer + facade", {
      deliverables: [
        { path: "mcp-server/src/engines/MillPatternSyncEngine.ts", type: "source", description: "Pulls top-K patterns from ReasoningBank (pattern-search + pattern-store) and feeds them to strategy synthesizer as heuristic priors.", line_count_est: 260 },
      ],
    }),
    U("P17", 3, "MODEL-LOAD", "MillModelLoaderEngine — /acquire-models → MillingInferenceOrchestratorEngine (dynamic ONNX/WASM model load)", {
      deliverables: [
        { path: "mcp-server/src/engines/MillModelLoaderEngine.ts", type: "source", description: "Lazy-loads ONNX/WASM neural models on demand for MillNeuralNetworkEngine + MillComprehensiveNeuralEngine; LRU cache with memory pressure eviction.", line_count_est: 320 },
      ],
    }),
    U("P17", 4, "HIVE-BRIDGE", "MillHiveMindBridgeEngine — claude-flow HiveMind consensus → mill replan cycle", {
      deliverables: [
        { path: "mcp-server/src/engines/MillHiveMindBridgeEngine.ts", type: "source", description: "Subscribes to HiveMind consensus broadcasts; injects multi-agent decisions into MillMasterOrchestratorFacadeEngine replan triggers.", line_count_est: 240 },
      ],
    }),
    U("P17", 5, "CUST-LEARN", "MillCustomerLearningEngine — /my-shop customer onboarding → MillingStrategyLibraryEngine (customer affinity)", {
      deliverables: [
        { path: "mcp-server/src/engines/MillCustomerLearningEngine.ts", type: "source", description: "Indexes 100+ JM Die customers (ITW, Alcoa, Optimas, SFS, Holo-Krome) with per-customer tribal tips + strategy preferences + material preferences.", line_count_est: 340 },
      ],
    }),
    U("P17", 6, "OUTCOME-REPLAN", "MillOutcomeReplanEngine — /outcome + post-task trajectory → mill heuristics (closed feedback loop)", {
      deliverables: [
        { path: "mcp-server/src/engines/MillOutcomeReplanEngine.ts", type: "source", description: "Captures predicted-vs-actual deltas from CNC runs; updates MillProgramOptimizerEngine weights + MillStrategyNeuralEngine training buffer.", line_count_est: 360 },
      ],
    }),
    U("P17", 7, "JMDIE-REFRESH", "MillJMDieRefreshEngine — real-time JM Die program inventory sync (replaces static 53-customer snapshot)", {
      deliverables: [
        { path: "mcp-server/src/engines/MillJMDieRefreshEngine.ts", type: "source", description: "Watches H:/PRISM/JM DIE/ directory; updates MillAISelfAwarenessIntegrationEngine JM_DIE_HAAS_MILL_CUSTOMERS registry on file changes; incremental tribal mining on new programs.", line_count_est: 380 },
      ],
    }),
    U("P17", 8, "ING-WIRE", "Wire all 7 connectors into MillMasterOrchestratorFacadeEngine + millDispatcher actions", {
      role: "R1", role_name: "Systems Architect",
      deliverables: [
        { path: "mcp-server/src/engines/MillMasterOrchestratorFacadeEngine.ts", type: "source", description: "Add 7 new routes: blueprint_bridge, pattern_sync, model_load, hive_sync, customer_learn, outcome_replan, jmdie_refresh.", line_count_est: 140 },
      ],
    }),
    U("P17", 9, "ING-TESTS", "End-to-end ingestion flow test — 7 pipelines × 3 scenarios = 21 tests", { role: "R4", role_name: "Tester" }),
  ],
  gate: gate(["All 7 ingestion pipelines round-trip through mill facade", "Synergy score 100% per audit rubric"]),
});

// ── P18: Tribal Centralization + Playbook Enforcement + Writeback ─
phases.push({
  id: "P18",
  title: "Tribal Centralization + Playbook Runtime Enforcement + Operator Writeback",
  description:
    "Agent 5 audit findings: tribal tips are fragmented across 5+ files (MillTribalKnowledgeEngine, MillTribalIntegrationEngine, extracted-knowledge JSON, lathe-tribal-tips, JM Die programs). 296 playbook rules exist but runtime enforcement is unverified. No operator writeback path. This phase unifies everything.",
  sessions: "4",
  primary_role: "R2",
  primary_model: "sonnet-4.6",
  units: [
    U("P18", 1, "TRIBAL-REG", "TribalKnowledgeRegistry — single source of truth (imports from MillTribalKnowledgeEngine, MillTribalIntegrationEngine, extracted-knowledge/*.json, lathe-tribal-tips-okuma.ts, JM Die programs)", {
      deliverables: [
        { path: "mcp-server/src/registries/TribalKnowledgeRegistry.ts", type: "source", description: "Unified singleton with de-duplication logic. Indexes all 4,493+ tips with machine/material/cam/customer filters.", line_count_est: 520 },
      ],
    }),
    U("P18", 2, "PLAYBOOK-RT", "Implement runtime playbook enforcement — PlaybookRulesEngine.enforce(context) called from MillingEndToEndOrchestrationEngine PLANNING stage", {
      deliverables: [
        { path: "mcp-server/src/engines/PlaybookRulesEngine.ts", type: "source", description: "Add enforce() method that evaluates conditions + severity filtering + emits violations; wire into PLANNING stage.", line_count_est: 260 },
      ],
    }),
    U("P18", 3, "REGISTRY-SYNC", "Observer pattern — MillTribalKnowledgeEngine.add() triggers MillAISelfAwarenessIntegrationEngine registry update", {
      deliverables: [
        { path: "mcp-server/src/engines/MillTribalKnowledgeEngine.ts", type: "source", description: "Add event emitter; MillAISelfAwarenessIntegrationEngine subscribes.", line_count_est: 120 },
      ],
    }),
    U("P18", 4, "CUST-WISDOM", "Customer-specific wisdom — link ShopConfigurationEngine customer profiles to TribalKnowledgeRegistry customer_preference filter", {
      deliverables: [
        { path: "mcp-server/src/registries/TribalKnowledgeRegistry.ts", type: "source", description: "Add TribalQuery.customer_preference field + per-customer indexing.", line_count_est: 80 },
      ],
    }),
    U("P18", 5, "OPERATOR-WB", "Operator writeback — CNC log parser → auto-generate tribal tips from successful deviations", {
      deliverables: [
        { path: "mcp-server/src/engines/CNCLogParserEngine.ts", type: "source", description: "Parses actual vs planned S/F/DOC from CNC logs; generates candidate tribal tips for human review + auto-approves >0.90 confidence.", line_count_est: 420 },
      ],
    }),
    U("P18", 6, "TRIBAL-TESTS", "Tribal consistency test — every tip applied at least once across print-to-program scenarios", { role: "R4", role_name: "Tester" }),
  ],
  gate: gate([
    "Zero orphan tribal tips (every tip reachable via TribalKnowledgeRegistry)",
    "Playbook runtime enforcement emits audit trail for every job",
    "Operator writeback generates ≥10 new tips from 100 CNC log fixtures",
  ]),
});

// ── P0b: MillStudio Rich Components (Loop 3 — Agent 8: WEDM has 15 components) ─
phases.push({
  id: "P0b",
  title: "MillStudio Rich Components — WEDM-parity (WizardShell, LiveSim, ReasoningTrace, Blackboard, Autonomy, Feedback)",
  description:
    "Agent 8 flagged P0 has 3 studio units vs WEDM's 15 components. Add the 12 missing rich components so MillStudio reaches parity with WireEdmStudioPage + LatheStudioPage — wizard shell, live sim canvas, AI reasoning tab, reasoning trace dashboard, blackboard panel, feedback panel, autonomy panel, per-step error boundaries, info tips, KPI dashboard, operation list, feature tree.",
  sessions: "3",
  primary_role: "R2",
  primary_model: "sonnet-4.6",
  scrutiny_checkpoint: true,
  units: [
    U("P0b", 1, "WIZARD-SHELL", "WizardShell + step panels (StepImport/Features/Strategy/Tooling/Params/Program) parity with WedmStudio", {
      deliverables: [
        { path: "mcp-server/web/src/components/mill-studio/WizardShell.tsx", type: "source", description: "Step-gated wizard shell with breadcrumb + validation; mirrors WedmStudio WizardShell.", line_count_est: 320 },
        { path: "mcp-server/web/src/components/mill-studio/StepImport.tsx", type: "source", description: "Print/STEP/SLDPRT import step.", line_count_est: 180 },
        { path: "mcp-server/web/src/components/mill-studio/StepStrategy.tsx", type: "source", description: "Strategy selection step.", line_count_est: 200 },
        { path: "mcp-server/web/src/components/mill-studio/StepProgram.tsx", type: "source", description: "Program generation + preview step.", line_count_est: 220 },
      ],
    }),
    U("P0b", 2, "LIVE-SIM", "LiveSimViewer + collision/force/thermal overlay canvas", {
      deliverables: [
        { path: "mcp-server/web/src/components/mill-studio/LiveSimViewer.tsx", type: "source", description: "Three.js canvas with per-block S/F physics overlay; mirrors WedmStudio ProfileCanvas pattern.", line_count_est: 420 },
      ],
    }),
    U("P0b", 3, "AI-REASON-TABS", "AIReasoningTab + ReasoningTraceDashboard + BlackboardPanel", {
      deliverables: [
        { path: "mcp-server/web/src/components/mill-studio/AIReasoningTab.tsx", type: "source", description: "Live AI reasoning display from MillingReasoningTraceLedgerEngine.", line_count_est: 240 },
        { path: "mcp-server/web/src/components/mill-studio/ReasoningTraceDashboard.tsx", type: "source", description: "Time-series reasoning trace with drill-down.", line_count_est: 320 },
        { path: "mcp-server/web/src/components/mill-studio/BlackboardPanel.tsx", type: "source", description: "Multi-agent blackboard state viewer.", line_count_est: 260 },
      ],
    }),
    U("P0b", 4, "FEEDBACK-AUTO", "FeedbackPanel + AutonomyPanel + InfoTip + StepErrorCard + KPIDashboard", {
      deliverables: [
        { path: "mcp-server/web/src/components/mill-studio/FeedbackPanel.tsx", type: "source", description: "Operator feedback capture → MillTribalKnowledgeEngine.", line_count_est: 220 },
        { path: "mcp-server/web/src/components/mill-studio/AutonomyPanel.tsx", type: "source", description: "Autonomy-level selector (L0..L4) with gate visualization.", line_count_est: 180 },
        { path: "mcp-server/web/src/components/mill-studio/InfoTip.tsx", type: "source", description: "Tribal-tip surface tooltip.", line_count_est: 120 },
        { path: "mcp-server/web/src/components/mill-studio/StepErrorCard.tsx", type: "source", description: "Per-step ErrorBoundary display.", line_count_est: 140 },
        { path: "mcp-server/web/src/components/mill-studio/KPIDashboard.tsx", type: "source", description: "Cycle-time / MRR / tool-life KPI cards.", line_count_est: 200 },
      ],
    }),
    U("P0b", 5, "OPS-FEATURES", "OperationList + FeatureTree + ToolPanel + ProgramHistory", {
      deliverables: [
        { path: "mcp-server/web/src/components/mill-studio/OperationList.tsx", type: "source", description: "Editable operation list with drag-reorder.", line_count_est: 240 },
        { path: "mcp-server/web/src/components/mill-studio/FeatureTree.tsx", type: "source", description: "Hierarchical feature tree from CAD.", line_count_est: 280 },
        { path: "mcp-server/web/src/components/mill-studio/ToolPanel.tsx", type: "source", description: "Tool inventory + JM Die live lookup.", line_count_est: 240 },
        { path: "mcp-server/web/src/components/mill-studio/ProgramHistory.tsx", type: "source", description: "Past programs with diff viewer.", line_count_est: 220 },
      ],
    }),
    U("P0b", 6, "HOOKS", "useMillNavigation + useMillData + useMillStatus (parity with lathe hooks)", {
      deliverables: [
        { path: "mcp-server/web/src/hooks/useMillNavigation.ts", type: "source", description: "Mirrors useLatheNavigation.", line_count_est: 140 },
        { path: "mcp-server/web/src/hooks/useMillData.ts", type: "source", description: "Mirrors useLatheData.", line_count_est: 160 },
        { path: "mcp-server/web/src/hooks/useMillStatus.ts", type: "source", description: "Mirrors useLatheStatus.", line_count_est: 120 },
      ],
    }),
    U("P0b", 7, "PARITY-TESTS", "Component parity tests — every WedmStudio component has Mill counterpart", {
      role: "R4", role_name: "Tester",
      deliverables: [
        { path: "mcp-server/web/src/__tests__/mill-studio-parity.test.tsx", type: "test", description: "Asserts 15+ mill-studio components exist and render; per-component visual regression snapshots.", line_count_est: 400 },
      ],
    }),
  ],
  gate: gate(["15+ mill-studio components render clean", "Parity matrix vs WedmStudio + LatheStudio = 100% coverage"]),
});

// ── P19: PRISM Master AI Compliance Enforcement (Loop 2 — Agent 9 CRITICAL) ─
phases.push({
  id: "P19",
  title: "PRISM Master AI Compliance Enforcement — Router Gate + Bypass Eradication",
  description:
    "Agent 9 audit (score 2/10): routes/milling.ts has 6 direct facade bypasses + millDispatcher (P1) is not yet protected by a router gate. Build PRISMMillMasterRouterEngine that wraps every mill MCP action, validates it routed through PRISMSelfAwarenessEngine.recommendMillFeatures, and HARD-BLOCKS direct engine access. Pair with a static analyzer that fails CI on any routes/*.ts importing from src/engines/Mill*.ts directly.",
  sessions: "3",
  primary_role: "R1",
  primary_model: "opus-4.6",
  scrutiny_checkpoint: true,
  scrutiny_focus: ["Router enforcement coverage", "CI-level bypass blocker", "Audit ledger completeness"],
  units: [
    U("P19", 1, "ROUTER", "PRISMMillMasterRouterEngine — request guard + recommendation enforcer", {
      role: "R1", model: "opus-4.6", effort: 95,
      deliverables: [
        { path: "mcp-server/src/engines/PRISMMillMasterRouterEngine.ts", type: "source", description: "Wraps every mill action: validates PRISMSelfAwarenessEngine.recommendMillFeatures was called, checks MillMasterOrchestratorFacadeEngine is the entry, denies on bypass, emits audit ledger.", line_count_est: 540 },
      ],
    }),
    U("P19", 2, "DISPATCH-WIRE", "Wire router into millDispatcher + camDispatcher (mill actions)", {
      deliverables: [
        { path: "mcp-server/src/tools/dispatchers/millDispatcher.ts", type: "source", description: "Every action passes through prismMillMasterRouterEngine.gate() before reaching the facade.", line_count_est: 80 },
      ],
    }),
    U("P19", 3, "ROUTES-FIX", "Eradicate 6 direct-engine bypasses in routes/milling.ts", {
      deliverables: [
        { path: "mcp-server/src/routes/milling.ts", type: "source", description: "Replace direct engine imports (MillingPrintToProgramEngine, etc.) with millDispatcher.dispatch() calls. Audit-grade.", line_count_est: 220 },
      ],
    }),
    U("P19", 4, "STATIC-CHECK", "ESLint + ts-morph static checker — fail CI on any routes/*.ts importing src/engines/Mill*.ts", {
      deliverables: [
        { path: "mcp-server/scripts/check-mill-bypass.mjs", type: "script", description: "Scans routes/*.ts; flags direct mill engine imports; exit 1 on findings.", line_count_est: 160 },
        { path: ".github/workflows/mill-bypass-check.yml", type: "config", description: "CI job (GitHub Actions YAML) running scripts/check-mill-bypass.mjs on PR.", line_count_est: 30 },
      ],
      creates_script: true,
    }),
    U("P19", 5, "AUDIT-LEDGER", "MillMasterAuditLedger — every gated request persisted; replay tool", {
      deliverables: [
        { path: "mcp-server/src/engines/MillMasterAuditLedgerEngine.ts", type: "source", description: "Append-only ledger; supports replay + drift detection.", line_count_est: 380 },
        { path: "mcp-server/data/state/mill-master-audit-ledger.jsonl", type: "state", description: "Persistent ledger.", line_count_est: 0 },
      ],
    }),
    U("P19", 6, "COMPLIANCE-TEST", "Compliance suite — 50 hostile test inputs that try to bypass router; all blocked", { role: "R4", role_name: "Tester" }),
  ],
  gate: gate(["Zero direct mill-engine imports outside dispatchers/engines/", "Router gates 100% of mill MCP actions", "Audit ledger replay round-trip clean"]),
});

// ── P20: State Persistence + Calibration (Loop 2 — Agent 1) ──────
phases.push({
  id: "P20",
  title: "State Persistence + Calibration — Cross-Session Mill Memory",
  description:
    "Agent 1 audit found 9 mill state-persistence gaps. Add ReasoningBank replay, tribal registration delta, CAD binary parser cache, calibration state (per-machine kc/Taylor offsets), SPC state, playbook evolution snapshot, customer-material matrix, operation coverage telemetry, and anomaly pattern store. All schema-versioned + hot-loadable into MillMasterOrchestratorFacadeEngine.",
  sessions: "4",
  primary_role: "R2",
  primary_model: "sonnet-4.6",
  scrutiny_checkpoint: true,
  scrutiny_focus: ["Schema-version migration paths", "Cross-session round-trip", "Hot-reload safety"],
  units: [
    U("P20", 1, "REASONING-REPLAY", "ReasoningBankReplayEngine — replay mill reasoning traces with intermediate snapshots", {
      deliverables: [
        { path: "mcp-server/src/engines/ReasoningBankReplayEngine.ts", type: "source", description: "Loads MillingReasoningTraceLedgerEngine traces; replays through deterministic harness.", line_count_est: 360 },
      ],
    }),
    U("P20", 2, "TRIBAL-DELTA", "MillTribalRegistrationDeltaEngine — diff tribal registry per session, persist to data/state/MILL-MASTER/tribal-delta.jsonl", {
      deliverables: [
        { path: "mcp-server/src/engines/MillTribalRegistrationDeltaEngine.ts", type: "source", description: "Tracks add/update/remove of tribal tips; emits delta ledger.", line_count_est: 240 },
      ],
    }),
    U("P20", 3, "CAD-CACHE", "CADBinaryParserCacheEngine — content-addressed cache for parsed STEP/SLDPRT/IPT/F3D", {
      deliverables: [
        { path: "mcp-server/src/engines/CADBinaryParserCacheEngine.ts", type: "source", description: "SHA-256 keyed; LRU eviction; persists to data/state/MILL-MASTER/cad-cache/.", line_count_est: 280 },
      ],
    }),
    U("P20", 4, "CALIB-STATE", "MillCalibrationStateEngine — per-machine kc/Taylor/wear offsets persisted + applied at runtime", {
      deliverables: [
        { path: "mcp-server/src/engines/MillCalibrationStateEngine.ts", type: "source", description: "Loads per-machine offsets from data/state/MILL-MASTER/calibration/{machine_id}.json; applies to KienzleForceModelEngine + ToolWearProgressionEngine.", line_count_est: 320 },
      ],
    }),
    U("P20", 5, "SPC-STATE", "MillSPCStateEngine — SPC chart state + Nelson rules per part-family persisted", {
      deliverables: [
        { path: "mcp-server/src/engines/MillSPCStateEngine.ts", type: "source", description: "Wraps SPCProcessCapabilityEngine + NelsonSPCRulesEngine; persists xbar/r charts per part-family.", line_count_est: 280 },
      ],
    }),
    U("P20", 6, "PLAYBOOK-EVO", "MillPlaybookEvolutionEngine — versioned playbook snapshots + revert", {
      deliverables: [
        { path: "mcp-server/src/engines/MillPlaybookEvolutionEngine.ts", type: "source", description: "Snapshots PlaybookRulesRegistry on each rule add/edit; supports revert + diff.", line_count_est: 220 },
      ],
    }),
    U("P20", 7, "CUST-MATRIX", "CustomerMaterialMatrixEngine — JM Die customer × material × strategy matrix from program archive mining", {
      deliverables: [
        { path: "mcp-server/src/engines/CustomerMaterialMatrixEngine.ts", type: "source", description: "Builds 100×40 matrix from JM Die archive; exposes lookups for QuoteAutopilotEngine + recommendStrategy().", line_count_est: 340 },
      ],
    }),
    U("P20", 8, "OP-COVERAGE", "MillOperationCoverageTelemetryEngine — per-action coverage % vs ground truth", {
      deliverables: [
        { path: "mcp-server/src/engines/MillOperationCoverageTelemetryEngine.ts", type: "source", description: "Telemetry: which ToolpathStrategyRegistry strategies actually fired; flags stale/orphan.", line_count_est: 200 },
      ],
    }),
    U("P20", 9, "ANOM-STORE", "MillAnomalyPatternStoreEngine — record + classify mill anomalies for AnomalyDetection", {
      deliverables: [
        { path: "mcp-server/src/engines/MillAnomalyPatternStoreEngine.ts", type: "source", description: "Stores chatter/wear/thermal/dimensional anomalies; pattern-mines to playbook candidates.", line_count_est: 260 },
      ],
    }),
  ],
  gate: gate(["Every state engine has schemaVersion + N-1 migration", "Cross-session round-trip green for all 9", "Hot-reload preserves in-flight mill jobs"]),
});

// ── P21: Registries + Hooks + MCP Hardening (Loop 2 — Agents 4, 5, 6) ─
phases.push({
  id: "P21",
  title: "Registries + Hooks + MCP Hardening — Mill-Specific Filters, Safety Hooks, Auto-Discovery",
  description:
    "Agent 4 (registries): 7 mill-specific filter helpers. Agent 5 (hooks): 5 mill-only safety hooks. Agent 6 (MCP): 5 dispatcher auto-discovery + schema reflection units to prevent MCP-action drift. All consumed by millDispatcher + MillMasterOrchestratorFacadeEngine.",
  sessions: "4",
  primary_role: "R2",
  primary_model: "sonnet-4.6",
  scrutiny_checkpoint: true,
  scrutiny_focus: ["Hook firing on real-world inputs", "Auto-discovery accuracy", "Registry filter performance"],
  units: [
    U("P21", 1, "REG-MAT-MILL", "MaterialRegistry.forMill() — mill-specific filter (drop materials w/o kc1.1, mc, hardness)", {
      deliverables: [
        { path: "mcp-server/src/registries/MaterialRegistry.ts", type: "source", description: "Add forMill() returning only materials with full Kienzle dataset.", line_count_est: 60 },
      ],
    }),
    U("P21", 2, "REG-TOOL-MILL", "ToolRegistry.filterByType('mill') + ToolHolderCompatibilityMatrix", {
      deliverables: [
        { path: "mcp-server/src/registries/ToolRegistry.ts", type: "source", description: "Add filterByType + holderCompat() lookups.", line_count_est: 80 },
        { path: "mcp-server/src/registries/ToolHolderCompatibilityMatrix.ts", type: "source", description: "BT/CAT/HSK/Capto × tool-shank matrix.", line_count_est: 220 },
      ],
    }),
    U("P21", 3, "REG-JM-INV", "JMDieInventoryRegistry — wired to JM Die tool/material/holder inventory CSVs", {
      deliverables: [
        { path: "mcp-server/src/registries/JMDieInventoryRegistry.ts", type: "source", description: "Loads JM Die actual on-hand inventory; powers QuoteAutopilotEngine availability check.", line_count_est: 280 },
      ],
    }),
    U("P21", 4, "REG-COAT-STEEL", "CoatingPerformanceMatrix + SteelGradeMillStrategy + GraphiteEDMToolSubset", {
      deliverables: [
        { path: "mcp-server/src/registries/CoatingPerformanceMatrix.ts", type: "source", description: "AlTiN/TiAlN/AlCrN × material × cutting-condition wear-rate matrix.", line_count_est: 200 },
        { path: "mcp-server/src/registries/SteelGradeMillStrategy.ts", type: "source", description: "M2/D2/S7/A2/H13 → recommended roughing/finishing strategies.", line_count_est: 180 },
        { path: "mcp-server/src/registries/GraphiteEDMToolSubset.ts", type: "source", description: "Graphite electrode milling tool subset (specific geometry/coating).", line_count_est: 120 },
      ],
    }),
    U("P21", 5, "HOOK-KIENZLE", "Hook: kienzle-coefficient-gate — block any cut using non-canonical kc1.1", {
      deliverables: [
        { path: "mcp-server/src/hooks/MillKienzleCoefficientGateHook.ts", type: "hook", description: "Asserts kc1.1 imported from src/physics/constants.ts; hard-blocks inline values.", line_count_est: 140 },
      ],
      creates_hook: true,
    }),
    U("P21", 6, "HOOK-MAT-MACH", "Hook: material-machine-compat — block incompatible material/machine pair (e.g. graphite on aluminum mill w/o coolant guard)", {
      deliverables: [
        { path: "mcp-server/src/hooks/MillMaterialMachineCompatHook.ts", type: "hook", description: "Cross-references MachineRegistry capability + MaterialRegistry constraints.", line_count_est: 160 },
      ],
      creates_hook: true,
    }),
    U("P21", 7, "HOOK-THERMAL", "Hook: thermal-ceiling-warn — warn if predicted T > material recrystallization", {
      deliverables: [
        { path: "mcp-server/src/hooks/MillThermalCeilingWarnHook.ts", type: "hook", description: "Calls ThermalWearCouplingEngine; warns/blocks above material-specific T_max.", line_count_est: 140 },
      ],
      creates_hook: true,
    }),
    U("P21", 8, "HOOK-DEFL-FINISH", "Hook: deflection-finish-gate — block finishing pass if predicted deflection > tolerance", {
      deliverables: [
        { path: "mcp-server/src/hooks/MillDeflectionFinishGateHook.ts", type: "hook", description: "Calls ToolDeflectionEngine + PartDeflectionEngine; gates finishing strategy selection.", line_count_est: 160 },
      ],
      creates_hook: true,
    }),
    U("P21", 9, "HOOK-LIVE-TOOL", "Hook: live-tool-sync-coordination — mill-turn live tool spindle coord vs main spindle", {
      deliverables: [
        { path: "mcp-server/src/hooks/MillLiveToolSyncHook.ts", type: "hook", description: "Validates phase angle + sync between live tool and main spindle.", line_count_est: 120 },
      ],
      creates_hook: true,
    }),
    U("P21", 10, "MCP-DISCOVER", "Dispatcher auto-discovery — scan src/tools/dispatchers/, register actions, generate annotation map", {
      deliverables: [
        { path: "mcp-server/src/engines/DispatcherAutoDiscoveryEngine.ts", type: "source", description: "AST-walks dispatcher files; emits actions catalog + parameter schema.", line_count_est: 320 },
      ],
    }),
    U("P21", 11, "MCP-SCHEMA-REFLECT", "Schema reflection middleware — every dispatcher action exposes Zod schema via /schema endpoint", {
      deliverables: [
        { path: "mcp-server/src/middleware/schemaReflectionMiddleware.ts", type: "source", description: "Express middleware exposing dispatcher schemas (mill-first).", line_count_est: 180 },
      ],
    }),
    U("P21", 12, "MCP-WATCH", "File watcher + hot-register — on dispatcher file save, re-register actions w/o restart", {
      deliverables: [
        { path: "mcp-server/src/engines/DispatcherHotRegisterEngine.ts", type: "source", description: "Chokidar watches src/tools/dispatchers/; debounced re-register.", line_count_est: 220 },
      ],
    }),
    U("P21", 13, "MCP-AUDIT", "Registration audit tool — diff registered MCP actions vs source dispatchers; report drift", {
      deliverables: [
        { path: "mcp-server/scripts/audit-mcp-registration.mjs", type: "script", description: "CLI tool reporting orphan or unregistered actions.", line_count_est: 200 },
      ],
      creates_script: true,
    }),
  ],
  gate: gate(["All 5 mill hooks fire on adversarial inputs", "Auto-discovery matches manual registration 100%", "Zero MCP-action drift after watcher integration"]),
});

// ── P22: Documentation + Mill Reference Index (Loop 2 — Agent 8) ──
phases.push({
  id: "P22",
  title: "Mill Documentation + Reference Index — Self-Awareness Surface",
  description:
    "Agent 8 audit: mill capabilities lack a discoverable surface. Build mill command registry, mill AI self-awareness directive, mill dispatcher integration guide, and mill engine reference index — all consumed by PRISMSelfAwarenessEngine.recommendMillFeatures + future onboarding.",
  sessions: "2",
  primary_role: "R2",
  primary_model: "sonnet-4.6",
  scrutiny_checkpoint: false,
  units: [
    U("P22", 1, "CMD-REGISTRY", "Mill command registry — auto-generated from .claude/commands/mill-*.md", {
      deliverables: [
        { path: "mcp-server/data/docs/MILL_COMMAND_REGISTRY.md", type: "doc", description: "All /mill-* commands with args, examples, related engines.", line_count_est: 380 },
        { path: "mcp-server/scripts/build-mill-command-registry.mjs", type: "script", description: "Regenerator script; runs on SessionStart hook.", line_count_est: 160 },
      ],
      creates_script: true,
    }),
    U("P22", 2, "AI-DIRECTIVE", "Mill AI self-awareness directive — state/shared/MILL-AI-SELF-AWARENESS-DIRECTIVE.md", {
      deliverables: [
        { path: "state/shared/MILL-AI-SELF-AWARENESS-DIRECTIVE.md", type: "doc", description: "Mill-specific directive: facade chain, AGI engines, registry, recommended patterns.", line_count_est: 460 },
      ],
    }),
    U("P22", 3, "DISPATCH-GUIDE", "Mill dispatcher integration guide — how to call millDispatcher from web/CLI/MCP", {
      deliverables: [
        { path: "mcp-server/data/docs/MILL_DISPATCHER_INTEGRATION_GUIDE.md", type: "doc", description: "End-to-end examples + schema references + bypass-blocking rules.", line_count_est: 520 },
      ],
    }),
    U("P22", 4, "ENG-INDEX", "Mill engine reference index — 1-line per engine, generated digest", {
      deliverables: [
        { path: "mcp-server/data/docs/MILL_ENGINE_DIGEST.md", type: "doc", description: "All Mill*/Milling*/MillTurn*/FiveAxis*/MultiAxis* engines with 1-line description + facade route.", line_count_est: 600 },
        { path: "mcp-server/scripts/build-mill-engine-digest.mjs", type: "script", description: "Walks src/engines/, filters mill-related, emits digest.", line_count_est: 180 },
      ],
      creates_script: true,
    }),
  ],
  gate: gate(["All 4 docs render clean + cross-link", "Auto-generators run on SessionStart hook"]),
});

// ── P14b: JM Die Deep Mining (Loop 2 — Agent 2 expansion) ────────
phases.push({
  id: "P14b",
  title: "JM Die Deep Mining — HNSW Archive + Recipe Aggregation + Semantic Lookup",
  description:
    "Agent 2 found JM Die archive (24,545 programs) is read-but-not-mined. Add HNSW archive indexing, persistent tribal mining ledger, recipe aggregation pipeline, semantic recipe lookup refactor.",
  sessions: "3",
  primary_role: "R2",
  primary_model: "sonnet-4.6",
  scrutiny_checkpoint: true,
  units: [
    U("P14b", 1, "HNSW-INDEX", "ArchiveIndexingEngine — HNSW vector index across 24,545 JM Die programs", {
      deliverables: [
        { path: "mcp-server/src/engines/JMDieArchiveIndexingEngine.ts", type: "source", description: "Builds HNSW (hierarchical nav small-world) index keyed on operation-sequence + material + machine; <50ms semantic lookup.", line_count_est: 480 },
      ],
    }),
    U("P14b", 2, "TRIBAL-PERSIST", "TribalMiningPersistence — every mined tip persisted with provenance to source program", {
      deliverables: [
        { path: "mcp-server/src/engines/TribalMiningPersistenceEngine.ts", type: "source", description: "Append-only ledger: tip + source program + miner version + confidence.", line_count_est: 300 },
      ],
    }),
    U("P14b", 3, "RECIPE-AGGR", "RecipeAggregationPipeline — group similar programs, distill canonical recipes per part-family", {
      deliverables: [
        { path: "mcp-server/src/engines/RecipeAggregationPipelineEngine.ts", type: "source", description: "Clusters programs via HNSW + DBSCAN; distills canonical recipe with variance bounds.", line_count_est: 420 },
      ],
    }),
    U("P14b", 4, "SEM-LOOKUP", "SemanticRecipeLookup refactor — query-time semantic match against recipe corpus", {
      deliverables: [
        { path: "mcp-server/src/engines/SemanticRecipeLookupEngine.ts", type: "source", description: "Replaces keyword lookup with embedding-based semantic match; integrates with QuoteAutopilotEngine.", line_count_est: 320 },
      ],
    }),
  ],
  gate: gate(["HNSW lookup p99 < 50ms across 24,545 programs", "Recipe aggregation produces ≥30 canonical recipes", "Semantic lookup outperforms keyword on JM Die test set by ≥40%"]),
});

// ── P2b: CAM Export Parity (Loop 5 — A2: 40 missing export cells) ──
phases.push({
  id: "P2b",
  title: "CAM Export Parity — 5 CAM × 8 Export Classes (Native-writeback, G-code, Metadata, Sim, Setup-sheet, Tool-list, Machine-state, Fixture-offset)",
  description:
    "A2 audit: P2 is inbound-wire-heavy, outbound export is asymmetric. Mastercam, hyperMILL, Inventor HSM, SolidCAM, Fusion 360 each need parity in 8 export classes. 10 consolidated units covering all 40 cells.",
  sessions: "6-8",
  primary_role: "R3",
  primary_model: "sonnet-4.6",
  scrutiny_checkpoint: true,
  units: [
    U("P2b", 1, "MC-EXPORT", "Mastercam export: .mcx-8/.MCAM writeback + metadata XML + tool-list + setup-sheet + fixture-offset", { deliverables: [{ path: "mcp-server/src/engines/MastercamExportEngine.ts", type: "source", description: "All 8 classes for Mastercam 2021-2026.", line_count_est: 540 }] }),
    U("P2b", 2, "HM-EXPORT", "hyperMILL export: .mfg writeback + metadata + tool-list + setup-sheet + fixture-offset", { deliverables: [{ path: "mcp-server/src/engines/HyperMillExportEngine.ts", type: "source", description: "All 8 classes for hyperMILL + hyperCAD-S.", line_count_est: 520 }] }),
    U("P2b", 3, "INV-EXPORT", "Inventor HSM export: .ipt/.iam writeback + metadata + tool-list + setup-sheet + fixture-offset", { deliverables: [{ path: "mcp-server/src/engines/InventorHSMExportEngine.ts", type: "source", description: "All 8 classes for Inventor HSM/CAM 2023-2026.", line_count_est: 500 }] }),
    U("P2b", 4, "SC-EXPORT", "SolidCAM export: .prz writeback + metadata + setup-sheet + fixture-offset (tool-list already in P2-U20)", { deliverables: [{ path: "mcp-server/src/engines/SolidCAMExportEngine.ts", type: "source", description: "Remaining 7 classes for SolidCAM; reuses existing ToolExport.", line_count_est: 480 }] }),
    U("P2b", 5, "F360-EXPORT", "Fusion 360 export: .f3d/.f3z writeback + CPS + metadata + tool-list + setup-sheet + fixture-offset", { deliverables: [{ path: "mcp-server/src/engines/Fusion360ExportEngine.ts", type: "source", description: "All 8 classes via Fusion 360 Python API + CPS.", line_count_est: 520 }] }),
    U("P2b", 6, "SIM-VERICUT", "VERICUT .VCX export — all 5 CAM sources → one simulator format", { deliverables: [{ path: "mcp-server/src/engines/VericutSimExportEngine.ts", type: "source", description: "CGTech VERICUT .VCX packaging + virtual-machine mapping.", line_count_est: 420 }] }),
    U("P2b", 7, "SIM-NCSIMUL", "NCSIMUL export — .CUT/.pgr generation", { deliverables: [{ path: "mcp-server/src/engines/NCSimulExportEngine.ts", type: "source", description: "NCSIMUL Hexagon simulator export; fixture+stock state.", line_count_est: 360 }] }),
    U("P2b", 8, "WCS-OFFSETS", "MillWCSFixtureOffsetEngine — G54-G59.x + Mazak .WOS + Fanuc offset writeback", { deliverables: [{ path: "mcp-server/src/engines/MillWCSFixtureOffsetEngine.ts", type: "source", description: "Unified fixture-offset writer for all CAM outputs.", line_count_est: 320 }] }),
    U("P2b", 9, "MACHINE-SNAP", "MillMachineStateSnapshotEngine — live machine state export to CAM (spindle, tool, offsets, program pointer)", { deliverables: [{ path: "mcp-server/src/engines/MillMachineStateSnapshotEngine.ts", type: "source", description: "Captures + exports real-time CNC state for CAM resume.", line_count_est: 340 }] }),
    U("P2b", 10, "EXPORT-TESTS", "CAM export parity test — 5 systems × 8 classes = 40-cell matrix round-trip assertion", { role: "R4", role_name: "Tester", effort: 95 }),
  ],
  gate: gate(["All 40 CAM × export-class cells round-trip verified", "Zero feature loss on writeback", "Simulator output bit-identical on fixed seed"]),
});

// ── P28: CAD Input Format Exhaustive Matrix (Loop 5 — A1: ~50 missing cells) ──
phases.push({
  id: "P28",
  title: "CAD Input Format Exhaustive — All Formats × All 5 CAM Systems (Native + Neutral + Mesh)",
  description:
    "A1 audit: ~50 format×system cells missing. This phase delivers a complete CAD input matrix: native (.mcx-8/.MCAM/.mfg/.ipt/.iam/.sldprt/.sldasm/.f3d/.f3z/.prz), neutral (STEP/IGES/Parasolid/ACIS/JT/3DM), mesh (STL/PLY/OBJ/FBX/3MF), plus DXF/DWG/IDW variants. Every format declares version range, R/W flag, feature-preservation contract, round-trip test.",
  sessions: "8-10",
  primary_role: "R3",
  primary_model: "sonnet-4.6",
  scrutiny_checkpoint: true,
  units: [
    U("P28", 1, "MCAM-UNIFIED", "Mastercam .MCAM (2021-2026) unified parser — version auto-detect + backward-compat .mcx-8", { deliverables: [{ path: "mcp-server/src/engines/MastercamMCAMParserEngine.ts", type: "source", description: "Reads .MCAM 2021-2026 + .mcx-8 (legacy) + .MCX; version-aware dispatch.", line_count_est: 520 }] }),
    U("P28", 2, "HYPERCAD", "hyperCAD-S native + hyperMILL .mfg project parser", { deliverables: [{ path: "mcp-server/src/engines/HyperCADNativeParserEngine.ts", type: "source", description: "hyperCAD-S + hyperMILL .mfg reader w/ feature tree + PMI.", line_count_est: 480 }] }),
    U("P28", 3, "INV-IPT-IAM", "Inventor .ipt + .iam + .idw unified parser w/ parametrics", { deliverables: [{ path: "mcp-server/src/engines/InventorNativeParserEngine.ts", type: "source", description: "iLogic-aware parser; assembly constraints; suppressed features preserved.", line_count_est: 500 }] }),
    U("P28", 4, "SC-PRZ", "SolidCAM .prz project + .sldrt + embedded SW/Inventor host read", { deliverables: [{ path: "mcp-server/src/engines/SolidCAMNativeParserEngine.ts", type: "source", description: "SolidCAM project extractor incl. host-CAD parasolid payload.", line_count_est: 440 }] }),
    U("P28", 5, "F360-ARCHIVE", "Fusion 360 .f3d / .f3z archive parser (static, not just live API)", { deliverables: [{ path: "mcp-server/src/engines/Fusion360ArchiveParserEngine.ts", type: "source", description: "Zip-container extractor + timeline reconstruction from .f3z.", line_count_est: 440 }] }),
    U("P28", 6, "NEUTRAL-STEP-AP242", "STEP AP214/AP242 + IGES unified neutral reader w/ semantic PMI", { deliverables: [{ path: "mcp-server/src/engines/NeutralSTEPIGESParserEngine.ts", type: "source", description: "AP242 semantic PMI + legacy AP214 + IGES fallback.", line_count_est: 520 }] }),
    U("P28", 7, "PARASOLID-ACIS", "Parasolid .x_t/.x_b + ACIS .SAT B-rep reader", { deliverables: [{ path: "mcp-server/src/engines/ParasolidACISParserEngine.ts", type: "source", description: "Binary + text Parasolid; ACIS via legacy SAT. Feature extraction.", line_count_est: 460 }] }),
    U("P28", 8, "JT-3DM", "JT (Siemens) + Rhino .3DM reader", { deliverables: [{ path: "mcp-server/src/engines/JT3DMParserEngine.ts", type: "source", description: "Siemens JT LOD-aware + Rhino 3DM NURBS reader.", line_count_est: 420 }] }),
    U("P28", 9, "MESH-UNIFIED", "STL + PLY + OBJ + FBX + 3MF unified mesh reader (for reverse-engineering + additive-subtractive hybrid)", { deliverables: [{ path: "mcp-server/src/engines/UnifiedMeshParserEngine.ts", type: "source", description: "Unified mesh ingestion w/ normal + texture + material preservation.", line_count_est: 420 }] }),
    U("P28", 10, "DXF-DWG-FAM", "DXF + DWG + IDW drawing-family parser (R12 through R2025)", { deliverables: [{ path: "mcp-server/src/engines/DrawingFamilyParserEngine.ts", type: "source", description: "AutoCAD family incl. PMI + title-block extraction.", line_count_est: 440 }] }),
    U("P28", 11, "VERSION-REG", "CADFormatVersionRegistry — canonical version-range + R/W-flag matrix for every format × CAD", { deliverables: [{ path: "mcp-server/src/registries/CADFormatVersionRegistry.ts", type: "source", description: "Versioned support matrix; dispatches parser per version.", line_count_est: 380 }] }),
    U("P28", 12, "PRESERVE-TEST", "Round-trip feature preservation test — 50 parts × 10 formats × 5 CAMs", { role: "R4", role_name: "Tester", effort: 95 }),
  ],
  gate: gate(["≥90% feature preservation on all format round-trips", "Version registry covers 2018-2026 across all formats", "PMI+GD&T survives STEP AP242 round-trip bit-exact"]),
});

// ── P29: Multi-Tenant Isolation (Loop 5 — A4: 6 tenancy gaps) ──
phases.push({
  id: "P29",
  title: "Multi-Tenant Isolation — Singleton Factoring, Path Partitioning, Adapter Isolation, Federated DP Budget",
  description: "A4 found process-global singletons cross-contaminate tenants. Fix via getInstance(tenantId) pattern, tenant-prefixed state paths, LoRA adapter registry, per-tenant DP budget ledger, audit-ledger sharding.",
  sessions: "3-4",
  primary_role: "R1",
  primary_model: "opus-4.6",
  scrutiny_checkpoint: true,
  units: [
    U("P29", 1, "TENANT-SINGLETON", "Convert all mill engine singletons to getInstance(tenantId) factory pattern", { role: "R1", model: "opus-4.6", effort: 95, deliverables: [{ path: "mcp-server/src/engines/MillTenantRegistryEngine.ts", type: "source", description: "Per-tenant engine cache; deny cross-tenant read.", line_count_est: 440 }] }),
    U("P29", 2, "PATH-PARTITION", "Prefix every state path with state/tenants/{tenant_id}/MILL-MASTER/...", { deliverables: [{ path: "mcp-server/src/utils/millTenantPaths.ts", type: "source", description: "Path resolver w/ tenant namespacing.", line_count_est: 200 }] }),
    U("P29", 3, "TRIBAL-SCOPE", "Tribal tip composite-key (tenant_id, customer) + cross-tenant read denial", { deliverables: [{ path: "mcp-server/src/engines/MillTribalKnowledgeEngine.ts", type: "source", description: "Add tenantId + customer composite key; query guard.", line_count_est: 180 }] }),
    U("P29", 4, "AUDIT-SHARD", "Shard P19 audit ledger to data/state/tenants/{tenant_id}/ledger.jsonl with per-tenant SHA256 chain", { deliverables: [{ path: "mcp-server/src/engines/MillMasterAuditLedgerEngine.ts", type: "source", description: "Tenant-partitioned ledger; hash-chain per tenant.", line_count_est: 220 }] }),
    U("P29", 5, "LORA-REGISTRY", "LoRA adapter registry with base-weight SHA256 freeze + tenant-isolation contract", { deliverables: [{ path: "mcp-server/src/engines/MillLoRAAdapterRegistryEngine.ts", type: "source", description: "adapter_registry[tenant_id][customer_id]; base-weight pin.", line_count_est: 340 }] }),
    U("P29", 6, "DP-BUDGET", "Per-tenant differential-privacy ε ledger + gradient-inversion adversarial test", { deliverables: [{ path: "mcp-server/src/engines/MillTenantDPBudgetEngine.ts", type: "source", description: "ε accounting + inversion-attack red-team.", line_count_est: 300 }] }),
  ],
  gate: gate(["Zero cross-tenant data leak on 20 adversarial test cases", "Per-tenant ε budget enforced ≤1.0", "All singletons converted"]),
});

// ── P30: Crash Recovery + Resilience (Loop 5 — A5: 7 engines) ──
phases.push({
  id: "P30",
  title: "Crash Recovery + Resilience — Checkpoint, Watchdog, Atomic Write, Torn-Write Detection",
  description: "A5 audit: 24-hr jobs + FL rounds + controller disconnects + OOM + power-loss all unsafe. 7 resilience engines.",
  sessions: "3-4",
  primary_role: "R1",
  primary_model: "opus-4.6",
  scrutiny_checkpoint: true,
  units: [
    U("P30", 1, "JOB-CHECKPOINT", "MillJobCheckpointEngine — per-N-block checkpoint + resume offset", { role: "R1", effort: 90, deliverables: [{ path: "mcp-server/src/engines/MillJobCheckpointEngine.ts", type: "source", description: "Every 100 blocks: persist program pointer + fixture state + tool state; resumeFromBlock(N).", line_count_est: 420 }] }),
    U("P30", 2, "CRASH-RECOVER", "MillCrashRecoveryEngine — boot-time crash detection + replay", { deliverables: [{ path: "mcp-server/src/engines/MillCrashRecoveryEngine.ts", type: "source", description: "Detects unclean shutdown; replays from last checkpoint.", line_count_est: 380 }] }),
    U("P30", 3, "ATOMIC-WRITE", "MillAtomicWriteEngine — tmp+fsync+rename + per-line CRC32", { deliverables: [{ path: "mcp-server/src/engines/MillAtomicWriteEngine.ts", type: "source", description: "Atomic JSON/JSONL write; CRC32 per line; replaces all writeFileSync.", line_count_est: 320 }] }),
    U("P30", 4, "FL-RECONCILE", "MillFLRoundReconcilerEngine — partition tolerance + round re-issue + stale gradient reject", { role: "R1", effort: 90, deliverables: [{ path: "mcp-server/src/engines/MillFLRoundReconcilerEngine.ts", type: "source", description: "Bounds staleness; re-issues rounds on partition.", line_count_est: 400 }] }),
    U("P30", 5, "CTRL-WATCHDOG", "MillControllerWatchdogEngine — heartbeat + deadman + safe-state command", { role: "R1", effort: 95, deliverables: [{ path: "mcp-server/src/engines/MillControllerWatchdogEngine.ts", type: "source", description: "Disconnect → spindle-off + Z-retract + coolant-off within 500ms.", line_count_est: 380 }] }),
    U("P30", 6, "TRAIN-CHECKPOINT", "MillTrainingCheckpointEngine — per-epoch save + optimizer state + auto-resume", { deliverables: [{ path: "mcp-server/src/engines/MillTrainingCheckpointEngine.ts", type: "source", description: "Saves weights+optimizer+LR every epoch; resume from last good.", line_count_est: 340 }] }),
    U("P30", 7, "TORN-DETECT", "MillTornWriteDetectorEngine — boot-time JSON integrity scan + rollback to .prev", { deliverables: [{ path: "mcp-server/src/engines/MillTornWriteDetectorEngine.ts", type: "source", description: "Scans all mill state JSON at boot; rolls back corrupt.", line_count_est: 280 }] }),
  ],
  gate: gate(["Kill -9 + power-pull test: all 20 simulated crashes auto-recover", "FL round succeeds through 30% packet loss", "Torn JSON rolled back on 100% of injected corruptions"]),
});

// ── P31: Regulatory Extensions (Loop 5 — A7: 9 compliance domains) ──
phases.push({
  id: "P31",
  title: "Regulatory Extensions — NADCAP/ITAR-EAR/PFAS-REACH/GHG-Scope3/CMMC/IATF/Y14.5/MBE-AP242/Metrology-Traceability",
  description: "A7 audit: P10 covers AS9100+ISO13485+FDA-Part11+ITAR. Add the 9 additional compliance surfaces demanded by mill customers.",
  sessions: "4-5",
  primary_role: "R2",
  primary_model: "sonnet-4.6",
  scrutiny_checkpoint: true,
  units: [
    U("P31", 1, "NADCAP-HT", "NADCAPHeatTreatLinkageEngine — AC7114 + AMS2750 + supplier chain-of-custody", { deliverables: [{ path: "mcp-server/src/engines/NADCAPHeatTreatLinkageEngine.ts", type: "source", description: "Routings linked to HT supplier certs.", line_count_est: 380 }] }),
    U("P31", 2, "EXPORT-GATE", "ExportControlGatingEngine — ITAR USML Cat VIII / EAR ECCN classifier + deemed-export firewall", { role: "R1", effort: 90, deliverables: [{ path: "mcp-server/src/engines/ExportControlGatingEngine.ts", type: "source", description: "Per-part classification + end-use screening + gate before post.", line_count_est: 480 }] }),
    U("P31", 3, "CHEM-TRACE", "CoolantChemicalTraceabilityEngine — PFAS EPA 40 CFR 705 + REACH + Prop 65", { deliverables: [{ path: "mcp-server/src/engines/CoolantChemicalTraceabilityEngine.ts", type: "source", description: "SDS parse + job-level exposure log.", line_count_est: 360 }] }),
    U("P31", 4, "GHG-SCOPE3", "GHGScope3EmissionsEngine — GHG Protocol + ISO 14064 + CBAM/CDP export", { deliverables: [{ path: "mcp-server/src/engines/GHGScope3EmissionsEngine.ts", type: "source", description: "Per-part Scope 1/2/3 emissions from spindle-kWh + coolant + scrap.", line_count_est: 420 }] }),
    U("P31", 5, "CUI-CMMC", "CUIHandlingComplianceEngine — DFARS + NIST 800-171 r3 + CMMC L2", { role: "R1", effort: 90, deliverables: [{ path: "mcp-server/src/engines/CUIHandlingComplianceEngine.ts", type: "source", description: "Control mapping + CUI-tagged drawing access log.", line_count_est: 460 }] }),
    U("P31", 6, "IATF-16949", "IATF16949ComplianceEngine — PPAP/APQP/MSA for auto supplier tiers", { deliverables: [{ path: "mcp-server/src/engines/IATF16949ComplianceEngine.ts", type: "source", description: "Core-tools traceability.", line_count_est: 420 }] }),
    U("P31", 7, "Y145-GDT", "ASMEY145VerificationEngine — GD&T callout parse + datum ref frame + tolerance-zone math + Rule #1", { deliverables: [{ path: "mcp-server/src/engines/ASMEY145VerificationEngine.ts", type: "source", description: "Envelope check tied to CMM results.", line_count_est: 460 }] }),
    U("P31", 8, "MBE-AP242", "MBESTEPAP242Engine — semantic PMI from AP242/QIF 3.0 + PMI→inspection round-trip", { deliverables: [{ path: "mcp-server/src/engines/MBESTEPAP242Engine.ts", type: "source", description: "Single-source-of-truth enforcement for MBE.", line_count_est: 440 }] }),
    U("P31", 9, "METRO-TRACE", "MetrologyTraceabilityEngine — NIST/NMI calibration chain + gage R&R + ISO 17025", { deliverables: [{ path: "mcp-server/src/engines/MetrologyTraceabilityEngine.ts", type: "source", description: "Per-measurement chain of custody.", line_count_est: 380 }] }),
  ],
  gate: gate(["9 compliance attestations clean", "Export gate blocks 100% of adversarial ITAR leak cases", "GD&T Rule#1 enforced"]),
});

// ── P32: AI Governance + Ethics (Loop 5 — A10: 7 engines, EU AI Act + OSTP) ──
phases.push({
  id: "P32",
  title: "AI Governance + Ethics — ML Approval, Provenance, Bias, Kill Switch, Override Audit, EU AI Act, OSTP",
  description: "A10 audit: underscrutinized. Mandatory before production ML deployment. 7 governance engines mapped to EU AI Act Annex III (high-risk manufacturing) + OSTP AI Bill of Rights.",
  sessions: "3-4",
  primary_role: "R1",
  primary_model: "opus-4.6",
  scrutiny_checkpoint: true,
  units: [
    U("P32", 1, "ML-APPROVAL", "MLModelApprovalEngine — reviewer-quorum gate + model-card requirement before prod promote", { role: "R1", effort: 90, deliverables: [{ path: "mcp-server/src/engines/MLModelApprovalEngine.ts", type: "source", description: "N-of-M approvals; model card check; block uncarded.", line_count_est: 420 }] }),
    U("P32", 2, "MODEL-PROV", "ModelProvenanceEngine — training_run → dataset_hash → weights_hash → inference_id chain", { role: "R1", effort: 90, deliverables: [{ path: "mcp-server/src/engines/ModelProvenanceEngine.ts", type: "source", description: "Immutable provenance for every inference.", line_count_est: 440 }] }),
    U("P32", 3, "BIAS-DETECT", "DatasetClassBalanceEngine + BiasDetectionEngine — per-ISO-group F1 + calibration on sparse classes", { deliverables: [{ path: "mcp-server/src/engines/MillBiasDetectionEngine.ts", type: "source", description: "Per-class metric + alert on underperforming rare classes.", line_count_est: 380 }] }),
    U("P32", 4, "AI-KILLSWITCH", "AIKillSwitchEngine — global ML-off with deterministic Kienzle/Taylor fallback", { role: "R1", effort: 95, deliverables: [{ path: "mcp-server/src/engines/AIKillSwitchEngine.ts", type: "source", description: "One-switch all-ML-off; verified failover to tabular physics.", line_count_est: 400 }] }),
    U("P32", 5, "OVERRIDE-AUDIT", "OverrideAuditLedgerEngine — tamper-evident (AI_rec, operator, action, outcome) log", { role: "R1", effort: 90, deliverables: [{ path: "mcp-server/src/engines/OverrideAuditLedgerEngine.ts", type: "source", description: "Append-only hash-chained ledger of every operator override.", line_count_est: 400 }] }),
    U("P32", 6, "EU-AI-ACT", "EUAIActComplianceEngine — Annex III high-risk attestation (Art 9/10/12/14/17/61)", { role: "R1", effort: 95, deliverables: [{ path: "mcp-server/src/engines/EUAIActComplianceEngine.ts", type: "source", description: "Risk-mgmt file + data-governance + logging + human-oversight + QMS + post-market.", line_count_est: 520 }] }),
    U("P32", 7, "OSTP-ATTEST", "OSTPBillOfRightsAttestationEngine — 5-pillar mapping (safe/nondiscrim/privacy/notice/alternatives)", { deliverables: [{ path: "mcp-server/src/engines/OSTPBillOfRightsAttestationEngine.ts", type: "source", description: "Per-model attestation + end-user notice template.", line_count_est: 340 }] }),
  ],
  gate: gate(["100% models have approval record + provenance + model card", "AI kill-switch round-trip green", "EU AI Act Annex III attestation complete"]),
});

// ── P33: ML/DL Gaps (Loop 5 — A3: 10 mill-critical ML engines missing) ──
phases.push({
  id: "P33",
  title: "ML/DL Gaps — Chip Morphology, Burr Detect, Thread/Tap, Deep-Hole, HSM, Abrasive-Assisted, Off-Policy RL, LLM-CodeGen, Legacy-Reason, Cross-Modal",
  description: "A3 found 10 mill-critical ML engines still missing after P23-P26. All high-value for production mill AI.",
  sessions: "6-8",
  primary_role: "R1",
  primary_model: "opus-4.6",
  scrutiny_checkpoint: true,
  units: [
    U("P33", 1, "CHIP-MORPH", "MillChipMorphologyPredictionEngine — CNN+multitask (continuous/segmented/BUE/saw-tooth) from force+acoustic+vision", { role: "R1", effort: 90, deliverables: [{ path: "mcp-server/src/engines/MillChipMorphologyPredictionEngine.ts", type: "source", description: "Drives feed/coolant adaptation.", line_count_est: 480 }] }),
    U("P33", 2, "BURR-DETECT", "MillBurrFormationDetectionEngine — vision-transformer + edge-geometry head predicting burr height at exits", { role: "R1", effort: 90, deliverables: [{ path: "mcp-server/src/engines/MillBurrFormationDetectionEngine.ts", type: "source", description: "Per-exit burr prediction; deburring-cost input.", line_count_est: 460 }] }),
    U("P33", 3, "THREAD-TAP", "MillThreadTapMicroMachiningEngine — RL+physics for tapping/thread-milling/thread-rolling torque-peak + micro-mill (<1mm)", { role: "R1", effort: 95, deliverables: [{ path: "mcp-server/src/engines/MillThreadTapMicroMachiningEngine.ts", type: "source", description: "Specialty head for threading ops.", line_count_est: 500 }] }),
    U("P33", 4, "DEEP-HOLE", "MillDeepHoleChipEvacuationEngine — LSTM/Mamba forecasting peck-retract + coolant-flush for L/D>10", { role: "R1", effort: 90, deliverables: [{ path: "mcp-server/src/engines/MillDeepHoleChipEvacuationEngine.ts", type: "source", description: "Gundrilling/peck-drilling sequence model.", line_count_est: 460 }] }),
    U("P33", 5, "HSM-STABILITY", "MillHSMStabilityTransformerEngine — HSM-specific SLD + jerk/accel-aware stability transformer (>30k RPM)", { role: "R1", effort: 90, deliverables: [{ path: "mcp-server/src/engines/MillHSMStabilityTransformerEngine.ts", type: "source", description: "High-speed-machining specific stability.", line_count_est: 480 }] }),
    U("P33", 6, "ABRASIVE-ASSIST", "MillAbrasiveAssistedMachiningEngine — ML surrogate for AFM/ECM/ultrasonic/magnetic-assist/EC-milling", { deliverables: [{ path: "mcp-server/src/engines/MillAbrasiveAssistedMachiningEngine.ts", type: "source", description: "Ceramics/glass/carbide hybrid-process models.", line_count_est: 480 }] }),
    U("P33", 7, "OFF-POLICY-RL", "MillOffPolicyRLEngine — SAC + TD3 + MuZero beyond P24's PPO-only", { role: "R1", effort: 95, deliverables: [{ path: "mcp-server/src/engines/MillOffPolicyRLEngine.ts", type: "source", description: "Continuous off-policy + deterministic + model-based planning.", line_count_est: 560 }] }),
    U("P33", 8, "LLM-CODEGEN", "MillLLMCodeGenerationEngine — Code-Llama/DeepSeek-Coder fine-tune for macro subprograms + parametric G-code from print text+features", { role: "R1", effort: 95, deliverables: [{ path: "mcp-server/src/engines/MillLLMCodeGenerationEngine.ts", type: "source", description: "Distinct from P23 Transformer (whole-program vs subprogram).", line_count_est: 520 }] }),
    U("P33", 9, "LEGACY-REASON", "MillLegacyGCodeReasoningEngine — LLM chain-of-thought over legacy/unlabeled G-code for intent reconstruction", { role: "R1", effort: 90, deliverables: [{ path: "mcp-server/src/engines/MillLegacyGCodeReasoningEngine.ts", type: "source", description: "Reverse-engineer operator rationale from JM Die archive.", line_count_est: 480 }] }),
    U("P33", 10, "CROSS-MODAL", "MillCrossModalAlignmentEngine — CLIP-style tri-encoder aligning print-image ↔ CAD-graph ↔ G-code tokens", { role: "R1", effort: 95, deliverables: [{ path: "mcp-server/src/engines/MillCrossModalAlignmentEngine.ts", type: "source", description: "Zero-shot print-to-program retrieval.", line_count_est: 520 }] }),
    U("P33", 11, "ML-GAP-TESTS", "ML gap harness — 10 engines × 15 real-input cases + edge + adversarial", { role: "R4", role_name: "Tester", effort: 95 }),
  ],
  gate: gate(["All 10 engines hit domain-specific benchmarks", "Off-policy RL beats PPO sample efficiency by ≥40%", "Cross-modal retrieval mAP ≥ 0.80 on 500 held-out prints"]),
});

// ── P27: Advanced Mill Physics — 10 Missing Canonical Models (Loop 5 — A6 BLOCK) ─
phases.push({
  id: "P27",
  title: "Mill Physics Completeness — 7 CRITICAL + 3 WARNING Missing Canonical Models",
  description:
    "Loop 5 A6 physics-reviewer issued BLOCK verdict on v6: 10 canonical mill physics models missing from src/physics/constants.ts. Each model is cited with textbook/ISO reference. Every engine imports constants from constants.ts (no inline), exports AtomicValue<T> with {value, unit, uncertainty, source, confidence}, and propagates RSS uncertainty. P27 closes the physics gap that P23/P24/P25 ML models depend on as ground truth.",
  sessions: "5-7",
  primary_role: "R1",
  primary_model: "opus-4.6",
  scrutiny_checkpoint: true,
  scrutiny_focus: [
    "Every formula cites ISO standard / textbook / CIRP paper",
    "Dimensional consistency across all units",
    "Uncertainty propagation (RSS) for independent variables",
    "Real-data validation against JM Die measured cuts or published benchmarks",
  ],
  units: [
    U("P27", 1, "FRF-CHATTER", "MillRegenChatterFRFEngine — Frequency Response Function + stability lobe diagram (CRITICAL)", {
      role: "R1", model: "opus-4.6", effort: 95,
      rationale: "Chatter stability prediction requires H(ω)=1/(k(1-r²+2ζjr)); stability-lobe a_lim(n). Kienzle+Taylor cover force+life but not dynamic stability. Cited: Altintas 'Manufacturing Automation' 2nd ed Ch.4; Tlusty&Polacek 1963; ISO 230-8.",
      dependencies: ["P1-U12-SKILL-CMDS"],
      features: ["blocks: P4 3-axis hardening depth-of-cut recommendation; P5 5-axis lead/lag; P25 acoustic chatter ground-truth labeling"],
      deliverables: [
        { path: "mcp-server/src/engines/MillRegenChatterFRFEngine.ts", type: "source", description: "Tap-test FRF identification + SLD generation. Imports k, ζ, natural freq per toolholder from constants.ts. Validates against Altintas textbook benchmarks. Outputs AtomicValue<{a_lim, n_opt}>.", line_count_est: 520 },
      ],
    }),
    U("P27", 2, "RUNOUT", "MillCutterRunoutEngine — TIR → per-flute chip-load redistribution (CRITICAL)", {
      role: "R1", model: "opus-4.6", effort: 90,
      rationale: "Flute-to-flute chip thickness variation: fz_i = fz + ρ·cos(θ_i − λ). Drives asymmetric force + tool-wear localization. Cited: Kline&DeVor 1983 IJMTDR; Schmitz&Smith 'Machining Dynamics' Ch.5.",
      dependencies: ["P27-U01-FRF-CHATTER", "P1-U12-SKILL-CMDS"],
      features: ["blocks: P8 wear coupling; P23-U03 PINN ground-truth; P21-U05 Kienzle gate (runout-corrected Fc)"],
      deliverables: [
        { path: "mcp-server/src/engines/MillCutterRunoutEngine.ts", type: "source", description: "Runout vector (ρ,λ) → per-flute fz_i. Validates against Kline-DeVor test data. Outputs AtomicValue<{fz_per_flute[], Fc_asym}>.", line_count_est: 420 },
      ],
    }),
    U("P27", 3, "CHIP-THINNING", "MillChipThinningEngine — circular + trochoidal adaptive-clearing chip thickness (CRITICAL)", {
      role: "R1", model: "opus-4.6", effort: 95,
      rationale: "hm = fz·sin(φ)·√(1−(1−2ae/D)²); RCTF = D/(2·√(ae(D−ae))). Required for HSM + adaptive-clearing S/F. Cited: Martellotti 1941 ASME; Stephenson&Agapiou §3.4; Sandvik HSM guide.",
      dependencies: ["P27-U01-FRF-CHATTER"],
      features: ["blocks: P4 3-axis roughing strategy; P5 5-axis trochoidal; P23-U01 Transformer G-code physics constraint; P25-U02 on-machine vision chip correlation"],
      deliverables: [
        { path: "mcp-server/src/engines/MillChipThinningEngine.ts", type: "source", description: "hm(ae,D,fz,φ) + RCTF compensation. Benchmarks against Sandvik RCTF table. Outputs AtomicValue<{hm, RCTF, fz_corrected}>.", line_count_est: 420 },
      ],
    }),
    U("P27", 4, "COOLANT-HTC", "MillCoolantConvectiveHTCEngine — jet/flood/MQL convective heat-transfer coefficient (CRITICAL)", {
      role: "R1", model: "opus-4.6", effort: 90,
      rationale: "Dittus-Boelter: Nu=0.023·Re^0.8·Pr^0.4; h_jet=f(Re,d_jet,z/d). Needed for thermal-wear coupling + coolant-adequacy gate. Cited: Incropera 'Fundamentals of Heat Transfer' Ch.8; Li&Liang 2007 IJMTM (MQL).",
      dependencies: ["P1-U12-SKILL-CMDS"],
      features: ["blocks: P8-U04/U05 thermal engines; P21-U07 thermal-ceiling hook; P23-U04 FNO neural operator thermal surrogate"],
      deliverables: [
        { path: "mcp-server/src/engines/MillCoolantConvectiveHTCEngine.ts", type: "source", description: "h_conv for flood/jet/MQL/cryo. Validates vs Incropera tables. Outputs AtomicValue<{h_conv, Nu, Re}>.", line_count_est: 380 },
      ],
    }),
    U("P27", 5, "TOOLHOLDER-STIFF", "MillToolholderStiffnessEngine — HSK/BT/Capto 6×6 stiffness matrix (WARNING)", {
      rationale: "K_TH matrix (radial, axial, tilt coupling) + taper contact k_r + clamp preload per DIN 69893 (HSK), ISO 7388 (BT), ISO 26623 (Capto). Critical for deflection + FRF. Cited: Rivin 'Stiffness and Damping in Mech. Design'.",
      dependencies: ["P27-U01-FRF-CHATTER"],
      features: ["blocks: P4 deflection; P8 runout-coupled wear; P21-U08 deflection hook"],
      deliverables: [
        { path: "mcp-server/src/engines/MillToolholderStiffnessEngine.ts", type: "source", description: "Per-interface 6×6 K matrix + preload model. AtomicValue output.", line_count_est: 420 },
      ],
    }),
    U("P27", 6, "SPINDLE-GROWTH", "MillSpindleThermalGrowthEngine — startup warm-up Z-axis compensation (CRITICAL)", {
      role: "R1", model: "opus-4.6", effort: 90,
      rationale: "dL(t)=α·L·(T_ss−(T_ss−T0)·exp(−t/τ)). Z-drift during first 60min. Cited: ISO 230-3 thermal test; Bryan 1990 CIRP keynote; Weck 'Werkzeugmaschinen' Vol.5.",
      dependencies: ["P27-U04-COOLANT-HTC"],
      features: ["blocks: P10 FAI first-article tolerance budget; P13 digital-twin sync; P20-U04 calibration state offset"],
      deliverables: [
        { path: "mcp-server/src/engines/MillSpindleThermalGrowthEngine.ts", type: "source", description: "Exponential growth curve + ISO 230-3 warm-up model. Per-spindle τ catalog. AtomicValue<{dZ, dR}>.", line_count_est: 380 },
      ],
    }),
    U("P27", 7, "MICRO-MCT", "MillMicroMachiningMinimumChipThicknessEngine — size-effect + ploughing transition (CRITICAL)", {
      role: "R1", model: "opus-4.6", effort: 90,
      rationale: "hmin/re ≈ 0.2–0.4; ploughing when fz<hmin; Kc(h) size effect. Medical + electronics micro-mill domain. Cited: Vogler+DeVor+Kapoor 2004 JMSE; Chae+Park+Freiheit 2006 IJMTM.",
      dependencies: ["P27-U03-CHIP-THINNING"],
      features: ["blocks: micro-milling S/F for small tools; P25-U11 few-shot material; P7 electrode micro-features"],
      deliverables: [
        { path: "mcp-server/src/engines/MillMicroMachiningMinimumChipThicknessEngine.ts", type: "source", description: "hmin prediction + Kc(h) size-effect multiplier. Transition regime classifier. AtomicValue<{hmin, regime}>.", line_count_est: 380 },
      ],
    }),
    U("P27", 8, "WORK-HARDEN", "MillWorkHardeningLayerEngine — Ni-alloy surface hardening during milling (WARNING)", {
      rationale: "δ_H = f(fz, Vc, κr); HV(z) exponential decay. Critical for Inconel 718 / Waspaloy / Rene 41. Cited: M'Saoubi et al 2014 CIRP Annals; Ulutan&Ozel 2011 IJMTM Inconel 718.",
      dependencies: ["P27-U04-COOLANT-HTC"],
      features: ["blocks: aerospace/medical superalloy workflows; P10-U03 Cpk superalloy variance"],
      deliverables: [
        { path: "mcp-server/src/engines/MillWorkHardeningLayerEngine.ts", type: "source", description: "Per-alloy δ_H prediction + HV depth profile. Validated vs M'Saoubi Inconel dataset. AtomicValue<{δ_H, HV_surface}>.", line_count_est: 340 },
      ],
    }),
    U("P27", 9, "BURR-FORMATION", "MillBurrFormationEngine — Poisson/rollover burr height at exit (WARNING)", {
      rationale: "hb = f(fz, exit angle, ductility). Feeds into deburring cost + edge-quality GD&T. Cited: Gillespie&Blotter 1976; Aurich et al 2009 CIRP Annals 58/2.",
      dependencies: ["P27-U03-CHIP-THINNING"],
      features: ["blocks: P9 setup/secondary-op planning; P10-U04 FAI edge-break inspection; P25-U02 vision burr detection training labels"],
      deliverables: [
        { path: "mcp-server/src/engines/MillBurrFormationEngine.ts", type: "source", description: "Burr-height prediction + type classifier. Benchmarks vs Aurich CIRP data. AtomicValue<{hb, type}>.", line_count_est: 360 },
      ],
    }),
    U("P27", 10, "RESIDUAL-STRESS", "MillResidualStressEngine — mechanical-thermal coupled σ_res(z) hook profile (CRITICAL)", {
      role: "R1", model: "opus-4.6", effort: 95,
      rationale: "σ_res(z) via mech-thermal coupling; hook profile (compressive at surface, tensile subsurface). Drives fatigue + distortion. Cited: Jawahir et al 2011 CIRP keynote surface integrity; Ulutan&Ozel 2011.",
      dependencies: ["P27-U04-COOLANT-HTC", "P27-U08-WORK-HARDEN"],
      features: ["blocks: aerospace rotating-part fatigue certification; P10 AS9100 / NADCAP surface integrity; P13 digital-twin stress state"],
      deliverables: [
        { path: "mcp-server/src/engines/MillResidualStressEngine.ts", type: "source", description: "Hook profile σ_res(z) prediction from cutting parameters. Validated against Ulutan Inconel measured XRD. AtomicValue<{σ_surface, σ_min, depth_compressive}>.", line_count_est: 460 },
      ],
    }),
    U("P27", 11, "CONSTANTS-UPDATE", "src/physics/constants.ts extension — import all 10 new canonical coefficients", {
      role: "R1", model: "opus-4.6", effort: 90,
      rationale: "Canonicalize all new coefficients in constants.ts (no inline). FRF damping, runout vectors, chip-thinning factors, HTC tables, toolholder K matrices, spindle τ, micro-MCT ratios, work-hardening coefficients, burr ductility factors, residual-stress coupling.",
      dependencies: ["P27-U01-FRF-CHATTER", "P27-U02-RUNOUT", "P27-U03-CHIP-THINNING", "P27-U04-COOLANT-HTC", "P27-U05-TOOLHOLDER-STIFF", "P27-U06-SPINDLE-GROWTH", "P27-U07-MICRO-MCT", "P27-U08-WORK-HARDEN", "P27-U09-BURR-FORMATION", "P27-U10-RESIDUAL-STRESS"],
      features: ["blocks: physics-reviewer gate; all P27 unit tests; P23-U03 PINN constraint loss"],
      deliverables: [
        { path: "mcp-server/src/physics/constants.ts", type: "source", description: "Append new coefficient tables with ISO/textbook citation in JSDoc per entry.", line_count_est: 460 },
      ],
    }),
    U("P27", 12, "GROUND-TRUTH-VAL", "Physics ground-truth validation — 30+ measured-data benchmarks across all 10 models", {
      role: "R4", role_name: "Tester", effort: 95,
      rationale: "Every new physics model must clear published measurement data. Builds on JM Die instrumented cuts + literature datasets.",
      dependencies: ["P27-U11-CONSTANTS-UPDATE"],
      features: ["blocks: P16 release gate physics-UQ subtest"],
    }),
  ],
  gate: gate([
    "All 10 physics models validate against published textbook/paper benchmarks (≥±10%)",
    "constants.ts diff reviewed by physics-reviewer sub-agent; zero inlined coefficients downstream",
    "Dimensional consistency auto-checked via compile-time units library",
    "RSS uncertainty propagated end-to-end (input σ → output σ)",
  ], { ralph_required: true, ralph_grade_floor: "A+" }),
});

// ── P23: Exhaustive ML/DL — Foundation Models, Training, UQ, Continual Learning ─
phases.push({
  id: "P23",
  title: "ML/DL Exhaustive Upgrade — Foundation Models + GNN/PINN/FNO + LoRA + UQ + Continual Learning + RAG",
  description:
    "New directive: exhaustively add/improve ML/DL features. P12 wires EXISTING AI engines; P23 ADDS the model architectures PRISM is missing. Covers: (1) Transformer G-code generator fine-tuned on JM Die 24,545 programs via LoRA; (2) Graph Neural Networks for CAD feature extraction; (3) Physics-Informed NN (PINN) that honors Kienzle/Taylor constraints in loss; (4) Neural Operators (FNO/DeepONet) for thermal-wear coupled PDE surrogate; (5) Diffusion models for novel toolpath generation; (6) RAG pipeline over JM Die + tribal corpus via HNSW; (7) Uncertainty quantification (Bayesian NN, deep ensembles, MC dropout); (8) Continual learning with EWC++ against catastrophic forgetting; (9) Knowledge distillation opus → local small model; (10) Symbolic regression for discovering new physics formulas; (11) Active learning for tribal mining; (12) Contrastive learning for recipe similarity; (13) Anomaly VAE for abnormal-program detection; (14) Temporal Fusion Transformer for tool-life forecasting; (15) Multi-task learning across mill/lathe/EDM; (16) Imitation learning from JM Die operator programs.",
  sessions: "10-14",
  primary_role: "R1",
  primary_model: "opus-4.6",
  scrutiny_checkpoint: true,
  scrutiny_focus: [
    "Physics-consistency of PINN (no Kienzle violation in loss)",
    "LoRA adapter adherence to base model weights",
    "Uncertainty calibration (ECE < 0.05)",
    "Catastrophic forgetting measurement on continual tasks",
  ],
  units: [
    U("P23", 1, "TRANSFORMER-GCODE", "MillGCodeTransformerEngine — decoder-only transformer fine-tuned via LoRA on 24,545 JM Die programs for per-block G-code generation", {
      role: "R1", model: "opus-4.6", effort: 95,
      deliverables: [
        { path: "mcp-server/src/engines/MillGCodeTransformerEngine.ts", type: "source", description: "TS wrapper around ONNX runtime hosting a fine-tuned decoder LLM (DeepSeek Coder 6.7B base + LoRA r=16). Consumes features, emits G-code sequences with per-block S/F. Streams predictions.", line_count_est: 540 },
        { path: "mcp-server/src/engines/MillGCodeLoRAAdapterEngine.ts", type: "source", description: "Manages per-customer LoRA adapters; hot-swap per JMDie customer.", line_count_est: 300 },
      ],
    }),
    U("P23", 2, "GNN-FEATURES", "CADGraphNeuralNetworkEngine — GNN (GraphSAGE + edge-conditioned conv) over CAD feature graph for machinability scoring", {
      role: "R1", model: "opus-4.6", effort: 90,
      deliverables: [
        { path: "mcp-server/src/engines/CADGraphNeuralNetworkEngine.ts", type: "source", description: "Builds feature-adjacency graph from STEP/IGES extraction; GraphSAGE node embeddings; classifier head for pocket/hole/slot/boss/thread. ONNX inference.", line_count_est: 520 },
      ],
    }),
    U("P23", 3, "PINN-FORCE", "PhysicsInformedForceNNEngine — PINN that predicts cutting force with Kienzle PDE residual penalized in loss", {
      role: "R1", model: "opus-4.6", effort: 95,
      deliverables: [
        { path: "mcp-server/src/engines/PhysicsInformedForceNNEngine.ts", type: "source", description: "PINN inference: Fc_pred = NN(ap, fz, vc, κr, material); loss = MSE_data + λ·‖Fc_pred - Kienzle(ap,fz,kc,mc)‖². Zero Kienzle violation at inference by construction.", line_count_est: 460 },
      ],
    }),
    U("P23", 4, "NEURAL-OPERATOR", "ThermalWearNeuralOperatorEngine — FNO/DeepONet surrogate for coupled thermal-wear PDE (40× speedup vs RK4)", {
      role: "R1", model: "opus-4.6", effort: 95,
      deliverables: [
        { path: "mcp-server/src/engines/ThermalWearNeuralOperatorEngine.ts", type: "source", description: "Fourier Neural Operator trained on RK4 simulations (P13); replaces ODE solver for repeat predictions. Falls back to RK4 on OOD.", line_count_est: 480 },
      ],
    }),
    U("P23", 5, "DIFFUSION-TOOLPATH", "ToolpathDiffusionEngine — diffusion model for novel toolpath generation from feature constraints", {
      role: "R1", model: "opus-4.6", effort: 90,
      deliverables: [
        { path: "mcp-server/src/engines/ToolpathDiffusionEngine.ts", type: "source", description: "Conditional DDPM over 2D/3D toolpath point clouds; conditioned on feature type + material + tool + machine kinematics. 50-step denoise.", line_count_est: 500 },
      ],
    }),
    U("P23", 6, "RAG-PIPELINE", "MillRAGPipelineEngine — Retrieval-Augmented Generation over HNSW (P14b) + tribal store for mill reasoning", {
      role: "R1", model: "opus-4.6", effort: 85,
      deliverables: [
        { path: "mcp-server/src/engines/MillRAGPipelineEngine.ts", type: "source", description: "Retriever: HNSW top-k + tribal top-k + playbook top-k; re-ranker (cross-encoder); context packer; generator via MillGCodeTransformer or facade LLM. Full attribution.", line_count_est: 480 },
      ],
    }),
    U("P23", 7, "UQ-BNN", "MillBayesianNeuralNetworkEngine — Bayesian NN + Deep Ensembles + MC Dropout for confidence-aware force/wear/surface predictions", {
      role: "R1", model: "opus-4.6", effort: 90,
      deliverables: [
        { path: "mcp-server/src/engines/MillBayesianNeuralNetworkEngine.ts", type: "source", description: "3-ensemble model + MC-dropout inference; returns (μ, σ²); calibrated via temperature scaling. Expected calibration error ECE ≤ 0.05.", line_count_est: 460 },
      ],
    }),
    U("P23", 8, "CONTINUAL-EWC", "MillContinualLearningEngine — EWC++ with Fisher-info memory preservation against catastrophic forgetting", {
      role: "R1", model: "opus-4.6", effort: 90,
      deliverables: [
        { path: "mcp-server/src/engines/MillContinualLearningEngine.ts", type: "source", description: "Online SGD with EWC++ regularizer; Fisher information per-task; rehearsal buffer; forgetting metric exported to telemetry.", line_count_est: 440 },
      ],
    }),
    U("P23", 9, "KNOWL-DISTILL", "MillKnowledgeDistillationEngine — distills opus-4.6 reasoning into local 7B student for on-prem inference", {
      role: "R1", model: "opus-4.6", effort: 85,
      deliverables: [
        { path: "mcp-server/src/engines/MillKnowledgeDistillationEngine.ts", type: "source", description: "Teacher (opus traces from MillingReasoningTraceLedger) → student (Qwen2.5-7B LoRA). Cross-entropy + KL on logits + reasoning-step supervision.", line_count_est: 420 },
      ],
    }),
    U("P23", 10, "SYMREG", "MillSymbolicRegressionEngine — discovers novel Kienzle-like formulas from JM Die archive using PySR-style genetic algorithm", {
      role: "R1", model: "opus-4.6", effort: 85,
      deliverables: [
        { path: "mcp-server/src/engines/MillSymbolicRegressionEngine.ts", type: "source", description: "Evolves symbolic expressions against measured force/wear/finish data; outputs candidate closed-form equations with Pareto frontier of accuracy vs complexity. Hypothesizes new physics.", line_count_est: 500 },
      ],
    }),
    U("P23", 11, "ACTIVE-LEARN", "MillActiveLearningEngine — uncertainty-sampling loop for maximally informative tribal mining", {
      deliverables: [
        { path: "mcp-server/src/engines/MillActiveLearningEngine.ts", type: "source", description: "BALD acquisition over BNN uncertainty; selects JM Die programs most likely to teach the model; queues for human review or automated extraction.", line_count_est: 340 },
      ],
    }),
    U("P23", 12, "CONTRASTIVE", "MillContrastiveRecipeEngine — SimCLR-style contrastive learning for recipe similarity embedding", {
      deliverables: [
        { path: "mcp-server/src/engines/MillContrastiveRecipeEngine.ts", type: "source", description: "Positive pairs (same customer+material+feature), negatives (different); InfoNCE loss; produces 256-d recipe embeddings consumed by HNSW (P14b).", line_count_est: 380 },
      ],
    }),
    U("P23", 13, "ANOMALY-VAE", "MillAnomalyVAEEngine — Variational Autoencoder over program feature vectors; reconstruction error = anomaly score", {
      deliverables: [
        { path: "mcp-server/src/engines/MillAnomalyVAEEngine.ts", type: "source", description: "β-VAE trained on JM Die normals; anomaly_score = reconstruction-error × (1 + KL); flags abnormal programs for review.", line_count_est: 360 },
      ],
    }),
    U("P23", 14, "TOOL-LIFE-TFT", "MillToolLifeTemporalFusionTransformerEngine — TFT for probabilistic tool-life forecasting from spindle/coolant/vibration telemetry", {
      role: "R1", model: "opus-4.6", effort: 90,
      deliverables: [
        { path: "mcp-server/src/engines/MillToolLifeTemporalFusionTransformerEngine.ts", type: "source", description: "Temporal Fusion Transformer (variable-selection, static + time-varying covariates). Quantile head (p10/p50/p90). Beats Taylor on non-stationary cuts.", line_count_est: 500 },
      ],
    }),
    U("P23", 15, "MULTITASK", "MillMultiTaskLearningEngine — shared encoder across mill/lathe/EDM with task-specific heads (transfer across machines)", {
      role: "R1", model: "opus-4.6", effort: 90,
      deliverables: [
        { path: "mcp-server/src/engines/MillMultiTaskLearningEngine.ts", type: "source", description: "Shared transformer encoder; 3 heads (mill force, turning force, EDM gap); gradient-normalization (GradNorm) across tasks.", line_count_est: 440 },
      ],
    }),
    U("P23", 16, "IMITATION-IRL", "MillImitationLearningEngine — behavior cloning + inverse RL from JM Die expert programs to recover operator reward function", {
      role: "R1", model: "opus-4.6", effort: 90,
      deliverables: [
        { path: "mcp-server/src/engines/MillImitationLearningEngine.ts", type: "source", description: "BC on 24,545 programs; MaxEnt IRL for reward; policy head selects actions explaining expert choice. Exposes operator-preference vector.", line_count_est: 460 },
      ],
    }),
  ],
  gate: gate([
    "Every model has a deterministic seed + training-log reproducibility harness",
    "PINN physics-residual ≤ 1e-3 on held-out",
    "RAG attribution: every claim cites source program or tip",
    "UQ calibration ECE ≤ 0.05",
    "Continual-learning forgetting metric ≤ 5% across 10 tasks",
    "Anomaly VAE ROC-AUC ≥ 0.90 on adversarial injected programs",
  ], { ralph_required: true, ralph_grade_floor: "A+" }),
});

// ── P24: ML/DL Deployment — ONNX, XAI, AutoML, Federated, Causal, Eval ──
phases.push({
  id: "P24",
  title: "ML/DL Deployment — ONNX Runtime + XAI + AutoML + Federated + Causal Inference + Eval Harness",
  description:
    "Deployment + productionization + governance for P23 models. ONNX export + runtime (on-prem, no cloud call), XAI (SHAP + attention viz) for mill decisions, AutoML hyperparam optimization, federated learning across customer shops (privacy-preserving), causal inference for root-cause analysis of failed programs, and a comprehensive ML eval harness with drift detection.",
  sessions: "6-8",
  primary_role: "R1",
  primary_model: "opus-4.6",
  scrutiny_checkpoint: true,
  units: [
    U("P24", 1, "ONNX-RUNTIME", "MillONNXRuntimeEngine — on-prem ONNX Runtime wrapper with GPU/CPU/WASM backends for all P23 models", {
      role: "R1", model: "opus-4.6", effort: 90,
      deliverables: [
        { path: "mcp-server/src/engines/MillONNXRuntimeEngine.ts", type: "source", description: "Session manager with model warm-up, autoscaling, hardware routing (NVIDIA CUDA → DirectML → CPU → WASM fallback). Zero cloud dependency.", line_count_est: 520 },
      ],
    }),
    U("P24", 2, "XAI-SHAP", "MillExplainabilityEngine — SHAP + Integrated Gradients + attention viz for every mill decision", {
      role: "R1", model: "opus-4.6", effort: 85,
      deliverables: [
        { path: "mcp-server/src/engines/MillExplainabilityEngine.ts", type: "source", description: "Wraps SHAP (KernelExplainer / DeepExplainer) + IG; emits feature-attribution JSON; surfaces in AIReasoningTab (P0b).", line_count_est: 440 },
      ],
    }),
    U("P24", 3, "AUTOML", "MillAutoMLEngine — Bayesian hyperparam optimization (Optuna-style TPE) + architecture search per domain", {
      deliverables: [
        { path: "mcp-server/src/engines/MillAutoMLEngine.ts", type: "source", description: "TPE sampler + median pruner; ASHA scheduler; NAS over GNN widths + depths. Respects compute budget.", line_count_est: 400 },
      ],
    }),
    U("P24", 4, "FEDERATED", "MillFederatedLearningEngine — FedAvg + secure aggregation across customer shops (no raw data leaves premises)", {
      role: "R1", model: "opus-4.6", effort: 95,
      deliverables: [
        { path: "mcp-server/src/engines/MillFederatedLearningEngine.ts", type: "source", description: "FedAvg coordinator + differential-privacy gradient clipping + secure sum protocol. Each customer trains locally, only masked deltas aggregated.", line_count_est: 560 },
      ],
    }),
    U("P24", 5, "CAUSAL", "MillCausalInferenceEngine — DoWhy-style causal DAG + do-calculus for failure root-cause", {
      role: "R1", model: "opus-4.6", effort: 90,
      deliverables: [
        { path: "mcp-server/src/engines/MillCausalInferenceEngine.ts", type: "source", description: "Learns causal DAG from telemetry; answers do(S/F ± Δ) interventions; identifies back-door / front-door paths for chatter / wear / finish failures.", line_count_est: 500 },
      ],
    }),
    U("P24", 6, "EVAL-HARNESS", "MillMLEvalHarnessEngine — training-eval-drift pipeline with regression benchmarks per model", {
      deliverables: [
        { path: "mcp-server/src/engines/MillMLEvalHarnessEngine.ts", type: "source", description: "Held-out eval + concept-drift detection (KS test on embeddings); nightly benchmark; auto-roll-back on regression.", line_count_est: 420 },
      ],
    }),
    U("P24", 7, "VISION-BLUEPRINT", "MillBlueprintVisionEngine — vision transformer + OCR for raster drawing feature detection (legacy 2D PDF prints)", {
      role: "R1", model: "opus-4.6", effort: 85,
      deliverables: [
        { path: "mcp-server/src/engines/MillBlueprintVisionEngine.ts", type: "source", description: "ViT-B/16 + Tesseract OCR → feature bbox + GD&T callout extraction; feeds GNN (P23-U02).", line_count_est: 460 },
      ],
    }),
    U("P24", 8, "RL-ADAPTIVE", "MillAdaptiveControlRLEngine — online PPO for real-time S/F adjustment from telemetry (replaces static lookup)", {
      role: "R1", model: "opus-4.6", effort: 95,
      deliverables: [
        { path: "mcp-server/src/engines/MillAdaptiveControlRLEngine.ts", type: "source", description: "PPO agent with physics-gated action space (Kienzle upper bound); rewards MRR + tool life - surface roughness. Safe-RL lagrangian for constraint satisfaction.", line_count_est: 540 },
      ],
    }),
    U("P24", 9, "ML-TESTS", "ML/DL comprehensive test — reproducibility + calibration + drift + adversarial + invariance (16+6=22 models)", { role: "R4", role_name: "Tester", effort: 95 }),
  ],
  gate: gate([
    "All models ship ONNX + TypeScript inference wrapper",
    "XAI attribution renders in UI for every MCP mill action",
    "Federated learning: ≥3-shop pilot with ε=1.0 differential privacy budget respected",
    "Causal DAG published for 10 failure modes",
    "ML eval harness catches 100% of seeded drift regressions",
  ], { ralph_required: true, ralph_grade_floor: "A+" }),
});

// ── P25: ML/DL Specialties — Acoustic, Vision, Sensor Fusion, World Models, Mamba, MoE ─
phases.push({
  id: "P25",
  title: "Mill-Specific ML Specialties — Acoustic Chatter, On-Machine Vision, Multi-Sensor Fusion, World Models, Mamba G-code, MoE, Neural ODE, GP, Self-Supervised Pretrain",
  description:
    "Mill-specific ML that P23/P24 don't cover: acoustic chatter detection from microphone/accelerometer, on-machine vision for in-process inspection, multi-modal sensor fusion (force+audio+vibration+spindle-current+coolant-flow+temperature+vision), world models for internal cutting simulation, structured state-space models (Mamba) for long G-code sequences, Mixture of Experts for per-material/per-machine routing, Neural ODEs for physics-continuous dynamics, Gaussian Process regression for data-efficient predictions, Self-supervised pretraining on program corpus, Domain adaptation across machine families, Few-shot / zero-shot for new materials, Curriculum learning, Operator skill transfer (apprentice learning), Data augmentation + synthetic program generation, Noise-robust models for shop-floor sensors.",
  sessions: "8-10",
  primary_role: "R1",
  primary_model: "opus-4.6",
  scrutiny_checkpoint: true,
  scrutiny_focus: [
    "Acoustic chatter F1 ≥ 0.95 on JM Die audio corpus",
    "Vision inspection mAP ≥ 0.90 on in-process part imagery",
    "Sensor-fusion robustness with one channel dropped",
    "Self-supervised pretrain improves downstream by ≥15% vs scratch",
  ],
  units: [
    U("P25", 1, "ACOUSTIC-CHATTER", "AcousticChatterDetectionEngine — CNN + log-mel spectrogram for real-time chatter from microphone/accelerometer", {
      role: "R1", model: "opus-4.6", effort: 90,
      deliverables: [
        { path: "mcp-server/src/engines/AcousticChatterDetectionEngine.ts", type: "source", description: "Sliding-window log-mel spectrogram → ResNet-18 classifier → chatter probability (10ms latency). Cross-correlates with StabilityEngine SLD prediction.", line_count_est: 460 },
      ],
    }),
    U("P25", 2, "ON-MACHINE-VISION", "OnMachineVisionInspectionEngine — vision transformer for in-process part + tool + chip inspection", {
      role: "R1", model: "opus-4.6", effort: 90,
      deliverables: [
        { path: "mcp-server/src/engines/OnMachineVisionInspectionEngine.ts", type: "source", description: "DINOv2 encoder + detection head; inspects (a) tool edge (chip, breakage, BUE), (b) part surface (burrs, burn, chatter marks), (c) chip morphology (BUE, serrated, segmented) from in-machine camera.", line_count_est: 520 },
      ],
    }),
    U("P25", 3, "SENSOR-FUSION", "MultiModalSensorFusionEngine — force + audio + vibration + spindle-current + coolant-flow + temperature + vision fused", {
      role: "R1", model: "opus-4.6", effort: 95,
      deliverables: [
        { path: "mcp-server/src/engines/MultiModalSensorFusionEngine.ts", type: "source", description: "Cross-modal transformer: per-channel encoder + cross-attention fusion; outputs unified health state. Robust to any 1-2 channels dropping out.", line_count_est: 540 },
      ],
    }),
    U("P25", 4, "WORLD-MODEL", "MillWorldModelEngine — learned internal simulator of cutting dynamics for model-based RL + mental rollouts", {
      role: "R1", model: "opus-4.6", effort: 95,
      deliverables: [
        { path: "mcp-server/src/engines/MillWorldModelEngine.ts", type: "source", description: "Dreamer-V3-style recurrent state-space world model; latent rollout for imagined trajectories; pairs with MillAdaptiveControlRLEngine (P24).", line_count_est: 540 },
      ],
    }),
    U("P25", 5, "MAMBA-GCODE", "MillMambaGCodeEngine — Structured State-Space Model (Mamba-2) for long G-code sequences (10K+ blocks)", {
      role: "R1", model: "opus-4.6", effort: 90,
      deliverables: [
        { path: "mcp-server/src/engines/MillMambaGCodeEngine.ts", type: "source", description: "Mamba-2 SSM alternative to Transformer — O(N) memory, handles 100K-block programs end-to-end. Used for whole-program analysis + optimization.", line_count_est: 500 },
      ],
    }),
    U("P25", 6, "MOE-ROUTER", "MillMixtureOfExpertsEngine — per-material/per-machine/per-operation expert routing with sparse gating", {
      role: "R1", model: "opus-4.6", effort: 90,
      deliverables: [
        { path: "mcp-server/src/engines/MillMixtureOfExpertsEngine.ts", type: "source", description: "Top-2 gating over 16 experts (material × operation product); load-balanced. Per-expert parameter efficiency vs monolithic model.", line_count_est: 460 },
      ],
    }),
    U("P25", 7, "NEURAL-ODE", "MillNeuralODEEngine — continuous-time neural ODE for smooth dynamics (tool deflection, thermal transients)", {
      role: "R1", model: "opus-4.6", effort: 90,
      deliverables: [
        { path: "mcp-server/src/engines/MillNeuralODEEngine.ts", type: "source", description: "NODE with adaptive-step solver (Dormand-Prince) — learns residual dynamics over Kienzle baseline. Continuous-time, variable-step inference.", line_count_est: 460 },
      ],
    }),
    U("P25", 8, "GAUSSIAN-PROCESS", "MillGaussianProcessRegressionEngine — data-efficient surrogate for expensive physics simulations", {
      deliverables: [
        { path: "mcp-server/src/engines/MillGaussianProcessRegressionEngine.ts", type: "source", description: "Sparse GP (FITC approximation) over 5-10K FEM simulations; Matern-5/2 kernel; posterior predictive for Bayesian optimization.", line_count_est: 400 },
      ],
    }),
    U("P25", 9, "SELF-SUPERVISED-PRE", "MillSelfSupervisedPretrainEngine — SimMIM / masked-code modeling on 24,545 JM Die programs (label-free)", {
      role: "R1", model: "opus-4.6", effort: 85,
      deliverables: [
        { path: "mcp-server/src/engines/MillSelfSupervisedPretrainEngine.ts", type: "source", description: "Masked-G-code-block prediction objective (15% mask rate); pretrains encoder shared by P23/P24/P25 models. Documented downstream-eval lift.", line_count_est: 440 },
      ],
    }),
    U("P25", 10, "DOMAIN-ADAPT", "MillDomainAdaptationEngine — DANN + CORAL for Haas → Okuma → Hurco → Makino feature alignment", {
      deliverables: [
        { path: "mcp-server/src/engines/MillDomainAdaptationEngine.ts", type: "source", description: "Gradient-reversal layer (DANN) + CORAL feature alignment; bridges JM Die's 5 mill brands so one trained model works across all.", line_count_est: 420 },
      ],
    }),
    U("P25", 11, "FEW-SHOT", "MillFewShotLearningEngine — ProtoNet / MAML for new materials with ≤5 example cuts", {
      deliverables: [
        { path: "mcp-server/src/engines/MillFewShotLearningEngine.ts", type: "source", description: "Meta-learned initializer (MAML) + prototypical-network head; adapts to unseen materials (e.g. new superalloy) from 5 labeled examples.", line_count_est: 400 },
      ],
    }),
    U("P25", 12, "CURRICULUM", "MillCurriculumLearningEngine — curriculum scheduler (easy → medium → hard) for training stability", {
      deliverables: [
        { path: "mcp-server/src/engines/MillCurriculumLearningEngine.ts", type: "source", description: "Scores training samples by difficulty (aluminum 6061 easy → Inconel 718 hard); schedules introduction; beats random-sampling by ≥10% on held-out.", line_count_est: 360 },
      ],
    }),
    U("P25", 13, "APPRENTICE", "MillApprenticeLearningEngine — operator skill transfer from expert traces (demonstrations → policy)", {
      deliverables: [
        { path: "mcp-server/src/engines/MillApprenticeLearningEngine.ts", type: "source", description: "Wraps MillImitationLearningEngine (P23-U16) + MillingReasoningTraceLedger; produces reusable operator-style profile per experienced machinist.", line_count_est: 380 },
      ],
    }),
    U("P25", 14, "AUGMENT-SYNTH", "MillDataAugmentationEngine + MillSyntheticProgramGeneratorEngine — augmentation + GAN/diffusion synthetic programs", {
      deliverables: [
        { path: "mcp-server/src/engines/MillDataAugmentationEngine.ts", type: "source", description: "Program-level augmentation: parameter perturbation, toolpath jitter, feature permutation, material swap.", line_count_est: 280 },
        { path: "mcp-server/src/engines/MillSyntheticProgramGeneratorEngine.ts", type: "source", description: "Conditional diffusion over program sequences; generates plausible never-seen programs to pad training data.", line_count_est: 380 },
      ],
    }),
    U("P25", 15, "NOISE-ROBUST", "MillNoiseRobustModelEngine — noise-injection training + denoising for shop-floor sensor noise (EMI, vibration, coolant spray)", {
      deliverables: [
        { path: "mcp-server/src/engines/MillNoiseRobustModelEngine.ts", type: "source", description: "Adversarial + Gaussian + spike-impulse noise injection during training; denoising autoencoder on sensor streams. Improves SNR floor by 8-12dB.", line_count_est: 360 },
      ],
    }),
    U("P25", 16, "ZERO-SHOT-MAT", "MillZeroShotMaterialEngine — transfer to unseen materials via physics-based prior + Kienzle meta-features", {
      deliverables: [
        { path: "mcp-server/src/engines/MillZeroShotMaterialEngine.ts", type: "source", description: "Embeds unseen material by physics properties (hardness, thermal-cond, spec-heat, density); nearest-neighbor in property space to known material recipes.", line_count_est: 340 },
      ],
    }),
    U("P25", 17, "P25-TESTS", "ML specialties test harness — 17 engine validation w/ real JM Die audio/vision/sensor fixtures", { role: "R4", role_name: "Tester", effort: 95 }),
  ],
  gate: gate([
    "Acoustic chatter F1 ≥ 0.95 on 200 JM Die audio clips (chatter + stable)",
    "Vision inspection mAP ≥ 0.90 on 500 in-process part photos",
    "Sensor fusion degrades gracefully with 1-2 channel dropout (≥90% perf)",
    "World model sim: ≤ 5% reality gap on held-out cuts",
    "Mamba handles 100K-block G-code in <2s",
    "Self-supervised pretrain delivers ≥15% downstream lift",
  ], { ralph_required: true, ralph_grade_floor: "A+" }),
});

// ── P26: MLOps — Experiment Tracking, Versioning, A/B, Data Pipelines, Edge Deployment ─
phases.push({
  id: "P26",
  title: "MLOps — Experiment Tracking, Model Registry, A/B Testing, Data Pipelines, Edge Deployment, Drift Detection",
  description:
    "Production MLOps for the 40+ mill ML models across P12/P13/P23/P24/P25. Experiment tracking (MLflow-style), versioned model registry, A/B evaluation harness, data-pipeline lineage, drift detection + auto-rollback, edge deployment to CNC controllers (ONNX → Tensor-RT / OpenVINO), nightly retraining scheduler, data quality gates, model-card generator, ML cost governance.",
  sessions: "5-7",
  primary_role: "R2",
  primary_model: "sonnet-4.6",
  scrutiny_checkpoint: true,
  units: [
    U("P26", 1, "EXPERIMENT-TRACK", "MillExperimentTrackingEngine — MLflow-compatible local tracking of training runs, hyperparams, metrics, artifacts", {
      deliverables: [
        { path: "mcp-server/src/engines/MillExperimentTrackingEngine.ts", type: "source", description: "Logs (params, metrics, artifacts, git-sha) per run; deterministic seed bundle; browseable via /mill-experiments slash command.", line_count_est: 420 },
      ],
      creates_command: true,
    }),
    U("P26", 2, "MODEL-REGISTRY", "MillModelRegistryEngine — versioned model store (mill-force-pinn@v2.3, mill-gcode-transformer@v1.4)", {
      deliverables: [
        { path: "mcp-server/src/engines/MillModelRegistryEngine.ts", type: "source", description: "Semver-tagged models; staging/production channels; promote/rollback API; model-card on every version.", line_count_est: 400 },
      ],
    }),
    U("P26", 3, "AB-HARNESS", "MillABTestingHarnessEngine — canary + A/B model comparison with statistical significance gate", {
      deliverables: [
        { path: "mcp-server/src/engines/MillABTestingHarnessEngine.ts", type: "source", description: "Traffic-split (10% → 50% → 100%); Bonferroni-adjusted p-values; automated promote-or-revert decision.", line_count_est: 380 },
      ],
    }),
    U("P26", 4, "DATA-PIPELINE", "MillDataPipelineLineageEngine — versioned feature store + dataset lineage for training reproducibility", {
      deliverables: [
        { path: "mcp-server/src/engines/MillDataPipelineLineageEngine.ts", type: "source", description: "DVC-style content-addressed dataset versioning; lineage graph from raw JM Die program → feature → training set → model.", line_count_est: 420 },
      ],
    }),
    U("P26", 5, "DRIFT-AUTO-ROLL", "MillDriftAutoRollbackEngine — production drift detector + auto-rollback to prior model version", {
      deliverables: [
        { path: "mcp-server/src/engines/MillDriftAutoRollbackEngine.ts", type: "source", description: "PSI + KS test on live-vs-training distributions; auto-rollback when drift breaches threshold. Pages operator.", line_count_est: 360 },
      ],
    }),
    U("P26", 6, "EDGE-DEPLOY", "MillEdgeDeploymentEngine — ONNX → TensorRT / OpenVINO / CoreML for deployment to CNC controllers + pendant devices", {
      deliverables: [
        { path: "mcp-server/src/engines/MillEdgeDeploymentEngine.ts", type: "source", description: "Quantize (INT8) + prune + compile for NVIDIA Jetson / Intel NUC / ARM Cortex-M pendants. Fallback compile targets.", line_count_est: 480 },
      ],
    }),
    U("P26", 7, "RETRAIN-SCHED", "MillNightlyRetrainerEngine — scheduled pipeline (fresh JM Die data → retrain → A/B → promote or archive)", {
      deliverables: [
        { path: "mcp-server/src/engines/MillNightlyRetrainerEngine.ts", type: "source", description: "Cron-driven retrain; invokes AutoML (P24-U03); pipes through A/B (P26-U03); writes registry (P26-U02).", line_count_est: 380 },
      ],
    }),
    U("P26", 8, "MODEL-CARD", "MillModelCardGeneratorEngine — auto-generates model-card per version (inputs, limits, fairness, failure modes)", {
      deliverables: [
        { path: "mcp-server/src/engines/MillModelCardGeneratorEngine.ts", type: "source", description: "Per-model markdown with training data distribution, eval metrics, known failure modes, license, governance contact.", line_count_est: 320 },
      ],
    }),
    U("P26", 9, "COST-GOVERN", "MillMLCostGovernanceEngine — track GPU-hours + token spend + inference cost per model; budget alerts", {
      deliverables: [
        { path: "mcp-server/src/engines/MillMLCostGovernanceEngine.ts", type: "source", description: "Per-model cost tracking (train + serve); budget thresholds; alerts at 70%/90%/100% spent.", line_count_est: 280 },
      ],
    }),
    U("P26", 10, "P26-TESTS", "MLOps harness E2E — full train → A/B → drift → rollback → retrain cycle on synthetic regression", { role: "R4", role_name: "Tester", effort: 95 }),
  ],
  gate: gate([
    "Every P12/P13/P23/P24/P25 model registered with version + card",
    "A/B harness runs 5 real comparisons successfully",
    "Drift detection catches 100% of seeded distribution shift",
    "Edge deployment: at least 1 model running on Jetson + Intel NUC",
    "Nightly retrain green on 7 consecutive days",
  ], { ralph_required: true, ralph_grade_floor: "A" }),
});

// ── P17b: Ingestion → Mill Tribal Wiring (Loop 3 — Agent 7: ONLY 1 caller today) ─
phases.push({
  id: "P17b",
  title: "Ingestion → Mill Tribal Wiring — /pdf-learn, /video-learn, /shop-knowledge, customer-feedback",
  description:
    "Agent 7 audit: MillTribalKnowledgeEngine.add() has ONE caller today (MillProgramLearningEngine). /pdf-learn, /video-learn, /shop-knowledge, customer-feedback, operator-writeback — NONE wired to mill tribal. Add explicit bridge engines so every learning surface flows into the mill tribal store with provenance + confidence scoring.",
  sessions: "3",
  primary_role: "R2",
  primary_model: "sonnet-4.6",
  scrutiny_checkpoint: true,
  units: [
    U("P17b", 1, "PDF-MILL", "PDFLearnMillBridgeEngine — routes /pdf-learn output with mill-domain filter to MillTribalKnowledgeEngine.add()", {
      deliverables: [
        { path: "mcp-server/src/engines/PDFLearnMillBridgeEngine.ts", type: "source", description: "Subscribes to PDFSourceRegistryEngine; filters mill-relevant extractions (kc1.1, Taylor, strategy, coolant); persists with source PDF provenance.", line_count_est: 280 },
      ],
    }),
    U("P17b", 2, "VIDEO-MILL", "VideoLearnMillBridgeEngine — routes /video-learn output to mill tribal", {
      deliverables: [
        { path: "mcp-server/src/engines/VideoLearnMillBridgeEngine.ts", type: "source", description: "Subscribes to VideoLearningEngine + VideoActionExtractorEngine; mill-domain filter; persists with timestamp provenance.", line_count_est: 240 },
      ],
    }),
    U("P17b", 3, "SHOP-MILL", "ShopKnowledgeMillBridgeEngine — /shop-knowledge tribal tips into mill store", {
      deliverables: [
        { path: "mcp-server/src/engines/ShopKnowledgeMillBridgeEngine.ts", type: "source", description: "Cross-posts /shop-knowledge tips tagged mill-* to MillTribalKnowledgeEngine.", line_count_est: 180 },
      ],
    }),
    U("P17b", 4, "CUST-FB-MILL", "CustomerFeedbackMillBridgeEngine — customer acceptance/rejection → mill tribal confidence update", {
      deliverables: [
        { path: "mcp-server/src/engines/CustomerFeedbackMillBridgeEngine.ts", type: "source", description: "Captures customer program acceptance; updates tip confidence scores; auto-archives contradicted tips.", line_count_est: 260 },
      ],
    }),
    U("P17b", 5, "INGEST-TESTS", "Integration test — every bridge engine actually flows 5+ sample inputs end-to-end into MillTribalKnowledgeEngine with provenance intact", { role: "R4", role_name: "Tester" }),
  ],
  gate: gate(["All 4 bridges flow ≥5 sample inputs end-to-end", "Provenance preserved on every ingested tip", "Contradicted tips auto-archived with audit"]),
});

// ── P19b: Interim Safety Binding (Loop 3 — Agent 6: chain broken at 3 layers) ─
phases.push({
  id: "P19b",
  title: "Interim Safety Binding — Bind Existing Guards to Mill Call Path Before P1/P19/P21 Land",
  description:
    "Agent 6 found that until P1 dispatcher, P19 router, and P21 hooks land, every mill request reaches engines UNCHECKED. Bind 3 existing generic validators (validateCrossFieldPhysics, validateMaterialSanity, machineLimitGuard) to the current mill call path via camDispatcher + routes/milling.ts as an interim defense-in-depth measure. Keeps mill requests safe during the multi-session build-out of the permanent chain.",
  sessions: "1",
  primary_role: "R1",
  primary_model: "opus-4.6",
  scrutiny_checkpoint: true,
  units: [
    U("P19b", 1, "INTERIM-BIND", "Bind 3 generic validators to current mill call path", {
      role: "R1", model: "opus-4.6", effort: 90,
      deliverables: [
        { path: "mcp-server/src/tools/dispatchers/camDispatcher.ts", type: "source", description: "Import + invoke validateCrossFieldPhysics, validateMaterialSanity, machineLimitGuard on mill-flagged actions.", line_count_est: 120 },
        { path: "mcp-server/src/routes/milling.ts", type: "source", description: "Same validators applied at route boundary as defense-in-depth.", line_count_est: 80 },
      ],
    }),
    U("P19b", 2, "INTERIM-TEST", "50 adversarial mill requests prove interim binding blocks unsafe inputs", { role: "R4", role_name: "Tester" }),
  ],
  gate: gate(["All 50 adversarial mill requests blocked by interim validators", "Zero false-negatives on interim suite"], { ralph_required: true }),
});

// ── P16: EXHAUSTIVE TERMINAL TEST SUITE ─────────────────────────
phases.push({
  id: "P16",
  title: "EXHAUSTIVE TERMINAL TEST SUITE — Print-to-Program + Live CAD + CAM in 4 Systems + Synergy Validation",
  description:
    "Terminal phase. Four parallel harnesses: (1) Print-to-Program 10,500-cell matrix; (2) Live CAD modeling in SolidWorks + Inventor + Fusion 360; (3) CAM programming validation in Mastercam + hyperCAD-S/hyperMILL + Inventor HSM/CAM + Fusion 360 Manufacturing (120 jobs, bit-for-bit diffing); (4) Full-stack synergy validation — every mill engine reachable via MillMasterOrchestratorFacadeEngine, every AI call traceable, every CAM choice justified by CAMAGIMasterOrchestratorEngine, no orphan engines. Monte Carlo variability, ground-truth comparison vs 20K+ JM Die programs, controller regression on 7 dialects, safety adversarial suite, PRISM Master AI integration check.",
  sessions: "8-10",
  primary_role: "R4",
  primary_model: "opus-4.6",
  scrutiny_checkpoint: true,
  scrutiny_focus: [
    "Test coverage matrix completeness",
    "Ground-truth drift vs JM Die archive",
    "Cross-CAM parity Mastercam/hyperMILL/Inventor/Fusion360",
    "Full-stack cohesion — no orphan engines / facades / dispatchers",
  ],
  units: [
    U("P16", 1, "P2P-HARNESS", "Print-to-Program harness — 50+ prints × 6 machines × 5 materials × 7 controllers = 10,500 cells — every cell routes through MillMasterOrchestratorFacadeEngine", {
      role: "R4", role_name: "Tester", effort: 95,
      deliverables: [
        { path: "mcp-server/src/__tests__/mill-terminal/print-to-program.harness.test.ts", type: "test", description: "Cartesian matrix runner with deterministic seeding + snapshot diffing. All calls through facade.", line_count_est: 820 },
        { path: "mcp-server/src/__tests__/mill-terminal/fixtures/prints/", type: "data", description: "50+ fixtures (aluminum fastener dies, hardened punch/die, medical, defense).", line_count_est: 0 },
      ],
      exit_conditions: [
        "All 10,500 cells execute to pass/fail/skip (no timeouts, no errors)",
        "Pass rate ≥ 95% on supported combinations",
        "Snapshot determinism: diff ≤ 0.5% across re-runs",
        "Drift vs JM Die ground truth ≤ 15% by any physics metric",
        "100% of cells route through MillMasterOrchestratorFacadeEngine (no direct engine calls)",
      ],
    }),
    U("P16", 2, "LIVE-SW", "Live CAD — SolidWorks COM bridge. 30 parametric parts → features → program → geometry round-trip."),
    U("P16", 3, "LIVE-INV", "Live CAD — Inventor iLogic + iFeatures. 30 parametric parts + fastener die families."),
    U("P16", 4, "LIVE-F360", "Live CAD — Fusion 360 Python API. 30 timeline-driven parts + Generative handoff."),
    U("P16", 5, "CAM-MC", "CAM validation — Mastercam 2024. 30 parametric jobs, PRISM vs Mastercam diff ≤ 1 feature."),
    U("P16", 6, "CAM-HM", "CAM validation — hyperMILL AC. 30 parametric jobs, sequence control, diff."),
    U("P16", 7, "CAM-INV", "CAM validation — Inventor HSM/CAM. 30 iFeature-driven jobs."),
    U("P16", 8, "CAM-F360", "CAM validation — Fusion 360 Manufacturing. 30 adaptive-clearing + 5-axis-swarf jobs."),
    U("P16", 9, "MC-VAR", "Monte Carlo — 500+ runs per machine. Perturb hardness ±10%, wear ±5%, load ±5%, coolant ±20%, clamping ±15%."),
    U("P16", 10, "CTRL-REG", "Controller regression — Haas NGC / Fanuc 31iB5 / Siemens 840D / Makino Pro5 / Okuma OSP-P300M / Heidenhain TNC 640 / Mitsubishi M800M."),
    U("P16", 11, "TRIBAL-CONSIST", "Tribal-knowledge consistency — every tip applied at least once; zero orphan tips, zero silently-skipped rules."),
    U("P16", 12, "GROUND-TRUTH", "Ground truth — 500 random JM Die programs; PRISM regenerate; diff cycle-time ±10%, tool-count exact."),
    U("P16", 13, "SYNERGY-AUDIT", "Full-stack synergy audit — trace a request from web UI → MillStudioContext → millDispatcher → MillMasterOrchestratorFacadeEngine → CAMAGIMasterOrchestratorEngine → sub-orchestrators → engines → physics constants → PostProcessorPipelineEngine → NC output. Audit 20+ distinct flows; zero orphan engines.", {
      deliverables: [
        { path: "mcp-server/data/state/MILL-MASTER/synergy-audit-report.json", type: "state", description: "Per-flow call graph + coverage report. 100% of 114 mill engines reachable through facade.", line_count_est: 2000 },
      ],
      exit_conditions: [
        "100% of 114 registered mill engines reachable from millDispatcher",
        "Every AI engine traced in MillingReasoningTraceLedgerEngine",
        "Every CAM decision traceable to CAMAGIMasterOrchestratorEngine reasoning mode",
        "Zero engines called outside the facade chain",
        "PRISMSelfAwarenessEngine.recommendMillFeatures returns a valid engine set for every test task",
      ],
    }),
    U("P16", 14, "SAFETY-ADV", "Safety adversarial suite — 100 corrupted/edge inputs; every unsafe case hard-blocked by safety hooks; zero false negatives."),
    U("P16", 15, "PHYS-UQ", "Physics UQ — Kienzle force confidence intervals validated against instrumented test cuts; coverage ≥ 90%."),
    U("P16", 16, "AI-INT-CHECK", "PRISM Master AI integration check — prism_ai + prism_cam + millDispatcher all return consistent recommendations; cross-dispatcher call graph walked and validated."),
    U("P16", 17, "MCX8-CPS-VERIFY", "Verify Mastercam .mcx-8 read/write + CPS (Fusion) parser end-to-end round-trip (Agent 9 finding: inferred-wired, not verified)", { role: "R4", role_name: "Tester" }),
    U("P16", 18, "SESSION-MEM-VERIFY", "Verify mill session+memory persistence — MillStudioContext → ContextSnapshotEngine → PersistentMemoryEngine → SessionHandoffV2Engine round-trip (Agent 10 finding)", { role: "R4", role_name: "Tester" }),
    U("P16", 19, "TELEM-VERIFY", "Verify mill telemetry emission — every dispatcher action emits to HookTelemetryEngine / OpenTelemetryTracingEngine (Agent 10 finding)", { role: "R4", role_name: "Tester" }),
    U("P16", 20, "CROSS-SYS-VERIFY", "Cross-system verification — Mill → Quote, Mill → CAD DFM, Mill → Inspection, Mill → ERP job scheduling end-to-end (Agent 10 finding)", { role: "R4", role_name: "Tester" }),
    U("P16", 21, "MCP-AUTODISC-VERIFY", "Verify P21-U10..U13 MCP auto-discovery — assert DispatcherAutoDiscoveryEngine, schemaReflectionMiddleware, DispatcherHotRegisterEngine, audit-mcp-registration.mjs all fire on dispatcher add/remove (Agent 5 gap)", { role: "R4", role_name: "Tester" }),
    U("P16", 22, "DOCGEN-VERIFY", "Verify P22 doc generators — regenerate MILL_COMMAND_REGISTRY.md + MILL_ENGINE_DIGEST.md idempotently; assert zero diff on re-run (Agent 5 gap)", { role: "R4", role_name: "Tester" }),
    U("P16", 23, "HNSW-RECALL", "HNSW recipe lookup correctness — assert recall@k on 500 JM Die query programs ≥ 0.85 (Agent 5 gap)", { role: "R4", role_name: "Tester" }),
    U("P16", 24, "STATE-ROUNDTRIP", "State round-trip — Calibration, SPC, Playbook, Anomaly persistence engines all survive full save/load/restore (Agent 5 gap)", { role: "R4", role_name: "Tester" }),
    U("P16", 25, "PER-HOOK-CONTRACT", "Per-hook contract tests — each of 5 mill hooks (Kienzle/MatMach/Thermal/Deflection/LiveTool) has a dedicated contract test covering block + warn + pass paths (Agent 5 gap)", { role: "R4", role_name: "Tester" }),
    U("P16", 26, "RELEASE-GATE", "Release gate — aggregate pass report, publish MILL-MASTER-RELEASE-CERT.md, sign off Omega=1.0, handshake to production."),
  ],
  gate: gate(
    [
      "10,500-cell print-to-program matrix ≥ 95% pass",
      "Live-CAD cross-system round-trip exact on ≥ 90 parts (30×3 CAD systems)",
      "CAM parity across 4 systems diff ≤ 1 feature on 120 jobs",
      "Monte Carlo variance within ±20%",
      "Controller regression green on 7 dialects",
      "Ground-truth drift vs JM Die ≤ 15%",
      "Synergy audit: 100% engine reachability through facade",
      "Zero safety false-negatives on adversarial suite",
      "Cross-dispatcher AI consistency validated",
    ],
    { ralph_required: true, ralph_grade_floor: "A+" },
  ),
});

// ── Loop 6 additions ──────────────────────────────────────────────

// ── P34: Disaster Recovery + Business Continuity (L6-A4 BLOCK) ──
phases.push({
  id: "P34",
  title: "Disaster Recovery + Business Continuity — ISO 22301 BCMS + 3-2-1-1-0 Backup + RTO/RPO + Cold-Start Runbook",
  description: "L6-A4 BLOCK: v7 P30 covers process resilience (checkpoint/watchdog) but zero BCMS. Adds BIA, RTO/RPO calibration, 3-2-1-1-0 backup with immutable WORM ledger, ransomware resilience, cold-start DR drill, regulatory retention (ITAR 10y/NADCAP 5y/Part 11 7y), and geo-redundant replication. Without P34 the program library is single-point-of-failure.",
  sessions: "4-5", primary_role: "R1", primary_model: "opus-4.6", scrutiny_checkpoint: true,
  units: [
    U("P34", 1, "BIA", "MillBusinessImpactAnalysisEngine — asset class MTPD/RTO/RPO/MAO per category", { role: "R1", model: "opus-4.6", effort: 95, deliverables: [{ path: "mcp-server/src/engines/MillBusinessImpactAnalysisEngine.ts", type: "source", description: "Classifies library/ledger/tribal/customer/registry; emits JM Die-specific impact scores; ISO 22301 §8.2.2.", line_count_est: 360 }] }),
    U("P34", 2, "RTO-RPO", "MillRTORPOCalibrationEngine — enforces recovery SLAs with violation hooks", { deliverables: [{ path: "mcp-server/src/engines/MillRTORPOCalibrationEngine.ts", type: "source", description: "Library RPO 15min, ledger RPO 0, quote pipeline RTO 1h. Emits SLA violation events.", line_count_est: 300 }] }),
    U("P34", 3, "BACKUP-321110", "MillBackup321110PolicyEngine — 3 copies × 2 media × 1 offsite × 1 immutable × 0 errors", { role: "R1", model: "opus-4.6", effort: 90, deliverables: [{ path: "mcp-server/src/engines/MillBackup321110PolicyEngine.ts", type: "source", description: "Schedule, checksum verify, drift alert. Covers JM DIE archive, tribal DB, registries.", line_count_est: 420 }] }),
    U("P34", 4, "WORM-LEDGER", "MillImmutableWORMLedgerEngine — upgrade audit ledger to object-lock/hash-chain for Part 11 §11.10(e)", { deliverables: [{ path: "mcp-server/src/engines/MillImmutableWORMLedgerEngine.ts", type: "source", description: "Append-only hash-linked blocks; extends P10-U08 AtomicAuditLedger with true immutability.", line_count_est: 380 }] }),
    U("P34", 5, "COLD-START", "MillColdStartRunbookEngine + MillDRDrillRunner — documented restore sequence + monthly CI drill", { deliverables: [{ path: "mcp-server/src/engines/MillColdStartRunbookEngine.ts", type: "source", description: "Bootstrap order, pass/fail gate, target <4h. Monthly CI-exercised.", line_count_est: 340 }] }),
    U("P34", 6, "RANSOMWARE", "MillRansomwareResilienceEngine — air-gapped tier + WORM S3 object-lock + encryption-anomaly detector", { deliverables: [{ path: "mcp-server/src/engines/MillRansomwareResilienceEngine.ts", type: "source", description: "Anomaly on mass-encrypt events; air-gap snapshot tier; instant isolation.", line_count_est: 320 }] }),
    U("P34", 7, "RETENTION", "MillRegulatoryRetentionLifecycleEngine — ITAR 10y / NADCAP 5y / Part 11 7y / ISO 13485 15y", { deliverables: [{ path: "mcp-server/src/engines/MillRegulatoryRetentionLifecycleEngine.ts", type: "source", description: "Per-class schedules, legal hold, defensible deletion.", line_count_est: 300 }] }),
    U("P34", 8, "GEO-REPL", "MillGeoRedundantReplicationEngine — cross-site async replication + RPO-bounded divergence alarms", { deliverables: [{ path: "mcp-server/src/engines/MillGeoRedundantReplicationEngine.ts", type: "source", description: "Health check, failover protocol, site quorum.", line_count_est: 320 }] }),
    U("P34", 9, "P34-TESTS", "DR drill integration — cold backup restore → P16 regression green on JM Die corpus", { role: "R4", role_name: "Tester", effort: 95 }),
  ],
  gate: gate(["Live DR drill <4h RTO met", "3-2-1-1-0 verified on library + ledger + tribal", "Ransomware simulation isolated within SLA", "Retention schedules auto-purge test green"], { ralph_required: true, ralph_grade_floor: "A" }),
});

// ── P35: Privacy / GDPR / CCPA / LGPD (L6-A6 BLOCK) ──
phases.push({
  id: "P35",
  title: "Privacy — GDPR + CCPA/CPRA + PIPEDA + LGPD + Operator Surveillance + Cross-Border Transfer",
  description: "L6-A6 BLOCK: v7 has multi-tenant isolation (P29) and ITAR vault (P10) but zero dedicated privacy. Adds Art. 6 lawful basis, Art. 13/14/17/20/25/30/32/33/34/35 coverage, CCPA GPC, LGPD, operator-surveillance consent for EU works councils, customer drawing vault with watermarking, ML training PII scrubber, SCCs/TIAs for cross-border, vendor DPA registry, and retention matrix.",
  sessions: "4-5", primary_role: "R1", primary_model: "opus-4.6", scrutiny_checkpoint: true,
  units: [
    U("P35", 1, "LAWFUL-BASIS", "GDPRLawfulBasisRegistryEngine — per-category Art. 6 map + LIA wizard", { role: "R1", model: "opus-4.6", effort: 95, deliverables: [{ path: "mcp-server/src/engines/GDPRLawfulBasisRegistryEngine.ts", type: "source", description: "Covers consent/contract/legal-obligation/vital/public/legitimate; LIA balancing test.", line_count_est: 340 }] }),
    U("P35", 2, "NOTICES", "DataSubjectNoticeEngine — Art. 13/14 notice generator per tenant/locale", { deliverables: [{ path: "mcp-server/src/engines/DataSubjectNoticeEngine.ts", type: "source", description: "Locale-aware templates; tenant-customizable; versioned notice archive.", line_count_est: 280 }] }),
    U("P35", 3, "ERASURE", "RightToErasureEngine — cascading subject-scoped delete across 14 stores with crypto-shred for immutable ledger", { role: "R1", model: "opus-4.6", effort: 95, deliverables: [{ path: "mcp-server/src/engines/RightToErasureEngine.ts", type: "source", description: "Per-subject AES key escrow; key destruction reconciles Art. 17 with P34 WORM ledger.", line_count_est: 440 }] }),
    U("P35", 4, "PORTABILITY", "DataPortabilityExportEngine — Art. 20 JSON/CSV/JSON-LD subject export", { deliverables: [{ path: "mcp-server/src/engines/DataPortabilityExportEngine.ts", type: "source", description: "Machine-readable; preserves relationships; signed export bundle.", line_count_est: 240 }] }),
    U("P35", 5, "ROPA", "ROPAAutomationEngine — Art. 30 records of processing auto-synthesized from asset registry", { deliverables: [{ path: "mcp-server/src/engines/ROPAAutomationEngine.ts", type: "source", description: "Enumerates purposes/categories/retention/recipients; CSV+JSON export.", line_count_est: 260 }] }),
    U("P35", 6, "DPIA", "DPIATriggerEngine — Art. 35 auto-DPIA with WP29 9-criteria checklist", { deliverables: [{ path: "mcp-server/src/engines/DPIATriggerEngine.ts", type: "source", description: "Fires on employee-telemetry / biometric / cross-border / high-risk ML.", line_count_est: 300 }] }),
    U("P35", 7, "BREACH", "BreachNotificationWorkflowEngine — 72-hour supervisory + data-subject state machine", { deliverables: [{ path: "mcp-server/src/engines/BreachNotificationWorkflowEngine.ts", type: "source", description: "Severity classifier; template library; audit-trail.", line_count_est: 340 }] }),
    U("P35", 8, "OP-SURVEIL", "OperatorSurveillanceConsentEngine — EU works-council consultation + k-anonymity ≥5 for cycle-time", { deliverables: [{ path: "mcp-server/src/engines/OperatorSurveillanceConsentEngine.ts", type: "source", description: "Consent capture; anonymization mode; opt-in/out audit.", line_count_est: 300 }] }),
    U("P35", 9, "DRAWING-VAULT", "CustomerDrawingVaultEngine — AES-256-GCM + per-view watermarking + time-boxed URLs", { role: "R1", model: "opus-4.6", effort: 90, deliverables: [{ path: "mcp-server/src/engines/CustomerDrawingVaultEngine.ts", type: "source", description: "Steganographic tenant+user+timestamp; extends P10-U07 ITAR vault.", line_count_est: 380 }] }),
    U("P35", 10, "ML-SCRUB", "MLPrivacyScrubberEngine — PII detector + redactor on training corpora", { deliverables: [{ path: "mcp-server/src/engines/MLPrivacyScrubberEngine.ts", type: "source", description: "Regex + NER; synthetic augmentation via P27 federated pipeline.", line_count_est: 320 }] }),
    U("P35", 11, "XBORDER", "CrossBorderTransferEngine — SCC modules + TIA generator + Schrems II gate", { deliverables: [{ path: "mcp-server/src/engines/CrossBorderTransferEngine.ts", type: "source", description: "Adequacy-decision map; automated TIA; blocks non-compliant transfers.", line_count_est: 340 }] }),
    U("P35", 12, "VENDOR-DPA", "VendorDPARegistryEngine + RetentionPolicyEngine — sub-processor register + auto-purge scheduler", { deliverables: [{ path: "mcp-server/src/engines/VendorDPARegistryEngine.ts", type: "source", description: "Mastercam/Onshape/Autodesk/Fusion DPAs; retention schedules.", line_count_est: 280 }] }),
    U("P35", 13, "P35-TESTS", "Privacy suite — CCPA GPC honored, SAR <30 days, DPIA auto-generated, erasure penetration test green", { role: "R4", role_name: "Tester", effort: 95 }),
  ],
  gate: gate(["CCPA GPC end-to-end", "SAR <30 days", "DPIA auto-gen on P23 training", "Breach drill <72h", "Erasure penetration test proves completeness across 14 stores"], { ralph_required: true, ralph_grade_floor: "A+" }),
});

// ── P36: Collision Edge Cases (L6-A7 WARN) ──
phases.push({
  id: "P36",
  title: "Kinematic + Collision Edge Cases — Singularity / IK / TCPM / GJK+BVH / Workholding / STEP-NC / Digital Twin Latency",
  description: "L6-A7 WARN: v7 mentions singularity + swept-volume but lacks C2 NURBS retiming, IK multi-solution selector, 5-level ISO 10791-6 hierarchy, GJK+BVH, stylus pre-travel, thermal-envelope expansion, multi-channel Swiss guide-bushing, workholding corpus, digital-twin latency compensation, and STEP-NC AP-238 ingest.",
  sessions: "4-5", primary_role: "R1", primary_model: "opus-4.6", scrutiny_checkpoint: true,
  units: [
    U("P36", 1, "SINGULARITY", "SingularityAvoidanceEngine — C2 NURBS retiming near A-B gimbal + A-C wrist", { role: "R1", model: "opus-4.6", effort: 95, deliverables: [{ path: "mcp-server/src/engines/SingularityAvoidanceEngine.ts", type: "source", description: "Affouard-style C2 reparameterization; singularity neighborhood blending.", line_count_est: 420 }] }),
    U("P36", 2, "IK-MULTI", "IKMultiSolutionSelectorEngine — elbow-up/down + joint-limit-aware shortest path", { deliverables: [{ path: "mcp-server/src/engines/IKMultiSolutionSelectorEngine.ts", type: "source", description: "Continuity across tool changes; configurable selection policy.", line_count_est: 360 }] }),
    U("P36", 3, "SWEPT-GJK", "SweptVolumeCollisionEngine — GJK + BVH + 5-level ISO 10791-6 hierarchy (tool/holder/shank/spindle/fixture)", { role: "R1", model: "opus-4.6", effort: 95, deliverables: [{ path: "mcp-server/src/engines/SweptVolumeCollisionEngine.ts", type: "source", description: "GJK primitive overlap; BVH acceleration; staged escalation.", line_count_est: 520 }] }),
    U("P36", 4, "PROBE-COLL", "ProbeCycleCollisionEngine — Renishaw OMP IR/radio LOS + stylus pre-travel bend model", { deliverables: [{ path: "mcp-server/src/engines/ProbeCycleCollisionEngine.ts", type: "source", description: "Stylus bend angle vs pre-travel; LOS occlusion check.", line_count_est: 320 }] }),
    U("P36", 5, "THERMAL-ENV", "ThermalEnvelopeExpansionEngine — runtime ΔZ from spindle growth widens collision bound", { deliverables: [{ path: "mcp-server/src/engines/ThermalEnvelopeExpansionEngine.ts", type: "source", description: "Couples MillSpindleThermalGrowthEngine into swept-volume bound.", line_count_est: 240 }] }),
    U("P36", 6, "RETRACT", "RetractPathCollisionEngine — G0-through-stock + dog-leg vs radial engagement audit", { deliverables: [{ path: "mcp-server/src/engines/RetractPathCollisionEngine.ts", type: "source", description: "Cross-checks rapid-move validator with engagement controller.", line_count_est: 260 }] }),
    U("P36", 7, "MULTICHAN", "MultiChannelCollisionEngine — mill-turn main+sub+turret+B + Swiss guide-bush 3-5mm band", { deliverables: [{ path: "mcp-server/src/engines/MultiChannelCollisionEngine.ts", type: "source", description: "Cincom/Star guide-bush overhang; coordinated channel sweep.", line_count_est: 400 }] }),
    U("P36", 8, "WORKHOLD", "WorkholdingObstructionEngine — vise/chuck jaw + mag-pole array + vacuum port corpus", { deliverables: [{ path: "mcp-server/src/engines/WorkholdingObstructionEngine.ts", type: "source", description: "Obstruction primitives indexed by workholding class.", line_count_est: 340 }] }),
    U("P36", 9, "DT-LATENCY", "DigitalTwinLatencyCompEngine — margin = v_rapid × latency + jitter σ", { deliverables: [{ path: "mcp-server/src/engines/DigitalTwinLatencyCompEngine.ts", type: "source", description: "Latency-aware safety expansion.", line_count_est: 220 }] }),
    U("P36", 10, "STEPNC", "STEPNCKinematicIngestEngine — ISO 10303-238 AP-238 → PRISM machine model", { deliverables: [{ path: "mcp-server/src/engines/STEPNCKinematicIngestEngine.ts", type: "source", description: "AP-238 parser; kinematic tree import.", line_count_est: 360 }] }),
    U("P36", 11, "TCPM-AUDIT", "TCPMCancellationAuditHook — G43.4 wrong-axis + mid-move toggle detector", { deliverables: [{ path: "mcp-server/src/hooks/tcpmCancellationAudit.ts", type: "source", description: "Hook fires on bad TCPM toggles; integrates with GCodeSafetyAnalyzer.", line_count_est: 180 }] }),
    U("P36", 12, "P36-TESTS", "Collision suite — 200 adversarial toolpaths across 5-axis + mill-turn + Swiss + probe cycles", { role: "R4", role_name: "Tester", effort: 95 }),
  ],
  gate: gate(["200-case collision suite green", "Swiss guide-bush 3-5mm band modeled", "Digital-twin latency compensation verified on 50ms lag", "TCPM cancellation audit blocks all 20 seeded bad toggles"], { ralph_required: true, ralph_grade_floor: "A" }),
});

// ── P37: Spindle Warmup (L6-A8 BLOCK) ──
phases.push({
  id: "P37",
  title: "Spindle Warmup + Thermal Stabilization — Per-Brand Recipes + ISO 230-3 + Okuma TAS + Mazak Thermal Shield",
  description: "L6-A8 BLOCK: v7 has only generic MillSpindleThermalGrowthEngine (P27-U06). Adds brand-specific recipes (Precise/Colombo/GMN/Kessler/Weiss/Fischer/Ibag), Okuma TAS + Mazak Thermal Shield integration, warmup program generator per controller dialect, equilibrium predictor, skip-policy decision table, coolant chiller coupling, shutdown rampdown, and bearing preload thermal coupling.",
  sessions: "3-4", primary_role: "R2", primary_model: "sonnet-4.6", scrutiny_checkpoint: true,
  units: [
    U("P37", 1, "RECIPE-REG", "SpindleWarmupRecipeRegistryEngine — JSON catalog keyed by {brand, model, bearing_type, rpm_max, drive_type}", { deliverables: [{ path: "mcp-server/src/engines/SpindleWarmupRecipeRegistryEngine.ts", type: "source", description: "Precise 5-stage 30min, GMN 10min 50%, Weiss 8-stage, Fischer, Ibag >30k HSK, Okuma TAS, Mazak, Makino, Hurco WinMax, Haas HSS100/50 motorized-vs-belt branch.", line_count_est: 520 }] }),
    U("P37", 2, "PROG-GEN", "SpindleWarmupProgramGeneratorEngine — emits brand-correct G-code per controller dialect", { deliverables: [{ path: "mcp-server/src/engines/SpindleWarmupProgramGeneratorEngine.ts", type: "source", description: "M03/M05 + S-ladder + dwell + M19 orient; Fanuc/OSP/Matrix/Pro5/WinMax/NGC dialects.", line_count_est: 480 }] }),
    U("P37", 3, "EQUIL-PRED", "ThermalEquilibriumPredictorEngine — two-state Kalman predicts stabilization time", { deliverables: [{ path: "mcp-server/src/engines/ThermalEquilibriumPredictorEngine.ts", type: "source", description: "Inputs: ambient, oil_T, bore_T, target_rpm, bearing_class. Outputs: time + confidence.", line_count_est: 340 }] }),
    U("P37", 4, "SKIP-POLICY", "WarmupSkipPolicyEngine — decision table over time-since-last-run + ΔT + tolerance-band", { deliverables: [{ path: "mcp-server/src/engines/WarmupSkipPolicyEngine.ts", type: "source", description: "Full/partial/skip with audit trail; 1hr/12hr/72hr branches.", line_count_est: 260 }] }),
    U("P37", 5, "GROWTH-COMP", "SpindleGrowthCompensationEngine — per-SN learned tau + ISO 230-3 auto-writes TAS/TRP/R-vars/Q-params (SUBSUMES P27-U06)", { role: "R1", model: "opus-4.6", effort: 90, deliverables: [{ path: "mcp-server/src/engines/SpindleGrowthCompensationEngine.ts", type: "source", description: "Per-SN learned τ; auto-writes Okuma TAS / Mazak TRP / Fanuc R-vars / Heidenhain Q. Deprecates P27-U06.", line_count_est: 460 }] }),
    U("P37", 6, "CHILLER-CPL", "CoolantChillerCouplingEngine — chiller setpoint vs ambient ΔT drives equilibrium multiplier", { deliverables: [{ path: "mcp-server/src/engines/CoolantChillerCouplingEngine.ts", type: "source", description: "Integrates with FluidThermalDispatcher.", line_count_est: 200 }] }),
    U("P37", 7, "RAMPDOWN", "ShutdownRampdownEngine — safe spin-down + seal-lube + axis park + oil-mist off", { deliverables: [{ path: "mcp-server/src/engines/ShutdownRampdownEngine.ts", type: "source", description: "Night/weekend rampdown reduces bearing/seal wear.", line_count_est: 220 }] }),
    U("P37", 8, "PRELOAD", "SpindleBearingPreloadEngine — angular-contact preload vs differential expansion", { deliverables: [{ path: "mcp-server/src/engines/SpindleBearingPreloadEngine.ts", type: "source", description: "Warns when preload <30% nominal; predicts runout/scoring risk.", line_count_est: 280 }] }),
    U("P37", 9, "P37-TESTS", "Per-brand recipe golden tests vs OEM service manuals + JM Die Okuma programs", { role: "R4", role_name: "Tester", effort: 90 }),
  ],
  gate: gate(["Recipe catalog covers 10+ spindle brands", "ISO 230-3 thermal comp ±5μm measured", "Warmup program generator emits valid G-code in 6+ dialects", "Skip-policy audit trail complete", "P27-U06 deprecation migration green"], { ralph_required: true, ralph_grade_floor: "A" }),
});

// ── P38: Multi-Station Cell / Lights-Out (L6-A9 BLOCK) ──
phases.push({
  id: "P38",
  title: "Multi-Station Cell Planning — FMS + Pallet Pool + Robot Loader + Lights-Out Risk + Cell OEE + Energy-Aware Scheduling",
  description: "L6-A9 BLOCK: v7 has generic JobShopScheduling but zero cell/FMS coverage. Adds Fastems/Makino/Matsuura/Mazak FMS adapters, 20-pallet × 3-job CP-SAT optimizer, robot loader handshake, APC vs AWC precision cost, lights-out per-event risk policy, cross-pallet tool life, chip conveyor telemetry, fire suppression interlock, cell-level OEE, hot-job insertion, energy-aware scheduling, kit-to-cell logistics, and cell digital twin.",
  sessions: "5-6", primary_role: "R1", primary_model: "opus-4.6", scrutiny_checkpoint: true,
  units: [
    U("P38", 1, "FMS-ADAPT", "FMSSchedulingAdapterEngine — Fastems MMS + Makino MMC2/3 + Matsuura Cublex + Mazak Palletech + Okuma OSP-FMS", { role: "R1", model: "opus-4.6", effort: 95, deliverables: [{ path: "mcp-server/src/engines/FMSSchedulingAdapterEngine.ts", type: "source", description: "Unified pallet/job/machine state model; 5 vendor APIs.", line_count_est: 620 }] }),
    U("P38", 2, "PALLET-OPT", "PalletPoolOptimizerEngine — CP-SAT 20-pallet × 3-job queue; due-date + setup + tool/fixture-share cost", { role: "R1", model: "opus-4.6", effort: 95, deliverables: [{ path: "mcp-server/src/engines/PalletPoolOptimizerEngine.ts", type: "source", description: "OR-Tools CP-SAT; APC/AWC precision cost term.", line_count_est: 520 }] }),
    U("P38", 3, "ROBOT-HS", "RobotLoaderHandshakeEngine — Fanuc R-30iB + KUKA KRC5 + UR e-Series + Midaco", { deliverables: [{ path: "mcp-server/src/engines/RobotLoaderHandshakeEngine.ts", type: "source", description: "M-code + I/O state machine; mis-grip/E-stop recovery.", line_count_est: 440 }] }),
    U("P38", 4, "APC-AWC", "APCvsAWCPrecisionCostEngine — ±0.001 vs ±0.01 repeatability cost term", { deliverables: [{ path: "mcp-server/src/engines/APCvsAWCPrecisionCostEngine.ts", type: "source", description: "Feeds PalletPoolOptimizer cost function.", line_count_est: 180 }] }),
    U("P38", 5, "LO-RISK", "LightsOutRiskPolicyEngine — per-event abort/retry/continue runbook", { role: "R1", model: "opus-4.6", effort: 95, deliverables: [{ path: "mcp-server/src/engines/LightsOutRiskPolicyEngine.ts", type: "source", description: "Tool-break→abort+hold, probe-fail→retry3, chip-alarm→pause, spindle-spike→abort; morning-review queue.", line_count_est: 420 }] }),
    U("P38", 6, "TOOL-LIFE-X", "CrossPalletToolLifeEngine — predictive swap + short-cycle-first allocation", { deliverables: [{ path: "mcp-server/src/engines/CrossPalletToolLifeEngine.ts", type: "source", description: "Spare-in-magazine check; per-pallet-queue allocation.", line_count_est: 340 }] }),
    U("P38", 7, "CHIP-CONV", "ChipConveyorMonitorEngine — amp-draw + torque telemetry; jam-predict", { deliverables: [{ path: "mcp-server/src/engines/ChipConveyorMonitorEngine.ts", type: "source", description: "MTTF estimation; filterless-sump monitoring.", line_count_est: 260 }] }),
    U("P38", 8, "FIRE-SUPP", "FireSuppressionInterlockEngine — Firetrace/Amerex + Al-mist vs vapor", { deliverables: [{ path: "mcp-server/src/engines/FireSuppressionInterlockEngine.ts", type: "source", description: "E-stop + coolant-cut + extraction interlock.", line_count_est: 240 }] }),
    U("P38", 9, "CELL-OEE", "CellLevelOEEEngine — pool-weighted A×P×Q; day vs lights-out split", { deliverables: [{ path: "mcp-server/src/engines/CellLevelOEEEngine.ts", type: "source", description: "Pareto of losses; per-cell vs per-machine breakout.", line_count_est: 320 }] }),
    U("P38", 10, "HOT-JOB", "HotJobInsertionEngine — bump-cost = setup-lost + due-date-risk + tool-swap", { deliverables: [{ path: "mcp-server/src/engines/HotJobInsertionEngine.ts", type: "source", description: "L2-override gate; extends OperatingSystemHotJobsEngine.", line_count_est: 280 }] }),
    U("P38", 11, "ENERGY", "EnergyCostAwareSchedulingEngine — TOU tariff + peak-demand + HVAC couple", { deliverables: [{ path: "mcp-server/src/engines/EnergyCostAwareSchedulingEngine.ts", type: "source", description: "Off-peak MRR routing; high-spindle queueing after HVAC off.", line_count_est: 320 }] }),
    U("P38", 12, "KIT-LOGIX", "KitToCellLogisticsEngine — bar feeder + pre-saw blank kit + AGV handoff", { deliverables: [{ path: "mcp-server/src/engines/KitToCellLogisticsEngine.ts", type: "source", description: "Stocker load/unload; raw-material buffer.", line_count_est: 280 }] }),
    U("P38", 13, "DT-DASH", "CellDigitalTwinDashboardEngine — aggregate MillingDigitalTwinEngine across pool", { deliverables: [{ path: "mcp-server/src/engines/CellDigitalTwinDashboardEngine.ts", type: "source", description: "Real-time web view; status + KPI.", line_count_est: 300 }] }),
    U("P38", 14, "FIRST-ARTICLE", "FirstArticlePartOutEngine + deburr/wash/pack handoff — CMM auto-route + SPC trigger", { deliverables: [{ path: "mcp-server/src/engines/FirstArticlePartOutEngine.ts", type: "source", description: "Part-out routing; SPC Xbar trigger; conveyor/AGV handoff stub.", line_count_est: 280 }] }),
    U("P38", 15, "P38-TESTS", "Lights-out adversarial suite — 40 fault scenarios (tool break, probe fail, chip jam, gripper drop, fire alarm, E-stop, power blip, HVAC fail, hot-job bump, pallet mis-index)", { role: "R4", role_name: "Tester", effort: 95 }),
  ],
  gate: gate(["40-case lights-out adversarial suite green", "FMS adapters working for 3+ vendors", "CP-SAT optimizer converges <60s on 20×3 problem", "Cell OEE replay vs JM Die overnight shift"], { ralph_required: true, ralph_grade_floor: "A+" }),
});

// ── P39: HIL + Model Lifecycle (L6-A10 BLOCK) ──
phases.push({
  id: "P39",
  title: "HIL Test Rigs + Model Lifecycle — Instrumented Benchtop + Shadow Deploy + Drift-Retrain + Rollback RTO + EWC Gate",
  description: "L6-A10 BLOCK: v7 has ~0% HIL coverage and ~50% model lifecycle. Adds HIL rig spec (Kistler 9257B + accel + AE + TC + IR), modal hammer FRF analyzer, wear microscopy automation, surface profilometry bridge, DAQ calibration traceability, model versioning with data-hash binding, shadow deploy, drift-triggered retrain, champion/challenger promotion, <5min rollback RTO, model card + Gebru datasheet, explainability regression guard, EWC loss deploy gate, HIL round-trip orchestrator.",
  sessions: "5-6", primary_role: "R1", primary_model: "opus-4.6", scrutiny_checkpoint: true,
  units: [
    U("P39", 1, "HIL-RIG", "HILRigSpecEngine — benchtop 3-axis + Kistler 9257B + triax accel + AE mic + embedded TC + IR cam", { role: "R1", model: "opus-4.6", effort: 95, deliverables: [{ path: "mcp-server/src/engines/HILRigSpecEngine.ts", type: "source", description: "Rig-spec artifact + BOM; NIST-traceable sensor chain.", line_count_est: 440 }] }),
    U("P39", 2, "FRF-HAMMER", "ModalHammerFRFAnalyzerEngine — PCB 086C03 hammer + Dewesoft SIRIUS per-holder FRF identification", { deliverables: [{ path: "mcp-server/src/engines/ModalHammerFRFAnalyzerEngine.ts", type: "source", description: "Feeds MillRegenChatterFRF; tap-test automation.", line_count_est: 380 }] }),
    U("P39", 3, "WEAR-SEM", "WearMicroscopyAutomationEngine — robotic SEM/optical at 10/25/50/75% VB_max", { deliverables: [{ path: "mcp-server/src/engines/WearMicroscopyAutomationEngine.ts", type: "source", description: "CV-based flank-wear measurement; automated wear calibration.", line_count_est: 360 }] }),
    U("P39", 4, "SURF-PROF", "SurfaceProfilometryBridgeEngine — SJ-410 (stylus) + Zygo NewView (optical)", { deliverables: [{ path: "mcp-server/src/engines/SurfaceProfilometryBridgeEngine.ts", type: "source", description: "Ra/Rz/Sa library; validated ground-truth.", line_count_est: 300 }] }),
    U("P39", 5, "DAQ-TRACE", "DAQCalibrationTraceabilityEngine — NIST-traceable calibration chain + ISO 17025 cert", { deliverables: [{ path: "mcp-server/src/engines/DAQCalibrationTraceabilityEngine.ts", type: "source", description: "Per-channel sensitivity log; annual cert chain.", line_count_est: 260 }] }),
    U("P39", 6, "MODEL-VER-BIND", "ModelVersioningBindingEngine — extends P26-U02 with training-data content-hash binding", { deliverables: [{ path: "mcp-server/src/engines/ModelVersioningBindingEngine.ts", type: "source", description: "model@sha256 = weights+data; DVC lineage integration.", line_count_est: 280 }] }),
    U("P39", 7, "SHADOW", "ShadowDeployEngine — N-job passive shadow compare (no traffic steering); KL/JS divergence", { deliverables: [{ path: "mcp-server/src/engines/ShadowDeployEngine.ts", type: "source", description: "Passive mirror of traffic; distribution comparison.", line_count_est: 320 }] }),
    U("P39", 8, "DRIFT-RETRAIN", "DriftTriggeredRetrainEngine — KL > 0.1 or PSI > 0.25 fires retrain", { deliverables: [{ path: "mcp-server/src/engines/DriftTriggeredRetrainEngine.ts", type: "source", description: "Coupled to P26 nightly retrainer; threshold-aware.", line_count_est: 280 }] }),
    U("P39", 9, "CHAMP-PROMO", "ChampionChallengerPromotionEngine — win criterion + auto-promote + RTO budget", { deliverables: [{ path: "mcp-server/src/engines/ChampionChallengerPromotionEngine.ts", type: "source", description: "Extends P26-U03 A/B harness.", line_count_est: 260 }] }),
    U("P39", 10, "ROLLBACK-RTO", "ModelRollbackRTOEngine — <5 min RTO drill + pre-staged prior version + chaos test", { deliverables: [{ path: "mcp-server/src/engines/ModelRollbackRTOEngine.ts", type: "source", description: "Pre-stages prior version; chaos-test suite.", line_count_est: 280 }] }),
    U("P39", 11, "MODEL-CARD-X", "ModelCardDatasheetGeneratorEngine — extends P26-U08 with Gebru datasheet + ISO 29119", { deliverables: [{ path: "mcp-server/src/engines/ModelCardDatasheetGeneratorEngine.ts", type: "source", description: "Training data datasheet; evidence bundle.", line_count_est: 260 }] }),
    U("P39", 12, "XAI-REG", "ExplainabilityRegressionGuardEngine — SHAP distribution KL monitor; blocks promote on shift", { deliverables: [{ path: "mcp-server/src/engines/ExplainabilityRegressionGuardEngine.ts", type: "source", description: "Gates promotion on SHAP shift > threshold.", line_count_est: 240 }] }),
    U("P39", 13, "EWC-GATE", "EWCLossDeployGateEngine — continual-learning validator blocks promote on EWC regression", { deliverables: [{ path: "mcp-server/src/engines/EWCLossDeployGateEngine.ts", type: "source", description: "Catastrophic-forgetting gate; ties to P23-U08.", line_count_est: 240 }] }),
    U("P39", 14, "HIL-ORCH", "HILRoundTripOrchestratorEngine — HIL → feature → retrain → A/B → redeploy → HIL re-test weekly", { role: "R1", model: "opus-4.6", effort: 95, deliverables: [{ path: "mcp-server/src/engines/HILRoundTripOrchestratorEngine.ts", type: "source", description: "Weekly cadence; closes physics-validation loop.", line_count_est: 420 }] }),
    U("P39", 15, "P39-TESTS", "HIL + lifecycle E2E — tap test → chatter model → shadow → drift → rollback drill <5 min", { role: "R4", role_name: "Tester", effort: 95 }),
  ],
  gate: gate(["HIL rig spec artifact complete", "5min rollback RTO drill green", "KL drift trigger catches 100% seeded shift", "HIL round-trip orchestrator completes weekly cycle", "EWC gate blocks regression in 5/5 seeded cases"], { ralph_required: true, ralph_grade_floor: "A+" }),
});

// ── P40: Airgap / Offline Mode (L6-A5 WARN) ──
phases.push({
  id: "P40",
  title: "Offline + Air-Gapped Shop Support — Local LLM + Offline License + Update Bundle + Telemetry Kill + CMMC L3",
  description: "L6-A5 WARN: v7 is cloud-first; air-gapped ITAR/DoD/aerospace shops cannot deploy. Adds local LLM gateway (Ollama/vLLM), offline license (Ed25519 signed), signed USB update bundle with hash chain, telemetry kill-switch with PRISM_AIRGAP=1, on-disk HNSW, airgap CAM profile (hides cloud CAMs), CMMC L3 segmentation audit, no-HTTP-in-physics lint, signed tribal bundle, and offline onboarding flow.",
  sessions: "4-5", primary_role: "R1", primary_model: "opus-4.6", scrutiny_checkpoint: true,
  units: [
    U("P40", 1, "LLM-GATE", "LocalLLMGatewayEngine — Ollama + vLLM adapter + model zoo + capability ladder + cloud→local fallback", { role: "R1", model: "opus-4.6", effort: 95, deliverables: [{ path: "mcp-server/src/engines/LocalLLMGatewayEngine.ts", type: "source", description: "Qwen2.5-7B/14B/72B-int4, Llama-3.3-70B-int4, CodeLlama-34B, Mistral-Small. Per-task routing (physics→7B, reasoning→70B).", line_count_est: 520 }] }),
    U("P40", 2, "LICENSE", "OfflineLicenseValidatorEngine — Ed25519-signed license file, no phone-home", { deliverables: [{ path: "mcp-server/src/engines/OfflineLicenseValidatorEngine.ts", type: "source", description: "Cryptographic tenant+expiry binding; grace-period policy; CLI install.", line_count_est: 300 }] }),
    U("P40", 3, "UPDATE-BUNDLE", "AirgapUpdateBundleEngine — signed USB update + ed25519 hash chain + rollback snapshot + CVE catalog", { deliverables: [{ path: "mcp-server/src/engines/AirgapUpdateBundleEngine.ts", type: "source", description: ".prism-bundle format; SLSA-style chain; pre-flight scanner.", line_count_est: 420 }] }),
    U("P40", 4, "TELEMETRY-KILL", "TelemetryKillSwitchEngine — global telemetry=off + PRISM_AIRGAP=1 + egress firewall lint", { deliverables: [{ path: "mcp-server/src/engines/TelemetryKillSwitchEngine.ts", type: "source", description: "Hard compile-flag; egress audit log; ITAR-default off.", line_count_est: 260 }] }),
    U("P40", 5, "HNSW-LOCAL", "OfflineVectorStoreEngine — on-disk HNSW + ban on cloud-vector SDK imports + BGE-M3 bundled", { deliverables: [{ path: "mcp-server/src/engines/OfflineVectorStoreEngine.ts", type: "source", description: "./data/vectors/*.hnsw; lint ban on pinecone/weaviate/qdrant-cloud.", line_count_est: 300 }] }),
    U("P40", 6, "CAM-PROFILE", "AirgapCAMProfileEngine — airgap=true feature flag hides Fusion 360 cloud + Onshape", { deliverables: [{ path: "mcp-server/src/engines/AirgapCAMProfileEngine.ts", type: "source", description: "Forces Mastercam/hyperMILL/Inventor-HSM desktop only.", line_count_est: 200 }] }),
    U("P40", 7, "CMMC-L3", "CMMCLevel3SegmentationAuditEngine — L2→L3 enclave boundary + jump-host + DISA STIG", { deliverables: [{ path: "mcp-server/src/engines/CMMCLevel3SegmentationAuditEngine.ts", type: "source", description: "Network flow whitelist; evidence bundle export; extends P31-U05.", line_count_est: 380 }] }),
    U("P40", 8, "NO-HTTP-LINT", "NoHTTPInPhysicsLintGate — AST scan on engines for fetch/axios/got/http.request", { deliverables: [{ path: "mcp-server/scripts/lint-no-http-in-physics.mjs", type: "source", description: "Fail build if any physics engine touches network.", line_count_est: 200 }] }),
    U("P40", 9, "TRIBAL-BUNDLE", "AirgapTribalKnowledgeBundler — signed SQLite bundle of 3,700 tips + playbooks + registries", { deliverables: [{ path: "mcp-server/src/engines/AirgapTribalKnowledgeBundler.ts", type: "source", description: "Immutable SQLite; verified at boot.", line_count_est: 260 }] }),
    U("P40", 10, "ONBOARD-OFFLINE", "AirgapOnboardingFlowEngine — zero-network customer ingestion with local OCR + DFM + pricing", { deliverables: [{ path: "mcp-server/src/engines/AirgapOnboardingFlowEngine.ts", type: "source", description: "Local-only OCR; no outbound calls.", line_count_est: 340 }] }),
    U("P40", 11, "P40-TESTS", "Airgap E2E — disconnect network, run quote→program→post for 3 JM Die parts → all green", { role: "R4", role_name: "Tester", effort: 95 }),
  ],
  gate: gate(["Airgap E2E green on 3 parts with network off", "Ed25519 license verified offline", "USB update bundle installs + rolls back cleanly", "No-HTTP lint passes 2684 engines", "CMMC L3 evidence bundle complete"], { ralph_required: true, ralph_grade_floor: "A+" }),
});

// ── P41: CNC Functional-Safety Standards (L6-A3 BLOCK) ──
phases.push({
  id: "P41",
  title: "CNC Functional-Safety Standards — ISO 13849 + IEC 61508 SIL + ANSI B11.22 + ISO 16090 + ISO 23125 + NFPA 79 + IEC 62443×TR 63074",
  description: "L6-A3 BLOCK: v7 has zero CNC-specific functional-safety standards. Software process-safety ≠ IEC/ISO SRP/CS. Adds PL determination per ISO 13849 Annex A + MTTFd/DC/CCF, SIL determination per IEC 61508, B11.0/B11.22 machining-center risk assessment, ISO 16090 integrated design, ISO 23125 turn-mill annex, NFPA 79 E-stop category, OSHA 1910.212 compliance attestation, and IEC 62443 × ISO 13849 cyber-safety isolation per TR 63074.",
  sessions: "5-6", primary_role: "R1", primary_model: "opus-4.6", scrutiny_checkpoint: true,
  units: [
    U("P41", 1, "PL", "SafetyPerformanceLevelEngine — ISO 13849-1 Annex A risk graph + MTTFd Weibull + DC table B.1 + CCF Annex F + Markov for Cat 3/4", { role: "R1", model: "opus-4.6", effort: 95, deliverables: [{ path: "mcp-server/src/engines/SafetyPerformanceLevelEngine.ts", type: "source", description: "Computes PLr per risk graph; MTTFd via Weibull + surrogate DB; DC via B.1; CCF via F; Markov chain solver.", line_count_est: 560 }] }),
    U("P41", 2, "B11-RA", "B11MachiningCenterRiskAssessmentEngine — B11.0-2020 task-based + B11.22 hazard taxonomy", { role: "R1", model: "opus-4.6", effort: 90, deliverables: [{ path: "mcp-server/src/engines/B11MachiningCenterRiskAssessmentEngine.ts", type: "source", description: "Task-hazard-risk (severity × exposure × avoidance); ISO 12100 hierarchy.", line_count_est: 440 }] }),
    U("P41", 3, "SIL", "SILDeterminationEngine — IEC 61508 PFH/PFD for STO/SS1/SS2/SLS/SOS functions", { role: "R1", model: "opus-4.6", effort: 90, deliverables: [{ path: "mcp-server/src/engines/SILDeterminationEngine.ts", type: "source", description: "Hardware fault tolerance + safe failure fraction; per spindle/axis safety function.", line_count_est: 420 }] }),
    U("P41", 4, "ISO-16090", "ISO16090ComplianceEngine — enclosure impact energy + acoustic + stopping-time + ISO 13855 reach formula", { deliverables: [{ path: "mcp-server/src/engines/ISO16090ComplianceEngine.ts", type: "source", description: "Flying-tool energy; C = K × T + 8 × (d−14); guard-material spec.", line_count_est: 360 }] }),
    U("P41", 5, "ISO-23125", "ISO23125TurnMillAnnexEngine — chuck grip loss + bar feeder + live-tool coordinated stop", { deliverables: [{ path: "mcp-server/src/engines/ISO23125TurnMillAnnexEngine.ts", type: "source", description: "Turn-mill combined hazards; integrates with P6 mill-turn phase.", line_count_est: 320 }] }),
    U("P41", 6, "NFPA-79", "NFPA79EStopCategoryEngine — Cat 0/1/2 selector + reset/restart logic per 9.2.5.4", { deliverables: [{ path: "mcp-server/src/engines/NFPA79EStopCategoryEngine.ts", type: "source", description: "24V safety circuit spec; protective bonding; EMC-for-safety.", line_count_est: 300 }] }),
    U("P41", 7, "OSHA-1910", "OSHA1910ComplianceAttestationEngine — 1910.212 guarding + 1910.147 LOTO declaration", { deliverables: [{ path: "mcp-server/src/engines/OSHA1910ComplianceAttestationEngine.ts", type: "source", description: "PPE/LOTO matrix; guarding decision matrix; compliance evidence.", line_count_est: 280 }] }),
    U("P41", 8, "CYBER-SAFETY", "CyberSafetyIsolationEngine — IEC 62443 zones/conduits × ISO 13849 independence + TR 63074 assessment", { role: "R1", model: "opus-4.6", effort: 95, deliverables: [{ path: "mcp-server/src/engines/CyberSafetyIsolationEngine.ts", type: "source", description: "Safety-PLC on black-channel; security-of-safety assessment; network segmentation proof.", line_count_est: 440 }] }),
    U("P41", 9, "SAFETY-VAL-SUITE", "SafetyFunctionValidationTestSuite — 200 adversarial cases per function + measured stopping time + PFH verify + CCF injection", { role: "R4", role_name: "Tester", effort: 95 }),
  ],
  gate: gate(["PLr determination green on guard+E-stop+two-hand circuits", "SIL PFH verified for all safety functions", "B11.22 RA complete with ISO 12100 hierarchy", "200-case safety validation green, zero false-negatives", "TR 63074 cyber-safety independence proof"], { ralph_required: true, ralph_grade_floor: "A+" }),
});

// ── Loop 7 — ML Training Data Substrate (10 phases, 179 units) ────

// Helper to build compact ML-corpus units with deliverable + optional custom role
const ML = (phase, seq, id, title, desc, { path, lines = 320, role, model, effort } = {}) => U(phase, seq, id, title, {
  ...(role ? { role, role_name: role } : {}),
  ...(model ? { model } : {}),
  ...(effort ? { effort } : {}),
  deliverables: path ? [{ path, type: "source", description: desc, line_count_est: lines }] : [],
});

// ── P42: Inventor ML Corpus (L7-A1 BLOCK) ──
phases.push({
  id: "P42", title: "Inventor ML Corpus — Apprentice Parser + iLogic + iProperty + Feature Tree + Voxelizer + Assembly GNN + IDW OCR",
  description: "L7-A1 BLOCK: 4,151 .IPT + 599 .IAM + 272 .IDW inaccessible to ML without Inventor Apprentice Server bridge. Adds complete Inventor ingest: Apprentice COM parser, iLogic rules, iProperty labels, feature-tree sequence, voxelizer, assembly constraint graph, native .IDW sheet OCR, version-drift DFM labels, title block harvester, exploded-view video gen, plus public CAD datasets (ABC/DeepCAD/Fusion Gallery/Onshape).",
  sessions: "4-5", primary_role: "R1", primary_model: "opus-4.6", scrutiny_checkpoint: true,
  units: [
    ML("P42", 1, "APPRENTICE", "InventorApprenticeParserEngine — COM/Apprentice Server bridge, 4,151 .ipt → feature tree JSON", "node-ffi-napi + C# shim; headless (no full Inventor license)", { path: "mcp-server/src/engines/InventorApprenticeParserEngine.ts", lines: 520, role: "R1", model: "opus-4.6", effort: 95 }),
    ML("P42", 2, "ILOGIC", "iLogicRuleExtractorEngine — VB.NET iLogic rules → labeled design-intent tokens", "AST parse; parameter-gate/conditional-suppression/material-swap labels", { path: "mcp-server/src/engines/iLogicRuleExtractorEngine.ts", lines: 380 }),
    ML("P42", 3, "IPROP", "iPropertyHarvesterEngine — Summary/Project/Custom iProps → supervision labels", "material, mass, P/N, rev, designer, stock", { path: "mcp-server/src/engines/iPropertyHarvesterEngine.ts", lines: 280 }),
    ML("P42", 4, "FEAT-SEQ", "FeatureTreeSequenceEngine — tokenize Inventor feature history → BPE → seq2seq", "DeepCAD-style generation pretraining", { path: "mcp-server/src/engines/FeatureTreeSequenceEngine.ts", lines: 420 }),
    ML("P42", 5, "VOXEL", "CADVoxelizerEngine — OCC/CadQuery tessellate → 128³/256³ voxel grid", "ONNX 3D-CNN head; PointNet++ sampler alt", { path: "mcp-server/src/engines/CADVoxelizerEngine.ts", lines: 340 }),
    ML("P42", 6, "ASM-GNN", "InventorAssemblyGNNIngestEngine — parse .iam Occurrences+Constraints, typed-edge GNN", "MateConstraint/InsertConstraint/TangentConstraint/AngleConstraint", { path: "mcp-server/src/engines/InventorAssemblyGNNIngestEngine.ts", lines: 400 }),
    ML("P42", 7, "IDW-OCR", "IDWSheetOCREngine — native .IDW OLE structured-storage read + Tesseract 5 + GD&T NER", "sheet/view/dimension/title-block NER", { path: "mcp-server/src/engines/IDWSheetOCREngine.ts", lines: 380 }),
    ML("P42", 8, "DFM-DRIFT", "VersionDriftDFMLabelerEngine — diff as-designed vs as-shipped → DFM-regret label", "self-supervised DFM signal from 24,545 programs", { path: "mcp-server/src/engines/VersionDriftDFMLabelerEngine.ts", lines: 320 }),
    ML("P42", 9, "TITLE-BLOCK", "TitleBlockHarvesterEngine — customer/P/N/rev/designer/date → multi-task auxiliary labels", "per-sheet metadata extraction", { path: "mcp-server/src/engines/TitleBlockHarvesterEngine.ts", lines: 220 }),
    ML("P42", 10, "EXPLODED", "ExplodedViewRenderEngine — auto .ipn presentation → screen capture → video pretraining", "procedural operator training data", { path: "mcp-server/src/engines/ExplodedViewRenderEngine.ts", lines: 280 }),
    ML("P42", 11, "GRABCAD", "GrabCADFusionGalleryIngestEngine — public/CC-BY CAD ingest", "Fusion Gallery Reconstruction Dataset + GrabCAD CC-BY", { path: "mcp-server/src/engines/GrabCADFusionGalleryIngestEngine.ts", lines: 300 }),
    ML("P42", 12, "ABC-DEEPCAD", "ABCDeepCADIngestEngine — ABC 1M B-rep + DeepCAD 178K construction seq", "academic pretrain corpus", { path: "mcp-server/src/engines/ABCDeepCADIngestEngine.ts", lines: 340 }),
    ML("P42", 13, "ONSHAPE", "OnshapeAPIHarvesterEngine — OAuth + /api/documents public scope", "feature-script JSON extraction", { path: "mcp-server/src/engines/OnshapeAPIHarvesterEngine.ts", lines: 280 }),
    ML("P42", 14, "P42-TESTS", "E2E — 100 .ipt → (voxel + feature seq + iProp + asm graph) + 272 .idw → title+GD&T + 10 .ipn → video", "", { role: "R4", model: "sonnet-4.6", effort: 95 }),
  ],
  gate: gate(["Apprentice Server connects headless", "100 .ipt voxelized + feature-seq tokenized + iProps harvested", "272 .idw OCR extracts title block + GD&T", "ABC 1M + DeepCAD 178K ingested with provenance"], { ralph_required: true, ralph_grade_floor: "A" }),
});

// ── P43: Mastercam ML Corpus (L7-A2 BLOCK) ──
phases.push({
  id: "P43", title: "Mastercam ML Corpus — NetHook Parser + Ops Tree + GMC Toolpath + Stock Model + WCS 5-axis + Verify Labels + Academy/Forum/VeriCut",
  description: "L7-A2 BLOCK: 8,871 .MCX-8/.MCX programs inaccessible. Adds C# CHook NetHook bridge, operations-tree sequence mining, GMC toolpath point-cloud extraction, stock-model progressive MRR, tool library regression labels, cycle-time from Verify, WCS+5-axis metadata, Mastercam Academy YouTube + emastercam forum + VeriCut ground-truth + cross-CAM matched-pair benchmarks.",
  sessions: "4-5", primary_role: "R1", primary_model: "opus-4.6", scrutiny_checkpoint: true,
  units: [
    ML("P43", 1, "NETHOOK", "MastercamNetHookParserEngine — C# CHook adapter via node-edge-js; 8,871 MCX → ops-tree JSON", "NET-Hook.dll binding; COM-automation fallback", { path: "mcp-server/src/engines/MastercamNetHookParserEngine.ts", lines: 560, role: "R1", model: "opus-4.6", effort: 95 }),
    ML("P43", 2, "OPS-SEQ", "OperationSequenceMiningEngine — Markov+Transformer on (feature→op→tool→params)", "seq2seq supervision richer than G-code", { path: "mcp-server/src/engines/OperationSequenceMiningEngine.ts", lines: 380 }),
    ML("P43", 3, "GMC-PC", "ToolpathGMCExtractorEngine — extract GMC point clouds per op", "feeds P23-U05 diffusion; ≥1M points", { path: "mcp-server/src/engines/ToolpathGMCExtractorEngine.ts", lines: 340 }),
    ML("P43", 4, "STOCK-MRR", "StockModelProgressiveMREngine — per-op delta volumes → MRR dataset", "ground truth for P27 physics", { path: "mcp-server/src/engines/StockModelProgressiveMREngine.ts", lines: 360 }),
    ML("P43", 5, "TOOL-LIB", "MastercamToolLibraryHarvesterEngine — tool geom + SFM + FPT + stepover labels", "~50K tuples target", { path: "mcp-server/src/engines/MastercamToolLibraryHarvesterEngine.ts", lines: 320 }),
    ML("P43", 6, "VERIFY-TIME", "CycleTimeRegressionDatasetEngine — Mastercam Verify stats → labels", "vs actuals ±10% gate", { path: "mcp-server/src/engines/CycleTimeRegressionDatasetEngine.ts", lines: 280 }),
    ML("P43", 7, "WCS-5AX", "WCS5AxisMetadataHarvesterEngine — WCS + tool-plane + RTCP flags", "policy-learning features", { path: "mcp-server/src/engines/WCS5AxisMetadataHarvesterEngine.ts", lines: 260 }),
    ML("P43", 8, "MC-ACADEMY", "MastercamAcademyVideoIngestEngine — Academy YouTube transcripts", "wires to /video-learn + Whisper", { path: "mcp-server/src/engines/MastercamAcademyVideoIngestEngine.ts", lines: 240 }),
    ML("P43", 9, "MC-FORUM", "EMastercamForumCrawlerEngine — public Q&A corpus", "LLM fine-tune + RAG corpus", { path: "mcp-server/src/engines/EMastercamForumCrawlerEngine.ts", lines: 280 }),
    ML("P43", 10, "VERICUT", "VeriCutGroundTruthIngestEngine — .VCX motion traces", "physics ground truth for PPG", { path: "mcp-server/src/engines/VeriCutGroundTruthIngestEngine.ts", lines: 320 }),
    ML("P43", 11, "XCAM-BENCH", "CrossCAMBenchmarkDatasetEngine — matched .mcx-8 / .hmc / .f3d / .prz pairs", "transfer-learning benchmark", { path: "mcp-server/src/engines/CrossCAMBenchmarkDatasetEngine.ts", lines: 340 }),
    ML("P43", 12, "P43-TESTS", "100 random .MCX-8 → ops+toolpath+stock+tool-lib features; drift vs JM Die ≤15%", "", { role: "R4", model: "sonnet-4.6", effort: 95 }),
  ],
  gate: gate(["NetHook bridge round-trips 100 .MCX files", "GMC point cloud ≥1M points extracted", "Verify cycle-time within 10%", "Cross-CAM matched pairs ≥200 assemblies"], { ralph_required: true, ralph_grade_floor: "A" }),
});

// ── P44: G-Code + Setup ML Corpus (L7-A3 BLOCK) ──
phases.push({
  id: "P44", title: "G-Code + Setup Sheet ML Corpus — Tokenizer + OSP Macro-B + Tool Change + Canned Cycle + VBA Reverse + Excel ERP + Public Corpora",
  description: "L7-A3 BLOCK: 16,947 .MIN without canonical tokenizer, no OSP Macro-B supervised harvester, no VBA reverse-engineer for Automated Program_Corrected.xlsm, no public G-code corpus. Adds 5-tuple tokenizer across 6 dialects, OSP SYSVAR/VCOMMON/VIOB harvesting, tool-change HMM, canned-cycle histogram, WCS offset classifier, probe cycle miner, VBA AST parser, Excel ERP labels, LinuxCNC/NIST/Haas/Fanuc/PHM/UCB ingest.",
  sessions: "4-5", primary_role: "R2", primary_model: "sonnet-4.6", scrutiny_checkpoint: true,
  units: [
    ML("P44", 1, "SETUP-OCR", "SetupSheetOCRExtractorEngine — BlueprintVisionOCR → SETUPS/ CAD metadata + travelers", "wires existing OCR; CAD metadata harvest", { path: "mcp-server/src/engines/SetupSheetOCRExtractorEngine.ts", lines: 260 }),
    ML("P44", 2, "GCODE-TOK", "GCodeTokenizerEngine — canonical 5-tuple {op_type,tool,rpm,feed,DOC} + OSP/Fanuc/Haas/Mazak/Heidenhain/Siemens variants", "BPE codebook + dialect dispatcher", { path: "mcp-server/src/engines/GCodeTokenizerEngine.ts", lines: 420, role: "R1", model: "opus-4.6", effort: 90 }),
    ML("P44", 3, "GCODE-XFMR", "GCodeTransformerTrainerEngine — implement P23-U01 + specialize on 16,947 .MIN", "DeepSeek Coder 6.7B + LoRA r=16 on Macro-B aware", { path: "mcp-server/src/engines/GCodeTransformerTrainerEngine.ts", lines: 440, role: "R1", model: "opus-4.6", effort: 95 }),
    ML("P44", 4, "MACROB", "MacroBPatternHarvesterEngine — OSP SYSVAR/VCOMMON/VIOB supervised labels", "distinct from converter; pattern-as-label", { path: "mcp-server/src/engines/MacroBPatternHarvesterEngine.ts", lines: 360 }),
    ML("P44", 5, "TC-SEQ", "ToolChangeSequenceLearnerEngine — HMM/n-gram over TNC blocks", "feeds ToolChangeOptimizationEngine", { path: "mcp-server/src/engines/ToolChangeSequenceLearnerEngine.ts", lines: 280 }),
    ML("P44", 6, "CANNED-DIST", "CannedCycleDistributionAnalyzerEngine — G81-G86 conditional distributions per customer×material", "ML feature + policy prior", { path: "mcp-server/src/engines/CannedCycleDistributionAnalyzerEngine.ts", lines: 240 }),
    ML("P44", 7, "WCS-CLS", "WCSOffsetClassifierEngine — G54-G59.1 → workholding-class supervised label", "extends MillWCSFixtureOffsetEngine", { path: "mcp-server/src/engines/WCSOffsetClassifierEngine.ts", lines: 220 }),
    ML("P44", 8, "PROBE-MINE", "ProbeCyclePatternMinerEngine — G31/Renishaw macro clustering across 16,947", "pattern-use statistics", { path: "mcp-server/src/engines/ProbeCyclePatternMinerEngine.ts", lines: 260 }),
    ML("P44", 9, "VBA-RE", "VBAMacroReverseEngineerEngine — AST parse .xlsm/.cls via olefile", "Automated Program_Corrected.xlsm rule extraction", { path: "mcp-server/src/engines/VBAMacroReverseEngineerEngine.ts", lines: 340 }),
    ML("P44", 10, "XLS-ERP", "ExcelERPLabelMinerEngine — spreadsheet → {part#, customer, material, cycle-time} labels", "extends SpreadsheetIngestionEngine", { path: "mcp-server/src/engines/ExcelERPLabelMinerEngine.ts", lines: 240 }),
    ML("P44", 11, "PUBLIC-GC", "PublicGCodeCorpusIngestEngine — LinuxCNC + NIST SMS + Haas + Fanuc + Okuma THINC + MachMotion", "cross-vendor normalization", { path: "mcp-server/src/engines/PublicGCodeCorpusIngestEngine.ts", lines: 300 }),
    ML("P44", 12, "PHM-WEAR", "PHMToolConditionMonitoringIngestEngine — UC Berkeley + PHM 2010 Challenge", "gold wear RUL benchmark", { path: "mcp-server/src/engines/PHMToolConditionMonitoringIngestEngine.ts", lines: 280 }),
    ML("P44", 13, "P44-TESTS", "≥10 cases per engine; integration with MillGCodeTransformerEngine + facade", "", { role: "R4", model: "sonnet-4.6", effort: 95 }),
  ],
  gate: gate(["Tokenizer covers 6 controller dialects", "16,947 .MIN tokenized within <4h", "OSP Macro-B labels extracted from 5,297 Okuma programs", "PHM 2010 RUL benchmark accuracy ≥85%"], { ralph_required: true, ralph_grade_floor: "A" }),
});

// ── P45: External ML Datasets (L7-A4 BLOCK) ──
phases.push({
  id: "P45", title: "External ML Dataset Ingestion — NIST + NASA PCoE + PHM + UC Berkeley + UConn + Bosch + ABC + DeepCAD + MFCAD++ + ShapeNet + MVTec + YouTube + Handbooks",
  description: "L7-A4 BLOCK: zero external benchmarks ingested. Without PHM2010/UCB/UConn SLD/NIST SMSTB/ABC/DeepCAD/MFCAD++, all ML overfits JM Die. Adds 16 curated academic + government datasets + handbook ingest (Sandvik/Kennametal/Iscar/Machinery's) + versioned registry + license/ITAR scrub + harmonization + acceptance ≥15% lift vs JM-only baseline.",
  sessions: "5-6", primary_role: "R1", primary_model: "opus-4.6", scrutiny_checkpoint: true,
  units: [
    ML("P45", 1, "NIST-SMSTB", "NISTSMSTBIngestEngine — force/power/surface ground truth for Kienzle calibration", "", { path: "mcp-server/src/engines/NISTSMSTBIngestEngine.ts", lines: 300 }),
    ML("P45", 2, "NASA-PCOE", "NASAPCoEMillingIngestEngine — tool wear RUL benchmark (UCI mirror)", "", { path: "mcp-server/src/engines/NASAPCoEMillingIngestEngine.ts", lines: 260 }),
    ML("P45", 3, "PHM2010", "PHM2010ToolWearIngestEngine — 6 cutters × 315 cuts, flank-wear labels", "gold-standard wear benchmark", { path: "mcp-server/src/engines/PHM2010ToolWearIngestEngine.ts", lines: 300 }),
    ML("P45", 4, "UCB-MILL", "UCBerkeleyMillingIngestEngine — 16-sensor multi-modal", "P25 sensor-fusion pretrain", { path: "mcp-server/src/engines/UCBerkeleyMillingIngestEngine.ts", lines: 280 }),
    ML("P45", 5, "UCONN-SLD", "UConnChatterSLDIngestEngine — 250 labeled SLD cuts", "direct input to ChatterStabilityLobe", { path: "mcp-server/src/engines/UConnChatterSLDIngestEngine.ts", lines: 260 }),
    ML("P45", 6, "BOSCH", "BoschProductionLineIngestEngine — Kaggle quality prediction", "P33 quality transfer", { path: "mcp-server/src/engines/BoschProductionLineIngestEngine.ts", lines: 280 }),
    ML("P45", 7, "ABC", "ABCDatasetIngestEngine — 1M B-rep CAD pretrain", "P28 neutral-CAD pretrain", { path: "mcp-server/src/engines/ABCDatasetIngestEngine.ts", lines: 320 }),
    ML("P45", 8, "DEEPCAD", "DeepCADIngestEngine — 178K construction sequences", "P23 Transformer + P33-U08 LLM-CodeGen", { path: "mcp-server/src/engines/DeepCADIngestEngine.ts", lines: 300 }),
    ML("P45", 9, "F360-GAL", "Fusion360GalleryIngestEngine — Autodesk published parametric history", "CAD-to-CAM alignment", { path: "mcp-server/src/engines/Fusion360GalleryIngestEngine.ts", lines: 280 }),
    ML("P45", 10, "MFCAD", "MFCADPlusPlusIngestEngine — machining-feature ground truth", "MFR gold corpus", { path: "mcp-server/src/engines/MFCADPlusPlusIngestEngine.ts", lines: 300 }),
    ML("P45", 11, "SHAPENET", "ShapeNetModelNetIngestEngine — shape classifier pretrain", "3D-PMI pretrain", { path: "mcp-server/src/engines/ShapeNetModelNetIngestEngine.ts", lines: 260 }),
    ML("P45", 12, "MVTEC", "MVTecADIngestEngine — defect classification benchmark", "P33-U02 burr + surface anomaly", { path: "mcp-server/src/engines/MVTecADIngestEngine.ts", lines: 280 }),
    ML("P45", 13, "YT-CNC", "YouTubeCNCTranscriptIngestEngine — 30 channels (Titans/NYCcnc/Edge/etc.)", "tribal-knowledge LLM finetune", { path: "mcp-server/src/engines/YouTubeCNCTranscriptIngestEngine.ts", lines: 360 }),
    ML("P45", 14, "HANDBOOK", "SandvikKennametalIscarHandbookIngestEngine — public speeds/feeds + insert geometry", "cross-val for constants.ts", { path: "mcp-server/src/engines/SandvikKennametalIscarHandbookIngestEngine.ts", lines: 320 }),
    ML("P45", 15, "ASME-JMSE", "ASMEJournalOpenIngestEngine — JMSE open-access RAG corpus", "", { path: "mcp-server/src/engines/ASMEJournalOpenIngestEngine.ts", lines: 240 }),
    ML("P45", 16, "NIST-CAD", "NISTCADBenchmarkIngestEngine + NIST Machine-Tool Test Data", "calibration benchmark", { path: "mcp-server/src/engines/NISTCADBenchmarkIngestEngine.ts", lines: 280 }),
    ML("P45", 17, "DS-REG", "DatasetVersioningRegistryEngine — DVC/LakeFS immutable hashes", "ties to P32-U06 provenance", { path: "mcp-server/src/engines/DatasetVersioningRegistryEngine.ts", lines: 300 }),
    ML("P45", 18, "DS-LIC", "DatasetLicenseAndProvenanceEngine — CC-BY/NC vs restrictive; ITAR/EAR scrub", "P31/P35 compliance hook", { path: "mcp-server/src/engines/DatasetLicenseAndProvenanceEngine.ts", lines: 280 }),
    ML("P45", 19, "DS-HARM", "CrossDatasetHarmonizationEngine — unified schema (material→ISO group, tool→ISO 13399, sensor→MTConnect)", "", { path: "mcp-server/src/engines/CrossDatasetHarmonizationEngine.ts", lines: 360 }),
    ML("P45", 20, "P45-TESTS", "E2E: ingest → harmonize → train P23 foundation → ≥15% lift vs JM-only baseline", "", { role: "R4", model: "sonnet-4.6", effort: 95 }),
  ],
  gate: gate(["16 external datasets ingested + harmonized", "PHM 2010 + UCB + UConn SLD benchmarks green", "ITAR scrub passes red-team", "≥15% lift on 50-task holdout vs JM-only"], { ralph_required: true, ralph_grade_floor: "A+" }),
});

// ── P46: Video + Synthetic ML Corpus (L7-A5 BLOCK) ──
phases.push({
  id: "P46", title: "Video + Synthetic + Simulation ML Corpus — 30 YouTube Channels + OCW/NPTEL + Whisper + CLIP + FEM/MD/CFD/MBD Synthetic + VeriCut Ground Truth + Procedural CAD",
  description: "L7-A5 BLOCK: video/lecture/synthetic pillars ingestion-starved. Adds 30-channel YouTube crawler + Whisper pipeline + OCW/NPTEL lectures + SigLIP frame embeddings + DEFORM/AdvantEdge/LAMMPS/Fluent/Adams synthetic generators + VeriCut ground truth + digital-twin loopback + procedural CAD synthetic + DR-Diffusion inverse design + PI noise injection + license/ITAR scrub.",
  sessions: "5-6", primary_role: "R1", primary_model: "opus-4.6", scrutiny_checkpoint: true,
  units: [
    ML("P46", 1, "YT-CRAWL", "YouTubeCNCChannelCrawlerEngine — 30 channels (Titans+NYCcnc+Edge+This Old Tony+Abom79+Clickspring+Inheritance+Breaking Taps+AvE+Tyler Beck+SMWHittle+Marco Reps+Tom Lipton+Wintergatan+Stuart de Haro+Machine Thinking+VoidStar+Joe Pieczynski+Maker's Muse+ROBRENZ+Dan Gelbart+Haas+Mazak+Okuma+DMG MORI+Fusion 360+Mastercam+Big Geoff+Mill Your Own Jigs+Clickspring)", "yt-dlp + auto-caption + 1fps keyframes + scene-cut boost", { path: "mcp-server/src/engines/YouTubeCNCChannelCrawlerEngine.ts", lines: 480, role: "R1", model: "opus-4.6", effort: 90 }),
    ML("P46", 2, "WHISPER", "WhisperTranscriptionPipelineEngine — whisper.cpp large-v3 multilingual + VAD chunking + word-level timestamps", "", { path: "mcp-server/src/engines/WhisperTranscriptionPipelineEngine.ts", lines: 360 }),
    ML("P46", 3, "OCW-LECT", "OCWNPTELLectureIngestEngine — MIT 2.008 + Georgia Tech ME 4215 + Purdue ME 553 + Stanford CS231n + IIT Bombay NPTEL + Berkeley ME 120", "", { path: "mcp-server/src/engines/OCWNPTELLectureIngestEngine.ts", lines: 320 }),
    ML("P46", 4, "CLIP-EMB", "VideoFrameCLIPEmbedderEngine — SigLIP-SO400M + DINOv2 backup; 1152-d embeddings into HNSW", "14-day H100 schedule", { path: "mcp-server/src/engines/VideoFrameCLIPEmbedderEngine.ts", lines: 420, role: "R1", model: "opus-4.6", effort: 95 }),
    ML("P46", 5, "TOOL-FROM-VIDEO", "ToolConditionFromVideoEngine — Chen 2023 CVPR tool-wear + spindle-audio fusion", "", { path: "mcp-server/src/engines/ToolConditionFromVideoEngine.ts", lines: 380 }),
    ML("P46", 6, "FEM-GEN", "FEMSimulationGeneratorEngine — DEFORM-3D + AdvantEdge + Third Wave + ABAQUS orchestrator → labeled force/temp/chip", "5-10K runs feed P24 sparse GP", { path: "mcp-server/src/engines/FEMSimulationGeneratorEngine.ts", lines: 440 }),
    ML("P46", 7, "MD-MICRO", "MDMicroCuttingSyntheticEngine — LAMMPS EAM/Tersoff → sub-μm chip morphology + burr-root", "", { path: "mcp-server/src/engines/MDMicroCuttingSyntheticEngine.ts", lines: 360 }),
    ML("P46", 8, "CFD-COOL", "CFDCoolantFlowSyntheticEngine — Ansys Fluent + OpenFOAM → HTC + chip-evac labels", "", { path: "mcp-server/src/engines/CFDCoolantFlowSyntheticEngine.ts", lines: 380 }),
    ML("P46", 9, "MBD-VIB", "MBDMachineVibrationSyntheticEngine — MSC Adams + RecurDyn → SLD-coupled vibration per machine", "", { path: "mcp-server/src/engines/MBDMachineVibrationSyntheticEngine.ts", lines: 340 }),
    ML("P46", 10, "VERICUT-GT", "VeriCutMotionGroundTruthEngine — VeriCut API → posted-motion labels for PPG", "", { path: "mcp-server/src/engines/VeriCutMotionGroundTruthEngine.ts", lines: 300 }),
    ML("P46", 11, "DT-LOOP", "DigitalTwinLoopbackTrainingEngine — MillingDigitalTwinEngine outputs → training queue", "", { path: "mcp-server/src/engines/DigitalTwinLoopbackTrainingEngine.ts", lines: 280 }),
    ML("P46", 12, "PROC-CAD", "ProceduralCADSyntheticEngine — CadQuery + feature-grammar → 100K synthetic parts + DFM labels", "", { path: "mcp-server/src/engines/ProceduralCADSyntheticEngine.ts", lines: 420 }),
    ML("P46", 13, "DR-DIFF", "DRDiffusionInverseDesignEngine — diffusion over part embeddings conditioned on strategy-tag", "", { path: "mcp-server/src/engines/DRDiffusionInverseDesignEngine.ts", lines: 400 }),
    ML("P46", 14, "PI-NOISE", "PINoiseInjectionRobustnessEngine — σ-calibrated PI noise wrapping FEM outputs; conserves invariants", "", { path: "mcp-server/src/engines/PINoiseInjectionRobustnessEngine.ts", lines: 260 }),
    ML("P46", 15, "SUB-ALIGN", "VideoSubtitleTranscriptAlignerEngine — DTW alignment WER<5%", "", { path: "mcp-server/src/engines/VideoSubtitleTranscriptAlignerEngine.ts", lines: 280 }),
    ML("P46", 16, "CHAP-TAG", "VideoChapterTopicTaggerEngine — zero-shot NLI over 220-tag CNC taxonomy", "", { path: "mcp-server/src/engines/VideoChapterTopicTaggerEngine.ts", lines: 300 }),
    ML("P46", 17, "LIC-ITAR", "LicenseScrubAndITARComplianceEngine — CC-license + ITAR/EAR keyword + Alcoa/aerospace hard-block", "ties to P35/P40", { path: "mcp-server/src/engines/LicenseScrubAndITARComplianceEngine.ts", lines: 340, role: "R1", model: "opus-4.6", effort: 95 }),
    ML("P46", 18, "P46-TESTS", "1,000-video corpus frame+transcript+topic tagged; 50 FEM/CFD/MD/MBD synthetic datasets", "", { role: "R4", model: "sonnet-4.6", effort: 95 }),
  ],
  gate: gate(["30 YouTube channels crawled with subtitles+frames", "1,000-video indexed in HNSW", "FEM/CFD/MD/MBD synthetic ≥50 datasets", "ITAR scrub red-team 0 false-negatives", "WER <5% on 20 audio samples"], { ralph_required: true, ralph_grade_floor: "A+" }),
});

// ── P47: Vendor Ingestion Hub (L7-A6 BLOCK) ──
phases.push({
  id: "P47", title: "Vendor Ingestion Hub — 22 Tool + 12 Machine + 10 Material + 4 Coolant + 3 Post Vendors (51 total)",
  description: "L7-A6 BLOCK: 0/51 vendor APIs wired. Without Sandvik/Kennametal/Iscar/Walter/Seco/Mitsubishi speed-feed ground truth + Haimer balance + machine specs + Carpenter/Haynes/ATI materials, ML overfits JM Die and cannot generalize. Adds 17 ingestion units covering all 51 vendors + normalizer + licensing compliance + freshness cron + cross-vendor substitution + bias detection.",
  sessions: "5-6", primary_role: "R1", primary_model: "opus-4.6", scrutiny_checkpoint: true,
  units: [
    ML("P47", 1, "SANDVIK", "SandvikCoroPlusAPIEngine — GraphQL + OAuth2, tool+speeds+feeds", "premium reference", { path: "mcp-server/src/engines/SandvikCoroPlusAPIEngine.ts", lines: 380 }),
    ML("P47", 2, "KENNAMETAL", "KennametalNOVOAPIEngine — REST client, NOVO digital catalog", "", { path: "mcp-server/src/engines/KennametalNOVOAPIEngine.ts", lines: 340 }),
    ML("P47", 3, "ISCAR", "IscarITAAdapterEngine — Tool Advisor SOAP/REST shim", "", { path: "mcp-server/src/engines/IscarITAAdapterEngine.ts", lines: 300 }),
    ML("P47", 4, "WALTER-SECO-TUNGALOY", "WalterSECOTungaloyMitsubishiHarvesterEngine — 4-major batched API coalescer", "Walter+Seco+Tungaloy+Mitsubishi", { path: "mcp-server/src/engines/WalterSECOTungaloyMitsubishiHarvesterEngine.ts", lines: 460 }),
    ML("P47", 5, "HARVEY-HELICAL", "HarveyHelicalFraisaCatalogEngine — premium mill-specialist tools (micro + high-perf)", "OSG+YG-1+Emuge+Dormer+Nachi+CERATIZIT rolled in", { path: "mcp-server/src/engines/HarveyHelicalFraisaCatalogEngine.ts", lines: 500 }),
    ML("P47", 6, "HOLDER-HUB", "ToolHolderVendorHubEngine — Haimer balance + Big Kaiser + Command + Collis + Kyocera + Hoffmann", "shrink-fit + balance data", { path: "mcp-server/src/engines/ToolHolderVendorHubEngine.ts", lines: 380 }),
    ML("P47", 7, "MACHINE-SPEC", "MachineVendorSpecHubEngine — Haas+Mazak+Okuma+Makino+DMG+Doosan+Hyundai WIA+Chiron", "spec + sample programs", { path: "mcp-server/src/engines/MachineVendorSpecHubEngine.ts", lines: 480 }),
    ML("P47", 8, "CTRL-SAMPLES", "ControllerSampleProgramEngine — Fanuc Ladder + Heidenhain TNC + Siemens 840D + Okuma OSP + Makino Pro5 + Hurco WinMax publicly distributed", "", { path: "mcp-server/src/engines/ControllerSampleProgramEngine.ts", lines: 420 }),
    ML("P47", 9, "MAT-VENDOR", "MaterialVendorDatasheetEngine — Carpenter+Alcoa+Haynes+ATI+Special Metals+Sandvik grades+VSMPO+Ulbrich+NAS+Timken+ArcelorMittal", "", { path: "mcp-server/src/engines/MaterialVendorDatasheetEngine.ts", lines: 440 }),
    ML("P47", 10, "COOLANT", "CoolantMQLVendorEngine — Blaser + Master Chemical TRIM + Accu-Lube + Wisura MQL", "", { path: "mcp-server/src/engines/CoolantMQLVendorEngine.ts", lines: 320 }),
    ML("P47", 11, "POST-VENDOR", "PostProcessorVendorLibraryEngine — PostHaste + ICAM + Cimatron licensed catalog", "", { path: "mcp-server/src/engines/PostProcessorVendorLibraryEngine.ts", lines: 320 }),
    ML("P47", 12, "VENDOR-NORM", "VendorCatalogNormalizerEngine — unified ISO 1832 inserts + ANSI B94.9 drills schema", "", { path: "mcp-server/src/engines/VendorCatalogNormalizerEngine.ts", lines: 360 }),
    ML("P47", 13, "VENDOR-LIC", "VendorLicensingComplianceEngine — API-terms audit, scrape-vs-contract gate", "blocks violating use", { path: "mcp-server/src/engines/VendorLicensingComplianceEngine.ts", lines: 300 }),
    ML("P47", 14, "VENDOR-FRESH", "VendorDataFreshnessScheduleEngine — weekly/monthly refresh cron + drift detector", "", { path: "mcp-server/src/engines/VendorDataFreshnessScheduleEngine.ts", lines: 260 }),
    ML("P47", 15, "XVENDOR-SUB", "CrossVendorSubstitutionEngine — ML tool-swap recommendations across brands", "", { path: "mcp-server/src/engines/CrossVendorSubstitutionEngine.ts", lines: 340 }),
    ML("P47", 16, "VENDOR-BIAS", "VendorBiasDetectionEngine — prevent recommendation lock-in, diversify output", "", { path: "mcp-server/src/engines/VendorBiasDetectionEngine.ts", lines: 260 }),
    ML("P47", 17, "P47-TESTS", "Ingest 1,000 tools from 10+ vendors with normalized schema + licensing compliance assertion", "", { role: "R4", model: "sonnet-4.6", effort: 95 }),
  ],
  gate: gate(["All 51 vendor categories have ingestion path (51/51)", "1,000+ tools normalized", "Licensing compliance 100% pass", "Cross-vendor substitution works on 50 test cases"], { ralph_required: true, ralph_grade_floor: "A" }),
});

// ── P48: Sensor + IoT + Edge Ingest (L7-A7 BLOCK) ──
phases.push({
  id: "P48", title: "Sensor + IoT + Edge Ingest — 50-source Hub: Machine-Native + Retrofit + Power + MQTT/Kafka + InfluxDB + Jetson/Coral/Hailo + Wearable",
  description: "L7-A7 BLOCK: 6/50 sensor sources wired (12%). Without Kistler/accel/AE/thermal/Renishaw/CMM streams + MQTT/Kafka + InfluxDB + Jetson edge inference + wearable telemetry (with GDPR/consent), ML calibration and live inference is impossible. Adds all 50 sources across 6 categories + sensor fusion + anomaly detection + ISO 17025 traceability.",
  sessions: "5-6", primary_role: "R1", primary_model: "opus-4.6", scrutiny_checkpoint: true,
  units: [
    ML("P48", 1, "MACHINE-HUB", "FocasHeidenhainSiemensOkumaMultiVendorAdapterEngine — FOCAS2 + DNC Light+ + 840D OPC UA + THINC-API + SmartBox + Haas NGC MDC + Makino MPlayer + Celos + Hurco UPC", "100Hz motor+spindle+position", { path: "mcp-server/src/engines/FocasHeidenhainSiemensOkumaMultiVendorAdapterEngine.ts", lines: 640, role: "R1", model: "opus-4.6", effort: 95 }),
    ML("P48", 2, "MTCONNECT", "MTConnectCanonicalAdapterEngine — MTConnect 2.3 agent + XML parsing + 10ms polling + parts 16/17 machine-tool specific", "", { path: "mcp-server/src/engines/MTConnectCanonicalAdapterEngine.ts", lines: 380 }),
    ML("P48", 3, "OPCUA", "OPCUACanonicalAdapterEngine — OPC UA client + UMATI companion-spec + signed/encrypted", "", { path: "mcp-server/src/engines/OPCUACanonicalAdapterEngine.ts", lines: 360 }),
    ML("P48", 4, "KISTLER", "KistlerDynoIngestEngine — 9257B + 9272 + 9123C rotary + 5073A charge amp @ 50kHz", "piezo drift comp", { path: "mcp-server/src/engines/KistlerDynoIngestEngine.ts", lines: 340 }),
    ML("P48", 5, "MEMS-ACCEL", "MEMSAccelerometerIngestEngine — ADXL355 + Bosch BMA455 + AD ADcmXL3021", "triaxial FFT on-ingest", { path: "mcp-server/src/engines/MEMSAccelerometerIngestEngine.ts", lines: 300 }),
    ML("P48", 6, "DAQ-HUB", "DewesoftHBMNIDAQHubEngine — SIRIUS + QuantumX MX410B + cDAQ-9189 + cRIO-9045 unified WaveformBus", "", { path: "mcp-server/src/engines/DewesoftHBMNIDAQHubEngine.ts", lines: 420 }),
    ML("P48", 7, "IR-THERM", "IRThermalCameraIngestEngine — FLIR A700 GigE + Optris PI 640i USB + radiometric TIFF", "emissivity per material", { path: "mcp-server/src/engines/IRThermalCameraIngestEngine.ts", lines: 320 }),
    ML("P48", 8, "AE", "AcousticEmissionIngestEngine — Vallen AMSY-6 + MISTRAS PCI-2 + RMS/Counts/Energy + Hsu-Nielsen calibration", "", { path: "mcp-server/src/engines/AcousticEmissionIngestEngine.ts", lines: 340 }),
    ML("P48", 9, "RENISHAW", "RenishawProbeTouchLaserIngestEngine — OMP60 + OMP400 + OTS + TS27R + NC4 + Blum TC50/LaserControl", "", { path: "mcp-server/src/engines/RenishawProbeTouchLaserIngestEngine.ts", lines: 360 }),
    ML("P48", 10, "CMM-STREAM", "CMMLiveStreamIngestEngine — Zeiss Calypso Q-DAS/AQDEF + PC-DMIS XML + Renishaw Equator UCC S5", "dimensional closure to toolpath", { path: "mcp-server/src/engines/CMMLiveStreamIngestEngine.ts", lines: 340 }),
    ML("P48", 11, "POWER-UTIL", "SmartPowerUtilityMeterIngestEngine — CircuitMeter CT + Fluke 1742 + Festo SFAM + HOBO MX2301", "CoP calculation", { path: "mcp-server/src/engines/SmartPowerUtilityMeterIngestEngine.ts", lines: 300 }),
    ML("P48", 12, "MQTT-KAFKA", "MQTTKafkaStreamRouterEngine — HiveMQ + Mosquitto + AWS IoT + Azure IoT + Kafka 3.x + Node-RED + Sparkplug B", "QoS2+retained", { path: "mcp-server/src/engines/MQTTKafkaStreamRouterEngine.ts", lines: 460 }),
    ML("P48", 13, "HISTORIAN", "TimeSeriesHistorianEngine — InfluxDB 3.0 IOx + TimescaleDB hypertables + Grafana provisioned", "1y hot/5y cold", { path: "mcp-server/src/engines/TimeSeriesHistorianEngine.ts", lines: 380 }),
    ML("P48", 14, "EDGE-INFER", "EdgeInferencePlatformAdapterEngine — Jetson Orin + Coral + Hailo-8 + Movidius + Alveo + RK3588 unified ONNX", "", { path: "mcp-server/src/engines/EdgeInferencePlatformAdapterEngine.ts", lines: 440 }),
    ML("P48", 15, "WEARABLE", "WearableOperatorTelemetryEngine — smartwatch HRV+motion + dust/noise dosimeter", "ETHICS: opt-in + anonymization + GDPR/P35", { path: "mcp-server/src/engines/WearableOperatorTelemetryEngine.ts", lines: 380, role: "R1", model: "opus-4.6", effort: 95 }),
    ML("P48", 16, "AR-GUIDE", "AROperatorGuidanceIngestEngine — HoloLens 2 MRTK3 + Magic Leap 2 ML2 SDK + haptic gloves", "", { path: "mcp-server/src/engines/AROperatorGuidanceIngestEngine.ts", lines: 360 }),
    ML("P48", 17, "FUSION", "SensorFusionKalmanUKFEngine — multi-rate EKF/UKF/particle + Mahalanobis + PTP IEEE 1588 + CI/SCI covariance fusion", "", { path: "mcp-server/src/engines/SensorFusionKalmanUKFEngine.ts", lines: 480 }),
    ML("P48", 18, "ANOMALY", "SensorAnomalyDetectionEngine — CUSUM/Page-Hinkley drift + stuck-at/rail/noise-floor + span/zero + IsoForest + VAE", "", { path: "mcp-server/src/engines/SensorAnomalyDetectionEngine.ts", lines: 360 }),
    ML("P48", 19, "CAL-TRACE", "SensorCalibrationTraceabilityEngine — ISO/IEC 17025 + NIST/PTB/NPL + GUM uncertainty + per-SN cert registry", "ties to P39-U05", { path: "mcp-server/src/engines/SensorCalibrationTraceabilityEngine.ts", lines: 340 }),
    ML("P48", 20, "P48-TESTS", "E2E: Kistler+ADXL+FLIR → cDAQ → FOCAS overlay → MQTT → InfluxDB → Grafana + Jetson TensorRT live PINN on M2/D2/S7 cuts", "", { role: "R4", model: "sonnet-4.6", effort: 95 }),
  ],
  gate: gate(["50/50 sensor sources wired", "E2E latency <200ms from Kistler to Grafana", "Anomaly detection catches 100% seeded faults", "ISO 17025 traceability chain complete", "Wearable GDPR opt-in + anonymization verified"], { ralph_required: true, ralph_grade_floor: "A+" }),
});

// ── P49: Foundation Model Orchestration (L7-A8 BLOCK) ──
phases.push({
  id: "P49", title: "Foundation Model Orchestration — 15 LLMs + 11 VLMs + CAD/TS/Graph/PointCloud FMs + 6 Embedders + ReAct/Reflexion + QLoRA/DoRA + vLLM/TGI/TensorRT",
  description: "L7-A8 BLOCK: 8/60 FM ecosystem coverage (13%). Without frontier Claude/GPT/Gemini routing + VLM for blueprints + CAD FMs (DeepCAD/SolidGen/BrepNet) + time-series FMs + agentic frameworks + fine-tune tooling, mill ML is a text-generation toy. Adds complete FM orchestration across 22 units.",
  sessions: "6-7", primary_role: "R1", primary_model: "opus-4.6", scrutiny_checkpoint: true,
  units: [
    ML("P49", 1, "MULTI-LLM", "MultiLLMRouterEngine — Claude 4.7/4.6/4.5 + GPT-4.5/5 + Gemini 2.0/2.5 + local fallback + per-task caps + cost/latency budgets", "", { path: "mcp-server/src/engines/MultiLLMRouterEngine.ts", lines: 520, role: "R1", model: "opus-4.6", effort: 95 }),
    ML("P49", 2, "LOCAL-POOL", "LocalLLMPoolEngine — Qwen2.5 + Llama 3.3 + DeepSeek V3 + Mistral Large + Mixtral 8x22B + Yi-Large + Falcon 180B via Ollama+vLLM", "extends P40-U01", { path: "mcp-server/src/engines/LocalLLMPoolEngine.ts", lines: 440 }),
    ML("P49", 3, "CODE-LLM", "CodeLLMSpecialistEngine — CodeLlama 34B + StarCoder2 15B + Qwen-Coder 32B + DeepSeek Coder V2 + Phind + CodeT5+ + InCoder + UnixCoder", "G-code specialization", { path: "mcp-server/src/engines/CodeLLMSpecialistEngine.ts", lines: 420 }),
    ML("P49", 4, "VLM-BP", "VLMForBlueprintEngine — GPT-4o Vision + Claude Opus Vision + LLaVA-Next 34B + Gemini 2 Flash Vision", "GD&T + drawing interp", { path: "mcp-server/src/engines/VLMForBlueprintEngine.ts", lines: 460 }),
    ML("P49", 5, "VLM-TOOL", "VLMForToolConditionEngine — InternVL2-76B + Qwen2-VL 72B + CogVLM2 + Molmo + Pixtral + MiniCPM-V + VILA", "insert wear/chip/surface imagery", { path: "mcp-server/src/engines/VLMForToolConditionEngine.ts", lines: 420 }),
    ML("P49", 6, "DEEPCAD-FM", "DeepCADFMBaselineEngine — fine-tune DeepCAD on JM Die CAD corpus", "", { path: "mcp-server/src/engines/DeepCADFMBaselineEngine.ts", lines: 340 }),
    ML("P49", 7, "SOLIDGEN", "SolidGenBrepNetFMIntegrationEngine — Autodesk SolidGen + BrepNet + Text2CAD + CAD-LLM", "generative CAD", { path: "mcp-server/src/engines/SolidGenBrepNetFMIntegrationEngine.ts", lines: 420 }),
    ML("P49", 8, "TS-FM", "TimeSeriesFMEngine — Chronos + Moment + TimeGPT + Lag-Llama", "sensor TS → RUL coupling", { path: "mcp-server/src/engines/TimeSeriesFMEngine.ts", lines: 340 }),
    ML("P49", 9, "GRAPH-FM", "GraphFMEngine — GROVER + UnifiedMol adapted to CAD assembly + toolpath DAGs", "", { path: "mcp-server/src/engines/GraphFMEngine.ts", lines: 320 }),
    ML("P49", 10, "PC-FM", "PointCloudFMEngine — PointGPT + PointBERT for post-machining surface QC", "", { path: "mcp-server/src/engines/PointCloudFMEngine.ts", lines: 300 }),
    ML("P49", 11, "EMBED-ROUTE", "EmbeddingRouterEngine — BGE-M3 + Voyage-3 + Nomic v2 + E5-Mistral + Cohere v3 + OpenAI text-embedding-3-large", "per-namespace routing", { path: "mcp-server/src/engines/EmbeddingRouterEngine.ts", lines: 360 }),
    ML("P49", 12, "REACT-TOT", "ReActTreeOfThoughtsReasoningEngine — formal primitives replace ad-hoc orchestration", "", { path: "mcp-server/src/engines/ReActTreeOfThoughtsReasoningEngine.ts", lines: 400 }),
    ML("P49", 13, "REFLEX-VOYAGER", "ReflexionVoyagerAgentLoopEngine — continuous self-improvement loop + curriculum", "", { path: "mcp-server/src/engines/ReflexionVoyagerAgentLoopEngine.ts", lines: 380 }),
    ML("P49", 14, "CONST-AI", "ConstitutionalAIAlignmentEngine — shop-safe response policy + red-team loop", "", { path: "mcp-server/src/engines/ConstitutionalAIAlignmentEngine.ts", lines: 340 }),
    ML("P49", 15, "QLORA-DORA", "QLoRADoRAGaLoreFineTuningEngine — 4-bit + weight-decomp + grad low-rank + Spectrum", "", { path: "mcp-server/src/engines/QLoRADoRAGaLoreFineTuningEngine.ts", lines: 380 }),
    ML("P49", 16, "TRAIN-HUB", "UnslothLLaMAFactoryAxolotlTrainingHubEngine — unified training frontend + DeepSpeed-Chat", "", { path: "mcp-server/src/engines/UnslothLLaMAFactoryAxolotlTrainingHubEngine.ts", lines: 400 }),
    ML("P49", 17, "FLASH-FSDP", "FlashAttention3FSDPAcceleratorEngine — large-model training throughput", "", { path: "mcp-server/src/engines/FlashAttention3FSDPAcceleratorEngine.ts", lines: 300 }),
    ML("P49", 18, "INFER-HUB", "vLLMTGITensorRTLLMInferenceHubEngine — inference backend unification", "", { path: "mcp-server/src/engines/vLLMTGITensorRTLLMInferenceHubEngine.ts", lines: 380 }),
    ML("P49", 19, "EVAL-SUITE", "ModelEvaluationBenchmarkSuite — HumanEval + SWE-Bench + MMLU + domain mill eval", "", { path: "mcp-server/src/engines/ModelEvaluationBenchmarkSuite.ts", lines: 360 }),
    ML("P49", 20, "LIC-COMPLY", "BaseModelLicenseComplianceEngine — Llama community vs MIT vs Apache vs commercial gates", "blocks unlicensed deploy", { path: "mcp-server/src/engines/BaseModelLicenseComplianceEngine.ts", lines: 320 }),
    ML("P49", 21, "RED-TEAM", "RedTeamingAdversarialPromptSuiteEngine — injection + jailbreak + safety + 500-case suite", "", { path: "mcp-server/src/engines/RedTeamingAdversarialPromptSuiteEngine.ts", lines: 380 }),
    ML("P49", 22, "P49-TESTS", "Route 100 mill tasks across 10+ models, verify accuracy+cost+latency+license", "", { role: "R4", model: "sonnet-4.6", effort: 95 }),
  ],
  gate: gate(["Router covers 15 LLMs + 11 VLMs", "VLM blueprint accuracy ≥92%", "CAD FM fine-tune converges on JM Die", "License compliance 100% per-model", "Red-team 500-case suite <0.5% bypass rate"], { ralph_required: true, ralph_grade_floor: "A+" }),
});

// ── P50: Data Pipeline Governance (L7-A9 BLOCK) ──
phases.push({
  id: "P50", title: "Data Pipeline Governance — Labeling + Feature Store + Great Expectations + OpenLineage + DVC/LakeFS + Opacus + Flower + Kubeflow + Watermarking",
  description: "L7-A9 BLOCK: 34 BUILD gaps. Without labeling (Label Studio/CVAT/Snorkel/Cleanlab/active learning/HITL/κ) + feature store (Feast) + data quality (Great Expectations/Pandera/Whylogs) + lineage (OpenLineage/DataHub) + versioning (DVC/LakeFS) + privacy-preserving ML (Opacus/Flower/CrypTen) + orchestration (Kubeflow/Argo/Airflow), production mill AI cannot be audited or reproduced.",
  sessions: "5-6", primary_role: "R1", primary_model: "opus-4.6", scrutiny_checkpoint: true,
  units: [
    ML("P50", 1, "LABEL-STUDIO", "LabelStudioIntegrationEngine — blueprint GD&T + tool-wear frames annotation", "", { path: "mcp-server/src/engines/LabelStudioIntegrationEngine.ts", lines: 360 }),
    ML("P50", 2, "CVAT", "CVATVideoAnnotationEngine — wear progression frame-by-frame", "", { path: "mcp-server/src/engines/CVATVideoAnnotationEngine.ts", lines: 320 }),
    ML("P50", 3, "ACTIVE-LEARN", "ActiveLearningLoopEngine — uncertainty + margin + diversity query strategies", "", { path: "mcp-server/src/engines/ActiveLearningLoopEngine.ts", lines: 340 }),
    ML("P50", 4, "HITL-MOBILE", "HITLOperatorAnnotationMobileEngine — tablet UI for shop floor", "", { path: "mcp-server/src/engines/HITLOperatorAnnotationMobileEngine.ts", lines: 380 }),
    ML("P50", 5, "IAA", "InterAnnotatorAgreementEngine — Cohen κ + Krippendorff α + rotation", "gate κ≥0.75", { path: "mcp-server/src/engines/InterAnnotatorAgreementEngine.ts", lines: 260 }),
    ML("P50", 6, "WEAK-SUP", "WeakSupervisionSnorkelCleanlabEngine — labeling functions + noise model", "", { path: "mcp-server/src/engines/WeakSupervisionSnorkelCleanlabEngine.ts", lines: 340 }),
    ML("P50", 7, "LABEL-QA", "LabelQualityPredictionEngine — confident-learning classifier for wrong labels", "", { path: "mcp-server/src/engines/LabelQualityPredictionEngine.ts", lines: 280 }),
    ML("P50", 8, "FEAST", "FeastFeatureStoreEngine — offline + Redis online serving + validation <50ms p95", "", { path: "mcp-server/src/engines/FeastFeatureStoreEngine.ts", lines: 440, role: "R1", model: "opus-4.6", effort: 90 }),
    ML("P50", 9, "FEAT-DRIFT", "FeatureDriftMonitorEngine — PSI/KL per feature (distinct from model drift)", "", { path: "mcp-server/src/engines/FeatureDriftMonitorEngine.ts", lines: 300 }),
    ML("P50", 10, "GX-PANDERA", "GreatExpectationsPanderaDataContractEngine — schema + distribution + evolution (Avro/Protobuf/JSON)", "", { path: "mcp-server/src/engines/GreatExpectationsPanderaDataContractEngine.ts", lines: 400 }),
    ML("P50", 11, "WHYLOGS", "WhylogsProfilingEngine — statistical profiles + outlier (IQR + IsoForest + MAD)", "", { path: "mcp-server/src/engines/WhylogsProfilingEngine.ts", lines: 280 }),
    ML("P50", 12, "PII-PRESIDIO", "PIISPresidioScrubberEngine — operationalizes P35-U10 via Presidio + spaCy + custom", "", { path: "mcp-server/src/engines/PIISPresidioScrubberEngine.ts", lines: 320 }),
    ML("P50", 13, "LINEAGE", "OpenLineageDataHubLineageEngine — cross-engine provenance + catalog + Marquez + Amundsen", "≥95% engine coverage", { path: "mcp-server/src/engines/OpenLineageDataHubLineageEngine.ts", lines: 420 }),
    ML("P50", 14, "DVC-LAKEFS", "DVCLakeFSVersioningEngine — real DVC + LakeFS + Git LFS (not DVC-style)", "", { path: "mcp-server/src/engines/DVCLakeFSVersioningEngine.ts", lines: 360 }),
    ML("P50", 15, "MLFLOW-WANDB", "MLflowWandbExperimentTrackingEngine — extends P26-U01 with W&B", "", { path: "mcp-server/src/engines/MLflowWandbExperimentTrackingEngine.ts", lines: 300 }),
    ML("P50", 16, "OPACUS-DP", "OpacusDifferentialPrivacyEngine — ties to P29-U06 ε-budget; ε≤1.0 per-shop", "", { path: "mcp-server/src/engines/OpacusDifferentialPrivacyEngine.ts", lines: 380, role: "R1", model: "opus-4.6", effort: 90 }),
    ML("P50", 17, "FLOWER-FL", "FlowerFedMLFederatedLearningEngine — extends P24-U04 FedAvg with Flower + FedML + NVFlare substrate", "3-shop pilot <1% loss", { path: "mcp-server/src/engines/FlowerFedMLFederatedLearningEngine.ts", lines: 420 }),
    ML("P50", 18, "CRYPTEN-SMPC", "CrypTenSMPCEngine — cross-shop ML without data leak; HE (SEAL/OpenFHE) fallback", "", { path: "mcp-server/src/engines/CrypTenSMPCEngine.ts", lines: 400 }),
    ML("P50", 19, "KUBEFLOW", "KubeflowArgoAirflowPipelineEngine — DAG orchestration across Kubeflow + Argo + Airflow", "", { path: "mcp-server/src/engines/KubeflowArgoAirflowPipelineEngine.ts", lines: 440 }),
    ML("P50", 20, "MIA-DEF", "MembershipInferenceDefenseEngine — MIA + reconstruction attack defenses", "", { path: "mcp-server/src/engines/MembershipInferenceDefenseEngine.ts", lines: 320 }),
    ML("P50", 21, "MODEL-WM", "ModelWatermarkingEngine — detect stolen fine-tuned models", "", { path: "mcp-server/src/engines/ModelWatermarkingEngine.ts", lines: 280 }),
    ML("P50", 22, "P50-TESTS", "E2E: label → feature → train → monitor on JM Die; κ≥0.75; Feast p95<50ms; Opacus ε≤1.0; Flower 3-shop; Kubeflow deterministic rerun", "", { role: "R4", model: "sonnet-4.6", effort: 95 }),
  ],
  gate: gate(["κ≥0.75 on 200-sample gold set", "Feast round-trip <50ms p95", "OpenLineage graph ≥95% coverage", "Opacus ε≤1.0 honored", "Flower 3-shop <1% accuracy loss", "Kubeflow DAG reruns deterministic under DVC pin"], { ralph_required: true, ralph_grade_floor: "A+" }),
});

// ── P51: Tribal + Operator Capture ML (L7-A10 BLOCK) ──
phases.push({
  id: "P51", title: "Tribal + Operator Capture ML — Tablet Writeback + Voice Memo STT + Pendant Flags + Barcode + Interviews + Forums + Dedup + Confidence Loop",
  description: "L7-A10 BLOCK: 35/41 tacit-knowledge dimensions absent. Without tablet writeback + voice+Whisper + pendant flags + barcodes + interview ingest + shop-chat (with GDPR) + forum crawlers (Practical Machinist + CNCzone + Reddit + HSMAdvisor + CAMAdvisor) + tip dedup + contradiction detection + confidence-from-rerun + multilingual + licensing flags, tribal knowledge is frozen at 3,700 raw tips with no feedback loop.",
  sessions: "4-5", primary_role: "R2", primary_model: "sonnet-4.6", scrutiny_checkpoint: true,
  units: [
    ML("P51", 1, "TABLET-SURVEY", "PostCycleTabletSurveyEngine — 3-tap + optional voice memo, wired to MTConnect cycle-end", "", { path: "mcp-server/src/engines/PostCycleTabletSurveyEngine.ts", lines: 340 }),
    ML("P51", 2, "VOICE-STT", "VoiceMemoWhisperSTTEngine — live operator commentary, Whisper large-v3, topic tag", "", { path: "mcp-server/src/engines/VoiceMemoWhisperSTTEngine.ts", lines: 320 }),
    ML("P51", 3, "PENDANT-FLAG", "PendantFlagThisMomentEngine — M-code macro → MTConnect event for ML supervision", "", { path: "mcp-server/src/engines/PendantFlagThisMomentEngine.ts", lines: 240 }),
    ML("P51", 4, "BARCODE", "BarcodeSetupSheetAnnotationEngine — QR on setup sheet → operator notes in TravelerEngine", "", { path: "mcp-server/src/engines/BarcodeSetupSheetAnnotationEngine.ts", lines: 260 }),
    ML("P51", 5, "DEBRIEF", "ShiftDebriefTranscriptIngestEngine — supervisor+operator audio → STT → RCA tags", "", { path: "mcp-server/src/engines/ShiftDebriefTranscriptIngestEngine.ts", lines: 300 }),
    ML("P51", 6, "TC-REASON", "ToolChangeReasonCodeRegistryEngine — 7 cats (planned/wear/break/chip/chatter/setup-change/preventive)", "", { path: "mcp-server/src/engines/ToolChangeReasonCodeRegistryEngine.ts", lines: 220 }),
    ML("P51", 7, "REJECT-RCA", "RejectedPartRCALogEngine — SPC+FAI+customer-rejection linked RCA", "", { path: "mcp-server/src/engines/RejectedPartRCALogEngine.ts", lines: 300 }),
    ML("P51", 8, "SCRAP-OCR", "ScrapTagOCRPhotoEngine — photo → handwriting OCR → structured scrap event", "", { path: "mcp-server/src/engines/ScrapTagOCRPhotoEngine.ts", lines: 280 }),
    ML("P51", 9, "BREAK-FORM", "BreakageEventFormIngestEngine — correlate with KienzleForceModel + ChatterStabilityLobe", "", { path: "mcp-server/src/engines/BreakageEventFormIngestEngine.ts", lines: 300 }),
    ML("P51", 10, "GOOD-RUN", "GoodRunFlaggingLockParamsEngine — perfect flag → promote to PreferredParamsRegistry", "", { path: "mcp-server/src/engines/GoodRunFlaggingLockParamsEngine.ts", lines: 240 }),
    ML("P51", 11, "MASTER-INT", "MasterMachinistInterviewIngestEngine — recorded + Whisper + topic + seniority tag", "", { path: "mcp-server/src/engines/MasterMachinistInterviewIngestEngine.ts", lines: 320 }),
    ML("P51", 12, "EMAIL-CHAT", "EmailWhatsAppShopChatIngestEngine — GDPR/P35 consent gate + redaction + part/tool/material NER", "", { path: "mcp-server/src/engines/EmailWhatsAppShopChatIngestEngine.ts", lines: 380, role: "R1", model: "opus-4.6", effort: 85 }),
    ML("P51", 13, "MARGIN-OCR", "BlueprintMarginOCRIngestEngine — annotated blueprint scans → handwriting OCR → part record", "", { path: "mcp-server/src/engines/BlueprintMarginOCRIngestEngine.ts", lines: 300 }),
    ML("P51", 14, "CELL-CAM", "CellCameraGoProFirstPersonIngestEngine — vision pipeline + action-segmentation + start/stop patterns", "", { path: "mcp-server/src/engines/CellCameraGoProFirstPersonIngestEngine.ts", lines: 400 }),
    ML("P51", 15, "TIP-DEDUP", "TipDedupSemanticSimilarityEngine — 3,700 tips → ~2,000 via sentence-embedding clustering", "preserve source attribution", { path: "mcp-server/src/engines/TipDedupSemanticSimilarityEngine.ts", lines: 300 }),
    ML("P51", 16, "TIP-CONTRA", "TipContradictionDetectorEngine — NLI over tip pairs + senior arbitration queue", "", { path: "mcp-server/src/engines/TipContradictionDetectorEngine.ts", lines: 280 }),
    ML("P51", 17, "TIP-CONF", "TipConfidenceFromRerunSuccessEngine — tip used → run outcome → Bayesian update", "closed-loop learning", { path: "mcp-server/src/engines/TipConfidenceFromRerunSuccessEngine.ts", lines: 320 }),
    ML("P51", 18, "TIP-LANG", "TipMultilingualCaptureEngine — es/pl/vi/zh → MT → English store; preserve original", "", { path: "mcp-server/src/engines/TipMultilingualCaptureEngine.ts", lines: 280 }),
    ML("P51", 19, "TIP-LIC", "TipProprietaryLicensingFlagEngine — customer-confidential + ITAR/P35 ACL propagation", "", { path: "mcp-server/src/engines/TipProprietaryLicensingFlagEngine.ts", lines: 240 }),
    ML("P51", 20, "FORUMS", "MachiningCommunityForumIngestEngine — Practical Machinist + CNCzone + Reddit r/Machinists/Metalworking/Hobbymachinist + Home Machinist + HSMAdvisor + CAMAdvisor", "LICENSE+robots.txt+opt-in", { path: "mcp-server/src/engines/MachiningCommunityForumIngestEngine.ts", lines: 440, role: "R1", model: "opus-4.6", effort: 85 }),
    ML("P51", 21, "P51-TESTS", "100 operator tips across 10 channels + deduped + confidence-scored + routed; Whisper STT validated on 20 shop-floor audio", "", { role: "R4", model: "sonnet-4.6", effort: 95 }),
  ],
  gate: gate(["100 tips captured across 10 channels + deduped + confidence-scored", "Tip dedup reduces 3,700→~2,000 with attribution", "Contradiction detector flags 100% seeded contradictions", "Whisper STT <10% WER on shop floor audio", "Forum ingest respects licensing + robots.txt"], { ralph_required: true, ralph_grade_floor: "A" }),
});

// ── Loop 8 v10.0.0 phases (P52-P61) — exhaustive mill variability axes ──

// P52 — Workholding (15u) — 46-class catalog, zero-point, adhesive, magnetic, vacuum, hydraulic, sub-plate, conformal
phases.push({
  id: "P52",
  title: "Workholding Exhaustive Catalog — 46 fixture classes + zero-point + adhesive + vacuum + conformal",
  description: "L8-A1 WARN: mill has ~8/46 workholding classes. Add Schunk/Jergens/5thAxis/Mitee-Bite/Raptor/Orange Vise/Snap-Jaws/Kurt/Palmgren/BigKaiser + conformal/adhesive/vacuum/magnetic/hydraulic/sub-plate/tombstone/pallet/self-centering/step/soft-jaw catalog. Physics: clamping force, pull-down, deflection under cut, tombstone thermal droop, vibration modes.",
  sessions: "12-15",
  primary_role: "R1",
  primary_model: "opus-4.6",
  units: [
    ML("P52", 1, "FIX-CAT", "WorkholdingCatalogEngine — 46-class taxonomy (vise/chuck/collet/tombstone/fixture-plate/sub-plate/pallet/magnetic/vacuum/adhesive/hydraulic/mechanical/conformal/modular/dedicated)", "", { path: "mcp-server/src/engines/WorkholdingCatalogEngine.ts", lines: 520, role: "R1", model: "opus-4.6", effort: 90 }),
    ML("P52", 2, "FIX-VISE", "ViseFamilyExhaustiveEngine — Kurt/Orange/Mitee-Bite/Raptor/Snap-Jaws/Jergens + double-station + self-centering + 5-axis + step + soft-jaw variants", "", { path: "mcp-server/src/engines/ViseFamilyExhaustiveEngine.ts", lines: 440 }),
    ML("P52", 3, "FIX-ZPS", "ZeroPointSystemEngine — Schunk VERO-S / Jergens Ball Lock / 5thAxis RockLock / BigKaiser Unilock + <10s pallet change + repeatability 0.005mm", "", { path: "mcp-server/src/engines/ZeroPointSystemEngine.ts", lines: 360 }),
    ML("P52", 4, "FIX-TOMB", "TombstoneFixtureEngine — 4-sided / 6-sided / hex / octagonal + thermal droop compensation + mass balance", "", { path: "mcp-server/src/engines/TombstoneFixtureEngine.ts", lines: 320 }),
    ML("P52", 5, "FIX-MAG", "MagneticChuckEngine — permanent/electro/electro-permanent + flux density + breakaway force + grind-ready", "", { path: "mcp-server/src/engines/MagneticChuckEngine.ts", lines: 300 }),
    ML("P52", 6, "FIX-VAC", "VacuumChuckEngine — porous/grid/gasket + leakage rate + hold-force per cm² + coolant sealing", "", { path: "mcp-server/src/engines/VacuumChuckEngine.ts", lines: 300 }),
    ML("P52", 7, "FIX-ADH", "AdhesiveFixturingEngine — MITEE-GRIP / cyanoacrylate + release temp + shear strength + thin-wall aerospace", "", { path: "mcp-server/src/engines/AdhesiveFixturingEngine.ts", lines: 280 }),
    ML("P52", 8, "FIX-HYD", "HydraulicFixtureEngine — swing/edge/power clamps + pressure-to-force + proof-pressure safety", "", { path: "mcp-server/src/engines/HydraulicFixtureEngine.ts", lines: 300 }),
    ML("P52", 9, "FIX-CONF", "ConformalFixtureEngine — phase-change/low-melt alloy + wax + shot-bag + expanding foam for organic shapes", "", { path: "mcp-server/src/engines/ConformalFixtureEngine.ts", lines: 320 }),
    ML("P52", 10, "FIX-MOD", "ModularFixturePlateEngine — grid-hole 25/40/50mm + T-slot + dowel + reconfig time + ROI vs dedicated", "", { path: "mcp-server/src/engines/ModularFixturePlateEngine.ts", lines: 300 }),
    ML("P52", 11, "FIX-FORCE", "ClampingForceSolverEngine — required clamp = cut force × safety factor ÷ μ + pull-down + tipping moment", "", { path: "mcp-server/src/engines/ClampingForceSolverEngine.ts", lines: 360 }),
    ML("P52", 12, "FIX-DEFL", "FixtureDeflectionFEMEngine — support span vs part stiffness + surface-finish impact from deflection", "", { path: "mcp-server/src/engines/FixtureDeflectionFEMEngine.ts", lines: 360 }),
    ML("P52", 13, "FIX-VIB", "FixtureVibrationModeEngine — tombstone natural freq + pallet rock + sub-plate harmonic + chatter coupling", "", { path: "mcp-server/src/engines/FixtureVibrationModeEngine.ts", lines: 340 }),
    ML("P52", 14, "FIX-COLL", "FixtureCollisionEnvelopeEngine — clamp-head swept volume + tool-clearance + retract safety per setup", "", { path: "mcp-server/src/engines/FixtureCollisionEnvelopeEngine.ts", lines: 320 }),
    ML("P52", 15, "P52-TESTS", "Physics: clamp force ≥ cut force × 2.5; deflection <0.01mm/N for 50-mm span; 46 fixture classes selectable", "", { role: "R4", model: "sonnet-4.6", effort: 80 }),
  ],
  gate: gate(["All 46 workholding classes catalogued with spec sheets", "Clamping-force solver passes 25 benchmark cases", "FEM deflection validated ±10% vs FEA", "Vibration-mode analysis identifies chatter risk", "ZPS pallet repeatability ≤5μm"], { ralph_required: true, ralph_grade_floor: "A" }),
});

// P53 — ToolGeo ISO Taxonomy (12u) — ISO 1832 insert codes + ISO 513 grades + ISO 13399 tool-data
phases.push({
  id: "P53",
  title: "Tool Geometry Exhaustive — ISO 1832/513/13399 full taxonomy (120 items)",
  sessions: "10-12",
  primary_role: "R1",
  primary_model: "opus-4.6",
  description: "L8-A2 BLOCK: insert/tool geometry coverage is ad-hoc. Add full ISO 1832 insert-code parser (shape/clearance/tolerance/type/size/thickness/corner/cutting-edge/hand/chip-breaker), ISO 513 material grade ranges (P/M/K/N/S/H with hardness/coating/substrate), ISO 13399 tool-data exchange.",
  units: [
    ML("P53", 1, "ISO1832", "ISO1832InsertCodeParserEngine — 10-char code → shape/clearance/tolerance/type/size/thick/corner/edge/hand/breaker", "", { path: "mcp-server/src/engines/ISO1832InsertCodeParserEngine.ts", lines: 480, role: "R1", model: "opus-4.6", effort: 95 }),
    ML("P53", 2, "ISO513", "ISO513MaterialGradeEngine — P/M/K/N/S/H grades + sub-classes + hardness + coating + substrate + HPC/HSM/finish ratings", "", { path: "mcp-server/src/engines/ISO513MaterialGradeEngine.ts", lines: 420, role: "R1", model: "opus-4.6", effort: 85 }),
    ML("P53", 3, "ISO13399", "ISO13399ToolDataExchangeEngine — STEP AP242 + ToolingGeometry.xml + GTC/AdapterID/CuttingItemID interchange", "", { path: "mcp-server/src/engines/ISO13399ToolDataExchangeEngine.ts", lines: 400 }),
    ML("P53", 4, "INSERT-SHAPE", "InsertShapeLibraryEngine — C/D/E/H/K/L/M/O/P/R/S/T/V/W/X full set + dogbone/dovetail/trigon + indexable solid", "", { path: "mcp-server/src/engines/InsertShapeLibraryEngine.ts", lines: 360 }),
    ML("P53", 5, "ENDMILL-GEO", "EndmillGeometryEngine — flute count 2-12 + helix 30/38/42/45/55/variable + eccentric-relief + core-dia + neck", "", { path: "mcp-server/src/engines/EndmillGeometryEngine.ts", lines: 400 }),
    ML("P53", 6, "BARREL-TOOL", "BarrelOvalConicalTaperEngine — OSG/Emuge/Kennametal barrel/oval/segment/conical-taper for 5-axis finishing", "", { path: "mcp-server/src/engines/BarrelOvalConicalTaperEngine.ts", lines: 340, role: "R1", model: "opus-4.6", effort: 70 }),
    ML("P53", 7, "DRILL-GEO", "DrillGeometryExhaustiveEngine — 118°/135°/140° point + split-point + web-thinned + 3-flute + stub/jobber/long/XD + through-coolant", "", { path: "mcp-server/src/engines/DrillGeometryExhaustiveEngine.ts", lines: 400 }),
    ML("P53", 8, "TAP-GEO", "TapGeometryEngine — spiral-point/spiral-flute/straight/forming + ISO M/UN/BSP/NPT + pitch+lead+chamfer", "", { path: "mcp-server/src/engines/TapGeometryEngine.ts", lines: 360 }),
    ML("P53", 9, "REAM-GEO", "ReamerGeometryEngine — straight/helical/chucking/floating/piloted/carbide/HSS + H6/H7/H8 tolerance mapping", "", { path: "mcp-server/src/engines/ReamerGeometryEngine.ts", lines: 320 }),
    ML("P53", 10, "COAT-MAT", "CoatingSubstratePairingEngine — TiN/TiCN/TiAlN/AlTiN/AlCrN/TiB₂/nACo/DLC + carbide grade K10-K40/P10-P40 map to ISO513", "", { path: "mcp-server/src/engines/CoatingSubstratePairingEngine.ts", lines: 380, role: "R1", model: "opus-4.6", effort: 75 }),
    ML("P53", 11, "CHIP-BREAK", "ChipBreakerGeometryEngine — finishing/medium/roughing/HSM + groove depth+land+rake + ISO breaker codes", "", { path: "mcp-server/src/engines/ChipBreakerGeometryEngine.ts", lines: 340 }),
    ML("P53", 12, "P53-TESTS", "120 ISO items parseable; ISO 1832 round-trip 100%; ISO 513 grade recommendations verified vs Sandvik/Kennametal catalogs", "", { role: "R4", model: "sonnet-4.6", effort: 90 }),
  ],
  gate: gate(["All 120 ISO taxonomy items covered", "ISO 1832 parser 100% round-trip", "ISO 513 grade recommendations match 3 vendor catalogs", "ISO 13399 export passes STEP AP242 validation"], { ralph_required: true, ralph_grade_floor: "A+" }),
});

// P54 — MillOps Exhaustive (14u) — 74 op types with 21 missing
phases.push({
  id: "P54",
  title: "Mill Operations Exhaustive — 74 operation types (back-bore/rest-rough/port/Woodruff/polygon/LAM/AM-hybrid)",
  sessions: "12-14",
  primary_role: "R1",
  primary_model: "opus-4.6",
  description: "L8-A3 WARN: 21/74 op types missing. Add back-boring, rest-roughing, port-cutting, Woodruff-key, polygon-turning-on-mill, gear-hobbing-on-mill, laser-assisted machining (LAM), additive-subtractive hybrid, chamfer-milling, engraving, diamond-fly, vibration-assisted.",
  units: [
    ML("P54", 1, "OP-BACK", "BackBoringOperationEngine — stub boring bar + reverse feed + depth-stop + through-hole entry", "", { path: "mcp-server/src/engines/BackBoringOperationEngine.ts", lines: 340 }),
    ML("P54", 2, "OP-REST", "RestRoughingOperationEngine — adaptive remainder-stock detection + stepdown optimizer + HSM wire-frame", "", { path: "mcp-server/src/engines/RestRoughingOperationEngine.ts", lines: 380, role: "R1", model: "opus-4.6", effort: 80 }),
    ML("P54", 3, "OP-PORT", "PortCuttingOperationEngine — Sunnen/hydraulic port + form-tool library + depth-gage + surface-finish", "", { path: "mcp-server/src/engines/PortCuttingOperationEngine.ts", lines: 340 }),
    ML("P54", 4, "OP-WOOD", "WoodruffKeyslotEngine — 202/204/404 sizes + arbor cutters + interrupted cut physics", "", { path: "mcp-server/src/engines/WoodruffKeyslotEngine.ts", lines: 280 }),
    ML("P54", 5, "OP-POLY", "PolygonMillingEngine — 2/3/4/6-sided polygon from cylindrical stock + feed-sync + rotary + spindle ratio", "", { path: "mcp-server/src/engines/PolygonMillingEngine.ts", lines: 340 }),
    ML("P54", 6, "OP-HOB", "GearHobbingOnMillEngine — indexable hob + module/DP + helical sync + root/OD relief", "", { path: "mcp-server/src/engines/GearHobbingOnMillEngine.ts", lines: 400, role: "R1", model: "opus-4.6", effort: 80 }),
    ML("P54", 7, "OP-LAM", "LaserAssistedMachiningEngine — fiber laser preheat for superalloy + temp field + softening + tool-life gain", "", { path: "mcp-server/src/engines/LaserAssistedMachiningEngine.ts", lines: 380, role: "R1", model: "opus-4.6", effort: 80 }),
    ML("P54", 8, "OP-HYBRID", "AdditiveSubtractiveHybridEngine — DED/LMD + subtractive finish + thermal in-process + DMG MORI LASERTEC 65", "", { path: "mcp-server/src/engines/AdditiveSubtractiveHybridEngine.ts", lines: 440, role: "R1", model: "opus-4.6", effort: 90 }),
    ML("P54", 9, "OP-CHMF", "ChamferMillingExhaustiveEngine — 2D contour + 3D edge-detect + back-chamfer + dogbone + Heule Cofa/Bavius", "", { path: "mcp-server/src/engines/ChamferMillingExhaustiveEngine.ts", lines: 340 }),
    ML("P54", 10, "OP-ENG", "EngravingOperationEngine — single-line/fill + TrueType/SVG + variable-depth + CharGroove", "", { path: "mcp-server/src/engines/EngravingOperationEngine.ts", lines: 320 }),
    ML("P54", 11, "OP-FLY", "DiamondFlyCuttingEngine — mirror-finish PCD fly + single-crystal + Ra <0.05μm + non-ferrous optics", "", { path: "mcp-server/src/engines/DiamondFlyCuttingEngine.ts", lines: 320 }),
    ML("P54", 12, "OP-VAM", "VibrationAssistedMillingEngine — ultrasonic 20-60 kHz + axial/torsional mode + DMG SAUER Ultrasonic", "", { path: "mcp-server/src/engines/VibrationAssistedMillingEngine.ts", lines: 360, role: "R1", model: "opus-4.6", effort: 75 }),
    ML("P54", 13, "OP-RIFLE", "RiflingBroachingBoreFormEngine — linear-interp rifling + form broach + spline broaching + Slotter mode", "", { path: "mcp-server/src/engines/RiflingBroachingBoreFormEngine.ts", lines: 320 }),
    ML("P54", 14, "P54-TESTS", "All 74 op types dispatchable; 21 new ops generate valid G-code for Fanuc+Heidenhain; physics validated", "", { role: "R4", model: "sonnet-4.6", effort: 95 }),
  ],
  gate: gate(["All 74 mill operation types implemented", "21 new operations pass G-code regression", "LAM/hybrid physics match published thermal fields", "Gear-hobbing OD/root validated vs AGMA"], { ralph_required: true, ralph_grade_floor: "A" }),
});

// P55 — Materials Exhaustive (10u) — ~96 ISO 513 classes with 76% absent
phases.push({
  id: "P55",
  title: "Materials Exhaustive — superalloy + composite + exotic + AM + medical + hardened (~96 ISO 513 classes)",
  sessions: "10-12",
  primary_role: "R1",
  primary_model: "opus-4.6",
  description: "L8-A4 BLOCK: 76% of ISO 513 material universe missing. Add Inconel 625/718/X750/HX, Hastelloy C22/C276, Waspaloy, Rene 41/95/104, CMSX-4/10, MAR-M247, CFRP/GFRP/AFRP, Ti-6242S/Ti-5553/gamma-TiAl, Zr-702/705, Be/BeCu C17200, tungsten heavies, AM printed (DMLS 316L/IN718/Ti64 with residual stress+porosity), medical (CoCrMo/Nitinol/Ti-6Al-7Nb), hardened (62+ HRC die steels).",
  units: [
    ML("P55", 1, "MAT-SUPER", "SuperalloyCatalogEngine — Inconel 625/718/X750/HX + Hastelloy C22/C276/B3 + Waspaloy + Rene 41/95/104 + CMSX-4/10 + MAR-M247 + Haynes 282 (20 grades)", "", { path: "mcp-server/src/engines/SuperalloyCatalogEngine.ts", lines: 520, role: "R1", model: "opus-4.6", effort: 95 }),
    ML("P55", 2, "MAT-CFRP", "CompositeMachiningEngine — CFRP/GFRP/AFRP + fiber orientation + delamination + PCD/diamond-coat + down-milling bias", "", { path: "mcp-server/src/engines/CompositeMachiningEngine.ts", lines: 480, role: "R1", model: "opus-4.6", effort: 85 }),
    ML("P55", 3, "MAT-TI-EXOT", "ExoticTitaniumEngine — Ti-6242S / Ti-5553 / gamma-TiAl + beta-phase + alpha-beta heat-treat + segmented chip physics", "", { path: "mcp-server/src/engines/ExoticTitaniumEngine.ts", lines: 420 }),
    ML("P55", 4, "MAT-REACT", "ReactiveMaterialEngine — Zr-702/705 + Be/BeCu C17200 + Mg-AZ31/AZ91 + fire-suppression + IH safety", "", { path: "mcp-server/src/engines/ReactiveMaterialEngine.ts", lines: 400, role: "R1", model: "opus-4.6", effort: 80 }),
    ML("P55", 5, "MAT-HEAVY", "TungstenHeavyAlloyEngine — W-Ni-Fe/W-Ni-Cu 90-97% W + density + fracture + carbide/PCD tooling + dust extraction", "", { path: "mcp-server/src/engines/TungstenHeavyAlloyEngine.ts", lines: 340 }),
    ML("P55", 6, "MAT-AM", "AMMachinedMaterialEngine — DMLS 316L/IN718/Ti64 + residual stress + porosity impact + anisotropy + build-direction", "", { path: "mcp-server/src/engines/AMMachinedMaterialEngine.ts", lines: 440, role: "R1", model: "opus-4.6", effort: 85 }),
    ML("P55", 7, "MAT-MED", "MedicalImplantMaterialEngine — CoCrMo F75 + Nitinol + Ti-6Al-7Nb + UHMWPE + PEEK + ISO 13485/FDA traceability", "", { path: "mcp-server/src/engines/MedicalImplantMaterialEngine.ts", lines: 400 }),
    ML("P55", 8, "MAT-HARD", "HardenedDieSteelEngine — 62+HRC D2/S7/A2/M2 + PM-steels CPM 10V/15V/M4 + CBN/PCBN tooling + HSM strategies", "", { path: "mcp-server/src/engines/HardenedDieSteelEngine.ts", lines: 420 }),
    ML("P55", 9, "MAT-PHYS", "MaterialPhysicsDatabaseEngine — Johnson-Cook + Zerilli-Armstrong + thermal-softening + strain-rate per 96 grades", "", { path: "mcp-server/src/engines/MaterialPhysicsDatabaseEngine.ts", lines: 500, role: "R1", model: "opus-4.6", effort: 90 }),
    ML("P55", 10, "P55-TESTS", "96 material classes indexed; Kienzle kc1.1 per grade validated vs vendor data; AM anisotropy physics verified", "", { role: "R4", model: "sonnet-4.6", effort: 85 }),
  ],
  gate: gate(["96 ISO 513 material classes indexed", "Johnson-Cook params for all classes", "Reactive/medical/AM traceability passes ISO 13485", "kc1.1 ±15% vs Sandvik/Kennametal data"], { ralph_required: true, ralph_grade_floor: "A+" }),
});

// P56 — Controllers Exhaustive (14u) — 93 features x 17 controllers = 1581 cells
phases.push({
  id: "P56",
  title: "Controller Feature Exhaustive — 93 features × 17 controllers (1581 cells)",
  sessions: "12-14",
  primary_role: "R1",
  primary_model: "opus-4.6",
  description: "L8-A5 WARN: controller coverage is sparse. Exhaustive feature matrix: Fanuc 30i/31i/32i + Heidenhain TNC640/iTNC530 + Siemens 840D/828D + Okuma OSP-P300/P500 + Mazak Mazatrol SmoothX/G + Haas NGC + Mitsubishi M800/M80 + Centroid + Hurco WinMax + 3-axis/4-axis/5-axis variants. Features: G43.4/G43.5 TCP, TRAORI/TRACYL, CAS/TAS, NURBS look-ahead, HSM, tool-wear comp, probe macros, HPC depth, 5-axis tilting-work-plane.",
  units: [
    ML("P56", 1, "CTRL-FANUC", "FanucFeatureExhaustiveEngine — 30i/31i/32i + all G-codes incl. G43.4 TCP + G68 coord rot + M198 sub-prog + macro B", "", { path: "mcp-server/src/engines/FanucFeatureExhaustiveEngine.ts", lines: 480, role: "R1", model: "opus-4.6", effort: 85 }),
    ML("P56", 2, "CTRL-HEID", "HeidenhainFeatureExhaustiveEngine — TNC640/iTNC530 + Klartext FN + Q-params + DYNCOLL + OCM + PLANE SPATIAL", "", { path: "mcp-server/src/engines/HeidenhainFeatureExhaustiveEngine.ts", lines: 500, role: "R1", model: "opus-4.6", effort: 90 }),
    ML("P56", 3, "CTRL-SIEM", "SiemensFeatureExhaustiveEngine — 840D/828D + TRAORI/TRACYL/TRANSMIT + CYCLE800 + MCALL + R-params + ShopMill", "", { path: "mcp-server/src/engines/SiemensFeatureExhaustiveEngine.ts", lines: 500, role: "R1", model: "opus-4.6", effort: 90 }),
    ML("P56", 4, "CTRL-OKUMA", "OkumaFeatureExhaustiveEngine — OSP-P300M/P500M + Machining Navi + TAS-C/S + CAS + IEX + thermal active", "", { path: "mcp-server/src/engines/OkumaFeatureExhaustiveEngine.ts", lines: 440 }),
    ML("P56", 5, "CTRL-MAZAK", "MazakFeatureExhaustiveEngine — Mazatrol SmoothX/G + EIA/ISO dual + SMOOTH Ai + conversational + Mazavoice", "", { path: "mcp-server/src/engines/MazakFeatureExhaustiveEngine.ts", lines: 440 }),
    ML("P56", 6, "CTRL-HAAS", "HaasNGCFeatureEngine — NGC + Visual Programming System + macros + G187 accuracy + G68 rot + WIPS probe cycles", "", { path: "mcp-server/src/engines/HaasNGCFeatureEngine.ts", lines: 380 }),
    ML("P56", 7, "CTRL-MITSU", "MitsubishiFeatureEngine — M800/M80 + NAVI MILL + PC-based + Shape-Adaptive Control + High-Speed Smooth", "", { path: "mcp-server/src/engines/MitsubishiFeatureEngine.ts", lines: 380 }),
    ML("P56", 8, "CTRL-CENT", "CentroidHurcoFeatureEngine — Centroid Acorn/Allin-One + Hurco WinMax + NC/Conversational + UltiMotion", "", { path: "mcp-server/src/engines/CentroidHurcoFeatureEngine.ts", lines: 340 }),
    ML("P56", 9, "CTRL-FEAT-MATRIX", "ControllerFeatureMatrixEngine — 93 features × 17 controllers availability + syntax + fallback-translation", "", { path: "mcp-server/src/engines/ControllerFeatureMatrixEngine.ts", lines: 560, role: "R1", model: "opus-4.6", effort: 95 }),
    ML("P56", 10, "CTRL-LOOKAHEAD", "LookAheadNURBSBSplineEngine — G05.1 Q1 / CYCLE832 / Machining Navi + block-rate + jerk-limited + tolerance", "", { path: "mcp-server/src/engines/LookAheadNURBSBSplineEngine.ts", lines: 400, role: "R1", model: "opus-4.6", effort: 80 }),
    ML("P56", 11, "CTRL-5AX-TILT", "TiltedWorkPlaneUnifiedEngine — G68.2/PLANE SPATIAL/CYCLE800/CS-ROT unified abstraction + sequence Euler ZYZ/XYZ", "", { path: "mcp-server/src/engines/TiltedWorkPlaneUnifiedEngine.ts", lines: 420, role: "R1", model: "opus-4.6", effort: 85 }),
    ML("P56", 12, "CTRL-PROBE", "ProbeMacroLibraryEngine — Renishaw OMP + Blum + Marposs + cycle codes per controller + pocket/web/bore/bottom", "", { path: "mcp-server/src/engines/ProbeMacroLibraryEngine.ts", lines: 400 }),
    ML("P56", 13, "CTRL-COMP", "ToolComp3DLengthRadiusEngine — G43/G43.4/G43.5 + G41/G42 + wear-offsets + 5-axis radius-comp per controller", "", { path: "mcp-server/src/engines/ToolComp3DLengthRadiusEngine.ts", lines: 360 }),
    ML("P56", 14, "P56-TESTS", "1581 controller feature cells mapped; cross-controller translation passes 100 benchmark programs", "", { role: "R4", model: "sonnet-4.6", effort: 95 }),
  ],
  gate: gate(["All 17 controllers × 93 features mapped", "Cross-controller translation round-trip ≥95%", "5-axis tilted-plane unified abstraction works on 6 controllers", "Probe macro library verified on 4 vendor probes"], { ralph_required: true, ralph_grade_floor: "A" }),
});

// P57 — Holders + Kinematics (12u) — 30 taper families × 28 machine architectures × 13 features
phases.push({
  id: "P57",
  title: "Tool Holders + Machine Kinematics Exhaustive — 30 tapers × 28 architectures × 13 features",
  sessions: "10-12",
  primary_role: "R1",
  primary_model: "opus-4.6",
  description: "L8-A6 WARN: holder/kinematic coverage sparse. Add CAT/BT/HSK/KM/Capto/PSC/NT/JT + shrink-fit/hydraulic/power-milling/collet/Weldon/SK/ER + spindle taper tolerance + balance grade. Architectures: 3-axis VMC/HMC + 4-axis trunnion + 5-axis table-table/head-head/table-head + pallet changer + gantry + bridge + column + C-frame + double-column + horizontal 5-axis + swiss-type mill.",
  units: [
    ML("P57", 1, "HOLDER-CAT", "CATBTISO40SKHolderEngine — CAT30/40/50 + BT30/40/50 + ISO40/50 + DIN 69871 + retention-knob specs + pull-stud", "", { path: "mcp-server/src/engines/CATBTISO40SKHolderEngine.ts", lines: 400 }),
    ML("P57", 2, "HOLDER-HSK", "HSKHolderExhaustiveEngine — HSK-A/B/C/D/E/F 32/40/50/63/80/100/125 + face-taper dual contact + ISO 12164", "", { path: "mcp-server/src/engines/HSKHolderExhaustiveEngine.ts", lines: 380, role: "R1", model: "opus-4.6", effort: 75 }),
    ML("P57", 3, "HOLDER-CAPTO", "CoromantCaptoPSCHolderEngine — Capto C3/C4/C5/C6/C8/C10 + PSC polygonal + quick-change + ISO 26623", "", { path: "mcp-server/src/engines/CoromantCaptoPSCHolderEngine.ts", lines: 360 }),
    ML("P57", 4, "HOLDER-KM", "KMKennametalHolderEngine — KM25/32/40/50/63/80 + locking balls + cam mechanism + ISO 26622", "", { path: "mcp-server/src/engines/KMKennametalHolderEngine.ts", lines: 320 }),
    ML("P57", 5, "HOLDER-SHRINK", "ShrinkFitHydraulicPowerChuckEngine — shrink-fit temp/runout/balance + hydraulic + power-milling Weldon/SK", "", { path: "mcp-server/src/engines/ShrinkFitHydraulicPowerChuckEngine.ts", lines: 360 }),
    ML("P57", 6, "HOLDER-BAL", "ToolHolderBalanceEngine — ISO 21940-11 G-grade + spindle speed vs U*mm residual imbalance + vibration impact", "", { path: "mcp-server/src/engines/ToolHolderBalanceEngine.ts", lines: 340, role: "R1", model: "opus-4.6", effort: 75 }),
    ML("P57", 7, "KIN-3AX", "Kinematic3AxisVMCHMCEngine — VMC vertical + HMC horizontal + stroke X/Y/Z + rapid + accel + jerk + WCS", "", { path: "mcp-server/src/engines/Kinematic3AxisVMCHMCEngine.ts", lines: 360 }),
    ML("P57", 8, "KIN-5AX", "Kinematic5AxisExhaustiveEngine — head-head (Hermle/Makino) / table-table (DMU/Mazak) / table-head (Hurco) + A/B/C ranges + TCP", "", { path: "mcp-server/src/engines/Kinematic5AxisExhaustiveEngine.ts", lines: 480, role: "R1", model: "opus-4.6", effort: 90 }),
    ML("P57", 9, "KIN-PALLET", "PalletChangerAPCEngine — 2-pallet/4-pallet/linear-pallet-pool + FMS + AGV + setup-offline economics", "", { path: "mcp-server/src/engines/PalletChangerAPCEngine.ts", lines: 360 }),
    ML("P57", 10, "KIN-GANTRY", "GantryBridgeDoubleColumnEngine — 2×4/3m stroke + moving-gantry/moving-bridge + large-part machining", "", { path: "mcp-server/src/engines/GantryBridgeDoubleColumnEngine.ts", lines: 340 }),
    ML("P57", 11, "KIN-SWISS-MILL", "SwissStyleMillingEngine — guide-bushing + sliding-headstock + Citizen/Tsugami/Star mill sub-spindle", "", { path: "mcp-server/src/engines/SwissStyleMillingEngine.ts", lines: 320 }),
    ML("P57", 12, "P57-TESTS", "30 tapers + 28 architectures + 13 features fully characterized; kinematic chain validates forward+inverse", "", { role: "R4", model: "sonnet-4.6", effort: 90 }),
  ],
  gate: gate(["All 30 taper families specified", "28 machine architectures with kinematic chains", "5-axis TCP validated vs Hermle+DMU+Mazak posts", "Balance grade G2.5 verified per ISO 21940"], { ralph_required: true, ralph_grade_floor: "A" }),
});

// P58 — Coolant Exhaustive (12u) — 76 items, 0/8 chemistries, 0/22 delivery, cryo LN2/LCO2
phases.push({
  id: "P58",
  title: "Coolant Exhaustive — 8 chemistries × 22 delivery modes × cryogenic (LN2/LCO2/MQL)",
  sessions: "10-12",
  primary_role: "R1",
  primary_model: "opus-4.6",
  description: "L8-A7 BLOCK: coolant is the single biggest gap. Chemistries: straight oil + soluble (emulsion 5-15%) + semi-synthetic + synthetic + EP + vegetable-based biostable + HPC high-pressure + air-blast + MQL. Delivery: flood/mist/MQL/HPC/through-tool/ring-nozzle/cryogenic LN2/LCO2/jet-break/upstream/downstream/peck-flush.",
  units: [
    ML("P58", 1, "COOL-CHEM", "CoolantChemistryCatalogEngine — 8 chemistries + Castrol/Blaser/Master/Hocut/Houghton/Quaker/Fuchs + pH/refractometer/biocide", "", { path: "mcp-server/src/engines/CoolantChemistryCatalogEngine.ts", lines: 440, role: "R1", model: "opus-4.6", effort: 85 }),
    ML("P58", 2, "COOL-HPC", "HighPressureCoolantEngine — 1000-3000 psi + chip-break + heat-removal + nozzle orifice + pump spec + ROI", "", { path: "mcp-server/src/engines/HighPressureCoolantEngine.ts", lines: 420 }),
    ML("P58", 3, "COOL-MQL", "MQLMinimumQuantityEngine — 5-50 mL/hr + external/internal/co-axial + ester/synthetic + aerosol + drywall", "", { path: "mcp-server/src/engines/MQLMinimumQuantityEngine.ts", lines: 380, role: "R1", model: "opus-4.6", effort: 75 }),
    ML("P58", 4, "COOL-CRYO-LN2", "CryogenicLN2CoolantEngine — liquid nitrogen -196°C + superalloy cooling + delivery 30-100 bar + tool-life multiplier", "", { path: "mcp-server/src/engines/CryogenicLN2CoolantEngine.ts", lines: 440, role: "R1", model: "opus-4.6", effort: 90 }),
    ML("P58", 5, "COOL-CRYO-LCO2", "CryogenicLCO2CoolantEngine — liquid CO2 -78°C + MAG Industrial/5ME + titanium + through-spindle delivery", "", { path: "mcp-server/src/engines/CryogenicLCO2CoolantEngine.ts", lines: 400, role: "R1", model: "opus-4.6", effort: 85 }),
    ML("P58", 6, "COOL-THRU", "ThroughToolCoolantEngine — 1.5-2000 psi through-spindle/through-tool + orifice sizing + deep-hole drilling", "", { path: "mcp-server/src/engines/ThroughToolCoolantEngine.ts", lines: 380 }),
    ML("P58", 7, "COOL-NOZZLE", "CoolantNozzlePositioningEngine — LOCO-LINE + coanda + angle/distance/count + CFD-validated jet targeting", "", { path: "mcp-server/src/engines/CoolantNozzlePositioningEngine.ts", lines: 360 }),
    ML("P58", 8, "COOL-FILT", "CoolantFiltrationEngine — bag/paper/disc/hydrocyclone/magnetic + 10/25/50μm + particle-count + skimmer", "", { path: "mcp-server/src/engines/CoolantFiltrationEngine.ts", lines: 340 }),
    ML("P58", 9, "COOL-MGMT", "CoolantManagementEngine — refractometer + biocide + pH + tramp-oil + skimmer + top-off + concentrate ratio", "", { path: "mcp-server/src/engines/CoolantManagementEngine.ts", lines: 380 }),
    ML("P58", 10, "COOL-OSHA", "CoolantOSHAExposureEngine — PEL mist 5mg/m³ + biocide alerts + dermatitis + respirator recommendations", "", { path: "mcp-server/src/engines/CoolantOSHAExposureEngine.ts", lines: 320 }),
    ML("P58", 11, "COOL-HTC", "CoolantHeatTransferCoefficientEngine — h-coefficient per chemistry/velocity/nozzle + temp field coupling", "", { path: "mcp-server/src/engines/CoolantHeatTransferCoefficientEngine.ts", lines: 380, role: "R1", model: "opus-4.6", effort: 80 }),
    ML("P58", 12, "P58-TESTS", "76 coolant items implemented; HTC validated vs published data ±20%; cryo gains verified (Ti +40-200%)", "", { role: "R4", model: "sonnet-4.6", effort: 85 }),
  ],
  gate: gate(["8 chemistries + 22 delivery modes covered", "Cryo LN2/LCO2 validated", "HTC matches published data ±20%", "OSHA PEL compliance built-in"], { ralph_required: true, ralph_grade_floor: "A+" }),
});

// P59 — Inspection Exhaustive (14u) — 80 features + SPC CUSUM/EWMA/NP/U + 4 MSA studies
phases.push({
  id: "P59",
  title: "Inspection Exhaustive — 80 features + 4 SPC chart families + MSA (Type 1/2/3 + GRR)",
  sessions: "12-14",
  primary_role: "R1",
  primary_model: "opus-4.6",
  description: "L8-A8 WARN: inspection is thin. Add laser tool wear, structured-light 3D, CT, 4 SPC chart families (CUSUM/EWMA/NP/U), 4 MSA studies (Type 1 Gage R&R, Type 2 ANOVA GRR, Type 3 Linearity+Bias, Attribute Kappa). Non-contact (Keyence/Zeiss ATOS/Laser GOCATOR). GD&T + PPAP AIAG + FAIR AS9102 + MBD STEP AP242.",
  units: [
    ML("P59", 1, "INS-LASER", "LaserToolWearInspectionEngine — Blum Laser Control + Renishaw NC4 + sub-5μm tool wear in-process", "", { path: "mcp-server/src/engines/LaserToolWearInspectionEngine.ts", lines: 360 }),
    ML("P59", 2, "INS-STRUCT", "StructuredLight3DScanEngine — Zeiss ATOS/GOM + Keyence VR + 5-20μm per-part + cloud registration", "", { path: "mcp-server/src/engines/StructuredLight3DScanEngine.ts", lines: 400, role: "R1", model: "opus-4.6", effort: 75 }),
    ML("P59", 3, "INS-CT", "IndustrialCTScanEngine — Zeiss METROTOM / GE phoenix / Nikon XT H + internal voids + porosity + metrology", "", { path: "mcp-server/src/engines/IndustrialCTScanEngine.ts", lines: 400, role: "R1", model: "opus-4.6", effort: 80 }),
    ML("P59", 4, "INS-OMP", "OMPOnMachineProbeEngine — Renishaw OMP600/OSP60 + Blum BG + Marposs TT + wireless-IR-RF + fast datuming", "", { path: "mcp-server/src/engines/OMPOnMachineProbeEngine.ts", lines: 360 }),
    ML("P59", 5, "INS-SPC-CUSUM", "SPCCUSUMChartEngine — cumulative sum + V-mask + small shift detection + tabular CUSUM", "", { path: "mcp-server/src/engines/SPCCUSUMChartEngine.ts", lines: 320 }),
    ML("P59", 6, "INS-SPC-EWMA", "SPCEWMAChartEngine — exp-weighted moving avg + lambda tuning + small-shift early detection", "", { path: "mcp-server/src/engines/SPCEWMAChartEngine.ts", lines: 320 }),
    ML("P59", 7, "INS-SPC-NP", "SPCNPChartEngine — fraction-nonconforming attribute + binomial + control limits 3σ + out-of-control rules", "", { path: "mcp-server/src/engines/SPCNPChartEngine.ts", lines: 280 }),
    ML("P59", 8, "INS-SPC-U", "SPCUChartEngine — defects per unit + Poisson + variable sample size + run rules Nelson/Western-Electric", "", { path: "mcp-server/src/engines/SPCUChartEngine.ts", lines: 300 }),
    ML("P59", 9, "INS-MSA-T1", "MSAType1GageStudyEngine — Cg/Cgk ≥1.33 + 25+ repeats + reference ± tolerance/20", "", { path: "mcp-server/src/engines/MSAType1GageStudyEngine.ts", lines: 320 }),
    ML("P59", 10, "INS-MSA-T2", "MSAType2ANOVAGRREngine — 10 parts × 3 operators × 3 trials + %GRR ≤10%/30% thresholds + ndc ≥5", "", { path: "mcp-server/src/engines/MSAType2ANOVAGRREngine.ts", lines: 380, role: "R1", model: "opus-4.6", effort: 80 }),
    ML("P59", 11, "INS-MSA-T3", "MSAType3LinearityBiasEngine — 5 standards × tolerance range + bias per ref + linearity regression", "", { path: "mcp-server/src/engines/MSAType3LinearityBiasEngine.ts", lines: 340 }),
    ML("P59", 12, "INS-GDT-FULL", "GDTExhaustiveToleranceEngine — ASME Y14.5-2018 + ISO 1101 + 14 symbols + MMC/LMC/RFS + datum-reference-frames", "", { path: "mcp-server/src/engines/GDTExhaustiveToleranceEngine.ts", lines: 440, role: "R1", model: "opus-4.6", effort: 85 }),
    ML("P59", 13, "INS-MBD", "MBDSTEPAP242Engine — STEP AP242 + PMI + semantic annotations + 3D-PDF + model-based instructions", "", { path: "mcp-server/src/engines/MBDSTEPAP242Engine.ts", lines: 380 }),
    ML("P59", 14, "P59-TESTS", "80 inspection features; 4 SPC families validated vs Minitab; GRR matches AIAG MSA-4 reference", "", { role: "R4", model: "sonnet-4.6", effort: 90 }),
  ],
  gate: gate(["80 inspection features implemented", "4 SPC chart families match Minitab ±1%", "MSA Type 1/2/3 + attribute Kappa match AIAG MSA-4", "GD&T 14 symbols + MBD AP242 validated"], { ralph_required: true, ralph_grade_floor: "A" }),
});

// P60 — Enterprise Integration (16u) — 106 systems, 2.8% covered
phases.push({
  id: "P60",
  title: "Enterprise Integration Exhaustive — 106 ERP/MES/PLM/CMMS/WMS/APS/BI/SSO systems",
  sessions: "14-16",
  primary_role: "R1",
  primary_model: "opus-4.6",
  description: "L8-A9 BLOCK: enterprise integration is at 2.8%. Add SAP S/4HANA + Oracle EBS/Cloud + Microsoft Dynamics 365 + Infor CloudSuite + Epicor Kinetic + IFS + Plex + IQMS + NetSuite + JobBOSS + ProShop + E2 + Global Shop + MES (Siemens Opcenter + Rockwell FTPM + Aveva + Wonderware + Ignition) + PLM (Teamcenter + Windchill + ENOVIA + PLM 360 + Aras) + CMMS (Fiix + UpKeep + eMaint + IBM Maximo) + WMS + APS + BI (PowerBI + Tableau + Qlik) + SSO (Okta + Azure AD + Auth0 + Ping).",
  units: [
    ML("P60", 1, "ERP-SAP", "SAPIntegrationEngine — S/4HANA + OData + BAPI + RFC + PP/QM/MM modules + work-order + material-master", "", { path: "mcp-server/src/engines/SAPIntegrationEngine.ts", lines: 480, role: "R1", model: "opus-4.6", effort: 90 }),
    ML("P60", 2, "ERP-ORACLE", "OracleEBSCloudEngine — EBS + Fusion Cloud + REST + Discrete/Process Manufacturing + BOM+routing sync", "", { path: "mcp-server/src/engines/OracleEBSCloudEngine.ts", lines: 420, role: "R1", model: "opus-4.6", effort: 85 }),
    ML("P60", 3, "ERP-MSD365", "MicrosoftDynamics365Engine — F&O + BC + Power Platform + Dataverse + production-order sync", "", { path: "mcp-server/src/engines/MicrosoftDynamics365Engine.ts", lines: 400 }),
    ML("P60", 4, "ERP-INFOR", "InforCloudSuiteEngine — CloudSuite Industrial + LN + M3 + SyteLine + shop-floor events", "", { path: "mcp-server/src/engines/InforCloudSuiteEngine.ts", lines: 360 }),
    ML("P60", 5, "ERP-EPICOR", "EpicorKineticProphetEngine — Kinetic + Prophet 21 + job tracking + Advanced MES", "", { path: "mcp-server/src/engines/EpicorKineticProphetEngine.ts", lines: 340 }),
    ML("P60", 6, "ERP-SMB", "SMBShopERPBridgeEngine — JobBOSS + ProShop + E2 + Global Shop + ShopTech + Realtrac + Statii", "", { path: "mcp-server/src/engines/SMBShopERPBridgeEngine.ts", lines: 380 }),
    ML("P60", 7, "MES-OPCENTER", "SiemensOpcenterRockwellMESEngine — Opcenter Execution Discrete + FTPM + Aveva + Wonderware + Ignition", "", { path: "mcp-server/src/engines/SiemensOpcenterRockwellMESEngine.ts", lines: 440, role: "R1", model: "opus-4.6", effort: 85 }),
    ML("P60", 8, "PLM-TEAM-WC", "TeamcenterWindchillEngine — Teamcenter 14 + Windchill PDMLink + AWC + change-management + BOM sync", "", { path: "mcp-server/src/engines/TeamcenterWindchillEngine.ts", lines: 440, role: "R1", model: "opus-4.6", effort: 85 }),
    ML("P60", 9, "PLM-ENO-ARAS", "ENOVIAAras360PLMEngine — 3DEXPERIENCE ENOVIA + Aras Innovator + PLM 360 + lifecycle workflows", "", { path: "mcp-server/src/engines/ENOVIAAras360PLMEngine.ts", lines: 360 }),
    ML("P60", 10, "CMMS-MAX", "MaximoFiixUpKeepCMMSEngine — IBM Maximo + Fiix + UpKeep + eMaint + work-order + PM scheduling + spare-parts", "", { path: "mcp-server/src/engines/MaximoFiixUpKeepCMMSEngine.ts", lines: 380 }),
    ML("P60", 11, "WMS-APS", "WMSAPSSchedulingEngine — Manhattan + Blue Yonder + Kinaxis + Preactor APS + scheduling optimization", "", { path: "mcp-server/src/engines/WMSAPSSchedulingEngine.ts", lines: 400 }),
    ML("P60", 12, "BI-TABLEAU", "PowerBITableauQlikEngine — Power BI + Tableau + Qlik Sense + dashboard templates + DAX + semantic layer", "", { path: "mcp-server/src/engines/PowerBITableauQlikEngine.ts", lines: 380 }),
    ML("P60", 13, "SSO-OKTA", "OktaAzureADAuth0SSOEngine — OAuth2 + OIDC + SAML 2.0 + Okta/Azure AD/Auth0/Ping + RBAC sync", "", { path: "mcp-server/src/engines/OktaAzureADAuth0SSOEngine.ts", lines: 360 }),
    ML("P60", 14, "DMS-VAULT", "DocumentManagementVaultEngine — SharePoint + M-Files + Vault Professional + drawing+rev + sign-off", "", { path: "mcp-server/src/engines/DocumentManagementVaultEngine.ts", lines: 340 }),
    ML("P60", 15, "EVENT-ESB", "EnterpriseServiceBusEngine — Kafka + RabbitMQ + MuleSoft + TIBCO + BizTalk + event routing + DLQ", "", { path: "mcp-server/src/engines/EnterpriseServiceBusEngine.ts", lines: 400, role: "R1", model: "opus-4.6", effort: 80 }),
    ML("P60", 16, "P60-TESTS", "106 enterprise systems bridgeable; 16 critical ERPs sync BOM+routing+WO; MES events <1s latency", "", { role: "R4", model: "sonnet-4.6", effort: 95 }),
  ],
  gate: gate(["16 ERP/MES/PLM/CMMS bridges operational", "106 systems indexed with connector stubs", "SSO via Okta/Azure AD/Auth0 validated", "Kafka/RabbitMQ ESB event routing <1s p99"], { ralph_required: true, ralph_grade_floor: "A+" }),
});

// P61 — Deburr/Secondary + UI Exhaustive (14u) — 97 items, 15.5% covered
phases.push({
  id: "P61",
  title: "Deburr/Secondary + UI Exhaustive — 97 items (14 special milling + 22 UI + 6 assembly finish)",
  sessions: "12-14",
  primary_role: "R1",
  primary_model: "opus-4.6",
  description: "L8-A10 BLOCK: deburr/UI coverage is 15.5%. Add: robotic deburr (FerRobotics ACF + ATI CGI), thermal deburr (TEM), electro-chemical (ECM deburr), cryo-deburr, abrasive-flow (AFM), vibratory tumble, bead-blast, vapor-hone, laser-deburr, high-speed brushing. UI: drag-drop CAD, live 3D toolpath, setup sheet editor, tool-sheet printer, fixture-layout editor, post-editor, proof-run simulator, probe-macro wizard, chatter-map viewer, spindle-warmup timer, coolant dashboard, variability heatmap, cost-rollup, operator PDF.",
  units: [
    ML("P61", 1, "DEB-ROBOT", "RoboticDeburrEngine — FerRobotics ACF + ATI CGI/ACF + force-compliance + Kuka/ABB/Fanuc arm + CAM path", "", { path: "mcp-server/src/engines/RoboticDeburrEngine.ts", lines: 440, role: "R1", model: "opus-4.6", effort: 85 }),
    ML("P61", 2, "DEB-TEM", "ThermalEnergyDeburrEngine — TEM (thermal energy method) + hydrogen/oxygen + pressure + cycle-time + mass-loss", "", { path: "mcp-server/src/engines/ThermalEnergyDeburrEngine.ts", lines: 340 }),
    ML("P61", 3, "DEB-ECM", "ECMElectroChemicalDeburrEngine — NaNO₃ electrolyte + voltage/current + masking + cavity ECM + precision", "", { path: "mcp-server/src/engines/ECMElectroChemicalDeburrEngine.ts", lines: 360, role: "R1", model: "opus-4.6", effort: 75 }),
    ML("P61", 4, "DEB-AFM", "AbrasiveFlowMachiningEngine — Extrude Hone + media viscosity + pressure + passage targeting + Ra delta", "", { path: "mcp-server/src/engines/AbrasiveFlowMachiningEngine.ts", lines: 340 }),
    ML("P61", 5, "DEB-CRYO", "CryoDeburrVibroEngine — LN2 embrittle + vibratory tumble + Stressonic + Rösler + media selection", "", { path: "mcp-server/src/engines/CryoDeburrVibroEngine.ts", lines: 320 }),
    ML("P61", 6, "FINISH-ASSY", "AssemblyFinishOrchestratorEngine — bead-blast + vapor-hone + laser-texture + chemical-passivation + Ra/Sa targets", "", { path: "mcp-server/src/engines/AssemblyFinishOrchestratorEngine.ts", lines: 380 }),
    ML("P61", 7, "UI-DRAG-CAD", "UIDragDropCADLoaderComponent — web/src/components/MillStudio/CADLoader.tsx + STEP/IGES/Parasolid preview", "", { path: "mcp-server/web/src/components/MillStudio/CADLoader.tsx", lines: 340 }),
    ML("P61", 8, "UI-LIVE-3D", "UILiveToolpathViewerComponent — web/src/components/MillStudio/ToolpathViewer.tsx + Three.js + OCCT + chatter overlay", "", { path: "mcp-server/web/src/components/MillStudio/ToolpathViewer.tsx", lines: 420, role: "R1", model: "opus-4.6", effort: 85 }),
    ML("P61", 9, "UI-SETUP-SHEET", "UISetupSheetEditorComponent — web/src/components/MillStudio/SetupSheet.tsx + WYSIWYG + auto-populate from pipeline", "", { path: "mcp-server/web/src/components/MillStudio/SetupSheet.tsx", lines: 360 }),
    ML("P61", 10, "UI-POST-EDIT", "UIPostProcessorEditorComponent — web/src/components/MillStudio/PostEditor.tsx + Monaco + 7 dialects + regex preview", "", { path: "mcp-server/web/src/components/MillStudio/PostEditor.tsx", lines: 380 }),
    ML("P61", 11, "UI-PROOF", "UIProofRunSimulatorComponent — web/src/components/MillStudio/ProofSimulator.tsx + block-step + collision highlight + dry-run G-code", "", { path: "mcp-server/web/src/components/MillStudio/ProofSimulator.tsx", lines: 400 }),
    ML("P61", 12, "UI-CHATTER-HM", "UIChatterHeatmapComponent — web/src/components/MillStudio/ChatterHeatmap.tsx + SLD render + spindle-speed recommend", "", { path: "mcp-server/web/src/components/MillStudio/ChatterHeatmap.tsx", lines: 340 }),
    ML("P61", 13, "UI-COST-ROLL", "UICostRollupComponent — web/src/components/MillStudio/CostRollup.tsx + qty breaks + DFM flags + margin", "", { path: "mcp-server/web/src/components/MillStudio/CostRollup.tsx", lines: 320 }),
    ML("P61", 14, "P61-TESTS", "97 deburr/UI items; 10 deburr methods dispatchable; 22 UI components render + interact; 6 assembly finishes routed", "", { role: "R4", model: "sonnet-4.6", effort: 90 }),
  ],
  gate: gate(["10 deburr/secondary methods operational", "22 UI components render + passing Playwright", "6 assembly-finish orchestrations route via dispatcher", "Robotic deburr force-compliant path verified"], { ralph_required: true, ralph_grade_floor: "A" }),
});

// ── Loop 9 v11.0.0 phases (P62-P71) — chip physics, pattern gen, post matrix, fixture FEM, realtime, cyber, business+, AFR, workforce, sustainability ──

// P62 — Chip Physics Depth (7u) — L9-A1 WARN
phases.push({
  id: "P62",
  title: "Chip Physics Depth — Merchant/Oxley/Nakayama/Trent first-principles + jet-evac + Class-D fire",
  sessions: "6-8",
  primary_role: "R1",
  primary_model: "opus-4.6",
  description: "L9-A1 WARN: ML chip predictors (P33) and breaker geometry (P53) exist without first-principles physics. Add shear-angle (Merchant/Lee-Shaffer/Oxley), curl/break mechanics (Nakayama + JC fracture), BUE predictor (Trent stagnation, v_BUE), flute-packing jamming index, coolant jet-evac momentum (Re_j), chip disposal system (conveyor/briquetter), reactive-chip Class-D fire safety.",
  units: [
    ML("P62", 1, "CHIP-SHEAR", "MillChipShearAngleEngine — Merchant φ=45−(β−α)/2 + Lee-Shaffer + Oxley parallel-sided shear-zone (JC flow stress) + ISO3685 8-class output", "", { path: "mcp-server/src/engines/MillChipShearAngleEngine.ts", lines: 420, role: "R1", model: "opus-4.6", effort: 85 }),
    ML("P62", 2, "CHIP-CURL", "MillChipCurlBreakMechanicsEngine — Nakayama up/side-curl radius + Kluft break-angle + JC fracture strain; couples P53-U11 breaker geom → P13 physics", "", { path: "mcp-server/src/engines/MillChipCurlBreakMechanicsEngine.ts", lines: 380, role: "R1", model: "opus-4.6", effort: 75 }),
    ML("P62", 3, "CHIP-BUE", "MillBUEFormationEngine — Trent stagnation model + v_BUE threshold per material pair (steel/Al) + thermal-softening coupling + feeds SpeedFeedOrchestrator min-speed", "", { path: "mcp-server/src/engines/MillBUEFormationEngine.ts", lines: 360 }),
    ML("P62", 4, "FLUTE-PACK", "MillFlutePackingIndexEngine — packing ratio (fz·ae·ap·Z)/V_flute + slot re-cut probability + trochoidal-vs-full-slot jamming threshold", "", { path: "mcp-server/src/engines/MillFlutePackingIndexEngine.ts", lines: 320 }),
    ML("P62", 5, "JET-EVAC", "CoolantJetChipEvacuationEngine — nozzle Reynolds Re_j=ρVd/μ + jet exit velocity + stagnation-to-chip momentum + through-tool/flood/air-blast verdict per op", "", { path: "mcp-server/src/engines/CoolantJetChipEvacuationEngine.ts", lines: 340, role: "R1", model: "opus-4.6", effort: 75 }),
    ML("P62", 6, "CHIP-DISP", "ChipDisposalSystemEngine — conveyor-type selection (drag/magnetic/screw/hinge-belt) by chip morphology + briquetter sizing + oil separator + scrap-revenue stream", "", { path: "mcp-server/src/engines/ChipDisposalSystemEngine.ts", lines: 360 }),
    ML("P62", 7, "CHIP-FIRE", "ReactiveChipFireSafetyEngine — Class-D agent selector (Met-L-X/Lith-X/dry graphite) + Ti/Mg fine ignition-energy gate + water+Mg = H₂ coolant reactivity check + PPE", "", { path: "mcp-server/src/engines/ReactiveChipFireSafetyEngine.ts", lines: 320, role: "R1", model: "opus-4.6", effort: 75 }),
  ],
  gate: gate(["Merchant/Oxley φ match literature ±5% on 10 reference cuts", "BUE v_BUE matches Trent data for steel/Al ±10%", "Flute-packing predicts 20 jamming cases 100%", "Re_j jet-evac verdicts 90% operator-agreement", "Class-D fire-safety ruleset passes NFPA 484 audit"], { ralph_required: true, ralph_grade_floor: "A" }),
});

// P63 — Toolpath Pattern Generators (11u) — L9-A2 WARN
phases.push({
  id: "P63",
  title: "Toolpath Pattern Generators — 2D/3D pocket + surface finish + 5-axis SWARF + morph + engagement-aware",
  sessions: "10-12",
  primary_role: "R1",
  primary_model: "opus-4.6",
  description: "L9-A2 WARN: envelope has physics + ML but no geometric pattern-generator engine layer. Add zig-zag/spiral/parallel/trochoidal + 3D constant-Z/cusp/scallop + raster/projection/flowline + 5-axis SWARF/flank/blisk + morph Coons + pencil/bitangent rest-finish + entry macros + drilling cycle dialect + engagement-aware CEA Voronoi.",
  units: [
    ML("P63", 1, "POCKET-2D", "MillPocketPatternGeneratorEngine — zig-zag + one-way + spiral-in + spiral-out + parallel-off-boundary + true-spiral + morph-spiral + islands", "", { path: "mcp-server/src/engines/MillPocketPatternGeneratorEngine.ts", lines: 460, role: "R1", model: "opus-4.6", effort: 85 }),
    ML("P63", 2, "AREA-3D", "Mill3DAreaClearingEngine — constant-Z + constant-cusp + waterline + steep-and-shallow + radial + morph + pre-finish + rest-roughing 9 modes", "", { path: "mcp-server/src/engines/Mill3DAreaClearingEngine.ts", lines: 480, role: "R1", model: "opus-4.6", effort: 90 }),
    ML("P63", 3, "SURF-FIN", "MillSurfaceFinishPatternEngine — raster + projection + flowline + between-2-curves + between-2-rails + radial + spiral + along/across surface", "", { path: "mcp-server/src/engines/MillSurfaceFinishPatternEngine.ts", lines: 440, role: "R1", model: "opus-4.6", effort: 85 }),
    ML("P63", 4, "SWARF-FLANK", "Mill5AxisSwarfFlankEngine — ruled-surface side-milling + circle-segment tool dialects + flank-milling + tilt-vector control", "", { path: "mcp-server/src/engines/Mill5AxisSwarfFlankEngine.ts", lines: 420, role: "R1", model: "opus-4.6", effort: 85 }),
    ML("P63", 5, "BLISK-IMP", "BliskImpellerMultiBladePatternEngine — blade-to-blade 5-axis + splitter + leading/trailing edge + hub blending", "", { path: "mcp-server/src/engines/BliskImpellerMultiBladePatternEngine.ts", lines: 440, role: "R1", model: "opus-4.6", effort: 85 }),
    ML("P63", 6, "MORPH-FLOW", "MillMorphFlowlineEngine — Coons patch + between-2-curves + between-2-rails + flow-along-surface + morph between islands", "", { path: "mcp-server/src/engines/MillMorphFlowlineEngine.ts", lines: 380 }),
    ML("P63", 7, "PENCIL-BIT", "MillPencilBitangentRestFinishEngine — pencil-tracing + bitangent-fillet + corner-rounding + rest-finish from 3D stock-model", "", { path: "mcp-server/src/engines/MillPencilBitangentRestFinishEngine.ts", lines: 400 }),
    ML("P63", 8, "ENTRY", "MillEntryMacroEngine — helical-plunge + pre-drill + ramp + zig-ramp + dogbone-corners + slope-entry angle", "", { path: "mcp-server/src/engines/MillEntryMacroEngine.ts", lines: 340 }),
    ML("P63", 9, "DRILL-CYCLE", "MillDrillingCycleDialectEngine — G81/82/83/84/85/86/89 + G73 chip-break + feed-reverse-tap + deep-hole spiral + controller dialect matrix", "", { path: "mcp-server/src/engines/MillDrillingCycleDialectEngine.ts", lines: 380 }),
    ML("P63", 10, "ENGAGE-AWARE", "MillEngagementAwareToolpathEngine — Voronoi-based cutter-engagement-angle (CEA) solver + constant-engagement path + jerk/accel-limited", "", { path: "mcp-server/src/engines/MillEngagementAwareToolpathEngine.ts", lines: 420, role: "R1", model: "opus-4.6", effort: 85 }),
    ML("P63", 11, "P63-TESTS", "11 pattern engines produce valid G-code across 3 controllers; round-trip vs Mastercam+Hypermill on 20 reference parts", "", { role: "R4", model: "sonnet-4.6", effort: 90 }),
  ],
  gate: gate(["11 pattern generators produce valid G-code", "CEA solver within ±5% of Volumill reference", "5-axis SWARF matches Hypermill on 10 blades", "Rest-finish pencil/bitangent catches 95% seeded corner-defects"], { ralph_required: true, ralph_grade_floor: "A" }),
});

// P64 — Post-Processor Matrix (20u) — L9-A3 FAIL (most critical after cyber)
phases.push({
  id: "P64",
  title: "Post-Processor Matrix — 17 controllers × 8 CAM = 136 post-pairs + 5-axis kinematic post + vendor libraries",
  sessions: "16-20",
  primary_role: "R1",
  primary_model: "opus-4.6",
  description: "L9-A3 FAIL: current coverage ~15%. Add vendor post libraries (MPMaster/Fusion .cps/Hypermill .h3d/PowerMill .pmopt/NX .tcl/SolidCAM .vmid/ICAM CAMPOST), controller syntax variants (Fanuc macro-A/B, Klartext vs ISO, ShopMill vs ShopTurn, Mazatrol SmoothX conv vs EIA-ISO), 5-axis kinematic post (RTCP + linearization + C-winding + singularity), special posts (mill-turn/swiss/multi-channel/rotary-broach/gun-drill), debug (VeriCut/MPDBG/NCSimul), utilities (G54.1 P1-48, tool-length comp model, pallet offset).",
  units: [
    ML("P64", 1, "POST-MP", "IntelligentMastercamPostEngine — MPMaster/MPFAN/MPGENERIC .pst AST parser + block builder + variable-substitution", "", { path: "mcp-server/src/engines/IntelligentMastercamPostEngine.ts", lines: 480, role: "R1", model: "opus-4.6", effort: 90 }),
    ML("P64", 2, "POST-CPS", "FusionCPSPostEngine — .cps JavaScript AST executor + Autodesk Fusion Machining Extension + Inventor HSM post + section-headers", "", { path: "mcp-server/src/engines/FusionCPSPostEngine.ts", lines: 440, role: "R1", model: "opus-4.6", effort: 85 }),
    ML("P64", 3, "POST-HYP", "HyperMillPostVariantEngine — .h3d post variants + Open Mind NCTools + multi-kinematic support", "", { path: "mcp-server/src/engines/HyperMillPostVariantEngine.ts", lines: 380 }),
    ML("P64", 4, "POST-PMX", "PowerMillPostOptionEngine — .pmopt binary reader + Autodesk PowerMill Tcl + Duct format", "", { path: "mcp-server/src/engines/PowerMillPostOptionEngine.ts", lines: 360 }),
    ML("P64", 5, "POST-NX", "NXPostBuilderEngine — Siemens NX .tcl Post Builder + PB Post Pro + EMP event-script builder", "", { path: "mcp-server/src/engines/NXPostBuilderEngine.ts", lines: 400, role: "R1", model: "opus-4.6", effort: 80 }),
    ML("P64", 6, "POST-VMID", "SolidCAMVmidEngine — .vmid post-definition parser + GPP2 controller + iMachining-aware", "", { path: "mcp-server/src/engines/SolidCAMVmidEngine.ts", lines: 360 }),
    ML("P64", 7, "POST-ICAM", "ICAMCampostEngine — ICAM CAMPOST CL→G enterprise + virtual machine sim + multi-axis kinematic", "", { path: "mcp-server/src/engines/ICAMCampostEngine.ts", lines: 380 }),
    ML("P64", 8, "CTRL-FAN-AB", "FanucMacroAvsMacroBEngine — G65/G66 argument-letter differences + macro call conventions + variable-range", "", { path: "mcp-server/src/engines/FanucMacroAvsMacroBEngine.ts", lines: 320 }),
    ML("P64", 9, "CTRL-HEI-KT", "HeidenhainKlartextVsISOEngine — CYCL DEF vs G-code mode + FN Q-parameter + PLANE SPATIAL translator", "", { path: "mcp-server/src/engines/HeidenhainKlartextVsISOEngine.ts", lines: 360 }),
    ML("P64", 10, "CTRL-SIE-SM", "SiemensShopMillVsShopTurnEngine + stepcode translator + ShopMill cycle + conversational-to-G", "", { path: "mcp-server/src/engines/SiemensShopMillVsShopTurnEngine.ts", lines: 380 }),
    ML("P64", 11, "CTRL-OKU-IGF", "OkumaIGFvsOSPMOPEngine — Advanced-One-Touch IGF conversational vs OSP-P300M MOP+ + Mazatrol-style variables", "", { path: "mcp-server/src/engines/OkumaIGFvsOSPMOPEngine.ts", lines: 360 }),
    ML("P64", 12, "5AX-KIN", "KinematicChainDefinitionEngine — trunnion/head/table-table/hybrid + axis-stack definition + forward-inverse kin", "", { path: "mcp-server/src/engines/KinematicChainDefinitionEngine.ts", lines: 420, role: "R1", model: "opus-4.6", effort: 85 }),
    ML("P64", 13, "5AX-RTCP", "RTCPvsNonRTCPEngine — G43.4/TCPC vs pre-rotated output + kinematic-aware transform + controller capability gate", "", { path: "mcp-server/src/engines/RTCPvsNonRTCPEngine.ts", lines: 380 }),
    ML("P64", 14, "5AX-LIN", "RotaryLinearizationEngine — angular tolerance chord-tol + mini-block insertion + C-winding short/unwind/rewind + pole-passage handling", "", { path: "mcp-server/src/engines/RotaryLinearizationEngine.ts", lines: 400, role: "R1", model: "opus-4.6", effort: 80 }),
    ML("P64", 15, "SPEC-MT", "MillTurnPostEngine — Mastercam MP Mill-Turn + ESPRIT SolidMill-Turn + multi-turret + sub-spindle sync M-codes", "", { path: "mcp-server/src/engines/MillTurnPostEngine.ts", lines: 400 }),
    ML("P64", 16, "SPEC-SWISS", "SwissTypeMultiChannelPostEngine — guide-bushing + sub-spindle pickup + B-axis turning + 2/3-channel sync codes", "", { path: "mcp-server/src/engines/SwissTypeMultiChannelPostEngine.ts", lines: 420, role: "R1", model: "opus-4.6", effort: 80 }),
    ML("P64", 17, "DBG-VC", "VeriCutSyncEngine — back-plot format + tool-library sync + CGTech G-code verify + kinematic cross-check", "", { path: "mcp-server/src/engines/VeriCutSyncEngine.ts", lines: 360 }),
    ML("P64", 18, "DBG-NCSIM", "NCSimulIntegrationEngine — Spring NCSimul + Gibbs MPDBG + CIMCO NC-Base + sim-before-spindle gate", "", { path: "mcp-server/src/engines/NCSimulIntegrationEngine.ts", lines: 340 }),
    ML("P64", 19, "POST-PAIR-MATRIX", "PostPairMatrixRegistryEngine — 136 controller×CAM post-pair registry + per-pair round-trip test harness + capability matrix", "", { path: "mcp-server/src/engines/PostPairMatrixRegistryEngine.ts", lines: 500, role: "R1", model: "opus-4.6", effort: 95 }),
    ML("P64", 20, "P64-TESTS", "136 post-pair round-trips ≥95% clean; 5-axis linearization within chord-tol; VeriCut sync validated on 30 programs", "", { role: "R4", model: "sonnet-4.6", effort: 95 }),
  ],
  gate: gate(["136 post-pairs round-trip ≥95%", "5-axis RTCP+linearization match VeriCut on 30 programs", "Controller variant translation passes 50 benchmark programs", "Vendor post libraries (MP/CPS/H3D/PMX/NX/VMID) parse real customer posts"], { ralph_required: true, ralph_grade_floor: "A+" }),
});

// P65 — Fixture FEM Depth (8u) — L9-A4 INSUFFICIENT
phases.push({
  id: "P65",
  title: "Fixture FEM Depth — nonlinear stress + modal FRF + transient thermal + fatigue + buckling + topology + MP coupling",
  sessions: "8-10",
  primary_role: "R1",
  primary_model: "opus-4.6",
  description: "L9-A4 INSUFFICIENT: P52 is catalog (3/15 units are FEM). Wire existing FiniteElement/Hertz/Buckling/Fatigue/Creep/Topology/MonteCarlo primitives to fixture-specific depth: nonlinear contact + J2 plasticity, FRF chatter coupling, transient thermal droop, Miner's rule rainflow fatigue, Hertzian contact + Dahl/LuGre, column buckling, SIMP/ESO lattice, multi-physics uncertainty.",
  units: [
    ML("P65", 1, "FEM-STRESS", "FEMFixtureStressEngine — hex/tet convergence + Augmented Lagrangian contact + J2 plasticity for soft-jaw sculpting", "", { path: "mcp-server/src/engines/FEMFixtureStressEngine.ts", lines: 480, role: "R1", model: "opus-4.6", effort: 90 }),
    ML("P65", 2, "FEM-MODAL-EXT", "FEMFixtureModalExtendedEngine — FRF generation + mode shapes + direct wire to ChatterStabilityLobeEngine SLD", "", { path: "mcp-server/src/engines/FEMFixtureModalExtendedEngine.ts", lines: 420, role: "R1", model: "opus-4.6", effort: 85 }),
    ML("P65", 3, "FEM-THERMAL-T", "FEMFixtureThermalTransientEngine — RK4 coupled with ThermalWearCouplingEngine + tombstone differential α·ΔT droop + cooldown curve", "", { path: "mcp-server/src/engines/FEMFixtureThermalTransientEngine.ts", lines: 440, role: "R1", model: "opus-4.6", effort: 85 }),
    ML("P65", 4, "FATIGUE-LIFE", "FixtureFatigueLifeEngine — Miner's rule rainflow counting + S-N curve fixture clamps 10⁶+ cycles + existing FatigueLifeEngine wrapper", "", { path: "mcp-server/src/engines/FixtureFatigueLifeEngine.ts", lines: 380 }),
    ML("P65", 5, "CONTACT-MECH", "FixtureContactMechanicsEngine — wire HertzContactEngine + Dahl/LuGre friction hysteresis + pull-down force vs clearance", "", { path: "mcp-server/src/engines/FixtureContactMechanicsEngine.ts", lines: 380, role: "R1", model: "opus-4.6", effort: 80 }),
    ML("P65", 6, "BUCKLING", "FixtureBucklingEngine — wire ColumnBucklingEngine to clamp-finger + boring-bar cantilever + Euler/Johnson criterion", "", { path: "mcp-server/src/engines/FixtureBucklingEngine.ts", lines: 340 }),
    ML("P65", 7, "TOPOLOGY", "FixtureTopologyOptimizationEngine — SIMP/ESO wrapper on TopologyEngine + AM lattice-ready + ThreeDPrintedFixtureEngine wire", "", { path: "mcp-server/src/engines/FixtureTopologyOptimizationEngine.ts", lines: 400, role: "R1", model: "opus-4.6", effort: 85 }),
    ML("P65", 8, "MP-COUPLING", "FixtureMultiPhysicsCouplingEngine — cut-force→deflection→Ra→re-cut loop + Monte Carlo via UncertaintyPropagationPipelineEngine", "", { path: "mcp-server/src/engines/FixtureMultiPhysicsCouplingEngine.ts", lines: 420, role: "R1", model: "opus-4.6", effort: 90 }),
  ],
  gate: gate(["Nonlinear stress converges ±5% vs commercial FEA", "FRF feeds SLD chatter predictor end-to-end", "Transient thermal matches tombstone thermal-camera data ±10%", "Topology-optimized lattice passes 10⁶-cycle Miner's rule", "MP coupling propagates uncertainty through 3-stage chain"], { ralph_required: true, ralph_grade_floor: "A+" }),
});

// P66 — Realtime Control + Digital Twin (13u) — L9-A5 PARTIAL
phases.push({
  id: "P66",
  title: "Realtime Control + Digital Twin — deterministic fieldbus + servo loop + MPC + observer + vendor AFC + sim2real",
  sessions: "12-15",
  primary_role: "R1",
  primary_model: "opus-4.6",
  description: "L9-A5 PARTIAL 6/10: twin is world-class, control stack absent. Add EtherCAT/Sercos III/Profinet IRT with DC-sync + servo cascade identification + backlash/cogging comp + vendor AFC unified bridge + cutting-force MPC (OSQP) + Luenberger spindle thermal + MRAS feed + chip-load observer from spindle current + domain randomization + sim2real gap + controller HIL + OPC UA NC companion v1.01 + <1s fault SLA.",
  units: [
    ML("P66", 1, "FIELDBUS", "RealtimeFieldbusAdapterEngine — EtherCAT / Sercos III / Profinet IRT with DC-sync + jitter spec + WCET + deterministic packet handling", "", { path: "mcp-server/src/engines/RealtimeFieldbusAdapterEngine.ts", lines: 440, role: "R1", model: "opus-4.6", effort: 90 }),
    ML("P66", 2, "SERVO-ID", "ServoLoopIdentificationEngine — cascade position/velocity/current gains + step/chirp + Bode margin + stability-margin check", "", { path: "mcp-server/src/engines/ServoLoopIdentificationEngine.ts", lines: 400, role: "R1", model: "opus-4.6", effort: 80 }),
    ML("P66", 3, "BACKLASH", "BacklashCoggingCompensationEngine — lost-motion identification + cogging-torque map + per-axis feedforward", "", { path: "mcp-server/src/engines/BacklashCoggingCompensationEngine.ts", lines: 360 }),
    ML("P66", 4, "AFC-BRIDGE", "VendorAFCBridgeEngine — Okuma AFC + Mitsubishi ACC + Heidenhain AFC + Siemens ACO unified API + block-rate override pipe back to CAM post", "", { path: "mcp-server/src/engines/VendorAFCBridgeEngine.ts", lines: 420, role: "R1", model: "opus-4.6", effort: 85 }),
    ML("P66", 5, "MPC", "CuttingForceMPCEngine — receding-horizon QP (OSQP/qpOASES) + torque/jerk/chatter constraints + real-time solver budget", "", { path: "mcp-server/src/engines/CuttingForceMPCEngine.ts", lines: 480, role: "R1", model: "opus-4.6", effort: 95 }),
    ML("P66", 6, "OBS-THERMAL", "LuenbergerSpindleThermalObserverEngine — reduced-order thermal observer + state estimation + drift-compensation output", "", { path: "mcp-server/src/engines/LuenbergerSpindleThermalObserverEngine.ts", lines: 360 }),
    ML("P66", 7, "MRAS-FEED", "MRASFeedAdaptationEngine — model-reference adaptive feed + Lyapunov stability + reference-model tracking error", "", { path: "mcp-server/src/engines/MRASFeedAdaptationEngine.ts", lines: 380, role: "R1", model: "opus-4.6", effort: 80 }),
    ML("P66", 8, "OBS-CHIPLOAD", "ChipLoadObserverFromSpindleCurrentEngine — Kalman on current ripple → chip load + adaptive-feed trigger", "", { path: "mcp-server/src/engines/ChipLoadObserverFromSpindleCurrentEngine.ts", lines: 380 }),
    ML("P66", 9, "DR", "DomainRandomizationEngine — twin-param jitter + robust-policy training + JC-coefficient ± friction ± stiffness perturbation", "", { path: "mcp-server/src/engines/DomainRandomizationEngine.ts", lines: 360 }),
    ML("P66", 10, "SIM2REAL", "Sim2RealGapQuantifierEngine — KS/MMD distributions between twin+real + calibration retune trigger", "", { path: "mcp-server/src/engines/Sim2RealGapQuantifierEngine.ts", lines: 380, role: "R1", model: "opus-4.6", effort: 80 }),
    ML("P66", 11, "HIL-CTRL", "ControllerHILInterfaceEngine — Opal-RT / dSPACE / Speedgoat RT target bridge + servo-stack sim + controller firmware flash pre-verify", "", { path: "mcp-server/src/engines/ControllerHILInterfaceEngine.ts", lines: 420, role: "R1", model: "opus-4.6", effort: 85 }),
    ML("P66", 12, "OPCUA-NC", "OPCUANCCompanionSpecEngine — OPC UA Companion for CNC Systems v1.01 (distinct from UMATI) + information-model mapping + method invocation", "", { path: "mcp-server/src/engines/OPCUANCCompanionSpecEngine.ts", lines: 380 }),
    ML("P66", 13, "FAULT-SLA", "SubSecondFaultNotificationEngine — <1s SLA fault push + 5G/edge telemetry + SIEM forwarder + MQTT priority queue", "", { path: "mcp-server/src/engines/SubSecondFaultNotificationEngine.ts", lines: 340 }),
  ],
  gate: gate(["Fieldbus jitter <50μs on EtherCAT", "MPC solves within 5ms budget on OSQP", "Vendor AFC bridge covers 4 controllers", "Sim2real gap <15% KS divergence post-calibration", "HIL bridges Opal-RT + dSPACE verified"], { ralph_required: true, ralph_grade_floor: "A+" }),
});

// P67 — Cybersecurity Core (11u) — L9-A6 FAIL CRITICAL
phases.push({
  id: "P67",
  title: "Cybersecurity Core — NIST CSF + ISA/IEC 62443 + Purdue + SBOM + G-code signing + CVE + SOC + zero-trust",
  sessions: "12-15",
  primary_role: "R1",
  primary_model: "opus-4.6",
  description: "L9-A6 FAIL-CRITICAL: no cohesive security program. P7 is Electrode Milling not Security; P35 is Privacy. Add NIST CSF 2.0 mapper + Purdue L0-L5 segmentation + controller identity (Fanuc L3/4 + Heidenhain + Siemens 840D) + G-code CMS/CAdES signing + CycloneDX/SPDX SBOM + SLSA-3 + Sigstore + USB quarantine + ransomware 3-2-1-1-0 + CAD/CAM DRM AES-256-GCM + CVE watch (ICSA-CERT) + SOC playbook + SIEM/Splunk CEF + zero-trust SPIFFE/SPIRE + OPA policy-as-code.",
  units: [
    ML("P67", 1, "CSF-MAP", "NISTCSFMapperEngine — CSF 2.0 (GOVERN/IDENTIFY/PROTECT/DETECT/RESPOND/RECOVER) × IEC 62443 SL-T target definition + control-family traceability", "", { path: "mcp-server/src/engines/NISTCSFMapperEngine.ts", lines: 480, role: "R1", model: "opus-4.6", effort: 95 }),
    ML("P67", 2, "PURDUE", "PurdueSegmentationEngine — L0-L5 asset classifier + conduit attestation + data-diode policy + IT/OT DMZ", "", { path: "mcp-server/src/engines/PurdueSegmentationEngine.ts", lines: 420, role: "R1", model: "opus-4.6", effort: 85 }),
    ML("P67", 3, "CTRL-IDENT", "ControllerIdentityEngine — Fanuc L3/4 password rotation + Heidenhain + Siemens 840D role registry + MFA-on-HMI + smart-card + biometric pendant", "", { path: "mcp-server/src/engines/ControllerIdentityEngine.ts", lines: 460, role: "R1", model: "opus-4.6", effort: 90 }),
    ML("P67", 4, "GCODE-SIGN", "GCodeSignatureEngine — CMS/CAdES signing + HMAC chain-of-custody on DNC transfer + TOCTOU gate + tamper-detect on MDI handoff", "", { path: "mcp-server/src/engines/GCodeSignatureEngine.ts", lines: 440, role: "R1", model: "opus-4.6", effort: 90 }),
    ML("P67", 5, "SBOM", "SupplyChainSBOMEngine — CycloneDX + SPDX generator + SLSA-3 attestation + Sigstore cosign verify + in-toto layout + vendor firmware SBOM", "", { path: "mcp-server/src/engines/SupplyChainSBOMEngine.ts", lines: 460, role: "R1", model: "opus-4.6", effort: 90 }),
    ML("P67", 6, "USB-QUAR", "USBQuarantineEngine — signed-media allowlist + sandbox scan + operator-approval chain + air-gapped scan-before-mount", "", { path: "mcp-server/src/engines/USBQuarantineEngine.ts", lines: 360 }),
    ML("P67", 7, "RANSOM-RTO", "RansomwareRTOEngine — 3-2-1-1-0 orchestrator + immutable-backup integrity scrub + isolated-DR failover drill + tabletop playbook", "", { path: "mcp-server/src/engines/RansomwareRTOEngine.ts", lines: 420, role: "R1", model: "opus-4.6", effort: 85 }),
    ML("P67", 8, "IP-DRM", "IPDRMEngine — CAD/CAM at-rest AES-256-GCM (.mcx-8/.ipt/STEP) + per-open watermark + screen-capture hook + print-guard", "", { path: "mcp-server/src/engines/IPDRMEngine.ts", lines: 400 }),
    ML("P67", 9, "CVE-WATCH", "CVEWatchEngine — ICSA-CERT feed ingest + per-controller firmware-SBOM + patch SLA timer + Okuma CVE-2019-13520 / Rockwell CVE-2023-3595 / Siemens CVE-2023-29476 catalog", "", { path: "mcp-server/src/engines/CVEWatchEngine.ts", lines: 420, role: "R1", model: "opus-4.6", effort: 80 }),
    ML("P67", 10, "SOC-PLAY", "SOCPlaybookEngine — SIEM/Splunk CEF forwarder + controller-flash forensic imager + chain-of-custody hash-tree + incident runbook", "", { path: "mcp-server/src/engines/SOCPlaybookEngine.ts", lines: 400 }),
    ML("P67", 11, "ZERO-TRUST", "ZeroTrustBrokerEngine — SPIFFE/SPIRE identity + mTLS + policy-as-code (OPA Rego) + every-MCP-action gate + continuous authZ", "", { path: "mcp-server/src/engines/ZeroTrustBrokerEngine.ts", lines: 460, role: "R1", model: "opus-4.6", effort: 90 }),
  ],
  gate: gate(["NIST CSF 2.0 + 62443 SL-2 minimum coverage", "G-code signature verify blocks tampered file", "SBOM CycloneDX + SLSA-3 attest passes sigstore", "Ransomware RTO ≤4h on tabletop drill", "Zero-trust OPA gates 100% MCP actions", "CMMC 2.0 L2 audit trail complete"], { ralph_required: true, ralph_grade_floor: "A+" }),
});

// P68 — Business Physics Plus (11u) — L9-A7 INSUFFICIENT
phases.push({
  id: "P68",
  title: "Business Physics+ — learning curves + ABC + tariff + freight + MACRS + margin strategy + NRE amortization",
  sessions: "10-12",
  primary_role: "R1",
  primary_model: "opus-4.6",
  description: "L9-A7 INSUFFICIENT: P11 covers ~40% of shop economics. Add Wright/Crawford learning curves + qty-break optimizer + Activity-Based Costing (multi-pool, not flat burden) + tariff calculator (HTSUS + Section 301/232 + USMCA) + freight optimizer (LTL/FTL/ocean + dim-weight + hazmat) + MACRS depreciation + margin strategy advisor + quality cost of conformance + working capital CCC + gov contract (GSA/DPAS/CPARS/SBA 8(a)) + NRE amortization curves.",
  units: [
    ML("P68", 1, "LEARN-CURVE", "MillLearningCurveEngine — Wright b=log(LR)/log2 + Crawford cumulative-avg + LR tier 85/88/90/92% by complexity + re-run vs new-run split", "", { path: "mcp-server/src/engines/MillLearningCurveEngine.ts", lines: 380, role: "R1", model: "opus-4.6", effort: 80 }),
    ML("P68", 2, "QTY-BREAK", "QtyBreakOptimizerEngine — convex setup-amortization solver + inflection-point finder + integrates InventoryEOQEngine + quantity schedule generator", "", { path: "mcp-server/src/engines/QtyBreakOptimizerEngine.ts", lines: 400, role: "R1", model: "opus-4.6", effort: 80 }),
    ML("P68", 3, "ABC", "ActivityBasedCostingEngine — cost-pool → driver → object + programming/setup/inspect/deburr pools (replaces flat BurdenRateEngine) + rate allocation", "", { path: "mcp-server/src/engines/ActivityBasedCostingEngine.ts", lines: 440, role: "R1", model: "opus-4.6", effort: 85 }),
    ML("P68", 4, "TARIFF", "TariffCalculatorEngine — HTSUS lookup + Section 301 (China 25%+) + Section 232 (steel 25%/alum 10%) + USMCA/CUSMA rules-of-origin + §321 de-minimis", "", { path: "mcp-server/src/engines/TariffCalculatorEngine.ts", lines: 420, role: "R1", model: "opus-4.6", effort: 85 }),
    ML("P68", 5, "FREIGHT", "FreightOptimizerEngine — FedEx/UPS vs LTL (SMC3) vs FTL vs ocean + dim-weight + fuel surcharge + hazmat graphite dust + exotic-alloy insured value", "", { path: "mcp-server/src/engines/FreightOptimizerEngine.ts", lines: 380 }),
    ML("P68", 6, "DEPREC", "CapitalDepreciationEngine — MACRS 5/7-yr class life + straight-line + bonus §168(k) + spindle-hour opportunity cost + book-vs-tax basis", "", { path: "mcp-server/src/engines/CapitalDepreciationEngine.ts", lines: 400 }),
    ML("P68", 7, "MARGIN", "MarginStrategyAdvisorEngine — cost-plus vs value-based vs competitive + loss-leader threshold + customer-tier elasticity + annual-volume agreement", "", { path: "mcp-server/src/engines/MarginStrategyAdvisorEngine.ts", lines: 420, role: "R1", model: "opus-4.6", effort: 80 }),
    ML("P68", 8, "QUAL-COST", "QualityCostOfConformanceEngine — scrap-$ + rework-hr + AS9100 audit amortization + PPAP/FAI one-time fees + prevention/appraisal/failure split", "", { path: "mcp-server/src/engines/QualityCostOfConformanceEngine.ts", lines: 360 }),
    ML("P68", 9, "WORKING-CAP", "WorkingCapitalEngine — DSO + DPO + CCC + raw-on-hand + WIP turns + progress billing + cash-conversion-cycle forecaster", "", { path: "mcp-server/src/engines/WorkingCapitalEngine.ts", lines: 360 }),
    ML("P68", 10, "GOV", "GovContractPricingEngine — GSA Schedule 70 ceiling + DPAS DX/DO prioritization + CPARS rating impact + SBA 8(a)/HUBZone/SDVOSB set-aside + IRC §174 R&D capitalization", "", { path: "mcp-server/src/engines/GovContractPricingEngine.ts", lines: 420, role: "R1", model: "opus-4.6", effort: 85 }),
    ML("P68", 11, "NRE", "NREAmortizationEngine — fixture + post + FAI + tooling NRE + per-qty-break allocation curves + recovery-schedule optimizer", "", { path: "mcp-server/src/engines/NREAmortizationEngine.ts", lines: 380 }),
  ],
  gate: gate(["JM Die ±5% regression on 20 real quotes spanning qty 1-5000", "Tariff correctly applies Section 301 to China imports", "MACRS matches tax-prep software on 10 machines", "Learning curve converges to Wright LR on real production runs", "ABC replaces flat burden on 5 job classes"], { ralph_required: true, ralph_grade_floor: "A+" }),
});

// P69 — AFR Exhaustive (12u) — L9-A8 MAJOR GAP
phases.push({
  id: "P69",
  title: "AFR Exhaustive — 55-class feature recognition + patterns + undercuts + PMI + Granite/CGM readers",
  sessions: "10-12",
  primary_role: "R1",
  primary_model: "opus-4.6",
  description: "L9-A8 MAJOR GAP: coverage ~32%. Expand FeatureType 18→55 + add pattern recognizer (bolt-circle/honeycomb) + slot taxonomy (T/dovetail/Woodruff) + rib/gusset + interacting-feature decomposer + undercut/back-cut + Class-A surface classifier + thread taxonomy (M/UN/BSP/NPT/ACME) + PMI datum→feature order + Granite/CGM readers + B-rep vs mesh vs sketch fidelity arbiter.",
  units: [
    ML("P69", 1, "AFR-EXH", "FeatureRecognitionExhaustiveEngine — 55-class taxonomy superset + multi-modal B-rep+mesh+sketch + confidence scoring", "", { path: "mcp-server/src/engines/FeatureRecognitionExhaustiveEngine.ts", lines: 520, role: "R1", model: "opus-4.6", effort: 95 }),
    ML("P69", 2, "AFR-PAT", "PatternRecognizerEngine — linear/circular/grid/bolt-circle/honeycomb/matrix/rotation spatial-clustering + transform inference", "", { path: "mcp-server/src/engines/PatternRecognizerEngine.ts", lines: 420, role: "R1", model: "opus-4.6", effort: 85 }),
    ML("P69", 3, "AFR-SLOT", "SlotTaxonomyEngine — T-slot + dovetail + Woodruff + closed-end + step-slot + keyway geometric classifier + profile-matching", "", { path: "mcp-server/src/engines/SlotTaxonomyEngine.ts", lines: 380 }),
    ML("P69", 4, "AFR-RIB", "RibGussetWebRecognizerEngine — thin-wall structural detector + aspect-ratio + support-angle + weld-prep", "", { path: "mcp-server/src/engines/RibGussetWebRecognizerEngine.ts", lines: 360 }),
    ML("P69", 5, "AFR-INTER", "InteractingFeatureDecomposerEngine — volume-intersection graph + max-volume-first vs finish-first ordering + dependency DAG", "", { path: "mcp-server/src/engines/InteractingFeatureDecomposerEngine.ts", lines: 440, role: "R1", model: "opus-4.6", effort: 90 }),
    ML("P69", 6, "AFR-UNDER", "UndercutBackcutRecognizerEngine — 5-axis accessibility-driven FR + swept-volume overhang + face-draft + trimmed-surface", "", { path: "mcp-server/src/engines/UndercutBackcutRecognizerEngine.ts", lines: 400, role: "R1", model: "opus-4.6", effort: 85 }),
    ML("P69", 7, "AFR-CLASSA", "ClassASurfaceClassifierEngine — ruled/developable/NURBS/compound/Class-A automotive/aero curvature taxonomy + G2/G3 continuity", "", { path: "mcp-server/src/engines/ClassASurfaceClassifierEngine.ts", lines: 380 }),
    ML("P69", 8, "AFR-THREAD", "ThreadTaxonomyRecognizerEngine — M/UN/BSP/NPT/ACME/trapezoidal discriminator + pitch/lead/chamfer/class-of-fit", "", { path: "mcp-server/src/engines/ThreadTaxonomyRecognizerEngine.ts", lines: 360 }),
    ML("P69", 9, "AFR-PMI", "PMIDatumToFeatureOrderEngine — STEP AP242 PMI linker + tolerance-guided inspection-priority + datum-reference-frame → feature-queue", "", { path: "mcp-server/src/engines/PMIDatumToFeatureOrderEngine.ts", lines: 400, role: "R1", model: "opus-4.6", effort: 80 }),
    ML("P69", 10, "CAD-GRANITE", "GraniteCGMParserEngine — Creo Granite native B-rep + CATIA CGM reader + feature-tree extraction + parameter bind-back", "", { path: "mcp-server/src/engines/GraniteCGMParserEngine.ts", lines: 440, role: "R1", model: "opus-4.6", effort: 90 }),
    ML("P69", 11, "CAD-FIDELITY", "BrepMeshSketchFidelityArbiterEngine — per-format fidelity scoring + auto-downgrade path + mesh-repair + sketch-to-solid", "", { path: "mcp-server/src/engines/BrepMeshSketchFidelityArbiterEngine.ts", lines: 380 }),
    ML("P69", 12, "P69-TESTS", "55 feature types recognized on 100 reference parts; pattern recognizer catches bolt-circles 100%; 5-axis undercuts detected on 20 parts", "", { role: "R4", model: "sonnet-4.6", effort: 90 }),
  ],
  gate: gate(["55-class AFR recall ≥90% on 100-part benchmark", "Pattern recognizer catches 100% bolt-circles + grids", "Interacting-feature DAG generates 20 valid ops-order", "Granite/CGM readers round-trip on 10 Creo/CATIA parts"], { ralph_required: true, ralph_grade_floor: "A+" }),
});

// P70 — Workforce Development (12u) — L9-A9 ~0.5/12 axes
phases.push({
  id: "P70",
  title: "Workforce Development — DOL RAPIDS + NIMS + competency 9-box + VR/AR trainer + LMS + succession + pipeline",
  sessions: "10-12",
  primary_role: "R1",
  primary_model: "opus-4.6",
  description: "L9-A9 0.5/12 axes: MILL-MASTER treats workforce as data source, not capability to cultivate. Add apprenticeship curriculum (DOL RAPIDS 4-yr syllabus) + NIMS/PMA credentials + 9-box competency matrix + micro-learning LMS + VR/AR trainer wrappers (Haas VR + Mazak CAM Sim + Predator VCNC + Tormach) + certification tracking (AWS/NDT/AS9100/ITAR/OSHA 10/30) + succession planning + skill-based pay + pipeline outreach (SME EdFdn/NTMA U/FIRST/Project MFG) + diversity/inclusion + DOL compliance.",
  units: [
    ML("P70", 1, "CURRIC", "TrainingCurriculumEngine — DOL RAPIDS 4-yr syllabus + City & Guilds + German Dual-System + blueprint→setup→CAM→CNC→inspection→leadership progression", "", { path: "mcp-server/src/engines/TrainingCurriculumEngine.ts", lines: 440, role: "R1", model: "opus-4.6", effort: 85 }),
    ML("P70", 2, "COMPETENCY", "CompetencyMatrixEngine — 9-box grid skill × proficiency (novice/proficient/expert/master) + gap analysis + training-ROI calc", "", { path: "mcp-server/src/engines/CompetencyMatrixEngine.ts", lines: 400, role: "R1", model: "opus-4.6", effort: 80 }),
    ML("P70", 3, "NIMS", "NIMSCredentialEngine — NIMS measurement/safety + CNC mill operation + CNC mill programming + exam-prep + credential registry schema", "", { path: "mcp-server/src/engines/NIMSCredentialEngine.ts", lines: 380 }),
    ML("P70", 4, "DOL-RAPIDS", "DOLRAPIDSReportingEngine — OJT hour tracking + competency-based progression + apprenticeship utilization rate for federal contracts + quarterly filings", "", { path: "mcp-server/src/engines/DOLRAPIDSReportingEngine.ts", lines: 360 }),
    ML("P70", 5, "LMS-MICRO", "MicroLearningLMSEngine — 5-min video module per tribal tip + mobile-first + completion tracking + SCORM/xAPI + tips→curriculum linker", "", { path: "mcp-server/src/engines/MicroLearningLMSEngine.ts", lines: 400, role: "R1", model: "opus-4.6", effort: 80 }),
    ML("P70", 6, "VR-TRAINER", "VRTrainerWrapperEngine — Haas VR + Mazak CAM Sim + Predator VCNC + Tormach virtual + CNCSimulator Pro + HoloLens 2 AR setup-guide", "", { path: "mcp-server/src/engines/VRTrainerWrapperEngine.ts", lines: 420, role: "R1", model: "opus-4.6", effort: 85 }),
    ML("P70", 7, "CERT-TRACK", "CertificationTrackingEngine — AWS welding + NDT (UT/PT/MT) + AS9100 training + ITAR export-control + OSHA 10/30 + expiry + renewal alerts", "", { path: "mcp-server/src/engines/CertificationTrackingEngine.ts", lines: 380 }),
    ML("P70", 8, "SKILL-PAY", "SkillBasedPayEngine — NIMS-stamped wage tiers + pay-for-skill vs pay-for-seniority + union/non-union differential + compensation-band generator", "", { path: "mcp-server/src/engines/SkillBasedPayEngine.ts", lines: 360 }),
    ML("P70", 9, "SUCCESS", "SuccessionPlanningEngine — master-machinist knowledge-capture-before-retirement + video-interview protocol + tribal-tip mining + bench-depth analysis", "", { path: "mcp-server/src/engines/SuccessionPlanningEngine.ts", lines: 400, role: "R1", model: "opus-4.6", effort: 80 }),
    ML("P70", 10, "PIPELINE", "PipelineOutreachEngine — SME Education Foundation + NTMA U + FIRST Robotics + Project MFG + Manufacturing Day outreach + K-12/CC partnership tracker", "", { path: "mcp-server/src/engines/PipelineOutreachEngine.ts", lines: 360 }),
    ML("P70", 11, "DEI", "DiversityInclusionReportingEngine — women-in-trades + veterans (Get Skills To Work) + returning-citizens + neurodiversity + EEO-1 + pay-equity analysis", "", { path: "mcp-server/src/engines/DiversityInclusionReportingEngine.ts", lines: 340 }),
    ML("P70", 12, "P70-TESTS", "DOL RAPIDS compliance report valid + 9-box matrix generates for 20 operators + 6 VR trainers wrapped + 8 cert families tracked", "", { role: "R4", model: "sonnet-4.6", effort: 85 }),
  ],
  gate: gate(["DOL RAPIDS quarterly report passes validation", "9-box competency covers 20 operators", "Micro-learning LMS delivers 100 tip-modules + SCORM export", "VR trainer wraps Haas VR + Mazak CAM Sim + Predator VCNC"], { ralph_required: true, ralph_grade_floor: "A" }),
});

// P71 — Sustainability Master (15u) — L9-A10 GRADE D+
phases.push({
  id: "P71",
  title: "Sustainability Master — energy + LCA carbon + scrap revenue + coolant EOL + water + renewables + circularity + PaaS + CSRD/SEC export",
  sessions: "14-16",
  primary_role: "R1",
  primary_model: "opus-4.6",
  description: "L9-A10 GRADE D+: disqualifying for 2026 CSRD/SEC Tier-1. MILL-MASTER has 1 ESG engine (GHGScope3). Add energy monitoring (kW logging + demand-charge optimizer + compressed-air leak + VFD pump + chiller efficiency) + embodied LCA carbon (cradle-to-gate kg-CO₂e) + CDP/EcoVadis/SBTi/EU CSRD/SEC export + scrap revenue ($3-10/lb Ti/Inconel segregation) + coolant EOL + water footprint (NPDES stormwater) + renewables (solar+battery ROI + PPA + REC) + circularity (DfD + repairability + spare-part 10-20yr) + product-as-service (tool/spindle leasing).",
  units: [
    ML("P71", 1, "ENERGY-MON", "EnergyMonitoringEngine — spindle kW logging per block + demand-charge optimizer + peak-shave scheduler + submeter integration", "", { path: "mcp-server/src/engines/EnergyMonitoringEngine.ts", lines: 420, role: "R1", model: "opus-4.6", effort: 85 }),
    ML("P71", 2, "AIR-LEAK", "CompressedAirLeakEngine — <15% leakage target + ultrasonic leak-hunt + kWh-loss calc + ROI for fixing + compressor-sizing optimizer", "", { path: "mcp-server/src/engines/CompressedAirLeakEngine.ts", lines: 360 }),
    ML("P71", 3, "CHILLER-VFD", "CoolantPumpVFDChillerEfficiencyEngine — VFD coolant-pump + chiller COP + variable-speed fan + load-match optimizer", "", { path: "mcp-server/src/engines/CoolantPumpVFDChillerEfficiencyEngine.ts", lines: 380 }),
    ML("P71", 4, "LCA-CARBON", "LCACarbonEngine — cradle-to-gate per-part LCA + steel 1.8 / Ti 35 / Al 8 / CFRP 24 kg-CO₂e + machining energy + end-of-life scenario + ISO 14067", "", { path: "mcp-server/src/engines/LCACarbonEngine.ts", lines: 460, role: "R1", model: "opus-4.6", effort: 90 }),
    ML("P71", 5, "SCOPE-SPLIT", "Scope12LocationVsMarketEngine — Scope 2 location-based vs market-based + REC portfolio tracker + guarantees-of-origin", "", { path: "mcp-server/src/engines/Scope12LocationVsMarketEngine.ts", lines: 340 }),
    ML("P71", 6, "ESG-EXPORT", "ESGReportExporterEngine — CDP Climate Change + EcoVadis + SBTi SBTN + EU CSRD + SEC climate-disclosure rule 2026 unified exporter", "", { path: "mcp-server/src/engines/ESGReportExporterEngine.ts", lines: 480, role: "R1", model: "opus-4.6", effort: 95 }),
    ML("P71", 7, "SCRAP-REV", "ScrapRevenueEngine — Ti $3-6/lb + Inconel $5-10/lb + HSS $0.30/lb + chip segregation protocol + briquetter ROI + scrap-broker feed", "", { path: "mcp-server/src/engines/ScrapRevenueEngine.ts", lines: 400, role: "R1", model: "opus-4.6", effort: 80 }),
    ML("P71", 8, "COOLANT-EOL", "CoolantEndOfLifeEngine — haul-off vs centrifuge/UF-membrane ROI + trace-metals remediation + biocide treatment + $/gal tracker", "", { path: "mcp-server/src/engines/CoolantEndOfLifeEngine.ts", lines: 380 }),
    ML("P71", 9, "MEDIA-RECLAIM", "AbrasiveMediaReclaimEngine — tumbling/bead-blast media separation + grinding-swarf metal recovery + reclaim-vs-virgin economics", "", { path: "mcp-server/src/engines/AbrasiveMediaReclaimEngine.ts", lines: 340 }),
    ML("P71", 10, "PACKAGING", "PackagingWasteEngine — VCI paper + dunnage foam + cardboard + returnable tote program + SQDC metrics + shrink-film waste", "", { path: "mcp-server/src/engines/PackagingWasteEngine.ts", lines: 340 }),
    ML("P71", 11, "WATER", "WaterFootprintEngine — coolant makeup + parts-wash closed-loop + condensate capture + stormwater NPDES permit + regulatory liability tracker", "", { path: "mcp-server/src/engines/WaterFootprintEngine.ts", lines: 380, role: "R1", model: "opus-4.6", effort: 80 }),
    ML("P71", 12, "DFD", "DesignForDisassemblyRepairabilityEngine — DfX disassembly score + repairability index + EU Right to Repair + spare-part availability 10-20yr post-EOL", "", { path: "mcp-server/src/engines/DesignForDisassemblyRepairabilityEngine.ts", lines: 380 }),
    ML("P71", 13, "RENEWABLE", "SolarBatteryRenewableEngine — on-site solar + battery ROI + PPA + virtual PPA + REC retirement + net-metering economics", "", { path: "mcp-server/src/engines/SolarBatteryRenewableEngine.ts", lines: 400, role: "R1", model: "opus-4.6", effort: 80 }),
    ML("P71", 14, "PAAS", "ProductAsAServiceEngine — Sandvik CoroPlus tool-as-service + Fives spindle-leasing + per-hour billing for customers + subscription economics", "", { path: "mcp-server/src/engines/ProductAsAServiceEngine.ts", lines: 360 }),
    ML("P71", 15, "P71-TESTS", "CSRD + SEC + CDP + EcoVadis reports valid; LCA per-part ±10% vs published refs; scrap revenue reconciles to 2024 broker prices", "", { role: "R4", model: "sonnet-4.6", effort: 90 }),
  ],
  gate: gate(["CSRD + SEC climate disclosures valid", "LCA per-part ±10% vs GREET/EcoInvent", "Scrap revenue matches ScrapMonster broker data 2024", "NPDES stormwater permit compliance", "Solar+battery ROI NPV/IRR within ±5% of EnergySage"], { ralph_required: true, ralph_grade_floor: "A+" }),
});

// ── P72: Legacy Roadmap Consolidation Closeout (v12 F-consolidate) ─
// Captures the 4 items from MILLING-COMPREHENSIVE / MILL-TURN-COMPREHENSIVE / MILL-AI-INTEGRATION
// that pre-v12 phases did NOT explicitly cover. Without these, archiving the old roadmaps
// would lose real requirements.
phases.push({
  id: "P72",
  title: "Legacy Roadmap Consolidation Closeout — Cutter Comp + Multi-Setup + Macro Authoring + Bar-Fed Production Loop",
  description:
    "Consolidation phase — picks up the last 4 unique requirements from the archived milling roadmaps (MILLING-COMPREHENSIVE v2.0 'Issue 2 Cutter Compensation' and 'Issue 4 Multi-Setup'; MILLING-COMPREHENSIVE MS9 'Parametric & Macro Programming'; MILL-TURN-COMPREHENSIVE MT-MS11 'Bar Feeder + Production Loop') that are NOT covered by P0–P71. Small by design — scope is to guarantee no archival loss.",
  sessions: "4-5",
  primary_role: "R2",
  primary_model: "sonnet-4.6",
  scrutiny_checkpoint: true,
  scrutiny_focus: [
    "Each unit traces to a named clause in the archived roadmap",
    "No duplication with existing phases (P6 mill-turn, P38 cell planning, P44 macro harvesting, P56 controller features)",
    "Engines wired to MillMasterOrchestratorFacadeEngine",
  ],
  units: [
    U("P72", 1, "CUTTER-COMP", "CutterCompensationPipelineEngine — G41/G42/G40 plan + output + NC-side verification (MILLING-COMPREHENSIVE Issue 2)", {
      deliverables: [
        { path: "mcp-server/src/engines/CutterCompensationPipelineEngine.ts", type: "source", description: "Decides where G41/G42 turn-on/off goes, computes lead-in/lead-out geometry, flags controller variants (Fanuc C/D, Heidenhain TNC, Siemens CUT2DF). Differs from P56-U13 which only lists it as a controller feature — this is the pipeline-side authoring + validation.", line_count_est: 420 },
      ],
    }),
    U("P72", 2, "MULTI-SETUP", "MultiSetupAwarenessEngine — Op1/Op2/Op3 datum handoff + stock-handoff + fixture-offset chain (MILLING-COMPREHENSIVE Issue 4)", {
      deliverables: [
        { path: "mcp-server/src/engines/MultiSetupAwarenessEngine.ts", type: "source", description: "Tracks part through 2–6 setups: carries G54/G55/G56 offsets, re-clocks datum with probe routine, propagates stock model between setups, flags conflicts (tombstone face-side collisions, second-op clamp-over-feature). Ties into P9 workholding + P59 inspection.", line_count_est: 480 },
      ],
    }),
    U("P72", 3, "MACRO-AUTHOR", "ControllerMacroAuthoringEngine — OSP Macro / Fanuc Macro-B / Siemens Cycle authoring (MILLING-COMPREHENSIVE MS9 + MILL-TURN MT-MS10)", {
      deliverables: [
        { path: "mcp-server/src/engines/ControllerMacroAuthoringEngine.ts", type: "source", description: "Authoring complement to P44-U04 MacroBPatternHarvester. Generates parametric macros with user variables (#100–#999 Fanuc / VCOMMON OSP / R-params Siemens) from a macro-intent spec. Outputs dialect-correct control-flow, jumps, conditionals. Uses P56 controller features for dialect rules.", line_count_est: 520 },
      ],
    }),
    U("P72", 4, "BARFEED-LOOP", "BarFedProductionLoopEngine — part catcher + parts buffer + barfeed reload + continuous-run orchestration (MILL-TURN MT-MS11)", {
      deliverables: [
        { path: "mcp-server/src/engines/BarFedProductionLoopEngine.ts", type: "source", description: "Mill-turn / Swiss continuous-run orchestration. Sequences M-codes for bar advance (FMB/Iemca/LNS), part catcher deploy, parts buffer handoff, face-off/tail-piece, barfeed empty detect, lights-out resume. Wraps existing P38 cell planning + P41 ISO-23125 bar-feeder logic under a mill-turn-specific production loop. Distinct from P38-U12 (bar-feeder kit logistics only) and P41-U05 (grip-loss safety only).", line_count_est: 460 },
      ],
    }),
  ],
  gate: gate([
    "Each P72 unit cross-references the archived roadmap clause it consolidates",
    "CutterCompensationPipelineEngine runs on ≥20 JM Die lathe + mill programs without crash",
    "MultiSetupAwarenessEngine validates on JM Die 2-op and 3-op fixtures",
    "ControllerMacroAuthoringEngine round-trips against P44 harvested patterns for OSP + Fanuc",
    "BarFedProductionLoopEngine simulates a ≥1000-part lights-out bar run in digital twin",
  ]),
});

// ── P-LEARN: Milling ML/DL Training Pipeline (v13.2 — 2nd-to-last) ─
// Trains the models that P73 Execution Intelligence consumes. Chains three corpus sources
// (internal JM Die 20K+ programs, online program examples, /pdf-learn + /video-learn
// extracted knowledge) through harmonization → LoRA fine-tune → eval → deployment gate.
// Extends P23 (ML foundations) + P42-P46 (data corpora) + P50 (data governance) with
// mill-specific training + eval + model registry. Positioned 2nd-to-last per user directive
// so training completes before P73 execution intelligence consumes the models.
phases.push({
  id: "P-LEARN",
  title: "Milling Deep-Learning / Machine-Learning Training Pipeline — PDFs + Videos + Programs → Deployed Mill Models",
  description:
    "The training-data → deployed-model pipeline specifically for milling. Chains three corpus sources — internal JM Die archive (566 mill files across CNC MILL HAAS / HAAS-HURCO / ROKU-ROKU / MATTHEW, plus 16,947 .MIN + 7,092 .MCX-8 + 1,779 .MCX across all machines), online program examples (LinuxCNC samples, Fanuc/Haas/Siemens public, CNCzone / PracticalMachinist / GitHub, NIST SMSTB / UC Berkeley / UConn academic benchmarks), and PDF/video knowledge via existing /pdf-learn + /video-learn skills (Machinery's Handbook mill chapters, Sandvik/Kennametal/Iscar mill cutting data, Titans of CNC / Edge Precision / NYC CNC / Kennametal Technical YouTube, vendor application videos, OCW/NPTEL lectures) — through harmonization → LoRA fine-tune of G-code foundation model → eval against held-out ground truth → deployment gate. Produces the trained models that P73 consumes: strategy recommender (P73-U03/U05), tool-holder pair learner (P73-U04), measurement-feedback predictor (P73-U06), feed/speed physics-residual NN (ties P27). All engines respect mill-only scope — CAD/CAM training owned by other roadmaps.",
  sessions: "8-10",
  primary_role: "R1",
  primary_model: "opus-4.6",
  scrutiny_checkpoint: true,
  scrutiny_focus: [
    "Corpus ingest uses existing /pdf-learn + /video-learn skills — no reinvention",
    "Online harvest filtered to mill-scope (no general CNC / lathe / EDM contamination)",
    "ITAR + license + dedup hygiene applied before any training",
    "Every model has held-out eval beating physics-only baseline by ≥5% on ≥3 metrics",
    "Deployment gate refuses models with conformal interval exceeding safety threshold",
    "Model registry supports instant rollback (archive + swap symlink pattern)",
    "Feeds P73-U04/U05/U06 — no orphan models",
  ],
  units: [
    U("P-LEARN", 1, "MILL-PDF-HARVEST", "MillPDFCorpusHarvesterEngine — invokes /pdf-learn on mill-tagged PDF sources; extracts tribal tips + formulas + setup procedures into mill-tagged ReasoningBank", {
      role: "R1", role_name: "Systems Architect", effort: 90,
      deliverables: [
        { path: "mcp-server/src/engines/MillPDFCorpusHarvesterEngine.ts", type: "source", description: "Wraps /pdf-learn skill for mill-scope. Ingests Machinery's Handbook mill chapters, Sandvik/Kennametal/Iscar mill cutting-data handbooks, hyperMILL/Mastercam/Fusion360 training PDFs, JM Die setup binders, customer drawing PDFs. Tags extractions with mill-specific taxonomy (operation, material-group, controller, tool-family). Writes to `mill-corpus-pdf` ReasoningBank namespace. Respects PDF license metadata — skips paywalled-extracted content.", line_count_est: 440 },
      ],
    }),
    U("P-LEARN", 2, "MILL-VIDEO-HARVEST", "MillVideoCorpusHarvesterEngine — invokes /video-learn on mill-scope YouTube channels + academic lectures; Whisper STT + CLIP embedding + procedure extraction", {
      role: "R1", role_name: "Systems Architect", effort: 90,
      deliverables: [
        { path: "mcp-server/src/engines/MillVideoCorpusHarvesterEngine.ts", type: "source", description: "Wraps /video-learn skill for mill-scope. Whitelist: Titans of CNC, Edge Precision, NYC CNC, Kennametal Technical, Sandvik Coromant, Haas Tip of the Day, hyperMILL / Mastercam / Fusion360 tutorials, OCW 2.008 + NPTEL machining lectures. Whisper transcription + SigLIP/DINOv2 embedding + chapter-tag for mill relevance + procedure extraction (operation type, machine, material, strategy, outcome). Writes to `mill-corpus-video` namespace with license/copyright metadata per-channel.", line_count_est: 460 },
      ],
    }),
    U("P-LEARN", 3, "MILL-PROGRAM-HARVEST", "MillProgramCorpusHarvesterEngine — JM Die 20K+ internal programs + online public mill programs (LinuxCNC, Fanuc/Haas/Siemens samples, GitHub, academic benchmarks)", {
      role: "R1", role_name: "Systems Architect", effort: 95,
      deliverables: [
        { path: "mcp-server/src/engines/MillProgramCorpusHarvesterEngine.ts", type: "source", description: "Indexes internal JM Die mill programs (CNC MILL HAAS 58 customers/41 files, HAAS-HURCO 63/41, ROKU-ROKU 78/34, MATTHEW 444 files, plus the 16,947 .MIN + 7,092 .MCX-8 + 1,779 .MCX across all machines filtered to mill) + online public harvest (LinuxCNC LinuxCNC/nc_files, Fanuc/Haas/Siemens controller manual samples, CNCzone + PracticalMachinist + r/CNC forum code blocks, GitHub search 'cnc mill program' + 'fanuc mill' + 'mastercam mill', NIST SMSTB / UC Berkeley Milling / UConn SLD public benchmarks). Language-ID each program (Fanuc vs OSP vs Klartext vs Siemens vs Mazatrol). Respects robots.txt + vendor ToS — GitHub MIT/Apache/BSD only, skips proprietary dumps.", line_count_est: 560 },
      ],
    }),
    U("P-LEARN", 4, "MILL-CORPUS-HARMONIZE", "MillCorpusHarmonizationAndLabelingEngine — dedup + ITAR scrub + license filter + quality score + active-learning label queue", {
      role: "R1", role_name: "Systems Architect", effort: 95,
      deliverables: [
        { path: "mcp-server/src/engines/MillCorpusHarmonizationAndLabelingEngine.ts", type: "source", description: "Consumes U01+U02+U03 outputs. Fuzzy-hash dedup (SimHash + LSH for G-code, CLIP for video frames, embedding+chunk for PDF). ITAR scrub — removes customer names on parts flagged defense + high-precision tolerances consistent with regulated parts. License filter — drops non-redistributable content. Quality score (freshness, completeness, outcome-known vs orphan). Active-learning queue for low-confidence items → HITL labeler (ties P50-U07). Emits harmonized corpus with 80/10/10 train/val/test splits + per-machine + per-material + per-controller stratification.", line_count_est: 620 },
      ],
    }),
    U("P-LEARN", 5, "MILL-GCODE-LORA", "MillGCodeFoundationModelLoRAEngine — mill-specific LoRA fine-tune on harmonized G-code corpus, dialect-aware eval splits", {
      role: "R1", role_name: "Systems Architect", effort: 95,
      deliverables: [
        { path: "mcp-server/src/engines/MillGCodeFoundationModelLoRAEngine.ts", type: "source", description: "Extends P23-U01 (foundation-model) + P44-U03 (gcode-transformer). Mill-specific LoRA adapter on harmonized mill corpus. QLoRA rank-16 + Unsloth/Axolotl. Per-controller eval splits (Fanuc 30i/31i/32i, Haas NGC, Okuma OSP, Heidenhain TNC, Siemens 840D, Mazak Mazatrol). Metrics: perplexity, dialect-consistency, block-level syntax, canned-cycle correctness, tool-change appropriateness. Blocks publish if any split regresses vs baseline.", line_count_est: 540 },
      ],
    }),
    U("P-LEARN", 6, "MILL-STRATEGY-RECOMMENDER", "MillStrategyRecommenderTrainerEngine — train (part features → chosen strategy + outcome) recommender that feeds P73 sequence optimizer", {
      role: "R1", role_name: "Systems Architect", effort: 90,
      deliverables: [
        { path: "mcp-server/src/engines/MillStrategyRecommenderTrainerEngine.ts", type: "source", description: "Supervised recommender: features = {STEP AP242 part features from P69 AFR, material, tolerance, machine class}, labels = {picked strategy from Mastercam/hyperMILL/Fusion 360 metadata via P42/P43/existing CAM bridges}, outcome-filter = parts that passed inspection (ties P59). Outputs ranked strategy list with confidence. Pareto over (cycle time, tool life, surface quality, scrap risk). Feeds P73-U05 MillOperationSequenceOptimizerEngine.", line_count_est: 500 },
      ],
    }),
    U("P-LEARN", 7, "MILL-FEEDSPEED-RESIDUAL", "MillFeedSpeedResidualLearnerEngine — physics-residual NN over Kienzle/Taylor baseline with conformal prediction intervals", {
      role: "R1", role_name: "Systems Architect", effort: 90,
      deliverables: [
        { path: "mcp-server/src/engines/MillFeedSpeedResidualLearnerEngine.ts", type: "source", description: "Baseline = Kienzle (P27 constants). Residual NN learns (context → correction) from (machine feedback current, measured chatter amplitude, actual tool life vs Taylor prediction, part surface finish vs prediction). Falls back gracefully to physics if NN conformal interval > threshold. Inference path: physics_estimate + confidence(NN) × NN_correction. Feeds SpeedFeedOrchestratorEngine via adapter.", line_count_est: 520 },
      ],
    }),
    U("P-LEARN", 8, "MILL-TOOLHOLDER-LEARNER", "MillToolHolderPairingLearnerEngine — train (context → holder choice) from archive pairs with passed-inspection outcome filter; feeds P73-U04", {
      deliverables: [
        { path: "mcp-server/src/engines/MillToolHolderPairingLearnerEngine.ts", type: "source", description: "Training triples: (toolpath_type + DOC + stickout + machine_spindle_taper, chosen_holder, outcome). Outcome filter = parts passed inspection (ties P59). Features from tool catalog (P53) + holder catalog (P57) + machine (P56). Gradient-boosted trees + uncertainty quantification. Produces probabilistic holder recommender that MillToolHolderPairingEngine (P73-U04) can consult alongside the physics optimizer.", line_count_est: 460 },
      ],
    }),
    U("P-LEARN", 9, "MILL-MEASUREMENT-LEARNER", "MillMeasurementFeedbackPredictorEngine — train (measured delta → root-cause class + correction magnitude) from probe-log history; feeds P73-U06", {
      deliverables: [
        { path: "mcp-server/src/engines/MillMeasurementFeedbackPredictorEngine.ts", type: "source", description: "Training data: JM Die on-machine Renishaw + CMM + operator-measured probe logs, labeled with (actual root cause: wear vs deflection vs thermal growth vs datum shift) and (actual correction that worked: tool-offset ΔR vs stock-add vs feed-reduce vs re-probe). Two-headed model: classification head (root cause, 4-class) + regression head (correction magnitude + direction). Cross-validated by machine + material. Feeds P73-U06 MillMeasurementFeedbackEngine.", line_count_est: 540 },
      ],
    }),
    U("P-LEARN", 10, "MILL-EVAL-HARNESS", "MillMLEvalHarnessAndDeploymentGateEngine — held-out JM Die + online + synthetic eval; A/B vs physics baseline; deployment gate + model registry with rollback", {
      role: "R1", role_name: "Systems Architect", effort: 95,
      deliverables: [
        { path: "mcp-server/src/engines/MillMLEvalHarnessAndDeploymentGateEngine.ts", type: "source", description: "Evaluates every model from U05-U09. Three eval sets: (1) held-out JM Die parts (20% of archive, stratified P/M/K/N/S), (2) held-out online corpus (filter-clean portion not seen in training), (3) synthetic stress tests (chatter-prone thin-wall, deep-pocket aluminum, exotic Inconel 718, mirror-finish die steel). Metrics: cycle time, tool life, surface finish Ra, scrap rate. A/B vs physics-only baseline. Deployment gate: ≥ 5% improvement on ≥ 3 of 4 metrics AND conformal interval ≤ safety threshold. Model registry (version + checksum + lineage + rollback pointer). Ties P24 MLOps + P26 eval.", line_count_est: 660 },
      ],
    }),
    U("P-LEARN", 11, "MILL-LEARN-DISPATCHER-E2E", "mill_learn dispatcher actions (ingest/harmonize/train/eval/deploy/rollback) + E2E pipeline test on mini-corpus", {
      role: "R4", role_name: "Tester", effort: 85,
      deliverables: [
        { path: "mcp-server/src/tools/dispatchers/millDispatcher.ts", type: "source", description: "Add learn-family actions: `learn_ingest_pdf`, `learn_ingest_video`, `learn_ingest_programs`, `learn_harmonize`, `learn_train_model` (specific model name), `learn_eval`, `learn_deploy` (gated), `learn_rollback`. Stream progress events. All route through MillMasterOrchestratorFacadeEngine.", line_count_est: 220 },
        { path: "mcp-server/src/__tests__/mill-learning-pipeline.e2e.test.ts", type: "test", description: "Runs full pipeline on mini-corpus: 20 mill PDFs + 10 mill videos + 200 mill programs (sample from JM Die). Asserts: PDF harvest produces ≥ 30 tribal tips, video harvest extracts ≥ 15 procedures, program harvest dedup removes ≥ 10% duplicates, ITAR scrub catches ≥ 3 synthetic planted tags, harmonization splits stratified correctly, 1 LoRA trains to convergence on small split, eval gate refuses regression and accepts improvement, deploy + rollback round-trip preserves registry integrity. ≥ 40 assertions.", line_count_est: 620 },
      ],
    }),
  ],
  gate: gate([
    "All corpus sources respect /pdf-learn + /video-learn skill contracts (no bypass)",
    "ITAR scrub catches ≥ 95% of synthetic planted defense markers",
    "License filter blocks 100% of known-proprietary sources",
    "Every trained model beats physics-only baseline on held-out JM Die by ≥ 5% on ≥ 3 metrics",
    "Deployment gate refuses ≥ 1 regression scenario and accepts ≥ 1 improvement scenario in test",
    "Model registry rollback restores previous version in < 30s",
    "All 5 trained models are consumable by P73 (no orphans — wiring verified in E2E test)",
  ]),
});

// ── P73: Milling Execution Intelligence Core (v13) ────────────────
// User re-scope: MILL-MASTER covers MILLING ONLY. CAD/CAM (Mastercam/hyperMILL/Fusion360) is owned
// by other chats. This phase wires the AI reasoning layer that consumes the existing raw databases
// (tools P53, machines P56, holders P57, fixtures P52, physics P27, inspection P59, operator capture P51)
// and produces coordinated execution decisions: machine pick, setup author, tool+holder pair,
// sequence optimize, and real-time measurement-driven adjustment.
phases.push({
  id: "P73",
  title: "Milling Execution Intelligence Core — Setup + Machine-Pick + Capability Exploit + Tool-Holder Pair + Sequence Optim + Live Feedback",
  description:
    "The execution-intelligence layer that chains v12 database phases into end-to-end decisions. Given a job spec (part + material + tolerance + deadline + shop fleet), the pipeline: (1) picks the best machine, (2) authors the setup sheet + probe routine, (3) maximally exploits controller capability (TCPM, NURBS look-ahead, HSC, tilted-plane), (4) pairs best tool geometry with best holder combinatorially, (5) orders all operations for minimum total cost + cycle time, and (6) closed-loop adjusts from operator measurements mid-job. Each unit wires existing phases; no new taxonomies.",
  sessions: "6-8",
  primary_role: "R1",
  primary_model: "opus-4.6",
  scrutiny_checkpoint: true,
  scrutiny_focus: [
    "Every unit wires into MillMasterOrchestratorFacadeEngine — no orphan engines",
    "Cost/cycle-time decisions traceable to P27 physics, not heuristics",
    "Machine-pick + tool-holder-pair decisions explainable (why this machine / this holder)",
    "Measurement feedback has operator-approval gate before NC-side correction applies",
    "End-to-end runs on ≥5 JM Die parts across material groups P/M/K/N",
  ],
  units: [
    U("P73", 1, "SETUP-AUTHOR", "MillSetupAuthoringEngine — authors operator-facing setup sheet + step-by-step instructions + probe routine from job spec + shop fixture inventory (P52)", {
      role: "R1", role_name: "Systems Architect", effort: 90,
      deliverables: [
        { path: "mcp-server/src/engines/MillSetupAuthoringEngine.ts", type: "source", description: "Authors setup sheet: part alignment steps, datum set (G54/G55/…), probe macro, fixture-ID callout, tool-list cross-ref, safety notes. Consumes P52 fixture catalog + P59 probe macros + P9 workholding; emits PDF + JSON. Differs from P44-U01 SetupSheetOCR (reading) — this is authoring.", line_count_est: 560 },
      ],
    }),
    U("P73", 2, "MACHINE-PICK", "MillMachineSelectionEngine — ranks shop fleet against part requirements; explains selection with scored trade-offs", {
      role: "R1", role_name: "Systems Architect", effort: 95,
      deliverables: [
        { path: "mcp-server/src/engines/MillMachineSelectionEngine.ts", type: "source", description: "Inputs: part (envelope, tolerance, material, features, finish), shop fleet (from MachineRegistry + P56 controller features), current load (from scheduler), deadline, cost target. Outputs: ranked machine list with scored rationale (capability match 0-1, tolerance headroom, load-fit, cost), best choice + 2 fallbacks. Uses MLDecision + ConstraintProgramming + Pareto. Ties to P4 multi-machine + P38 cell planning.", line_count_est: 620 },
      ],
    }),
    U("P73", 3, "CAPABILITY-EXPLOIT", "MillMaxCapabilityEngine — actively routes programs to best-available controller feature instead of lowest-common-denominator", {
      role: "R1", role_name: "Systems Architect", effort: 90,
      deliverables: [
        { path: "mcp-server/src/engines/MillMaxCapabilityEngine.ts", type: "source", description: "Reads P56 controller feature matrix + selected machine from P73-U02. For each planned op, picks the richest available feature path: TCPM/RTCP when 5-axis + Fanuc 30i/TNC/Siemens; NURBS look-ahead (G05.1 Q1 / M128 / SOFT) when controller supports; tilted-plane PLANE/G68.2/CYCLE800 vs rotary-linearize fallback; HSC mode; rigid-tap G84.2 vs floating; Heidenhain Klartext Q-params when useful; Okuma IGF smoothing. Emits feature-choice ledger for post-processor.", line_count_est: 580 },
      ],
    }),
    U("P73", 4, "TOOL-HOLDER-PAIR", "MillToolHolderPairingEngine — combinatorial optimizer over tool × holder × spindle for any toolpath", {
      role: "R1", role_name: "Systems Architect", effort: 95,
      deliverables: [
        { path: "mcp-server/src/engines/MillToolHolderPairingEngine.ts", type: "source", description: "Given toolpath type (rough/semi/finish/drill/thread/chamfer), DOC, stickout envelope, material, RPM budget, machine spindle taper (from P57): pick best tool geometry (P53 ISO 1832/513/13399) paired with best holder (HSK-A/E/B / CAT / BT / Capto / shrink-fit / hydraulic / ER-collet / Weldon). Optimizer objective: min(deflection + runout + vibration) subject to (stickout ≤ envelope, balance-grade ≥ required, holder-taper matches spindle). Returns primary pair + 2 fallbacks with justification.", line_count_est: 640 },
      ],
    }),
    U("P73", 5, "SEQUENCE-OPTIMIZE", "MillOperationSequenceOptimizerEngine — orders all ops for minimum total cost (cycle + tool changes + rotations + air cuts)", {
      role: "R1", role_name: "Systems Architect", effort: 95,
      deliverables: [
        { path: "mcp-server/src/engines/MillOperationSequenceOptimizerEngine.ts", type: "source", description: "Inputs: operation list (rough/semi/finish/drill/tap/ream/chamfer/thread), tool list from P73-U04, fixture setups from P73-U01, cycle times from P27 physics. Objective: minimize Σ(cycle_time + tool_change_time × N_changes + indexing_time × N_rotations + air-cut_time). Enforces rough→semi→finish discipline + same-tool-same-setup bundling + cold-start warmup. TSP-relaxation + branch-and-bound. Ties to P11 cost model. Emits sequenced op-list with total-cost breakdown.", line_count_est: 700 },
      ],
    }),
    U("P73", 6, "MEASUREMENT-FEEDBACK", "MillMeasurementFeedbackEngine — closed-loop: operator-measured dimensions → NC-side offset/stock/feed correction with approval gate", {
      role: "R1", role_name: "Systems Architect", effort: 95,
      deliverables: [
        { path: "mcp-server/src/engines/MillMeasurementFeedbackEngine.ts", type: "source", description: "Inputs: measured dimension (CMM / Renishaw probe / micrometer / dial indicator) + target dimension + tolerance. Computes: delta, exceeded direction (oversize vs undersize), root-cause hypothesis (tool wear vs deflection vs thermal growth vs datum shift), recommended correction (tool-offset adjust ΔR / re-cut with +Δ stock / feed reduction / spindle speed change / datum re-probe). Operator-approval gate before any NC-side correction applies — never auto-applies silently. Ties to P39 HIL + P51 operator capture + P33 wear + P27 thermal.", line_count_est: 680 },
      ],
    }),
    U("P73", 7, "EXECUTION-DISPATCH", "Wire prism_mill_execute action — single MCP entry that runs the 6-step pipeline", {
      deliverables: [
        { path: "mcp-server/src/tools/dispatchers/millDispatcher.ts", type: "source", description: "Add `execute_job` action: accepts job spec, runs pick-machine → author-setup → exploit-capability → pair-tool-holder → sequence-ops → (execute) → measurement-feedback (loop). Streams progress; emits coordinated decisions ledger. Wires to MillMasterOrchestratorFacadeEngine. Also exposes each step as individual action for debugging.", line_count_est: 240 },
      ],
    }),
    U("P73", 8, "EXECUTION-E2E", "End-to-end integration test — 5 JM Die parts across material groups P/M/K/N through the full pipeline", {
      role: "R4", role_name: "Tester",
      deliverables: [
        { path: "mcp-server/src/__tests__/mill-execution-intelligence.e2e.test.ts", type: "test", description: "Runs execution pipeline on 5 archived JM Die parts (M2 die block / graphite electrode / A2 plate / S7 hub / 6061 fixture). Asserts: machine pick matches archived machine within ±1 rank, sequence ordering reduces archived cycle time ≥5% on ≥3 of 5, tool-holder pair matches archived or beats it on deflection metric, measurement-feedback correctly recommends offset adjustment on 3 synthetic over/under cases. ≥ 30 assertions.", line_count_est: 520 },
      ],
    }),
  ],
  gate: gate([
    "prism_mill_execute MCP action callable end-to-end",
    "All 6 engines wired through MillMasterOrchestratorFacadeEngine (no direct-call bypass)",
    "Machine-pick decisions explainable — ledger includes score per factor",
    "Measurement-feedback never auto-applies without operator approval",
    "E2E passes on 5 JM Die parts across P/M/K/N material groups",
  ]),
});

// ── Envelope ──────────────────────────────────────────────────────
// Auto-inject intra-phase sequential dependencies (U02→[U01], U03→[U02]...) unless explicit (L6-A2 fix)
for (const ph of phases) {
  for (let i = 0; i < ph.units.length; i++) {
    const u = ph.units[i];
    if (!u.dependencies || u.dependencies.length === 0) {
      u.dependencies = i === 0 ? [] : [ph.units[i - 1].id];
    }
  }
}

const total_units = phases.reduce((s, p) => s + p.units.length, 0);

const envelope = {
  id: "MILL-MASTER",
  version: "13.2.0",
  schemaVersion: 1,
  workflow_type: "consolidated_mill",
  title:
    "MILL-MASTER — Consolidated Milling Production-Readiness (Synergy + Master AI Integration + Terminal Exhaustive Test Suite)",
  brief:
    "Consolidated mill roadmap v2 — synergy-first. Supersedes CAMX-MS6, CAMX-MS9, CAMX-V17-P0B, F360-REV-MS9, LATHE-PRO-MS6a, ELEC-PIPE-MS1, RES-MS19, RES-MS23. PowerMill + CATIA deferred per user directive. CAM bridge priority: Mastercam → hyperMILL → Inventor HSM/CAM → SolidCAM → Fusion 360 (bring InventorCAM + SolidCAM to parity with Mastercam/hyperMILL depth). /forge-audit confirmed 114 existing mill engines + MillMasterOrchestratorFacadeEngine + MillingAGIMasterEngine + CAMAGIMasterOrchestratorEngine + MillAISelfAwarenessIntegrationEngine ALL EXIST but are UNWIRED (no millDispatcher.ts). P1 creates the first-class mill dispatcher and wires the full facade chain — this is the cohesion core. P12/P13 wire (not build) the AI/physics/twin layers. P0 closes wizard parity with Lathe + Wire EDM. P16 is the terminal exhaustive test suite with 10,500-cell print-to-program matrix, live CAD in SolidWorks/Inventor/Fusion 360, CAM parity in Mastercam/hyperMILL/Inventor HSM/Fusion 360 Manufacturing, Monte Carlo variability, ground-truth comparison vs 20K+ JM Die programs, 7-dialect controller regression, and a full-stack synergy audit proving 100% engine reachability through the facade. Omega target 1.0.",
  created_at: NOW,
  created_by: "claude-opus-4.7",
  supersedes: [
    "CAMX-MS6",
    "CAMX-MS9",
    "CAMX-V17-P0B",
    "F360-REV-MS9",
    "LATHE-PRO-MS6a",
    "ELEC-PIPE-MS1",
    "RES-MS19",
    "RES-MS23",
    "MILL-AWARE-MS0",
  ],
  phases,
  total_units,
  total_sessions: "436-563",
  dependency_graph:
    "P0 (wizard parity) ──┐\n" +
    "                     ├──→ P1 (mill dispatcher + master AI wiring — COHESION CORE)\n" +
    "                     │       │\n" +
    "                     │       ├──→ P2 (CAM bridges: MC → HM → InvHSM → SC → F360)\n" +
    "                     │       ├──→ P3 (critical bug fixes)\n" +
    "                     │       │       │\n" +
    "                     │       │       ├──→ P4 (3-axis hardening)\n" +
    "                     │       │       ├──→ P5 (5-axis + F360 wiring)\n" +
    "                     │       │       ├──→ P6 (mill-turn/swiss)\n" +
    "                     │       │       └──→ P7 (electrode pipeline)\n" +
    "                     │       ├──→ P8  (wear/thermal/GD&T)\n" +
    "                     │       ├──→ P9  (workholding + fixtures)\n" +
    "                     │       ├──→ P10 (quality + compliance)\n" +
    "                     │       ├──→ P11 (cost + shop floor + ERP)\n" +
    "                     │       ├──→ P12 (AI layer WIRING — not build)\n" +
    "                     │       ├──→ P13 (physics + digital twin WIRING)\n" +
    "                     │       ├──→ P14 (legacy + tribal mining)\n" +
    "                     │       ├──→ P14b (JM Die HNSW + recipe aggregation)\n" +
    "                     │       ├──→ P15 (hyperMILL AC + SDK deep integration)\n" +
    "                     │       ├──→ P19 (PRISM Master AI router + bypass eradication)\n" +
    "                     │       ├──→ P20 (state persistence + calibration)\n" +
    "                     │       ├──→ P21 (registries + hooks + MCP hardening)\n" +
    "                     │       └──→ P22 (mill docs + reference index)\n" +
    "                     │                                        │\n" +
    "                     └────────────────────────────────────────▼\n" +
    "                            P16 (EXHAUSTIVE TERMINAL TEST SUITE + SYNERGY AUDIT)",
  role_matrix: [
    { code: "R1", name: "Systems Architect / Research Lead", model: "opus-4.6", effort: 95, description: "Facade + AGI + cross-cutting integration" },
    { code: "R2", name: "Implementer", model: "sonnet-4.6", effort: 80, description: "TypeScript engine + dispatcher wiring" },
    { code: "R3", name: "CAM Integration Engineer", model: "sonnet-4.6", effort: 85, description: "CAM system bridges + post-processors" },
    { code: "R4", name: "Test Engineer", model: "sonnet-4.6", effort: 85, description: "Vitest + Playwright + Monte Carlo harnesses" },
  ],
  tool_map: [
    { tool: "prism_ai", phases: ["P1", "P12", "P16"], purpose: "Master AI routing, mill AGI, awareness" },
    { tool: "prism_cam", phases: ["P1", "P2", "P15", "P16"], purpose: "CAM AGI + 5-system bridge" },
    { tool: "prism_calc", phases: ["P4", "P5", "P6", "P8", "P13"], purpose: "Kienzle + chatter + deflection" },
    { tool: "prism_cad", phases: ["P0", "P14", "P16"], purpose: "CAD feature extraction + live modeling" },
    { tool: "prism_5axis", phases: ["P5", "P16"], purpose: "5-axis RTCP + singularity" },
    { tool: "prism_turning", phases: ["P6"], purpose: "Mill-turn multi-channel" },
    { tool: "prism_safety", phases: ["P1", "P4", "P5", "P16"], purpose: "Hard safety gates via safety hooks" },
    { tool: "prism_dev", phases: ["ALL"], purpose: "Build + test + inventory" },
    { tool: "prism_omega", phases: ["P16"], purpose: "Final release gate" },
    { tool: "millDispatcher (NEW)", phases: ["P1+"], purpose: "First-class mill MCP surface created in P1" },
  ],
  dispatcher_coverage: {
    total_dispatchers_on_disk: 91,
    consumed_by_mill_master: [
      "millDispatcher (NEW, P1)", "camDispatcher (P2, P19b)", "fiveAxisDispatcher (P5)",
      "turningDispatcher (P6)", "aiReasoningDispatcher (P12)", "ppDispatcher (P3/P4)",
      "qualityDispatcher (P10)", "complianceDispatcher (P10)", "businessDispatcher (P11)",
      "schedulingDispatcher (P11)", "cadDispatcher", "cadAutomationDispatcher",
      "toolpathDispatcher", "multiAxisProgramDispatcher", "multiOpDispatcher",
      "safetyDispatcher", "guardDispatcher", "validationDispatcher", "cadRegressionDispatcher",
      "telemetryDispatcher", "monitoringDispatcher", "realtimeDispatcher", "machineLiveDispatcher",
      "adaptiveControlDispatcher", "processControlDispatcher", "vibrationPhysicsDispatcher", "fluidThermalDispatcher",
      "knowledgeDispatcher", "knowledgeExtDispatcher", "machiningKnowledgeBaseDispatcher",
      "documentLearningDispatcher", "shopPracticeDispatcher",
      "intelligenceDispatcher", "omegaDispatcher", "atcsDispatcher", "orchestrationDispatcher",
      "autonomousDispatcher", "autoPilotDispatcher", "agentDispatcher",
      "holePatternDispatcher", "threadDispatcher", "threadingPipelineDispatcher",
      "secondaryOpsDispatcher", "cncOpsDispatcher", "machineSetupDispatcher",
      "feasibilityDispatcher", "productDispatcher", "partsLibraryDispatcher", "diagnosisDispatcher",
      "memoryDispatcher", "sessionDispatcher", "contextDispatcher", "gsdDispatcher",
      "hookDispatcher", "nlHookDispatcher", "algorithmDispatcher", "calcDispatcher",
      "pfpDispatcher", "cplDispatcher", "spDispatcher", "bridgeDispatcher",
      "provenPipelineDispatcher", "integrationDispatcher",
      "resourceHarvestingDispatcher", "resourceHarvesterDispatcher", "resourceExtractionDispatcher",
    ],
    unused_for_mill: [
      "grindingDispatcher", "edmDispatcher", "weldingJoiningDispatcher", "formingCastingDispatcher",
      "authDispatcher", "tenantDispatcher", "securityDispatcher", "infraDispatcher",
      "skillScriptDispatcher", "exportDispatcher", "dataDispatcher", "generatorDispatcher",
      "inboxDispatcher", "documentDispatcher", "industryDispatcher", "devDispatcher",
      "operatingSystemDispatcher", "ralphDispatcher", "manusDispatcher",
      "scientificMathDispatcher", "mechanicalDesignDispatcher", "l2EngineDispatcher",
      "automationDispatcher", "cadDrawingKnowledgeDispatcher",
    ],
    coverage_note: "Loop-3 A2 audit — ~67 consumed, 24 unused-for-mill, total 91",
  },
  deliverables_index: [],
  existing_leverage: [
    // Facades + master AI (UNWIRED — P1 wires them)
    { asset: "MillMasterOrchestratorFacadeEngine", type: "engine", count: 1, usage: "Single-entry mill facade — P1-U02 wires it to millDispatcher" },
    { asset: "MillingAGIMasterEngine", type: "engine", count: 1, usage: "PhD-level AGI with 8 reasoning modes — P1-U03 binds" },
    { asset: "CAMAGIMasterOrchestratorEngine", type: "engine", count: 1, usage: "Multi-CAM AGI router — P1-U06 wires to camDispatcher" },
    { asset: "MillAISelfAwarenessIntegrationEngine", type: "engine", count: 1, usage: "114-engine registry — P1-U04 syncs with PRISMSelfAwarenessEngine" },
    { asset: "PRISMSelfAwarenessEngine", type: "engine", count: 1, usage: "Adds recommendMillFeatures in P1-U04" },
    // Mill-specific engines (audited 2026-04-20)
    { asset: "Milling* engines", type: "engine", count: 30, usage: "AI/orchestration/reasoning/neural/RL/meta-learning layer — wired in P12" },
    { asset: "Mill* engines", type: "engine", count: 15, usage: "Physics/pattern/tribal/kinematics — wired via facade" },
    { asset: "FiveAxis* engines", type: "engine", count: 9, usage: "5-axis orchestration (COMPLETE) — hardened in P5" },
    { asset: "MultiAxis* engines", type: "engine", count: 2, usage: "Multi-axis P2P + kinematic" },
    { asset: "MillTurn* engines", type: "engine", count: 2, usage: "Mill-turn/Swiss pipeline" },
    // CAM bridges (existing)
    { asset: "Mastercam* engines", type: "engine", count: 18, usage: "DEEP (priority 1 in P2)" },
    { asset: "HyperMill* engines", type: "engine", count: 60, usage: "VERY DEEP (priority 2) — includes AC/SDK/Extractors" },
    { asset: "Fusion360 + Fusion* engines", type: "engine", count: 20, usage: "DEEP (priority 5) — final handshake in P2-U22..25" },
    { asset: "InventorCAM/HSM engines", type: "engine", count: 7, usage: "PARTIAL (priority 3) — parity fill in P2-U09..15" },
    { asset: "SolidCAM engines", type: "engine", count: 5, usage: "PARTIAL (priority 4) — parity fill in P2-U16..21" },
    // Pipelines + supporting
    { asset: "MillingPrintToProgramEngine", type: "engine", count: 1, usage: "Print-to-program core — exercised in P16" },
    { asset: "PostProcessorPipelineEngine", type: "engine", count: 1, usage: "38-stage post — reused directly" },
    { asset: "SpeedFeedOrchestratorEngine", type: "engine", count: 1, usage: "Central physics hub (2,851 LOC)" },
    { asset: "LatheStudioPage/Context + WireEdmStudioPage", type: "source", count: 3, usage: "UI parity template — P0 mirrors exactly" },
    { asset: "JM Die archive", type: "data", count: 20157, usage: "Ground truth + tribal mining + P16 regression corpus" },
    // Complete milestones
    { asset: "MILL-HARD-MS0..MS8", type: "milestone", count: 9, usage: "Foundation physics + 5-axis AI (COMPLETE, reuse)" },
    { asset: "MILL-AI-MS1..MS4", type: "milestone", count: 4, usage: "Deep learning + JM Die + multi-CAM + machine AI (COMPLETE)" },
    { asset: "CAMX-V17-P5/P6/P7", type: "milestone", count: 3, usage: "3/5-axis/mill-turn pipelines (COMPLETE, hardened in P4/P5/P6)" },
    { asset: "MILL-INTEG-MS1", type: "milestone", count: 1, usage: "Orchestrator consolidation parent — MILL-MASTER P1 continues this" },
  ],
  scrutiny_config: {
    pass_mode: "adaptive",
    min_passes: 3,
    max_passes: 7,
    convergence_rule: "delta < 2",
    escalation_rule: "if pass 4+ finds CRITICAL, flag for human review",
    scrutinizer_model: "opus-4.6",
    scrutinizer_effort: 95,
    gap_categories: [
      "missing_tools", "missing_deps", "missing_exit_conditions",
      "missing_rollback", "sequence_errors", "role_mismatch",
      "effort_mismatch", "missing_indexing", "missing_skills",
      "orphaned_deliverables", "underspecified_steps", "missing_tests",
    ],
    improvement_threshold: 0.98,
  },
  scrutiny_log: "mcp-server/data/milestones/MILL-MASTER.scrutiny-log.json",
  position_file: "mcp-server/data/milestones/MILL-MASTER.position.json",
  state_dir: "mcp-server/data/state/MILL-MASTER/",
};

fs.mkdirSync(path.dirname(ENVELOPE_OUT), { recursive: true });
fs.writeFileSync(ENVELOPE_OUT, JSON.stringify(envelope, null, 2), "utf8");
console.log(`✓ MILL-MASTER envelope v${envelope.version} written: ${ENVELOPE_OUT}`);
console.log(`  phases: ${phases.length}`);
console.log(`  total_units: ${total_units}`);

// ── Update roadmap-index.json ──────────────────────────────────────
const indexJson = JSON.parse(fs.readFileSync(INDEX_FILE, "utf8"));
const SUPERSEDED_IDS = [
  "CAMX-MS6", "CAMX-MS9", "CAMX-V17-P0B", "F360-REV-MS9",
  "LATHE-PRO-MS6a", "ELEC-PIPE-MS1", "RES-MS19", "RES-MS23",
  "MILL-AWARE-MS0",
];
let supersededCount = 0;
for (const m of indexJson.milestones) {
  if (SUPERSEDED_IDS.includes(m.id)) {
    m.superseded_by = "MILL-MASTER";
    m.superseded_reason = "Consolidated into MILL-MASTER v2 — see envelope phase mapping";
    supersededCount++;
  }
}

const existing = indexJson.milestones.find((m) => m.id === "MILL-MASTER");
const millEntry = {
  id: "MILL-MASTER",
  title: envelope.title,
  track: "MILL-MASTER",
  dependencies: ["MILL-HARD-MS8", "MILL-AI-MS4", "MILL-INTEG-MS1"],
  status: "not_started",
  total_units,
  completed_units: 0,
  sessions: envelope.total_sessions,
  envelope_path: "milestones/MILL-MASTER.json",
  description:
    "Synergy-first master mill roadmap — wizard parity + mill dispatcher creation + master AI wiring + 5 CAM bridges (Mastercam/hyperMILL/InventorHSM/SolidCAM/Fusion360, no PowerMill/CATIA) + critical fixes + hardening + electrode pipeline + wear/thermal/GD&T + workholding + quality + cost + AI layer WIRING (engines exist) + physics/twin WIRING + legacy migration + hyperMILL AC SDK + EXHAUSTIVE TERMINAL TEST SUITE with synergy audit. Omega 1.0.",
  supersedes: SUPERSEDED_IDS,
  notes: "v13.2 — adds P-LEARN (11u, opus) as 2nd-to-last phase per user directive: ML/DL training pipeline that chains /pdf-learn + /video-learn + internal JM Die program archive + online public mill programs through harmonization → LoRA fine-tune → eval → deployment gate. Produces trained models consumed by P73 execution intelligence (strategy recommender → P73-U05, tool-holder learner → P73-U04, measurement predictor → P73-U06, feed/speed residual NN → SpeedFeedOrchestrator). Extends P23 (ML foundations), P42-P46 (data corpora), P50 (data governance) with mill-specific training + eval + model registry. v13.1→v13.2: +1 phase (79→80), +11 units (900→911), sessions 428-553→436-563. v13.1 added MILL-AWARE-MS0 to supersedes list, archived 11 old certs. v13.0 added P73 Milling Execution Intelligence. v12 truth-telling pass applied F1-F6 fixes (cert publisher honest, factory auto-index, auto-role-name, widened orphan allowlist, threshold 0.98).",
};
if (!existing) {
  indexJson.milestones.push(millEntry);
} else {
  Object.assign(existing, millEntry);
}
indexJson.updated_at = NOW;
indexJson.total_milestones = indexJson.milestones.length;
fs.writeFileSync(INDEX_FILE, JSON.stringify(indexJson, null, 2), "utf8");

console.log(`✓ roadmap-index.json updated`);
console.log(`  superseded: ${supersededCount} milestones`);
console.log(`  MILL-MASTER v${envelope.version}: ${total_units} units, ${phases.length} phases`);
