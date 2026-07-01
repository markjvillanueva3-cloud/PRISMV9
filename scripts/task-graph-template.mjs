#!/usr/bin/env node
// scripts/task-graph-template.mjs
//
// ROUTING-GRAPH-COMPLETENESS / U-TASK-GRAPH-TEMPLATE (slot:alpha 2026-06-17). Operator
// directive: "make a template of the graph that you can auto fill with relevant data
// for the task you're trying to accomplish so you always follow the same thorough
// workflow."
//
// This is the SYNTHESIS layer: the four routing artifacts each answer one slice --
//   feature-routing-graph.mjs (TASK_CLASS_POLICY)   -> the per-class ladder/model/cmds/exec
//   operator-prompt-route-map.json                  -> how COMMON this task type is (rank)
//   slash-command-plans.json                        -> the SPECIFIC commands that serve the class
//   advisory-feature-catalog.json (U-ADVISORY-CATALOG) -> the GATES that will block + ADVISORS
//                                                      that will fire while you work
// ...but nothing FILLS one template from all four for a concrete task. fillTemplate()
// is that: given a task prompt it auto-fills ONE structured "thorough workflow" graph
// -- the same shape every time -- so a chat (or the operator) follows an identical,
// complete routine for any task. DETERMINISTIC (R5: pure compose over the artifacts;
// no model). The THREE JSON artifacts (route-map/slash-plans/catalog) fail open --
// each missing/corrupt one degrades that slot to null/[], never throws. The routing-
// graph module itself is a HARD in-repo dependency (it is the base every slot composes
// around); if it is somehow absent, fillTemplate rejects and the CLI fails LOUD (R12) --
// it is not a fail-open slot.
//
// Run:   node H:/prism/scripts/task-graph-template.mjs "<task prompt>"   [--json]
// Lib:   import { fillTemplate, composeTemplate, renderTemplate } from "./task-graph-template.mjs"

import fs from "node:fs";
import path from "node:path";
import { pathToFileURL } from "node:url";

const PRISM = process.env.PRISM_ROOT || "H:/prism";
const ROUTE_MAP = path.join(PRISM, "state/shared/operator-prompt-route-map.json");
const SLASH_PLANS = path.join(PRISM, "state/shared/slash-command-plans.json");
const CATALOG = path.join(PRISM, "state/shared/advisory-feature-catalog.json");
const MAX_CLASS_CMDS = 8;       // cap the class-specific command list (artifact hygiene)
const MAX_UNIVERSAL_GATES = 8;  // universal bucket is large (~200); surface the hard stops only

// ---- pure, testable core ---------------------------------------------------

/**
 * Pure: rank info for a class from the mined prompt-route map (or null). Mirrors
 * prompt-route-inject.rankFor so the template reports the SAME "your #N most-common
 * task type (Kx, P%)" the live inject does.
 */
export function rankForClass(map, taskClass) {
  const classes = map && Array.isArray(map.classes) ? map.classes : null;
  if (!classes) return null;
  const idx = classes.findIndex((c) => c.taskClass === taskClass);
  if (idx < 0) return null;
  const c = classes[idx];
  return { rank: idx + 1, count: c.count, pct: c.pct, total: map.total || null };
}

/**
 * Pure: split a catalog class-feature list into { gates, advisors } by behavioralKind.
 * gates = block-gate (can HARD-STOP the task); advisors = advisory-inject (surface
 * context). Other kinds are not in the catalog projection, so this is total over input.
 */
export function splitFeatures(featList) {
  const gates = [], advisors = [];
  for (const f of (Array.isArray(featList) ? featList : [])) {
    if (f && f.kind === "block-gate") gates.push(f);
    else if (f && f.kind === "advisory-inject") advisors.push(f);
  }
  return { gates, advisors };
}

/**
 * Pure: compose ONE filled task-graph template from the already-resolved parts.
 * `route` is feature-routing-graph.routeTaskClass()'s return (or a {taskClass,
 * confidence, policy} subset). `rank` is rankForClass() or null. `classCmds` is the
 * slash-command-plans byClass[class] array or []. `classFeatures` is the catalog
 * byTaskClass[class] array or []; `universalFeatures` the catalog universal bucket or [].
 * Returns the structured template object (the auto-filled graph).
 */
