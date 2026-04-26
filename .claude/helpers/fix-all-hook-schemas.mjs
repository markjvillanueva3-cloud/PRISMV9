#!/usr/bin/env node
/**
 * fix-all-hook-schemas.mjs — Batch fix all hooks with wrong output schema
 *
 * Claude Code schema rules:
 * - Stop, SessionStart, PreCompact: use {continue: true, systemMessage: "..."}
 * - PreToolUse, PostToolUse, UserPromptSubmit, PostToolBatch: use hookSpecificOutput
 */
import fs from "node:fs";
import path from "node:path";

const HOOKS_DIR = "H:\\prism\\.claude\\hooks";
const HELPERS_DIR = "H:\\prism\\.claude\\helpers";

// Events that must use systemMessage instead of hookSpecificOutput
const SYSTEM_MESSAGE_EVENTS = new Set(["Stop", "SessionStart", "PreCompact"]);

function fixFile(filePath) {
  const content = fs.readFileSync(filePath, "utf8");
  let fixed = content;
  let changes = 0;

  // Pattern 1: hookSpecificOutput: { hookEventName: "SessionStart|Stop|PreCompact", additionalContext: ... }
  // → systemMessage: ...
  for (const event of SYSTEM_MESSAGE_EVENTS) {
    // Match JSON.stringify({ continue: true, hookSpecificOutput: { hookEventName: "Event", additionalContext: X } })
    const pattern1 = new RegExp(
      `(JSON\\.stringify\\(\\s*\\{[^}]*continue:\\s*true,?\\s*)hookSpecificOutput:\\s*\\{\\s*hookEventName:\\s*["']${event}["'],?\\s*additionalContext:\\s*([^}]+)\\s*\\}`,
      "g"
    );
    const before1 = fixed;
    fixed = fixed.replace(pattern1, (match, prefix, ctx) => {
      changes++;
      return `${prefix}systemMessage: ${ctx.trim().replace(/,\s*$/, "")}`;
    });
    if (fixed !== before1) continue;

    // Match { continue: true, hookSpecificOutput: { hookEventName: "Event", additionalContext: X } }
    const pattern2 = new RegExp(
      `(\\{[^}]*continue:\\s*true,?\\s*)hookSpecificOutput:\\s*\\{\\s*hookEventName:\\s*["']${event}["'],?\\s*additionalContext:\\s*([^}]+)\\s*\\}`,
      "g"
    );
    fixed = fixed.replace(pattern2, (match, prefix, ctx) => {
      changes++;
      return `${prefix}systemMessage: ${ctx.trim().replace(/,\s*$/, "")}`;
    });
  }

  if (changes > 0) {
    fs.writeFileSync(filePath, fixed);
    return changes;
  }
  return 0;
}

function processDirectory(dir) {
  const results = [];
  const files = fs.readdirSync(dir, { withFileTypes: true });

  for (const file of files) {
    if (file.isDirectory()) continue;
    if (!file.name.endsWith(".mjs") && !file.name.endsWith(".js")) continue;
    if (file.name.includes(".disabled")) continue;

    const filePath = path.join(dir, file.name);
    try {
      const changes = fixFile(filePath);
      if (changes > 0) {
        results.push({ file: file.name, changes });
      }
    } catch (err) {
      results.push({ file: file.name, error: err.message });
    }
  }
  return results;
}

const hookResults = processDirectory(HOOKS_DIR);
const helperResults = processDirectory(HELPERS_DIR);

console.log("=== Hook Schema Fixes ===");
console.log("Hooks:", hookResults.length > 0 ? hookResults : "No changes needed");
console.log("Helpers:", helperResults.length > 0 ? helperResults : "No changes needed");
console.log("Total files fixed:", hookResults.filter(r => r.changes).length + helperResults.filter(r => r.changes).length);
