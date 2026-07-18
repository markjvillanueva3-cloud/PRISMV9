// scripts/lib/vision-model-select.mjs
//
// U-XRAY-VISION-PROFILE — profile/VRAM-aware vision-model selection for blueprint OCR.
//
// WHY THIS EXISTS
//   ollama-vision-extract-lib.mjs pins DEFAULT_VISION_MODEL = "qwen3-vl:8b-instruct"
//   because the old RTX 4080 SUPER (16GB) could not fit a larger vision model
//   GPU-resident alongside the chat fleet's coder offload (qwen2.5vl:7b's ~15.3GB
//   spilled to CPU → >180s/page timeout — see the VRAM note in that lib).
//   The RTX PRO 6000 Blackwell (96GB) removes exactly that ceiling.
//   ModelRoutingEngine already learned this — its catalog carries qwen3-vl:30b on
//   the `home_blackwell` profile (commit 4199918e49) — but the OCR runner was never
//   told: it still hardcodes the 8b. THIS lib is the missing seam that lets the
//   blueprint-OCR path actually USE the bigger GPU. It complements (does not
//   duplicate) ModelRoutingEngine: that engine is general TS routing keyed by a
//   passed-in HardwareProfile; this is the OCR-vision-tier preference + the
//   thinking-trap guard + the availability gate the runner needs, in plain .mjs.
//
// SAFETY INVARIANTS — the change MUST NOT break OCR (it is strictly additive):
//   1. THINKING-TRAP GUARD. The BARE qwen3-vl:* tags (and any *-thinking tag) are
//      "thinking" variants that route ALL output into a <think> chain and never emit
//      the JSON. `think:false` AND `/no_think` are both IGNORED by Ollama for them
//      (proven 2026-05-31 — reference_xray_ocr_gpu_concurrency_2026_05_31). The
//      catalog's `qwen3-vl:30b` is one of these. selectVisionModel() NEVER returns a
//      thinking-trap model from the preference path; only -instruct variants (or
//      non-thinking families: qwen2.5vl, llama3.2-vision) are JSON-safe.
//   2. AVAILABILITY-GATED. Only a model actually pulled (present in `availableModels`
//      from ollama /api/tags) can be selected. A bigger model declared in the routing
//      catalog but not yet pulled falls through to the next preference — so this never
//      asks Ollama for a model that would 404.
//   3. SAFE FALLBACK. If nothing better is available + safe, return the 16GB-safe
//      default (the lib's DEFAULT_VISION_MODEL, imported — single source of truth).
//      That is today's behaviour, so on every host where a big model is not present
//      the OCR path is byte-for-byte unchanged.
//
// WHY NOT just rank by param-count: whether an 11B/different-family model beats the
// 8b-instruct ON BLUEPRINT OCR is an EMPIRICAL question (R9/R12) answered by the
// A/B benchmark (bench-vision-ocr-ab.mjs), NOT by an assumed ranking baked in here.
// The default preference therefore lists ONLY strictly-larger SAME/related-family
// instruct models we would trust on a big-VRAM host; adding any other model to the
// upgrade path requires a benchmark win first. None of the preference entries are
// pulled today → selection resolves to the safe 8b-instruct → zero regression risk.
//
// PURE CORE: selectVisionModel / classifyProfile / isThinkingTrap / detectProfileFromEnv
// do NO I/O (no fs, no fetch, no nvidia-smi) — the caller supplies profile/vram,
// availableModels, and an env object. The two impure probes (GPU VRAM via nvidia-smi,
// ollama /api/tags) live at the bottom, clearly fenced, dependency-injectable, and are
// NOT exercised by the pure unit tests.

import { spawnSync as nodeSpawnSync } from "node:child_process";

import { DEFAULT_VISION_MODEL } from "./ollama-vision-extract-lib.mjs";

// The 16GB-safe default — re-exported from the OCR lib so there is ONE source of
// truth for "today's model". Do NOT redefine the literal here (drift hazard).
export const SAFE_DEFAULT_VISION_MODEL = DEFAULT_VISION_MODEL;

