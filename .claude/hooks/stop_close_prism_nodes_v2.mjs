#!/usr/bin/env node
// tier: T4
/**
 * stop_close_prism_nodes_v2.mjs — PRISM-STAB-MS0/U-A3 (2026-05-09).
 *
 * Stop hook that hunts down orphan git.exe / node.exe processes whose
 * parent has died, but only when their CommandLine identifies them as
 * spawned by our hook stack. Replaces the broken v1 which couldn't
 * traverse Windows process descendants reliably.
 *
 * Why this exists: the legacy git-sync-stop.mjs (pre-U-A1) used
 *   spawn(..., { windowsHide: true, detached: true }).unref()
 * which leaves zombie git.exe processes that scan the 7142-file working
 * tree forever. With 8 concurrent chats × Stop events × hung pushes,
 * RAM pressure climbs into 2GB+ of orphaned git scans.
 *
 * v2 design:
 *   - Enumerate via WMIC (absolute path) — already available
 *   - For each git.exe/node.exe, check ParentProcessId. If parent PID
 *     no longer exists (process.kill(ppid, 0) → ESRCH), it's an orphan.
 *   - Match CommandLine against allow-list of our paths. Never kill
 *     processes outside our domain.
 *   - SIGTERM via taskkill /F (Windows) or process.kill (POSIX).
 *   - Log every kill to state/shared/orphan-reaper.log (append-only JSONL).
 *   - Always exit 0 — non-blocking, never blocks Stop.
 */

import { readFileSync, existsSync, mkdirSync, appendFileSync } from "node:fs";
import { spawnSync } from "node:child_process";
import { dirname } from "node:path";

const WMIC = "C:/Windows/System32/wbem/WMIC.exe";
const TASKKILL = "C:/Windows/System32/taskkill.exe";
const LOG_PATH = "H:/prism/state/shared/orphan-reaper.log";

// CommandLine patterns that identify "ours" — never kill outside this allow-list.
const OUR_PATTERNS = [
  /H:[/\\]+prism[/\\]+\.claude[/\\]+hooks/i,
  /H:[/\\]+prism[/\\]+\.claude[/\\]+helpers/i,
  /H:[/\\]+prism[/\\]+\.claude[/\\]+scripts/i,
  /H:[/\\]+prism[/\\]+scripts/i,
  /H:[/\\]+prism[/\\]+mcp-server[/\\]+scripts/i,
  /H:[/\\]+\.claude/i,
  // git-sync-stop spawns plain `git push` — match by cwd if it's our repo
  // (we'll cross-check with cwd below for git.exe specifically)
];

const PRISM_REPO_RE = /H:[/\\]+prism\b/i;

function logEvent(record) {
  try {
    if (!existsSync(dirname(LOG_PATH))) mkdirSync(dirname(LOG_PATH), { recursive: true });
    appendFileSync(LOG_PATH, JSON.stringify({ ts: new Date().toISOString(), ...record }) + "\n");
  } catch { /* never fatal */ }
}

function listProcesses() {
  // WMIC: name=git.exe OR node.exe. Output: ParentProcessId,ProcessId,Name,CommandLine,ExecutablePath
  if (!existsSync(WMIC)) return [];
  const r = spawnSync(WMIC,
    ["process", "where", "(Name='git.exe' OR Name='node.exe')",
     "get", "ParentProcessId,ProcessId,Name,CommandLine", "/format:csv"],
    { windowsHide: true, encoding: "utf-8", timeout: 4000 });
  if (r.status !== 0 || !r.stdout) return [];
  // CSV header line + records. Format: Node,CommandLine,Name,ParentProcessId,ProcessId
  const lines = r.stdout.split(/\r?\n/).filter(Boolean);
  if (lines.length < 2) return [];
  const header = lines[0].split(",").map((s) => s.trim());
  const idx = (k) => header.indexOf(k);
  const out = [];
  for (let i = 1; i < lines.length; i++) {
    // CommandLine may contain commas inside quotes — naive split won't work.
    // WMIC /format:csv quotes fields with commas. Use a tolerant CSV parser.
    const fields = parseCsvLine(lines[i]);
    if (fields.length < header.length) continue;
    const pid = Number(fields[idx("ProcessId")]);
    const ppid = Number(fields[idx("ParentProcessId")]);
    const name = fields[idx("Name")];
    const cmd = fields[idx("CommandLine")];
    if (!Number.isFinite(pid) || !Number.isFinite(ppid)) continue;
    out.push({ pid, ppid, name, cmd: cmd || "" });
  }
  return out;
}

function parseCsvLine(line) {
  const out = [];
  let cur = "";
  let inQ = false;
  for (const ch of line) {
    if (ch === '"') inQ = !inQ;
    else if (ch === "," && !inQ) { out.push(cur); cur = ""; }
    else cur += ch;
  }
  out.push(cur);
  return out.map((s) => s.replace(/^"|"$/g, ""));
}

function isAlive(pid) {
  try { process.kill(pid, 0); return true; }
  catch (e) { return e.code !== "ESRCH"; }
}

function isOurProcess(p) {
  if (OUR_PATTERNS.some((re) => re.test(p.cmd))) return true;
  // Special-case git.exe with no obvious path match: check if cwd is the prism repo.
  // We can't get cwd of another process easily on Windows without psutil; rely on cmd.
  if (p.name?.toLowerCase() === "git.exe" && PRISM_REPO_RE.test(p.cmd)) return true;
  return false;
}

function killProcess(pid) {
  if (existsSync(TASKKILL)) {
    const r = spawnSync(TASKKILL, ["/PID", String(pid), "/F"], { windowsHide: true, encoding: "utf-8", timeout: 2000 });
    return r.status === 0;
  }
  // POSIX fallback (CI / WSL)
  try { process.kill(pid, "SIGKILL"); return true; }
  catch { return false; }
}

function main() {
  // Read stdin (Stop hook payload — we don't actually consume it, just drain it)
  try {
    if (!process.stdin.isTTY) readFileSync(0, "utf-8");
  } catch { /* ignore */ }

  const startedAt = Date.now();
  const procs = listProcesses();
  let scanned = 0, candidates = 0, killed = 0, errors = 0;

  for (const p of procs) {
    scanned++;
    // Skip if parent is alive — not orphan
    if (isAlive(p.ppid)) continue;
    candidates++;
    // Skip if not ours — never kill external processes
    if (!isOurProcess(p)) continue;
    // Reap
    const ok = killProcess(p.pid);
    if (ok) {
      killed++;
      logEvent({ event: "kill", pid: p.pid, ppid: p.ppid, name: p.name, cmd: p.cmd.slice(0, 200) });
    } else {
      errors++;
      logEvent({ event: "kill_failed", pid: p.pid, ppid: p.ppid, name: p.name });
    }
  }

  if (killed > 0 || candidates > 0) {
    process.stderr.write(
      `stop_close_prism_nodes_v2: scanned=${scanned} orphans=${candidates} ours_killed=${killed} errors=${errors} (${Date.now() - startedAt}ms)\n`
    );
  }

  // ALWAYS continue — non-blocking by design
  process.stdout.write(JSON.stringify({ continue: true }));
}

try { main(); }
catch (e) {
  logEvent({ event: "fatal", error: e.message });
  process.stdout.write(JSON.stringify({ continue: true }));
}
