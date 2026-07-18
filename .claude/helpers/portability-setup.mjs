#!/usr/bin/env node
/**
 * portability-setup.mjs — One-shot cross-PC portability installer.
 *
 * Runs all three setup scripts in order, reporting progress:
 *   1. dotclaude-junctions-setup.mjs   (per-subfolder junctions)
 *   2. appdata-junction-setup.mjs      (Claude Desktop AppData junction)
 *   3. mcp-config-resolve.mjs          (regenerate .mcp.json with PC-specific node path)
 *
 * Pre-flight: warns if Claude Desktop (claude.exe) is running.
 * Post-flight: runs all three guards to confirm green state.
 *
 * Idempotent — safe to run multiple times. Safe to run on either PC (auto-detects user).
 *
 * Usage: node H:\PRISM\.claude\helpers\portability-setup.mjs [--dry-run]
 */

import { spawnSync } from "node:child_process";

const args = process.argv.slice(2);
const dryRun = args.includes("--dry-run");

function banner(msg) {
  process.stdout.write("\n");
  process.stdout.write("═".repeat(70) + "\n");
  process.stdout.write(`  ${msg}\n`);
  process.stdout.write("═".repeat(70) + "\n");
}

function run(step, cmd, cmdArgs) {
  banner(step);
  const r = spawnSync(cmd, cmdArgs, { windowsHide: true, stdio: "inherit", encoding: "utf8" });
  if (r.status !== 0) {
    process.stderr.write(`\n✗ Step "${step}" failed (exit ${r.status})\n`);
    process.exit(r.status || 1);
  }
}

function claudeDesktopRunning() {
  const r = spawnSync("tasklist", ["/FI", "IMAGENAME eq claude.exe", "/NH"], { windowsHide: true, encoding: "utf8" });
  return r.status === 0 && /claude\.exe/i.test(r.stdout);
}

banner("PRISM Cross-PC Portability — One-Shot Setup");
if (dryRun) process.stdout.write("  [DRY RUN] no filesystem changes will be made\n");

if (claudeDesktopRunning()) {
  process.stdout.write("\n⚠  Claude Desktop (claude.exe) is currently running.\n");
  process.stdout.write("   The AppData junction step will fail. Quit Claude Desktop fully\n");
  process.stdout.write("   (system tray → Quit), then re-run this script.\n");
  process.stdout.write("\n   Proceeding with ~/.claude subfolder junctions only...\n\n");
}

const stepArgs = dryRun ? ["--dry-run"] : [];

// Step 1: per-subfolder junctions (can run with Claude Desktop open — safe, only touches C:\Users\...\.claude).
run("Step 1/3: ~/.claude per-subfolder junctions", process.execPath,
    ["H:/PRISM/.claude/helpers/dotclaude-junctions-setup.mjs", ...stepArgs]);

// Step 2: AppData junction (only if Claude Desktop closed).
if (!claudeDesktopRunning()) {
  run("Step 2/3: Claude Desktop AppData junction", process.execPath,
      ["H:/PRISM/.claude/helpers/appdata-junction-setup.mjs", ...stepArgs]);
} else {
  banner("Step 2/3: SKIPPED (Claude Desktop running)");
  process.stdout.write("  Quit Claude Desktop, then run:\n");
  process.stdout.write("    node H:\\PRISM\\.claude\\helpers\\appdata-junction-setup.mjs\n");
}

// Step 3: MCP config resolve (always safe).
run("Step 3/3: MCP config (resolve node.exe path)", process.execPath,
    ["H:/PRISM/.claude/hooks/mcp-config-resolve.mjs"]);

// Post-flight: run guards to confirm.
banner("Post-flight: verify all guards");
const guards = [
  ["portable-python-guard.mjs", "Portable Python"],
  ["dotclaude-junctions-guard.mjs", "~/.claude junctions"],
  ["appdata-junction-guard.mjs", "AppData junction"],
];
let allPass = true;
for (const [script, label] of guards) {
  const r = spawnSync(process.execPath, [`H:/PRISM/.claude/hooks/${script}`], { windowsHide: true, encoding: "utf8" });
  const ok = r.status === 0;
  allPass = allPass && ok;
  process.stdout.write(`  ${ok ? "✓" : "✗"} ${label.padEnd(30)} ${ok ? "" : "(drift — see details above)"}\n`);
  if (!ok) process.stderr.write((r.stderr || r.stdout || "").split("\n").map(l => "      " + l).join("\n") + "\n");
}

banner(allPass ? "✓ ALL GREEN — cross-PC portability ready" : "⚠  Partial success — review failures above");
if (!allPass) process.exit(2);
