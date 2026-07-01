#!/usr/bin/env node
// scripts/ollama-stress-expanded-run.mjs
//
// U-ALPHA-OLLAMA-STRESS-EXPANDED (slot:alpha) -- executes the expanded capability
// batteries (authored by the ollama-capability-stress-expansion Workflow) through
// the proven harness (scripts/ollama-stress-test.mjs runTierSweep). MODEL-OUTER,
// num_ctx auto-sized (byte-based) -- the GPU-safe execution side of the stress test.
//
// Each battery file exports BATTERY in the india TASK_BATTERY shape. We import the
// VALIDATED ones (self-test green) and run them across a SAFE co-resident model
// ladder (<=14b -- the proven non-wedge band). Large/reasoning models are run in
// SEPARATE single-model invocations (--models ...), never mixed (the wedge rule).
//
// Usage:
//   node scripts/ollama-stress-expanded-run.mjs                       # safe coder ladder, validated batteries
//   node scripts/ollama-stress-expanded-run.mjs --models deepseek-r1:14b --batteries reasoning
//   node scripts/ollama-stress-expanded-run.mjs --include-codegen     # add codegen once it is fixed

import { runTierSweep } from "./ollama-stress-test.mjs";

const DEFAULT_MODELS = ["qwen2.5-coder:1.5b", "qwen2.5-coder:7b", "qwen2.5-coder:14b"];

// Battery registry -- dynamic import so a broken/in-flight file (e.g. codegen mid-fix)
// never crashes the whole run; a failed import is skipped + reported.
const BATTERY_FILES = {
  reasoning: "./lib/stress-battery-reasoning.mjs",
  longcontext: "./lib/stress-battery-longcontext.mjs",
  jsonschema: "./lib/stress-battery-jsonschema.mjs",
  mfgdomain: "./lib/stress-battery-mfgdomain.mjs",
  instruction: "./lib/stress-battery-instruction.mjs",
  codegen: "./lib/stress-battery-codegen.mjs",
  generative: "./lib/stress-battery-generative.mjs", // summarize/explain, stratified, reference-overlap metric
  "generative-judged": "./lib/stress-battery-generative-judged.mjs", // same cases, LLM-judge (32b) semantic metric
};

// Validated-by-self-test default set; codegen + instruction are opt-in (codegen was
// failing its self-test; instruction may still be authoring).
const DEFAULT_BATTERIES = ["reasoning", "longcontext", "jsonschema", "mfgdomain"];

function parseArgs(argv) {
  const a = Array.isArray(argv) ? argv : [];
  const get = (n) => { const i = a.indexOf(n); return i >= 0 && i + 1 < a.length ? a[i + 1] : null; };
  const models = get("--models");
  const batteries = get("--batteries");
  return {
    models: models ? models.split(",").map((s) => s.trim()).filter(Boolean) : DEFAULT_MODELS,
    batteries: batteries ? batteries.split(",").map((s) => s.trim()).filter(Boolean)
      : (a.includes("--include-codegen") ? [...DEFAULT_BATTERIES, "codegen"] : DEFAULT_BATTERIES),
    numPredict: Number(get("--num-predict")) || 256, // bigger than the 96 default: codegen/json need room
    json: a.includes("--json"),
  };
}

async function loadBatteries(names) {
  const tasks = [];
  const loaded = [];
  const skipped = [];
  for (const name of names) {
    const file = BATTERY_FILES[name];
    if (!file) { skipped.push(`${name}:unknown`); continue; }
    try {
      const mod = await import(file);
      const battery = Array.isArray(mod.BATTERY) ? mod.BATTERY : null;
      if (!battery || battery.length === 0) { skipped.push(`${name}:no-BATTERY`); continue; }
      // Tag each task's id with its battery so the matrix is attributable.
      for (const t of battery) tasks.push({ ...t, _battery: name });
      loaded.push(`${name}(${battery.length})`);
    } catch (e) {
      skipped.push(`${name}:import-failed:${e && e.message ? e.message.slice(0, 60) : "?"}`);
    }
  }
  return { tasks, loaded, skipped };
}

async function main() {
  const opts = parseArgs(process.argv.slice(2));
  const { tasks, loaded, skipped } = await loadBatteries(opts.batteries);
  process.stderr.write(`[expanded] models=${opts.models.join(",")} | loaded=${loaded.join(" ")} | skipped=${skipped.join(" ") || "none"} | tasks=${tasks.length}\n`);
  if (tasks.length === 0) { process.stderr.write("[expanded] no tasks loaded -- abort\n"); return 1; }

  const res = await runTierSweep({ models: opts.models, tasks, numPredict: opts.numPredict });

  // Group the per-task frontier by battery for a readable capability matrix.
  const byBattery = {};
  for (const t of res.perTask) {
    const battery = (tasks.find((x) => x.id === t.task) || {})._battery || "?";
    (byBattery[battery] ||= []).push(t);
  }

  if (opts.json) {
    process.stdout.write(JSON.stringify({ models: res.modelOrder, perTask: res.perTask, skipped }, null, 2) + "\n");
  } else {
    process.stdout.write(`\n=== EXPANDED CAPABILITY MATRIX (models: ${res.modelOrder.map((m) => m.split(":")[1]).join(", ")}) ===\n`);
    for (const [battery, rows] of Object.entries(byBattery)) {
      process.stdout.write(`\n## ${battery}\n`);
      for (const t of rows) {
        const pm = t.perModel.map((m) => {
          const tag = m.model.split(":")[1];
          const pct = Math.round(m.passRate * 100);
          // Surface no-signal so a FALSE-0 (model never answered: timeout/empty) is VISIBLY
          // distinct from a real 0% (answered, all wrong). ns<k>/<n> = k of n cases gave no
          // usable output -- e.g. `32b=0%(ns9/9)` = all timed out, NOT measured-incapable.
          const ns = Number(m.noSignal) > 0 ? `(ns${m.noSignal}/${m.total})` : "";
          return `${tag}=${pct}%${ns}`;
        }).join(" ");
        const small = t.frontier.smallestPassing ? t.frontier.smallestPassing.split(":")[1] : "NONE";
        // Surface the low-confidence flag (the JSON carries frontier.confident; the human table
        // previously hid it) so an n<3 "smallest passing" is never read as a hard route (scrutiny P2).
        const conf = t.frontier.confident === false ? " (low-n)" : "";
        process.stdout.write(`  ${t.task.padEnd(28)} ${(t.frontier.verdict + conf).padEnd(22)} small=${String(small).padEnd(6)} ${pm}\n`);
      }
    }
  }
  return 0;
}

main().then((c) => process.exit(typeof c === "number" ? c : 0)).catch((e) => {
  process.stderr.write(`expanded-run FATAL: ${e && e.stack ? e.stack : e}\n`);
  process.exit(1);
});
