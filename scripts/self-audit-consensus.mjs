#!/usr/bin/env node
/**
 * self-audit-consensus.mjs — meta-validation of the consensus pipeline.
 *
 * Feeds ConsensusCoordinatorEngine + MultiModelConsensusEngine source to
 * gpt-5.5 (xhigh) AND ollama qwen-coder:7b in parallel, asks each to find:
 *   - concurrency bugs / race conditions
 *   - missing edge cases not covered by tests
 *   - dead code or half-finished patterns
 *   - over-engineering or unjustified complexity
 *   - sub-optimal algorithms
 *
 * Reports both findings side-by-side so the user can compare what each
 * model surfaced.
 */

import { spawn } from "node:child_process";
import { promises as fs } from "node:fs";

const FILES = [
  "H:/prism-iooms0/mcp-server/src/engines/ConsensusCoordinatorEngine.ts",
  "H:/prism-iooms0/mcp-server/src/engines/MultiModelConsensusEngine.ts",
  "H:/prism-iooms0/mcp-server/src/engines/TaskClassifierEngine.ts",
];

const AUDIT_PROMPT = `You are reviewing a multi-model consensus orchestration pipeline running in a 6-simultaneous-Claude-terminals environment. Find concrete defects in the code below.

Look for:
1. Race conditions / concurrency bugs (file-based inflight registry, cache, budget — read/write races between terminals)
2. Edge cases the tests miss (what happens if a hash collides? clock skew? partial JSONL writes? full-disk?)
3. Dead code, half-finished patterns, unreachable branches
4. Over-engineering — features that aren't actually used
5. Sub-optimal algorithms — O(N) where O(log N) is feasible, redundant work
6. Resource leaks — unclosed handles, unbounded files

For each finding give: SEVERITY (critical|high|medium|low), the FILE+LINE if locatable, the BUG, and the FIX. If the code is good, say so explicitly — don't manufacture findings.

Be terse. Skip preamble. Top 5 findings only.

=== FILES ===
`;

async function loadSources() {
  const parts = [];
  for (const f of FILES) {
    const content = await fs.readFile(f, "utf-8");
    parts.push(`### ${f}\n\`\`\`typescript\n${content}\n\`\`\``);
  }
  return AUDIT_PROMPT + parts.join("\n\n");
}

function callCodex(prompt) {
  return new Promise((resolve) => {
    const t = Date.now();
    const child = spawn("codex", ["exec", "--skip-git-repo-check", "--sandbox", "read-only", "-m", "gpt-5.5", "-c", 'model_reasoning_effort="xhigh"'], {
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
    child.stdin.write(prompt);
    child.stdin.end();
  });
}

async function callOllama(prompt) {
  const t = Date.now();
  try {
    const r = await fetch("http://127.0.0.1:11434/api/generate", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        model: "qwen2.5-coder:14b",
        prompt,
        stream: false,
        options: { temperature: 0.2, num_predict: 1500 },
      }),
    });
    if (!r.ok) return { ok: false, latencyMs: Date.now() - t, error: `http ${r.status}`, answer: "" };
    const j = await r.json();
    return { ok: true, answer: String(j.response ?? "").trim(), tokens: j.eval_count ?? null, latencyMs: Date.now() - t, error: null };
  } catch (e) {
    return { ok: false, latencyMs: Date.now() - t, error: e.message, answer: "" };
  }
}

async function main() {
  const prompt = await loadSources();
  const [codex, ollama] = await Promise.all([callCodex(prompt), callOllama(prompt)]);

  console.log("\n══════════════════════════════════════════════════════════════════════");
  console.log("  CODEX (gpt-5.5 xhigh) findings");
  console.log("══════════════════════════════════════════════════════════════════════");
  console.log(`(latency=${codex.latencyMs}ms, tokens=${codex.tokens}, ok=${codex.ok})`);
  if (codex.ok) console.log(codex.answer);
  else console.log(`ERROR: ${codex.error}`);

  console.log("\n══════════════════════════════════════════════════════════════════════");
  console.log("  OLLAMA (qwen2.5-coder:14b) findings");
  console.log("══════════════════════════════════════════════════════════════════════");
  console.log(`(latency=${ollama.latencyMs}ms, tokens=${ollama.tokens}, ok=${ollama.ok})`);
  if (ollama.ok) console.log(ollama.answer);
  else console.log(`ERROR: ${ollama.error}`);
}

main().catch((e) => { console.error(e); process.exit(1); });
