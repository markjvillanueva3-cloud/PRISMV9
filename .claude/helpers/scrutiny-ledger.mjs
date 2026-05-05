/**
 * scrutiny-ledger — tracks per-session scrutiny status for scrutinize-before-stop hook.
 *
 * Stores entries keyed by stable session id (or transcript path hash).
 * Schema: {
 *   sessionId, recordedAt, blockCount, notes,
 *   selfReviewed,               // existing: human/Claude self-diff review
 *   agentReviewed,              // existing: backward-compat — true if ANY of (codex|gemini|opus) reviewed
 *   codexReviewed,              // NEW: Codex CLI returned PASS
 *   geminiReviewed,             // NEW: Gemini CLI returned PASS
 *   opusReviewed,               // NEW: Claude Opus reviewer agent returned PASS
 *   reviews: {                  // NEW: per-provider verdicts
 *     codex:  { verdict: "pass"|"fail", blockers, notes, recordedAt },
 *     gemini: { ... },
 *     opus:   { ... },
 *   }
 * }
 * Storage: mcp-server/data/state/SCRUTINY_LEDGER.json
 *
 * Multi-CLI consensus: scrutinize-before-stop requires 3-of-3 reviewers (codex
 * AND gemini AND opus) to release the Stop. Strict mode per user election
 * 2026-05-05. Self-review remains orthogonal but is no longer load-bearing
 * for clearance.
 */

import * as fs from "node:fs";
import * as path from "node:path";
import * as crypto from "node:crypto";

const LEDGER_REL = "mcp-server/data/state/SCRUTINY_LEDGER.json";
const LOCK_REL = LEDGER_REL + ".lock";
const MAX_BLOCKS_PER_SESSION = 3;

// Lock parameters — short enough that the worst-case wait is bounded for
// interactive use but long enough that 6 concurrent chats each writing a few
// times per session don't time out.
const LOCK_STALE_MS = 30_000;     // stale lock from a crashed writer is force-cleared after this
const LOCK_RETRY_MS = 25;         // sleep between attempts
const LOCK_MAX_WAIT_MS = 5_000;   // total wait budget per acquire

function findProjectRoot(startDir) {
  let cur = startDir || process.cwd();
  for (let i = 0; i < 8; i++) {
    if (fs.existsSync(path.join(cur, ".claude", "settings.json"))) return cur;
    const parent = path.dirname(cur);
    if (parent === cur) break;
    cur = parent;
  }
  return startDir || process.cwd();
}

function ledgerPath() {
  return path.join(findProjectRoot(), LEDGER_REL);
}

function lockPath() {
  return path.join(findProjectRoot(), LOCK_REL);
}

/**
 * Sleep without burning CPU. Uses Atomics.wait on a private SharedArrayBuffer
 * so it works in any Node main thread without spawning a worker. The
 * SharedArrayBuffer is private to this call so no cross-thread coordination
 * happens — it's purely a sync sleep primitive.
 */
function sleepSync(ms) {
  const buf = new SharedArrayBuffer(4);
  Atomics.wait(new Int32Array(buf), 0, 0, Math.max(0, ms));
}

/**
 * Acquire a file-based lock for the ledger, run fn(), then release.
 *
 * Gemini blocker #4: the previous code used atomic tmp+rename so individual
 * writes weren't torn, but two concurrent recordScrutiny calls could each
 * loadLedger() the same starting state, modify their copies independently,
 * and rename in sequence — the second rename silently overwrites the first
 * mark (lost-update RMW race).
 *
 * Resolution: serialize the load-modify-save cycle behind an O_EXCL lockfile.
 * Stale-lock detection clears locks older than LOCK_STALE_MS so a crashed
 * writer can't deadlock the gate.
 */
function withLedgerLock(fn) {
  const lockP = lockPath();
  fs.mkdirSync(path.dirname(lockP), { recursive: true });
  const start = Date.now();
  let acquired = false;
  while (!acquired) {
    try {
      const fd = fs.openSync(lockP, "wx");
      fs.writeSync(fd, JSON.stringify({ pid: process.pid, acquiredAt: Date.now() }));
      fs.closeSync(fd);
      acquired = true;
    } catch (err) {
      if (err && err.code !== "EEXIST") throw err;
      // Stale-lock check: if the lock file is older than LOCK_STALE_MS, the
      // owner crashed without releasing. Force-clear and retry.
      try {
        const stat = fs.statSync(lockP);
        if (Date.now() - stat.mtimeMs > LOCK_STALE_MS) {
          fs.unlinkSync(lockP);
          continue;
        }
      } catch { /* lock disappeared between EEXIST and stat — racing release; retry */ }
      if (Date.now() - start >= LOCK_MAX_WAIT_MS) {
        throw new Error(
          `scrutiny-ledger: could not acquire lock at ${lockP} within ${LOCK_MAX_WAIT_MS}ms`,
        );
      }
      sleepSync(LOCK_RETRY_MS);
    }
  }
  try {
    return fn();
  } finally {
    try { fs.unlinkSync(lockP); } catch { /* already removed by stale-clear or peer */ }
  }
}

