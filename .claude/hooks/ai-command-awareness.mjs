#!/usr/bin/env node
// tier: T4
/**
 * AI Command Awareness — SessionStart Hook
 *
 * Injects knowledge of ALL available slash commands into every session.
 * The AI system should automatically know when to suggest or invoke these.
 */

// Complete slash command inventory with usage triggers
const SLASH_COMMANDS = {
  // === KNOWLEDGE EXTRACTION (CRITICAL - AUTO-SUGGEST!) ===
  extraction: {
    commands: {
      "/pdf-learn": {
        purpose: "AI-powered PDF knowledge extraction into tribal tips/formulas (USE THIS!)",
        triggers: ["pdf", "manual", "catalog", "document", "paper", "extract", "learn from pdf"],
        usage: "/pdf-learn <path> | /pdf-learn batch | /pdf-learn catalog",
        critical: true,
      },
      "/video-learn": {
        purpose: "AI-powered video knowledge extraction into procedures (USE THIS!)",
        triggers: ["video", "youtube", "tutorial", "training", "watch", "learn from video"],
        usage: "/video-learn <path> | /video-learn youtube <url>",
        critical: true,
      },
      "/ingest": {
        purpose: "Ingest external data sources into PRISM knowledge base",
        triggers: ["ingest", "import", "load data", "add knowledge"],
        usage: "/ingest <source>",
      },
      "/shop-knowledge": {
        purpose: "Extract and categorize shop floor knowledge into tribal tips",
        triggers: ["tribal", "shop knowledge", "operator experience", "floor wisdom"],
        usage: "/shop-knowledge",
      },
    },
  },

  // === FORGE PIPELINES (CREATE NEW ASSETS) ===
  forge: {
    commands: {
      "/forge-triple": {
        purpose: "Run engines + skills + hooks creation pipeline (EXHAUSTIVE)",
        triggers: ["create engine", "new engine", "build engine", "forge", "generate"],
        usage: "/forge-triple | /forge-triple engines-only | /forge-triple 5",
      },
      "/forge-engine": {
        purpose: "Create a single new engine with full validation",
        triggers: ["new engine", "create engine", "build engine"],
        usage: "/forge-engine <name>",
      },
    },
  },

  // === HARDENING & OPTIMIZATION ===
  hardening: {
    commands: {
      "/machine-harden": {
        purpose: "Harden machine-specific capabilities (lathe, mill, EDM, etc.)",
        triggers: ["harden", "machine capability", "improve machine", "strengthen"],
        usage: "/machine-harden <machine-type>",
      },
      "/de-sloppify": {
        purpose: "Clean up and improve code quality across files",
        triggers: ["clean up", "refactor", "improve code", "fix quality"],
        usage: "/de-sloppify",
      },
      "/scrutinize": {
        purpose: "Deep scrutiny of code for issues, gaps, improvements",
        triggers: ["review", "scrutinize", "audit", "check quality"],
        usage: "/scrutinize",
      },
      "/program-optimize": {
        purpose: "Optimize CNC programs for speed/feed/tool life",
        triggers: ["optimize program", "improve program", "speed up"],
        usage: "/program-optimize <program-path>",
      },
    },
  },

  // === VERIFICATION & VALIDATION ===
  verification: {
    commands: {
      "/formula-check": {
        purpose: "Validate physics formulas against known constants",
        triggers: ["formula", "physics", "kienzle", "taylor", "validate formula"],
        usage: "/formula-check",
      },
      "/verify-loop": {
        purpose: "Continuous verification loop for quality assurance",
        triggers: ["verify", "validate", "check", "continuous verification"],
        usage: "/verify-loop",
      },
      "/dedup": {
        purpose: "Find and eliminate duplicate code/engines/formulas",
        triggers: ["duplicate", "dedup", "redundant", "similar"],
        usage: "/dedup",
      },
    },
  },

  // === ROADMAP & PLANNING ===
  roadmap: {
    commands: {
      "/continue-roadmap": {
        purpose: "Continue working on PRISM roadmap milestones",
        triggers: ["roadmap", "milestone", "continue", "next task"],
        usage: "/continue-roadmap",
      },
      "/generate-roadmap": {
        purpose: "Generate new roadmap from requirements",
        triggers: ["new roadmap", "plan", "generate plan"],
        usage: "/generate-roadmap",
      },
      "/rgs": {
        purpose: "RGS protocol for systematic work progression",
        triggers: ["rgs", "protocol", "systematic"],
        usage: "/rgs",
      },
    },
  },

  // === SHOP FLOOR OPERATIONS ===
  shopFloor: {
    commands: {
      "/quote-to-ship": {
        purpose: "Full quote-to-ship pipeline orchestration",
        triggers: ["quote", "job", "order", "ship", "delivery"],
        usage: "/quote-to-ship",
      },
      "/job-cost": {
        purpose: "Calculate job costing and estimates",
        triggers: ["cost", "estimate", "pricing", "quote"],
        usage: "/job-cost",
      },
      "/shop-schedule": {
        purpose: "View/manage shop floor schedule",
        triggers: ["schedule", "planning", "capacity", "workload"],
        usage: "/shop-schedule",
      },
      "/shop-live-status": {
        purpose: "Real-time shop floor status",
        triggers: ["status", "live", "current", "now"],
        usage: "/shop-live-status",
      },
      "/traveler": {
        purpose: "Generate job traveler documents",
        triggers: ["traveler", "job sheet", "work order"],
        usage: "/traveler <job-id>",
      },
    },
  },

  // === MACHINE-SPECIFIC (CRITICAL!) ===
  machineSpecific: {
    commands: {
      "/wire-edm-studio": {
        purpose: "Full Wire EDM programming studio with AI",
        triggers: ["wire edm", "wedm", "wire cut", "edm program", "mitsubishi edm"],
        usage: "/wire-edm-studio",
        critical: true,
      },
      "/lathe-studio": {
        purpose: "Full lathe/turning programming studio with AI",
        triggers: ["lathe", "turning", "okuma", "turning center", "cnc lathe"],
        usage: "/lathe-studio",
        critical: true,
      },
      "/wire-edm-analyze": {
        purpose: "Analyze Wire EDM programs for optimization",
        triggers: ["analyze edm", "edm analysis", "wire analysis"],
        usage: "/wire-edm-analyze <program>",
      },
      "/wedm-batch": {
        purpose: "Batch process Wire EDM programs",
        triggers: ["batch edm", "multiple edm", "edm batch"],
        usage: "/wedm-batch",
      },
      "/wedm-program": {
        purpose: "Create/edit Wire EDM program",
        triggers: ["new edm program", "create wedm"],
        usage: "/wedm-program",
      },
      "/lathe-ai": {
        purpose: "Lathe AI assistance",
        triggers: ["lathe ai", "turning ai"],
        usage: "/lathe-ai",
      },
    },
  },

  // === ANALYSIS & REPORTING ===
  analysis: {
    commands: {
      "/program-audit": {
        purpose: "Audit CNC programs for issues",
        triggers: ["audit", "program check", "review program"],
        usage: "/program-audit <path>",
      },
      "/resource-census": {
        purpose: "Census of all PRISM resources",
        triggers: ["census", "inventory", "count", "resources"],
        usage: "/resource-census",
      },
      "/context-audit": {
        purpose: "Audit context window usage",
        triggers: ["context", "tokens", "window"],
        usage: "/context-audit",
      },
      "/biz-health": {
        purpose: "Business health dashboard",
        triggers: ["business", "health", "metrics", "kpi"],
        usage: "/biz-health",
      },
    },
  },

  // === MACRO & POST PROCESSING ===
  postProcessing: {
    commands: {
      "/macro-convert": {
        purpose: "Convert macros between controller formats",
        triggers: ["macro", "convert", "fanuc", "okuma", "haas"],
        usage: "/macro-convert <source> <target>",
      },
      "/pp-resolve": {
        purpose: "Resolve post processor issues",
        triggers: ["post processor", "pp", "post", "g-code"],
        usage: "/pp-resolve",
      },
    },
  },

  // === SMART/AI COMMANDS ===
  ai: {
    commands: {
      "/smart": {
        purpose: "Smart AI-powered task execution",
        triggers: ["smart", "ai", "intelligent", "auto"],
        usage: "/smart <task>",
      },
      "/advisor-strategy": {
        purpose: "Configure AI advisor strategy",
        triggers: ["advisor", "strategy", "ai config"],
        usage: "/advisor-strategy",
      },
      "/self-improve": {
        purpose: "AI self-improvement cycle",
        triggers: ["self improve", "enhance", "evolve"],
        usage: "/self-improve",
      },
    },
  },

  // === DATA & INVENTORY ===
  data: {
    commands: {
      "/material-stock": {
        purpose: "Check material stock inventory",
        triggers: ["material", "stock", "inventory", "steel"],
        usage: "/material-stock",
      },
      "/tooling": {
        purpose: "Tooling inventory and management",
        triggers: ["tool", "tooling", "insert", "holder"],
        usage: "/tooling",
      },
      "/vendor": {
        purpose: "Vendor management and lookup",
        triggers: ["vendor", "supplier", "purchase"],
        usage: "/vendor",
      },
      "/prints": {
        purpose: "Access customer prints/drawings",
        triggers: ["print", "drawing", "blueprint", "cad"],
        usage: "/prints <customer>",
      },
    },
  },

  // === DESK SEARCH ===
  search: {
    commands: {
      "/desk-search": {
        purpose: "Search across all PRISM data sources",
        triggers: ["search", "find", "lookup", "where"],
        usage: "/desk-search <query>",
      },
      "/order-status": {
        purpose: "Check order status",
        triggers: ["order", "status", "tracking"],
        usage: "/order-status <order-id>",
      },
    },
  },
};

