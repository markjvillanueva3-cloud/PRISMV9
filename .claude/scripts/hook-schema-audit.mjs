#!/usr/bin/env node
/**
 * hook-schema-audit.mjs — Bulk schema-validity test for all wired hooks
 *
 * BACKGROUND:
 * On 2026-04-27 we discovered ollama-session-continuity.mjs was producing
 * `hookSpecificOutput.hookEventName: "PreCompact"` which the harness schema
 * REJECTS (only PreToolUse/UserPromptSubmit/PostToolUse/PostToolBatch are
 * allowed). The output was silently dropped on every /compact for an unknown
 * duration. Two Python hooks (enforce-formula-accuracy-gate, enforce-wiring-
 * completeness) had the same bug.
 *
 * This script scans every wired hook in H:/.claude/settings.json, executes
 * it with a synthetic stdin payload appropriate to its event type, and parses
 * the JSON output against the harness schema. Reports:
 *   - schema_violations: hooks whose JSON output is malformed or rejected
 *   - exec_failures: hooks that crashed (non-zero exit + no JSON)
 *   - orphaned_hooks: settings.json refers to a script that doesn't exist
 *   - dangling_hook_files: hook script exists on disk but is NOT in settings.json
 *
 * Read-only — does NOT modify settings.json or hook files.
 *
 * Usage:
 *   node H:/prism/.claude/scripts/hook-schema-audit.mjs              # human report
 *   node H:/prism/.claude/scripts/hook-schema-audit.mjs --json       # machine output
 *   node H:/prism/.claude/scripts/hook-schema-audit.mjs --event=PreCompact  # filter
 */

import { readFileSync, existsSync, readdirSync, statSync } from "node:fs";
import { spawnSync } from "node:child_process";
import { join, basename } from "node:path";

const SETTINGS_FILE = "H:/.claude/settings.json";
const HOOK_DIRS = [
  "H:/PRISM/.claude/hooks",
  "H:/.claude/hooks",
];
const HOOK_TIMEOUT_MS = 8000;

// Schema reference (from harness validation error in /compact output 2026-04-27):
//   hookSpecificOutput is allowed ONLY for these 4 events.
//   All other events (PreCompact, SessionStart, Stop, Notification) must use
//   top-level fields: continue, suppressOutput, stopReason, decision, reason,
//   systemMessage, permissionDecision.
//   EMPIRICAL NOTE: SessionStart hookSpecificOutput is accepted in practice
//   despite not being listed; the strict rejection is observed only for PreCompact.
const HOOKSPECIFIC_OK_EVENTS = new Set(["PreToolUse", "UserPromptSubmit", "PostToolUse", "PostToolBatch"]);
const SESSION_START_EXCEPTION = true; // empirically accepted

// Synthetic payloads per event — minimal but realistic enough to exercise hooks
const PAYLOAD_FOR_EVENT = {
  PreToolUse: { tool_name: "Read", tool_input: { file_path: "h:/test/audit-synthetic.txt" }, session_id: "audit-synthetic" },
  PostToolUse: { tool_name: "Read", tool_input: { file_path: "h:/test/audit-synthetic.txt" }, tool_response: { ok: true }, session_id: "audit-synthetic" },
  UserPromptSubmit: { prompt: "audit-synthetic test prompt for hook schema validity", session_id: "audit-synthetic" },
  PreCompact: { session_id: "audit-synthetic", trigger: "manual" },
  Stop: { session_id: "audit-synthetic", stop_hook_active: false },
  SessionStart: { session_id: "audit-synthetic", source: "audit" },
  Notification: { session_id: "audit-synthetic", message: "audit synthetic" },
  PostToolBatch: { session_id: "audit-synthetic", tools: [] },
};

function loadSettings() {
  if (!existsSync(SETTINGS_FILE)) {
    throw new Error(`settings.json not found at ${SETTINGS_FILE}`);
  }
  return JSON.parse(readFileSync(SETTINGS_FILE, "utf-8"));
}

function listHookFilesOnDisk() {
  const out = new Map();
  for (const dir of HOOK_DIRS) {
    if (!existsSync(dir)) continue;
    walk(dir, out);
  }
  return out;
}

function walk(dir, acc) {
  for (const name of readdirSync(dir)) {
    const p = join(dir, name);
    let s;
    try { s = statSync(p); } catch { continue; }
    if (s.isDirectory()) {
      walk(p, acc);
      continue;
    }
    if (/\.(mjs|js|py|cmd|bat|ps1|sh)$/i.test(name)) {
      acc.set(p.replaceAll("\\", "/").toLowerCase(), p);
    }
  }
}

