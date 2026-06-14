// scripts/lib/catalog-gpu-profile.mjs
//
// BLACKWELL-DB-GEN-MS0 / U-CGP-PROFILE (slot:romeo, 2026-06-03).
//
// Host-aware GPU profile for CATALOG / DATABASE extraction throughput.
//
// WHY: romeo's tool-catalog + machine + material DB generation routes scanned /
// image-only / complex-layout catalog PDFs to the Ollama vision extractor
// (catalog-extraction-router `ollama-vision-ocr`). That extractor's routing note
// was hardcoded to the OLD 16GB RTX 4080 SUPER reality — "needs uncontended GPU,
// resumable OVERNIGHT" — because a 7B vision model (15.3GB) crowded the chat fleet
// and CPU-spilled. On the new RTX PRO 6000 Blackwell (96GB) the VL model
// (qwen3-vl:8b-instruct, 8.1GB) sits CONCURRENT with the coder model + embed model
// with ~70GB headroom, so catalog extraction can run during normal operation with
// real parallelism — no idle overnight window required. This module is the single
// source of truth for that decision so the router (and any future catalog-extraction
// orchestrator) picks model + concurrency + overnight-gating from the LIVE host GPU,
// not a baked-in 16GB assumption.
//
// REUSE / NON-DUP (R8): the fleet-reaper host preset
// (state/shared/dashboards/fleet-reaper-host-presets.json) tunes PROCESS REAPING
// (memory floor, keep-alive). ModelRoutingEngine.ts (alpha, home_blackwell) routes
// CHAT tasks (cloud frontier vs local) for reasoning. NEITHER decides vision-extraction
// concurrency / overnight-gating for catalog PDF throughput — this module owns that
// one decision. It mirrors the reaper's hostname-keyed preset schema on purpose so an
// operator who already knows the reaper presets reads this with zero new vocabulary.
//
// PURE + FAIL-SOFT: every export is deterministic and importable; the only impure path
// is detectGpuTier's nvidia-smi probe, which is injectable (runImpl) for hermetic tests
// and NEVER throws — it degrades nvidia-smi → env override → hostname preset →
// conservative default. Acceleration is an optimization, never a correctness gate
// (same discipline as scripts/lib/path-embed.mjs).
//
// Knobs:
//   PRISM_CATALOG_GPU_VRAM_GB   — force the VRAM tier (GB), highest precedence (CI / probe-less hosts)
//   PRISM_CATALOG_VISION_MODEL  — force the vision model (override the per-tier default)
//   PRISM_CATALOG_GPU_CONCURRENCY — force the worker concurrency (override the per-tier default)

import os from "node:os";
import { execFileSync } from "node:child_process";

// ── Hostname-keyed presets (mirrors fleet-reaper-host-presets.json keying) ──────────
// Only the VRAM is needed here — the tier table below maps VRAM → extraction profile.
// A host absent from this map falls through to the live nvidia-smi probe.
export const HOST_VRAM_GB = {
  "DESKTOP-N7MI1VB": 96, // RTX PRO 6000 Blackwell Workstation Edition 96GB (BLACKWELL-GPU-SWAP 2026-06-03)
  MarkV: 16, // RTX 4080 SUPER 16GB (the "work" host)
};

