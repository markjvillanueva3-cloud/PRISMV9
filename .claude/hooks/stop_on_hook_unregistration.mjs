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
  // 2026-06-08: dangling settings.json refs whose .mjs files do not exist on disk —
  // removed because they threw "Cannot find module" on every SessionStart/Stop/UserPromptSubmit.
  // linear-roadmap-sync + supabase-state-sync were moved to .claude/hooks/_disabled/ (logic
  // preserved, re-enableable); these two have no file anywhere. User-approved hook-error cleanup.
  "stop-mcp-server-heal.mjs",
  "zebra-advisory-inject.mjs",
  "linear-roadmap-sync.mjs",
  "supabase-state-sync.mjs",
  "token-economy-hook.mjs",  // 2026-06-12: dangling posttool-edit-bundle ref; file never committed anywhere. Bundle entry removed.
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

/**
 * Pure: shape the stop-regression-bundle's JSON verdict from the diff result.
 * The bundle parses each sub-hook's STDOUT as JSON (NOT its exit code, see
 * bundles/stop-regression-bundle.mjs:99-106) — so an allow MUST emit
 * {continue:true} or the bundle reports the gate "NOT evaluated this turn"
 * (the false-timeout bug this hook hit EVERY Stop: it exited 0 with empty
 * stdout, so r.parsed was null = "unevaluated"). A block MUST emit
 * {continue:false,...} or the bundle never sees the block (it keys on
 * p.continue===false), so an unregistration would NOT actually be stopped.
 */
export function buildVerdict(removed = []) {
  if (!removed.length) return { continue: true };
  const reason = `STOP BLOCKED: ${removed.length} hook script(s) unregistered without approval (not bundle-absorbed): `
    + `${removed.slice(0, 12).join(", ")}${removed.length > 12 ? ` (+${removed.length - 12} more)` : ""}. `
    + `Restore to settings.json, add to a bundle's SUB_HOOKS, or add to INTENTIONALLY_DISABLED (with a reason).`;
  return { continue: false, stopReason: reason, systemMessage: reason };
}

function main() {
  // Read current settings
  let currentSettings;
  try {
    currentSettings = JSON.parse(readFileSync(SETTINGS_PATH, "utf-8"));
  } catch (err) {
    console.error(`Cannot read settings.json: ${err.message}`);
    process.stdout.write(JSON.stringify(buildVerdict([]))); // allow + EVALUATED (bundle protocol)
    exit(0); // Don't block if can't read
  }

  // Find baseline
  const baseline = findBaseline();
  if (!baseline) {
    // No baseline — this is first run or baselines were cleaned
    // Create one now for next session
    cleanupBaselines();
    process.stdout.write(JSON.stringify(buildVerdict([])));
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

  // Emit the bundle-protocol JSON FIRST (stdout) so the gate is always counted as
  // EVALUATED — allow ({continue:true}) or block ({continue:false,...}). The
  // human-readable box below goes to STDERR (separate stream; the bundle reads
  // stdout). This is the fix for the every-turn "NOT evaluated" false-timeout AND
  // for the block never actually blocking through the bundle.
  process.stdout.write(JSON.stringify(buildVerdict(removed)));

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

// Run main() ONLY when executed directly (the bundle spawns this as a subprocess).
// An isMain guard keeps `import { buildVerdict }` (tests) from triggering main() +
// its exit(0), which would terminate the importing process mid-suite.
const isMain = (() => {
  try {
    return !!process.argv[1] && (
      import.meta.url === `file://${process.argv[1].replace(/\\/g, "/")}` ||
      import.meta.url.endsWith(process.argv[1].replace(/\\/g, "/"))
    );
  } catch { return false; }
})();

if (isMain) {
  try { main(); } catch { process.stdout.write(JSON.stringify({ continue: true })); }
}
