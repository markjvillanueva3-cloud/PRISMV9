#!/usr/bin/env node
// tier: T0
/**
 * precompact-auto-trigger.mjs — Enforce /precompact at 160K tokens.
 *
 * Goal:
 *   Claude runs with a 1M token context window (Opus 4.5). At 900K tokens we MUST run
 *   /precompact (writes the per-chat handoff so /startup can resume). The
 *   100K remaining buffer is writing-room for the handoff and for Claude's
 *   subsequent invocation of /compact before hitting the hard cap.
 *
 * Event routing — canonical entry is **PreToolUse only** (one fire per tool
 * call). It does both:
 *   - SOFT (tokens ≥ SOFT): emit `additionalContext` nudging /precompact,
 *     dedup'd per session so it fires once per crossing. Non-blocking.
 *   - HARD (tokens ≥ HARD): `decision:block` the tool call, unless the
 *     precompact-pending marker exists (/precompact already fired).
 *   The PostToolUse / UserPromptSubmit branches are kept for backward compat
 *   (so the hook still works if also wired there) but the harness should wire
 *   this on PreToolUse only — wiring it on both Pre+Post doubled the transcript
 *   read per tool call for no benefit (the PreToolUse arm already covers SOFT).
 *
 * Token source:
 *   Reads only the TAIL of the transcript JSONL (`transcript_path` from hook
 *   stdin — last ~512 KB) and sums the last assistant message's
 *   usage.input_tokens + cache_read + cache_creation. That IS Claude's
 *   authoritative measure. The tail read keeps cost O(1) instead of O(session
 *   size) — a 900K-token transcript is multi-MB and this hook runs on every
 *   tool call. Falls back to byte-estimation (size / 3.5) when unavailable.
 *
 * Thresholds (configurable via env):
 *   PRECOMPACT_SOFT_TOKENS  (default 880000) — soft inject
 *   PRECOMPACT_HARD_TOKENS  (default 940000) — hard block (buffer for
 *                                                pre-compact + compact chain)
 *
 *   AUTOCOMPACT-AUTONOMOUS-MS0/U-AAM01 (2026-05-15): defaults bumped from
 *   800K/900K to 880K/940K. With `CLAUDE_AUTOCOMPACT_PCT_OVERRIDE=95` the
 *   CLI fires at ~950K, so the 10K HARD→CLI buffer is the precompact
 *   handoff's write budget. Old defaults left 60K of unused context (~6%
 *   of the 1M window) — that's now used for actual reasoning instead of
 *   sitting idle past the SOFT/HARD thresholds.
 *
 * Dedup:
 *   Writes a cache marker so the soft inject fires once per crossing, not
 *   every tool call. Marker clears when token count drops below the soft
 *   threshold (after /compact).
 */

import fs from "node:fs";
import path from "node:path";
import { resolveSlotShared } from "../../scripts/lib/slot-resolve-shared.mjs";

const CACHE_DIR = path.resolve("H:/prism/.claude/cache");
const SOFT_FIRED_PREFIX = "precompact-auto-soft-fired-"; // suffix: <sid>.marker
const PENDING_MARKER_DIR = CACHE_DIR; // precompact-pending-<sid>.marker lives here

// TOKEN-AWARENESS-MS0 / U-TA13 (2026-05-20) — sidecar integration.
// The byte-estimator was tripping the 1.1× CONTEXT_CAP sanity floor on every
// session whose JSONL transcript carried multi-MB of pre-compact bytes (see
// state/shared/precompact-trigger.jsonl — every recent entry was
// TOKEN_COUNT_SUSPECT). Sanity-floor by design SUPPRESSES the HARD block,
// which silently DISABLED auto-compaction enforcement fleet-wide. The fix:
// read the per-slot sidecar (written by token-awareness-sidecar.mjs with a
// 4 MB tail + compact-boundary slice — same algorithm as statusline) FIRST
// and use its compact-aware ctx.tokens directly. Fall back to the prior
// lastAssistantTokens → estimateFromBytes chain when the sidecar is missing,
// stale, or has no ctx data (preserving back-compat for sessions whose
// sidecar hook hasn't fired yet).
// 180s — kept equal to DEFAULT_STALE_TTL_MS (token-awareness-state.mjs) and
// statusline's TOKEN_AWARENESS_SIDECAR_TTL_MS. A turn under fleet load routinely
// runs 60-120s; 60s discarded healthy sidecars and forced the byte-estimate path
// (which has its own sanity-floor that silently suppresses HARD — a worse failure
// mode than this TTL widening).
//
// Tail-risk acknowledgement (3-of-3 scrutiny, arm C): widening 60→180s extends
// the window in which a sidecar that froze near a threshold could be trusted as
// current. The risk is bounded — the sidecar refreshes on every UserPromptSubmit
// AND every PostToolUse, so the only gap-without-refresh is mid-tool-call where
// the model has not yet seen the new output anyway. Native autocompact at
// CLAUDE_AUTOCOMPACT_PCT_OVERRIDE=95 remains the ultimate backstop.
const SIDECAR_TTL_MS = 180_000;
// Test-injectable overrides (production code path unchanged when unset).
const SLOTS_FILE = process.env.PRISM_TEST_SLOTS_FILE || "H:/prism/state/shared/chat-slots.json";
const SIDECAR_DIR = process.env.PRISM_TEST_SIDECAR_DIR || "H:/prism/state/shared";

