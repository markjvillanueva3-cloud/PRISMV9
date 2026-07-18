#!/usr/bin/env node
// ollama-embed-lane.mjs -- guardian for the DEDICATED CPU embed lane
// (U-INDIA-EMBED-LANE, slot:india 2026-07-01).
//
// WHY A SECOND INSTANCE: live-measured 2026-07-01, the shared :11434 Ollama
// starves new-model requests at the scheduler level under fleet mining load --
// nomic-embed-text requests (GPU or CPU-pinned) got HTTP 000 after 300s, so the
// tribal-embed cron exit-3'd every 30 min and the recall dense arm went dark.
// A second `ollama serve` on 127.0.0.1:11435 has its OWN request queue and,
// with every request CPU-pinned (num_gpu:0 -- see scripts/lib/embed-endpoint.mjs
// for why serve-env CUDA hiding is NOT sufficient on this box), serves warm
// embeds in 0.16-0.83s while the GPU stays 100% the miners'.
//
// This guardian is IDEMPOTENT and runs from a user-level scheduled task
// (install-ollama-embed-lane-task.ps1, every 5 min):
//   lane up   -> warm-pin nomic (num_gpu:0, keep_alive 60m) -> exit 0 (~0.2s)
//   lane down -> spawn detached `ollama serve` bound to the lane port, poll
//                /api/tags up to BOOT_SEC, warm-pin -> exit 0
// The scheduled task (not a chat) owns the serve process, so the fleet-reaper
// never classifies it as a chat orphan (a manually-spawned validation instance
// WAS reaped mid-session -- that is the failure mode this task closes).
//
// Consumers resolve the lane via scripts/lib/embed-endpoint.mjs and fall back
// to :11434 whenever the lane is absent -- so this guardian failing is a
// degradation, never a breakage. Always exits 0 (a scheduled task must never
// error-loop); status goes to stdout (--json for machines).
//
// Env: PRISM_EMBED_LANE_URL (default http://127.0.0.1:11435) ·
//      PRISM_EMBED_LANE_DISABLE=1 kill switch ·
//      PRISM_EMBED_LANE_MODEL (default nomic-embed-text) ·
//      PRISM_EMBED_LANE_KEEP_ALIVE (default 60m) ·
//      PRISM_EMBED_LANE_BOOT_SEC (default 30) ·
//      PRISM_EMBED_LANE_WARM_SEC (default 45; cold CPU load measured ~6-9s) ·
//      PRISM_OLLAMA_EXE (default %LOCALAPPDATA%\Programs\Ollama\ollama.exe)

