// scripts/lib/feature-routing-graph.mjs
//
// FEATURE-ROUTING-GRAPH-MS0 / U-ROUTING-GRAPH (slot:alpha 2026-06-15) -- the
// UNIFIED feature-routing decision graph. Operator directive: "build a graph for
// you to follow on the most token efficient way to do every tool call and every
// task we've ever done" + auto-invoke commands without typing them.
//
// THE GAP THIS FILLS (verified by the routers enumeration, R8): PRISM already has
// six routers -- cag-router (what context to load), model-routing-policy (which
// engine/tier), task-substrate-router (which substrate plan), loop-goal-stack-
// advisor (per-iter presentation), skill-auto-trigger (which skill to fire),
// AISystemRouterEngine (MCP facade) -- but NO single artifact wires them together
// in a declared execution order with one shared input. Each re-reads the raw
// prompt independently; there is no handshake between the CAG tier, the model
// tier, the substrate plan, and the task-class policy. This module is that
// composer: one `routeTaskClass(prompt, ctx)` entry that COMPOSES the existing
// routers (lazy-import, fail-open -- never duplicates their logic, R7/R8) and
// overlays the per-TASK-CLASS policy (the substrate ladder + command sequence +
// auto-invoke set + antipattern) the operator can follow for every task.
//
// PURE classifier (classifyTaskClass) + the frozen TASK_CLASS_POLICY table have
// zero I/O and are fully testable. routeTaskClass lazy-imports the 3 pure-fn
// routers and degrades to a policy-only decision if any is unavailable (R12).

// ---- 12 task classes + the routing policy (the synthesized graph) -----------
// substrateLadder is ORDERED cheapest-first (the PSN ladder): the master graph /
// node-card answers "where/is-it-built" for 0 tokens; Obsidian/memory recalls
// prior art; Ollama does mechanical text; wiki/tribal supply curated doctrine;
// Claude is the last/most-expensive rung. modelTier follows Ollama->Sonnet->Opus.
// execution names the per-class MACHINERY (U-EXEC-POLICY 2026-06-16): the harness
// (named runner/sweep), hermes-agent delegation, and the ollama-offload model+scope.
// A "no"/"none" value means that dim is judgment-only/inapplicable for the class
// (so the inject self-suppresses it). loopCron carries the loop/cron axis; modelTier
// the model-switch ladder. Together they answer "HOW to execute this class" -- the
// operator directive to "apply engineered loops/harnesses/hermes/ollama/model-switching
// in the graph". Every named runner is a REAL on-disk asset (verified by recon, R8).
// BUILD-COMPLETE GATE (operator directive 2026-06-17): "all chats run loops until all
// gaps, bugs, errors and conflicts are filled and fixed before a build is considered
// complete." A build/fix/domain unit is DONE only when ALL FOUR axes are verified ZERO
// -- loop (one unit/iter, re-evaluate each pass) until none remain. R12: fail loud if
// any axis is unverified; never mark done on "looks fine". This is the definition-of-
// done the `doneWhen` field on each build-producing class points at.
export const BUILD_COMPLETE_GATE = Object.freeze({
  gaps: "no unbuilt/unwired/uncovered units -- every planned asset shipped + wired to ALL natural consumers (R15), tests cover happy + >=3 failure + >=2 adversarial",
  bugs: "no known-incorrect behavior -- each finding adversarially verified, not assumed; edge/NaN/empty/overflow handled",
  errors: "clean build + tests green (no .skip/.only) + zero new type/lint errors in touched files",
  conflicts: "no merge/peer-claim/doctrine conflicts -- surfaced AND resolved, never averaged (R7); no duplicate of an existing asset (R8/dedup)",
  rule: "LOOP one-unit-per-iter, RE-EVALUATE all four axes each pass; a build is NOT complete while any gap/bug/error/conflict is open. R12 fail-loud on any unverified axis.",
});

