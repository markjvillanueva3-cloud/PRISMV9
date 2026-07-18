#!/usr/bin/env node
/**
 * SFC-ACCURACY-MS1 — Variability batch launcher.
 *
 * This is the ACTION of the per-domain on-demand scheduled task
 * ("PRISM SFC Variability Batch Mill" / "...Lathe"). It is NOT meant to be
 * run by hand in normal operation — the resume-guard triggers the task via
 * `schtasks /run`, and Task Scheduler runs THIS launcher.
 *
 * Why a launcher (not the guard spawning the batch directly): a process
 * spawned as a child of the guard's own scheduled-task instance lives in
 * that task's job object and is killed when the guard task instance exits
 * (5-minute cadence). By making the batch the action of its OWN task, it
 * runs under that task's job object — independent of the guard.
 *
 * The launcher:
 *   1. reads the per-domain resume-state sidecar (`.resume-state.json`,
 *      written by the guard immediately before it triggered this task),
 *   2. resolves {skip, workers, chunkSize, maxMinutes} via the guard's pure
 *      `pickResumeParams` (sidecar value or proven default),
 *   3. spawns `sfc-variability-batch-run.mjs` as a CHILD (stdio inherited,
 *      NOT detached) and waits for it — so this launcher process stays alive
 *      for the batch's full lifetime, keeping the batch task "running" and
 *      its job object open until the batch genuinely finishes.
 *
 * Exit code mirrors the batch's exit code (0 clean, non-zero on failure) so
 * Task Scheduler's LastTaskResult reflects reality (R12).
 *
 * CLI:  node scripts/sfc-variability-launch.mjs --domain mill|lathe
 */

import { spawn } from "node:child_process";
import { readFileSync } from "node:fs";
import { resolve, join } from "node:path";
import { fileURLToPath } from "node:url";
import { pickResumeParams, buildBatchArgv, RESUME_STATE_FILE } from "./sfc-variability-resume-guard.mjs";

const PROJECT_ROOT = resolve(fileURLToPath(import.meta.url), "../..");
const TSX_CLI = resolve(PROJECT_ROOT, "mcp-server/node_modules/tsx/dist/cli.mjs");
// BATCH_SCRIPT / RESULTS_ROOT are overridable via env ONLY so the subprocess
// integration test can fixture a stub batch + a tmpdir results root without
// spawning the real multi-day batch. Production never sets these.
const BATCH_SCRIPT = process.env.PRISM_SFC_LAUNCH_BATCH_SCRIPT
  ? resolve(process.env.PRISM_SFC_LAUNCH_BATCH_SCRIPT)
  : resolve(PROJECT_ROOT, "scripts/sfc-variability-batch-run.mjs");
const RESULTS_ROOT = process.env.PRISM_SFC_LAUNCH_RESULTS_ROOT
  ? resolve(process.env.PRISM_SFC_LAUNCH_RESULTS_ROOT)
  : resolve(PROJECT_ROOT, "state/shared/sfc-variability-results");
const VALID_DOMAINS = new Set(["mill", "lathe"]);
const EXIT_BAD_ARGS = 2;
const EXIT_SPAWN_FAIL = 1;
// Distinct exit code when the batch is TERMINATED BY A SIGNAL (the 12h
// ExecutionTimeLimit firing, an OOM kill, or `schtasks /end`) — kept distinct
// from EXIT_SPAWN_FAIL so an operator / the guard can tell a host-kill apart
// from a clean batch crash (R12 — LastTaskResult must reflect reality).
const EXIT_SIGNAL_KILL = 137;

/** Extract the --domain value from an argv array, or null. */
function parseDomain(argv) {
  for (let i = 0; i < argv.length; i++) {
    if (argv[i] === "--domain") return argv[i + 1] ?? null;
  }
  return null;
}

/** Read + parse the per-domain sidecar; null on any failure (fail-soft). */
function readSidecarFile(outDir) {
  let txt;
  try { txt = readFileSync(join(outDir, RESUME_STATE_FILE), "utf8"); } catch { return null; }
  try {
    const obj = JSON.parse(txt);
    return (obj && typeof obj === "object") ? obj : null;
  } catch {
    return null;
  }
}

const _modulePath = fileURLToPath(import.meta.url);
const _isEntry = process.argv[1] && resolve(process.argv[1]) === resolve(_modulePath);
if (_isEntry) {
  const domain = parseDomain(process.argv.slice(2));
  if (!VALID_DOMAINS.has(domain)) {
    process.stderr.write("[sfc-launch] invalid/missing --domain (need mill|lathe)\n");
    process.exit(EXIT_BAD_ARGS);
  }
  const outDir = join(RESULTS_ROOT, domain);
  const sidecar = readSidecarFile(outDir);
  const { skip, workers, chunkSize, maxMinutes } = pickResumeParams(sidecar);

  if (!sidecar) {
    process.stderr.write(
      `[sfc-launch] no sidecar for '${domain}' — starting from defaults (skip=0). ` +
      "This is expected only on a genuine first run.\n",
    );
  }
  process.stdout.write(
    `[sfc-launch] domain=${domain} skip=${skip} workers=${workers} ` +
    `chunk=${chunkSize} maxMinutes=${maxMinutes}\n`,
  );

  const argv = [
    TSX_CLI, BATCH_SCRIPT,
    ...buildBatchArgv({ domain, workers, maxMinutes, chunkSize, skip, outDir }),
  ];
  // NOT detached — the batch is a child of this launcher, which is the batch
  // task's action process. Task Scheduler keeps the task "running" until this
  // process exits, which is when the batch exits.
  const child = spawn(process.execPath, argv, { cwd: PROJECT_ROOT, stdio: ["ignore", "inherit", "inherit"], windowsHide: true });
  child.on("error", (e) => {
    process.stderr.write(`[sfc-launch] spawn error: ${String(e?.message ?? e)}\n`);
    process.exit(EXIT_SPAWN_FAIL);
  });
  child.on("exit", (code, sig) => {
    process.stderr.write(`[sfc-launch] batch '${domain}' exited code=${code} sig=${sig ?? "none"}\n`);
    // code===null ⇒ signal-terminated. Distinguish a host-kill (timeout / OOM
    // / schtasks /end) from a clean non-zero crash so triage is honest (R12).
    if (code == null) { process.exit(EXIT_SIGNAL_KILL); }
    process.exit(code);
  });
}

export { parseDomain, readSidecarFile };
