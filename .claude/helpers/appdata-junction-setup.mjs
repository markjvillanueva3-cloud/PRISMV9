#!/usr/bin/env node
/**
 * appdata-junction-setup.mjs — Redirect %APPDATA%\Claude to H: via directory junction.
 *
 * One-time, idempotent. Runs on either PC; picks H: target by username.
 *   Mark Villanueva  →  H:\Claude
 *   wompus           →  H:\Claude (CUserswompuAppData)
 *
 * Flow: guard (Desktop closed) → idempotency check → robocopy C:→H: → backup C: → mklink /J → verify.
 *
 * Usage: node H:\PRISM\.claude\helpers\appdata-junction-setup.mjs [--dry-run]
 */

import { execFileSync, spawnSync } from "node:child_process";
import { existsSync, lstatSync, readlinkSync, renameSync } from "node:fs";
import { basename, join } from "node:path";

// Keyed by basename(%USERPROFILE%) — $USERNAME gets truncated at whitespace
// in some Windows shells (observed: "Mark V" instead of "Mark Villanueva").
const USER_TO_H_TARGET = {
  "Mark Villanueva": "H:\\Claude (cusersmarkvillanueva)",
  "wompus":          "H:\\Claude (CUserswompuAppData)",
};

function detectUser() {
  const up = process.env.USERPROFILE;
  if (up) return basename(up);
  return process.env.USERNAME || process.env.USER || "";
}

const args = process.argv.slice(2);
const dryRun = args.includes("--dry-run");

function die(msg, code = 1) {
  process.stderr.write(`ERROR: ${msg}\n`);
  process.exit(code);
}

function info(msg) { process.stdout.write(msg + "\n"); }

function detectTarget() {
  const user = detectUser();
  if (!user) die("Cannot detect user — neither USERPROFILE nor USERNAME is set.");
  const target = USER_TO_H_TARGET[user];
  if (!target) {
    die(`Unrecognized user "${user}". Known: ${Object.keys(USER_TO_H_TARGET).join(", ")}. Add entry to USER_TO_H_TARGET.`);
  }
  const appData = process.env.APPDATA;
  if (!appData) die("APPDATA env var not set.");
  const cSource = join(appData, "Claude");
  return { user, cSource, hTarget: target };
}

function claudeDesktopRunning() {
  const r = spawnSync("tasklist", ["/FI", "IMAGENAME eq claude.exe", "/NH"], { windowsHide: true, encoding: "utf8" });
  if (r.status !== 0) return false;
  return /claude\.exe/i.test(r.stdout);
}

function isJunctionTo(pathStr, expectedTarget) {
  try {
    const st = lstatSync(pathStr);
    if (!st.isSymbolicLink()) return { is: false, reason: "not a junction/symlink" };
    let link;
    try { link = readlinkSync(pathStr); } catch (e) { return { is: false, reason: `readlink failed: ${e.message}` }; }
    const norm = s => s.replace(/\\\\\?\\/, "").replace(/\/+/g, "\\").replace(/\\+$/, "").toLowerCase();
    if (norm(link) === norm(expectedTarget)) return { is: true, link };
    return { is: false, reason: `junction points to "${link}", expected "${expectedTarget}"`, link };
  } catch (e) {
    return { is: false, reason: `lstat failed: ${e.message}` };
  }
}

function runRobocopy(src, dst) {
  info(`  robocopy "${src}" "${dst}" /MIR ...`);
  if (dryRun) { info("  [dry-run] skipped"); return; }
  const r = spawnSync("robocopy", [
    src, dst, "/MIR", "/DCOPY:DAT", "/COPY:DAT",
    "/R:2", "/W:2", "/XJ", "/NP", "/NFL", "/NDL",
  ], { windowsHide: true, encoding: "utf8" });
  // robocopy exit codes: 0–7 are success variants; 8+ are errors.
  if (r.status == null || r.status >= 8) {
    die(`robocopy failed (exit ${r.status}). stderr:\n${r.stderr || "(empty)"}\nstdout tail:\n${(r.stdout || "").slice(-500)}`);
  }
  const last = (r.stdout || "").trim().split(/\r?\n/).slice(-6).join("\n");
  info(`  robocopy ok (exit ${r.status}). Summary:\n${last}`);
}

function backupCSource(cSource) {
  const ts = new Date().toISOString().replace(/[-:T]/g, "").slice(0, 15); // YYYYMMDDTHHMMSS → 20260421T143022
  const backup = `${cSource}.pre-junction-backup-${ts.slice(0, 8)}-${ts.slice(9, 15)}`;
  info(`  rename  "${cSource}"  →  "${backup}"`);
  if (!dryRun) renameSync(cSource, backup);
  return backup;
}

function makeJunction(cSource, hTarget) {
  info(`  mklink /J  "${cSource}"  "${hTarget}"`);
  if (dryRun) return;
  const r = spawnSync("cmd.exe", ["/c", "mklink", "/J", cSource, hTarget], { windowsHide: true, encoding: "utf8" });
  if (r.status !== 0) {
    die(`mklink failed (exit ${r.status}). stderr: ${r.stderr}\nstdout: ${r.stdout}`);
  }
}

function main() {
  info("=== AppData Junction Setup ===");
  const { user, cSource, hTarget } = detectTarget();
  info(`  user:     ${user}`);
  info(`  C source: ${cSource}`);
  info(`  H target: ${hTarget}`);

  if (!existsSync(hTarget)) {
    die(`H: target does not exist: ${hTarget}\nCopy Claude AppData to that path first, or mount H: drive.`);
  }

  // Idempotency: if already correctly junctioned, exit 0.
  const already = isJunctionTo(cSource, hTarget);
  if (already.is) {
    info(`  Status: ✓ already configured (junction → ${already.link}). No action needed.`);
    return;
  }

  if (claudeDesktopRunning()) {
    die("Claude Desktop is running (claude.exe found in tasklist).\nQuit Claude Desktop fully (system tray → Quit) before running this script.\nRunning with open file handles risks IndexedDB/LocalStorage corruption.");
  }

  // If C source exists but is not a junction, or is a junction pointing elsewhere, we need to swap.
  if (existsSync(cSource)) {
    runRobocopy(cSource, hTarget);
    const backup = backupCSource(cSource);
    info(`  Source backup: ${backup}`);
  } else {
    info(`  C source does not exist — skipping robocopy + backup, creating junction directly.`);
  }

  makeJunction(cSource, hTarget);

  // Verify.
  const verify = isJunctionTo(cSource, hTarget);
  if (!verify.is) die(`Verification failed: ${verify.reason}`);

  info(`  Status: ✓ junction created, Claude Desktop safe to launch.`);
}

main().catch(() => { process.stdout.write(JSON.stringify({ continue: true })); });
