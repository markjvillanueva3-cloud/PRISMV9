// scripts/lib/loop-goal-stack-advisor.mjs
//
// SELF-DRIVE-MS0 / U-STACK-ADVISOR (slot:alpha 2026-06-14) -- the per-iteration
// "deploy the WHOLE PRISM stack, optimally + variably + efficiently" advisor that
// the /loop and /goal script hooks inject. Operator directive 2026-06-14: make
// /goal + /loop develop utilizing all PRISM substrates (AI/learning/reasoning, PSN,
// system-viz, Obsidian, Hermes, engines/pipelines/algorithms/formulas/DBs, mcp tools,
// per-galaxy CLAUDE.md/souls, memories/wikis/tribal, model routing, token-savings,
// session lifecycle, JM Die/resources/docs) in unison, strategically.
//
// WHY a new advisor (the gap it closes): the existing loop/goal hooks inject loop
// DISCIPLINE (closed/eval-gated/bounded) but NOT strategic STACK DEPLOYMENT (which
// substrates to engage THIS iteration, how, with which model). The peer-shipped
// synergy-definition-inject.mjs holds the canonical CATALOG but fires only on the
// literal word "synergy" -- never during a /loop or /goal run, which is where
// development actually happens. Prior audit (feedback_checkin_loop_goal_utilization_
// audit_2026_05_16) found 9/14 surfaces NAMED-not-INVOKED. This advisor invokes them.
//
// DESIGN (compose, do not duplicate -- R8):
//   - routeTask() (task-substrate-router.mjs) supplies the substrate plan AND the
//     model lane (it composes routeForgePhase). We map a coarse dev-intent -> a real
//     forge phase so the lane is correct (reasoning -> Claude, mechanical -> Ollama).
//   - classifyTaskClass() (local-llm-task-router.mjs) labels the task class.
//   - The full 40-substrate catalog is NOT copied here -- we point at
//     [[feedback_synergy_definition]] (the peer's canonical source) + the 11-leg PSN.
//   - VARIABLE: spotlightForIter(iter) rotates ONE deeper "use this underused
//     substrate now" nudge across iterations so coverage compounds instead of
//     tunnel-visioning the same 3 tools (the operator's "variably" requirement).
//   - EFFICIENT: intent-filtered subset (not all families every iter); the caller
//     wraps this in injection-dedup (emit-once-per-TTL) + safeTruncate.
//
// Pure + exported; no I/O, never throws (returns null on any fault so a hook fault
// can never block /loop or /goal). Knob (enforced by the caller): PRISM_STACK_ADVISOR_DISABLE=1.

import { routeTask } from "./task-substrate-router.mjs";
import { classifyTaskClass } from "./local-llm-task-router.mjs";
import { safeTruncate } from "./safe-truncate.mjs";
// FEATURE-ROUTING-GRAPH-MS0: the WORKFLOW-routing class + its auto-invoke command
// set (distinct axis from local-llm-task-router's model-capability classifyTaskClass
// above -- hence the alias). Used to surface "fire these without typing" per iter.
import { classifyRoutingClass, TASK_CLASS_POLICY } from "./feature-routing-graph.mjs";

// Coarse dev-intent -> the forge phase routeTask should route (real FORGE_PHASE_CATEGORY
// keys; reasoning phases -> Claude lane, mechanical phases -> Ollama lane). Scored by
// keyword-hit count (highest wins) so "build X and test it" stays BUILD, not VERIFY.
// Global flag so String.match counts all hits; no .test (avoids lastIndex statefulness).
// `reasoning` = is this intent's CORE work judgment/novel-build (Claude-led, with
// mechanical sub-steps offloaded) vs primarily mechanical (offload the whole thing to
// Ollama; cheap-Claude only if Ollama is down -- never Opus)? Derived from the forge
// phase's FORGE_PHASE_CATEGORY nature, stated as POLICY (not a live Ollama probe -- a
// hook can't see /api/tags, so we must not let an empty-roster fallback mislabel a
// mechanical task as "judgment").
const INTENTS = [
  { intent: "DISCOVER", phase: "scout",         reasoning: false, rx: /\b(where|find|locate|exists?|search|which file|map out|explore|understand|trace|does .{1,30} have)\b/gi },
  { intent: "AUDIT",    phase: "audit_scan",    reasoning: false, rx: /\b(audit|orphan|dormant|unwired|gap|inventory|dedup|duplicat|drift|coverage)\b/gi },
  { intent: "VERIFY",   phase: "verify_gate",   reasoning: true,  rx: /\b(verif\w*|validate|scrutin\w*|review|regression|safety|s\(x\)|prove\b|assert)\b/gi },
  { intent: "DATA",     phase: "summarize",     reasoning: false, rx: /\b(enrich|corpus|extract|ingest|migrat\w*|reconcile|backfill|catalog|dataset|ocr|pdf|every (record|row|tool|part|file))\b/gi },
  { intent: "LEARN",    phase: "summarize",     reasoning: false, rx: /\b(distill|memo\w*|wiki|tribal|capture|lora|train\w*|gnn|refpool|lesson|synthesi\w*)\b/gi },
  { intent: "DESIGN",   phase: "design",        reasoning: true,  rx: /\b(design|architect\w*|approach|strateg\w*|trade.?off|brainstorm|spec\b|decide)\b/gi },
  { intent: "BUILD",    phase: "novel_codegen", reasoning: true,  rx: /\b(build|implement|write|create|add|wire|engine|hook|dispatcher|skill|script|refactor|fix)\b/gi },
];

