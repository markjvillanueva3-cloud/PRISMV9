#!/usr/bin/env node
/**
 * reap-llama-server-orphans.mjs - reap leaked Ollama llama-server.exe orphans.
 *
 * THE GAP THIS CLOSES (found 2026-06-09, slot:india -- [[reference_llama_server_orphan_reap_2026_06_09]]):
 * a critical-memory-pressure Stop gate fired at 97.4% COMMIT charge (not physical RAM). Root cause was
 * a leaked llama-server: Ollama reloaded a model (spawned a fresh llama-server) but the prior instance
 * for the SAME model blob lingered ~2h holding ~22GB of commit. Ollama runs exactly ONE llama-server per
 * loaded model, so two live processes sharing the identical `--model <blob>` means the older one is an
 * orphan Ollama no longer tracks. The existing reapers (06-aggressive-killer node/bash/git, the tsserver
 * zombie reaper, the fleet-reaper Tier-3) all MISSED it because none target llama-server.
 *
 * SAFETY (this kills GPU model-server processes -- be conservative):
 *   - DRY-RUN BY DEFAULT. Pass --apply to actually kill. (06-aggressive-killer kills by default; this does
 *     NOT, because a wrong kill here disrupts shared fleet inference.)
 *   - Only ever reaps a process that shares its EXACT model blob with a NEWER live process (a true dup).
 *   - The newest same-blob process is ALWAYS kept (it is the live reload). Single-instance models: untouched.
 *   - An orphan must also be older than --min-age (default 300s) -- guards the brief reload-handoff window
 *     where two same-blob servers legitimately overlap for a few seconds.
 *   - Never touches ollama.exe (the daemon) or any non-llama-server process.
 *   - Worst case if the heuristic is ever wrong: a one-time model reload on next request (fail-soft).
 *
 * USAGE:
 *   node scripts/system-health/reap-llama-server-orphans.mjs            # dry-run: report orphans only
 *   node scripts/system-health/reap-llama-server-orphans.mjs --apply    # actually reap
 *   node scripts/system-health/reap-llama-server-orphans.mjs --json     # structured output
 *   flags: --min-age <sec> (default 300)
 *
 * Output JSON: { orphans:[{pid,model,age,livePid,reason}], reaped:N, applied:bool, before:{...}, after:{...} }
 */

import { execFileSync } from "node:child_process";
import { existsSync, appendFileSync, mkdirSync } from "node:fs";
import { join } from "node:path";
import { pathToFileURL } from "node:url";

const args = process.argv.slice(2);
const APPLY = args.includes("--apply");
const JSON_MODE = args.includes("--json");
const DEFAULT_MIN_AGE_SEC = 300;

/**
 * Resolve the --min-age guard from argv. A non-finite or <= 0 value falls back to the default --
 * this is the safety-critical CLI parse: a 0/negative min-age would let selectLlamaOrphans reap a
 * young same-blob dup (a legitimate reload-overlap). Exported so that guard is unit-tested.
 */
export function resolveMinAgeSec(argv, fallback = DEFAULT_MIN_AGE_SEC) {
  const i = argv.indexOf("--min-age");
  const v = i >= 0 ? Number.parseInt(argv[i + 1], 10) : NaN;
  return Number.isFinite(v) && v > 0 ? v : fallback;
}
const MIN_AGE_SEC = resolveMinAgeSec(args);

const MAX_KILLS = 10;
const PS_TIMEOUT_MS = 8000;
const TASKKILL_TIMEOUT_MS = 3000;
const PRESSURE_TIMEOUT_MS = 4000;
const LOG_DIR = "H:/prism/state/shared";
const LOG_FILE = `${LOG_DIR}/llama-orphan-reaper.log`;

const POWERSHELL = (() => {
  const sysroot = process.env.SystemRoot || "C:\\Windows";
  const full = join(sysroot, "System32", "WindowsPowerShell", "v1.0", "powershell.exe");
  return existsSync(full) ? full : "powershell";
})();

function log(msg) {
  try {
    mkdirSync(LOG_DIR, { recursive: true });
    appendFileSync(LOG_FILE, `[${new Date().toISOString()}] ${msg}\n`, "utf8");
  } catch {}
}

