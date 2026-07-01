/**
 * PRISM MCP Server - Main Entry Point
 * Manufacturing Intelligence MCP Server
 * 
 * Provides access to:
 * - 55 dispatchers, 1670+ verified actions
 * - 554 engine files (561 exported), 23 registries
 * - Materials Database (6,372+ materials x 127 parameters)
 * - Machines Database (1,015+ machines x 4 layers)
 * - Controller Alarms (10,033+ alarms x 12 families)
 * - Manufacturing Calculations (Kienzle, Taylor, etc.)
 * - AI Agent Orchestration (75 agents)
 * - Skills & Knowledge Base (230 skills, 9 bundles)
 * - F1-F8 Feature Suite (PFP, Memory, Telemetry, Certs, Multi-Tenant, NL Hooks, Bridge, Compliance)
 * - R4-R11: Enterprise, Frontend, Production, Physics, UX, Shop Floor, ML, Products
 */

import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { StreamableHTTPServerTransport } from "@modelcontextprotocol/sdk/server/streamableHttp.js";
import express from "express";
import dotenv from "dotenv";
import path from "node:path";
import fs from "node:fs";
import net from "node:net";

import { SERVER_NAME, SERVER_VERSION, SERVER_DESCRIPTION } from "./constants.js";
import { log } from "./utils/Logger.js";
import { respondTransportError } from "./utils/transportError.js";

// MCP Primitives — Resources, Prompts, Logging, Tasks
import {
  registerResources,
  registerPrompts,
  registerTaskTools,
  initMcpLogging,
  getAuthConfig,
} from "./mcp/index.js";
import {
  buildMcpDiscoveryDocument,
  registerOAuthHttpRoutes,
} from "./mcp/authHttp.js";

// Import tool registrations
import { registerDataDispatcher } from "./tools/dispatchers/dataDispatcher.js";

// Phase 2A: Dispatcher Imports (70 tools → 4 dispatchers, ~60K token savings)
import { registerSafetyDispatcher } from "./tools/dispatchers/safetyDispatcher.js";
import { registerThreadDispatcher } from "./tools/dispatchers/threadDispatcher.js";
import { registerToolpathDispatcher } from "./tools/dispatchers/toolpathDispatcher.js";
import { registerCalcDispatcher } from "./tools/dispatchers/calcDispatcher.js";
// OBSERVABILITY-MS0 (slot:bravo 2026-05-30): in-process MCP request telemetry singleton.
import { metrics, metricsViewHtml } from "./observability/metrics-collector.js";
// MCP-CONCURRENCY-HARDEN (slot golf 2026-06-09): bounded-concurrency gate for /mcp.
import { RequestSemaphore, acquireRequestSlot, resolveMcpCapacity } from "./mcp/request-semaphore.js";
// BATCH 2 DONE: dataDispatcher imported above with other tool imports

// Phase 2A Batch 3: Quick Wins (9 dispatchers, 61 tools → 9)
import { registerOmegaDispatcher } from "./tools/dispatchers/omegaDispatcher.js";
import { registerValidationDispatcher } from "./tools/dispatchers/validationDispatcher.js";
import { registerDocumentDispatcher } from "./tools/dispatchers/documentDispatcher.js";
import { registerInboxDispatcher } from "./tools/dispatchers/inboxDispatcher.js";
import { registerIntakeDispatcher } from "./tools/dispatchers/intakeDispatcher.js";
import { createIntakeRouter } from "./routes/intake.js";
import { createBillingWebhookRouter } from "./routes/billing.js";
import { registerRalphDispatcher } from "./tools/dispatchers/ralphDispatcher.js";
import { registerKnowledgeDispatcher } from "./tools/dispatchers/knowledgeDispatcher.js";
import { registerDevDispatcher } from "./tools/dispatchers/devDispatcher.js";
import { registerQuotingDispatcher } from "./tools/dispatchers/quotingDispatcher.js";
import { registerGsdDispatcher } from "./tools/dispatchers/gsdDispatcher.js";
import { registerManusDispatcher } from "./tools/dispatchers/manusDispatcher.js";
import { registerAutoPilotDispatcher } from "./tools/dispatchers/autoPilotDispatcher.js";
import { registerCimcoDispatcher } from "./tools/dispatchers/cimcoDispatcher.js"; // prism_cimco — CIMCO verification/sim oracle (CIMCO-INTEGRATION-MS0)
import { registerHermesDispatcher } from "./tools/dispatchers/hermesDispatcher.js"; // prism_hermes -- Hermes Agent CLI bridge (CC <-> Hermes, sandboxed)

// Phase 2B: Dispatcher Imports (128 tools → 8 dispatchers)
import { registerOrchestrationDispatcher } from "./tools/dispatchers/orchestrationDispatcher.js";
import { registerHookDispatcher } from "./tools/dispatchers/hookDispatcher.js";
import { registerSpDispatcher } from "./tools/dispatchers/spDispatcher.js";
import { registerContextDispatcher } from "./tools/dispatchers/contextDispatcher.js";
import { registerSessionDispatcher } from "./tools/dispatchers/sessionDispatcher.js";
import { registerSkillScriptDispatcher } from "./tools/dispatchers/skillScriptDispatcher.js";
import { registerGeneratorDispatcher } from "./tools/dispatchers/generatorDispatcher.js";
import { registerGuardDispatcher } from "./tools/dispatchers/guardDispatcher.js";

// ATCS: Autonomous Task Completion System (Dispatcher #23)
import { registerAtcsDispatcher } from "./tools/dispatchers/atcsDispatcher.js";

// AUTONOMOUS: Autonomous Execution Engine (Dispatcher #24) — bridges ATCS + AgentExecutor
import { registerAutonomousDispatcher } from "./tools/dispatchers/autonomousDispatcher.js";

// TELEMETRY: Dispatcher Telemetry & Self-Optimization (Dispatcher #25) — F3
import { registerTelemetryDispatcher } from "./tools/dispatchers/telemetryDispatcher.js";
import { telemetryEngine } from "./engines/TelemetryEngine.js";

// PFP: Predictive Failure Prevention (Dispatcher #26) — F1
import { registerPFPDispatcher } from "./tools/dispatchers/pfpDispatcher.js";
import { pfpEngine } from "./engines/PFPEngine.js";

// MEMORY GRAPH: Cross-Session Memory (Dispatcher #27) — F2
import { registerMemoryDispatcher } from "./tools/dispatchers/memoryDispatcher.js";
// MCP-BOOT-FIX (2026-06-13, slot:bravo): registerAIDispatcher import removed -- it duplicated the
// "prism_ai" tool name owned by registerAIReasoningDispatcher and crashed boot under the stricter SDK.
// aiDispatcher.ts preserved on disk, just no longer registered. See bindDispatchers() for full note.
import { registerClaudeAccountDispatcher } from "./tools/dispatchers/claudeAccountDispatcher.js";
import { memoryGraphEngine } from "./engines/MemoryGraphEngine.js";

// CERTIFICATES: Formal Verification (auto-generated) — F4
import { certificateEngine } from "./engines/CertificateEngine.js";

// NL HOOK AUTHORING: Natural Language → Live Hooks (Dispatcher #28) — F6
import { registerNLHookDispatcher } from "./tools/dispatchers/nlHookDispatcher.js";

// COMPLIANCE-AS-CODE: Regulatory Templates (Dispatcher #29) — F8
import { registerComplianceDispatcher } from "./tools/dispatchers/complianceDispatcher.js";

// MULTI-TENANT: Tenant Isolation + Shared Learning Bus (Dispatcher #30) — F5
import { registerTenantDispatcher } from "./tools/dispatchers/tenantDispatcher.js";

// PROTOCOL BRIDGE: Multi-protocol Gateway (Dispatcher #31) — F7
import { registerBridgeDispatcher } from "./tools/dispatchers/bridgeDispatcher.js";
import { protocolBridgeEngine } from "./engines/ProtocolBridgeEngine.js";

// INFRA-1-2: Infrastructure Observability Dispatcher
import { registerInfraDispatcher } from "./tools/dispatchers/infraDispatcher.js";

// R3: Intelligence Engine — Compound Actions (Dispatcher #32)
import { registerIntelligenceDispatcher } from "./tools/dispatchers/intelligenceDispatcher.js";

// AI Reasoning — Claude-powered intelligence across all features (Dispatcher #83)
import { registerAIReasoningDispatcher } from "./tools/dispatchers/aiReasoningDispatcher.js";

// OUTCOME: Closed-loop learning backbone — 40 actions, 8 engines (PSN-SYNERGY/OUTCOME-WIRING)
import { registerOutcomeDispatcher } from "./tools/dispatchers/outcomeDispatcher.js";

// SHOP: Shop-floor operations — 53 actions, 8 engines (PSN-SYNERGY/SHOP-WIRING)
import { registerShopDispatcher } from "./tools/dispatchers/shopDispatcher.js";

// PROCESS: Process-domain intelligence — 18 actions, 7 engines (PSN-SYNERGY/PROCESS-WIRING)
import { registerProcessDispatcher } from "./tools/dispatchers/processDispatcher.js";

// MULTI: Multi-* domain (coordinator, knowledge, pareto, path, setup, rollback, spindle, turret, cam-strategy) — 49 actions, 9 engines (PSN-SYNERGY/MULTI-WIRING)
import { registerMultiDispatcher } from "./tools/dispatchers/multiDispatcher.js";

// Agent — AGENT-MS1-5 unified agent surface (chat, memory, capabilities, context)
import { registerAgentDispatcher } from "./tools/dispatchers/agentDispatcher.js"; // prism_agent (re-registered: file present, NOT-ON-THIS-BRANCH stale -- tango DISCOVERY-EFFICIENCY)

// SYS-MS1: Product Dispatcher — 40 actions extracted from intelligence (Dispatcher #46)
import { registerProductDispatcher } from "./tools/dispatchers/productDispatcher.js";

// SYS-MS1: Machine Live Dispatcher — 40 actions extracted from intelligence (Dispatcher #47)
import { registerMachineLiveDispatcher } from "./tools/dispatchers/machineLiveDispatcher.js";

// SYS-MS1: Integration Dispatcher — 42 actions extracted from intelligence (Dispatcher #48)
import { registerIntegrationDispatcher } from "./tools/dispatchers/integrationDispatcher.js";

