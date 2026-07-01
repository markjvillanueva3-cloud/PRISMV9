#!/usr/bin/env node
/**
 * singleton-service-guard.mjs — detect + repair duplicate/wedged singleton
 * service daemons (golf fleet-hygiene).
 *
 * THE GAP. PRISM's MCP server is a SINGLETON daemon bound to :3100. Its
 * supervisor/auto-reconnect spawns a fresh daemon on a detected outage but does
 * NOT reliably kill the old one → multiple `mcp-server/dist/index.js` daemons
 * pile up → port-bind conflict → :3100 down for the whole 26-chat fleet. This
 * has recurred (2026-06-02 + 2026-06-09). The fleet-reaper reaps orphans by
 * dead-ancestor logic, but two LEGIT-looking daemons (both real servers, live
 * cmd parents) are not flagged — so nothing auto-detects the duplicate-daemon
 * case. This guard closes it, sister to docker-service-health-check.mjs.
 *
 * SAFE REPAIR LOGIC (the load-bearing pure core, derived from the manual
 * 2026-06-09 recovery):
 *   - portUp & 1 daemon            → healthy, no action.
 *   - portUp & >1 daemon, server known → reap the NON-serving duplicates only
 *                                         (never kill the one bound to the port).
 *   - portUp & >1 daemon, server unknown → REPORT only (cannot safely pick which
 *                                           to keep without the port→pid owner).
 *   - !portUp & >=1 daemon         → all wedged (none serving) → reap ALL, then
 *                                     start a fresh one via the daemon helper.
 *   - !portUp & 0 daemon           → not running → start via the daemon helper.
 *
 * --fix STARTS, not just reaps (U-MCP-FIXSTART 2026-06-09): the existing
 * automated stack — the `PRISM MCP Server` supervisor task + `PRISM MCP Server
 * Watchdog`, both repeating — already respawns a DOWN server, but NEITHER reaps
 * a duplicate-daemon PILEUP (the 2026-06-09 outage: two wedged daemons fighting
 * for :3100 needed a MANUAL reap). This guard is the pileup reaper; making --fix
 * also START makes it a ONE-COMMAND recovery: `all-wedged` → reap the pileup
 * THEN respawn one clean daemon (via the helper, TRANSPORT=http); `not-running`
 * → spawn. On a HEALTHY singleton --fix is a strict NO-OP (proven). The
 * mcp-connectivity-check banner points operators here. No new scheduled task is
 * added — the supervisor stack covers proactive keep-alive; this closes only the
 * pileup-reap gap the stack lacks, on demand.
 *
 * Usage:
 *   node scripts/singleton-service-guard.mjs            # report (exit 0 healthy / 1 degraded)
 *   node scripts/singleton-service-guard.mjs --json
 *   node scripts/singleton-service-guard.mjs --fix      # reap + (re)start per the safe logic
 *
 * Pure core (`classifyServiceHealth`, `fixPlan`) is exported + tested — no IO.
 */
import { execFileSync } from "node:child_process";
import path from "node:path";
import { fileURLToPath } from "node:url";

// Repo root — this script lives at <root>/scripts/, so a service's startHelper
// path resolves one level up. Used by --fix's start step.
const REPO_ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

// Known PRISM singleton services. Extensible; MCP is the one that recurs.
// startHelper: a node CLI that idempotently (re)starts the service in its
// canonical form (TRANSPORT=http for MCP — see mcp-server-daemon.mjs:148). It
// MUST be safe to call when the service is already healthy (the helper detects
// health and no-ops + exits 0). The guard reaps the duplicate-pileup the helper
// can't see (it only knows its own pid-file), THEN calls the helper to spawn one
// clean replacement.
export const SINGLETON_SERVICES = [
  // cmdMatch is SLASH-AGNOSTIC (`[\\/]`) — the supervisor spawns the daemon as
  // `node H:/prism/mcp-server/dist/index.js` (FORWARD slashes) and the helper as
  // relative `node dist/index.js`. The original backslash-only `mcp-server\dist\index`
  // matched NEITHER, so daemonPidsFor returned [] against the live daemon (it owned
  // :3100 yet daemonCount read 0 — U-MCP-CMDMATCH-FIX 2026-06-09). The relative
  // helper form (no mcp-server prefix) is caught at runtime by unioning the
  // authoritative port-owner PID into the daemon set (see main()).
  { name: "mcp", port: 3100, cmdMatch: "mcp-server[\\\\/]+dist[\\\\/]+index",
    startHelper: ".claude/helpers/mcp-server-daemon.mjs" },
];

/**
 * Pure mirror of the PowerShell `-match` the IO shell runs in daemonPidsFor —
 * does a process command line look like the MCP dist/index server? Exported so a
 * REAL-string test can prove the cmdMatch regex matches the ACTUAL spawn forms
 * (the hermetic classifier tests inject daemonPids and never exercised this).
 * Case-insensitive to mirror PowerShell -match.
 */
