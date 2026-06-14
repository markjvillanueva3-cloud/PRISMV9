#!/usr/bin/env node
// tier: T3
/**
 * posttool-ollama-rewriter-corpus.mjs — PostToolUse hook
 * SHIPPED: 2026-05-24 (PSN-OLLAMA-LORA-MS0/U-CORPUS01, slot:alpha)
 *
 * WHY: prompt-rewriter-ollama.mjs calls qwen2.5-coder:32b on every prompt to
 * produce a structured rewrite. The (raw_prompt → rewrite) pairs are the
 * EXACT training data needed to fine-tune a smaller, faster LoRA adapter
 * via PRISMLoRAAdapterEngine + SONALearningOptimizer. The rewriter's own
 * log keeps full prompts, which is too much PII surface for a training
 * corpus — this hook builds a privacy-bounded sidecar: SHA-8 + lengths +
 * 120-char samples only.
 *
 * NOT a duplicate of `posttool-ollama-offload-nudge` (which suggests using
 * Ollama for the next tool call) or `posttool-bayesian-update` (which
 * updates routing priors). This hook's sole job is corpus collection.
 *
 * FIRES ON:   PostToolUse (any tool — gates by reading rewriter log)
 * BLOCKING:   never — silent no-op on every failure path
 * TIER:       T3 (advisory/sidecar — never affects tool execution)
 *
 * CORPUS RECORD SHAPE (one JSON object per line):
 *   { ts, raw_prompt_sha8, raw_len, rewrite_len, savings_pct,
 *     model, raw_sample, rewrite_sample }
 *
 * Throttle: ≥CORPUS_THROTTLE_MS between appends (state-file gated).
 * Knob: PRISM_OLLAMA_REWRITER_CORPUS_DISABLE=1 → no-op.
 */

import { promises as fsp, existsSync } from "node:fs";
import { createHash } from "node:crypto";
import path from "node:path";
import { exit } from "node:process";

// ── Constants ─────────────────────────────────────────────────────────
const REWRITER_LOG = "H:/prism/.claude/cache/prompt-rewrites.jsonl";
const CORPUS_PATH = "H:/prism/state/shared/dashboards/ollama-rewriter-corpus.jsonl";
const STATE_PATH = "H:/prism/state/shared/dashboards/ollama-rewriter-corpus-state.json";

// Min interval (ms) between corpus appends — guards against PostToolUse
// firing rapidly inside a tight tool-call loop and recording the same
// rewriter-log tail multiple times.
const CORPUS_THROTTLE_MS = 5000;

// Truncate raw / rewrite samples to this many chars before persisting.
// Privacy bound: full prompts never enter the corpus, only the head.
const SAMPLE_CAP_CHARS = 120;

// Only scan the last N bytes of the rewriter log (newest-first). Keeps
// hook latency bounded regardless of log size.
const MAX_TAIL_BYTES = 64 * 1024;

// SHA-256 hex prefix length used as raw-prompt fingerprint.
const SHA_PREFIX_LEN = 8;

const DISABLED = process.env.PRISM_OLLAMA_REWRITER_CORPUS_DISABLE === "1";

// ── Pure helpers (exported for tests) ─────────────────────────────────

/**
 * shouldRecord — gate on whether a rewriter log entry represents a successful
 * rewrite worth corpus-recording. Successful entries have:
 *   - `rewrite` truthy (object with goal/etc.)
 *   - no `skip_reason`
 *   - `raw` non-empty
 *   - `model` named
 */
export function shouldRecord(entry) {
  if (!entry || typeof entry !== "object") return false;
  if (entry.skip_reason) return false;
  if (!entry.rewrite || typeof entry.rewrite !== "object") return false;
  if (entry.rewrite.skip) return false;
  if (typeof entry.raw !== "string" || entry.raw.length === 0) return false;
  if (typeof entry.model !== "string" || entry.model.length === 0) return false;
  return true;
}

/**
 * sha8 — first SHA_PREFIX_LEN hex chars of SHA-256. Deterministic per input.
 */
export function sha8(s) {
  return createHash("sha256")
    .update(String(s ?? ""), "utf8")
    .digest("hex")
    .slice(0, SHA_PREFIX_LEN);
}

/**
 * extractCorpusRecord — derive the corpus record from a rewriter log entry.
 * Returns null if the entry is not eligible. Pure; no I/O. `now` is injected
 * so tests are deterministic.
 */
