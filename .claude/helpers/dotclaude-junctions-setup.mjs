#!/usr/bin/env node
/**
 * dotclaude-junctions-setup.mjs — Per-subfolder junctions: ~/.claude/<dir> → H:\.claude\<dir>.
 *
 * Replaces the periodic sync with zero-drift junctions. Each shareable subfolder under
 * C:\Users\<user>\.claude\ becomes a directory junction to H:\.claude\<subfolder>. After
 * setup, ~/.claude/<dir> and H:\.claude\<dir> are LITERALLY the same folder — no sync
 * needed, no drift possible.
 *
 * Idempotent — safe to run multiple times. Per-subfolder granularity means partial
 * runs (e.g. if one junction fails) don't leave the tree broken.
 *
 * PC-specific content (cache/, todos/, settings.json, .mcp.json,
 * settings.local.json) is NOT touched — stays on C: per PC.
 *
 * NOTE: `projects/` IS junctioned so /resume sessions follow the H: drive
 * across PCs. The setup uses robocopy /XC /XN /XO (merge without overwrite),
 * so each PC's existing session JSONLs accumulate on H: rather than being
 * lost when the junction is created.
 *
 * Usage: node H:\PRISM\.claude\helpers\dotclaude-junctions-setup.mjs [--dry-run]
 *
 * CRITICAL: ALL Claude Code sessions must be closed before running. This script
 *   touches the same folders your current Claude Code process has open.
 */

import { execFileSync, spawnSync } from "node:child_process";
import { existsSync, lstatSync, readlinkSync, renameSync, mkdirSync, readdirSync, statSync } from "node:fs";
import { join, dirname, basename } from "node:path";
import { homedir } from "node:os";

// Subfolders to junction ~/.claude/<dir> → H:\.claude\<dir>.
// Only user-authored/shareable content. Excludes PC-specific state.
const JUNCTION_DIRS = [
  "commands",   // slash commands
  "agents",     // agent definitions
  "hooks",      // hook scripts
  "skills",     // skills
  "rules",      // rules
  "plans",      // plans (plan mode outputs)
  "plugins",    // Claude Code plugins
  "helpers",    // helper scripts
  "bin",        // portable tool wrappers (python.cmd etc)
  "projects",   // /resume session JSONLs — shared so chats follow the H: drive across PCs
];

// NEVER junction these — they're inherently PC-specific.
const PC_SPECIFIC = new Set([
  "cache", "todos", "statsig", "shell-snapshots",
  "ide", "backups", "global-rules-backup", "worktrees", "skills-archived",
  "settings.json", "settings.local.json", ".mcp.json",
  "CLAUDE.md", "__claude-code-router", "config.json",
]);

const args = process.argv.slice(2);
const dryRun = args.includes("--dry-run");

const C_ROOT = join(homedir(), ".claude");
const H_ROOT = "H:\\.claude";

function info(msg) { process.stdout.write(msg + "\n"); }
function die(msg, code = 1) { process.stderr.write(`ERROR: ${msg}\n`); process.exit(code); }

function norm(p) {
  return String(p).replace(/^\\\\\?\\/, "").replace(/\/+/g, "\\").replace(/\\+$/, "").toLowerCase();
}

function isJunctionTo(path, expectedTarget) {
  try {
    const st = lstatSync(path);
    if (!st.isSymbolicLink()) return { is: false, reason: "not a junction" };
    const link = readlinkSync(path);
    if (norm(link) === norm(expectedTarget)) return { is: true, link };
    return { is: false, reason: `points to "${link}", expected "${expectedTarget}"`, link };
  } catch (e) {
    return { is: false, reason: `lstat failed: ${e.message}` };
  }
}

function claudeCodeRunning() {
  // Check for claude.exe and node.exe processes with "claude-code" in path
  const r = spawnSync("tasklist", ["/FI", "IMAGENAME eq claude.exe", "/NH"], { windowsHide: true, encoding: "utf8" });
  return r.status === 0 && /claude\.exe/i.test(r.stdout);
}

function robocopyMerge(src, dst) {
  info(`    robocopy  "${src}"  →  "${dst}"  (merge, /XC /XN /XO skips existing)`);
  if (dryRun) return;
  // /E = recurse incl empty; /XC /XN /XO = skip changed/newer/older existing
  //   (i.e. only copy files that don't exist on dst — merge without overwrite)
  const r = spawnSync("robocopy", [
    src, dst, "/E", "/XC", "/XN", "/XO",
    "/R:2", "/W:2", "/XJ", "/NP", "/NFL", "/NDL",
  ], { windowsHide: true, encoding: "utf8" });
  if (r.status == null || r.status >= 8) {
    die(`robocopy failed (exit ${r.status}). Output:\n${(r.stdout || "") + (r.stderr || "")}`);
  }
}

