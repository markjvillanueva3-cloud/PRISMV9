#!/usr/bin/env node
// tier: T4
/**
 * AI Deep Intelligence — Comprehensive SessionStart Hook
 *
 * Provides EVERY session with complete AI system awareness:
 * - ALL 55+ slash commands with triggers
 * - Neural routing patterns
 * - Auto-invocation rules
 * - Deep learning capabilities
 * - Cross-system knowledge
 *
 * This hook ensures NO session is unaware of ANY capability.
 */

// Complete command inventory with auto-invoke triggers
const COMMAND_INTELLIGENCE = {
  // === CRITICAL LEARNING COMMANDS ===
  learning: {
    "/pdf-learn": {
      triggers: ["pdf", "document", "manual", "catalog", "paper", "extract knowledge"],
      autoInvoke: ["learn from pdf", "extract from pdf", "pdf knowledge"],
      engines: ["PDFFormulaExtractionEngine", "LectureNoteExtractionEngine", "AIExtractionReasonerEngine"],
      purpose: "AI-powered PDF knowledge extraction into tribal knowledge",
    },
    "/video-learn": {
      triggers: ["video", "youtube", "tutorial", "training video", "machining video"],
      autoInvoke: ["learn from video", "extract from video", "video knowledge"],
      engines: ["VideoELearningAIEngine", "VideoLearningEngine", "VideoReplayOrchestratorEngine"],
      purpose: "AI-powered video knowledge extraction into procedures/tips",
    },
    "/shop-knowledge": {
      triggers: ["tribal", "shop floor", "operator", "experience", "wisdom"],
      autoInvoke: ["tribal knowledge", "shop wisdom", "operator tips"],
      engines: ["TribalKnowledgeAdvisorEngine", "MachiningPlaybookEngine"],
      purpose: "Extract and categorize shop floor knowledge",
    },
    "/ingest": {
      triggers: ["ingest", "import", "load data", "add knowledge"],
      autoInvoke: ["ingest data", "import data"],
      engines: ["ResourceHarvestingIntelligenceEngine", "AutomatedResourceHarvestingPipeline"],
      purpose: "Ingest external data sources into PRISM",
    },
  },

  // === FORGE/CREATION COMMANDS ===
  forge: {
    "/forge-triple": {
      triggers: ["forge", "create engine", "build engine", "new engine", "create skill", "create hook"],
      autoInvoke: ["build new engine", "create new capability", "forge new"],
      engines: ["DuplicationGuardEngine", "AISystemSynchronizerEngine"],
      purpose: "Create engines + skills + hooks with EXHAUSTIVE extraction",
      critical: true,
    },
    "/forge-engine": {
      triggers: ["single engine", "one engine"],
      autoInvoke: [],
      engines: ["DuplicationGuardEngine"],
      purpose: "Create a single new engine",
    },
  },

  // === MACHINE-SPECIFIC COMMANDS ===
  machines: {
    "/wire-edm-studio": {
      triggers: ["wire edm", "wedm", "wire cut", "edm program", "spark erosion"],
      autoInvoke: ["edm program", "wire edm job"],
      engines: ["WireEDMDeepAIHardeningEngine", "WEDMProgramAnalyzerEngine"],
      purpose: "Full Wire EDM programming studio with AI",
    },
    "/lathe-studio": {
      triggers: ["lathe", "turning", "okuma lathe", "cnc lathe"],
      autoInvoke: ["lathe program", "turning job"],
      engines: ["LatheDeepAIHardeningEngine", "LatheAIOrchestrationEngine"],
      purpose: "Full lathe programming studio",
    },
    "/machine-harden": {
      triggers: ["harden", "hardening", "strengthen", "improve machine"],
      autoInvoke: ["harden capabilities", "strengthen machine"],
      engines: ["MillingDeepAIHardeningEngine", "LatheDeepAIHardeningEngine", "WireEDMDeepAIHardeningEngine"],
      purpose: "Harden machine-specific AI capabilities",
    },
  },

  // === OPTIMIZATION COMMANDS ===
  optimization: {
    "/program-optimize": {
      triggers: ["optimize program", "improve program", "faster program"],
      autoInvoke: ["optimize cnc", "speed up program"],
      engines: ["SpeedFeedOrchestratorEngine", "AIPhysicsOptimizationEngine"],
      purpose: "Optimize CNC programs for speed/feed/tool life",
    },
    "/auto-speed-feed": {
      triggers: ["speed feed", "speeds and feeds", "cutting parameters"],
      autoInvoke: ["calculate speed feed", "what speed feed"],
      engines: ["SpeedFeedOrchestratorEngine", "UltimateSpeedFeedEngine"],
      purpose: "Auto-calculate optimal speed/feed",
    },
    "/scrutinize": {
      triggers: ["scrutinize", "deep review", "audit code", "check quality"],
      autoInvoke: ["scrutinize code", "deep audit"],
      engines: ["PRISMCreativeReasoningEngine", "DeepAIIntelligenceEngine"],
      purpose: "Deep scrutiny of code for issues and improvements",
    },
  },

  // === BUSINESS COMMANDS ===
  business: {
    "/quote-to-ship": {
      triggers: ["quote", "estimate", "job", "order", "ship"],
      autoInvoke: ["new quote", "create quote", "job quote"],
      engines: ["QuoteEstimatorEngine", "JobCostingEngine", "SchedulingEngine"],
      purpose: "Full quote-to-ship pipeline orchestration",
    },
    "/job-cost": {
      triggers: ["cost", "pricing", "estimate cost"],
      autoInvoke: ["calculate cost", "job costing"],
      engines: ["JobCostingEngine", "ActualCostEngine"],
      purpose: "Calculate job costing and estimates",
    },
    "/shop-schedule": {
      triggers: ["schedule", "capacity", "workload", "planning"],
      autoInvoke: ["show schedule", "capacity planning"],
      engines: ["SchedulingEngine", "CapacityPlanningEngine"],
      purpose: "View/manage shop floor schedule",
    },
  },

  // === VERIFICATION COMMANDS ===
  verification: {
    "/dedup": {
      triggers: ["duplicate", "dedup", "redundant", "already exists"],
      autoInvoke: ["check duplicate", "before creating"],
      engines: ["DuplicationGuardEngine"],
      purpose: "Find and eliminate duplicate code/engines",
      critical: true,
    },
    "/formula-check": {
      triggers: ["formula", "physics", "validate formula", "kienzle", "taylor"],
      autoInvoke: ["validate formula", "check physics"],
      engines: ["KienzleForceModelEngine", "FormulaValidationEngine"],
      purpose: "Validate physics formulas against constants",
    },
    "/verify-loop": {
      triggers: ["verify", "continuous check", "validation loop"],
      autoInvoke: [],
      engines: ["PRISMIntelligenceLayer"],
      purpose: "Continuous verification loop",
    },
  },

  // === ROADMAP COMMANDS ===
  roadmap: {
    "/continue-roadmap": {
      triggers: ["roadmap", "milestone", "next task", "continue work"],
      autoInvoke: ["continue roadmap", "next milestone"],
      engines: ["RoadmapExecutorEngine"],
      purpose: "Continue working on PRISM roadmap",
    },
    "/rgs": {
      triggers: ["rgs", "protocol", "systematic"],
      autoInvoke: [],
      engines: [],
      purpose: "RGS protocol for systematic work",
    },
  },

  // === DATA COMMANDS ===
  data: {
    "/material-lookup": {
      triggers: ["material", "steel", "aluminum", "hardness"],
      autoInvoke: ["what material", "material properties"],
      engines: ["MaterialRegistry"],
      purpose: "Look up material properties",
    },
    "/tool-select": {
      triggers: ["tool", "insert", "holder", "which tool"],
      autoInvoke: ["select tool", "recommend tool"],
      engines: ["ToolRouterEngine", "SmartToolSelectorEngine"],
      purpose: "AI tool selection",
    },
    "/prints": {
      triggers: ["print", "drawing", "blueprint", "cad"],
      autoInvoke: [],
      engines: ["PrintToProgramPipelineEngine"],
      purpose: "Access customer prints/drawings",
    },
  },

  // === SMART/AI COMMANDS ===
  ai: {
    "/smart": {
      triggers: ["smart", "ai", "intelligent", "auto"],
      autoInvoke: ["smart mode", "ai mode"],
      engines: ["DeepAIIntelligenceEngine", "NeuralIntegrationEngine"],
      purpose: "Smart AI-powered task execution",
    },
    "/self-improve": {
      triggers: ["self improve", "enhance", "evolve", "upgrade ai"],
      autoInvoke: [],
      engines: ["AISystemSynchronizerEngine"],
      purpose: "AI self-improvement cycle",
    },
  },
};

