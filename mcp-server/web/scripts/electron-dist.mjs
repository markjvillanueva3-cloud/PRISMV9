#!/usr/bin/env node
/**
 * electron:dist driver -- produce the winCodeSign-free desktop distributable.
 *
 * WHY THIS EXISTS (not a plain `&&` chain):
 *   electron-builder's `--dir` step writes dist_electron/win-unpacked (Kienzle Academy.exe
 *   + app.asar) and THEN, on a Windows host without SeCreateSymbolicLinkPrivilege
 *   (Developer Mode off), trips a winCodeSign cache-extraction probe that exits
 *   NON-ZERO -- even though the unpacked app is already complete on disk. A naive
 *   `npm run electron:build && electron-builder --win zip ...` would short-circuit
 *   on that non-zero exit and SKIP the zip, silently producing no distributable.
 *
 *   So this driver runs `--dir`, then -- regardless of `--dir`'s exit code --
 *   verifies win-unpacked actually materialized (Kienzle Academy.exe present) and zips it
 *   via `--prepackaged`. If win-unpacked is genuinely missing (a real build
 *   failure, not the benign probe), it FAILS LOUD (R12) and exits non-zero.
 *
 * NSIS installers still need winCodeSign -> use `electron:dist:nsis` on a
 * Developer-Mode host. This path is the signing-free zip distributable.
 */
import { spawnSync } from 'node:child_process';
import { existsSync, statSync } from 'node:fs';
import { resolve } from 'node:path';

const WEB_DIR = resolve(import.meta.dirname, '..');
const UNPACKED = resolve(WEB_DIR, 'dist_electron', 'win-unpacked');
const APP_EXE = resolve(UNPACKED, 'Kienzle Academy.exe');

const NO_SIGN_ENV = { ...process.env, CSC_IDENTITY_AUTO_DISCOVERY: 'false' };

/** Run a command in the web dir, inheriting stdio; return its exit code. */
function run(cmd, args) {
  const r = spawnSync(cmd, args, {
    cwd: WEB_DIR,
    env: NO_SIGN_ENV,
    stdio: 'inherit',
    shell: process.platform === 'win32', // resolve npm/npx .cmd shims on Windows
    windowsHide: true,
  });
  if (r.error) {
    console.error(`[electron:dist] failed to spawn ${cmd}: ${r.error.message}`);
    return 1;
  }
  return r.status ?? 1;
}

/**
 * True iff the unpacked app was (re)written by THIS run.
 *
 * Existence alone is NOT enough: dist_electron/win-unpacked is gitignored and
 * never cleaned, and electron-builder --dir overwrites file-by-file. So a STALE
 * Kienzle Academy.exe from a prior successful run would satisfy a bare existence check --
 * meaning a real --dir failure (e.g. the `vite build` half of electron:build
 * fails and `&&`-aborts BEFORE --dir runs, leaving win-unpacked untouched) would
 * falsely pass and we would ship stale bits with exit 0 (the exact R12 silent-
 * success-on-failure trap). Gate on mtime > the pre-build stamp so only bytes
 * produced by THIS run can pass.
 */
function unpackedReady(builtAfterMs) {
  if (!existsSync(APP_EXE)) return false;
  const st = statSync(APP_EXE);
  return st.size > 0 && st.mtimeMs >= builtAfterMs;
}

// Stamp the wall clock BEFORE the build so we can prove win-unpacked/Kienzle Academy.exe
// was (re)written by THIS run, not left over from a prior one. Subtract 2s of
// slack because filesystem mtime resolution can be coarser than Date.now()
// (e.g. FAT/some network FS round to 1-2s), so a fresh artifact written within
// the same tick is never falsely rejected.
const buildStartMs = Date.now() - 2000;

// 1) Build the SPA + pack the unpacked Electron app. Its exit code is ADVISORY
//    -- the authoritative signal is whether win-unpacked/Kienzle Academy.exe was rewritten
//    by this run (existence + size + mtime >= buildStartMs).
console.log('[electron:dist] step 1/2: npm run build + electron-builder --dir');
const buildCode = run('npm', ['run', 'electron:build']);
if (buildCode !== 0) {
  console.warn(
    `[electron:dist] electron:build exited ${buildCode} (likely the benign ` +
      `winCodeSign probe on a non-Developer-Mode host). Checking whether the ` +
      `unpacked app was written before that...`,
  );
}

// 2) Hard gate: the unpacked app must have been (RE)WRITTEN by this run, or this
//    is a real failure. A stale Kienzle Academy.exe from a prior run does NOT count -- that
//    would let a failed build (e.g. vite build aborting electron:build before
//    --dir even runs) silently ship stale bits (R12).
if (!unpackedReady(buildStartMs)) {
  const why = existsSync(APP_EXE)
    ? `${APP_EXE} exists but is STALE (not rewritten by this run) or empty`
    : `${APP_EXE} is missing`;
  console.error(
    `[electron:dist] FAIL: ${why} after --dir. This is a real build failure, ` +
      `not the winCodeSign probe. Aborting before the zip step (R12: fail loud).`,
  );
  process.exit(buildCode !== 0 ? buildCode : 1);
}

// 3) Zip the prepackaged dir -- this step does NOT touch winCodeSign.
console.log('[electron:dist] step 2/2: electron-builder --win zip --prepackaged');
const zipCode = run('npx', [
  'electron-builder',
  '--win',
  'zip',
  '--prepackaged',
  'dist_electron/win-unpacked',
]);

if (zipCode !== 0) {
  console.error(`[electron:dist] FAIL: zip packaging exited ${zipCode}.`);
  process.exit(zipCode);
}

console.log('[electron:dist] OK -> dist_electron/KienzleAcademy-<version>-x64.zip');
