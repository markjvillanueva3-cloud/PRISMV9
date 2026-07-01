/**
 * serialize-bandit-posterior.ts — Export HookBanditEngine Thompson arms to JSON
 *
 * Reads the live HookBanditEngine state (if available via a running server)
 * or reconstructs from a hook-bandit log file, then emits a compact snapshot
 * suitable for Tier-1 always-on context injection.
 *
 * Output: mcp-server/data/state/BANDIT_POSTERIOR.json
 *
 * Schema:
 *   {
 *     schemaVersion: 1,
 *     capturedAt: ISO-8601,
 *     engine: "HookBanditEngine",
 *     priorAlpha: number,
 *     priorBeta: number,
 *     arms: [{ hookId, alpha, beta, mean, totalPulls, totalCatches,
 *              avgExecutionMs, lastCatch }],
 *     totalPulls: number
 *   }
 *
 * Usage:
 *   npx tsx mcp-server/scripts/serialize-bandit-posterior.ts
 */

import { writeFileSync, existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";

interface HookArm {
  hookId: string;
  name?: string;
  alpha: number;
  beta: number;
  totalPulls?: number;
  totalCatches?: number;
  avgExecutionMs?: number;
  lastCatch?: number;
}

interface BanditSnapshot {
  schemaVersion: 1;
  capturedAt: string;
  engine: "HookBanditEngine";
  priorAlpha: number;
  priorBeta: number;
  arms: Array<HookArm & { mean: number }>;
  totalPulls: number;
  source: string;
}

const OUTPUT = resolve(process.cwd(), "mcp-server", "data", "state", "BANDIT_POSTERIOR.json");
const BANDIT_LOG = resolve(process.cwd(), "mcp-server", "data", "state", "hook-bandit-state.json");

function mean(alpha: number, beta: number): number {
  const sum = alpha + beta;
  return sum > 0 ? alpha / sum : 0;
}

function loadArms(): HookArm[] {
  if (!existsSync(BANDIT_LOG)) return [];
  try {
    const raw = readFileSync(BANDIT_LOG, "utf8");
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed)) return parsed as HookArm[];
    if (Array.isArray(parsed?.arms)) return parsed.arms as HookArm[];
  } catch { /* ignore */ }
  return [];
}

function main(): void {
  const arms = loadArms();
  const snapshot: BanditSnapshot = {
    schemaVersion: 1,
    capturedAt: new Date().toISOString(),
    engine: "HookBanditEngine",
    priorAlpha: 1,
    priorBeta: 1,
    arms: arms.map((a) => ({ ...a, mean: mean(a.alpha ?? 1, a.beta ?? 1) })),
    totalPulls: arms.reduce((sum, a) => sum + (a.totalPulls ?? 0), 0),
    source: existsSync(BANDIT_LOG) ? "hook-bandit-state.json" : "empty-prior",
  };

  writeFileSync(OUTPUT, JSON.stringify(snapshot, null, 2), "utf8");
  process.stdout.write(
    `BANDIT_POSTERIOR.json written: ${snapshot.arms.length} arms, ${snapshot.totalPulls} total pulls\n`
  );
}

main();
