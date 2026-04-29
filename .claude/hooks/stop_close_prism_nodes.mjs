#!/usr/bin/env node
/**
 * stop_close_prism_nodes.mjs — Stop hook
 *
 * Aggressive companion to node-orphan-cleaner.mjs. The existing janitor only
 * matches command-lines containing `.claude/hooks` or `.claude/helpers`; nodes
 * spawned by PRISM scripts (mcp-server/scripts/, scripts/, ollama-docker-launcher,
 * forge-* helpers, /loop runners, etc.) outlive the session because they don't
 * match that narrow filter.
 *
 * This hook kills any node.exe whose command-line references the PRISM tree
 * (H:/prism, H:\prism, /h/prism, /mnt/h/prism) AND is older than MAX_AGE_SECONDS
 * AND is NOT in the PRESERVE list (Claude Code itself, MCP server daemon,
 * Ollama subprocess, the running Claude Code parent chain).
 *
 * Idempotent + throttled (stamp file). Fail-open: never blocks Stop.
 *
 * Tunables:
 *   PRISM_NODE_CLOSE_DRY_RUN=1   — list candidates without killing
 *   PRISM_NODE_CLOSE_VERBOSE=1   — log each kill to stderr
 *   PRISM_NODE_CLOSE_AGE=N       — override default 30s minimum age
 */

import { readFileSync, writeFileSync, mkdirSync, unlinkSync, appendFileSync } from "node:fs";
import { execSync } from "node:child_process";
import { platform, tmpdir } from "node:os";
import { exit } from "node:process";
import { join } from "node:path";

const LOG_FILE = "H:/prism/state/shared/node-stop-closeout.log";
const STAMP_FILE = "H:/prism/state/shared/.prism-node-close-stamp";
const STAMP_DIR = "H:/prism/state/shared";
const THROTTLE_SECONDS = 15;
const DEFAULT_MAX_AGE_SECONDS = 30;
const PS_TIMEOUT_MS = 6000;

const DRY_RUN = process.env.PRISM_NODE_CLOSE_DRY_RUN === "1";
const VERBOSE = process.env.PRISM_NODE_CLOSE_VERBOSE === "1";
const MAX_AGE_SECONDS = Number(process.env.PRISM_NODE_CLOSE_AGE) || DEFAULT_MAX_AGE_SECONDS;

function log(msg) {
  try {
    appendFileSync(LOG_FILE, `[${new Date().toISOString()}] stop_close_prism_nodes: ${msg}\n`, "utf8");
  } catch {
    /* best-effort */
  }
  if (VERBOSE) process.stderr.write(`[stop-close-prism-nodes] ${msg}\n`);
}

function readStamp() {
  try {
    return parseInt(readFileSync(STAMP_FILE, "utf-8").trim(), 10) || 0;
  } catch {
    return 0;
  }
}

function writeStamp(ts) {
  try {
    mkdirSync(STAMP_DIR, { recursive: true });
  } catch {
    /* ignore */
  }
  try {
    writeFileSync(STAMP_FILE, String(ts), "utf-8");
  } catch {
    /* ignore */
  }
}

// Drain stdin so caller never hangs.
try {
  readFileSync(0, "utf-8");
} catch {
  /* ignore */
}

const now = Math.floor(Date.now() / 1000);
const lastRun = readStamp();
if (now - lastRun < THROTTLE_SECONDS) {
  process.stdout.write(JSON.stringify({ continue: true }));
  exit(0);
}
writeStamp(now);

const self = process.pid;

// Preserve list — process names / command-line substrings we never kill.
// Claude Code parent and MCP server daemon must survive Stop.
const PRESERVE_PATTERNS = [
  "claude.exe",
  "claude-code",
  "@anthropic-ai/claude-code",
  "mcp-server/dist/index",
  "mcp-server\\dist\\index",
  "mcp-server/server.mjs",
  "ollama serve",
  "stop_close_prism_nodes",
];

