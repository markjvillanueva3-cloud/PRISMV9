#!/usr/bin/env node
/**
 * Node orphan cleaner for PRISM/Codex.
 *
 * Goals:
 * - Kill stale transient Node workers (vitest, stdin runners, one-off CLI helpers)
 * - Preserve long-lived PRISM services and app-owned MCP/extension processes
 * - Run safely from shell startup/exit and a lightweight scheduled task
 */
import { execFileSync } from 'child_process';
import { appendFileSync, existsSync, mkdirSync, readFileSync, unlinkSync, writeFileSync } from 'fs';
import { join } from 'path';
import { pathToFileURL } from 'url';
// Single source of truth for the PRISM/fleet-worker protect list, shared with
// fleet-reaper-sweep's stale-node hunter (2026-06-11 incident fix). A node
// running PRISM/fleet tooling (miner / *-sidecar / pipeline / fleet-* / ollama /
// mcp-server / ...) is a legit worker and must never be reaped here either,
// regardless of RSS/age/CPU -- closes the aggressive-mode (cpu<=5 && mem<=350)
// path that could reap an idle detached fleet worker not in KEEP_PATTERNS.
import { DEFAULT_PRISM_WORKER_PROTECT_REGEX } from '../../scripts/lib/fleet-reaper-mcp-zombie-hunter.mjs';

const args = new Set(process.argv.slice(2));
const QUIET = args.has('--quiet');
const DRY_RUN = args.has('--dry-run');
const FORCE = args.has('--force');
const REASON = process.argv.slice(2).find(arg => arg.startsWith('--reason='))?.split('=')[1] || 'manual';
const MIN_AGE_OVERRIDE = Number.parseInt(process.argv.slice(2).find(arg => arg.startsWith('--min-age='))?.split('=')[1] || '', 10);

const MIN_AGE_MINUTES = Number.isFinite(MIN_AGE_OVERRIDE) ? MIN_AGE_OVERRIDE : 8;
const CPU_THRESHOLD_SEC = 15;
const UNKNOWN_CPU_THRESHOLD_SEC = 5;
const MAX_TOTAL_NODE_MB = 8000;
const RUN_THROTTLE_MS = 90 * 1000;

const LOG_DIR = join('H:', 'prism', 'state', 'shared');
const LOG_FILE = join(LOG_DIR, 'node-orphan-cleaner.log');
const STATE_FILE = join(LOG_DIR, 'node-orphan-cleaner.state.json');
const TEMP_DIR = process.env.TEMP || 'C:\\Temp';
const POWERSHELL = (() => {
  const systemRoot = process.env.SystemRoot || 'C:\\Windows';
  const fullPath = join(systemRoot, 'System32', 'WindowsPowerShell', 'v1.0', 'powershell.exe');
  return existsSync(fullPath) ? fullPath : 'powershell';
})();

const KEEP_PATTERNS = [
  /node_modules[\\/]+vite[\\/]+bin[\\/]+vite\.js/i,
  /scripts[\\/]+start-http\.mjs/i,
  /agent-coordination-daemon\.mjs/i,
  /mcp-server[\\/]+dist[\\/]+index\.js/i,
  /prism-context-only\.ts/i,
  /@playwright[\\/]mcp/i,
  /Claude Extensions/i,
  /Adobe/i,
  // HARNESS-AUDIT/U-TIER3c additions (2026-05-10) — long-lived watchers + LSPs
  // that were getting age-out killed under low CPU. See scrutiny audit
  // af11f0fe2e08970bb and reference_load_bearing_scheduled_tasks.md memory.
  /unified-observability-drain\.mjs/i,
  /dashboard-serve\.mjs/i,
  /typescript-language-server/i,
  /tsserver\.js/i,
];

const TRANSIENT_PATTERNS = [
  /\bvitest\b/i,
  /\btsx(?:\.cmd)?\b.*\bvitest\b/i,
  /\bjest\b/i,
  /\bmocha\b/i,
  /\bava\b/i,
  /\besbuild\b/i,
  /\bts-node\b/i,
  /\bplaywright\b/i,
  /node(?:\.exe)?"?\s+-($|\s)/i,
  /node(?:\.exe)?"?\s+-e(\s|$)/i,
  /node(?:\.exe)?"?\s+--eval(\s|$)/i,
];

function log(message) {
  const timestamp = new Date().toISOString();
  try {
    mkdirSync(LOG_DIR, { recursive: true });
    appendFileSync(LOG_FILE, `[${timestamp}] ${message}\n`);
  } catch {
    // Best effort only.
  }
}

