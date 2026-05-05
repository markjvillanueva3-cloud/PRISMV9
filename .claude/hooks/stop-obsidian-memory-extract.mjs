#!/usr/bin/env node
/**
 * stop-obsidian-memory-extract.mjs — Stop hook
 *
 * Fires the obsidian-memory-sync script as a detached background process so
 * Claude's auto-memory directory mirrors into the H-drive PRISM vault on
 * every Stop. The hook itself returns immediately with `{continue: true}` —
 * it never waits for the sync to finish, so it can never block the Stop chain.
 *
 * The spawned script has its own 60s self-watchdog (see
 * obsidian-memory-sync.mjs) so a wedged sync can't accumulate zombie nodes.
 *
 * INTEL-OLLAMA-OBSIDIAN-MS0 / P1-U01.
 *
 * Wired via H:/.claude/settings.json under the Stop hooks list.
 *
 * Skip cases (hook is a no-op when):
 *   - PRISM_MEMORY_SYNC_DISABLED=1 (escape hatch)
 *   - portable-node binary missing (fail-soft)
 *   - script file missing (build hasn't run yet)
 */

import { spawn } from "node:child_process";
import { existsSync, mkdirSync, appendFileSync } from "node:fs";
import { dirname, join } from "node:path";

const LOG_FILE = "H:/prism/state/shared/obsidian-memory-sync-hook.log";
// Resolve the script in priority order so the hook works whether the
// canonical worktree is H:/prism (main) or a milestone fork (e.g. H:/prism-iooms0).
const SCRIPT_CANDIDATES = [
  "H:/prism/mcp-server/scripts/obsidian-memory-sync.mjs",
  "H:/prism-iooms0/mcp-server/scripts/obsidian-memory-sync.mjs",
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
  // process.execPath is the absolute path to the node binary running this hook —
  // guaranteed runnable on this OS. Prefer it over a bash-script wrapper like
  // `portable-node` which Windows CreateProcess cannot execute without shell:true.
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
  // Drain stdin so the harness can't hang waiting for us to consume it.
  process.stdin.on("data", () => {});
  process.stdin.on("end", () => {});

  if (process.env.PRISM_MEMORY_SYNC_DISABLED === "1") {
    log("disabled via PRISM_MEMORY_SYNC_DISABLED=1");
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

// Hard timeout — even the lightweight spawn path must not block Stop.
setTimeout(() => { emitContinue(); process.exit(0); }, 5_000);

main()
  .then(() => process.exit(0))
  .catch((e) => { log(`unhandled: ${e?.message ?? e}`); emitContinue(); process.exit(0); });