// SYS-MS1: Knowledge Extension Dispatcher — 40 actions extracted from intelligence (Dispatcher #49)
import { registerKnowledgeExtDispatcher } from "./tools/dispatchers/knowledgeExtDispatcher.js";

// SYS-MS1: Diagnosis Dispatcher — 38 actions extracted from intelligence (Dispatcher #50)
import { registerDiagnosisDispatcher } from "./tools/dispatchers/diagnosisDispatcher.js";

// CC-EXT-MS0: Document Learning Dispatcher — PDF/notes/article knowledge extraction (Dispatcher #51)
import { registerDocumentLearningDispatcher } from "./tools/dispatchers/documentLearningDispatcher.js";

// CC-MS6: Shop Practice Dispatcher — practice KB, trouble trees, material tips (Dispatcher #52)
import { registerShopPracticeDispatcher } from "./tools/dispatchers/shopPracticeDispatcher.js";

// VL-MS0: Video Learning Engine — direct video file learning (audio + vision)
import { videoLearningEngine } from "./engines/VideoLearningEngine.js";

// L2: Monolith Engine Ports — 8 engines, 34 actions (Dispatcher #33)
import { registerL2EngineDispatcher } from "./tools/dispatchers/l2EngineDispatcher.js";

// L3: New Core Dispatchers — 6 dispatchers, 51 actions (#34-#39)
import { registerCadDispatcher } from "./tools/dispatchers/cadDispatcher.js";
import { registerCADRegressionDispatcher } from "./tools/dispatchers/cadRegressionDispatcher.js";
import { registerCamDispatcher } from "./tools/dispatchers/camDispatcher.js";
import { registerQualityDispatcher } from "./tools/dispatchers/qualityDispatcher.js";
import { registerProcessControlDispatcher } from "./tools/dispatchers/processControlDispatcher.js";
import { registerSchedulingDispatcher } from "./tools/dispatchers/schedulingDispatcher.js";
import { registerBusinessDispatcher } from "./tools/dispatchers/businessDispatcher.js";
import { registerOperatingSystemDispatcher } from "./tools/dispatchers/operatingSystemDispatcher.js";
import { registerMonitoringDispatcher } from "./tools/dispatchers/monitoringDispatcher.js";
import { registerAuthDispatcher } from "./tools/dispatchers/authDispatcher.js";
import { registerResourceHarvesterDispatcher } from "./tools/dispatchers/resourceHarvesterDispatcher.js";
import { registerResourceHarvestingDispatcher } from "./tools/dispatchers/resourceHarvestingDispatcher.js"; // prism_resource_harvesting (re-registered -- tango)
import { registerExportDispatcher } from "./tools/dispatchers/exportDispatcher.js";
// Dormant dispatchers registered by tango DISCOVERY-EFFICIENCY (files present, never wired into index.ts):
import { registerMLDispatcher } from "./tools/dispatchers/mlDispatcher.js"; // prism_ml -- 100 actions
import { registerLocalDispatcher } from "./tools/dispatchers/localDispatcher.js"; // prism_local -- 20 actions
import { registerResourceExtractionDispatcher } from "./tools/dispatchers/resourceExtractionDispatcher.js"; // prism_resource_extraction -- 14 actions
import { registerAlgorithmDispatcher } from "./tools/dispatchers/algorithmDispatcher.js"; // prism_algorithm -- 35 actions (dispatcher present, never wired into index.ts)
import { registerUnwiredBridgeDispatcher } from "./tools/dispatchers/unwiredBridgeDispatcher.js"; // prism_unwired_bridge -- 10 actions (tango discovery bridge, dormant)

// L3: PASS2 Specialty Dispatchers — 6 dispatchers, 28 actions (#40-#45)
import { registerTurningDispatcher } from "./tools/dispatchers/turningDispatcher.js";
import { registerFiveAxisDispatcher } from "./tools/dispatchers/fiveAxisDispatcher.js";
import { registerMillDispatcher } from "./tools/dispatchers/millDispatcher.js"; // MILL-MASTER-P1-U01
import { registerEdmDispatcher } from "./tools/dispatchers/edmDispatcher.js";
import { registerGrindingDispatcher } from "./tools/dispatchers/grindingDispatcher.js";
import { registerIndustryDispatcher } from "./tools/dispatchers/industryDispatcher.js";
import { registerAutomationDispatcher } from "./tools/dispatchers/automationDispatcher.js";

// RT-MS1: Real-Time WebSocket Dispatcher (Dispatcher #55)
import { registerRealtimeDispatcher } from "./tools/dispatchers/realtimeDispatcher.js";
import { systemVariabilityIndexEngine } from "./engines/SystemVariabilityIndexEngine.js";

// Phase 6-2: Parts Library & File Storage (Dispatcher #78)
import { registerPartsLibraryDispatcher } from "./tools/dispatchers/partsLibraryDispatcher.js";

// SCI-MS1: Adaptive Control — 12 actions (Dispatcher #56)
import { registerAdaptiveControlDispatcher } from "./tools/dispatchers/adaptiveControlDispatcher.js";
// CAMK-MS3: Multi-Operation Orchestration — 7 actions (Dispatcher #57)
import { registerMultiOpDispatcher } from "./tools/dispatchers/multiOpDispatcher.js";
// SCI-MS3: Scientific Mathematics — 5 actions (Dispatcher #58)
import { registerScientificMathDispatcher } from "./tools/dispatchers/scientificMathDispatcher.js";

// WIRING-AUDIT: 8 new dispatchers — 192 actions wiring 190 previously-unwired engines
import { registerCncOpsDispatcher } from "./tools/dispatchers/cncOpsDispatcher.js";
import { registerMachineSetupDispatcher } from "./tools/dispatchers/machineSetupDispatcher.js";
import { registerVibrationPhysicsDispatcher } from "./tools/dispatchers/vibrationPhysicsDispatcher.js";
import { registerMaterialProcessingDispatcher } from "./tools/dispatchers/materialProcessingDispatcher.js";
import { registerWeldingJoiningDispatcher } from "./tools/dispatchers/weldingJoiningDispatcher.js";
import { registerFormingCastingDispatcher } from "./tools/dispatchers/formingCastingDispatcher.js";
import { registerMechanicalDesignDispatcher } from "./tools/dispatchers/mechanicalDesignDispatcher.js";
import { registerFluidThermalDispatcher } from "./tools/dispatchers/fluidThermalDispatcher.js";
// PIPE-MS2: Print-to-Program pipeline dispatchers
import { registerTurningProgramDispatcher } from "./tools/dispatchers/turningProgramDispatcher.js";
import { registerMultiAxisProgramDispatcher } from "./tools/dispatchers/multiAxisProgramDispatcher.js";
import { registerHolePatternDispatcher } from "./tools/dispatchers/holePatternDispatcher.js";
import { registerMachiningKnowledgeBaseDispatcher } from "./tools/dispatchers/machiningKnowledgeBaseDispatcher.js";
import { registerThreadingPipelineDispatcher } from "./tools/dispatchers/threadingPipelineDispatcher.js";
import { registerSecondaryOpsDispatcher } from "./tools/dispatchers/secondaryOpsDispatcher.js";
import { registerCADDrawingKnowledgeDispatcher } from "./tools/dispatchers/cadDrawingKnowledgeDispatcher.js";

// L0-B1: Previously unregistered dispatchers
import { registerFeasibilityDispatcher } from "./tools/dispatchers/feasibilityDispatcher.js";
import { registerProvenPipelineDispatcher } from "./tools/dispatchers/provenPipelineDispatcher.js";

// PP-DISPATCHER: Dedicated PostProcessor dispatcher (prism_pp) -- 807 actions.
// Re-enabled by ECHO-FINALIZE-MS0/U-PP-DISPATCHER-REGISTER (2026-06-10): the "NOT ON THIS BRANCH"
// guard was a stale branch-scoping artifact (file grew 50->807 cases; all 150 lazy engines present).
import { registerPPDispatcher } from "./tools/dispatchers/ppDispatcher.js";

// SYNERGY: Cross-feature integration wiring — F1↔F8
import { initSynergies } from "./tools/synergyIntegration.js";

// ENHANCEMENT 1: Risk Tier Classification (Claude Code architecture pattern)
import { DISPATCHER_RISK_TIERS, getDispatcherRiskTier, riskTierToAnnotation } from "./types/RiskTier.js";

// ENHANCEMENT 4: Error Remediation — learned failure patterns
import { errorRemediationEngine } from "./engines/ErrorRemediationEngine.js";

// ENHANCEMENT 6: Memory Consolidation — background pattern distillation
import { memoryConsolidationEngine } from "./engines/MemoryConsolidationEngine.js";

// NEW: Auto-Hook Wrapper (Λ/Φ safety validation on calc tools)
import { wrapToolWithAutoHooks, wrapWithUniversalHooks, getDispatchCount, AUTO_HOOK_CONFIG, registerAutoHookTools } from "./tools/autoHookWrapper.js";

// NEW: Domain Hook Registration — bridges 112 hooks → HookExecutor
import { registerDomainHooks } from "./hooks/hookRegistration.js";

// Import registry manager for initialization
import { registryManager } from "./registries/index.js";

// Load environment variables
dotenv.config({ quiet: true });

// ============================================================================
// CORE SOURCE FILE CATALOG — 16 LOW-priority core infrastructure modules
// Wired 2026-02-23 from MASTER_EXTRACTION_INDEX_V2 (P-MS5 Wave 4)
// These are foundational bootstrap, orchestration, and config modules
// that the index.ts entry point orchestrates.
// Total: 16 files, 6,237 lines
// ============================================================================

