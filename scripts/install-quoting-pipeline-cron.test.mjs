/**
 * install-quoting-pipeline-cron — iter26 validation test.
 *
 * Validates the .ps1 installer WITHOUT executing it (which would require
 * elevation + actual Scheduled Task registration). Tests the script as a
 * text artifact: it must reference all 4 stage scripts, contain the
 * expected scheduled-task cmdlets, idempotency check, dry-run path, log
 * directory creation, and exit-code propagation.
 *
 * Run: node --test scripts/install-quoting-pipeline-cron.test.mjs
 *
 * @milestone QUOTING-SYNERGY-MS0/U-QP-CRON-INSTALL (charlie /goal-yolo iter26)
 */

import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const SCRIPT_PATH = resolve(dirname(__filename), "install-quoting-pipeline-cron.ps1");
const ps1 = readFileSync(SCRIPT_PATH, "utf-8");

// ---------- Required references ----------

test("ps1: references all 4 stage scripts", () => {
  // U-QP-CRON-STAGE0-CORPUS (2026-06-11): Stage 0 rewired from the POISONED
  // quoting-baseline-bootstrap.mjs (machine names as customers, machine_class
  // all-mill, material_iso null) to the clean corpus source. Fail-on-revert:
  // reverting the .ps1 to the bootstrap script breaks this assertion.
  assert.ok(ps1.includes("quoting-baseline-from-corpus.mjs"), "stage 0 reference (clean corpus source)");
  assert.ok(ps1.includes("quoting-docustrata-pipeline.mjs"), "stage 1 reference");
  assert.ok(ps1.includes("quoting-train-cycle.mjs"), "stage 2 reference");
  assert.ok(ps1.includes("quoting-train-drift-alert.mjs"), "stage 3 reference");
});

