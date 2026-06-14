// scripts/lib/hermes-workflow-planner.mjs
//
// Hermes Dynamic-Workflow Planner — the "coder brain" that makes Hermes (the
// PRISM fleet orchestrator) behave like a skilled Claude Code coder who reaches
// for Dynamic Workflows instead of hand-chaining 50 prompts.
//
// Source doctrine: 0xCodez, "How to master Dynamic Workflows in Claude Code:
// 6 patterns and 14 steps Anthropic engineers actually use" (x.com, 2026-06-03).
// This module encodes that article as EXECUTABLE planning logic:
//
//   • The 3 failure modes that SIGNAL "reach for a workflow"
//       (agentic laziness · self-preferential bias · goal drift) + the two
//       task shapes that also demand one (open-ended, hard-to-score) + the
//       security signal (untrusted input → quarantine).
//   • The failure-mode → pattern map (article step 11, verbatim):
//       drift → fan-out · self-preference → adversarial-verify ·
//       open-ended → loop-until-done · hard-to-score → tournament.
//   • The 6 patterns (classify-and-act, fan-out-and-synthesize,
//       adversarial-verification, generate-and-filter, tournament,
//       loop-until-done) and the use-case → composition matrix (step 11).
//   • The workflow-vs-single-session gate (step 12: "does this really need more
//       compute? if a regular session finishes it in 5 min, you don't need one").
//   • The discipline: parallel()=barrier vs pipeline()=stream, per-agent model
//       choice (haiku explore / sonnet middle / opus hard), per-agent isolation
//       (worktree | remote | none), separate worker≠verifier, quarantine for
//       untrusted input, explicit token budget, /goal on loops, /loop for
//       recurring — and the 8 token-wasting anti-patterns it avoids.
//
// PURE — no I/O, fully unit-testable. Consumers: the /hermes-workflow skill, the
// CLI (`node scripts/lib/hermes-workflow-planner.mjs "<task>" [--json]`) that the
// Hermes Python backend shells out to, and any fleet orchestrator that wants to
// shape a dispatch the way the article's coder would. The emitted stages map
// 1:1 onto PRISM's Workflow tool API (agent / parallel / pipeline).
//
// @module hermes-workflow-planner

// ── The 6 patterns ───────────────────────────────────────────────────────────
export const PATTERNS = Object.freeze({
  CLASSIFY_AND_ACT: "classify-and-act",
  FAN_OUT_SYNTHESIZE: "fan-out-and-synthesize",
  ADVERSARIAL_VERIFY: "adversarial-verification",
  GENERATE_AND_FILTER: "generate-and-filter",
  TOURNAMENT: "tournament",
  LOOP_UNTIL_DONE: "loop-until-done",
});

// ── The failure modes / task shapes that SIGNAL a workflow ────────────────────
export const FAILURE_MODES = Object.freeze({
  AGENTIC_LAZINESS: "agentic-laziness",          // stops after partial progress
  SELF_PREFERENTIAL_BIAS: "self-preferential-bias", // worker judging its own work
  GOAL_DRIFT: "goal-drift",                       // objective lost across turns
  OPEN_ENDED: "open-ended",                       // unknown amount of work
  HARD_TO_SCORE: "hard-to-score",                 // taste/ranking, absolute score fails
  UNTRUSTED_INPUT: "untrusted-input",             // prompt-injection surface
});

// ── Article step 11 — the structural fix for each failure mode (verbatim) ─────
//   "Drift → fan-out. Self-preference → adversarial verification.
//    Open-ended → loop until done. Hard-to-score → tournament."
export const FAILURE_TO_PATTERN = Object.freeze({
  [FAILURE_MODES.GOAL_DRIFT]: PATTERNS.FAN_OUT_SYNTHESIZE,
  [FAILURE_MODES.SELF_PREFERENTIAL_BIAS]: PATTERNS.ADVERSARIAL_VERIFY,
  [FAILURE_MODES.OPEN_ENDED]: PATTERNS.LOOP_UNTIL_DONE,
  [FAILURE_MODES.HARD_TO_SCORE]: PATTERNS.TOURNAMENT,
  // Agentic laziness is "stops before finishing" → loop-until-done with /goal
  // forces hard completion (article step 12).
  [FAILURE_MODES.AGENTIC_LAZINESS]: PATTERNS.LOOP_UNTIL_DONE,
});

// ── Per-agent model tiers (article step 01) ──────────────────────────────────
export const MODEL = Object.freeze({ EXPLORE: "haiku", MIDDLE: "sonnet", HARD: "opus" });

