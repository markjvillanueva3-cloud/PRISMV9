#!/usr/bin/env node
// scripts/generate-feature-routing-graph.mjs
//
// FEATURE-ROUTING-GRAPH-MS0 / U-ROUTING-GRAPH (slot:alpha 2026-06-15). Emits the
// machine-readable backing catalog state/shared/feature-routing-graph.json from
// (1) the canonical TASK_CLASS_POLICY in scripts/lib/feature-routing-graph.mjs and
// (2) the enumerated substrate/router/hook catalogs embedded below (mined from the
// live surface 2026-06-15 -- this file is their durable home; re-run after any
// router/substrate change). The slash-command family catalog (112 distinct
// families) is durable here as a compact list; the SPEC prose lives in
// state/shared/specs/FEATURE-ROUTING-GRAPH.md.
//
// Re-run: node H:/prism/scripts/generate-feature-routing-graph.mjs

import fs from "node:fs";
import path from "node:path";
import { TASK_CLASS_POLICY, taskClasses, CONTEXT_STRATEGIES, assertCatalogCoherence, assertSubstrateClassCoherence, assertOperatorSubstrateCoverage, OPERATOR_SUBSTRATE_CATEGORIES, assertLadderTokenCoverage, LADDER_TOKEN_TO_SUBSTRATE, NON_CATALOG_LADDER_PRIMITIVES, SPINE, MODEL_IDS, resolveModelPlan, assertModelRoleCoherence, FALLBACK_LADDER } from "./lib/feature-routing-graph.mjs";

const OUT = path.join(process.env.PRISM_ROOT || "H:/prism", "state/shared/feature-routing-graph.json");