export const TASK_CLASS_POLICY = Object.freeze({
  locate: {
    trigger: "where is X / find / which file / is there / does X exist / search for",
    substrateLadder: ["master-graph", "obsidian", "wiki", "tribal", "grep"],
    modelTier: "ollama-or-sonnet (mechanical lookup; never opus)",
    commands: ["/master-index", "/node-card", "/deep-search"],
    hooks: ["master-index-precheck-inject", "cag-router-inject"],
    autoInvoke: ["/master-index"],
    antipattern: "Grep/Glob before hitting the master-index (route-before-grep)",
    loopCron: { loop: "no -- one-shot lookup", cron: "no" },
    execution: { harness: "none -- one-shot (system-viz-query find -> node-card)", hermes: "no -- direct master-index lookup", ollama: "qwen2.5-coder:1.5b to pick the matching hit (ask-ollama summarize)" },
  },
  build: {
    trigger: "build / implement / create / add / wire / new engine|hook|skill",
    substrateLadder: ["dedup-check", "master-graph", "wiki", "obsidian", "claude"],
    modelTier: "newest Sonnet (claude-sonnet-4-6) at MAX effort -- the coding default (operator directive + Google/Anthropic guidance 2026-06: Sonnet is the coding sweet spot); escalate to Opus ONLY for deep architecture or safety-critical design judgment",
    commands: ["/dedup", "/forge-triple", "/wire-unwired", "/scrutinize"],
    hooks: ["duplication-hard-block", "comprehensive-build-enforce", "scrutinize-before-stop"],
    autoInvoke: ["/dedup"],
    antipattern: "building before /dedup (DuplicationGuard) or shipping a stub/partial",
    doneWhen: "LOOP until ZERO open gaps (unbuilt/unwired/uncovered) + bugs + errors (build/test/type) + conflicts (merge/peer/doctrine) -- see BUILD_COMPLETE_GATE. NOT done while any axis is open (R12 fail-loud).",
    loopCron: { loop: "yes -- one unit/iter; LOOP until the BUILD_COMPLETE_GATE holds (zero gaps/bugs/errors/conflicts), re-evaluating each pass; eval-gate = tests + per-file scrutiny per unit (R15)", cron: "no -- attended build" },
    execution: { harness: "vitest + per-file 2-arm scrutiny per unit (eval-gate; attended, no autonomous runner) (R15)", hermes: "forge-team / dispatcher-wirer Agents (sonnet) for independent parallel modules", ollama: "CODER ENSEMBLE (operator 2026-06-18: combine coders to cover more ground in one pass) -- qwen2.5-coder:32b + qwen3-coder:30b run together + outputs combined, paired WITH the Sonnet Claude tier; deepseek-coder is NOT yet pulled locally (pull it or use cloud-if-free). NEVER for design/reasoning -- that stays Opus" },
  },
  plan: {
    trigger: "plan / design / architect / approach / how should we / crossroad",
    substrateLadder: ["obsidian", "wiki", "master-graph", "consensus", "claude"],
    modelTier: "opus (judgment)",
    commands: ["/forge", "/rgs", "brainstorm-path-forward", "/octopus"],
    hooks: ["comprehensive-build-enforce"],
    autoInvoke: [],
    antipattern: "guessing ONE path at a genuine crossroad instead of the 5-lens brainstorm; treating same-family agreement as proof when a cross-vendor lens would surface the real fork",
    loopCron: { loop: "no -- single design/brainstorm pass", cron: "no" },
    execution: { harness: "brainstorm-path-forward Workflow (5-lens -> synthesis)", hermes: "the 5 strategic-lens Agents ARE the fan-out (plain-text, no schema)", ollama: "no -- the 5-lens REASONING + synthesis is Claude/Opus (operator 2026-06-18: reasoning is ALWAYS Opus, NEVER a local reasoner); local models do mechanical text only, never the reasoning", consensus: "prism_ai:consensus_decide on the crossroad question -- cross-vendor (Claude+Codex+Ollama+Grok+Gemini) agreement complements the same-family 5-lens brainstorm; where vendors DISAGREE marks the real fork to resolve, not average" },
  },
  recall: {
    trigger: "what did we / prior / remember / last time / decision / why did",
    substrateLadder: ["obsidian", "cag-cold", "wiki", "master-graph"],
    modelTier: "ollama-or-sonnet",
    commands: ["/wiki-query", "/master-index", "prism_memory:semantic_search"],
    hooks: ["cag-router-inject", "obsidian-vault-precheck-inject", "memory-index-precheck-inject"],
    autoInvoke: ["/wiki-query"],
    antipattern: "re-deriving what the wiki/memory already documents",
    loopCron: { loop: "no -- single recall", cron: "no" },
    execution: { harness: "none -- single recall", hermes: "no", ollama: "qwen2.5-coder:1.5b to summarize recalled memory/wiki bodies (ask-ollama summarize)" },
  },
  learn: {
    trigger: "learn / ingest / extract / pdf / video / corpus / train",
    substrateLadder: ["ollama", "pdf-video-pipeline", "obsidian", "lora"],
    modelTier: "ollama for extraction; sonnet for structuring",
    commands: ["/pdf-learn", "/video-learn", "/wiki-ingest", "/learn-corpus"],
    hooks: ["ollama-pipeline-injector"],
    autoInvoke: ["/pdf-learn"],
    antipattern: "reading whole PDFs/videos into Claude context instead of the Ollama pipeline",
    loopCron: { loop: "yes -- corpus ingest: one source/iter with a resumable cursor; stop when the corpus is drained", cron: "yes -- nightly ingest of newly-added sources" },
    execution: { harness: "pdf-corpus-watcher-sweep.mjs / lima pypdf extractor / post-training-harness.mjs (resumable cursor)", hermes: "hermes-dream-cycle-synth.mjs for offline synthesis of the ingested corpus", ollama: "qwen2.5-coder:32b extraction + gpt-oss:20b structuring -- whole pipeline is ollama ($0)" },
  },
  quote: {
    trigger: "quote / cost / estimate / price / bid / margin / job cost",
    substrateLadder: ["obsidian", "prism_business", "physics", "claude"],
    modelTier: "sonnet then opus for margin judgment",
    commands: ["/quote-to-ship", "/quote", "/injection-mold-quote", "/job-cost"],
    hooks: ["cost-bridge-margin-floor-gate"],
    autoInvoke: [],
    antipattern: "emitting a customer quote without the margin-floor gate / a point estimate with no CI",
    loopCron: { loop: "no -- per-job", cron: "no" },
    execution: { harness: "quote-to-ship pipeline", hermes: "no", ollama: "qwen2.5-coder:32b to parse RFQ text / classify line items; margin judgment stays claude" },
  },
  physics: {
    trigger: "speed / feed / force / g-code / cutting / toolpath / safety / Kienzle",
    substrateLadder: ["prism_calc", "prism_safety", "wiki", "tribal", "claude"],
    modelTier: "opus (safety-critical reasoning)",
    commands: ["/auto-speed-feed", "/calc", "/physics-verify", "prism_safety:validate_physics"],
    hooks: ["stop_on_unsafe_gcode"],
    autoInvoke: ["/auto-speed-feed"],
    antipattern: "inlining Kienzle/Taylor/material constants instead of importing from physics/constants.ts",
    loopCron: { loop: "no -- per-part calc", cron: "no" },
    execution: { harness: "prism_calc -> prism_safety dispatcher round-trip", hermes: "no -- safety-critical, no delegation/egress", ollama: "no -- judgment/safety; never offload the calc or G-code" },
  },
  review: {
    trigger: "review / scrutinize / audit / check this / verify diff / code review",
    substrateLadder: ["claude-reviewers", "scrutiny-3of3", "consensus"],
    modelTier: "opus (arms A/B) + sonnet/analyst (arm C)",
    commands: ["/scrutinize", "/code-review", "/prism-review", "/octopus"],
    hooks: ["scrutinize-before-stop"],
    autoInvoke: ["/scrutinize"],
    antipattern: "single-reviewer clearance for a multi-file milestone (needs 3-of-3); trusting same-model-family agreement on a contested/high-stakes verdict without a cross-vendor consensus pass",
    loopCron: { loop: "no -- per-diff/milestone (3-of-3)", cron: "no" },
    execution: { harness: "scrutiny-3way.mjs (3-of-3 gate) + per-file 2-arm scrutiny", hermes: "the 3 reviewer Agents (opus A/B + analyst C) ARE the fan-out", ollama: "no -- the 3 Claude arms (opus A/B + analyst C) ARE the review reasoning (operator: reasoning always Opus, never a local reasoner)", consensus: "prism_ai:consensus_decide / /octopus -- cross-vendor (Claude+Codex+Ollama+Grok+Gemini) escalation ABOVE the 3 same-family arms when they could share a blind spot or the verdict is contested; agreement < threshold -> escalate (MultiModelConsensusEngine.ask)" },
  },
  fix: {
    trigger: "fix / debug / broken / failing / regression / error / not working",
    substrateLadder: ["master-graph-blast-radius", "ollama-triage", "claude"],
    modelTier: "newest Sonnet (claude-sonnet-4-6) at MAX effort for coding/debug (operator directive 2026-06: coding on Sonnet); escalate to Opus ONLY for the hardest root-cause or safety-coupled regression",
    commands: ["/diagnose-fix", "/impact", "regression-hunter"],
    hooks: ["stop_on_failing_tests"],
    autoInvoke: [],
    antipattern: "patching the symptom without tracing root cause + blast-radius",
    doneWhen: "LOOP until the failing test/regression is green AND the blast-radius is clean -- NO new gaps/bugs/errors/conflicts introduced (BUILD_COMPLETE_GATE). A fix that greens one test but opens another is NOT done.",
    loopCron: { loop: "yes -- iterate until the failing test/regression is green AND zero new gaps/bugs/errors/conflicts (BUILD_COMPLETE_GATE); eval-gate = test pass + blast-radius clean", cron: "no" },
    execution: { harness: "regression-hunter Agent + stop_on_failing_tests gate (iterate to green)", hermes: "regression-hunter as a sonnet Agent for blast-radius triage", ollama: "qwen2.5-coder:32b diff-summary (mechanical only); root-cause REASONING stays Opus (operator: reasoning always Opus, never a local reasoner)" },
  },
  orchestrate: {
    trigger: "fleet / parallel / multi-agent / swarm / all galaxies / fan out",
    substrateLadder: ["workflow-or-hermes-agents", "consensus", "atcs", "claude"],
    modelTier: "opus (synthesis) + sonnet/haiku (mechanical arms)",
    commands: ["Workflow", "/checkin", "/octopus"],
    hooks: ["fork-storm-circuit-breaker", "agent-fanout-pressure-gate", "subagent-model-enforce"],
    autoInvoke: [],
    antipattern: "back-to-back agent bursts (fanout storm) or opus for mechanical mining arms",
    loopCron: { loop: "yes -- Workflow/ATCS owns the loop; deterministic coordination, eval-gate per arm", cron: "yes -- recurring fleet sweeps (audit/health/reaper)" },
    execution: { harness: "Workflow (pipeline/parallel) or prism_atcs state machine; fleet-reaper/doctrine sweeps for recurring", hermes: "PRIMARY -- ask-hermes single-shot + hermes Agent fan-out are the arms; zulu fleet launcher", ollama: "mining/read/summarize arms route to ollama or sonnet -- NEVER opus for mechanical arms", consensus: "octopus fan-out -- auto-consensus-userprompt enqueues every prompt to consensus-queue.jsonl; stop-consensus-drain drains out-of-band (30-60s); prism_ai:consensus_decide for sync vote/compare; recall via prism_dev:consensus_cache_recall" },
  },
  session: {
    trigger: "checkin / handoff / startup / compact / resume / reorient",
    substrateLadder: ["atcs", "obsidian-handoff", "claude"],
    modelTier: "free/mechanical",
    commands: ["/checkin-<slot>", "/handoff", "/precompact", "/startup-<slot>"],
    hooks: ["scrutinize-before-stop", "enforce-handoff-topic", "stop-close-own-bg-tasks"],
    autoInvoke: ["/checkin-<slot>"],
    antipattern: "ending a session with a topicless handoff or lingering background tasks (R14)",
    loopCron: { loop: "no -- bookend op", cron: "yes -- scheduled fleet-health / handoff / compact cadence" },
    execution: { harness: "prism_atcs + per-agent-handoff + precompact-handoff (bookend)", hermes: "no", ollama: "qwen2.5-coder:1.5b to summarize the session diff into the handoff body (ask-ollama summarize)" },
  },
  domain: {
    trigger: "mill / lathe / wedm / cam / cad / a galaxy-specific machining task",
    substrateLadder: ["galaxy-claudemd", "tribal", "wiki", "prism_<domain>", "claude"],
    modelTier: "opus (domain reasoning)",
    commands: ["/mill-studio", "/lathe-studio", "/wedm", "/wire-edm-studio", "/cam-strategy"],
    hooks: ["galaxy-claudemd-inject", "tribal-by-domain-inject"],
    autoInvoke: [],
    antipattern: "ignoring the galaxy CLAUDE.md/soul or assuming units (inch vs mm)",
    doneWhen: "LOOP until the part/program passes safety + validate AND zero open gaps/bugs/errors/conflicts (BUILD_COMPLETE_GATE). A program that runs but fails a safety/units check is NOT done.",
    loopCron: { loop: "yes -- batch of parts/programs: one per iter; LOOP until safety+validate pass AND BUILD_COMPLETE_GATE holds; eval-gate = safety + validate", cron: "no -- attended domain work" },
    execution: { harness: "galaxy studio (mill/lathe/wire-edm-studio) + hurco-jmdie-roundtrip-harness.mjs / lathe-jmdie-param-accuracy-harness.mjs for validation", hermes: "physics-reviewer Agent per part (safety second-pass)", ollama: "qwen2.5-coder:32b for G-code/setup-sheet text; safety calc stays prism_calc/claude" },
  },
});

