#!/usr/bin/env node
// tier: T4
/**
 * portable-node-guard.mjs — SessionStart verification for portable Node.js on H:.
 *
 * Verifies:
 *   1. H:\Tools\nodejs\node.exe exists and runs `--version` successfully.
 *   2. Version is >= 20.0.0 (required for modern hook scripts).
 *
 * If missing: prints remediation steps and exits 1 (blocks session).
 *
 * NOTE: This hook MUST be the FIRST SessionStart hook in settings.json,
 * because all other hooks depend on node.exe existing.
 */

import { existsSync, appendFileSync, mkdirSync } from "node:fs";
import { execFileSync } from "node:child_process";
import { dirname } from "node:path";

const NODE_EXE = "H:\\Tools\\nodejs\\node.exe";
const DRIFT_LOG = "H:\\PRISM\\mcp-server\\data\\state\\portable-node-drift.jsonl";
const DOWNLOAD_URL = "https://nodejs.org/dist/v22.12.0/node-v22.12.0-win-x64.zip";
const REMEDIATION = `
Portable Node.js not found on H: drive.

QUICK FIX (run on any PC):
  1. Download: ${DOWNLOAD_URL}
  2. Extract to H:\\Tools\\nodejs\\ (so node.exe is at H:\\Tools\\nodejs\\node.exe)
  3. Restart Claude Code

OR copy from C: drive if Node.js is installed there:
  xcopy /E "C:\\Program Files\\nodejs" "H:\\Tools\\nodejs\\"
`;

function logDrift(record) {
  try {
    mkdirSync(dirname(DRIFT_LOG), { recursive: true });
    appendFileSync(DRIFT_LOG, JSON.stringify({ ts: new Date().toISOString(), ...record }) + "\n");
  } catch { /* non-fatal */ }
}

function fail(code, msg) {
  logDrift({ code, msg });
  process.stderr.write(`\n✗ portable-node-guard: ${msg}\n${REMEDIATION}\n`);
  process.exit(1);
}

function main() {
  // Check existence
  if (!existsSync(NODE_EXE)) {
    fail("node_exe_missing", `${NODE_EXE} not found. H: drive may be unmounted or Node.js not installed.`);
  }

  // Check it runs
  let r;
  try {
    r = execFileSync(NODE_EXE, ["--version"], { windowsHide: true, encoding: "utf8", timeout: 5000 });
  } catch (e) {
    fail("node_run_failed", `node --version failed: ${e.message}`);
  }

  // Parse version
  const versionMatch = r.match(/v(\d+)\.(\d+)\.(\d+)/);
  if (!versionMatch) {
    fail("node_version_unparseable", `could not parse version from: ${r}`);
  }

  const major = parseInt(versionMatch[1], 10);
  if (major < 20) {
    fail("node_version_too_old", `got v${versionMatch[0]}, need >= v20.0.0`);
  }

  process.stdout.write(`✓ portable node ${r.trim()} @ H:\\Tools\\nodejs\n`);
}

try { main(); } catch { process.stdout.write(JSON.stringify({ continue: true })); }