export const CORE_SOURCE_FILE_CATALOG: Record<string, {
  filename: string;
  source_dir: string;
  category: string;
  lines: number;
  safety_class: "LOW";
  description: string;
}> = {
  // --- core/ category: bootstrap, config, orchestration, workflow ---
  'EXT-067': {
    filename: "PRISM_CAPABILITY_REGISTRY.js",
    source_dir: "extracted/core",
    category: "core",
    lines: 194,
    safety_class: "LOW",
    description: "Capability registry — dynamic feature/capability advertisement and discovery for engine self-registration.",
  },
  'EXT-068': {
    filename: "PRISM_CONSTANTS.js",
    source_dir: "extracted/core",
    category: "core",
    lines: 2461,
    safety_class: "LOW",
    description: "Core constants — ISO material groups, tool types, coatings, machine families, and lookup tables used across all engines.",
  },
  'EXT-069': {
    filename: "PRISM_ENHANCED_MASTER_ORCHESTRATOR.js",
    source_dir: "extracted/core",
    category: "core",
    lines: 355,
    safety_class: "LOW",
    description: "Enhanced master orchestrator — multi-step manufacturing workflow coordination with retry and checkpoint logic.",
  },
  'EXT-070': {
    filename: "PRISM_ENHANCEMENTS.js",
    source_dir: "extracted/core",
    category: "core",
    lines: 60,
    safety_class: "LOW",
    description: "Core enhancements — feature flag toggles and incremental improvement patches for the PRISM platform.",
  },
  'EXT-071': {
    filename: "PRISM_MASTER.js",
    source_dir: "extracted/core",
    category: "core",
    lines: 215,
    safety_class: "LOW",
    description: "Master module — top-level PRISM initialization, module wiring, and startup sequence coordinator.",
  },
  'EXT-072': {
    filename: "PRISM_MASTER_DB.js",
    source_dir: "extracted/core",
    category: "core",
    lines: 131,
    safety_class: "LOW",
    description: "Master database — central data-source registry connecting file-based and in-memory stores.",
  },
  'EXT-073': {
    filename: "PRISM_MASTER_ORCHESTRATOR.js",
    source_dir: "extracted/core",
    category: "core",
    lines: 696,
    safety_class: "LOW",
    description: "Master orchestrator — primary workflow engine coordinating multi-engine manufacturing pipelines.",
  },
  'EXT-074': {
    filename: "PRISM_MASTER_TOOLPATH_REGISTRY.js",
    source_dir: "extracted/core",
    category: "core",
    lines: 612,
    safety_class: "LOW",
    description: "Master toolpath registry — central catalog of toolpath strategies with selection heuristics and constraints.",
  },
  'EXT-075': {
    filename: "PRISM_PARAM_ENGINE.js",
    source_dir: "extracted/core",
    category: "core",
    lines: 10,
    safety_class: "LOW",
    description: "Parameter engine stub — lightweight parameter resolution entry point for the core bootstrap chain.",
  },
  'EXT-076': {
    filename: "PRISM_UNIFIED_WORKFLOW.js",
    source_dir: "extracted/core",
    category: "core",
    lines: 145,
    safety_class: "LOW",
    description: "Unified workflow — single-entry-point workflow executor merging planning, calculation, and validation stages.",
  },
  'EXT-077': {
    filename: "PRISM_WORKFLOW_ORCHESTRATOR_V2.js",
    source_dir: "extracted/core",
    category: "core",
    lines: 223,
    safety_class: "LOW",
    description: "Workflow orchestrator V2 — DAG-based task scheduler with parallel execution and dependency resolution.",
  },

  // --- engines/core subcategory: core engine infrastructure ---
  'EXT-235': {
    filename: "PRISM_ENHANCED_ORCHESTRATION_ENGINE.js",
    source_dir: "extracted/engines/core",
    category: "engines",
    lines: 452,
    safety_class: "LOW",
    description: "Enhanced orchestration engine — event-driven multi-engine coordination with health monitoring and fallback routing.",
  },
  'EXT-236': {
    filename: "PRISM_FAILSAFE_GENERATOR.js",
    source_dir: "extracted/engines/core",
    category: "engines",
    lines: 169,
    safety_class: "LOW",
    description: "Failsafe generator — automatic safe-default parameter generation when primary calculation engines fail.",
  },
  'EXT-237': {
    filename: "PRISM_INTERVAL_ENGINE.js",
    source_dir: "extracted/engines/core",
    category: "engines",
    lines: 847,
    safety_class: "LOW",
    description: "Interval engine — interval arithmetic for uncertainty propagation through manufacturing calculation chains.",
  },
  'EXT-238': {
    filename: "PRISM_NUMERICAL_ENGINE.js",
    source_dir: "extracted/engines/core",
    category: "engines",
    lines: 19,
    safety_class: "LOW",
    description: "Numerical engine stub — lightweight numerical computation entry point for the core engine chain.",
  },
  'EXT-239': {
    filename: "PRISM_UNIFIED_OUTPUT_ENGINE.js",
    source_dir: "extracted/engines/core",
    category: "engines",
    lines: 195,
    safety_class: "LOW",
    description: "Unified output engine — standardized result formatting, unit labeling, and safety annotation for all engine outputs.",
  },
};

// ============================================================================
// SERVER INITIALIZATION
// ============================================================================

const server = new McpServer({
  name: SERVER_NAME,
  version: SERVER_VERSION
});

// MCP-CONCURRENCY-FIX (2026-05-31): the official MCP SDK enforces ONE transport per
// McpServer instance (sdk/shared/protocol.js:217 — "Already connected to a transport").
// The HTTP /mcp handler used to call server.connect(transport) on this MODULE-LEVEL
// shared server per request; two overlapping requests collided and the 2nd threw before
// handleRequest, leaving the client with NO response → "MCP DISCONNECTED". Fix: build a
// FRESH McpServer per /mcp request (SDK stateless pattern). bootstrapServices() runs the
// heavy global I/O ONCE; bindDispatchers() is side-effect-free tool registration that runs
// per-server; postBindOnce() runs the once-per-process tail (bridge handler, SVI, synergies,
// startup event) against the shared server (still needed for REST routes + /health + bridge).
let _bootstrapped = false;
let _postBindDone = false;

/** Internal access to McpServer internals for proxy/routing */
type McpServerInternal = McpServer & {
  tool: (...args: unknown[]) => unknown;
  _registeredTools?: Map<string, { callback: (args: Record<string, unknown>) => Promise<{ content?: Array<{ text?: string }> }> }>;
};

// ============================================================================
// TOOL REGISTRATION
// ============================================================================

/**
 * GLOBAL one-time bootstrap — heavy I/O + process-level side effects.
 * Idempotent: a second call early-returns. MUST run exactly once per process
 * (registry/formula/machine load, XProc autofire, DB init+migrations+seed,
 * domain-hook registration, process-level engine inits).
 */
async function bootstrapServices(): Promise<void> {
  if (_bootstrapped) return;
  _bootstrapped = true;
  log.info("Bootstrapping PRISM services (one-time)...");

  // Initialize registries first
  log.info("Initializing data registries...");
  await registryManager.initialize();
  
  // Session 43+: Bootstrap full formula (490) and machine (824) registries from data files
  try {
    const { bootstrapRegistries } = require("../dist/tools/registryBootstrapper.js");
    const bootstrapReport = await bootstrapRegistries({
      formulaRegistry: registryManager.formulas,
      machineRegistry: registryManager.machines
    });
    log.info(`[BOOTSTRAP] Formulas: ${bootstrapReport.formulas.loaded} loaded, Machines: ${bootstrapReport.machines.loaded} loaded (${bootstrapReport.total_time_ms}ms)`);
  } catch (bootstrapErr: any) {
    log.warn(`[BOOTSTRAP] Registry bootstrap failed (non-fatal): ${bootstrapErr.message}`);
  }

  // XPROC-NEURAL-CONNECT-MS0/U-CN09: ignite the closed-loop learning system.
  // CN02–CN08 built the loop (NN auto-train + 4 fan-out bridges) but left it
  // inert — every switch was reachable only via an explicit dispatcher action.
  // This turns them all on at boot so the model learns from shop-floor outcomes
  // by default. Set PRISM_XPROC_AUTOFIRE=0 to leave the loop dormant.
  if (process.env.PRISM_XPROC_AUTOFIRE !== "0") {
    try {
      const { XProcNeuralAutoFireEngine } = await import("./engines/XProcNeuralAutoFireEngine.js");
      const r = XProcNeuralAutoFireEngine.activate();
      const enabled = r.components.filter((c) => c.action === "enabled").map((c) => c.key);
      log.info(
        `[XPROC-AUTOFIRE] closed-loop learning ${r.ok ? "active" : "active (with errors)"} — ` +
        `enabled=[${enabled.join(", ")}]${r.errors > 0 ? `, errors=${r.errors}` : ""}`,
      );
    } catch (autofireErr: unknown) {
      const msg = autofireErr instanceof Error ? autofireErr.message : String(autofireErr);
      log.warn(`[XPROC-AUTOFIRE] activation failed (non-fatal): ${msg}`);
    }
  } else {
    log.info("[XPROC-AUTOFIRE] disabled via PRISM_XPROC_AUTOFIRE=0 — closed-loop learning dormant");
  }

  // INFRA-1-2: Database initialization (graceful — server always starts without DB)
  try {
    const { db } = await import("./db/connection.js");
    const connected = await db.connect();
    if (connected) {
      log.info("[INFRA] PostgreSQL connected — running migrations...");
      const { runMigrations } = await import("./db/migration-runner.js");
      await runMigrations(db);
      log.info("[INFRA] Seeding registries to Postgres...");
      const { seedAndVerify } = await import("./db/RegistrySeeder.js");
      const seedReport = await seedAndVerify();
      log.info(`[INFRA] Registry seed: ${seedReport.totalSeeded} records, ${seedReport.totalErrors} errors, round-trip=${seedReport.roundTripOk ? "PASS" : "FAIL"}`);
      const { persistenceBridge } = await import("./db/PersistenceBridge.js");
      await persistenceBridge.loadAll();
      log.info("[INFRA] PersistenceBridge initialized");
    } else {
      log.info("[INFRA] No PostgreSQL — running in-memory mode");
    }
  } catch (infraErr: any) {
    log.warn(`[INFRA] DB initialization skipped (non-fatal): ${infraErr.message}`);
  }

  // Register 112 domain hooks with HookExecutor engine
  try {
    const hookResult = registerDomainHooks();
    log.info(`[HOOKS] Domain hooks: ${hookResult.registered} registered, ${hookResult.skipped} skipped`);
  } catch (hookErr: any) {
    log.warn(`[HOOKS] Domain hook registration failed (non-fatal): ${hookErr.message}`);
  }

  // Process-level engine inits — hoisted out of the per-server binding region
  // (these are NOT per-server and must not re-run on every /mcp request).
  try { telemetryEngine?.init(); } catch (e) { log.warn(`[INIT] TelemetryEngine skipped: ${(e as Error).message}`); }
  try { pfpEngine?.init(); } catch (e) { log.warn(`[INIT] PFPEngine skipped: ${(e as Error).message}`); }
  try { memoryGraphEngine?.init(); } catch (e) { log.warn(`[INIT] MemoryGraphEngine skipped: ${(e as Error).message}`); }
  try { certificateEngine?.init(); } catch (e) { log.warn(`[INIT] CertificateEngine skipped: ${(e as Error).message}`); }
}