// A host needs roughly this much TOTAL VRAM before a 30B-class vision model fits
// GPU-resident with the chat fleet's resident coder (the fleet-reaper keeps a 24GB
// GPU floor on Blackwell). 40GB cleanly separates the 96GB Blackwell from every
// 16GB/24GB card; tune via opts.bigMinGB.
export const BIG_VISION_MIN_VRAM_GB = 40;

// Impure-probe timeouts (ms) — named so the I/O shell carries no bare magic numbers.
const NVIDIA_SMI_TIMEOUT_MS = 10000;
const OLLAMA_TAGS_TIMEOUT_MS = 8000;
const MIB_PER_GB = 1024;

// Upgrade preference for a big-VRAM host, BEST-quality first. Every entry is:
//   • strictly larger than the 8b safe default, AND
//   • an -instruct / JSON-safe variant (never a thinking trap), AND
//   • a REAL pullable ollama tag (verified against the live registry 2026-06-03).
// Availability-gated at selection time — entries not present in ollama /api/tags
// are skipped. Override per-call via opts.preference or env PRISM_VISION_PREFERENCE
// (comma-separated). Keep this conservative: adding a model here is a claim it is
// >= the 8b on blueprint OCR, which the A/B benchmark must back.
//
// TAG-NAMING GOTCHA (verified ollama.com/library 2026-06-03): the 30B qwen3-vl is
// MoE-only → it carries the "-a3b" infix; there is NO "qwen3-vl:30b-instruct". The
// qwen2.5-VL base is already instruction-tuned → bare "32b"; there is NO
// "qwen2.5vl:32b-instruct". Using either phantom would silently no-op the upgrade
// (availability gate never matches it) the moment an operator pulled the real model.
//
// EMPIRICAL PROBE (2026-06-19, U-XRAY-VISION-PROBE, slot:xray): the REAL resident bare tag
// `qwen3-vl:32b` (the one the zulu ladder work-order asked about) was probed directly on real JM
// prints via scripts/probe-vision-model.mjs (bypassing the isThinkingTrap pre-filter). Result on BOTH
// a known-readable print (D22706-10.pdf, which the 8b ensemble labels fine) AND a hard scan
// (D22706-12.pdf): raw_len=0 / 0 dims in BOTH format:json and raw modes, at 113-170s (5-8x the 8b's
// ~22s). So bare qwen3-vl:32b is NOT a thinking-trap (no <think> leak) but is EMPIRICALLY UNUSABLE for
// OCR here (empty output + far too slow for the 7,419-print corpus). DO NOT add the bare tag to this
// list. Re-test with probe-vision-model.mjs before reopening. The recall fix is scan-quality
// preprocessing + the proven 8b, NOT a heavier model -- see blueprint-reading-improvement-backlog-2026-06-19.
export const BIG_VISION_PREFERENCE = Object.freeze([
  "qwen3-vl:32b-instruct",      // dense 32B
  "qwen3-vl:30b-a3b-instruct",  // 30B MoE (a3b active params)
  "qwen2.5vl:32b",              // qwen2.5-VL 32B (instruction-tuned base; no -instruct tag)
]);

// The OCR multi-VLM ENSEMBLE roster -- the single source of truth for "which diverse
// vision families vote on a print" (distinct from BIG_VISION_PREFERENCE, which is the
// single-host upgrade ladder). One model per DIVERSE family: uncorrelated errors are the
// whole point of an ensemble -- three qwen variants would share failure modes. The proven
// 8b-instruct anchor is always first; qwen2.5-VL is the 2nd voice; llama3.2-vision is a
// different lineage (least-correlated errors) as the 3rd voice. Consumed by
// vision-ensemble-extract.mjs + blueprint-ocr-training-loop.mjs (each previously duplicated
// this literal -> drift hazard). Availability-gated + thinking-trap-filtered at the call
// site (chosen = FAMILY_LEADERS.filter(pulled && !isThinkingTrap)). Matches the verified
// MODEL->TASK matrix (OLLAMA-AUTORUN-BUILDLOOP-PLAN-2026-06-09): moondream:1.8b is BENCHED
// (a 1.8B page-gate reintroduced the multi-page silent-drop regression) -> NOT a leader.
export const VISION_FAMILY_LEADERS = Object.freeze([
  DEFAULT_VISION_MODEL,   // qwen3-vl:8b-instruct -- the proven anchor (re-exported single source)
  "qwen2.5vl:7b",         // qwen2.5-VL family -- 2nd voice
  "llama3.2-vision:11b",  // llama-vision family -- different lineage, least-correlated errors
]);

