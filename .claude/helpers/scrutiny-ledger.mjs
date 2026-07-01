/**
 * scrutiny-ledger — tracks per-session scrutiny status for scrutinize-before-stop hook.
 *
 * Stores entries keyed by stable session id (or transcript path hash).
 * Schema: {
 *   sessionId, recordedAt, blockCount, notes,
 *   selfReviewed,               // existing: human/Claude self-diff review
 *   agentReviewed,              // existing: backward-compat — true if ANY of (codex|claude|opus) reviewed
 *   codexReviewed,              // Codex CLI returned PASS
 *   claudeReviewed,             // 2nd-reviewer Claude agent returned PASS  (was geminiReviewed pre-2026-05-12)
 *   opusReviewed,               // Claude Opus reviewer agent returned PASS
 *   reviews: {                  // per-arm verdicts
 *     codex:  { verdict: "pass"|"fail", blockers, notes, recordedAt },
 *     claude: { ... },
 *     opus:   { ... },
 *   }
 * }
 * Storage: mcp-server/data/state/SCRUTINY_LEDGER.json
 *
 * Multi-reviewer consensus: scrutinize-before-stop requires 3-of-3 arms (codex
 * AND claude AND opus) to release the Stop. The Gemini CLI arm was retired
 * 2026-05-12 and replaced by a second independent Claude reviewer agent — the
 * CLI was flaky (daily-quota / trust-dir env failures) and a fresh-context
 * Claude pass triangulates better against the Opus arm than a 2.5-pro pass did.
 * Strict mode per user election 2026-05-05. Self-review remains orthogonal but
 * is no longer load-bearing for clearance.
 *
 * Backward compat: legacy entries that recorded `geminiReviewed` (and callers
 * that still pass `geminiReviewed` / `geminiDetail` marks) are accepted — the
 * value is mirrored onto `claudeReviewed` / `reviews.claude` on read and write.
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
// Lines emitted by environmental wrappers / shims that show up BEFORE the
// reviewer's actual output. We must skip these so the parser can find the
// real VERDICT line. Adding a new entry is safe — anything that doesn't match
// is treated as a real first line.
//
// Discovered via 3-way scrutiny session 1f96b0f4 (2026-05-05) where Codex's
// Windows .cmd shim emitted Windows `taskkill /T` "SUCCESS: The process with
// PID X has been terminated." on stdout BEFORE Codex's verdict, defaulting
// every Codex review on Windows to FAIL despite empty blocker lists.
const SHIM_NOISE_PATTERNS = [
  /^SUCCESS:\s*The process with PID\b.*has been terminated\.?$/i,  // Windows taskkill /T
  /^INFO:\s*No tasks running\b/i,                                   // Windows tasklist when nothing matched
  /^SUCCESS:\s*Sent termination signal\b/i,                         // Windows taskkill alt format
];

function isShimNoise(line) {
  for (const re of SHIM_NOISE_PATTERNS) {
    if (re.test(line)) return true;
  }
  return false;
}

export function parseVerdictLine(text) {
  if (typeof text !== "string") return { verdict: null, firstLine: "" };
  const firstLine = text
    .split(/\r?\n/)
    .map((l) => l.trim())
    .find((l) => l.length > 0 && !isShimNoise(l)) ?? "";
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
    claudeReviewed: false,
    opusReviewed: false,
    reviews: {},
    blockCount: 0,
    notes: "",
  };
}

// Names that other tooling has used for the "2nd reviewer" arm over time. They
// all map onto the canonical `claudeReviewed` flag / `reviews.claude` detail:
//   geminiReviewed — the original Gemini CLI arm (retired 2026-05-12)
//   opusBReviewed  — a transitional name from scrutiny-3way.mjs's "arm B" rework
const ARM_B_FLAG_ALIASES = ["claudeReviewed", "opusBReviewed", "geminiReviewed"];
const ARM_B_REVIEW_ALIASES = ["claude", "opusB", "gemini"];

/**
 * Bring an entry forward to the current schema:
 *   - any legacy "arm B" flag (`geminiReviewed`, `opusBReviewed`) → `claudeReviewed`
 *   - any legacy "arm B" detail (`reviews.gemini`, `reviews.opusB`) → `reviews.claude`
 * Multiple legacy flags present → OR'd, so a stray `true` is never lost.
 * Mutates and returns `entry`. Safe to call repeatedly. Always leaves
 * `codexReviewed` / `claudeReviewed` / `opusReviewed` as booleans and
 * `reviews` as an object so downstream code never sees `undefined`.
 */
function migrateEntry(entry) {
  if (!entry || typeof entry !== "object") return entry;
  let armB = entry.claudeReviewed === true;
  for (const alias of ["opusBReviewed", "geminiReviewed"]) {
    if (entry[alias] === true) armB = true;
    delete entry[alias];
  }
  entry.claudeReviewed = armB;
  if (typeof entry.codexReviewed !== "boolean") entry.codexReviewed = false;
  if (typeof entry.opusReviewed !== "boolean") entry.opusReviewed = false;
  if (!entry.reviews || typeof entry.reviews !== "object") entry.reviews = {};
  for (const alias of ["opusB", "gemini"]) {
    if (entry.reviews[alias] && !entry.reviews.claude) entry.reviews.claude = entry.reviews[alias];
    delete entry.reviews[alias];
  }
  return entry;
}

