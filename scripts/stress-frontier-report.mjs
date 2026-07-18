#!/usr/bin/env node
// scripts/stress-frontier-report.mjs
//
// U-ALPHA-OLLAMA-STRESS-FRONTIER (slot:alpha 2026-06-25): merge the per-model graded-stress
// JSONs (emitted by ollama-stress-expanded-run.mjs --json, one file per model) into ONE
// capability-frontier report -- the deterministic answer to the operator goal "stress test ollama
// llms to see what the HARDEST task each llm can do before diminishing returns."
//
// PURE merge core (injected file list) + a CLI that reads a glob dir. Two outputs:
//   (1) per-TASK frontier: the CHEAPEST model (by param-size cost) that hits 100% -> the routing pick.
//   (2) per-MODEL ceiling: the set of tasks a model still clears at 100% -> its capability envelope.
//
// CORRECTNESS GUARDS (R12 -- the merge must not draw conclusions from bad data):
//   - A model whose EVERY task scored 0% is treated as LOAD-FAILED (could-not-generate), NOT
//     measured-incompetent, and is EXCLUDED from the frontier (a 65GB model that never fit VRAM
//     would otherwise poison every "cheapest" pick). It is reported separately as loadFailed.
//   - Full model tags are kept (deepseek-r1:14b != qwen2.5-coder:14b) -- the short ":14b" collides.
//   - modelCostRank is imported from the SAME source the router uses (single source of truth).
//
// Usage:
//   node scripts/stress-frontier-report.mjs                       # reads state/shared/_stress-*.json
//   node scripts/stress-frontier-report.mjs --dir <d> --glob <re> --json
//   node scripts/stress-frontier-report.mjs --out state/shared/ollama-stress-frontier.md

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { modelCostRank } from "./lib/model-routing-policy.mjs";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, "..");

/**
 * PURE: merge an array of {model, perTask:[{task,category,perModel:[{model,passRate}]}]} into a
 * frontier report. Each input is one model's stress JSON (ollama-stress-expanded-run --json shape).
 * @returns {{ models:string[], loadFailed:string[], tasks:Object, taskFrontier:Object, modelCeiling:Object }}
 */
export function mergeFrontier(perModelReports) {
  const tasks = {}; // taskId -> { category, rates: {model: passRate|null} }
  const modelSet = new Set();
  for (const rep of perModelReports || []) {
    const mdl = Array.isArray(rep?.models) ? rep.models[0] : null;
    if (!mdl) continue;
    modelSet.add(mdl);
    for (const t of (rep.perTask || [])) {
      const row = (tasks[t.task] ||= { category: t.category, rates: {} });
      const pm = (t.perModel || []).find((x) => x.model === mdl);
      row.rates[mdl] = pm && typeof pm.passRate === "number" ? pm.passRate : null;
    }
  }
  const allModels = [...modelSet];
  // LOAD-FAILED detection: a model with >=1 measured task but EVERY measured rate === 0 never
  // actually generated (a real model gets >0% on at least the trivial tasks). Exclude from frontier.
  const loadFailed = allModels.filter((m) => {
    const measured = Object.values(tasks).map((t) => t.rates[m]).filter((r) => r != null);
    return measured.length > 0 && measured.every((r) => r === 0);
  });
  const validModels = allModels.filter((m) => !loadFailed.includes(m)).sort((a, b) => modelCostRank(a) - modelCostRank(b));

  // per-task frontier: cheapest valid model at 100%
  const taskFrontier = {};
  for (const [tid, t] of Object.entries(tasks)) {
    const passing = validModels.filter((m) => t.rates[m] != null && t.rates[m] >= 1.0);
    taskFrontier[tid] = {
      category: t.category,
      cheapest100: passing.length ? passing[0] : null, // null => NONE-local (route to Claude/RAG)
      passingModels: passing,
      rates: Object.fromEntries(validModels.map((m) => [m, t.rates[m]])),
    };
  }
  // per-model ceiling: tasks each valid model clears at 100%
  const modelCeiling = {};
  for (const m of validModels) {
    const clears = Object.entries(tasks).filter(([, t]) => t.rates[m] != null && t.rates[m] >= 1.0).map(([tid]) => tid);
    modelCeiling[m] = { count: clears.length, totalMeasured: Object.values(tasks).filter((t) => t.rates[m] != null).length, clears };
  }
  return { models: validModels, loadFailed, tasks, taskFrontier, modelCeiling };
}

