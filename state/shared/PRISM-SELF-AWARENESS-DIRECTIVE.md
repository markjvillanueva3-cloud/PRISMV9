# PRISM Self-Awareness Directive
## Auto-inject to all sessions | Updated: 2026-04-15

## ⚠️ MANDATORY: CHECK BEFORE CREATING ANYTHING NEW
**STOP! Before creating ANY engine, formula, algorithm, or extracting content:**
```typescript
import { duplicationGuardEngine } from "src/engines/DuplicationGuardEngine.js";

// MANDATORY CHECK — DO THIS FIRST
const check = await duplicationGuardEngine.checkBeforeCreating("engine", "ProposedName", "description");
if (check.isDuplicate) {
  // DO NOT CREATE — Asset already exists at: check.existingAsset.path
}
if (check.similarity > 0.7) {
  // DO NOT CREATE — Extend existing instead: check.alternatives
}
// Only proceed if check.recommendation === "proceed"

// Search existing assets before proposing new ones
const existing = await duplicationGuardEngine.searchExisting("keyword");

// Get full summary of what exists
const summary = await duplicationGuardEngine.getExistingSummary();
```
**Current Counts:** 1,559 engines | 499 formulas | 60+ algorithms | 4,296 actions | 112 hooks

## 🧠 CREATIVE REASONING — Think Outside the Box
**For optimal, innovative, hybrid solutions:**
```typescript
import { prismCreativeReasoningEngine } from "src/engines/PRISMCreativeReasoningEngine.js";

// Explore creative solutions (6 modes available)
const result = prismCreativeReasoningEngine.explore({
  domain: "cutting_parameters",  // or: toolpath, tool_life, surface_finish, cycle_time, cost_reduction, multi_domain
  objective: "Maximize productivity while maintaining quality",
  constraints: ["Tool life > 30 min"],
  desiredOutcome: "20% cycle time reduction",
  flexibility: "maximum"  // strict | moderate | flexible | maximum
}, "optimal");  // conventional | exploratory | unconventional | hybrid | innovative | optimal

// Returns: solutions ranked by novelty + viability + optimization
// Includes: challengedAssumptions, hybridCombinations, novelInsights, mathematicalBasis
```
**Modes:** conventional (proven), exploratory (multiple approaches), unconventional (challenge norms), hybrid (combine strategies), innovative (cross-domain), optimal (mathematically best)

## 🤖 AUTONOMOUS AI AVAILABLE — USE IT!
**ALL sessions have access to full autonomous AI orchestration. Use these engines:**
```typescript
// AUTONOMOUS SESSION — Full real executor integration
import { autonomousSession } from "src/engines/AutonomousSessionIntegrationEngine.js";
const result = await autonomousSession.processIntent("your intent here", "session-id");
// Connects to: SkillExecutor, HookExecutor, ScriptExecutor, MIT courses, tribal knowledge, playbook, formulas

// DEEP REASONING — Claude Opus-level intelligence (8 reasoning modes)
import { deepAIIntelligenceEngine } from "src/engines/DeepAIIntelligenceEngine.js";
const reasoning = await deepAIIntelligenceEngine.deepReason({ query, domain }, "chain_of_thought");
// Modes: chain_of_thought, tree_of_thought, multi_path, backtracking, abductive, deductive, inductive, analogical

// PROACTIVE AI — Anomaly detection + pattern recognition
import { proactiveAI } from "src/engines/ProactiveAIIntelligenceEngine.js";
const analysis = await proactiveAI.analyze({ intent, parameters });
// Detects anomalies, learns from corrections, calibrates confidence over time

// CROSS-DISCIPLINARY — 15 scientific domains applied to manufacturing
import { crossDisciplinaryEngine } from "src/engines/CrossDisciplinaryDeepLearningEngine.js";
const insight = crossDisciplinaryEngine.deepReason("your manufacturing problem");
// Physics, biology, finance, music theory, ecology, information theory + 9 more domains
```
**MCP Actions:** `session_process`, `proactive_analyze`, `deep_reason`, `auto_execute` (prism_ai dispatcher, 272 actions)