// 20 substrate nodes (whenToUse compacted; full prose in the SPEC).
const SUBSTRATES = [
  { name: "master-graph", whenToUse: "where is X / is it built / blast radius -- BEFORE any grep", howToInvoke: "prism_session:master_index_query | system-viz-query.mjs find|node-card|blast-radius", costTier: "free", governingRouter: "master-index-precheck-inject", taskClasses: ["locate", "fix", "build"] },
  { name: "obsidian-vault", whenToUse: "prior-art recall before build; persist outcome after", howToInvoke: "READ prism_memory:semantic_search; WRITE reference_*.md", costTier: "free", governingRouter: "task-substrate-router(obsidian) + handoff-memory-seed-stop", taskClasses: ["recall", "session", "learn", "locate"] },
  { name: "ollama-offload", whenToUse: "mechanical text/code (explain/summarize/classify/lint) NOT safety g-code", howToInvoke: "node scripts/ask-ollama.mjs <mode> <input>", costTier: "free", governingRouter: "model-tier-advisor + OllamaHookBridgeEngine", taskClasses: ["locate", "recall", "review", "fix", "learn"] },
  { name: "cag", whenToUse: "every prompt: skip redundant doctrine on cold hits", howToInvoke: "classifyQuery() in cag-router.mjs (auto)", costTier: "free", governingRouter: "cag-router(self)", taskClasses: ["recall", "locate", "session"] },
  { name: "rag", whenToUse: "semantic similarity over engines/skills/formulas", howToInvoke: "prism_memory:semantic_search | hybrid-retrieval.mjs", costTier: "low", governingRouter: "cag-router HOT path", taskClasses: ["locate", "recall", "domain", "quote"] },
  { name: "wikis", whenToUse: "curated domain reference before building", howToInvoke: "/wiki-query <topic>", costTier: "free", governingRouter: "cag COLD_SOURCES(wiki-index)", taskClasses: ["recall", "locate", "domain", "plan", "physics"] },
  { name: "tribal-knowledge", whenToUse: "shop-floor wisdom before CAM/machining", howToInvoke: "auto-injected; tribal-rerank-spawn.mjs <q>", costTier: "free", governingRouter: "cag COLD_SOURCES(tribal-tips)", taskClasses: ["recall", "domain", "plan", "build", "quote", "physics"] },
  { name: "memories", whenToUse: "auto-write session outcomes at Stop", howToInvoke: "auto handoff-memory-seed-stop; prism_memory", costTier: "free", governingRouter: "handoff-memory-seed-stop", taskClasses: ["session", "recall", "learn"] },
  { name: "second-brain", whenToUse: "cross-session knowledge: what did we learn/decide", howToInvoke: "prism_memory:semantic_search | knowledge/memories/*", costTier: "free", governingRouter: "task-substrate-router(obsidian)", taskClasses: ["recall", "session", "learn", "plan"] },
  { name: "psn", whenToUse: "cross-substrate synthesis each iteration (11 legs)", howToInvoke: "feed-down auto-injected; feed-up writes reference_*.md", costTier: "free", governingRouter: "composition of all substrates", taskClasses: ["orchestrate", "recall", "learn", "session", "plan"] },
  { name: "model-switching", whenToUse: "escalate local->cloud by complexity/budget", howToInvoke: "/model <tier>; auto model-tier-advisor", costTier: "free", governingRouter: "model-routing-policy.routePrompt", taskClasses: ["orchestrate", "plan", "build", "fix", "session"] },
  { name: "prism-ai", whenToUse: "programmatic route/classify within MCP chains; physics/safety calc via prism_calc + prism_safety", howToInvoke: "prism_ai:route_task|classify_complexity; prism_calc + prism_safety:validate_physics", costTier: "low", governingRouter: "AISystemRouterEngine(MCP facade)", taskClasses: ["orchestrate", "plan", "build", "fix", "domain", "physics"] },
  { name: "hermes", whenToUse: "stronger managed-OAuth model, single shot, outside ctx", howToInvoke: "node scripts/ask-hermes.mjs <mode> <input> (:8645)", costTier: "low", governingRouter: "hermes-workflow-planner", taskClasses: ["locate", "recall", "review", "plan", "domain"] },
  { name: "hermes-agents", whenToUse: "parallel/adversarial/tournament fan-out", howToInvoke: "Agent fan-out | prism_hermes; Zulu fleet", costTier: "mid", governingRouter: "shouldUseWorkflow()", taskClasses: ["orchestrate", "build", "review", "plan", "fix"] },
  { name: "consensus", whenToUse: "high-stakes review/plan/orchestrate where a single model-family blind spot is a risk -- octopus cross-vendor (Claude+Codex+Ollama+Grok+Gemini) agreement scoring; disagreement IS the signal (the gap)", howToInvoke: "/octopus | prism_ai:consensus_decide {prompt,voices,options?} | auto-drain stop-consensus-drain.mjs; recall prism_dev:consensus_cache_recall", costTier: "mid", governingRouter: "auto-consensus-userprompt + stop-consensus-drain (out-of-band) | MultiModelConsensusEngine.ask()", taskClasses: ["review", "plan", "orchestrate"] },
  { name: "crons", whenToUse: "recurring/one-shot wall-clock action", howToInvoke: "CronCreate tool (durable:true to persist)", costTier: "free", governingRouter: "NONE(native tool)", taskClasses: ["orchestrate", "session", "learn"] },
  { name: "loops", whenToUse: "poll/repeat on an interval, session-bound", howToInvoke: "/loop <interval> <command>", costTier: "low", governingRouter: "prism_atcs", taskClasses: ["orchestrate", "session", "fix"] },
  { name: "harnessed-loops", whenToUse: "autonomous, context-boundary-crossing build loop", howToInvoke: "Workflow tool + /checkin Step12", costTier: "mid", governingRouter: "prism_atcs", taskClasses: ["orchestrate", "build", "fix", "session", "plan"] },
  { name: "prism-learning-systems", whenToUse: "after a verified outcome -> ledger -> GNN/LoRA", howToInvoke: "prism_outcome append; lora-training-pipeline.mjs", costTier: "mid", governingRouter: "outcomeDispatcher", taskClasses: ["learn", "build", "quote", "domain"] },
  { name: "lora", whenToUse: "fine-tune a domain adapter from the ledger", howToInvoke: "lora-training-pipeline.mjs <config>", costTier: "high", governingRouter: "NONE(pipeline-driven)", taskClasses: ["learn", "build", "domain"] },
];

