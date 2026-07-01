// node --test scripts/lib/catalog-gpu-profile.test.mjs
// BLACKWELL-DB-GEN-MS0 / U-CGP-PROFILE (slot:romeo, 2026-06-03).
// Real-value coverage: tier boundaries, nvidia-smi parsing (incl. multi-GPU + garbage),
// the 4-step fail-soft precedence chain, field overrides, and adversarial inputs.

import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import {
  GPU_TIERS,
  HOST_VRAM_GB,
  profileForVram,
  parseNvidiaSmiVram,
  detectGpuTier,
  describeProfile,
  estimateExtractionPlan,
  recommendOllamaNumParallel,
} from "./catalog-gpu-profile.mjs";

// ── profileForVram — VRAM → tier boundaries ─────────────────────────────────
test("96GB Blackwell → blackwell tier, concurrent (no overnight gate)", () => {
  const p = profileForVram(96);
  assert.equal(p.name, "blackwell");
  assert.equal(p.overnightGated, false);
  assert.equal(p.concurrency, 3);
});

test("each boundary maps to the correct tier (48/47/24/23/12/11)", () => {
  assert.equal(profileForVram(48).name, "blackwell");
  assert.equal(profileForVram(47).name, "highend");
  assert.equal(profileForVram(24).name, "highend");
  assert.equal(profileForVram(23).name, "midrange");
  assert.equal(profileForVram(12).name, "midrange");
  assert.equal(profileForVram(11).name, "low");
});

test("16GB RTX 4080 → midrange, overnight-gated, serial", () => {
  const p = profileForVram(16);
  assert.equal(p.name, "midrange");
  assert.equal(p.overnightGated, true);
  assert.equal(p.concurrency, 1);
});

test("every tier uses the proven INSTRUCT vision model", () => {
  for (const t of GPU_TIERS) assert.equal(t.visionModel, "qwen3-vl:8b-instruct");
});

test("adversarial VRAM (0, negative, NaN, undefined) → conservative 'low', never throws", () => {
  assert.equal(profileForVram(0).name, "low");
  assert.equal(profileForVram(-5).name, "low");
  assert.equal(profileForVram(NaN).name, "low");
  assert.equal(profileForVram(undefined).name, "low");
});

test("Infinity (non-finite, not a real VRAM reading) → conservative 'low', not blackwell", () => {
  // Number.isFinite(Infinity) === false → treated as 0 → 'low'. Safer than trusting a
  // bogus ∞ reading and running max concurrency on a phantom card.
  assert.equal(profileForVram(Infinity).name, "low");
});

// ── parseNvidiaSmiVram ──────────────────────────────────────────────────────
test("single 96GB card: '98304' MiB → 96 GB", () => {
  assert.equal(parseNvidiaSmiVram("98304\n"), 96);
});

test("multi-GPU returns the MAX card's VRAM", () => {
  assert.equal(parseNvidiaSmiVram("16384\n24576\n"), 24);
});

test("tolerates blank + garbage lines around the number", () => {
  assert.equal(parseNvidiaSmiVram("\n  16384  \nNVIDIA-SMI 550\n"), 16);
});

test("returns null on empty / non-string / all-garbage / zero", () => {
  assert.equal(parseNvidiaSmiVram(""), null);
  assert.equal(parseNvidiaSmiVram(null), null);
  assert.equal(parseNvidiaSmiVram(42), null);
  assert.equal(parseNvidiaSmiVram("no gpu here"), null);
  assert.equal(parseNvidiaSmiVram("0\n"), null);
});

// ── detectGpuTier — fail-soft precedence chain ──────────────────────────────
const throwingSmi = () => {
  throw new Error("nvidia-smi: command not found");
};

test("1) env override PRISM_CATALOG_GPU_VRAM_GB wins over everything", () => {
  const p = detectGpuTier({
    env: { PRISM_CATALOG_GPU_VRAM_GB: "96" },
    runImpl: () => "16384", // would say 16GB, but env wins
    hostname: "MarkV",
  });
  assert.equal(p.name, "blackwell");
  assert.equal(p.vramGB, 96);
  assert.equal(p.source, "env");
});

test("2) nvidia-smi probe used when no env override", () => {
  const p = detectGpuTier({ env: {}, runImpl: () => "98304\n", hostname: "MarkV" });
  assert.equal(p.name, "blackwell");
  assert.equal(p.vramGB, 96);
  assert.equal(p.source, "nvidia-smi");
});

test("3) hostname preset used when env+nvidia-smi both unavailable", () => {
  const p = detectGpuTier({ env: {}, runImpl: throwingSmi, hostname: "DESKTOP-N7MI1VB" });
  assert.equal(p.vramGB, 96);
  assert.equal(p.name, "blackwell");
  assert.equal(p.source, "host-preset:DESKTOP-N7MI1VB");
});

test("3b) MarkV host preset → 16GB midrange (overnight-gated)", () => {
  const p = detectGpuTier({ env: {}, runImpl: throwingSmi, hostname: "MarkV" });
  assert.equal(p.vramGB, 16);
  assert.equal(p.name, "midrange");
  assert.equal(p.overnightGated, true);
});

