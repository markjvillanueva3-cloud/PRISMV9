// gpu-vram-guard.mjs - shared GPU/VRAM admission logic for PRISM local-inference.
//
// WHY: On the single Blackwell workstation (RTX PRO 6000, 96GB) the agent can
// thrash VRAM by launching a heavy local-inference model (gpt-oss:120b ~60GB)
// while the card is already nearly full -- ollama silently evicts a warm
// resident model or spills, tanking throughput for every slot. Observed live
// 2026-06-10: nvidia-smi reported 86.6/97.9 GB used while ollama /api/ps showed
// only nomic-embed (323MB) resident, i.e. ~86GB held outside ollama (torch
// stack). A 60GB load on ~11GB free => OOM/evict.
//
// This module is the single source of truth for: (a) detecting a heavy
// local-inference launch from a shell command, (b) reading live VRAM, and
// (c) deciding admission. Pure functions are GPU-free and unit-tested; the one
// impure reader (readGpuVram) is fail-open by contract.
//
// Consumers: .claude/hooks/gpu-vram-admission-guard.mjs (PreToolUse:Bash),
// and any fleet-hygiene surface that wants headroom (fleet-reaper coordinator).
//
// OVERLAP NOTE (R7/R15): scripts/fleet-reaper-sweep.mjs already exports
// readGpuState() -- a richer nvidia-smi reader ({available,name,freeMb,...}).
// This lib keeps its OWN small reader on purpose: importing the 3459-line
// fleet-reaper module into a per-Bash PreToolUse hook would couple the fast
// guard to a heavy module. readGpuVram() returns a superset shape (incl freeMb)
// so a FUTURE consolidation unit can point the reaper at this lib with no
// behavior change. Do NOT add a second divergent reader -- extend this one.
//
// ASCII-only. node:test convention (scripts/).

import { spawnSync } from "node:child_process";

// --- Heuristic footprint constants (NOT physics constants; tuning knobs) -----
// Rough resident-VRAM cost of the quantized GGUFs in PRISM's roster:
//   gpt-oss:120b ~= 60-65GB, qwen2.5-coder:32b ~= 20GB, gpt-oss:20b ~= 13GB.
// ~650 MiB per billion params lands in that band; KV cache adds a fixed pad.
// These bound the "would the incoming model fit in free VRAM" check; they are
// deliberately conservative (over-estimate footprint -> warn slightly early).
export const MIB_PER_BILLION_PARAMS = 650;
export const KV_CACHE_PAD_MIB = 2048;
// A model is "heavy" (worth gating) at or above this parameter count. Below it
// (1.5b/3b/7b embed-class) the eviction risk is low and a warning is just noise.
export const HEAVY_PARAM_FLOOR_B = 20;
// Default pressure floor: at/above this used-fraction, any heavy launch warns
// regardless of footprint estimate (covers unknown-size launches).
export const DEFAULT_FLOOR_PCT = 90;
// Free-VRAM safety margin: require est footprint to fit within this fraction of
// free VRAM, else warn (the load would run the card to the edge).
export const FREE_SAFETY = 0.9;
const NVIDIA_SMI_TIMEOUT_MS = 4000;

// Tokens that mark a command as actually talking to a local LLM runtime, so a
// stray ":32b" in unrelated text does not trip the guard.
const INFERENCE_CONTEXT_RE = /\bollama\b|11434|\/api\/(?:generate|chat|embed|embeddings)\b/i;
// Model parameter-count tag, e.g. ":32b" / ":120b". Global for matchAll.
const MODEL_TAG_RE = /:(\d{1,4})b\b/gi;

/**
 * Parse the largest model parameter count (in billions) referenced by a command.
 * Matches ":NNb" tags (case-insensitive) -> covers :20b/:32b/:70b/:120b and is
 * future-proof. Returns the MAX found (the load that drives footprint), or null.
 * @param {string} command
 * @returns {number|null}
 */
export function parseModelParamB(command) {
  if (typeof command !== "string" || command.length === 0) return null;
  let max = null;
  for (const match of command.matchAll(MODEL_TAG_RE)) {
    const n = Number(match[1]);
    if (Number.isFinite(n) && (max === null || n > max)) max = n;
  }
  return max;
}

/**
 * Decide whether a shell command is a heavy local-inference launch worth gating.
 * Requires BOTH an inference-runtime context token AND a heavy model tag.
 * @param {string} command
 * @returns {{heavy: boolean, modelParamB: number|null, why: string}}
 */
export function isHeavyInferenceLaunch(command) {
  if (typeof command !== "string" || command.length === 0) {
    return { heavy: false, modelParamB: null, why: "empty-command" };
  }
  const hasContext = INFERENCE_CONTEXT_RE.test(command);
  if (!hasContext) return { heavy: false, modelParamB: null, why: "no-inference-context" };
  const paramB = parseModelParamB(command);
  if (paramB === null) return { heavy: false, modelParamB: null, why: "no-model-tag" };
  if (paramB < HEAVY_PARAM_FLOOR_B) {
    return { heavy: false, modelParamB: paramB, why: `model ${paramB}b below heavy floor ${HEAVY_PARAM_FLOOR_B}b` };
  }
  return { heavy: true, modelParamB: paramB, why: `heavy local-inference launch (${paramB}b model)` };
}