// ── Article step 11 — use-case → pattern composition matrix ──────────────────
// Each real workflow composes 2-4 patterns. Keyed by the use case the article
// names; `match` is the keyword signal, `patterns` the ordered composition,
// `note` the article's one-line rationale.
export const USE_CASE_MATRIX = Object.freeze([
  {
    id: "migration",
    match: /\b(migrat|refactor|rewrite|port|upgrade|codemod|callsite)\w*/i,
    patterns: [PATTERNS.FAN_OUT_SYNTHESIZE, PATTERNS.ADVERSARIAL_VERIFY, PATTERNS.LOOP_UNTIL_DONE],
    note: "one agent per callsite/failing test in a worktree → separate reviewer per fix → loop until done (the Bun Zig→Rust shape).",
    isolation: "worktree",
  },
  {
    id: "deep-research",
    match: /\b(research|investigat|survey|literature|gather|market scan)\w*/i,
    patterns: [PATTERNS.FAN_OUT_SYNTHESIZE, PATTERNS.ADVERSARIAL_VERIFY],
    note: "parallel searches → each claim verified independently → one cited synthesis.",
    isolation: "remote",
  },
  {
    id: "verification",
    match: /\b(verif|fact.?check|claim|audit|proof.?read|validate draft)\w*/i,
    patterns: [PATTERNS.FAN_OUT_SYNTHESIZE, PATTERNS.ADVERSARIAL_VERIFY],
    note: "identify all claims (1 agent) → one verifier per claim against source → meta-verifier checks the verifiers' sources.",
    isolation: "none",
  },
  {
    id: "sorting",
    match: /\b(sort|rank|prioriti[sz]e|order \d|top.?\d{2,}|leaderboard)\w*/i,
    patterns: [PATTERNS.TOURNAMENT],
    note: "pairwise comparison / bracket — comparative judgment, never absolute scoring.",
    isolation: "none",
  },
  {
    id: "rule-adherence",
    match: /\b(rule.?adheren|compliance|policy check|guideline|memory check|lint rules)\w*/i,
    patterns: [PATTERNS.FAN_OUT_SYNTHESIZE, PATTERNS.ADVERSARIAL_VERIFY],
    note: "one verifier per rule (fan-out) → skeptic persona reviews the rules themselves to kill false positives.",
    isolation: "none",
  },
  {
    id: "root-cause",
    match: /\b(root.?cause|debug|why is|regression|flak|diagnos|bug hunt)\w*/i,
    patterns: [PATTERNS.GENERATE_AND_FILTER, PATTERNS.ADVERSARIAL_VERIFY, PATTERNS.LOOP_UNTIL_DONE],
    note: "generate theories from disjoint evidence → panel of verifiers+refuters per theory → loop until one survives.",
    isolation: "worktree",
  },
  {
    id: "triage",
    match: /\b(triage|inbox|ticket|incoming|classif|categori[sz]e|route)\w*/i,
    patterns: [PATTERNS.CLASSIFY_AND_ACT, PATTERNS.LOOP_UNTIL_DONE],
    note: "classify-and-act → dedupe against existing tickets → fix or escalate. Pair with /loop for continuous triage.",
    isolation: "none",
  },
  {
    id: "exploration-taste",
    match: /\b(design|naming|name ideas|brainstorm|ui choice|palette|copywriting|taste)\w*/i,
    patterns: [PATTERNS.GENERATE_AND_FILTER, PATTERNS.TOURNAMENT],
    note: "generate 5-20 options → tournament with a rubric → rank or pick. Commit late, not early.",
    isolation: "none",
  },
  {
    id: "evals",
    match: /\b(eval|grade|score against rubric|benchmark candidate)\w*/i,
    patterns: [PATTERNS.GENERATE_AND_FILTER, PATTERNS.TOURNAMENT],
    note: "run candidate in a worktree → comparison agents grade against rubric → refine and re-grade.",
    isolation: "worktree",
  },
]);

// ── The 8 token-wasting anti-patterns the article names (for plan annotation) ─
export const ANTI_PATTERNS = Object.freeze([
  "reaching-for-a-workflow-when-a-session-would-do",
  "no-token-budget",
  "one-agent-doing-work-and-verification",
  "treating-parallel-and-pipeline-as-interchangeable",
  "skipping-goal-on-loop-patterns",
  "letting-untrusted-content-reach-the-actor",
  "sorting-with-absolute-scores",
  "never-saving-working-workflows",
]);