test("4) unknown host + no probe → conservative default 'low', never throws", () => {
  const p = detectGpuTier({ env: {}, runImpl: throwingSmi, hostname: "some-random-ci-box" });
  assert.equal(p.name, "low");
  assert.equal(p.vramGB, 0);
  assert.equal(p.source, "default");
});

test("field overrides: PRISM_CATALOG_VISION_MODEL + PRISM_CATALOG_GPU_CONCURRENCY", () => {
  const p = detectGpuTier({
    env: {
      PRISM_CATALOG_GPU_VRAM_GB: "96",
      PRISM_CATALOG_VISION_MODEL: "llama3.2-vision:11b",
      PRISM_CATALOG_GPU_CONCURRENCY: "5",
    },
  });
  assert.equal(p.visionModel, "llama3.2-vision:11b");
  assert.equal(p.concurrency, 5);
  assert.equal(p.name, "blackwell"); // tier still resolved from VRAM
});

test("ignores a garbage concurrency override (<1) and keeps the tier default", () => {
  const p = detectGpuTier({ env: { PRISM_CATALOG_GPU_VRAM_GB: "96", PRISM_CATALOG_GPU_CONCURRENCY: "0" } });
  assert.equal(p.concurrency, 3); // blackwell default, not 0
});

test("HOST_VRAM_GB is the canonical host map (Blackwell + MarkV present)", () => {
  assert.equal(HOST_VRAM_GB["DESKTOP-N7MI1VB"], 96);
  assert.equal(HOST_VRAM_GB.MarkV, 16);
});

// ── describeProfile ─────────────────────────────────────────────────────────
test("Blackwell summary names model, workers, and the concurrent gate", () => {
  const s = describeProfile(detectGpuTier({ env: { PRISM_CATALOG_GPU_VRAM_GB: "96" } }));
  assert.ok(s.includes("blackwell"), s);
  assert.ok(s.includes("qwen3-vl:8b-instruct"), s);
  assert.ok(s.includes("×3"), s);
  assert.ok(s.includes("concurrent"), s);
});

test("16GB summary names the overnight gate", () => {
  const s = describeProfile(detectGpuTier({ env: { PRISM_CATALOG_GPU_VRAM_GB: "16" } }));
  assert.ok(s.includes("overnight-gated"), s);
});

test("null / non-object → safe 'unknown' string, never throws", () => {
  assert.equal(describeProfile(null), "catalog-gpu: unknown");
  assert.equal(describeProfile(42), "catalog-gpu: unknown");
});

// ── estimateExtractionPlan — quantify the Blackwell efficiency levers ────────
test("Blackwell (×3, not gated): 300 pages @ 2 ppm/worker → 50min, speedup 3, no overnight wait", () => {
  const blackwell = detectGpuTier({ env: { PRISM_CATALOG_GPU_VRAM_GB: "96" } });
  const plan = estimateExtractionPlan({ totalPages: 300, pagesPerMinPerWorker: 2, profile: blackwell });
  assert.equal(plan.ok, true);
  assert.equal(plan.workers, 3);
  assert.equal(plan.overnightGated, false);
  assert.equal(plan.serialComputeMin, 150);
  assert.equal(plan.computeMin, 50);
  assert.equal(plan.concurrencySpeedup, 3);
  assert.equal(plan.overnightWaitMin, 0);
  assert.equal(plan.wallClockMin, 50);
});

test("16GB (×1, gated): same corpus → 150min compute + 480min overnight wait = 630min wall-clock", () => {
  const midrange = detectGpuTier({ env: { PRISM_CATALOG_GPU_VRAM_GB: "16" } });
  const plan = estimateExtractionPlan({ totalPages: 300, pagesPerMinPerWorker: 2, profile: midrange });
  assert.equal(plan.workers, 1);
  assert.equal(plan.overnightGated, true);
  assert.equal(plan.computeMin, 150);
  assert.equal(plan.concurrencySpeedup, 1);
  assert.equal(plan.overnightWaitMin, 480); // 8h default
  assert.equal(plan.wallClockMin, 630);
});

test("custom overnightWaitHrs is honored", () => {
  const midrange = detectGpuTier({ env: { PRISM_CATALOG_GPU_VRAM_GB: "16" } });
  const plan = estimateExtractionPlan({ totalPages: 60, pagesPerMinPerWorker: 1, profile: midrange, overnightWaitHrs: 2 });
  assert.equal(plan.overnightWaitMin, 120);
  assert.equal(plan.wallClockMin, 180); // 60min compute + 120min wait
});

