#!/usr/bin/env node
/**
 * validate-hook-outputs.mjs
 * Spawn every hook registered in settings.json with sample stdin and check
 * the stdout is either empty OR legal Claude Code hook JSON.
 *
 * Bad patterns we detect:
 *   - Non-JSON text on stdout (corrupts harness)
 *   - JSON with unknown top-level keys (schema rejects)
 *   - JSON with hookSpecificOutput but no hookEventName (schema rejects)
 *   - JSON with hookEventName not in legal enum
 *
 * Empty stdout IS legal (hook declined to emit).
 *
 * Usage: node validate-hook-outputs.mjs [<hook-name-regex>]
 */
import { readFileSync, existsSync } from "node:fs";
import { spawnSync } from "node:child_process";

const NODE = "H:/.claude/bin/portable-node.cmd";
const TIMEOUT_MS = 12000;

const SETTINGS = JSON.parse(readFileSync("H:/.claude/settings.json", "utf8"));

const LEGAL_TOP_KEYS = new Set([
  "continue", "stopReason", "hookSpecificOutput",
  "decision", "reason", "suppressOutput", "systemMessage",
]);

const LEGAL_EVENT_NAMES = new Set([
  "PreToolUse", "PostToolUse", "UserPromptSubmit",
  "SessionStart", "PreCompact", "Stop", "SessionEnd", "Notification",
]);

const EVENT_SAMPLES = {
  UserPromptSubmit: { prompt: "continue the roadmap build" },
  PreCompact: { trigger: "manual" },
  SessionStart: { event: "SessionStart" },
  Stop: {},
};

const TOOL_SAMPLES = {
  Bash: { tool_name: "Bash", tool_input: { command: "ls -la" } },
  Read: { tool_name: "Read", tool_input: { file_path: "H:/prism/CLAUDE.md" } },
  Edit: { tool_name: "Edit", tool_input: { file_path: "/tmp/x.ts", old_string: "a", new_string: "b" } },
  Write: { tool_name: "Write", tool_input: { file_path: "/tmp/x.ts", content: "x = 1;" } },
  MultiEdit: { tool_name: "MultiEdit", tool_input: { file_path: "/tmp/x.ts", edits: [] } },
  Grep: { tool_name: "Grep", tool_input: { pattern: "foo" } },
  Glob: { tool_name: "Glob", tool_input: { pattern: "**/*.ts" } },
  Agent: { tool_name: "Agent", tool_input: { subagent_type: "general-purpose", prompt: "x" } },
  Task: { tool_name: "Task", tool_input: { subagent_type: "general-purpose", prompt: "x" } },
};

function parseCommand(cmd) {
  const m = cmd.match(/[^"'\s]*portable-node[^"'\s]*["']?\s+(.+?)(?:\s+--|\s*$)/i);
  if (!m) return null;
  return m[1].replace(/^["']|["']$/g, "").trim();
}

function extractHookName(fullPath) {
  const m = fullPath.match(/([^/\\]+?)\.mjs$/);
  return m ? m[1] : fullPath;
}

function validateStdout(raw) {
  if (!raw || !raw.trim()) return { ok: true, empty: true };
  let obj;
  try { obj = JSON.parse(raw); }
  catch { return { ok: false, reason: `not-json: ${raw.slice(0, 80)}` }; }
  if (obj === null || typeof obj !== "object" || Array.isArray(obj)) {
    return { ok: false, reason: `not-object: ${typeof obj}` };
  }
  for (const k of Object.keys(obj)) {
    if (!LEGAL_TOP_KEYS.has(k)) {
      return { ok: false, reason: `illegal-key: ${k}` };
    }
  }
  if ("hookSpecificOutput" in obj) {
    const h = obj.hookSpecificOutput;
    if (!h || typeof h !== "object") return { ok: false, reason: "hso-not-object" };
    if (!h.hookEventName) return { ok: false, reason: "hso-missing-event-name" };
    if (!LEGAL_EVENT_NAMES.has(h.hookEventName)) {
      return { ok: false, reason: `illegal-event-name: ${h.hookEventName}` };
    }
  }
  // Claude Code expects `continue` to be emitted if no decision was made.
  // A hook emitting JSON with only hookSpecificOutput and NO continue OR decision
  // reportedly fails schema validation in some harness versions.
  if (!("continue" in obj) && !("decision" in obj)) {
    return { ok: false, reason: "missing-continue-or-decision" };
  }
  return { ok: true };
}

function sampleForEvent(eventName, matcher) {
  if (eventName === "PreToolUse" || eventName === "PostToolUse") {
    // Pick a tool from the matcher regex
    const tools = Object.keys(TOOL_SAMPLES);
    for (const t of tools) {
      const re = new RegExp(matcher || ".*");
      if (re.test(t)) return TOOL_SAMPLES[t];
    }
    return TOOL_SAMPLES.Bash;
  }
  return EVENT_SAMPLES[eventName] || {};
}

function runOne(hookPath, sample) {
  if (!existsSync(hookPath)) return { ok: false, reason: "not-found" };
  const r = spawnSync(NODE, [hookPath], {
    input: JSON.stringify(sample),
    encoding: "utf8",
    timeout: TIMEOUT_MS,
    windowsHide: true,
    shell: process.platform === "win32",
  });
  if (r.error) return { ok: false, reason: `spawn-error: ${r.error.code || r.error.message}` };
  if (r.status === null) return { ok: false, reason: "timeout" };
  const v = validateStdout(r.stdout || "");
  return { ...v, exitCode: r.status, stdoutLen: (r.stdout || "").length };
}

// ── Walk settings.json ──
const events = SETTINGS.hooks || {};
const filter = process.argv[2] ? new RegExp(process.argv[2]) : null;
const fails = [];
const passes = [];
const seen = new Set();

for (const [eventName, chains] of Object.entries(events)) {
  for (const chain of chains) {
    const matcher = chain.matcher || "";
    for (const hook of chain.hooks || []) {
      const hookPath = parseCommand(hook.command || "");
      if (!hookPath) continue;
      const name = extractHookName(hookPath);
      const key = `${eventName}:${matcher}:${name}`;
      if (seen.has(key)) continue;
      seen.add(key);
      if (filter && !filter.test(name)) continue;
      const sample = sampleForEvent(eventName, matcher);
      const result = runOne(hookPath, sample);
      if (!result.ok) fails.push({ eventName, matcher, name, ...result });
      else passes.push(name);
    }
  }
}

console.log(`\nPASS: ${passes.length}`);
console.log(`FAIL: ${fails.length}\n`);
for (const f of fails) {
  console.log(`  ✗ [${f.eventName}/${f.matcher}] ${f.name} → ${f.reason}`);
}
process.exit(fails.length === 0 ? 0 : 1);