// Keyword signals per class (pure classifier). Longer/more-specific phrases are
// weighted higher so 'speed and feed' beats a bare 'build'.
const CLASS_SIGNALS = Object.freeze({
  physics: [["speed and feed"], ["feeds and speeds"], ["speed feed"], ["feed rate"], ["feedrate"], ["sfm"], ["g-code"], ["gcode"], ["cutting force"], ["toolpath"], ["kienzle"], ["taylor"], ["chip load"], ["surface finish"], ["spindle"], ["depth of cut"]],
  quote: [["quote"], ["cost"], ["estimate"], ["pricing"], ["price"], ["bid"], ["margin"], ["job cost"]],
  // learn = knowledge acquisition. Added research/understand/study signals (U-CLASSIFY-RESEARCH,
  // 2026-06-15): "research X" / "understand the|how" / "study" / "read up on" previously hit the
  // conf=0 'build' fallback -> no routing guidance for a large research/learn prompt class. These are
  // high-precision (very unlikely in a build prompt), so they don't steal legitimate build work.
  // learn = knowledge acquisition. research/understand/study signals are PHRASES not bare words
  // (U-CLASSIFY-RESEARCH, 2026-06-15): "research how|the|into" / "understand how|the" / "study the" /
  // "read up on" classify a research prompt as learn (was the conf=0 'build' fallback -> no guidance).
  // Phrase form (not bare "research") so a build prompt whose NAME contains the word ("build a
  // research tool") is NOT stolen -- scrutiny P2 hardening, verified no-steal.
  learn: [["pdf"], ["video"], ["ingest"], ["extract"], ["corpus"], ["learn from"], ["transcript"], ["train"], ["deep research"], ["research how"], ["research the"], ["research into"], ["understand how"], ["understand the"], ["study the"], ["read up on"]],
  review: [["scrutinize"], ["code review"], ["review the"], ["audit"], ["verify the diff"], ["3-of-3"]],
  // fix = debugging investigation. PHRASE signals (U-CLASSIFY-RESEARCH): a debugging probe
  // ("investigate why|the X", "root cause", "diagnose the|why") is a fix task, not a build. Phrase
  // form so "build investigate dashboard" / "create a diagnose command" stay build (no steal).
  fix: [["fix"], ["debug"], ["broken"], ["failing"], ["regression"], ["not working"], ["bug"], ["error"], ["investigate why"], ["investigate the"], ["root cause"], ["diagnose the"], ["diagnose why"]],
  orchestrate: [["fleet"], ["parallel agent"], ["multi-agent"], ["swarm"], ["all galaxies"], ["fan out"], ["fanout"], ["orchestrate"], ["workflow"]],
  session: [["checkin"], ["check in"], ["handoff"], ["startup"], ["compact"], ["resume"], ["reorient"]],
  recall: [["what did we"], ["prior"], ["remember"], ["last time"], ["recall"], ["why did we"], ["previously"]],
  locate: [["where is"], ["where's"], ["find the"], ["which file"], ["is there a"], ["does it exist"], ["locate"], ["search for"]],
  plan: [["plan"], ["design"], ["architect"], ["approach"], ["how should"], ["strategy"], ["crossroad"]],
  domain: [["mill"], ["lathe"], ["wedm"], ["wire edm"], ["cam"], ["cad"], ["turning"], ["machining"], ["fixture"]],
  build: [["build"], ["implement"], ["create"], ["add a"], ["wire"], ["new engine"], ["new hook"], ["new skill"], ["write a"]],
});

// Order matters only for tie-break: more-specialized classes win ties over the
// generic 'build'/'locate'. This list is the tie-break precedence (most specific
// first).
const TIE_BREAK = ["physics", "quote", "learn", "review", "fix", "orchestrate", "session", "recall", "domain", "plan", "locate", "build"];

// Map each workflow task class to a representative FORGE PHASE (the keys of
// FORGE_PHASE_CATEGORY in forge-route.mjs) so routeTask() yields a class-specific
// substrate plan. Without this, passing the bare task-class name as `phase` makes
// routeForgePhase default every class to "summary" -> identical generic plan
// (scrutiny arm-A P2). Every value below is a verified FORGE_PHASE_CATEGORY key.
export const TASK_CLASS_TO_FORGE_PHASE = Object.freeze({
  locate: "scout", build: "novel_codegen", plan: "design", recall: "scout",
  learn: "explain", quote: "classify", physics: "physics_check", review: "plan_review",
  fix: "triage", orchestrate: "orchestrate", session: "summarize", domain: "design",
});

/**
 * Pure: classify a prompt into one of the 12 task classes. Scores each class by
 * counting matched signal phrases (multi-word phrase = 2 pts, single word = 1).
 * Ties break by TIE_BREAK precedence. Empty/again-only prompt -> 'build' default
 * (the most common substantive intent) with score 0 + low confidence.
 */
// NOTE (R7): named classifyRoutingClass, NOT classifyTaskClass -- the latter
// already exists in local-llm-task-router.mjs on a DIFFERENT axis (model-capability
// battery, "which Ollama model"). This one is the WORKFLOW-ROUTING axis ("which
// substrate ladder + commands"). Distinct purpose, distinct name, no collision.
export function classifyRoutingClass(prompt) {
  const text = String(prompt || "").toLowerCase();
  if (!text.trim()) return { taskClass: "build", score: 0, confidence: 0, scores: {} };
  const scores = {};
  for (const [cls, signals] of Object.entries(CLASS_SIGNALS)) {
    let s = 0;
    for (const phraseWords of signals) {
      const phrase = phraseWords.join(" ");
      if (text.includes(phrase)) s += phrase.includes(" ") ? 2 : 1;
    }
    scores[cls] = s;
  }
  let best = "build", bestScore = -1;
  for (const cls of TIE_BREAK) {
    if (scores[cls] > bestScore) { bestScore = scores[cls]; best = cls; }
  }
  if (bestScore <= 0) return { taskClass: "build", score: 0, confidence: 0, scores };
  // confidence: matched score over a soft ceiling of 4 (two specific phrases).
  const confidence = Math.min(1, bestScore / 4);
  return { taskClass: best, score: bestScore, confidence, scores };
}

/**
 * Compose the existing routers into one decision. Lazy-imports cag-router /
 * model-routing-policy / task-substrate-router so this module loads even if one
 * is absent, and FAILS OPEN (each composed field degrades to null, never throws
 * out of routeTaskClass). Returns the unified RoutingDecision the operator/Claude
 * follows: the task-class policy + the live context-tier + model verdict +
 * substrate plan.
 */
