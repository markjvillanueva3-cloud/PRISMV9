#!/usr/bin/env node
// tier: T1
/**
 * json-read-summarizer.mjs — PreToolUse large-JSON preview
 *
 * WHY: State JSONs like roadmap-index.json (240KB), agent-memory.json (150KB),
 * and machine-learning-data.json (150KB) routinely burn 30-60K tokens per read
 * when an agent only needs the shape, counts, or a recent slice.
 *
 * On the FIRST Read of a large .json in a session:
 *   - Load + summarize structure (top-level shape, counts, sample entries)
 *   - Emit permissionDecision "deny" with summary as the reason
 *   - Record the (session, file, mtime) in a dedicated summarizer cache
 *
 * On REPEAT Read of the same file (already summarized):
 *   - Fall through silently — user is intentionally asking for full content.
 *     file-read-cache will dedup any further repeats based on actual read.
 *
 * NEVER intervenes when:
 *   - Not a .json file
 *   - File size < threshold (50KB)
 *   - User passed explicit offset/limit (they already want a slice)
 *   - File is unreadable / JSON parse fails
 *
 * AGI-INFRA Phase B / B1-JSON-SUMM.
 */

import { promises as fs } from "node:fs";
import path from "node:path";
import { createInterface } from "node:readline";

const CACHE_DIR = "H:/prism/.claude/cache";
const CACHE_FILE = `${CACHE_DIR}/json-summarizer-seen.json`;
const TELEMETRY_FILE = `${CACHE_DIR}/hook-telemetry.jsonl`;
const TTL_MS = 2 * 60 * 60 * 1000; // 2h, matches file-read-cache TTL
const SIZE_THRESHOLD = 50 * 1024; // 50KB — below this, raw Read is cheap

async function logTelemetry(event) {
  try {
    await fs.mkdir(CACHE_DIR, { recursive: true });
    await fs.appendFile(TELEMETRY_FILE, JSON.stringify(event) + "\n", "utf8");
  } catch {
    // non-fatal
  }
}

async function readStdin() {
  return new Promise((resolve) => {
    let data = "";
    const rl = createInterface({ input: process.stdin });
    rl.on("line", (line) => { data += line + "\n"; });
    rl.on("close", () => resolve(data));
  });
}

async function loadCache() {
  try {
    const raw = await fs.readFile(CACHE_FILE, "utf8");
    const parsed = JSON.parse(raw);
    return (typeof parsed === "object" && parsed !== null) ? parsed : {};
  } catch {
    return {};
  }
}

async function saveCache(cache) {
  try {
    await fs.mkdir(CACHE_DIR, { recursive: true });
    await fs.writeFile(CACHE_FILE, JSON.stringify(cache, null, 2), "utf8");
  } catch {
    // non-fatal
  }
}

function pruneExpired(cache) {
  const now = Date.now();
  const pruned = {};
  for (const [k, v] of Object.entries(cache)) {
    if (v && typeof v === "object" && typeof v.ts === "number" && now - v.ts < TTL_MS) {
      pruned[k] = v;
    }
  }
  return pruned;
}

function cacheKey(filePath, mtimeMs, sessionId) {
  return `${sessionId ?? "_"}::${filePath}::${mtimeMs}`;
}

function formatBytes(n) {
  if (n < 1024) return `${n}B`;
  if (n < 1024 * 1024) return `${(n / 1024).toFixed(1)}KB`;
  return `${(n / 1024 / 1024).toFixed(2)}MB`;
}

function approxTokens(byteSize) {
  // Rough heuristic: ~4 chars/token for JSON
  return Math.round(byteSize / 4);
}

function summarizeValue(v, depth = 0) {
  if (v === null) return "null";
  const t = typeof v;
  if (t === "string") return v.length > 40 ? `"${v.slice(0, 40)}…" (${v.length} chars)` : `"${v}"`;
  if (t === "number" || t === "boolean") return String(v);
  if (Array.isArray(v)) {
    const n = v.length;
    if (n === 0) return "[]";
    if (depth >= 2) return `[…${n} items]`;
    const sample = v.slice(0, 2).map((x) => summarizeValue(x, depth + 1));
    return `[${n} items: ${sample.join(", ")}${n > 2 ? ", …" : ""}]`;
  }
  if (t === "object") {
    const keys = Object.keys(v);
    if (keys.length === 0) return "{}";
    if (depth >= 2) return `{…${keys.length} keys}`;
    const sampleKeys = keys.slice(0, 6);
    return `{${keys.length} keys: ${sampleKeys.join(", ")}${keys.length > 6 ? ", …" : ""}}`;
  }
  return String(t);
}