// Approx TOTAL VRAM (GB) per named HardwareProfile. SOURCE OF TRUTH for the profile
// NAMES is ModelRoutingEngine.ts `HardwareProfile` union (mcp-server/src/engines/) —
// keep these keys in lockstep if that union changes (a .mjs cannot import the TS type).
// An unknown name → detectProfileFromEnv returns {source:"none"} → standard tier (safe
// degrade). Used ONLY when a host reports a profile NAME; an explicit PRISM_VISION_VRAM_GB
// or the live nvidia-smi probe always supersedes this map.
export const PROFILE_VRAM_GB = Object.freeze({
  home_blackwell: 96,
  home_4080: 16,
  work_3080: 10,
  cloud_only: 0,
});

/**
 * Pure: is this model id a "thinking-trap" vision model — one that emits a <think>
 * reasoning chain and never the direct JSON the OCR parser needs?
 *
 * Rule: the qwen3-vl family is thinking-by-default UNLESS the tag carries `-instruct`;
 * additionally ANY tag containing `-thinking` (any family) is a trap. This is
 * deliberately conservative — a false "trap" only costs us an upgrade candidate (we
 * fall back to the proven 8b-instruct), whereas a false "safe" silently breaks OCR.
 *
 * @param {string} modelId  e.g. "qwen3-vl:8b-instruct" | "qwen3-vl:30b" | "qwen2.5vl:7b"
 * @returns {boolean}
 */
export function isThinkingTrap(modelId) {
  if (typeof modelId !== "string" || !modelId) return false;
  const id = modelId.toLowerCase();
  if (id.includes("-thinking")) return true;
  // qwen3-vl / qwen3vl thinking-by-default family: safe ONLY with an -instruct tag.
  // Match -instruct as a TERMINAL token (end, or followed by a separator / quant suffix
  // like "-instruct-q4_K_M") — NOT a bare substring — so a malformed tag such as
  // "qwen3-vl:8b-instructx" is correctly treated as a trap, never falsely safe.
  const isQwen3Vl = id.startsWith("qwen3-vl:") || id.startsWith("qwen3vl:");
  if (isQwen3Vl && !/-instruct(?:$|[-:._])/.test(id)) return true;
  return false;
}

/**
 * Pure: a model id is JSON-safe for OCR if it is not a thinking trap. (We do not
 * also require a known vision family here — the availability gate + preference list
 * already constrain the candidate set; this guard's job is purely the <think> trap.)
 * @param {string} modelId
 * @returns {boolean}
 */
export function isJsonSafeVisionModel(modelId) {
  return typeof modelId === "string" && modelId.length > 0 && !isThinkingTrap(modelId);
}

/**
 * Pure: classify a host into the OCR vision tier from its total VRAM.
 * @param {number|null} vramGB  total GPU VRAM in GB (null/unknown → standard)
 * @param {{bigMinGB?:number}} [opts]
 * @returns {"big"|"standard"}  "big" = can host a 30B-class vision model resident
 */
export function classifyProfile(vramGB, opts = {}) {
  const min = Number.isFinite(opts.bigMinGB) && opts.bigMinGB > 0 ? opts.bigMinGB : BIG_VISION_MIN_VRAM_GB;
  return Number.isFinite(vramGB) && vramGB >= min ? "big" : "standard";
}

/**
 * Pure: derive a {vramGB, profile, source} hint from an env-like object WITHOUT
 * touching the GPU. Precedence: PRISM_VISION_VRAM_GB (explicit number) →
 * PRISM_HW_PROFILE (named profile → PROFILE_VRAM_GB) → {null, "none"}. Lets the
 * runner/tests inject hardware facts deterministically; the live nvidia-smi probe
 * (below) only fills the gap when neither env is set.
 *
 * @param {Record<string,string|undefined>} [env]  defaults to {} (NOT process.env — keep pure)
 * @returns {{vramGB:number|null, profile:(string|null), source:string}}
 */