/**
 * Per-server tool BINDING — side-effect-free beyond server.tool(...) registration.
 * Safe to call ONCE on the shared server (REST + /health + bridge) AND repeatedly
 * on fresh per-request servers built by buildRequestServer(). The temporary
 * server.tool proxy is installed and restored within this function, scoped to the
 * passed `server`, so concurrent calls on distinct server instances never interfere.
 */
async function bindDispatchers(server: McpServer): Promise<void> {
  // =========================================================================
  // UNIVERSAL AUTO-HOOK PROXY: Wraps ALL prism_* dispatchers with:
  //   1. Before/after dispatch hooks (DISPATCH-ACTION-VALIDATE, DISPATCH-PERF-TRACK)
  //   2. Category-specific hooks (CALC, FILE, STATE, AGENT, FORMULA)
  //   3. Error capture → REFL-002
  //   4. Cadence enforcement (todo@5, checkpoint@10, buffer zone warnings)
  //   5. Λ(x)/Φ(x) safety validation on calc tools specifically
  // =========================================================================
  const calcToolSet = new Set(AUTO_HOOK_CONFIG.calcTools);
  calcToolSet.add("prism_calc");
  let autoHookCount = 0;
  let universalHookCount = 0;
  
  const originalTool: (...a: any[]) => any = server.tool.bind(server);
  const proxiedTool = function(...args: any[]) {
    const toolName = args[0];
    
    if (typeof toolName === 'string' && toolName.startsWith('prism_')) {
      const handlerIndex = args.length - 1;
      const originalHandler = args[handlerIndex];
      
      if (typeof originalHandler === 'function') {
        // ALL prism_* tools get universal hooks (before/after, cadence, error capture)
        let wrapped = wrapWithUniversalHooks(toolName, originalHandler);
        universalHookCount++;
        
        // Calc tools ALSO get Λ(x)/Φ(x) safety validation layered on top
        if (calcToolSet.has(toolName)) {
          wrapped = wrapToolWithAutoHooks(toolName, wrapped);
          autoHookCount++;
          log.debug(`[AUTO-HOOK] Wrapped: ${toolName} with UNIVERSAL + Λ(x)/Φ(x) safety validation`);
        } else {
          log.debug(`[AUTO-HOOK] Wrapped: ${toolName} with UNIVERSAL hooks (before/after/cadence/error)`);
        }
        
        args[handlerIndex] = wrapped;
      }
    }

    // MCP-DEDUP guard (2026-06-13, slot:bravo): @modelcontextprotocol/sdk drifted 1.27.1 -> 1.29.0
    // through the unpinned caret in package.json. 1.29.0's tool() HARD-THROWS
    // "Tool <name> is already registered" where the previously-installed version silently
    // overwrote (last-wins). Several dispatchers have long registered the SAME tool name
    // (verified: prism_ai via aiDispatcher+aiReasoningDispatcher; prism_auth via Auth+ClaudeAccount),
    // which had been harmless for 3+ weeks of boots -- the drift turned every such collision into a
    // fleet-wide boot crash. Restore the historical last-wins behavior (delete the prior entry so the
    // later registration overwrites) AND surface each duplicate LOUDLY so the offending dispatcher
    // pair can be cleaned up properly, instead of crashing the whole server on a name collision.
    // NOTE: both known collisions are now ALSO fixed at source this commit (aiDispatcher unwired;
    // claudeAccountDispatcher renamed prism_auth -> prism_claude_account), so this guard now stands
    // as a forward safety-net + early-warning for any FUTURE accidental duplicate tool name.
    if (typeof toolName === 'string') {
      const registry = (server as any)._registeredTools;
      if (registry && registry[toolName]) {
        delete registry[toolName];
        log.warn(`[MCP-DEDUP] tool "${toolName}" registered more than once -- keeping the latest (last-wins, matches pre-1.29.0 SDK behavior). A duplicate dispatcher still claims this name; clean up the redundant registration.`);
      }
    }

    return originalTool(...args);
  };
  
  // Replace server.tool with our proxy for the duration of registration
  (server as any).tool = proxiedTool;

  // Data Access (14 actions)
  registerDataDispatcher(server);
  
  // Orchestration + Swarm (14 actions)
  registerOrchestrationDispatcher(server);
  
  // Hook & Event Management (18 actions)
  registerHookDispatcher(server);
  
  // Skills + Scripts + Knowledge V2 (23 actions)
  registerSkillScriptDispatcher(server);
  
  // Manufacturing Calculations (21 actions) — Hooked: pre/post-calculation
  registerCalcDispatcher(server);

  // CIMCO Edit 2026 + Machine Simulation bridge (6 actions) — fleet program/post verification + sim oracle
  registerCimcoDispatcher(server);

  // Hermes Agent (Nous Research) CLI bridge (7 actions) -- CC <-> Hermes, sandboxed + mock-by-default
  registerHermesDispatcher(server);

  // Session State + Lifecycle (20 actions) — Hooked: lifecycle events
  registerSessionDispatcher(server);
  
  // Generator (6 actions)
  registerGeneratorDispatcher(server);
  
  // Validation (13 actions)
  registerValidationDispatcher(server);

  // Adaptive Control (12 actions — SCI-MS1)
  registerAdaptiveControlDispatcher(server);

  // Multi-Op Orchestration (7 actions — CAMK-MS3)
  registerMultiOpDispatcher(server);

  // Scientific Math (5 actions — SCI-MS3)
  registerScientificMathDispatcher(server);

  // Omega Quality (5 actions)
  registerOmegaDispatcher(server);
  
  // Manus Integration (11 actions)
  registerManusDispatcher(server);
  
  // Development Protocol / Superpowers (17 actions)
  registerSpDispatcher(server);
  
  // Context Engineering (14 actions)
  registerContextDispatcher(server);
  
  // GSD (6 actions)
  registerGsdDispatcher(server);
  
  // Safety-Critical (29 actions) — SAFETY CRITICAL
  registerSafetyDispatcher(server);
  
  // Threading (12 actions) — Hooked: pre/post-calculation + pre/post-code-generate
  registerThreadDispatcher(server);
  
  // Knowledge Query (5 actions)
  registerKnowledgeDispatcher(server);
  
  // Toolpath Strategy (8 actions) — Hooked: pre/post-calculation
  registerToolpathDispatcher(server);
  
  // AutoPilot (5+ actions)
  registerAutoPilotDispatcher(server);
  
  // Ralph Loop Validation (3 actions)
  registerRalphDispatcher(server);
  
  // Document Management (7 actions) — Hooked: pre/post-file-write
  registerDocumentDispatcher(server);

  // DocuRead Inbox (8 actions) — Document intake, classification, part matching
  registerInboxDispatcher(server);
  // OBSIDIAN-COMPOUND-MS1/S3/U-CAPTURE-WEBHOOK
  registerIntakeDispatcher(server);
  
  // Dev Workflow (7 actions)
  registerDevDispatcher(server);

  // QUOTING-PIPELINE-MS0 / U-QP08 — camera-intake + insert-catalog + service-tag + parts BOM + vendor pricing + live chat
  registerQuotingDispatcher(server);
  
  // Guard: Reasoning + Enforcement + AutoHook (8 actions)
  registerGuardDispatcher(server);
  
  // ATCS: Autonomous Task Completion (10 actions)
  registerAtcsDispatcher(server);
  
  // Autonomous Execution Engine (8 actions)
  registerAutonomousDispatcher(server);
  
  // F3: Telemetry & Self-Optimization (7 actions)
  registerTelemetryDispatcher(server);
  
  // F1: Predictive Failure Prevention (6 actions)
  registerPFPDispatcher(server);
  // NOTE: telemetryEngine/pfpEngine .init() moved to bootstrapServices() (process-level, once-only).

  // F2: Cross-Session Memory Graph (6 actions)
  registerMemoryDispatcher(server);
  // MCP-BOOT-FIX (2026-06-13, slot:bravo): removed the duplicate `registerAIDispatcher(server)` here.
  // It registered the SAME MCP tool name "prism_ai" as registerAIReasoningDispatcher (the canonical
  // 12-action dispatcher, below). The @modelcontextprotocol/sdk now HARD-THROWS
  // "Tool prism_ai is already registered" on the 2nd registration (previously silent last-wins),
  // crashing boot fleet-wide (verified in .claude/cache/mcp-daemon.log). aiDispatcher.ts is a stub
  // ("would normally call the Python ModelRouterEngine; for now return a structured decision") and
  // was already overwritten at runtime by the reasoning dispatcher (last-wins), so removing its
  // registration is behavior-preserving. File preserved on disk (asset-preservation), just unwired.
  registerClaudeAccountDispatcher(server);
  // NOTE: memoryGraphEngine/certificateEngine .init() moved to bootstrapServices() (process-level, once-only).

  // F6: Natural Language Hook Authoring (8 actions)
  registerNLHookDispatcher(server);

  // F8: Compliance-as-Code Templates (8 actions)
  registerComplianceDispatcher(server);

  // F5: Multi-Tenant Isolation + Shared Learning Bus (15 actions)
  registerTenantDispatcher(server);

  // F7: Protocol Bridge — Multi-protocol Gateway (13 actions)
  registerBridgeDispatcher(server);

  // INFRA-1-2: Infrastructure Observability (6 actions)
  registerInfraDispatcher(server);

  // R3: Intelligence Engine — Compound Manufacturing Actions (11 actions)
  registerIntelligenceDispatcher(server);

  // AI Reasoning — Claude-powered intelligence across all features (12 actions)
  registerAIReasoningDispatcher(server);

  // OUTCOME: Closed-loop learning backbone — 40 actions, 8 engines (PSN-SYNERGY/OUTCOME-WIRING)
  registerOutcomeDispatcher(server);

  // SHOP: Shop-floor operations — 53 actions, 8 engines (PSN-SYNERGY/SHOP-WIRING)
  registerShopDispatcher(server);

  // PROCESS: Process-domain intelligence — 18 actions, 7 engines (PSN-SYNERGY/PROCESS-WIRING)
  registerProcessDispatcher(server);

  // MULTI: Multi-* domain — 49 actions, 9 engines (PSN-SYNERGY/MULTI-WIRING)
  registerMultiDispatcher(server);

  // Agent — chat/memory/capabilities/context/self_awareness/stats (8 actions)
  registerAgentDispatcher(server); // prism_agent -- 11 actions (re-registered, tango DISCOVERY-EFFICIENCY)

  // SYS-MS1: Product Dispatcher — SFC, PPG, Shop, ACNC (40 actions)
  registerProductDispatcher(server);

  // SYS-MS1: Machine Live Dispatcher — connectivity, adaptive, maintenance, Industry 4.0 (40 actions)
  registerMachineLiveDispatcher(server);

  // SYS-MS1: Integration Dispatcher — CAM, DNC, ERP, mobile, measurement (42 actions)
  registerIntegrationDispatcher(server);

  // SYS-MS1: Knowledge Extension Dispatcher — apprentice, genome, graph, learning (40 actions)
  registerKnowledgeExtDispatcher(server);

  // SYS-MS1: Diagnosis Dispatcher — forensics, inverse, genplan, sustainability (38 actions)
  registerDiagnosisDispatcher(server);

  // L2: Monolith Engine Ports — 8 engines, 34 actions
  registerL2EngineDispatcher(server);

  // L3: New Core Dispatchers — 6 dispatchers, 51 actions
  registerCadDispatcher(server);
  // CAD-INFRA-MS0 U-CINF12: CAD Regression dispatcher — 25 actions (index, classify, run, checkpoint, triage, artifact, dashboard, analyzer, report)
  registerCADRegressionDispatcher(server);
  registerCamDispatcher(server);

  // PP-DISPATCHER: PostProcessor operations (prism_pp) -- 807 actions (generate, analyze, optimize,
  // validate, physics, neural, tribal, controller, kinematics). Re-enabled U-PP-DISPATCHER-REGISTER.
  registerPPDispatcher(server);
  registerQualityDispatcher(server);
  registerProcessControlDispatcher(server);
  registerSchedulingDispatcher(server);
  registerBusinessDispatcher(server);

  // Operating-System Shell + Desk + Program Release + Scheduling + Shop Floor (9 actions — Sprint C1)
  registerOperatingSystemDispatcher(server);
  registerMonitoringDispatcher(server);
  registerAuthDispatcher(server);
  registerResourceHarvesterDispatcher(server);
  registerResourceHarvestingDispatcher(server);       // prism_resource_harvesting -- 8 actions (re-registered, tango)
  registerExportDispatcher(server);
  // Dormant dispatchers registered by tango DISCOVERY-EFFICIENCY (153 dead MCP actions activated; all verified SAFE):
  registerMLDispatcher(server);                        // prism_ml -- 100 actions
  registerLocalDispatcher(server);                     // prism_local -- 20 actions
  registerResourceExtractionDispatcher(server);        // prism_resource_extraction -- 14 actions
  registerAlgorithmDispatcher(server);                 // prism_algorithm -- 35 actions (dormant dispatcher activated, tango)
  registerUnwiredBridgeDispatcher(server);             // prism_unwired_bridge -- 10 actions (tango discovery bridge activated)

  // L3-P1: PASS2 Specialty Dispatchers — 6 dispatchers, 28 actions
  registerTurningDispatcher(server);
  registerFiveAxisDispatcher(server);
  registerMillDispatcher(server); // MILL-MASTER-P1-U01: 46 actions, cohesion core via MillMasterOrchestratorFacadeEngine
  registerEdmDispatcher(server);
  registerGrindingDispatcher(server);
  registerIndustryDispatcher(server);
  registerAutomationDispatcher(server);

  // Phase 6-2: Parts Library & File Storage — 17 actions
  registerPartsLibraryDispatcher(server);

  // CC-EXT-MS0: Document Learning — 5 actions (doc_upload, doc_extract, doc_list, doc_get, doc_delete)
  registerDocumentLearningDispatcher(server);

  // CC-MS6: Shop Practice KB — 12 actions (practice_ingest/search/get/list/audit/recommend, tree_build/navigate/search, tips_add/get/conflicts)
  registerShopPracticeDispatcher(server);

  // RT-MS1: Real-Time WebSocket
  registerRealtimeDispatcher(server);

  // WIRING-AUDIT: 8 new dispatchers — 190 previously-unwired engines now accessible
  registerCncOpsDispatcher(server);         // 32 actions: ball endmill, chamfer, facing, slotting, threading, waterjet, plasma...
  registerMachineSetupDispatcher(server);   // 25 actions: spindle analysis, RTCP, warmup, fixture, press/shrink fit, gauging...
  registerVibrationPhysicsDispatcher(server); // 16 actions: VAM, chatter, Fourier, tribology, grinding, surface finish...
  registerMaterialProcessingDispatcher(server); // 11 actions: heat treat, anodizing, carburizing, nitriding, coating...
  registerWeldingJoiningDispatcher(server); // 6 actions: welding, brazing, adhesive bonding, ultrasonic, weld strength/distortion
  registerFormingCastingDispatcher(server); // 16 actions: press brake, stamping, extrusion, sheet nesting, tube forming...
  registerMechanicalDesignDispatcher(server); // 51 actions: gears, bearings, springs, bolts, shafts, cams, clutches...
  registerFluidThermalDispatcher(server);   // 35 actions: pumps, piping, hydraulics, heat exchangers, valves, compressors...
  // PIPE-MS2: Print-to-Program pipeline
  registerTurningProgramDispatcher(server);    // 2 actions: turning_print_to_program, turning_process_plan
  registerMultiAxisProgramDispatcher(server);  // 5 actions: multiaxis_print_to_program, multiaxis_process_plan, replicate_from_print, replicate_similarity_search, replicate_corpus_index
  registerHolePatternDispatcher(server);       // 3 actions: hole_pattern_program, hole_pattern_detect, hole_pattern_optimize
  registerMachiningKnowledgeBaseDispatcher(server); // 25 actions: kb_lookup_*/physics corrections/workholding/toolpath/stock/setups/magazine
  registerThreadingPipelineDispatcher(server);      // 3 actions: threading_pipeline, threading_plan, threading_pass_schedule
  registerSecondaryOpsDispatcher(server);           // 2 actions: secondary_ops_pipeline, secondary_ops_plan
  registerCADDrawingKnowledgeDispatcher(server);    // 11 actions: cad_select_gdt/datums/drawing/dfm/fit/macros
  registerFeasibilityDispatcher(server);             // L0-B1: feasibility check actions
  registerProvenPipelineDispatcher(server);           // L0-B1: proven pipeline actions

  log.info(`All PRISM tools registered: 64 dispatchers (1718+ actions)`);

  // MCP PRIMITIVES: Resources, Prompts, Logging, Tasks
  try {
    registerResources(server as unknown as import("@modelcontextprotocol/sdk/server/index.js").Server);
    registerPrompts(server as unknown as import("@modelcontextprotocol/sdk/server/index.js").Server);
    registerTaskTools(server as unknown as import("@modelcontextprotocol/sdk/server/index.js").Server);
    initMcpLogging();
    log.info("[MCP] Resources, Prompts, Tasks, and Logging initialized");
  } catch (mcpErr: any) {
    log.warn(`[MCP] Primitives init failed (non-fatal): ${mcpErr.message}`);
  }

  // ── ONCE-ONLY post-bind tail (MCP-CONCURRENCY-FIX) ──────────────────────────
  // Synergies, SVI auto-watch, the protocol-bridge dispatch handler (which captures the
  // SHARED server's _registeredTools), module-health, and the SYSTEM_STARTUP event are
  // PROCESS / shared-server-level side effects. They MUST run exactly once — on the shared
  // server's bindDispatchers() call — and must NOT re-run on the fresh per-request servers
  // built by buildRequestServer(). Guarded by _postBindDone (the first call = shared server).
  if (!_postBindDone) {
    _postBindDone = true;
  // F1-F8 SYNERGY: Wire cross-feature integrations
  try {
    const synResult = initSynergies();
    log.info(`[SYNERGY] ${synResult.integrations.length} integrations active`);
  } catch (e) { log.warn(`[SYNERGY] Init skipped: ${(e as Error).message}`); }

  try {
    const watchStatus = await systemVariabilityIndexEngine.startAutoWatch();
    log.info(`[SVI] Auto-watch started (${watchStatus.watch_targets} targets, owner=${watchStatus.owner ?? "none"})`);
  } catch (e) {
    log.warn(`[SVI] Auto-watch startup failed: ${(e as Error).message}`);
  }

  // C-005 FIX: Wire bridge dispatch handler for live routing to PRISM dispatchers
  protocolBridgeEngine.setDispatchHandler(async (dispatcher: string, action: string, params: Record<string, unknown>) => {
    const tool = (server as any)._registeredTools?.get(dispatcher);
    if (!tool) throw new Error(`Bridge routing failed: dispatcher '${dispatcher}' not registered`);
    const result = await tool.callback({ action, params });
    const text = result?.content?.[0]?.text;
    return text ? JSON.parse(text) : result;
  });
  log.info('[BRIDGE] Dispatch handler wired — live routing to all PRISM dispatchers enabled');

  // Restore original server.tool and report auto-hook stats
  (server as any).tool = originalTool;
  log.info(`[AUTO-HOOK] ${universalHookCount} dispatchers wrapped with UNIVERSAL hooks (before/after/cadence/error)`);
  log.info(`[AUTO-HOOK] ${autoHookCount} calculation tools wrapped with additional Λ(x)/Φ(x) safety validation`);
  log.info(`[AUTO-HOOK] Global dispatch counter active — cadence: todo@5, checkpoint@10, buffer zones enforced`);

  // C2 FIX: Eager module health check — surface lazy-load failures at startup
  const moduleChecks: Array<{ name: string; path: string }> = [
    { name: "AutoPilot", path: "./orchestration/AutoPilot.js" },
    { name: "AutoPilotV2", path: "./orchestration/AutoPilotV2.js" },
    { name: "KnowledgeQueryEngine", path: "./engines/KnowledgeQueryEngine.js" },
  ];
  const failed: string[] = [];
  for (const mod of moduleChecks) {
    try {
      require(mod.path);
    } catch (e) {
      failed.push(`${mod.name} (${(e as Error).message?.split("\n")[0]})`);
    }
  }
  if (failed.length > 0) {
    log.warn(`[HEALTH] ${failed.length} optional module(s) unavailable: ${failed.join(", ")}`);
  } else {
    log.info(`[HEALTH] All ${moduleChecks.length} lazy-loaded modules verified OK`);
  }

  // ENHANCEMENT 1: Log risk tier distribution
  {
    const tierCounts: Record<string, number> = {};
    for (const tier of Object.values(DISPATCHER_RISK_TIERS)) {
      tierCounts[tier] = (tierCounts[tier] || 0) + 1;
    }
    log.info(`[RISK-TIER] Distribution: ${Object.entries(tierCounts).map(([t, c]) => `${t}=${c}`).join(", ")}`);
  }

  // ENHANCEMENT 6: Memory consolidation — runs on session end via Stop hook
  // Just verify the engine loaded
  try {
    const stats = memoryConsolidationEngine.getStats();
    log.info(`[CONSOLIDATION] Loaded: ${stats.patternsCount} patterns, ${stats.totalConsolidations} runs, ${stats.sessionsSinceLast} sessions since last`);
  } catch (e) { log.warn(`[CONSOLIDATION] Init skipped: ${(e as Error).message}`); }

  // MS2: Emit system startup event for lifecycle hooks
  try {
    const { eventBus, EventTypes } = await import("./engines/EventBus.js");
    eventBus.publish(EventTypes.SYSTEM_STARTUP, {
      timestamp: new Date().toISOString(),
      dispatchers_registered: true,
    }, { category: "system", priority: "high", source: "index" });
  } catch { /* startup event is best-effort */ }

  // Reactive-chain subsystem boot (BACKEND-COMPLETION/U-REACTIVE-CHAINS-BOOT, slot:zulu).
  // reactiveChainBootstrap + cycleSchedulingBridge register their EventBus chains as a
  // module-load side effect, but nothing else imports them -- so without this they stay
  // DORMANT in prod. Gated default-OFF (PRISM_REACTIVE_CHAINS_ENABLE=1): some chains
  // auto-fire consequential actions (job.completed -> invoice.created), so activation is
  // an operator/owner decision. Flag unset => strict no-op (no behavior change). Fail-soft.
  try {
    const { bootReactiveChains } = await import("./engines/reactive-chains-boot.js");
    const rc = await bootReactiveChains();
    if (rc.enabled) log.info(`[index] reactive chains booted: loaded ${rc.loaded.length}, failed ${rc.failed.length}`);
  } catch (e) { log.warn(`[index] reactive-chains boot skipped: ${(e as Error).message}`); }
  } // end once-only post-bind tail (guarded by _postBindDone)
}

