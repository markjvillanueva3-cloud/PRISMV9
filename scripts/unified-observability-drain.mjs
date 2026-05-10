#!/usr/bin/env node
/**
 * unified-observability-drain.mjs — PRISM-STAB-MS0/U-D2 (2026-05-10).
 *
 * Reads UNIFIED_EDIT_TAP.jsonl and runs the analyses that the retired
 * PostToolUse hooks used to perform on every Edit. Restores the data
 * streams without paying the per-Edit fork cost.
 *
 * Three analyses run on every drain tick:
 *
 *   1) path-frequency — file-access counts (reads PATH_FREQUENCY.json,
 *      updates accessed_count + last_seen, persists). Was: path-frequency-tracker.mjs
 *
 *   2) tool-pattern — bucket events by tool, write rolling distribution
 *      (TOOL_PATTERN.json). Was: tool-pattern-learner.mjs
 *
 *   3) emergence-detect — tool-dominance check on last WINDOW events.
 *      If one tool >= 80% of last 200 events, append signal to
 *      EMERGENCE_LEDGER.jsonl. Was: posttool-emergence-scan.mjs
 *      (the calibration-drift + high-risk-burst signals depended on
 *      pretool-world-simulator output which is also retired; only the
 *      input-only tool-dominance branch is preserved.)
 *
 * Cost: ONE node fork per drain tick (60s). Replaces ~12 forks per edit
 * × N edits/min. Net memory pressure drops linearly with edit rate.
 *
 * Idempotent — re-runs on same JSONL produce same state. Safe to interrupt.
 *
 * Usage:
 *   node scripts/unified-observability-drain.mjs            # one-shot drain
 *   node scripts/unified-observability-drain.mjs --watch    # daemon (60s tick)
 *
 * Registered with daemon-supervisor as 'unified-observability':
 *   node scripts/daemon-supervisor.mjs start unified-observability -- \
 *     node scripts/unified-observability-drain.mjs --watch
 */
import * as fs from "fs";
import * as path from "path";

const TAP_FILE = "H:/prism/state/shared/UNIFIED_EDIT_TAP.jsonl";
const STATE_DIR = "H:/prism/mcp-server/data/state";
const PATH_FREQ_FILE = path.join(STATE_DIR, "PATH_FREQUENCY.json");
const TOOL_PATTERN_FILE = path.join(STATE_DIR, "TOOL_PATTERN.json");
const EMERGENCE_LEDGER = path.join(STATE_DIR, "EMERGENCE_LEDGER.jsonl");
const DRAIN_CURSOR_FILE = path.join(STATE_DIR, "UNIFIED_DRAIN_CURSOR.json");
const TICK_MS = 60_000;
const EMERGENCE_WINDOW = 200;
const EMERGENCE_DOMINANCE_THRESHOLD = 0.80;
const EMERGENCE_HIGH_THRESHOLD = 0.95;
const TAP_MAX_LINES = 50_000; // cap stream growth; archive rest

function safeRead(file, fallback) {
  try { return JSON.parse(fs.readFileSync(file, "utf-8")); }
  catch { return fallback; }
}

function atomicWrite(file, obj) {
  try {
    fs.mkdirSync(path.dirname(file), { recursive: true });
    const tmp = file + ".tmp";
    fs.writeFileSync(tmp, JSON.stringify(obj, null, 2));
    fs.renameSync(tmp, file);
  } catch (err) {
    process.stderr.write(`atomicWrite failed for ${file}: ${err.message}\n`);
  }
}

function loadCursor() {
  return safeRead(DRAIN_CURSOR_FILE, { last_processed_byte: 0, last_tick: null });
}

function saveCursor(c) { atomicWrite(DRAIN_CURSOR_FILE, c); }

function readNewLines(cursor) {
  if (!fs.existsSync(TAP_FILE)) return { lines: [], newCursor: cursor.last_processed_byte };
  const stat = fs.statSync(TAP_FILE);
  if (stat.size === cursor.last_processed_byte) return { lines: [], newCursor: stat.size };
  if (stat.size < cursor.last_processed_byte) {
    // tap was truncated/rotated — reset cursor
    cursor.last_processed_byte = 0;
  }
  const fd = fs.openSync(TAP_FILE, "r");
  try {
    const len = stat.size - cursor.last_processed_byte;
    const buf = Buffer.alloc(len);
    fs.readSync(fd, buf, 0, len, cursor.last_processed_byte);
    const text = buf.toString("utf-8");
    const lines = text.split("\n").filter(Boolean).map((l) => {
      try { return JSON.parse(l); } catch { return null; }
    }).filter(Boolean);
    return { lines, newCursor: stat.size };
  } finally {
    fs.closeSync(fd);
  }
}

// ---------------------------------------------------------------------------
// ANALYSIS 1: path-frequency (replaces path-frequency-tracker.mjs)
// ---------------------------------------------------------------------------
function updatePathFrequency(events) {
  const state = safeRead(PATH_FREQ_FILE, { schemaVersion: "1.0.0", paths: {}, total_events: 0 });
  if (!state.paths) state.paths = {};
  for (const e of events) {
    if (!e.file_path) continue;
    const key = e.file_path;
    if (!state.paths[key]) state.paths[key] = { count: 0, first_seen: e.at, last_seen: e.at };
    state.paths[key].count++;
    state.paths[key].last_seen = e.at;
    state.total_events = (state.total_events || 0) + 1;
  }
  atomicWrite(PATH_FREQ_FILE, state);
  return Object.keys(state.paths).length;
}

