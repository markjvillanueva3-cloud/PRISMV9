#!/usr/bin/env node
/**
 * PRISM System Health 03 - Commit pressure monitor
 * =====================================================================
 * Reports current Windows commit-pressure ratio and exits with:
 *   exit 0  - healthy (< 75%)
 *   exit 1  - watch  (75-85%)
 *   exit 2  - critical (>= 85%) - new allocations likely to fail
 *
 * Usable as Stop-hook gate, /startup probe, or standalone CLI.
 * Also reads ollama loaded models, claude session count, and the
 * top 5 node processes by private commit so the user gets a one-glance
 * triage view.
 *
 * CLI flags:
 *   --json     machine-readable output
 *   --quiet    suppress headers (only the verdict line)
 *   --threshold-watch 75  --threshold-crit 85
 */

import { execFileSync } from 'node:child_process';

const args = process.argv.slice(2);
const flag = (name) => args.includes(name);
const optVal = (name, def) => {
  const i = args.indexOf(name);
  return i >= 0 && args[i + 1] ? Number(args[i + 1]) : def;
};

const WATCH = optVal('--threshold-watch', 75);
const CRIT = optVal('--threshold-crit', 85);
const JSON_OUT = flag('--json');
const QUIET = flag('--quiet');

function ps(cmd) {
  try {
    return execFileSync('powershell.exe', ['-NoProfile', '-Command', cmd], {
      encoding: 'utf8',
      maxBuffer: 32 * 1024 * 1024,
    });
  } catch (e) {
    return '';
  }
}

// Pull Windows commit usage
const out = ps(
  '$os = Get-CimInstance Win32_OperatingSystem; ' +
  '"$([math]::Round(($os.TotalVirtualMemorySize-$os.FreeVirtualMemory)/1MB,1)) ' +
  '$([math]::Round($os.TotalVirtualMemorySize/1MB,1)) ' +
  '$([math]::Round($os.FreePhysicalMemory/1MB,1)) ' +
  '$([math]::Round($os.TotalVisibleMemorySize/1MB,1))"'
);
const [used, limit, freeRam, totalRam] = out.trim().split(/\s+/).map(Number);
const pct = limit > 0 ? Math.round((used / limit) * 1000) / 10 : 0;

// Top node consumers
const topNode = ps(
  'Get-Process node -ErrorAction SilentlyContinue | ' +
  'Sort-Object PrivateMemorySize64 -Descending | ' +
  'Select-Object -First 5 Id, @{n=\'PM_MB\';e={[math]::Round($_.PrivateMemorySize64/1MB,0)}} | ' +
  'ForEach-Object { "$($_.Id):$($_.PM_MB)" }'
).trim().split(/\r?\n/).filter(Boolean);

const claudeCount = (ps('(Get-Process claude -ErrorAction SilentlyContinue).Count').trim() || '0');
const nodeCount = (ps('(Get-Process node -ErrorAction SilentlyContinue).Count').trim() || '0');

let status = 'healthy';
let exitCode = 0;
if (pct >= CRIT) { status = 'critical'; exitCode = 2; }
else if (pct >= WATCH) { status = 'watch'; exitCode = 1; }

const result = {
  status,
  commit_used_gb: used,
  commit_limit_gb: limit,
  commit_pct: pct,
  free_ram_gb: freeRam,
  total_ram_gb: totalRam,
  claude_chats: Number(claudeCount),
  node_processes: Number(nodeCount),
  top_node_pm_mb: topNode.map((s) => {
    const [pid, mb] = s.split(':');
    return { pid: Number(pid), pm_mb: Number(mb) };
  }),
  thresholds: { watch: WATCH, crit: CRIT },
};

if (JSON_OUT) {
  process.stdout.write(JSON.stringify(result, null, 2) + '\n');
} else {
  if (!QUIET) {
    process.stdout.write(`=== PRISM Commit Pressure ===\n`);
  }
  const colour = exitCode === 2 ? '\x1b[31m' : exitCode === 1 ? '\x1b[33m' : '\x1b[32m';
  const reset = '\x1b[0m';
  process.stdout.write(
    `${colour}[${status.toUpperCase()}]${reset} ` +
    `commit ${used}/${limit} GB (${pct}%) | ` +
    `free RAM ${freeRam} GB | ` +
    `chats ${claudeCount} | ` +
    `node procs ${nodeCount}\n`
  );
  if (!QUIET && exitCode > 0) {
    process.stdout.write(`Top node consumers: ${topNode.join(', ')}\n`);
    if (exitCode === 2) {
      process.stdout.write(
        `\n${colour}ACTION REQUIRED:${reset}\n` +
        `  - Run scripts/system-health/02-kill-zombie-tsservers.ps1 to reclaim memory\n` +
        `  - /compact this chat if context > 2M tokens\n` +
        `  - Stop ollama models: 'ollama stop <model>' (each ~5 GB)\n` +
        `  - Close idle Claude chats (cap at 3)\n`
      );
    }
  }
}

process.exit(exitCode);
