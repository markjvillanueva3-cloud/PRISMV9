#!/usr/bin/env node
// tier: T2
// prompt-route-inject.mjs -- UserPromptSubmit
//
// PROMPT-ROUTE-MAP-MS0 / U-PROMPT-ROUTE-INJECT (slot:alpha 2026-06-15). Operator
// directive: "my future prompts should auto trigger you to look at the graph to
// see the order of operation you should take to complete the task effectively and
// perfect the first time." This is U3: on EVERY substantive prompt, classify it
// into one of the 12 workflow routing classes (classifyRoutingClass -- reused from
// feature-routing-graph) and inject the optimal ORDER OF OPERATIONS for that class
// (substrate ladder + model tier + ordered commands + auto-invoke + the
// antipattern to avoid), plus the historical-frequency rank mined from ALL past
// sessions (operator-prompt-route-map.json). So the model sees "tasks like this
// are class X (your Nth most common); do them in THIS order" before it acts.
//
// FAST + PURE: classifyRoutingClass + TASK_CLASS_POLICY are zero-I/O (no per-prompt
// cag/model/substrate calls -- those add latency to every turn). The route-map is
// read once (fail-soft: absent -> the policy route still injects, just no rank).
// Compact (injection-budget aware) + dedup-throttled so /loop bursts don't repeat.
//
// Knobs: PRISM_PROMPT_ROUTE_INJECT_DISABLE=1 (off) · PRISM_PROMPT_ROUTE_THROTTLE_MS.

import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { pathToFileURL } from "node:url";

const DISABLED = process.env.PRISM_PROMPT_ROUTE_INJECT_DISABLE === "1";
const PRISM = process.env.PRISM_ROOT || "H:/prism";
const MAP_PATH = path.join(PRISM, "state/shared/operator-prompt-route-map.json");
// U-SLASH-PLANS: per-command route-class plan (slash-command-plans.json). When
// present, the route block surfaces the SPECIFIC commands serving this class +
// the --query pointer. Fail-soft: absent -> existing behavior (rank+policy only).
const PLAN_PATH = path.join(PRISM, "state/shared/slash-command-plans.json");
const PLAN_DISABLED = process.env.PRISM_SLASH_PLAN_INJECT === "0";
// U-TASK-GRAPH-TEMPLATE WIRE: advisory-feature-catalog.json. When present, the route
// block surfaces the GATES that can hard-stop THIS task class (so a chat complies
// first-try) -- the highest-value live signal the route block previously lacked.
// Fail-soft: absent -> existing behavior (no gates line).
const CATALOG_PATH = path.join(PRISM, "state/shared/advisory-feature-catalog.json");
const CATALOG_DISABLED = process.env.PRISM_ROUTE_GATES_INJECT === "0";
const THROTTLE_MS = Number(process.env.PRISM_PROMPT_ROUTE_THROTTLE_MS) || 300000;
const THROTTLE_FILE = path.join(os.tmpdir(), "prism-hook-state", "prompt-route-inject.last.json");
const MIN_PROMPT_CHARS = 12;     // skip trivial "ok" / "try again" / ceremony

function readStdin() {
  try { return fs.readFileSync(0, "utf8"); } catch { return ""; }
}
function emit(ctx) {
  if (ctx) console.log(JSON.stringify({ hookSpecificOutput: { hookEventName: "UserPromptSubmit", additionalContext: ctx } }));
  else console.log(JSON.stringify({ continue: true }));
}

/** Pure: the human-typed core of a prompt (strip injected blocks + slash ceremony). */
export function humanCore(prompt) {
  let s = String(prompt || "").split("<system-reminder>")[0];
  const am = s.match(/<command-args>([\s\S]*?)<\/command-args>/);
  if (am) return am[1].trim();                  // a /command's args are the directive
  // A bare slash command (<command-name> with NO args) is pure ceremony, not a
  // human directive -- skip it (mirrors the extractor) so we don't inject a route
  // block for "/checkin-alpha" etc. (scrutiny P2, arms B+C).
  if (/<command-name>/.test(s)) return "";
  return s.replace(/<\/?[a-z-]+>/g, "").trim();
}

/** Pure: rank info for a class from the mined map (or null). */
export function rankFor(map, taskClass) {
  if (!map || !Array.isArray(map.classes)) return null;
  const idx = map.classes.findIndex((c) => c.taskClass === taskClass);
  if (idx < 0) return null;
  const c = map.classes[idx];
  return { rank: idx + 1, count: c.count, pct: c.pct, total: map.total };
}

/**
 * Pure: a compact line surfacing the SPECIFIC commands that serve this class
 * (U-SLASH-PLANS), top by classifier confidence, excluding the curated ones already
 * shown in policy.commands, plus the --query pointer for the full set. Returns null
 * when no class-specific plan exists (fail-soft -> route block is unchanged).
 */