export function composeTemplate({ prompt, route, rank, classCmds, classFeatures, universalFeatures }) {
  const taskClass = route.taskClass;
  const policy = route.policy || {};
  const curated = new Set((policy.commands || []).map((c) => String(c).replace(/^\//, "")));
  // class-specific commands not already in the curated policy list, by confidence desc.
  const extraCmds = [];
  for (const c of (Array.isArray(classCmds) ? classCmds : [])) {
    if (!c || c.archived || curated.has(c.name) || extraCmds.includes(c.name)) continue;
    extraCmds.push(c.name);
    if (extraCmds.length >= MAX_CLASS_CMDS) break;
  }
  const cls = splitFeatures(classFeatures);
  const uni = splitFeatures(universalFeatures);
  return {
    task: String(prompt || "").replace(/\s+/g, " ").trim().slice(0, 160),
    taskClass,
    confidence: Number((route.confidence || 0).toFixed(2)),
    rank: rank || null,
    workflow: {
      substrateLadder: policy.substrateLadder || [],
      modelTier: policy.modelTier || null,
      curatedCommands: policy.commands || [],
      classCommands: extraCmds,
      autoInvoke: policy.autoInvoke || [],
      loopCron: policy.loopCron || null,
      execution: policy.execution || null,
      doneWhen: policy.doneWhen || null,
      antipattern: policy.antipattern || null,
    },
    features: {
      // gates that can HARD-STOP this task (class-specific first, then universal hard stops)
      classGates: cls.gates,
      classAdvisors: cls.advisors,
      universalGates: uni.gates.slice(0, MAX_UNIVERSAL_GATES),
      universalGateCount: uni.gates.length,
      universalAdvisorCount: uni.advisors.length,
    },
  };
}

/**
 * Pure: render a filled template as the repeatable ordered-workflow checklist (the
 * "always follow the same thorough workflow" the operator asked for). Stable shape:
 * every task yields the same numbered routine, auto-filled with the task's data.
 */
export function renderTemplate(t) {
  if (!t || !t.taskClass) return "";
  const w = t.workflow || {};
  const f = t.features || {};
  const L = [];
  const rankStr = t.rank && t.rank.count
    ? ` -- #${t.rank.rank} most-common (${t.rank.count}x, ${t.rank.pct}% of history)`
    : "";
  L.push(`# TASK-GRAPH: ${t.taskClass} (conf ${Math.round((t.confidence || 0) * 100)}%)${rankStr}`);
  L.push(`task: ${t.task || "(none)"}`);
  L.push(`1. SUBSTRATES (cheapest first): ${(w.substrateLadder || []).join(" -> ") || "(none)"}`);
  L.push(`2. MODEL: ${w.modelTier || "(judgment)"}`);
  const cmds = [...(w.curatedCommands || []), ...(w.classCommands || []).map((c) => `/${c}`)];
  L.push(`3. COMMANDS: ${cmds.join(" -> ") || "(none)"}`);
  if (w.autoInvoke && w.autoInvoke.length) L.push(`   auto-fire now: ${w.autoInvoke.join(", ")}`);
  // GATES that will block -- the highest-value line: comply first-try.
  const gateStr = (arr) => arr.map((g) => g.id + (g.knob ? `(mute:${g.knob})` : "")).join(", ");
  const allGateLines = [];
  if (f.classGates && f.classGates.length) allGateLines.push(`class: ${gateStr(f.classGates)}`);
  if (f.universalGates && f.universalGates.length) {
    const extra = (f.universalGateCount || 0) - f.universalGates.length;
    allGateLines.push(`universal: ${gateStr(f.universalGates)}${extra > 0 ? ` (+${extra} more)` : ""}`);
  }
  // "MAY ... (if not env-muted)": catalog `wired` is registration, not live bypass
  // state -- honest framing (scrutiny P2, R12); each gate carries its mute knob.
  L.push(`4. GATES that MAY hard-stop you (if not env-muted): ${allGateLines.length ? allGateLines.join(" | ") : "(none)"}`);
  const advisorN = (f.classAdvisors ? f.classAdvisors.length : 0) + (f.universalAdvisorCount || 0);
  const classAdv = (f.classAdvisors || []).map((a) => a.id).slice(0, 6).join(", ");
  L.push(`5. ADVISORS that will fire (${advisorN}): ${classAdv || "(class-specific: none)"}${f.universalAdvisorCount ? ` + ${f.universalAdvisorCount} universal` : ""}`);
  if (w.loopCron) {
    const lc = [];
    if (/^yes/i.test(w.loopCron.loop || "")) lc.push(`LOOP ${w.loopCron.loop}`);
    if (/^yes/i.test(w.loopCron.cron || "")) lc.push(`CRON ${w.loopCron.cron}`);
    if (lc.length) L.push(`6. LOOP/CRON: ${lc.join(" | ")}`);
  }
  if (w.execution) {
    const real = (v) => { const s = String(v || "").trim(); return s && !/^(no|none)\b/i.test(s); };
    // 3rd mirror of the execution-dim filter (with buildRoutingDigest + renderExecutionLine):
    // consensus (octopus multi-LLM) is the 4th dim, present only on review/plan/orchestrate.
    const ex = ["harness", "hermes", "ollama", "consensus"].filter((k) => real(w.execution[k])).map((k) => `${k}: ${w.execution[k]}`);
    if (ex.length) L.push(`7. EXEC: ${ex.join(" | ")}`);
  }
  if (w.doneWhen) L.push(`   DONE-WHEN (loop until zero): ${w.doneWhen}`);
  L.push(`8. AVOID: ${w.antipattern || "(none)"}`);
  L.push(`_source: feature-routing-graph + operator-prompt-route-map + slash-command-plans + advisory-feature-catalog (U-TASK-GRAPH-TEMPLATE)_`);
  return L.join("\n");
}

// ---- I/O: fill the template for a concrete prompt --------------------------

function loadJsonSafe(p) { try { return JSON.parse(fs.readFileSync(p, "utf8")); } catch { return null; } }

/**
 * Resolve + compose the filled template for a prompt. Lazy-imports the routing graph
 * and reads the three JSON artifacts; each missing slot degrades to null/[] (fail-open).
 */
export async function fillTemplate(prompt, opts = {}) {
  const graph = await import(pathToFileURL(path.join(PRISM, "scripts/lib/feature-routing-graph.mjs")).href);
  // prefer the full router (composes live ctx/model) but fall back to the pure
  // classifier + policy if the live routers are unavailable (fail-open).
  let route;
  try {
    route = await graph.routeTaskClass(String(prompt || ""), opts.ctx || {});
  } catch {
    const r = graph.classifyRoutingClass(String(prompt || ""));
    route = { taskClass: r.taskClass, confidence: r.confidence, policy: graph.TASK_CLASS_POLICY[r.taskClass] };
  }
  const taskClass = route.taskClass;
  const map = loadJsonSafe(ROUTE_MAP);
  const plans = loadJsonSafe(SLASH_PLANS);
  const catalog = loadJsonSafe(CATALOG);
  return composeTemplate({
    prompt,
    route,
    rank: rankForClass(map, taskClass),
    classCmds: plans && plans.byClass ? plans.byClass[taskClass] : [],
    classFeatures: catalog && catalog.byTaskClass ? catalog.byTaskClass[taskClass] : [],
    universalFeatures: catalog ? catalog.universalFeatures : [],
  });
}

// ---- CLI -------------------------------------------------------------------

const isMain = process.argv[1] && process.argv[1].replace(/\\/g, "/").endsWith("task-graph-template.mjs");
if (isMain) {
  const asJson = process.argv.includes("--json");
  const prompt = process.argv.slice(2).filter((a) => a !== "--json").join(" ");
  if (!prompt.trim()) { console.error('usage: task-graph-template.mjs "<task prompt>" [--json]'); process.exit(1); }
  fillTemplate(prompt).then((t) => {
    console.log(asJson ? JSON.stringify(t, null, 2) : renderTemplate(t));
  }).catch((e) => { console.error("task-graph-template failed:", e?.message || e); process.exit(1); });
}
