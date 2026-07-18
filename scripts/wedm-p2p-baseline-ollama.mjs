/**
 * wedm-p2p-baseline-ollama.mjs — close the print->program loop END-TO-END with a
 * LOCAL model (Ollama qwen2.5-coder), no download required.
 *
 * Generates completions for the print->program val prompts via the local Ollama
 * server (prompted EXACTLY as the fine-tuned adapter would be — instruction +
 * input, no format crib), writes a generations JSONL, which the Phase D3 grader
 * (eval-wedm-print2program.mjs) then scores through the closed-loop gate stack.
 *
 * This is the PRE-TRAINING BASELINE: how often the un-fine-tuned base model
 * produces a gate-passing wire program. The LoRA-fine-tuned adapter (pending the
 * base-model download — HF CDN is throttled to ~96 KB/s) will be graded through
 * the SAME loop and compared against this number = the training lift.
 *
 *   node scripts/wedm-p2p-baseline-ollama.mjs <val.jsonl> [--limit 10] [--model qwen2.5-coder:7b] [--out gens.jsonl]
 *
 * No template-${...} (scripts/ security hook). Fail-loud on Ollama unreachable.
 * @module scripts/wedm-p2p-baseline-ollama
 */
import * as fs from "node:fs";

const OLLAMA = process.env.OLLAMA_HOST || "http://127.0.0.1:11434";

/** Build the user prompt exactly as train_wedm_lora_peft.py does (instruction + blank line + input). */
export function buildPrompt(row) {
  const instr = String(row.instruction || "");
  const inp = String(row.input || "");
  return instr + (inp ? "\n\n" + inp : "");
}

/** One non-streaming Ollama generate call. Returns the completion text. */
async function ollamaGenerate(model, prompt, numPredict, signal) {
  const res = await fetch(OLLAMA + "/api/generate", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ model, prompt, stream: false, options: { temperature: 0, num_predict: numPredict } }),
    signal,
  });
  if (!res.ok) throw new Error("ollama HTTP " + res.status);
  const j = await res.json();
  return String(j.response || "");
}

async function main() {
  const args = process.argv.slice(2);
  const file = args.find((a) => !a.startsWith("--"));
  const get = (flag, def) => { const i = args.indexOf(flag); return i >= 0 && args[i + 1] != null ? args[i + 1] : def; };
  const limit = Number(get("--limit", "10"));
  const model = get("--model", "qwen2.5-coder:7b");
  const out = get("--out", "H:/prism-slot-mike/state/shared/wedm-p2p-baseline-generations.jsonl");
  const numPredict = Number(get("--num-predict", "512"));
  if (!file || !fs.existsSync(file)) { console.error("usage: node scripts/wedm-p2p-baseline-ollama.mjs <val.jsonl> [--limit N]"); process.exit(2); }

  const rows = fs.readFileSync(file, "utf8").trim().split("\n").map((l) => JSON.parse(l)).slice(0, limit);
  if (rows.length === 0) { console.error("[baseline] FATAL: no prompts"); process.exit(2); }

  const gens = [];
  for (let i = 0; i < rows.length; i++) {
    const row = rows[i];
    const ctrl = new AbortController();
    const timer = setTimeout(() => ctrl.abort(), 60000);
    let completion = "";
    try {
      completion = await ollamaGenerate(model, buildPrompt(row), numPredict, ctrl.signal);
    } catch (e) {
      console.error("[baseline] gen " + (i + 1) + " failed: " + e.message);
      completion = ""; // empty completion -> grades as a fail (honest, not skipped)
    } finally { clearTimeout(timer); }
    gens.push({ instruction: row.instruction, input: row.input, generated: completion, expected: String(row.output || ""), meta: { ...(row.meta || {}), baseline_model: model } });
    console.log("[baseline] " + (i + 1) + "/" + rows.length + " (" + (row.meta && row.meta.toolpath_type ? row.meta.toolpath_type : (row.meta && row.meta.corpus) || "?") + ") -> " + completion.length + " chars");
  }

  fs.writeFileSync(out, gens.map((g) => JSON.stringify(g)).join("\n") + "\n", "utf8");
  console.log("[baseline] OK — wrote " + gens.length + " generations to " + out + " (model " + model + ").");
}

// Run only when invoked directly (not when imported by the test).
if (process.argv[1] && process.argv[1].endsWith("wedm-p2p-baseline-ollama.mjs")) {
  main().catch((e) => { console.error("[baseline] FATAL: " + e.message); process.exit(1); });
}