const RX = {
  // strong "enumerable list of independent work items" → fan-out signal
  enumerable: /\b(all|each|every|\d{2,})\s+(files?|endpoints?|callsites?|tests?|reviews?|tickets?|rules?|items?|modules?|functions?|records?|prints?|programs?)\b/i,
  // open-ended / unknown amount of work → loop-until-done
  openEnded: /\b(until|keep (going|finding)|exhaustiv|find all|no more|every (bug|issue|edge)|as many as)\b/i,
  // verification / judging → adversarial verify (self-preference risk)
  verify: /\b(verif|review|fact.?check|audit|judge|grade|validate|proof.?read|critique|adversar)\w*/i,
  // ranking / taste → tournament (hard-to-score)
  rank: /\b(rank|sort|best|prioriti[sz]e|pick (the )?(best|top)|compare|tournament|which is better|taste|design choice)\w*/i,
  // heterogeneous → classify-and-act
  heterogeneous: /\b(different (kinds?|types?|sub.?types?)|heterogen|route by|depends on the (kind|type)|mixed bag)\w*/i,
  // untrusted input → quarantine
  untrusted: /\b(untrusted|user.?submitted|support ticket|bug report|customer feedback|scrap(e|ed|ing)|social media|third.?party (api|output)|public (web|content)|email intake|webhook)\w*/i,
  // recurring → /loop
  recurring: /\b(recurring|nightly|weekly|daily|continuous|every (hour|day|week|night)|on a schedule|cron)\w*/i,
  // generate-many → generate-and-filter
  generate: /\b(generate|brainstorm|come up with|\d+\s+(ideas?|options?|candidates?|approaches?|names?|hypothes)|propose (several|multiple))\w*/i,
  // simple/quick → a single session suffices (workflow over-kill)
  trivial: /\b(quick|small|simple|one.?liner|typo|rename a|single (file|function)|trivial|just (add|fix|change))\b/i,
};

/**
 * Detect which workflow-signalling failure modes / task shapes a task exhibits.
 * Explicit structured hints (when a caller like Hermes knows them) WIN over text
 * heuristics; otherwise the task text is scanned. Returns a deterministic,
 * de-duplicated, stably-ordered array of FAILURE_MODES values.
 *
 * @param {object} task
 * @param {string} [task.text]            free-text description
 * @param {number} [task.itemCount]       known count of independent work items
 * @param {boolean}[task.untrustedInput]  reads public/user-submitted content
 * @param {boolean}[task.needsRanking]    ranking / taste-based selection
 * @param {boolean}[task.needsVerification] output must be judged/fact-checked
 * @param {boolean}[task.heterogeneous]   sub-types need different treatment
 * @param {boolean}[task.openEnded]       unknown amount of work / "until done"
 * @returns {string[]} FAILURE_MODES values present
 */
export function detectFailureModes(task = {}) {
  const text = typeof task.text === "string" ? task.text : "";
  const has = (rx) => rx.test(text);
  const out = new Set();

  // GOAL_DRIFT — a large enumerable list of items in one context drifts; the
  // structural fix is fan-out. Triggered by a big item count or "all N files".
  const bigCount = Number.isFinite(task.itemCount) && task.itemCount >= 10;
  if (bigCount || has(RX.enumerable)) out.add(FAILURE_MODES.GOAL_DRIFT);

  // OPEN_ENDED — unknown amount of work.
  if (task.openEnded === true || has(RX.openEnded)) out.add(FAILURE_MODES.OPEN_ENDED);

  // SELF_PREFERENTIAL_BIAS — anything that needs verifying/judging risks the
  // worker grading itself; the fix is a separate adversarial verifier.
  if (task.needsVerification === true || has(RX.verify)) out.add(FAILURE_MODES.SELF_PREFERENTIAL_BIAS);

  // HARD_TO_SCORE — ranking / taste; absolute scoring is unreliable → tournament.
  if (task.needsRanking === true || has(RX.rank)) out.add(FAILURE_MODES.HARD_TO_SCORE);

  // UNTRUSTED_INPUT — prompt-injection surface (security, not just efficiency).
  if (task.untrustedInput === true || has(RX.untrusted)) out.add(FAILURE_MODES.UNTRUSTED_INPUT);

  // AGENTIC_LAZINESS — large multi-part tasks tend to stop early; a big item
  // count OR an explicit open-ended ask carries this risk too.
  if (bigCount && (out.has(FAILURE_MODES.OPEN_ENDED) || (Number.isFinite(task.itemCount) && task.itemCount >= 30))) {
    out.add(FAILURE_MODES.AGENTIC_LAZINESS);
  }

  // Stable, doctrine-ordered output.
  const order = [
    FAILURE_MODES.GOAL_DRIFT, FAILURE_MODES.SELF_PREFERENTIAL_BIAS, FAILURE_MODES.AGENTIC_LAZINESS,
    FAILURE_MODES.OPEN_ENDED, FAILURE_MODES.HARD_TO_SCORE, FAILURE_MODES.UNTRUSTED_INPUT,
  ];
  return order.filter((m) => out.has(m));
}

/**
 * The workflow-vs-single-session gate (article step 12). A workflow is worth the
 * extra tokens ONLY when the task carries a real failure-mode signal AND has
 * enough scale/structure that a single context window would break down. A quick,
 * small, single-file task is explicitly NOT a workflow candidate ("if a regular
 * Claude Code session would finish it in five minutes, you don't need one").
 *
 * @param {object} task
 * @param {string[]} [failureModes] precomputed detectFailureModes(task)
 * @returns {{useWorkflow:boolean, reason:string}}
 */