function extractScriptPath(command) {
  if (!command) return null;
  // Patterns:
  //   "H:/.claude/bin/portable-node" H:/prism/.claude/hooks/foo.mjs
  //   node H:/prism/.claude/hooks/foo.mjs
  //   HOOK_EVENT=X "H:/.claude/bin/portable-node" H:/prism/.claude/hooks/foo.mjs
  //   python H:/prism/.claude/hooks/lib/foo.py
  const matches = [...command.matchAll(/[A-Z]:\/[^\s"']+\.(?:mjs|js|py|cmd|bat|ps1|sh)/gi)];
  if (matches.length > 0) return matches[matches.length - 1][0]; // last path = the script (interpreters come first)
  return null;
}

function detectInterpreter(scriptPath, command) {
  const ext = scriptPath.split(".").pop().toLowerCase();
  if (ext === "py") return ["python"];
  if (ext === "ps1") return ["powershell", "-File"];
  if (ext === "sh") return ["bash"];
  // .mjs/.js — use the same interpreter the command uses, or process.execPath
  if (command && command.includes("portable-node")) return [process.execPath];
  if (command && /\bnode\b/.test(command)) return [process.execPath];
  return [process.execPath];
}

function runHook(scriptPath, command, payload) {
  const interp = detectInterpreter(scriptPath, command);
  const args = interp.slice(1).concat([scriptPath]);
  const r = spawnSync(interp[0], args, {
    input: JSON.stringify(payload),
    encoding: "utf-8",
    timeout: HOOK_TIMEOUT_MS,
    env: { ...process.env, HOOK_EVENT: payload.__event || "" },
  });
  return {
    status: r.status,
    stdout: r.stdout || "",
    stderr: r.stderr || "",
    err: r.error ? r.error.message : null,
  };
}

function validateOutput(rawStdout, eventName) {
  // Empty stdout is allowed (means hook decided to stay quiet)
  const trimmed = rawStdout.trim();
  if (!trimmed) return { ok: true, reason: "empty-output (allowed)" };

  let parsed;
  try { parsed = JSON.parse(trimmed); }
  catch { return { ok: false, reason: "non-JSON output", excerpt: trimmed.slice(0, 200) }; }

  // Top-level field whitelist (from schema dump):
  // continue, suppressOutput, stopReason, decision, reason, systemMessage, permissionDecision, hookSpecificOutput
  const allowedTop = new Set(["continue", "suppressOutput", "stopReason", "decision", "reason", "systemMessage", "permissionDecision", "hookSpecificOutput"]);
  for (const k of Object.keys(parsed)) {
    if (!allowedTop.has(k)) {
      return { ok: false, reason: `unknown top-level key: ${k}`, excerpt: trimmed.slice(0, 200) };
    }
  }

  // hookSpecificOutput rules
  if (parsed.hookSpecificOutput) {
    const hso = parsed.hookSpecificOutput;
    const declared = hso.hookEventName;
    if (!declared) {
      return { ok: false, reason: "hookSpecificOutput missing hookEventName" };
    }
    if (!HOOKSPECIFIC_OK_EVENTS.has(declared) && !(SESSION_START_EXCEPTION && declared === "SessionStart")) {
      return { ok: false, reason: `hookSpecificOutput.hookEventName="${declared}" not allowed for ${eventName} event (schema only accepts ${[...HOOKSPECIFIC_OK_EVENTS].join("/")} ${SESSION_START_EXCEPTION ? "+ empirical SessionStart" : ""})` };
    }
    // Mismatched event vs hookEventName
    if (declared !== eventName && !(eventName === "SessionStart" && declared === "SessionStart")) {
      // Allow Stop hooks that mark hookEventName: "Stop" (even though schema is unclear)
      // — record as warning not failure
      return { ok: true, reason: `WARN: declared "${declared}" mismatches event "${eventName}"`, warn: true };
    }
  }

  return { ok: true, reason: "schema-valid" };
}

function main() {
  const flags = new Set(process.argv.slice(2));
  const isJson = flags.has("--json");
  const eventFilter = process.argv.find((a) => a.startsWith("--event="))?.split("=")[1] || null;

  const settings = loadSettings();
  const hooksConfig = settings.hooks || {};
  const onDisk = listHookFilesOnDisk();
  const wiredFiles = new Set();

  const results = {
    audited: 0,
    schema_violations: [],
    exec_failures: [],
    orphaned_wirings: [], // script in settings.json but file missing
    warnings: [],
    by_event: {},
  };

  for (const [eventName, blocks] of Object.entries(hooksConfig)) {
    if (eventFilter && eventName !== eventFilter) continue;
    if (!Array.isArray(blocks)) continue;
    results.by_event[eventName] = { audited: 0, violations: 0, failures: 0 };

    for (const block of blocks) {
      const matcher = block.matcher ?? "*";
      for (const hookEntry of (block.hooks || [])) {
        const cmd = hookEntry.command || "";
        const scriptPath = extractScriptPath(cmd);
        if (!scriptPath) continue; // shell-only or builtin
        const lc = scriptPath.replaceAll("\\", "/").toLowerCase();
        wiredFiles.add(lc);

        if (!existsSync(scriptPath)) {
          results.orphaned_wirings.push({ event: eventName, matcher, script: scriptPath });
          continue;
        }

        const payload = { ...(PAYLOAD_FOR_EVENT[eventName] || { session_id: "audit-synthetic" }), __event: eventName };
        const exec = runHook(scriptPath, cmd, payload);
        results.audited += 1;
        results.by_event[eventName].audited += 1;

        if (exec.err && exec.err.includes("ETIMEDOUT")) {
          results.exec_failures.push({ event: eventName, script: scriptPath, reason: `timeout > ${HOOK_TIMEOUT_MS}ms` });
          results.by_event[eventName].failures += 1;
          continue;
        }
        if (exec.err) {
          results.exec_failures.push({ event: eventName, script: scriptPath, reason: exec.err });
          results.by_event[eventName].failures += 1;
          continue;
        }
        if (exec.status !== 0 && exec.status !== 2 /* PreToolUse block exit code */) {
          // Many hooks legitimately exit 2 to block; only flag others
          if (exec.status !== null) {
            results.exec_failures.push({ event: eventName, script: scriptPath, reason: `exit ${exec.status}`, stderr: exec.stderr.slice(0, 200) });
            results.by_event[eventName].failures += 1;
          }
        }

        const v = validateOutput(exec.stdout, eventName);
        if (!v.ok) {
          results.schema_violations.push({ event: eventName, script: scriptPath, reason: v.reason, excerpt: v.excerpt });
          results.by_event[eventName].violations += 1;
        } else if (v.warn) {
          results.warnings.push({ event: eventName, script: scriptPath, reason: v.reason });
        }
      }
    }
  }

  // Dangling files: on-disk hook scripts not referenced by settings.json
  const dangling = [];
  for (const [lc, full] of onDisk.entries()) {
    if (!wiredFiles.has(lc)) {
      // ignore lib/ subdirectory and backup files
      if (full.includes("/lib/") || full.includes(".backup") || full.includes(".bak")) continue;
      dangling.push(full);
    }
  }
  results.dangling_hook_files = dangling;

  if (isJson) {
    process.stdout.write(JSON.stringify(results, null, 2));
    return;
  }

  // Human report
  const lines = [];
  lines.push(`Hook Schema Audit — ${new Date().toISOString()}`);
  lines.push(`==================================================`);
  lines.push(`Audited:           ${results.audited} hook invocations`);
  lines.push(`Schema violations: ${results.schema_violations.length}`);
  lines.push(`Exec failures:     ${results.exec_failures.length}`);
  lines.push(`Orphaned wirings:  ${results.orphaned_wirings.length}  (settings → missing file)`);
  lines.push(`Dangling files:    ${results.dangling_hook_files.length}  (file → not wired)`);
  lines.push(`Warnings:          ${results.warnings.length}`);
  lines.push("");
  lines.push("Per-event:");
  for (const [evt, s] of Object.entries(results.by_event)) {
    lines.push(`  ${evt.padEnd(20)} audited=${s.audited}  violations=${s.violations}  failures=${s.failures}`);
  }
  if (results.schema_violations.length) {
    lines.push("");
    lines.push("=== SCHEMA VIOLATIONS (silently dropping output) ===");
    for (const v of results.schema_violations) {
      lines.push(`  [${v.event}] ${basename(v.script)}`);
      lines.push(`    ${v.reason}`);
      if (v.excerpt) lines.push(`    output: ${v.excerpt}`);
    }
  }
  if (results.exec_failures.length) {
    lines.push("");
    lines.push("=== EXEC FAILURES ===");
    for (const e of results.exec_failures) {
      lines.push(`  [${e.event}] ${basename(e.script)}: ${e.reason}`);
      if (e.stderr) lines.push(`    stderr: ${e.stderr.slice(0, 150)}`);
    }
  }
  if (results.orphaned_wirings.length) {
    lines.push("");
    lines.push("=== ORPHANED WIRINGS (settings.json points to missing files) ===");
    for (const o of results.orphaned_wirings) lines.push(`  [${o.event}] ${o.script}`);
  }
  if (results.dangling_hook_files.length) {
    lines.push("");
    lines.push(`=== DANGLING HOOK FILES (not wired in settings.json — ${results.dangling_hook_files.length} files) ===`);
    for (const d of results.dangling_hook_files.slice(0, 30)) lines.push(`  ${d}`);
    if (results.dangling_hook_files.length > 30) lines.push(`  ... and ${results.dangling_hook_files.length - 30} more`);
  }
  if (results.warnings.length) {
    lines.push("");
    lines.push("=== WARNINGS ===");
    for (const w of results.warnings) lines.push(`  [${w.event}] ${basename(w.script)}: ${w.reason}`);
  }

  process.stdout.write(lines.join("\n") + "\n");
}

try {
  main();
} catch (err) {
  process.stderr.write(`hook-schema-audit error: ${err.message}\n${err.stack}\n`);
  process.exit(1);
}