// ── VRAM tier → catalog-extraction profile ─────────────────────────────────────────
// qwen3-vl:8b-instruct is the proven catalog/blueprint VL model across ALL tiers
// (8.1GB resident; the INSTRUCT variant is mandatory — bare qwen3-vl:8b is a thinking
// model that never emits the JSON; qwen2.5vl:7b was 15.3GB and CPU-spilled on 16GB —
// see reference_xray_ocr_gpu_concurrency_2026_05_31). Tiers differ on CONCURRENCY and
// the OVERNIGHT GATE, which is the real efficiency dial: a big card extracts during
// normal operation, a small card must wait for an idle fleet window.
const VISION_MODEL = "qwen3-vl:8b-instruct";
export const GPU_TIERS = [
  {
    name: "blackwell",
    minVramGB: 48,
    visionModel: VISION_MODEL,
    concurrency: 3,
    overnightGated: false,
    vramFloorMB: 24576,
    rationale:
      "≥48GB VRAM: VL(8GB)+coder(9GB)+embed(0.3GB) co-resident with ~70GB headroom — extract CONCURRENTLY with the live fleet, no overnight window. Realized ×N inference also needs OLLAMA_NUM_PARALLEL≥N on the server (each parallel slot adds ~num_ctx of KV-cache); worker concurrency overlaps render/IO regardless.",
  },
  {
    name: "highend",
    minVramGB: 24,
    visionModel: VISION_MODEL,
    concurrency: 2,
    overnightGated: false,
    vramFloorMB: 12288,
    rationale:
      "24-48GB VRAM: VL co-resident with one fleet model — limited parallelism, still no overnight gate.",
  },
  {
    name: "midrange",
    minVramGB: 12,
    visionModel: VISION_MODEL,
    concurrency: 1,
    overnightGated: true,
    vramFloorMB: 6144,
    rationale:
      "12-24GB VRAM: VL fits but crowds the fleet coder model — serial, overnight-gated (run when the fleet is idle).",
  },
  {
    name: "low",
    minVramGB: 0,
    visionModel: VISION_MODEL,
    concurrency: 1,
    overnightGated: true,
    vramFloorMB: 4096,
    rationale:
      "<12GB or unknown: conservative — serial, overnight-gated; the VL model likely CPU-spills, expect slow pages.",
  },
];

/**
 * Map a VRAM amount (GB) → the matching extraction profile (always returns one;
 * non-finite / negative VRAM → the most conservative tier). Pure.
 * @param {number} vramGB
 */
export function profileForVram(vramGB) {
  const v = Number.isFinite(vramGB) && vramGB > 0 ? vramGB : 0;
  // GPU_TIERS is ordered high→low minVramGB, so the first match is the best fit.
  return GPU_TIERS.find((t) => v >= t.minVramGB) || GPU_TIERS[GPU_TIERS.length - 1];
}

/**
 * Parse `nvidia-smi --query-gpu=memory.total --format=csv,noheader,nounits` stdout
 * (one MiB integer per GPU line) → max VRAM in GB. Tolerant of blank/garbage lines.
 * Returns null when no positive integer is present. Pure.
 * @param {string} stdout
 */
export function parseNvidiaSmiVram(stdout) {
  if (typeof stdout !== "string") return null;
  const mib = stdout
    .split(/\r?\n/)
    .map((s) => parseInt(s.trim(), 10))
    .filter((n) => Number.isFinite(n) && n > 0);
  if (!mib.length) return null;
  const maxMiB = Math.max(...mib);
  return maxMiB / 1024; // MiB → GB
}

function defaultNvidiaSmi() {
  return execFileSync(
    "nvidia-smi",
    ["--query-gpu=memory.total", "--format=csv,noheader,nounits"],
    { encoding: "utf8", timeout: 4000, stdio: ["ignore", "pipe", "ignore"] },
  );
}

/**
 * Resolve the live host's catalog-extraction GPU profile. Fail-soft precedence:
 *   1. PRISM_CATALOG_GPU_VRAM_GB env override (CI / probe-less hosts)
 *   2. nvidia-smi probe (the live truth)
 *   3. hostname preset (HOST_VRAM_GB)
 *   4. conservative default (tier "low")
 * PRISM_CATALOG_VISION_MODEL / PRISM_CATALOG_GPU_CONCURRENCY further override the
 * resolved profile's fields. NEVER throws.
 * @param {{runImpl?:Function, hostname?:string, env?:Record<string,string>}} [opts]
 * @returns {{name:string, vramGB:number, visionModel:string, concurrency:number,
 *            overnightGated:boolean, vramFloorMB:number, rationale:string, source:string}}
 */
