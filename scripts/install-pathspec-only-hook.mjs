#!/usr/bin/env node
/**
 * install-pathspec-only-hook.mjs — git pre-commit installer for
 * U-PRECOMMIT-PATHSPEC-ONLY.
 *
 * .git/hooks/ is NOT tracked, so a script + spec alone never reaches a real
 * repo. Operators run this idempotently:
 *
 *   node H:/prism/scripts/install-pathspec-only-hook.mjs
 *   node H:/prism/scripts/install-pathspec-only-hook.mjs --uninstall
 *   node H:/prism/scripts/install-pathspec-only-hook.mjs --dry-run
 *
 * Behavior:
 *   - No existing pre-commit  → writes a fresh one that invokes the guard
 *   - Existing pre-commit owned by us (carries our SENTINEL) → idempotent
 *     no-op (already installed)
 *   - Existing pre-commit NOT owned by us → backs up to pre-commit.bak.<ts>
 *     then writes a chaining hook that invokes both the backup AND our guard
 *
 * The hook script itself is tiny and just shells out to the lib via portable
 * node (the .claude/bin/portable-node, with a $(which node) fallback so the
 * hook works in any shell that has node on PATH).
 */

import fs from "node:fs";
import path from "node:path";
import { spawnSync } from "node:child_process";

const REPO_ROOT_DEFAULT = "H:/prism";
const SENTINEL = "# PRISM pathspec-only-guard (U-PRECOMMIT-PATHSPEC-ONLY) — managed by install-pathspec-only-hook.mjs";

function detectRepoRoot() {
  if (process.env.PRISM_REPO_ROOT) return process.env.PRISM_REPO_ROOT;
  try {
    const r = spawnSync("git", ["rev-parse", "--show-toplevel"], {
      encoding: "utf-8",
      timeout: 3000,
      windowsHide: true,
    });
    if (r.status === 0 && r.stdout) return r.stdout.trim();
  } catch {
    /* fall through */
  }
  return REPO_ROOT_DEFAULT;
}

function renderHookBody(repoRoot) {
  // Bash shim. The portable-node lookup mirrors what the .claude/settings.json
  // hooks do — portable-node first, $(command -v node) fallback. On Windows
  // git invokes hooks via Git Bash which provides /usr/bin/env, so the shebang
  // is safe.
  const guardScript = `${repoRoot}/scripts/pathspec-only-guard.mjs`;
  const portableNode = "H:/.claude/bin/portable-node";
  return `#!/usr/bin/env bash
${SENTINEL}
#
# Fires before every \`git commit\`. Rejects commits that include peer-held
# file claims (from state/shared/chat-bus/claims/). Knob:
#   PRISM_PATHSPEC_ONLY_DISABLE=1 git commit -m "..."
# emergency-bypasses + logs to state/shared/pathspec-bypasses.jsonl.
#
# If portable-node exists, use it; otherwise fall back to whatever \`node\` is on PATH.
set -e
NODE_BIN="${portableNode}"
if [ ! -x "$NODE_BIN" ]; then
  NODE_BIN="$(command -v node || true)"
fi
if [ -z "$NODE_BIN" ]; then
  # No node available — fail-open. The harness-side hook still guards
  # commits made via Claude's Bash tool.
  exit 0
fi
"$NODE_BIN" "${guardScript}" "$@"
`;
}

function renderChainingHookBody(repoRoot, backupName) {
  const guardScript = `${repoRoot}/scripts/pathspec-only-guard.mjs`;
  const portableNode = "H:/.claude/bin/portable-node";
  return `#!/usr/bin/env bash
${SENTINEL}
# Chaining mode: invokes the prior pre-commit (preserved as ${backupName}) FIRST,
# then this guard. Either failing aborts the commit.
set -e
HOOK_DIR="$(dirname "$0")"
PRIOR="$HOOK_DIR/${backupName}"
if [ -x "$PRIOR" ]; then
  "$PRIOR" "$@"
fi
NODE_BIN="${portableNode}"
if [ ! -x "$NODE_BIN" ]; then
  NODE_BIN="$(command -v node || true)"
fi
if [ -z "$NODE_BIN" ]; then
  exit 0
fi
"$NODE_BIN" "${guardScript}" "$@"
`;
}

