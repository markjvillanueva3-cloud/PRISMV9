#!/usr/bin/env node
// scripts/trigger-command-pipeline.mjs
//
// TRIGGER A HIGH-ROI COMMAND PIPELINE + OFFLOAD ITS MECHANICAL LLM STEP TO OLLAMA
// (BLACKWELL-TOKEN-SYNERGY-MS0 / U-CMD-OLLAMA-ROUTE, slot:bravo, 2026-06-04).
//
// Consumes the command→Ollama route registry (scripts/lib/command-ollama-routes.mjs)
// and turns the previously-advisory Ollama nudge into a single deterministic call.
// Instead of a chat reading "consider calling qwen2.5-coder" and ignoring it
// (live take-rate 0.6%), a chat runs ONE Bash command and the mechanical step
// (summarize / explain / triage / graph-search) executes on a LOCAL model for $0,
// never entering the Claude context window.
//
// USAGE:
//   node scripts/trigger-command-pipeline.mjs --list                 # ranked routable commands
//   node scripts/trigger-command-pipeline.mjs --plan <command> [arg] # show the plan, run nothing
//   node scripts/trigger-command-pipeline.mjs <command> [arg]        # execute the Ollama step(s)
//   node scripts/trigger-command-pipeline.mjs <command> [arg] --json # machine-readable result
//
// EXAMPLES:
//   node scripts/trigger-command-pipeline.mjs find "kienzle force"   # local graph search (free)
//   node scripts/trigger-command-pipeline.mjs explain src/foo.ts     # local code explanation
//   node scripts/trigger-command-pipeline.mjs close-out-audit        # summarize the drift report
//
// Each route's `script` (when present) is the backing pipeline a chat can run
// directly to trigger the command's *intention* (e.g. /close-out-audit →
// scripts/audit-close-out-candidates.mjs). This runner does NOT run that script
// itself — it offloads the LLM-heavy step. The plan prints the backing script so
// the operator can run it first when the step needs the artifact it produces.
//
// EXIT CODES: 0 ok · 2 usage error / unknown command · 3 an Ollama step failed.
//
// Design: pure plan-builders (exported, unit-tested) + a thin impure exec shell
// that shells out to scripts/ask-ollama.mjs. Fail-loud (R12) on every path.
//
// @module trigger-command-pipeline

import { fileURLToPath } from "node:url";
import { dirname, resolve, join } from "node:path";
import { execFile } from "node:child_process";
import { promisify } from "node:util";
import {
  getRoute,
  listRoutes,
  routeSavings,
  FILE_MODES,
} from "./lib/command-ollama-routes.mjs";

const execFileAsync = promisify(execFile);
const HERE = dirname(fileURLToPath(import.meta.url));
/** Absolute path to the local-LLM execution surface this runner offloads to. */
export const ASK_OLLAMA = join(HERE, "ask-ollama.mjs");
/** Per-step ask-ollama timeout (ms) — covers a cold model load on a busy host. */
const STEP_TIMEOUT_MS = 240000;
/** ask-ollama stdout cap (bytes) — a synthesized answer is small; this is headroom. */
const STEP_MAX_BUFFER = 16 * 1024 * 1024;

/**
 * Resolve a step's concrete input string from the registry step + the CLI arg.
 * - kind "path": the fixed repo-relative path the backing script owns (no CLI arg needed).
 * - kind "cli-arg": the argument the operator passed; REQUIRED (fail loud if absent).
 * Returns { ok:true, input } or { ok:false, error }.
 *
 * @param {{input:{kind:string,value?:string}}} step
 * @param {string|undefined} cliArg
 */
export function resolveStepInput(step, cliArg) {
  const kind = step && step.input && step.input.kind;
  if (kind === "path") {
    const v = step.input.value;
    if (!v) return { ok: false, error: "registry error: path-input step has no value" };
    return { ok: true, input: v };
  }
  if (kind === "cli-arg") {
    if (typeof cliArg !== "string" || !cliArg.trim()) {
      return { ok: false, error: `step '${step.label}' needs an argument (${FILE_MODES.includes(step.mode) ? "a file path" : "a query"})` };
    }
    return { ok: true, input: cliArg.trim() };
  }
  return { ok: false, error: `unknown input kind: ${kind}` };
}

/**
 * Build the argv passed to ask-ollama.mjs (the slice AFTER the script path) for
 * one step + resolved input. Always requests --json so the runner can parse a
 * structured result. Adds --model only when the step pins one (else ask-ollama
 * picks the host-aware default). Pure.
 *
 * @param {{mode:string, model:(string|null)}} step
 * @param {string} input
 * @returns {string[]}
 */
export function buildStepArgv(step, input) {
  const argv = [step.mode, input, "--json"];
  if (step.model) argv.push("--model", String(step.model));
  return argv;
}

