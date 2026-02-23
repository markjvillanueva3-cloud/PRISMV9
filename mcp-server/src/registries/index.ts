/**
 * PRISM MCP Server - Registries Index
 * Re-exports all registry classes and singletons
 *
 * Data Registries (8):
 * - MaterialRegistry: 1,047+ materials × 127 parameters
 * - MachineRegistry: 824+ machines × 43 manufacturers
 * - ToolRegistry: 500+ cutting tools × 85 parameters
 * - AlarmRegistry: 2,500+ alarms × 12 controller families
 * - FormulaRegistry: 109 formulas × 20 domains
 * - AlgorithmRegistry: 52+ algorithms × 14 types (NEW P-MS1)
 * - PostProcessorRegistry: 8+ post processors × 13 controller families (NEW P-MS1) ⚠️ SAFETY CRITICAL
 * - KnowledgeBaseRegistry: 12+ knowledge bases (NEW P-MS1)
 *
 * Orchestration Registries (2):
 * - AgentRegistry: 64+ agents × 8 categories
 * - HookRegistry: 162+ hooks × 9 categories
 *
 * Knowledge Registries (2):
 * - SkillRegistry: 135+ skills × 14 categories
 * - ScriptRegistry: 163+ scripts × 10 categories
 */

// Base registry
export { BaseRegistry, type RegistryEntry } from "./base.js";

// Data registries
export { MaterialRegistry, materialRegistry, type Material } from "./MaterialRegistry.js";
export { MachineRegistry, machineRegistry, type Machine } from "./MachineRegistry.js";
export { ToolRegistry, toolRegistry, type CuttingTool } from "./ToolRegistry.js";
export { AlarmRegistry, alarmRegistry, type Alarm } from "./AlarmRegistry.js";
export { FormulaRegistry, formulaRegistry, type Formula, FORMULA_SOURCE_FILE_CATALOG } from "./FormulaRegistry.js";
export { AlgorithmRegistry, algorithmRegistry, type AlgorithmEntry, type AlgorithmType, type AlgorithmSafetyClass, type MfgRelevance } from "./AlgorithmRegistry.js";
export { PostProcessorRegistry, postProcessorRegistry, type PostProcessor, type ControllerFamily, type PostType, type PostCapability } from "./PostProcessorRegistry.js";
export { KnowledgeBaseRegistry, knowledgeBaseRegistry, type KnowledgeBaseEntry, type KnowledgeBaseTopic, type KnowledgeBaseQueryType } from "./KnowledgeBaseRegistry.js";

// Orchestration registries
export { AgentRegistry, agentRegistry, type Agent, type AgentCapability, type AgentCategory } from "./AgentRegistry.js";
export { HookRegistry, hookRegistry, type Hook, type HookCategory, type HookPriority, type HookTiming } from "./HookRegistry.js";

// Knowledge registries
export { SkillRegistry, skillRegistry, type Skill, type SkillCategory } from "./SkillRegistry.js";
export { ScriptRegistry, scriptRegistry, type Script, type ScriptCategory, type ScriptLanguage } from "./ScriptRegistry.js";

// Toolpath strategy registries
export {
  toolpathRegistry,
  type ToolpathStrategy,
  type StrategySelectionResult,
  type StrategyParams,
  type AxisCapability,
  type StrategyCategory,
} from "./ToolpathStrategyRegistry.js";

export {
  FINISHING_3D_STRATEGIES,
  ROUGHING_3D_STRATEGIES,
  STRATEGY_COUNTS,
} from "./ToolpathStrategyRegistry_Part1.js";

// Registry manager
export { RegistryManager, registryManager } from "./manager.js";
