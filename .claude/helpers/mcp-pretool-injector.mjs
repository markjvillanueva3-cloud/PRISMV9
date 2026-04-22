#!/usr/bin/env node
/**
 * mcp-pretool-injector.mjs — PreToolUse hook for MCP (prism_*) tool calls
 *
 * Injects context-aware guidance before MCP actions:
 *   1. Action category hints (calc, data, safety, etc.)
 *   2. Related actions that might be needed
 *   3. Physics/safety reminders for relevant actions
 *   4. DSL shortcode hints
 *
 * Fires on: mcp__prism__* tool calls
 */

import process from "node:process";

// Action categories and their guidance
const ACTION_CATEGORIES = {
  // Calculation actions - physics-critical
  calc: {
    pattern: /speed_feed|cutting_force|tool_life|thermal|power|cycle_time|deflection/,
    guidance: "PHYSICS-CRITICAL: Ensure material/tool are validated. Results use AtomicValue schema.",
    related: ["prism_data:material_lookup", "prism_data:tool_lookup", "prism_safety:limit_check"],
  },

  // Data lookup actions
  data: {
    pattern: /lookup|search|catalog|registry|list_/,
    guidance: "Use specific filters to narrow results. Check if data exists before compute actions.",
    related: [],
  },

  // Safety actions
  safety: {
    pattern: /safety|collision|limit|veto|guard/,
    guidance: "SAFETY-CRITICAL: Never skip safety checks. S(x) < 0.70 = hard block.",
    related: ["prism_calc:speed_feed_validate"],
  },

  // EDM actions - suggest /wire-edm-studio
  edm: {
    pattern: /wedm|sinker|electrode|edm_/,
    guidance: "Wire EDM uses spark gap physics. Consider /wire-edm-studio for full programming.",
    related: ["prism_data:machine_lookup"],
    commands: ["/wire-edm-studio"],
  },

  // Turning/lathe actions - suggest /lathe-studio
  turning: {
    pattern: /lathe|turning|boring|threading|grooving/,
    guidance: "Consider /lathe-studio for full lathe programming capabilities.",
    related: [],
    commands: ["/lathe-studio"],
  },

  // Orchestration actions
  orchestrate: {
    pattern: /roadmap|milestone|claim|complete/,
    guidance: "Roadmap actions affect shared state. Check claims before working.",
    related: ["prism_orchestrate:roadmap_status"],
  },

  // Knowledge actions
  knowledge: {
    pattern: /tribal|playbook|learn|tip/,
    guidance: "Knowledge base has 4,493+ tips. Use category filters for relevance.",
    related: [],
    commands: ["/shop-knowledge"],
  },

  // Extraction actions - CRITICAL COMMAND TRIGGERS
  extraction: {
    pattern: /extract|pdf|video|document|ingest/,
    guidance: "Use slash commands for extraction: /pdf-learn, /video-learn, /shop-knowledge",
    related: [],
    commands: ["/pdf-learn", "/video-learn"],
    critical: true,
  },

  // Forge/creation actions - DEDUP FIRST
  forge: {
    pattern: /forge|create|generate|new.*engine/,
    guidance: "ALWAYS run /dedup before creating. Use /forge-triple for exhaustive creation.",
    related: ["prism_guard:check_duplicate"],
    commands: ["/dedup", "/forge-triple"],
    critical: true,
  },

  // Dev actions
  dev: {
    pattern: /build|test|health|audit|lint/,
    guidance: "Dev actions may be slow. Use cached results when available.",
    related: [],
  },
};

// DSL shortcuts for common actions
const ACTION_SHORTCUTS = {
  "prism_calc:speed_feed_solve": "PC:sfs",
  "prism_calc:cutting_force": "PC:cf",
  "prism_calc:tool_life_calculate": "PC:tl",
  "prism_data:material_lookup": "PD:ml",
  "prism_data:tool_lookup": "PD:tl",
  "prism_safety:safety_check": "PS:chk",
  "prism_orchestrate:roadmap_next": "POR:nxt",
  "prism_knowledge:tribal_search": "PKN:trb",
  "prism_edm:wedm_multipass": "PEDM:mp",
};

function getActionCategory(action) {
  for (const [cat, config] of Object.entries(ACTION_CATEGORIES)) {
    if (config.pattern.test(action)) {
      return { category: cat, ...config };
    }
  }
  return null;
}

function main() {
  const toolName = process.env.TOOL_NAME || "";
  const action = process.env.TOOL_INPUT_action || "";

  // Only fire for MCP prism tools
  if (!toolName.startsWith("mcp__prism")) {
    process.stdout.write("{}");
    return;
  }

  const parts = [];

  // Get action category guidance
  const catInfo = getActionCategory(action);
  if (catInfo) {
    parts.push(`[${catInfo.category.toUpperCase()}] ${catInfo.guidance}`);
    if (catInfo.related.length > 0) {
      parts.push(`Related: ${catInfo.related.slice(0, 2).join(", ")}`);
    }
    // Add command suggestions if available
    if (catInfo.commands?.length > 0) {
      parts.push(`COMMANDS: ${catInfo.commands.join(", ")}`);
    }
  }

  // Add DSL shortcode hint
  const fullAction = `${toolName.replace("mcp__prism__", "prism_")}:${action}`;
  const shortcode = ACTION_SHORTCUTS[fullAction];
  if (shortcode) {
    parts.push(`DSL: ${shortcode}`);
  }

  if (parts.length > 0) {
    process.stdout.write(JSON.stringify({
      additionalContext: `MCP ACTION: ${parts.join(" | ")}`,
    }));
  } else {
    process.stdout.write("{}");
  }
}

main();