function loadLedger() {
  const p = ledgerPath();
  if (!fs.existsSync(p)) return { entries: {} };
  try {
    return JSON.parse(fs.readFileSync(p, "utf-8"));
  } catch {
    // Corrupt or unreadable ledger: surface as empty so callers can re-record
    // their marks. We don't throw here because a corrupt history shouldn't
    // block new reviewers from clearing the gate.
    return { entries: {} };
  }
}

/**
 * Persist the ledger to disk atomically. THROWS on failure so callers see
 * disk-full / permission errors instead of silently losing their mark
 * (Gemini blocker #1: previously returned `false` and recordScrutiny ignored
 * it, so a write failure looked like success to the chat).
 */
function saveLedger(data) {
  const p = ledgerPath();
  fs.mkdirSync(path.dirname(p), { recursive: true });
  // Atomic write: tmp + rename. Combined with withLedgerLock above this gives
  // both torn-write protection AND read-modify-write serialization across
  // concurrent processes.
  const tmp = `${p}.tmp.${process.pid}.${Date.now().toString(36)}`;
  fs.writeFileSync(tmp, JSON.stringify(data, null, 2));
  fs.renameSync(tmp, p);
  return true;
}

/**
 * Parse a reviewer's first-non-empty output line into a verdict.
 *
 * Gemini blocker #2: the previous regex `^VERDICT:\s*(PASS|FAIL)\s*$` was too
 * strict and rejected conformant reviewer outputs that included trailing
 * notes, such as `VERDICT: PASS — confidence high` or `VERDICT: PASS (5/9)`.
 * The system prompt itself shows trailing parens as illustrative ("(if all
 * criteria met)") so reviewers reasonably emit them.
 *
 * Resolution: anchor to the start of the line, accept PASS or FAIL on a word
 * boundary, allow any trailing text. Still strict on the leading
 * `VERDICT:\s*` shape so prose mentions of "VERDICT:" elsewhere don't match.
 *
 * @param {string} text — full reviewer stdout (already trimmed by caller)
 * @returns {{ verdict: "pass"|"fail"|null, firstLine: string }}
 *   verdict is null when no recognizable VERDICT line was found.
 */
export function parseVerdictLine(text) {
  if (typeof text !== "string") return { verdict: null, firstLine: "" };
  const firstLine = text
    .split(/\r?\n/)
    .map((l) => l.trim())
    .find((l) => l.length > 0) ?? "";
  const m = firstLine.match(/^VERDICT:\s*(PASS|FAIL)\b/i);
  if (!m) return { verdict: null, firstLine };
  return { verdict: m[1].toLowerCase(), firstLine };
}

/**
 * Compute a stable session ID from the transcript path or fall back to a hash
 * of the first 200 bytes (catches restarted sessions on the same transcript).
 */
export function deriveSessionId(payload) {
  if (payload && typeof payload.session_id === "string" && payload.session_id) {
    return payload.session_id;
  }
  const transcriptPath = payload && (payload.transcript_path || payload.transcriptPath);
  if (typeof transcriptPath === "string" && transcriptPath) {
    return crypto.createHash("sha256").update(transcriptPath).digest("hex").slice(0, 16);
  }
  return "unknown-session";
}

function makeEmptyEntry(sessionId) {
  return {
    sessionId,
    recordedAt: new Date().toISOString(),
    selfReviewed: false,
    agentReviewed: false,
    codexReviewed: false,
    geminiReviewed: false,
    opusReviewed: false,
    reviews: {},
    blockCount: 0,
    notes: "",
  };
}

function recordReviewerDetail(entry, provider, detail) {
  if (!entry.reviews || typeof entry.reviews !== "object") entry.reviews = {};
  if (!detail) return;
  const verdict = detail.verdict === "pass" || detail.verdict === "fail" ? detail.verdict : undefined;
  entry.reviews[provider] = {
    verdict: verdict ?? entry.reviews[provider]?.verdict ?? "pass",
    blockers: typeof detail.blockers === "string" ? detail.blockers.slice(0, 1000) : entry.reviews[provider]?.blockers ?? "",
    notes: typeof detail.notes === "string" ? detail.notes.slice(0, 500) : entry.reviews[provider]?.notes ?? "",
    recordedAt: new Date().toISOString(),
  };
}

/**
 * Record that scrutiny has been completed for a session.
 *
 * @param {string} sessionId
 * @param {{
 *   selfReviewed?: boolean,
 *   agentReviewed?: boolean,    // legacy alias — sets all three flags off if not paired with provider flags
 *   codexReviewed?: boolean,
 *   geminiReviewed?: boolean,
 *   opusReviewed?: boolean,
 *   codexDetail?: { verdict?: "pass"|"fail", blockers?: string, notes?: string },
 *   geminiDetail?: { verdict?: "pass"|"fail", blockers?: string, notes?: string },
 *   opusDetail?:   { verdict?: "pass"|"fail", blockers?: string, notes?: string },
 *   notes?: string
 * }} marks
 */
