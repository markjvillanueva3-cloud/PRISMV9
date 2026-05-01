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

// OAuth 2.1 + PKCE Authorization (MCP Modernization Wave 5)
export {
  PrismOAuthServer,
  getOAuthServer,
  createOAuthServer,
  resetOAuthServer,
  getPermissionMatrix,
  hasPermission,
  getRequiredRole,
  generateCodeVerifier,
  computeCodeChallenge,
  verifyCodeChallenge,
  type AuthUser,
  type JWTClaims,
  type TokenPair,
  type ValidateResult,
} from "./auth.js";

export {
  getAuthConfig,
  resetAuthConfig,
  roleAtLeast,
  ROLE_HIERARCHY,
  SCOPE_TO_ROLE,
  type OAuthConfig,
  type OAuthClientConfig,
  type OAuthScope,
  type OAuthRole,
} from "./authConfig.js";

export {
  authMiddleware,
  requirePermission,
  requireRole,
  createStdioAuthContext,
  isStdioTransport,
  checkToolPermission,
  type AuthenticatedRequest,
} from "./authMiddleware.js";

// Output Schemas (MCP Modernization Wave 6)
export {
  getOutputSchema,
  getOutputZodSchema,
  getAllOutputSchemas,
  getRegisteredOutputActions,
  hasOutputSchema,
  getOutputSchemasByDispatcher,
  SpeedFeedResultSchema,
  ForceResultSchema,
  ToolLifeResultSchema,
  SafetyResultSchema,
  QuoteResultSchema,
  SurfaceFinishResultSchema,
  SimulationResultSchema,
  SPCResultSchema,
} from "./outputSchemas.js";

export {
  registerToolWithOutput,
  wrapWithOutputSchema,
  getDispatcherOutputSchema,
} from "./registerToolWithOutput.js";

// Elicitation (MCP Modernization — structured user input)
export {
  ELICITATION_SCHEMAS,
  requestElicitation,
  detectMissingInput,
  getElicitationAwareActions,
  getActionRequirements,
  type ElicitationJsonSchema,
  type JsonSchemaProperty,
  type ElicitationResult,
  type McpElicitationContext,
  type MissingInputReport,
  type ElicitationSchemaName,
} from "./elicitation.js";

export {
  ensureInput,
  checkMissingInput,
  describeMissingInput,
  withElicitation,
  type EnsuredInput,
  type EnsureInputOptions,
} from "./elicitationIntegration.js";

// Resource Links (MCP Modernization Wave 8)
export {
  materialLink,
  machineLink,
  toolLink,
  alarmLink,
  extractResourceLinks,
  type ResourceLink,
} from "./resourceLinks.js";

// Sampling with Tools (MCP Modernization Wave 9)
export {
  initSampling,
  requestSampling,
  resolveMaterial,
  selectMachine,
  SAMPLING_TOOL_SETS,
  type SamplingTool,
} from "./sampling.js";
