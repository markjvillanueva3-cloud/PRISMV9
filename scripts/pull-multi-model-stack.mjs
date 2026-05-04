#!/usr/bin/env node
// pull-multi-model-stack.mjs — INTEL-OLLAMA-OBSIDIAN-MS0 / P20-U01
// Pulls + smoke-tests required Ollama models for tiered routing.
//
// Why: ModelRouterEngine routes tasks across 5 tiers; each tier needs a model
//      pulled locally before it can be selected. This script makes the pull
//      idempotent + verifies each model responds via /api/generate or /api/embeddings.
// How to apply: `node scripts/pull-multi-model-stack.mjs` from H:/prism-iooms0
//      (or any worktree). Honors OLLAMA_HOST env var; defaults to localhost:11434.

import { spawn } from "node:child_process";

const OLLAMA_HOST = process.env.OLLAMA_HOST ?? "http://127.0.0.1:11434";
const OLLAMA_BIN = process.env.OLLAMA_BIN ?? "H:/Tools/Ollama/ollama.exe";

const MODELS = [
  { name: "nomic-embed-text",      tier: 0, kind: "embed",  approxSizeGB: 0.27 },
  { name: "qwen2.5-coder:7b",      tier: 1, kind: "chat",   approxSizeGB: 4.7  },
  { name: "qwen2.5-coder:14b",     tier: 2, kind: "chat",   approxSizeGB: 9.0  },
  { name: "deepseek-r1:14b",       tier: 3, kind: "chat",   approxSizeGB: 9.0  },
  { name: "llama3.2-vision:11b",   tier: 4, kind: "vision", approxSizeGB: 7.9  },
];

const SMOKE_PROMPT = "Reply with the single word: OK.";

async function ollamaTags() {
  const r = await fetch(`${OLLAMA_HOST}/api/tags`);
  if (!r.ok) throw new Error(`tags: ${r.status}`);
  const j = await r.json();
  return new Set((j.models ?? []).map((m) => m.name));
}

function pull(model) {
  return new Promise((resolve) => {
    const p = spawn(OLLAMA_BIN, ["pull", model], { stdio: ["ignore", "inherit", "inherit"] });
    p.on("exit", (code) => resolve(code === 0));
    p.on("error", () => resolve(false));
  });
}

async function smokeChat(model) {
  const r = await fetch(`${OLLAMA_HOST}/api/generate`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ model, prompt: SMOKE_PROMPT, stream: false, options: { num_predict: 8 } }),
  });
  if (!r.ok) return { ok: false, error: `http ${r.status}` };
  const j = await r.json();
  const text = String(j.response ?? "").trim();
  if (text.length === 0) return { ok: false, error: "empty response" };
  return { ok: true, sample: text.slice(0, 80) };
}

async function smokeEmbed(model) {
  const r = await fetch(`${OLLAMA_HOST}/api/embeddings`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ model, prompt: "PRISM smoke test." }),
  });
  if (!r.ok) return { ok: false, error: `http ${r.status}` };
  const j = await r.json();
  const vec = j.embedding ?? [];
  if (!Array.isArray(vec) || vec.length < 32) return { ok: false, error: `vec length ${vec.length}` };
  return { ok: true, dims: vec.length };
}

async function smokeVision(model) {
  // Vision smoke without an image just confirms the model loads + responds to text.
  // True image round-trip lives in VisionExtractionEngine tests (P21-U01).
  return smokeChat(model);
}

async function main() {
  const present = await ollamaTags();
  console.log(`[pull-multi-model-stack] ollama @ ${OLLAMA_HOST}`);
  console.log(`[pull-multi-model-stack] currently installed: ${present.size} models`);

  const report = [];
  for (const m of MODELS) {
    const start = Date.now();
    let pulled = present.has(m.name);
    if (!pulled) {
      console.log(`\n→ pulling ${m.name} (~${m.approxSizeGB} GB)`);
      pulled = await pull(m.name);
      if (!pulled) {
        report.push({ ...m, pulled: false, smoked: false, error: "pull failed", ms: Date.now() - start });
        continue;
      }
    } else {
      console.log(`\n→ ${m.name} already present`);
    }

    const smoke = m.kind === "embed" ? await smokeEmbed(m.name)
                : m.kind === "vision" ? await smokeVision(m.name)
                : await smokeChat(m.name);
    report.push({ ...m, pulled: true, smoked: smoke.ok, smokeDetail: smoke, ms: Date.now() - start });
    console.log(`   smoke: ${smoke.ok ? "PASS" : "FAIL"} ${smoke.ok ? JSON.stringify(smoke).slice(0, 100) : smoke.error}`);
  }

  console.log("\n=== SUMMARY ===");
  const fail = report.filter((r) => !r.smoked);
  for (const r of report) {
    console.log(`tier ${r.tier} ${r.kind.padEnd(6)} ${r.name.padEnd(28)} ${r.pulled ? "✓pulled" : "✗pull"} ${r.smoked ? "✓smoke" : "✗smoke"} (${r.ms}ms)`);
  }

  if (fail.length > 0) {
    console.error(`\n${fail.length} model(s) failed smoke test`);
    process.exit(1);
  }
  console.log("\nAll models ready. ModelRouterEngine can route to all 5 tiers.");
}

main().catch((e) => { console.error(e); process.exit(2); });
