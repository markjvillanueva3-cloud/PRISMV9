// tier: T4
// ollama-ps-probe.mjs (slot:alpha 2026-06-20, TOKEN-EFFICIENCY / U-OLLAMA-PS-PROBE-DEDUP)
//
// ONE canonical SYNCHRONOUS Ollama liveness + resident-model probe for the
// UserPromptSubmit hooks that must stay synchronous top-to-bottom (they read
// stdin + write stdout once, no async shell). Before this, BOTH
// `.claude/hooks/ollama-prewarm-on-pipeline.mjs` and
// `.claude/hooks/ollama-pipeline-injector.mjs` carried byte-identical private
// copies of `loadWarmModels()` (curl /api/ps -> parse j.models) AND a near-
// identical /api/tags up-probe (`ollamaUp` / `isOllamaUp`) -- four duplicated,
// UNTESTED network probes. This consolidates them into one tested home (R7/R8 DRY).
//
// SYNC by design: these consumers are sync hooks. The ASYNC fetch-based equivalent
// for ask-ollama lives in scripts/ask-ollama.mjs#loadWarmModels (same PARSE contract:
// `models.map(name||model).filter(Boolean)`) -- intentionally NOT merged because the
// I/O model differs (spawnSync curl vs fetch). The parse contract is kept identical
// so a model name list means the same thing on both paths.
//
// FAIL-SOFT: any probe failure (curl missing, non-zero exit, timeout, malformed JSON,
// spawn error) -> up:false / models:[]. A probe must never throw into a hook.
//
// spawnImpl is injectable so the probes are unit-testable without a live Ollama/curl.

import { spawnSync as _spawnSync } from "node:child_process";

/** Default daemon URL -- matches the two consumer hooks' OLLAMA_URL constant. */
export const DEFAULT_OLLAMA_URL = process.env.OLLAMA_URL || "http://127.0.0.1:11434";
/** Default curl `-m` budget (seconds) -- matches the hooks' PROBE_TIMEOUT_SEC. */
export const DEFAULT_PROBE_TIMEOUT_SEC = 2;

/**
 * Run `curl -fsS -m <timeoutSec> <url><path>` synchronously and return the raw
 * spawnSync result. The wall-clock `timeout` is timeoutSec+1 s so the kill is a
 * backstop AFTER curl's own `-m` deadline, never before it (preserves the exact
 * behavior of the two original hook copies). Pure given `spawnImpl`.
 * @returns {{status: number|null, stdout?: string}}
 */
function curlGet(path, { ollamaUrl, timeoutSec, spawnImpl }) {
  return spawnImpl(
    "curl",
    ["-fsS", "-m", String(timeoutSec), `${ollamaUrl}${path}`],
    { encoding: "utf8", timeout: (timeoutSec + 1) * 1000 },
  );
}

/**
 * True iff the Ollama daemon answers GET /api/tags with a 0 exit (reachable).
 * @param {{ollamaUrl?: string, timeoutSec?: number, spawnImpl?: Function}} [opts]
 * @returns {boolean}
 */
export function isOllamaUpSync(opts = {}) {
  const {
    ollamaUrl = DEFAULT_OLLAMA_URL,
    timeoutSec = DEFAULT_PROBE_TIMEOUT_SEC,
    spawnImpl = _spawnSync,
  } = opts;
  try {
    const r = curlGet("/api/tags", { ollamaUrl, timeoutSec, spawnImpl });
    return !!(r && r.status === 0);
  } catch {
    return false;
  }
}

/**
 * The model names currently RESIDENT in VRAM, via GET /api/ps. Fail-soft: any
 * failure -> []. Reads each entry's `name` (falling back to `model`); blank/missing
 * names and null entries are dropped (more robust than the original copies, which
 * threw on a null entry and fell through to [] -- this returns the valid ones).
 * @param {{ollamaUrl?: string, timeoutSec?: number, spawnImpl?: Function}} [opts]
 * @returns {string[]} resident model names
 */
export function readWarmModelsSync(opts = {}) {
  const {
    ollamaUrl = DEFAULT_OLLAMA_URL,
    timeoutSec = DEFAULT_PROBE_TIMEOUT_SEC,
    spawnImpl = _spawnSync,
  } = opts;
  let r;
  try {
    r = curlGet("/api/ps", { ollamaUrl, timeoutSec, spawnImpl });
  } catch {
    return [];
  }
  if (!r || r.status !== 0) return [];
  try {
    const j = JSON.parse(r.stdout);
    if (Array.isArray(j && j.models)) {
      return j.models.map((m) => (m && (m.name || m.model)) || "").filter(Boolean);
    }
  } catch {
    /* malformed JSON -> fail-soft */
  }
  return [];
}