// --- PURE CORE (unit-tested; no OS calls) -------------------------------------------------------

/**
 * Parse the pipe-delimited PowerShell enumeration into structured server records.
 * Line format: `pid|ageSec|port|modelBlob` (modelBlob = leaf of the --model path).
 * Malformed / blank lines are skipped (never throw on junk input).
 */
export function parseLlamaServers(raw) {
  if (!raw || typeof raw !== "string") return [];
  return raw
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line) => {
      const [pid, age, port, ...modelParts] = line.split("|");
      return {
        pid: Number.parseInt(pid, 10),
        age: Number.parseInt(age, 10),
        port: (port || "").trim(),
        model: modelParts.join("|").trim(),
      };
    })
    .filter((s) => Number.isFinite(s.pid) && Number.isFinite(s.age) && s.model);
}

/**
 * Decide which llama-server processes are orphans. The ONLY thing that makes a process an orphan:
 * another LIVE process serves the identical model blob and is NEWER, and this one is older than
 * minOrphanAgeSec. The newest per model blob is always kept. Single-instance models are never reaped.
 * @returns {Array<{pid,model,age,livePid,reason}>}
 */
export function selectLlamaOrphans(servers, opts = {}) {
  const minOrphanAgeSec = Number.isFinite(opts.minOrphanAgeSec) ? opts.minOrphanAgeSec : DEFAULT_MIN_AGE_SEC;
  const byModel = new Map();
  for (const s of servers) {
    // age < 0 means a future-dated CreationDate (clock skew) -- drop it entirely so it is neither a
    // live-anchor nor an orphan; never let a skewed clock decide a kill.
    if (!s || !s.model || !Number.isFinite(s.pid) || !Number.isFinite(s.age) || s.age < 0) continue;
    if (!byModel.has(s.model)) byModel.set(s.model, []);
    byModel.get(s.model).push(s);
  }
  const orphans = [];
  for (const [model, group] of byModel) {
    if (group.length < 2) continue; // exactly one server for this model = the live one, never an orphan
    // Smallest age = most recently created = the live reload. Keep it; older same-blob dups are orphans.
    const sorted = [...group].sort((a, b) => a.age - b.age);
    const live = sorted[0];
    for (const cand of sorted.slice(1)) {
      if (cand.age >= minOrphanAgeSec) {
        orphans.push({
          pid: cand.pid,
          model,
          age: cand.age,
          livePid: live.pid,
          reason: `dup-model-blob orphan: same model as live pid ${live.pid}, age ${cand.age}s >= ${minOrphanAgeSec}s`,
        });
      }
    }
  }
  return orphans;
}

// --- OS SHELL (thin) ----------------------------------------------------------------------------

function enumerateLlamaServers() {
  const psScript = [
    "$now = Get-Date",
    "Get-CimInstance Win32_Process -Filter \"Name='llama-server.exe'\" -ErrorAction SilentlyContinue | ForEach-Object {",
    "  $age = 0; if ($_.CreationDate) { try { $age = [int]((New-TimeSpan -Start $_.CreationDate -End $now).TotalSeconds) } catch {} }",
    "  $model = ''; if ($_.CommandLine -match '--model\\s+\"?([^\"\\s]+)') { $model = Split-Path $matches[1] -Leaf }",
    "  $port = ''; if ($_.CommandLine -match '--port\\s+(\\d+)') { $port = $matches[1] }",
    "  Write-Output \"$($_.ProcessId)|$age|$port|$model\"",
    "}",
  ].join("\n");
  try {
    const out = execFileSync(
      POWERSHELL,
      ["-NoProfile", "-ExecutionPolicy", "Bypass", "-Command", psScript],
      { timeout: PS_TIMEOUT_MS, encoding: "utf8", windowsHide: true }
    );
    return { ok: true, servers: parseLlamaServers(out), error: null };
  } catch (err) {
    const msg = err?.message || String(err);
    log(`enumerate failed: ${msg}`);
    // R12: a failed enumeration must NOT masquerade as "0 orphans" -- a real 22GB orphan could be
    // hiding behind the crash. Signal the failure distinctly so JSON/stdout consumers can tell them
    // apart (the false-negative is the more operationally-likely risk than a false-positive kill).
    return { ok: false, servers: [], error: msg };
  }
}

