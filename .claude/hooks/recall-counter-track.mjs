#!/usr/bin/env node
// tier: T3
/**
 * recall-counter-track.mjs — PostToolUse hook for Read events on vault files
 *
 * Increments H:/prism/mcp-server/data/state/wiki-recall-counts.json when
 * Claude reads a memory or wiki .md file. Counts are consumed by:
 *   - WikiRecallCounterEngine (canonical reader/writer; this hook follows
 *     the same schema)
 *   - generate-system-viz.mjs (L10 node sizing scales by log10(count+1))
 *   - future: weekly-synthesis (top-N hot entries → review list)
 *
 * Why a separate hook (not a method call into the engine): the engine is
 * compiled TypeScript; the hook needs to fire on every Read in the bash
 * subprocess context with zero MCP-server dependency. The schema is
 * documented in WikiRecallCounterEngine.ts and validated there on read.
 *
 * Schema (mirrors WikiRecallCounterEngine.WikiRecallStateSchema v1.0.0):
 *   { schemaVersion, totalRecalls, entryCount, updatedAtIso, entries: { [key]: { kind, key, count, firstSeenIso, lastSeenIso } } }
 *
 * Disable: env PRISM_RECALL_COUNTER=0
 */

import { readFileSync, writeFileSync, existsSync, mkdirSync, renameSync } from "node:fs";
import { dirname, basename } from "node:path";
import { withExclusiveLock } from "../../scripts/lib/exclusive-file-lock.mjs";

const STATE_FILE = "H:/prism/mcp-server/data/state/wiki-recall-counts.json";
const SCHEMA_VERSION = "1.0.0";
const MEMORY_VAULT_PATTERN = /[\\/]knowledge[\\/]memories[\\/]/i;
const WIKI_VAULT_PATTERN = /[\\/]knowledge[\\/]wiki[\\/]/i;
const SOURCE_MEMORY_PATTERN = /[\\/]\.claude[\\/]projects[\\/][^\\/]*[\\/]memory[\\/]/i;

// 2026-05-26 (U-A12-RECALL-COUNTER-NOISE-SUPPRESS, slot:alpha): the +1 success
// telemetry is pure file-side bookkeeping — the state file write at line 110
// is the durable record. The prompt-context message ("recall-counter: +1
// memory/source/X (count=N)") leaked into 21+ distinct injection entries per
// session (A12 in DORMANT-FEATURES-ENUMERATION-2026-05-26). Default silent;
// errors (could-not-derive-key, write-fail) keep emitting so debug visibility
// stays. Re-enable verbose telemetry: PRISM_RECALL_COUNTER_VERBOSE=1.
const RECALL_VERBOSE = process.env.PRISM_RECALL_COUNTER_VERBOSE === "1";
function emitContinue(msg, kind = "success") {
  const out = { continue: true };
  // Errors always surface (they signal a real issue). Success telemetry only
  // surfaces when explicitly requested.
  const shouldEmit = msg && (kind === "error" || RECALL_VERBOSE);
  if (shouldEmit) out.hookSpecificOutput = { hookEventName: "PostToolUse", additionalContext: `recall-counter: ${msg}` };
  process.stdout.write(JSON.stringify(out));
}

function readStdin() {
  try {
    const buf = readFileSync(0);
    if (buf.length === 0) return null;
    return JSON.parse(buf.toString("utf8"));
  } catch { return null; }
}

function deriveKey(filePath) {
  // Normalize forward slashes
  const norm = filePath.replace(/\\/g, "/");
  // memory vault: H:/prism/knowledge/memories/<category>/<stem>.md
  const memMatch = norm.match(/[\/\\]knowledge[\/\\]memories[\/\\]([^\/\\]+)[\/\\]([^\/\\]+)\.md$/i);
  if (memMatch) return { kind: "memory", key: `memory/${memMatch[1]}/${basename(memMatch[2])}` };
  // wiki vault: H:/prism/knowledge/wiki/<category>/<stem>.md
  const wikiMatch = norm.match(/[\/\\]knowledge[\/\\]wiki[\/\\]([^\/\\]+)[\/\\]([^\/\\]+)\.md$/i);
  if (wikiMatch) return { kind: "wiki", key: `wiki/${wikiMatch[1]}/${basename(wikiMatch[2])}` };
  // Source memory dir (auto-memory): C:/.../memory/<filename>.md → treat as memory/source
  const srcMatch = norm.match(/[\/\\]\.claude[\/\\]projects[\/\\][^\/\\]+[\/\\]memory[\/\\]([^\/\\]+)\.md$/i);
  if (srcMatch) return { kind: "memory", key: `memory/source/${srcMatch[1]}` };
  return null;
}