export function isMcpDaemonCmdline(cmdLine, cmdMatch = SINGLETON_SERVICES[0].cmdMatch) {
  try { return new RegExp(cmdMatch, "i").test(String(cmdLine || "")); }
  catch { return false; }
}

const HTTP_TIMEOUT_MS = 4000;
const PS_TIMEOUT_MS = 12000;
const START_TIMEOUT_MS = 35000;   // the daemon helper waits up to 30s for /health
const PORT_SETTLE_MS = 1500;      // let a just-reaped port free before re-bind

/**
 * Pure classifier. Decides the health state + the SAFE repair action for one
 * singleton service, given whether its port responds, the set of its daemon
 * PIDs, and (if known) which PID owns the port. Never kills the serving PID.
 *
 * @returns {{ service, state, healthy, action, reapPids, message }}
 */
export function classifyServiceHealth({ name, portUp, daemonPids = [], servingPid = null }) {
  const pids = [...new Set(daemonPids.filter((p) => Number.isInteger(p) && p > 0))];
  const base = { service: name, daemonCount: pids.length, portUp: !!portUp };

  if (portUp && pids.length <= 1) {
    return { ...base, state: "healthy", healthy: true, action: "none", reapPids: [], message: `${name}: up, single daemon` };
  }
  if (portUp && pids.length > 1) {
    if (servingPid && pids.includes(servingPid)) {
      const reap = pids.filter((p) => p !== servingPid);
      return { ...base, state: "duplicate-serving", healthy: false, action: "reap-duplicates", reapPids: reap,
        message: `${name}: up but ${pids.length} daemons — reap ${reap.length} non-serving duplicate(s), keep ${servingPid}` };
    }
    // Port is up (something serves) but we can't identify which → do NOT guess.
    return { ...base, state: "duplicate-unknown-server", healthy: false, action: "report-only", reapPids: [],
      message: `${name}: up but ${pids.length} daemons and the serving PID is unknown — REPORT only (reaping could kill the server)` };
  }
  if (!portUp && pids.length >= 1) {
    return { ...base, state: "all-wedged", healthy: false, action: "reap-all", reapPids: pids,
      message: `${name}: port DOWN with ${pids.length} daemon(s) — all wedged; reap all, supervisor/reconnect binds a fresh one` };
  }
  return { ...base, state: "not-running", healthy: false, action: "start", reapPids: [],
    message: `${name}: port DOWN and no daemon — start it (launcher/supervisor)` };
}

/**
 * Pure: translate a classification into the ordered SAFE repair plan — which
 * PIDs to reap and whether to (re)start the service afterward. Kept as its own
 * pure unit so the reap-THEN-start sequencing and the "never touch a healthy or
 * ambiguous server" invariant are independently testable.
 *
 *   action            reap          start   rationale
 *   ───────────────── ───────────── ─────── ──────────────────────────────────
 *   none (healthy)    []            false   already up + single daemon
 *   reap-duplicates   non-serving   false   server is serving; just trim dups
 *   report-only       []            false   port up, owner unknown — NEVER act
 *   reap-all          all wedged    true    port down + pileup → clear, respawn
 *   start             []            true    port down + no daemon → spawn
 *
 * @returns {{ reap: number[], start: boolean }}
 */
export function fixPlan(classification = {}) {
  const { action, reapPids = [] } = classification;
  switch (action) {
    case "reap-duplicates": return { reap: [...reapPids], start: false };
    case "reap-all":        return { reap: [...reapPids], start: true };
    case "start":           return { reap: [], start: true };
    default:                return { reap: [], start: false }; // none, report-only, unknown
  }
}

// ── IO shell (Windows; only runs as CLI) ───────────────────────────────────
async function probePort(port) {
  try {
    const ctl = new AbortController();
    const t = setTimeout(() => ctl.abort(), HTTP_TIMEOUT_MS);
    const res = await fetch(`http://127.0.0.1:${port}`, { signal: ctl.signal }).catch(() => null);
    clearTimeout(t);
    return !!res; // any HTTP response (incl. 404) = the port is bound + serving
  } catch { return false; }
}

function daemonPidsFor(cmdMatch) {
  try {
    const out = execFileSync("powershell", ["-NoProfile", "-Command",
      `Get-CimInstance Win32_Process -Filter "Name='node.exe'" | Where-Object { $_.CommandLine -match '${cmdMatch}' } | Select-Object -ExpandProperty ProcessId`],
      { encoding: "utf8", timeout: PS_TIMEOUT_MS, windowsHide: true });
    return out.trim().split(/\r?\n/).map((s) => parseInt(s, 10)).filter((n) => Number.isInteger(n));
  } catch { return []; }
}