// Multi-chat coordination: every chat keys its OWN marker by session id taken
// from hook stdin (stdin.session_id). Earlier this file used a single global
// marker, which caused 6 concurrent chats to silently dedup themselves out of
// the SOFT warning when the FIRST chat crossed 800K — they sailed past the
// soft window and all hit the HARD 900K block in the same minute.
function safeSid(sid) {
  if (typeof sid !== "string" || sid.length === 0) return "global";
  // Sanitize: keep alnum + dash + underscore; everything else → '_'.
  return sid.replace(/[^A-Za-z0-9_-]/g, "_").slice(0, 64) || "global";
}
function softFiredPath(sid) {
  return path.join(CACHE_DIR, `${SOFT_FIRED_PREFIX}${safeSid(sid)}.marker`);
}

// Thresholds are paired with CLAUDE_AUTOCOMPACT_PCT_OVERRIDE=95 (950K of 1M):
//   SOFT 880K — nudge Claude to run /precompact (non-blocking, ~70K headroom
//                 to plan + write the handoff before HARD)
//   HARD 940K — last-chance block BEFORE native autocompact at 950K, so
//                 /precompact has room to write the handoff in the 10K
//                 buffer between HARD and native autocompact. Bumped from
//                 900K (AAM01) — old 50K buffer was over-provisioned.
const CONTEXT_CAP = Number(process.env.PRECOMPACT_CONTEXT_CAP || 1_000_000);
// AUTO-COMPACTION-MODEL-HANDOFF-MS0/U2 (2026-06-11, slot:alpha): a threshold ABOVE
// the context cap can NEVER fire -- that is the stale "disable via absurd value"
// workaround (the OS env set PRECOMPACT_{SOFT,HARD}_TOKENS=99000000 to silence the
// now-FIXED false-compaction bugs 7b8dbde2dd + 6b5d3a85e4). Neutralize an implausible
// override back to the real default so the 90-95% model-handoff trigger actually fires
// (operator directive 2026-06-11). Genuine disable now uses the CLEAN knob
// PRECOMPACT_DISABLE=1 (not value-abuse).
// Ref: [[reference_precompact_autotrigger_disabled_99m_2026_06_11]].
// NOTE: the clamp ceiling is CONTEXT_CAP; this assumes the CAP itself is trusted
// (the documented stale workaround only sets PRECOMPACT_{SOFT,HARD}_TOKENS, never the CAP).
const PRECOMPACT_DISABLED = process.env.PRECOMPACT_DISABLE === "1";
function resolveThreshold(envVal, dflt) {
  const n = Number(envVal);
  if (!Number.isFinite(n) || n <= 0 || n > CONTEXT_CAP) return dflt;
  return n;
}
const SOFT = PRECOMPACT_DISABLED ? Infinity : resolveThreshold(process.env.PRECOMPACT_SOFT_TOKENS, 880_000);
const HARD = PRECOMPACT_DISABLED ? Infinity : resolveThreshold(process.env.PRECOMPACT_HARD_TOKENS, 940_000);
const CHARS_PER_TOKEN = 3.5;

function readStdinSync() {
  try {
    if (process.stdin.isTTY) return null;
    const buf = fs.readFileSync(0, "utf-8");
    if (!buf || !buf.trim().startsWith("{")) return null;
    return JSON.parse(buf);
  } catch { return null; }
}

