#!/usr/bin/env node
// tier: T4
/**
 * portable-python-guard.mjs — SessionStart verification for portable Python on H:.
 *
 * Checks:
 *   1. H:\Tools\python\python.exe exists and runs `--version` successfully.
 *   2. Version is >= 3.12 (hooks may use modern syntax).
 *   3. H:\.claude\bin\python.cmd wrapper exists (so `python` on PATH finds it).
 *
 * Blocks session on any failure (exit 1, continueOnError:false).
 * Points at the portable-python install helper if drift detected.
 */

import { existsSync, appendFileSync, mkdirSync } from "node:fs";
import { spawnSync } from "node:child_process";
import { dirname } from "node:path";

const PYTHON_EXE = "H:\\Tools\\python\\python.exe";
const BIN_WRAPPER = "H:\\.claude\\bin\\python.cmd";
const DRIFT_LOG = "H:\\PRISM\\mcp-server\\data\\state\\portable-python-drift.jsonl";
const REMEDIATION = "Re-install WinPython: download https://github.com/winpython/winpython/releases, extract to H:\\Tools\\, and re-run mklink /J H:\\Tools\\python H:\\Tools\\WPy64-<ver>\\python";

function logDrift(record) {
  try {
    mkdirSync(dirname(DRIFT_LOG), { recursive: true });
    appendFileSync(DRIFT_LOG, JSON.stringify({ ts: new Date().toISOString(), ...record }) + "\n");
  } catch { /* non-fatal */ }
}

function fail(check, details) {
  logDrift({ check_failed: check, details });
  process.stderr.write(`\n✗ Portable Python guard FAILED (${check})\n`);
  process.stderr.write(`  ${details}\n`);
  process.stderr.write(`  Remediation: ${REMEDIATION}\n\n`);
  process.exit(1);
}

function main() {
  if (!existsSync(PYTHON_EXE)) {
    fail("python_exe_missing", `${PYTHON_EXE} not found. H: drive may be unmounted or WinPython not installed.`);
  }
  if (!existsSync(BIN_WRAPPER)) {
    fail("bin_wrapper_missing", `${BIN_WRAPPER} not found. Shell wrappers missing from H:\\.claude\\bin\\.`);
  }

  const r = spawnSync(PYTHON_EXE, ["--version"], { windowsHide: true, encoding: "utf8", timeout: 3000 });
  if (r.status !== 0) {
    fail("python_run_failed", `python --version exited ${r.status}. stderr: ${r.stderr?.trim() || "(empty)"}`);
  }
  const versionMatch = /Python (\d+)\.(\d+)\.(\d+)/.exec(r.stdout || r.stderr || "");
  if (!versionMatch) {
    fail("python_version_unparseable", `could not parse version from: ${r.stdout || r.stderr}`);
  }
  const [, major, minor] = versionMatch;
  if (Number(major) < 3 || (Number(major) === 3 && Number(minor) < 12)) {
    fail("python_version_too_old", `got ${versionMatch[0]}, need >= 3.12`);
  }

  process.stdout.write(`✓ Portable Python ${versionMatch[0]} → ${PYTHON_EXE}\n`);
}

try { main(); } catch { process.stdout.write(JSON.stringify({ continue: true })); }
