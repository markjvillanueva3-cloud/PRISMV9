#!/usr/bin/env node
// tier: T4
/**
 * session-cleanup.mjs — Stop hook to clean up orphaned MCP processes
 *
 * Runs on session stop to kill any MCP server processes that were spawned
 * by this session but didn't terminate properly.
 *
 * Hook type: Stop
 * Schema: {continue: true, systemMessage: "..."}
 */
import { execSync } from "node:child_process";
import process from "node:process";

const MCP_PATTERNS = [
  "context7-mcp",
  "playwright/mcp",
  "claude-flow",
  "@anthropic",
];

function getZombieCount() {
  try {
    const output = execSync(
      `powershell -NoProfile -Command "Get-Process node -ErrorAction SilentlyContinue | Where-Object { $_.Path -like '*Tools\\\\nodejs*' } | Measure-Object | Select-Object -ExpandProperty Count"`,
      { windowsHide: true, encoding: "utf8", timeout: 5000 }
    ).trim();
    return parseInt(output, 10) || 0;
  } catch {
    return 0;
  }
}

function cleanupZombies() {
  try {
    // Only kill node processes from Tools\nodejs that are MCP-related
    const killed = execSync(
      `powershell -NoProfile -Command "Get-WmiObject Win32_Process -Filter \\"name='node.exe'\\" | Where-Object { $_.CommandLine -like '*context7*' -or $_.CommandLine -like '*playwright*' -or $_.CommandLine -like '*claude-flow*' } | ForEach-Object { Stop-Process -Id $_.ProcessId -Force -ErrorAction SilentlyContinue; 1 } | Measure-Object | Select-Object -ExpandProperty Count"`,
      { windowsHide: true, encoding: "utf8", timeout: 10000 }
    ).trim();
    return parseInt(killed, 10) || 0;
  } catch {
    return 0;
  }
}

async function main() {
  const before = getZombieCount();

  // Only cleanup if there are many node processes (>10 suggests accumulation)
  if (before > 10) {
    const killed = cleanupZombies();
    if (killed > 0) {
      process.stdout.write(JSON.stringify({
        continue: true,
        systemMessage: `Cleaned up ${killed} orphaned MCP processes (had ${before} node processes)`,
      }));
      return;
    }
  }

  process.stdout.write(JSON.stringify({ continue: true }));
}

main().catch(() => {
  process.stdout.write(JSON.stringify({ continue: true }));
});
