/**
 * Tests for OllamaCapabilityProbeEngine (BLACKWELL-AI-MS0 / U-CAP-PROBE).
 *
 * Coverage: happy path · WDDM free-VRAM correction (the verified Windows
 * artifact) · 3 failure modes (no GPU, Ollama down, malformed JSON) · 2
 * adversarial (NaN/empty VRAM, oversize-doesn't-fit) · 4-profile variability
 * (blackwell/4080/3080/cloud_only) · TTL cache (injected clock) · the
 * round-trip integration that proves a probe-filtered catalog stops
 * ModelRoutingEngine.route() from ever picking an ABSENT model · real-data E2E.
 *
 * All deterministic tests inject readers + clock — hermetic, no GPU/daemon
 * needed. The injected readers are the I/O boundary; the SUT is the probe's
 * parse/correct/filter/cache LOGIC, asserted against exact values. The final
 * E2E runs the REAL readers (pure-core+injected-readers lesson: prove the live
 * path produces a valid shape, never "mock passes, real never runs").
 */
import { describe, it, expect } from "vitest";
import {
  OllamaCapabilityProbeEngine,
  PROBE_CACHE_TTL_MS,
  DESKTOP_RESERVE_MIB,
  type ProbeReaders,
} from "../engines/OllamaCapabilityProbeEngine.js";
import { ModelRoutingEngine } from "../engines/ModelRoutingEngine.js";
import { executeAIReasoningAction } from "../tools/dispatchers/aiReasoningDispatcher.js";

// ── reader fixtures ──────────────────────────────────────────────────────────
const BLACKWELL_SMI_WDDM = "NVIDIA RTX PRO 6000 Blackwell Workstation Edition, 97887, 1528"; // free implausibly low (WDDM)
const BLACKWELL_SMI_PLAUSIBLE = "NVIDIA RTX PRO 6000 Blackwell Workstation Edition, 97887, 80000";
const SMI_4080 = "NVIDIA GeForce RTX 4080 SUPER, 16376, 15000";
const SMI_3080 = "NVIDIA GeForce RTX 3080, 10240, 9000";

/** A loaded model occupying ≈ 8344 MiB (8749454458 bytes) — drives the WDDM
 *  free-VRAM estimate (free = total − loaded − reserve). The /api/ps model name
 *  need not be in DEFAULT_MODEL_CATALOG; only its size_vram is load-bearing. */
const PS_LOADED_8GB = { models: [{ name: "qwen3-vl:8b", size_vram: 8749454458 }] };

function readers(over: Partial<ProbeReaders>): Partial<ProbeReaders> {
  return over;
}

