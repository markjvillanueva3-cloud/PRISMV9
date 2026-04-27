#!/usr/bin/env node
/**
 * wiki-log-on-commit.mjs — PostToolUse hook (Bash tool)
 *
 * After a successful `git commit ...`, append a single audit line to
 * `wiki/log.md` so the wiki has a chronological record of every change
 * touching wiki content.
 *
 * Trigger pattern: command starts with `git commit` AND exit code 0
 * AND the commit message contains either:
 *   - a wiki-relevant scope tag like `KNOWLEDGE-WIKI-MS0`, `WIKI`,
 *     `wiki/`, or `knowledge/`
 *   - touches files under `knowledge/wiki/` (detected from stdout)
 *
 * Log format (matches WikiLogAppenderEngine):
 *   ## [YYYY-MM-DD] op | title | by:claude-{id}
 *
 * Falls back to `{continue: true}` silently on:
 *   - non-Bash tools, non-commit commands, non-zero exit codes
 *   - missing wiki/log.md (never auto-create — only append)
 *   - already-logged commits (idempotent: hash check against last 50 lines)
 */

import fs from "node:fs";
import path from "node:path";

const WIKI_LOG = "H:/prism/knowledge/wiki/log.md";
const MAX_TITLE_CHARS = 120;

function readStdin() {
  try {
    if (process.stdin.isTTY) return "";
    return fs.readFileSync(0, "utf-8");
  } catch { return ""; }
}

function isWikiRelevant(text) {
  if (!text) return false;
  return /knowledge[\\/]wiki|KNOWLEDGE-WIKI-MS\d|\bwiki\/|\bWIKI\b/i.test(text);
}

function main() {
  const cont = () => console.log(JSON.stringify({ continue: true }));

  let input = {};
  try {
    const raw = readStdin();
    if (raw && raw.trim().startsWith("{")) input = JSON.parse(raw);
  } catch { return cont(); }

  const toolName = input.tool_name || input.toolName || "";
  if (toolName !== "Bash") return cont();

  const command = String(input.tool_input?.command || input.toolInput?.command || "");
  if (!/^\s*(?:cd\s+\S+\s*&&\s*)?git\s+commit\b/.test(command)) return cont();

  const exitCode = Number(input.tool_response?.exit_code ?? input.tool_response?.exitCode ?? 0);
  if (exitCode !== 0) return cont();

  const stdout = String(input.tool_response?.stdout || input.tool_response?.output || "");
  const stderr = String(input.tool_response?.stderr || "");
  const haystack = `${command}\n${stdout}\n${stderr}`;
  if (!isWikiRelevant(haystack)) return cont();

  // Extract commit hash + first message line from stdout (git's "[branch hash] subject")
  const m = stdout.match(/\[[^\]]+\s+([0-9a-f]{7,40})\]\s+(.+)/);
  if (!m) return cont();
  const hash = m[1];
  let subject = m[2].trim();
  if (subject.length > MAX_TITLE_CHARS) subject = subject.slice(0, MAX_TITLE_CHARS - 1) + "…";

  if (!fs.existsSync(WIKI_LOG)) return cont();

  // Idempotency: skip if hash already appears in last 5 KB of log
  let prior = "";
  try {
    const fd = fs.openSync(WIKI_LOG, "r");
    const stat = fs.fstatSync(fd);
    const len = Math.min(stat.size, 5120);
    const buf = Buffer.alloc(len);
    fs.readSync(fd, buf, 0, len, Math.max(0, stat.size - len));
    fs.closeSync(fd);
    prior = buf.toString("utf-8");
  } catch { return cont(); }
  if (prior.includes(hash)) return cont();

  const today = new Date().toISOString().slice(0, 10);
  const sessionId = String(input.session_id || "auto").slice(0, 12);
  const line = `## [${today}] commit | ${subject} (${hash.slice(0, 8)}) | by:claude-${sessionId}\n`;

  try {
    fs.appendFileSync(WIKI_LOG, line);
  } catch { /* ignore */ }

  return cont();
}

main();
