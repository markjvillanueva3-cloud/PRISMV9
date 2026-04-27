#!/usr/bin/env node
/**
 * error-block-prewarn — PreToolUse hook.
 *
 * Reads the error-learn ledger and surfaces a warning when the agent is about
 * to repeat a previously-blocked pattern (same tool + file_suffix + content
 * fingerprint or trigger token).
 *
 * Forces the agent to "learn from errors" without auto-blocking — the warning
 * shows the past block's hook, count, and timestamp, prompting a different
 * approach BEFORE the same gate fires again.
 *
 * FIRES ON: PreToolUse (Write|Edit|MultiEdit|Bash)
 * BLOCKING: never — advisory injection only
 */

import { shouldSkipHook as _hp_shouldSkip } from "../helpers/hook-profile.mjs";
import * as fs from "node:fs";
import * as path from "node:path";
import { fileURLToPath } from "node:url";
import { searchSimilar, fileSuffix } from "../helpers/error-learn-store.mjs";

const MAX_WARNINGS = 2;

function readStdinSafe() {
  try {
    if (process.stdin.isTTY) return "";
    return fs.readFileSync(0, "utf-8");
  } catch {
    return "";
  }
}

// Trigger words to extract from current content for fuzzy matching against past blocks
const TRIGGER_TOKENS = [
  "eval", "Function(", "execSync", "spawnSync",
  "secret", "token", "password", "apikey",
  "toBeDefined", "toBeUndefined", "toBeTruthy", "toBeFalsy",
  "expect(true)", "expect(1)", "describe.skip", "it.skip",
  "TODO", "FIXME", "@ts-nocheck", "@ts-ignore",
  "rm -rf", "git push --force", "--no-verify",
];

function extractTriggers(content) {
  if (!content || typeof content !== "string") return [];
  const found = new Set();
  const lower = content.toLowerCase();
  for (const t of TRIGGER_TOKENS) {
    if (lower.includes(t.toLowerCase())) found.add(t);
  }
  return [...found];
}

function formatWarning(matches) {
  const lines = matches.map((m, i) => {
    const ago = relTime(m.latest_ts);
    const where = m.hook_id ? `hook=${m.hook_id}` : `class=${m.error_class}`;
    const what = m.trigger ? ` trigger=${m.trigger}` : "";
    return `  ${i + 1}. ${where}${what} — blocked ${m.count}× (last: ${ago})`;
  });
  return [
    "🧠 Error-learn match: this looks like a pattern that was blocked before:",
    ...lines,
    "  → Review the past block reason before retrying. /error-learn-review for details.",
  ].join("\n");
}

function relTime(iso) {
  const ms = Date.now() - new Date(iso).getTime();
  const min = Math.round(ms / 60000);
  if (min < 60) return `${min}m ago`;
  const hrs = Math.round(min / 60);
  if (hrs < 48) return `${hrs}h ago`;
  return `${Math.round(hrs / 24)}d ago`;
}

async function main() {
  if (_hp_shouldSkip("error-block-prewarn")) {
    console.log(JSON.stringify({ continue: true }));
    return;
  }

  const raw = readStdinSafe();
  if (!raw) {
    console.log(JSON.stringify({ continue: true }));
    return;
  }

  let payload;
  try {
    payload = JSON.parse(raw);
  } catch {
    console.log(JSON.stringify({ continue: true }));
    return;
  }

  const tool = payload.tool_name || payload.toolName || payload.tool || "";
  if (!tool) {
    console.log(JSON.stringify({ continue: true }));
    return;
  }

  const input = payload.tool_input || payload.toolInput || payload.input || {};
  const filePath = input.file_path || input.path || input.filePath || "";
  const content = input.content || input.new_string || input.command || "";
  const suffix = fileSuffix(filePath);
  const triggers = extractTriggers(content);

  // Search for matches: by file_suffix + each trigger token
  const allMatches = [];
  for (const trigger of triggers) {
    const found = searchSimilar({ tool, file_suffix: suffix || undefined, trigger, limit: 1 });
    allMatches.push(...found);
  }
  // Also do a tool+suffix-only match (fingerprint-blind) to catch novel triggers
  if (suffix) {
    allMatches.push(...searchSimilar({ tool, file_suffix: suffix, limit: 1 }));
  }

  // Dedup by hook_id|trigger
  const seen = new Set();
  const unique = [];
  for (const m of allMatches) {
    const key = `${m.hook_id || ""}|${m.trigger || ""}`;
    if (seen.has(key)) continue;
    seen.add(key);
    unique.push(m);
    if (unique.length >= MAX_WARNINGS) break;
  }

  if (unique.length === 0) {
    console.log(JSON.stringify({ continue: true }));
    return;
  }

  console.log(JSON.stringify({
    continue: true,
    hookSpecificOutput: {
      hookEventName: "PreToolUse",
      additionalContext: formatWarning(unique),
    },
  }));
}

const invokedPath = process.argv[1] ? path.resolve(process.argv[1]) : "";
if (invokedPath && path.resolve(fileURLToPath(import.meta.url)) === invokedPath) {
  main().catch(() => {
    console.log(JSON.stringify({ continue: true }));
  });
}

export const metadata = {
  id: "error-block-prewarn",
  event: "PreToolUse",
  matcher: "Write|Edit|MultiEdit|Bash",
  blocking: false,
};