## Quick Reference (Token-Efficient)
```
PRISM: 82 dispatchers / 4,296 actions / 1,559 engines
Formulas: 499 | Algorithms: 60 | Hooks: 112 | Skills: 61

H: DRIVE AWARENESS:
  JM DIE: 24,545 CNC programs | 100+ customers | H:/PRISM/JM DIE
  Tribal: 3,700+ tips (18 CAM systems) | MachiningPlaybook: 296 rules
  Resources: 40+ catalogs/tips in src/data/

TOP ACTIONS BY CATEGORY:
  Calc: speed_feed, cutting_force, tool_life, deflection, power_requirement, surface_finish, chip_load, mrr
  Biz: quote_estimate, lead_time, cost_analysis, capacity_check, job_status, invoice_generate
  CAM: machine_selection, tool_selection, toolpath_strategy, post_process, fixture_recommend
  Data: material_lookup, machine_specs, tool_catalog, customer_info, job_history
  Validate: program_check, simulation, collision_detect, tolerance_verify
  Quality: surface_finish, tolerance_analysis, capability_study, inspection_plan
  Safety: safety_check, risk_assessment, limit_verify
  AI: analyze, recommend, explain, optimize

DOMAINS: turning, milling, drilling, grinding, EDM, threading, 5-axis, swiss, lathe, mill-turn, wire_edm, sinker_edm, quoting, scheduling, quality, safety, materials
```

## Self-Awareness API
```typescript
import { prismSelfAwarenessEngine } from "src/engines/PRISMSelfAwarenessEngine.js";

// Find capabilities by query
const result = engine.whatCanIDo("calculate speed and feed");
// Returns: { results: [{ action: "speed_feed", confidence: 0.9, ... }] }

// Get best action for a task
const action = engine.howDoI("quote this part");
// Returns: { dispatcher: "prism_business", action: "quote_estimate", ... }

// Find engines for a domain
const engines = engine.whoHandles("cutting force");
// Returns: [{ name: "KienzleForceModelEngine", ... }]

// Check if we can handle a request
const gap = engine.analyzeGap("complex manufacturing request");
// Returns: { canHandle: true/false, suggestions: [...], externalSources: [...] }

// Get compact manifest for context injection (~500 tokens)
const manifest = engine.getCompactManifest();

// JM DIE DIRECT ACCESS
const customerPath = engine.getJMDieCustomerPath("ALCOA");
// Returns: "H:/PRISM/JM DIE/CNC LATHE/ALCOA"

const lathePaths = engine.getJMDieProgramPaths("lathe");
// Returns: ["H:/PRISM/JM DIE/CNC LATHE", ...]

const customers = engine.searchJMDieCustomer("fast");
// Returns: [{ name: "FASTENAL", path: "...", machineTypes: [...] }]

// TRIBAL KNOWLEDGE
const tips = engine.searchTribalKnowledge("thin wall milling");
// Returns: [{ tipId, title, category, confidence, source, tags }]

// PLAYBOOK RULES
const rules = engine.searchPlaybookRules("roughing depth");
// Returns: [{ ruleId, title, category, severity, reasoning }]

// WEB SEARCH
const searches = engine.generateWebSearch("carbide insert selection");
// Returns: [{ source, query, suggestedTopics, trustLevel }]

// FULL DRIVE AWARENESS
const awareness = engine.getFullDriveAwareness();
// Returns comprehensive H: drive context for injection
```

## JM DIE Direct Access
| Folder | Path | Files |
|--------|------|-------|
| CNC Lathe | H:/PRISM/JM DIE/CNC LATHE/{customer} | .MIN, .mcx-8 |
| CNC Mill | H:/PRISM/JM DIE/CNC MILL HAAS/{customer} | .nc, .mcx-8 |
| Wire EDM | H:/PRISM/JM DIE/WIRE EDM/{customer} | .nc |
| Multus | H:/PRISM/JM DIE/CNC OKUMA MULTUS/{customer} | .MIN |
| Okuma | H:/PRISM/JM DIE/OKUMA/{customer} | .MIN |
| Haas-Hurco | H:/PRISM/JM DIE/HAAS-HURCO/{customer} | .nc, .hnc |

Top Customers: ALCOA, ITW, OPTIMAS, SFS, FASTENAL, HOLO-KROME, CAMCAR, EJOT, FONTANA, ELGIN FASTENER

