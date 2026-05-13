#!/usr/bin/env node
// tier: T0
/**
 * leave-a-copy-behind-guard.mjs — Stop hook
 *
 * Prevents files from being moved/deleted without leaving a copy at the
 * original location. Born from the U-WIRE12 incident where engine files
 * were lost in a branch-fork "clean tree" rebuild because nothing enforced
 * "if you move a file, leave a copy behind". Result: 4 engines + 2 schemas
 * stranded across branches, ~3 hours of debug + recovery.
 *
 * Contract:
 *   - On Stop, scan working tree for tracked files that are deleted (D) or
 *     renamed (R) compared to HEAD.
 *   - For each, check whether a copy still exists on disk at the original
 *     path (i.e. user copied the file before deleting/renaming).
 *   - If ANY tracked file is missing from disk without a copy at its
 *     original path → BLOCK the Stop with a detailed reason.
 *   - Allowlist at state/shared/file-relocation-allowlist.json lets the
 *     user mark specific paths or glob patterns as intentional removals
 *     (deprecated assets, regenerated state files, etc).
 *
 * Block contract (Stop hook):
 *   {decision: "block", reason: "..."} → Claude Code will not let the
 *   session end until either (a) the file is restored, (b) added to the
 *   allowlist, or (c) the bypass env var is set (BYPASS_LEAVE_COPY=1).
 *
 * Trigger: Stop event (session end)
 *
 * @milestone META-FIX/CAMX-MS22-U01-AND-U-WIRE12-RECOVERY
 * @date 2026-04-29
 */

import { execFileSync } from "node:child_process";
import { existsSync, readFileSync } from "node:fs";
import { resolve, isAbsolute } from "node:path";

const ALLOWLIST_PATH = "H:/prism/state/shared/file-relocation-allowlist.json";
const REPO_ROOT_DEFAULT = process.cwd();
const BYPASS_ENV = "BYPASS_LEAVE_COPY";
const MAX_REPORTED = 10;

function readStdinSafe() {
  try {
    if (process.stdin.isTTY) return "";
    return readFileSync(0, "utf-8");
  } catch {
    return "";
  }
}

function readJsonSafe(p) {
  try {
    return JSON.parse(readFileSync(p, "utf-8"));
  } catch {
    return null;
  }
}

function findRepoRoot(startDir) {
  try {
    const out = execFileSync("git", ["rev-parse", "--show-toplevel"], {
      cwd: startDir,
      encoding: "utf-8",
      stdio: ["ignore", "pipe", "ignore"],
    });
    return out.trim() || startDir;
  } catch {
    return startDir;
  }
}

function gitStatusPorcelain(repoRoot) {
  try {
    const out = execFileSync("git", ["status", "--porcelain=v1", "-z"], {
      cwd: repoRoot,
      encoding: "buffer",
      stdio: ["ignore", "pipe", "ignore"],
      maxBuffer: 64 * 1024 * 1024,
    });
    return out.toString("utf-8");
  } catch {
    return "";
  }
}

/**
 * Parse `git status --porcelain=v1 -z` output into entries.
 * The -z form is NUL-delimited; renames produce two NUL-separated fields
 * (newPath\0oldPath\0) so we walk byte-by-byte rather than splitting lines.
 */
function parseStatus(output) {
  const entries = [];
  if (!output) return entries;
  const tokens = output.split("\0");
  // Last token is empty (trailing NUL)
  let i = 0;
  while (i < tokens.length) {
    const tok = tokens[i];
    if (!tok || tok.length < 3) { i++; continue; }
    const xy = tok.slice(0, 2);
    const path = tok.slice(3);
    const x = xy[0], y = xy[1];
    // Renames / copies have a second token = original path
    if (x === "R" || x === "C" || y === "R" || y === "C") {
      const origPath = tokens[i + 1] || "";
      entries.push({ status: xy, newPath: path, origPath });
      i += 2;
      continue;
    }
    entries.push({ status: xy, newPath: path, origPath: path });
    i++;
  }
  return entries;
}

function loadAllowlist() {
  const data = readJsonSafe(ALLOWLIST_PATH);
  if (!data || typeof data !== "object") return { exact: new Set(), patterns: [] };
  const exact = new Set(Array.isArray(data.exact) ? data.exact : []);
  const patterns = Array.isArray(data.patterns)
    ? data.patterns.map((p) => {
        try { return new RegExp(p); } catch { return null; }
      }).filter(Boolean)
    : [];
  return { exact, patterns };
}

