#!/usr/bin/env node
/**
 * install-pathspec-only-git-hook.mjs — wire pathspec-only-guard into pre-commit.
 *
 * Closes U-PRECOMMIT-PATHSPEC-ONLY (JULIETT-12CHAT-ALLOCATION-MS0/W1, echo).
 * The library `scripts/pathspec-only-guard.mjs` + its 48-case test suite shipped
 * 2026-05-17 but were never wired — without an active hook the gate is inert.
 *
 * Idempotent installer:
 *   - Locates the active .git directory (worktree-aware via `git rev-parse --git-path hooks`)
 *   - Reads existing pre-commit hook (or creates one with a /bin/sh shebang)
 *   - Inserts the pathspec-only block between fenced markers (skipped if already present)
 *   - Foreground execution: exit 1 from the guard propagates and BLOCKS the commit
 *   - Marks executable on POSIX (Windows git resolves hook permissions automatically)
 *
 * Run once: `node scripts/install-pathspec-only-git-hook.mjs`
 * Uninstall: `node scripts/install-pathspec-only-git-hook.mjs --uninstall`
 *
 * Emergency bypass (logged): PRISM_PATHSPEC_ONLY_DISABLE=1 git commit ...
 */

import fs from "node:fs";
import path from "node:path";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, "..");

const MARKER_BEGIN = "# === PRISM PATHSPEC-ONLY GUARD (managed; do not edit between markers) ===";
const MARKER_END   = "# === /PRISM PATHSPEC-ONLY GUARD ===";
const GIT_REVPARSE_TIMEOUT_MS = 5000;

const block = `
${MARKER_BEGIN}
# Reject \`git add -A\` / \`git add .\` collateral-staging when other live chats
# hold active claims on the staged files. Foreground; exit 1 BLOCKS the commit.
# Bypass: PRISM_PATHSPEC_ONLY_DISABLE=1 (logged to state/shared/pathspec-bypasses.jsonl).
# Built for U-PRECOMMIT-PATHSPEC-ONLY (JULIETT-12CHAT-ALLOCATION-MS0/W1).
PRISM_PATHSPEC_GUARD_REPO="$(git rev-parse --show-toplevel 2>/dev/null)"
if [ -n "$PRISM_PATHSPEC_GUARD_REPO" ] && [ -f "$PRISM_PATHSPEC_GUARD_REPO/scripts/pathspec-only-guard.mjs" ]; then
  node "$PRISM_PATHSPEC_GUARD_REPO/scripts/pathspec-only-guard.mjs" || exit 1
fi
${MARKER_END}
`.trimStart();

function findHooksDir() {
  const r = spawnSync("git", ["rev-parse", "--git-path", "hooks"], {
    cwd: ROOT,
    encoding: "utf8",
    windowsHide: true,
    timeout: GIT_REVPARSE_TIMEOUT_MS,
  });
  if (r.status === 0 && r.stdout) {
    const out = r.stdout.trim();
    return path.isAbsolute(out) ? out : path.join(ROOT, out);
  }
  return path.join(ROOT, ".git", "hooks");
}

const hooksDir = findHooksDir();
if (!fs.existsSync(hooksDir)) fs.mkdirSync(hooksDir, { recursive: true });
const hookPath = path.join(hooksDir, "pre-commit");

const args = process.argv.slice(2);
const uninstall = args.includes("--uninstall");

let existing = "";
if (fs.existsSync(hookPath)) existing = fs.readFileSync(hookPath, "utf8");

const hasBlock = existing.includes(MARKER_BEGIN);

if (uninstall) {
  if (!hasBlock) {
    console.log("nothing to uninstall — block not present in pre-commit hook");
    process.exit(0);
  }
  const reEscape = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const re = new RegExp(`\\n?${reEscape(MARKER_BEGIN)}[\\s\\S]*?${reEscape(MARKER_END)}\\n?`, "g");
  const cleaned = existing.replace(re, "");
  fs.writeFileSync(hookPath, cleaned);
  console.log(`✓ uninstalled pathspec-only block from ${hookPath}`);
  process.exit(0);
}

if (hasBlock) {
  console.log(`already installed — pathspec-only block present in ${hookPath}`);
  process.exit(0);
}

let newContent;
if (existing.length === 0) {
  newContent = `#!/bin/sh\n# PRISM pre-commit hook\nset -e\n${block}\n`;
} else {
  const sep = existing.endsWith("\n") ? "" : "\n";
  newContent = `${existing}${sep}\n${block}\n`;
}
fs.writeFileSync(hookPath, newContent);

if (process.platform !== "win32") {
  try { fs.chmodSync(hookPath, 0o755); } catch { /* best-effort */ }
}

console.log(`✓ installed pathspec-only guard in ${hookPath}`);
console.log(`  every commit now runs: scripts/pathspec-only-guard.mjs (foreground)`);
console.log(`  bypass (logged):       PRISM_PATHSPEC_ONLY_DISABLE=1 git commit ...`);
console.log(`  uninstall:             node scripts/install-pathspec-only-git-hook.mjs --uninstall`);
