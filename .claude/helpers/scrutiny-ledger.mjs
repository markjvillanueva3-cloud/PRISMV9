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
const MAX_BLOCKS_PER_SESSION = 3;

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

function loadLedger() {
  const p = ledgerPath();
  if (!fs.existsSync(p)) return { entries: {} };
  try {
    return JSON.parse(fs.readFileSync(p, "utf-8"));
  } catch {
    return { entries: {} };
  }
}

function saveLedger(data) {
  const p = ledgerPath();
  try {
    fs.mkdirSync(path.dirname(p), { recursive: true });
    // Atomic write: tmp + rename. Prevents torn JSON when multiple chats
    // race on the ledger (Gemini FAIL #2). Rename is atomic on the same
    // filesystem on both NTFS and POSIX.
    const tmp = `${p}.tmp.${process.pid}.${Date.now().toString(36)}`;
    fs.writeFileSync(tmp, JSON.stringify(data, null, 2));
    fs.renameSync(tmp, p);
    return true;
  } catch {
    return false;
  }
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
  // Legacy agent flag — only set if no provider flags were passed (callers
  // upgrading scripts can opt out by passing the new flags directly).
  if (marks.agentReviewed === true) entry.agentReviewed = true;

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
  const data = loadLedger();
  const entry = data.entries[sessionId] || {
    sessionId,
    recordedAt: new Date().toISOString(),
    selfReviewed: false,
    agentReviewed: false,
    blockCount: 0,
    notes: "",
  };
  entry.blockCount = (entry.blockCount || 0) + 1;
  entry.recordedAt = new Date().toISOString();
  data.entries[sessionId] = entry;
  saveLedger(data);
  return entry.blockCount;
}

export function getEntry(sessionId) {
  const data = loadLedger();
  return data.entries[sessionId] || null;
}

export function clearSession(sessionId) {
  const data = loadLedger();
  if (data.entries[sessionId]) {
    delete data.entries[sessionId];
    saveLedger(data);
    return true;
  }
  return false;
}

export { MAX_BLOCKS_PER_SESSION };
