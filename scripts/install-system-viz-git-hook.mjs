#!/usr/bin/env node
/**
 * install-system-viz-git-hook.mjs — wire system-viz refresh into the git post-commit hook.
 *
 * Idempotent installer:
 *   - Locates the active .git directory (worktree-aware)
 *   - Reads existing post-commit hook (or creates one)
 *   - Appends the system-viz refresh block (skipped if already present)
 *   - Marks executable on POSIX, leaves alone on Windows (git auto-finds them)
 *
 * Run once: `node scripts/install-system-viz-git-hook.mjs`
 * Uninstall: `node scripts/install-system-viz-git-hook.mjs --uninstall`
 */

import fs from "node:fs";
import path from "node:path";
import { execSync } from "node:child_process";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, "..");

const MARKER_BEGIN = "# === PRISM SYSTEM-VIZ AUTO-REFRESH (managed; do not edit between markers) ===";
const MARKER_END   = "# === /PRISM SYSTEM-VIZ AUTO-REFRESH ===";

const block = `
${MARKER_BEGIN}
# Auto-refresh the system-viz graph on every commit so rgs3/forge3 + the open
# browser tab + any chat consuming system-graph.json see fresh state immediately.
# Runs in background — does not block the commit. Exit code is ignored.
(
  cd "$(git rev-parse --show-toplevel)" 2>/dev/null && {
    if [ -f "scripts/system-viz-on-commit.mjs" ]; then
      node scripts/system-viz-on-commit.mjs >/dev/null 2>&1 &
    fi
  }
) >/dev/null 2>&1
${MARKER_END}
`.trimStart();

// Find git hooks dir (handles main repo + worktrees)
function findHooksDir() {
  try {
    const out = execSync("git rev-parse --git-path hooks", { cwd: ROOT, encoding: "utf8" }).trim();
    return path.isAbsolute(out) ? out : path.join(ROOT, out);
  } catch {
    return path.join(ROOT, ".git", "hooks");
  }
}

const hooksDir = findHooksDir();
if (!fs.existsSync(hooksDir)) fs.mkdirSync(hooksDir, { recursive: true });
const hookPath = path.join(hooksDir, "post-commit");

const args = process.argv.slice(2);
const uninstall = args.includes("--uninstall");

let existing = "";
if (fs.existsSync(hookPath)) existing = fs.readFileSync(hookPath, "utf8");

const hasBlock = existing.includes(MARKER_BEGIN);

if (uninstall) {
  if (!hasBlock) {
    console.log("nothing to uninstall — block not present in post-commit hook");
    process.exit(0);
  }
  const re = new RegExp(`\\n?${MARKER_BEGIN.replace(/[.*+?^${}()|[\\]\\\\]/g, "\\\\$&")}[\\s\\S]*?${MARKER_END.replace(/[.*+?^${}()|[\\]\\\\]/g, "\\\\$&")}\\n?`, "g");
  const cleaned = existing.replace(re, "");
  fs.writeFileSync(hookPath, cleaned);
  console.log(`✓ uninstalled system-viz block from ${hookPath}`);
  process.exit(0);
}

if (hasBlock) {
  console.log(`already installed — system-viz block present in ${hookPath}`);
  process.exit(0);
}

let newContent;
if (existing.length === 0) {
  newContent = `#!/bin/sh\n# PRISM post-commit hook\n${block}\n`;
} else {
  // Append to whatever's already there
  const sep = existing.endsWith("\n") ? "" : "\n";
  newContent = `${existing}${sep}\n${block}\n`;
}
fs.writeFileSync(hookPath, newContent);

// chmod +x on POSIX
if (process.platform !== "win32") {
  try { fs.chmodSync(hookPath, 0o755); } catch { /* best-effort */ }
}

console.log(`✓ installed system-viz auto-refresh block in ${hookPath}`);
console.log(`  every commit now triggers: generate → merge → detect → merge (background, ~2-3s)`);
console.log(`  uninstall: node scripts/install-system-viz-git-hook.mjs --uninstall`);
