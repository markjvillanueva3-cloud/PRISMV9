#!/usr/bin/env node
// tier: T4
/**
 * appdata-junction-guard.mjs — SessionStart enforcement for the AppData→H: junction.
 *
 * Runs on every Claude Code SessionStart (wired via H:\PRISM\.claude\settings.json).
 * All 5 checks must pass or the hook exits 1 (continueOnError:false → session aborts).
 *
 * Read-only: never mutates filesystem. Only appends to a drift log on failure.
 * Pair with: H:\PRISM\.claude\helpers\appdata-junction-setup.mjs (creates the junction).
 */

import { appendFileSync, existsSync, lstatSync, mkdirSync, readlinkSync, statSync } from "node:fs";
import { basename, dirname, join } from "node:path";

// Keyed by the basename of %USERPROFILE% (i.e. the C:\Users\<name> folder),
// which is the only reliable Windows identity — $USERNAME gets truncated at
// whitespace in some shells (observed: "Mark V" instead of "Mark Villanueva").
const USER_TO_H_TARGET = {
  "Mark Villanueva": "H:\\Claude (cusersmarkvillanueva)",
  "wompus":          "H:\\Claude (CUserswompuAppData)",
};

function detectUser() {
  const up = process.env.USERPROFILE;
  if (up) return basename(up);
  return process.env.USERNAME || process.env.USER || "";
}

const DRIFT_LOG = "H:\\PRISM\\mcp-server\\data\\state\\appdata-junction-drift.jsonl";
const REMEDIATION = "Run: node H:\\PRISM\\.claude\\helpers\\appdata-junction-setup.mjs";

function normPath(s) {
  return String(s).replace(/^\\\\\?\\/, "").replace(/\/+/g, "\\").replace(/\\+$/, "").toLowerCase();
}

function logDrift(record) {
  try {
    mkdirSync(dirname(DRIFT_LOG), { recursive: true });
    appendFileSync(DRIFT_LOG, JSON.stringify({ ts: new Date().toISOString(), ...record }) + "\n");
  } catch {
    // Drift log failure is non-fatal; the session-blocking exit is what matters.
  }
}

function fail(check, details) {
  logDrift({ user: detectUser(), check_failed: check, details });
  process.stderr.write(`\n✗ AppData junction guard FAILED (${check})\n`);
  process.stderr.write(`  ${details}\n`);
  process.stderr.write(`  Remediation: ${REMEDIATION}\n\n`);
  process.exit(1);
}

function main() {
  // Check 1: user identity recognized.
  const user = detectUser();
  if (!user) fail("user_missing", "Cannot detect user — neither USERPROFILE nor USERNAME is set.");
  const hTarget = USER_TO_H_TARGET[user];
  if (!hTarget) {
    fail("user_unknown",
      `User "${user}" not mapped. Known: ${Object.keys(USER_TO_H_TARGET).join(", ")}. ` +
      `Add it to USER_TO_H_TARGET in both appdata-junction-guard.mjs and appdata-junction-setup.mjs.`);
  }

  // Check 2: C source path exists (as junction, not regressed to real folder absence).
  const appData = process.env.APPDATA;
  if (!appData) fail("appdata_env_missing", "APPDATA env var not set.");
  const cSource = join(appData, "Claude");
  if (!existsSync(cSource)) {
    fail("c_source_missing",
      `${cSource} does not exist. Claude Desktop will fail to start. Setup may not have run yet.`);
  }

  // Check 3: C source is a junction/symlink (not a real directory that regressed).
  let st;
  try { st = lstatSync(cSource); }
  catch (e) { fail("lstat_error", `lstat("${cSource}") failed: ${e.message}`); }
  if (!st.isSymbolicLink()) {
    fail("not_a_junction",
      `${cSource} is a real directory, not a junction. ` +
      `Data may be writing to C: instead of H:. Backup C: and re-run setup.`);
  }

  // Check 4: junction target equals expected H: path.
  let link;
  try { link = readlinkSync(cSource); }
  catch (e) { fail("readlink_error", `readlink("${cSource}") failed: ${e.message}`); }
  if (normPath(link) !== normPath(hTarget)) {
    fail("wrong_target",
      `Junction points to "${link}", expected "${hTarget}" for user "${user}".`);
  }

  // Check 5: H: target reachable + contains real Claude Desktop data (marker subfolder).
  //   "Local Storage" is a Chromium-standard subfolder present in every Claude Desktop install.
  const marker = join(hTarget, "Local Storage");
  try {
    const mst = statSync(marker);
    if (!mst.isDirectory()) fail("h_marker_not_dir", `${marker} exists but is not a directory.`);
  } catch (e) {
    fail("h_unreachable_or_empty",
      `${marker} not found. H: drive may be unmounted, or target is empty. Error: ${e.message}`);
  }

  // All checks passed.
  process.stdout.write(`✓ AppData junction → ${hTarget}\n`);
}

try { main(); } catch { process.stdout.write(JSON.stringify({ continue: true })); }
