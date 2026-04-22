#!/usr/bin/env node
/**
 * migrate-to-h-drive.mjs — Migration script
 *
 * Migrates user-authored content from C:\Users\*\.claude\ to H:\.claude\
 * for drive-swap portability. Compares timestamps and keeps newer versions.
 *
 * Usage: node migrate-to-h-drive.mjs [--dry-run] [--force]
 *   --dry-run: Show what would be done without making changes
 *   --force: Overwrite H: even if C: is older (use with caution)
 */

import { readdirSync, existsSync, statSync, copyFileSync, unlinkSync, mkdirSync } from "node:fs";
import { join, basename } from "node:path";
import { homedir } from "node:os";

const USER_AUTHORED_DIRS = ["commands", "agents", "hooks", "skills", "rules", "plans"];
const HOOKIFY_PATTERN = /^hookify[.\-].*\.local\.md$/;

const cClaudeDir = join(homedir(), ".claude");
const hClaudeDir = "H:\\.claude";

const args = process.argv.slice(2);
const dryRun = args.includes("--dry-run");
const force = args.includes("--force");

function scanDir(dir) {
  try {
    if (!existsSync(dir)) return [];
    const stat = statSync(dir);
    if (!stat.isDirectory()) return [];
    return readdirSync(dir).filter(f => !f.startsWith("."));
  } catch {
    return [];
  }
}

function getMtime(path) {
  try {
    return statSync(path).mtimeMs;
  } catch {
    return 0;
  }
}

function migrate() {
  const actions = [];

  // Migrate subdirectories
  for (const subdir of USER_AUTHORED_DIRS) {
    const cPath = join(cClaudeDir, subdir);
    const hPath = join(hClaudeDir, subdir);

    if (!existsSync(cPath)) continue;

    // Ensure H: target exists
    if (!existsSync(hPath)) {
      actions.push({ type: "mkdir", path: hPath });
      if (!dryRun) {
        mkdirSync(hPath, { recursive: true });
      }
    }

    const cFiles = scanDir(cPath);

    for (const file of cFiles) {
      const cFullPath = join(cPath, file);
      const hFullPath = join(hPath, file);

      // Skip directories (handle separately if needed)
      try {
        if (statSync(cFullPath).isDirectory()) continue;
      } catch {
        continue;
      }

      const cMtime = getMtime(cFullPath);
      const hMtime = getMtime(hFullPath);

      if (!existsSync(hFullPath)) {
        // H: doesn't have it — copy from C:
        actions.push({ type: "copy", from: cFullPath, to: hFullPath, reason: "missing on H:" });
        if (!dryRun) {
          copyFileSync(cFullPath, hFullPath);
        }
        actions.push({ type: "delete", path: cFullPath });
        if (!dryRun) {
          unlinkSync(cFullPath);
        }
      } else if (cMtime > hMtime || force) {
        // C: is newer (or force) — overwrite H:
        const reason = force ? "forced" : "C: is newer";
        actions.push({ type: "overwrite", from: cFullPath, to: hFullPath, reason });
        if (!dryRun) {
          copyFileSync(cFullPath, hFullPath);
        }
        actions.push({ type: "delete", path: cFullPath });
        if (!dryRun) {
          unlinkSync(cFullPath);
        }
      } else {
        // H: is same or newer — just delete C:
        actions.push({ type: "delete", path: cFullPath, reason: "H: is up-to-date" });
        if (!dryRun) {
          unlinkSync(cFullPath);
        }
      }
    }
  }

  // Migrate hookify files at root level
  const cRootFiles = scanDir(cClaudeDir).filter(f => HOOKIFY_PATTERN.test(f));
  for (const file of cRootFiles) {
    const cFullPath = join(cClaudeDir, file);
    const hFullPath = join(hClaudeDir, file);

    const cMtime = getMtime(cFullPath);
    const hMtime = getMtime(hFullPath);

    if (!existsSync(hFullPath)) {
      actions.push({ type: "copy", from: cFullPath, to: hFullPath, reason: "missing on H:" });
      if (!dryRun) {
        copyFileSync(cFullPath, hFullPath);
      }
      actions.push({ type: "delete", path: cFullPath });
      if (!dryRun) {
        unlinkSync(cFullPath);
      }
    } else if (cMtime > hMtime || force) {
      const reason = force ? "forced" : "C: is newer";
      actions.push({ type: "overwrite", from: cFullPath, to: hFullPath, reason });
      if (!dryRun) {
        copyFileSync(cFullPath, hFullPath);
      }
      actions.push({ type: "delete", path: cFullPath });
      if (!dryRun) {
        unlinkSync(cFullPath);
      }
    } else {
      actions.push({ type: "delete", path: cFullPath, reason: "H: is up-to-date" });
      if (!dryRun) {
        unlinkSync(cFullPath);
      }
    }
  }

  return actions;
}

// Run migration
console.log(`\n=== H: Drive Migration ${dryRun ? "(DRY RUN)" : ""} ===\n`);

const actions = migrate();

if (actions.length === 0) {
  console.log("No migration needed. C: drive is clean.");
} else {
  const copies = actions.filter(a => a.type === "copy").length;
  const overwrites = actions.filter(a => a.type === "overwrite").length;
  const deletes = actions.filter(a => a.type === "delete").length;
  const mkdirs = actions.filter(a => a.type === "mkdir").length;

  console.log(`Actions ${dryRun ? "to take" : "taken"}:`);
  if (mkdirs > 0) console.log(`  - Created ${mkdirs} directories`);
  if (copies > 0) console.log(`  - Copied ${copies} files (new on H:)`);
  if (overwrites > 0) console.log(`  - Overwrote ${overwrites} files (C: was newer)`);
  if (deletes > 0) console.log(`  - Deleted ${deletes} files from C:`);

  console.log("\nDetails:");
  for (const action of actions) {
    if (action.type === "copy" || action.type === "overwrite") {
      console.log(`  ${action.type.toUpperCase()}: ${action.from} → ${action.to} (${action.reason})`);
    } else if (action.type === "delete") {
      console.log(`  DELETE: ${action.path}${action.reason ? ` (${action.reason})` : ""}`);
    } else if (action.type === "mkdir") {
      console.log(`  MKDIR: ${action.path}`);
    }
  }
}

console.log("\n=== Migration Complete ===\n");