function backupAndJunction(subdir) {
  const cPath = join(C_ROOT, subdir);
  const hPath = join(H_ROOT, subdir);

  // Ensure H: target exists (mkdir if not — happens on a fresh PC).
  if (!existsSync(hPath)) {
    info(`    H: target doesn't exist — creating ${hPath}`);
    if (!dryRun) mkdirSync(hPath, { recursive: true });
  }

  // Idempotency: already correctly junctioned.
  const already = isJunctionTo(cPath, hPath);
  if (already.is) {
    info(`  [skip] ${subdir}  already junctioned → ${already.link}`);
    return { subdir, action: "already_junctioned" };
  }

  // C path exists and is a real folder (not junction or wrong junction) — merge into H: then replace.
  if (existsSync(cPath)) {
    const stat = lstatSync(cPath);
    if (stat.isSymbolicLink()) {
      // Wrong junction target — just remove it and recreate. Underlying data safe on H:.
      info(`  [fix ] ${subdir}  wrong junction target, re-pointing`);
      if (!dryRun) {
        const r = spawnSync("cmd.exe", ["/c", "rmdir", cPath], { windowsHide: true, encoding: "utf8" });
        if (r.status !== 0) die(`rmdir junction failed for ${cPath}: ${r.stderr}`);
      }
    } else {
      info(`  [fix ] ${subdir}  real folder on C: — merging into H: + backing up`);
      robocopyMerge(cPath, hPath);
      const ts = new Date().toISOString().replace(/[-:T.]/g, "").slice(0, 15);
      const backupPath = `${cPath}.pre-junction-${ts.slice(0,8)}-${ts.slice(9,15)}`;
      info(`           rename  "${cPath}"  →  "${backupPath}"`);
      if (!dryRun) renameSync(cPath, backupPath);
    }
  }

  // Create junction.
  info(`  [link] ${subdir}  mklink /J  "${cPath}"  "${hPath}"`);
  if (!dryRun) {
    const r = spawnSync("cmd.exe", ["/c", "mklink", "/J", cPath, hPath], { windowsHide: true, encoding: "utf8" });
    if (r.status !== 0) die(`mklink failed for ${cPath}: ${r.stderr || r.stdout}`);
  }

  // Verify.
  if (!dryRun) {
    const verify = isJunctionTo(cPath, hPath);
    if (!verify.is) die(`Verification failed for ${subdir}: ${verify.reason}`);
  }

  return { subdir, action: "junctioned" };
}

function main() {
  info("=== ~/.claude Per-Subfolder Junctions ===");
  info(`  C: root: ${C_ROOT}`);
  info(`  H: root: ${H_ROOT}`);
  info(`  Targets: ${JUNCTION_DIRS.join(", ")}`);
  if (dryRun) info("  [DRY RUN] no filesystem changes will be made");
  info("");

  if (!existsSync(C_ROOT)) die(`~/.claude does not exist: ${C_ROOT}`);
  if (!existsSync(H_ROOT)) {
    info(`  H: root doesn't exist — creating ${H_ROOT}`);
    if (!dryRun) mkdirSync(H_ROOT, { recursive: true });
  }

  if (!dryRun && claudeCodeRunning()) {
    info("WARNING: claude.exe processes detected in tasklist.");
    info("  This script touches folders your current Claude Code session may have open.");
    info("  If you're running this FROM INSIDE a Claude Code session, that's expected —");
    info("  but close any OTHER Claude Code sessions (Windows + Desktop) before continuing.");
    info("  Press Ctrl+C to abort, or wait 5 seconds to continue...");
    // Don't hard-block — user may be running this from a session intentionally.
    const deadline = Date.now() + 5000;
    while (Date.now() < deadline) { /* spin briefly */ }
  }

  const results = [];
  for (const subdir of JUNCTION_DIRS) {
    try {
      results.push(backupAndJunction(subdir));
    } catch (e) {
      results.push({ subdir, action: "error", error: e.message });
      info(`  [FAIL] ${subdir}  ${e.message}`);
    }
  }

  info("");
  info("=== Summary ===");
  const counts = { already_junctioned: 0, junctioned: 0, error: 0 };
  for (const r of results) counts[r.action] = (counts[r.action] || 0) + 1;
  info(`  already_junctioned: ${counts.already_junctioned}`);
  info(`  junctioned (new):   ${counts.junctioned}`);
  info(`  errors:             ${counts.error}`);
  if (counts.error > 0) {
    info("");
    info("  Errors (review before continuing):");
    for (const r of results) if (r.action === "error") info(`    ${r.subdir}: ${r.error}`);
    process.exit(1);
  }
  info(`  Status: ✓ all junctions in place${dryRun ? " (dry run — no changes made)" : ""}`);
}

try { main(); } catch { process.stdout.write(JSON.stringify({ continue: true })); }
