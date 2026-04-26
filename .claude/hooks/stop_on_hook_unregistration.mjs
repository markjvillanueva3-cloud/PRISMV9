#!/usr/bin/env node
/**
 * stop_on_hook_unregistration.mjs — Stop hook
 *
 * RULE: Sessions cannot unregister hooks from settings.json unless the user
 * explicitly asks for it. This hook fires at Stop and compares the current
 * settings.json against a baseline snapshot taken at SessionStart.
 *
 * If any hooks were removed during the session, it BLOCKS the stop and
 * instructs the agent to restore them.
 *
 * Baseline: Written by SessionStart hook (settings-baseline-snapshot.mjs)
 * stored at: H:/prism/mcp-server/data/state/settings-baseline-{sessionId}.json
 *
 * Exit codes:
 *   0  = allow (no hooks removed, or no baseline found)
 *   1  = hard block (hooks were removed)
 */

import { readFileSync, existsSync, readdirSync, unlinkSync } from "node:fs";
import { exit } from "node:process";

const SETTINGS_PATH = "H:/.claude/settings.json";
const BASELINE_DIR = "H:/prism/mcp-server/data/state";
const BASELINE_PREFIX = "settings-baseline-";

/**
 * Count hooks in a settings object.
 */
function countHooks(settings) {
  const result = { total: 0, byEvent: {} };
  const hooks = settings?.hooks;
  if (!hooks || typeof hooks !== "object") return result;

  for (const [event, eventHooks] of Object.entries(hooks)) {
    if (!Array.isArray(eventHooks)) continue;
    let eventCount = 0;
    for (const matcher of eventHooks) {
      if (matcher?.hooks && Array.isArray(matcher.hooks)) {
        eventCount += matcher.hooks.length;
      }
    }
    result.byEvent[event] = eventCount;
    result.total += eventCount;
  }
  return result;
}

/**
 * Extract hook commands from settings for comparison.
 */
function extractHookCommands(settings) {
  const commands = new Set();
  const hooks = settings?.hooks;
  if (!hooks || typeof hooks !== "object") return commands;

  for (const eventHooks of Object.values(hooks)) {
    if (!Array.isArray(eventHooks)) continue;
    for (const matcher of eventHooks) {
      if (!matcher?.hooks || !Array.isArray(matcher.hooks)) continue;
      for (const h of matcher.hooks) {
        if (h.command) {
          // Extract just the hook filename for comparison
          const match = h.command.match(/[\\/]([^\\/]+\.mjs)(?:\s|$|")/);
          if (match) commands.add(match[1]);
        }
      }
    }
  }
  return commands;
}

/**
 * Find the most recent baseline for comparison.
 */
function findBaseline() {
  try {
    const files = readdirSync(BASELINE_DIR)
      .filter(f => f.startsWith(BASELINE_PREFIX) && f.endsWith(".json"))
      .sort()
      .reverse();

    if (files.length === 0) return null;

    // Use most recent baseline
    const baselinePath = `${BASELINE_DIR}/${files[0]}`;
    return JSON.parse(readFileSync(baselinePath, "utf-8"));
  } catch {
    return null;
  }
}

/**
 * Clean up old baselines (keep only last 5).
 */
function cleanupBaselines() {
  try {
    const files = readdirSync(BASELINE_DIR)
      .filter(f => f.startsWith(BASELINE_PREFIX) && f.endsWith(".json"))
      .sort()
      .reverse();

    // Keep last 5, delete rest
    for (const f of files.slice(5)) {
      try {
        unlinkSync(`${BASELINE_DIR}/${f}`);
      } catch {}
    }
  } catch {}
}

function main() {
  // Read current settings
  let currentSettings;
  try {
    currentSettings = JSON.parse(readFileSync(SETTINGS_PATH, "utf-8"));
  } catch (err) {
    console.error(`Cannot read settings.json: ${err.message}`);
    exit(0); // Don't block if can't read
  }

  // Find baseline
  const baseline = findBaseline();
  if (!baseline) {
    // No baseline — this is first run or baselines were cleaned
    // Create one now for next session
    cleanupBaselines();
    exit(0);
  }

  // Compare hook counts
  const currentCounts = countHooks(currentSettings);
  const baselineCounts = countHooks(baseline);

  if (currentCounts.total < baselineCounts.total) {
    // Hooks were removed!
    const currentCommands = extractHookCommands(currentSettings);
    const baselineCommands = extractHookCommands(baseline);

    const removed = [...baselineCommands].filter(cmd => !currentCommands.has(cmd));

    console.error(`\n╔══════════════════════════════════════════════════════════════╗`);
    console.error(`║  STOP BLOCKED: HOOKS WERE UNREGISTERED                       ║`);
    console.error(`╠══════════════════════════════════════════════════════════════╣`);
    console.error(`║  Baseline: ${baselineCounts.total} hooks`);
    console.error(`║  Current:  ${currentCounts.total} hooks`);
    console.error(`║  Removed:  ${baselineCounts.total - currentCounts.total} hooks`);
    console.error(`╠══════════════════════════════════════════════════════════════╣`);
    console.error(`║  Removed hooks:`);
    for (const cmd of removed.slice(0, 10)) {
      console.error(`║    - ${cmd}`);
    }
    if (removed.length > 10) {
      console.error(`║    ... and ${removed.length - 10} more`);
    }
    console.error(`╠══════════════════════════════════════════════════════════════╣`);
    console.error(`║  ACTION REQUIRED:                                            ║`);
    console.error(`║  1. Restore the removed hooks to settings.json               ║`);
    console.error(`║  2. Or ask the user explicitly if removal is intentional     ║`);
    console.error(`╚══════════════════════════════════════════════════════════════╝\n`);

    exit(1);
  }

  // Check for specific hook removals even if total is same (replacement)
  const currentCommands = extractHookCommands(currentSettings);
  const baselineCommands = extractHookCommands(baseline);
  const removed = [...baselineCommands].filter(cmd => !currentCommands.has(cmd));

  if (removed.length > 0) {
    console.error(`\n╔══════════════════════════════════════════════════════════════╗`);
    console.error(`║  STOP BLOCKED: SPECIFIC HOOKS WERE UNREGISTERED              ║`);
    console.error(`╠══════════════════════════════════════════════════════════════╣`);
    console.error(`║  The following hooks were removed (even though count is same):`);
    for (const cmd of removed.slice(0, 10)) {
      console.error(`║    - ${cmd}`);
    }
    console.error(`╠══════════════════════════════════════════════════════════════╣`);
    console.error(`║  ACTION: Restore these hooks or get explicit user approval   ║`);
    console.error(`╚══════════════════════════════════════════════════════════════╝\n`);

    exit(1);
  }

  // All good — clean up old baselines
  cleanupBaselines();
  exit(0);
}

try { main(); } catch { process.stdout.write(JSON.stringify({ continue: true })); }