export function detectGpuTier(opts = {}) {
  const env = opts.env || process.env;
  let vramGB = null;
  let source = "default";

  const envVram = Number(env.PRISM_CATALOG_GPU_VRAM_GB);
  if (Number.isFinite(envVram) && envVram > 0) {
    vramGB = envVram;
    source = "env";
  }

  if (vramGB == null) {
    const run = opts.runImpl || defaultNvidiaSmi;
    try {
      const parsed = parseNvidiaSmiVram(run());
      if (Number.isFinite(parsed) && parsed > 0) {
        vramGB = parsed;
        source = "nvidia-smi";
      }
    } catch {
      /* nvidia-smi absent / failed — fall through */
    }
  }

  if (vramGB == null) {
    const host = opts.hostname || os.hostname();
    const preset = HOST_VRAM_GB[host];
    if (Number.isFinite(preset) && preset > 0) {
      vramGB = preset;
      source = `host-preset:${host}`;
    }
  }

  if (vramGB == null) vramGB = 0; // conservative default tier

  const tier = profileForVram(vramGB);
  const resolved = { ...tier, vramGB, source };

  // explicit field overrides (operator escape hatches)
  const modelOverride = env.PRISM_CATALOG_VISION_MODEL;
  if (typeof modelOverride === "string" && modelOverride.trim()) resolved.visionModel = modelOverride.trim();
  const concOverride = Number(env.PRISM_CATALOG_GPU_CONCURRENCY);
  if (Number.isFinite(concOverride) && concOverride >= 1) resolved.concurrency = Math.floor(concOverride);

  return resolved;
}

/**
 * One-line human summary of a resolved profile (for routing-registry notes + logs). Pure.
 * @param {ReturnType<typeof detectGpuTier>} p
 */
export function describeProfile(p) {
  if (!p || typeof p !== "object") return "catalog-gpu: unknown";
  const gate = p.overnightGated ? "overnight-gated" : "concurrent (no overnight gate)";
  const vram = Number.isFinite(p.vramGB) ? Math.round(p.vramGB) : 0; // display-round the raw nvidia-smi float
  return `catalog-gpu: tier=${p.name} (${vram}GB, via ${p.source}) → ${p.visionModel} ×${p.concurrency} workers, ${gate}`;
}

/**
 * Recommend the OLLAMA_NUM_PARALLEL the Ollama server SHOULD be configured with for this host
 * GPU profile — the inference-slot ceiling that lets the extractor's worker concurrency become
 * REAL GPU parallelism. Single source of truth for the tier→slots mapping that
 * scripts/system-health/05-soft-config-tweaks.ps1 applies at the OS level (blackwell 4 /
 * highend|home 2 / midrange|low|work 1): a 96GB card affords its worker count PLUS fleet-chat
 * inference headroom (each slot ≈ num_ctx of KV-cache — trivial at 96GB); a 16GB card keeps it
 * low so the VL slots don't crowd the resident coder model. Pure; unknown profile → 1 (safe).
 * @param {ReturnType<typeof detectGpuTier>} profile
 */
export function recommendOllamaNumParallel(profile) {
  switch (profile && typeof profile === "object" ? profile.name : null) {
    case "blackwell": return 4; // ≥48GB — 3 extraction workers + fleet-chat inference headroom
    case "highend": return 2;   // 24-48GB — one slot beyond the lone fleet model
    default: return 1;          // midrange/low/unknown — avoid crowding the resident coder model
  }
}

const round1 = (n) => Math.round(n * 10) / 10;
const round2 = (n) => Math.round(n * 100) / 100;