export function detectProfileFromEnv(env = {}) {
  const rawVram = env.PRISM_VISION_VRAM_GB;
  if (rawVram != null && String(rawVram).trim() !== "") {
    const n = Number(rawVram);
    if (Number.isFinite(n) && n >= 0) return { vramGB: n, profile: null, source: "env:PRISM_VISION_VRAM_GB" };
  }
  const named = env.PRISM_HW_PROFILE;
  if (typeof named === "string" && named.trim()) {
    const key = named.trim();
    if (Object.prototype.hasOwnProperty.call(PROFILE_VRAM_GB, key)) {
      return { vramGB: PROFILE_VRAM_GB[key], profile: key, source: "env:PRISM_HW_PROFILE" };
    }
  }
  return { vramGB: null, profile: null, source: "none" };
}

/** Pure: parse a comma/space-separated preference override into a clean string[] (null if empty). */
export function parsePreferenceOverride(raw) {
  if (Array.isArray(raw)) {
    const arr = raw.map((s) => String(s).trim()).filter(Boolean);
    return arr.length ? arr : null;
  }
  if (typeof raw !== "string" || !raw.trim()) return null;
  const arr = raw.split(/[,\s]+/).map((s) => s.trim()).filter(Boolean);
  return arr.length ? arr : null;
}

/**
 * Pure: select the blueprint-OCR vision model for a host.
 *
 * Precedence:
 *   1. envOverride (PRISM_VISION_MODEL) — operator force. Honored, but flagged
 *      unsafe:true with a warning if it is a thinking trap (never silently swap it
 *      out — the operator is king — but never silently let it break OCR either: R12).
 *   2. big-VRAM upgrade — if the host is the "big" tier, walk `preference` and return
 *      the first entry that is BOTH pulled (in availableModels) AND JSON-safe.
 *   3. safe fallback — SAFE_DEFAULT_VISION_MODEL (the lib's proven 8b-instruct).
 *
 * @param {{
 *   vramGB?: number|null,
 *   availableModels?: string[],     // ollama /api/tags model ids; [] = "unknown, don't gate"
 *   envOverride?: string|null,      // PRISM_VISION_MODEL
 *   preference?: string[]|null,     // overrides BIG_VISION_PREFERENCE
 *   bigMinGB?: number,
 * }} [args]
 * @returns {{
 *   model: string, reason: string, tier: "big"|"standard",
 *   fallback: boolean, unsafe: boolean,
 *   availableMissing: boolean, warning: (string|null),
 * }}
 */
