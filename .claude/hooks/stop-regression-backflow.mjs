#!/usr/bin/env node
// tier: T3
/**
 * stop-regression-backflow.mjs — Boris back-flow pattern (U-VAULT03).
 *
 * On every Stop event, scan the transcript tail for blocked tool calls and
 * is_error tool results. Each unique blocking-pattern detected becomes a
 * "regression candidate" appended to
 *   state/shared/regression-candidates.jsonl
 * which a separate operator (or a future U-VAULT03b cron) reviews before
 * promoting entries into CLAUDE.md ## Recent regressions.
 *
 * Why the two-step (capture → review → promote) instead of direct CLAUDE.md
 * edit:
 *   1. CLAUDE.md is read by every chat on SessionStart — race-prone.
 *   2. Auto-promote-on-detect would have a high false-positive rate (any
 *      one-off block becomes "doctrine"). Operator review filters to the
 *      patterns that recur.
 *   3. The candidates jsonl is append-only + atomic, so 10 concurrent chats
 *      can all write without coordination.
 *
 * Failure mode policy: silent on all errors (Stop convenience, NEVER blocks).
 *
 * Knobs:
 *   PRISM_BACKFLOW_DISABLE=1        — turn off entirely
 *   PRISM_BACKFLOW_TAIL_BYTES=N     — transcript scan window (default 256KB)
 *   PRISM_BACKFLOW_DEDUP_WINDOW=N   — most-recent candidates to dedup against (default 50)
 */

import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";

const TRANSCRIPT_TAIL_BYTES = Number(process.env.PRISM_BACKFLOW_TAIL_BYTES || 256 * 1024);
const DEDUP_WINDOW = Number(process.env.PRISM_BACKFLOW_DEDUP_WINDOW || 50);
const CANDIDATES_FILE = "H:/prism/state/shared/regression-candidates.jsonl";
const REASON_TRUNCATE = 280;
const SILENCE = { continue: true, suppressOutput: true };

function readStdinSync() {
  try {
    if (process.stdin.isTTY) return null;
    const buf = fs.readFileSync(0, "utf-8");
    if (!buf || !buf.trim().startsWith("{")) return null;
    return JSON.parse(buf);
  } catch { return null; }
}

function emit(o) { process.stdout.write(JSON.stringify(o)); }

function readTail(filePath, maxBytes) {
  let fd = -1;
  try {
    fd = fs.openSync(filePath, "r");
    const { size } = fs.fstatSync(fd);
    const start = size > maxBytes ? size - maxBytes : 0;
    const buf = Buffer.allocUnsafe(size - start);
    fs.readSync(fd, buf, 0, buf.length, start);
    return buf.toString("utf-8");
  } catch { return ""; }
  finally { if (fd >= 0) { try { fs.closeSync(fd); } catch {} } }
}

/**
 * Walk transcript tail; for each entry capture:
 *  - hook block decisions: `{"decision":"block","reason":"..."}` inside tool_result
 *  - tool_result with `is_error:true` (these indicate hook/tool failures the chat saw)
 *  - human-facing error markers: ERR_, FAIL, "Cannot find", "EACCES", "ENOENT", "EBUSY"
 * Returns array of candidate {kind, reason, source, timestamp}.
 */
function scanForRegressions(text) {
  if (!text) return [];
  const found = [];
  const lines = text.split("\n");
  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed) continue;
    let entry;
    try { entry = JSON.parse(trimmed); } catch { continue; }
    const ts = entry.timestamp || entry.message?.timestamp || null;

    // Block-decision: search tool_result content for decision:"block"
    const content = entry?.message?.content;
    if (Array.isArray(content)) {
      for (const block of content) {
        if (block?.type !== "tool_result") continue;
        const text = typeof block.content === "string"
          ? block.content
          : Array.isArray(block.content)
            ? block.content.map(c => typeof c === "string" ? c : (c?.text || "")).join("\n")
            : "";
        if (!text) continue;

        // Hook block detection
        const blockMatch = text.match(/"decision"\s*:\s*"block"[^}]{0,400}/);
        if (blockMatch) {
          const reasonMatch = text.match(/"reason"\s*:\s*"([^"]{1,500})"/);
          found.push({
            kind: "hook_block",
            reason: (reasonMatch ? reasonMatch[1] : blockMatch[0]).slice(0, REASON_TRUNCATE),
            source: "tool_result",
            timestamp: ts,
          });
        }

        // is_error: true tool results
        if (block.is_error === true) {
          found.push({
            kind: "tool_error",
            reason: text.slice(0, REASON_TRUNCATE),
            source: "tool_result",
            timestamp: ts,
          });
        }

        // Error markers in plain text (only count once per tool result)
        const errSig = text.match(/(ENOENT|EACCES|EBUSY|ECONNREFUSED|FAIL(?:URE|ED)?|TypeError|ReferenceError|SyntaxError|cannot find|module not found|permission denied)/i);
        if (errSig && !blockMatch && !block.is_error) {
          // Take the line containing the marker (first 280 chars)
          const idx = text.indexOf(errSig[0]);
          const start = Math.max(0, idx - 60);
          const snippet = text.slice(start, start + REASON_TRUNCATE);
          found.push({
            kind: "error_signature",
            reason: snippet,
            source: "tool_result",
            timestamp: ts,
          });
        }
      }
    }
  }
  return found;
}

