#!/usr/bin/env node
// tier: T2
/**
 * dispatcher-digest-regen.mjs — PostToolUse:Edit|Write|MultiEdit (BACKEND-DEVTOOLS-HVA / iter 7).
 *
 * When an edit touches `mcp-server/src/tools/dispatchers/*.ts`, fire-and-forget a detached
 * `node scripts/generate-dispatcher-digest.mjs` so `mcp-server/data/docs/DISPATCHER_DIGEST.md`
 * stays current. Closes the manual-maintenance class of CLAUDE.md regression
 * U-HVA-DIGEST-PARSER-FIX — the digest WAS hand-edited, then auto-generatable as of iter 6,
 * now this hook ensures the regen actually fires on every dispatcher mutation.
 *
 * Pattern mirrors hook-registry-regen.mjs (HOOK-SYNERGY-MS0 U-H1) exactly: on the 99% of edits
 * that touch nothing dispatcher-related it's a JSON.parse + a regex test (microseconds, no
 * spawn). The spawn is detached + unref'd + stdio:"ignore" so it never blocks the tool; if it
 * can't spawn (fork-storm pressure) it's a no-op — the next manual run or a Stop hook catches
 * up. Always emits {continue:true}.
 *
 * Disable: PRISM_DISPATCHER_DIGEST_REGEN=0.
 *
 * Import-safe (only runs when invoked directly; exports `relevantPaths` for unit tests).
 */

import { spawn } from "node:child_process";
import { readFileSync } from "node:fs";
import path from "node:path";
import url from "node:url";

const REPO = "H:/prism";
const BUILDER = REPO + "/scripts/generate-dispatcher-digest.mjs";
// `mcp-server/src/tools/dispatchers/*.ts` (any .ts file in dispatchers dir — excludes .test.ts)
const RELEVANT_RE = /[\\/]mcp-server[\\/]src[\\/]tools[\\/]dispatchers[\\/][\w.-]+\.ts$/i;
// Exclude .test.ts files — they don't affect digest output
const TEST_EXCLUDE_RE = /\.test\.ts$/i;

/** Every file path referenced by an Edit / Write / MultiEdit tool_input shape. */
function relevantPaths(input) {
  const out = [];
  if (!input || typeof input !== "object") return out;
  for (const k of ["file_path", "filePath", "path"]) {
    if (typeof input[k] === "string") out.push(input[k]);
  }
  if (Array.isArray(input.file_paths)) {
    for (const p of input.file_paths) if (typeof p === "string") out.push(p);
  }
  if (Array.isArray(input.edits)) {
    for (const e of input.edits) {
      for (const k of ["file_path", "filePath", "path"]) {
        if (e && typeof e[k] === "string") out.push(e[k]);
      }
    }
  }
  return out;
}

/** Returns true if any path touches a non-test dispatcher .ts file. */
function touchedDispatcherLand(paths) {
  return paths.some((p) => {
    const norm = String(p).replace(/\\/g, "/");
    return RELEVANT_RE.test(norm) && !TEST_EXCLUDE_RE.test(norm);
  });
}

function main() {
  if (process.env.PRISM_DISPATCHER_DIGEST_REGEN === "0") {
    process.stdout.write(JSON.stringify({ continue: true }));
    return;
  }

  let hookInput = {};
  try {
    hookInput = JSON.parse(readFileSync(0, "utf8"));
  } catch {
    process.stdout.write(JSON.stringify({ continue: true }));
    return;
  }

  const tool = hookInput.tool_name || "";
  if (!/^(?:Edit|Write|MultiEdit)$/.test(tool)) {
    process.stdout.write(JSON.stringify({ continue: true }));
    return;
  }

  const paths = relevantPaths(hookInput.tool_input || {});
  if (!touchedDispatcherLand(paths)) {
    process.stdout.write(JSON.stringify({ continue: true }));
    return;
  }

  // Fire-and-forget: regenerate the digest in the background; never block the tool.
  try {
    const child = spawn(process.execPath, [BUILDER], {
      cwd: REPO,
      stdio: "ignore",
      windowsHide: true,
      detached: true,
    });
    child.unref?.();
  } catch {
    // Spawn failed under fork pressure — the next manual run catches up.
  }

  process.stdout.write(JSON.stringify({
    continue: true,
    hookSpecificOutput: {
      hookEventName: "PostToolUse",
      additionalContext: "↻ DISPATCHER_DIGEST.md regen queued (a mcp-server/src/tools/dispatchers/*.ts change was detected)",
    },
  }));
}

// Import-safe: the hook-runner spawns this as `node dispatcher-digest-regen.mjs`; a unit test
// that imports `relevantPaths`/`touchedDispatcherLand` sees the test runner as argv[1] and so
// main() is skipped.
const invokedDirectly = (() => {
  try {
    if (!process.argv[1]) return false;
    return import.meta.url === url.pathToFileURL(process.argv[1]).href;
  } catch { return false; }
})();

if (invokedDirectly) {
  try { main(); } catch (e) {
    // Last-resort: never break the calling tool — emit continue:true and log to stderr.
    process.stderr.write(`dispatcher-digest-regen fatal: ${e.message}\n`);
    process.stdout.write(JSON.stringify({ continue: true }));
  }
}

export { relevantPaths, touchedDispatcherLand, RELEVANT_RE, TEST_EXCLUDE_RE };