export function shouldUseWorkflow(task = {}, failureModes) {
  const modes = Array.isArray(failureModes) ? failureModes : detectFailureModes(task);
  const text = typeof task.text === "string" ? task.text : "";

  // Untrusted input is a SECURITY signal — quarantine is worth a workflow even
  // for a small job, because the alternative is a prompt-injection hole.
  if (modes.includes(FAILURE_MODES.UNTRUSTED_INPUT)) {
    return { useWorkflow: true, reason: "untrusted input requires the quarantine pattern (security), not just efficiency." };
  }
  // Explicitly trivial → single session, no matter what keywords leak in.
  if (RX.trivial.test(text) && !(Number.isFinite(task.itemCount) && task.itemCount >= 10)) {
    return { useWorkflow: false, reason: "trivial/quick task — a regular Claude Code session finishes it; a workflow would only waste tokens (anti-pattern #1)." };
  }
  if (modes.length === 0) {
    return { useWorkflow: false, reason: "no failure-mode signal — single-context work; a workflow is over-kill." };
  }
  // A lone self-preference signal on an otherwise tiny task (e.g. "review this
  // one function") still doesn't need the full harness — but anything with
  // scale (drift/open-ended/laziness) or ranking does.
  const scaleSignal = modes.some((m) => m === FAILURE_MODES.GOAL_DRIFT
    || m === FAILURE_MODES.OPEN_ENDED || m === FAILURE_MODES.AGENTIC_LAZINESS
    || m === FAILURE_MODES.HARD_TO_SCORE);
  if (!scaleSignal && Number.isFinite(task.itemCount) && task.itemCount < 3) {
    return { useWorkflow: false, reason: "single-item verification — a separate reviewer agent is enough; no full workflow needed." };
  }
  return { useWorkflow: true, reason: `failure-mode signal(s) present (${modes.join(", ")}) — structural isolation a single context can't provide.` };
}

/**
 * Match a task against the use-case → composition matrix (article step 11).
 * Returns the first matching entry, or null when no named use case matches (the
 * caller then falls back to the failure-mode → pattern map).
 *
 * @param {string} text
 * @returns {(typeof USE_CASE_MATRIX)[number] | null}
 */
export function matchUseCase(text) {
  if (typeof text !== "string" || text.length === 0) return null;
  for (const uc of USE_CASE_MATRIX) {
    if (uc.match.test(text)) return uc;
  }
  return null;
}

/**
 * Select the ordered pattern composition for a task. Prefers a named use-case
 * composition (step 11 matrix); otherwise composes from the failure-mode → pattern
 * map. Always de-duplicated and stably ordered (classify → generate → fan-out →
 * verify → tournament → loop, the natural data-flow order). Heterogeneous tasks
 * get a leading classify-and-act router.
 *
 * @param {string[]} failureModes
 * @param {object} task
 * @returns {string[]} ordered PATTERNS values
 */
export function selectPatterns(failureModes, task = {}) {
  const text = typeof task.text === "string" ? task.text : "";
  const set = new Set();

  const uc = matchUseCase(text);
  if (uc) for (const p of uc.patterns) set.add(p);

  // Always honor the failure-mode → pattern map on top of (or instead of) the
  // use case, so an off-matrix task still gets a structurally-correct shape.
  for (const m of failureModes) {
    const p = FAILURE_TO_PATTERN[m];
    if (p) set.add(p);
  }

  // Heterogeneous work earns a leading classifier/router (step 05).
  if (task.heterogeneous === true || RX.heterogeneous.test(text)) set.add(PATTERNS.CLASSIFY_AND_ACT);
  // "generate N ideas/options" → generate-and-filter (step 08) even off-matrix.
  if (RX.generate.test(text)) set.add(PATTERNS.GENERATE_AND_FILTER);

  // Natural data-flow ordering: route first, generate, fan-out, verify, rank, loop.
  const order = [
    PATTERNS.CLASSIFY_AND_ACT, PATTERNS.GENERATE_AND_FILTER, PATTERNS.FAN_OUT_SYNTHESIZE,
    PATTERNS.ADVERSARIAL_VERIFY, PATTERNS.TOURNAMENT, PATTERNS.LOOP_UNTIL_DONE,
  ];
  return order.filter((p) => set.has(p));
}

/**
 * Map a single pattern to a concrete workflow stage descriptor (maps 1:1 onto
 * PRISM's Workflow tool: `kind:"parallel"` → parallel(thunks) barrier,
 * `kind:"pipeline"` → pipeline(items, ...stages) stream, `kind:"agent"` → a lone
 * agent() call, `kind:"loop"` → a while-until-stop loop in deterministic code).
 *
 * @param {string} pattern
 * @param {object} task
 * @returns {{pattern:string, kind:string, model:string, isolation:string, barrier:boolean, note:string}}
 */
