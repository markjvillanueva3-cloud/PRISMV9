/**
 * PRISM MCP Server - Tools Index v9
 * Re-exports all tool registration functions
 * Updated: Session 6.2 - Added Enforcement Hook Tools
 */

// Data Access Tools
export { registerDataAccessTools } from "./dataAccess.js";
export { registerDataAccessToolsV2 } from "./dataAccessV2.js";

// Orchestration Tools
export { registerOrchestrationTools } from "./orchestration.js";
export { registerOrchestrationToolsV2 } from "./orchestrationV2.js";

// Swarm Tools
export { registerSwarmToolsV2 } from "./swarmToolsV2.js";

// Hook & Event Tools (Legacy)
export { registerHookToolsV2 } from "./hookToolsV2.js";

// Hook Tools (Session 6.2 - New Enforcement System)
export { hookTools } from "./hookTools.js";

// Knowledge Tools
export { registerKnowledgeTools } from "./knowledge.js";
export { registerKnowledgeToolsV2 } from "./knowledgeV2.js";

// Skill Tools (Session 5.1)
export { getSkillToolsV2 } from "./skillToolsV2.js";

// Script Tools (Session 5.2)
export { getScriptToolsV2 } from "./scriptToolsV2.js";

// Knowledge Query Tools (Session 5.3)
export { getKnowledgeQueryTools } from "./knowledgeQueryTools.js";

// Validation Tools (Session 6.1)
export { getValidationTools, registerValidationTools } from "./validationTools.js";

// Omega Integration Tools (P6-OMEGA)
export { registerOmegaTools } from "./omegaTools.js";

// Calculation Tools
export { registerCalculationTools } from "./calculations.js";
export { registerManufacturingCalculationsV2 } from "./calculationsV2.js";
export { registerAdvancedCalculationsV2 } from "./advancedCalculationsV2.js";
export { registerToolpathCalculationsV2 } from "./toolpathCalculationsV2.js";

// Other Tools
export { registerAgentTools } from "./agents.js";
export { registerStateTools } from "./state.js";

// Generator Tools (Session 0.1 - Phase 0)
export { registerGeneratorTools, GENERATOR_TOOL_SCHEMAS } from "./generatorTools.js";

// Tool counts for reference
export const toolCounts = {
  dataAccess: 12,
  dataAccessV2: 8,
  orchestration: 6,
  orchestrationV2: 10,
  swarm: 8,
  hookLegacy: 4,
  hookNew: 8,  // Session 6.2
  knowledge: 6,
  knowledgeV2: 8,
  skills: 4,
  scripts: 4,
  knowledgeQuery: 5,
  validation: 7,  // Session 6.1
  calculations: 10,
  calculationsV2: 8,
  advancedCalc: 6,
  toolpath: 6,
  agents: 4,
  state: 4,
  generators: 6,  // Session 0.1 - Phase 0
  total: 141  // Updated count (added validation tools)
};