function readPressure() {
  try {
    const out = execFileSync(POWERSHELL, [
      "-NoProfile", "-Command",
      '$os = Get-CimInstance Win32_OperatingSystem; "$([math]::Round(($os.TotalVirtualMemorySize-$os.FreeVirtualMemory)/1MB,1)) $([math]::Round($os.TotalVirtualMemorySize/1MB,1))"',
    ], { encoding: "utf8", timeout: PRESSURE_TIMEOUT_MS });
    const [used, limit] = out.trim().split(/\s+/).map(Number);
    return { used_gb: used, limit_gb: limit, pct: limit > 0 ? +((used / limit) * 100).toFixed(1) : 0 };
  } catch { return null; }
}

function killPid(pid) {
  try {
    execFileSync("taskkill", ["/F", "/PID", String(pid)], {
      timeout: TASKKILL_TIMEOUT_MS, encoding: "utf8", windowsHide: true,
    });
    return true;
  } catch { return false; }
}

function main() {
  const before = readPressure();
  const { ok: enumerationOk, servers, error: enumError } = enumerateLlamaServers();
  const allOrphans = selectLlamaOrphans(servers, { minOrphanAgeSec: MIN_AGE_SEC });
  const orphans = allOrphans.slice(0, MAX_KILLS);

  let reaped = 0;
  if (APPLY) {
    for (const o of orphans) {
      if (killPid(o.pid)) {
        reaped++;
        log(`reaped pid=${o.pid} model=${o.model} age=${o.age}s livePid=${o.livePid}`);
      }
    }
  }
  const after = APPLY ? readPressure() : before;
  const result = {
    enumerationOk,
    serversSeen: servers.length,
    orphansFound: allOrphans.length, // pre-cap count -- exposes any MAX_KILLS truncation
    orphans,
    reaped,
    applied: APPLY,
    minAgeSec: MIN_AGE_SEC,
    before,
    after,
    ...(enumError ? { error: enumError } : {}),
  };
  if (!enumerationOk) process.exitCode = 1; // a failed enumeration is NOT a success ("0 orphans")

  if (JSON_MODE) {
    console.log(JSON.stringify(result));
  } else {
    const beforePct = before ? `${before.pct}%` : "n/a";
    const afterPct = after ? `${after.pct}%` : "n/a";
    const cappedNote = allOrphans.length > orphans.length ? ` (capped at ${MAX_KILLS} of ${allOrphans.length} found)` : "";
    if (!enumerationOk) {
      console.error(`llama-orphan-reaper: enumeration FAILED (${enumError}) -- cannot determine orphans, which is NOT the same as 0. commit ${beforePct}`);
    } else if (orphans.length === 0) {
      console.log(`llama-orphan-reaper: ${servers.length} llama-server(s) seen, 0 orphans. commit ${beforePct}`);
    } else if (APPLY) {
      console.log(`llama-orphan-reaper: reaped ${reaped}/${orphans.length} orphan(s)${cappedNote} (${orphans.map((o) => o.pid).join(",")}); commit ${beforePct} -> ${afterPct}`);
    } else {
      console.log(`llama-orphan-reaper [dry-run]: ${orphans.length} orphan(s) found${cappedNote} -> ${orphans.map((o) => `pid ${o.pid} (${o.model}, ${o.age}s)`).join("; ")}. Pass --apply to reap. commit ${beforePct}`);
    }
  }
}

const __isMain = (() => {
  try { return import.meta.url === pathToFileURL(process.argv[1] || "").href; } catch { return false; }
})();
if (__isMain) {
  try { main(); } catch (err) {
    log(`fatal: ${err?.message || err}`);
    if (JSON_MODE) console.log(JSON.stringify({ orphans: [], reaped: 0, error: String(err?.message || err) }));
    else console.error(`llama-orphan-reaper: fatal: ${err?.message || err}`);
    process.exit(1);
  }
}
