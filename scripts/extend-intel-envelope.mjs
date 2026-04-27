#!/usr/bin/env node
/**
 * extend-intel-envelope.mjs — One-shot extension of INTEL-OLLAMA-OBSIDIAN-MS0
 *
 * Adds P8-P12 (25 units) covering all findings from 10 parallel scout agents:
 *   P8  Schema Hardening (Agent 4: 161 z.any() + 0 .describe())
 *   P9  AUTO Chain Wiring (Agent 5: chain measures but no consumers)
 *   P10 Duplicate Consolidation (all 5 agents)
 *   P11 Auto-Invoke Wiring (Agents 1, 2, 3)
 *   P12 God Object Refactors (Agents 4, 5)
 *
 * Also updates roadmap-index.json and mirrors MEMORY.md to H:/.claude.
 */
import * as fs from "node:fs";
import * as path from "node:path";

const ENV_PATH = "H:/PRISM/mcp-server/data/milestones/INTEL-OLLAMA-OBSIDIAN-MS0.json";
const env = JSON.parse(fs.readFileSync(ENV_PATH, "utf-8"));

const newPhases = [
  {
    id: "P8",
    title: "Schema Hardening — Eliminate 161 z.any() + add .describe()",
    rationale: "Agent 4 found 161 z.any() instances bypass all validation across PRISM dispatchers; 0/340 schema fields have .describe() so MCP tool descriptions are missing. Single highest-leverage code-quality fix.",
    sessions: "2",
    units: [
      {
        id: "P8-U01",
        title: "Inventory all 161 z.any() instances + classify by replacement type",
        effort: 50,
        dependencies: [],
        exit_conditions: [
          "scripts/audit-zany.mjs lists every occurrence with file:line + suggested replacement",
          "ZANY-INVENTORY.json categorizes each: object-shape | union | record | unknown",
        ],
        deliverables: [
          { path: "scripts/audit-zany.mjs", type: "script", description: "Find + classify all z.any() instances" },
          { path: "ZANY-INVENTORY.json", type: "state", description: "Categorized z.any() inventory" },
        ],
        tools: [],
        four_loop: ["BUILD", "SCRUTINIZE", "GAP FILL", "TIE UP"],
      },
      {
        id: "P8-U02",
        title: "Replace z.any() in adaptiveControl, atcs, autonomous schemas (high-traffic dispatchers)",
        effort: 60,
        dependencies: ["P8-U01"],
        exit_conditions: [
          "Three target schemas: 0 z.any() remaining",
          "Replaced with explicit z.object / z.union / z.record(z.unknown())",
          "Tests pass after refactor",
        ],
        deliverables: [
          { path: "mcp-server/src/schemas/adaptiveControlActionSchemas.ts", type: "schema", description: "Eliminate z.any()" },
          { path: "mcp-server/src/schemas/atcsActionSchemas.ts", type: "schema", description: "Eliminate z.any()" },
          { path: "mcp-server/src/schemas/autonomousActionSchemas.ts", type: "schema", description: "Eliminate z.any()" },
        ],
        tools: [],
        four_loop: ["BUILD", "SCRUTINIZE", "GAP FILL", "TIE UP"],
      },
      {
        id: "P8-U03",
        title: "Sweep remaining ~150 z.any() across all other schemas",
        effort: 80,
        dependencies: ["P8-U02"],
        exit_conditions: [
          "grep z.any() in mcp-server/src/schemas/ returns 0 matches",
          "All 95 dispatchers compile cleanly",
          "No regression in test suite",
        ],
        deliverables: [
          { path: "mcp-server/src/schemas/*.ts", type: "schema", description: "Sweep remaining z.any() instances" },
        ],
        tools: [],
        four_loop: ["BUILD", "SCRUTINIZE", "GAP FILL", "TIE UP"],
      },
      {
        id: "P8-U04",
        title: "Backfill .describe() on all 340 schema fields via Ollama",
        effort: 70,
        dependencies: ["P8-U03"],
        exit_conditions: [
          "scripts/add-schema-describes.mjs uses qwen-32b to generate description per field",
          "Coverage greater than or equal to 95% of fields have .describe()",
          "MCP tool descriptions improved on action introspection",
        ],
        deliverables: [
          { path: "scripts/add-schema-describes.mjs", type: "script", description: "Ollama-powered describe backfill" },
        ],
        tools: [],
        four_loop: ["BUILD", "SCRUTINIZE", "GAP FILL", "TIE UP"],
      },
      {
        id: "P8-U05",
        title: "Add prism_dev:schema_coverage_audit dispatcher action",
        effort: 30,
        dependencies: ["P8-U04"],
        exit_conditions: [
          "Action added to devDispatcher z.enum",
          "Reports z.any() count, .describe() coverage, schema-vs-dispatcher drift",
          "Round-trip dispatcher test passes",
        ],
        deliverables: [
          { path: "mcp-server/src/tools/dispatchers/devDispatcher.ts", type: "source", description: "Add schema_coverage_audit action" },
          { path: "mcp-server/src/engines/SchemaQualityAuditEngine.ts", type: "source", description: "New engine" },
          { path: "mcp-server/src/__tests__/SchemaCoverageAudit.test.ts", type: "test", description: "Round-trip test" },
        ],
        tools: ["prism_dev:schema_coverage_audit"],
        four_loop: ["BUILD", "SCRUTINIZE", "GAP FILL", "TIE UP"],
      },
      {
        id: "P8-U06",
        title: "Wire pre-commit hook to block z.any() reintroduction",
        effort: 30,
        dependencies: ["P8-U05"],
        exit_conditions: [
          "PreToolUse Write hook on schemas/*.ts blocks if diff adds z.any()",
          "Tested: synthetic z.any() in PR diff triggers block",
        ],
        deliverables: [
          { path: ".claude/hooks/zany-reintroduction-block.mjs", type: "hook", description: "Pre-write gate" },
          { path: "H:/.claude/settings.json", type: "config", description: "Wire the hook" },
        ],
        tools: [],
        four_loop: ["BUILD", "SCRUTINIZE", "GAP FILL", "TIE UP"],
      },
    ],
  },
  {
    id: "P9",
    title: "AUTO Chain Wiring — Connect Quality Engines to Live Consumers",
    rationale: "Agent 5: AUTO-0 through AUTO-6 (QualityScoreEngine, SelfImprovementPatternEngine, AutoFixPipelineEngine, QualityDashboardEngine, SystemVariabilityIndexEngine, FormulaValidationEngine) wired only in devDispatcher. SelfImprovementPatternEngine never feeds AutoFixPipelineEngine. 4 engines have no tests. System measures quality, does not act.",
    sessions: "2",
    units: [
      {
        id: "P9-U01",
        title: "Add tests for 4 untested AUTO engines",
        effort: 80,
        dependencies: [],
        exit_conditions: [
          "AutoFixPipelineEngine.test.ts created (happy + 3 failure paths)",
          "QualityDashboardEngine.test.ts created",
          "SelfImprovementPatternEngine.test.ts created",
          "SystemVariabilityIndexEngine.test.ts created",
          "All pass: npx vitest run",
        ],
        deliverables: [
          { path: "mcp-server/src/__tests__/AutoFixPipelineEngine.test.ts", type: "test", description: "Coverage tests" },
          { path: "mcp-server/src/__tests__/QualityDashboardEngine.test.ts", type: "test", description: "Coverage tests" },
          { path: "mcp-server/src/__tests__/SelfImprovementPatternEngine.test.ts", type: "test", description: "Coverage tests" },
          { path: "mcp-server/src/__tests__/SystemVariabilityIndexEngine.test.ts", type: "test", description: "Coverage tests" },
        ],
        tools: [],
        four_loop: ["BUILD", "SCRUTINIZE", "GAP FILL", "TIE UP"],
      },
      {
        id: "P9-U02",
        title: "Wire SelfImprovementPatternEngine to AutoFixPipelineEngine handoff",
        effort: 60,
        dependencies: ["P9-U01"],
        exit_conditions: [
          "Patterns emit to AutoFixPipelineEngine.suggest()",
          "Auto-fix candidates persist to data/state/auto-fix-pipeline.json",
          "Round-trip test passes",
        ],
        deliverables: [
          { path: "mcp-server/src/engines/AutoChainOrchestratorEngine.ts", type: "source", description: "Wires the chain end-to-end" },
          { path: "mcp-server/src/__tests__/AutoChainOrchestrator.test.ts", type: "test", description: "Round-trip test" },
        ],
        tools: ["prism_dev:auto_fix_generate"],
        four_loop: ["BUILD", "SCRUTINIZE", "GAP FILL", "TIE UP"],
      },
      {
        id: "P9-U03",
        title: "Wire QualityDashboardEngine alerts to PreCompact + Stop hooks",
        effort: 50,
        dependencies: ["P9-U01"],
        exit_conditions: [
          "Stop hook surfaces quality alerts (regression, threshold breach)",
          "PreCompact hook runs quality_dashboard before compaction",
          "Critical alerts block Stop until acknowledged",
        ],
        deliverables: [
          { path: ".claude/hooks/quality-dashboard-alert.mjs", type: "hook", description: "Stop + PreCompact event surfaces" },
          { path: "H:/.claude/settings.json", type: "config", description: "Wire to Stop + PreCompact" },
        ],
        tools: ["prism_dev:quality_dashboard"],
        four_loop: ["BUILD", "SCRUTINIZE", "GAP FILL", "TIE UP"],
      },
      {
        id: "P9-U04",
        title: "Add buildDispatcher + hookDispatcher + sessionDispatcher consumers of AUTO chain",
        effort: 60,
        dependencies: ["P9-U02"],
        exit_conditions: [
          "buildDispatcher.preEdit calls QualityScoreEngine for affected file",
          "hookDispatcher.audit calls QualityDashboardEngine",
          "sessionDispatcher.end calls SelfImprovementPatternEngine.consolidate",
          "3 round-trip tests",
        ],
        deliverables: [
          { path: "mcp-server/src/tools/dispatchers/buildDispatcher.ts", type: "source", description: "Add AUTO chain wiring" },
          { path: "mcp-server/src/tools/dispatchers/hookDispatcher.ts", type: "source", description: "Add AUTO chain wiring" },
          { path: "mcp-server/src/tools/dispatchers/sessionDispatcher.ts", type: "source", description: "Add AUTO chain wiring" },
        ],
        tools: [],
        four_loop: ["BUILD", "SCRUTINIZE", "GAP FILL", "TIE UP"],
      },
      {
        id: "P9-U05",
        title: "TokenEconomyEngine end-of-session report",
        effort: 50,
        dependencies: [],
        exit_conditions: [
          "Stop hook generates session token report by category (hooks, injections, tool-calls, file-reads)",
          "Report written to data/state/token-economy-session.json",
          "Top 3 waste patterns surfaced",
        ],
        deliverables: [
          { path: ".claude/hooks/token-economy-report.mjs", type: "hook", description: "Stop hook" },
          { path: "mcp-server/data/state/token-economy-session.json", type: "state", description: "Per-session report" },
        ],
        tools: ["prism_dev:token_economy_report"],
        four_loop: ["BUILD", "SCRUTINIZE", "GAP FILL", "TIE UP"],
      },
    ],
  },
  {
    id: "P10",
    title: "Duplicate Consolidation — 5 Asset Class Clusters",
    rationale: "All 5 agents identified massive duplication: 17 awareness hooks, 19 validation engines, 13 audit engines, 12 memory engines, 8 LEARN skills, 8 VALIDATE skills, 5 REVIEW skills, 5 MEMORY skills, 4 AUDIT skills, 44 audit scripts. Consolidation reduces cognitive load + eliminates conflict risk.",
    sessions: "2",
    units: [
      {
        id: "P10-U01",
        title: "Consolidate 17 awareness hooks down to 3 canonical",
        effort: 50,
        dependencies: [],
        exit_conditions: [
          "Keep wired: awareness-snapshot, awareness-bootstrap, prism-awareness-cache",
          "Move 14 redundant to .claude/hooks/.deprecated/ (do NOT delete)",
          "settings.json wires only 3 canonical",
          "Documented in MEMORY.md",
        ],
        deliverables: [
          { path: ".claude/hooks/.deprecated/", type: "config", description: "14 redundant awareness hooks moved here" },
          { path: "H:/.claude/settings.json", type: "config", description: "Wire only 3 canonical" },
        ],
        tools: [],
        four_loop: ["BUILD", "SCRUTINIZE", "GAP FILL", "TIE UP"],
      },
      {
        id: "P10-U02",
        title: "Build ValidationOrchestratorEngine — single entry point for 19 validation engines",
        effort: 80,
        dependencies: [],
        exit_conditions: [
          "Engine routes by domain: code | physics | data | post | formula | machine | etc.",
          "All 19 validation engines accessible via prism_dev:validate { domain, target }",
          "Old engines preserved (no deletion); new orchestrator delegates",
        ],
        deliverables: [
          { path: "mcp-server/src/engines/ValidationOrchestratorEngine.ts", type: "source", description: "Single entry router" },
          { path: "mcp-server/src/__tests__/ValidationOrchestrator.test.ts", type: "test", description: "Round-trip per domain" },
        ],
        tools: ["prism_dev:validate"],
        four_loop: ["BUILD", "SCRUTINIZE", "GAP FILL", "TIE UP"],
      },
      {
        id: "P10-U03",
        title: "Build AuditChainEngine — consolidate 13 audit engines under single dispatcher action",
        effort: 70,
        dependencies: [],
        exit_conditions: [
          "Engine routes audit type: code | machine | data | hook | system | security | etc.",
          "prism_dev:audit_chain { type, scope } as single action",
          "Old engines preserved as backends",
        ],
        deliverables: [
          { path: "mcp-server/src/engines/AuditChainEngine.ts", type: "source", description: "Audit router + composer" },
          { path: "mcp-server/src/__tests__/AuditChain.test.ts", type: "test", description: "Per audit type" },
        ],
        tools: ["prism_dev:audit_chain"],
        four_loop: ["BUILD", "SCRUTINIZE", "GAP FILL", "TIE UP"],
      },
      {
        id: "P10-U04",
        title: "Build MemoryFabricRouterEngine — single entry for 12 memory engines",
        effort: 80,
        dependencies: ["P0-U01", "P0-U02"],
        exit_conditions: [
          "Routes by intent: store | recall | consolidate | semantic_search | persist | sync",
          "prism_memory:* surface unified across PersistentMemory + Qdrant + Conversational + Graph + Fabric",
          "Old engines retained; router delegates",
        ],
        deliverables: [
          { path: "mcp-server/src/engines/MemoryFabricRouterEngine.ts", type: "source", description: "Memory router" },
          { path: "mcp-server/src/__tests__/MemoryFabricRouter.test.ts", type: "test", description: "Per intent" },
        ],
        tools: ["prism_memory:store", "prism_memory:recall", "prism_memory:consolidate", "prism_memory:semantic_search"],
        four_loop: ["BUILD", "SCRUTINIZE", "GAP FILL", "TIE UP"],
      },
      {
        id: "P10-U05",
        title: "Skill cluster consolidation — create /audit /review /validate-program /learn /memory dispatchers",
        effort: 60,
        dependencies: [],
        exit_conditions: [
          "/audit routes to: context, program, harness, security, system, hook, etc.",
          "/review routes to: cad, error, code, github, sparc",
          "/validate-program routes by --machine= flag",
          "/learn auto-detects format (PDF / video / text / url)",
          "/memory routes search | list | prune | sync | export",
          "Existing specific skills preserved; new dispatchers reference them",
        ],
        deliverables: [
          { path: ".claude/commands/audit.md", type: "command", description: "Unified audit dispatcher" },
          { path: ".claude/commands/review.md", type: "command", description: "Unified review dispatcher" },
          { path: ".claude/commands/validate-program.md", type: "command", description: "Unified validation dispatcher" },
          { path: ".claude/commands/learn.md", type: "command", description: "Unified learn dispatcher" },
          { path: ".claude/commands/memory.md", type: "command", description: "Unified memory dispatcher" },
        ],
        tools: [],
        four_loop: ["BUILD", "SCRUTINIZE", "GAP FILL", "TIE UP"],
      },
      {
        id: "P10-U06",
        title: "Consolidate 44 audit scripts into 1 unified audit.mjs with subcommands",
        effort: 50,
        dependencies: ["P10-U03"],
        exit_conditions: [
          "scripts/audit.mjs <subcommand> handles: materials, hooks, machines, inventory, security, etc.",
          "44 individual audit scripts moved to scripts/.deprecated/",
          "Cron wired to call unified script daily",
        ],
        deliverables: [
          { path: "scripts/audit.mjs", type: "script", description: "Unified audit dispatcher" },
          { path: "scripts/.deprecated/", type: "config", description: "44 superseded scripts archived" },
        ],
        tools: [],
        four_loop: ["BUILD", "SCRUTINIZE", "GAP FILL", "TIE UP"],
      },
    ],
  },
  {
    id: "P11",
    title: "Auto-Invoke Wiring — Skills + Hooks + Cron Triggers",
    rationale: "Agents 1, 2, 3 found massive auto-invoke gap: 7/150 skills with policy triggers, 0 scripts on cron, 50% of hooks wired. Wire it all.",
    sessions: "2",
    units: [
      {
        id: "P11-U01",
        title: "Add policy frontmatter (auto-invoke triggers) to top 25 dev-quality skills",
        effort: 60,
        dependencies: [],
        exit_conditions: [
          "skill-modernize tool run on 25 high-leverage skills (forge-triple, dedup, scrutinize, context-audit, memory-search, error-learn-review, harness-security-audit, etc.)",
          "Each gets policy.tier + policy.triggers in frontmatter",
          "Auto-invoke verified by triggering keyword + observing skill activation",
        ],
        deliverables: [
          { path: ".claude/commands/*.md (25 files)", type: "command", description: "Add policy frontmatter to top 25 skills" },
        ],
        tools: ["skill-modernize"],
        four_loop: ["BUILD", "SCRUTINIZE", "GAP FILL", "TIE UP"],
      },
      {
        id: "P11-U02",
        title: "Wire 25 dangling dev-quality hooks (Tier 1-3 from Agent 3)",
        effort: 90,
        dependencies: [],
        exit_conditions: [
          "25 hooks wired in settings.json: enforce-stub-detector, enforce-test-quality, build-guard-hook, enforce-wiring-gate, anti-pattern-detector, file-claim-guard, file-claim-commit-guard, chat-bus-inject, cross-terminal-conflict, auto-lint-post-edit, async-pattern-checker, consistent-return-checker, type-safety-checker, api-contract-enforcer, context-priority-coordinator, hook-saturation-alert, embedding-cache-guard, bash-result-cache, claude-md-mirror, memory-system-init, state-write-watch, session-action-memory, hook-schema-validator, critical-file-guard, dep-graph-impact",
          "Each smoke-tested with synthetic payload (no schema violation)",
          "Audit re-run: dangling count drops by 25",
        ],
        deliverables: [
          { path: "H:/.claude/settings.json", type: "config", description: "Add 25 hooks across PreToolUse / PostToolUse / SessionStart / Stop blocks" },
        ],
        tools: [],
        four_loop: ["BUILD", "SCRUTINIZE", "GAP FILL", "TIE UP"],
      },
      {
        id: "P11-U03",
        title: "Cron-schedule top 10 dev scripts (mirror-c-to-h, vault-population-audit, etc.)",
        effort: 40,
        dependencies: [],
        exit_conditions: [
          "Windows Task Scheduler entries for: nightly mirror-c-to-h, daily inventory refresh, daily vault audit, hourly Ollama health, weekly token-economy report",
          "Documented in CRON-SCHEDULE.md",
          "Each script logs to data/state/cron-runs.jsonl",
        ],
        deliverables: [
          { path: "scripts/install-cron-schedule.ps1", type: "script", description: "PowerShell installer for Windows Task Scheduler" },
          { path: "CRON-SCHEDULE.md", type: "doc", description: "Schedule reference + how-to" },
        ],
        tools: [],
        four_loop: ["BUILD", "SCRUTINIZE", "GAP FILL", "TIE UP"],
      },
      {
        id: "P11-U04",
        title: "Run skill-modernize on remaining 125 skills (model / effort / context fields)",
        effort: 50,
        dependencies: ["P11-U01"],
        exit_conditions: [
          "Greater than or equal to 95% of skills have model + effort + context frontmatter",
          "Inferred via Ollama qwen-32b classifier",
          "Backup of original frontmatter preserved",
        ],
        deliverables: [
          { path: ".claude/commands/*.md (125 files)", type: "command", description: "Modernize frontmatter via skill-modernize" },
        ],
        tools: ["skill-modernize"],
        four_loop: ["BUILD", "SCRUTINIZE", "GAP FILL", "TIE UP"],
      },
    ],
  },
  {
    id: "P12",
    title: "God Object Refactors — Split Mega-Dispatchers + Mega-Engines",
    rationale: "Agent 4 + Agent 5: securityDispatcher 1055 actions, ppDispatcher 644, dataDispatcher 250 — discovery is O(N) over thousands. QuoteToShipOrchestratorEngine 5450 LOC, PostProcessorPipelineEngine 4927 LOC, MachiningPlaybookEngine 4465 LOC — single-responsibility violations.",
    sessions: "2",
    units: [
      {
        id: "P12-U01",
        title: "Split securityDispatcher (1055 actions) into 5 sub-dispatchers",
        effort: 90,
        dependencies: [],
        exit_conditions: [
          "New: securityAuth (200), securityEncryption (150), securityCompliance (200), securityAudit (200), securityThreat (305 = remainder)",
          "Old securityDispatcher remains as forwarding facade for backward compat",
          "All test files pass",
        ],
        deliverables: [
          { path: "mcp-server/src/tools/dispatchers/securityAuthDispatcher.ts", type: "source", description: "Split 1: auth" },
          { path: "mcp-server/src/tools/dispatchers/securityEncryptionDispatcher.ts", type: "source", description: "Split 2: encryption" },
          { path: "mcp-server/src/tools/dispatchers/securityComplianceDispatcher.ts", type: "source", description: "Split 3: compliance" },
          { path: "mcp-server/src/tools/dispatchers/securityAuditDispatcher.ts", type: "source", description: "Split 4: audit" },
          { path: "mcp-server/src/tools/dispatchers/securityThreatDispatcher.ts", type: "source", description: "Split 5: threat" },
        ],
        tools: [],
        four_loop: ["BUILD", "SCRUTINIZE", "GAP FILL", "TIE UP"],
      },
      {
        id: "P12-U02",
        title: "Split ppDispatcher (644 actions) by CAM system",
        effort: 90,
        dependencies: [],
        exit_conditions: [
          "New: ppFusion, ppMastercam, ppHypermill, ppNX, ppGeneric dispatchers",
          "Old ppDispatcher remains as forwarding facade",
          "Tests pass",
        ],
        deliverables: [
          { path: "mcp-server/src/tools/dispatchers/ppFusionDispatcher.ts", type: "source", description: "Split for Fusion" },
          { path: "mcp-server/src/tools/dispatchers/ppMastercamDispatcher.ts", type: "source", description: "Split for Mastercam" },
          { path: "mcp-server/src/tools/dispatchers/ppHypermillDispatcher.ts", type: "source", description: "Split for Hypermill" },
          { path: "mcp-server/src/tools/dispatchers/ppNXDispatcher.ts", type: "source", description: "Split for NX" },
          { path: "mcp-server/src/tools/dispatchers/ppGenericDispatcher.ts", type: "source", description: "Split for generic / other" },
        ],
        tools: [],
        four_loop: ["BUILD", "SCRUTINIZE", "GAP FILL", "TIE UP"],
      },
      {
        id: "P12-U03",
        title: "Refactor QuoteToShipOrchestratorEngine (5450 LOC) into 4 stage engines",
        effort: 100,
        dependencies: [],
        exit_conditions: [
          "Split: QuoteOrchestrator (1-10), CostingOrchestrator (11-20), ProductionOrchestrator (21-30), ShipOrchestrator (31-38)",
          "Original kept as facade for backward compat",
          "No test regressions",
        ],
        deliverables: [
          { path: "mcp-server/src/engines/QuoteOrchestratorEngine.ts", type: "source", description: "Stages 1-10" },
          { path: "mcp-server/src/engines/CostingOrchestratorEngine.ts", type: "source", description: "Stages 11-20" },
          { path: "mcp-server/src/engines/ProductionOrchestratorEngine.ts", type: "source", description: "Stages 21-30" },
          { path: "mcp-server/src/engines/ShipOrchestratorEngine.ts", type: "source", description: "Stages 31-38" },
        ],
        tools: [],
        four_loop: ["BUILD", "SCRUTINIZE", "GAP FILL", "TIE UP"],
      },
      {
        id: "P12-U04",
        title: "Refactor PostProcessorPipelineEngine (4927 LOC) into per-CAM dialect engines",
        effort: 100,
        dependencies: [],
        exit_conditions: [
          "Extract PostProcessorDialectEngine[CAM_NAME] for each of 18 CAM systems",
          "Original kept as router / facade",
          "Tests pass",
        ],
        deliverables: [
          { path: "mcp-server/src/engines/dialects/PostProcessorDialect{Fusion,Mastercam,Hypermill,...}.ts", type: "source", description: "Per-CAM extraction (18 files)" },
        ],
        tools: [],
        four_loop: ["BUILD", "SCRUTINIZE", "GAP FILL", "TIE UP"],
      },
    ],
  },
];

