#!/usr/bin/env node
/**
 * ollama-capability-probe.mjs -- LIVE runner that measures each Ollama model's TRUE per-task success
 * rate via code verifiers (U-OLLAMA-CAP-PROBE, slot:india 2026-06-11). Answers the operator's
 * "test it to see what else it can do so we can fine-tune systems further" with DATA, not vibes:
 * which (task, model) pairs are auto-offload-safe (~100%), so we move that work off Claude (-> cost).
 *
 * Runs scripts/lib/ollama-capability-battery.mjs against the requested models, scores with the pure
 * verifiers, and prints the capability matrix + the auto-offload candidate list. Writes the matrix
 * to state/shared/ollama-capability-matrix.json (--out) for the routing layer to consume.
 *
 * Usage:
 *   node scripts/ollama-capability-probe.mjs                              # default fast-tier models
 *   node scripts/ollama-capability-probe.mjs --models qwen2.5-coder:1.5b,gpt-oss:20b
 *   node scripts/ollama-capability-probe.mjs --out --json
 */

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { TASK_BATTERY, scoreMatrix, autoOffloadCandidates } from "./lib/ollama-capability-battery.mjs";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, "..");
const OUT = path.join(ROOT, "state", "shared", "ollama-capability-matrix.json");
const OLLAMA_URL = process.env.OLLAMA_URL || "http://127.0.0.1:11434";
const DEFAULT_MODELS = ["qwen2.5-coder:1.5b", "gpt-oss:20b", "qwen2.5-coder:32b"];
const CALL_TIMEOUT_MS = 45000;
const NUM_PREDICT = 96; // these tasks have short answers

/** Call Ollama /api/generate (non-stream, temperature 0). Returns the response text ("" on failure). */
async function callOllama(model, prompt, timeoutMs = CALL_TIMEOUT_MS) {
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), timeoutMs);
  try {
    const res = await fetch(`${OLLAMA_URL}/api/generate`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ model, prompt, stream: false, options: { temperature: 0, num_predict: NUM_PREDICT } }),
      signal: ctrl.signal,
    });
    if (!res.ok) return "";
    const j = await res.json();
    return typeof j.response === "string" ? j.response : "";
  } catch { return ""; } finally { clearTimeout(timer); }
}

/** Run the battery across models. `callFn(model, prompt)->Promise<string>` is injectable for tests. */
export async function runProbe({ models, callFn = callOllama, battery = TASK_BATTERY }) {
  const results = [];
  for (const model of models) {
    for (const task of battery) {
      for (const c of task.cases) {
        let out = "";
        try { out = await callFn(model, task.prompt(c)); } catch { out = ""; }
        let pass = false;
        try { pass = !!task.verify(out, c); } catch { pass = false; }
        results.push({ taskId: task.id, category: task.category, model, pass });
      }
    }
  }
  return results;
}

async function main() {
  const args = process.argv.slice(2);
  const write = args.includes("--out");
  const asJson = args.includes("--json");
  const mIdx = args.indexOf("--models");
  const models = mIdx >= 0 && args[mIdx + 1] ? args[mIdx + 1].split(",").map((s) => s.trim()).filter(Boolean) : DEFAULT_MODELS;

  process.stderr.write(`probing ${models.length} model(s) x ${TASK_BATTERY.length} tasks against ${OLLAMA_URL} ...\n`);
  const results = await runProbe({ models });
  const matrix = scoreMatrix(results);
  const safe = autoOffloadCandidates(matrix, 1.0);
  const strong = autoOffloadCandidates(matrix, 0.9);

  const report = { generatedAt: new Date().toISOString(), models, matrix, autoOffloadSafe: safe, strong };
  if (write) {
    // Clobber-guard (U-NIGHT-BATCH scrutiny P1, 2026-06-12): callOllama swallows
    // every failure to "" -- a mid-run daemon death / GPU wedge yields an
    // ALL-ZERO matrix that would silently overwrite a good one (this probe now
    // runs unattended nightly). All-zero across every (task,model) cell is not
    // a measurement, it is an outage signature: refuse the write, exit loud.
    const cells = Object.values(matrix).flatMap((t) => Object.values(t.models));
    const allZero = cells.length > 0 && cells.every((s) => s.rate === 0);
    if (allZero) {
      process.stderr.write("[capability-probe] every (task,model) cell scored 0 -- outage signature, REFUSING to overwrite the existing matrix (R12). Check the Ollama daemon and re-run.\n");
      process.exitCode = 1;
    } else {
      fs.mkdirSync(path.dirname(OUT), { recursive: true });
      fs.writeFileSync(OUT, JSON.stringify(report, null, 2), "utf8");
    }
  }
  if (asJson) { process.stdout.write(JSON.stringify(report, null, 2) + "\n"); return; }

  process.stdout.write("\n=== Ollama capability matrix (task x model -> success rate) ===\n");
  for (const [taskId, t] of Object.entries(matrix)) {
    const cells = Object.entries(t.models).map(([m, s]) => `${m}=${Math.round(s.rate * 100)}% (${s.pass}/${s.total})`).join("  ");
    process.stdout.write(`  ${taskId.padEnd(18)} [${t.category}]  ${cells}\n`);
  }
  process.stdout.write(`\n=== AUTO-OFFLOAD-SAFE (100% verified) -> route these off Claude ===\n`);
  if (safe.length === 0) process.stdout.write("  (none at 100% -- see strong >=90% below)\n");
  for (const c of safe) process.stdout.write(`  ${c.taskId} -> ${c.model}  (${c.rate * 100}% of ${c.total})\n`);
  process.stdout.write(`\n=== STRONG (>=90%, candidate with light review) ===\n`);
  for (const c of strong.filter((s) => s.rate < 1.0)) process.stdout.write(`  ${c.taskId} -> ${c.model}  (${c.rate * 100}%)\n`);
  if (write) process.stdout.write(`\nWrote matrix -> ${OUT}\n`);
}

const isMain = (() => {
  try { return process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url); }
  catch { return false; }
})();
if (isMain) main();

export { callOllama, OUT, DEFAULT_MODELS };
