#!/usr/bin/env node
/**
 * deploy-fusion-addin.mjs (U-DELTA-ADDIN-TRACKED-SOURCE, slot:delta 2026-06-29)
 *
 * The live Fusion :18362 CAD bridge add-in (`PRISMBridgeCAD.py`) is loaded from the user's AppData
 * AddIns dir and was, until this unit, AppData-ONLY -- zero version control. The whole CAD closed-loop
 * (text->CAD generate -> kernel-GT validate -> learn) depends on it, so a lost/corrupt AppData copy would
 * sink the loop with no recovery. This makes `mcp-server/fusion-addins/PRISMBridgeCAD/` the tracked
 * SOURCE OF TRUTH and gives a two-way path:
 *   --check        (default) report drift between the tracked source and the live AppData copy
 *   --sync-from-live  capture the live copy INTO the repo source (after a hand-edit + reload of the live add-in)
 *   --deploy       push the repo source TO the live AppData copy (backs up the live first; needs a GUI reload to take effect)
 *
 * No Date/random (scripts rule) -- backups are pid-suffixed. Pure helpers (addinPaths/driftStatus) are
 * exported + unit-tested; the live legs are I/O-guarded and fail loud.
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = path.resolve(__dirname, "..");
const ADDIN_FILES = ["PRISMBridgeCAD.py", "PRISMBridgeCAD.manifest"]; // the two files Fusion loads

/**
 * Resolve the tracked-source dir + the live AppData AddIns dir from an env map (injectable for tests).
 * The live dir follows the Fusion convention: %APPDATA%/Autodesk/Autodesk Fusion 360/API/AddIns/PRISMBridgeCAD.
 * Returns { repoDir, liveDir } (liveDir null when APPDATA is unset, e.g. CI). Pure.
 */
export function addinPaths(env = process.env, repoRoot = REPO_ROOT) {
  const repoDir = path.join(repoRoot, "mcp-server", "fusion-addins", "PRISMBridgeCAD");
  const appData = env.APPDATA || (env.HOME ? path.join(env.HOME, "AppData", "Roaming") : null);
  const liveDir = appData
    ? path.join(appData, "Autodesk", "Autodesk Fusion 360", "API", "AddIns", "PRISMBridgeCAD")
    : null;
  return { repoDir, liveDir };
}

/**
 * Per-file drift verdict between repo source and live copy. Returns one of:
 *   "in-sync" (byte-identical) · "drift" (both exist, differ) · "live-only" · "repo-only" · "absent".
 * Pure (operates on the already-read contents; null = file missing on that side).
 */
export function driftStatus(repoText, liveText) {
  const r = repoText != null, l = liveText != null;
  if (!r && !l) return "absent";
  if (r && !l) return "repo-only";
  if (!r && l) return "live-only";
  return repoText === liveText ? "in-sync" : "drift";
}

const readOrNull = (p) => { try { return fs.readFileSync(p, "utf8"); } catch { return null; } };

function main() {
  const args = process.argv.slice(2);
  const { repoDir, liveDir } = addinPaths();
  const mode = args.includes("--deploy") ? "deploy" : args.includes("--sync-from-live") ? "sync-from-live" : "check";
  if (!liveDir) { process.stderr.write("deploy-fusion-addin: APPDATA unset -- cannot resolve the live AddIns dir (CI?). Repo source dir: " + repoDir + "\n"); process.exit(2); }

  if (mode === "check") {
    let anyDrift = false;
    for (const f of ADDIN_FILES) {
      const status = driftStatus(readOrNull(path.join(repoDir, f)), readOrNull(path.join(liveDir, f)));
      if (status !== "in-sync" && status !== "absent") anyDrift = true;
      process.stdout.write(`  ${status.padEnd(10)} ${f}\n`);
    }
    process.stdout.write(`repo:  ${repoDir}\nlive:  ${liveDir}\n${anyDrift ? "DRIFT -- run --sync-from-live (capture live) or --deploy (push repo)" : "in sync"}\n`);
    process.exit(anyDrift ? 1 : 0);
  }

  const [srcDir, dstDir] = mode === "sync-from-live" ? [liveDir, repoDir] : [repoDir, liveDir];
  fs.mkdirSync(dstDir, { recursive: true });
  for (const f of ADDIN_FILES) {
    const src = path.join(srcDir, f), dst = path.join(dstDir, f);
    const text = readOrNull(src);
    if (text == null) { process.stderr.write(`  SKIP ${f} -- absent in source (${srcDir})\n`); continue; }
    // back up the destination before overwrite (pid-suffixed -- scripts forbid Date/random)
    if (fs.existsSync(dst)) { try { fs.copyFileSync(dst, `${dst}.bak-${mode}-${process.pid}`); } catch { /* best-effort */ } }
    fs.writeFileSync(dst, text);
    process.stdout.write(`  wrote ${f} -> ${dstDir}\n`);
  }
  if (mode === "deploy") process.stdout.write("DEPLOYED to live -- a Fusion add-in Stop+Run reload (GUI-only) is required for the change to take effect.\n");
  else process.stdout.write("SYNCED live -> repo source. Commit the repo copy to version-control the change.\n");
}

const isMain = (() => { try { return process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url); } catch { return false; } })();
if (isMain) main();