## Tribal Knowledge & Playbook
| Engine | Records | Domains |
|--------|---------|---------|
| TribalKnowledgeEngine | 3,700+ tips | 18 CAM systems, shop_floor, tooling |
| MachiningPlaybookEngine | 296 rules | sequencing, setup, anti-patterns, safety |

## Resource Files (src/data/)
| Type | Count | Examples |
|------|-------|----------|
| CAM Tips | 18 files | mastercam-cam-tips.ts, fusion360-cam-tips.ts |
| Tool Catalogs | 6 files | guhring-tool-catalog.ts (5000 tools) |
| Holder Catalogs | 3 files | haimer-holder-catalog.ts |
| Knowledge | 2 files | controller-knowledge-tips.ts, wedm-knowledge-tips.ts |

## AI Features (160+ engines)
| Category | Count | Key Engines |
|----------|-------|-------------|
| Reasoning | 15 | ManufacturingReasoning, MultiPathReasoning, ScientificReasoning |
| Learning | 12 | DeepLearning, TransferLearning, FederatedLearning, QLearning |
| Intelligence | 27 | PRISMIntelligenceLayer, LatheIntelligence, MillingAIUltra, **DeepAIIntelligenceEngine** |
| Orchestration | 10 | AgenticLoop, MultiToolOrchestrator, FeasibilityOrchestrator |
| Agent | 8 | MultiAgentCoordinator, AgentWorkflow, AgentSpecialization |
| Advisor | 5 | LatheExpertAdvisor, FinishTargetAdvisor, TribalKnowledgeAdvisor |
| Prediction | 8 | LathePredictive, RealTimeMachineIntelligence, BayesianToolLife |
| **Deep AI** | 6 | **DeepReasoning, ExtendedThinking, DeepLearning, DeepLogic, LLMCLI, SkillEnhancement** |
| **Auto-Registry** | 1 | **AIFeatureAutoRegistryEngine** — auto-ingests new AI features |

## Deep AI Intelligence (Claude Opus-Level)
```typescript
import { deepAIIntelligenceEngine } from "src/engines/DeepAIIntelligenceEngine.js";

// Deep Reasoning (8 modes)
const result = await deepAIIntelligenceEngine.deepReason({
  query: "What cutting speed for D2 steel?",
  domain: "machining",
  constraints: ["tool life > 30 min"]
}, "chain_of_thought");
// Modes: chain_of_thought, tree_of_thought, multi_path, backtracking, abductive, deductive, inductive, analogical

// Extended Thinking (Claude Opus-style 7-phase analysis)
const thinking = await deepAIIntelligenceEngine.extendedThinking("Should we use HSS or carbide?");
// Returns: thinkingProcess, analysis{aspects, tradeoffs, risks, opportunities}, synthesis, recommendation

// Deep Learning (7 modes)
const learning = await deepAIIntelligenceEngine.deepLearn(data, "pattern_recognition");
// Modes: pattern_recognition, transfer_learning, reinforcement, few_shot, zero_shot, meta_learning, continuous

// Deep Logic (7 modes)
const logic = await deepAIIntelligenceEngine.deepLogic(["cutting speed too high"], "constraint");
// Modes: propositional, first_order, modal, temporal, fuzzy, constraint, probabilistic

// LLM CLI (Natural Language Interface)
const cli = await deepAIIntelligenceEngine.processNaturalLanguage("Calculate speed and feed for aluminum");
// Returns: interpretedIntent, mappedAction, parameters, executionPlan

// Skill/Hook Enhancement
const enhanced = await deepAIIntelligenceEngine.enhanceSkill("speed-feed", context);
const hookEnhanced = await deepAIIntelligenceEngine.enhanceHook("physics-validator", "pre", data);
```