export function renderClassCommandsLine(taskClass, classPlan, policyCommands = [], maxCmds = 6) {
  if (!Array.isArray(classPlan) || classPlan.length === 0) return null;
  const curated = new Set((policyCommands || []).map((c) => String(c).replace(/^\//, "")));
  const seen = new Set();
  const extras = [];
  for (const c of classPlan) {                    // already sorted by confidence desc
    if (!c || c.archived || curated.has(c.name) || seen.has(c.name)) continue;
    seen.add(c.name);                             // dedup names duplicated across sources
    extras.push(`/${c.name}`);
    if (extras.length >= maxCmds) break;
  }
  const more = extras.length ? extras.join(" ") : "(all curated above)";
  return `  +${classPlan.length} ${taskClass}-class commands -- more: ${more} | full when/how: node scripts/build-slash-command-plans.mjs --query ${taskClass}`;
}

/**
 * Pure: a compact loop/cron escalation line for this class (U-LOOP-CRON-POLICY).
 * Shown ONLY when a /loop or a recurring cron is actually worthwhile (the policy
 * value starts with "yes"), so one-shot classes (locate/plan/recall/quote/physics/
 * review) stay silent. Returns null otherwise. Directly serves the operator's
 * "harnessed loops/crons to keep looping until everything is done" directive.
 */
export function renderLoopCronLine(loopCron) {
  if (!loopCron) return null;
  const loopYes = /^yes/i.test(loopCron.loop || "");
  const cronYes = /^yes/i.test(loopCron.cron || "");
  if (!loopYes && !cronYes) return null;
  const parts = [];
  if (loopYes) parts.push(`LOOP ${loopCron.loop}`);
  if (cronYes) parts.push(`CRON ${loopCron.cron}`);
  return `  loop/cron: ${parts.join(" | ")}`;
}

/**
 * Pure: a compact execution-machinery line for this class (U-EXEC-POLICY) -- the
 * named harness, hermes-agent delegation, ollama-offload, and (for the high-stakes
 * classes) the octopus cross-vendor consensus pass to USE for the class.
 * Self-suppressing: a dim whose value is "no"/"none/..." (judgment-only or
 * inapplicable) -- or an absent key -- is omitted, so one-shot classes
 * (physics/recall/quote/session) stay terse and only the high-value classes
 * (build/learn/orchestrate/review/fix/plan/domain) surface their dims. The
 * consensus dim is present only on review/plan/orchestrate (cross-vendor
 * escalation); every other class omits it. Returns null when every dim is
 * suppressed. Directly serves the operator directive: "apply engineered loops/
 * harnesses/hermes/ollama/model-switching in the graph" (harness/hermes/ollama/
 * consensus; loop/cron + modelTier are the sibling axes rendered elsewhere).
 */
export function renderExecutionLine(execution) {
  if (!execution) return null;
  // A dim is "real" unless its value begins with no|none (with optional " --" tail).
  const real = (v) => {
    const s = String(v || "").trim();
    return s.length > 0 && !/^(no|none)\b/i.test(s);
  };
  const parts = [];
  if (real(execution.harness)) parts.push(`harness: ${execution.harness}`);
  if (real(execution.hermes)) parts.push(`hermes: ${execution.hermes}`);
  if (real(execution.ollama)) parts.push(`ollama: ${execution.ollama}`);
  // consensus (octopus multi-LLM) -- 4th dim, present only on review/plan/orchestrate
  // (cross-vendor escalation); absent keys are suppressed by real(). Mirrors the same
  // filter in buildRoutingDigest (scripts/lib/feature-routing-graph.mjs).
  if (real(execution.consensus)) parts.push(`consensus: ${execution.consensus}`);
  if (!parts.length) return null;
  return `  exec: ${parts.join(" | ")}`;
}

/**
 * Pure: a compact line surfacing the GATES that can HARD-STOP this task class
 * (U-TASK-GRAPH-TEMPLATE WIRE), sourced from advisory-feature-catalog.json. Shows the
 * class-specific block-gates (capped, with mute knobs) + the count of always-on
 * universal gates. Returns null when the catalog is absent or the class has no gates
 * (fail-soft -> route block unchanged). This is the live-surface form of the task-graph
 * template's "GATES that can hard-stop you" step -- so every prompt sees the hard stops
 * to comply with first-try, not just an on-demand CLI run.
 */
export function renderGatesLine(taskClass, catalog, maxGates = 5) {
  if (!catalog) return null;
  const cls = (catalog.byTaskClass && catalog.byTaskClass[taskClass]) || [];
  const classGates = cls.filter((f) => f && f.kind === "block-gate");
  const uniGates = (Array.isArray(catalog.universalFeatures) ? catalog.universalFeatures : [])
    .filter((f) => f && f.kind === "block-gate");
  if (!classGates.length && !uniGates.length) return null;
  const fmt = (g) => g.id + (g.knob ? `(mute:${g.knob})` : "");
  const parts = [];
  if (classGates.length) parts.push(`class: ${classGates.slice(0, maxGates).map(fmt).join(", ")}`);
  if (uniGates.length) parts.push(`+${uniGates.length} universal always-on gates`);
  // "MAY ... (if not env-muted)": the catalog's `wired` is HOOK_REGISTRY registration,
  // NOT live env-bypass state (e.g. stop_on_unwired_assets under PRISM_ALLOW_UNWIRED) --
  // so frame it conservatively + honestly (scrutiny P2, R12); each gate names its mute knob.
  return `  GATES that MAY hard-stop this (if not env-muted): ${parts.join(" | ")} -- comply first-try`;
}

/** Pure: render the compact order-of-operations block for a class. */
export function renderRouteBlock(taskClass, policy, rank, classPlan, showLoopCron = true, gatesLine = null) {
  if (!policy) return null;
  const lines = [];
  const rankStr = rank && rank.count > 0
    ? ` -- your #${rank.rank} most-common task type (${rank.count}x, ${rank.pct}% of history)`
    : "";
  lines.push(`## ROUTE -- task class: ${taskClass}${rankStr}`);
  lines.push(`Do it in THIS order (cheapest rung first; Claude is last):`);
  lines.push(`  1. substrates: ${policy.substrateLadder.join(" -> ")}`);
  lines.push(`  2. model: ${policy.modelTier}`);
  lines.push(`  3. commands: ${policy.commands.join(" -> ")}`);
  if (policy.autoInvoke && policy.autoInvoke.length) lines.push(`  4. auto-fire now: ${policy.autoInvoke.join(", ")}`);
  if (policy.doneWhen) lines.push(`  DONE-WHEN: ${policy.doneWhen}`);
  lines.push(`AVOID: ${policy.antipattern}`);
  if (gatesLine) lines.push(gatesLine);
  const planLine = renderClassCommandsLine(taskClass, classPlan, policy.commands);
  if (planLine) lines.push(planLine);
  if (showLoopCron) {
    const lcLine = renderLoopCronLine(policy.loopCron);
    if (lcLine) lines.push(lcLine);
    const execLine = renderExecutionLine(policy.execution);
    if (execLine) lines.push(execLine);
  }
  lines.push(`_Source: feature-routing-graph + operator-prompt-route-map + slash-command-plans. Disable: PRISM_PROMPT_ROUTE_INJECT_DISABLE=1._`);
  return lines.join("\n");
}

function loadJsonSafe(p) { try { return JSON.parse(fs.readFileSync(p, "utf8")); } catch { return null; } }
function throttleSkip(key) {
  try {
    const st = loadJsonSafe(THROTTLE_FILE) || {};
    const now = Date.now();
    if (st[key] && now - st[key] < THROTTLE_MS) return true;
    st[key] = now;
    for (const k of Object.keys(st)) if (now - st[k] > THROTTLE_MS * 4) delete st[k];
    fs.mkdirSync(path.dirname(THROTTLE_FILE), { recursive: true });
    fs.writeFileSync(THROTTLE_FILE, JSON.stringify(st));
  } catch { /* fail-open: do not block injection on a throttle-write error */ }
  return false;
}

async function main() {
  if (DISABLED) return emit(null);
  let payload = {};
  try { payload = JSON.parse(readStdin() || "{}"); } catch { /* noop */ }
  const core = humanCore(payload.prompt || "");
  if (!core || core.length < MIN_PROMPT_CHARS) return emit(null);   // trivial / ceremony

  // Pure classify (no per-prompt router I/O). Lazy-import so the hook still loads
  // if the lib is moved; fail-open to no injection on any import/parse fault.
  let classifyRoutingClass, TASK_CLASS_POLICY;
  try {
    const m = await import(pathToFileURL(path.join(PRISM, "scripts/lib/feature-routing-graph.mjs")).href);
    classifyRoutingClass = m.classifyRoutingClass;
    TASK_CLASS_POLICY = m.TASK_CLASS_POLICY;
  } catch { return emit(null); }

  const { taskClass, confidence } = classifyRoutingClass(core);
  if (!taskClass || confidence <= 0) return emit(null);   // no signal -> stay silent
  if (throttleSkip(`route:${taskClass}`)) return emit(null);

  const map = loadJsonSafe(MAP_PATH);
  const plan = PLAN_DISABLED ? null : loadJsonSafe(PLAN_PATH);
  const classPlan = plan && plan.byClass ? plan.byClass[taskClass] : null;
  const catalog = CATALOG_DISABLED ? null : loadJsonSafe(CATALOG_PATH);
  const gatesLine = renderGatesLine(taskClass, catalog);
  const showLoopCron = process.env.PRISM_LOOP_CRON_INJECT !== "0";
  const block = renderRouteBlock(taskClass, TASK_CLASS_POLICY[taskClass], rankFor(map, taskClass), classPlan, showLoopCron, gatesLine);
  return emit(block);
}

if (process.argv[1] && process.argv[1].replace(/\\/g, "/").endsWith("prompt-route-inject.mjs")) {
  main().catch(() => { try { console.log(JSON.stringify({ continue: true })); } catch { /* noop */ } });
}
