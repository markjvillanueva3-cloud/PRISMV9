/**
 * PRISM MCP Server - Generators Index
 * Session 0.1-0.6: Generator Infrastructure
 * 
 * Exports all generator modules for the 80× multiplier strategy
 */

// Hook Generator - 40 hooks/hour/clone
export { 
  HookGenerator, 
  hookGenerator,
  runHookGeneratorCLI,
  DOMAIN_TEMPLATES,
  type GeneratedHook,
  type DomainTemplate,
  type HookPattern,
  type BatchGenerationConfig,
  type GenerationResult
} from "./HookGenerator.js";

// Future generators (Sessions 0.2-0.6)
// export { SkillGenerator } from "./SkillGenerator.js";
// export { ScriptGenerator } from "./ScriptGenerator.js";
// export { EngineGenerator } from "./EngineGenerator.js";
// export { SwarmGenerator } from "./SwarmGenerator.js";
