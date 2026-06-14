/**
 * chat-token-watch.mjs — per-chat token-usage estimator + pressure classifier
 * for the CHAT-ORCHESTRATOR-MS0 fleet orchestrator (U-CHO02).
 *
 * Reads the Claude Code transcript JSONL for a given session, finds the last
 * `"isCompactSummary":true` boundary (so a previous /compact's pre-compact
 * bloat doesn't get double-counted — the same fix as 2026-05-15's
 * precompact-auto-trigger compact-boundary bug), estimates tokens-since-
 * last-compact from byte-size, classifies pressure against operator-tunable
 * thresholds.
 *
 * DESIGN MIRRORS precompact-auto-trigger.mjs so both consumers see the same
 * estimate (one orchestrator, one operator-facing auto-compact). When the
 * upstream estimate technique improves, BOTH should improve together.
 *
 * Pure-core + injected-readers — tests pass file fixtures as bytes,
 * production reads from disk via fs.statSync + small tail-read.
 *
 * Knobs (env, read by readChatPressure):
 *   PRISM_CHAT_TOKEN_WARN_AT       — token threshold for "warn" (default 800000)
 *   PRISM_CHAT_TOKEN_CRITICAL_AT   — token threshold for "critical" (default 940000)
 *   PRISM_CHAT_TOKEN_BYTES_PER_TOK — bytes-per-token estimator (default 3.5)
 *   PRISM_CHAT_TOKEN_DISABLE       — all readers return clean+0 (kill switch)
 *
 * The orchestrator never relies on absolute token counts being exact —
 * the estimator is intentionally conservative, and the three thresholds
 * are pessimistic (under-estimate-by-30% safety margin built in).
 */

import { existsSync, readFileSync, statSync, openSync, readSync, closeSync, readdirSync } from "node:fs";
import { join } from "node:path";

// ─── Constants ──────────────────────────────────────────────────────────────

export const DEFAULT_WARN_AT_TOKENS = 800_000;
export const DEFAULT_CRITICAL_AT_TOKENS = 940_000;
export const DEFAULT_BYTES_PER_TOKEN = 3.5;
// Physical context-window ceiling. A byte-estimate ABOVE this cannot be real context
// fill -- the window holds at most ~this many tokens, and if it were truly that full
// the API would have auto-compacted. A byte-estimate that exceeds it is transcript-BLOAT
// (the on-disk JSONL redundantly logs every turn's full hook-injection + full tool
// outputs, so post-compact bytes / 3.5 over-reports the real context), NOT pressure ->
// SUSPECT. Mirrors precompact-auto-trigger's 1.1x CONTEXT_CAP sanity floor (the
// "both consumers improve together" contract in this file's sidecar-first header).
export const DEFAULT_CONTEXT_CAP_TOKENS = 1_000_000;
export const SUSPECT_FACTOR = 1.1;
/** Freshness window for the token-awareness sidecar (token-budget-<slot>.json).
 *  Matches precompact-auto-trigger's SIDECAR_TTL_MS + statusline's TTL. A sidecar
 *  older than this is ignored and the byte-estimate is used instead. */
export const SIDECAR_TTL_MS = 180_000;
/** Dir holding the per-slot token-awareness sidecars (token-budget-<slot>.json). */
export const DEFAULT_SIDECAR_DIR = "H:/prism/state/shared";
/** Tail-read window when searching for the last compact boundary. 256 KB is
 *  large enough to catch a JSONL transcript's most recent ~700 lines and small
 *  enough to read in one syscall at 95% memory pressure. */
export const COMPACT_TAIL_SCAN_BYTES = 256 * 1024;
/** Maximum total transcript size we'll fully load. Beyond this, we use the
 *  statSync + tail-window technique instead of reading the whole file. */
export const FULL_LOAD_CEILING_BYTES = 4 * 1024 * 1024;
/** Escalation window when the 256KB tail misses the compact marker. A chat that
 *  compacted then did moderate work pushes the marker past the 256KB tail; without
 *  this the whole jsonl counts as post-compact -> false-critical every prompt (the
 *  zulu-advisory dormancy gate, 2026-06-09). 16MB is bounded (one external-memory
 *  allocation, fine even under pressure), read ONLY on a tail miss, and covers
 *  realistic post-compact spans; a >16MB post-compact span is itself genuinely
 *  critical so the Tier-3 over-estimate fallback is correct there. */
export const LARGE_SCAN_BUDGET_BYTES = 16 * 1024 * 1024;

/**
 * Canonical Claude Code transcripts dir for this project. Mirrors the
 * path the precompact hook uses. Operator can override per-call.
 */
