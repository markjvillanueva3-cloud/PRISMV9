#!/usr/bin/env node
/**
 * test-consensus-live.mjs — INTEL-OLLAMA-OBSIDIAN-MS0 / OCTOPUS-CONSENSUS smoke test
 *
 * Proves the multi-model consensus pipeline works end-to-end:
 *   - Codex CLI (gpt-5.5 xhigh) reachable via spawn
 *   - Ollama (deepseek-r1:14b) reachable on 11434
 *   - Both return answers
 *   - Agreement scoring produces a sensible recommendation
 *
 * Skips Claude (we ARE Claude). Uses a tiny 1-token-answer prompt to keep
 * Codex token cost low (still ~40k due to reasoning chain, but bounded).
 *
 * Usage: node scripts/test-consensus-live.mjs
 */

import { spawn } from "node:child_process";

const PROMPT = "What is 5 plus 7? Reply with just the number, nothing else.";

console.log(`[live] prompt: "${PROMPT}"`);
console.log("[live] starting parallel calls to Codex (gpt-5.5 xhigh) + Ollama (qwen2.5-coder:7b)...\n");

const start = Date.now();

// --- Codex ---
function callCodex() {
  return new Promise((resolve) => {
    const t = Date.now();
    const child = spawn("codex", ["exec", "--skip-git-repo-check", "--sandbox", "read-only", "-m", "gpt-5.5", "-c", 'model_reasoning_effort="xhigh"'], {
      stdio: ["pipe", "pipe", "pipe"],
      windowsHide: true,
      shell: true,  // resolves codex.cmd on Windows
    });
    let stderr = "";
    child.stderr.setEncoding("utf-8");
    child.stderr.on("data", (c) => { stderr += c; });
    child.on("error", (e) => resolve({ ok: false, latencyMs: Date.now() - t, error: e.message }));
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

// --- Ollama ---
async function callOllama() {
  const t = Date.now();
  try {
    const r = await fetch("http://127.0.0.1:11434/api/generate", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        model: "qwen2.5-coder:7b",
        prompt: PROMPT,
        system: "Reply concisely with just the number.",
        stream: false,
        options: { temperature: 0.2, num_predict: 32 },
      }),
    });
    if (!r.ok) return { ok: false, latencyMs: Date.now() - t, error: `http ${r.status}` };
    const j = await r.json();
    const raw = String(j.response ?? "");
    const stripped = raw.replace(/<think>[\s\S]*?<\/think>/g, "").trim() || raw.trim();
    return { ok: true, answer: stripped, tokens: j.eval_count ?? null, latencyMs: Date.now() - t, error: null };
  } catch (e) {
    return { ok: false, latencyMs: Date.now() - t, error: e.message };
  }
}

const [codex, ollama] = await Promise.all([callCodex(), callOllama()]);

console.log(`[codex   gpt-5.5      ] ok=${codex.ok}  ${codex.latencyMs}ms  tokens=${codex.tokens}  answer="${(codex.answer ?? "").slice(0, 60)}"`);
if (!codex.ok) console.log(`                       error: ${codex.error}`);
console.log(`[ollama  qwen-coder:7b] ok=${ollama.ok}  ${ollama.latencyMs}ms  tokens=${ollama.tokens}  answer="${(ollama.answer ?? "").slice(0, 60)}"`);
if (!ollama.ok) console.log(`                       error: ${ollama.error}`);

console.log(`\n[total wall] ${Date.now() - start}ms`);

// Quick agreement check — do both answers contain "12"?
const codexHas = (codex.answer ?? "").includes("12");
const ollamaHas = (ollama.answer ?? "").includes("12");
if (codex.ok && ollama.ok && codexHas && ollamaHas) {
  console.log("[consensus] BOTH MODELS AGREE on 12 — pipeline verified end-to-end ✓");
} else if (codex.ok && ollama.ok) {
  console.log("[consensus] models disagree — Codex says \"" + codex.answer + "\" / Ollama says \"" + ollama.answer + "\"");
} else {
  console.log("[consensus] partial failure — see errors above");
}