function isAllowlisted(p, { exact, patterns }) {
  const normalized = p.replace(/\\/g, "/");
  if (exact.has(normalized) || exact.has(p)) return true;
  return patterns.some((re) => re.test(normalized));
}

function fileExistsAt(repoRoot, relPath) {
  const abs = isAbsolute(relPath) ? relPath : resolve(repoRoot, relPath);
  return existsSync(abs);
}

function findViolations(repoRoot) {
  const status = gitStatusPorcelain(repoRoot);
  const entries = parseStatus(status);
  const allowlist = loadAllowlist();
  const violations = [];

  for (const e of entries) {
    const isDeleted = e.status[0] === "D" || e.status[1] === "D";
    const isRenamed = e.status[0] === "R" || e.status[1] === "R";
    if (!isDeleted && !isRenamed) continue;

    // The original path (where the file used to live) is the location we
    // want a copy at. For deletions, origPath === newPath. For renames,
    // origPath !== newPath and we need a copy to remain at origPath.
    const origPath = e.origPath;
    if (isAllowlisted(origPath, allowlist)) continue;

    // If the file still exists on disk at its original path, the move
    // left a copy behind → no violation.
    if (fileExistsAt(repoRoot, origPath)) continue;

    violations.push({
      kind: isRenamed ? "rename" : "delete",
      origPath,
      newPath: e.newPath,
      status: e.status,
    });
  }
  return violations;
}

function formatBlockReason(violations, repoRoot) {
  const lines = [];
  lines.push("🚫 LEAVE-A-COPY-BEHIND VIOLATION — Stop blocked");
  lines.push("");
  lines.push(`Repo: ${repoRoot}`);
  lines.push(`${violations.length} file(s) moved/deleted without leaving a copy at the original location.`);
  lines.push("");
  lines.push("This rule prevents silent file loss across branch forks (the U-WIRE12");
  lines.push("incident: 4 engines + 2 schemas stranded; ~3 hours of debug + recovery).");
  lines.push("");
  lines.push("Violations (first 10):");
  for (const v of violations.slice(0, MAX_REPORTED)) {
    if (v.kind === "rename") {
      lines.push(`  RENAMED:  ${v.origPath}  →  ${v.newPath}  (no copy left at origin)`);
    } else {
      lines.push(`  DELETED:  ${v.origPath}  (no copy on disk)`);
    }
  }
  if (violations.length > MAX_REPORTED) {
    lines.push(`  ... and ${violations.length - MAX_REPORTED} more`);
  }
  lines.push("");
  lines.push("To unblock, choose ONE:");
  lines.push("  1. Restore the file at its original path (cp from peer worktree, git checkout, etc).");
  lines.push("  2. Append the path to the allowlist if removal is intentional:");
  lines.push(`     ${ALLOWLIST_PATH}`);
  lines.push('     {"exact": ["mcp-server/path/to/file.ts"], "patterns": ["^state/derived/.*\\\\.json$"]}');
  lines.push(`  3. Set ${BYPASS_ENV}=1 for a single-shot exception (escape hatch).`);
  lines.push("");
  lines.push("Why this rule exists: PRISM is safety-critical (G-code → real iron). A");
  lines.push("file silently lost in a branch is exactly the kind of latent fault that");
  lines.push("bites at 3am. Leave the copy. The 4-byte allowlist entry is cheap.");
  return lines.join("\n");
}

async function main() {
  // Bypass env: explicit single-shot escape hatch
  if (process.env[BYPASS_ENV] === "1") {
    process.stdout.write(JSON.stringify({ continue: true }) + "\n");
    return;
  }

  const raw = readStdinSafe();
  let payload = {};
  try { payload = raw ? JSON.parse(raw) : {}; } catch { /* ignore */ }

  // Stop hook only — ignore other event kinds
  const eventName = payload.hook_event_name || payload.hookEventName || "";
  if (eventName && eventName !== "Stop") {
    process.stdout.write(JSON.stringify({ continue: true }) + "\n");
    return;
  }

  // Resolve repo root: prefer payload cwd, fall back to process cwd, then git
  const cwd = payload.cwd || REPO_ROOT_DEFAULT;
  const repoRoot = findRepoRoot(cwd);

  const violations = findViolations(repoRoot);
  if (violations.length === 0) {
    process.stdout.write(JSON.stringify({ continue: true }) + "\n");
    return;
  }

  process.stdout.write(JSON.stringify({
    decision: "block",
    reason: formatBlockReason(violations, repoRoot),
  }) + "\n");
}

main().catch(() => {
  // Fail open — never deadlock the session on a hook bug
  process.stdout.write(JSON.stringify({ continue: true }) + "\n");
});