export const DEFAULT_PROJECTS_DIR = "C:/Users/wompu/.claude/projects/H--PRISM";

// ─── Pure helpers ───────────────────────────────────────────────────────────

/**
 * Scan a buffer for the LAST occurrence of `"isCompactSummary":true` and
 * return the byte offset of the LINE BREAK after that match (i.e. the
 * first byte of the post-compact content). Returns 0 if no match found
 * (meaning the whole buffer is post-compact content).
 *
 * Pure: takes a Buffer + the absolute file offset that buffer starts at,
 * returns the absolute byte offset of post-compact content.
 *
 * Mirrors precompact-auto-trigger.mjs:findLastCompactOffset, but operates
 * on a passed-in buffer slice rather than reading the file itself —
 * decouples scanning from IO so tests can pass synthetic transcripts.
 */
export function findLastCompactOffsetInBuffer(buf, bufStartOffset = 0) {
  if (!buf || buf.length === 0) return bufStartOffset;
  // Byte-accurate search (NOT buf.toString().lastIndexOf): a string char index
  // diverges from the byte offset over multibyte UTF-8 content, mis-placing the
  // boundary by the multibyte-char count -- negligible on a 256KB ASCII tail but
  // real over a 16MB escalation window. Buffer.lastIndexOf / indexOf return BYTE
  // indices; the needle + newline are ASCII either way.
  // Match BOTH compact-boundary formats: the current build's
  // {"type":"system","subtype":"compact_boundary"} record AND the legacy
  // {"isCompactSummary":true} flag. The 2026-06 format change broke the
  // legacy-only scan (see transcript-token-counter.mjs COMPACT_MARKERS) ->
  // whole-tail byte counts. Byte-accurate Buffer search per needle, take the
  // latest match.
  let lastIdx = -1;
  for (const m of ['"subtype":"compact_boundary"', '"isCompactSummary":true']) {
    const i = buf.lastIndexOf(Buffer.from(m, "utf8"));
    if (i > lastIdx) lastIdx = i;
  }
  if (lastIdx === -1) return bufStartOffset;
  // First newline (0x0A) at/after the match: post-compact content starts on the
  // next line. No newline (boundary IS the buffer's last line) -> no post-compact
  // content yet -> offset is end-of-buffer.
  const newlineIdx = buf.indexOf(0x0a, lastIdx);
  if (newlineIdx === -1) return bufStartOffset + buf.length;
  return bufStartOffset + newlineIdx + 1;
}

/**
 * Estimate tokens from byte-size. The Claude tokenizer averages ~3.5 bytes/
 * token across mixed natural-language + JSON + code transcript content
 * (calibrated against /context observations 2026-05; see
 * AUTOCOMPACT-AUTONOMOUS-MS0 telemetry).
 *
 * Pure: bytes → tokens, integer rounding (floor — under-estimate-by-up-to-1
 * is the safe direction for a pressure estimator).
 */
export function estimateTokens(bytes, bytesPerToken = DEFAULT_BYTES_PER_TOKEN) {
  if (!Number.isFinite(bytes) || bytes <= 0) return 0;
  if (!Number.isFinite(bytesPerToken) || bytesPerToken <= 0) return 0;
  return Math.floor(bytes / bytesPerToken);
}

/**
 * Classify a token estimate into a pressure level. Pure: tokens + 2
 * thresholds → "clean" | "warn" | "critical".
 *
 * Boundary semantics: < warnAt → clean; >= warnAt < critAt → warn;
 * >= critAt → critical. critAt must be > warnAt; if mis-ordered the
 * function clamps (returns critical only when >= max(warnAt, critAt)).
 */
export function classifyPressure(tokens, warnAt = DEFAULT_WARN_AT_TOKENS, critAt = DEFAULT_CRITICAL_AT_TOKENS) {
  if (!Number.isFinite(tokens) || tokens < 0) return "clean";
  const w = Number.isFinite(warnAt) && warnAt > 0 ? warnAt : DEFAULT_WARN_AT_TOKENS;
  const c = Number.isFinite(critAt) && critAt > 0 ? critAt : DEFAULT_CRITICAL_AT_TOKENS;
  // Clamp: if critAt < warnAt the operator misconfigured; use max to be safe.
  const critEff = Math.max(c, w);
  if (tokens >= critEff) return "critical";
  if (tokens >= w) return "warn";
  return "clean";
}

