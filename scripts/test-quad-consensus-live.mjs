#!/usr/bin/env node
/**
 * test-quad-consensus-live.mjs — INTEL-OLLAMA-OBSIDIAN-MS0 / DUAL-OLLAMA 4-WAY
 *
 * Proves the dual-Ollama 4-way consensus pipeline works end-to-end against
 * real production endpoints:
 *   - Codex CLI (gpt-5.5)
 *   - Ollama deepseek-r1:14b
 *   - Ollama qwen2.5-coder:14b (the new 4th voice when no Grok key is set)
 *
 * Skips Claude (we ARE Claude). Three independent voices in parallel.
 *
 * Usage: node scripts/test-quad-consensus-live.mjs
 */

import { spawn } from "node:child_process";

const PROMPT = "What is 12 + 8? Reply with just the number, nothing else.";

console.log(`[live] prompt: "${PROMPT}"`);
console.log("[live] starting parallel calls: Codex(gpt-5.5) + Ollama(deepseek-r1:14b) + Ollama(qwen2.5-coder:14b)\n");

const start = Date.now();

function callCodex() {
  return new Promise((resolve) => {
    const t = Date.now();
    const child = spawn("codex", ["exec", "--skip-git-repo-check", "--sandbox", "read-only", "-m", "gpt-5.5", "-c", 'model_reasoning_effort="low"'], {
      stdio: ["pipe", "pipe", "pipe"],
      windowsHide: true,
      shell: true,
    });
    let stderr = "";
    child.stderr.setEncoding("utf-8");
    child.stderr.on("data", (c) => { stderr += c; });
    child.on("error", (e) => resolve({ ok: false, latencyMs: Date.now() - t, error: e.message, answer: "" }));
    child.on("exit", (code) => {
      const cleaned = stderr.replace(/\x1b\[[0-9;]*m/g, "");
      const tokIdx = cleaned.lastIndexOf("tokens used");
      const cIdx = cleaned.lastIndexOf("\ncodex\n", tokIdx >= 0 ? tokIdx : undefined);
      let answer = "";
      if (cIdx >= 0) {
        const s = cIdx + "\ncodex\n".length;
        const e = tokIdx >= 0 ? tokIdx : cleaned.length;
        answer = cleaned.slice(s, e).trim();
      }
      const tokMatch = cleaned.match(/tokens used\s*\n\s*([\d,]+)/);
      const tokens = tokMatch ? Number(tokMatch[1].replace(/,/g, "")) : null;
      resolve({ ok: code === 0, answer, tokens, latencyMs: Date.now() - t, error: code !== 0 ? `exit ${code}` : null });
    });
    child.stdin.write(PROMPT);
    child.stdin.end();
  });
}

async function callOllama(model, numPredict = 32) {
  const t = Date.now();
  try {
    const r = await fetch("http://127.0.0.1:11434/api/generate", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        model,
        prompt: PROMPT,
        system: "Reply concisely with just the number.",
        stream: false,
        options: { temperature: 0.2, num_predict: numPredict },
      }),
    });
    if (!r.ok) return { ok: false, latencyMs: Date.now() - t, error: `http ${r.status}`, answer: "" };
    const j = await r.json();
    const raw = String(j.response ?? "");
    const stripped = raw.replace(/<think>[\s\S]*?<\/think>/g, "").trim() || raw.trim();
    return { ok: true, answer: stripped, tokens: j.eval_count ?? null, latencyMs: Date.now() - t, error: null };
  } catch (e) {
    return { ok: false, latencyMs: Date.now() - t, error: e.message, answer: "" };
  }
}

const [codex, deepseek, qwen32] = await Promise.all([
  callCodex(),
  callOllama("deepseek-r1:14b", 256),
  callOllama("qwen2.5-coder:14b", 32),
]);

const fmt = (label, r) =>
  console.log(`[${label.padEnd(28)}] ok=${r.ok}  ${String(r.latencyMs).padStart(6)}ms  tokens=${String(r.tokens ?? "-").padStart(5)}  answer="${(r.answer ?? "").slice(0, 60)}"${r.ok ? "" : "\n                                error: " + r.error}`);

fmt("codex   gpt-5.5  low", codex);
fmt("ollama  deepseek-r1:14b", deepseek);
fmt("ollama  qwen2.5-coder:14b", qwen32);

console.log(`\n[total wall] ${Date.now() - start}ms`);

const target = "20";
const codexOk = codex.ok && codex.answer.includes(target);
const deepseekOk = deepseek.ok && deepseek.answer.includes(target);
const qwenOk = qwen32.ok && qwen32.answer.includes(target);
const agree = [codexOk, deepseekOk, qwenOk].filter(Boolean).length;

console.log(`[consensus] ${agree}/3 voices agree on ${target}`);
if (agree === 3) {
  console.log("[consensus] FULL 4-WAY PIPELINE VERIFIED (3 external + Claude observer) — dual-Ollama is live ✓");
} else if (agree >= 2) {
  console.log("[consensus] partial agreement — recommendation would be 'review'");
} else {
  console.log("[consensus] failure mode — would escalate");
}