const TRANSCRIPT_TAIL_BYTES = 512 * 1024; // last 512 KB is far more than one assistant turn
// 64 MB compact-boundary scan window. Was 8 MB — too small: a single-session
// transcript JSONL routinely exceeds it (observed 19 MB), pushing the latest
// isCompactSummary marker outside the window → findLastCompactOffset() returns
// 0 → byte-estimator counts pre-compact bloat → false post-compact alarm.
const COMPACT_SCAN_BYTES = 64 * 1024 * 1024;

/** Read only the tail of a (possibly large) file — O(1) instead of O(size). */
function readTail(filePath, maxBytes) {
  const fd = fs.openSync(filePath, "r");
  try {
    const { size } = fs.fstatSync(fd);
    const start = size > maxBytes ? size - maxBytes : 0;
    const len = size - start;
    const buf = Buffer.allocUnsafe(len);
    fs.readSync(fd, buf, 0, len, start);
    return buf.toString("utf-8");
  } finally {
    fs.closeSync(fd);
  }
}

/**
 * Find the byte offset of the line AFTER the most recent `isCompactSummary:true`
 * entry in the transcript. Returns 0 if no compact marker found in the scan
 * window — caller treats whole file as post-compact.
 *
 * Root cause this solves: the transcript JSONL is APPENDED-to (never truncated)
 * on /compact, so a session that has compacted carries the pre-compact bytes
 * forever. The previous estimateFromBytes() divided the entire file size by
 * 3.5 and reported the pre-compact bloat as current-context tokens — false-
 * positive 1.43M-token block immediately after a successful compact (observed
 * 2026-05-15, session 6eac1b66). The fix: only count bytes AFTER the last
 * compact boundary.
 */
function findLastCompactOffset(transcriptPath, fileSize) {
  if (!fileSize || fileSize <= 0) return 0;
  const start = Math.max(0, fileSize - COMPACT_SCAN_BYTES);
  const len = fileSize - start;
  let fd = -1;
  try {
    fd = fs.openSync(transcriptPath, "r");
    const buf = Buffer.allocUnsafe(len);
    fs.readSync(fd, buf, 0, len, start);
    const text = buf.toString("utf-8");
    // Match BOTH compact-boundary formats: the current build's
    // {"type":"system","subtype":"compact_boundary"} record AND the legacy
    // {"isCompactSummary":true} flag. The 2026-06 format change (verified
    // against live transcripts 2026-06-10) silently broke the legacy-only scan
    // -> whole-file byte count -> false >=HARD -> the alpha constant-compaction
    // loop. Either marker delimits the start of post-compact content.
    const re = /"isCompactSummary"\s*:\s*true|"subtype"\s*:\s*"compact_boundary"/g;
    let lastMatch = -1;
    let m;
    while ((m = re.exec(text)) !== null) lastMatch = m.index;
    if (lastMatch < 0) return 0;
    const lineEnd = text.indexOf("\n", lastMatch);
    if (lineEnd < 0) return 0;
    return start + lineEnd + 1;
  } catch {
    return 0;
  } finally {
    if (fd >= 0) {
      try { fs.closeSync(fd); } catch { /* ignore */ }
    }
  }
}