// 6 composed routers (the spine the graph wires together).
const ROUTERS = [
  { file: "scripts/lib/cag-router.mjs", decides: "what context to load (COLD/HOT/HYBRID)", api: "classifyQuery(query)", roleInGraph: "Step 1 -- context-load decision" },
  { file: "scripts/lib/model-routing-policy.mjs", decides: "which engine/tier", api: "routePrompt({prompt})", roleInGraph: "Spine -- engine+tier verdict" },
  { file: "scripts/lib/task-substrate-router.mjs", decides: "which substrate plan", api: "routeTask(taskType,phase,ctx)", roleInGraph: "Step 4 -- execution plan" },
  { file: "scripts/lib/loop-goal-stack-advisor.mjs", decides: "per-iter presentation", api: "buildStackAdvisory({prompt,iter})", roleInGraph: "Presentation -- /loop+/goal delivery" },
  { file: ".claude/hooks/skill-auto-trigger.mjs", decides: "which skill to fire", api: "_skill-triggers.jsonl + INVOKE_NOW_SKILLS", roleInGraph: "Parallel branch -- skill axis" },
  { file: "mcp-server/src/engines/AISystemRouterEngine.ts", decides: "task-class -> backend (MCP)", api: "aiSystemRouterEngine.route(task)", roleInGraph: "MCP facade" },
];

// Hook layer summary (the auto-invoke + gate surface the graph composes with).
const HOOKS = {
  totalHooks: 809,
  byEvent: { SessionStart: 61, UserPromptSubmit: 59, PreToolUse: 47, PostToolUse: 31, Stop: 66, PreCompact: 9, SubagentStart: 1 },
  autoInjectors: ["skill-auto-trigger", "master-index-precheck-inject", "cag-router-inject", "task-start-substrate-inject", "model-tier-advisor", "ollama-pipeline-injector", "memory-index-precheck-inject", "tribal-by-domain-inject", "slot-soul-inject", "galaxy-claudemd-inject", "obsidian-vault-precheck-inject", "comprehensive-build-enforce"],
  gates: ["scrutinize-before-stop", "duplication-hard-block", "comprehensive-build-enforce", "claude-md-golf-only-guard", "git-add-lane-guard", "file-claim-guard", "fork-storm-circuit-breaker", "agent-fanout-pressure-gate", "subagent-model-enforce", "stop_on_unsafe_gcode", "enforce-handoff-topic", "stop-close-own-bg-tasks", "goal-complete-gate", "commit-pressure-stop-gate"],
  autoInvokeMechanism: "skill-auto-trigger.mjs: BM25-scores prompt vs knowledge/wiki/architecture/_skill-triggers.jsonl; INVOKE_NOW_SKILLS allowlist fires mandatory at score>=0.75, advisory at >=0.65. Add a task-class command auto-fire by appending an entry (action:invoke, matcher.value=autoInvoke phrases) + adding the skill to INVOKE_NOW_SKILLS (mirror in scripts/extract-skill-triggers.mjs).",
};

// 112 distinct command families collapse from 1118 files (per-slot dupes folded).
// The autoInvokable subset is the high-confidence fire-on-sight set.
const COMMAND_FAMILY_COUNT = 112;
const AUTO_INVOKABLE = ["/master-index", "/dedup", "/wiki-query", "/pdf-learn", "/auto-speed-feed", "/scrutinize", "/checkin-<slot>", "/startup-<slot>", "/handoff", "/precompact"];

function buildPolicyExport() {
  const out = {};
  for (const c of taskClasses()) out[c] = TASK_CLASS_POLICY[c];
  return out;
}