export function patternToStage(pattern, task = {}) {
  const isolationFor = (def) => task.isolation || def;
  switch (pattern) {
    case PATTERNS.CLASSIFY_AND_ACT:
      // cheap classifier decides the shape, then route to the right model.
      return { pattern, kind: "agent", model: MODEL.EXPLORE, isolation: "none", barrier: false,
        note: "cheap classifier reads context + estimates complexity, then routes the real work to the right model." };
    case PATTERNS.GENERATE_AND_FILTER:
      return { pattern, kind: "parallel", model: MODEL.MIDDLE, isolation: "none", barrier: true,
        note: "generate many candidates in parallel → filter by rubric/verification → dedupe → return the best. Commit late." };
    case PATTERNS.FAN_OUT_SYNTHESIZE:
      // one agent per item (cheap), then ONE opus synthesizer (barrier).
      return { pattern, kind: "parallel", model: MODEL.EXPLORE, isolation: isolationFor("worktree"), barrier: true,
        note: "one cheap agent per enumerable item (own clean window) → one opus agent merges the structured outputs (barrier)." };
    case PATTERNS.ADVERSARIAL_VERIFY:
      // SEPARATE verifier per artifact; never the worker. Sonnet rubric-check.
      return { pattern, kind: "parallel", model: MODEL.MIDDLE, isolation: "none", barrier: true,
        note: "a SEPARATE agent (never the worker) verifies each output against only the rubric+artifact — kills self-preferential bias." };
    case PATTERNS.TOURNAMENT:
      // pairwise comparison; bracket lives in deterministic loop code.
      return { pattern, kind: "pipeline", model: MODEL.MIDDLE, isolation: "none", barrier: false,
        note: "pairwise comparison in a code-owned bracket; each fresh agent compares just two items — comparative judgment, not absolute scoring." };
    case PATTERNS.LOOP_UNTIL_DONE:
      // while(!stop) spawn; bracket+stop-condition in code; pair with /goal.
      return { pattern, kind: "loop", model: MODEL.MIDDLE, isolation: isolationFor("none"), barrier: false,
        note: "spawn agents until a stop condition holds (no new findings / zero errors / theory survives); pair with /goal for hard completion." };
    default:
      return { pattern, kind: "agent", model: MODEL.MIDDLE, isolation: "none", barrier: false, note: "" };
  }
}

/**
 * Produce a full, executable-shaped workflow plan for a task — the planner's
 * top-level entry point. This is what makes Hermes "behave like the coder in the
 * article": it decides workflow-vs-session, names the failure modes, selects and
 * orders the patterns, shapes each stage (parallel vs pipeline, per-agent model,
 * isolation), pairs a separate verifier when self-preference is in play, inserts
 * a quarantine reader when input is untrusted, sets a token budget, attaches
 * /goal on loops + /loop when recurring, and lists the anti-patterns it avoided.
 *
 * @param {object|string} taskInput  a task object (see detectFailureModes) or
 *                                    a bare description string.
 * @param {object} [opts]
 * @param {number} [opts.tokenBudget] explicit cap (article step 12); default
 *                                     scales with the plan's breadth.
 * @returns {object} WorkflowPlan
 */
