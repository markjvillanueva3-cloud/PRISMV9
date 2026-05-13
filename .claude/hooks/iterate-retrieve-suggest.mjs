#!/usr/bin/env node
// tier: T1
/**
 * iterate-retrieve-suggest — PreToolUse hook for Agent tool calls.
 *
 * When the Agent tool dispatches a subagent with a fuzzy/broad search query,
 * suggest /iterate-retrieve as a more efficient alternative. Non-blocking hint.
 *
 * Adopted from `everything-claude-code/skills/iterative-retrieval` (MIT, 2026-04-27).
 */

import * as fs from "node:fs";
import * as path from "node:path";
import { fileURLToPath } from "node:url";

const FUZZY_QUERY_MARKERS = [
  /\bhow\s+(does|is|do)\b/i,
  /\bwhere\s+(is|does|do)\b/i,
  /\bwhat\s+(handles?|does)\b/i,
  /\bfind\s+(all|every|the)\b/i,
  /\bsearch\s+(for|across)\b/i,
  /\b(any|some)thing\s+(related|about|for)\b/i,
];

const SUBAGENT_TYPES_THAT_BENEFIT = new Set([
  "Explore",
  "general-purpose",
  "code-archaeologist",
  "scout-explorer",
  "researcher",
]);

function readStdinSafe() {
  try {
    if (process.stdin.isTTY) return "";
    return fs.readFileSync(0, "utf-8");
  } catch {
    return "";
  }
}

function looksFuzzy(prompt) {
  if (!prompt || prompt.length < 20) return false;
  return FUZZY_QUERY_MARKERS.some((re) => re.test(prompt));
}

async function main() {
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
  if (tool !== "Agent" && tool !== "Task") {
    console.log(JSON.stringify({ continue: true }));
    return;
  }

  const input = payload.tool_input || payload.toolInput || payload.input || {};
  const subagentType = input.subagent_type || input.subagentType || "";
  const prompt = String(input.prompt || "");

  if (!SUBAGENT_TYPES_THAT_BENEFIT.has(subagentType)) {
    console.log(JSON.stringify({ continue: true }));
    return;
  }
  if (!looksFuzzy(prompt)) {
    console.log(JSON.stringify({ continue: true }));
    return;
  }

  // Non-blocking suggestion via hookSpecificOutput
  console.log(JSON.stringify({
    continue: true,
    hookSpecificOutput: {
      hookEventName: "PreToolUse",
      additionalContext:
        "💡 Iterative-retrieve suggestion: this looks like a fuzzy search query. " +
        "Consider `/iterate-retrieve <query>` (or prism_ai:iterate_retrieve) for progressive " +
        "context refinement — typically 30-50% fewer false positives than one-shot subagent dispatch. " +
        "Skip this if the subagent will be doing more than just finding files.",
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
  id: "iterate-retrieve-suggest",
  event: "PreToolUse",
  matcher: "Agent|Task",
  blocking: false,
};