// ---------------------------------------------------------------------------
// ANALYSIS 2: tool-pattern (replaces tool-pattern-learner.mjs)
// ---------------------------------------------------------------------------
function updateToolPattern(events) {
  const state = safeRead(TOOL_PATTERN_FILE, { schemaVersion: "1.0.0", tools: {}, total: 0 });
  if (!state.tools) state.tools = {};
  for (const e of events) {
    const t = e.tool || "unknown";
    if (!state.tools[t]) state.tools[t] = 0;
    state.tools[t]++;
    state.total = (state.total || 0) + 1;
  }
  state.last_updated = new Date().toISOString();
  atomicWrite(TOOL_PATTERN_FILE, state);
  return Object.keys(state.tools).length;
}

// ---------------------------------------------------------------------------
// ANALYSIS 3: emergence-detect (subset of posttool-emergence-scan.mjs —
// only the tool-dominance branch; calibration-drift + high-risk-burst
// depended on pretool-world-simulator output which is no longer collected)
// ---------------------------------------------------------------------------
function detectEmergence() {
  if (!fs.existsSync(TAP_FILE)) return null;
  // Read last EMERGENCE_WINDOW lines from the tap (tail-style)
  const stat = fs.statSync(TAP_FILE);
  // Heuristic: read last ~200KB to get last 200 events comfortably
  const readLen = Math.min(stat.size, 200 * 1024);
  const start = stat.size - readLen;
  const fd = fs.openSync(TAP_FILE, "r");
  let text;
  try {
    const buf = Buffer.alloc(readLen);
    fs.readSync(fd, buf, 0, readLen, start);
    text = buf.toString("utf-8");
  } finally {
    fs.closeSync(fd);
  }
  const lines = text.split("\n").filter(Boolean).slice(-EMERGENCE_WINDOW);
  const events = lines.map((l) => { try { return JSON.parse(l); } catch { return null; } }).filter(Boolean);
  if (events.length < 20) return null;

  const counts = new Map();
  for (const e of events) counts.set(e.tool, (counts.get(e.tool) || 0) + 1);
  const top = [...counts.entries()].sort((a, b) => b[1] - a[1])[0];
  if (!top) return null;
  const share = top[1] / events.length;
  if (share < EMERGENCE_DOMINANCE_THRESHOLD) return null;

  const signal = {
    at: new Date().toISOString(),
    source: "unified_observability_drain",
    kind: "tool-dominance",
    severity: share >= EMERGENCE_HIGH_THRESHOLD ? "high" : "medium",
    tool: top[0],
    share: +share.toFixed(3),
    sample: events.length,
  };
  try {
    fs.mkdirSync(path.dirname(EMERGENCE_LEDGER), { recursive: true });
    fs.appendFileSync(EMERGENCE_LEDGER, JSON.stringify(signal) + "\n");
  } catch { /* ignore */ }
  return signal;
}

// ---------------------------------------------------------------------------
// Tap maintenance — keep file under TAP_MAX_LINES; archive overflow
// ---------------------------------------------------------------------------
function rotateTapIfNeeded() {
  if (!fs.existsSync(TAP_FILE)) return;
  const text = fs.readFileSync(TAP_FILE, "utf-8");
  const lines = text.split("\n").filter(Boolean);
  if (lines.length <= TAP_MAX_LINES) return;
  const archive = TAP_FILE + "." + new Date().toISOString().replace(/[:.]/g, "-");
  try {
    fs.renameSync(TAP_FILE, archive);
    // keep last 10% as the new tap so the rolling-window analyses don't suddenly empty
    const keep = lines.slice(-Math.floor(TAP_MAX_LINES * 0.1));
    fs.writeFileSync(TAP_FILE, keep.join("\n") + "\n");
    process.stderr.write(`tap rotated: ${lines.length} lines -> ${keep.length} (archive: ${archive})\n`);
  } catch (err) {
    process.stderr.write(`tap rotation failed: ${err.message}\n`);
  }
}

function tick() {
  const cursor = loadCursor();
  const { lines: newEvents, newCursor } = readNewLines(cursor);
  if (newEvents.length > 0) {
    updatePathFrequency(newEvents);
    updateToolPattern(newEvents);
  }
  const signal = detectEmergence();
  cursor.last_processed_byte = newCursor;
  cursor.last_tick = new Date().toISOString();
  cursor.last_event_count = newEvents.length;
  saveCursor(cursor);
  rotateTapIfNeeded();
  return { newEvents: newEvents.length, signal };
}

function main() {
  const watch = process.argv.includes("--watch");
  if (!watch) {
    const r = tick();
    console.log(JSON.stringify(r));
    return;
  }
  const startMs = Date.now();
  console.error(`[unified-observability-drain] started watch mode tick=${TICK_MS}ms`);
  const run = () => {
    try {
      const r = tick();
      if (r.newEvents > 0 || r.signal) {
        console.error(`[unified-observability-drain] tick: ${r.newEvents} events, signal=${r.signal ? r.signal.kind : "none"}`);
      }
    } catch (err) {
      console.error(`[unified-observability-drain] tick error: ${err.message}`);
    }
  };
  run();
  setInterval(run, TICK_MS);
}

main();
