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

import { SERVER_NAME, SERVER_VERSION, SERVER_DESCRIPTION } from "./constants.js";
import { log } from "./utils/Logger.js";

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
// BATCH 2 DONE: dataDispatcher imported above with other tool imports

// Phase 2A Batch 3: Quick Wins (9 dispatchers, 61 tools → 9)
import { registerOmegaDispatcher } from "./tools/dispatchers/omegaDispatcher.js";
import { registerValidationDispatcher } from "./tools/dispatchers/validationDispatcher.js";
import { registerDocumentDispatcher } from "./tools/dispatchers/documentDispatcher.js";
import { registerInboxDispatcher } from "./tools/dispatchers/inboxDispatcher.js";
import { registerRalphDispatcher } from "./tools/dispatchers/ralphDispatcher.js";
import { registerKnowledgeDispatcher } from "./tools/dispatchers/knowledgeDispatcher.js";
import { registerDevDispatcher } from "./tools/dispatchers/devDispatcher.js";
import { registerGsdDispatcher } from "./tools/dispatchers/gsdDispatcher.js";
import { registerManusDispatcher } from "./tools/dispatchers/manusDispatcher.js";
import { registerAutoPilotDispatcher } from "./tools/dispatchers/autoPilotDispatcher.js";

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
import { registerCamDispatcher } from "./tools/dispatchers/camDispatcher.js";
import { registerQualityDispatcher } from "./tools/dispatchers/qualityDispatcher.js";
import { registerProcessControlDispatcher } from "./tools/dispatchers/processControlDispatcher.js";
import { registerSchedulingDispatcher } from "./tools/dispatchers/schedulingDispatcher.js";
import { registerBusinessDispatcher } from "./tools/dispatchers/businessDispatcher.js";
import { registerOperatingSystemDispatcher } from "./tools/dispatchers/operatingSystemDispatcher.js";
import { registerMonitoringDispatcher } from "./tools/dispatchers/monitoringDispatcher.js";
import { registerAuthDispatcher } from "./tools/dispatchers/authDispatcher.js";
import { registerExportDispatcher } from "./tools/dispatchers/exportDispatcher.js";

// L3: PASS2 Specialty Dispatchers — 6 dispatchers, 28 actions (#40-#45)
import { registerTurningDispatcher } from "./tools/dispatchers/turningDispatcher.js";
import { registerFiveAxisDispatcher } from "./tools/dispatchers/fiveAxisDispatcher.js";
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

/** Internal access to McpServer internals for proxy/routing */
type McpServerInternal = McpServer & {
  tool: (...args: unknown[]) => unknown;
  _registeredTools?: Map<string, { callback: (args: Record<string, unknown>) => Promise<{ content?: Array<{ text?: string }> }> }>;
};

// ============================================================================
// TOOL REGISTRATION
// ============================================================================

/**
 * Register all PRISM tools with the MCP server
 */
