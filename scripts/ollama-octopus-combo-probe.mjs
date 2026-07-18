#!/usr/bin/env node
// tier: T3
// OLLAMA-OCTOPUS-COMBO-PROBE — concrete demonstration of which hybrid/combo local
// voices the octopus (MultiModelConsensusEngine.dualOllama) forms on THIS host,
// against the LIVE Ollama /api/tags installed set + projected post-pull scenarios.
//
// WHY: answers the operator question "can we run hybrid or combo llms utilizing
// octopus?" with a runnable trace instead of an assertion (R12 fail-loud / R8 read
// before claim). Surfaced a correction: the octopus EXCLUDES vision models from the
// text-consensus voice picker (isVisionOllamaModel), so a VLM is NEVER seated as a
// 2nd text voice — an earlier analysis claimed otherwise and was wrong.
//
// FAITHFUL PORT of the 5 selection functions from
//   mcp-server/src/engines/MultiModelConsensusEngine.ts
//   ollamaModelSize:196 · isEmbeddingOllamaModel:202 · isVisionOllamaModel:216 ·
//   pickBestOllamaModel:227 · resolveOllamaModels:255 · dual-fire guard ask():376
//   DEFAULT_OLLAMA_MODEL:174 · DEFAULT_SECONDARY_OLLAMA_MODEL:175
// To verify port==engine, diff these bodies against those line ranges. Pure logic,
// no engine import (the engine's top-level imports ollamaClientEngine which would do
// network I/O on import) — this probe stays import-clean + offline-safe.
//
// Run: node H:/prism/scripts/ollama-octopus-combo-probe.mjs

const OLLAMA_CODER_BONUS = 0.5;
const DEFAULT_OLLAMA_MODEL = "gpt-oss:120b"; // engine:174 most-powerful local (install-gated)
const DEFAULT_SECONDARY_OLLAMA_MODEL = "qwen2.5-coder:32b"; // engine:175 reliable floor

function ollamaModelSize(name) {
  const m = name.match(/:(\d+(?:\.\d+)?)b/i);
  return m ? Number.parseFloat(m[1]) : 0;
}
function isEmbeddingOllamaModel(name) {
  return /embed/i.test(name);
}
function isVisionOllamaModel(name) {
  return /(?:-vl\b|vl:|vision|moondream|llava|bakllava|minicpm-v)/i.test(name);
}
function pickBestOllamaModel(installed, exclude) {
  if (!Array.isArray(installed)) return null;
  const candidates = installed.filter(
    (m) =>
      typeof m === "string" &&
      m.length > 0 &&
      !isEmbeddingOllamaModel(m) &&
      !isVisionOllamaModel(m) &&
      m !== exclude,
  );
  if (candidates.length === 0) return null;
  const scored = candidates.map((name) => ({
    name,
    score: ollamaModelSize(name) + (/cod(e|er)/i.test(name) ? OLLAMA_CODER_BONUS : 0),
  }));
  scored.sort((a, b) => b.score - a.score || a.name.localeCompare(b.name));
  return scored[0].name;
}
function resolveOllamaModels(primary, secondary, wantDual, installed) {
  if (!Array.isArray(installed) || installed.length === 0) return { primary, secondary };
  const resolvedPrimary = installed.includes(primary) ? primary : pickBestOllamaModel(installed) ?? primary;
  if (!wantDual) return { primary: resolvedPrimary, secondary };
  const secondaryOk = installed.includes(secondary) && secondary !== resolvedPrimary;
  const resolvedSecondary = secondaryOk ? secondary : pickBestOllamaModel(installed, resolvedPrimary) ?? resolvedPrimary;
  return { primary: resolvedPrimary, secondary: resolvedSecondary };
}

/** Trace one scenario: resolve the dual-Ollama voices + report whether DUAL fires. */
function traceCombo(label, installed) {
  const { primary, secondary } = resolveOllamaModels(
    DEFAULT_OLLAMA_MODEL,
    DEFAULT_SECONDARY_OLLAMA_MODEL,
    true, // dualOllama auto-fires when no cloud voice (engine:339)
    installed,
  );
  // ask():376 — dual fires ONLY when the two resolved voices differ.
  const dualFires = secondary !== primary;
  const chatCandidates = installed.filter(
    (m) => !isEmbeddingOllamaModel(m) && !isVisionOllamaModel(m),
  );
  return { label, primary, secondary, dualFires, chatCandidates };
}

async function fetchInstalled() {
  try {
    const ctrl = new AbortController();
    const t = setTimeout(() => ctrl.abort(), 5000);
    const r = await fetch("http://127.0.0.1:11434/api/tags", { signal: ctrl.signal });
    clearTimeout(t);
    if (!r.ok) return { ok: false, models: [], err: `HTTP ${r.status}` };
    const d = await r.json();
    return { ok: true, models: (d.models || []).map((m) => m.name).sort() };
  } catch (e) {
    return { ok: false, models: [], err: e?.message || String(e) };
  }
}

function render(t) {
  const voices = t.dualFires ? `${t.primary}  +  ${t.secondary}  (2-VOICE COMBO)` : `${t.primary}  (single voice — no distinct 2nd)`;
  return [
    `── ${t.label}`,
    `   chat-capable candidates (vision+embed excluded): ${t.chatCandidates.length ? t.chatCandidates.join(", ") : "(none)"}`,
    `   octopus local voices: ${voices}`,
  ].join("\n");
}

async function main() {
  const live = await fetchInstalled();
  if (!live.ok) {
    console.log(`Ollama /api/tags unreachable (${live.err}). Showing PROJECTED scenarios only.`);
  }
  const installed = live.ok ? live.models : [
    "llama3.2-vision:11b", "moondream:1.8b", "nomic-embed-text:latest",
    "qwen2.5-coder:32b", "qwen2.5vl:7b", "qwen3-vl:8b", "qwen3-vl:8b-instruct",
  ];
  console.log("OLLAMA-OCTOPUS COMBO PROBE");
  console.log(`installed (${installed.length}): ${installed.join(", ")}`);
  console.log("");
  const scenarios = [
    traceCombo("TODAY (live installed set)", installed),
    traceCombo("+ gemma4:31b pulled", [...installed, "gemma4:31b"]),
    traceCombo("+ gpt-oss:120b pulled", [...installed, "gpt-oss:120b"]),
    traceCombo("+ gemma4:31b AND gpt-oss:120b pulled", [...installed, "gemma4:31b", "gpt-oss:120b"]),
  ];
  for (const s of scenarios) console.log(render(s) + "\n");
  console.log("KEY: a 2-VOICE COMBO is a genuine hybrid octopus consensus (distinct local models,");
  console.log("vision/embed excluded as text voices). gemma4:31b (no coder bonus) pairs with the");
  console.log("code-tuned 32b for a DIVERSE pair; gpt-oss:120b outranks both → becomes primary.");
}

main().catch((e) => {
  console.error(e?.message || String(e));
  process.exitCode = 1;
});