/** PURE: render the merged frontier as a markdown report. */
export function renderReport(merged, { generatedAt = "(unstamped)" } = {}) {
  const lines = [];
  lines.push("# Ollama Graded-Stress Capability Frontier");
  lines.push("");
  lines.push(`> Generated: ${generatedAt} -- merge of per-model stress JSONs (ollama-stress-expanded-run).`);
  lines.push("> The deterministic answer to 'the hardest task each LLM can do before diminishing returns.'");
  lines.push("");
  lines.push(`**Models measured (${merged.models.length}, by cost):** ${merged.models.map((m) => `${m}(${modelCostRank(m)}b)`).join(", ")}`);
  if (merged.loadFailed.length) lines.push(`\n**EXCLUDED -- load-failed (all-0%, never generated; VRAM/load issue, NOT measured-incompetent):** ${merged.loadFailed.join(", ")}`);
  lines.push("");
  lines.push("## Per-task frontier -- cheapest model @100%");
  lines.push("");
  const byCat = {};
  for (const [tid, f] of Object.entries(merged.taskFrontier)) (byCat[f.category] ||= []).push([tid, f]);
  for (const [cat, rows] of Object.entries(byCat)) {
    lines.push(`### ${cat}`);
    for (const [tid, f] of rows) {
      const pick = f.cheapest100 ? `${f.cheapest100} (${modelCostRank(f.cheapest100)}b)` : "**NONE-local -> Claude/RAG**";
      lines.push(`- \`${tid}\` -> ${pick}`);
    }
    lines.push("");
  }
  lines.push("## Per-model capability ceiling (tasks cleared @100% / measured)");
  lines.push("");
  for (const m of merged.models) {
    const c = merged.modelCeiling[m];
    lines.push(`- **${m}** (${modelCostRank(m)}b): ${c.count}/${c.totalMeasured}`);
  }
  return lines.join("\n") + "\n";
}

function main() {
  const args = process.argv.slice(2);
  const get = (n, d) => { const i = args.indexOf(n); return i >= 0 && args[i + 1] ? args[i + 1] : d; };
  const dir = path.resolve(ROOT, get("--dir", "state/shared"));
  const globRe = new RegExp(get("--glob", "^_stress-.*\\.json$"));
  const asJson = args.includes("--json");
  const outIdx = args.indexOf("--out");
  const outPath = outIdx >= 0 && args[outIdx + 1] ? path.resolve(ROOT, args[outIdx + 1]) : null;

  let files;
  try { files = fs.readdirSync(dir).filter((f) => globRe.test(f) && f !== "_stress-runA-small.json"); }
  catch (e) { process.stderr.write(`[stress-frontier] cannot read ${dir}: ${e.message}\n`); process.exit(1); }
  const reports = [];
  const parseErr = [];
  for (const f of files) {
    try { reports.push(JSON.parse(fs.readFileSync(path.join(dir, f), "utf8"))); }
    catch (e) { parseErr.push(`${f}:${e.message.slice(0, 40)}`); }
  }
  if (reports.length === 0) { process.stderr.write(`[stress-frontier] no parseable stress JSONs in ${dir} (errors: ${parseErr.join("; ") || "none"})\n`); process.exit(1); }

  const merged = mergeFrontier(reports);
  if (parseErr.length) process.stderr.write(`[stress-frontier] parse-skipped: ${parseErr.join("; ")}\n`);
  if (asJson) { process.stdout.write(JSON.stringify(merged, null, 2) + "\n"); return; }
  const report = renderReport(merged, { generatedAt: new Date().toISOString() });
  if (outPath) { fs.writeFileSync(outPath, report, "utf8"); process.stderr.write(`[stress-frontier] wrote ${outPath}\n`); }
  else process.stdout.write(report);
}

const isMain = (() => { try { return process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url); } catch { return false; } })();
if (isMain) main();
