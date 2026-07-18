#!/usr/bin/env node
// tier: T4
/**
 * stop-bg-runner.mjs — wrapper that runs a target Stop hook in the background.
 *
 * WHY: advisory Stop hooks (memory extraction, graph consolidation, cleanup)
 * cumulatively add ~50s to every session end. They are NOT safety-critical
 * (continueOnError: true) and should not block the user. This wrapper spawns
 * the target hook detached, immediately emits {continue:true}, and lets the
 * detached child finish on its own with output piped to a log file.
 *
 * Usage in settings.json:
 *   "command": "<portable-node> <wrapper> <target-hook-path>"
 *
 * The wrapper forwards stdin (the Stop event payload) to the detached child
 * via a temp file, since Node's spawn detached cannot share a parent's stdin
 * after the parent exits.
 *
 * SAFETY: only use this for hooks that are advisory (continueOnError: true).
 * Never wrap a hook that performs blocking validation — those must remain
 * synchronous so Stop is actually blocked when validation fails.
 */

import * as fs from "node:fs";
import * as path from "node:path";
import * as os from "node:os";
import { spawn } from "node:child_process";

const LOG_DIR = "H:/prism/.claude/cache/stop-bg-logs";
const MAX_LOG_AGE_DAYS = 3;
// (Removed the dead `NODE_BIN = ".../portable-node"` const: it was never used for the spawn -- the
// launcher correctly uses process.execPath, see ~line 86 -- and it read as if this hook spawned the
// non-spawnable extensionless shim, a trap for anyone auditing the silent-spawn bug class.)

function readStdinSafe() {
  try {
    if (process.stdin.isTTY) return "";
    return fs.readFileSync(0, "utf-8");
  } catch { return ""; }
}

function emit(obj) {
  process.stdout.write(JSON.stringify(obj));
}

function ensureDir(p) {
  try { fs.mkdirSync(p, { recursive: true }); } catch { /* ignore */ }
}

function pruneOldLogs() {
  try {
    if (!fs.existsSync(LOG_DIR)) return;
    const cutoff = Date.now() - MAX_LOG_AGE_DAYS * 24 * 3600 * 1000;
    for (const f of fs.readdirSync(LOG_DIR)) {
      const full = path.join(LOG_DIR, f);
      try {
        const st = fs.statSync(full);
        if (st.mtimeMs < cutoff) fs.unlinkSync(full);
      } catch { /* skip */ }
    }
  } catch { /* best-effort */ }
}

function main() {
  const target = process.argv[2];
  if (!target || !fs.existsSync(target)) {
    return emit({ continue: true });
  }

  ensureDir(LOG_DIR);
  pruneOldLogs();

  const stdinPayload = readStdinSafe();

  // Write stdin to a temp file the child can read.
  const stem = path.basename(target, ".mjs");
  const stamp = new Date().toISOString().replace(/[:.]/g, "-");
  const stdinFile = path.join(os.tmpdir(), `stop-bg-${stem}-${stamp}-${process.pid}.json`);
  const logFile = path.join(LOG_DIR, `${stem}-${stamp}.log`);

  try {
    fs.writeFileSync(stdinFile, stdinPayload, "utf8");
  } catch {
    return emit({ continue: true });
  }

  // WHY: on Windows `H:/.claude/bin/portable-node` is a shim with no .exe;
  // Node's spawn (CreateProcess) needs the absolute node.exe to bypass shell
  // resolution. We use process.execPath which is always the running node.
  const nodeExe = process.execPath;

  // Spawn the child detached. It reads the stdin file, opens the log for
  // append, and runs the target hook. The wrapper exits immediately.
  const launcherCode = `
    import * as fs from "node:fs";
    import { spawn } from "node:child_process";
    const stdinPayload = fs.readFileSync(${JSON.stringify(stdinFile)}, "utf8");
    const log = fs.openSync(${JSON.stringify(logFile)}, "a");
    const c = spawn(${JSON.stringify(nodeExe)}, [${JSON.stringify(target)}], {
      stdio: ["pipe", log, log], detached: true, windowsHide: true
    });
    c.stdin.end(stdinPayload);
    c.on("exit", () => {
      try { fs.unlinkSync(${JSON.stringify(stdinFile)}); } catch {}
      try { fs.closeSync(log); } catch {}
    });
    c.unref();
  `;

  try {
    const launcher = spawn(nodeExe, ["--input-type=module", "-e", launcherCode], {
      stdio: ["ignore", "ignore", "ignore"],
      detached: true,
      windowsHide: true,
    });
    launcher.unref();
  } catch { /* fall through to passthrough */ }

  emit({ continue: true });
}

try { main(); } catch { process.stdout.write(JSON.stringify({ continue: true })); }
