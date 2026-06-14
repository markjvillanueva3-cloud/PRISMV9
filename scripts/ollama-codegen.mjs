#!/usr/bin/env node
// scripts/ollama-codegen.mjs
//
// U-OAB-U6 (OLLAMA-AUTORUN-BUILDLOOP) -- the CODING leg of "offload read, searches and
// coding tasks to ollama when viable" (operator 2026-06-09). Offloads MECHANICAL codegen
// first-passes to the local code model (gpt-oss:120b by default -- the strongest resident model;
// PRISM_CODEGEN_MODEL overrides fleet-wide) at 0 Claude tokens, leaving Claude/Opus to REVIEW +
// finalize. No child_process (the diff is piped in
// via stdin) -> safe + composable.
//
// R5 boundary (what is "viable" to offload): mechanical, well-specified scaffolding --
//   gen-test  <file>            draft a node:test skeleton for a file's exports (Claude
//                               fills the REAL reference-value assertions -- NOT shippable as-is)
//   commit-msg                  draft a [SCOPE]/U-ID commit message from a staged diff on stdin
//   explain   <file>            one-paragraph "what does this do" (read-offload for understanding)
// NOT offloaded (stays Claude): architecture, logic, safety, the final assertions. A local
// draft is a STARTING POINT for review, never the committed artifact (R9: stub assertions are
// rejected -- gen-test output MUST be filled with real values before it counts).
//
// Usage:
//   node scripts/ollama-codegen.mjs gen-test scripts/ollama-tool-agent.mjs
//   git diff --cached | node scripts/ollama-codegen.mjs commit-msg
//   node scripts/ollama-codegen.mjs explain <file> [--model qwen2.5-coder:32b]

import { readFileSync, existsSync } from "node:fs";
import { pathToFileURL } from "node:url";

const BASE = process.env.OLLAMA_HOST || "http://127.0.0.1:11434";
// gpt-oss:120b is the DEFAULT coding-offload model (operator 2026-06-09, "our strongest models").
// Fleet/settings-wide override: PRISM_CODEGEN_MODEL in settings.json env; per-call: --model.
// CO-RESIDENCY: 120b (~65GB) co-resides with gpt-oss:20b (79GB total, OK) but NOT with
// qwen2.5-coder:32b (102GB > 96GB) -- Ollama LRU-evicts under pressure. keep_alive is env-tunable
// so the 65GB can be freed sooner if a coding burst isn't ongoing. qwen2.5-coder:32b remains the
// code-specialist alternative (set PRISM_CODEGEN_MODEL=qwen2.5-coder:32b to prefer it).
export function resolveCodeModel(env = process.env) { return env.PRISM_CODEGEN_MODEL || "gpt-oss:120b"; }
const CODE_MODEL = resolveCodeModel();
const KEEP_ALIVE = process.env.PRISM_CODEGEN_KEEP_ALIVE || "30m";
const TIMEOUT_MS = Number(process.env.PRISM_CODEGEN_TIMEOUT_MS || 120000);
const MAX_SRC = 12000;   // cap source fed to the model (chars)
const MAX_DIFF = 16000;  // cap diff fed to the model (chars)

// ---- pure, testable helpers ------------------------------------------------
// Extract exported symbol names from a JS/TS source (function/const/class/let/var).
export function extractExports(src) {
  const out = [];
  const re = /^\s*export\s+(?:async\s+)?(?:function|const|class|let|var)\s+([A-Za-z0-9_$]+)/gm;
  let m;
  while ((m = re.exec(src || "")) !== null) if (!out.includes(m[1])) out.push(m[1]);
  return out;
}
// gen-test prompt -- demands node:test + REAL-value placeholders flagged for Claude review.
export function genTestPrompt(relPath, exports, srcSlice) {
  return [
    `You are drafting a test SKELETON for the Node.js module \`${relPath}\` using \`node:test\` + \`node:assert/strict\`.`,
    `Exported symbols to cover: ${exports.length ? exports.join(", ") : "(none detected -- infer from the source)"}.`,
    `Rules: import from the module; one test() per export covering happy path + an edge case;`,
    `for any assertion whose expected value you cannot derive with certainty, write \`assert.equal(actual, /* TODO(claude): real reference value */ null)\` so a reviewer fills it.`,
    `Output ONLY the test file content (no prose, no markdown fence).`,
    ``,
    `--- SOURCE (truncated) ---`,
    srcSlice,
  ].join("\n");
}
export function commitMsgPrompt(diff) {
  return [
    `Write a single-line git commit subject in the form \`[SCOPE]/U-ID: title\` plus a short body, summarizing this staged diff.`,
    `Be concrete and factual; do not invent changes not in the diff. Output ONLY the message.`,
    ``,
    `--- DIFF (truncated) ---`,
    diff,
  ].join("\n");
}
export function explainPrompt(relPath, srcSlice) {
  return `In ONE paragraph, explain what \`${relPath}\` does and its key exports. Be concrete, cite symbol names. Source:\n\n${srcSlice}`;
}

