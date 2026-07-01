/**
 * OllamaCapabilityProbeEngine — BLACKWELL-AI-MS0 / U-CAP-PROBE (keystone)
 *
 * The single RUNTIME AUTHORITY for "what can this host actually run right now."
 *
 * `ModelRoutingEngine` is a deliberately PURE scorer — its header states it does
 * NO network I/O and requires the caller to supply a `RoutingContext`
 * (`hardware` + `backendUp`). Nothing detected those from the live host, and its
 * catalog lists models that may be absent (e.g. `deepseek-r1:14b` is in the
 * catalog but not in the live `/api/tags`; the qwen3-* entries are "PULLING now"
 * capability declarations). A pure scorer therefore can route() to a model that
 * physically isn't installed.
 *
 * THIS engine closes that gap. It performs the system/network I/O that
 * `ModelRoutingEngine` delegates, and returns a `CapabilitySnapshot` the caller
 * feeds straight into `ModelRoutingEngine.route()` — plus a catalog filter so
 * route() can only ever pick a model that is present AND fits free VRAM. It is
 * the foundation every other Blackwell-AI consumer gates on (BLACKWELL-AI-MS1+):
 * the snapshot tells the routing ladder, the GNN feature-embed step, the LoRA
 * base selection, the RAG re-embedder, and the octopus panel which models are
 * live — and it auto-lights-up the bigger models the moment golf finishes a pull,
 * with zero code change.
 *
 * DESIGN INVARIANTS
 *   1. Runtime probe is the SOLE authority; the static catalog is advisory. We
 *      never assert a model is runnable on its `runsOn` declaration alone — only
 *      after confirming it in the live `/api/tags` AND that it fits free VRAM.
 *   2. WDDM-AWARE free VRAM (Windows). `nvidia-smi memory.free` is unreliable
 *      under the Windows WDDM driver model — the compositor commits nearly all
 *      VRAM to a shared pool, so `memory.free` can read ~1.5GB on an idle 96GB
 *      card. When reported-free is implausibly low we DERIVE effective-free from
 *      total − (Ollama loaded VRAM) − a desktop reserve, and flag it estimated.
 *      (Verified live on DESKTOP-N7MI1VB 2026-06-03: free=1528MiB / total=97887MiB
 *      at P8/2%-util — a reporting artifact, not real saturation.)
 *   3. FAIL-SOFT. Missing `nvidia-smi`, Ollama down, or malformed JSON degrade
 *      to a safe snapshot (`hardware:"cloud_only"`, `backendUp.ollama:false`,
 *      warnings populated) — never throw. A probe failure must not wedge routing.
 *   4. INJECTABLE READERS. The system/network reads are injected so the engine
 *      is hermetically unit-testable; a real-data E2E exercises the live readers
 *      (skips soft when no GPU/Ollama) so we never ship "mock passes, real never
 *      runs" (RGS-MS1 pure-core+injected-readers lesson).
 *
 * @module engines/OllamaCapabilityProbeEngine
 * @milestone BLACKWELL-AI-MS0-U-CAP-PROBE
 */

import { execFile } from "node:child_process";
import { promisify } from "node:util";
import {
  DEFAULT_MODEL_CATALOG,
  type HardwareProfile,
  type ModelSpec,
  type RoutingContext,
} from "./ModelRoutingEngine.js";

const execFileAsync = promisify(execFile);

// ── Named constants (no magic numbers) ──────────────────────────────────────
/** Snapshot cache TTL. A probe shells out to nvidia-smi + 2 HTTP calls; 5 min
 *  matches the host-change cadence (golf pulling a model) without re-probing
 *  on every routing decision. */
export const PROBE_CACHE_TTL_MS = 300_000;
/** VRAM (MiB) reserved for the Windows desktop compositor when we must estimate
 *  free VRAM (WDDM artifact path). Conservative so we never over-promise. */
export const DESKTOP_RESERVE_MIB = 2_048;
/** If reported free VRAM is below this fraction of total, treat it as the WDDM
 *  committed-pool artifact and estimate free from total − loaded − reserve. */
