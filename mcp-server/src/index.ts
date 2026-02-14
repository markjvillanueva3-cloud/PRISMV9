/**
 * PRISM MCP Server - Main Entry Point
 * Manufacturing Intelligence MCP Server
 * 
 * Provides access to:
 * - 31 dispatchers, 368 verified actions
 * - 37 engines, 19 registries
 * - Materials Database (3,518+ materials x 127 parameters)
 * - Machines Database (824+ machines x 4 layers)
 * - Controller Alarms (18,942+ alarms x 12 families)
 * - Manufacturing Calculations (Kienzle, Taylor, etc.)
 * - AI Agent Orchestration (56+ agents)
 * - Skills & Knowledge Base (119+ skills)
 * - F1-F8 Feature Suite (PFP, Memory, Telemetry, Certs, Multi-Tenant, NL Hooks, Bridge, Compliance)
 */

import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { StreamableHTTPServerTransport } from "@modelcontextprotocol/sdk/server/streamableHttp.js";
import express from "express";
import dotenv from "dotenv";

import { SERVER_NAME, SERVER_VERSION, SERVER_DESCRIPTION } from "./constants.js";
import { log } from "./utils/Logger.js";

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

// SYNERGY: Cross-feature integration wiring — F1↔F8
import { initSynergies } from "./tools/synergyIntegration.js";

// NEW: Auto-Hook Wrapper (Λ/Φ safety validation on calc tools)
import { wrapToolWithAutoHooks, wrapWithUniversalHooks, getDispatchCount, AUTO_HOOK_CONFIG, registerAutoHookTools } from "./tools/autoHookWrapper.js";

// NEW: Domain Hook Registration — bridges 112 hooks → HookExecutor
import { registerDomainHooks } from "./hooks/hookRegistration.js";

// Import registry manager for initialization
import { registryManager } from "./registries/index.js";

// Load environment variables
dotenv.config();

// ============================================================================
// SERVER INITIALIZATION
// ============================================================================

const server = new McpServer({
  name: SERVER_NAME,
  version: SERVER_VERSION
});

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
  
  const originalTool = server.tool.bind(server);
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
  
  // Validation (7 actions)
  registerValidationDispatcher(server);
  
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
  
  log.info(`All PRISM tools registered: 31 dispatchers (368 verified actions)`);

  // F1-F8 SYNERGY: Wire cross-feature integrations
  try {
    const synResult = initSynergies();
    log.info(`[SYNERGY] ${synResult.integrations.length} integrations active`);
  } catch (e) { log.warn(`[SYNERGY] Init skipped: ${(e as Error).message}`); }

  
  // Restore original server.tool and report auto-hook stats
  (server as any).tool = originalTool;
  log.info(`[AUTO-HOOK] ${universalHookCount} dispatchers wrapped with UNIVERSAL hooks (before/after/cadence/error)`);
  log.info(`[AUTO-HOOK] ${autoHookCount} calculation tools wrapped with additional Λ(x)/Φ(x) safety validation`);
  log.info(`[AUTO-HOOK] Global dispatch counter active — cadence: todo@5, checkpoint@10, buffer zones enforced`);
}

// ============================================================================
// TRANSPORT HANDLERS
// ============================================================================

/**
 * Run server with stdio transport (for local MCP clients)
 */
async function runStdio(): Promise<void> {
  log.info(`Starting ${SERVER_NAME} v${SERVER_VERSION} (stdio mode)`);
  log.info(SERVER_DESCRIPTION);
  
  await registerTools();
  
  const transport = new StdioServerTransport();
  await server.connect(transport);
  
  log.info("Server running on stdio");
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
  
  // Health check endpoint
  app.get("/health", (_, res) => {
    res.json({ 
      status: "healthy", 
      server: SERVER_NAME, 
      version: SERVER_VERSION 
    });
  });
  
  // MCP endpoint
  app.post("/mcp", async (req, res) => {
    const transport = new StreamableHTTPServerTransport({
      sessionIdGenerator: undefined,
      enableJsonResponse: true
    });
    
    res.on("close", () => transport.close());
    
    await server.connect(transport);
    await transport.handleRequest(req, res, req.body);
  });
  
  const port = parseInt(process.env.PORT || "3000", 10);
  app.listen(port, () => {
    log.info(`MCP server running on http://localhost:${port}/mcp`);
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
  process.exit(1);
});

process.on("unhandledRejection", (reason) => {
  log.error("Unhandled rejection", reason as Error);
  process.exit(1);
});

// Start server
main();
