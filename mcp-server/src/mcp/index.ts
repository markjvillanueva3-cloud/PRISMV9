/**
 * MCP Primitives — Barrel Export
 *
 * Centralizes all MCP protocol features beyond basic tools:
 * - Tool Annotations (Wave 1)
 * - Structured Logging (Wave 1)
 * - Resources with URI templates (Wave 2)
 * - Prompts for key workflows (Wave 2)
 * - Completions / autocomplete (Wave 2)
 */

export {
  DISPATCHER_ANNOTATIONS,
  getAnnotations,
  getToolSafetyClass,
  type ToolAnnotationConfig,
} from "./toolAnnotations.js";

export {
  initMcpLogging,
  setMinLogLevel,
  mcpLog,
  logPhysics,
  logSafety,
  logSpeedFeed,
  logSimulation,
  logPipeline,
  logPlaybook,
  logCatalog,
  logManufacturingError,
  type McpLogLevel,
} from "./mcpLogging.js";

export { registerResources } from "./resources.js";
export { registerPrompts } from "./prompts.js";

export {
  completeResourceArg,
  completePromptArg,
} from "./completions.js";

export {
  initProgressTracker,
  sendProgress,
  createProgressReporter,
  reporters,
} from "./progressTracker.js";

export {
  registerTaskTools,
  cleanupExpiredTasks,
} from "./taskTools.js";

export {
  PRISM_SUBAGENTS,
  PRISM_AGENT_CONFIG,
  PRISM_QUICK_CONFIG,
  PRISM_BATCH_CONFIG,
} from "./agentConfig.js";
