#!/usr/bin/env node
// tier: T4
/**
 * PRISM Intelligence Briefing — SessionStart Hook
 *
 * Comprehensive briefing that activates on every session, providing:
 * - PRISM mission and purpose
 * - MCP power utilization guide
 * - Self-awareness system activation
 * - Token efficiency strategies
 * - Internal AI system capabilities
 * - Key commands and workflows
 *
 * This is the "brain activation" hook that ensures Claude understands
 * the full scope of PRISM's capabilities.
 */

import { promises as fs } from 'node:fs';

const MCP_SERVER = 'H:/prism/mcp-server';

async function readJSON(path) {
  try {
    const data = await fs.readFile(path, 'utf8');
    return JSON.parse(data);
  } catch { return null; }
}

async function getInventoryCounts() {
  const inv = await readJSON(`${MCP_SERVER}/data/state/BASELINE_INVENTORY.json`);
  if (!inv?.inventory) return null;
  const i = inv.inventory;
  return {
    engines: i.engines?.files || 0,
    dispatchers: i.dispatchers || 0,
    actions: i.actions || 0,
    formulas: i.formulas?.registered || 0,
    algorithms: i.algorithms || 0,
    tribalTips: i.tribal_tips || 0,
    materials: i.materials || 0,
    tools: i.tools || 0,
    machines: i.machines || 0,
    skills: i.skills || 0,
    hooks: i.hooks?.registry || 0,
    tests: i.test_count || 0,
    omega: inv.omega || 1
  };
}

async function getAIStats() {
  const stats = await readJSON(`${MCP_SERVER}/data/state/ai-intelligence-stats.json`);
  return stats || {};
}

async function main() {
  const [counts, aiStats] = await Promise.all([
    getInventoryCounts(),
    getAIStats()
  ]);

  const c = counts || {};
  const countLine = counts
    ? `${c.engines} engines | ${c.dispatchers} dispatchers | ${c.actions} actions | ${c.formulas} formulas | ${c.tribalTips} tribal tips | ${c.skills} skills | Ω=${c.omega}`
    : 'inventory unavailable';

  const briefing = `
## PRISM INTELLIGENCE BRIEFING — FULL ACTIVATION

### MISSION
PRISM = Manufacturing Intelligence Platform
Goal: Replace fragmented shop software with unified AI-powered system
Test shop: JM Die Company (21 machines, 100+ customers, cold heading dies)
Vision: All-in-one shop management, eventually tailorable to ANY field

### LIVE INVENTORY
${countLine}

### SELF-AWARENESS SYSTEM (ACTIVE)
The PRISMSelfAwarenessEngine provides full H: drive awareness:
\`\`\`typescript
import { prismSelfAwarenessEngine } from './engines/PRISMSelfAwarenessEngine.js';

// Find AI capabilities
engine.searchAIFeatures('reasoning');
engine.recommendAIFeatures('optimize cutting parameters');

// JM Die direct access (24,545 programs)
engine.getJMDieCustomerPath('ALCOA');  // → H:/PRISM/JM DIE/...
engine.getJMDieProgramPaths('lathe');  // → all lathe folders

// Knowledge retrieval
engine.searchTribalKnowledge('thin wall milling');  // 3,700+ tips
engine.searchPlaybookRules('roughing depth');       // 296 rules

// Full awareness
engine.getFullDriveAwareness();  // Complete H: drive map
\`\`\`

### MCP POWER UTILIZATION
89 dispatchers × 5,051 actions = massive capability surface
PREFER MCP calls over raw file operations:
- prism_calc: speed/feed, cycle time, cost estimation
- prism_cam: toolpath, strategy, post-processor
- prism_orchestrate: roadmap_claim, task_spawn, milestone_status
- prism_knowledge: search_tribal, search_formulas, search_algorithms
- prism_ai: activate_local, model_status, inference_run
- prism_machine_setup: fixture, workholding, tool magazine

### TOKEN EFFICIENCY
- Context economy hooks compress outputs (active)
- Use /slim for concise responses
- Use /context-map to visualize usage
- Delegate to subagents for parallel work
- Avoid reading large files (roadmap-index is 3MB!)
- Use MCP queries instead of grep/read

### INTERNAL AI SYSTEM
- OllamaClientEngine: local LLM inference (qwen, llama, codellama)
- LLMEngine: unified local/remote model interface
- AIIntelligenceMaximizerEngine: auto-utilizes AI capabilities
- Docker: H:/prism/data/docker-volumes (postgres, redis, models)
- Activate: prism_ai:activate_local, model_status

### KEY AI ENGINES (use these, don't rebuild!)
- DeepAIIntelligenceEngine: 8 reasoning modes
- CrossDisciplinaryDeepLearningEngine: 15 domains, 120+ formulas
- PRISMCreativeReasoningEngine: conventional → optimal
- MITCourseDeepLearningEngine: 227 courses mapped
- DuplicationGuardEngine: MANDATORY before creating!

### CRITICAL COMMANDS
/dedup — BEFORE creating anything
/forge-triple — engines + skills + hooks
/pdf-learn — extract from PDFs
/video-learn — extract from videos
/deep-think — exhaustive analysis mode
/enforce-role — activate expert polymath role
/sync-drives — sync H: ↔ C: content

### DUPLICATION GUARD (MANDATORY!)
BEFORE creating ANY new engine/formula/skill/hook:
\`\`\`typescript
const check = duplicationGuardEngine.checkBeforeCreating({
  assetType: "engine",
  proposedName: "MyNewEngine",
  keywords: ["relevant", "keywords"],
  description: "What it does"
});
if (!check.shouldProceed) { /* USE existing: check.matches[0] */ }
\`\`\`

PRISM is fully aware. Use its power.
`.trim();

  console.log(JSON.stringify({
    continue: true,
    additionalContext: briefing
  }));
}

main().catch(() => {
  console.log(JSON.stringify({ continue: true }));
});
