#!/usr/bin/env node
/**
 * assess-cloud-candidate.mjs -- benchmark an OpenRouter cloud model (e.g. a new candidate
 * such as glm-5.2) against a baseline on PRISM's VERIFIABLE capability battery
 * (lib/ollama-capability-battery.mjs -- R8: the SAME measuring stick the local Ollama probe
 * uses, so a cloud model's pass-rate is comparable to a local model's). Each battery case has
 * a KNOWN answer + a code verify(), so the pass-rate is real correctness, not vibes
 * ("model trust is worthless; code verification is everything").
 *
 * WHY (slot:papa 2026-06-17, operator "do it all" -> "add GLM-5 as a benchmarked candidate"):
 * the registry (openrouter-client.mjs) marks glm-5.2/5.1 candidate:true but a candidate is
 * promoted to a routing rung in model-routing-policy.mjs ONLY on assessment evidence. This is
 * the assessment -- run it, read the matrix, decide.
 *
 * SAFE BY DEFAULT: dry-run unless --run. --run POSTs every battery prompt to OpenRouter (a
 * THIRD PARTY) and, for PAID models (glm-5.2 is paid), spends real money. The dry-run prints
 * the plan + an upper-bound cost estimate first so the spend is never a surprise. Reuses
 * callOpenRouter (key handling, secret redaction, fail-soft -- never throws).
 *
 * Pure core (buildRunPlan / estimatePlanCostUsd / runAssessment with an injected caller) is
 * exported + hermetically unit-tested; the thin CLI shell wires the real callOpenRouter.
 *
 * CLI:
 *   node scripts/assess-cloud-candidate.mjs --models glm-5.2,nemotron-super-free \
 *        [--baseline nemotron-super-free] [--run] [--json] [--max-tokens 64] [--timeout 60000]
 *   (no --run -> dry-run: prints plan + est cost, hits nothing.)
 * Exit codes: 0 ok (or dry-run) - 2 usage error - 3 no key for --run.
 */

import { fileURLToPath } from "node:url";
import { resolve } from "node:path";
import { TASK_BATTERY, scoreMatrix } from "./lib/ollama-capability-battery.mjs";
import {
  callOpenRouter, OPENROUTER_MODELS, resolveModelSlug, costFor, keyStatus,
} from "./lib/openrouter-client.mjs";

const CHARS_PER_TOKEN = 4;            // shared back-of-envelope ratio (matches openrouter-client)
const DEFAULT_MAX_TOKENS = 64;        // battery answers are single labels/numbers -- 64 is plenty

/**
 * Pure: flatten the battery into a flat list of run items for the given models.
 * One item per (model, task, case). Pure -- deterministic order (model-major).
 */
export function buildRunPlan(models, battery = TASK_BATTERY) {
  const plan = [];
  for (const model of Array.isArray(models) ? models : []) {
    for (const task of battery) {
      for (let i = 0; i < task.cases.length; i++) {
        plan.push({ model, taskId: task.id, category: task.category, caseIndex: i });
      }
    }
  }
  return plan;
}

/**
 * Pure: an UPPER-BOUND USD cost estimate for running the battery against each model. Assumes
 * every call uses the full maxTokens completion (worst case) + prompt-length/4 prompt tokens.
 * Free-tier models return 0. Returns { perModel: {model: usd}, totalUsd }.
 */
export function estimatePlanCostUsd(models, { maxTokens = DEFAULT_MAX_TOKENS, battery = TASK_BATTERY } = {}) {
  const perModel = {};
  let totalUsd = 0;
  for (const model of Array.isArray(models) ? models : []) {
    let promptTokens = 0;
    let completionTokens = 0;
    for (const task of battery) {
      for (const c of task.cases) {
        promptTokens += Math.ceil(String(task.prompt(c)).length / CHARS_PER_TOKEN);
        completionTokens += maxTokens;
      }
    }
    const usd = costFor({ prompt_tokens: promptTokens, completion_tokens: completionTokens }, model);
    perModel[model] = usd;
    totalUsd += usd;
  }
  return { perModel, totalUsd };
}

/**
 * Run the battery against each model through an INJECTED caller and score it. The caller
 * signature mirrors callOpenRouter's result: callImpl({model, prompt, maxTokens}) ->
 * { ok, text, usage, durationMs, error }. Returns { results, matrix, agg } where:
 *   results = [{taskId, category, model, pass}]   (feeds scoreMatrix; reused as-is)
 *   matrix  = scoreMatrix(results)
 *   agg     = { model: { pass, total, errors, latencyMsSum, costUsd, passRate, avgLatencyMs } }
 * A failed/errored call counts as a FAIL (never silently skipped -- R12). Never throws.
 */
export async function runAssessment({ models, callImpl, battery = TASK_BATTERY, maxTokens = DEFAULT_MAX_TOKENS }) {
  const results = [];
  const agg = {};
  const mlist = Array.isArray(models) ? models : [];
  for (const task of battery) {
    for (let i = 0; i < task.cases.length; i++) {
      const c = task.cases[i];
      const prompt = task.prompt(c);
      for (const model of mlist) {
        let r;
        try {
          r = await callImpl({ model, prompt, maxTokens });
        } catch (e) {
          r = { ok: false, error: `caller threw: ${e && e.message ? e.message : String(e)}` };
        }
        r = r || { ok: false, error: "caller returned nothing" };
        let pass = false;
        if (r.ok) {
          try { pass = !!task.verify(r.text, c); } catch { pass = false; }
        }
        results.push({ taskId: task.id, category: task.category, model, pass });
        const a = (agg[model] ||= { pass: 0, total: 0, errors: 0, latencyMsSum: 0, costUsd: 0 });
        a.total += 1;
        if (pass) a.pass += 1;
        if (!r.ok) a.errors += 1;
        a.latencyMsSum += Number(r.durationMs) || 0;
        a.costUsd += r.ok ? costFor(r.usage, model) : 0;
      }
    }
  }
  for (const [model, a] of Object.entries(agg)) {
    a.passRate = a.total ? Math.round((a.pass / a.total) * 100) / 100 : 0;
    a.avgLatencyMs = a.total ? Math.round(a.latencyMsSum / a.total) : 0;
    a.costUsd = Math.round(a.costUsd * 1e6) / 1e6;
  }
  return { results, matrix: scoreMatrix(results), agg };
}

