#!/usr/bin/env npx ts-node
/**
 * inventory-delta-report.ts — U-ACT04 Session-to-Session Inventory Diff
 *
 * Computes delta between current and previous session inventory state.
 * Reports: +N engines, -M deprecated, +K actions, new dispatchers.
 *
 * Usage:
 *   npx ts-node scripts/inventory-delta-report.ts
 *   npx ts-node scripts/inventory-delta-report.ts --json
 *   npx ts-node scripts/inventory-delta-report.ts --since "2h ago"
 */

import * as fs from "fs";
import * as path from "path";

interface InventorySnapshot {
  engines: number;
  dispatchers: number;
  actions: number;
  algorithms: number;
  formulas: number;
  skills: number;
  hooks: number;
  tests: number;
  tribalTips: number;
  materials: number;
  tools: number;
  machines: number;
  timestamp?: string;
}

interface DeltaReport {
  current: InventorySnapshot;
  previous: InventorySnapshot | null;
  delta: Record<string, number>;
  summary: string[];
  generated: string;
}

const STATE_DIR = path.resolve(__dirname, "../data/state");
const BASELINE_FILE = path.join(STATE_DIR, "BASELINE_INVENTORY.json");
const LAST_SESSION_FILE = path.join(STATE_DIR, "LAST_SESSION_INVENTORY.json");
const HISTORY_FILE = path.join(STATE_DIR, "INVENTORY_HISTORY.json");

function readJSON<T>(filePath: string): T | null {
  try {
    return JSON.parse(fs.readFileSync(filePath, "utf-8"));
  } catch {
    return null;
  }
}

function writeJSON(filePath: string, data: unknown): void {
  fs.writeFileSync(filePath, JSON.stringify(data, null, 2) + "\n");
}

function getCurrentInventory(): InventorySnapshot {
  const baseline = readJSON<{ inventory: Record<string, unknown> }>(BASELINE_FILE);
  const inv = baseline?.inventory || {};

  return {
    engines: (inv.engines as { files?: number })?.files || 0,
    dispatchers: (inv.dispatchers as number) || 0,
    actions: (inv.actions as number) || 0,
    algorithms: (inv.algorithms as number) || 0,
    formulas: (inv.formulas as { registered?: number })?.registered || 0,
    skills: (inv.skills as number) || 0,
    hooks: (inv.hooks as { registry?: number })?.registry || 0,
    tests: (inv.test_count as number) || 0,
    tribalTips: (inv.tribal_tips as number) || 0,
    materials: (inv.materials as number) || 0,
    tools: (inv.tools as number) || 0,
    machines: (inv.machines as number) || 0,
    timestamp: new Date().toISOString(),
  };
}

function computeDelta(current: InventorySnapshot, previous: InventorySnapshot | null): Record<string, number> {
  if (!previous) return {};

  const delta: Record<string, number> = {};
  const keys: (keyof InventorySnapshot)[] = [
    "engines", "dispatchers", "actions", "algorithms", "formulas",
    "skills", "hooks", "tests", "tribalTips", "materials", "tools", "machines"
  ];

  for (const key of keys) {
    const curr = current[key];
    const prev = previous[key];
    if (typeof curr === "number" && typeof prev === "number") {
      const diff = curr - prev;
      if (diff !== 0) {
        delta[key] = diff;
      }
    }
  }

  return delta;
}

function generateSummary(delta: Record<string, number>): string[] {
  const summary: string[] = [];

  if (Object.keys(delta).length === 0) {
    summary.push("No inventory changes since last session");
    return summary;
  }

  for (const [key, value] of Object.entries(delta)) {
    const sign = value > 0 ? "+" : "";
    const label = key.replace(/([A-Z])/g, " $1").toLowerCase().trim();
    summary.push(`${sign}${value} ${label}`);
  }

  return summary;
}

function appendHistory(snapshot: InventorySnapshot): void {
  const history = readJSON<{ snapshots: InventorySnapshot[] }>(HISTORY_FILE) || { snapshots: [] };
  history.snapshots.push(snapshot);

  // Keep last 100 snapshots
  if (history.snapshots.length > 100) {
    history.snapshots = history.snapshots.slice(-100);
  }

  writeJSON(HISTORY_FILE, history);
}

function main(): void {
  const args = process.argv.slice(2);
  const jsonOutput = args.includes("--json");

  const current = getCurrentInventory();
  const previous = readJSON<InventorySnapshot>(LAST_SESSION_FILE);
  const delta = computeDelta(current, previous);
  const summary = generateSummary(delta);

  const report: DeltaReport = {
    current,
    previous,
    delta,
    summary,
    generated: new Date().toISOString(),
  };

  // Save current as last session
  writeJSON(LAST_SESSION_FILE, current);

  // Append to history
  appendHistory(current);

  if (jsonOutput) {
    console.log(JSON.stringify(report, null, 2));
    return;
  }

  // Human-readable output
  console.log("=== PRISM Inventory Delta Report ===");
  console.log(`Generated: ${report.generated}`);
  console.log("");

  console.log("## Current Inventory");
  console.log(`  Engines:     ${current.engines}`);
  console.log(`  Dispatchers: ${current.dispatchers}`);
  console.log(`  Actions:     ${current.actions}`);
  console.log(`  Algorithms:  ${current.algorithms}`);
  console.log(`  Formulas:    ${current.formulas}`);
  console.log(`  Skills:      ${current.skills}`);
  console.log(`  Hooks:       ${current.hooks}`);
  console.log(`  Tests:       ${current.tests}`);
  console.log("");

  if (previous) {
    console.log("## Changes Since Last Session");
    if (summary.length === 1 && summary[0].includes("No inventory changes")) {
      console.log("  (no changes)");
    } else {
      for (const line of summary) {
        console.log(`  ${line}`);
      }
    }
    console.log("");
    console.log(`  Previous timestamp: ${previous.timestamp || "unknown"}`);
  } else {
    console.log("## First Session");
    console.log("  No previous session to compare");
  }
}

main();