async function registerTools(): Promise<void> {
  log.info("Registering PRISM MCP tools...");
  
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

  // INFRA-3-1: Initialize Redis-backed auth token store
  try {
    const { initOAuthStore } = await import("./mcp/auth.js");
    await initOAuthStore();
    log.info("[INFRA] OAuth token store initialized");
  } catch (authStoreErr: any) {
    log.warn(`[INFRA] OAuth store init skipped (non-fatal): ${authStoreErr.message}`);
  }

  // INFRA-3-2: Initialize Redis-backed usage counters for tier gate
  try {
    const { initUsageCounter } = await import("./middleware/usageCounter.js");
    await initUsageCounter();
    log.info("[INFRA] Usage counter initialized");
  } catch (usageErr: any) {
    log.warn(`[INFRA] Usage counter init skipped (non-fatal): ${usageErr.message}`);
  }

  // INFRA-MS0: Initialize embedding pipeline, event bus, model registry
  try {
    const { embeddingPipelineEngine } = await import("./engines/EmbeddingPipelineEngine.js");
    await embeddingPipelineEngine.init();
    log.info("[INFRA] Embedding pipeline initialized");
  } catch (embErr: any) {
    log.warn(`[INFRA] Embedding pipeline init skipped (non-fatal): ${embErr.message}`);
  }

  try {
    const { eventBusEngine } = await import("./engines/EventBusEngine.js");
    await eventBusEngine.init();
    log.info("[INFRA] Event bus initialized");
  } catch (evtErr: any) {
    log.warn(`[INFRA] Event bus init skipped (non-fatal): ${evtErr.message}`);
  }

  try {
    const { modelRegistryEngine } = await import("./engines/ModelRegistryEngine.js");
    await modelRegistryEngine.init();
    log.info("[INFRA] Model registry initialized");
  } catch (mlErr: any) {
    log.warn(`[INFRA] Model registry init skipped (non-fatal): ${mlErr.message}`);
  }

  // Register 112 domain hooks with HookExecutor engine
  try {
    const hookResult = registerDomainHooks();
    log.info(`[HOOKS] Domain hooks: ${hookResult.registered} registered, ${hookResult.skipped} skipped`);
  } catch (hookErr: any) {
    log.warn(`[HOOKS] Domain hook registration failed (non-fatal): ${hookErr.message}`);
  }

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
  
  // Dev Workflow (7 actions)
  registerDevDispatcher(server);
  
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
  
  // Initialize engines safely — some .ts sources may be empty (file_write bug recovery)
  try { telemetryEngine?.init(); } catch (e) { log.warn(`[INIT] TelemetryEngine skipped: ${(e as Error).message}`); }
  try { pfpEngine?.init(); } catch (e) { log.warn(`[INIT] PFPEngine skipped: ${(e as Error).message}`); }
  
  // F2: Cross-Session Memory Graph (6 actions)
  registerMemoryDispatcher(server);
  
  try { memoryGraphEngine?.init(); } catch (e) { log.warn(`[INIT] MemoryGraphEngine skipped: ${(e as Error).message}`); }
  try { certificateEngine?.init(); } catch (e) { log.warn(`[INIT] CertificateEngine skipped: ${(e as Error).message}`); }
  
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
  registerCamDispatcher(server);
  registerQualityDispatcher(server);
  registerProcessControlDispatcher(server);
  registerSchedulingDispatcher(server);
  registerBusinessDispatcher(server);

  // Operating-System Shell + Desk + Program Release + Scheduling + Shop Floor (9 actions — Sprint C1)
  registerOperatingSystemDispatcher(server);
  registerMonitoringDispatcher(server);
  registerAuthDispatcher(server);
  registerExportDispatcher(server);

  // L3-P1: PASS2 Specialty Dispatchers — 6 dispatchers, 28 actions
  registerTurningDispatcher(server);
  registerFiveAxisDispatcher(server);
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
  registerMultiAxisProgramDispatcher(server);  // 2 actions: multiaxis_print_to_program, multiaxis_process_plan
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
    registerResources(server);
    registerPrompts(server);
    registerTaskTools(server);
    initMcpLogging((server as any).server);
    log.info("[MCP] Resources, Prompts, Tasks, and Logging initialized");
  } catch (mcpErr: any) {
    log.warn(`[MCP] Primitives init failed (non-fatal): ${mcpErr.message}`);
  }

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
  
  await registerTools();
  
  const transport = new StdioServerTransport();
  await server.connect(transport);
  
  log.info("Server running on stdio");

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
  
  await registerTools();
  
  const app = express();
  app.use(express.json());
  registerOAuthHttpRoutes(app);
  
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
      timestamp: new Date().toISOString()
    });
  });

  // R6: Prometheus-compatible metrics endpoint
  app.get("/metrics", async (_, res) => {
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
    
    res.set('Content-Type', 'text/plain; version=0.0.4');
    res.send(lines.join('\n') + '\n');
  });
  
  // .well-known/mcp.json — MCP Registry Discovery (RFC 9110 §4.1)
  app.get("/.well-known/mcp.json", (req, res) => {
    const baseUrl = `${req.protocol}://${req.get("host")}`;
    const discovery = buildMcpDiscoveryDocument(baseUrl);
    const authConfig = getAuthConfig();

    if (!authConfig.enabled) {
      delete discovery.authentication;
    }

    res.json(discovery);
  });

  // MCP Streamable HTTP — POST (JSON-RPC requests)
  app.post("/mcp", async (req, res) => {
    const transport = new StreamableHTTPServerTransport({
      sessionIdGenerator: undefined,
      enableJsonResponse: true
    });
    
    res.on("close", () => transport.close());
    
    await server.connect(transport);
    await transport.handleRequest(req, res, req.body);
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
    log.error("Server startup failed", error);
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