export function selectVisionModel(args = {}) {
  const vramGB = Number.isFinite(args.vramGB) ? args.vramGB : null;
  const available = Array.isArray(args.availableModels) ? args.availableModels.filter((m) => typeof m === "string") : [];
  const haveTags = available.length > 0; // empty ⇒ caller couldn't enumerate the store
  const tier = classifyProfile(vramGB, { bigMinGB: args.bigMinGB });
  const preference = (Array.isArray(args.preference) && args.preference.length) ? args.preference : BIG_VISION_PREFERENCE;

  // FAIL-SAFE availability: the automatic upgrade requires POSITIVE confirmation the
  // model is pulled. If we couldn't enumerate the store (haveTags=false, e.g. the
  // probe failed / Ollama down), we must NOT optimistically upgrade to a model that
  // might 404 — we fall through to the proven safe default. The PRISM_VISION_MODEL
  // override is the escape hatch for "I know it's there, force it".
  const confirmedAvailable = (m) => haveTags && available.includes(m);

  // 1. Operator force override.
  const override = typeof args.envOverride === "string" && args.envOverride.trim() ? args.envOverride.trim() : null;
  if (override) {
    const trap = isThinkingTrap(override);
    const missing = haveTags && !available.includes(override);
    return {
      model: override,
      reason: "env override (PRISM_VISION_MODEL)",
      tier,
      fallback: false,
      unsafe: trap,
      availableMissing: missing,
      warning: trap
        ? `forced model "${override}" is a thinking-trap variant — it will emit a <think> chain, not JSON; OCR will fail to parse. Use the -instruct variant.`
        : (missing ? `forced model "${override}" is not in the local ollama store — pull it first.` : null),
    };
  }

  // 2. Big-VRAM upgrade path.
  if (tier === "big") {
    for (const cand of preference) {
      if (!isJsonSafeVisionModel(cand)) continue;     // never select a trap from preference
      if (!confirmedAvailable(cand)) continue;        // fail-safe availability gate
      return {
        model: cand,
        reason: `big-VRAM tier (≥${BIG_VISION_MIN_VRAM_GB}GB): upgraded from ${SAFE_DEFAULT_VISION_MODEL}`,
        tier,
        fallback: false,
        unsafe: false,
        availableMissing: false,
        warning: null,
      };
    }
  }

  // 3. Safe fallback (today's behaviour).
  const fbMissing = haveTags && !available.includes(SAFE_DEFAULT_VISION_MODEL);
  return {
    model: SAFE_DEFAULT_VISION_MODEL,
    reason: tier === "big"
      ? `big-VRAM host but no preferred upgrade model pulled — staying on safe default ${SAFE_DEFAULT_VISION_MODEL} (pull one of: ${preference.join(", ")})`
      : `standard tier — safe default ${SAFE_DEFAULT_VISION_MODEL}`,
    tier,
    fallback: true,
    unsafe: false,
    availableMissing: fbMissing,
    warning: fbMissing ? `safe default "${SAFE_DEFAULT_VISION_MODEL}" is not in the local ollama store — pull it: ollama pull ${SAFE_DEFAULT_VISION_MODEL}` : null,
  };
}

// ──────────────────────────────────────────────────────────────────────────────
// IMPURE SHELL (I/O) — async/sync probes. NOT imported by the pure unit tests. The
// runner/benchmark call these to fill {vramGB, availableModels} for selectVisionModel.
// Both are dependency-injectable (deps.spawnSync / deps.fetch) so they remain testable
// without a live GPU or Ollama daemon, and both swallow every failure → null/[] so a
// missing probe degrades to the safe-fallback path rather than throwing.
// ──────────────────────────────────────────────────────────────────────────────

/**
 * Impure: total GPU VRAM in GB via nvidia-smi, or null if unavailable. Reads the
 * MAX across GPUs (the host's biggest card decides what can be resident). Never
 * throws — a missing nvidia-smi / non-NVIDIA host returns null (→ standard tier).
 *
 * @param {{ spawnSync?: Function }} [deps]  inject a fake spawnSync in tests
 * @returns {number|null}
 */
export function probeTotalVramGB(deps = {}) {
  const spawn = typeof deps.spawnSync === "function" ? deps.spawnSync : nodeSpawnSync;
  try {
    const r = spawn("nvidia-smi", ["--query-gpu=memory.total", "--format=csv,noheader,nounits"], { encoding: "utf8", timeout: NVIDIA_SMI_TIMEOUT_MS });
    if (!r || r.status !== 0 || !r.stdout) return null;
    const mibs = String(r.stdout).split(/\r?\n/).map((l) => Number(String(l).trim())).filter((n) => Number.isFinite(n) && n > 0);
    if (!mibs.length) return null;
    return Math.round((Math.max(...mibs) / MIB_PER_GB) * 10) / 10;
  } catch {
    return null;
  }
}

/**
 * Impure: enumerate pulled ollama model ids from /api/tags. Returns [] on any
 * failure (→ availability gate disabled, selector falls back safely). Never throws.
 *
 * @param {string} [ollamaUrl]
 * @param {{ fetch?: Function, timeoutMs?: number }} [deps]
 * @returns {Promise<string[]>}
 */