export const WDDM_FREE_IMPLAUSIBLE_RATIO = 0.15;
/** Total-VRAM thresholds (MiB) → HardwareProfile. Name-match wins when present. */
export const PROFILE_VRAM_THRESHOLDS_MIB = {
  home_blackwell: 80_000, // RTX PRO 6000 Blackwell 96GB
  home_4080: 14_000, // RTX 4080/4080 SUPER 16GB
  work_3080: 8_000, // RTX 3080 10GB
} as const;
/** I/O timeout for each probe read (ms). Short — a hung GPU/daemon must degrade. */
export const PROBE_IO_TIMEOUT_MS = 4_000;
const OLLAMA_BASE_URL = process.env.OLLAMA_HOST?.startsWith("http")
  ? process.env.OLLAMA_HOST
  : "http://127.0.0.1:11434";
const MIB_PER_GB = 1_024;

// ── Public shapes ────────────────────────────────────────────────────────────
export interface GpuInfo {
  /** Adapter name as reported by nvidia-smi (e.g. "NVIDIA RTX PRO 6000 Blackwell Workstation Edition"). */
  name: string;
  /** Total VRAM (MiB). */
  totalMiB: number;
  /** Effective free VRAM (MiB) — WDDM-corrected; see `freeEstimated`. */
  freeMiB: number;
  /** True when freeMiB was derived (total − loaded − reserve) because the raw
   *  nvidia-smi free read was an implausible WDDM committed-pool artifact. */
  freeEstimated: boolean;
  /** Raw nvidia-smi memory.free (MiB) before WDDM correction — for diagnostics. */
  rawFreeMiB: number;
}

export interface LoadedModel {
  id: string;
  sizeVramMiB: number;
}

export type ProbeSource = "live" | "cached" | "degraded";

export interface CapabilitySnapshot {
  /** Detected hardware profile — feed directly into ModelRoutingEngine ctx.hardware. */
  hardware: HardwareProfile;
  /** GPU details, or null when no NVIDIA GPU is detected. */
  gpu: GpuInfo | null;
  /** Model ids present in the live Ollama `/api/tags` store. */
  presentModels: string[];
  /** Models currently loaded into VRAM (from `/api/ps`). */
  loadedModels: LoadedModel[];
  /** Live backend availability — feed into ModelRoutingEngine ctx.backendUp. */
  backendUp: { ollama: boolean };
  /** Catalog ollama model ids that are BOTH present AND fit effective free VRAM
   *  right now. The authoritative "runnable local model" set. */
  runnableModelIds: string[];
  /** Non-fatal diagnostics (degraded reads, estimates, absent declared models). */
  warnings: string[];
  /** ISO timestamp of the probe (or the cached probe). */
  probedAt: string;
  source: ProbeSource;
}

/** Probe options. `platform` is injectable so the WDDM-correction branch is
 *  OS-deterministic in tests (defaults to the real `process.platform`). */
export interface ProbeOpts {
  /** Bypass the snapshot cache and re-probe. */
  force?: boolean;
  /** Injected clock (ms) for deterministic cache tests; defaults to Date.now(). */
  nowMs?: number;
  /** Injected platform; defaults to process.platform. The WDDM free-VRAM
   *  artifact (and thus the correction) is specific to Windows ("win32"). */
  platform?: NodeJS.Platform;
}

/** Injectable readers — defaulted to real system/network reads; overridden in tests. */
export interface ProbeReaders {
  /** Returns one CSV line "name, totalMiB, freeMiB" or null if no GPU / nvidia-smi missing. */
  readNvidiaSmi: () => Promise<string | null>;
  /** Returns parsed `/api/tags` JSON (`{ models: [{ name }] }`) or null if unreachable. */
  readOllamaTags: () => Promise<unknown | null>;
  /** Returns parsed `/api/ps` JSON (`{ models: [{ name, size_vram }] }`) or null if unreachable. */
  readOllamaPs: () => Promise<unknown | null>;
}

// ── Default real readers (the live host I/O) ─────────────────────────────────
async function realNvidiaSmi(): Promise<string | null> {
  try {
    const { stdout } = await execFileAsync(
      "nvidia-smi",
      ["--query-gpu=name,memory.total,memory.free", "--format=csv,noheader,nounits"],
      { timeout: PROBE_IO_TIMEOUT_MS, windowsHide: true },
    );
    const firstLine = stdout.split(/\r?\n/).map((l) => l.trim()).filter(Boolean)[0];
    return firstLine ?? null;
  } catch {
    return null; // nvidia-smi absent or no GPU — caller degrades to cloud_only
  }
}