/**
 * Estimate a catalog-extraction wall-clock plan from a resolved profile + a MEASURED
 * per-worker page rate. Quantifies the operator's "improve efficiency if possible"
 * question with the REAL Blackwell levers and NO fabricated throughput constant:
 *   1. worker CONCURRENCY (profile.concurrency) — divides compute time by N workers, BUT
 *      bounded by `ollamaParallel`: GPU inference only parallelizes up to the Ollama
 *      server's OLLAMA_NUM_PARALLEL slots (each slot also costs ~num_ctx of KV-cache VRAM).
 *      effectiveWorkers = min(workers, ollamaParallel); when slots < workers the inference
 *      SERIALIZES and the realized speedup is below the worker count (R12 — never present
 *      `speedup == workers` as a given when the server can't deliver it). Omitting
 *      ollamaParallel = optimistic (== workers); the live batch resolves the REAL slot
 *      count via resolveOllamaParallel() and passes it in.
 *   2. removal of the OVERNIGHT-WAIT latency — a 16GB host must idle-wait for a free
 *      fleet window before extraction can even start; a Blackwell starts immediately.
 * pagesPerMinPerWorker MUST be supplied (measure it once on the target GPU — e.g. a
 * single run-ollama-vision-extract.mjs page timing). We refuse to invent it (R12).
 * Pure; fail-soft → {ok:false, reason} on bad input, never throws.
 *
 * @param {{totalPages:number, pagesPerMinPerWorker:number, profile:object, overnightWaitHrs?:number, ollamaParallel?:number}} a
 */
export function estimateExtractionPlan(a = {}) {
  const { totalPages, pagesPerMinPerWorker, profile } = a;
  const overnightWaitHrs = Number.isFinite(a.overnightWaitHrs) ? Math.max(0, a.overnightWaitHrs) : 8;
  if (!Number.isFinite(totalPages) || totalPages <= 0) return { ok: false, reason: "totalPages must be a positive number" };
  if (!Number.isFinite(pagesPerMinPerWorker) || pagesPerMinPerWorker <= 0)
    return { ok: false, reason: "pagesPerMinPerWorker must be MEASURED on the target GPU (> 0) — not fabricated" };
  if (!profile || typeof profile !== "object") return { ok: false, reason: "profile required (from detectGpuTier)" };

  const workers = Math.max(1, Number.isFinite(profile.concurrency) ? Math.floor(profile.concurrency) : 1);
  // Inference is bounded by the server's parallel slots. Omitted → optimistic (== workers);
  // a value < workers means the GPU inference serializes (only CPU render/IO overlaps).
  const ollamaParallel = Number.isFinite(a.ollamaParallel) && a.ollamaParallel >= 1 ? Math.floor(a.ollamaParallel) : workers;
  const effectiveWorkers = Math.max(1, Math.min(workers, ollamaParallel));
  const inferenceSerialized = effectiveWorkers < workers;
  const overnightGated = !!profile.overnightGated;
  const serialComputeMin = totalPages / pagesPerMinPerWorker; // 1-worker baseline
  const computeMin = totalPages / (pagesPerMinPerWorker * effectiveWorkers); // slot-bounded concurrent
  const overnightWaitMin = overnightGated ? overnightWaitHrs * 60 : 0;
  const wallClockMin = computeMin + overnightWaitMin;

  return {
    ok: true,
    workers,
    effectiveWorkers,
    ollamaParallel,
    inferenceSerialized,
    overnightGated,
    serialComputeMin: round1(serialComputeMin),
    computeMin: round1(computeMin),
    concurrencySpeedup: round2(serialComputeMin / computeMin), // == effectiveWorkers (NOT necessarily workers)
    overnightWaitMin,
    wallClockMin: round1(wallClockMin),
    note: overnightGated
      ? `serial (1 worker) + must idle-wait ~${overnightWaitHrs}h for a free fleet window before starting`
      : inferenceSerialized
        ? `${workers} workers but only ${effectiveWorkers}× inference (OLLAMA_NUM_PARALLEL=${ollamaParallel}); raise the server's parallel slots for the full ×${workers}`
        : `${effectiveWorkers}× concurrent workers, starts immediately (no overnight wait)`,
  };
}