function main() {
  // Coherence guard (R12, U-CONTEXT-STRATEGY-LENS): the Write/Select/Compress/Isolate lens
  // must bucket EXACTLY the SUBSTRATES catalog. assertCatalogCoherence THROWS a NAMED drift
  // error (missing/extra/dup) so catalog<->lens can never silently diverge -- the dup case
  // is now named (arm-C P3 fix; the prior inline guard left it empty).
  assertCatalogCoherence(Object.values(CONTEXT_STRATEGIES).flatMap((d) => d.substrates), SUBSTRATES.map((s) => s.name));
  // Model-routing coherence guard (R12, U-MODEL-PLAN-RESOLVER): the structured
  // MODEL_ROLE_BY_CLASS map must agree with each class's prose modelTier (reasoning->opus,
  // coding->Sonnet+coder-ensemble, mechanical->never-opus). THROWS a named drift error so the
  // operator's directive (reasoning=Opus / coding=Sonnet+coders) can't silently rot in prose.
  assertModelRoleCoherence();
  // Substrate<->class coherence guard (R12, U-GRAPH-SUBSTRATE-CLASS-COHERENCE 2026-06-18 slot:zulu):
  // the THIRD coherence leg. The substrate catalog's substrate->class edges (SUBSTRATES[].taskClasses)
  // must stay synced with the canonical task-class set -- every ref names a real class, no substrate is
  // orphaned, and NO task class is substrate-starved (the bug it caught on first run: `physics` had a full
  // policy ladder but ZERO catalog substrate back-referenced it -> the graph's two halves had drifted).
  // THROWS a named drift error so the desync can never silently regenerate. Operator: "everything synced
  // and synergized."
  assertSubstrateClassCoherence(SUBSTRATES, taskClasses());
  // Operator-directive coverage guard (R12, U-OPERATOR-SUBSTRATE-COVERAGE 2026-06-18 slot:zulu):
  // the FOURTH coherence leg. The operator's /goal directive ("enforces usage of skills, scripts,
  // hooks, harnesses, loops, crons, hermes, ollama, obsidian, prism-ai, memories, wiki, tribal")
  // is now machine-checked against the LIVE graph -- every one of the 13 categories must be
  // enforced through >=1 axis (catalog row / command / hook / loopCron / execution / spine /
  // ladder). THROWS if any category is droppable to zero coverage, so "the graph enforces usage
  // of everything" can never silently rot. Passes substrateNames for catalog-row robustness.
  assertOperatorSubstrateCoverage({ substrateNames: SUBSTRATES.map((s) => s.name) });
  // Ladder<->catalog coherence guard (R12, U-LADDER-CATALOG-RECONCILE 2026-06-18 slot:zulu): the
  // FIFTH coherence leg. Every distinct substrateLadder token across the policy must resolve to a
  // REAL catalog substrate (via LADDER_TOKEN_TO_SUBSTRATE) or be a declared non-catalog primitive
  // -- so the ladder vocabulary and the SUBSTRATES catalog vocabulary stay navigable as ONE graph
  // and cannot silently drift (a new/renamed ladder rung throws here until it is bridged).
  assertLadderTokenCoverage(TASK_CLASS_POLICY, SUBSTRATES.map((s) => s.name));
  const doc = {
    schemaVersion: 1,
    note: "Generated by scripts/generate-feature-routing-graph.mjs. Policy is canonical in scripts/lib/feature-routing-graph.mjs; prose in state/shared/specs/FEATURE-ROUTING-GRAPH.md. Counts mined 2026-06-15.",
    coverage: {
      taskClasses: taskClasses().length,
      substrates: SUBSTRATES.length,
      routersComposed: ROUTERS.length,
      hooks: HOOKS.totalHooks,
      commandFamilies: COMMAND_FAMILY_COUNT,
      slashCommandFiles: 1118,
    },
    taskClassPolicy: buildPolicyExport(),
    substrates: SUBSTRATES,
    contextStrategies: CONTEXT_STRATEGIES,
    spine: SPINE,
    // The operator's enumerated substrate set (the /goal "enforces usage of ...") + the live
    // graph axis that enforces each -- proven covered by assertOperatorSubstrateCoverage above.
    operatorSubstrateCategories: OPERATOR_SUBSTRATE_CATEGORIES,
    // Ladder<->catalog navigation bridge: every substrateLadder token -> its catalog node (or a
    // declared non-catalog primitive). Lets a consumer take a ladder rung and look up the catalog
    // node's howToInvoke -- the ladder + catalog are now one navigable graph.
    ladderTokenToSubstrate: LADDER_TOKEN_TO_SUBSTRATE,
    nonCatalogLadderPrimitives: NON_CATALOG_LADDER_PRIMITIVES,
    // Model-routing layer (operator 2026-06-18 + CLOUD-OVERFLOW-MS0 fleet work): the
    // structured per-class model plan + the canonical $0-cloud fallback ladder, so the
    // emitted graph is queryable for "which models does task class X use" without prose parsing.
    modelIds: MODEL_IDS,
    modelPlans: taskClasses().map((c) => resolveModelPlan(c)),
    fallbackLadder: FALLBACK_LADDER,
    routers: ROUTERS,
    hooks: HOOKS,
    autoInvokable: AUTO_INVOKABLE,
  };
  fs.mkdirSync(path.dirname(OUT), { recursive: true });
  fs.writeFileSync(OUT, JSON.stringify(doc, null, 2) + "\n");
  console.log(JSON.stringify({ ok: true, out: OUT, taskClasses: doc.coverage.taskClasses, substrates: doc.coverage.substrates, routers: doc.coverage.routersComposed }, null, 2));
}

main();