function buildSummary(data, byteSize) {
  const tokens = approxTokens(byteSize);
  const header = `[json-summary] size=${formatBytes(byteSize)} ≈${tokens} tokens\n`;
  if (Array.isArray(data)) {
    const lines = [
      header,
      `Shape: array of ${data.length} items`,
    ];
    if (data.length > 0) {
      lines.push(`First item: ${summarizeValue(data[0], 0)}`);
      if (data.length >= 2) lines.push(`Second item: ${summarizeValue(data[1], 0)}`);
      if (data.length >= 3) lines.push(`Last item: ${summarizeValue(data[data.length - 1], 0)}`);
    }
    return lines.join("\n");
  }
  if (data && typeof data === "object") {
    const keys = Object.keys(data);
    const lines = [
      header,
      `Shape: object with ${keys.length} top-level keys`,
      `Keys: ${keys.slice(0, 20).join(", ")}${keys.length > 20 ? `, …(+${keys.length - 20} more)` : ""}`,
      "",
      "Top-level preview:",
    ];
    for (const k of keys.slice(0, 12)) {
      lines.push(`  ${k}: ${summarizeValue(data[k], 0)}`);
    }
    if (keys.length > 12) lines.push(`  … (+${keys.length - 12} more keys)`);
    return lines.join("\n");
  }
  return `${header}Shape: scalar (${typeof data})`;
}

function emitDecision(reason) {
  process.stdout.write(JSON.stringify({
    hookSpecificOutput: {
      hookEventName: "PreToolUse",
      permissionDecision: "deny",
      permissionDecisionReason: reason,
    },
  }));
}

async function main() {
  const raw = await readStdin();
  if (!raw.trim()) process.exit(0);
  let event;
  try { event = JSON.parse(raw); } catch { process.exit(0); }

  if (event.tool_name !== "Read") process.exit(0);
  const input = event.tool_input || {};
  const filePath = input.file_path;
  if (typeof filePath !== "string" || filePath.length === 0) process.exit(0);

  // Only intervene on .json
  if (path.extname(filePath).toLowerCase() !== ".json") process.exit(0);

  // If user wants a slice already, don't interfere
  if (typeof input.offset === "number" || typeof input.limit === "number") process.exit(0);

  let stat;
  try { stat = await fs.stat(filePath); } catch { process.exit(0); }
  if (stat.size < SIZE_THRESHOLD) process.exit(0);

  const sessionId = event.session_id || event.sessionId || process.env.CLAUDE_SESSION_ID;
  const key = cacheKey(filePath, stat.mtimeMs, sessionId);
  const cache = pruneExpired(await loadCache());

  if (cache[key]) {
    // Already summarized this session — let the real Read proceed.
    await logTelemetry({
      ts: new Date().toISOString(),
      hook: "json-read-summarizer",
      event: "fallthrough-already-summarized",
      session_id: sessionId ?? null,
      file: filePath,
    });
    process.exit(0);
  }

  // Load + summarize
  let data;
  try {
    const content = await fs.readFile(filePath, "utf8");
    data = JSON.parse(content);
  } catch {
    // Malformed or unreadable — don't intervene
    process.exit(0);
  }

  const summary = buildSummary(data, stat.size);
  cache[key] = { ts: Date.now(), path: filePath, size: stat.size };
  await saveCache(cache);
  await logTelemetry({
    ts: new Date().toISOString(),
    hook: "json-read-summarizer",
    event: "summarized",
    session_id: sessionId ?? null,
    file: filePath,
    bytes: stat.size,
  });

  emitDecision(
    `${summary}\n\n` +
    `[preview delivered — ${formatBytes(stat.size)} full file NOT loaded to save tokens]\n` +
    `To read specific portion: Read with offset+limit parameters.\n` +
    `To force full read: call Read again (this hook only summarizes first read per session).\n` +
    `To search for specific keys: use Grep with output_mode="content" on this file.`
  );
  process.exit(0);
}

main().catch(() => process.exit(0));
