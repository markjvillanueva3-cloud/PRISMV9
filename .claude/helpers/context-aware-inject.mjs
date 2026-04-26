#!/usr/bin/env node
/**
 * context-aware-inject.mjs — Tool-Triggered Context Injection
 *
 * MASSIVE TOKEN SAVINGS: Instead of injecting full manifest at session start,
 * inject ONLY relevant context when specific tools are called.
 *
 * Fires on: PreToolUse (all tools)
 *
 * Strategy:
 *   - MCP prism_calc:* → inject relevant formulas
 *   - MCP prism_data:* → inject registry counts
 *   - MCP prism_safety:* → inject physics constants reminder
 *   - Edit/Write on engines → inject ENGINE_DIGEST.md reminder
 *   - Edit/Write on dispatchers → inject wiring patterns
 *   - Agent spawn → inject capability summary
 *   - Bash git commit → inject commit format
 */

import process from "node:process";

// Tool input comes from environment
const toolName = process.env.TOOL_NAME || "";
const toolInput = process.env.TOOL_INPUT || "{}";

// Parse tool input
let input = {};
try {
  input = JSON.parse(toolInput);
} catch {}

// ═══════════════════════════════════════════════════════════════════════════
// CONTEXT MAPS — Minimal tokens, maximum relevance
// ═══════════════════════════════════════════════════════════════════════════

const MCP_CONTEXT = {
  // Calculation dispatchers
  "prism_calc": {
    actions: {
      "cutting_force": "KIENZLE: Fc=kc1.1×b×h^(1-mc). kc1.1: P=1800, M=2100, K=1100, N=700, S=2800 MPa. Import from src/physics/constants.ts",
      "speed_feed": "Use SpeedFeedOrchestratorEngine (2851 LOC). Check material ISO group first.",
      "tool_life": "TAYLOR: VT^n=C. Carbide n≈0.25, HSS n≈0.125. Extended: VT^n×f^a×ap^b=C",
      "power": "P=Fc×Vc/60000 [kW]. Check machine spindle limit.",
      "thermal": "Heat partition R, Jaeger T_max. Coolant reduces 20-40%.",
      "chatter": "SLD: b_lim=-1/(2Re[G]Kf). Run near SLD peaks for max stable depth.",
      "deflection": "δ=FL³/3EI. L/D<4 carbide, <3 HSS. Error≈2×static deflection.",
    },
    default: "509 formulas in FormulaRegistry. Import physics from src/physics/constants.ts"
  },

  "prism_data": {
    actions: {
      "material_lookup": "6,372 materials in MaterialRegistry. ISO groups: P(steel), M(stainless), K(cast), N(non-ferrous), S(super), H(hard)",
      "tool_lookup": "95,608 tools in ToolRegistry. Check coating for speed multiplier.",
      "machine_lookup": "910 machines in MachineRegistry. JM Die: 7 Okuma lathes, 5 mills, 2 EDMs",
    },
    default: "23 registries, 29,569 total entries"
  },

  "prism_safety": {
    default: "S(x)≥0.70 required. Physics from src/physics/constants.ts. Never inline Kienzle/Taylor constants."
  },

  "prism_toolpath": {
    default: "698 strategies in ToolpathStrategyRegistry. Check collision before simulate."
  },

  "prism_edm": {
    default: "JM Die: 2 Mitsubishi EDMs. Spark gap 0.01-0.05mm. Wire offset = D/2 + gap."
  },

  "prism_post_processor": {
    default: "500+ posts in ppg-asset-catalog.json. Fanuc: G05.1 AICC, Nano Smoothing. 100+ controller tips."
  },

  "prism_quality": {
    default: "SPC: Cpk=min((USL-μ)/3σ,(μ-LSL)/3σ). Target Cpk≥1.33. Nelson rules for control charts."
  },

  "prism_orchestrate": {
    actions: {
      "roadmap_next": "525 milestones, 145 complete. Check PRISM-UNIFIED-ROADMAP-v2.md",
      "roadmap_claim": "Use distributed locking. Check other terminal claims first.",
    },
    default: "Roadmap: 525ms, 145 complete, 380 remaining. Position: S1-MS2"
  },

  "prism_knowledge": {
    actions: {
      "tribal_search": "Use /shop-knowledge for extraction. 4,493 tips across 18 CAM systems.",
      "video_learn": "Use /video-learn slash command for AI-powered video extraction.",
      "pdf_extract": "Use /pdf-learn slash command for AI-powered PDF extraction.",
    },
    default: "4,493 tribal tips. 69 video transcripts. 225 MIT courses → 285 algorithms. COMMANDS: /pdf-learn, /video-learn, /shop-knowledge"
  },
};

