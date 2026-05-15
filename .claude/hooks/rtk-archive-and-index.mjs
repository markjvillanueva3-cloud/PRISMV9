#!/usr/bin/env node
// tier: T4
/**
 * rtk-archive-and-index.mjs — RTK ↔ Obsidian ↔ /system-viz linkage.
 *
 * PostToolUse:Bash hook. When a Bash command starts with `rtk ` (or `rtk\t`),
 * archive the filtered output to `state/shared/rtk-archive.jsonl` so the
 * savings compound across the 10-chat fleet:
 *
 *   - Same `rtk git diff` run by 3 chats → 3 hits, only ONE got archived
 *     first; subsequent chats can grep the archive instead of re-running.
 *   - RTK's filtered output is small (60-99% reduction); archiving is cheap.
 *   - Obsidian recall: the archive jsonl is mirrored to the vault for
 *     cross-session retrieval (Qdrant when connected, BM25 otherwise).
 *   - /system-viz `fleet/rtk-savings` subgroup renders cumulative reduction.
 *
 * Failure mode policy: silent on all errors. NEVER blocks tool output. Stop
 * convenience.
 *
 * Knobs:
 *   PRISM_RTK_ARCHIVE_DISABLE=1     — turn off archiving
 *   PRISM_RTK_ARCHIVE_MAX_BYTES=N   — per-entry output truncation (default 4KB)
 *   PRISM_RTK_ARCHIVE_FILE=<path>   — override archive location
 */

import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";

const ARCHIVE_FILE = process.env.PRISM_RTK_ARCHIVE_FILE
  || "H:/prism/state/shared/rtk-archive.jsonl";
const MAX_OUTPUT_BYTES = Number(process.env.PRISM_RTK_ARCHIVE_MAX_BYTES || 4 * 1024);
const MAX_COMMAND_BYTES = 512;
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

function isRtkCommand(cmd) {
  if (typeof cmd !== "string") return false;
  // Matches `rtk ` at start, OR `rtk<tab>`, OR after a `&& ` chain
  return /(^|&&\s*)rtk\s+\S/.test(cmd.trim());
}

function truncate(s, max) {
  if (typeof s !== "string") return "";
  if (s.length <= max) return s;
  return s.slice(0, max) + `\n[...truncated, full length=${s.length}]`;
}

/**
 * Estimate token-savings of RTK output. Compares the actual output length
 * against a synthetic "raw" baseline by counting nonblank lines. This is
 * advisory — true savings need the unfiltered output which we don't have.
 * Returns null when no signal.
 */
function estimateSavings(output) {
  if (!output) return null;
  const lines = output.split("\n").filter(l => l.trim()).length;
  // RTK typical signal: filtered output has <20 lines for commands that
  // emit hundreds. Below 20 → likely high savings, mark as such.
  if (lines < 20) return { likelyHigh: true, lines };
  return { likelyHigh: false, lines };
}

function archive(entry) {
  try {
    const dir = path.dirname(ARCHIVE_FILE);
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    fs.appendFileSync(ARCHIVE_FILE, JSON.stringify(entry) + "\n");
    return true;
  } catch { return false; }
}

function main() {
  if (process.env.PRISM_RTK_ARCHIVE_DISABLE === "1") { emit(SILENCE); return; }

  const stdin = readStdinSync() || {};
  // PostToolUse stdin shape: { tool_name, tool_input, tool_response, ... }
  if (stdin.tool_name !== "Bash") { emit(SILENCE); return; }

  const cmd = stdin?.tool_input?.command;
  if (!isRtkCommand(cmd)) { emit(SILENCE); return; }

  const output = (stdin?.tool_response?.stdout || "") + (stdin?.tool_response?.stderr || "");
  const description = stdin?.tool_input?.description || "";

  const savings = estimateSavings(output);
  const cmdHash = crypto.createHash("sha256").update(cmd).digest("hex").slice(0, 12);
  const entry = {
    captured_at: new Date().toISOString(),
    session_id: stdin.session_id || "global",
    cmd_hash: cmdHash,
    command: truncate(cmd, MAX_COMMAND_BYTES),
    description: truncate(description, 200),
    output: truncate(output, MAX_OUTPUT_BYTES),
    savings,
    cwd: stdin?.cwd || null,
  };
  archive(entry);
  emit(SILENCE);
}

try { main(); } catch { emit(SILENCE); }