// ─── Sidecar-first pressure (accurate /context tokens) ──────────────────────
//
// The byte-estimate counts the on-disk JSONL (whole file minus last compact) and
// OVER-reports vs the real context window (observed 2026-06-10: byte-est said
// "critical" ~1M while the real ctx was 70% YELLOW). The token-awareness sidecar
// (token-budget-<slot>.json, written by token-awareness-sidecar.mjs) carries the
// REAL context-window assessment (ctx.tokens/pct + an authoritative zone). Prefer
// it when fresh; fall back to the byte-estimate when stale/missing. Brings
// readChatPressure into parity with precompact-auto-trigger's U-TA13 sidecar-first
// read (this file's header "both consumers improve together" contract).

/** Map the sidecar's GREEN/YELLOW/RED zone to {clean,warn,critical}. Returns null
 *  for an unrecognized zone so the caller falls back to the byte-estimate rather
 *  than trusting an unknown band. */
export function zoneToLevel(zone) {
  const z = String(zone || "").trim().toUpperCase();
  if (z === "RED" || z === "CRITICAL") return "critical";
  if (z === "YELLOW" || z === "WARN") return "warn";
  if (z === "GREEN" || z === "CLEAN") return "clean";
  return null;
}

/** Read the per-slot token-awareness sidecar. Returns
 *  { tokens, pct, level, source:"sidecar" } when the file exists, is FRESH
 *  (capturedAt age in [0, ttlMs]), parses, and carries a recognized zone; else
 *  null (caller falls back to the byte-estimate). Fail-safe: any error -> null. */
export function readSidecarPressure(slot, { sidecarDir = DEFAULT_SIDECAR_DIR, ttlMs = SIDECAR_TTL_MS, _io = {}, _now } = {}) {
  if (!slot || slot === "unknown") return null;
  const _exists = _io.existsSync || existsSync;
  const _read = _io.readFileSync || readFileSync;
  const fp = join(sidecarDir, `token-budget-${slot}.json`);
  if (!_exists(fp)) return null;
  let doc;
  try { doc = JSON.parse(_read(fp, "utf8")); } catch { return null; }
  if (!doc || !doc.capturedAt) return null;
  const now = typeof _now === "number" ? _now : Date.now();
  const age = now - Date.parse(doc.capturedAt);
  if (!Number.isFinite(age) || age < 0 || age > ttlMs) return null;
  const level = zoneToLevel(doc.zone);
  if (!level) return null;
  const tokens = Number(doc?.ctx?.tokens);
  return {
    tokens: Number.isFinite(tokens) && tokens >= 0 ? tokens : 0,
    pct: Number(doc?.ctx?.pct) || 0,
    level,
    source: "sidecar",
  };
}

// ─── chat-slots chatId -> transcript filename resolver ─────────────────────
//
// ZULU-ORCHESTRATOR-MS1 / U-ZM1-03 fix. chat-slots.mjs stores chatId as
// `claude-<8hex>` but the actual transcript file is `<full-uuid>.jsonl` whose
// 8-hex prefix matches. The literal `${sessionId}.jsonl` path the original
// CHO02 design used WORKS for the full-UUID sessionId form (the one
// precompact-auto-trigger uses), but FAILS for the chat-slots chatId form
// (the one the sweep passes) — every slot returned `file-not-found` and the
// orchestrator could never make a critical decision. Smoke-caught 2026-05-22.
// Same prefix-match logic chat-slots.mjs:findTranscriptFile already uses.

/** Match the chat-slots chatId form: `claude-XXXXXXXX` (8 lowercase hex). */
export const CHAT_ID_PREFIX_RE = /^claude-([0-9a-f]{8})$/i;

/**
 * Resolve a chat-slots `claude-<8hex>` chatId to the full-UUID transcript
 * path inside `projectsDir`. Returns the absolute path or null. Injected
 * readers (`_readdir`, `_exists`) keep this hermetically testable.
 */
export function resolveByChatIdPrefix(sessionId, projectsDir, _readdir = readdirSync, _exists = existsSync) {
  if (typeof sessionId !== "string") return null;
  const m = sessionId.match(CHAT_ID_PREFIX_RE);
  if (!m || !_exists(projectsDir)) return null;
  const prefix = m[1].toLowerCase();
  try {
    const files = _readdir(projectsDir);
    const hit = files.find((f) => {
      const low = f.toLowerCase();
      return low.startsWith(prefix + "-") && low.endsWith(".jsonl");
    });
    return hit ? join(projectsDir, hit) : null;
  } catch { return null; }
}

// ─── Transcript-reading core ────────────────────────────────────────────────