test("refuses to fabricate throughput: missing/zero/negative pagesPerMinPerWorker → ok:false", () => {
  const p = detectGpuTier({ env: { PRISM_CATALOG_GPU_VRAM_GB: "96" } });
  assert.equal(estimateExtractionPlan({ totalPages: 100, profile: p }).ok, false);
  assert.equal(estimateExtractionPlan({ totalPages: 100, pagesPerMinPerWorker: 0, profile: p }).ok, false);
  assert.equal(estimateExtractionPlan({ totalPages: 100, pagesPerMinPerWorker: -5, profile: p }).ok, false);
});

// ── recommendOllamaNumParallel (U-CGP-NUMPARALLEL-RECO — SSOT for the PS config table) ──
test("recommendOllamaNumParallel: per-tier slots (blackwell 4 / highend 2 / else 1)", () => {
  assert.equal(recommendOllamaNumParallel({ name: "blackwell" }), 4);
  assert.equal(recommendOllamaNumParallel({ name: "highend" }), 2);
  assert.equal(recommendOllamaNumParallel({ name: "midrange" }), 1);
  assert.equal(recommendOllamaNumParallel({ name: "low" }), 1);
});
test("recommendOllamaNumParallel: unknown/null profile → 1 (safe default)", () => {
  assert.equal(recommendOllamaNumParallel(null), 1);
  assert.equal(recommendOllamaNumParallel({}), 1);
  assert.equal(recommendOllamaNumParallel("garbage"), 1);
});
test("recommendOllamaNumParallel: blackwell recommendation ≥ its worker concurrency", () => {
  const bw = detectGpuTier({ env: { PRISM_CATALOG_GPU_VRAM_GB: "96" } });
  assert.ok(recommendOllamaNumParallel(bw) >= bw.concurrency, "recommended slots must cover the worker count");
});
test("recommendOllamaNumParallel: PARITY with 05-soft-config-tweaks.ps1 numParallel table (anti-drift, R9)", () => {
  // The PS script and this helper are TWO encodings of one tier→slots decision. Pin them: if
  // either drifts (PS retunes a tier, or this helper changes a value), this test fails loud.
  const psPath = join(dirname(fileURLToPath(import.meta.url)), "..", "system-health", "05-soft-config-tweaks.ps1");
  const slots = [...readFileSync(psPath, "utf8").matchAll(/\$numParallel\s*=\s*'(\d+)'/g)].map((m) => Number(m[1]));
  assert.deepEqual(slots, [4, 2, 1], "PS config table changed — update recommendOllamaNumParallel to match (SSOT drift)");
  assert.equal(recommendOllamaNumParallel({ name: "blackwell" }), slots[0]); // blackwell ≥48GB
  assert.equal(recommendOllamaNumParallel({ name: "highend" }), slots[1]);   // PS 'home' / 16GB tier
  assert.equal(recommendOllamaNumParallel({ name: "low" }), slots[2]);       // PS 'work' / small
});

test("estimateExtractionPlan: ollamaParallel < workers bounds speedup (inference serializes, P0-2)", () => {
  const bw = { name: "blackwell", concurrency: 3, overnightGated: false };
  const plan = estimateExtractionPlan({ totalPages: 300, pagesPerMinPerWorker: 2, profile: bw, ollamaParallel: 1 });
  assert.equal(plan.workers, 3);
  assert.equal(plan.effectiveWorkers, 1);
  assert.equal(plan.inferenceSerialized, true);
  assert.equal(plan.concurrencySpeedup, 1, "speedup bounded to 1 inference slot, not 3 workers");
  assert.match(plan.note, /only 1× inference/);
});
test("estimateExtractionPlan: ollamaParallel ≥ workers → full worker speedup", () => {
  const bw = { name: "blackwell", concurrency: 3, overnightGated: false };
  const plan = estimateExtractionPlan({ totalPages: 300, pagesPerMinPerWorker: 2, profile: bw, ollamaParallel: 4 });
  assert.equal(plan.effectiveWorkers, 3);
  assert.equal(plan.inferenceSerialized, false);
  assert.equal(plan.concurrencySpeedup, 3);
});
test("estimateExtractionPlan: omitting ollamaParallel is optimistic (== workers, back-compat)", () => {
  const bw = { name: "blackwell", concurrency: 3, overnightGated: false };
  const plan = estimateExtractionPlan({ totalPages: 300, pagesPerMinPerWorker: 2, profile: bw });
  assert.equal(plan.effectiveWorkers, 3);
  assert.equal(plan.concurrencySpeedup, 3);
  assert.equal(plan.inferenceSerialized, false);
});

test("adversarial: totalPages ≤0 / null profile → ok:false, never throws", () => {
  const p = detectGpuTier({ env: { PRISM_CATALOG_GPU_VRAM_GB: "96" } });
  assert.equal(estimateExtractionPlan({ totalPages: 0, pagesPerMinPerWorker: 2, profile: p }).ok, false);
  assert.equal(estimateExtractionPlan({ totalPages: -10, pagesPerMinPerWorker: 2, profile: p }).ok, false);
  assert.equal(estimateExtractionPlan({ totalPages: 100, pagesPerMinPerWorker: 2, profile: null }).ok, false);
  assert.equal(estimateExtractionPlan().ok, false);
});
