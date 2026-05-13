#!/usr/bin/env node
// tier: T4
/**
 * c-to-h-mirror.mjs — PostToolUse hook
 *
 * After any Write/Edit/MultiEdit touches a CLI-owned file on C:\Users\*\.claude\,
 * mirror it to H:\.claude\ so the portable drive stays canonical.
 *
 * Mirrored ROOT files: settings.json, settings.local.json, .mcp.json, CLAUDE.md, keybindings.json
 * Mirrored SUBDIRS:    commands/, hooks/, agents/, plugins/, skills/, projects/
 *                      (skills, slash commands, custom hooks/agents — anything user-added)
 *
 * Rationale: H:\.claude\ is the portable master (travels between machines). C: exists
 * only because Claude CLI reads from $HOME/.claude at runtime. Keep them in lock-step.
 *
 * NOTE: Most subdirs are already JUNCTIONED (per dotclaude-junctions-guard) so writes
 * to C: land on H: automatically. This hook is the safety net for non-junctioned paths
 * AND for the root files that are NOT junctioned.
 *
 * Input: JSON on stdin { tool_name, tool_input, tool_response? }
 * Output: never blocks. Emits a short suggestion message if a mirror happened.
 */

import { readFileSync, copyFileSync, existsSync, mkdirSync, statSync, lstatSync } from "node:fs";
import { dirname, basename, relative } from "node:path";
import { exit } from "node:process";

let input = "";
try {
  input = readFileSync(0, "utf-8");
} catch {
  exit(0);
}

let payload;
try {
  payload = JSON.parse(input);
} catch {
  exit(0);
}

const tool = payload?.tool_name || payload?.tool || "";
const toolInput = payload?.tool_input || payload?.input || {};

// Only act on Write/Edit-style tools
const writeTools = new Set(["Write", "Edit", "MultiEdit", "NotebookEdit"]);
if (!writeTools.has(tool)) exit(0);

const filePath =
  toolInput.file_path || toolInput.path || toolInput.notebook_path || "";
if (!filePath) exit(0);

// Normalize to forward slashes
const norm = filePath.replace(/\\/g, "/");

// Is this anything under C:\Users\*\.claude\ ?
// Match:  C:/Users/<user>/.claude/<rest>   or   /c/Users/<user>/.claude/<rest>
const re = /^(?:[cC]:\/Users\/([^/]+)\/\.claude\/|\/c\/Users\/([^/]+)\/\.claude\/)(.+)$/;
const match = norm.match(re);
if (!match) exit(0);

const relPath = match[3]; // e.g. "settings.json" or "commands/reorient.md"

// ROOT files we mirror unconditionally
const MIRRORED_ROOT = new Set([
  "settings.json",
  "settings.local.json",
  ".mcp.json",
  "CLAUDE.md",
  "keybindings.json",
]);

// SUBDIRS we mirror (any file under these paths)
const MIRRORED_SUBDIRS = [
  "commands/",   // slash commands / skills
  "hooks/",      // custom user hooks
  "agents/",     // custom agents
  "plugins/",    // plugin configs
  "skills/",     // skill definitions
  "rules/",      // rule files
];

const isRoot = MIRRORED_ROOT.has(relPath);
const isSubdir = MIRRORED_SUBDIRS.some((p) => relPath.startsWith(p));
if (!isRoot && !isSubdir) exit(0);

const src = filePath.replace(/\\/g, "/");
const dst = `H:/.claude/${relPath}`;

// Check if src is a junction/symlink — if so, no mirror needed
// (writing through a junction lands on the target directly)
try {
  const lst = lstatSync(src);
  if (lst.isSymbolicLink()) exit(0);
} catch {
  // Not a problem; continue
}

// Check if PARENT dir of src is a junction/symlink (common case)
try {
  const parent = dirname(src);
  const parentLst = lstatSync(parent);
  if (parentLst.isSymbolicLink()) exit(0);
} catch {
  // Not a problem; continue
}

try {
  if (!existsSync(dirname(dst))) {
    mkdirSync(dirname(dst), { recursive: true });
  }
  // Only mirror if src exists and differs from dst
  if (!existsSync(src)) exit(0);
  let needsCopy = true;
  if (existsSync(dst)) {
    try {
      const srcBuf = readFileSync(src);
      const dstBuf = readFileSync(dst);
      if (srcBuf.equals(dstBuf)) needsCopy = false;
    } catch {
      needsCopy = true;
    }
  }
  if (!needsCopy) exit(0);
  copyFileSync(src, dst);
  process.stdout.write(
    JSON.stringify({  continue: true,  hookSpecificOutput: {
        hookEventName: "PostToolUse",
        additionalContext: `[c-to-h-mirror] ${relPath} mirrored C: → H: (H: is canonical master)`,
      },
    }),
  );
} catch (err) {
  // Non-blocking: log the failure but don't disrupt the tool flow
  process.stderr.write(`[c-to-h-mirror] mirror failed for ${relPath}: ${err?.message || err}\n`);
}

exit(0);
