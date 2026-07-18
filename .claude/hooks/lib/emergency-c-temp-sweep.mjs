// tier: T1
/**
 * emergency-c-temp-sweep.mjs -- ENOSPC self-heal for the Claude harness temp dir
 *
 * FLEET-HYGIENE/U-GOLF-ENOSPC-SELFHEAL (slot:golf, 2026-07-02). When C: fills,
 * EVERY Bash/PowerShell tool call in EVERY fleet session fails: the harness
 * cannot create its output-capture file under
 *   %LOCALAPPDATA%\Temp\claude\<proj>\<session>\tasks\*.output
 * and the agent loses all shell access -- including every path that could free
 * the space. PreToolUse hooks still execute (pipe I/O, no capture file), so a
 * hook-hosted sweep is the only in-band recovery. Live outage 2026-07-02 ~04:30
 * proved Write/Edit are also dead on C: (atomic tmp+rename needs a new file);
 * only deletion primitives (fs.unlinkSync/rmdirSync) work on a full NTFS volume.
 * v2: the first live sweep freed only ~48MB (crumbs vs a 1.9TB-full volume,
 * re-consumed by the fleet in seconds) -- so v2 sweeps more aggressively during
 * a crisis AND spawns a DETACHED diagnoser that sizes the known space hogs and
 * writes the report to H: (detached children bypass the dead output-capture).
 *
 * Sweep scope (C:, deletion only):
 *   - regular *.output files under Temp\claude\*\*\tasks\ older than 10min
 *     (consumed the moment the model reads them; in-flight ones are seconds old).
 *     lstat -- NEVER follow symlinks (agent .output files symlink live transcripts).
 *   - cache-break-state-*.json at the claude temp root older than 2h.
 *   - TOP-LEVEL regular files in %TEMP% older than 3 days (classic temp hygiene;
 *     directories untouched -- other apps' live temp trees are never recursed).
 *
 * Guards (cheap-when-healthy):
 *   1. statfs low-water -- runs only when C: free < LOW_WATER_BYTES (500MB);
 *      statfs failure falls back to an ENOSPC probe-write.
 *   2. Marker throttle on H: (C: may be unwritable): one sweep per 2min.
 *   3. Every fs op individually try/caught; the export NEVER throws.
 *
 * Logs: H:\prism\state\shared\emergency-c-sweep.log (sweeps) and
 *       H:\prism\state\shared\emergency-c-diagnose.log (hog report).
 * Knob: PRISM_EMERGENCY_C_SWEEP_DISABLE=1.
 *
 * Documented trade-offs (scrutiny 2026-07-02, deferred hardening in handoff):
 *   - Detachment does NOT survive the hook-runner's timeout `taskkill /T` --
 *     if the HOST hook times out, the sweep child dies mid-walk and the 2-min
 *     throttle delays the retry. Survival rests on the hook exiting fast
 *     (guards are ~ms); a double-fork would close this fully.
 *   - A finished-but-unread `run_in_background` task .output older than 10min
 *     is deleted during a crisis sweep (peer-session task output loss) -- the
 *     crisis trade accepted to restore fleet shells.
 *   - Throttle fails OPEN if H: markers are unwritable (double-outage regime):
 *     duplicate detached children per Bash call, each single-pass and finite.
 */

import fs from "node:fs";
import path from "node:path";
import os from "node:os";
import { spawn } from "node:child_process";
import { fileURLToPath } from "node:url";

const LOW_WATER_BYTES = 500 * 1024 * 1024;   // 500MB
const OUTPUT_MIN_AGE_MS = 10 * 60 * 1000;    // harness outputs: >10min
const ROOTJSON_MIN_AGE_MS = 2 * 60 * 60 * 1000;
const TEMP_FILE_MIN_AGE_MS = 3 * 24 * 60 * 60 * 1000; // %TEMP% top-level files: >3d
const THROTTLE_MS = 2 * 60 * 1000;           // crisis cadence
const DIAG_THROTTLE_MS = 10 * 60 * 1000;
const MARKER = "H:/prism/state/shared/.emergency-c-sweep.last";
const DIAG_MARKER = "H:/prism/state/shared/.emergency-c-diagnose.last";
const LOG = "H:/prism/state/shared/emergency-c-sweep.log";
const DIAG_LOG = "H:/prism/state/shared/emergency-c-diagnose.log";