/**
 * Estimate resident VRAM footprint (MiB) of a model from its parameter count.
 * @param {number|null} modelParamB
 * @returns {number|null} null when param count unknown
 */
export function estimateFootprintMib(modelParamB) {
  if (!Number.isFinite(modelParamB) || modelParamB <= 0) return null;
  return Math.round(modelParamB * MIB_PER_BILLION_PARAMS + KV_CACHE_PAD_MIB);
}

/**
 * Pure admission decision. Warns (admit=false) when EITHER the card is already
 * at/above the pressure floor OR the incoming model's estimated footprint will
 * not fit within the free-VRAM safety margin.
 * @param {object} o
 * @param {number} o.usedMb
 * @param {number} o.totalMb
 * @param {number|null} [o.modelParamB]
 * @param {number} [o.floorPct]
 * @returns {{admit:boolean, pressurePct:number, freeMb:number, estFootprintMb:number|null,
 *           overFloor:boolean, wouldExceedFree:boolean, reasons:string[]}}
 */
export function assessAdmission({ usedMb, totalMb, modelParamB = null, floorPct = DEFAULT_FLOOR_PCT }) {
  const used = Number(usedMb);
  const total = Number(totalMb);
  // Degenerate input -> admit (fail-open); the impure reader guards against this
  // too, but keep the pure fn total.
  if (!Number.isFinite(used) || !Number.isFinite(total) || total <= 0) {
    return {
      admit: true, pressurePct: 0, freeMb: 0, estFootprintMb: null,
      overFloor: false, wouldExceedFree: false, reasons: ["invalid-vram-read"],
    };
  }
  const floor = Number.isFinite(Number(floorPct)) ? Number(floorPct) : DEFAULT_FLOOR_PCT;
  const pressurePct = Math.round((used / total) * 1000) / 10;
  const freeMb = Math.max(0, Math.round(total - used));
  const estFootprintMb = estimateFootprintMib(modelParamB);
  const overFloor = pressurePct >= floor;
  const wouldExceedFree = estFootprintMb !== null && estFootprintMb > freeMb * FREE_SAFETY;

  const reasons = [];
  if (overFloor) reasons.push(`VRAM at ${pressurePct}% (>= floor ${floor}%)`);
  if (wouldExceedFree) {
    reasons.push(
      `est footprint ~${estFootprintMb} MiB exceeds safe free VRAM ` +
      `(${Math.round(freeMb * FREE_SAFETY)} MiB of ${freeMb} MiB free)`,
    );
  }
  return {
    admit: !(overFloor || wouldExceedFree),
    pressurePct, freeMb, estFootprintMb, overFloor, wouldExceedFree, reasons,
  };
}

/**
 * Read live VRAM via nvidia-smi. Fail-open by contract: any error -> {ok:false}.
 * Multi-GPU safe: returns the HIGHEST-pressure GPU line (most conservative).
 * Uses spawnSync with an argv array (no shell) -> injection-safe.
 * @param {object} [opts]
 * @param {number} [opts.timeoutMs]
 * @param {Function} [opts.runner] injectable spawnSync-like for tests
 * @returns {{ok:true, usedMb:number, totalMb:number, utilPct:number, source:string}
 *          | {ok:false, reason:string}}
 */
export function readGpuVram(opts = {}) {
  const timeoutMs = Number.isFinite(opts.timeoutMs) ? opts.timeoutMs : NVIDIA_SMI_TIMEOUT_MS;
  const runner = opts.runner || ((cmd, args, o) => spawnSync(cmd, args, o));
  let res;
  try {
    res = runner(
      "nvidia-smi",
      ["--query-gpu=memory.used,memory.total,utilization.gpu", "--format=csv,noheader,nounits"],
      { encoding: "utf8", timeout: timeoutMs },
    );
  } catch (e) {
    return { ok: false, reason: `nvidia-smi spawn failed: ${e && e.message ? e.message : e}` };
  }
  if (!res || res.error) return { ok: false, reason: `nvidia-smi error: ${res && res.error ? res.error.message : "no result"}` };
  if (res.status !== 0 && !(res.stdout || "").trim()) {
    return { ok: false, reason: `nvidia-smi status ${res.status}` };
  }
  const lines = String(res.stdout || "").trim().split(/\r?\n/).filter(Boolean);
  let best = null;
  for (const line of lines) {
    const parts = line.split(",").map((s) => Number(String(s).trim()));
    const used = parts[0];
    const total = parts[1];
    const util = parts[2];
    if (!Number.isFinite(used) || !Number.isFinite(total) || total <= 0) continue;
    const pressure = used / total;
    if (best === null || pressure > best.pressure) {
      best = { usedMb: used, totalMb: total, utilPct: Number.isFinite(util) ? util : 0, pressure };
    }
  }
  if (best === null) return { ok: false, reason: "nvidia-smi: no parseable GPU line" };
  // freeMb included for superset-compat with fleet-reaper-sweep.readGpuState.
  return {
    ok: true, usedMb: best.usedMb, totalMb: best.totalMb,
    freeMb: Math.max(0, Math.round(best.totalMb - best.usedMb)),
    utilPct: best.utilPct, source: "nvidia-smi",
  };
}
