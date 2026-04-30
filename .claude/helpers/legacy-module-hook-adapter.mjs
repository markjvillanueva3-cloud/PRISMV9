#!/usr/bin/env node
/**
 * legacy-module-hook-adapter.mjs — bridges `export default async function`
 * style hook modules to Claude Code's stdin-JSON / stdout-JSON protocol.
 *
 * Some PRISM hooks (awareness-bootstrap, pre-rename-guard, pre-delete-guard,
 * signature-drift-detector, critical-file-guard) were written as ES modules
 * with a default-exported async function — they cannot be invoked directly
 * by Claude Code's hook runner, which expects a script that reads stdin and
 * writes stdout. This adapter wraps them.
 *
 * Usage in settings.json:
 *   "command": "\"<portable-node>\" <adapter> <hook-module> <event-name>"
 *
 * Where event-name is one of: PreToolUse, PostToolUse, SessionStart,
 * UserPromptSubmit, Stop, PreCompact.
 *
 * Return-value mapping:
 *   { decision: "block", message }           → permissionDecision: deny (PreToolUse)
 *   { allow: false, message }                → permissionDecision: deny (PreToolUse)
 *   { decision: "allow" } / { allow: true }  → silent pass {continue:true}
 *   { inject: {...}, message }               → additionalContext (SessionStart)
 *   { message }                              → systemMessage (PostToolUse/Stop)
 *
 * Failure mode: any error → silent {continue:true}. Adapter is best-effort
 * and never blocks the hook chain.
 *
 * Module is invoked under a 4000ms timeout race so a hung module cannot
 * starve the Claude Code event budget.
 */

import { readFileSync } from "node:fs";
import { pathToFileURL } from "node:url";
import { resolve } from "node:path";

const MODULE_TIMEOUT_MS = 4000;
const VALID_EVENTS = new Set([
  "PreToolUse", "PostToolUse", "SessionStart", "UserPromptSubmit", "Stop", "PreCompact",
]);

function emitSilentPass() {
  try { process.stdout.write(JSON.stringify({ continue: true })); } catch { /* ok */ }
}

function emitDeny(reason) {
  process.stdout.write(JSON.stringify({
    hookSpecificOutput: {
      hookEventName: "PreToolUse",
      permissionDecision: "deny",
      permissionDecisionReason: String(reason || "blocked by legacy module hook"),
    },
  }));
}

function emitSessionContext(text) {
  process.stdout.write(JSON.stringify({
    hookSpecificOutput: {
      hookEventName: "SessionStart",
      additionalContext: String(text || ""),
    },
  }));
}

function emitSystemMessage(text) {
  process.stdout.write(JSON.stringify({
    continue: true,
    systemMessage: String(text || ""),
  }));
}

async function readStdin() {
  try { return JSON.parse(readFileSync(0, "utf8") || "{}"); }
  catch { return {}; }
}

async function loadModule(modulePath) {
  try {
    return await import(pathToFileURL(resolve(modulePath)).href);
  } catch {
    return null;
  }
}

async function invokeWithTimeout(fn, input) {
  let timer;
  const timeout = new Promise((_, reject) => {
    timer = setTimeout(() => reject(new Error("module timeout")), MODULE_TIMEOUT_MS);
  });
  try {
    return await Promise.race([Promise.resolve(fn(input)), timeout]);
  } finally {
    clearTimeout(timer);
  }
}

function mapResult(event, result) {
  if (!result || typeof result !== "object") return null;

  const denied = result.decision === "block" || result.allow === false;
  const message = result.message || "";

  if (denied && event === "PreToolUse") {
    emitDeny(message || "denied by hook");
    return "denied";
  }

  if (event === "SessionStart") {
    if (result.inject || message) {
      emitSessionContext(message || JSON.stringify(result.inject || {}));
      return "session-context";
    }
    return null;
  }

  if (message) {
    emitSystemMessage(message);
    return "message";
  }

  return null;
}

async function main() {
  const modulePath = process.argv[2];
  const event = process.argv[3];

  if (!modulePath || !VALID_EVENTS.has(event)) {
    emitSilentPass();
    return;
  }

  const input = await readStdin();
  const mod = await loadModule(modulePath);
  const fn = mod?.default;

  if (typeof fn !== "function") {
    emitSilentPass();
    return;
  }

  let result;
  try {
    result = await invokeWithTimeout(fn, input);
  } catch {
    emitSilentPass();
    return;
  }

  const handled = mapResult(event, result);
  if (!handled) emitSilentPass();
}

main().catch(emitSilentPass);