// ---- local model call (plain generation, no tools) -------------------------
async function generate(prompt, model = CODE_MODEL) {
  const ac = new AbortController();
  const timer = setTimeout(() => ac.abort(), TIMEOUT_MS);
  try {
    const r = await fetch(`${BASE}/api/generate`, {
      method: "POST", headers: { "content-type": "application/json" }, signal: ac.signal,
      body: JSON.stringify({ model, prompt, stream: false, options: { temperature: 0 }, keep_alive: KEEP_ALIVE }),
    });
    const j = await r.json();
    if (j.error) return { ok: false, text: "", error: j.error };
    return { ok: true, text: (j.response || "").trim() };
  } catch (e) {
    return { ok: false, text: "", error: e.message };
  } finally { clearTimeout(timer); }
}

function readSrc(p) {
  if (!existsSync(p)) return null;
  try { return readFileSync(p, "utf8"); } catch { return null; }
}

// ---- CLI -------------------------------------------------------------------
async function main() {
  const [cmd, ...rest] = process.argv.slice(2);
  const mIdx = rest.indexOf("--model");
  const model = mIdx >= 0 ? rest[mIdx + 1] : CODE_MODEL;
  const file = rest.find((a, i) => !a.startsWith("--") && rest[i - 1] !== "--model");

  let prompt, label;
  if (cmd === "gen-test") {
    if (!file) { console.error("gen-test needs a <file>"); process.exit(1); }
    const src = readSrc(file);
    if (src == null) { console.error(`no such file: ${file}`); process.exit(1); }
    prompt = genTestPrompt(file, extractExports(src), src.slice(0, MAX_SRC));
    label = `gen-test ${file}`;
  } else if (cmd === "commit-msg") {
    let diff = "";
    try { diff = readFileSync(0, "utf8"); } catch { diff = ""; } // diff piped in via stdin
    if (!diff.trim()) { console.error("no diff on stdin -- pipe it: git diff --cached | node scripts/ollama-codegen.mjs commit-msg"); process.exit(1); }
    prompt = commitMsgPrompt(diff.slice(0, MAX_DIFF));
    label = "commit-msg";
  } else if (cmd === "explain") {
    if (!file) { console.error("explain needs a <file>"); process.exit(1); }
    const src = readSrc(file);
    if (src == null) { console.error(`no such file: ${file}`); process.exit(1); }
    prompt = explainPrompt(file, src.slice(0, MAX_SRC));
    label = `explain ${file}`;
  } else {
    console.error("usage: ollama-codegen.mjs <gen-test|commit-msg|explain> [file] [--model qwen2.5-coder:32b]");
    process.exit(1);
  }

  const res = await generate(prompt, model);
  if (!res.ok) { console.error(`[ollama-codegen ${label}] FAILED (${res.error}) -- do it on Claude.`); process.exit(2); }
  console.error(`[ollama-codegen ${label} | ${model} | 0 Claude tokens | DRAFT -- review before use]`);
  console.log(res.text);
}

if (import.meta.url === pathToFileURL(process.argv[1] || "").href) {
  main().catch((e) => { console.error("FATAL:", e.message); process.exit(1); });
}