async function fetchJsonWithTimeout(url: string): Promise<unknown | null> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), PROBE_IO_TIMEOUT_MS);
  try {
    const res = await fetch(url, { signal: controller.signal });
    if (!res.ok) return null;
    return await res.json();
  } catch {
    return null; // unreachable / aborted / malformed
  } finally {
    clearTimeout(timer);
  }
}

const REAL_READERS: ProbeReaders = {
  readNvidiaSmi: realNvidiaSmi,
  readOllamaTags: () => fetchJsonWithTimeout(`${OLLAMA_BASE_URL}/api/tags`),
  readOllamaPs: () => fetchJsonWithTimeout(`${OLLAMA_BASE_URL}/api/ps`),
};

export class OllamaCapabilityProbeEngine {
  private readers: ProbeReaders;
  private catalog: ReadonlyArray<ModelSpec>;
  private cache: { snapshot: CapabilitySnapshot; atMs: number } | null = null;

  /**
   * @param readers  Injected system/network readers (defaults to real host I/O).
   * @param catalog  Model catalog to filter for runnability (defaults to ModelRoutingEngine's).
   */
  constructor(
    readers: Partial<ProbeReaders> = {},
    catalog: ReadonlyArray<ModelSpec> = DEFAULT_MODEL_CATALOG,
  ) {
    this.readers = { ...REAL_READERS, ...readers };
    this.catalog = catalog;
  }

  /**
   * Probe the live host. Returns a cached snapshot within {@link PROBE_CACHE_TTL_MS}
   * unless `force` is set. Never throws — failed reads degrade the snapshot.
   *
   * @param opts.force  Bypass the cache and re-probe.
   * @param opts.nowMs  Injected clock (tests); defaults to Date.now().
   * @returns the capability snapshot (source: live | cached | degraded).
   */
  async probe(opts: ProbeOpts = {}): Promise<CapabilitySnapshot> {
    const now = opts.nowMs ?? Date.now();
    if (!opts.force && this.cache && now - this.cache.atMs < PROBE_CACHE_TTL_MS) {
      return { ...this.cache.snapshot, source: "cached" };
    }

    const warnings: string[] = [];

    // ── GPU probe ──
    const smiLine = await this.readers.readNvidiaSmi();
    const gpu = this.#parseGpu(smiLine, warnings);

    // ── Ollama probe ──
    const tagsRaw = await this.readers.readOllamaTags();
    const psRaw = await this.readers.readOllamaPs();
    const ollamaUp = tagsRaw !== null;
    if (!ollamaUp) warnings.push("Ollama /api/tags unreachable — backend marked down");
    const psAvailable = psRaw !== null;
    const presentModels = this.#parseTags(tagsRaw);
    const loadedModels = this.#parsePs(psRaw);

    // ── WDDM-aware free-VRAM correction (Windows-only; needs loaded VRAM) ──
    const platform = opts.platform ?? process.platform;
    let gpuCorrected = gpu;
    if (gpu) {
      gpuCorrected = this.#correctFreeVram(gpu, loadedModels, psAvailable, platform, warnings);
    }

    const hardware = this.#detectHardware(gpuCorrected, warnings);
    // Resident models (already in VRAM per /api/ps) are runnable at 0 marginal cost --
    // pass their ids so #computeRunnable never drops a loaded voice on a free-VRAM check.
    const residentIds = new Set(loadedModels.map((l) => l.id));
    const runnableModelIds = this.#computeRunnable(
      hardware,
      presentModels,
      gpuCorrected,
      residentIds,
      warnings,
    );

