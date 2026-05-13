#!/usr/bin/env node
// tier: T4
/**
 * session-start-zombie-reap.mjs — SessionStart hook
 *
 * Permafix for the "stuck chats" failure mode (2026-05-09).
 * Catches what Stop hooks miss when chats crash/force-quit/OS-reboot:
 *
 *   1. Chat-bus zombies — presence files for dead claudes, expired claims.
 *      Bare invocation of chat-bus-reap.mjs sweeps ALL entries (not just
 *      this chat's), so phantom "active peers" stop polluting hook output.
 *
 *   2. tsserver leaks — VS Code TypeScript servers that never died with
 *      their parent. Only kills if commit pressure > 80% (we don't need
 *      to fight VS Code's tsserver lifecycle when we're not pressured).
 *
 *   3. Orphan MCP children — node.exe spawned by claude as MCP servers
 *      (playwright, context7, upstash, etc.) whose parent claude.exe is
 *      gone. Only kills when age > 5min AND parent process is missing
 *      AND cmdline matches an MCP-server pattern. Deliberately conservative.
 *
 * Idempotent. Silent if nothing reaped. Always exits 0.
 *
 * Why SessionStart: chats that crash never fire their Stop hook chain, so
 * cleanup must be opportunistic at the next session boot.
 */

import fs from "node:fs";
import path from "node:path";
import os from "node:os";
import { spawnSync } from "node:child_process";

const REAP_HELPER = "H:/prism/.claude/helpers/chat-bus-reap.mjs";
const PRESSURE_CHECK = "H:/prism/scripts/system-health/03-commit-pressure-check.mjs";
const TSSERVER_KILLER = "H:/prism/scripts/system-health/02-kill-zombie-tsservers.ps1";
const PRESSURE_THRESHOLD = 80;
const MCP_AGE_GRACE_MIN = 5;

function silent() {
  process.stdout.write(JSON.stringify({ continue: true }));
  process.exit(0);
}

function emit(systemMessage) {
  process.stdout.write(JSON.stringify({ continue: true, systemMessage }));
  process.exit(0);
}

function tryReap() {
  if (!fs.existsSync(REAP_HELPER)) return null;
  const r = spawnSync(process.execPath, [REAP_HELPER, "--json"], {
    encoding: "utf8",
    timeout: 5000,
    windowsHide: true,
  });
  if (r.status !== 0) return null;
  try {
    const j = JSON.parse(r.stdout || "{}");
    return j.counts || null;
  } catch {
    return null;
  }
}

function readPressurePct() {
  if (!fs.existsSync(PRESSURE_CHECK)) return null;
  const r = spawnSync(process.execPath, [PRESSURE_CHECK, "--quiet"], {
    encoding: "utf8",
    timeout: 5000,
    windowsHide: true,
  });
  // Output: "[CRITICAL] commit 31/35.2 GB (88.1%) | ..."
  const m = (r.stdout + r.stderr).match(/\((\d+(?:\.\d+)?)%\)/);
  return m ? parseFloat(m[1]) : null;
}

function killZombieTsservers() {
  if (!fs.existsSync(TSSERVER_KILLER)) return null;
  const r = spawnSync(
    "powershell",
    ["-ExecutionPolicy", "Bypass", "-NoProfile", "-File", TSSERVER_KILLER],
    { encoding: "utf8", timeout: 15000, windowsHide: true },
  );
  // Output contains: "Reclaimed approximately NNNN MB private memory."
  const m = r.stdout.match(/Reclaimed approximately (\d+)\s*MB/);
  const killedM = r.stdout.match(/^\s*killed PID/gm);
  return {
    killed: killedM ? killedM.length : 0,
    reclaimedMB: m ? parseInt(m[1], 10) : 0,
  };
}

const ORPHAN_PS = `
$ErrorActionPreference = 'SilentlyContinue'
$now = Get-Date
$liveClaudes = @{}
Get-Process -Name claude -EA SilentlyContinue | ForEach-Object { $liveClaudes[$_.Id] = $true }
$orphans = @()
$mcpPattern = 'npx-cli\\.js|@playwright/mcp|@upstash/context7|tavily-mcp|@modelcontextprotocol|_npx\\\\'
foreach ($n in (Get-CimInstance Win32_Process -Filter "Name='node.exe'")) {
  if (-not $n.CommandLine) { continue }
  if ($n.CommandLine -notmatch $mcpPattern) { continue }
  $age = ($now - $n.CreationDate).TotalMinutes
  if ($age -lt ${MCP_AGE_GRACE_MIN}) { continue }
  $cur = [int]$n.ParentProcessId
  $hadClaude = $false; $claudeAlive = $false; $hops = 0
  while ($cur -gt 0 -and $hops -lt 8) {
    $par = Get-CimInstance Win32_Process -Filter "ProcessId=$cur" -EA SilentlyContinue
    if (-not $par) { break }
    if ($par.Name -eq 'claude.exe') {
      $hadClaude = $true
      $claudeAlive = $liveClaudes.ContainsKey([int]$cur)
      break
    }
    $cur = [int]$par.ParentProcessId; $hops++
  }
  if ($hadClaude -and -not $claudeAlive) {
    $orphans += [pscustomobject]@{ Pid=$n.ProcessId; WS=[math]::Round($n.WorkingSetSize/1MB,0) }
  }
}
$total = 0
foreach ($o in $orphans) {
  Stop-Process -Id $o.Pid -Force -EA SilentlyContinue
  $total += $o.WS
}
Write-Output ("killed=" + $orphans.Count + " mb=" + $total)
`;

function killOrphanMcps() {
  const r = spawnSync(
    "powershell",
    ["-ExecutionPolicy", "Bypass", "-NoProfile", "-Command", ORPHAN_PS],
    { encoding: "utf8", timeout: 20000, windowsHide: true },
  );
  if (r.status !== 0) return null;
  const m = (r.stdout || "").match(/killed=(\d+)\s+mb=(\d+)/);
  if (!m) return null;
  return { killed: parseInt(m[1], 10), reclaimedMB: parseInt(m[2], 10) };
}

// Drain stdin (SessionStart payload, ignored)
try { fs.readFileSync(0, "utf8"); } catch {}

const lines = [];

const reaped = tryReap();
if (reaped && (reaped.reapedPresence > 0 || reaped.reapedClaims > 0)) {
  lines.push(`🧹 chat-bus: reaped ${reaped.reapedPresence} presence + ${reaped.reapedClaims} claims (${reaped.live} live)`);
}

const pct = readPressurePct();
if (pct !== null && pct >= PRESSURE_THRESHOLD) {
  const ts = killZombieTsservers();
  if (ts && ts.killed > 0) {
    lines.push(`🧹 tsserver: killed ${ts.killed} zombie(s), reclaimed ~${ts.reclaimedMB} MB (commit was ${pct}%)`);
  }
}

const mcps = killOrphanMcps();
if (mcps && mcps.killed > 0) {
  lines.push(`🧹 mcp-orphans: killed ${mcps.killed} dead-parent child(ren), reclaimed ~${mcps.reclaimedMB} MB`);
}

if (lines.length === 0) silent();
emit(lines.join("\n"));