## AI Feature Auto-Registry
```typescript
import { aiFeatureAutoRegistry } from "src/engines/AIFeatureAutoRegistryEngine.js";

// Auto-ingest new AI feature (called when new engine created)
aiFeatureAutoRegistry.autoIngest("NewAIEngine.ts", { name, description, capabilities });

// Discover all AI features
const discovery = await aiFeatureAutoRegistry.discoverFeatures();

// Route query to best AI engine
const routing = aiFeatureAutoRegistry.routeQuery("deep chain of thought analysis");
// Returns: { domain, feature, engine, dispatcher, actions, confidence }

// List all features and domains
const features = aiFeatureAutoRegistry.getAllFeatures();
const domains = aiFeatureAutoRegistry.getAllDomains();

// MCP Actions: ai_registry_ingest, ai_registry_discover, ai_registry_list, ai_registry_route,
//              ai_registry_stats, ai_registry_domains, ai_registry_by_category, ai_registry_history
```

## Autonomous AI Orchestration (Self-Reliant System)
```typescript
import { autonomousAIOrchestration } from "src/engines/AutonomousAIOrchestrationEngine.js";

// Full autonomous execution
const result = await autonomousAIOrchestration.executeAutonomously({
  intent: "Machine D2 steel part with 0.001 tolerance, quote for ALCOA",
  context: { customer: "ALCOA", quantity: 100 },
  constraints: ["surface finish Ra < 0.8"],
  mode: "full_auto", // full_auto | supervised | advisory | learning
  knowledgeSources: ["tribal_knowledge", "vendor_catalogs", "formulas", "mit_courses"],
});
// Returns: { steps, skillsExecuted, hooksTriggered, enginesInvoked, knowledgeUsed, learnings }

// Auto-select skills, hooks, algorithms, formulas
const skills = await autonomousAIOrchestration.selectSkillChain("calculate speed feed");
const hooks = autonomousAIOrchestration.selectHookChain("machine part safely", []);
const algorithms = autonomousAIOrchestration.selectAlgorithms("predict tool life");
const formulas = autonomousAIOrchestration.selectFormulas("cutting force power");

// Knowledge utilization
const plan = autonomousAIOrchestration.planKnowledgeUtilization({ intent: "optimize cutting" });
const mitCourses = await autonomousAIOrchestration.queryMITCourses("manufacturing optimization");
const vendorSpecs = await autonomousAIOrchestration.queryVendorCatalogs("carbide insert steel");

// GSD automation: Generate engine, schema, dispatcher, tests
const gsd = await autonomousAIOrchestration.generateGSD({
  name: "New Feature",
  description: "Auto-generated feature",
  capabilities: ["calculate", "validate"],
  inputs: [{ name: "value", type: "number", description: "Input" }],
  outputs: [{ name: "result", type: "number", description: "Output" }],
});
```

**Knowledge Sources Available:**
| Source | Count | Usage |
|--------|-------|-------|
| MIT Courses | 220+ | Academic foundations, algorithms |
| Vendor Catalogs | 40+ | Sandvik, Kennametal, Guhring specs |
| PDF Library | Dozens | Technical specifications, standards |
| Tribal Knowledge | 3,700+ | Shop floor tips (18 CAM systems) |
| Playbook Rules | 296 | Anti-patterns, sequencing |
| PRISM Engines | 1,559 | Calculations, analysis |
| Algorithms | 60+ | Kienzle, Taylor, SLD, GA, Bayesian |
| Formulas | 499 | Speed, force, roughness, MRR, cost |

**MCP Actions:** `auto_execute`, `auto_skill_chain`, `auto_hook_chain`, `auto_algorithm_select`,
`auto_formula_select`, `auto_knowledge_plan`, `auto_query_mit`, `auto_query_catalogs`,
`auto_gsd_generate`, `auto_history`, `auto_learning_stats`, `auto_summary`

## Autonomous Session Integration (Real Executor Layer)
```typescript
import { autonomousSession } from "src/engines/AutonomousSessionIntegrationEngine.js";

// Process intent through full autonomous pipeline (real executors)
const result = await autonomousSession.processIntent(
  "Machine D2 steel part with 0.001 tolerance, quote for ALCOA",
  "session-123",
  { constraints: ["surface finish Ra < 0.8"] }
);
// Returns: { steps, realExecutions, knowledgeQueries, sessionContext, integrationMode }

// Initialize all real integrations
const health = await autonomousSession.initialize();
// Returns: { skillExecutor, hookExecutor, scriptExecutor, mitCourses, tribalKnowledge, playbook, vendorCatalogs, formulas, algorithms, overallHealth }

// Session management
autonomousSession.updateSessionContext("session-123", { machineContext: { type: "lathe" } });
autonomousSession.getSessionHistory("session-123");
autonomousSession.clearSession("session-123");

// Integration health and summary
autonomousSession.getHealth();
autonomousSession.getSummary();
autonomousSession.setMode("simulation"); // full_integration | partial_integration | simulation | passthrough
```

