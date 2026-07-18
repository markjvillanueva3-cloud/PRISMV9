#!/usr/bin/env node
// tier: T2
/**
 * task-start-substrate-inject.mjs -- RGS-PLANNING-LOOP-BRIDGE-MS0/U7 (2026-06-11, slot:tango)
 *
 * UserPromptSubmit / SubagentStart injector. When a /loop is ACTIVE for this
 * session, surface the U2 substrate-routing plan (Ollama / Obsidian / Hermes /
 * Master-graph / PSN -- when/how/max-out) for the loop's current task, so each
 * iteration starts knowing which substrate to use, when, and how to max it out.
 *
 * Fires ONLY when an active loop-state exists (real task context) -> no noise on
 * ordinary prompts. Populates routeTask's ctx fully (slot + cores + scale hints)
 * so the Hermes lane appears and forgeConcurrencyCap does not under-report
 * (U-SPEC-V2 fix-P2). Advisory: always exit 0; a failure NEVER blocks the prompt.
 *
 * Knob: PRISM_SUBSTRATE_INJECT=0 disables.
 */
import { readFileSync } from "node:fs";
import * as fs from "node:fs";
import * as path from "node:path";
import { fileURLToPath } from "node:url";
import { routeTask } from "../../scripts/lib/task-substrate-router.mjs";
import { dedupeOrMarker } from "../../scripts/lib/injection-dedup-fs.mjs";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const LOOP_DIR = path.join(ROOT, "state", "shared", "loop-state");
const ENABLED = process.env.PRISM_SUBSTRATE_INJECT !== "0";

function readStdin() { try { return readFileSync(0, "utf8"); } catch { return ""; } }
function safeSid(sid) { return String(sid || "").replace(/[^A-Za-z0-9_-]/g, "_").slice(0, 64) || "global"; }

/** The active running loop-state for this session, or null. Reads one file. */
function readActiveLoop(sessionId) {
  if (!sessionId) return null;
  try {
    const s = JSON.parse(fs.readFileSync(path.join(LOOP_DIR, `loop-${safeSid(sessionId)}.json`), "utf8"));
    return s && s.status === "running" ? s : null;
  } catch { return null; }
}

// U3: planning-command trigger (Path B). Knob PRISM_SUBSTRATE_INJECT_PLAN=0 disables
// JUST the planning branch (the master PRISM_SUBSTRATE_INJECT=0 still kills everything).
const PLAN_ENABLED = process.env.PRISM_SUBSTRATE_INJECT_PLAN !== "0";
const PLAN_TRIGGER_RE = /\/(checkin|goal|propose-goal|rgs\d?|pick-(unit|dev|task|build-close)|plan-build|smart)\b/i;
/** Matched planning-command label, or null. PURE. */
function planCommand(prompt) {
  const m = String(prompt || "").match(PLAN_TRIGGER_RE);
  return m ? `plan: ${m[1]}` : null;
}

/** Heuristic scale hints from the task text (gate the Hermes lane honestly). */
function ctxFromTask(task, slot) {
  const t = String(task || "").toLowerCase();
  return {
    slot: slot || undefined,
    openEnded: /\b(all|every|comprehensive|sweep|audit|exhaustive|entire|across)\b/.test(t),
    needsVerification: /\b(verify|validate|review|adversarial|scrutin|prove)\b/.test(t),
    cores: Number(process.env.NUMBER_OF_PROCESSORS) || undefined,
  };
}

function render(plan, task, title = "Substrate routing for this loop task (U2)") {
  const lines = [
    `## ${title}`,
    `_task: ${String(task).slice(0, 90)}_`,
    `**Primary executor:** ${plan.primary.executor}${plan.primary.model ? `/${plan.primary.model}` : ""} -- ${plan.primary.why}`,
    `**Hermes fan-out:** ${plan.hermesGated ? `ON (cap ${plan.concurrencyCap})` : "off (no scale signal)"}`,
    "",
    "| substrate | when | how |",
    "|---|---|---|",
    ...plan.substrates.map((s) => `| **${s.name}** | ${s.when} | ${s.how} |`),
    "",
    "_Disable: PRISM_SUBSTRATE_INJECT=0. Routing: scripts/lib/task-substrate-router.mjs (U2)._",
  ];
  return lines.join("\n");
}

function main() {
  if (!ENABLED) process.exit(0);
  let payload = {};
  try { payload = JSON.parse(readStdin() || "{}"); } catch { process.exit(0); }
  const sessionId = payload.session_id || payload.sessionId;
  const eventName = payload.hook_event_name || "UserPromptSubmit";
  const loop = readActiveLoop(sessionId);

  let context = "";
  try {
    if (loop) {
      // Path A: active /loop -> route the loop's current task.
      const plan = routeTask(loop.task, "orchestrate", ctxFromTask(loop.task, loop.slot));
      context = render(plan, loop.task);
    } else if (PLAN_ENABLED) {
      // Path B (U3): no active loop, but a PLANNING command -> surface the matrix
      // so the model pulls vault + master-graph context BEFORE it plans.
      const cmd = planCommand(payload.prompt);
      if (!cmd) process.exit(0); // not a planning command -> no noise
      const plan = routeTask(cmd, "design", ctxFromTask(payload.prompt));
      context = render(plan, cmd, "Substrate routing for PLANNING (pull context before you plan)");
    } else {
      process.exit(0); // no loop + planning branch disabled
    }
  } catch { process.exit(0); }
  if (!context) process.exit(0);

  // U-INJECT-DRIFT-FIX (india 2026-06-12): a /loop re-emits the identical substrate block every
  // iteration -- dedup-suppress the repeat (1490B/fire). Fail-soft on any error / no session id.
  const deduped = dedupeOrMarker(context, { sessionId, hookName: "task-start-substrate-inject", root: ROOT });
  console.log(JSON.stringify({
    hookSpecificOutput: { hookEventName: eventName, additionalContext: deduped },
  }));
  process.exit(0);
}

main();