function loadRecentCandidates(n) {
  try {
    if (!fs.existsSync(CANDIDATES_FILE)) return [];
    const raw = fs.readFileSync(CANDIDATES_FILE, "utf-8");
    const lines = raw.split("\n").filter(l => l.trim());
    const tail = lines.slice(-n);
    const out = [];
    for (const l of tail) {
      try { out.push(JSON.parse(l)); } catch {}
    }
    return out;
  } catch { return []; }
}

function hashReason(reason, kind) {
  return crypto.createHash("sha256").update(kind + "::" + reason).digest("hex").slice(0, 16);
}

function appendCandidates(candidates) {
  if (candidates.length === 0) return 0;
  try {
    const dir = path.dirname(CANDIDATES_FILE);
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    const buf = candidates.map(c => JSON.stringify(c)).join("\n") + "\n";
    fs.appendFileSync(CANDIDATES_FILE, buf);
    return candidates.length;
  } catch { return 0; }
}

function main() {
  if (process.env.PRISM_BACKFLOW_DISABLE === "1") { emit(SILENCE); return; }

  const stdin = readStdinSync() || {};
  const sid = stdin.session_id || "global";
  const transcriptPath = stdin.transcript_path;
  if (!transcriptPath) { emit(SILENCE); return; }

  const text = readTail(transcriptPath, TRANSCRIPT_TAIL_BYTES);
  if (!text) { emit(SILENCE); return; }

  const candidates = scanForRegressions(text);
  if (candidates.length === 0) { emit(SILENCE); return; }

  // Dedup against recent candidates (per-hash)
  const recent = loadRecentCandidates(DEDUP_WINDOW);
  const recentHashes = new Set(recent.map(c => c.hash));
  const fresh = [];
  const seen = new Set(recentHashes);
  for (const c of candidates) {
    const hash = hashReason(c.reason, c.kind);
    if (seen.has(hash)) continue;
    seen.add(hash);
    fresh.push({
      ...c,
      hash,
      session_id: sid,
      captured_at: new Date().toISOString(),
    });
  }

  if (fresh.length === 0) { emit(SILENCE); return; }

  const wrote = appendCandidates(fresh);
  if (wrote === 0) { emit(SILENCE); return; }

  // Bucket by kind for the advisory
  const counts = { hook_block: 0, tool_error: 0, error_signature: 0 };
  for (const c of fresh) counts[c.kind] = (counts[c.kind] || 0) + 1;
  const bucketSummary = Object.entries(counts)
    .filter(([, n]) => n > 0)
    .map(([k, n]) => `${n} ${k.replace(/_/g, "-")}`)
    .join(", ");

  emit({
    continue: true,
    hookSpecificOutput: {
      hookEventName: "Stop",
      additionalContext: [
        `## 🔁 ${fresh.length} new regression candidate(s) captured`,
        ``,
        `Detected this session (${bucketSummary}). Appended to: ${CANDIDATES_FILE}`,
        ``,
        `Operator review:`,
        `  • Inspect: \`Get-Content '${CANDIDATES_FILE}' -Tail 20 | ConvertFrom-Json\``,
        `  • Promote a candidate to CLAUDE.md ## Recent regressions when the pattern recurs across 3+ sessions`,
        `  • Stale entries (>30d) prunable via a future cron`,
        ``,
        `Disable: \`PRISM_BACKFLOW_DISABLE=1\``,
      ].join("\n"),
    },
  });
}

try { main(); } catch { emit(SILENCE); }
