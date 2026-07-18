#!/usr/bin/env node
/**
 * ollama-l3-agent.mjs — U-OE-L3 (OLLAMA-EXPAND-MS0 L3 layer)
 *
 * Sustained multi-step agent loop built on top of L2 (`runAgentLoop` in
 * `scripts/ollama-prism-bridge.mjs`). Where L2 runs a single
 * question-to-answer round-trip with tool calls, L3 wraps that into a
 * goal-oriented loop:
 *
 *   - Take a high-level GOAL (e.g. "summarize the recent commits and flag
 *     anything broker-related") + an optional CONTINUATION PREDICATE.
 *   - On each step, build the next question from the goal + prior step
 *     transcript, invoke L2, record the answer.
 *   - After each step, ask the model itself whether the goal is satisfied
 *     (the continuation gate). Stop on `done`, hard `maxSteps`, or wall-
 *     clock timeout.
 *
 * Local-LLM-only — zero Claude API calls. Designed to run against the
 * Ollama bridge daemon (`ollama-prism-bridge.mjs` / `ask-ollama.mjs`).
 *
 * Usage (CLI):
 *   node scripts/ollama-l3-agent.mjs --goal "audit recent broker commits"
 *   node scripts/ollama-l3-agent.mjs --goal "..." --max-steps 5 --model qwen2.5-coder:7b
 *
 * Programmatic:
 *   import { runL3 } from "./ollama-l3-agent.mjs";
 *   const result = await runL3({ goal: "...", maxSteps: 5 });
 *
 * @milestone U-OE-L3 (OLLAMA-EXPAND-MS0)
 */

import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { runAgentLoop, pickModel, chatOllama } from "./ollama-prism-bridge.mjs";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// L3 defaults — kept conservative so a runaway loop costs seconds, not minutes.
const DEFAULT_MAX_STEPS = 4;
const DEFAULT_STEP_TIMEOUT_MS = 60_000;
const DEFAULT_WALL_TIMEOUT_MS = 180_000;
const TRANSCRIPT_CAP_CHARS = 4_000;

/**
 * Build the next-step question. Combines the original goal with a
 * compacted transcript of prior step answers — the model gets "here is
 * the goal, here is what you've established so far, what should you
 * investigate next?".
 *
 * Pure — no I/O. Exposed for tests.
 *
 * @param {string} goal
 * @param {Array<{question:string, answer:string}>} priorSteps
 * @returns {string}
 */
export function buildStepQuestion(goal, priorSteps) {
  const safeGoal = String(goal || "").trim();
  if (priorSteps.length === 0) {
    return `GOAL: ${safeGoal}\n\nThis is step 1. Investigate the most direct evidence and answer concisely.`;
  }
  // Compact the transcript — keep the most recent N steps under the cap.
  const summary = compactTranscript(priorSteps);
  const stepN = priorSteps.length + 1;
  return [
    `GOAL: ${safeGoal}`,
    "",
    `Prior steps (latest first):`,
    summary,
    "",
    `This is step ${stepN}. Based on what's been established, what is the next concrete sub-question to investigate? Answer it directly using tools as needed. If the GOAL is already satisfied, say so plainly.`,
  ].join("\n");
}

/**
 * Compact a list of prior steps into a transcript fragment, oldest-first
 * dropped if needed to stay under the char cap.
 *
 * @param {Array<{question:string, answer:string}>} priorSteps
 * @param {number} [cap]
 * @returns {string}
 */
export function compactTranscript(priorSteps, cap = TRANSCRIPT_CAP_CHARS) {
  const lines = [];
  // Walk newest-first; stop when adding the next would push us over the cap.
  let used = 0;
  for (let i = priorSteps.length - 1; i >= 0; i--) {
    const s = priorSteps[i];
    const q = String(s.question || "").slice(0, 200).replace(/\s+/g, " ");
    const a = String(s.answer || "").slice(0, 500).replace(/\s+/g, " ");
    const block = `- Q${i + 1}: ${q}\n  A${i + 1}: ${a}`;
    if (used + block.length > cap) break;
    lines.push(block);
    used += block.length + 1;
  }
  return lines.length > 0 ? lines.join("\n") : "(no prior steps)";
}

/**
 * Ask the local model whether the goal is satisfied. Returns `true` when
 * the model's response starts with an affirmative ("yes", "done",
 * "complete", "satisfied"). Conservative-by-default: any model error or
 * ambiguous answer → `false` (continue the loop, don't terminate
 * prematurely).
 *
 * Pure-core via `chatImpl` dep so tests can inject a mock.
 *
 * @param {string} goal
 * @param {Array<{question:string, answer:string}>} priorSteps
 * @param {{ model?: string, chatImpl?: Function, timeoutMs?: number }} [opts]
 * @returns {Promise<{ done: boolean, raw: string, error?: string }>}
 */
export async function isGoalSatisfied(goal, priorSteps, opts = {}) {
  const model = opts.model || pickModel();
  const chatImpl = opts.chatImpl || chatOllama;
  const timeoutMs = opts.timeoutMs || 15_000;
  if (priorSteps.length === 0) return { done: false, raw: "no prior steps yet" };
  const summary = compactTranscript(priorSteps);
  const prompt = [
    `GOAL: ${String(goal || "").trim()}`,
    "",
    `Steps completed:`,
    summary,
    "",
    `Is the goal SATISFIED by what's been established? Reply with exactly ONE word: "yes" or "no". Nothing else.`,
  ].join("\n");
  try {
    const res = await chatImpl(model, [
      { role: "system", content: "You evaluate whether a goal is satisfied. Reply with exactly one word: yes or no." },
      { role: "user", content: prompt },
    ], [], { timeoutMs });
    if (!res || !res.ok) {
      return { done: false, raw: "", error: res?.error || "no result" };
    }
    const raw = String(res.message?.content || "").trim().toLowerCase();
    const done = /^(yes|done|complete|satisfied)\b/.test(raw);
    return { done, raw };
  } catch (e) {
    return { done: false, raw: "", error: e?.message || String(e) };
  }
}