// The rotating spotlight set -- one underused substrate surfaced per iteration. Spans
// the PSN legs + token-economy levers the operator enumerated. Coverage compounds over
// a multi-iter loop. Plain strings (no per-call regex) so this stays ~0-cost.
const SPOTLIGHTS = [
  `🔦 SPOTLIGHT search-first: \`node scripts/system-viz-query.mjs find "<name>"\` -> \`node-card <id>\`, or \`subgraph "<task>"\` for the CONNECTED neighborhood (how a task's assets relate: engine->dispatcher->wiki->test) (zero-LLM; ~200 tok vs ~186K full-graph read) BEFORE any Grep/Glob/Agent.`,
  `🔦 SPOTLIGHT Ollama offload: route explain/summarize/classify/lint/docstring/diff/triage to \`node scripts/ask-ollama.mjs <mode> <input>\` ($0 local; qwen2.5-coder:32b heavy code / gpt-oss:120b deep). Reserve Claude for judgment + safety.`,
  `🔦 SPOTLIGHT Obsidian recall: \`node scripts/checkin-recall.mjs recall --source memory|wiki|tribal --query "<q>" --ollama-distill\` before re-deriving -- the 2nd brain likely already knows.`,
  `🔦 SPOTLIGHT tribal+wiki: \`/wiki-query <name>\` + read the auto-injected tribal hits -- a prior chat probably hit this exact gotcha; do not re-derive.`,
  `🔦 SPOTLIGHT NN/GNN (PSN #10): for an UNKNOWN unwired-engine class, tier-5 GraphSAGE (selective-deploy @tau=0.7) classifies it -- let it run before hand-wiring.`,
  `🔦 SPOTLIGHT model auto-switch: mechanical -> Ollama; mid -> cheap-Claude (Sonnet/Haiku); Opus ONLY for judgment/safety/novel build. Never silently run mechanical on Opus (token leak).`,
  `🔦 SPOTLIGHT galaxy brain: read \`mcp-server/src/engines/<galaxy>/CLAUDE.md\` + \`./MEMORY.md\` + souls before building in that domain -- your per-galaxy doctrine, not the root monolith.`,
  `🔦 SPOTLIGHT LoRA/GNN feed: shipped work IS training data -- write a domain-tagged memory; \`vault-to-lora-dataset.mjs\` + \`vault-to-gnn-refpool.mjs\` consume it into the learning loop.`,
  `🔦 SPOTLIGHT resources/JM Die: the answer may already live in \`H:/PRISM/resources\`, \`H:/PRISM/JM DIE\`, or \`Docustrata\` (search manifest.json + .index/, never re-OCR).`,
  `🔦 SPOTLIGHT self-compact: at a clean boundary near YELLOW, \`/self-compact\` writes a quality handoff + resets context -- checkpoint between iters, never push an open loop into a spiral (R6).`,
  `🔦 SPOTLIGHT prism_safety/Ω: any shop-floor-bound output (G-code, feed/speed) -> validate through \`prism_safety\` (S(x) >= 0.98 five-sigma) before declaring done.`,
  `🔦 SPOTLIGHT mcp dispatchers > reinvention: \`prism_calc\`/\`prism_cam\`/\`prism_ai\`/\`prism_dev\` likely already do it -- check the action enum (DISPATCHER_DIGEST.md) before writing new logic.`,
  `🔦 SPOTLIGHT RTK: prefix every bash with \`rtk\` (\`rtk git/vitest/tsc/npm\`) -- 60-99% output-token savings, no-op under 500 chars, safe in && chains.`,
  `🔦 SPOTLIGHT persist-after: outcome -> domain-tagged memory -> auto-fed to Obsidian at Stop -> master-index. Close the loop so iteration N+1 compounds on N (each pass feeds the next).`,
];

/**
 * Pure: classify a /loop|/goal task into a coarse dev-intent + its forge phase.
 * Scored by keyword-hit count; ties + no-match -> BUILD (the dominant /loop intent).
 * @param {string} prompt
 * @returns {{intent:string, phase:string, reasoning:boolean}}
 */
export function classifyDevIntent(prompt) {
  const text = typeof prompt === "string" ? prompt : "";
  if (!text.trim()) return { intent: "BUILD", phase: "novel_codegen", reasoning: true };
  let best = null, bestScore = 0;
  for (const e of INTENTS) {
    const hits = text.match(e.rx);
    const score = hits ? hits.length : 0;
    if (score > bestScore) { bestScore = score; best = e; }
  }
  return best
    ? { intent: best.intent, phase: best.phase, reasoning: best.reasoning }
    : { intent: "BUILD", phase: "novel_codegen", reasoning: true };
}