/** Pure: a human-readable comparison report from runAssessment output. */
export function renderReport({ agg, baseline }, models) {
  const lines = ["=== cloud-candidate assessment ===", ""];
  lines.push("model                         pass    rate   avgLat   cost(USD)  errors");
  for (const model of models) {
    const a = agg[model] || { pass: 0, total: 0, passRate: 0, avgLatencyMs: 0, costUsd: 0, errors: 0 };
    const tag = model === baseline ? " (baseline)" : "";
    lines.push(
      `${(model + tag).padEnd(28)}  ${String(a.pass + "/" + a.total).padEnd(6)} ${String(a.passRate).padEnd(6)} ` +
      `${String(a.avgLatencyMs + "ms").padEnd(8)} ${String("$" + a.costUsd).padEnd(10)} ${a.errors}`
    );
  }
  if (baseline && agg[baseline]) {
    lines.push("", "delta vs baseline (rate / cost):");
    for (const model of models) {
      if (model === baseline) continue;
      const a = agg[model], b = agg[baseline];
      if (!a) continue;
      const dRate = Math.round((a.passRate - b.passRate) * 100) / 100;
      const dCost = Math.round((a.costUsd - b.costUsd) * 1e6) / 1e6;
      lines.push(`  ${model}: rate ${dRate >= 0 ? "+" : ""}${dRate}  cost ${dCost >= 0 ? "+" : ""}$${dCost}`);
    }
  }
  lines.push("", "Promote a candidate to a routing rung in model-routing-policy.mjs ONLY if it",
    "matches/beats the baseline rate at acceptable cost. Never default quality/safety to it.");
  return lines.join("\n");
}

// ---------------------------------------------------------------------------
// CLI shell (impure) -- only runs when invoked directly.
// ---------------------------------------------------------------------------
function parseArgs(argv) {
  const f = { models: [], baseline: "", run: false, json: false, maxTokens: DEFAULT_MAX_TOKENS, timeout: 60000 };
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a === "--models") f.models = String(argv[++i] || "").split(",").map((s) => s.trim()).filter(Boolean);
    else if (a === "--baseline") f.baseline = String(argv[++i] || "").trim();
    else if (a === "--run") f.run = true;
    else if (a === "--json") f.json = true;
    else if (a === "--max-tokens") f.maxTokens = Number(argv[++i]) || DEFAULT_MAX_TOKENS;
    else if (a === "--timeout") f.timeout = Number(argv[++i]) || 60000;
  }
  if (!f.baseline && f.models.length) f.baseline = f.models[f.models.length - 1];
  return f;
}

async function main() {
  const f = parseArgs(process.argv.slice(2));
  if (!f.models.length) {
    console.error('usage: assess-cloud-candidate.mjs --models <key|slug>,<key|slug> [--baseline <m>] [--run] [--json]');
    console.error('known candidates: ' + Object.keys(OPENROUTER_MODELS).join(", "));
    process.exit(2);
  }
  const est = estimatePlanCostUsd(f.models, { maxTokens: f.maxTokens });
  const plan = buildRunPlan(f.models);
  if (!f.run) {
    const out = {
      mode: "dry-run", models: f.models, baseline: f.baseline,
      totalCalls: plan.length, estCostUsd: Math.round(est.totalUsd * 1e6) / 1e6, perModelEstUsd: est.perModel,
      note: "no network hit. add --run to POST the battery to OpenRouter (spends real money for paid models).",
    };
    console.log(f.json ? JSON.stringify(out, null, 2)
      : `DRY-RUN: ${plan.length} calls across ${f.models.length} model(s); upper-bound cost ~$${out.estCostUsd}.\n` +
        f.models.map((m) => `  ${m}: ~$${Math.round((est.perModel[m] || 0) * 1e6) / 1e6} (slug ${resolveModelSlug(m, {})})`).join("\n") +
        `\nAdd --run to execute (POSTs to api.openrouter.ai, a third party).`);
    process.exit(0);
  }
  if (!keyStatus().present) {
    console.error("--run needs OPENROUTER_API_KEY (env or .env). Aborting -- no faked results (R12).");
    process.exit(3);
  }
  const callImpl = ({ model, prompt, maxTokens }) =>
    callOpenRouter({ messages: [{ role: "user", content: prompt }], model, maxTokens, timeoutMs: f.timeout });
  const out = await runAssessment({ models: f.models, callImpl, maxTokens: f.maxTokens });
  if (f.json) console.log(JSON.stringify({ ...out, baseline: f.baseline, estCostUsd: est.totalUsd }, null, 2));
  else console.log(renderReport({ agg: out.agg, baseline: f.baseline }, f.models));
  process.exit(0);
}

const INVOKED_DIRECTLY = process.argv[1] && resolve(process.argv[1]) === resolve(fileURLToPath(import.meta.url));
if (INVOKED_DIRECTLY) main();
