#!/usr/bin/env node
/**
 * session-consolidate-graph.mjs — Stop hook
 *
 * Fires the session-consolidate-graph script as a detached background
 * process so MemoryConsolidationEngine ticks its session counter on every
 * Stop and runs full consolidation when the counter reaches N=5
 * (configurable via PRISM_CONSOLIDATION_N).
 *
 * The hook itself returns immediately with `{continue: true}` — it never
 * waits for the consolidation to finish, so it can never block the Stop
 * chain. The spawned script has its own 60s self-watchdog.
 *
 * INTEL-OLLAMA-OBSIDIAN-MS0 / P1-U02.
 *
 * Wired via H:/.claude/settings.json under the Stop hooks list.
 *
 * Skip cases (hook is a no-op when):
 *   - PRISM_CONSOLIDATION_DISABLED=1 (escape hatch)
 *   - script file missing
 */

import { spawn } from "node:child_process";
import { existsSync, mkdirSync, appendFileSync } from "node:fs";
import { dirname } from "node:path";

const LOG_FILE = "H:/prism/state/shared/session-consolidate-hook.log";
const SCRIPT_CANDIDATES = [
  "H:/prism/mcp-server/scripts/session-consolidate-graph.mjs",
  "H:/prism-iooms0/mcp-server/scripts/session-consolidate-graph.mjs",
];

function log(line) {
  try {
    mkdirSync(dirname(LOG_FILE), { recursive: true });
    appendFileSync(LOG_FILE, `[${new Date().toISOString()}] ${line}\n`, "utf-8");
  } catch { /* best-effort */ }
}

function emitContinue() {
  try { process.stdout.write(JSON.stringify({ continue: true })); } catch { /* swallow */ }
}

function resolveNode() {
  if (process.execPath && existsSync(process.execPath)) return process.execPath;
  const portableCmd = "H:/.claude/bin/portable-node.cmd";
  if (existsSync(portableCmd)) return portableCmd;
  return "node";
}

function resolveScript() {
  for (const c of SCRIPT_CANDIDATES) {
    if (existsSync(c)) return c;
  }
  return null;
}

function spawnDetached(scriptPath) {
  const node = resolveNode();
  const child = spawn(node, [scriptPath, "--quiet"], {
    detached: true,
    stdio: "ignore",
    windowsHide: true,
    env: { ...process.env },
  });
  child.on("error", (e) => log(`spawn error: ${e?.message ?? e}`));
  child.unref();
  log(`spawned pid=${child.pid ?? "n/a"} node=${node} script=${scriptPath}`);
}

async function main() {
  process.stdin.on("data", () => {});
  process.stdin.on("end", () => {});

  if (process.env.PRISM_CONSOLIDATION_DISABLED === "1") {
    log("disabled via PRISM_CONSOLIDATION_DISABLED=1");
    emitContinue();
    return;
  }
  const scriptPath = resolveScript();
  if (!scriptPath) {
    log(`script missing — checked: ${SCRIPT_CANDIDATES.join(" | ")}`);
    emitContinue();
    return;
  }
  try {
    spawnDetached(scriptPath);
  } catch (e) {
    log(`spawn failed: ${e?.message ?? e}`);
  }
  emitContinue();
}

setTimeout(() => { emitContinue(); process.exit(0); }, 5_000);

main()
  .then(() => process.exit(0))
  .catch((e) => { log(`unhandled: ${e?.message ?? e}`); emitContinue(); process.exit(0); });