export function planWorkflow(taskInput, opts = {}) {
  const task = typeof taskInput === "string" ? { text: taskInput } : { ...(taskInput || {}) };
  const text = typeof task.text === "string" ? task.text : "";

  const failureModes = detectFailureModes(task);
  const gate = shouldUseWorkflow(task, failureModes);

  if (!gate.useWorkflow) {
    return {
      task: text,
      useWorkflow: false,
      reason: gate.reason,
      failureModes,
      patterns: [],
      stages: [],
      recommendation: "Run this as a normal Claude Code session — no workflow harness needed.",
      antiPatternsAvoided: [ANTI_PATTERNS[0]], // didn't reach for a workflow needlessly
    };
  }

  const uc = matchUseCase(text);
  const patterns = selectPatterns(failureModes, task);
  const stages = patterns.map((p) => patternToStage(p, task));

  const untrusted = failureModes.includes(FAILURE_MODES.UNTRUSTED_INPUT);
  const hasVerify = patterns.includes(PATTERNS.ADVERSARIAL_VERIFY);
  const hasLoop = patterns.includes(PATTERNS.LOOP_UNTIL_DONE);
  const recurring = task.recurring === true || RX.recurring.test(text);

  // Quarantine (step 13): a read-only reader agent that NEVER acts is prepended
  // when input is untrusted; the acting stages must never see the raw content.
  const quarantine = untrusted
    ? { enabled: true, readerModel: MODEL.EXPLORE, note: "30-line read-only reader agent ingests the untrusted content; actor stages receive only its sanitized structured summary — never the raw bytes (prompt-injection firewall)." }
    : { enabled: false, note: "" };

  // Token budget (step 12): explicit cap so an ambitious run can't balloon 5-10×.
  // Scales with breadth (pattern count) but always bounded; caller can override.
  const tokenBudget = Number.isFinite(opts.tokenBudget) && opts.tokenBudget > 0
    ? opts.tokenBudget
    : Math.min(50_000, 8_000 + patterns.length * 8_000 + (hasLoop ? 12_000 : 0));

  const controls = {
    goal: hasLoop ? { enabled: true, note: "/goal sets a hard completion requirement so the loop doesn't stop at a soft completion point (article step 12)." } : { enabled: false },
    loop: recurring ? { enabled: true, note: "/loop runs the whole workflow on a recurring schedule (triage, weekly research, recurring verification)." } : { enabled: false },
    tokenBudget,
  };

  // Anti-patterns this plan structurally avoids (article's mistakes list).
  const avoided = [];
  if (gate.useWorkflow) avoided.push(ANTI_PATTERNS[1]);                 // has a token budget
  if (hasVerify) avoided.push(ANTI_PATTERNS[2]);                        // worker ≠ verifier
  avoided.push(ANTI_PATTERNS[3]);                                      // parallel/pipeline distinguished per stage
  if (hasLoop) avoided.push(ANTI_PATTERNS[4]);                          // /goal on loop
  if (untrusted) avoided.push(ANTI_PATTERNS[5]);                        // quarantine
  if (patterns.includes(PATTERNS.TOURNAMENT)) avoided.push(ANTI_PATTERNS[6]); // comparative not absolute
  avoided.push(ANTI_PATTERNS[7]);                                      // save-as-skill recommended below

  return {
    task: text,
    useWorkflow: true,
    reason: gate.reason,
    useCase: uc ? uc.id : null,
    useCaseNote: uc ? uc.note : null,
    failureModes,
    patterns,
    stages,
    quarantine,
    controls,
    verifierPairing: hasVerify
      ? { separate: true, note: "the verifier agent knows ONLY the rubric + artifact, not who produced it — self-preference can't creep back in." }
      : { separate: false },
    recommendation: [
      `Build a Dynamic Workflow composing: ${patterns.join(" → ")}.`,
      uc ? `Use-case shape (${uc.id}): ${uc.note}` : "Composed from the failure-mode → pattern map.",
      `Cap the run at ~${tokenBudget.toLocaleString()} tokens${hasLoop ? " and gate the loop with /goal" : ""}${recurring ? "; schedule it with /loop" : ""}.`,
      "Once it works, save it (press s) and ship it as a Skill — as a TEMPLATE Claude adapts, not a verbatim script (step 14).",
    ].join(" "),
    antiPatternsAvoided: avoided,
  };
}

// ── Harness emitter — turn a plan into a runnable PRISM Workflow skeleton ─────
// The article's core promise is "Claude writes that harness for you." planWorkflow
// DECIDES the shape; emitWorkflowScript WRITES it — a structurally-correct PRISM
// Workflow tool script (meta + phase()/agent()/parallel()/pipeline()/loop) that a
// human or Hermes fills the task-specific item lists + prompts into. Per article
// step 14, this is a TEMPLATE to adapt, not a verbatim script — the `TODO:` markers
// are the adaptation points. Pure string codegen; throws on a non-workflow plan
// (caller must gate on plan.useWorkflow first — R12, never emit a broken harness).