export function recordScrutiny(sessionId, marks = {}) {
  return withLedgerLock(() => {
    const data = loadLedger();
    const entry = data.entries[sessionId] || makeEmptyEntry(sessionId);
    // Migrate legacy entries that lack the new fields
    if (typeof entry.codexReviewed !== "boolean") entry.codexReviewed = false;
    if (typeof entry.geminiReviewed !== "boolean") entry.geminiReviewed = false;
    if (typeof entry.opusReviewed !== "boolean") entry.opusReviewed = false;
    if (!entry.reviews || typeof entry.reviews !== "object") entry.reviews = {};

    // Provider PASS/FAIL marks accept BOTH true and false so a later FAIL
    // revokes a prior PASS (Codex blocker #1). Without this, calling
    // `--mark-opus fail` after a prior PASS would leave the boolean true and
    // isCleared() would still return true — violating "ANY reviewer FAIL keeps blocking".
    if (marks.selfReviewed === true) entry.selfReviewed = true;
    if (typeof marks.codexReviewed === "boolean") entry.codexReviewed = marks.codexReviewed;
    if (typeof marks.geminiReviewed === "boolean") entry.geminiReviewed = marks.geminiReviewed;
    if (typeof marks.opusReviewed === "boolean") entry.opusReviewed = marks.opusReviewed;
    // Legacy agent flag — same boolean type-guard as the providers so a
    // FAIL mark on the legacy field also revokes a prior PASS (Gemini
    // blocker #3). Note that lines below derive agentReviewed from the OR
    // of the providers, so this explicit assignment is the FALSE-revocation
    // path; OR-derivation reasserts TRUE if any provider is still PASS.
    if (typeof marks.agentReviewed === "boolean") entry.agentReviewed = marks.agentReviewed;

    if (marks.codexDetail) recordReviewerDetail(entry, "codex", marks.codexDetail);
    if (marks.geminiDetail) recordReviewerDetail(entry, "gemini", marks.geminiDetail);
    if (marks.opusDetail) recordReviewerDetail(entry, "opus", marks.opusDetail);

    // Derived: agentReviewed is the OR of the 3 providers (so legacy callers
    // that read this field still see "true" once any reviewer signs off).
    if (entry.codexReviewed || entry.geminiReviewed || entry.opusReviewed) {
      entry.agentReviewed = true;
    }

    if (typeof marks.notes === "string") entry.notes = marks.notes.slice(0, 500);
    entry.recordedAt = new Date().toISOString();
    data.entries[sessionId] = entry;
    saveLedger(data);
    return entry;
  });
}

/**
 * Returns true when all three CLI reviewers (Codex, Gemini, Opus) have
 * recorded PASS for the session. Self-review is orthogonal and is NOT
 * required for clearance under the multi-CLI 3-of-3 policy.
 *
 * Backward compat: if a legacy entry has `agentReviewed: true` but no
 * provider flags (e.g. recorded by an older client of this helper),
 * treat it as cleared so prior sessions don't get retroactively blocked.
 */
export function isCleared(sessionId) {
  const data = loadLedger();
  const entry = data.entries[sessionId];
  if (!entry) return false;
  // Strict 3-of-3 policy
  if (entry.codexReviewed === true && entry.geminiReviewed === true && entry.opusReviewed === true) {
    return true;
  }
  // Legacy fallback: pre-3way entries used selfReviewed && agentReviewed
  // and had none of codex/gemini/opus flags. Honor those so existing ledger
  // history doesn't suddenly fail closed.
  const isLegacyEntry =
    entry.codexReviewed !== true &&
    entry.geminiReviewed !== true &&
    entry.opusReviewed !== true;
  if (isLegacyEntry && entry.selfReviewed === true && entry.agentReviewed === true) {
    return true;
  }
  return false;
}

/**
 * Bump and return the block counter for this session. Used to enforce a
 * MAX_BLOCKS_PER_SESSION ceiling so the hook can't infinite-loop a chat.
 */
export function bumpBlockCount(sessionId) {
  return withLedgerLock(() => {
    const data = loadLedger();
    const entry = data.entries[sessionId] || makeEmptyEntry(sessionId);
    entry.blockCount = (entry.blockCount || 0) + 1;
    entry.recordedAt = new Date().toISOString();
    data.entries[sessionId] = entry;
    saveLedger(data);
    return entry.blockCount;
  });
}

export function getEntry(sessionId) {
  // Read-only — no lock required since loadLedger handles corrupt-JSON
  // gracefully and a torn write is impossible thanks to saveLedger's
  // tmp+rename. Worst case is reading a slightly-stale snapshot, which
  // is acceptable for getEntry's use cases (display + hook decisions).
  const data = loadLedger();
  return data.entries[sessionId] || null;
}

export function clearSession(sessionId) {
  return withLedgerLock(() => {
    const data = loadLedger();
    if (data.entries[sessionId]) {
      delete data.entries[sessionId];
      saveLedger(data);
      return true;
    }
    return false;
  });
}

export { MAX_BLOCKS_PER_SESSION };