export async function routeTaskClass(prompt, ctx = {}) {
  const { taskClass, confidence, scores } = classifyRoutingClass(prompt);
  const policy = TASK_CLASS_POLICY[taskClass];

  let contextTier = null, coldSources = null;
  try {
    const cag = await import("./cag-router.mjs");
    const c = cag.classifyQuery(String(prompt || ""));
    contextTier = c?.tier ?? null;
    coldSources = Array.isArray(c?.coldSources) ? c.coldSources : null;
  } catch { /* fail-open */ }

  let modelEngine = null, modelTier = null, modelReason = null;
  try {
    const mp = await import("./model-routing-policy.mjs");
    const r = mp.routePrompt({ prompt: String(prompt || "") });
    modelEngine = r?.engine ?? null;
    modelTier = r?.tier ?? r?.model ?? null;
    modelReason = r?.reason ?? null;
  } catch { /* fail-open */ }

  let substratePlan = null;
  try {
    const tsr = await import("./task-substrate-router.mjs");
    // Use the class's representative forge phase (not the bare class name) so the
    // substrate plan is class-specific, not the generic "summary" default.
    const phase = ctx.phase || TASK_CLASS_TO_FORGE_PHASE[taskClass] || taskClass;
    substratePlan = tsr.routeTask(taskClass, phase, ctx);
  } catch { /* fail-open */ }

  return {
    taskClass,
    confidence,
    scores,
    policy,                       // the followable per-class graph node
    live: {                       // composed live verdicts from the existing routers
      contextTier, coldSources,
      modelEngine, modelTier, modelReason,
      substratePlan,
    },
  };
}

/**
 * Pure: a compact, injectable digest of a routing decision -- the line(s) Claude
 * reads to follow the graph. Safe on a partial (fail-open) decision.
 */
export function buildRoutingDigest(decision) {
  if (!decision || !decision.policy) return "";
  const p = decision.policy;
  const live = decision.live || {};
  const lines = [];
  lines.push(`TASK-CLASS: ${decision.taskClass} (conf ${Math.round((decision.confidence || 0) * 100)}%)`);
  lines.push(`  ladder: ${p.substrateLadder.join(" -> ")}`);
  lines.push(`  model:  ${p.modelTier}${live.modelEngine ? ` [live: ${live.modelEngine}/${live.modelTier || "?"}]` : ""}`);
  if (p.autoInvoke.length) lines.push(`  auto:   ${p.autoInvoke.join(", ")}`);
  lines.push(`  cmds:   ${p.commands.join(" -> ")}`);
  if (p.execution) {
    // Mirror the hook's renderExecutionLine suppression (a "no"/"none" dim is
    // judgment-only/inapplicable -> omitted). Surfaces the execution machinery in
    // the CLI digest too (feature-route.mjs), not just the live inject (U-EXEC-POLICY).
    const realDim = (v) => { const s = String(v || "").trim(); return s.length > 0 && !/^(no|none)\b/i.test(s); };
    // consensus (octopus multi-LLM) is the 4th execution dim -- present only on the
    // classes that escalate to a cross-vendor pass (review/plan/orchestrate); absent
    // keys are skipped by realDim. Mirrors renderExecutionLine in prompt-route-inject.
    const ex = ["harness", "hermes", "ollama", "consensus"].filter((k) => realDim(p.execution[k])).map((k) => `${k}: ${p.execution[k]}`);
    if (ex.length) lines.push(`  exec:   ${ex.join(" | ")}`);
  }
  if (live.contextTier) lines.push(`  ctx:    ${live.contextTier}`);
  if (p.doneWhen) lines.push(`  DONE:   ${p.doneWhen}`);
  lines.push(`  AVOID:  ${p.antipattern}`);
  return lines.join("\n");
}

/** Pure: the list of all task-class names (for generators / coverage checks). */
export function taskClasses() {
  return Object.keys(TASK_CLASS_POLICY);
}

// ---- Structured model-routing resolver (U-MODEL-PLAN-RESOLVER, 2026-06-18) ----
// The operator's model-routing directive (2026-06-18), encoded as DATA not prose so
// it is machine-checkable + single-sourced for every consumer (the live router
// model-routing-policy.mjs, a future coder-ensemble runner, the inject digest):
//   * REASONING is ALWAYS Claude Opus -- NEVER a local reasoner (no deepseek-r1 etc.).
//   * CODING is newest Sonnet @ MAX effort PAIRED WITH a local CODER ENSEMBLE
//     (qwen2.5-coder:32b + qwen3-coder:30b run together, outputs combined -- "to cover
//     more ground in one pass"); deepseek-coder joins the ensemble once pulled locally.
// The prose modelTier/execution fields stay human-readable; this is their structured
// twin. assertModelRoleCoherence() (below) is the guard that keeps the two in sync --
// the same fail-loud pattern as assertCatalogCoherence for the substrate catalog.
//
// MODEL_IDS is the ONE place the concrete model ids live (nothing downstream hardcodes
// "claude-sonnet-4-6"). coderEnsemble = the LIVE-installed local coders (verified
// against :11434/api/tags 2026-06-18); coderEnsemblePending = operator-named but NOT
// yet pulled (pull locally, or use a free cloud coder).
export const MODEL_IDS = Object.freeze({
  opus: "claude-opus-4-8",     // reasoning / safety / synthesis -- the ONLY reasoning model
  sonnet: "claude-sonnet-4-6", // newest Sonnet -- the coding default (run @ MAX effort)
  haiku: "claude-haiku-4-5",   // cheap-Claude mechanical fallback rung
  coderEnsemble: Object.freeze(["qwen2.5-coder:32b", "qwen3-coder:30b"]), // live local coders (16-model roster), run together
  coderEnsemblePending: Object.freeze(["deepseek-coder"]),               // operator-named, NOT yet pulled (local pull, or a codegen-capable cloud rung)
  // CLOUD-OVERFLOW-MS0 (2026-06-17, fleet-wide on cad-fusion-live-ms0): the $0 OpenRouter
  // cloud rung. READ/long-context ONLY -- never codegen/authoring (CLOUD_VETO) or safety/G-code.
  cloudFree: Object.freeze({ provider: "openrouter", slug: "nvidia/nemotron-3-super-120b-a12b:free", ctx: 1000000, cost: "$0", scope: "READ/long-context ONLY -- never codegen/authoring (CLOUD_VETO) or safety/G-code egress" }),
  cloudFreeUpgrade: "nvidia/nemotron-3-ultra-550b-a55b:free", // strictly-stronger $0 upgrade (OPENROUTER_MODEL=nemotron-ultra-free)
});

// The canonical fleet FALLBACK LADDER as DATA (operator rule: Ollama-free -> cheap-cloud-
// free -> cheap-Claude -> Opus/higher). This is the SPEC TWIN of the LIVE implementers
// (cited below) -- it MIRRORS, never re-implements, their routing logic (R8). CLOUD-
// OVERFLOW-MS0 inserted the $0 OpenRouter Nemotron rung between local Ollama and paid
// Claude. The `rules` are load-bearing safety/quality invariants, NOT preferences.
export const FALLBACK_LADDER = Object.freeze({
  rungs: Object.freeze([
    Object.freeze({ rung: 1, tier: "ollama-local-free", cost: "$0", use: "proven-mechanical text (summarize/classify/lint/diff/extract); the default cheap rung -- 16-model live roster" }),
    Object.freeze({ rung: 2, tier: "openrouter-cloud-free", model: "nvidia/nemotron-3-super-120b-a12b:free", cost: "$0", ctx: 1000000, use: "LARGE (>=1000 chars) long-context READING / deep-research / free-overflow when the local Ollama window is too small; fires on explicit 'use nemotron' or an unambiguous long-context signal" }),
    Object.freeze({ rung: 3, tier: "cheap-claude", models: Object.freeze(["claude-sonnet-4-6", "claude-haiku-4-5"]), cost: "paid-cheap", use: "coding/authoring (Sonnet @ max -- cloud is vetoed for this) + small mechanical not worth a cloud round-trip" }),
    Object.freeze({ rung: 4, tier: "opus", model: "claude-opus-4-8", cost: "paid-frontier", use: "reasoning / synthesis / safety-critical -- the ONLY reasoning tier (never a local or cloud reasoner)" }),
  ]),
  rules: Object.freeze({
    cloudReadOnly: "the cloud rung is READ/long-context ONLY -- CLOUD_VETO keeps codegen + authoring on Claude (cloud never writes code or prose)",
    safetyNeverCloud: "safety-critical / G-code / NC-program work NEVER offloads to cloud (looksLikeNcProgram refuses egress); stays frontier Claude",
    reasoningAlwaysOpus: "reasoning is ALWAYS Claude Opus -- never a local reasoner and never a cloud reasoner for a load-bearing judgment",
    candidateGate: "a new cloud model (e.g. z-ai/glm-5.2) is promoted to a rung ONLY on assess-cloud-candidate.mjs battery evidence -- never default quality to an unproven model",
  }),
  liveImplementers: Object.freeze([
    "scripts/lib/model-routing-policy.mjs (routePrompt safety->explicit-cloud->Ollama->implicit-cloud-Nemotron->Claude / routeCloudLongContext)",
    "scripts/lib/openrouter-client.mjs (OPENROUTER_MODELS registry + guarded client, key-redacting, NC-refusing)",
    "ollama-task-offloader.mjs (Ollama-down rung: Ollama-free -> Nemotron-free -> cheap-Claude -> Opus)",
    "scripts/assess-cloud-candidate.mjs (candidate benchmark gate on the verifiable battery)",
  ]),
});