/** First `marks[k]` that is a boolean, scanning the alias list in precedence order; else undefined. */
function pickArmBBool(marks) {
  for (const k of ARM_B_FLAG_ALIASES) if (typeof marks[k] === "boolean") return marks[k];
  return undefined;
}
/** First `marks[k+"Detail"]` present, scanning the alias list in precedence order; else undefined. */
function pickArmBDetail(marks) {
  for (const k of ARM_B_REVIEW_ALIASES) {
    const d = marks[`${k}Detail`];
    if (d) return d;
  }
  return undefined;
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
 *   agentReviewed?: boolean,    // legacy alias — sets all three flags off if not paired with arm flags
 *   codexReviewed?: boolean,
 *   claudeReviewed?: boolean,   // 2nd Claude reviewer arm  (canonical)
 *   opusBReviewed?: boolean,    // alias for claudeReviewed (scrutiny-3way.mjs "arm B" naming)
 *   geminiReviewed?: boolean,   // DEPRECATED alias for claudeReviewed (Gemini CLI arm retired 2026-05-12)
 *   opusReviewed?: boolean,
 *   codexDetail?:  { verdict?: "pass"|"fail", blockers?: string, notes?: string },
 *   claudeDetail?: { verdict?: "pass"|"fail", blockers?: string, notes?: string },
 *   opusBDetail?:  { verdict?: "pass"|"fail", blockers?: string, notes?: string },  // alias for claudeDetail
 *   geminiDetail?: { verdict?: "pass"|"fail", blockers?: string, notes?: string },  // DEPRECATED alias for claudeDetail
 *   opusDetail?:   { verdict?: "pass"|"fail", blockers?: string, notes?: string },
 *   notes?: string
 * }} marks
 */
export function recordScrutiny(sessionId, marks = {}) {
  return withLedgerLock(() => {
    const data = loadLedger();
    const entry = migrateEntry(data.entries[sessionId] || makeEmptyEntry(sessionId));

    // Arm PASS/FAIL marks accept BOTH true and false so a later FAIL revokes a
    // prior PASS (Codex blocker #1). Without this, calling `--mark-opus fail`
    // after a prior PASS would leave the boolean true and isCleared() would
    // still return true — violating "ANY reviewer FAIL keeps blocking".
    if (marks.selfReviewed === true) entry.selfReviewed = true;
    if (typeof marks.codexReviewed === "boolean") entry.codexReviewed = marks.codexReviewed;
    if (typeof marks.opusReviewed === "boolean") entry.opusReviewed = marks.opusReviewed;
    // Arm B — accept claudeReviewed | opusBReviewed | geminiReviewed (precedence in that order).
    const armB = pickArmBBool(marks);
    if (typeof armB === "boolean") entry.claudeReviewed = armB;
    // Legacy agent flag — same boolean type-guard as the arms so a FAIL mark on
    // the legacy field also revokes a prior PASS (Gemini blocker #3). Note that
    // lines below derive agentReviewed from the OR of the arms, so this explicit
    // assignment is the FALSE-revocation path; OR-derivation reasserts TRUE if
    // any arm is still PASS.
    if (typeof marks.agentReviewed === "boolean") entry.agentReviewed = marks.agentReviewed;

    if (marks.codexDetail) recordReviewerDetail(entry, "codex", marks.codexDetail);
    if (marks.opusDetail) recordReviewerDetail(entry, "opus", marks.opusDetail);
    const armBDetail = pickArmBDetail(marks);
    if (armBDetail) recordReviewerDetail(entry, "claude", armBDetail);

    // Derived: agentReviewed is the OR of the 3 arms (so legacy callers that
    // read this field still see "true" once any reviewer signs off).
    if (entry.codexReviewed || entry.claudeReviewed || entry.opusReviewed) {
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
 * Returns true when both required review arms (Opus reviewer A holistic + 2nd
 * Claude reviewer B independent) have recorded PASS for the session. Self-review
 * is orthogonal and NOT required for clearance under the strict 2-of-2 policy
 * (reduced from 3-of-3 per user directive 2026-05-20).
 *
 * Arm C (codexReviewed slot — analyst pass) is RETAINED as a backward-compat
 * field but NO LONGER required. Old ledger entries that recorded `codexReviewed`
 * are unaffected; new entries that omit it still clear.
 *
 * Backward compat:
 *   - a legacy entry that recorded `geminiReviewed: true` (pre-2026-05-12)
 *     counts as the Claude arm — the Gemini CLI arm it replaced;
 *   - a pre-3way entry with `agentReviewed: true` and no arm flags counts as
 *     cleared, so prior sessions don't get retroactively blocked.
 */
export function isCleared(sessionId) {
  const data = loadLedger();
  const entry = data.entries[sessionId];
  if (!entry) return false;
  // The Claude (arm-B) leg is satisfied by the canonical flag OR any legacy alias.
  const claudeArmOk = ARM_B_FLAG_ALIASES.some((k) => entry[k] === true);
  // Strict 2-of-2 policy (arm A + arm B). Arm C (codexReviewed) is no longer required.
  if (entry.opusReviewed === true && claudeArmOk) {
    return true;
  }
  // Legacy fallback: pre-3way entries used selfReviewed && agentReviewed and
  // had none of the arm flags. Honor those so existing ledger history doesn't
  // suddenly fail closed.
  const isLegacyEntry =
    entry.codexReviewed !== true &&
    entry.opusReviewed !== true &&
    !ARM_B_FLAG_ALIASES.some((k) => entry[k] === true);
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
  const entry = data.entries[sessionId];
  if (!entry) return null;
  // Return a migrated *copy* so callers see `claudeReviewed` even for legacy
  // entries — without mutating the on-disk ledger (this is the no-lock path).
  return migrateEntry({ ...entry, reviews: { ...(entry.reviews || {}) } });
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