test("ps1: wrapper pins cwd to the repo root (U-QP-CRON-CWD-FIX)", () => {
  // Stage scripts use cwd-relative DEFAULT paths (from-corpus reads
  // state/shared/databases/*.jsonl, writes state/shared/quoting/baseline-records.json).
  // A scheduled task's default cwd is %windir%\system32, so the generated wrapper MUST
  // Set-Location to PrismRoot or Stage 0 inputs/outputs resolve under System32 and fail.
  assert.ok(/Set-Location\s+'?\$PrismRoot/.test(ps1), "wrapper must Set-Location to the repo root");
});

test("ps1: invokes the Scheduled Task cmdlets", () => {
  // Either Register- (first install) OR Set- (update path) MUST appear.
  assert.ok(/Register-ScheduledTask/.test(ps1), "registers new task");
  assert.ok(/Set-ScheduledTask/.test(ps1), "updates existing task (idempotent)");
  assert.ok(/New-ScheduledTaskAction/.test(ps1));
  assert.ok(/New-ScheduledTaskTrigger/.test(ps1));
  assert.ok(/New-ScheduledTaskSettingsSet/.test(ps1));
  assert.ok(/New-ScheduledTaskPrincipal/.test(ps1));
});

test("ps1: declares all CmdletBinding params", () => {
  assert.ok(/\$TaskName/.test(ps1));
  assert.ok(/\$TriggerHour/.test(ps1));
  assert.ok(/\$PrismRoot/.test(ps1));
  assert.ok(/\$NodeExe/.test(ps1));
  assert.ok(/\$DryRun/.test(ps1));
});

test("ps1: TriggerHour is range-validated 0-23", () => {
  assert.ok(/ValidateRange\(0,\s*23\)/.test(ps1), "TriggerHour [0,23] range gate");
});

test("ps1: pre-flight validates stage scripts exist before registering", () => {
  assert.ok(/Test-Path\s+\$f/.test(ps1) || /foreach\s*\(\$f\s+in/.test(ps1), "loops over required files with Test-Path");
});

test("ps1: creates log directory", () => {
  assert.ok(/cron-logs/.test(ps1), "log directory path mentioned");
  assert.ok(/New-Item.*-ItemType\s+Directory/.test(ps1), "creates directory");
});

test("ps1: dry-run path is non-destructive (exits before Set/Register)", () => {
  // The DryRun branch must appear BEFORE the Register/Set-ScheduledTask calls.
  const dryRunIdx = ps1.indexOf("DryRun");
  const registerIdx = ps1.search(/Register-ScheduledTask|Set-ScheduledTask\s+-TaskName/);
  assert.ok(dryRunIdx >= 0 && registerIdx >= 0, "both branches present");
  // First DryRun reference (the if) must come before the first Register/Set
  assert.ok(dryRunIdx < registerIdx, "DryRun guard precedes destructive cmdlets");
});

test("ps1: exits with drift-alert (stage 3) exit code, not 0", () => {
  // The wrapper must propagate the drift-alert exit code from stage 3, not exit 0
  // unconditionally. Note: inside the PowerShell here-string the $ is backtick-
  // escaped (`$alertExit) so it doesn't interpolate at install time.
  assert.ok(/exit\s+`?\$alertExit/.test(ps1), "propagates drift-alert exit code");
});

test("ps1: chain halts on any stage failure", () => {
  // Look for "exit `$LASTEXITCODE" after stages 0-2 (early-exit pattern).
  const lastExitMatches = ps1.match(/exit\s+`\$LASTEXITCODE/g) ?? [];
  assert.ok(lastExitMatches.length >= 3, `expected >=3 early-exit propagations for stages 0-2, found ${lastExitMatches.length}`);
});

test("ps1: idempotent update path (existing task -> Set-ScheduledTask)", () => {
  // Look for Get-ScheduledTask + if/else over $existing
  assert.ok(/Get-ScheduledTask\s+-TaskName/.test(ps1));
  assert.ok(/if\s*\(\$existing\)/.test(ps1), "branches on existing task");
});

test("ps1: tsx fallback for stage 2 (.ts source)", () => {
  // Wrapper must check for tsx.cmd and fall back to node if absent.
  assert.ok(/tsx/.test(ps1), "tsx referenced");
  assert.ok(/Test-Path\s+'\$TsxBin'/.test(ps1) || /Test-Path '\$TsxBin'/.test(ps1), "tsx existence check");
});

test("ps1: wrapper writes per-run timestamped log", () => {
  // Log filename should include a yyyy-MM-dd_HHmm style stamp.
  assert.ok(/yyyy-MM-dd_HHmm/.test(ps1) || /yyyy-MM-dd_HH/.test(ps1), "timestamped log filename");
});

test("ps1: each stage's output is redirected to the log file", () => {
  // *>> appends all streams (stdout+stderr+verbose+...) to the file.
  const redirects = ps1.match(/\*>>\s+`\$LogFile/g) ?? [];
  assert.ok(redirects.length >= 4, `expected >=4 stage output redirects, found ${redirects.length}`);
});

test("ps1: principal runs as current user (not SYSTEM by default)", () => {
  // Principal should use $env:USERNAME, not "SYSTEM" — quoting tasks read user-scoped files.
  assert.ok(/\$env:USERNAME/.test(ps1), "uses current user");
  assert.ok(/-LogonType\s+S4U/.test(ps1), "S4U logon (no stored password)");
});

test("ps1: ScheduledTask Description contains iter26 marker for audit", () => {
  assert.ok(/iter26/.test(ps1), "iter26 mentioned in description/comments for audit chain");
});

test("ps1: companion doc references present (runbook + wiki)", () => {
  // .NOTES section should reference the runbook + wiki entry so operators can drill.
  assert.ok(/PIPELINE-RUNBOOK\.md/.test(ps1), "links runbook");
  assert.ok(/quoting-training-pipeline\.md/.test(ps1), "links wiki entry");
});

test("ps1: error preference is Stop (fail-loud per R12)", () => {
  assert.ok(/\$ErrorActionPreference\s*=\s*"Stop"/.test(ps1), "ErrorActionPreference = Stop");
});

test("ps1: portable node path is the default (matches PRISM convention)", () => {
  assert.ok(/H:\\Tools\\nodejs\\node\.exe/.test(ps1), "portable node default");
});