// Each task class's MODEL ROLE -- the structured companion to the prose modelTier.
//   reasoning  -> Opus only (judgment/safety/synthesis); local models do mechanical text only
//   coding     -> Sonnet @ max + coder ensemble (escalate to Opus ONLY for deep arch / safety-coupled)
//   mechanical -> ollama-first, sonnet fallback; NEVER opus
//   mixed      -> Sonnet for the bulk + an Opus judgment sub-step (e.g. quote margin)
export const MODEL_ROLE_BY_CLASS = Object.freeze({
  locate: "mechanical", recall: "mechanical", session: "mechanical", learn: "mechanical",
  build: "coding", fix: "coding",
  plan: "reasoning", review: "reasoning", physics: "reasoning", orchestrate: "reasoning", domain: "reasoning",
  quote: "mixed",
});

/**
 * Pure: resolve the structured model plan for a task class -- the operator's directive
 * as a consumable object. Returns null for an unknown class. `neverLocalReasoner` is
 * ALWAYS true (the hard invariant). `coding.localEnsembleWired` is the HONEST flag
 * (R12): TRUE as of U-OCTOPUS-CODER-ENSEMBLE (2026-06-18) -- MultiModelConsensusEngine's
 * `coderEnsemble:true` now seats the two dedicated coders (CODER_ENSEMBLE_MODELS:
 * qwen2.5-coder:32b + qwen3-coder:30b) via the diverse-panel path, instead of the
 * size-ranked gpt-oss:120b + ONE coder. It is OPT-IN per coding consensus (the caller
 * passes the flag). null where a local ensemble is inapplicable.
 */
export function resolveModelPlan(taskClass) {
  const role = MODEL_ROLE_BY_CLASS[taskClass];
  if (!role) return null;
  const base = { taskClass, role, neverLocalReasoner: true };
  switch (role) {
    case "reasoning":
      return {
        ...base,
        reasoning: { provider: "anthropic", model: MODEL_IDS.opus },
        coding: null,
        note: "reasoning/synthesis/safety stays Opus; local models do mechanical text only, never the reasoning",
      };
    case "coding":
      return {
        ...base,
        reasoning: { provider: "anthropic", model: MODEL_IDS.opus, when: "escalate ONLY for deep architecture / safety-coupled root-cause" },
        coding: {
          claudeModel: MODEL_IDS.sonnet,
          effort: "max",
          coderEnsemble: [...MODEL_IDS.coderEnsemble],
          coderEnsemblePending: [...MODEL_IDS.coderEnsemblePending],
          localEnsembleWired: true,
          localEnsembleVia: "MultiModelConsensusEngine coderEnsemble:true -> CODER_ENSEMBLE_MODELS (U-OCTOPUS-CODER-ENSEMBLE)",
        },
        note: "Sonnet @ max + local coder ensemble (run together, combine outputs). localEnsembleWired:true (U-OCTOPUS-CODER-ENSEMBLE, 2026-06-18) -- MultiModelConsensusEngine coderEnsemble:true seats the TWO distinct coders (qwen2.5-coder:32b + qwen3-coder:30b) via the diverse-panel path, NOT gpt-oss:120b + one coder; opt-in per coding consensus. deepseek-coder joins when pulled (its exact tag). The $0 cloud rung (Nemotron) stays READ-only (CLOUD_VETO keeps codegen on Claude), so a cloud coder would need a codegen-capable rung, not the current one. The live router (model-routing-policy) now routes coding/build -> Sonnet (U-LIVE-ROUTER-CODING-SONNET), so modelPolicyDrift reads clean.",
      };
    case "mechanical":
      return {
        ...base,
        reasoning: null,
        coding: { claudeModel: MODEL_IDS.sonnet, effort: "default", coderEnsemble: [], localEnsembleWired: null },
        note: "ollama-first; Sonnet fallback; NEVER opus for mechanical work (operator fallback ladder: ollama -> sonnet -> opus)",
      };
    case "mixed":
      return {
        ...base,
        reasoning: { provider: "anthropic", model: MODEL_IDS.opus, when: "the judgment sub-step (e.g. quote margin)" },
        coding: { claudeModel: MODEL_IDS.sonnet, effort: "default", coderEnsemble: [], localEnsembleWired: null },
        note: "Sonnet for structuring/parse; Opus for the judgment sub-step",
      };
    default:
      return null; // unreachable -- MODEL_ROLE_BY_CLASS only holds the 4 known roles
  }
}

/**
 * Pure, fail-loud: assert MODEL_ROLE_BY_CLASS covers EXACTLY the 12 task classes and
 * that each class's structured role agrees with its prose modelTier (no silent drift
 * between the human-readable policy and its machine-readable twin). THROWS a named
 * error listing missing/extra classes + per-class prose<->role mismatches. Mirrors
 * assertCatalogCoherence. A "reasoning" class must name opus in its prose; a "coding"
 * class must name Sonnet AND carry the coder ensemble in execution.ollama; a
 * "mechanical" class must route to ollama/sonnet/free and must NOT lead with opus.
 */
export function assertModelRoleCoherence(roleMap = MODEL_ROLE_BY_CLASS, policy = TASK_CLASS_POLICY, ids = MODEL_IDS) {
  // Injectable (roleMap/policy/ids) -- mirrors assertCatalogCoherence's DI shape so the
  // THROW path is exercisable from a test, not just the no-arg happy path (R9: a guard
  // whose negative path is untested is not load-bearing). Defaults = the live tables.
  const classes = Object.keys(policy);
  const roleKeys = Object.keys(roleMap);
  const missing = classes.filter((c) => !roleKeys.includes(c));
  const extra = roleKeys.filter((c) => !classes.includes(c));
  const mismatches = [];
  for (const cls of classes) {
    const role = roleMap[cls];
    if (!role) continue; // counted in `missing`
    const prose = String(policy[cls]?.modelTier || "").toLowerCase();
    const ollamaDim = String(policy[cls]?.execution?.ollama || "").toLowerCase();
    if (role === "reasoning" && !/opus/.test(prose)) {
      mismatches.push(`${cls}: role=reasoning but modelTier prose names no opus ("${prose}")`);
    }
    if (role === "coding") {
      if (!/sonnet/.test(prose)) mismatches.push(`${cls}: role=coding but modelTier prose names no Sonnet ("${prose}")`);
      const hasEnsemble = ids.coderEnsemble.some((m) => ollamaDim.includes(m));
      if (!hasEnsemble) mismatches.push(`${cls}: role=coding but execution.ollama carries no coder-ensemble model ("${ollamaDim}")`);
    }
    if (role === "mechanical") {
      if (/^opus\b/.test(prose.trim())) mismatches.push(`${cls}: role=mechanical but modelTier leads with opus ("${prose}")`);
      if (!/(ollama|sonnet|free|mechanical)/.test(prose)) mismatches.push(`${cls}: role=mechanical but modelTier names no ollama/sonnet/free tier ("${prose}")`);
    }
  }
  if (missing.length || extra.length || mismatches.length) {
    throw new Error(
      `MODEL_ROLE_BY_CLASS drift -- missing:[${missing.join(",")}] extra:[${extra.join(",")}] mismatches:[${mismatches.join(" | ")}]`,
    );
  }
  return true;
}