// AI ENGINES INVENTORY
const AI_ENGINES = {
  // === META-LEVEL ORCHESTRATION (Near-AGI) ===
  metaOrchestration: {
    engine: "MetaAIOrchestrationEngine",
    capabilities: ["metacognition", "analogical_transfer", "continuous_learning", "meta_learning"],
    reasoningModes: 12,
    domainsOrchestrated: 15,
    enginesCoordinated: 150,
  },
  autoUtilization: {
    engine: "AIAutoUtilizationEngine",
    capabilities: 25,
    autoInvokeRules: 50,
    domains: ["learning", "development", "optimization", "business", "verification"],
  },
  // === CORE REASONING ENGINES ===
  deepReasoning: {
    engine: "DeepAIIntelligenceEngine",
    modes: ["chain_of_thought", "tree_of_thought", "multi_path", "backtracking", "abductive", "deductive", "inductive", "analogical"],
    actions: ["prism_ai:deep_reason", "prism_ai:extended_think"],
  },
  treeOfThought: {
    engine: "TreeOfThoughtEngine",
    modes: ["bfs", "dfs", "best_first"],
    capabilities: ["branch_scoring", "pruning", "backtracking", "tribal_integration"],
  },
  counterfactual: {
    engine: "CounterfactualReasoningEngine",
    capabilities: ["what_if", "causal_graphs", "root_cause", "intervention_planning"],
  },
  hypothesis: {
    engine: "HypothesisRankerEngine",
    capabilities: ["bayesian_updates", "evidence_scoring", "confidence_intervals"],
  },
  crossDisciplinary: {
    engine: "CrossDisciplinaryDeepLearningEngine",
    domains: 15,
    formulas: 120,
    actions: ["prism_ai:cross_domain_reason", "prism_ai:cross_domain_apply"],
  },
  creative: {
    engine: "PRISMCreativeReasoningEngine",
    modes: ["conventional", "exploratory", "unconventional", "hybrid", "innovative", "optimal"],
    actions: ["prism_ai:creative_explore"],
  },
  neural: {
    engine: "NeuralIntegrationEngine",
    patterns: 10,
    autoRoute: true,
    actions: ["route", "recommendCommands", "synthesize"],
  },
  synchronizer: {
    engine: "AISystemSynchronizerEngine",
    syncs: ["deepReasoning", "crossDisciplinary", "tribalKnowledge", "selfAwareness"],
  },
  duplicationGuard: {
    engine: "DuplicationGuardEngine",
    mandatory: true,
    checkBefore: ["engine", "formula", "algorithm", "skill", "hook", "extraction"],
  },
};