export async function fetchAvailableVisionModels(ollamaUrl = "http://127.0.0.1:11434", deps = {}) {
  const doFetch = typeof deps.fetch === "function" ? deps.fetch : globalThis.fetch;
  if (typeof doFetch !== "function") return [];
  const controller = new AbortController();
  const t = setTimeout(() => controller.abort(), Number.isFinite(deps.timeoutMs) ? deps.timeoutMs : OLLAMA_TAGS_TIMEOUT_MS);
  try {
    const resp = await doFetch(ollamaUrl.replace(/\/+$/, "") + "/api/tags", { signal: controller.signal });
    clearTimeout(t);
    if (!resp || !resp.ok) return [];
    const data = await resp.json();
    const models = Array.isArray(data && data.models) ? data.models : [];
    return models.map((m) => (m && typeof m.name === "string" ? m.name : null)).filter(Boolean);
  } catch {
    clearTimeout(t);
    return [];
  }
}

/**
 * Impure: resolve the blueprint-OCR vision model for THIS host using live probes.
 *
 * THE CANONICAL SEAM. Every OCR consumer (the bulk extractor, the closed-loop accuracy
 * gate, the single-print runner) should call THIS rather than hardcode the 8b default —
 * so the moment a bigger vision model is pulled on the 96GB Blackwell, the WHOLE fleet
 * lifts off the 8b ceiling in one place, and every host without a big model stays
 * byte-for-byte on the proven 8b-instruct (zero regression). Composes probeTotalVramGB +
 * fetchAvailableVisionModels + selectVisionModel; previously this logic was duplicated
 * inside run-ollama-vision-extract.mjs and reachable by nobody else.
 *
 * NEVER THROWS — each probe degrades to its safe value (vram→null, tags→[]), so a
 * missing GPU / Ollama-down host resolves to selectVisionModel's safe 8b fallback.
 *
 * An explicit model (operator --model / config) ALWAYS wins and is returned verbatim,
 * flagged `unsafe:true` (with a warning) if it is a thinking-trap variant — R12
 * fail-loud: never silently swap the operator's choice, never silently let it break OCR.
 *
 * @param {string|null} explicitModel  operator force (null/"" = auto-resolve)
 * @param {Record<string,string|undefined>} [env]  reads PRISM_VISION_MODEL / PRISM_VISION_PREFERENCE
 * @param {string} [ollamaUrl]
 * @param {{ probeVram?: () => (number|null), fetchModels?: (u:string)=>Promise<string[]> }} [deps]
 *        inject fake probes in tests — the live nvidia-smi / ollama probes otherwise.
 * @returns {Promise<{model:string, reason:string, warning:(string|null),
 *   vramGB:(number|null), tier:(string|null), unsafe:boolean, fallback:boolean}>}
 */
export async function resolveVisionModelLive(explicitModel, env = {}, ollamaUrl = "http://127.0.0.1:11434", deps = {}) {
  // 1. Operator force — honored verbatim, but flagged loud if it is a thinking trap.
  if (typeof explicitModel === "string" && explicitModel.trim()) {
    const m = explicitModel.trim();
    const trap = isThinkingTrap(m);
    return {
      model: m,
      reason: "explicit model (operator force)",
      warning: trap
        ? `forced model "${m}" is a thinking-trap variant — it emits a <think> chain, not JSON; OCR will fail to parse. Use the -instruct variant.`
        : null,
      vramGB: null,
      tier: null,
      unsafe: trap,
      fallback: false,
    };
  }

  // 2. Auto-resolve via live probes → selectVisionModel (the profile/VRAM-aware seam).
  const probeVram = typeof deps.probeVram === "function" ? deps.probeVram : probeTotalVramGB;
  const fetchModels = typeof deps.fetchModels === "function" ? deps.fetchModels : fetchAvailableVisionModels;
  const vramGB = probeVram();
  const available = await fetchModels(ollamaUrl);
  const sel = selectVisionModel({
    vramGB,
    availableModels: available,
    envOverride: env.PRISM_VISION_MODEL || null,
    preference: parsePreferenceOverride(env.PRISM_VISION_PREFERENCE),
  });
  return {
    model: sel.model,
    reason: sel.reason,
    warning: sel.warning,
    vramGB,
    tier: sel.tier,
    unsafe: sel.unsafe,
    fallback: sel.fallback,
  };
}