function portOwnerPid(port) {
  try {
    const out = execFileSync("powershell", ["-NoProfile", "-Command",
      `(Get-NetTCPConnection -LocalPort ${port} -State Listen -ErrorAction SilentlyContinue | Select-Object -First 1 -ExpandProperty OwningProcess)`],
      { encoding: "utf8", timeout: PS_TIMEOUT_MS, windowsHide: true });
    const pid = parseInt(out.trim(), 10);
    return Number.isInteger(pid) && pid > 0 ? pid : null;
  } catch { return null; }
}

function reap(pids) {
  if (!pids.length) return { reaped: [], failed: [] };
  const reaped = [], failed = [];
  for (const pid of pids) {
    try { execFileSync("powershell", ["-NoProfile", "-Command", `Stop-Process -Id ${pid} -Force -ErrorAction Stop`], { timeout: PS_TIMEOUT_MS, windowsHide: true }); reaped.push(pid); }
    catch (e) { failed.push({ pid, error: String((e && e.message) || e).slice(0, 80) }); }
  }
  return { reaped, failed };
}

/**
 * Start (or idempotently confirm) a service via its startHelper. The helper is
 * authoritative for HOW to spawn (env, transport, detach, health-wait); we only
 * invoke it. Safe to call when healthy — the helper detects health, no-ops, and
 * exits 0 (no second daemon spawned). Never throws: a non-zero helper exit
 * (started-but-unhealthy) is reported, not raised.
 * @returns {{ started:boolean, code:number|null, reason?:string, error?:string }}
 */
function startService(svc) {
  if (!svc || !svc.startHelper) return { started: false, code: null, reason: "no-start-helper" };
  const helperPath = path.isAbsolute(svc.startHelper) ? svc.startHelper : path.join(REPO_ROOT, svc.startHelper);
  try {
    execFileSync(process.execPath, [helperPath, "start"],
      { encoding: "utf8", timeout: START_TIMEOUT_MS, windowsHide: true, stdio: ["ignore", "pipe", "pipe"] });
    return { started: true, code: 0 };
  } catch (e) {
    return { started: false, code: Number.isInteger(e && e.status) ? e.status : null,
      error: String((e && e.message) || e).slice(0, 120) };
  }
}

async function main() {
  const json = process.argv.includes("--json");
  const fix = process.argv.includes("--fix");
  const results = [];
  for (const svc of SINGLETON_SERVICES) {
    const portUp = await probePort(svc.port);
    const regexPids = daemonPidsFor(svc.cmdMatch);
    const servingPid = portUp ? portOwnerPid(svc.port) : null;
    // Union the authoritative port-owner PID into the daemon set: a daemon spawned
    // with a relative `dist/index.js` cmd line (the helper's form, no mcp-server
    // prefix) can evade even the slash-agnostic cmdMatch, but the port owner is
    // path-agnostic + authoritative — so the SERVING daemon is never under-counted
    // (the bug that made a live daemon read daemonCount=0). When the port is down
    // there is no owner, so a wedged daemon is matched by the (now slash-agnostic)
    // cmdMatch alone.
    const daemonPids = servingPid && !regexPids.includes(servingPid) ? [...regexPids, servingPid] : regexPids;
    const c = classifyServiceHealth({ name: svc.name, portUp, daemonPids, servingPid });
    if (fix) {
      const plan = fixPlan(c);
      if (plan.reap.length) c.fix = reap(plan.reap);
      if (plan.start) {
        if (plan.reap.length) await new Promise((r) => setTimeout(r, PORT_SETTLE_MS));
        c.startResult = startService(svc);
        // R12 — prove it: re-probe the port and report the post-fix truth.
        c.fixedHealthy = await probePort(svc.port);
      }
    }
    results.push(c);
  }
  const healthy = results.every((r) => r.healthy);
  if (json) { process.stdout.write(JSON.stringify({ healthy, results })); process.exit(healthy ? 0 : 1); }
  process.stdout.write(`[singleton-guard] ${healthy ? "✓ all singletons healthy" : "⚠ degraded"}\n`);
  for (const r of results) {
    const fixNote = [
      r.fix ? `reaped ${r.fix.reaped.join(",") || "none"}${r.fix.failed.length ? ` (failed ${r.fix.failed.length})` : ""}` : "",
      r.startResult ? `start ${r.startResult.started ? "ok" : `FAILED(${r.startResult.reason || r.startResult.error || r.startResult.code})`}` : "",
      r.fixedHealthy !== undefined ? `post-fix port ${r.fixedHealthy ? "UP" : "DOWN"}` : "",
    ].filter(Boolean).join(" · ");
    process.stdout.write(`  ${r.healthy ? "✓" : "✗"} ${r.message}` + (fixNote ? `  → ${fixNote}` : "") + "\n");
  }
  process.exit(healthy ? 0 : 1);
}

if (process.argv[1] && import.meta.url.endsWith(path.basename(process.argv[1]))) {
  main().catch((e) => {
    process.stdout.write(JSON.stringify({ healthy: false, error: String((e && e.message) || e) }));
    process.exit(2);
  });
}
