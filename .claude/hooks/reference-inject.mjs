#!/usr/bin/env node
// tier: T4
import fs from "node:fs";


function readStdinSafe() {
  try {
    if (process.stdin.isTTY) return "";
    return fs.readFileSync(0, "utf-8");
  } catch {
    return "";
  }
}
// DISABLED_TOKEN_REDUX_2026_04_23: short-circuited by user-approved token-reduction pass.
// Remove the next 2 lines to re-enable. See .claude/helpers/apply-hook-fixes.mjs
process.stdout.write(JSON.stringify({ continue: true })); process.exit(0);
/**
 * reference-inject.mjs — UserPromptSubmit hook
 *
 * On-demand injection of reference tables from CLAUDE.md.
 * Only injects sections relevant to the user's prompt.
 * Saves ~1,600 tokens/turn on average.
 */

const SECTIONS = {
  dispatchers: {
    triggers: ['dispatcher', 'prism_calc', 'prism_ai', 'prism_cam', 'prism_edm', 'mcp action', 'existing action', 'calculate', 'compute', 'toolpath', 'gcode', 'cycle time', 'feed rate', 'cutting force', 'surface finish'],
    content: `## Top Dispatchers (full: DISPATCHER_DIGEST.md)
| Dispatcher | Actions | Domain |
|---|---:|---|
| prism_calc | 1113 | manufacturing physics |
| prism_ai | 1096 | AI reasoning, deep learning |
| prism_cam | 861 | CAM/toolpath |
| prism_edm | 286 | non-traditional machining |
| prism_data | 201 | data ingestion/query |
| prism_dev | 183 | build/quality/inventory |
Other: prism_intelligence, prism_safety, prism_omega, prism_session, prism_memory, prism_orchestrate, prism_business, prism_5axis, prism_compliance.`
  },

  engines: {
    triggers: ['engine categor', 'existing engine', 'what engines', 'engine list', 'engine_digest', 'force engine', 'thermal engine', 'cam bridge'],
    content: `## Engine Categories (full: ENGINE_DIGEST.md)
| Category | Count | Key Examples |
|---|---:|---|
| Force/Physics | 17 | KienzleForceModelEngine, StochasticCuttingForceEngine |
| Speed/Feed | 6 | SpeedFeedOrchestratorEngine, UltimateSpeedFeedEngine |
| Chatter/Stability | 13 | ChatterStabilityLobeEngine, RegenerativeChatterEngine |
| Deflection | 17 | ToolDeflectionEngine, PartDeflectionEngine |
| Thermal | 24 | ThermalWearCouplingEngine, CryogenicCuttingEngine |
| Wear/Life | 9 | ToolWearProgressionEngine, StochasticToolLifeEngine |
| Surface | 17 | SurfaceFinishPredictorEngine, SurfaceIntegrityEngine |
| CAM Bridges | 40 | per-CAM for Mastercam, hyperMILL, Fusion, NX, PowerMill |
| Post-Processing | 20 | PostProcessorPipelineEngine, FiveAxisPostEngine |
| Quality/SPC | 10 | SPCProcessCapabilityEngine, FAIEngine |
| Business/ERP | 42 | QuoteEstimatorEngine, CapacityPlanningEngine, OEEEngine |
| Pipelines | 9 | PrintToProgramPipelineEngine, QuoteToShipOrchestratorEngine |`
  },

  lora: {
    triggers: ['lora', 'fine-tun', 'fine tun', 'ollama', 'local llm', 'docker llm', 'ai backend', 'model routing'],
    content: `## AI Backend Routing
| Task | Backend |
|---|---|
| Physics validation | Docker: physics-agent |
| Engine building | Claude Opus |
| ML inference | Ollama (PRISM LoRA adapters) |
| Batch >100 files | Docker: batch-processor |
| Cross-disciplinary | Claude |

LoRA stack: OllamaIntegrationEngine, PRISMLoRAAdapterEngine, WEDMLoRAAdapterEngine, 10× domain LoRACadenceEngines, LoRADriftCoordinatorEngine.
Slash: /train-lora /ai-reason /smart-route`
  },

  plugins: {
    triggers: ['plugin', 'superpowers', 'hookify', 'figma', 'playwright', 'greptile', 'serena', 'qodo', 'linear', 'supabase', 'code review', 'pr review', 'pull request', 'commit', 'git workflow', 'browser test', 'e2e test', 'frontend design', 'ui design', 'lsp', 'refactor'],
    content: `## Installed Plugins (23)
| Plugin | Use when |
|---|---|
| superpowers:* | complex multi-phase work |
| feature-dev | guided feature dev |
| code-review, pr-review-toolkit | PR analysis |
| commit-commands:* | git workflow |
| hookify:* | new enforcement rules |
| skill-creator | new skills |
| figma:* | Figma→code |
| playwright | browser E2E |
| github:* (15 modes) | multi-agent GitHub |
| {typescript,rust-analyzer,clangd}-lsp | LSP refactors |
| greptile | NL repo search |
| serena | semantic code nav |
| qodo-skills | rule-driven code |
| supabase | db schema, RLS |`
  },

  paths: {
    triggers: ['portable', 'other pc', 'switch computer', 'h drive', 'c drive', 'junction', 'path issue', 'portability'],
    content: `## Cross-PC Paths
| What | Path |
|---|---|
| Claude config | ~/.claude/ → H:\\.claude\\ (junctioned) |
| Python 3.13 | H:\\Tools\\python\\python.exe |
| PRISM repo | H:\\PRISM\\ |
| Setup script | node H:\\PRISM\\.claude\\helpers\\portability-setup.mjs |
| Troubleshoot | H:\\.claude\\plans\\forge-brainstorm-2026-04-21.md |`
  },

  context: {
    triggers: ['context engineer', 'token budget', 'compact', 'checkpoint', 'memory engine', 'context compress', 'precompact', 'running out of context', 'context limit', 'save state', 'persist', 'remember across', 'session memory'],
    content: `## Context Engineering
| Trigger | Action |
|---|---|
| 15/25/35 edits | ContextCheckpointEngine auto-saves |
| Context >900K | /precompact; compact at 940K |
| Redundant content | ContextCompressionEngine |
| Cross-session | PersistentMemoryEngine, AgentMemoryFabricEngine |
| Vector search | QdrantMemoryEngine |
| Budget | TokenEconomyEngine, /token-ledger |

prism_context actions: kv_sort_json, memory_externalize/restore, compression_*, checkpoint_*.
prism_memory actions: get_health, find_similar, consolidate, pressure_*.`
  },

  coordination: {
    triggers: ['multi-chat', 'concurrent chat', 'coordination', 'agent_workboard', 'shared state', 'claim', 'handoff', 'other chat', 'another session', 'parallel work', '8 chat', '6 chat', 'race condition', 'conflict'],
    content: `## Multi-Agent Coordination (6+ chats)
Live state: state/shared/AGENT_WORKBOARD.md, AGENT_CHAT.md, AGENT_COORDINATION_STATUS.md
Claims: ACTIVE_ROADMAP_CLAIMS.json, ACTIVE_WORK_REGISTRY.json (stale >5min → reap)
Directives: CLAUDE-CODEX-*.md (MCP, task queue, SVI, search-token)
Handoff: node H:\\PRISM\\.claude\\helpers\\per-agent-handoff.mjs {read|write}`
  },

  mcp: {
    triggers: ['mcp server', 'prism_safe', 'semgrep', 'gmail mcp', 'calendar mcp', 'authenticate', 'static analysis', 'security scan', 'email', 'calendar', 'google drive', 'issue track', 'database schema'],
    content: `## MCP Servers
| Server | When |
|---|---|
| prism_safe (prism_context, prism_memory) | context/memory ops |
| prism-mcp-server | every PRISM capability |
| semgrep | static analysis |
| claude_ai_{Gmail,Calendar,Drive} | business context |
| plugin:linear | issue management |
| plugin:supabase | db schema, RLS |`
  },

  orchestrators: {
    triggers: ['one button', 'one click', 'automatic program', 'end to end', 'full pipeline', 'print to program', 'drawing to gcode', 'upload drawing', 'upload print', 'apprentice', 'mentor', 'teach me', 'learn manufacturing', 'feasibility', 'can we machine', 'is it possible', 'automate everything', 'complete workflow'],
    content: `## High-Level Orchestrators (one-button solutions)
| Engine | What it does |
|---|---|
| ApprenticeEngine | Manufacturing mentor — transforms PRISM into a teaching system |
| AutoProgramOrchestratorEngine | 10-stage Fusion 360 pipeline: model → verified G-code |
| PrintToProgramPipelineEngine | Upload print → get CNC program (lathe, mill, 5-axis, WEDM variants) |
| QuoteToShipOrchestratorEngine | Full job lifecycle: quote → ship |
| FeasibilityOrchestratorEngine | Can-we-machine-this analysis |
| OneClickWEDMGeneratorEngine | Drawing → verified WEDM G-code |

Invoke: /quote-to-ship, /auto-speed-feed, /wire-edm-studio, /lathe-studio`
  }
};

async function main() {
  const input = readStdinSafe();
  let payload;
  try {
    payload = JSON.parse(input);
  } catch {
    console.log(JSON.stringify({ continue: true }));
    return;
  }

  const prompt = (payload.prompt || payload.message || '').toLowerCase();
  if (!prompt || prompt.length < 3) {
    console.log(JSON.stringify({ continue: true }));
    return;
  }

  const matched = [];
  for (const [name, section] of Object.entries(SECTIONS)) {
    if (section.triggers.some(t => prompt.includes(t.toLowerCase()))) {
      matched.push(section.content);
    }
  }

  if (matched.length === 0) {
    console.log(JSON.stringify({ continue: true }));
    return;
  }

  // Cap at 2 sections to avoid bloat
  const injected = matched.slice(0, 2).join('\n\n');

  console.log(JSON.stringify({
    continue: true,
    hookSpecificOutput: {
      hookEventName: "UserPromptSubmit",
      additionalContext: `## Reference (auto-injected)\n${injected}`,
    },
  }));
}

main().catch(() => {
  console.log(JSON.stringify({ continue: true }));
});
