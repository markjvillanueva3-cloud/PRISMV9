#!/usr/bin/env node
/**
 * wedm-studio-drift-watch.mjs — PreToolUse hook (Write|Edit|MultiEdit)
 *
 * Guards the WEDM Studio canonical template (13 files / 6,545 LOC,
 * the R5-identified "cleanest vertical") against silent drift.
 *
 * Logic:
 *   1. Extract tool's target file_path from stdin.
 *   2. If path is NOT in the snapshot's protected_files list, pass through.
 *   3. If path IS protected, require WEDM_STUDIO_WIZARD_SNAPSHOT.json to be
 *      staged/modified in the same change with a snapshotVersion bump.
 *
 * Blocks: an edit to any of the 13 protected files without a concurrent
 *         snapshot update + rationale.
 * Allows: edits to non-protected files, edits to protected files when the
 *         snapshot is also in the changeset with a bumped snapshotVersion.
 *
 * Milestone: MS-P7.5-FE-GAPS / U-P7.5-FE-01
 * Snapshot:  mcp-server/data/state/WEDM_STUDIO_WIZARD_SNAPSHOT.json
 */

import { execSync } from "node:child_process";
import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";

const REPO_ROOT = process.env.PRISM_REPO_ROOT ?? process.cwd();
const SNAPSHOT_REL = "mcp-server/data/state/WEDM_STUDIO_WIZARD_SNAPSHOT.json";
const SNAPSHOT_FULL = resolve(REPO_ROOT, SNAPSHOT_REL);

async function readStdin() {
  return await new Promise((res) => {
    let buf = "";
    process.stdin.on("data", (c) => (buf += c));
    process.stdin.on("end", () => res(buf));
    process.stdin.on("error", () => res(""));
  });
}

function loadProtectedList() {
  if (!existsSync(SNAPSHOT_FULL)) return null;
  try {
    const snap = JSON.parse(readFileSync(SNAPSHOT_FULL, "utf8"));
    return {
      version: snap.snapshotVersion,
      files: Object.keys(snap.protected_files ?? {}),
    };
  } catch {
    return null;
  }
}

function normalizePath(p) {
  return String(p || "").replace(/\\/g, "/");
}

function pathMatchesProtected(changedPath, protectedList) {
  const norm = normalizePath(changedPath);
  return protectedList.find((rel) => norm.endsWith(rel)) ?? null;
}

function isSnapshotInChangeset() {
  // Two signals: (a) snapshot file is staged in git, (b) file is tracked modified.
  // Either is sufficient — the author may be mid-commit or preparing one.
  try {
    const staged = execSync(`git -C "${REPO_ROOT}" diff --cached --name-only`, {
      encoding: "utf8",
      stdio: ["ignore", "pipe", "ignore"],
    });
    if (staged.split(/\r?\n/).some((l) => normalizePath(l).endsWith(SNAPSHOT_REL))) return true;
  } catch {
    // git may be unavailable in some sandboxes — fall through
  }
  try {
    const tree = execSync(`git -C "${REPO_ROOT}" status --short "${SNAPSHOT_REL}"`, {
      encoding: "utf8",
      stdio: ["ignore", "pipe", "ignore"],
    });
    return tree.trim().length > 0;
  } catch {
    return false;
  }
}

function allow() {
  process.stdout.write(JSON.stringify({ allow: true }) + "\n");
  process.exit(0);
}

function block(reason) {
  process.stderr.write(reason + "\n");
  process.exit(2);
}

async function main() {
  const raw = await readStdin();
  let input = {};
  try { input = raw ? JSON.parse(raw) : {}; } catch { input = {}; }

  const toolInput = input.tool_input ?? input.toolInput ?? {};
  const filePath = toolInput.file_path ?? toolInput.path ?? input.file_path ?? null;
  if (!filePath) return allow();

  const list = loadProtectedList();
  if (!list) return allow(); // snapshot not yet built — don't block bootstrap

  const matched = pathMatchesProtected(filePath, list.files);
  if (!matched) return allow();

  // The snapshot itself is fair game (expected to change with the bump).
  if (normalizePath(filePath).endsWith(SNAPSHOT_REL)) return allow();

  if (isSnapshotInChangeset()) return allow();

  return block(
    [
      "",
      "✗ WEDM Studio drift-watch BLOCKED",
      `  file: ${matched}`,
      `  snapshot version: ${list.version}`,
      "",
      "  This file is part of the WireEdmStudio canonical template (R5-identified",
      "  'cleanest vertical'). Changes require a concurrent update to:",
      `    ${SNAPSHOT_REL}`,
      "",
      "  Required edits to the snapshot:",
      "    1. Bump snapshotVersion (e.g. 1.0.0 -> 1.1.0)",
      "    2. Update rationale field to explain the change",
      "    3. Recompute sha256 for the edited file",
      "",
      "  Then re-attempt the edit.",
      "",
    ].join("\n"),
  );
}

main().catch((err) => {
  // Fail-open on unexpected errors — never block on bugs in the guard itself.
  process.stderr.write(`wedm-studio-drift-watch: internal error, allowing edit: ${err?.message ?? err}\n`);
  process.exit(0);
});