import { spawn, spawnSync } from "node:child_process";
import { existsSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { LANE_URL, withLaneOptions, recordLaneVerdict } from "./lib/embed-endpoint.mjs";

const KILL = "PRISM_EMBED_LANE_DISABLE";
const MODEL = process.env.PRISM_EMBED_LANE_MODEL || "nomic-embed-text";
const KEEP_ALIVE = process.env.PRISM_EMBED_LANE_KEEP_ALIVE || "60m";
const BOOT_SEC = Number(process.env.PRISM_EMBED_LANE_BOOT_SEC || 30);
const WARM_SEC = Number(process.env.PRISM_EMBED_LANE_WARM_SEC || 45);

/** Pure: host:port for OLLAMA_HOST from the lane base url. Throws on garbage. */
export function laneHostPort(laneUrl = LANE_URL) {
  const u = new URL(laneUrl);
  return `${u.hostname}:${u.port || "80"}`;
}

/**
 * Pure: the serve-process env. Small CPU-polite footprint: one model, 4
 * parallel embed slots, 8 threads (of 32 -- never crowd the fleet's CPU work),
 * 2048 ctx (nomic's window). CUDA_VISIBLE_DEVICES="" is belt-only -- Ollama's
 * NVML discovery ignores it on this box, so the real CPU pin is the per-request
 * num_gpu:0 that every lane consumer sends (embed-endpoint.withLaneOptions).
 */
export function buildServeEnv(baseEnv = process.env, laneUrl = LANE_URL) {
  return {
    ...baseEnv,
    OLLAMA_HOST: laneHostPort(laneUrl),
    OLLAMA_KEEP_ALIVE: KEEP_ALIVE,
    OLLAMA_MAX_LOADED_MODELS: "1",
    OLLAMA_NUM_PARALLEL: "4",
    OLLAMA_NUM_THREAD: "8",
    OLLAMA_CONTEXT_LENGTH: "2048",
    CUDA_VISIBLE_DEVICES: "",
  };
}

/** Pure-ish: locate ollama.exe (env override -> default install -> PATH name). */
export function resolveOllamaExe(env = process.env, existsImpl = existsSync) {
  if (env.PRISM_OLLAMA_EXE) return env.PRISM_OLLAMA_EXE;
  if (env.LOCALAPPDATA) {
    const p = path.join(env.LOCALAPPDATA, "Programs", "Ollama", "ollama.exe");
    if (existsImpl(p)) return p;
  }
  return "ollama"; // PATH fallback (also the non-Windows shape)
}

/** Pure: telemetry classification (mirrors ollama-embed-keepalive contract). */
export function classifyAction(laneWasUp, spawned, warmed) {
  if (!warmed) return laneWasUp ? "warm-failed" : (spawned ? "boot-warm-failed" : "boot-failed");
  if (laneWasUp) return "refreshed";
  return spawned ? "booted" : "cold-recovered";
}

function curl(args, timeoutSec) {
  return spawnSync("curl", args, { encoding: "utf8", timeout: (timeoutSec + 2) * 1000, maxBuffer: 4 * 1024 * 1024, windowsHide: true });
}

function laneUp() {
  const r = curl(["-fsS", "-m", "2", `${LANE_URL}/api/tags`], 2);
  return r.status === 0;
}

function warmPin() {
  const body = withLaneOptions({ model: MODEL, prompt: "keepalive", keep_alive: KEEP_ALIVE });
  const r = curl(["-sS", "-m", String(WARM_SEC), "-X", "POST", `${LANE_URL}/api/embeddings`,
    "-H", "Content-Type: application/json", "-d", JSON.stringify(body)], WARM_SEC);
  if (r.status !== 0) return false;
  try {
    const j = JSON.parse(r.stdout);
    return Array.isArray(j.embedding) && j.embedding.length > 0;
  } catch { return false; }
}

async function main() {
  const asJson = process.argv.includes("--json");
  const result = { ok: true, model: MODEL, laneUrl: LANE_URL, action: "", laneWasUp: false, spawned: false, warmedMs: 0 };
  if (process.env[KILL] === "1") { result.action = "kill-switch"; return emit(result, asJson); }

  result.laneWasUp = laneUp();
  if (!result.laneWasUp) {
    const exe = resolveOllamaExe();
    // spawn() delivers a missing binary (ENOENT on the PATH fallback) as an
    // ASYNC 'error' event, not a synchronous throw -- without a listener it
    // becomes an uncaught exception at the first event-loop yield and exits 1,
    // breaking the always-exit-0 contract (scrutiny arm-A P1). Capture it.
    let spawnError = null;
    try {
      const child = spawn(exe, ["serve"], {
        env: buildServeEnv(), detached: true, stdio: "ignore", windowsHide: true,
      });
      child.on("error", (e) => { spawnError = e; });
      child.unref();
      result.spawned = true;
    } catch (e) {
      spawnError = e;
    }
    const deadline = Date.now() + BOOT_SEC * 1000;
    let up = false;
    while (!spawnError && Date.now() < deadline) {
      if (laneUp()) { up = true; break; }
      await new Promise((r) => setTimeout(r, 1000));
    }
    if (spawnError) {
      result.ok = false; result.spawned = false; result.action = "spawn-failed";
      result.error = String((spawnError && spawnError.message) || spawnError);
      recordLaneVerdict(false); // consumers must not wait a TTL to fall back
      return emit(result, asJson);
    }
    if (!up) {
      result.ok = false; result.action = "boot-timeout";
      recordLaneVerdict(false);
      return emit(result, asJson);
    }
  }

  const t0 = Date.now();
  const warmed = warmPin();
  result.warmedMs = Date.now() - t0;
  result.ok = warmed;
  result.action = classifyAction(result.laneWasUp, result.spawned, warmed);
  // The warm-pin is the real EMBED-CAPABILITY probe -- /api/tags alone can say
  // "up" while embeds are broken (model missing/wedged runner). Publish the
  // verdict so consumers adopt a healthy lane within one tick and abandon a
  // tags-up-but-embed-broken lane instead of blackholing (scrutiny arm-B P1).
  recordLaneVerdict(warmed);
  return emit(result, asJson);
}

function emit(result, asJson) {
  if (asJson) process.stdout.write(JSON.stringify(result) + "\n");
  else process.stdout.write(`[ollama-embed-lane] ${result.action} model=${result.model} lane=${result.laneUrl}${result.warmedMs ? " warm=" + result.warmedMs + "ms" : ""}\n`);
  return 0; // always exit 0 -- a scheduled task must never error-loop
}

if (process.argv[1] && fileURLToPath(import.meta.url) === path.resolve(process.argv[1])) {
  main().then((code) => process.exit(code)).catch(() => process.exit(0));
}