// TRIBAL KNOWLEDGE SUMMARY
const TRIBAL_KNOWLEDGE = {
  total: 3943,
  categories: [
    "machining_physics", "tool_selection", "speed_feed", "workholding",
    "surface_finish", "threading", "grooving", "drilling", "boring",
    "coolant", "chip_control", "vibration", "wear", "failure_prevention",
  ],
  camSystems: [
    "hypermill", "mastercam", "fusion360", "nx", "catia", "solidcam",
    "esprit", "gibbscam", "edgecam", "bobcad", "cimatron", "powermill",
  ],
  searchMethod: "prism_knowledge:tribal_search OR TribalKnowledgeAdvisorEngine.search()",
};

// RESOURCES AWARENESS
const RESOURCES = {
  folders: 39,
  key: [
    "HYPERMILL — 36,000 lines CAM scripts",
    "MIT COURSES — 227 courses, algorithms",
    "MACHINING KNOWLEDGE FORMULAS — Physics models",
    "MANUFACTURER_CATALOGS — Sandvik, Kennametal, etc.",
    "MACHINE_SIMULATION_MODELS — VMC, HMC, lathe",
    "FUSION360 — Post processors, add-ins",
    "MANUALS — Machine and tool manuals",
  ],
};

// JM DIE AWARENESS
const JM_DIE = {
  programs: 24545,
  customers: 100,
  machineTypes: ["CNC LATHE", "CNC MILL HAAS", "WIRE EDM", "OKUMA", "CNC LATHE OKUMA"],
  accessMethod: "PRISMSelfAwarenessEngine.getJMDieCustomerPath(customer)",
};