describe("OllamaCapabilityProbeEngine", () => {
  // ── happy path + WDDM correction ──────────────────────────────────────────
  it("detects home_blackwell, WDDM-corrects free VRAM, and lists runnable present models", async () => {
    const eng = new OllamaCapabilityProbeEngine(
      readers({
        readNvidiaSmi: async () => BLACKWELL_SMI_WDDM,
        readOllamaTags: async () => ({
          models: [
            { name: "qwen2.5-coder:32b" },
            { name: "qwen3-vl:8b" },
            { name: "nomic-embed-text" },
          ],
        }),
        readOllamaPs: async () => PS_LOADED_8GB,
      }),
    );
    const snap = await eng.probe({ nowMs: 1_000, platform: "win32" });

    expect(snap.hardware).toBe("home_blackwell");
    expect(snap.source).toBe("live");
    expect(snap.backendUp.ollama).toBe(true);
    // WDDM: raw free 1528 < 15% of 97887 → estimate = 97887 − 8344 − 2048.
    expect(snap.gpu?.freeEstimated).toBe(true);
    const loadedMiB = Math.round(8749454458 / (1024 * 1024)); // 8344
    expect(snap.gpu?.freeMiB).toBe(97887 - loadedMiB - DESKTOP_RESERVE_MIB);
    expect(snap.gpu?.rawFreeMiB).toBe(1528);
    expect(snap.gpu?.totalMiB).toBe(97887);
    // All three present models are in the live catalog as home_blackwell-runnable
    // and fit the ~87GB estimated free → runnable. (qwen3-vl:8b replaces the
    // retired qwen2.5-coder:7b — U-BW-TS-ENGINES-RETIRE 2026-06-04.)
    expect(snap.runnableModelIds.sort()).toEqual(
      ["nomic-embed-text", "qwen2.5-coder:32b", "qwen3-vl:8b"],
    );
    expect(snap.warnings.some((w) => w.includes("WDDM"))).toBe(true);
  });

  it("trusts a plausible nvidia-smi free reading (no WDDM estimate)", async () => {
    const eng = new OllamaCapabilityProbeEngine(
      readers({
        readNvidiaSmi: async () => BLACKWELL_SMI_PLAUSIBLE,
        readOllamaTags: async () => ({ models: [{ name: "qwen2.5-coder:32b" }] }),
        readOllamaPs: async () => ({ models: [] }),
      }),
    );
    const snap = await eng.probe({ nowMs: 1_000 });
    expect(snap.gpu?.freeEstimated).toBe(false);
    expect(snap.gpu?.freeMiB).toBe(80000);
    expect(snap.gpu?.rawFreeMiB).toBe(80000);
  });

  // ── WDDM correction is WINDOWS-ONLY (P1 fix: never inflate real low-free on Linux) ──
  it("does NOT inflate an implausibly-low free reading on non-Windows (real VRAM pressure)", async () => {
    const eng = new OllamaCapabilityProbeEngine(
      readers({
        // Linux host, GPU genuinely 95% occupied by another process (free really IS 1528).
        readNvidiaSmi: async () => BLACKWELL_SMI_WDDM,
        readOllamaTags: async () => ({ models: [{ name: "qwen2.5-coder:32b" }] }),
        readOllamaPs: async () => ({ models: [] }),
      }),
    );
    const snap = await eng.probe({ nowMs: 1_000, platform: "linux" });
    // No WDDM estimate on Linux — trust the real low free; nothing big is runnable.
    expect(snap.gpu?.freeEstimated).toBe(false);
    expect(snap.gpu?.freeMiB).toBe(1528);
    expect(snap.runnableModelIds).not.toContain("qwen2.5-coder:32b"); // 20480 > 1528 → would OOM
    expect(snap.warnings.some((w) => w.includes("not WDDM"))).toBe(true);
  });

  // ── resident-model 0-marginal credit (octopus single-voter fix) ──────────────
  // Contrast with the test ABOVE: identical VRAM pressure (linux, free 1528 < qwen
  // 20480 nominal), but here qwen2.5-coder:32b is ALREADY LOADED (/api/ps). A resident
  // model costs 0 marginal VRAM (its bytes are already subtracted from free), so it
  // MUST be runnable -- it was wrongly dropped before, collapsing a 2-voice octopus
  // panel to 1 whenever one big voice was resident and free < its nominal size.
  it("seats a RESIDENT model whose nominal exceeds free VRAM (0-marginal credit)", async () => {
    const eng = new OllamaCapabilityProbeEngine(
      readers({
        readNvidiaSmi: async () => BLACKWELL_SMI_WDDM, // linux below -> raw free 1528, no inflation
        readOllamaTags: async () => ({ models: [{ name: "qwen2.5-coder:32b" }] }),
        // RESIDENT in VRAM (already loaded) -> 0 marginal cost
        readOllamaPs: async () => ({ models: [{ name: "qwen2.5-coder:32b", size_vram: 54_000_000_000 }] }),
      }),
    );
    const snap = await eng.probe({ nowMs: 1_000, platform: "linux" });
    expect(snap.hardware).toBe("home_blackwell");
    expect(snap.runnableModelIds).toContain("qwen2.5-coder:32b"); // resident -> seated despite 20480 > 1528
  });

  it("still DROPS a non-resident oversize model (the OOM gate is unchanged for new loads)", async () => {
    const eng = new OllamaCapabilityProbeEngine(
      readers({
        readNvidiaSmi: async () => BLACKWELL_SMI_WDDM,
        readOllamaTags: async () => ({ models: [{ name: "qwen2.5-coder:32b" }] }),
        readOllamaPs: async () => ({ models: [{ name: "qwen3-vl:8b", size_vram: 8_000_000_000 }] }), // a DIFFERENT model resident
      }),
    );
    const snap = await eng.probe({ nowMs: 1_000, platform: "linux" });
    // qwen2.5-coder:32b is NOT resident and 20480 > free -> must stay dropped (no OOM regression).
    expect(snap.runnableModelIds).not.toContain("qwen2.5-coder:32b");
  });

  // ── WDDM + /api/ps unavailable → conservative raw free (P1 fix: don't over-promise) ──
  it("falls back to raw free (conservative) when WDDM-implausible AND /api/ps is unavailable", async () => {
    const eng = new OllamaCapabilityProbeEngine(
      readers({
        readNvidiaSmi: async () => BLACKWELL_SMI_WDDM, // free 1528 implausible
        readOllamaTags: async () => ({ models: [{ name: "qwen2.5-coder:32b" }] }),
        readOllamaPs: async () => null, // ps unreachable — loaded VRAM unknown
      }),
    );
    const snap = await eng.probe({ nowMs: 1_000, platform: "win32" });
    // Cannot verify loaded VRAM → keep raw free rather than over-estimate into an OOM.
    expect(snap.gpu?.freeEstimated).toBe(false);
    expect(snap.gpu?.freeMiB).toBe(1528);
    expect(snap.runnableModelIds).not.toContain("qwen2.5-coder:32b");
    expect(snap.warnings.some((w) => w.includes("/api/ps unavailable"))).toBe(true);
  });

  // ── absent-model exclusion (the keystone's reason for existing) ────────────
  it("excludes catalog models that are ABSENT from /api/tags and warns", async () => {
    const eng = new OllamaCapabilityProbeEngine(
      readers({
        readNvidiaSmi: async () => BLACKWELL_SMI_PLAUSIBLE,
        // deepseek-r1:14b is in DEFAULT_MODEL_CATALOG but NOT pulled here.
        readOllamaTags: async () => ({ models: [{ name: "qwen2.5-coder:32b" }] }),
        readOllamaPs: async () => ({ models: [] }),
      }),
    );
    const snap = await eng.probe({ nowMs: 1_000 });
    expect(snap.runnableModelIds).toContain("qwen2.5-coder:32b");
    expect(snap.runnableModelIds).not.toContain("deepseek-r1:14b");
    expect(snap.warnings.some((w) => w.includes("ABSENT from /api/tags"))).toBe(true);
  });

  // ── ROUND-TRIP: probe-filtered catalog stops route() picking an absent model ─
  it("routableCatalog() feeds ModelRoutingEngine so route() never selects an absent model", async () => {
    const eng = new OllamaCapabilityProbeEngine(
      readers({
        readNvidiaSmi: async () => BLACKWELL_SMI_PLAUSIBLE,
        readOllamaTags: async () => ({ models: [{ name: "qwen2.5-coder:32b" }] }), // only the 32b present
        readOllamaPs: async () => ({ models: [] }),
      }),
    );
    const filtered = await eng.routableCatalog({ nowMs: 1_000 });
    const filteredIds = filtered.map((m) => m.id);
    // deepseek-r1:14b (absent) must be filtered out; the present 32b stays; cloud models pass through.
    expect(filteredIds).not.toContain("deepseek-r1:14b");
    expect(filteredIds).toContain("qwen2.5-coder:32b");
    expect(filteredIds).toContain("claude-opus-4-7"); // non-ollama passes through

    const ctx = await eng.toRoutingContext({ nowMs: 1_000 });
    expect(ctx.hardware).toBe("home_blackwell");
    expect(ctx.backendUp).toEqual({ ollama: true });

    const router = new ModelRoutingEngine(filtered);
    const decision = router.route(
      { taskKind: "code", inputTokens: 500, outputTokensMax: 500, costBudgetUSD: 0 },
      ctx,
    );
    expect(decision.ok).toBe(true);
    // Free-only ($0) code task on blackwell → the present local coder, never the absent deepseek.
    expect(decision.model).toBe("qwen2.5-coder:32b");
  });

  // ── failure mode 1: no GPU / nvidia-smi missing ────────────────────────────
  it("degrades to cloud_only when nvidia-smi is unavailable", async () => {
    const eng = new OllamaCapabilityProbeEngine(
      readers({
        readNvidiaSmi: async () => null,
        readOllamaTags: async () => ({ models: [{ name: "nomic-embed-text" }] }),
        readOllamaPs: async () => ({ models: [] }),
      }),
    );
    const snap = await eng.probe({ nowMs: 1_000 });
    expect(snap.hardware).toBe("cloud_only");
    expect(snap.gpu).toBeNull();
    expect(snap.runnableModelIds).toEqual([]); // no local GPU → nothing local runnable
    expect(snap.source).toBe("degraded");
  });

  // ── failure mode 2: Ollama down ────────────────────────────────────────────
  it("marks backend down and runnable empty when Ollama is unreachable", async () => {
    const eng = new OllamaCapabilityProbeEngine(
      readers({
        readNvidiaSmi: async () => BLACKWELL_SMI_PLAUSIBLE,
        readOllamaTags: async () => null,
        readOllamaPs: async () => null,
      }),
    );
    const snap = await eng.probe({ nowMs: 1_000 });
    expect(snap.hardware).toBe("home_blackwell"); // GPU still detected
    expect(snap.backendUp.ollama).toBe(false);
    expect(snap.presentModels).toEqual([]);
    expect(snap.runnableModelIds).toEqual([]); // nothing present → nothing runnable
    expect(snap.source).toBe("degraded");
  });

  // ── failure mode 3: malformed Ollama JSON (daemon up, junk body) ───────────
  it("handles malformed /api/tags JSON without throwing", async () => {
    const eng = new OllamaCapabilityProbeEngine(
      readers({
        readNvidiaSmi: async () => BLACKWELL_SMI_PLAUSIBLE,
        readOllamaTags: async () => ({ unexpected: "shape" }), // non-null but no models[]
        readOllamaPs: async () => "not even an object",
      }),
    );
    const snap = await eng.probe({ nowMs: 1_000 });
    expect(snap.presentModels).toEqual([]);
    expect(snap.loadedModels).toEqual([]);
    expect(snap.backendUp.ollama).toBe(true); // reachable, just empty
    expect(snap.runnableModelIds).toEqual([]);
  });

  // ── adversarial 1: NaN nvidia-smi output ───────────────────────────────────
  it("treats non-numeric nvidia-smi VRAM as no GPU (cloud_only)", async () => {
    const eng = new OllamaCapabilityProbeEngine(
      readers({
        readNvidiaSmi: async () => "BadGPU, abc, xyz",
        readOllamaTags: async () => ({ models: [{ name: "nomic-embed-text" }] }),
        readOllamaPs: async () => ({ models: [] }),
      }),
    );
    const snap = await eng.probe({ nowMs: 1_000 });
    expect(snap.hardware).toBe("cloud_only");
    expect(snap.gpu).toBeNull();
    expect(snap.runnableModelIds).toEqual([]);
  });

  // ── adversarial 1b: truncated nvidia-smi line (too few fields) ─────────────
  it("treats a truncated nvidia-smi line as no GPU (cloud_only)", async () => {
    const eng = new OllamaCapabilityProbeEngine(
      readers({
        readNvidiaSmi: async () => "OnlyOneField",
        readOllamaTags: async () => ({ models: [] }),
        readOllamaPs: async () => ({ models: [] }),
      }),
    );
    const snap = await eng.probe({ nowMs: 1_000 });
    expect(snap.hardware).toBe("cloud_only");
    expect(snap.gpu).toBeNull();
  });

  // ── adversarial 2: present model that does NOT fit free VRAM ───────────────
  // Uses phi3:14b (live catalog: vramGB 14 = 14336 MiB, runsOn [home_blackwell,
  // home_4080]). qwen2.5-coder:7b was `ollama rm`'d 2026-06-04 (U-BW-TS-ENGINES-
  // RETIRE) and dropped from DEFAULT_MODEL_CATALOG — a catalog-absent model can
  // never be runnable, so the old fixture asserted the wrong mechanism. phi3:14b
  // is the live same-footprint analogue (the model-retired-but-test-stale class).
  it("excludes a present model that does not fit free VRAM and warns", async () => {
    const eng = new OllamaCapabilityProbeEngine(
      readers({
        // 4080 with only 10000 MiB free; phi3:14b declares vram 14GB = 14336 MiB → does NOT fit.
        readNvidiaSmi: async () => "NVIDIA GeForce RTX 4080 SUPER, 16376, 10000",
        readOllamaTags: async () => ({ models: [{ name: "phi3:14b" }] }),
        readOllamaPs: async () => ({ models: [] }),
      }),
    );
    const snap = await eng.probe({ nowMs: 1_000 });
    expect(snap.hardware).toBe("home_4080");
    expect(snap.presentModels).toContain("phi3:14b");
    expect(snap.runnableModelIds).not.toContain("phi3:14b");
    expect(snap.warnings.some((w) => w.includes("not runnable now"))).toBe(true);
  });

  // ── variability: 4080 + 3080 profiles ──────────────────────────────────────
  it("detects home_4080 and runs a fitting model, excludes blackwell-only models", async () => {
    const eng = new OllamaCapabilityProbeEngine(
      readers({
        readNvidiaSmi: async () => SMI_4080, // 15000 free
        readOllamaTags: async () => ({ models: [{ name: "phi3:14b" }, { name: "nomic-embed-text" }] }),
        readOllamaPs: async () => ({ models: [] }),
      }),
    );
    const snap = await eng.probe({ nowMs: 1_000 });
    expect(snap.hardware).toBe("home_4080");
    expect(snap.runnableModelIds).toContain("phi3:14b"); // 14336 <= 15000
    expect(snap.runnableModelIds).not.toContain("qwen2.5-coder:32b"); // runsOn excludes 4080
  });

  it("detects work_3080 and runs only small models", async () => {
    const eng = new OllamaCapabilityProbeEngine(
      readers({
        readNvidiaSmi: async () => SMI_3080, // 9000 free
        readOllamaTags: async () => ({ models: [{ name: "llama3.2:3b" }] }),
        readOllamaPs: async () => ({ models: [] }),
      }),
    );
    const snap = await eng.probe({ nowMs: 1_000 });
    expect(snap.hardware).toBe("work_3080");
    expect(snap.runnableModelIds).toContain("llama3.2:3b"); // 6144 <= 9000
  });

  // ── cache (TTL with injected clock) ────────────────────────────────────────
  it("serves a cached snapshot within TTL and re-probes after expiry / on force / on clear", async () => {
    let calls = 0;
    const eng = new OllamaCapabilityProbeEngine(
      readers({
        readNvidiaSmi: async () => {
          calls++;
          return BLACKWELL_SMI_PLAUSIBLE;
        },
        readOllamaTags: async () => ({ models: [{ name: "qwen2.5-coder:32b" }] }),
        readOllamaPs: async () => ({ models: [] }),
      }),
    );
    const a = await eng.probe({ nowMs: 1_000 });
    expect(a.source).toBe("live");
    expect(calls).toBe(1);

    const b = await eng.probe({ nowMs: 1_000 + PROBE_CACHE_TTL_MS - 1 });
    expect(b.source).toBe("cached");
    expect(calls).toBe(1); // no re-probe

    const c = await eng.probe({ nowMs: 1_000 + PROBE_CACHE_TTL_MS + 1 });
    expect(c.source).toBe("live");
    expect(calls).toBe(2); // re-probed after expiry

    const d = await eng.probe({ nowMs: 1_000 + PROBE_CACHE_TTL_MS + 1, force: true });
    expect(d.source).toBe("live");
    expect(calls).toBe(3); // force bypasses cache

    eng.clearCache();
    const e = await eng.probe({ nowMs: 1_000 + PROBE_CACHE_TTL_MS + 1 });
    expect(e.source).toBe("live");
    expect(calls).toBe(4); // cleared → re-probe
  });

  it("isModelPresent reflects the live store", async () => {
    const eng = new OllamaCapabilityProbeEngine(
      readers({
        readNvidiaSmi: async () => BLACKWELL_SMI_PLAUSIBLE,
        readOllamaTags: async () => ({ models: [{ name: "qwen2.5-coder:32b" }] }),
        readOllamaPs: async () => ({ models: [] }),
      }),
    );
    expect(await eng.isModelPresent("qwen2.5-coder:32b", { nowMs: 1 })).toBe(true);
    expect(await eng.isModelPresent("kimi-k2.6", { nowMs: 1 })).toBe(false);
  });

  // ── real-data E2E: live readers must not throw + produce a valid shape ─────
  it("real host probe produces a valid snapshot shape (live readers, soft)", async () => {
    const eng = new OllamaCapabilityProbeEngine(); // real nvidia-smi + Ollama HTTP
    const snap = await eng.probe({ force: true });
    expect(["home_blackwell", "home_4080", "work_3080", "cloud_only"]).toContain(snap.hardware);
    expect(Array.isArray(snap.presentModels)).toBe(true);
    expect(Array.isArray(snap.runnableModelIds)).toBe(true);
    expect(["live", "degraded"]).toContain(snap.source);
    expect(new Date(snap.probedAt).toISOString()).toBe(snap.probedAt);
    // Cross-field invariant: runnable ⊆ present (can't run what isn't installed).
    for (const id of snap.runnableModelIds) expect(snap.presentModels).toContain(id);
  });

  // ── getBestLocalModel / getBestReasoningModel / getBestChatModel ────────────
  // (BLACKWELL-AI-MS5/U-OCTOPUS-PANEL) the capability-oracle selector the octopus
  // calls so it can NEVER request a model that is absent/unfittable right now.
  describe("getBestLocalModel selector", () => {
    it("picks the highest qualityTier RUNNABLE local model for reasoning (Blackwell)", async () => {
      const eng = new OllamaCapabilityProbeEngine(
        readers({
          readNvidiaSmi: async () => BLACKWELL_SMI_PLAUSIBLE, // 80000 free → all fit
          readOllamaTags: async () => ({
            models: [
              { name: "qwen2.5-coder:32b" }, // qualityTier 83 ← best reasoning
              { name: "qwen3-vl:8b" }, //       qualityTier 66
              { name: "nomic-embed-text" }, //  embedder (excluded)
            ],
          }),
          readOllamaPs: async () => ({ models: [] }),
        }),
      );
      expect(await eng.getBestReasoningModel({ nowMs: 1 })).toBe("qwen2.5-coder:32b");
    });

    it("ranks by codeTier for the code axis (32b codeTier 90 > 8b)", async () => {
      const eng = new OllamaCapabilityProbeEngine(
        readers({
          readNvidiaSmi: async () => BLACKWELL_SMI_PLAUSIBLE,
          readOllamaTags: async () => ({
            models: [{ name: "qwen3-vl:8b" }, { name: "qwen2.5-coder:32b" }],
          }),
          readOllamaPs: async () => ({ models: [] }),
        }),
      );
      expect(await eng.getBestChatModel({ nowMs: 1 })).toBe("qwen2.5-coder:32b");
    });

    it("variability: 4080 ranks by TIER among fitting models, excludes blackwell-only", async () => {
      // 4080 with 15000 free: qwen2.5-coder:32b is home_blackwell-only (excluded by
      // runsOn — proves the profile gate). Of the two that fit + run on 4080,
      // qwen3-vl:8b (qualityTier 66) outranks phi3:14b (qualityTier 62) — the
      // selector ranks by capability TIER, not size: a tuned 8b can out-reason a
      // generic 14b. This is the intended behavior (R9: the test encodes WHY).
      const eng = new OllamaCapabilityProbeEngine(
        readers({
          readNvidiaSmi: async () => SMI_4080,
          readOllamaTags: async () => ({
            models: [{ name: "qwen2.5-coder:32b" }, { name: "phi3:14b" }, { name: "qwen3-vl:8b" }],
          }),
          readOllamaPs: async () => ({ models: [] }),
        }),
      );
      const pick = await eng.getBestReasoningModel({ nowMs: 1 });
      expect(pick).toBe("qwen3-vl:8b"); // qualityTier 66 > phi3 62; 32b excluded by runsOn
      expect(pick).not.toBe("qwen2.5-coder:32b"); // blackwell-only, never on a 4080
    });

    it("variability: 3080 small-only host picks llama3.2:3b", async () => {
      const eng = new OllamaCapabilityProbeEngine(
        readers({
          readNvidiaSmi: async () => SMI_3080, // 9000 free
          readOllamaTags: async () => ({ models: [{ name: "llama3.2:3b" }] }),
          readOllamaPs: async () => ({ models: [] }),
        }),
      );
      expect(await eng.getBestReasoningModel({ nowMs: 1 })).toBe("llama3.2:3b");
    });

    it("failure mode: returns null when NO local model is pulled (caller must use cloud)", async () => {
      const eng = new OllamaCapabilityProbeEngine(
        readers({
          readNvidiaSmi: async () => BLACKWELL_SMI_PLAUSIBLE,
          readOllamaTags: async () => ({ models: [] }), // nothing pulled
          readOllamaPs: async () => ({ models: [] }),
        }),
      );
      expect(await eng.getBestReasoningModel({ nowMs: 1 })).toBeNull();
    });

    it("failure mode: returns null when Ollama daemon is unreachable", async () => {
      const eng = new OllamaCapabilityProbeEngine(
        readers({
          readNvidiaSmi: async () => BLACKWELL_SMI_PLAUSIBLE,
          readOllamaTags: async () => null, // daemon down
          readOllamaPs: async () => null,
        }),
      );
      expect(await eng.getBestReasoningModel({ nowMs: 1 })).toBeNull();
    });

    it("failure mode: returns null on a cloud_only host (no GPU)", async () => {
      const eng = new OllamaCapabilityProbeEngine(
        readers({
          readNvidiaSmi: async () => null, // no NVIDIA GPU
          readOllamaTags: async () => ({ models: [{ name: "qwen2.5-coder:32b" }] }),
          readOllamaPs: async () => ({ models: [] }),
        }),
      );
      expect(await eng.getBestReasoningModel({ nowMs: 1 })).toBeNull();
    });

    it("adversarial: excludes a present model that does NOT fit free VRAM", async () => {
      // 4080 with only 5000 free: phi3:14b (14336) does not fit; only qwen3-vl:8b
      // (6144) does NOT fit either... use a host where ONLY the small one fits.
      const eng = new OllamaCapabilityProbeEngine(
        readers({
          readNvidiaSmi: async () => "NVIDIA GeForce RTX 4080 SUPER, 16376, 8000",
          readOllamaTags: async () => ({
            models: [{ name: "phi3:14b" }, { name: "qwen3-vl:8b" }],
          }),
          readOllamaPs: async () => ({ models: [] }),
        }),
      );
      // phi3:14b (14336 > 8000) excluded; qwen3-vl:8b (6144 ≤ 8000) is the pick.
      expect(await eng.getBestReasoningModel({ nowMs: 1 })).toBe("qwen3-vl:8b");
    });

    it("adversarial: never returns an embedding model even if it is the only one present", async () => {
      const eng = new OllamaCapabilityProbeEngine(
        readers({
          readNvidiaSmi: async () => BLACKWELL_SMI_PLAUSIBLE,
          readOllamaTags: async () => ({ models: [{ name: "nomic-embed-text" }] }),
          readOllamaPs: async () => ({ models: [] }),
        }),
      );
      // nomic-embed-text is runnable but is an embedder → not a chat voice → null.
      expect(await eng.getBestReasoningModel({ nowMs: 1 })).toBeNull();
    });

    it("adversarial: never returns a RERANKER (tag-based gate catches what an id-regex misses)", async () => {
      // dengcao/Qwen3-Reranker-4B:Q5_K_M has tags:["rerank"] and NO "embed" in its
      // id — an /embed/i id filter would have wrongly seated it as a reasoning
      // voice. The tags-include("chat") gate correctly excludes it → null.
      const eng = new OllamaCapabilityProbeEngine(
        readers({
          readNvidiaSmi: async () => BLACKWELL_SMI_PLAUSIBLE,
          readOllamaTags: async () => ({ models: [{ name: "dengcao/Qwen3-Reranker-4B:Q5_K_M" }] }),
          readOllamaPs: async () => ({ models: [] }),
        }),
      );
      expect(await eng.getBestReasoningModel({ nowMs: 1 })).toBeNull();
    });
  });
});

describe("prism_ai:capability_probe (dispatcher round-trip)", () => {
  it("routes capability_probe through the dispatcher to the live engine", async () => {
    const res = await executeAIReasoningAction("capability_probe", {});
    expect(res.success).toBe(true);
    const data = res.data as {
      hardware: string;
      presentModels: unknown[];
      runnableModelIds: unknown[];
      source: string;
    };
    expect(["home_blackwell", "home_4080", "work_3080", "cloud_only"]).toContain(data.hardware);
    expect(Array.isArray(data.presentModels)).toBe(true);
    expect(Array.isArray(data.runnableModelIds)).toBe(true);
    expect(["live", "degraded"]).toContain(data.source);
  });

  it("rejects a non-boolean `force` param via the dispatcher schema", async () => {
    const res = await executeAIReasoningAction(
      "capability_probe",
      { force: "yes" as unknown as boolean },
    );
    expect(res.success).toBe(false);
    expect(typeof res.error).toBe("string");
  });
});
