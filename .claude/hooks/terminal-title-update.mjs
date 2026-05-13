#!/usr/bin/env node
// tier: T4
/**
 * terminal-title-update.mjs — Auto-update terminal title with current task
 *
 * Hook type: UserPromptSubmit
 * Sets terminal title to show: session ID + summary of current work
 *
 * Makes it easy to identify which terminal is doing what when multiple
 * Claude sessions are running.
 */
import fs from "node:fs";
import path from "node:path";

function readStdinSafe() {
  try {
    if (process.stdin.isTTY) return "";
    return fs.readFileSync(0, "utf-8");
  } catch {
    return "";
  }
}

const SESSION_ID_FILE = "H:/prism/.claude/cache/stable-session-id.txt";
const MAX_TITLE_LEN = 60;

function getSessionId() {
  try {
    if (fs.existsSync(SESSION_ID_FILE)) {
      const id = fs.readFileSync(SESSION_ID_FILE, "utf8").trim();
      return id.slice(0, 8);
    }
  } catch { /* ignore */ }
  return process.env.CLAUDE_SESSION_ID?.slice(0, 8) || "claude";
}

function extractTaskSummary(prompt) {
  if (!prompt || prompt.length < 3) return null;

  const lines = prompt.split("\n").filter(l => l.trim());
  const firstLine = lines[0] || "";

  if (firstLine.startsWith("/")) {
    return firstLine.slice(0, 30);
  }

  const keywords = [
    "fix", "add", "create", "build", "update", "refactor", "test", "debug",
    "implement", "wire", "hook", "engine", "dispatcher", "commit", "push"
  ];

  const lower = firstLine.toLowerCase();
  for (const kw of keywords) {
    if (lower.includes(kw)) {
      const words = firstLine.split(/\s+/).slice(0, 6).join(" ");
      return words.length > 40 ? words.slice(0, 37) + "..." : words;
    }
  }

  const words = firstLine.split(/\s+/).slice(0, 5).join(" ");
  return words.length > 35 ? words.slice(0, 32) + "..." : words;
}

function setTerminalTitle(title) {
  const safe = title.replace(/[^\x20-\x7E]/g, "").slice(0, MAX_TITLE_LEN);
  process.stderr.write(`\x1b]0;${safe}\x07`);
}

async function main() {
  const input = readStdinSafe();
  let payload;
  try {
    payload = JSON.parse(input);
  } catch {
    process.stdout.write(JSON.stringify({ continue: true }));
    return;
  }

  const prompt = payload?.prompt || payload?.user_prompt || "";
  const sessionId = getSessionId();
  const taskSummary = extractTaskSummary(prompt);

  const title = taskSummary
    ? `${sessionId}: ${taskSummary}`
    : `${sessionId}: PRISM`;

  setTerminalTitle(title);

  process.stdout.write(JSON.stringify({ continue: true }));
}

main().catch(() => {
  process.stdout.write(JSON.stringify({ continue: true }));
});