function lastAssistantTokens(transcriptPath) {
  if (!transcriptPath) return null;
  try {
    const raw = readTail(transcriptPath, TRANSCRIPT_TAIL_BYTES);
    const lines = raw.split("\n");
    // If we truncated mid-line at the start, the first element is a partial
    // JSON line — JSON.parse throws and we skip it, which is correct.
    for (let i = lines.length - 1; i >= 0; i--) {
      const line = lines[i].trim();
      if (!line) continue;
      let entry;
      try { entry = JSON.parse(line); } catch { continue; }
      // Stop at the most recent compact boundary. Walking the tail in reverse,
      // if we reach the current-build {"type":"system","subtype":
      // "compact_boundary"} record BEFORE any post-compact assistant turn, the
      // only assistant usage available is PRE-compact (its cache_read reflects
      // the pre-compact prefix, e.g. ~950K) and must NOT be read as current.
      // Return null so estimateFromBytes (now boundary-aware) counts only the
      // small post-compact tail. Without this, a high-watermark compact leaves
      // the pre-compact turn as the "authoritative" reading -> unsuppressed HARD
      // block -> /compact -> loop. (Legacy isCompactSummary handled below.)
      if (entry?.type === "system" && entry?.subtype === "compact_boundary") return null;
      const usage = entry?.message?.usage ?? entry?.usage;
      if (entry?.type === "assistant" && usage && typeof usage === "object") {
        // POST-COMPACT BUG FIX (2026-05-21, session 641d292f).
        //
        // When the LATEST assistant entry IS the compact summary itself,
        // its `cache_read_input_tokens` reflects the pre-compact prefix
        // Claude had to read in order to GENERATE the summary — NOT the
        // post-compact context size. Summing it falsely reports the chat
        // as near-cap immediately after /compact (observed at 1,041,107
        // tokens in 641d292f). For a real post-compact assistant turn
        // (i.e. the next response after the summary) the usage IS
        // authoritative, so we only skip when this entry itself is the
        // summary — fall through to estimateFromBytes() which uses
        // findLastCompactOffset() to count only post-compact bytes.
        if (entry?.isCompactSummary === true ||
            entry?.message?.isCompactSummary === true) {
          return null;
        }
        const input = Number(usage.input_tokens ?? 0);
        const cacheR = Number(usage.cache_read_input_tokens ?? 0);
        const cacheC = Number(usage.cache_creation_input_tokens ?? 0);
        return input + cacheR + cacheC;
      }
    }
  } catch { /* ignore */ }
  return null;
}

// U-TA13: read the per-slot token-awareness sidecar (token-budget-<slot>.json).
// Returns { tokens, zone, pct, source: "sidecar" } when fresh + valid, else null.
// Fail-safe: any JSON parse / file-read error returns null (caller falls back).
function safeJson(p) {
  try { return JSON.parse(fs.readFileSync(p, "utf8")); } catch { return null; }
}
function resolveSlotFromSlotsFile(sessionId) {
  if (!sessionId) return "unknown";
  // U-SLOT-RESOLVE-UNIFY (2026-06-18): canonical shared resolver. The prior
  // inline loop's exact line never fired (stored chatId is `claude-<8hex>`, the
  // harness sessionId is a full UUID) so it resolved PURELY by a lenient
  // substring -- a peer's 8hex inside this chat's UUID could resolve the PEER's
  // slot and read the wrong `token-budget-<slot>.json` (wrong trigger). The
  // shared resolver derives the canonical `claude-<8hex>` and exact-matches it
  // before any lenient fallback.
  const r = resolveSlotShared(safeJson(SLOTS_FILE), { sessionId });
  return r ? r.slot : "unknown";
}
function readSidecarTokens(sessionId) {
  if (!sessionId) return null;
  const slot = resolveSlotFromSlotsFile(sessionId);
  const fp = path.join(SIDECAR_DIR, `token-budget-${slot}.json`);
  const s = safeJson(fp);
  if (!s || !s.capturedAt) return null;
  const age = Date.now() - Date.parse(s.capturedAt);
  if (!Number.isFinite(age) || age > SIDECAR_TTL_MS) return null;
  const t = Number(s?.ctx?.tokens);
  if (!Number.isFinite(t) || t < 0) return null;
  return { tokens: t, zone: s.zone, pct: Number(s?.ctx?.pct) || 0, source: "sidecar" };
}

function estimateFromBytes(transcriptPath) {
  // COMPACT-BOUNDARY-AWARE byte estimator.
  //
  // /compact leaves the JSONL transcript untouched — pre-compact bytes stay on
  // disk forever. Dividing the entire size by CHARS_PER_TOKEN reports the
  // accumulated session size as current-context tokens, which after one
  // /compact is wildly inflated (5 MB transcript → 1.43 M tokens reported
  // immediately after a successful compact, observed 2026-05-15 session
  // 6eac1b66 — exact match for st.size / 3.5).
  //
  // Use findLastCompactOffset() to identify the byte position of the most
  // recent compact boundary. Count only bytes AFTER that boundary. When no
  // marker is found (fresh session, scan window misses an older compact),
  // fall back to whole-file size — that's the legacy behaviour and is correct
  // when there's been no compact.
  try {
    const st = fs.statSync(transcriptPath);
    const compactOffset = findLastCompactOffset(transcriptPath, st.size);
    const relevantBytes = Math.max(0, st.size - compactOffset);
    return Math.floor(relevantBytes / CHARS_PER_TOKEN);
  } catch { return 0; }
}

