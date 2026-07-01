#!/usr/bin/env node
/**
 * cost-alarm-tick.mjs — one cron tick of CostAlarmEngine.check().
 *
 * COST-CASCADE-MS0 / U-COST-ALARM step-4 (cron: every 15 minutes).
 *
 * Reads cost-alarm-config.json + cost-telemetry.jsonl, emits alarms to
 * cost-alarm-log.jsonl + AGENT_CHAT.md via the engine's FS-backed deps.
 *
 * Exit codes:
 *   0 — clean tick (no alarms or only-cool-down-suppressed)
 *   1 — one or more alarms FIRED this tick (caller may surface)
 *   2 — engine reported errors[] non-empty (config/telemetry I/O failed)
 *
 * Knobs:
 *   PRISM_COST_ALARM_DISABLE=1 — no-op exit 0
 *   PRISM_COST_ALARM_ROOT=<path> — override H:/prism root
 *   PRISM_COST_ALARM_JSON=1 — print full result as JSON instead of brief
 *
 * Pure node CLI; imports the compiled engine from mcp-server/dist when present,
 * falling back to a fresh tsx transpile for development.
 */

import * as path from "node:path";
import * as fs from "node:fs";
import * as url from "node:url";

const __filename = url.fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const PRISM_ROOT = process.env.PRISM_COST_ALARM_ROOT
  ? path.resolve(process.env.PRISM_COST_ALARM_ROOT)
  : path.resolve(__dirname, "..");

if (process.env.PRISM_COST_ALARM_DISABLE === "1") {
  process.stderr.write("[cost-alarm-tick] disabled via PRISM_COST_ALARM_DISABLE=1\n");
  process.exit(0);
}

async function loadEngine() {
  const distPath = path.join(PRISM_ROOT, "mcp-server/dist/engines/CostAlarmEngine.js");
  if (fs.existsSync(distPath)) {
    return await import(url.pathToFileURL(distPath).href);
  }
  // Fallback for development: try the bundled mcp-server/dist barrel
  const distBarrel = path.join(PRISM_ROOT, "mcp-server/dist/index.js");
  if (fs.existsSync(distBarrel)) {
    const mod = await import(url.pathToFileURL(distBarrel).href);
    if (mod.CostAlarmEngine && mod.makeFsDeps) return mod;
  }
  throw new Error(
    `cost-alarm-tick: could not locate compiled CostAlarmEngine. Run \`npm run build:fast\` in mcp-server/ first. Looked at:\n  ${distPath}\n  ${distBarrel}`,
  );
}

(async function main() {
  try {
    const mod = await loadEngine();
    const engine = mod.costAlarmEngine ?? new mod.CostAlarmEngine();
    const deps = mod.makeFsDeps({ prismRoot: PRISM_ROOT });
    const result = engine.check(deps);

    if (process.env.PRISM_COST_ALARM_JSON === "1") {
      process.stdout.write(JSON.stringify(result, null, 2) + "\n");
    } else {
      const fired = result.fired.length;
      const suppressed = result.suppressedByCoolDown.length;
      const warns = result.channelWarnings.length;
      const errs = result.errors.length;
      const dailyUsd = result.daily ? `$${result.daily.totalUSD.toFixed(2)}` : "n/a";
      const weeklyUsd = result.weekly ? `$${result.weekly.totalUSD.toFixed(2)}` : "n/a";
      process.stderr.write(
        `[cost-alarm-tick] ${result.asOf} daily=${dailyUsd} weekly=${weeklyUsd} ` +
          `fired=${fired} suppressedByCoolDown=${suppressed} warnings=${warns} errors=${errs}\n`,
      );
      for (const f of result.fired) {
        process.stderr.write(`  🚨 ${f.alarmKey} actual=${f.actual} cap=${f.cap} excess=${f.exceededBy}\n`);
      }
      for (const w of result.channelWarnings) process.stderr.write(`  ⚠ ${w}\n`);
      for (const e of result.errors) process.stderr.write(`  ✗ ${e}\n`);
    }

    if (result.errors.length > 0) process.exit(2);
    if (result.fired.length > 0) process.exit(1);
    process.exit(0);
  } catch (e) {
    process.stderr.write(`[cost-alarm-tick] FATAL — ${e.stack || e.message || e}\n`);
    process.exit(3);
  }
})();