function readState() {
  try {
    return JSON.parse(readFileSync(STATE_FILE, 'utf-8'));
  } catch {
    return {};
  }
}

function writeState(state) {
  try {
    mkdirSync(LOG_DIR, { recursive: true });
    writeFileSync(STATE_FILE, JSON.stringify(state, null, 2));
  } catch {
    // Best effort only.
  }
}

function shouldThrottle() {
  if (FORCE) return false;
  const state = readState();
  const lastRun = state.lastRunAt ? Date.parse(state.lastRunAt) : Number.NaN;
  if (!Number.isFinite(lastRun)) return false;
  return Date.now() - lastRun < RUN_THROTTLE_MS;
}

function getNodeProcesses() {
  const psScript = `
$listenPortsByPid = @{}
try {
  Get-NetTCPConnection -State Listen -ErrorAction Stop | ForEach-Object {
    if (-not $listenPortsByPid.ContainsKey($_.OwningProcess)) {
      $listenPortsByPid[$_.OwningProcess] = New-Object System.Collections.Generic.List[string]
    }
    $listenPortsByPid[$_.OwningProcess].Add([string]$_.LocalPort)
  }
} catch {}

$procIndex = @{}
Get-CimInstance Win32_Process -ErrorAction SilentlyContinue | ForEach-Object {
  $procIndex[$_.ProcessId] = $_.Name
}

$procs = Get-CimInstance Win32_Process -Filter "Name = 'node.exe'" -ErrorAction SilentlyContinue
foreach ($proc in $procs) {
  $cpuVal = 0
  $memVal = 0
  $ageVal = 0
  try {
    $live = Get-Process -Id $proc.ProcessId -ErrorAction Stop
    if ($live.CPU) { $cpuVal = [math]::Round($live.CPU, 1) }
    if ($live.WorkingSet64) { $memVal = [math]::Round($live.WorkingSet64 / 1MB) }
    if ($live.StartTime) { $ageVal = [math]::Round(((Get-Date) - $live.StartTime).TotalMinutes) }
  } catch {}

  $ports = ''
  if ($listenPortsByPid.ContainsKey($proc.ProcessId)) {
    $ports = (($listenPortsByPid[$proc.ProcessId] | Sort-Object -Unique) -join ',')
  }

  $command = $proc.CommandLine
  if ($null -eq $command) { $command = '' }
  $command = $command -replace '\\|', '/'
  $parentName = ''
  if ($proc.ParentProcessId -and $procIndex.ContainsKey($proc.ParentProcessId)) {
    $parentName = $procIndex[$proc.ParentProcessId]
  }

  Write-Output "$($proc.ProcessId)|$memVal|$cpuVal|$ageVal|$ports|$($proc.ParentProcessId)|$parentName|$command"
}
`.trim();

  const tempScript = join(TEMP_DIR, `prism_node_list_${process.pid}.ps1`);
  try {
    writeFileSync(tempScript, psScript);
    const output = execFileSync(POWERSHELL, ['-NoProfile', '-ExecutionPolicy', 'Bypass', '-File', tempScript], { windowsHide: true,
      timeout: 15000,
      encoding: 'utf-8',
    }).trim();
    if (!output) return [];
    return output
      .split(/\r?\n/)
      .map(line => {
        const [pid, mem, cpu, age, ports, parentPid, parentName, ...commandParts] = line.trim().split('|');
        return {
          pid: Number.parseInt(pid, 10),
          mem: Number.parseInt(mem, 10),
          cpu: Number.parseFloat(cpu),
          age: Number.parseInt(age, 10),
          ports: (ports || '')
            .split(',')
            .map(port => Number.parseInt(port, 10))
            .filter(port => Number.isFinite(port)),
          parentPid: Number.parseInt(parentPid, 10),
          parentName: parentName || '',
          commandLine: commandParts.join('|').trim(),
        };
      })
      .filter(proc => Number.isFinite(proc.pid));
  } catch (error) {
    log(`Error listing node processes: ${error.message}`);
    return [];
  } finally {
    try {
      unlinkSync(tempScript);
    } catch {
      // Ignore temp cleanup failures.
    }
  }
}

function killProcess(pid) {
  try {
    execFileSync('taskkill', ['/F', '/PID', String(pid)], { windowsHide: true,
      timeout: 5000,
      encoding: 'utf-8',
    });
    return true;
  } catch {
    return false;
  }
}

function matchesAny(patterns, value) {
  return patterns.some(pattern => pattern.test(value));
}

