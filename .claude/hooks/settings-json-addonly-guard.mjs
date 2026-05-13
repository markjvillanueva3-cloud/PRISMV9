#!/usr/bin/env node
// tier: T0
/**
 * settings-json-addonly-guard.mjs — PreToolUse(Edit|Write) guard
 *
 * RULE: settings.json is ADD-ONLY. You can add new hooks, plugins, env vars,
 * but you CANNOT remove or delete existing entries. To disable a hook,
 * set `continueOnError: true` or add to a disabled list — never delete.
 *
 * Why: Settings.json contains critical hook registrations. If a concurrent
 * chat accidentally removes hooks, the entire system degrades silently.
 * This guard ensures monotonic growth — additions are always safe.
 *
 * Enforcement:
 *   - Edit: parse old_string JSON vs new_string JSON, check for key removals
 *   - Write: compare against disk version, check for key removals
 *
 * Exit codes:
 *   0  = allow (or non-settings.json file)
 *   2  = hard block (removal detected)
 */

import { readFileSync, existsSync } from "node:fs";
import { exit } from "node:process";

// Parse hook input from stdin
let payload;
try {
  payload = JSON.parse(readFileSync(0, "utf-8"));
} catch {
  exit(0);
}

const tool = payload?.tool_name || payload?.tool || "";
if (!["Edit", "Write"].includes(tool)) exit(0);

const input = payload?.tool_input || payload?.input || {};
const filePath = input.file_path || "";

// Only guard settings.json
if (!filePath.match(/[/\\]settings\.json$/i)) exit(0);

/**
 * Deep-collect all keys in an object, returning a Set of dot-notation paths.
 */
function collectKeys(obj, prefix = "") {
  const keys = new Set();
  if (!obj || typeof obj !== "object") return keys;

  for (const [k, v] of Object.entries(obj)) {
    const path = prefix ? `${prefix}.${k}` : k;
    keys.add(path);
    if (v && typeof v === "object" && !Array.isArray(v)) {
      for (const nested of collectKeys(v, path)) {
        keys.add(nested);
      }
    }
    if (Array.isArray(v)) {
      v.forEach((item, i) => {
        if (item && typeof item === "object") {
          for (const nested of collectKeys(item, `${path}[${i}]`)) {
            keys.add(nested);
          }
        }
      });
    }
  }
  return keys;
}

/**
 * Count hooks in a settings object.
 */
function countHooks(settings) {
  let count = 0;
  const hooks = settings?.hooks;
  if (!hooks || typeof hooks !== "object") return 0;

  for (const eventHooks of Object.values(hooks)) {
    if (!Array.isArray(eventHooks)) continue;
    for (const matcher of eventHooks) {
      if (matcher?.hooks && Array.isArray(matcher.hooks)) {
        count += matcher.hooks.length;
      }
    }
  }
  return count;
}

/**
 * Count plugins in a settings object.
 */
function countPlugins(settings) {
  const plugins = settings?.enabledPlugins;
  if (!plugins || typeof plugins !== "object") return 0;
  return Object.keys(plugins).length;
}

/**
 * Check if new JSON removes keys from old JSON.
 */