/**
 * Pure: detect drift between the DECLARED model policy (resolveModelPlan) for a routed
 * decision and what the LIVE router (decision.live.modelTier from model-routing-policy)
 * actually returns. Operationalizes the surfaced R7 conflict (the live router routes
 * BUILD/FIX -> Opus by design, contradicting the operator's coding->Sonnet directive)
 * into a detectable signal -- evidence for the gated decision to align the live router,
 * WITHOUT modifying india's router here. Returns null when there is no decision, no
 * declared coding plan, or no live tier to compare; otherwise { taskClass, declared,
 * live, drift:boolean, note }. drift=true when a coding class's declared Sonnet does
 * not match a live tier that names opus (and not sonnet).
 */
export function modelPolicyDrift(decision) {
  if (!decision || !decision.taskClass) return null;
  const plan = resolveModelPlan(decision.taskClass);
  if (!plan || !plan.coding || plan.role !== "coding") return null;
  const liveTier = String(decision.live?.modelTier || "").toLowerCase();
  if (!liveTier) return null;
  const declared = plan.coding.claudeModel; // claude-sonnet-4-6
  const liveNamesOpus = /opus/.test(liveTier);
  const liveNamesSonnet = /sonnet/.test(liveTier);
  const drift = liveNamesOpus && !liveNamesSonnet;
  return {
    taskClass: decision.taskClass,
    declared,
    live: liveTier,
    drift,
    note: drift
      ? `live router routes ${decision.taskClass} -> opus; declared policy is Sonnet (${declared}). R7: align the live router or scope-down explicitly.`
      : `live router tier agrees with (or does not contradict) the declared Sonnet coding policy`,
  };
}

// ---- Context-engineering lens (U-CONTEXT-STRATEGY-LENS, 2026-06-18) ----------
// Applies the canonical LangChain Write/Select/Compress/Isolate context-management
// framework (sairahul1 "Context Engineering for AI Agents: The Complete Playbook";
// reinforced by 0xCodez "harness engineering" 3-floors + zeuuss_01 "compounding OS")
// onto PRISM's substrate catalog -- so the graph teaches HOW to keep the context
// window healthy, not just WHICH substrate to reach for.
//
// WHY this is a first-class routing concern (not an afterthought): the Chroma
// 18-frontier-model "context rot" study found output quality degrades CONTINUOUSLY
// as input length grows -- well before the hard limit (Claude Code degrades at
// ~40-60% of capacity), and "lost in the middle" drops mid-context recall ~30pt.
// Every substrate's PRIMARY role is one of the 4 strategies; substrates that serve
// more than one are listed under their DOMINANT strategy (each appears exactly once,
// and the full set must equal the SUBSTRATES catalog -- the generator asserts this).
export const CONTEXT_STRATEGIES = Object.freeze({
  write:    { what: "persist info OUTSIDE the window so a /compact never loses it",      substrates: ["obsidian-vault", "memories", "second-brain", "psn", "harnessed-loops"], prismNote: "Obsidian auto-feed + per-slot MEMORY + handoffs + PSN feed-up + ATCS durable state" },
  select:   { what: "load only the RIGHT context in, at the right time (retrieve/route)", substrates: ["master-graph", "cag", "rag", "wikis", "tribal-knowledge", "prism-ai"],     prismNote: "CAG cold/hot routing + master-index + RAG + wiki/tribal injection + AISystemRouter" },
  compress: { what: "reduce tokens BEFORE they hit Claude's window (summarize/offload)",  substrates: ["ollama-offload", "model-switching"],                                          prismNote: "ask-ollama summarize/explain/triage + node-card + digests + Haiku-tier routing" },
  isolate:  { what: "push work into a SEPARATE context/run and return only the result",   substrates: ["hermes-agents", "hermes", "consensus", "loops", "crons", "prism-learning-systems", "lora"], prismNote: "Workflow/Agent fan-out + octopus consensus + worktrees + offline LoRA/learning" },
});

/** Pure: resolve a substrate name to its context strategy (write/select/compress/isolate), or null. */
export function contextStrategyForSubstrate(name) {
  for (const [strategy, def] of Object.entries(CONTEXT_STRATEGIES)) {
    if (def.substrates.includes(name)) return strategy;
  }
  return null;
}

// ---- The load-bearing SPINE (U-GRAPH-SPINE, operator 2026-06-18) -------------
// Operator: "Hermes agents + Obsidian vault should be the driving force behind the OS
// and brain." This makes that architecture EXPLICIT + machine-readable, so the graph
// teaches WHAT the driving force is -- not just lists 20 peer substrates. Per the
// 0xCodez 3-floor harness model: the .claude/ harness is the OS SUBSTRATE; the AGENT
// FLEET is the active force that DRIVES work through it; the Obsidian vault is the
// persistent, COMPOUNDING brain (A3/A6: memory is what makes an agent compound). Every
// SPINE substrate is a member of the SUBSTRATES catalog (the test cross-checks this).
export const SPINE = Object.freeze({
  os: {
    role: "the active force that DRIVES work across the harness/OS",
    substrates: ["hermes-agents", "hermes"],
    note: "26-slot NATO fleet + zulu orchestrator + Workflow/Agent fan-out -- the .claude/ harness is the OS substrate; the agent fleet is what runs ON it and does the work (Isolate strategy)",
  },
  brain: {
    role: "the persistent, COMPOUNDING knowledge -- what survives every /compact",
    substrates: ["obsidian-vault", "memories", "second-brain", "psn"],
    note: "Obsidian vault + per-slot MEMORY + Stop-hook auto-feed + PSN feed-up -- the Write strategy; the brain an agent reasons FROM (sierra graded it best-in-class)",
  },
});

/** Pure: the flat list of spine substrate names (os + brain). */
export function spineSubstrates() {
  return [...SPINE.os.substrates, ...SPINE.brain.substrates];
}

/**
 * Pure (DI): assert the context-strategy lens buckets EXACTLY the substrate catalog --
 * every catalog name in one strategy, no extras, no omissions, no intra-lens duplicate.
 * Returns true on a clean match; THROWS a NAMED drift error (R12 fail-loud) otherwise so
 * a catalog<->lens divergence can never ship silently. `lensSubstrates` is the flattened
 * CONTEXT_STRATEGIES substrate list; `catalogNames` is the SUBSTRATES catalog names.
 * Both injected so the generator can pass the live arrays and tests can pass any case.
 * NAMES the duplicate set explicitly -- the earlier inline guard left `dup:[]` empty for a
 * valid-name intra-lens duplicate (U-CONTEXT-STRATEGY-LENS 3-of-3 arm-C P3).
 */
export function assertCatalogCoherence(lensSubstrates, catalogNames) {
  const lensArr = Array.isArray(lensSubstrates) ? lensSubstrates : [];
  const catArr = Array.isArray(catalogNames) ? catalogNames : [];
  if (JSON.stringify([...lensArr].sort()) === JSON.stringify([...catArr].sort())) return true;
  const uniq = (a) => [...new Set(a)];
  const missing = uniq(catArr.filter((n) => !lensArr.includes(n)));
  const extra = uniq(lensArr.filter((n) => !catArr.includes(n)));
  const dup = uniq(lensArr.filter((n, i) => lensArr.indexOf(n) !== i));
  throw new Error(`CONTEXT_STRATEGIES drift vs SUBSTRATES catalog -- missing:[${missing}] extra:[${extra}] dup:[${dup}]`);
}