/**
 * Build the full execution plan for a command: resolve every step's input + argv
 * without running anything. Returns { ok:false, error, known } for an unknown
 * command (known = list of routable names) so the CLI can fail loud with help.
 *
 * @param {string} command
 * @param {string|undefined} cliArg
 * @returns {{ok:boolean, command?:string, script?:(string|null), intent?:string,
 *            claudeKeeps?:string, totalSaves?:number,
 *            steps?:Array<{label:string,mode:string,saves:number,note:string,
 *                          input?:string,argv?:string[],error?:string}>,
 *            error?:string, known?:string[]}}
 */
export function planPipeline(command, cliArg) {
  const route = getRoute(command);
  if (!route) {
    return {
      ok: false,
      error: `no Ollama route for command '${command}'`,
      known: listRoutes().map((r) => r.command),
    };
  }
  const steps = route.ollamaSteps.map((s) => {
    const resolved = resolveStepInput(s, cliArg);
    if (!resolved.ok) {
      return { label: s.label, mode: s.mode, saves: s.saves, note: s.note, error: resolved.error };
    }
    return {
      label: s.label,
      mode: s.mode,
      saves: s.saves,
      note: s.note,
      input: resolved.input,
      argv: buildStepArgv(s, resolved.input),
    };
  });
  return {
    ok: true,
    command: route.command,
    script: route.script,
    intent: route.intent,
    claudeKeeps: route.claudeKeeps,
    totalSaves: routeSavings(route),
    steps,
  };
}

/** Render a plan as human-readable text (used by --plan and before execution). */
export function renderPlan(plan) {
  if (!plan.ok) {
    return `[trigger-command-pipeline] ${plan.error}\nRoutable commands: ${(plan.known || []).join(", ")}`;
  }
  const lines = [];
  lines.push(`/${plan.command} — ${plan.intent}`);
  lines.push(
    plan.script
      ? `  trigger the pipeline directly:  node ${plan.script}`
      : `  (skill-orchestrated — no single backing script)`,
  );
  lines.push(`  Ollama offload (~${plan.totalSaves} Claude tokens saved/run):`);
  for (const s of plan.steps) {
    if (s.error) {
      lines.push(`    ✗ ${s.label} [${s.mode}] — ${s.error}`);
    } else {
      lines.push(`    • ${s.label} [${s.mode}] → node scripts/ask-ollama.mjs ${s.argv.join(" ")}`);
      lines.push(`        ${s.note}`);
    }
  }
  lines.push(`  Claude keeps: ${plan.claudeKeeps}`);
  return lines.join("\n");
}

/** Render the ranked routable-command list (--list). */
export function renderList() {
  const rows = listRoutes().map((r) => {
    const aliases = r.aliases.length ? ` (aka ${r.aliases.join(", ")})` : "";
    const modes = r.ollamaSteps.map((s) => s.mode).join("+");
    const backing = r.script ? "script" : "skill";
    return `  ~${String(routeSavings(r)).padStart(4)} tok  /${r.command}${aliases}  [${modes}, ${backing}]`;
  });
  return ["Ollama-routable commands (ranked by est. Claude tokens saved/run):", ...rows].join("\n");
}

/**
 * Execute one step's ask-ollama call. Returns { ok, answer, source, raw } or
 * { ok:false, error }. Never throws. ask-ollama emits --json; we parse it and
 * extract the compact answer (file modes → `answer`; viz → `hits`). On a
 * non-zero exit, ask-ollama's own fail-loud message is surfaced.
 *
 * @param {string[]} argv  the ask-ollama argv (from buildStepArgv)
 * @param {{execFileImpl?:Function, nodeBin?:string, askOllamaPath?:string}} [deps]
 */
export async function runStep(argv, deps = {}) {
  const {
    execFileImpl = execFileAsync,
    nodeBin = process.execPath,
    askOllamaPath = ASK_OLLAMA,
  } = deps;
  try {
    const { stdout } = await execFileImpl(nodeBin, [askOllamaPath, ...argv], {
      timeout: STEP_TIMEOUT_MS,
      maxBuffer: STEP_MAX_BUFFER,
    });
    const text = String(stdout || "").trim();
    let parsed;
    try {
      parsed = JSON.parse(text);
    } catch {
      // ask-ollama printed non-JSON (shouldn't happen with --json) — return raw.
      return { ok: true, answer: text, source: "raw", raw: text };
    }
    if (parsed.answer != null) return { ok: true, answer: String(parsed.answer), source: parsed.model || "ollama", raw: parsed };
    // Real hits always win — viz degrades gracefully, so non-empty hits are the
    // value even if a (bonus) --synth pass errored alongside them.
    if (Array.isArray(parsed.hits) && parsed.hits.length > 0) {
      return { ok: true, answer: renderHitsCompact(parsed.hits), source: "viz", raw: parsed };
    }
    // No usable answer/hits: an ollamaError here is a genuine failure.
    if (parsed.ollamaError) return { ok: false, error: `Ollama: ${parsed.ollamaError}` };
    // A legitimately empty hit set (search ran, found nothing) is not an error.
    if (Array.isArray(parsed.hits)) return { ok: true, answer: renderHitsCompact(parsed.hits), source: "viz", raw: parsed };
    return { ok: true, answer: text, source: "raw", raw: parsed };
  } catch (e) {
    // ask-ollama exited non-zero (usage / infra failure). Its stderr carries the
    // fail-loud reason. With --json, a GENERATION failure now emits a structured
    // Sonnet-fallback signal there ({ollamaUnavailable, lane:"claude", reason}) --
    // parse it so the runner surfaces the CLEAN reason AND propagates the fallback
    // lane (the operator-directed Claude-fallback flowing through the pipeline,
    // OLLAMA-FLEET-AUDIT P0-3). Non-JSON stderr (usage errors) surfaces verbatim.
    const raw = (e && (e.stderr || e.message)) ? String(e.stderr || e.message).trim() : String(e);
    try {
      const sig = JSON.parse(raw);
      if (sig && sig.ollamaUnavailable) {
        return { ok: false, error: sig.reason || sig.directive || raw, fallback: sig.lane || "claude" };
      }
    } catch { /* not a JSON fallback signal -- surface verbatim below */ }
    return { ok: false, error: raw };
  }
}