/** Map a stage to its Workflow-tool code block (string). Internal. */
function stageToCode(stage, idx) {
  const m = (mdl) => JSON.stringify(mdl);
  const iso = stage.isolation && stage.isolation !== "none" ? `, isolation: ${JSON.stringify(stage.isolation)}` : "";
  switch (stage.pattern) {
    case PATTERNS.CLASSIFY_AND_ACT:
      return [
        `  // [${idx}] classify-and-act — cheap classifier decides the shape, then route.`,
        `  phase('Classify')`,
        `  const klass = await agent('Classify this task + estimate complexity. Return one of: simple | complex.', { model: ${m(stage.model)}, schema: { type: 'object', properties: { kind: { type: 'string' } }, required: ['kind'] } })`,
        `  const routeModel = klass.kind === 'complex' ? 'opus' : 'sonnet'  // spend the expensive model only where complexity demands`,
      ].join("\n");
    case PATTERNS.GENERATE_AND_FILTER:
      return [
        `  // [${idx}] generate-and-filter — generate many, filter by rubric, commit late.`,
        `  phase('Generate')`,
        `  const candidates = await parallel(Array.from({ length: 8 }, (_, i) => () =>`,
        `    agent(\`Generate candidate #\${i + 1} for: TODO_TASK\`, { model: ${m(stage.model)} })))`,
        `  const kept = await parallel(candidates.filter(Boolean).map(c => () =>`,
        `    agent(\`Score this candidate against the rubric; reply keep/kill: \${c}\`, { model: ${m(stage.model)}, schema: { type: 'object', properties: { keep: { type: 'boolean' } }, required: ['keep'] } })`,
        `      .then(v => ({ c, keep: v.keep }))))`,
        `  const survivors = kept.filter(Boolean).filter(x => x.keep).map(x => x.c)  // dedupe + keep the best`,
      ].join("\n");
    case PATTERNS.FAN_OUT_SYNTHESIZE:
      return [
        `  // [${idx}] fan-out-and-synthesize — one cheap agent per item (barrier), then one opus merge.`,
        `  phase('Fan-out')`,
        `  const items = [/* TODO: enumerate the independent work items (files / endpoints / claims) */]`,
        `  const partials = await parallel(items.map(it => () =>`,
        `    agent(\`Do the focused sub-task for: \${it}\`, { model: ${m(stage.model)}${iso}, schema: ITEM_RESULT })))`,
        `  phase('Synthesize')`,
        `  const merged = await agent(\`Merge these into one consolidated result:\\n\${JSON.stringify(partials.filter(Boolean))}\`, { model: 'opus' })`,
      ].join("\n");
    case PATTERNS.ADVERSARIAL_VERIFY:
      return [
        `  // [${idx}] adversarial-verification — a SEPARATE agent verifies each output (worker != judge).`,
        `  phase('Verify')`,
        `  const verdicts = await parallel((partials || []).filter(Boolean).map(art => () =>`,
        `    agent(\`Adversarially verify this against ONLY the rubric + artifact (you did NOT produce it). Real?\\n\${JSON.stringify(art)}\`, { model: ${m(stage.model)}, schema: VERDICT })`,
        `      .then(v => ({ art, verdict: v }))))`,
        `  const confirmed = verdicts.filter(Boolean).filter(x => x.verdict?.isReal).map(x => x.art)`,
      ].join("\n");
    case PATTERNS.TOURNAMENT:
      return [
        `  // [${idx}] tournament — pairwise comparison in a code-owned bracket (no absolute scoring).`,
        `  phase('Tournament')`,
        `  let bracket = [/* TODO: the items to rank */]`,
        `  while (bracket.length > 1) {`,
        `    const next = []`,
        `    for (let i = 0; i < bracket.length; i += 2) {`,
        `      if (i + 1 >= bracket.length) { next.push(bracket[i]); continue }`,
        `      const win = await agent(\`Which is better, A or B? A=\${JSON.stringify(bracket[i])} B=\${JSON.stringify(bracket[i + 1])}\`, { model: ${m(stage.model)}, schema: { type: 'object', properties: { winner: { type: 'string', enum: ['A', 'B'] } }, required: ['winner'] } })`,
        `      next.push(win.winner === 'A' ? bracket[i] : bracket[i + 1])`,
        `    }`,
        `    bracket = next`,
        `  }`,
        `  const winner = bracket[0]`,
      ].join("\n");
    case PATTERNS.LOOP_UNTIL_DONE:
      return [
        `  // [${idx}] loop-until-done — spawn until a stop condition holds (pair with /goal).`,
        `  phase('Loop')`,
        `  let dryRounds = 0`,
        `  const found = []`,
        `  while (dryRounds < 2) {  // stop after K consecutive empty rounds — NOT a fixed pass count`,
        `    const round = await agent('Find the next finding / test the next theory. Return {newItems: [...]}.', { model: ${m(stage.model)}${iso}, schema: ROUND })`,
        `    const fresh = (round.newItems || []).filter(x => !found.some(f => f === x))`,
        `    if (!fresh.length) { dryRounds++; continue }`,
        `    dryRounds = 0; found.push(...fresh)`,
        `  }`,
      ].join("\n");
    default:
      return `  // [${idx}] ${stage.pattern} — TODO`;
  }
}

/**
 * Emit a runnable PRISM Workflow tool script skeleton from a plan. The result is
 * valid-shaped JS for the Workflow tool (export const meta + body using
 * agent/parallel/pipeline/phase). Task-specific item lists + prompts are left as
 * `TODO:` markers — the article's "template, not verbatim" rule (step 14).
 *
 * @param {object} plan  a planWorkflow() result with useWorkflow:true
 * @returns {string} the Workflow script source
 * @throws if the plan is not a workflow (gate on plan.useWorkflow first)
 */