function loadState() {
  if (!existsSync(STATE_FILE)) {
    return { schemaVersion: SCHEMA_VERSION, totalRecalls: 0, entryCount: 0, updatedAtIso: new Date().toISOString(), entries: {} };
  }
  try {
    const raw = readFileSync(STATE_FILE, "utf8");
    const parsed = JSON.parse(raw);
    if (parsed?.schemaVersion === SCHEMA_VERSION && parsed.entries && typeof parsed.entries === "object") {
      return parsed;
    }
  } catch { /* fall through to fresh */ }
  return { schemaVersion: SCHEMA_VERSION, totalRecalls: 0, entryCount: 0, updatedAtIso: new Date().toISOString(), entries: {} };
}

function writeStateAtomic(state) {
  const dir = dirname(STATE_FILE);
  if (!existsSync(dir)) mkdirSync(dir, { recursive: true });
  const tmp = STATE_FILE + ".tmp";
  writeFileSync(tmp, JSON.stringify(state, null, 2), "utf8");
  renameSync(tmp, STATE_FILE);
}

function main() {
  if (process.env.PRISM_RECALL_COUNTER === "0") return emitContinue(null);
  const input = readStdin();
  if (!input) return emitContinue(null);
  const tool = input.tool_name ?? input.toolName ?? "";
  if (tool !== "Read") return emitContinue(null);
  const filePath = String(input.tool_input?.file_path ?? input.tool_input?.filePath ?? "");
  if (!filePath || !filePath.endsWith(".md")) return emitContinue(null);
  const norm = filePath.replace(/\\/g, "/");
  if (!MEMORY_VAULT_PATTERN.test(norm) && !WIKI_VAULT_PATTERN.test(norm) && !SOURCE_MEMORY_PATTERN.test(norm.replace(/\//g, "\\"))) {
    return emitContinue(null);
  }
  const derived = deriveKey(filePath);
  if (!derived) return emitContinue("could-not-derive-key", "error");

  try {
    // U-OBS-RECALL-COUNTER-SERIALIZE: serialize the read-modify-write under a
    // shared lock so the fleet-concurrent recall writers (26 chats × this Read
    // hook + the Write/Edit hook wiki-recall-on-write) can't lost-update each
    // other. writeStateAtomic (temp+rename) guards CORRUPTION, not lost
    // increments. Same lock path in both hooks = mutual exclusion.
    // ([[reference_recall_counter_concurrency_finding_2026_05_16]])
    const res = withExclusiveLock(STATE_FILE + ".lock", () => {
      const state = loadState();
      const nowIso = new Date().toISOString();
      const existing = state.entries[derived.key];
      const updated = existing
        ? { ...existing, count: existing.count + 1, lastSeenIso: nowIso }
        : { kind: derived.kind, key: derived.key, count: 1, firstSeenIso: nowIso, lastSeenIso: nowIso };
      state.entries[derived.key] = updated;
      state.totalRecalls = (state.totalRecalls ?? 0) + 1;
      state.entryCount = Object.keys(state.entries).length;
      state.updatedAtIso = nowIso;
      writeStateAtomic(state);
      return updated.count;
    });
    // withExclusiveLock returns {ran, value}; ran:false = a live peer held the
    // lock through the full retry window → skip this increment (acceptable: one
    // dropped count beats corruption/crash), surface it as a non-fatal signal.
    if (res.ran) emitContinue(`+1 ${derived.key} (count=${res.value})`);
    else emitContinue(`recall-lock-busy ${derived.key} (increment skipped this tick)`, "error");
  } catch (e) {
    emitContinue(`write-fail (${e?.message ?? e})`, "error");
  }
}

try { main(); } catch (e) {
  process.stderr.write(`recall-counter-track error: ${e?.message ?? e}\n`);
  process.stdout.write(JSON.stringify({ continue: true }));
}