/**
 * Build a FRESH McpServer for a single HTTP /mcp request (MCP SDK stateless pattern).
 * bindDispatchers() registers all tools onto it; the once-only post-bind tail is skipped
 * via the _postBindDone guard (already run on the shared server). A fresh server per request
 * is what eliminates the "Already connected to a transport" collision under concurrency —
 * each request owns its own McpServer + transport, so server.connect() never contends.
 */
async function buildRequestServer(): Promise<McpServer> {
  const s = new McpServer({ name: SERVER_NAME, version: SERVER_VERSION });
  await bindDispatchers(s);
  return s;
}

// ============================================================================
// TRANSPORT HANDLERS
// ============================================================================

/**
 * Run server with stdio transport (for local MCP clients)
 */
async function runStdio(): Promise<void> {
  // H1-MS4: Generate unique session ID for MemGraph tracking
  process.env.SESSION_ID = `S-${Date.now()}`;
  log.info(`Starting ${SERVER_NAME} v${SERVER_VERSION} (stdio mode) [${process.env.SESSION_ID}]`);
  log.info(SERVER_DESCRIPTION);
  
  await bootstrapServices();
  await bindDispatchers(server);
  
  const transport = new StdioServerTransport();
  await server.connect(transport);
  
  log.info("Server running on stdio");

  // Fleet-OOM hardening (slot:bravo 2026-05-29): exit promptly when the parent
  // MCP client closes the stdio pipe, so a stdio child never lingers as a ~750MB
  // orphan after its chat dies/compacts. Pairs with the fleet-wide prism_safe drop
  // (which removes the per-chat stdio server entirely). stdio branch only.
  process.stdin.on("end", () => process.exit(0));
  process.stdin.on("close", () => process.exit(0));

  // H1-MS3: Boot smoke tests (non-blocking)
  try {
    const { runSmokeTests } = await import("./utils/smokeTest.js");
    runSmokeTests().catch(e => log.warn(`[SMOKE] Failed: ${e.message}`));
  } catch { /* smoke test module not available */ }
}