/**
 * Read the post-compact portion of a transcript file and return the byte
 * accounting. Uses a tail-read for files larger than FULL_LOAD_CEILING_BYTES
 * so a multi-megabyte transcript doesn't blow up memory under pressure.
 *
 * Returns { totalBytes, postCompactBytes, lastCompactOffset, found }:
 *   * totalBytes        — file size from statSync
 *   * lastCompactOffset — absolute byte offset of post-compact content
 *                         (0 if no compact summary seen)
 *   * postCompactBytes  — totalBytes - lastCompactOffset
 *   * found             — true if a compact boundary was found, false if
 *                         the whole file is post-compact (or empty)
 *
 * Fail-soft: missing file / unreadable file / non-string sessionId →
 * { totalBytes:0, postCompactBytes:0, lastCompactOffset:0, found:false, error:<reason> }
 */
export function readTranscriptBytes(sessionId, { projectsDir = DEFAULT_PROJECTS_DIR, _io = {} } = {}) {
  const _stat = _io.statSync || statSync;
  const _exists = _io.existsSync || existsSync;
  const _open = _io.openSync || openSync;
  const _read = _io.readSync || readSync;
  const _close = _io.closeSync || closeSync;
  const _readFile = _io.readFileSync || readFileSync;
  const _readdir = _io.readdirSync || readdirSync;

  if (typeof sessionId !== "string" || !sessionId) {
    return { totalBytes: 0, postCompactBytes: 0, lastCompactOffset: 0, found: false, error: "invalid-session-id" };
  }
  // Try the literal sessionId.jsonl first (full-UUID form, used by
  // precompact-auto-trigger). If absent and sessionId is the chat-slots
  // claude-<8hex> form, resolve via prefix-match against projectsDir
  // (load-bearing for ZULU-ORCHESTRATOR-MS1 — the sweep passes chatIds).
  let path = join(projectsDir, `${sessionId}.jsonl`);
  if (!_exists(path)) {
    const resolved = resolveByChatIdPrefix(sessionId, projectsDir, _readdir, _exists);
    if (resolved) {
      path = resolved;
    } else {
      return { totalBytes: 0, postCompactBytes: 0, lastCompactOffset: 0, found: false, error: "file-not-found" };
    }
  }
  let st;
  try { st = _stat(path); } catch (e) {
    return { totalBytes: 0, postCompactBytes: 0, lastCompactOffset: 0, found: false, error: `stat-failed:${e?.message || e}` };
  }
  const total = st.size || 0;
  if (total === 0) {
    return { totalBytes: 0, postCompactBytes: 0, lastCompactOffset: 0, found: false };
  }

  // Small file → full load is cheaper than a syscall dance.
  if (total <= FULL_LOAD_CEILING_BYTES) {
    let buf;
    try { buf = _readFile(path); } catch (e) {
      return { totalBytes: total, postCompactBytes: 0, lastCompactOffset: 0, found: false, error: `read-failed:${e?.message || e}` };
    }
    const offset = findLastCompactOffsetInBuffer(buf, 0);
    return {
      totalBytes: total, postCompactBytes: Math.max(0, total - offset),
      lastCompactOffset: offset, found: offset > 0,
    };
  }

  // Large file -> bounded escalating scan. Tier 1: the 256KB tail (common case:
  // a fresh compact's marker is near EOF). Tier 2: if the marker isn't in the
  // tail, the chat may have accumulated moderate post-compact content that pushed
  // it past 256KB -- read a bounded LARGE_SCAN_BUDGET window so a long-but-not-huge
  // chat is not mis-read as false-critical (the zulu-advisory dormancy gate). Tier
  // 3: not found within budget -> over-estimate from total bytes (safe direction;
  // a >budget post-compact span is itself genuinely critical).
  let fd = null;
  try {
    fd = _open(path, "r");

    // Tier 1: fast 256KB tail.
    const window = Math.min(COMPACT_TAIL_SCAN_BYTES, total);
    const windowStart = total - window;
    const buf = Buffer.alloc(window);
    _read(fd, buf, 0, window, windowStart);
    const offset = findLastCompactOffsetInBuffer(buf, windowStart);
    if (offset > windowStart) {
      return {
        totalBytes: total, postCompactBytes: Math.max(0, total - offset),
        lastCompactOffset: offset, found: true,
      };
    }

    // Tier 2: escalate to a bounded larger window (only when there is more file
    // than the tail already covered).
    if (total > window) {
      const big = Math.min(LARGE_SCAN_BUDGET_BYTES, total);
      if (big > window) {
        const bigStart = total - big;
        const bigBuf = Buffer.alloc(big);
        _read(fd, bigBuf, 0, big, bigStart);
        const bigOffset = findLastCompactOffsetInBuffer(bigBuf, bigStart);
        if (bigOffset > bigStart) {
          return {
            totalBytes: total, postCompactBytes: Math.max(0, total - bigOffset),
            lastCompactOffset: bigOffset, found: true,
          };
        }
      }
    }

    // Tier 3: boundary not found within budget -> over-estimate using total bytes
    // (safe direction; surfaces critical earlier).
    return {
      totalBytes: total, postCompactBytes: total, lastCompactOffset: 0, found: false,
    };
  } catch (e) {
    return { totalBytes: total, postCompactBytes: 0, lastCompactOffset: 0, found: false, error: `tail-read-failed:${e?.message || e}` };
  } finally {
    if (fd !== null) try { _close(fd); } catch { /* best-effort */ }
  }
}

