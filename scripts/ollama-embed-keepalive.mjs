#!/usr/bin/env node
// ollama-embed-keepalive.mjs -- keep nomic-embed-text RESIDENT so the Obsidian
// memory-recall dense arm never goes dark on a cold-evicted embed model.
//
// THE PROBLEM (observed live 2026-06-10): the recall embed in
// scripts/lib/memory-index-search-lib.mjs has a hard ~2.5s cap (it runs inside the
// 5s UserPromptSubmit budget), but a COLD nomic-embed-text load is ~5s on this box
// when the fleet cycles big models through VRAM (/api/ps returns models:[] under
// contention). So once nomic is evicted, EVERY recall embed times out -> the dense
// (Qdrant ANN / sidecar) arm is permanently dark (BM25-only recall) until something
// with a longer timeout reloads it. This periodic keeper IS that something: a
// generous-timeout embed that absorbs the cold load and pins nomic with a long
// keep_alive, so the latency-capped recall path always finds it warm.
//
// This does NOT touch the Ollama SERVICE env (the gated/out-of-scope go-live step
// documented in scripts/lib/ollama-coresidency.mjs RECOMMENDED_ENV) -- it only uses
// the public API, so it never restarts the shared service or disrupts the 26-slot
// fleet. nomic-embed-text is ~274MB -- trivial to keep resident on the 96GB box.
//
// Fires from a user-level scheduled task (install-ollama-embed-keepalive-task.ps1)
// every few minutes. Fail-soft: ollama down / curl error -> no-op, exit 0.
//
// Flags: --json. KILL SWITCH: PRISM_EMBED_KEEPALIVE_DISABLE=1.

import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";

const KILL = "PRISM_EMBED_KEEPALIVE_DISABLE";
const OLLAMA_URL = process.env.OLLAMA_URL || "http://127.0.0.1:11434";
const MODEL = process.env.PRISM_EMBED_KEEPALIVE_MODEL || "nomic-embed-text";
// 30m: the recall hot-path is the highest-frequency embed consumer; keeping nomic
// resident 30m (vs ollama's 5m default / coresidency's generic "5m" embed class)
// bridges quiet windows between task ticks. Costs ~274MB -- negligible at 96GB.
const KEEP_ALIVE = process.env.PRISM_EMBED_KEEPALIVE_DURATION || "30m";
// generous: a cold nomic load is ~5s; 20s absorbs it with margin. This is exactly
// the timeout the recall path CANNOT afford (2.5s cap) -- which is why this keeper
// exists as a separate, latency-unconstrained loop.
const WARM_TIMEOUT_SEC = Number(process.env.PRISM_EMBED_KEEPALIVE_TIMEOUT_SEC || 20);

// PURE CORE (R9): is the target model already resident, per an /api/ps body?
// Accepts a JSON string or parsed object; matches exact name or "<target>:<tag>".
export function isModelWarm(psBody, target) {
  let j;
  try { j = typeof psBody === "string" ? JSON.parse(psBody) : psBody; } catch { return false; }
  const models = j && Array.isArray(j.models) ? j.models : [];
  return models.some((m) => {
    const n = m && (m.name || m.model);
    return typeof n === "string" && (n === target || n.startsWith(target + ":"));
  });
}

// PURE CORE: the /api/embeddings warm body that pins the model resident.
export function buildWarmBody(model, keepAlive) {
  return JSON.stringify({ model, prompt: "keepalive", keep_alive: keepAlive });
}

// PURE CORE: classify the outcome from (wasWarm, embeddingReturned) for telemetry.
// "cold-recovered" is the load-bearing signal -- it means the keeper caught a real
// eviction that would otherwise have left recall dark.
export function classifyAction(wasWarm, embeddingReturned) {
  if (!embeddingReturned) return "warm-no-embedding";
  return wasWarm ? "refreshed" : "cold-recovered";
}

function curl(args, timeoutSec) {
  return spawnSync("curl", args, { encoding: "utf8", timeout: (timeoutSec + 2) * 1000, maxBuffer: 4 * 1024 * 1024, windowsHide: true });
}

function main() {
  const asJson = process.argv.includes("--json");
  const result = { ok: true, model: MODEL, action: "", wasWarm: false, warmedMs: 0 };
  if (process.env[KILL] === "1") { result.action = "kill-switch"; return emit(result, asJson); }

  const up = curl(["-fsS", "-m", "2", `${OLLAMA_URL}/api/tags`], 2);
  if (up.status !== 0) { result.ok = false; result.action = "ollama-down"; return emit(result, asJson); }

  const ps = curl(["-fsS", "-m", "2", `${OLLAMA_URL}/api/ps`], 2);
  result.wasWarm = ps.status === 0 && isModelWarm(ps.stdout, MODEL);

  // Always re-pin: a warm pin is ~70ms and refreshes the keep_alive timer so the
  // model never expires between ticks; a cold pin absorbs the ~5s load.
  const t0 = Date.now();
  const r = curl(["-sS", "-m", String(WARM_TIMEOUT_SEC), "-X", "POST",
    `${OLLAMA_URL}/api/embeddings`, "-H", "Content-Type: application/json",
    "-d", buildWarmBody(MODEL, KEEP_ALIVE)], WARM_TIMEOUT_SEC);
  result.warmedMs = Date.now() - t0;
  if (r.status !== 0) { result.ok = false; result.action = "warm-failed"; return emit(result, asJson); }

  let gotEmbedding = false;
  try { const j = JSON.parse(r.stdout); gotEmbedding = Array.isArray(j.embedding) && j.embedding.length > 0; } catch { /* error body */ }
  result.ok = gotEmbedding;
  result.action = classifyAction(result.wasWarm, gotEmbedding);
  return emit(result, asJson);
}

function emit(result, asJson) {
  if (asJson) process.stdout.write(JSON.stringify(result) + "\n");
  else process.stdout.write(`[ollama-embed-keepalive] ${result.action} model=${result.model}${result.warmedMs ? " in " + result.warmedMs + "ms" : ""}\n`);
  return 0; // always exit 0 -- a scheduled task must never error-loop
}

if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) process.exit(main());