/**
 * Pure, fail-loud (DI): assert the SUBSTRATE<->CLASS routing is coherent -- the THIRD
 * coherence leg, after assertCatalogCoherence (lens<->catalog) and assertModelRoleCoherence
 * (role<->prose). It binds the substrate catalog's substrate->class edges
 * (SUBSTRATES[].taskClasses, hand-authored in generate-feature-routing-graph.mjs) to the
 * canonical task-class set so the two halves of the graph cannot silently desync -- the
 * operator's "everything synced and synergized" made enforceable. Three invariants:
 *   1. referential integrity -- every taskClasses entry names a REAL class (no dangling ref);
 *   2. no orphaned substrate -- every substrate routes to >=1 class (taskClasses non-empty),
 *      else it is catalogued but unreachable from any task;
 *   3. no starved class  -- every task class is reached by >=1 substrate, else a kind of work
 *      (e.g. `physics`) has a policy ladder but NO substrate back-references it -> the graph's
 *      class->substrate and substrate->class halves have drifted apart.
 * THROWS a NAMED drift error (R12 fail-loud) listing dangling/orphan/starved so a desync can
 * never ship silently; returns true on a clean mapping. `substrates` = catalog rows (each
 * {name, taskClasses}); `classNames` = the canonical task-class list (taskClasses()). Both
 * injected (mirrors assertCatalogCoherence's DI) so the generator passes the live arrays and a
 * test can exercise every throw branch -- a guard whose negative path is untested is not
 * load-bearing (R9).
 */
export function assertSubstrateClassCoherence(substrates, classNames) {
  const subs = Array.isArray(substrates) ? substrates : [];
  const classes = Array.isArray(classNames) ? classNames : [];
  const classSet = new Set(classes);
  const uniq = (a) => [...new Set(a)];

  const dangling = []; // "substrate->class" refs to a class that does not exist
  const orphan = [];   // substrate names with empty/absent taskClasses
  const reached = new Set();
  for (const s of subs) {
    const name = s && s.name ? String(s.name) : "(unnamed)";
    const tcs = s && Array.isArray(s.taskClasses) ? s.taskClasses : [];
    if (tcs.length === 0) orphan.push(name);
    for (const tc of tcs) {
      if (!classSet.has(tc)) dangling.push(`${name}->${tc}`);
      else reached.add(tc);
    }
  }
  const starved = classes.filter((c) => !reached.has(c));

  if (dangling.length || orphan.length || starved.length) {
    throw new Error(
      `SUBSTRATES<->task-class drift -- dangling:[${uniq(dangling).join(",")}] ` +
      `orphanSubstrate:[${uniq(orphan).join(",")}] starvedClass:[${uniq(starved).join(",")}]`,
    );
  }
  return true;
}

// ---- Operator substrate-enforcement coverage (U-OPERATOR-SUBSTRATE-COVERAGE) ----
// The operator's /goal enumerated the substrate set the graph must "enforce usage of":
// skills, scripts, hooks, harnesses, loops, crons, hermes, ollama, obsidian, prism-ai,
// memories, wiki, tribal. They are NOT all SUBSTRATES catalog rows -- several are enforced
// through per-class POLICY axes instead (commands/autoInvoke = the SKILLS axis; hooks = the
// HOOKS axis; loopCron = the LOOPS/CRONS axis; execution.harness = the SCRIPTS/HARNESSES axis;
// execution.hermes/ollama = the HERMES/OLLAMA axes). Before this guard, "the graph enforces
// usage of EVERYTHING" was an assertion, not a check -- a future edit could silently drop a
// whole category from every axis and nothing would notice. This is the FOURTH coherence leg
// (after lens<->catalog, role<->prose, substrate<->class): it binds the OPERATOR's external
// requirement to the live graph. `axis` is documentation; `id` is the canonical key. The
// detectors live IN the assert (not duplicated) so a test exercises the REAL predicate (R9).
export const OPERATOR_SUBSTRATE_CATEGORIES = Object.freeze([
  Object.freeze({ id: "skills",    axis: "policy.commands + policy.autoInvoke (the slash-command axis)" }),
  Object.freeze({ id: "scripts",   axis: "execution.harness (named .mjs runners/sweeps/pipelines/extractors)" }),
  Object.freeze({ id: "hooks",     axis: "policy.hooks (the auto-inject / gate axis)" }),
  Object.freeze({ id: "harnesses", axis: "execution.harness + SUBSTRATES:harnessed-loops" }),
  Object.freeze({ id: "loops",     axis: "loopCron.loop + SUBSTRATES:loops" }),
  Object.freeze({ id: "crons",     axis: "loopCron.cron + SUBSTRATES:crons" }),
  Object.freeze({ id: "hermes",    axis: "execution.hermes + SUBSTRATES:hermes/hermes-agents + SPINE.os" }),
  Object.freeze({ id: "ollama",    axis: "execution.ollama + SUBSTRATES:ollama-offload" }),
  Object.freeze({ id: "obsidian",  axis: "SUBSTRATES:obsidian-vault + SPINE.brain + ladder:obsidian" }),
  Object.freeze({ id: "prism-ai",  axis: "SUBSTRATES:prism-ai + ladder:prism_*" }),
  Object.freeze({ id: "memories",  axis: "SUBSTRATES:memories + SPINE.brain" }),
  Object.freeze({ id: "wiki",      axis: "SUBSTRATES:wikis + ladder:wiki" }),
  Object.freeze({ id: "tribal",    axis: "SUBSTRATES:tribal-knowledge + ladder:tribal" }),
]);

/**
 * Pure, fail-loud (DI): assert EVERY operator-enumerated substrate category is enforced through
 * at least one LIVE graph axis -- the machine-checkable form of the operator directive "enforces
 * usage of [the 13 substrates]... synced and synergized". For each category a detector probes the
 * real graph signals (per-class commands/autoInvoke/hooks/loopCron/execution + the SUBSTRATES
 * catalog names + the SPINE + the substrate ladders); a category covered by NONE is a coverage
 * gap. THROWS a named drift error listing uncovered categories (and any category with no detector
 * -- guards against the table and the detectors silently diverging). Returns true on full coverage.
 * `substrateNames` MUST be passed (the SUBSTRATES catalog lives in the generator, not this lib);
 * `policy`/`spine`/`categories` default to the live tables. Injectable so a test can drive any
 * case (mirrors assertCatalogCoherence / assertSubstrateClassCoherence DI shape).
 */
export function assertOperatorSubstrateCoverage({ policy = TASK_CLASS_POLICY, substrateNames = [], spine = SPINE, categories = OPERATOR_SUBSTRATE_CATEGORIES } = {}) {
  const subs = new Set(Array.isArray(substrateNames) ? substrateNames : []);
  const spineSubs = new Set([...((spine && spine.os && spine.os.substrates) || []), ...((spine && spine.brain && spine.brain.substrates) || [])]);
  const classes = Object.values(policy || {});
  const real = (v) => { const s = String(v || "").trim(); return s.length > 0 && !/^(no|none)\b/i.test(s); };
  const anyClass = (fn) => classes.some(fn);
  const ladderHas = (token) => anyClass((c) => Array.isArray(c.substrateLadder) && c.substrateLadder.some((r) => String(r).includes(token)));

  // Detector per category -- each returns true iff the category is enforced by >=1 live axis.
  const detect = {
    skills:     () => anyClass((c) => (c.commands || []).length > 0 || (c.autoInvoke || []).length > 0),
    scripts:    () => anyClass((c) => /\.mjs|sweep|pipeline|harness|extractor|roundtrip/i.test(String(c.execution && c.execution.harness))),
    hooks:      () => anyClass((c) => (c.hooks || []).length > 0),
    harnesses:  () => subs.has("harnessed-loops") || anyClass((c) => real(c.execution && c.execution.harness)),
    loops:      () => subs.has("loops") || subs.has("harnessed-loops") || anyClass((c) => /^yes/i.test(String(c.loopCron && c.loopCron.loop))),
    crons:      () => subs.has("crons") || anyClass((c) => /^yes/i.test(String(c.loopCron && c.loopCron.cron))),
    hermes:     () => subs.has("hermes") || subs.has("hermes-agents") || spineSubs.has("hermes") || spineSubs.has("hermes-agents") || anyClass((c) => real(c.execution && c.execution.hermes)),
    ollama:     () => subs.has("ollama-offload") || anyClass((c) => real(c.execution && c.execution.ollama)),
    obsidian:   () => subs.has("obsidian-vault") || spineSubs.has("obsidian-vault") || ladderHas("obsidian"),
    // "prism ai systems" is the operator's BROAD category: ANY prism_* MCP dispatcher in a ladder
    // (prism_calc / prism_safety / prism_business / prism_<domain>) is genuine PRISM-AI coverage, not
    // only the AISystemRouter "prism-ai" catalog row. Anchored /^prism[_-]/ (NOT a loose "prism_"
    // substring) so only a real prism_*-prefixed rung counts -- a pathological mid-string "prism_"
    // can no longer false-pass this category (scrutiny arm-C P2 precision fix, 2026-06-18).
    "prism-ai": () => subs.has("prism-ai") || anyClass((c) => Array.isArray(c.substrateLadder) && c.substrateLadder.some((r) => /^prism[_-]/i.test(String(r)))),
    memories:   () => subs.has("memories") || spineSubs.has("memories"),
    wiki:       () => subs.has("wikis") || ladderHas("wiki"),
    tribal:     () => subs.has("tribal-knowledge") || ladderHas("tribal"),
  };

  const uncovered = [];
  const noDetector = [];
  for (const cat of categories) {
    // Object.hasOwn so a category id named after a built-in (constructor/toString) reports as
    // noDetector, not as an inherited Object.prototype function run as a detector (arm-B P2 sibling).
    const d = Object.hasOwn(detect, cat.id) ? detect[cat.id] : null;
    if (typeof d !== "function") { noDetector.push(cat.id); continue; }
    if (!d()) uncovered.push(cat.id);
  }
  if (uncovered.length || noDetector.length) {
    throw new Error(
      `operator-substrate-coverage drift -- uncovered:[${uncovered.join(",")}] noDetector:[${noDetector.join(",")}]`,
    );
  }
  return true;
}