/**
 * Run server with HTTP transport (for remote access)
 */
async function runHTTP(): Promise<void> {
  log.info(`Starting ${SERVER_NAME} v${SERVER_VERSION} (HTTP mode)`);
  log.info(SERVER_DESCRIPTION);

  // HARDEN (golf 2026-06-02 MCP-HARDEN) FIX 2 — pre-bootstrap port preflight.
  // The heavy bootstrapServices() below loads every engine (~700MB RSS). It must
  // NOT run if :PORT is already owned by a peer — that is exactly how the
  // 11-instance / ~7.8GB leak formed: bind-race losers loaded all engines then
  // hung portless instead of exiting. Probe the port cheaply (~50MB) and exit
  // FIRST if a peer owns it. FIX 1 (httpServer 'error' handler at app.listen)
  // closes the residual TOCTOU window between this probe closing and the real listen.
  {
    const pfPort = parseInt(process.env.PORT || "3000", 10);
    const pfHost = process.env.PRISM_BIND_HOST || "127.0.0.1";
    await new Promise<void>((resolve) => {
      const probe = net.createServer();
      probe.once("error", (e: NodeJS.ErrnoException) => {
        if (e.code === "EADDRINUSE") {
          log.warn(`[PREFLIGHT] :${pfPort} already bound by a peer MCP server — exiting pre-bootstrap (no engine load, no leak)`);
          process.exit(0);
        }
        resolve(); // non-EADDRINUSE probe error: proceed; the real listen will surface it
      });
      probe.once("listening", () => probe.close(() => resolve()));
      probe.listen(pfPort, pfHost);
    });
  }

  await bootstrapServices();
  await bindDispatchers(server);
  
  const app = express();
  // OBSIDIAN-COMPOUND-MS1/S3/U-CAPTURE-WEBHOOK — MUST mount BEFORE
  // express.json so the raw body parser inside intake router sees the
  // exact bytes the HMAC was computed over (express.json would otherwise
  // consume the body stream first and break HMAC verification).
  app.use("/api/intake", createIntakeRouter());

  // U-COMM-02 -- Stripe webhook needs RAW bytes for HMAC signature verification,
  // so it MUST mount BEFORE express.json (same reason as the intake router above).
  app.use("/api/v1/billing", createBillingWebhookRouter());

  // express.json defaults to a 100KB body limit -> the server silently 413s any
  // larger dispatcher/CAD payload. Raise to a generous, env-overridable cap.
  // Strictly beneficial: existing <100KB requests are unaffected; only LARGER
  // valid bodies now succeed. Tune down via PRISM_MCP_BODY_LIMIT for a DoS floor.
  app.use(express.json({ limit: process.env.PRISM_MCP_BODY_LIMIT || "50mb" }));
  registerOAuthHttpRoutes(app);

  // MCP-CONCURRENCY-HARDEN (slot golf 2026-06-09): one shared gate for the /mcp
  // choke point. Each /mcp POST builds a FRESH McpServer (binds the full dispatcher
  // graph) via buildRequestServer(), so N concurrent requests = N concurrent servers
  // = an unbounded memory spike under an ultracode parallel-agent burst. The gate
  // caps simultaneous builds (PRISM_MCP_MAX_CONCURRENCY) and queues the overflow
  // (PRISM_MCP_QUEUE_MAX); excess sheds with HTTP 503 so a burst applies backpressure
  // to clients instead of OOMing the process. Defaults are sized for the Blackwell box
  // (96GB VRAM / 136GB RAM) against the 300-400 concurrent peak modeled in
  // MCP-FLEET-CAPACITY-MS0: 64 active builds + 512 queued.
  // Capacity resolution single-sourced in resolveMcpCapacity (request-semaphore.ts)
  // so the production 64/512 contract is unit-tested without booting this server.
  const { maxConcurrency: MCP_MAX_CONCURRENCY, queueMax: MCP_QUEUE_MAX } = resolveMcpCapacity(process.env);
  const mcpSem = new RequestSemaphore(MCP_MAX_CONCURRENCY, MCP_QUEUE_MAX);

  // R6: Enhanced health check endpoint with registry stats
  app.get("/health", async (_, res) => {
    const memUsage = process.memoryUsage();
    const uptime = process.uptime();
    const heapUsedMB = Math.round(memUsage.heapUsed / 1024 / 1024);
    const heapTotalMB = Math.round(memUsage.heapTotal / 1024 / 1024);
    const rssMB = Math.round(memUsage.rss / 1024 / 1024);
    
    // Registry health
    const registryStats = {
      materials: registryManager.materials.size,
      machines: registryManager.machines.size,
      tools: registryManager.tools.size,
      alarms: registryManager.alarms.size,
      formulas: registryManager.formulas.size,
    };
    const totalEntries = Object.values(registryStats).reduce((a, b) => a + b, 0);
    const healthy = totalEntries > 0 && heapUsedMB < 3500;
    
    res.status(healthy ? 200 : 503).json({ 
      status: healthy ? "healthy" : "degraded",
      server: SERVER_NAME, 
      version: SERVER_VERSION,
      uptime_seconds: Math.round(uptime),
      memory: { heap_used_mb: heapUsedMB, heap_total_mb: heapTotalMB, rss_mb: rssMB },
      registries: registryStats,
      total_entries: totalEntries,
      // MCP-CONCURRENCY-HARDEN (slot golf 2026-06-09): live concurrency so the
      // watchdog can DEFER a preemptive RSS restart while a parallel-agent burst is
      // in flight (restarting mid-burst disconnects every live agent call at once).
      // `inflight` = total requests in the /mcp handler (incl. queued); `active` =
      // request-servers currently building/handling; `queued` = waiting for a slot.
      concurrency: {
        inflight: metrics.inflight,
        peak_inflight: metrics.peakInflight,
        active: mcpSem.inUse,
        queued: mcpSem.queued,
        max_concurrency: mcpSem.maxConcurrency,
        max_queue: mcpSem.maxQueue,
      },
      timestamp: new Date().toISOString()
    });
  });

  // MCP-READINESS (slot alpha 2026-05-28 — U-MCPR01): /ready is a STRICTER
  // probe than /health. /health = "port bound + registries non-empty + heap OK";
  // /ready adds a canary lazy-import that surfaces ESM/JSON-import bugs (the
  // exact BUG-1 / BUG-2 class from reference_mcp_server_3100_crash_fix_2026_05_22)
  // BEFORE any chat's tool call triggers the crash. The bridge calls /ready
  // (not /health) before forwarding the first MCP message, so a chat that
  // initializes during the server's ~30s cold start blocks until the dispatcher
  // module graph is verified — closing the "session-permanent drop" failure
  // mode that the existing INIT_RETRY_BUDGET_MS retry only partially solves.
  //
  // Why a canary import: Node ESM module cache means the FIRST successful
  // import warms the dispatcher for the entire process lifetime. After the
  // first /ready 200, the import returns instantly from cache (~microseconds).
  // We pick toolpathDispatcher.js because (a) it was the actual May 22 crash,
  // (b) it touches a representative slice of the engine graph, (c) it's
  // already lazy-loaded so importing here doesn't add steady-state cost.
  let canaryImportPromise: Promise<unknown> | null = null;
  function canaryImport(): Promise<unknown> {
    if (canaryImportPromise) return canaryImportPromise;
    canaryImportPromise = import("./tools/dispatchers/toolpathDispatcher.js")
      .catch((e) => {
        // Reset so next /ready call retries — a transient FS issue at startup
        // shouldn't permanently mark the server as not-ready.
        canaryImportPromise = null;
        throw e;
      });
    return canaryImportPromise;
  }
  app.get("/ready", async (_, res) => {
    const memUsage = process.memoryUsage();
    const heapUsedMB = Math.round(memUsage.heapUsed / 1024 / 1024);
    const totalEntries =
      registryManager.materials.size +
      registryManager.machines.size +
      registryManager.tools.size +
      registryManager.alarms.size +
      registryManager.formulas.size;
    const reasons: string[] = [];
    if (totalEntries === 0) reasons.push("registries empty");
    if (heapUsedMB >= 3500) reasons.push(`heap pressure (${heapUsedMB}MB)`);
    let canaryOk = true;
    try {
      await canaryImport();
    } catch (e) {
      canaryOk = false;
      const msg = e instanceof Error ? e.message : String(e);
      reasons.push(`canary import failed: ${msg.slice(0, 120)}`);
    }
    const ready = reasons.length === 0;
    res.status(ready ? 200 : 503).json({
      status: ready ? "ready" : "not-ready",
      server: SERVER_NAME,
      version: SERVER_VERSION,
      uptime_seconds: Math.round(process.uptime()),
      memory: { heap_used_mb: heapUsedMB },
      total_entries: totalEntries,
      canary_dispatcher_ok: canaryOk,
      reasons,
      timestamp: new Date().toISOString(),
    });
  });

  // R6: Prometheus-compatible metrics endpoint
  app.get("/metrics", async (req, res) => {
    const mem = process.memoryUsage();
    const up = process.uptime();
    const rs = {
      materials: registryManager.materials.size,
      machines: registryManager.machines.size,
      tools: registryManager.tools.size,
      alarms: registryManager.alarms.size,
      formulas: registryManager.formulas.size,
    };
    
    const lines = [
      '# HELP prism_up PRISM server up status',
      '# TYPE prism_up gauge',
      `prism_up 1`,
      '# HELP prism_uptime_seconds Server uptime in seconds',
      '# TYPE prism_uptime_seconds gauge',
      `prism_uptime_seconds ${Math.round(up)}`,
      '# HELP prism_heap_used_bytes Heap memory used',
      '# TYPE prism_heap_used_bytes gauge',
      `prism_heap_used_bytes ${mem.heapUsed}`,
      '# HELP prism_rss_bytes Resident set size',
      '# TYPE prism_rss_bytes gauge',
      `prism_rss_bytes ${mem.rss}`,
      '# HELP prism_registry_entries Total entries per registry',
      '# TYPE prism_registry_entries gauge',
      ...Object.entries(rs).map(([k, v]) => `prism_registry_entries{registry="${k}"} ${v}`),
      '# HELP prism_registry_total Total registry entries',
      '# TYPE prism_registry_total gauge',
      `prism_registry_total ${Object.values(rs).reduce((a, b) => a + b, 0)}`,
    ];
    
    // OBSERVABILITY-MS0 (slot:bravo 2026-05-30): GET /metrics?format=json returns a
    // richer per-tool snapshot (counts, p50/p95/p99 latency, error rate, concurrency).
    if (req.query && req.query.format === "json") {
      res.json({ registries: rs, ...metrics.snapshot() });
      return;
    }
    res.set('Content-Type', 'text/plain; version=0.0.4');
    res.send(lines.join('\n') + '\n' + metrics.prometheus() + '\n');
  });
  
  // OBSERVABILITY-MS0 (slot:bravo 2026-05-30): live auto-refreshing HTML view of /metrics.
  app.get("/metrics/view", (_, res) => {
    res.set("Content-Type", "text/html; charset=utf-8");
    res.send(metricsViewHtml());
  });

  // .well-known/mcp.json — MCP Registry Discovery (RFC 9110 §4.1)
  app.get("/.well-known/mcp.json", (_req, res) => {
    const discovery = buildMcpDiscoveryDocument();
    const authConfig = getAuthConfig();

    if (!authConfig.enabled) {
      delete discovery.authentication;
    }

    res.json(discovery);
  });

  // MCP Streamable HTTP — POST (JSON-RPC requests)
  app.post("/mcp", async (req, res) => {
    // OBSERVABILITY-MS0 (slot:bravo 2026-05-30): instrument every MCP request at the
    // single choke point — per-tool count/latency + live/peak concurrency. Wrapped so
    // a telemetry bug can never alter dispatch behavior (collector never throws).
    const _m0 = Date.now();
    const _method = (req.body && typeof req.body.method === "string") ? req.body.method : "(none)";
    const _tool = (_method === "tools/call" && req.body && req.body.params && typeof req.body.params.name === "string")
      ? req.body.params.name
      : _method;
    metrics.recordMethod(_method);
    metrics.incInflight();
    // Error capture (tools/call only): tap the response body to detect JSON-RPC
    // protocol errors AND MCP isError results (both return HTTP 200). Bounded to
    // 128KB and fully fail-safe — always calls the original write/end, never throws.
    const _isCall = _method === "tools/call";
    const _chunks: Buffer[] = [];
    let _blen = 0;
    const _CAP = 131072;
    if (_isCall) {
      const _ow = res.write.bind(res);
      const _oe = res.end.bind(res);
      const _grab = (c: unknown) => {
        try {
          if (c && typeof c !== "function" && _blen < _CAP) {
            const b = Buffer.isBuffer(c) ? c : typeof c === "string" ? Buffer.from(c) : null;
            if (b) {
              _chunks.push(b);
              _blen += b.length;
            }
          }
        } catch {
          /* never break the response */
        }
      };
      (res as any).write = (c: any, ...a: any[]) => {
        _grab(c);
        return _ow(c, ...a);
      };
      (res as any).end = (c: any, ...a: any[]) => {
        _grab(c);
        return _oe(c, ...a);
      };
    }
    res.on("finish", () => {
      let _ok = res.statusCode < 400;
      try {
        if (_isCall && _blen > 0 && _blen < _CAP) {
          const p = JSON.parse(Buffer.concat(_chunks).toString("utf8"));
          if (p && (p.error || (p.result && p.result.isError === true))) _ok = false;
        }
      } catch {
        /* unparseable / oversized body -> fall back to statusCode */
      }
      metrics.recordTool(_tool, Date.now() - _m0, _ok);
    });
    res.on("close", () => metrics.decInflight());

    // MCP-CONCURRENCY-HARDEN (slot golf 2026-06-09): bound the number of fresh
    // McpServers built/handled at once (see mcpSem above). acquireRequestSlot() caps
    // + queues the builds and load-sheds (503) past the queue so a burst applies
    // backpressure instead of OOMing the process, and frees the slot exactly once
    // even when the client disconnects WHILE queued (the close-while-queued leak
    // caught by the 3-of-3 reviewers B + C on the first cut). Outcomes: "shed" -> 503;
    // "abandoned" -> client already gone, slot released, just return; "proceed" -> do
    // the work (release is wired to res 'close' inside the helper).
    const _slot = await acquireRequestSlot(mcpSem, res);
    if (_slot.outcome === "shed") {
      if (!res.headersSent) {
        res.status(503).json({
          jsonrpc: "2.0",
          error: {
            code: -32000,
            message: `server busy: concurrency ${mcpSem.maxConcurrency} + queue ${mcpSem.maxQueue} saturated, retry`,
          },
          id: (req.body && (req.body as any).id) ?? null,
        });
      } else {
        try { res.end(); } catch { /* best-effort */ }
      }
      return; // res.on("close") metrics.decInflight() above still fires
    }
    if (_slot.outcome === "abandoned") {
      // Client disconnected while queued; the granted slot was already released and
      // decInflight fired on the earlier 'close'. Skip the wasted buildRequestServer().
      return;
    }

    const transport = new StreamableHTTPServerTransport({
      sessionIdGenerator: undefined,
      enableJsonResponse: true
    });

    // MCP-CONCURRENCY-FIX (2026-05-31): build a FRESH McpServer per request instead of
    // connecting the shared module-level server. The SDK allows ONE transport per server;
    // a shared server + overlapping requests => the 2nd server.connect() throws "Already
    // connected" before handleRequest => client gets NO response => "MCP DISCONNECTED".
    let reqServer: McpServer;
    try {
      reqServer = await buildRequestServer();
    } catch (e) {
      if (!res.headersSent) {
        res.status(500).json({
          jsonrpc: "2.0",
          error: { code: -32000, message: `server build failed: ${(e as Error).message}` },
          id: (req.body && (req.body as any).id) ?? null,
        });
      }
      return; // the res.on("close") metrics.decInflight() wired above still fires
    }

    res.on("close", () => {
      try { transport.close(); } catch { /* best-effort */ }
      try { (reqServer as any).close?.(); } catch { /* best-effort */ }
    });

    try {
      await reqServer.connect(transport);
      await transport.handleRequest(req, res, req.body);
    } catch (e) {
      // Transport errors were previously the LAST statements of this async
      // handler with no catch -> escaped as process-level unhandledRejections
      // (invisible to operators; mid-write left a half-emitted response). The
      // res.on("close") cleanup above still fires for slot release.
      respondTransportError(res, e, (req.body && (req.body as any).id) ?? null);
    }
  });

  // MCP Streamable HTTP — GET (SSE stream for server-initiated messages)
  app.get("/mcp", async (req, res) => {
    res.writeHead(405, { Allow: "POST" }).end(JSON.stringify({
      jsonrpc: "2.0",
      error: { code: -32000, message: "SSE not supported in stateless mode. Use POST." },
      id: null,
    }));
  });

  // MCP Streamable HTTP — DELETE (session cleanup)
  app.delete("/mcp", async (req, res) => {
    res.writeHead(405, { Allow: "POST" }).end(JSON.stringify({
      jsonrpc: "2.0",
      error: { code: -32000, message: "Session management not enabled in stateless mode." },
      id: null,
    }));
  });

  // ========================================================================
  // R5+L6: REST API routes — 9 route modules, 42 endpoints
  // ========================================================================

  // Helper: call an MCP tool handler and return result
  async function callTool(toolName: string, action: string, params: Record<string, any> = {}) {
    // _registeredTools is a plain Record<string, RegisteredTool>, not a Map
    const registeredTools = (server as any)._registeredTools ?? {};
    const tool = registeredTools[toolName];
    if (!tool) return { error: `Tool ${toolName} not found` };
    try {
      // SDK v1.27.1: registered tool uses .handler(args, extra), not .callback
      // _http_api flag bypasses universal hooks (no session context needed for REST routes)
      const result = await tool.handler({ action, params, _http_api: true }, {});
      const text = result?.content?.[0]?.text;
      return text ? JSON.parse(text) : result;
    } catch (e: any) {
      // callTool backs ALL 42 REST routes; a dispatcher/engine throw here
      // previously returned a bare {error} to the client with ZERO server-side
      // record of which tool/action failed or the stack. Log, shape unchanged.
      log.error("[CALL_TOOL] dispatcher error", { toolName, action, message: e?.message, stack: e?.stack });
      return { error: e.message };
    }
  }

  // Register all route modules (SFC, CAD, CAM, Quality, Schedule, Cost, Export, Data, Safety)
  const { registerRoutes } = await import("./routes/index.js");
  registerRoutes(app, callTool);

  // Serve the built web app directly from the backend when available.
  const currentDir = import.meta.dirname;
  const frontendDistDir = path.resolve(currentDir, "../dist/web");
  const frontendIndexPath = path.join(frontendDistDir, "index.html");
  const hasBuiltFrontend = fs.existsSync(frontendIndexPath);

  if (hasBuiltFrontend) {
    app.use(
      express.static(frontendDistDir, {
        extensions: ["html"],
      }),
    );

    app.get(/^(?!\/(?:api|mcp|health|ready|metrics|\.well-known|ws)(?:\/|$)).*/, (_req, res) => {
      res.sendFile(frontendIndexPath);
    });

    log.info(`[WEB] Serving built frontend from ${frontendDistDir}`);
  } else {
    log.warn(`[WEB] Built frontend not found at ${frontendDistDir}; HTTP mode serving API only`);
  }
  
  const port = parseInt(process.env.PORT || "3000", 10);
  // R6: Bind to localhost by default; set PRISM_BIND_HOST=0.0.0.0 for Docker/network exposure
  const host = process.env.PRISM_BIND_HOST || '127.0.0.1';
  const httpServer = app.listen(port, host, () => {
    log.info(`MCP server running on http://${host}:${port}/mcp`);
  });

  // HARDEN (golf 2026-06-02 MCP-HARDEN) FIX 1 — bind-fail-fast. Without this an
  // EADDRINUSE on a bind-race loser was unhandled and the process hung resident
  // (~700MB, all engines loaded) instead of exiting → the 11-instance pileup that
  // took :3100 down fleet-wide. exit(0) on EADDRINUSE = "a peer already owns the
  // port, which is success for the fleet" → does NOT trip the supervisor backoff/
  // respawn loop. Any other listen error is fatal (exit 1) so the supervisor restarts.
  httpServer.on("error", (e: NodeJS.ErrnoException) => {
    if (e.code === "EADDRINUSE") {
      log.warn(`[BIND] :${port} already owned by a peer MCP server — exiting cleanly (no leak)`);
      process.exit(0);
    }
    log.error(`[BIND] listen failed on :${port}: ${e?.message ?? e}`);
    process.exit(1);
  });

  // §4b HTTP keep-alive tuning (MCP-CONCURRENCY-FIX): hold idle keep-alive connections
  // longer than typical client idle, no per-request timeout (long-running tool calls must
  // not be severed mid-flight), and raise the concurrent-connection cap for the 26-chat fleet.
  // maxConnections sizing (MCP-FLEET-CAPACITY-MS0, 2026-06-08): 26 slots × ~4 concurrent
  // /mcp calls ≈ 104, PLUS spawned subagents/workflows (a workflow fans out up to 16
  // concurrent agents, each able to call MCP, across multiple looping slots) → realistic
  // peak 300-400. 512 gives clean headroom; idle keep-alive sockets are cheap (~few KB
  // each, far below the 384MB-capped heap). The per-request buildRequestServer() factory
  // (above) already isolates concurrent requests, so this is purely a socket ceiling.
  // Override fleet-wide via PRISM_MCP_MAX_CONNECTIONS.
  httpServer.keepAliveTimeout = 65_000;
  httpServer.headersTimeout = 70_000;
  httpServer.requestTimeout = 0;
  httpServer.maxConnections = Number(process.env.PRISM_MCP_MAX_CONNECTIONS) || 512;

  // RT-MS0: Attach WebSocket server alongside HTTP
  const { webSocketEngine } = await import("./engines/WebSocketEngine.js");
  webSocketEngine.attach(httpServer);
  log.info(`WebSocket server running on ws://${host}:${port}/ws`);

  // RT-MS2: Start RealtimeEventBridge (EventBus → WebSocket channels)
  const { realtimeEventBridge } = await import("./engines/RealtimeEventBridge.js");
  realtimeEventBridge.start();
  log.info("RealtimeEventBridge active — EventBus events forwarding to WebSocket channels");

  // Graceful shutdown
  process.on("SIGTERM", () => {
    log.info("SIGTERM received, shutting down...");
    realtimeEventBridge.stop();
    webSocketEngine.shutdown();
    httpServer.close();
  });
}

