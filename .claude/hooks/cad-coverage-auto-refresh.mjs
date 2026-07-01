#!/usr/bin/env node
// tier: T4
/**
 * SessionStart hook — CAD_COVERAGE_MATRIX.json staleness-gated refresh.
 *
 * CAD-UNIVERSAL-CONTROL-MS0 / U-CUC03. Re-runs
 * build-cad-coverage-matrix.ts if:
 *   1. Matrix mtime > 24h ago, OR
 *   2. Newest file under the scan root (JM DIE/ by default) is newer
 *      than matrix.generatedAt.
 *
 * Runs the scanner in the BACKGROUND (detached, no wait) so the
 * SessionStart pipeline doesn't block on the 3–5s scan time. The
 * freshness one-liner emitted by cad-coverage-surface.mjs will pick
 * up the newer matrix on the next SessionStart.
 *
 * Reason for staleness + newer-file check (not just mtime): JM DIE
 * file volume grows incrementally; if customers added files an hour
 * ago but the matrix is 23h old, the mtime rule alone would miss it.
 *
 * Exits 0 on any failure (continueOnError: true contract).
 */

import { statSync, existsSync, readdirSync, readFileSync, openSync, writeSync, closeSync } from "node:fs";
import { resolve, join } from "node:path";
import { spawn } from "node:child_process";

const MATRIX = resolve("H:/prism/mcp-server/data/state/CAD_COVERAGE_MATRIX.json");
const SCAN_ROOT = "H:/prism/JM DIE";
const SCANNER = resolve("H:/prism/mcp-server/scripts/build-cad-coverage-matrix.ts");
const MAX_AGE_HOURS = 24;
// Cap on sampled directories for the "newest file" probe so we don't
// re-walk the entire 16K-file tree. The probe only needs to detect
// ONE file newer than the matrix; it short-circuits on hit.
const NEWEST_PROBE_LIMIT = 500;

function isMatrixStale() {
  if (!existsSync(MATRIX)) return { stale: true, reason: "matrix-missing" };
  try {
    const st = statSync(MATRIX);
    const ageHours = (Date.now() - st.mtimeMs) / 3600_000;
    if (ageHours > MAX_AGE_HOURS) {
      return { stale: true, reason: `mtime-age-${ageHours.toFixed(1)}h` };
    }
    // Parse matrix.generatedAt (canonical timestamp, may differ from
    // file mtime if the matrix was rebuilt into place).
    const doc = JSON.parse(readFileSync(MATRIX, "utf8"));
    const genMs = Date.parse(doc.generatedAt ?? 0);
    if (!Number.isFinite(genMs)) {
      return { stale: true, reason: "matrix-generatedAt-unparseable" };
    }
    const newer = findOneNewerFile(SCAN_ROOT, genMs);
    if (newer) return { stale: true, reason: `newer-file:${newer}` };
    return { stale: false, reason: null };
  } catch (err) {
    return { stale: true, reason: `check-err:${err.message}` };
  }
}

/**
 * Walk SCAN_ROOT looking for ONE file newer than `cutoffMs`, sampled
 * breadth-first. Returns the first hit's relative path, or null.
 * Hard cap at NEWEST_PROBE_LIMIT directory visits.
 */
function findOneNewerFile(root, cutoffMs) {
  if (!existsSync(root)) return null;
  const queue = [root];
  let visits = 0;
  while (queue.length && visits < NEWEST_PROBE_LIMIT) {
    const dir = queue.shift();
    visits++;
    let entries;
    try { entries = readdirSync(dir, { withFileTypes: true }); }
    catch { continue; }
    for (const ent of entries) {
      const p = join(dir, ent.name);
      if (ent.isDirectory()) {
        // Skip git/node_modules/etc
        if (ent.name.startsWith(".") || ent.name === "node_modules") continue;
        queue.push(p);
      } else if (ent.isFile()) {
        try {
          const st = statSync(p);
          if (st.mtimeMs > cutoffMs) return p.replace(root, "").replace(/^[\\/]+/, "");
        } catch { /* skip */ }
      }
    }
  }
  return null;
}

function kickScanner(reason) {
  // Use detached spawn so the Node process exits immediately; the
  // scanner keeps running. Output redirected to telemetry log so it
  // doesn't pollute the session transcript.
  //
  // Do NOT use shell:true here — on Windows, npx/npm are .cmd files
  // that require the shell, but the shell mangles argv entries with
  // spaces (SCAN_ROOT has "JM DIE"). Run tsx's cli.mjs directly via
  // node.exe so argv is passed verbatim.
  try {
    const logPath = resolve("H:/prism/mcp-server/data/state/CAD_COVERAGE_REFRESH.log");
    const fd = openSync(logPath, "a");
    writeSync(fd, `\n=== refresh ${new Date().toISOString()} reason=${reason} ===\n`);
    const tsxCli = resolve("H:/prism/mcp-server/node_modules/tsx/dist/cli.mjs");
    const child = spawn(process.execPath, [tsxCli, SCANNER, SCAN_ROOT], {
      stdio: ["ignore", fd, fd],
      detached: true, windowsHide: true,
      shell: false,
      cwd: resolve("H:/prism/mcp-server"),
    });
    child.unref();
    closeSync(fd);
    return true;
  } catch (err) {
    return { failed: true, err: err && err.message ? err.message : "spawn failed" };
  }
}

function main() {
  const { stale, reason } = isMatrixStale();
  if (!stale) {
    process.exit(0);
    return;
  }
  const kicked = kickScanner(reason ?? "unknown");
  if (kicked === true) {
    process.stdout.write(
      `cad-coverage-refresh: stale (${reason}) — scanner spawned in background, matrix refresh in ~5s\n`,
    );
  } else {
    const note = kicked && kicked.err ? kicked.err : "unknown";
    process.stdout.write(
      `cad-coverage-refresh: stale (${reason}) but scanner spawn failed (${note}) — run 'npx tsx mcp-server/scripts/build-cad-coverage-matrix.ts "H:/prism/JM DIE"' manually\n`,
    );
  }
  process.exit(0);
}

try { main(); } catch { process.stdout.write(JSON.stringify({ continue: true })); }
