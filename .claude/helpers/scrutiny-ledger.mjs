/**
 * scrutiny-ledger — tracks per-session scrutiny status for scrutinize-before-stop hook.
 *
 * Stores entries keyed by stable session id (or transcript path hash).
 * Schema: { sessionId, recordedAt, selfReviewed, agentReviewed, blockCount }
 * Storage: mcp-server/data/state/SCRUTINY_LEDGER.json
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
    fs.writeFileSync(p, JSON.stringify(data, null, 2));
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

/**
 * Record that scrutiny has been completed for a session.
 *
 * @param {string} sessionId
 * @param {{ selfReviewed?: boolean, agentReviewed?: boolean, notes?: string }} marks
 */
export function recordScrutiny(sessionId, marks = {}) {
  const data = loadLedger();
  const entry = data.entries[sessionId] || {
    sessionId,
    recordedAt: new Date().toISOString(),
    selfReviewed: false,
    agentReviewed: false,
    blockCount: 0,
    notes: "",
  };
  if (marks.selfReviewed === true) entry.selfReviewed = true;
  if (marks.agentReviewed === true) entry.agentReviewed = true;
  if (typeof marks.notes === "string") entry.notes = marks.notes.slice(0, 500);
  entry.recordedAt = new Date().toISOString();
  data.entries[sessionId] = entry;
  saveLedger(data);
  return entry;
}

/**
 * Returns true if the session has both self and agent reviews recorded.
 */
export function isCleared(sessionId) {
  const data = loadLedger();
  const entry = data.entries[sessionId];
  if (!entry) return false;
  return entry.selfReviewed === true && entry.agentReviewed === true;
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