function isOwnedByUs(content) {
  return typeof content === "string" && content.includes(SENTINEL);
}

function ts() {
  return new Date().toISOString().replace(/[:.]/g, "-").replace(/Z$/, "");
}

function install({ repoRoot, dryRun = false }) {
  const hookPath = path.join(repoRoot, ".git", "hooks", "pre-commit");
  const hooksDir = path.dirname(hookPath);
  if (!fs.existsSync(hooksDir)) {
    return { ok: false, error: `.git/hooks not found at ${hooksDir}` };
  }
  let existing = null;
  if (fs.existsSync(hookPath)) {
    try {
      existing = fs.readFileSync(hookPath, "utf-8");
    } catch (e) {
      return { ok: false, error: `cannot read existing hook: ${e.message}` };
    }
  }

  if (existing && isOwnedByUs(existing)) {
    // Refresh in place — body may have changed (e.g. repoRoot drift).
    const fresh = renderHookBody(repoRoot);
    if (existing === fresh) {
      return { ok: true, action: "noop", reason: "already-installed-current" };
    }
    if (dryRun) return { ok: true, action: "would-refresh" };
    fs.writeFileSync(hookPath, fresh, { mode: 0o755 });
    return { ok: true, action: "refreshed" };
  }

  if (existing) {
    // Foreign pre-commit. Backup + chain.
    const backupName = `pre-commit.bak.${ts()}`;
    const backupPath = path.join(hooksDir, backupName);
    if (dryRun) {
      return { ok: true, action: "would-chain", backupName };
    }
    fs.writeFileSync(backupPath, existing, { mode: 0o755 });
    fs.writeFileSync(hookPath, renderChainingHookBody(repoRoot, backupName), { mode: 0o755 });
    return { ok: true, action: "chained", backupName };
  }

  // Clean install
  if (dryRun) return { ok: true, action: "would-install" };
  fs.writeFileSync(hookPath, renderHookBody(repoRoot), { mode: 0o755 });
  return { ok: true, action: "installed" };
}

function uninstall({ repoRoot }) {
  const hookPath = path.join(repoRoot, ".git", "hooks", "pre-commit");
  if (!fs.existsSync(hookPath)) return { ok: true, action: "noop", reason: "no-hook" };
  let body;
  try {
    body = fs.readFileSync(hookPath, "utf-8");
  } catch (e) {
    return { ok: false, error: e.message };
  }
  if (!isOwnedByUs(body)) {
    return { ok: false, error: "pre-commit is not owned by U-PRECOMMIT-PATHSPEC-ONLY (sentinel missing)" };
  }
  // If we have a backup we put aside, restore it. Otherwise just remove.
  const hooksDir = path.dirname(hookPath);
  const backups = fs
    .readdirSync(hooksDir)
    .filter((n) => /^pre-commit\.bak\./.test(n))
    .sort()
    .reverse();
  if (backups.length > 0) {
    const newest = backups[0];
    const body2 = fs.readFileSync(path.join(hooksDir, newest), "utf-8");
    fs.writeFileSync(hookPath, body2, { mode: 0o755 });
    return { ok: true, action: "restored-backup", restored: newest };
  }
  fs.unlinkSync(hookPath);
  return { ok: true, action: "removed" };
}

// Internal exports for unit tests (no real .git mutation; tests stage their own).
export const __internals = {
  renderHookBody,
  renderChainingHookBody,
  isOwnedByUs,
  install,
  uninstall,
  SENTINEL,
};

function main() {
  const args = process.argv.slice(2);
  const repoRoot = detectRepoRoot();
  const dryRun = args.includes("--dry-run");
  const opUninstall = args.includes("--uninstall");
  const r = opUninstall ? uninstall({ repoRoot }) : install({ repoRoot, dryRun });
  process.stdout.write(JSON.stringify(r, null, 2) + "\n");
  process.exit(r.ok ? 0 : 1);
}

const __thisFile = (process.argv[1] || "").replace(/\\/g, "/").split("/").pop() || "";
if (__thisFile && import.meta.url.endsWith(__thisFile)) {
  main();
}