function cFreeBytes() {
  // statfs on the real temp path (root-drive "C:\\" form threw on live win32
  // node22 -- both markers froze on the space-ok branch while the harness was
  // still ENOSPC). Fallback probe writes 4MB: a 1-byte probe false-passed in
  // the thrash regime where fleet churn leaves a few MB free for milliseconds.
  for (const p of [os.tmpdir(), "C:\\"]) {
    try {
      const s = fs.statfsSync(p);
      const free = s.bavail * s.bsize;
      if (Number.isFinite(free) && free >= 0) return free;
    } catch { /* try next */ }
  }
  const probe = path.join(os.tmpdir(), `.enospc-probe-${process.pid}`);
  try {
    fs.writeFileSync(probe, Buffer.alloc(4 * 1024 * 1024));
    fs.unlinkSync(probe);
    return Number.POSITIVE_INFINITY; // >=4MB writable and unmeasurable -> treat as healthy
  } catch (e) {
    try { fs.unlinkSync(probe); } catch { /* partial probe */ }
    return e && e.code === "ENOSPC" ? 0 : Number.POSITIVE_INFINITY;
  }
}

export function markerFresh(file, windowMs, now) {
  try {
    const last = Number(fs.readFileSync(file, "utf8"));
    if (Number.isFinite(last) && now - last < windowMs) return true;
  } catch { /* no marker yet */ }
  try { fs.writeFileSync(file, String(now)); } catch { /* H: write failed: proceed anyway */ }
  return false;
}

export function sweepClaudeTmp(now, tally, root = path.join(os.tmpdir(), "claude")) {
  let projects = [];
  try { projects = fs.readdirSync(root, { withFileTypes: true }); } catch { return; }
  for (const proj of projects) {
    const projPath = path.join(root, proj.name);
    if (proj.isFile()) {
      if (/^cache-break-state-.*\.json$/.test(proj.name)) {
        try {
          const st = fs.lstatSync(projPath);
          if (st.isFile() && now - st.mtimeMs > ROOTJSON_MIN_AGE_MS) { fs.unlinkSync(projPath); tally.files++; tally.bytes += st.size; }
        } catch { tally.errs++; }
      }
      continue;
    }
    if (!proj.isDirectory()) continue;
    let sessions = [];
    try { sessions = fs.readdirSync(projPath, { withFileTypes: true }); } catch { tally.errs++; continue; }
    for (const sessEnt of sessions) {
      if (!sessEnt.isDirectory()) continue; // dirent check: never follow a symlinked session dir (scrutiny P2)
      const tasksDir = path.join(projPath, sessEnt.name, "tasks");
      let entries = [];
      try { entries = fs.readdirSync(tasksDir); } catch { continue; }
      for (const name of entries) {
        if (!name.endsWith(".output")) continue;
        const f = path.join(tasksDir, name);
        try {
          const st = fs.lstatSync(f); // NEVER follow symlinks
          if (!st.isFile()) continue;
          if (now - st.mtimeMs < OUTPUT_MIN_AGE_MS) continue;
          fs.unlinkSync(f);
          tally.files++; tally.bytes += st.size;
        } catch { tally.errs++; }
      }
    }
  }
}