/**
 * Main L3 entry. Drives a goal-oriented multi-step loop.
 *
 * Returns a structured result:
 *   { ok, goal, steps[], doneReason, durationMs, totalToolCalls }
 *
 * `doneReason` is one of:
 *   - "goal-satisfied"  — continuation gate said yes
 *   - "max-steps"        — hit maxSteps cap
 *   - "wall-timeout"     — wall-clock budget exceeded
 *   - "step-error"       — an individual L2 step failed (recorded in
 *                          steps[last].error)
 *
 * @param {{
 *   goal: string,
 *   maxSteps?: number,
 *   stepTimeoutMs?: number,
 *   wallTimeoutMs?: number,
 *   model?: string,
 *   deps?: { runStep?: Function, isDoneImpl?: Function, now?: () => number },
 * }} opts
 */
export async function runL3(opts = {}) {
  const goal = String(opts.goal || "").trim();
  if (!goal) return { ok: false, error: "empty goal", steps: [], doneReason: "empty-goal" };

  const maxSteps = opts.maxSteps ?? DEFAULT_MAX_STEPS;
  const stepTimeoutMs = opts.stepTimeoutMs ?? DEFAULT_STEP_TIMEOUT_MS;
  const wallTimeoutMs = opts.wallTimeoutMs ?? DEFAULT_WALL_TIMEOUT_MS;
  const model = opts.model || pickModel();
  const now = opts.deps?.now || (() => Date.now());
  const runStep = opts.deps?.runStep || runAgentLoop;
  const isDoneImpl = opts.deps?.isDoneImpl || isGoalSatisfied;

  const t0 = now();
  const steps = [];
  let totalToolCalls = 0;
  let doneReason = "max-steps";

  for (let i = 0; i < maxSteps; i++) {
    if (now() - t0 > wallTimeoutMs) { doneReason = "wall-timeout"; break; }
    const question = buildStepQuestion(goal, steps);
    const stepResult = await runStep({ question, model, timeoutMs: stepTimeoutMs });
    const step = {
      stepNumber: i + 1,
      question,
      answer: stepResult?.answer || "",
      ok: !!stepResult?.ok,
      iterations: stepResult?.iterations || 0,
      toolCalls: Array.isArray(stepResult?.toolCalls) ? stepResult.toolCalls.length : 0,
      capped: !!stepResult?.capped,
      error: stepResult?.ok ? null : (stepResult?.error || "unknown step error"),
    };
    steps.push(step);
    totalToolCalls += step.toolCalls;
    if (!step.ok) { doneReason = "step-error"; break; }
    // Continuation gate — skip on the final allowed iteration (would
    // terminate anyway).
    if (i + 1 < maxSteps) {
      const gate = await isDoneImpl(goal, steps, { model });
      if (gate.done) { doneReason = "goal-satisfied"; break; }
    }
  }

  return Object.freeze({
    ok: doneReason !== "step-error" && doneReason !== "empty-goal",
    goal,
    model,
    steps: Object.freeze(steps),
    doneReason,
    durationMs: now() - t0,
    totalToolCalls,
  });
}

/**
 * Render a structured L3 result as an operator-readable digest. Pure —
 * separated so callers can pipe it to logs, console, or files.
 *
 * @param {Awaited<ReturnType<typeof runL3>>} result
 * @returns {string}
 */
export function renderL3Digest(result) {
  const lines = [];
  lines.push(`L3 agent — ${result.doneReason} (${result.steps.length} step${result.steps.length === 1 ? "" : "s"}, ${result.durationMs}ms, ${result.totalToolCalls} tool call${result.totalToolCalls === 1 ? "" : "s"})`);
  lines.push(`Goal: ${result.goal}`);
  lines.push(`Model: ${result.model}`);
  lines.push("");
  for (const s of result.steps) {
    lines.push(`── Step ${s.stepNumber} ──`);
    if (!s.ok) lines.push(`  ERROR: ${s.error}`);
    lines.push(`  iterations=${s.iterations} toolCalls=${s.toolCalls}${s.capped ? " (capped)" : ""}`);
    const ans = (s.answer || "").slice(0, 800);
    lines.push(`  answer: ${ans}`);
    if ((s.answer || "").length > 800) lines.push(`  …(truncated, full ${s.answer.length} chars in raw result)`);
  }
  return lines.join("\n");
}

const invokedAsCli = (() => {
  try { return process.argv[1] && resolve(process.argv[1]) === __filename; }
  catch { return false; }
})();
if (invokedAsCli) {
  const args = process.argv.slice(2);
  const goalIdx = args.indexOf("--goal");
  if (goalIdx < 0 || !args[goalIdx + 1]) {
    console.error("Usage: node scripts/ollama-l3-agent.mjs --goal \"<goal>\" [--max-steps N] [--model M]");
    process.exit(2);
  }
  const goal = args[goalIdx + 1];
  const maxStepsIdx = args.indexOf("--max-steps");
  const maxSteps = maxStepsIdx >= 0 ? Number(args[maxStepsIdx + 1]) : undefined;
  const modelIdx = args.indexOf("--model");
  const model = modelIdx >= 0 ? args[modelIdx + 1] : undefined;
  runL3({ goal, maxSteps, model }).then((r) => {
    console.log(renderL3Digest(r));
    process.exit(r.ok ? 0 : 1);
  }).catch((e) => {
    console.error(`L3 fatal: ${e?.message || String(e)}`);
    process.exit(1);
  });
}