function precompactMarkerActive(sid) {
  // If /precompact was just run for THIS session, its guard marker exists.
  // Don't nag or block — the user just needs to run /compact, and the
  // precompact-pending-guard Stop hook already enforces that.
  //
  // Multi-chat: the marker filename is `precompact-pending-<sid>.marker`.
  // Earlier this scanned ALL pending markers and returned true on any recent
  // one, meaning chat A running /precompact unblocked the HARD threshold for
  // chats B-F. Now scoped to the caller's own session id.
  const safe = safeSid(sid);
  const markerPath = path.join(PENDING_MARKER_DIR, `precompact-pending-${safe}.marker`);
  try {
    if (!fs.existsSync(markerPath)) return false;
    const mt = fs.statSync(markerPath).mtimeMs;
    return (Date.now() - mt) / 60000 < 30;
  } catch { return false; }
}

function softAlreadyFired(sid, tokens) {
  const p = softFiredPath(sid);
  try {
    if (!fs.existsSync(p)) return false;
    const body = JSON.parse(fs.readFileSync(p, "utf-8"));
    // If we're still above the threshold and it was fired recently, skip
    return body?.tokens_at_fire && tokens >= SOFT - 5000;
  } catch { return false; }
}

function markSoftFired(sid, tokens) {
  try {
    fs.mkdirSync(CACHE_DIR, { recursive: true });
    fs.writeFileSync(softFiredPath(sid), JSON.stringify({
      session_id: safeSid(sid),
      tokens_at_fire: tokens,
      fired_at: new Date().toISOString(),
    }) + "\n");
  } catch { /* ignore */ }
}

function clearSoftFired(sid) {
  try { fs.unlinkSync(softFiredPath(sid)); } catch { /* ignore */ }
}

// Housekeeping: scan all per-session SOFT markers, drop any older than 30 min.
// Replaces the previous single-file stale-cleanup. Survives crashes that left
// markers behind for sessions that never reached the post-compact recovery.
function pruneStaleSoftMarkers() {
  try {
    if (!fs.existsSync(CACHE_DIR)) return;
    const now = Date.now();
    for (const f of fs.readdirSync(CACHE_DIR)) {
      if (!f.startsWith(SOFT_FIRED_PREFIX) || !f.endsWith(".marker")) continue;
      const full = path.join(CACHE_DIR, f);
      try {
        const st = fs.statSync(full);
        if ((now - st.mtimeMs) > 30 * 60 * 1000) fs.unlinkSync(full);
      } catch { /* ignore */ }
    }
  } catch { /* ignore */ }
}

function detectEvent(stdin) {
  const ev = stdin?.hook_event_name || process.env.CLAUDE_HOOK_EVENT || "";
  if (ev === "PreToolUse" || ev === "PostToolUse" || ev === "UserPromptSubmit" || ev === "Stop") return ev;
  // Arg fallback
  const argv = process.argv.slice(2);
  if (argv.includes("--pre")) return "PreToolUse";
  if (argv.includes("--post")) return "PostToolUse";
  return "PostToolUse"; // default
}

function emit(obj) {
  process.stdout.write(JSON.stringify(obj));
}

