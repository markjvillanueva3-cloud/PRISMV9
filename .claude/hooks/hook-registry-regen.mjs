#!/usr/bin/env node
/**
 * hook-registry-regen.mjs — PostToolUse:Edit|Write|MultiEdit (HOOK-SYNERGY-MS0 / U-H1 step-4).
 *
 * When an edit touches a `.claude/hooks/**.mjs` (a hook source OR a `bundles/*.mjs` wrapper)
 * or a `.claude/settings*.json` layer, fire-and-forget a detached
 * `node scripts/build-hook-registry.mjs` so `state/shared/HOOK_REGISTRY.json` stays current.
 * On the 99% of edits that touch nothing hook-related it's a `JSON.parse` + a regex test — micro-
 * seconds, no spawn. The spawn is detached + unref'd + stdio:"ignore" so it never blocks the
 * tool; if it can't spawn (fork-storm pressure) it's a no-op and the 30-min verify cron + the
 * next SessionStart catch up. Always emits {continue:true}. Disable with PRISM_HOOK_REGISTRY_REGEN=0.
 * Import-safe (only runs when invoked directly; exports `relevantPaths` for unit tests).
 */

import { spawn } from "node:child_process";
import { readFileSync } from "node:fs";

const REPO = "H:/prism";
const BUILDER = REPO + "/scripts/build-hook-registry.mjs";
// `.claude/hooks/<anything>.mjs` (incl. bundles/) OR `.claude/settings.json` / `.claude/settings.local.json`
const RELEVANT_RE = /[\\/]\.claude[\\/]hooks[\\/].*\.mjs$|[\\/]\.claude[\\/]settings(?:\.local)?\.json$/i;

/** Every file path referenced by an Edit / Write / MultiEdit tool_input shape. */
function relevantPaths(input) {
  const out = [];
  if (!input || typeof input !== "object") return out;
  for (const k of ["file_path", "filePath", "path"]) if (typeof input[k] === "string") out.push(input[k]);
  if (Array.isArray(input.file_paths)) for (const p of input.file_paths) if (typeof p === "string") out.push(p);
  if (Array.isArray(input.edits)) for (const e of input.edits) for (const k of ["file_path", "filePath", "path"]) if (e && typeof e[k] === "string") out.push(e[k]);
  return out;
}

function main() {
  if (process.env.PRISM_HOOK_REGISTRY_REGEN === "0") { process.stdout.write(JSON.stringify({ continue: true })); return; }

  let hookInput = {};
  try { hookInput = JSON.parse(readFileSync(0, "utf8")); } catch { process.stdout.write(JSON.stringify({ continue: true })); return; }

  const tool = hookInput.tool_name || "";
  if (!/^(?:Edit|Write|MultiEdit)$/.test(tool)) { process.stdout.write(JSON.stringify({ continue: true })); return; }

  const touchedHookLand = relevantPaths(hookInput.tool_input || {}).some((p) => RELEVANT_RE.test(String(p).replace(/\\/g, "/")));
  if (!touchedHookLand) { process.stdout.write(JSON.stringify({ continue: true })); return; }

  // fire-and-forget — regenerate the registry in the background; never block the tool
  try {
    const child = spawn(process.execPath, [BUILDER], { cwd: REPO, stdio: "ignore", windowsHide: true, detached: true });
    child.unref?.();
  } catch { /* spawn failed under fork pressure — the verify cron + next SessionStart will catch up */ }

  process.stdout.write(JSON.stringify({
    continue: true,
    hookSpecificOutput: { hookEventName: "PostToolUse", additionalContext: "↻ HOOK_REGISTRY.json regen queued (a .claude/hooks change was detected)" },
  }));
}

// Import-safe: the hook-runner spawns this as `node hook-registry-regen.mjs`; a unit test that
// imports `relevantPaths` sees the test runner as argv[1] and so main() is skipped.
const invokedDirectly = (() => {
  try { return (process.argv[1] || "").replace(/\\/g, "/").endsWith("/hook-registry-regen.mjs"); } catch { return true; }
})();
if (invokedDirectly) {
  try { main(); } catch { try { process.stdout.write(JSON.stringify({ continue: true })); } catch { /* nothing more we can do */ } }
}

export { relevantPaths };