**Integrations Connected:**
| Executor/Source | Type | Purpose |
|-----------------|------|---------|
| SkillExecutor | Executor | Real skill loading and execution |
| HookExecutor | Executor | Real hook triggering and chaining |
| ScriptExecutor | Executor | Real script execution |
| MITCourseRegistryEngine | Knowledge | 225+ MIT courses, 285 algorithms |
| TribalKnowledgeEngine | Knowledge | 3,700+ shop floor tips |
| MachiningPlaybookEngine | Knowledge | 296 playbook rules |
| AlgorithmGatewayEngine | Algorithms | 60+ algorithm selection |
| SourceCatalogAggregator | Catalogs | 40+ vendor catalogs |
| FormulaRegistry | Formulas | 499 manufacturing formulas |

**MCP Actions:** `session_process`, `session_health`, `session_history`, `session_clear`, `session_update`, `session_summary`

## Proactive AI Intelligence (Anomaly Detection + Pattern Recognition)
```typescript
import { proactiveAI } from "src/engines/ProactiveAIIntelligenceEngine.js";

// Proactive analysis of context
const analysis = await proactiveAI.analyze({
  intent: "machine D2 steel part",
  parameters: { cutting_speed: 500, feed_rate: 0.3 },
  sessionId: "session-123",
  domain: "turning",
});
// Returns: { suggestions, patterns, anomalies, confidence, analysisTime_ms }

// Quick suggestions for scenarios
const suggestions = proactiveAI.getQuickSuggestions("new part setup");
// Returns: [{ type: "quality", title: "FAI Required", ... }]

// Anomaly detection
const anomalies = proactiveAI.detectAnomalies({
  cutting_speed_steel: 500,  // Above max 300 → warning
  feed_rate_rough: 0.1,      // Within range [0.1, 0.8]
});
// Returns: [{ detected, parameter, expectedRange, actualValue, deviation, severity, recommendation }]

// Learn from corrections
proactiveAI.learnFromCorrection("suggestion-id", "user correction", true);
proactiveAI.recordOutcome("turning", true);  // Track prediction accuracy

// Calibration data
const calibration = proactiveAI.getCalibration();
// Returns: { totalPredictions, correctPredictions, byDomain, calibrationScore }

// Custom thresholds
proactiveAI.addThreshold("custom_param", 0, 100);
```

**Anomaly Thresholds (Default):**
| Parameter | Range | Severity |
|-----------|-------|----------|
| cutting_speed_steel | 30-300 m/min | >50% deviation = critical |
| cutting_speed_aluminum | 150-1000 m/min | 20-50% = warning |
| feed_rate_rough | 0.1-0.8 mm/rev | <20% = info |
| feed_rate_finish | 0.02-0.2 mm/rev | |
| doc_rough | 0.5-10 mm | |
| doc_finish | 0.05-0.5 mm | |
| spindle_rpm | 50-24000 | |
| cutting_temp | 100-800 C | |
| surface_finish_ra | 0.1-12.5 Ra | |

**MCP Actions:** `proactive_analyze`, `proactive_quick`, `proactive_anomaly`, `proactive_patterns`, `proactive_learn`, `proactive_calibration`, `proactive_thresholds`, `proactive_summary`

## Multi-Agent Strategies
```
BUILDER-SUPERVISOR: For build/implement tasks
  → Spawn: builder agent + physics-reviewer + test-reviewer + code-reviewer
  → Use: MultiAgentCoordinatorEngine
  
PARALLEL-ANALYSIS: For analyze/diagnose tasks
  → Spawn: multiple analysis agents exploring hypotheses
  → Use: MultiAgentAIInterfaceEngine

ITERATIVE-REFINEMENT: For optimize/improve tasks
  → Define: optimization cycles with validation
  → Use: AgentWorkflowEngine

TASK-DECOMPOSITION: For quote/plan/design tasks
  → Break into subtasks → assign specialists → synthesize
  → Use: IntentDecompositionEngine
```