const FILE_PATTERNS = {
  // Engine files — MANDATORY duplication check
  "src/engines/": "STOP! Before creating engines: import {duplicationGuardEngine} from 'DuplicationGuardEngine.js'; await duplicationGuardEngine.checkBeforeCreating('engine', 'Name', 'description'). 1,559 engines exist. Use PRISMSelfAwarenessEngine.searchEngines() to find existing.",

  // Dispatcher files
  "src/tools/dispatchers/": "82 dispatchers. Each has z.enum action list. Lazy-load engines.",

  // Physics files
  "src/physics/": "CRITICAL: Canonical Kienzle/Taylor constants. Never modify without verification.",

  // Registry files
  "src/registries/": "23 registries. BaseRegistry pattern. Export singleton.",

  // Algorithm files
  "src/algorithms/": "52 algorithms. Check AlgorithmRegistry before adding.",

  // Test files
  "__tests__": "1,257 tests. Run: npx vitest run [file]. Describe/it/expect pattern.",

  // Schema files
  "src/schemas/": "Zod schemas per dispatcher. schemaVersion required for state JSON.",
};

const BASH_PATTERNS = {
  "git commit": "Format: LAYER-PHASE-UNIT: title — summary. Co-Authored-By: Claude",
  "git push": "Confirm before pushing. Check for uncommitted changes first.",
  "npm run build": "build:fast (3s esbuild), build:verify (30s full). 0 tsc errors required.",
  "npx vitest": "1,257 tests. Run specific: npx vitest run src/__tests__/[file]",
};

// ═══════════════════════════════════════════════════════════════════════════
// INJECTION LOGIC
// ═══════════════════════════════════════════════════════════════════════════

function getContext() {
  // MCP tool calls
  if (toolName.startsWith("mcp__prism__")) {
    const dispatcher = toolName.replace("mcp__prism__", "");
    const action = input.action || "";

    const dispatcherCtx = MCP_CONTEXT[dispatcher];
    if (dispatcherCtx) {
      // Check for action-specific context
      if (dispatcherCtx.actions && dispatcherCtx.actions[action]) {
        return dispatcherCtx.actions[action];
      }
      return dispatcherCtx.default;
    }
  }

  // File operations (Edit, Write)
  if (toolName === "Edit" || toolName === "Write") {
    const filePath = input.file_path || "";
    for (const [pattern, context] of Object.entries(FILE_PATTERNS)) {
      if (filePath.includes(pattern)) {
        return context;
      }
    }
  }

  // Bash commands
  if (toolName === "Bash") {
    const command = input.command || "";
    for (const [pattern, context] of Object.entries(BASH_PATTERNS)) {
      if (command.includes(pattern)) {
        return context;
      }
    }
  }

  // Agent spawn — give full AI system capability summary with CRITICAL COMMANDS
  if (toolName === "Agent") {
    return "PRISM AI SYSTEM: 1660 engines, 84 dispatchers, 4296 actions. " +
      "CRITICAL COMMANDS: /pdf-learn (PDFs/docs), /video-learn (videos), /forge-triple (engines - run /dedup FIRST!), " +
      "/wire-edm-studio (EDM), /lathe-studio (lathe), /quote-to-ship (quotes), /auto-speed-feed (speeds). " +
      "MANDATORY: Check DuplicationGuardEngine before creating. H: drive has 24,545 JM Die programs, 3,700+ tribal tips, 296 playbook rules.";
  }

  // No context needed
  return null;
}

// ═══════════════════════════════════════════════════════════════════════════
// MAIN
// ═══════════════════════════════════════════════════════════════════════════

function main() {
  const context = getContext();

  if (context) {
    process.stdout.write(JSON.stringify({
      additionalContext: `[CTX] ${context}`,
    }));
  } else {
    process.stdout.write(JSON.stringify({ continue: true }));
  }
}

main().catch(() => { process.stdout.write(JSON.stringify({ continue: true })); });