env.phases.push(...newPhases);
const totalUnits = env.phases.reduce((sum, p) => sum + p.units.length, 0);
env.total_units = totalUnits;
env.estimated_sessions_p50 = 12;
env.estimated_sessions_p90 = 16;
env.audit_origin = "10 parallel scout agents (5 memory/learning/ollama/intelligence/coverage + 5 skills/scripts/hooks/schemas/engines)";

fs.writeFileSync(ENV_PATH, JSON.stringify(env, null, 2));
console.log("Envelope extended:");
console.log("  Phases:", env.phases.length);
console.log("  Total units:", totalUnits);
console.log("  Sessions p50:", env.estimated_sessions_p50);

// Update roadmap-index too
const idxPath = "H:/PRISM/mcp-server/data/roadmap-index.json";
let raw = fs.readFileSync(idxPath, "utf-8");
if (raw.charCodeAt(0) === 0xFEFF) raw = raw.slice(1);
const idx = JSON.parse(raw);
const ms = idx.milestones.find((m) => m.id === "INTEL-OLLAMA-OBSIDIAN-MS0");
if (ms) {
  ms.total_units = totalUnits;
  ms.sessions_p50 = 12;
  ms.sessions_p90 = 16;
  idx.updated_at = new Date().toISOString();
  fs.writeFileSync(idxPath, JSON.stringify(idx, null, 4) + "\n");
  console.log("roadmap-index.json updated");
}

// Mirror MEMORY.md to H: per master-drive rule
const memSrc = "C:/Users/Mark Villanueva/.claude/projects/H--PRISM/memory/MEMORY.md";
const memDest = "H:/.claude/projects/H--PRISM/memory/MEMORY.md";
if (fs.existsSync(memSrc)) {
  fs.mkdirSync(path.dirname(memDest), { recursive: true });
  fs.copyFileSync(memSrc, memDest);
  console.log("MEMORY.md mirrored to H:");
}

// Mirror the envelope to H:/.claude vault for cross-PC discoverability
const vaultDest = "H:/prism/knowledge/roadmap/INTEL-OLLAMA-OBSIDIAN-MS0.json";
fs.mkdirSync(path.dirname(vaultDest), { recursive: true });
fs.copyFileSync(ENV_PATH, vaultDest);
console.log("Envelope mirrored to knowledge/roadmap/");