    const degraded = smiLine === null || !ollamaUp;
    const snapshot: CapabilitySnapshot = {
      hardware,
      gpu: gpuCorrected,
      presentModels,
      loadedModels,
      backendUp: { ollama: ollamaUp },
      runnableModelIds,
      warnings,
      probedAt: new Date(now).toISOString(),
      source: degraded ? "degraded" : "live",
    };
    // Cache even degraded snapshots — a flapping daemon shouldn't cause a probe
    // storm. `force` re-probes when the caller needs fresh state.
    this.cache = { snapshot, atMs: now };
    return snapshot;
  }

  /** Build a ModelRoutingEngine `RoutingContext` from a fresh probe. */
  async toRoutingContext(opts: ProbeOpts = {}): Promise<
    Pick<RoutingContext, "hardware" | "backendUp">
  > {
    const snap = await this.probe(opts);
    return { hardware: snap.hardware, backendUp: { ollama: snap.backendUp.ollama } };
  }

  /**
   * Filter a catalog to ONLY models the host can actually serve right now:
   * present-and-fitting ollama models + all non-ollama (cloud) models. Pass the
   * result to `new ModelRoutingEngine(filtered)` so route() can never pick an
   * absent/unfittable local model (the deepseek-r1:14b / qwen3-pulling problem).
   */
  async routableCatalog(opts: ProbeOpts = {}): Promise<ModelSpec[]> {
    const snap = await this.probe(opts);
    const runnable = new Set(snap.runnableModelIds);
    return this.catalog.filter((m) =>
      m.backend === "ollama" ? runnable.has(m.id) : true,
    );
  }

  /** True if `modelId` is present in the live Ollama store (uses a fresh/cached probe). */
  async isModelPresent(modelId: string, opts: ProbeOpts = {}): Promise<boolean> {
    const snap = await this.probe(opts);
    return snap.presentModels.includes(modelId);
  }

  /**
   * Pick the single strongest RUNNABLE local (ollama) chat-capable model for a
   * given task axis, ranked by the catalog's quality/code tier. This is the
   * capability-oracle selector the octopus/consensus + reasoning consumers call
   * INSTEAD of hardcoding a model id (the deepseek-r1:14b-not-installed bug):
   * it can only ever return a model that is present AND fits free VRAM right now.
   *
   * Returns `null` when no local model is runnable (Ollama down, nothing pulled,
   * or VRAM-starved) — the caller MUST then fall back to a cloud voice, never
   * dispatch to a phantom local model (fail-loud, R12).
   *
   * Only catalog models tagged "chat" (and NOT "vision") are eligible — so
   * embedders, rerankers, and vision-only VLMs are never returned (they cannot
   * serve as a text-generation voice). Ties break on higher paramsB then lexical
   * id (stable, deterministic).
   *
   * @param axis "reasoning" ranks by `qualityTier`; "code" ranks by
   *   `codeTier ?? qualityTier`. Default "reasoning".
   */
  async getBestLocalModel(
    axis: "reasoning" | "code" = "reasoning",
    opts: ProbeOpts = {},
  ): Promise<string | null> {
    const snap = await this.probe(opts);
    const runnable = new Set(snap.runnableModelIds);
    const scoreOf = (m: ModelSpec): number =>
      axis === "code" ? (m.codeTier ?? m.qualityTier) : m.qualityTier;
    let best: ModelSpec | null = null;
    for (const m of this.catalog) {
      if (m.backend !== "ollama") continue; // local only
      if (!runnable.has(m.id)) continue; // present + fits VRAM + runsOn
      // Chat-capability gate by TAG, not id-regex: only models the catalog
      // declares chat-capable can be a generation voice. This excludes embedders
      // (tags:["embed"]) AND rerankers (tags:["rerank"], whose id has no "embed"
      // substring so an id-regex would have missed them) AND vision-only/VLM
      // models — matching resolveDiverseOllamaPanel's vision rejection so the two
      // octopus selectors share one chat-capability rule (R7, no divergence).
      const tags = m.tags ?? [];
      if (!tags.includes("chat")) continue; // not a chat-generation model
      if (tags.includes("vision")) continue; // VLMs are weak text reasoners
      if (
        best === null ||
        scoreOf(m) > scoreOf(best) ||
        (scoreOf(m) === scoreOf(best) && m.paramsB > best.paramsB) ||
        (scoreOf(m) === scoreOf(best) && m.paramsB === best.paramsB && m.id < best.id)
      ) {
        best = m;
      }
    }
    return best?.id ?? null;
  }

  /** Strongest runnable local model for general reasoning (qualityTier rank). */
  async getBestReasoningModel(opts: ProbeOpts = {}): Promise<string | null> {
    return this.getBestLocalModel("reasoning", opts);
  }

  /**
   * Strongest runnable local model ranked by the CODE axis (`codeTier ??
   * qualityTier`). Named "chat" for the consensus/octopus call site that wants a
   * distinct *second* chat voice biased toward a code-capable model; the ranking
   * key is codeTier. Use `getBestReasoningModel` for the general-reasoning axis.
   */
  async getBestChatModel(opts: ProbeOpts = {}): Promise<string | null> {
    return this.getBestLocalModel("code", opts);
  }

  /** Clear the cached snapshot (forces the next probe to re-read). */
  clearCache(): void {
    this.cache = null;
  }

  // ── internals ──────────────────────────────────────────────────────────────

  /** Parse the nvidia-smi CSV line "name, total, free" → GpuInfo (raw free). */
  #parseGpu(line: string | null, warnings: string[]): GpuInfo | null {
    if (!line) {
      warnings.push("nvidia-smi unavailable or no NVIDIA GPU — assuming cloud_only host");
      return null;
    }
    const parts = line.split(",").map((s) => s.trim());
    if (parts.length < 3) {
      warnings.push(`nvidia-smi output unparseable: "${line}"`);
      return null;
    }
    const name = parts[0];
    const totalMiB = Number.parseInt(parts[1], 10);
    const rawFreeMiB = Number.parseInt(parts[2], 10);
    if (!Number.isFinite(totalMiB) || totalMiB <= 0) {
      warnings.push(`nvidia-smi total VRAM unparseable: "${parts[1]}"`);
      return null;
    }
    const safeFree = Number.isFinite(rawFreeMiB) && rawFreeMiB >= 0 ? rawFreeMiB : 0;
    return { name, totalMiB, freeMiB: safeFree, freeEstimated: false, rawFreeMiB: safeFree };
  }

  /**
   * WDDM correction: if reported free is implausibly low relative to total
   * (the Windows committed-pool artifact), estimate free = total − loadedVram −
   * desktop reserve and flag it. Otherwise trust the reported free.
   *
   * Safety rails (over-promising free VRAM would cause an OOM at model load —
   * the inverse of the failure this engine exists to prevent):
   *   - WINDOWS-ONLY. The committed-pool artifact is specific to the WDDM
   *     driver model. On any other platform an implausibly-low free reading is
   *     REAL (another process holds VRAM) — trust it; never estimate up.
   *   - REQUIRES /api/ps. We can only subtract loaded VRAM if we actually read
   *     it. If /api/ps was unavailable we cannot know what is resident, so we
   *     fall back to the raw (low) free conservatively — under-reporting the
   *     runnable set until the next probe beats over-promising into an OOM.
   */
  #correctFreeVram(
    gpu: GpuInfo,
    loaded: LoadedModel[],
    psAvailable: boolean,
    platform: NodeJS.Platform,
    warnings: string[],
  ): GpuInfo {
    const implausible = gpu.rawFreeMiB < gpu.totalMiB * WDDM_FREE_IMPLAUSIBLE_RATIO;
    if (!implausible) return gpu;

    if (platform !== "win32") {
      warnings.push(
        `free ${gpu.rawFreeMiB}MiB is low vs total ${gpu.totalMiB}MiB but platform=${platform} ` +
          `(not WDDM) — treating reported free as REAL (no estimate; another process likely holds VRAM)`,
      );
      return gpu;
    }
    if (!psAvailable) {
      warnings.push(
        `WDDM free ${gpu.rawFreeMiB}MiB implausibly low but /api/ps unavailable — cannot verify ` +
          `loaded VRAM; using raw free conservatively (runnable set may under-report until next probe)`,
      );
      return gpu;
    }

    const loadedMiB = loaded.reduce((sum, m) => sum + (m.sizeVramMiB || 0), 0);
    const estimated = Math.max(0, gpu.totalMiB - loadedMiB - DESKTOP_RESERVE_MIB);
    warnings.push(
      `nvidia-smi free ${gpu.rawFreeMiB}MiB implausibly low vs total ${gpu.totalMiB}MiB ` +
        `(WDDM committed-pool artifact) — estimated free ${estimated}MiB ` +
        `(total − ${loadedMiB}MiB loaded − ${DESKTOP_RESERVE_MIB}MiB reserve)`,
    );
    return { ...gpu, freeMiB: estimated, freeEstimated: true };
  }

  /** Map GpuInfo → HardwareProfile by name-match then VRAM thresholds. */
  #detectHardware(gpu: GpuInfo | null, warnings: string[]): HardwareProfile {
    if (!gpu) return "cloud_only";
    const n = gpu.name.toLowerCase();
    if (n.includes("blackwell") || n.includes("rtx pro 6000")) return "home_blackwell";
    if (n.includes("4080")) return "home_4080";
    if (n.includes("3080")) return "work_3080";
    // Name didn't match a known card — fall back to total-VRAM thresholds.
    if (gpu.totalMiB >= PROFILE_VRAM_THRESHOLDS_MIB.home_blackwell) return "home_blackwell";
    if (gpu.totalMiB >= PROFILE_VRAM_THRESHOLDS_MIB.home_4080) return "home_4080";
    if (gpu.totalMiB >= PROFILE_VRAM_THRESHOLDS_MIB.work_3080) return "work_3080";
    warnings.push(
      `GPU "${gpu.name}" (${gpu.totalMiB}MiB) below smallest known tier — treating as cloud_only`,
    );
    return "cloud_only";
  }

  /** Extract present model ids from `/api/tags` JSON, defensively. */
  #parseTags(raw: unknown): string[] {
    const models = (raw as { models?: Array<{ name?: unknown; model?: unknown }> } | null)?.models;
    if (!Array.isArray(models)) return [];
    const ids = models
      .map((m) => (typeof m?.name === "string" ? m.name : typeof m?.model === "string" ? m.model : null))
      .filter((x): x is string => typeof x === "string" && x.length > 0);
    return [...new Set(ids)];
  }

  /** Extract loaded models + VRAM (MiB) from `/api/ps` JSON, defensively. */
  #parsePs(raw: unknown): LoadedModel[] {
    const models = (raw as { models?: Array<{ name?: unknown; model?: unknown; size_vram?: unknown }> } | null)
      ?.models;
    if (!Array.isArray(models)) return [];
    return models
      .map((m) => {
        const id = typeof m?.name === "string" ? m.name : typeof m?.model === "string" ? m.model : null;
        if (!id) return null;
        const bytes = typeof m?.size_vram === "number" && Number.isFinite(m.size_vram) ? m.size_vram : 0;
        return { id, sizeVramMiB: Math.round(bytes / (1_024 * 1_024)) };
      })
      .filter((x): x is LoadedModel => x !== null);
  }

  /**
   * Compute the runnable local model set: catalog ollama models that are present
   * in the live store AND declared to run on this hardware AND fit effective
   * free VRAM. Declared-but-absent models (e.g. qwen3-* still pulling) are
   * surfaced as warnings, never silently treated as runnable.
   */
  #computeRunnable(
    hardware: HardwareProfile,
    presentModels: string[],
    gpu: GpuInfo | null,
    residentIds: ReadonlySet<string>,
    warnings: string[],
  ): string[] {
    if (hardware === "cloud_only" || !gpu) return [];
    const present = new Set(presentModels);
    const runnable: string[] = [];
    const declaredAbsent: string[] = [];
    for (const m of this.catalog) {
      if (m.backend !== "ollama") continue;
      if (!m.runsOn.includes(hardware)) continue;
      if (!present.has(m.id)) {
        declaredAbsent.push(m.id);
        continue;
      }
      const needMiB = m.vramGB * MIB_PER_GB;
      // A model already RESIDENT in VRAM (per /api/ps) is runnable at 0 marginal cost
      // even when its NOMINAL size exceeds current free VRAM: its VRAM is already
      // subtracted from gpu.freeMiB (= total - loaded - reserve), so seating it spends
      // nothing more -- no OOM risk. This is the octopus single-voter fix: a big
      // resident voice (e.g. qwen2.5-coder:32b, 37GB nominal, loaded) was wrongly
      // dropped when free VRAM < 37GB, collapsing a 2-voice panel to 1. Non-resident
      // models still require nominal <= free (the OOM gate is unchanged for new loads).
      if (residentIds.has(m.id) || needMiB <= gpu.freeMiB) {
        runnable.push(m.id);
      } else {
        warnings.push(
          `${m.id} present but needs ~${needMiB}MiB > ${gpu.freeMiB}MiB free — not runnable now`,
        );
      }
    }
    if (declaredAbsent.length > 0) {
      warnings.push(
        `${declaredAbsent.length} catalog model(s) declared for ${hardware} but ABSENT from /api/tags ` +
          `(not yet pulled): ${declaredAbsent.slice(0, 8).join(", ")}${declaredAbsent.length > 8 ? "…" : ""}`,
      );
    }
    return runnable;
  }
}

/** Shared singleton — uses the real host readers + ModelRoutingEngine's catalog. */
export const ollamaCapabilityProbeEngine = new OllamaCapabilityProbeEngine();