function main() {
  const stdin = readStdinSync();
  const transcriptPath = stdin?.transcript_path;
  // Per-chat scoping: each session has its own SOFT/PENDING marker keyed by
  // stdin.session_id. Falls back to "global" when stdin is absent (manual
  // testing) — preserves the old single-marker behavior in that case.
  const sid = stdin?.session_id;

  // U-TA13 (2026-05-20): sidecar-first read order. The sidecar's compact-
  // boundary-aware ctx.tokens (4 MB tail) is more reliable than this hook's
  // 512 KB tail tail-read + bytes/3.5 fallback, AND it's already deduped via
  // dedupByMessageId. When fresh (<=60s), it bypasses the failure modes that
  // were tripping the 1.1× sanity floor and silently disabling the HARD block.
  let tokens = null;
  let tokenSource = "none";
  const sidecar = readSidecarTokens(sid);
  if (sidecar) {
    tokens = sidecar.tokens;
    tokenSource = "sidecar";
  } else if (transcriptPath) {
    tokens = lastAssistantTokens(transcriptPath);
    if (tokens != null && Number.isFinite(tokens) && tokens > 0) {
      tokenSource = "assistant";
    } else {
      tokens = estimateFromBytes(transcriptPath);
      tokenSource = "bytes";
    }
  } else {
    tokens = 0;
  }

  // Dropped back below soft threshold? (post-compact) — clear THIS session's
  // dedup marker so the next crossing fires a fresh warning.
  if (tokens < SOFT) clearSoftFired(sid);
  // Housekeeping: drop any per-session marker older than 30 minutes (stale
  // from crashed sessions). Bounded scan over the cache dir.
  pruneStaleSoftMarkers();

  const event = detectEvent(stdin);
  const precompactAlreadyArmed = precompactMarkerActive(sid);

  // AUTO-COMPACTION-MODEL-HANDOFF-MS0/U1 (2026-06-11, slot:alpha): at the HARD
  // threshold EVERY tool call is blocked -- including the Bash call the model uses to
  // WRITE its own handoff. Exempt the handoff-write so the model can satisfy the block,
  // then ARM the pending marker (below) so subsequent calls are not re-blocked. This is
  // the model-authored equivalent of the old "/precompact skill arms the marker" escape
  // (the operator BANNED the stub skill; the model writes the handoff directly).
  const _toolCmd = typeof stdin?.tool_input?.command === "string" ? stdin.tool_input.command : "";
  const isHandoffWrite = /per-agent-handoff(?:\.mjs)?\s+write|precompact-handoff/.test(_toolCmd);

  // HARD: block the tool call at ≥ HARD tokens, unless precompact marker is
  // live. PreToolUse is the canonical event (decision:block stops the tool
  // call); Stop also accepted for safety.
  if ((event === "PreToolUse" || event === "Stop") && tokens >= HARD && !precompactAlreadyArmed) {
    // HS-11 sanity floor (2026-05-12): if the token estimate exceeds the
    // model's hard cap by >50%, the counter is almost certainly wrong
    // (typical cause: transcript JSONL bytes ÷ 4 over-counts when persisted-
    // output files inflate the on-disk size). Log + soft-nudge instead of
    // hard-blocking. Blocking work over a measurement bug is worse than
    // letting a slightly-over-budget turn through.
    // U-TA13: sanity floor only fires for the "bytes" tokenSource — the
    // sidecar and lastAssistantTokens paths are authoritative. If the
    // sidecar reports tokens > 1.1× cap, that's a real over-budget signal
    // (post-compact transcript that hasn't shrunk, or a session that
    // crossed the 1M context wall) — let the HARD block fire.
    if (tokens > CONTEXT_CAP * 1.1 && tokenSource === "bytes") {
      try {
        fs.appendFileSync(
          "H:/prism/state/shared/precompact-trigger.jsonl",
          JSON.stringify({ t: Date.now(), sid, tokens, source: tokenSource, hard: HARD, cap: CONTEXT_CAP, verdict: "TOKEN_COUNT_SUSPECT" }) + "\n"
        );
      } catch { /* ignore */ }
      // HARD-SUSPECT-SUPPRESS (2026-05-21 alpha) — Claude was reading the
      // "Run /precompact when convenient" copy in this advisory as an
      // authoritative directive and compacting on false alarms. The estimate
      // is KNOWN wrong (that's why we're in this branch); telling the model
      // to act on it is the opposite of what we want. Log to JSONL (ops can
      // see the byte-estimator misfires there) and emit a silent continue.
      emit({ continue: true, suppressOutput: true });
      return;
    }
    // U1: let the model own handoff-write through, and ARM the marker so the next tool
    // call is not re-blocked (a fresh model-authored handoff = the new "armed").
    if (isHandoffWrite) {
      try {
        fs.mkdirSync(PENDING_MARKER_DIR, { recursive: true });
        fs.writeFileSync(
          path.join(PENDING_MARKER_DIR, `precompact-pending-${safeSid(sid)}.marker`),
          String(Date.now())
        );
      } catch { /* ignore */ }
      emit({ continue: true, suppressOutput: true });
      return;
    }
    emit({
      decision: "block",
      reason: [
        `CONTEXT AT ${tokens.toLocaleString()} TOKENS -- PRECOMPACT HARD THRESHOLD (${HARD.toLocaleString()}).`,
        `You are ${Math.max(0, CONTEXT_CAP - tokens).toLocaleString()} tokens from the 1M cap; native autocompact fires at 95%.`,
        ``,
        `Before any more tool calls, AUTHOR YOUR session handoff YOURSELF -- the model writes it, NOT the precompact stub-skill (only you know the real session state):`,
        `  node H:/prism/.claude/helpers/per-agent-handoff.mjs write --source live-chat --terminal $(node H:/prism/.claude/helpers/stable-session-id.mjs) --resume "<one-line next action>" --state "<optimal markdown>"`,
        `Optimal --state: ## GOAL (standing) | ## DONE+VERIFIED (SHA / how verified) | ## IN-FLIGHT (file:line / next step) | ## KEY FILE:LINE REFS | ## OPEN DECISIONS | ## MEMORY/SPEC POINTERS. Facts + file:line + SHAs, not prose.`,
        ``,
        `That handoff is the ONLY context that survives the imminent autocompact. The write command above is allowed through this block -- run it, then keep working (autocompact + /startup resume cleanly).`,
      ].join("\n"),
    });
    return;
  }

  // SOFT: inject `additionalContext` at ≥ SOFT tokens, dedup'd per session.
  // Runs on PreToolUse (canonical — one fire per tool call) AND on the legacy
  // PostToolUse / UserPromptSubmit events if the hook is still wired there.
  if ((event === "PreToolUse" || event === "PostToolUse" || event === "UserPromptSubmit") &&
      tokens >= SOFT && !precompactAlreadyArmed && !softAlreadyFired(sid, tokens)) {
    // SOFT-SANITY-FLOOR (2026-05-21 alpha) — root cause of the user's observed
    // "we're compacting far more than ever before" fleet-wide regression:
    // the HARD path had a sanity guard for byte-estimator over-counts (line 399
    // above), but the SOFT path emitted an authoritative "/precompact REQUIRED"
    // message at the same suspect counts. Claude reacted to the SOFT message
    // and ran /precompact + /compact even when real context (per sidecar) was
    // <40%. Mirror the HARD sanity floor here: if the source is "bytes" AND
    // the estimate exceeds 1.1× cap, log to JSONL and SUPPRESS the message
    // entirely (no inject — let the next tool call retry with a hopefully
    // fresh sidecar). When source is "sidecar" or "assistant" the estimate
    // IS authoritative and the SOFT nudge fires normally.
    if (tokens > CONTEXT_CAP * 1.1 && tokenSource === "bytes") {
      try {
        fs.appendFileSync(
          "H:/prism/state/shared/precompact-trigger.jsonl",
          JSON.stringify({ t: Date.now(), sid, tokens, source: tokenSource, soft: SOFT, cap: CONTEXT_CAP, verdict: "SOFT_SUPPRESSED_BYTE_SUSPECT" }) + "\n"
        );
      } catch { /* ignore */ }
      emit({ continue: true, suppressOutput: true });
      return;
    }
    markSoftFired(sid, tokens);
    const remaining = Math.max(0, CONTEXT_CAP - tokens);
    const sourceTag = tokenSource === "bytes" ? " [byte-estimated — may be inflated post-compact]" : "";
    const msg = [
      `CONTEXT AT ${tokens.toLocaleString()} TOKENS -- soft precompact threshold ${SOFT.toLocaleString()}${sourceTag}.`,
      `KEEP WORKING -- do NOT stop to run /compact (R6: context growth is not a stop signal). At your next natural pause, AUTHOR YOUR OWN session handoff: the model writes it, NOT the precompact stub-skill (only you know the real state).`,
      `Write it with: node H:/prism/.claude/helpers/per-agent-handoff.mjs write --source live-chat --terminal $(node H:/prism/.claude/helpers/stable-session-id.mjs) --resume "<one-line next action>" --state "<optimal markdown>".`,
      `Optimal --state: ## GOAL (standing) | ## DONE+VERIFIED (SHA / how verified) | ## IN-FLIGHT (file:line / next step) | ## KEY FILE:LINE REFS | ## OPEN DECISIONS | ## MEMORY/SPEC POINTERS. Facts + file:line + SHAs, not prose.`,
      `Then keep shipping -- native autocompact fires at 95% and /startup resumes from YOUR handoff. Remaining buffer: ~${remaining.toLocaleString()} tokens.`,
    ].join(" ");
    emit({
      continue: true,
      hookSpecificOutput: {
        hookEventName: event,
        additionalContext: msg,
      },
    });
    return;
  }

  // Below threshold OR precompact already armed — no-op
  emit({ continue: true, suppressOutput: true });
}

try { main(); } catch { process.stdout.write(JSON.stringify({ continue: true })); }