// ============================================================================
// MAIN ENTRY
// ============================================================================

async function main(): Promise<void> {
  const transport = process.env.TRANSPORT || "stdio";
  
  try {
    if (transport === "http") {
      await runHTTP();
    } else {
      await runStdio();
    }
  } catch (error) {
    // R12 fail-loud (2026-06-13, slot:bravo): an Error object passed as the 2nd
    // arg serialized to `{}` in the logs, hiding every boot-crash cause fleet-wide.
    // Embed the real stack/message in the message string so the actual failure
    // is always visible (this swallow took the whole fleet's :3100 MCP down blind).
    const detail =
      error instanceof Error
        ? (error.stack || `${error.name}: ${error.message}`)
        : (typeof error === "string" ? error : JSON.stringify(error));
    log.error(`Server startup failed: ${detail}`);
    process.exit(1);
  }
}

// Handle uncaught errors
process.on("uncaughtException", (error) => {
  log.error("Uncaught exception", error);
  gracefulShutdown("uncaughtException");
});

process.on("unhandledRejection", (reason) => {
  log.error("Unhandled rejection", reason as Error);
  // Opt-in fail-loud (R12): an unhandled rejection is usually a real bug. Default
  // OFF -> log-only (byte-identical to prior behavior). Set
  // PRISM_MCP_FATAL_REJECTIONS=1 to treat it as fatal -> graceful shutdown +
  // supervisor restart, matching the uncaughtException handler above.
  if (process.env.PRISM_MCP_FATAL_REJECTIONS === "1") {
    gracefulShutdown("unhandledRejection");
  }
});