/** Compact one-line-per-hit render of viz hits (mirror of ask-ollama renderHits, JSON shape). */
export function renderHitsCompact(hits) {
  if (!Array.isArray(hits) || !hits.length) return "(no matching graph nodes)";
  return hits
    .map((h, i) => `${i + 1}. [${h.id}] ${h.label}${h.info ? ` — ${h.info}` : ""}`)
    .join("\n");
}

// ─────────────────────────────────────────────────────────────────────────
// CLI
// ─────────────────────────────────────────────────────────────────────────

const USAGE = `trigger-command-pipeline — run a high-ROI command's mechanical LLM step on local Ollama

  node scripts/trigger-command-pipeline.mjs --list
  node scripts/trigger-command-pipeline.mjs --plan <command> [arg]
  node scripts/trigger-command-pipeline.mjs <command> [arg] [--json]`;

/** Parse CLI argv (slice after the script path). Pure. */
export function parseArgs(argv) {
  const out = { list: false, plan: false, json: false, command: null, arg: null };
  const positional = [];
  for (const a of argv) {
    if (a === "--list") out.list = true;
    else if (a === "--plan") out.plan = true;
    else if (a === "--json") out.json = true;
    else positional.push(a);
  }
  out.command = positional.shift() || null;
  out.arg = positional.length ? positional.join(" ") : null;
  return out;
}

async function main() {
  const opts = parseArgs(process.argv.slice(2));

  if (opts.list) {
    console.log(renderList());
    return 0;
  }
  if (!opts.command) {
    console.error(USAGE);
    return 2;
  }

  const plan = planPipeline(opts.command, opts.arg);
  if (!plan.ok) {
    console.error(renderPlan(plan));
    return 2;
  }
  if (opts.plan) {
    console.log(renderPlan(plan));
    return 0;
  }

  // Execute. Any step with a resolve error → fail loud (don't run a broken plan).
  const broken = plan.steps.find((s) => s.error);
  if (broken) {
    console.error(`[trigger-command-pipeline] ${broken.error}\n\n${renderPlan(plan)}`);
    return 2;
  }

  // Sequential ON PURPOSE (not an N+1 bug): one Ollama instance serves one
  // /api/generate per model at a time, so parallel steps would serialize on the
  // daemon anyway while multiplying peak VRAM/cold-load pressure. Most routes
  // have a single step; the few multi-step ones are cheap to run in order.
  const results = [];
  let anyFail = false;
  for (const s of plan.steps) {
    const r = await runStep(s.argv);
    results.push({ step: s.label, mode: s.mode, ...r });
    if (!r.ok) anyFail = true;
  }

  if (opts.json) {
    console.log(JSON.stringify({ command: plan.command, totalSaves: plan.totalSaves, results }, null, 2));
    return anyFail ? 3 : 0;
  }

  const out = [];
  for (const r of results) {
    out.push(`── ${r.step} [${r.mode}] ${r.ok ? `· via ${r.source}` : "· FAILED"} ──`);
    out.push(r.ok ? r.answer : `[error] ${r.error}`);
    out.push("");
  }
  out.push(`↓ offloaded ~${plan.totalSaves} Claude tokens to local Ollama. Claude keeps: ${plan.claudeKeeps}`);
  (anyFail ? console.error : console.log)(out.join("\n"));
  return anyFail ? 3 : 0;
}

const INVOKED_DIRECTLY =
  process.argv[1] && resolve(process.argv[1]) === resolve(fileURLToPath(import.meta.url));
if (INVOKED_DIRECTLY) {
  void main()
    .then((code) => process.exit(code))
    .catch((e) => {
      console.error(`[trigger-command-pipeline] fatal: ${e && e.stack ? e.stack : e}`);
      process.exit(1);
    });
}