function isProtected(proc) {
  const command = proc.commandLine || '';
  if (proc.ports.includes(3000) || proc.ports.includes(3100)) {
    return true;
  }
  if (matchesAny(KEEP_PATTERNS, command)) {
    return true;
  }
  // SHARED PRISM/fleet-worker protect (2026-06-11 incident fix): a node running
  // prism tooling (miner/sidecar/pipeline/fleet-*/ollama/...) is a legit worker,
  // never reap it -- single source of truth = the fleet-reaper hunter's regex.
  if (command && DEFAULT_PRISM_WORKER_PROTECT_REGEX.test(command)) {
    return true;
  }
  if (proc.parentName && /Codex|Claude|Creative Cloud/i.test(proc.parentName)) {
    return true;
  }
  return false;
}

function isTransient(proc) {
  const command = proc.commandLine || '';
  if (/@playwright[\\/]mcp/i.test(command)) {
    return false;
  }
  if (matchesAny(TRANSIENT_PATTERNS, command)) {
    return true;
  }
  return command === '' && proc.parentName !== 'Codex.exe';
}

function shouldKill(proc, aggressive) {
  if (isProtected(proc)) return false;
  if (proc.age < MIN_AGE_MINUTES) return false;

  const cpu = Number.isFinite(proc.cpu) ? proc.cpu : 0;
  if (cpu > CPU_THRESHOLD_SEC) return false;

  if (isTransient(proc)) {
    return true;
  }

  if (!aggressive) {
    return false;
  }

  return cpu <= UNKNOWN_CPU_THRESHOLD_SEC && proc.mem <= 350;
}

function summarize(proc) {
  const ports = proc.ports.length > 0 ? ` ports=${proc.ports.join(',')}` : '';
  const parent = proc.parentName ? ` parent=${proc.parentName}(${proc.parentPid || '?'})` : '';
  return `PID ${proc.pid}: ${proc.mem}MB CPU:${proc.cpu || 0}s Age:${proc.age}m${ports}${parent} cmd=${proc.commandLine || '<none>'}`;
}

function run() {
  if (shouldThrottle()) {
    return;
  }

  const startedAt = new Date().toISOString();
  const processes = getNodeProcesses();
  if (processes.length === 0) {
    writeState({ lastRunAt: startedAt, reason: REASON, summary: 'No node processes found' });
    log(`No node processes found (${REASON})`);
    return;
  }

  const totalMem = processes.reduce((sum, proc) => sum + (proc.mem || 0), 0);
  const aggressive = totalMem > MAX_TOTAL_NODE_MB;

  log(`Scan (${REASON}): found ${processes.length} node processes, total ${totalMem}MB${aggressive ? ' (aggressive)' : ''}`);

  let killed = 0;
  let freedMB = 0;
  let denied = 0;
  let protectedCount = 0;

  for (const proc of processes) {
    if (isProtected(proc)) {
      protectedCount += 1;
      continue;
    }
    if (!shouldKill(proc, aggressive)) {
      continue;
    }

    if (DRY_RUN) {
      log(`DRY RUN would kill ${summarize(proc)}`);
      killed += 1;
      freedMB += proc.mem || 0;
      continue;
    }

    if (killProcess(proc.pid)) {
      killed += 1;
      freedMB += proc.mem || 0;
      log(`Killed ${summarize(proc)}`);
    } else {
      denied += 1;
      log(`Access denied while killing ${summarize(proc)}`);
    }
  }

  const remaining = getNodeProcesses();
  const remainingMem = remaining.reduce((sum, proc) => sum + (proc.mem || 0), 0);
  const summary = `Killed ${killed}${DRY_RUN ? ' (dry-run)' : ''} (freed ${freedMB}MB), ${denied} access-denied, ${remaining.length} remain (${remainingMem}MB), protected=${protectedCount}`;

  writeState({
    lastRunAt: startedAt,
    reason: REASON,
    summary,
    aggressive,
  });
  log(summary);

  if (!QUIET && (killed > 0 || denied > 0)) {
    process.stdout.write(JSON.stringify({
      additionalContext: `Node orphan cleaner: ${summary}.${denied > 0 ? ' Some app-owned processes could not be terminated.' : ''}`,
    }));
  }
}

// Exported for unit testing of the pure decision functions.
export { isProtected, shouldKill, isTransient };

// Main-guard: only auto-run the killer when invoked directly (scheduled task /
// CLI), NOT when imported by a test. process.argv[1] is the entry script path.
if (import.meta.url === pathToFileURL(process.argv[1] || '').href) {
  run();
}
