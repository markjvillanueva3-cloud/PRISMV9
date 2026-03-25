var __require = /* @__PURE__ */ ((x) => typeof require !== "undefined" ? require : typeof Proxy !== "undefined" ? new Proxy(x, {
  get: (a, b) => (typeof require !== "undefined" ? require : a)[b]
}) : x)(function(x) {
  if (typeof require !== "undefined") return require.apply(this, arguments);
  throw Error('Dynamic require of "' + x + '" is not supported');
});

// src/index.ts
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { StreamableHTTPServerTransport } from "@modelcontextprotocol/sdk/server/streamableHttp.js";
import express from "express";
import dotenv from "dotenv";
import { SERVER_NAME, SERVER_VERSION, SERVER_DESCRIPTION } from "./constants.js";
import { log } from "./utils/Logger.js";
import { registerDataDispatcher } from "./tools/dispatchers/dataDispatcher.js";
import { registerSafetyDispatcher } from "./tools/dispatchers/safetyDispatcher.js";
import { registerThreadDispatcher } from "./tools/dispatchers/threadDispatcher.js";
import { registerToolpathDispatcher } from "./tools/dispatchers/toolpathDispatcher.js";
import { registerCalcDispatcher } from "./tools/dispatchers/calcDispatcher.js";
import { registerOmegaDispatcher } from "./tools/dispatchers/omegaDispatcher.js";
import { registerValidationDispatcher } from "./tools/dispatchers/validationDispatcher.js";
import { registerDocumentDispatcher } from "./tools/dispatchers/documentDispatcher.js";
import { registerRalphDispatcher } from "./tools/dispatchers/ralphDispatcher.js";
import { registerKnowledgeDispatcher } from "./tools/dispatchers/knowledgeDispatcher.js";
import { registerDevDispatcher } from "./tools/dispatchers/devDispatcher.js";
import { registerGsdDispatcher } from "./tools/dispatchers/gsdDispatcher.js";
import { registerManusDispatcher } from "./tools/dispatchers/manusDispatcher.js";
import { registerAutoPilotDispatcher } from "./tools/dispatchers/autoPilotDispatcher.js";
import { registerOrchestrationDispatcher } from "./tools/dispatchers/orchestrationDispatcher.js";
import { registerHookDispatcher } from "./tools/dispatchers/hookDispatcher.js";
import { registerSpDispatcher } from "./tools/dispatchers/spDispatcher.js";
import { registerContextDispatcher } from "./tools/dispatchers/contextDispatcher.js";
import { registerSessionDispatcher } from "./tools/dispatchers/sessionDispatcher.js";
import { registerSkillScriptDispatcher } from "./tools/dispatchers/skillScriptDispatcher.js";
import { registerGeneratorDispatcher } from "./tools/dispatchers/generatorDispatcher.js";
import { registerGuardDispatcher } from "./tools/dispatchers/guardDispatcher.js";
import { registerAtcsDispatcher } from "./tools/dispatchers/atcsDispatcher.js";
import { registerAutonomousDispatcher } from "./tools/dispatchers/autonomousDispatcher.js";
import { registerTelemetryDispatcher } from "./tools/dispatchers/telemetryDispatcher.js";
import { telemetryEngine } from "./engines/TelemetryEngine.js";
import { registerPFPDispatcher } from "./tools/dispatchers/pfpDispatcher.js";
import { pfpEngine } from "./engines/PFPEngine.js";
import { registerMemoryDispatcher } from "./tools/dispatchers/memoryDispatcher.js";
import { memoryGraphEngine } from "./engines/MemoryGraphEngine.js";
import { certificateEngine } from "./engines/CertificateEngine.js";
import { registerNLHookDispatcher } from "./tools/dispatchers/nlHookDispatcher.js";
import { registerComplianceDispatcher } from "./tools/dispatchers/complianceDispatcher.js";
import { registerTenantDispatcher } from "./tools/dispatchers/tenantDispatcher.js";
import { registerBridgeDispatcher } from "./tools/dispatchers/bridgeDispatcher.js";
import { protocolBridgeEngine } from "./engines/ProtocolBridgeEngine.js";
import { registerIntelligenceDispatcher } from "./tools/dispatchers/intelligenceDispatcher.js";
import { registerProductDispatcher } from "./tools/dispatchers/productDispatcher.js";
import { registerMachineLiveDispatcher } from "./tools/dispatchers/machineLiveDispatcher.js";
import { registerIntegrationDispatcher } from "./tools/dispatchers/integrationDispatcher.js";
import { registerKnowledgeExtDispatcher } from "./tools/dispatchers/knowledgeExtDispatcher.js";
import { registerDiagnosisDispatcher } from "./tools/dispatchers/diagnosisDispatcher.js";
import { registerDocumentLearningDispatcher } from "./tools/dispatchers/documentLearningDispatcher.js";
import { registerShopPracticeDispatcher } from "./tools/dispatchers/shopPracticeDispatcher.js";
import { registerL2EngineDispatcher } from "./tools/dispatchers/l2EngineDispatcher.js";
import { registerCadDispatcher } from "./tools/dispatchers/cadDispatcher.js";
import { registerCamDispatcher } from "./tools/dispatchers/camDispatcher.js";
import { registerQualityDispatcher } from "./tools/dispatchers/qualityDispatcher.js";
import { registerProcessControlDispatcher } from "./tools/dispatchers/processControlDispatcher.js";
import { registerSchedulingDispatcher } from "./tools/dispatchers/schedulingDispatcher.js";
import { registerBusinessDispatcher } from "./tools/dispatchers/businessDispatcher.js";
import { registerAuthDispatcher } from "./tools/dispatchers/authDispatcher.js";
import { registerExportDispatcher } from "./tools/dispatchers/exportDispatcher.js";
import { registerTurningDispatcher } from "./tools/dispatchers/turningDispatcher.js";
import { registerFiveAxisDispatcher } from "./tools/dispatchers/fiveAxisDispatcher.js";
import { registerEdmDispatcher } from "./tools/dispatchers/edmDispatcher.js";
import { registerGrindingDispatcher } from "./tools/dispatchers/grindingDispatcher.js";
import { registerIndustryDispatcher } from "./tools/dispatchers/industryDispatcher.js";
import { registerAutomationDispatcher } from "./tools/dispatchers/automationDispatcher.js";
import { registerRealtimeDispatcher } from "./tools/dispatchers/realtimeDispatcher.js";
import { registerAdaptiveControlDispatcher } from "./tools/dispatchers/adaptiveControlDispatcher.js";
import { registerMultiOpDispatcher } from "./tools/dispatchers/multiOpDispatcher.js";
import { registerScientificMathDispatcher } from "./tools/dispatchers/scientificMathDispatcher.js";
import { registerCncOpsDispatcher } from "./tools/dispatchers/cncOpsDispatcher.js";
import { registerMachineSetupDispatcher } from "./tools/dispatchers/machineSetupDispatcher.js";
import { registerVibrationPhysicsDispatcher } from "./tools/dispatchers/vibrationPhysicsDispatcher.js";
import { registerMaterialProcessingDispatcher } from "./tools/dispatchers/materialProcessingDispatcher.js";
import { registerWeldingJoiningDispatcher } from "./tools/dispatchers/weldingJoiningDispatcher.js";
import { registerFormingCastingDispatcher } from "./tools/dispatchers/formingCastingDispatcher.js";
import { registerMechanicalDesignDispatcher } from "./tools/dispatchers/mechanicalDesignDispatcher.js";
import { registerFluidThermalDispatcher } from "./tools/dispatchers/fluidThermalDispatcher.js";
import { initSynergies } from "./tools/synergyIntegration.js";
import { wrapToolWithAutoHooks, wrapWithUniversalHooks, AUTO_HOOK_CONFIG } from "./tools/autoHookWrapper.js";
import { registerDomainHooks } from "./hooks/hookRegistration.js";
import { registryManager } from "./registries/index.js";
dotenv.config();
var CORE_SOURCE_FILE_CATALOG = {
  // --- core/ category: bootstrap, config, orchestration, workflow ---
  "EXT-067": {
    filename: "PRISM_CAPABILITY_REGISTRY.js",
    source_dir: "extracted/core",
    category: "core",
    lines: 194,
    safety_class: "LOW",
    description: "Capability registry \u2014 dynamic feature/capability advertisement and discovery for engine self-registration."
  },
  "EXT-068": {
    filename: "PRISM_CONSTANTS.js",
    source_dir: "extracted/core",
    category: "core",
    lines: 2461,
    safety_class: "LOW",
    description: "Core constants \u2014 ISO material groups, tool types, coatings, machine families, and lookup tables used across all engines."
  },
  "EXT-069": {
    filename: "PRISM_ENHANCED_MASTER_ORCHESTRATOR.js",
    source_dir: "extracted/core",
    category: "core",
    lines: 355,
    safety_class: "LOW",
    description: "Enhanced master orchestrator \u2014 multi-step manufacturing workflow coordination with retry and checkpoint logic."
  },
  "EXT-070": {
    filename: "PRISM_ENHANCEMENTS.js",
    source_dir: "extracted/core",
    category: "core",
    lines: 60,
    safety_class: "LOW",
    description: "Core enhancements \u2014 feature flag toggles and incremental improvement patches for the PRISM platform."
  },
  "EXT-071": {
    filename: "PRISM_MASTER.js",
    source_dir: "extracted/core",
    category: "core",
    lines: 215,
    safety_class: "LOW",
    description: "Master module \u2014 top-level PRISM initialization, module wiring, and startup sequence coordinator."
  },
  "EXT-072": {
    filename: "PRISM_MASTER_DB.js",
    source_dir: "extracted/core",
    category: "core",
    lines: 131,
    safety_class: "LOW",
    description: "Master database \u2014 central data-source registry connecting file-based and in-memory stores."
  },
  "EXT-073": {
    filename: "PRISM_MASTER_ORCHESTRATOR.js",
    source_dir: "extracted/core",
    category: "core",
    lines: 696,
    safety_class: "LOW",
    description: "Master orchestrator \u2014 primary workflow engine coordinating multi-engine manufacturing pipelines."
  },
  "EXT-074": {
    filename: "PRISM_MASTER_TOOLPATH_REGISTRY.js",
    source_dir: "extracted/core",
    category: "core",
    lines: 612,
    safety_class: "LOW",
    description: "Master toolpath registry \u2014 central catalog of toolpath strategies with selection heuristics and constraints."
  },
  "EXT-075": {
    filename: "PRISM_PARAM_ENGINE.js",
    source_dir: "extracted/core",
    category: "core",
    lines: 10,
    safety_class: "LOW",
    description: "Parameter engine stub \u2014 lightweight parameter resolution entry point for the core bootstrap chain."
  },
  "EXT-076": {
    filename: "PRISM_UNIFIED_WORKFLOW.js",
    source_dir: "extracted/core",
    category: "core",
    lines: 145,
    safety_class: "LOW",
    description: "Unified workflow \u2014 single-entry-point workflow executor merging planning, calculation, and validation stages."
  },
  "EXT-077": {
    filename: "PRISM_WORKFLOW_ORCHESTRATOR_V2.js",
    source_dir: "extracted/core",
    category: "core",
    lines: 223,
    safety_class: "LOW",
    description: "Workflow orchestrator V2 \u2014 DAG-based task scheduler with parallel execution and dependency resolution."
  },
  // --- engines/core subcategory: core engine infrastructure ---
  "EXT-235": {
    filename: "PRISM_ENHANCED_ORCHESTRATION_ENGINE.js",
    source_dir: "extracted/engines/core",
    category: "engines",
    lines: 452,
    safety_class: "LOW",
    description: "Enhanced orchestration engine \u2014 event-driven multi-engine coordination with health monitoring and fallback routing."
  },
  "EXT-236": {
    filename: "PRISM_FAILSAFE_GENERATOR.js",
    source_dir: "extracted/engines/core",
    category: "engines",
    lines: 169,
    safety_class: "LOW",
    description: "Failsafe generator \u2014 automatic safe-default parameter generation when primary calculation engines fail."
  },
  "EXT-237": {
    filename: "PRISM_INTERVAL_ENGINE.js",
    source_dir: "extracted/engines/core",
    category: "engines",
    lines: 847,
    safety_class: "LOW",
    description: "Interval engine \u2014 interval arithmetic for uncertainty propagation through manufacturing calculation chains."
  },
  "EXT-238": {
    filename: "PRISM_NUMERICAL_ENGINE.js",
    source_dir: "extracted/engines/core",
    category: "engines",
    lines: 19,
    safety_class: "LOW",
    description: "Numerical engine stub \u2014 lightweight numerical computation entry point for the core engine chain."
  },
  "EXT-239": {
    filename: "PRISM_UNIFIED_OUTPUT_ENGINE.js",
    source_dir: "extracted/engines/core",
    category: "engines",
    lines: 195,
    safety_class: "LOW",
    description: "Unified output engine \u2014 standardized result formatting, unit labeling, and safety annotation for all engine outputs."
  }
};
var server = new McpServer({
  name: SERVER_NAME,
  version: SERVER_VERSION
});
async function registerTools() {
  log.info("Registering PRISM MCP tools...");
  log.info("Initializing data registries...");
  await registryManager.initialize();
  try {
    const { bootstrapRegistries } = __require("../dist/tools/registryBootstrapper.js");
    const bootstrapReport = await bootstrapRegistries({
      formulaRegistry: registryManager.formulas,
      machineRegistry: registryManager.machines
    });
    log.info(`[BOOTSTRAP] Formulas: ${bootstrapReport.formulas.loaded} loaded, Machines: ${bootstrapReport.machines.loaded} loaded (${bootstrapReport.total_time_ms}ms)`);
  } catch (bootstrapErr) {
    log.warn(`[BOOTSTRAP] Registry bootstrap failed (non-fatal): ${bootstrapErr.message}`);
  }
  try {
    const hookResult = registerDomainHooks();
    log.info(`[HOOKS] Domain hooks: ${hookResult.registered} registered, ${hookResult.skipped} skipped`);
  } catch (hookErr) {
    log.warn(`[HOOKS] Domain hook registration failed (non-fatal): ${hookErr.message}`);
  }
  const calcToolSet = new Set(AUTO_HOOK_CONFIG.calcTools);
  calcToolSet.add("prism_calc");
  let autoHookCount = 0;
  let universalHookCount = 0;
  const originalTool = server.tool.bind(server);
  const proxiedTool = function(...args) {
    const toolName = args[0];
    if (typeof toolName === "string" && toolName.startsWith("prism_")) {
      const handlerIndex = args.length - 1;
      const originalHandler = args[handlerIndex];
      if (typeof originalHandler === "function") {
        let wrapped = wrapWithUniversalHooks(toolName, originalHandler);
        universalHookCount++;
        if (calcToolSet.has(toolName)) {
          wrapped = wrapToolWithAutoHooks(toolName, wrapped);
          autoHookCount++;
          log.debug(`[AUTO-HOOK] Wrapped: ${toolName} with UNIVERSAL + \u039B(x)/\u03A6(x) safety validation`);
        } else {
          log.debug(`[AUTO-HOOK] Wrapped: ${toolName} with UNIVERSAL hooks (before/after/cadence/error)`);
        }
        args[handlerIndex] = wrapped;
      }
    }
    return originalTool(...args);
  };
  server.tool = proxiedTool;
  registerDataDispatcher(server);
  registerOrchestrationDispatcher(server);
  registerHookDispatcher(server);
  registerSkillScriptDispatcher(server);
  registerCalcDispatcher(server);
  registerSessionDispatcher(server);
  registerGeneratorDispatcher(server);
  registerValidationDispatcher(server);
  registerAdaptiveControlDispatcher(server);
  registerMultiOpDispatcher(server);
  registerScientificMathDispatcher(server);
  registerOmegaDispatcher(server);
  registerManusDispatcher(server);
  registerSpDispatcher(server);
  registerContextDispatcher(server);
  registerGsdDispatcher(server);
  registerSafetyDispatcher(server);
  registerThreadDispatcher(server);
  registerKnowledgeDispatcher(server);
  registerToolpathDispatcher(server);
  registerAutoPilotDispatcher(server);
  registerRalphDispatcher(server);
  registerDocumentDispatcher(server);
  registerDevDispatcher(server);
  registerGuardDispatcher(server);
  registerAtcsDispatcher(server);
  registerAutonomousDispatcher(server);
  registerTelemetryDispatcher(server);
  registerPFPDispatcher(server);
  try {
    telemetryEngine?.init();
  } catch (e) {
    log.warn(`[INIT] TelemetryEngine skipped: ${e.message}`);
  }
  try {
    pfpEngine?.init();
  } catch (e) {
    log.warn(`[INIT] PFPEngine skipped: ${e.message}`);
  }
  registerMemoryDispatcher(server);
  try {
    memoryGraphEngine?.init();
  } catch (e) {
    log.warn(`[INIT] MemoryGraphEngine skipped: ${e.message}`);
  }
  try {
    certificateEngine?.init();
  } catch (e) {
    log.warn(`[INIT] CertificateEngine skipped: ${e.message}`);
  }
  registerNLHookDispatcher(server);
  registerComplianceDispatcher(server);
  registerTenantDispatcher(server);
  registerBridgeDispatcher(server);
  registerIntelligenceDispatcher(server);
  registerProductDispatcher(server);
  registerMachineLiveDispatcher(server);
  registerIntegrationDispatcher(server);
  registerKnowledgeExtDispatcher(server);
  registerDiagnosisDispatcher(server);
  registerL2EngineDispatcher(server);
  registerCadDispatcher(server);
  registerCamDispatcher(server);
  registerQualityDispatcher(server);
  registerProcessControlDispatcher(server);
  registerSchedulingDispatcher(server);
  registerBusinessDispatcher(server);
  registerAuthDispatcher(server);
  registerExportDispatcher(server);
  registerTurningDispatcher(server);
  registerFiveAxisDispatcher(server);
  registerEdmDispatcher(server);
  registerGrindingDispatcher(server);
  registerIndustryDispatcher(server);
  registerAutomationDispatcher(server);
  registerDocumentLearningDispatcher(server);
  registerShopPracticeDispatcher(server);
  registerRealtimeDispatcher(server);
  registerCncOpsDispatcher(server);
  registerMachineSetupDispatcher(server);
  registerVibrationPhysicsDispatcher(server);
  registerMaterialProcessingDispatcher(server);
  registerWeldingJoiningDispatcher(server);
  registerFormingCastingDispatcher(server);
  registerMechanicalDesignDispatcher(server);
  registerFluidThermalDispatcher(server);
  log.info(`All PRISM tools registered: 55 dispatchers (1670+ actions)`);
  try {
    const synResult = initSynergies();
    log.info(`[SYNERGY] ${synResult.integrations.length} integrations active`);
  } catch (e) {
    log.warn(`[SYNERGY] Init skipped: ${e.message}`);
  }
  protocolBridgeEngine.setDispatchHandler(async (dispatcher, action, params) => {
    const tool = server._registeredTools?.get(dispatcher);
    if (!tool) throw new Error(`Bridge routing failed: dispatcher '${dispatcher}' not registered`);
    const result = await tool.callback({ action, params });
    const text = result?.content?.[0]?.text;
    return text ? JSON.parse(text) : result;
  });
  log.info("[BRIDGE] Dispatch handler wired \u2014 live routing to all PRISM dispatchers enabled");
  server.tool = originalTool;
  log.info(`[AUTO-HOOK] ${universalHookCount} dispatchers wrapped with UNIVERSAL hooks (before/after/cadence/error)`);
  log.info(`[AUTO-HOOK] ${autoHookCount} calculation tools wrapped with additional \u039B(x)/\u03A6(x) safety validation`);
  log.info(`[AUTO-HOOK] Global dispatch counter active \u2014 cadence: todo@5, checkpoint@10, buffer zones enforced`);
  const moduleChecks = [
    { name: "AutoPilot", path: "./orchestration/AutoPilot.js" },
    { name: "AutoPilotV2", path: "./orchestration/AutoPilotV2.js" },
    { name: "KnowledgeQueryEngine", path: "./engines/KnowledgeQueryEngine.js" }
  ];
  const failed = [];
  for (const mod of moduleChecks) {
    try {
      __require(mod.path);
    } catch (e) {
      failed.push(`${mod.name} (${e.message?.split("\n")[0]})`);
    }
  }
  if (failed.length > 0) {
    log.warn(`[HEALTH] ${failed.length} optional module(s) unavailable: ${failed.join(", ")}`);
  } else {
    log.info(`[HEALTH] All ${moduleChecks.length} lazy-loaded modules verified OK`);
  }
  try {
    const { eventBus, EventTypes } = await import("./engines/EventBus.js");
    eventBus.publish(EventTypes.SYSTEM_STARTUP, {
      timestamp: (/* @__PURE__ */ new Date()).toISOString(),
      dispatchers_registered: true
    }, { category: "system", priority: "high", source: "index" });
  } catch {
  }
}
async function runStdio() {
  process.env.SESSION_ID = `S-${Date.now()}`;
  log.info(`Starting ${SERVER_NAME} v${SERVER_VERSION} (stdio mode) [${process.env.SESSION_ID}]`);
  log.info(SERVER_DESCRIPTION);
  await registerTools();
  const transport = new StdioServerTransport();
  await server.connect(transport);
  log.info("Server running on stdio");
  try {
    const { runSmokeTests } = await import("./utils/smokeTest.js");
    runSmokeTests().catch((e) => log.warn(`[SMOKE] Failed: ${e.message}`));
  } catch {
  }
}
async function runHTTP() {
  log.info(`Starting ${SERVER_NAME} v${SERVER_VERSION} (HTTP mode)`);
  log.info(SERVER_DESCRIPTION);
  await registerTools();
  const app = express();
  app.use(express.json());
  app.get("/health", async (_, res) => {
    const memUsage = process.memoryUsage();
    const uptime = process.uptime();
    const heapUsedMB = Math.round(memUsage.heapUsed / 1024 / 1024);
    const heapTotalMB = Math.round(memUsage.heapTotal / 1024 / 1024);
    const rssMB = Math.round(memUsage.rss / 1024 / 1024);
    const registryStats = {
      materials: registryManager.materials.size,
      machines: registryManager.machines.size,
      tools: registryManager.tools.size,
      alarms: registryManager.alarms.size,
      formulas: registryManager.formulas.size
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
      timestamp: (/* @__PURE__ */ new Date()).toISOString()
    });
  });
  app.get("/metrics", async (_, res) => {
    const mem = process.memoryUsage();
    const up = process.uptime();
    const rs = {
      materials: registryManager.materials.size,
      machines: registryManager.machines.size,
      tools: registryManager.tools.size,
      alarms: registryManager.alarms.size,
      formulas: registryManager.formulas.size
    };
    const lines = [
      "# HELP prism_up PRISM server up status",
      "# TYPE prism_up gauge",
      `prism_up 1`,
      "# HELP prism_uptime_seconds Server uptime in seconds",
      "# TYPE prism_uptime_seconds gauge",
      `prism_uptime_seconds ${Math.round(up)}`,
      "# HELP prism_heap_used_bytes Heap memory used",
      "# TYPE prism_heap_used_bytes gauge",
      `prism_heap_used_bytes ${mem.heapUsed}`,
      "# HELP prism_rss_bytes Resident set size",
      "# TYPE prism_rss_bytes gauge",
      `prism_rss_bytes ${mem.rss}`,
      "# HELP prism_registry_entries Total entries per registry",
      "# TYPE prism_registry_entries gauge",
      ...Object.entries(rs).map(([k, v]) => `prism_registry_entries{registry="${k}"} ${v}`),
      "# HELP prism_registry_total Total registry entries",
      "# TYPE prism_registry_total gauge",
      `prism_registry_total ${Object.values(rs).reduce((a, b) => a + b, 0)}`
    ];
    res.set("Content-Type", "text/plain; version=0.0.4");
    res.send(lines.join("\n") + "\n");
  });
  app.post("/mcp", async (req, res) => {
    const transport = new StreamableHTTPServerTransport({
      sessionIdGenerator: void 0,
      enableJsonResponse: true
    });
    res.on("close", () => transport.close());
    await server.connect(transport);
    await transport.handleRequest(req, res, req.body);
  });
  async function callTool(toolName, action, params = {}) {
    const tool = server._registeredTools?.get(toolName);
    if (!tool) return { error: `Tool ${toolName} not found` };
    try {
      const result = await tool.callback({ action, params });
      const text = result?.content?.[0]?.text;
      return text ? JSON.parse(text) : result;
    } catch (e) {
      return { error: e.message };
    }
  }
  const { registerRoutes } = await import("./routes/index.js");
  registerRoutes(app, callTool);
  const port = parseInt(process.env.PORT || "3000", 10);
  const host = process.env.NODE_ENV === "production" ? "0.0.0.0" : "127.0.0.1";
  const httpServer = app.listen(port, host, () => {
    log.info(`MCP server running on http://${host}:${port}/mcp`);
  });
  const { webSocketEngine } = await import("./engines/WebSocketEngine.js");
  webSocketEngine.attach(httpServer);
  log.info(`WebSocket server running on ws://${host}:${port}/ws`);
  process.on("SIGTERM", () => {
    log.info("SIGTERM received, shutting down...");
    webSocketEngine.shutdown();
    httpServer.close();
  });
}
async function main() {
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
process.on("uncaughtException", (error) => {
  log.error("Uncaught exception", error);
  gracefulShutdown("uncaughtException");
});
process.on("unhandledRejection", (reason) => {
  log.error("Unhandled rejection", reason);
});
var shuttingDown = false;
function gracefulShutdown(signal) {
  if (shuttingDown) return;
  shuttingDown = true;
  log.info(`[SHUTDOWN] ${signal} received \u2014 persisting state...`);
  try {
    const { memoryGraphEngine: memoryGraphEngine2 } = __require("./engines/MemoryGraphEngine.js");
    memoryGraphEngine2?.shutdown();
    log.info("[SHUTDOWN] MemGraph checkpoint saved");
  } catch (e) {
    log.warn(`[SHUTDOWN] MemGraph save failed: ${e.message}`);
  }
  try {
    const { telemetryEngine: telemetryEngine2 } = __require("./engines/TelemetryEngine.js");
    telemetryEngine2?.shutdown?.();
  } catch (e) {
    log.debug(`[shutdown] telemetry: ${e?.message?.slice(0, 80)}`);
  }
  if (signal === "uncaughtException") process.exit(1);
}
process.on("SIGINT", () => {
  gracefulShutdown("SIGINT");
  process.exit(0);
});
process.on("SIGTERM", () => {
  gracefulShutdown("SIGTERM");
  process.exit(0);
});
process.on("beforeExit", () => {
  gracefulShutdown("beforeExit");
});
main();
export {
  CORE_SOURCE_FILE_CATALOG
};
