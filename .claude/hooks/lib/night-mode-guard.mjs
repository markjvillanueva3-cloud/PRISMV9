#!/usr/bin/env node
// tier: T1
/**
 * night-mode-guard.mjs — PreToolUse hook for night mode enforcement
 *
 * Checks if operations are allowed during night mode.
 * Blocks high-risk work like physics engines, safety-critical changes.
 */
import * as fs from 'fs';
import path from "node:path";

function readStdinSafe() {
  try {
    if (process.stdin.isTTY) return "";
    return fs.readFileSync(0, "utf-8");
  } catch { return ""; }
}

const CACHE_DIR = "H:\\prism\\.claude\\cache";
const FLAG_FILE = path.join(CACHE_DIR, "night-mode-active.json");

function readJson(filePath) {
  try {
    return JSON.parse(fs.readFileSync(filePath, "utf8"));
  } catch {
    return null;
  }
}

function writeJson(filePath, data) {
  fs.writeFileSync(filePath, JSON.stringify(data, null, 2), "utf8");
}

function checkBlocked(state, filePath, content) {
  if (!state?.active) return null;

  const filePathLower = (filePath || "").toLowerCase();
  const contentLower = (content || "").toLowerCase();
  const combined = `${filePathLower} ${contentLower}`;

  // Check blocked patterns
  for (const pattern of state.config.blocked_patterns || []) {
    if (combined.includes(pattern.toLowerCase())) {
      return `NIGHT MODE: "${pattern}" work is restricted. Queue for morning.`;
    }
  }

  // Check protected engines
  for (const engine of state.config.protected_engines || []) {
    if (filePathLower.includes(engine.toLowerCase())) {
      return `NIGHT MODE: ${engine} is protected overnight.`;
    }
  }

  // Check readonly paths
  for (const p of state.config.readonly_paths || []) {
    const normalizedPath = p.toLowerCase().replace(/\//g, "\\");
    if (filePathLower.includes(normalizedPath)) {
      return `NIGHT MODE: ${p} is read-only overnight.`;
    }
  }

  return null;
}

function emit(permissionDecision, reason) {
  const out = {
    hookSpecificOutput: {
      hookEventName: "PreToolUse",
      permissionDecision,
    },
  };
  if (reason) out.hookSpecificOutput.permissionDecisionReason = reason;
  console.log(JSON.stringify(out));
}

function main() {
  const input = readStdinSafe();
  if (!input) { emit("allow"); return; }

  try {
    const hookInput = JSON.parse(input);
    const { tool_name, tool_input } = hookInput;

    // Only check Write/Edit operations
    if (!["Write", "Edit", "MultiEdit"].includes(tool_name)) {
      emit("allow");
      return;
    }

    // Check if night mode is active
    const state = readJson(FLAG_FILE);
    if (!state?.active) {
      emit("allow");
      return;
    }

    // Check expiration
    const now = new Date();
    const expires = new Date(state.expiresAt);
    if (now > expires) {
      // Night mode expired, allow
      emit("allow");
      return;
    }

    // Check if this operation is blocked
    const filePath = tool_input?.file_path || "";
    const content = tool_input?.content || tool_input?.new_string || "";
    const blockReason = checkBlocked(state, filePath, content);

    if (blockReason) {
      state.stats = state.stats || { tasks_completed: 0, tasks_blocked: 0 };
      state.stats.tasks_blocked++;
      writeJson(FLAG_FILE, state);
      emit("deny", blockReason);
      return;
    }

    // Allowed
    state.stats = state.stats || { tasks_completed: 0, tasks_blocked: 0 };
    state.stats.tasks_completed++;
    writeJson(FLAG_FILE, state);

    emit("allow");
  } catch {
    // On error, allow (fail open)
    emit("allow");
  }
}

main();
