#!/usr/bin/env node
/**
 * git-repair.mjs — Automated git repository repair for H: drive portability.
 *
 * When corruption is detected by git-health-guard, run this to:
 *   1. Backup the corrupted .git
 *   2. Fresh clone from origin
 *   3. Restore local branches and tracking
 *   4. Preserve working tree (no file loss)
 *
 * Usage: node H:/prism/.claude/helpers/git-repair.mjs [--dry-run]
 *
 * Part of cross-PC sync fix from 2026-04-21.
 */

import { execFileSync, execSync } from "node:child_process";
import { existsSync, renameSync, mkdirSync, rmSync, cpSync } from "node:fs";
import { join } from "node:path";

const REPO = "H:/prism";
const ORIGIN = "https://github.com/markjvillanueva3-cloud/PRISMV9.git";
const DRY_RUN = process.argv.includes("--dry-run");

function log(msg) { console.log(`[repair] ${msg}`); }
function warn(msg) { console.warn(`[repair] ⚠ ${msg}`); }
function error(msg) { console.error(`[repair] ✗ ${msg}`); }

function git(args, opts = {}) {
  try {
    return execFileSync("git", args, { windowsHide: true,
      cwd: opts.cwd ?? REPO,
      encoding: "utf8",
      stdio: ["ignore", "pipe", "pipe"],
      timeout: opts.timeout ?? 60000,
      ...opts,
    }).trim();
  } catch (e) {
    return { error: e.message, stderr: e.stderr?.toString() ?? "" };
  }
}

function isOk(r) { return typeof r === "string"; }

async function main() {
  log("Git Repository Repair Tool");
  log("==========================");

  if (DRY_RUN) {
    log("DRY RUN MODE — no changes will be made");
  }

  // 1. Check current state
  log("\n1. Analyzing current state...");

  const branch = git(["rev-parse", "--abbrev-ref", "HEAD"]);
  const currentBranch = isOk(branch) ? branch : "main";
  log(`   Current branch: ${currentBranch}`);

  // Get list of local branches
  const branches = git(["branch", "--format=%(refname:short)"]);
  const localBranches = isOk(branches) ? branches.split("\n").filter(b => b.trim()) : [];
  log(`   Local branches: ${localBranches.length}`);

  // Check for uncommitted changes
  const status = git(["status", "--porcelain"]);
  const hasChanges = isOk(status) && status.trim().length > 0;
  if (hasChanges) {
    const changeCount = status.split("\n").filter(l => l.trim()).length;
    warn(`${changeCount} uncommitted changes — will be preserved`);
  }

  // 2. Backup corrupted .git
  log("\n2. Backing up corrupted .git...");
  const backupName = `.git-corrupted-${new Date().toISOString().slice(0,10).replace(/-/g, "")}`;
  const backupPath = join(REPO, backupName);

  if (DRY_RUN) {
    log(`   Would rename .git → ${backupName}`);
  } else {
    if (existsSync(backupPath)) {
      rmSync(backupPath, { recursive: true, force: true });
    }
    renameSync(join(REPO, ".git"), backupPath);
    log(`   Backed up to ${backupName}`);
  }

  // 3. Fresh clone (bare)
  log("\n3. Fresh clone from origin...");
  const tempClone = join(REPO, ".git-fresh-clone");

  if (DRY_RUN) {
    log(`   Would clone ${ORIGIN} to ${tempClone}`);
  } else {
    if (existsSync(tempClone)) {
      rmSync(tempClone, { recursive: true, force: true });
    }

    const cloneResult = git(["clone", "--bare", ORIGIN, tempClone], {
      cwd: "H:/",
      timeout: 180000
    });

    if (!isOk(cloneResult) && !existsSync(join(tempClone, "HEAD"))) {
      error("Clone failed!");
      error(cloneResult.error || cloneResult.stderr);
      // Restore backup
      renameSync(backupPath, join(REPO, ".git"));
      process.exit(1);
    }
    log("   Clone successful");

    // Move to .git
    renameSync(tempClone, join(REPO, ".git"));
    log("   Moved to .git");
  }

  // 4. Configure as regular repo
  log("\n4. Configuring repository...");

  if (!DRY_RUN) {
    git(["config", "--unset", "core.bare"]);
    git(["config", "core.worktree", REPO]);
    git(["config", "remote.origin.fetch", "+refs/heads/*:refs/remotes/origin/*"]);
    git(["fetch", "origin"], { timeout: 60000 });
    log("   Configured and fetched");
  }

  // 5. Checkout current branch
  log("\n5. Restoring branch state...");

  if (!DRY_RUN) {
    // Reset index to match working tree without losing files
    git(["reset", "HEAD", "--", "."]);

    // Checkout the branch we were on
    const checkout = git(["checkout", "-f", currentBranch]);
    if (!isOk(checkout)) {
      // Branch might not exist on remote, try main
      git(["checkout", "-f", "main"]);
      warn(`Could not checkout ${currentBranch}, fell back to main`);
    } else {
      log(`   Checked out ${currentBranch}`);
    }

    // Set up tracking
    git(["branch", "-u", `origin/${currentBranch}`, currentBranch]);
    git(["branch", "-u", "origin/main", "main"]);
  }

  // 6. Verify
  log("\n6. Verifying repair...");

  if (!DRY_RUN) {
    const fsck = git(["fsck", "--connectivity-only", "--no-progress"], { timeout: 30000 });
    if (isOk(fsck) && fsck === "") {
      log("   ✓ git fsck clean — repair successful!");
    } else {
      error("fsck still shows issues — manual intervention needed");
      process.exit(1);
    }

    // Clean up backup
    log("\n7. Cleaning up...");
    rmSync(backupPath, { recursive: true, force: true });
    log(`   Removed ${backupName}`);
  }

  log("\n========================================");
  log("Repair complete. Repository is healthy.");
  log("========================================");

  if (hasChanges) {
    log("\nNote: Your uncommitted changes are still in the working tree.");
    log("Run 'git status' to review and commit them.");
  }
}

main().catch(e => {
  error(`Fatal: ${e.message}`);
  process.exit(1);
});