/**
 * Pure: the rotating spotlight for a given iteration. Deterministic; cycles the full
 * SPOTLIGHTS set so coverage compounds across a multi-iteration loop.
 * @param {number} iter
 * @returns {string}
 */
export function spotlightForIter(iter) {
  const n = Number.isInteger(iter) && iter >= 0 ? iter : 0;
  return SPOTLIGHTS[n % SPOTLIGHTS.length];
}

/** The count of distinct spotlights (exported for tests / coverage reasoning). */
export const SPOTLIGHT_COUNT = SPOTLIGHTS.length;

/**
 * Build the compact "optimal stack use" advisory block for a /loop or /goal turn.
 * Returns null when disabled or the prompt is empty/non-string (caller emits nothing).
 * Never throws.
 * @param {{prompt?:string, loopState?:object|null, iter?:number|null, disabled?:boolean}} args
 * @returns {string|null}
 */
export function buildStackAdvisory({ prompt = "", loopState = null, iter = null, disabled = false } = {}) {
  try {
    if (disabled) return null;
    if (typeof prompt !== "string" || !prompt.trim()) return null;

    const { intent, phase, reasoning } = classifyDevIntent(prompt);
    const { taskClass } = classifyTaskClass(prompt);
    const shortTask = prompt.replace(/\s+/g, " ").trim().slice(0, 80);

    let plan = null;
    try { plan = routeTask(shortTask, phase, {}); } catch { plan = null; }

    const effIter = Number.isInteger(iter)
      ? iter
      : (loopState && Number.isInteger(loopState.iter) ? loopState.iter : 0);

    const lines = [];
    lines.push(`─── ⚙ OPTIMAL STACK USE (intent: ${intent}${taskClass && taskClass !== "unknown" ? `/${taskClass}` : ""}) -- deploy the whole stack, do not grind solo ───`);

    // Model lane stated as POLICY from the intent's nature (NOT a live Ollama probe a
    // hook can't make): mechanical -> offload to Ollama; reasoning -> Claude-led but
    // still offload the mechanical sub-steps. Never silently run mechanical on Opus.
    lines.push(reasoning
      ? `▸ Model lane (reasoning-led): Claude for the judgment/novel build -- but OFFLOAD mechanical sub-steps (docstrings, test scaffold, summaries, diff, lint) to Ollama; cheap-Claude (Sonnet/Haiku) for mid; Opus ONLY for the hard reasoning/safety.`
      : `▸ Model lane (mechanical -> OFFLOAD): route the whole task to Ollama ($0; qwen2.5-coder:32b heavy / gpt-oss:120b deep / :1.5b trivial); cheap-Claude (Sonnet/Haiku) only if Ollama is down -- NEVER Opus for mechanical work (token leak).`);

    if (plan && Array.isArray(plan.substrates) && plan.substrates.length) {
      lines.push(`▸ Engage these substrates this iteration (route, don't reason -- R5):`);
      for (const s of plan.substrates.slice(0, 4)) {
        lines.push(`   • ${s.name} -- ${s.when}: ${safeTruncate(String(s.how || ""), 150)}`);
      }
    }

    // Auto-invoke (FEATURE-ROUTING-GRAPH-MS0): surface the fire-on-sight commands
    // for this turn's WORKFLOW-routing class so the loop runs them WITHOUT the
    // operator typing them. Pure + fail-open -- never blocks the advisory.
    try {
      const { taskClass: routingClass } = classifyRoutingClass(prompt);
      const ai = TASK_CLASS_POLICY[routingClass]?.autoInvoke || [];
      if (ai.length) lines.push(`▸ Auto-invoke (class ${routingClass} -- fire WITHOUT typing): ${ai.join(", ")}`);
      // BUILD-COMPLETE GATE (U-BUILD-COMPLETE-GATE): on a build-producing class, restate
      // the loop-until-zero done-condition EACH iteration so the loop does not stop while
      // any gap/bug/error/conflict is open (operator 2026-06-17).
      const dw = TASK_CLASS_POLICY[routingClass]?.doneWhen;
      if (dw) lines.push(`▸ DONE-WHEN (class ${routingClass} -- keep looping until ALL hold): ${dw}`);
    } catch { /* fail-open */ }

    lines.push(spotlightForIter(effIter));
    lines.push(`▸ Always: search-first (/system-viz find -> node-card, or subgraph <task> for the connected neighborhood) before Grep · RTK on bash · persist outcome (memory->Obsidian->master-index) · R15 wire->test->validate->all-galaxies.`);
    lines.push(`-> full substrate catalog: [[feedback_synergy_definition]] · 11-leg PSN: [[feedback_psn_definition]]`);
    lines.push(`────────────────────────────────────────────────`);

    return lines.join("\n");
  } catch {
    return null; // never block /loop or /goal on an advisor fault
  }
}