// H1-1: Graceful shutdown — persist MemGraph + telemetry on exit
let shuttingDown = false;
function gracefulShutdown(signal: string): void {
  if (shuttingDown) return;
  shuttingDown = true;
  log.info(`[SHUTDOWN] ${signal} received — persisting state...`);
  try {
    const { memoryGraphEngine } = require("./engines/MemoryGraphEngine.js");
    memoryGraphEngine?.shutdown();
    log.info("[SHUTDOWN] MemGraph checkpoint saved");
  } catch (e) { log.warn(`[SHUTDOWN] MemGraph save failed: ${(e as Error).message}`); }
  try {
    systemVariabilityIndexEngine.stopAutoWatch();
  } catch (e) { log.warn(`[SHUTDOWN] SVI auto-watch stop failed: ${(e as Error).message}`); }
  try {
    const { telemetryEngine } = require("./engines/TelemetryEngine.js");
    telemetryEngine?.shutdown?.();
  } catch (e: any) { log.debug(`[shutdown] telemetry: ${e?.message?.slice(0, 80)}`); }
  try {
    const { persistenceBridge } = require("./db/PersistenceBridge.js");
    persistenceBridge?.gracefulShutdown?.();
    log.info("[SHUTDOWN] PersistenceBridge flushed");
  } catch (e: any) { log.debug(`[shutdown] persistence: ${e?.message?.slice(0, 80)}`); }
  if (signal === "uncaughtException") process.exit(1);
}
process.on("SIGINT", () => { gracefulShutdown("SIGINT"); process.exit(0); });
process.on("SIGTERM", () => { gracefulShutdown("SIGTERM"); process.exit(0); });
process.on("beforeExit", () => { gracefulShutdown("beforeExit"); });

// Start server
main();