export function emitWorkflowScript(plan) {
  if (!plan || typeof plan !== "object") throw new Error("emitWorkflowScript: a plan object is required");
  if (plan.useWorkflow !== true) {
    throw new Error("emitWorkflowScript: plan.useWorkflow is false — run a normal session; there is no harness to emit (gate on plan.useWorkflow first).");
  }
  const stages = Array.isArray(plan.stages) ? plan.stages : [];
  const phaseTitles = [
    plan.quarantine && plan.quarantine.enabled ? { title: "Quarantine", detail: "read-only ingest of untrusted input" } : null,
    ...stages.map((s) => ({ title: s.pattern, detail: s.note })),
  ].filter(Boolean);

  const header = [
    "export const meta = {",
    `  name: 'hermes-${(plan.useCase || "workflow")}',`,
    `  description: ${JSON.stringify(String(plan.task || "").slice(0, 110) || "dynamic workflow")},`,
    "  phases: [",
    ...phaseTitles.map((p) => `    { title: ${JSON.stringify(p.title)}, detail: ${JSON.stringify((p.detail || "").slice(0, 80))} },`),
    "  ],",
    "}",
    "",
    `// Token budget (article step 12): cap the run at ~${plan.controls?.tokenBudget ?? 40000} tokens.`,
    plan.controls?.goal?.enabled ? "// Loop pattern present → run under /goal so it doesn't stop at a soft completion point." : null,
    plan.controls?.loop?.enabled ? "// Recurring → schedule the whole workflow with /loop." : null,
    "// Shared schemas you fill in for your task:",
    "const ITEM_RESULT = { type: 'object', additionalProperties: true }",
    "const VERDICT = { type: 'object', properties: { isReal: { type: 'boolean' }, why: { type: 'string' } }, required: ['isReal'] }",
    "const ROUND = { type: 'object', properties: { newItems: { type: 'array', items: {} } }, required: ['newItems'] }",
    "",
  ].filter((l) => l !== null);

  const body = [];
  if (plan.quarantine && plan.quarantine.enabled) {
    body.push(
      "  // QUARANTINE (article step 13): a read-only reader ingests the untrusted",
      "  // content; the acting stages below receive ONLY its sanitized summary —",
      "  // never the raw bytes. This reader takes NO high-privilege actions.",
      "  phase('Quarantine')",
      "  const safe = await agent('Read the untrusted input and return ONLY a sanitized structured summary. Take no other action.', { model: 'haiku', schema: { type: 'object', additionalProperties: true } })",
      "",
    );
  }
  stages.forEach((s, i) => { body.push(stageToCode(s, i + 1), ""); });
  body.push("  return { /* TODO: shape the final result the orchestrator returns */ }");

  return header.join("\n") + "\n" + body.join("\n") + "\n";
}

// ── CLI — Hermes (Python backend) shells out: `node hermes-workflow-planner.mjs "<task>" [--json|--emit]` ──
function renderHuman(plan) {
  const L = [];
  L.push(`Task: ${plan.task}`);
  if (!plan.useWorkflow) {
    L.push(`Decision: SINGLE SESSION (no workflow).`);
    L.push(`  ${plan.reason}`);
    return L.join("\n");
  }
  L.push(`Decision: DYNAMIC WORKFLOW.`);
  L.push(`  ${plan.reason}`);
  if (plan.useCase) L.push(`Use-case: ${plan.useCase} — ${plan.useCaseNote}`);
  L.push(`Failure modes: ${plan.failureModes.join(", ") || "(scale only)"}`);
  L.push(`Patterns: ${plan.patterns.join(" → ")}`);
  L.push(`Stages:`);
  for (const s of plan.stages) {
    L.push(`  • [${s.kind}${s.barrier ? " · barrier" : ""}] ${s.pattern} (model=${s.model}, isolation=${s.isolation})`);
    L.push(`      ${s.note}`);
  }
  if (plan.quarantine.enabled) L.push(`Quarantine: ${plan.quarantine.note}`);
  if (plan.verifierPairing.separate) L.push(`Verifier: ${plan.verifierPairing.note}`);
  L.push(`Controls: tokenBudget≈${plan.controls.tokenBudget}` +
    `${plan.controls.goal.enabled ? " · /goal" : ""}${plan.controls.loop.enabled ? " · /loop" : ""}`);
  L.push(`Recommendation: ${plan.recommendation}`);
  return L.join("\n");
}

function main(argv) {
  const args = argv.slice(2);
  const json = args.includes("--json");
  const emit = args.includes("--emit");
  const parts = args.filter((a) => !a.startsWith("--"));
  const task = parts.join(" ").trim();
  if (!task) {
    process.stderr.write('usage: node hermes-workflow-planner.mjs "<task description>" [--json|--emit]\n');
    process.exit(2);
  }
  const plan = planWorkflow(task);
  if (emit) {
    // --emit: write the runnable PRISM Workflow harness skeleton (or, for a
    // single-session verdict, a one-line note explaining why there's no harness).
    if (!plan.useWorkflow) {
      process.stdout.write(`// No workflow — ${plan.reason}\n// Run this as a normal Claude Code session.\n`);
    } else {
      process.stdout.write(emitWorkflowScript(plan) + "\n");
    }
    return;
  }
  process.stdout.write((json ? JSON.stringify(plan, null, 2) : renderHuman(plan)) + "\n");
}

// ESM entry-point guard (Windows-safe basename check).
const __invokedDirectly = (() => {
  try {
    const p = (process.argv[1] || "").replace(/\\/g, "/");
    return p.endsWith("hermes-workflow-planner.mjs");
  } catch { return false; }
})();
if (__invokedDirectly) main(process.argv);