// ---- Ladder<->catalog navigation bridge (U-LADDER-CATALOG-RECONCILE) ---------
// The per-class `substrateLadder` uses SHORT tokens (master-graph/wiki/claude/prism_calc) while
// the SUBSTRATES catalog (in generate-feature-routing-graph.mjs) uses CANONICAL names
// (wikis/prism-ai/...). Two vocabularies -> a reader following a ladder cannot navigate to the
// catalog node's howToInvoke/whenToUse. This bridge maps every ladder token to its catalog node so
// the ladder + catalog are navigable as ONE graph (the operator's "synced and synergized"). Tokens
// that are NOT catalog substrates -- the model rung 'claude', the raw 'grep' tool, the
// 'dedup-check'/'scrutiny-3of3' gates, the cross-class 'physics' calc ref, 'galaxy-claudemd'
// doctrine-load -- are NOT forced into the catalog; they live in NON_CATALOG_LADDER_PRIMITIVES with
// their KIND so a reader knows they are deliberately catalog-less, not an omission.
export const LADDER_TOKEN_TO_SUBSTRATE = Object.freeze({
  "master-graph": "master-graph",
  "master-graph-blast-radius": "master-graph",
  "obsidian": "obsidian-vault",
  "obsidian-handoff": "obsidian-vault",
  "wiki": "wikis",
  "tribal": "tribal-knowledge",
  "cag-cold": "cag",
  "ollama": "ollama-offload",
  "ollama-triage": "ollama-offload",
  "consensus": "consensus",
  "lora": "lora",
  "prism_calc": "prism-ai",
  "prism_safety": "prism-ai",
  "prism_business": "prism-ai",
  "prism_<domain>": "prism-ai",
  "workflow-or-hermes-agents": "hermes-agents",
  "claude-reviewers": "hermes-agents",
  "atcs": "harnessed-loops",
  // loosest edge (scrutiny arm-A P2): resolves to the learning-FAMILY node (prism-learning-systems
  // owns the learn class); its howToInvoke is the ledger/training side, not the PDF/video extractor
  // -- no dedicated ingestion substrate exists. Navigation lands on a real node, approximately.
  "pdf-video-pipeline": "prism-learning-systems",
});
export const NON_CATALOG_LADDER_PRIMITIVES = Object.freeze({
  "claude": "model-rung -- the most-expensive tier (see the model-switching substrate / FALLBACK_LADDER); not a substrate node",
  "grep": "raw-tool -- the last-resort search primitive; the route-before-grep antipattern fallback",
  "dedup-check": "gate -- the DuplicationGuard pre-build check; a gate, not a substrate",
  "scrutiny-3of3": "gate -- the 3-of-3 review-gate harness",
  "physics": "cross-class-ref -- the physics task-class calc (prism_calc/prism_safety) used as a rung in the quote ladder",
  "galaxy-claudemd": "doctrine -- per-galaxy CLAUDE.md context-load; not a substrate node",
});

/**
 * Pure: resolve a substrateLadder token to its SUBSTRATES catalog name, or null if the token is a
 * non-catalog primitive / unknown. The navigation half of the bridge -- a consumer (inject/digest)
 * can take a ladder rung and look up the catalog node's howToInvoke. Use `ladderTokenKind` to tell
 * "non-catalog primitive" apart from "unknown token".
 */
export function resolveLadderToken(token, tokenMap = LADDER_TOKEN_TO_SUBSTRATE) {
  // Object.hasOwn guard: a token named after a built-in (constructor/toString/__proto__) must NOT
  // resolve to an inherited Object.prototype member (scrutiny arm-B P2 -- prototype-pollution).
  return Object.hasOwn(tokenMap, token) ? tokenMap[token] : null;
}

/** Pure: classify a ladder token -> "catalog" | "primitive" | "unknown". */
export function ladderTokenKind(token, tokenMap = LADDER_TOKEN_TO_SUBSTRATE, primitives = NON_CATALOG_LADDER_PRIMITIVES) {
  // Object.hasOwn (not bracket-truthy / `in`) so a built-in-named token is "unknown", not "catalog"
  // via an inherited prototype member (scrutiny arm-B P2 -- prototype-pollution).
  if (Object.hasOwn(tokenMap, token)) return "catalog";
  if (Object.hasOwn(primitives, token)) return "primitive";
  return "unknown";
}

/**
 * Pure, fail-loud (DI): the FIFTH coherence leg -- assert EVERY distinct substrateLadder token across
 * the policy resolves to either (a) a REAL catalog substrate name (via the bridge map) or (b) a known
 * non-catalog primitive. THROWS naming: `unmapped` (token neither mapped nor a known primitive -- a
 * typo or a new rung nobody bridged) and `danglingMap` (token mapped to a catalog name that does not
 * exist -- a renamed/removed catalog node). This keeps the ladder vocabulary and the catalog
 * vocabulary navigable-as-one-graph and unable to silently drift. `catalogNames` = the SUBSTRATES
 * catalog names (passed by the generator); policy/tokenMap/primitives default to the live tables.
 */
export function assertLadderTokenCoverage(policy = TASK_CLASS_POLICY, catalogNames = [], tokenMap = LADDER_TOKEN_TO_SUBSTRATE, primitives = NON_CATALOG_LADDER_PRIMITIVES) {
  const cat = new Set(Array.isArray(catalogNames) ? catalogNames : []);
  const uniq = (a) => [...new Set(a)];
  const tokens = new Set();
  for (const c of Object.values(policy || {})) for (const t of (Array.isArray(c.substrateLadder) ? c.substrateLadder : [])) tokens.add(t);

  const unmapped = [];     // not in the bridge map AND not a known primitive
  const danglingMap = [];  // mapped, but to a catalog name that does not exist
  for (const t of tokens) {
    // Object.hasOwn (not bracket-truthy / `in`) so a built-in-named rung is reported as `unmapped`,
    // not misrouted to danglingMap via an inherited prototype member (scrutiny arm-B P2).
    if (Object.hasOwn(tokenMap, t)) { const mapped = tokenMap[t]; if (!cat.has(mapped)) danglingMap.push(`${t}->${mapped}`); }
    else if (!Object.hasOwn(primitives, t)) unmapped.push(t);
  }
  if (unmapped.length || danglingMap.length) {
    throw new Error(
      `ladder-token<->catalog drift -- unmapped:[${uniq(unmapped).join(",")}] danglingMap:[${uniq(danglingMap).join(",")}]`,
    );
  }
  return true;
}