// ─── Top-level: read pressure for one chat ──────────────────────────────────

/**
 * Read the current context-fill pressure for one chat session.
 *
 * Returns { sessionId, slot?, tokensEstimate, pressureLevel, totalBytes,
 *           postCompactBytes, lastCompactOffset, found, error? }
 *
 * Honours env knobs PRISM_CHAT_TOKEN_{WARN_AT,CRITICAL_AT,BYTES_PER_TOK,DISABLE}.
 * Kill switch (PRISM_CHAT_TOKEN_DISABLE=1) returns a clean+0 stub so the
 * orchestrator's decision module degrades gracefully.
 *
 * @param {string} sessionId  — Claude session id (8-hex or full UUID prefix)
 * @param {{ slot?: string, projectsDir?: string, _io?: object, _env?: object }} opts
 */
export function readChatPressure(sessionId, opts = {}) {
  const _env = opts._env || process.env;
  if (_env.PRISM_CHAT_TOKEN_DISABLE === "1") {
    return {
      sessionId, slot: opts.slot || null,
      tokensEstimate: 0, pressureLevel: "clean",
      totalBytes: 0, postCompactBytes: 0, lastCompactOffset: 0,
      found: false, error: "disabled",
    };
  }
  const warnAt = Number(_env.PRISM_CHAT_TOKEN_WARN_AT) || DEFAULT_WARN_AT_TOKENS;
  const critAt = Number(_env.PRISM_CHAT_TOKEN_CRITICAL_AT) || DEFAULT_CRITICAL_AT_TOKENS;
  const bytesPerToken = Number(_env.PRISM_CHAT_TOKEN_BYTES_PER_TOK) || DEFAULT_BYTES_PER_TOKEN;

  // SIDECAR-FIRST: prefer the accurate token-awareness sidecar (real /context
  // zone) over the byte-estimate (which over-reports -- counts the whole on-disk
  // jsonl). Knob PRISM_CHAT_TOKEN_SIDECAR_DISABLE=1 forces the byte-estimate.
  if (_env.PRISM_CHAT_TOKEN_SIDECAR_DISABLE !== "1") {
    const sc = readSidecarPressure(opts.slot, {
      sidecarDir: opts._sidecarDir,
      _io: opts._io,
      _now: opts._now,
    });
    if (sc) {
      return {
        sessionId, slot: opts.slot || null,
        tokensEstimate: sc.tokens, pressureLevel: sc.level,
        totalBytes: 0, postCompactBytes: 0, lastCompactOffset: 0,
        found: true, source: "sidecar", pct: sc.pct,
      };
    }
  }

  const r = readTranscriptBytes(sessionId, opts);
  const tokens = estimateTokens(r.postCompactBytes, bytesPerToken);
  let level = classifyPressure(tokens, warnAt, critAt);
  // SUSPECT guard (parity with precompact-auto-trigger's 1.1x CONTEXT_CAP floor): a
  // byte-estimate above the physical context ceiling is IMPOSSIBLE as real context
  // fill -> it is transcript-bloat, not pressure. Downgrade the false "critical" to
  // "warn" so advisory consumers (zulu CHO01 -> advise-only, NOT /compact) stop
  // nudging constant compaction on a phantom. The authoritative sidecar path (tried
  // first, above) stays the real critical signal; this only affects the byte fallback.
  const contextCap = Number(_env.PRISM_CHAT_TOKEN_CONTEXT_CAP) || DEFAULT_CONTEXT_CAP_TOKENS;
  const suspect = Number.isFinite(tokens) && tokens > contextCap * SUSPECT_FACTOR;
  if (suspect && level === "critical") level = "warn";
  return {
    sessionId, slot: opts.slot || null,
    tokensEstimate: tokens, pressureLevel: level,
    totalBytes: r.totalBytes, postCompactBytes: r.postCompactBytes,
    lastCompactOffset: r.lastCompactOffset, found: r.found,
    source: "byte-estimate",
    ...(suspect ? { suspect: true } : {}),
    ...(r.error ? { error: r.error } : {}),
  };
}