export function sweepTempTopLevel(now, tally, tmp = os.tmpdir()) {
  let entries = [];
  try { entries = fs.readdirSync(tmp, { withFileTypes: true }); } catch { return; }
  for (const ent of entries) {
    if (!ent.isFile()) continue; // top-level FILES only; never recurse app dirs
    const f = path.join(tmp, ent.name);
    try {
      const st = fs.lstatSync(f);
      if (!st.isFile()) continue;
      if (now - st.mtimeMs < TEMP_FILE_MIN_AGE_MS) continue;
      fs.unlinkSync(f);
      tally.files++; tally.bytes += st.size;
    } catch { tally.errs++; }
  }
}

// NVIDIA shader/compute caches: rebuilt on demand (same target Windows Disk
// Cleanup offers). Live diagnose 2026-07-02 measured 11.16GB here while the
// whole Temp tree held 1.32GB -- this is the crisis lever that actually frees
// enough headroom to restore fleet shells. Locked in-use files fail-soft.
// NvBackend deliberately EXCLUDED (scrutiny P2): it is GeForce-Experience backend
// data (re-downloadable but not a pure rebuilt-on-demand cache like the rest).
const NVIDIA_CACHE_DIRS = ["DXCache", "GLCache", "GLCache2", "ComputeCache", "OptixCache", "NV_Cache"];
const NVIDIA_WALK_CAP = 500_000;

export function sweepNvidiaCaches(tally, base = path.join(os.homedir(), "AppData", "Local", "NVIDIA")) {
  for (const dir of NVIDIA_CACHE_DIRS) {
    const root = path.join(base, dir);
    let entries = 0;
    const stack = [root];
    const dirs = [];
    while (stack.length) {
      const p = stack.pop();
      if (entries++ > NVIDIA_WALK_CAP) break;
      let st;
      try { st = fs.lstatSync(p); } catch { continue; }
      if (st.isSymbolicLink()) continue;
      if (st.isFile()) {
        try { fs.unlinkSync(p); tally.files++; tally.bytes += st.size; } catch { tally.errs++; }
        continue;
      }
      if (st.isDirectory()) {
        if (p !== root) dirs.push(p);
        let kids = [];
        try { kids = fs.readdirSync(p); } catch { continue; }
        for (const k of kids) stack.push(path.join(p, k));
      }
    }
    // deepest-first empty-dir cleanup (best-effort)
    for (const d of dirs.sort((a, b) => b.length - a.length)) {
      try { fs.rmdirSync(d); } catch { /* non-empty or locked */ }
    }
  }
}

function spawnDiagnoser(now) {
  if (markerFresh(DIAG_MARKER, DIAG_THROTTLE_MS, now)) return;
  try {
    const self = fileURLToPath(import.meta.url);
    const child = spawn(process.execPath, [self, "--diagnose"], {
      detached: true,
      stdio: "ignore",
      windowsHide: true,
    });
    child.unref();
  } catch { /* best-effort */ }
}

export function emergencySweep(env = process.env) {
  // Hook-side entry: cheap guards only, then a DETACHED child does the walks.
  // The 07:32 live sweep proved in-hook walks get killed by the hook timeout
  // (marker written, completion line never logged); a detached child has no
  // timeout and survives the parent hook process exiting.
  try {
    if (env?.PRISM_EMERGENCY_C_SWEEP_DISABLE === "1") return { ran: false, reason: "disabled" };
    const free = cFreeBytes();
    if (free >= LOW_WATER_BYTES) return { ran: false, reason: "space-ok" };
    const now = Date.now();
    spawnDiagnoser(now); // even when sweep is throttled, keep the hog report fresh
    if (markerFresh(MARKER, THROTTLE_MS, now)) return { ran: false, reason: "throttled" };
    try {
      const self = fileURLToPath(import.meta.url);
      const child = spawn(process.execPath, [self, "--sweep"], {
        detached: true, stdio: "ignore", windowsHide: true,
      });
      child.unref();
    } catch {
      // release the throttle so another session can retry inside the window
      // (scrutiny P2: a failed spawn must not burn the whole 2min crisis window)
      try { fs.unlinkSync(MARKER); } catch { /* best-effort */ }
      return { ran: false, reason: "spawn-failed" };
    }
    return { ran: true, detached: true };
  } catch {
    return { ran: false, reason: "sweep-error" };
  }
}