## External Knowledge Sources (Trusted)
| Source | Type | Trust | Domains |
|--------|------|-------|---------|
| Sandvik Coromant | Manufacturer | 95% | cutting_tools, speed_feed, materials |
| Kennametal | Manufacturer | 95% | cutting_tools, materials, tooling |
| Machinery's Handbook | Handbook | 99% | machining, materials, formulas, standards |
| ISO Standards | Standard | 100% | materials, tolerances, quality, safety |
| NIST | Research | 98% | materials, properties, constants |

## Usage Guidelines
1. **Before implementing new features**: Run `whatCanIDo(feature)` to check if capability exists
2. **Before creating new engines**: Run `whoHandles(domain)` to find existing engines
3. **When unsure about approach**: Run `analyzeGap(request)` for suggestions
4. **For external data**: Use `findRelevantSources(topic)` to get trusted sources

## Key Files
- Self-Awareness: `src/engines/PRISMSelfAwarenessEngine.ts` (66 tests)
- Deep AI Intelligence: `src/engines/DeepAIIntelligenceEngine.ts` (58 tests)
- AI Auto-Registry: `src/engines/AIFeatureAutoRegistryEngine.ts` (34 tests)
- **Autonomous Orchestration: `src/engines/AutonomousAIOrchestrationEngine.ts` (65 tests)**
- Startup Hook: `src/hooks/selfAwarenessStartup.ts` (15 tests)
- Dispatcher: `src/tools/dispatchers/aiReasoningDispatcher.ts` (247 actions)

## Integration Points
- SessionStart hook: Auto-injects context
- Compaction survival: Preserves minimal context
- MEMORY.md: Cross-session self-awareness sync

## 📱 Codex Frontend Canonical Reference
**Scrutiny R5 is THE reference for what Codex built on the frontend and where the gaps are:**
`H:/prism/SCRUTINY-R5-CODEX-FRONTEND-UNIVERSAL-ALIGNMENT-2026-04-16.md`

Summarizes: 134 pages / ~170 components / 87 API clients at `mcp-server/web/` (canonical tree, `/web/` is stale mirror); mill calculator tab is catastrophically shallow vs lathe (0 vs 7 sub-panels); 18 MILL-AGI units + R3 Phases C/D retired as redundant with Phase 0; CALC-MILL-MS0..MS3 expansion plan. Also detailed in `UNIVERSAL-SKILLS-SCRIPTS-HOOKS-PLAN-2026-04-15.md` §CANONICAL FRONTEND REFERENCE. Consult BEFORE any frontend/calculator/post-processor work.

## 🔎 Capability Discovery — Surface Tools at Moment of Need
Four categories of PRISM capability are easy to forget mid-task:
1. **Token-saving hooks** (FileReadCache, GrepResultCache, JsonStateSummarizer) — silent when working, invisible when forgotten
2. **Stale-data traps** (CLAUDE.md counts drift; PRISM-INVENTORY-LATEST.md is authoritative)
3. **Advanced engines** (PRISMCreativeReasoningEngine, prismSelfAwarenessEngine, CrossDisciplinaryDeepLearningEngine) buried among 2,000+ engines
4. **Coordination hazards** (settings.json conflicts with 4 concurrent chats)

**Auto-surfacing mechanism:** UserPromptSubmit hook `capability-reminder.mjs` grep-matches your prompt against `state/shared/CAPABILITY_INDEX.json` triggers and injects a one-line hint. Max 3 reminders per prompt, 10-min cooldown per entry per session.

**Manual discovery:** run `/capabilities` slash command to list all entries by category. Or `/capabilities [keyword]` to filter.

**Schema source:** `state/shared/CAPABILITY_INDEX.json` (trigger phrases → capability hints). Update this file when you add a capability users should know about.

**Related hook:** `ai-auto-command-router.mjs` covers slash commands; `capability-reminder.mjs` covers scripts, hooks, engines, and stale-data traps that have no slash-command equivalent.
- CLAUDE.md: Full context available via `generateClaudeMdContext()`