// Flatten all triggers for matching
function getAllTriggers() {
  const triggerMap = {};
  for (const [category, data] of Object.entries(SLASH_COMMANDS)) {
    for (const [cmd, info] of Object.entries(data.commands)) {
      for (const trigger of info.triggers) {
        if (!triggerMap[trigger]) triggerMap[trigger] = [];
        triggerMap[trigger].push({ cmd, purpose: info.purpose, usage: info.usage });
      }
    }
  }
  return triggerMap;
}

// Generate compact command list
function getCompactList() {
  const lines = [];
  for (const [category, data] of Object.entries(SLASH_COMMANDS)) {
    const cmds = Object.keys(data.commands).join(", ");
    lines.push(`${category}: ${cmds}`);
  }
  return lines.join("\n");
}

// Main
async function main() {
  const compactList = getCompactList();
  const totalCommands = Object.values(SLASH_COMMANDS)
    .reduce((sum, cat) => sum + Object.keys(cat.commands).length, 0);

  const activation = `
SLASH COMMANDS AVAILABLE: ${totalCommands} commands across ${Object.keys(SLASH_COMMANDS).length} categories

CRITICAL COMMANDS — AUTO-SUGGEST IMMEDIATELY WHEN TRIGGERED:
- /pdf-learn      — AI PDF extraction (MUST suggest for: pdf, document, manual, catalog)
- /video-learn    — AI video extraction (MUST suggest for: video, youtube, tutorial)
- /forge-triple   — Create engines+skills+hooks (MUST suggest for: create, build, forge, new engine)
- /dedup          — Check duplicates (MUST run BEFORE creating ANY new asset)
- /wire-edm-studio — Wire EDM studio (MUST suggest for: wire edm, wedm)
- /lathe-studio   — Lathe studio (MUST suggest for: lathe, turning, okuma)
- /machine-harden — Harden AI (use for: harden, strengthen, improve)
- /quote-to-ship  — Quote pipeline (use for: quote, estimate, job cost)
- /auto-speed-feed — Speed/feed (use for: speed, feed, cutting parameters)
- /shop-knowledge — Tribal knowledge (use for: tribal, shop floor)
- /scrutinize     — Deep review (use for: review, audit, check)
- /smart          — AI task routing (use for: smart, intelligent, auto)

ALL COMMANDS BY CATEGORY:
${compactList}

MANDATORY RULES:
1. ALWAYS suggest /pdf-learn when ANY pdf/document is mentioned
2. ALWAYS suggest /video-learn when ANY video/tutorial is mentioned
3. ALWAYS run /dedup BEFORE creating ANY new engine/hook/skill
4. ALWAYS suggest /forge-triple (not /forge-engine) for new capabilities
`.trim();

  console.log(JSON.stringify({ continue: true, systemMessage: activation }));
}

main().catch(() => { console.log(JSON.stringify({ continue: true })); });
