#!/usr/bin/env node
// tier: T4
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
const BUNDLES_DIR = "H:/prism/.claude/hooks/bundles";

// Hook filenames that have been deliberately retired (their settings.json entry
// removed on purpose) and are no longer load-bearing. A filename here is treated
// as "still accounted for" so the baseline diff doesn't block on its removal.
// Add to this set ONLY when intentionally removing a dead hook entry — and say
// why in the commit message.
const INTENTIONALLY_DISABLED = new Set([
  "ollama-terminal-watcher.mjs", // no-op'd 2026-05-11: ran a synchronous curl on every tool call
]);

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
 * Scan the hook-bundle scripts for sub-hook filenames they invoke. A hook that
 * has been absorbed into a bundle (its standalone settings.json entry removed,
 * the bundle now runs it) is still "registered" — the bundle is its registration.
 * Returns a Set of `*.mjs` basenames referenced inside `bundles/*.mjs`.
 */
function bundleAbsorbedHookNames() {
  const names = new Set();
  let files;
  try { files = readdirSync(BUNDLES_DIR).filter(f => f.endsWith(".mjs")); }
  catch { return names; }
  for (const f of files) {
    let src;
    try { src = readFileSync(`${BUNDLES_DIR}/${f}`, "utf-8"); } catch { continue; }
    for (const m of src.matchAll(/[\\/]([\w.\-]+\.mjs)/g)) {
      if (m[1] !== f) names.add(m[1]);
    }
  }
  return names;
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

  // A hook is "still registered" if it appears in settings.json, OR has been
  // absorbed into a bundle script (bundles/*.mjs run it), OR is on the
  // INTENTIONALLY_DISABLED allowlist. Raw hook *count* is not a reliable signal
  // (bundling legitimately reduces it) — the filename-set diff is.
  const baselineCommands = extractHookCommands(baseline);
  const registeredNow = new Set([
    ...extractHookCommands(currentSettings),
    ...bundleAbsorbedHookNames(),
    ...INTENTIONALLY_DISABLED,
  ]);
  const removed = [...baselineCommands].filter(cmd => !registeredNow.has(cmd));

  if (removed.length > 0) {
    const baselineCounts = countHooks(baseline);
    const currentCounts = countHooks(currentSettings);
    console.error(`\n╔══════════════════════════════════════════════════════════════╗`);
    console.error(`║  STOP BLOCKED: HOOKS WERE UNREGISTERED                       ║`);
    console.error(`╠══════════════════════════════════════════════════════════════╣`);
    console.error(`║  Baseline: ${baselineCounts.total} hook entries · Current: ${currentCounts.total}`);
    console.error(`║  ${removed.length} hook script(s) no longer registered (and not bundle-absorbed):`);
    for (const cmd of removed.slice(0, 12)) console.error(`║    - ${cmd}`);
    if (removed.length > 12) console.error(`║    ... and ${removed.length - 12} more`);
    console.error(`╠══════════════════════════════════════════════════════════════╣`);
    console.error(`║  ACTION:                                                     ║`);
    console.error(`║  1. Restore them to settings.json, OR add to a bundle's      ║`);
    console.error(`║     SUB_HOOKS, OR (if intentionally retired) add to          ║`);
    console.error(`║     INTENTIONALLY_DISABLED in this hook — with a reason.      ║`);
    console.error(`║  2. Or get explicit user approval for the removal.           ║`);
    console.error(`╚══════════════════════════════════════════════════════════════╝\n`);
    exit(1);
  }

  // All good — clean up old baselines
  cleanupBaselines();
  exit(0);
}

try { main(); } catch { process.stdout.write(JSON.stringify({ continue: true })); }