export function extractCorpusRecord(entry, now = new Date()) {
  if (!shouldRecord(entry)) return null;

  const raw = String(entry.raw);
  // Strip hook-internal calibration metadata before length comparison so
  // the corpus reflects what a LoRA would actually emit.
  const rw = { ...entry.rewrite };
  delete rw.confidence_raw;
  delete rw.calibration;
  let rewriteText;
  try {
    rewriteText = JSON.stringify(rw);
  } catch {
    return null;
  }
  if (!rewriteText || rewriteText === "{}") return null;

  const rawLen = raw.length;
  const rewriteLen = rewriteText.length;
  const savingsPct = rawLen > 0
    ? Math.round(((rawLen - rewriteLen) / rawLen) * 100)
    : 0;

  return {
    ts: (now instanceof Date ? now : new Date(now)).toISOString(),
    raw_prompt_sha8: sha8(raw),
    raw_len: rawLen,
    rewrite_len: rewriteLen,
    savings_pct: savingsPct,
    model: entry.model,
    raw_sample: raw.slice(0, SAMPLE_CAP_CHARS),
    rewrite_sample: rewriteText.slice(0, SAMPLE_CAP_CHARS),
  };
}

/**
 * shouldThrottle — true if last append was within throttleMs of `now`.
 * Pure; takes a state object.
 */
export function shouldThrottle(state, now = Date.now(), throttleMs = CORPUS_THROTTLE_MS) {
  if (!state || typeof state.lastAppendAt !== "number") return false;
  return (now - state.lastAppendAt) < throttleMs;
}

/**
 * readMostRecentSuccess — async tail-scan of the rewriter log. Returns the
 * newest entry passing `shouldRecord` within the last `maxBytes` of the
 * file, or null. Fail-soft on all I/O errors.
 */
export async function readMostRecentSuccess(logPath = REWRITER_LOG, maxBytes = MAX_TAIL_BYTES) {
  let handle;
  try {
    handle = await fsp.open(logPath, "r");
    const st = await handle.stat();
    const size = st.size;
    const offset = Math.max(0, size - maxBytes);
    const length = size - offset;
    const buf = Buffer.alloc(length);
    await handle.read(buf, 0, length, offset);
    const text = buf.toString("utf8");
    const lines = text.split(/\r?\n/).filter(Boolean);
    for (let i = lines.length - 1; i >= 0; i -= 1) {
      let entry;
      try { entry = JSON.parse(lines[i]); } catch { continue; }
      if (shouldRecord(entry)) return entry;
    }
    return null;
  } catch {
    return null;
  } finally {
    if (handle) { try { await handle.close(); } catch { /* fail-soft */ } }
  }
}

/**
 * readStateSafe — async fail-soft JSON read for throttle state.
 */
async function readStateSafe(p) {
  try { return JSON.parse(await fsp.readFile(p, "utf8")); } catch { return null; }
}

/**
 * ensureDir — mkdir -p, fail-soft.
 */
async function ensureDir(p) {
  try { await fsp.mkdir(p, { recursive: true }); } catch { /* fail-soft */ }
}

// ── Main ──────────────────────────────────────────────────────────────
const _isMain = process.argv[1] && process.argv[1].endsWith("posttool-ollama-rewriter-corpus.mjs");
if (_isMain) {
  (async () => {
    if (DISABLED) return exit(0);

    // Drain stdin (PostToolUse payload); we don't need it — gating is via
    // the rewriter log + throttle state.
    try { await fsp.readFile(0, "utf8"); } catch { /* fail-soft */ }

    const state = (await readStateSafe(STATE_PATH)) || {};
    if (shouldThrottle(state, Date.now())) return exit(0);

    const entry = await readMostRecentSuccess();
    if (!entry) return exit(0);

    // Idempotence: skip if we already recorded this exact entry.
    const sig = `${sha8(entry.raw)}:${entry.ts || ""}`;
    if (state.lastSig === sig) return exit(0);

    const record = extractCorpusRecord(entry);
    if (!record) return exit(0);

    try {
      await ensureDir(path.dirname(CORPUS_PATH));
      await fsp.appendFile(CORPUS_PATH, JSON.stringify(record) + "\n", "utf8");
      const newState = { ...state, lastAppendAt: Date.now(), lastSig: sig };
      await ensureDir(path.dirname(STATE_PATH));
      await fsp.writeFile(STATE_PATH, JSON.stringify(newState), "utf8");
    } catch {
      // fail-soft — corpus collection is best-effort
    }
    exit(0);
  })();
}

// existsSync is intentionally imported for cross-file consumers wanting a
// pre-flight check on the corpus path without spinning up the async API.
export { existsSync as _existsSync };