function buildPsScript() {
  // Build PowerShell that lists candidate node.exe processes, filters by
  // PRISM path + age + preserve list, and either kills or reports.
  // In DRY_RUN we just count — do NOT increment $killed (would be misleading).
  const action = DRY_RUN
    ? "# dry-run: no kill"
    : "Stop-Process -Id $_.ProcessId -Force -ErrorAction SilentlyContinue; $killed++";
  const preserve = PRESERVE_PATTERNS.map((p) => `'${p.replace(/'/g, "''")}'`).join(",");
  return `
$cutoff = (Get-Date).AddSeconds(-${MAX_AGE_SECONDS})
$self = ${self}
$preserve = @(${preserve})
$killed = 0
$candidates = 0
try {
  Get-CimInstance Win32_Process -Filter "Name='node.exe'" -ErrorAction SilentlyContinue |
    Where-Object {
      $_.ProcessId -ne $self -and
      $_.CommandLine -ne $null -and
      ($_.CommandLine -like '*H:/prism*' -or
       $_.CommandLine -like '*H:\\prism*' -or
       $_.CommandLine -like '*/h/prism*' -or
       $_.CommandLine -like '*/mnt/h/prism*') -and
      $_.CreationDate -lt $cutoff
    } |
    ForEach-Object {
      $cmd = $_.CommandLine
      $skip = $false
      foreach ($p in $preserve) { if ($cmd -like ('*' + $p + '*')) { $skip = $true; break } }
      if (-not $skip) {
        $candidates++
        try {
          ${action}
        } catch {}
      }
    }
} catch {}
Write-Output ('candidates=' + $candidates + ' killed=' + $killed)
`.trim();
}

function resolvePowershell() {
  // The portable-node child shell PATH may NOT contain powershell. Resolve
  // explicitly via SystemRoot. Fall back to bare "powershell" if SystemRoot
  // isn't set (then we'd just fail-open, which is the hook's contract).
  const sysRoot = process.env.SystemRoot || process.env.SYSTEMROOT || "C:\\Windows";
  return `${sysRoot}\\System32\\WindowsPowerShell\\v1.0\\powershell.exe`;
}

function runWindows() {
  const psFile = join(tmpdir(), `prism-stop-close-${process.pid}-${Date.now()}.ps1`);
  const psExe = resolvePowershell();
  try {
    writeFileSync(psFile, buildPsScript(), "utf-8");
    const out = execSync(
      `"${psExe}" -NoProfile -NonInteractive -ExecutionPolicy Bypass -File "${psFile}"`,
      { timeout: PS_TIMEOUT_MS, stdio: ["ignore", "pipe", "pipe"], windowsHide: true },
    )
      .toString()
      .trim();
    return out;
  } finally {
    try {
      unlinkSync(psFile);
    } catch {
      /* ignore */
    }
  }
}

function runUnix() {
  // POSIX fallback (not the primary platform — kept for portability).
  const preserveOr = PRESERVE_PATTERNS.map((p) => `$0 ~ /${p.replace(/[/\\.()*+?^$|]/g, "\\$&")}/`).join(" || ");
  const cmd =
    `ps -eo pid=,etimes=,args= 2>/dev/null | ` +
    `awk -v self=${self} '($1+0) != self && ($2+0) > ${MAX_AGE_SECONDS} && ` +
    `(${
      ["/h/prism", "/mnt/h/prism", "H:/prism", "H:\\\\prism"]
        .map((p) => `$0 ~ /${p.replace(/[/\\.()*+?^$|]/g, "\\$&")}/`)
        .join(" || ")
    }) && !(${preserveOr}) {print $1}' | ` +
    `xargs -r ${DRY_RUN ? "echo" : "kill -TERM"} 2>/dev/null; true`;
  execSync(cmd, { timeout: PS_TIMEOUT_MS, stdio: "ignore", shell: "/bin/sh" });
  return "unix-cleanup";
}

let summary = "";
try {
  summary = platform() === "win32" ? runWindows() : runUnix();
  log(`complete | ${summary}${DRY_RUN ? " | DRY_RUN" : ""}`);
} catch (err) {
  const stdout = err?.stdout ? String(err.stdout).slice(0, 400) : "";
  const stderr = err?.stderr ? String(err.stderr).slice(0, 400) : "";
  log(`failed best-effort | code=${err?.code || "?"} | stderr=${stderr} | stdout=${stdout} | msg=${err?.message?.slice(0, 200) || err}`);
}

process.stdout.write(
  JSON.stringify({
    continue: true,
    systemMessage: `prism-node-close: ${summary || "no-op"}`,
  }),
);
exit(0);