export function runSweepWalks() {
  const now = Date.now();
  const tally = { files: 0, bytes: 0, errs: 0 };
  try { fs.appendFileSync(LOG, `${new Date(now).toISOString()} sweep START free=${cFreeBytes()} (pid ${process.pid})\n`); } catch { /* best-effort */ }
  sweepClaudeTmp(now, tally);
  sweepTempTopLevel(now, tally);
  sweepNvidiaCaches(tally);
  const line = `${new Date(now).toISOString()} sweep DONE files=${tally.files} bytes=${tally.bytes} errs=${tally.errs} freeAfter=${cFreeBytes()} (pid ${process.pid})\n`;
  try { fs.appendFileSync(LOG, line); } catch { /* best-effort */ }
  return tally;
}

// ---------- detached diagnoser (runs outside the harness; report -> H:) ----------

function dirSize(root, { maxEntries = 200_000, maxDepth = 6 } = {}) {
  let bytes = 0, entries = 0, capped = false;
  const stack = [{ p: root, d: 0 }];
  while (stack.length) {
    const { p, d } = stack.pop();
    if (entries++ > maxEntries) { capped = true; break; }
    let st;
    try { st = fs.lstatSync(p); } catch { continue; }
    if (st.isSymbolicLink()) continue;
    if (st.isFile()) { bytes += st.size; continue; }
    if (st.isDirectory() && d < maxDepth) {
      let kids = [];
      try { kids = fs.readdirSync(p); } catch { continue; }
      for (const k of kids) stack.push({ p: path.join(p, k), d: d + 1 });
    }
  }
  return { bytes, capped };
}

function fmtGB(b) { return Number.isFinite(b) ? (b / 1024 ** 3).toFixed(2) + "GB" : "unmeasurable"; }

export function diagnose() {
  const home = os.homedir();
  const suspects = [
    ["ollama-models", path.join(home, ".ollama")],
    ["claude-projects", path.join(home, ".claude", "projects")],
    ["claude-shell-snapshots", path.join(home, ".claude", "shell-snapshots")],
    ["claude-rest", path.join(home, ".claude", "cache")],
    ["temp", os.tmpdir()],
    ["downloads", path.join(home, "Downloads")],
    ["docker-wsl", path.join(home, "AppData", "Local", "Docker")],
    ["nvidia-cache", path.join(home, "AppData", "Local", "NVIDIA")],
  ];
  const lines = [`=== C: hog diagnose ${new Date().toISOString()} (free=${fmtGB(cFreeBytes())}) ===`];
  for (const [label, p] of suspects) {
    try {
      if (!fs.existsSync(p)) { lines.push(`${label}: (absent) ${p}`); continue; }
      const { bytes, capped } = dirSize(p);
      lines.push(`${label}: ${fmtGB(bytes)}${capped ? "+ (capped)" : ""} ${p}`);
    } catch (e) {
      lines.push(`${label}: ERR ${e?.code || e} ${p}`);
    }
  }
  for (const sys of ["C:\\pagefile.sys", "C:\\hiberfil.sys", "C:\\swapfile.sys"]) {
    try { lines.push(`${path.basename(sys)}: ${fmtGB(fs.statSync(sys).size)}`); }
    catch { lines.push(`${path.basename(sys)}: (unreadable/absent)`); }
  }
  try { fs.appendFileSync(DIAG_LOG, lines.join("\n") + "\n\n"); } catch { /* best-effort */ }
}

if (process.argv[1] && process.argv[1].endsWith("emergency-c-temp-sweep.mjs")) {
  if (process.argv.includes("--diagnose")) {
    try { diagnose(); } catch { /* detached: nothing to report to */ }
  } else if (process.argv.includes("--sweep")) {
    try { runSweepWalks(); } catch { /* detached: nothing to report to */ }
  }
}