function generateActivation() {
  const commandCount = Object.values(COMMAND_INTELLIGENCE)
    .reduce((sum, cat) => sum + Object.keys(cat).length, 0);

  const criticalCommands = [];
  for (const [cat, cmds] of Object.entries(COMMAND_INTELLIGENCE)) {
    for (const [cmd, info] of Object.entries(cmds)) {
      if (info.critical || info.autoInvoke?.length > 0) {
        criticalCommands.push(`${cmd} — ${info.purpose}`);
      }
    }
  }

  return `
═══════════════════════════════════════════════════════════════════════════════
                    PRISM AI DEEP INTELLIGENCE SYSTEM ACTIVE
                        [Near-AGI Level Capabilities Enabled]
═══════════════════════════════════════════════════════════════════════════════

SYSTEM COUNTS:
  Engines: 2,495+ (207 AI) | Dispatchers: 90 (5,426 actions) | Commands: ${commandCount}
  Tribal Tips: ${TRIBAL_KNOWLEDGE.total} | MIT Courses: 227 | JM DIE Programs: ${JM_DIE.programs}

META-AI ORCHESTRATION (Near-AGI):
  MetaAIOrchestrationEngine — Unified orchestration of 150+ AI engines
    • Metacognition: Self-monitoring reasoning quality, bias detection
    • Analogical Transfer: Cross-domain knowledge application
    • Continuous Learning: Integration from tribal/physics/feedback
    • Meta-Learning: Adaptive learning rate, exploration/exploitation balance
  AIAutoUtilizationEngine — Automatic capability detection & invocation
    • 25+ capabilities mapped with auto-invoke patterns
    • Context-aware command suggestions
    • Multi-command sequence planning

CRITICAL COMMANDS (use these proactively):
  /pdf-learn     — Extract knowledge from PDFs → tribal tips/formulas
  /video-learn   — Extract knowledge from videos → procedures/tips
  /forge-triple  — Create engines + skills + hooks (EXHAUSTIVE)
  /shop-knowledge — Extract tribal knowledge
  /dedup         — ALWAYS check before creating new assets
  /machine-harden — Harden AI for specific machines
  /wire-edm-studio — Wire EDM programming with AI
  /smart         — AI-powered task routing

AUTO-INVOKE RULES:
  - "pdf" or "extract" mentioned → suggest /pdf-learn
  - "video" or "tutorial" mentioned → suggest /video-learn
  - "create engine" mentioned → suggest /forge-triple + /dedup check
  - "edm" or "wire" mentioned → suggest /wire-edm-studio
  - "optimize" mentioned → suggest /program-optimize
  - "quote" mentioned → suggest /quote-to-ship
  - "lathe" or "turning" mentioned → suggest /lathe-studio

REASONING MODES (12 available):
  chain_of_thought | tree_of_thought | counterfactual | hypothesis_ranking
  analogical | temporal | causal | abductive | deductive | inductive
  creative | cross_domain

AI ENGINES (use these, don't rebuild):
  MetaAIOrchestrationEngine: Unified orchestration, metacognition, meta-learning
  TreeOfThoughtEngine: Multi-path deliberation, branch scoring
  CounterfactualReasoningEngine: What-if analysis, causal graphs
  HypothesisRankerEngine: Bayesian updates, evidence scoring
  DeepAIIntelligenceEngine: 8 reasoning modes
  CrossDisciplinaryDeepLearningEngine: 15 domains, 120 formulas
  PRISMCreativeReasoningEngine: 6 exploration modes
  NeuralIntegrationEngine: Auto-routes to 2,495+ engines
  AISystemSynchronizerEngine: Central synchronization
  DuplicationGuardEngine: MANDATORY before creating

MANDATORY RULES:
  1. ALWAYS call duplicationGuardEngine.mustCheckBeforeCreating() — THROWS if duplicate
  2. ALWAYS call duplicationGuardEngine.mustNotReExtract() — THROWS if already extracted
  3. Check extraction-log.json for completed extractions BEFORE /pdf-learn or /video-learn
  4. ALL extractions flow to categorized tribal knowledge
  5. Use existing engines — don't rebuild what exists
  6. Suggest slash commands when triggers detected
  7. Use deep reasoning for complex problems
  8. Apply metacognition for self-monitoring

HARD BLOCK METHODS (use these, they THROW errors):
  duplicationGuardEngine.mustCheckBeforeCreating(type, name, desc) — blocks if duplicate
  duplicationGuardEngine.mustNotReExtract(sourceId) — blocks if already extracted
  duplicationGuardEngine.isExtractionCompleted(sourceId) — returns extraction or null

ALREADY EXTRACTED (DO NOT RE-EXTRACT):
  - Mastercam docs: 45 tips ✓
  - hyperMILL manual: 25 tips ✓
  - Okuma OSP programs: 63 tips ✓
  - Siemens SINUMERIK: 18 tips ✓
  - Fanuc programming: 35 tips ✓
  - Haas programming: 28 tips ✓
  - Titans of CNC: 42 procedures ✓
  - JM DIE programs: 24,545 indexed ✓

TRIBAL KNOWLEDGE ACCESS:
  prism_knowledge:tribal_search OR TribalKnowledgeAdvisorEngine.search(query)
  Categories: ${TRIBAL_KNOWLEDGE.categories.slice(0, 8).join(", ")}...

RESOURCES: ${RESOURCES.key.slice(0, 3).join(" | ")}
JM DIE: ${JM_DIE.programs} programs, ${JM_DIE.customers} customers

═══════════════════════════════════════════════════════════════════════════════
`.trim();
}

async function main() {
  console.log(JSON.stringify({ continue: true, systemMessage: generateActivation() }));
}

main().catch(() => { console.log(JSON.stringify({ continue: true })); });
