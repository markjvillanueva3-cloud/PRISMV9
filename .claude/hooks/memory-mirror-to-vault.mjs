#!/usr/bin/env node
/**
 * memory-mirror-to-vault.mjs — PostToolUse hook
 *
 * Fires after Write/Edit/MultiEdit. If the target file is in Claude's
 * auto-memory directory (~/.claude/projects/H--PRISM/memory/), spawn
 * obsidian-memory-sync.mjs in --single-file mode so the H-drive vault
 * stays in sync incrementally — without waiting for the next Stop hook
 * batch sync (P1-U01).
 *
 * Why incremental:
 *   The Stop-hook batch (P1-U01) catches every memory file at session
 *   end, but during a long session the vault drifts behind for hours.
 *   This PostToolUse hook closes that gap by mirroring on-write so a
 *   peer chat reading the vault gets the freshest entry within seconds.
 *
 * INTEL-OLLAMA-OBSIDIAN-MS0 / P1-U04.
 *
 * Wired via H:/.claude/settings.json under the PostToolUse hooks list,
 * matcher: "Write|Edit|MultiEdit".
 *
 * Skip cases (hook is a no-op when):
 *   - tool input file_path is missing or not a memory-dir path
 *   - PRISM_MEMORY_MIRROR_DISABLED=1 (escape hatch)
 *   - script file missing
 *
 * Hook is fire-and-forget — never blocks the tool chain.
 */

import { spawn } from "node:child_process";
import { existsSync, mkdirSync, appendFileSync } from "node:fs";
import { dirname } from "node:path";
import { homedir } from "node:os";

const LOG_FILE = "H:/prism/state/shared/memory-mirror-hook.log";
const SCRIPT_CANDIDATES = [
  "H:/prism/mcp-server/scripts/obsidian-memory-sync.mjs",
  "H:/prism-iooms0/mcp-server/scripts/obsidian-memory-sync.mjs",
];
const MEMORY_DIR_FRAGMENT = "/.claude/projects/H--PRISM/memory/";
const MEMORY_DIR_FRAGMENT_BACKSLASH = "\\.claude\\projects\\H--PRISM\\memory\\";

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

function isMemoryPath(p) {
  if (!p || typeof p !== "string") return false;
  const norm = p.replace(/\\/g, "/").toLowerCase();
  if (norm.includes(MEMORY_DIR_FRAGMENT.toLowerCase())) return true;
  // Also handle fully Windows-style paths
  if (p.toLowerCase().includes(MEMORY_DIR_FRAGMENT_BACKSLASH.toLowerCase())) return true;
  return norm.endsWith(".md") && norm.includes("/memory/");
}

async function readStdin() {
  return await new Promise((resolve) => {
    let data = "";
    process.stdin.setEncoding("utf-8");
    process.stdin.on("data", (chunk) => { data += chunk; });
    process.stdin.on("end", () => resolve(data));
    // Safety: if no stdin within 200ms, give up
    setTimeout(() => resolve(data), 200);
  });
}

function extractFilePath(payload) {
  // Claude Code PostToolUse payload shapes (best-effort):
  //   { tool_input: { file_path: "..." } }
  //   { tool_input: { edits: [{ file_path: "..." }] } }
  //   { tool_input: { path: "..." } }
  const ti = payload?.tool_input ?? {};
  if (typeof ti.file_path === "string") return ti.file_path;
  if (typeof ti.path === "string") return ti.path;
  if (Array.isArray(ti.edits) && ti.edits.length > 0 && typeof ti.edits[0]?.file_path === "string") {
    return ti.edits[0].file_path;
  }
  return null;
}

function spawnDetached(scriptPath, filePath) {
  const node = resolveNode();
  const child = spawn(node, [scriptPath, "--quiet", `--single-file=${filePath}`], {
    detached: true,
    stdio: "ignore",
    windowsHide: true,
    env: { ...process.env },
  });
  child.on("error", (e) => log(`spawn error: ${e?.message ?? e}`));
  child.unref();
  log(`mirroring pid=${child.pid ?? "n/a"} src=${filePath}`);
}

async function main() {
  if (process.env.PRISM_MEMORY_MIRROR_DISABLED === "1") {
    log("disabled via PRISM_MEMORY_MIRROR_DISABLED=1");
    emitContinue();
    return;
  }

  const raw = await readStdin();
  let payload = null;
  try { payload = raw ? JSON.parse(raw) : null; } catch { /* ignore */ }

  const filePath = extractFilePath(payload);
  if (!filePath) {
    // Not a parseable Write/Edit payload — nothing to do
    emitContinue();
    return;
  }

  if (!isMemoryPath(filePath)) {
    // Wrong directory — silently skip
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
    spawnDetached(scriptPath, filePath);
  } catch (e) {
    log(`spawn failed: ${e?.message ?? e}`);
  }
  emitContinue();
}

setTimeout(() => { emitContinue(); process.exit(0); }, 5_000);

main()
  .then(() => process.exit(0))
  .catch((e) => { log(`unhandled: ${e?.message ?? e}`); emitContinue(); process.exit(0); });