function checkForRemovals(oldJson, newJson) {
  let oldObj, newObj;
  try {
    oldObj = typeof oldJson === "string" ? JSON.parse(oldJson) : oldJson;
    newObj = typeof newJson === "string" ? JSON.parse(newJson) : newJson;
  } catch {
    return { removed: false, details: "Could not parse JSON" };
  }

  const oldHookCount = countHooks(oldObj);
  const newHookCount = countHooks(newObj);
  const oldPluginCount = countPlugins(oldObj);
  const newPluginCount = countPlugins(newObj);

  // Check for hook removals
  if (newHookCount < oldHookCount) {
    return {
      removed: true,
      details: `Hook removal detected: ${oldHookCount} → ${newHookCount} hooks (-${oldHookCount - newHookCount})`
    };
  }

  // Check for plugin removals
  if (newPluginCount < oldPluginCount) {
    return {
      removed: true,
      details: `Plugin removal detected: ${oldPluginCount} → ${newPluginCount} plugins (-${oldPluginCount - newPluginCount})`
    };
  }

  // Check for top-level key removals
  const oldKeys = new Set(Object.keys(oldObj));
  const newKeys = new Set(Object.keys(newObj));
  const removedKeys = [...oldKeys].filter(k => !newKeys.has(k));

  if (removedKeys.length > 0) {
    return {
      removed: true,
      details: `Top-level key removal detected: ${removedKeys.join(", ")}`
    };
  }

  // Check env var removals
  const oldEnv = oldObj.env || {};
  const newEnv = newObj.env || {};
  const removedEnvKeys = Object.keys(oldEnv).filter(k => !(k in newEnv));

  if (removedEnvKeys.length > 0) {
    return {
      removed: true,
      details: `Env var removal detected: ${removedEnvKeys.join(", ")}`
    };
  }

  return { removed: false, details: "No removals detected" };
}

function deny(reason) {
  console.log(JSON.stringify({
    decision: "block",
    reason
  }));
  exit(0);
}

// Handle Edit tool
if (tool === "Edit") {
  const oldStr = input.old_string || "";
  const newStr = input.new_string || "";

  // Try to parse as JSON fragments (may be partial)
  // For Edit, we check if it's removing content that looks like hook entries

  // Simple heuristic: if old_string contains hook definitions and new_string doesn't
  const oldHasHook = /"command"\s*:/.test(oldStr) || /"type"\s*:\s*"command"/.test(oldStr);
  const newHasHook = /"command"\s*:/.test(newStr) || /"type"\s*:\s*"command"/.test(newStr);

  if (oldHasHook && !newHasHook && newStr.trim().length < oldStr.trim().length * 0.5) {
    deny(
      `SETTINGS-GUARD: Cannot remove hooks from settings.json.\n\n` +
      `Detected: Edit removing hook definition (old_string has "command"/"type", new_string does not).\n\n` +
      `RULE: settings.json is ADD-ONLY.\n` +
      `  • To disable a hook: set "continueOnError": true\n` +
      `  • To skip a hook: add condition in the hook itself\n` +
      `  • Never delete hook entries — they may be needed by other chats`
    );
  }

  // Check for plugin removals
  const oldHasPlugin = /"[^"]+@claude-plugins-official"/.test(oldStr);
  const newHasPlugin = /"[^"]+@claude-plugins-official"/.test(newStr);

  if (oldHasPlugin && !newHasPlugin && newStr.trim().length < oldStr.trim().length * 0.5) {
    deny(
      `SETTINGS-GUARD: Cannot remove plugins from settings.json.\n\n` +
      `Detected: Edit removing plugin entry.\n\n` +
      `RULE: settings.json is ADD-ONLY.\n` +
      `  • To disable a plugin: set value to false (don't delete the key)\n` +
      `  • Never delete plugin entries`
    );
  }

  exit(0);
}

// Handle Write tool — compare against disk
if (tool === "Write") {
  const newContent = input.content || "";

  // Read current settings.json from disk
  if (!existsSync(filePath)) {
    exit(0); // New file, allow
  }

  let currentContent;
  try {
    currentContent = readFileSync(filePath, "utf-8");
  } catch {
    exit(0); // Can't read, allow
  }

  const check = checkForRemovals(currentContent, newContent);

  if (check.removed) {
    deny(
      `SETTINGS-GUARD: Cannot remove content from settings.json.\n\n` +
      `${check.details}\n\n` +
      `RULE: settings.json is ADD-ONLY.\n` +
      `  • To disable hooks: set "continueOnError": true\n` +
      `  • To disable plugins: set value to false\n` +
      `  • Never delete entries — they may be needed by other chats\n\n` +
      `If you truly need to remove something, do it manually outside Claude Code.`
    );
  }

  exit(0);
}

exit(0);
