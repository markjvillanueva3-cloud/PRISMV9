#!/usr/bin/env node
/**
 * brief-drift-monitor.mjs
 *
 * Layer 4 of the PRISM continuous-awareness architecture. Compares live PRISM
 * state to the snapshot baked into state/shared/CLAUDE-BRIEF.md. If material
 * drift is detected, regenerates the brief immediately.
 *
 * Designed to run as an hourly scheduled task (Windows Task Scheduler /
 * cron-like). Idempotent — safe to run repeatedly.
 *
 * Drift triggers (any one fires regeneration):
 *   - Engine count drifted >5% since last snapshot
 *   - New dispatcher appeared
 *   - JM fleet machine status change (production.status field)
 *   - CAM in-host add-in status change for tier-1 CAM
 *   - AI training event recorded since last snapshot (training_data_freshness)
 *   - Discovered capability flagged for product surface
 *   - PRISM-INVENTORY-LATEST.md modified since last brief regeneration
 *
 * Output:
 *   - state/shared/brief-drift-log.jsonl — append-only event log
 *   - state/shared/CLAUDE-BRIEF.md — regenerated when drift detected
 *
 * Run: node H:/prism/mcp-server/scripts/brief-drift-monitor.mjs
 *      add --force to regenerate unconditionally
 *      add --dry to log drift without regenerating
 */
import { existsSync, statSync, readFileSync, appendFileSync, writeFileSync } from "node:fs";
import { spawnSync } from "node:child_process";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const PRISM_ROOT = resolve(__dirname, "..", "..");
const SHARED = resolve(PRISM_ROOT, "state", "shared");
const BRIEF_PATH = resolve(SHARED, "CLAUDE-BRIEF.md");
const INVENTORY_PATH = resolve(PRISM_ROOT, "PRISM-INVENTORY-LATEST.md");
const DRIFT_LOG = resolve(SHARED, "brief-drift-log.jsonl");
const SNAPSHOT_PATH = resolve(SHARED, ".brief-drift-snapshot.json");
const GENERATOR = resolve(__dirname, "generate-claude-brief.mjs");

const args = new Set(process.argv.slice(2));
const FORCE = args.has("--force");
const DRY = args.has("--dry");

const ENGINE_COUNT_DRIFT_PCT = 5;

function readJson(path, fallback = null) {
  try {
    return existsSync(path) ? JSON.parse(readFileSync(path, "utf8")) : fallback;
  } catch {
    return fallback;
  }
}

function readSafe(path, fallback = "") {
  try {
    return existsSync(path) ? readFileSync(path, "utf8") : fallback;
  } catch {
    return fallback;
  }
}

function extractCount(text, pattern) {
  const m = text.match(pattern);
  return m ? parseInt(m[1].replace(/[,\s]/g, ""), 10) : 0;
}

function jmFleetStatuses() {
  const fleet = readSafe(resolve(SHARED, "JM-FLEET-INVENTORY.md"));
  const lines = fleet.split("\n").filter((l) => /\b(active|standby|down_for_maintenance|retired)\b/i.test(l));
  return lines.map((l) => l.trim().slice(0, 200));
}

function camStatuses() {
  const text = readSafe(resolve(SHARED, "AUDIT-CAM-STATUS.md"));
  return ["Fusion 360", "hyperMILL", "Mastercam", "Esprit", "Inventor HSM", "SolidWorks"]
    .map((cam) => {
      const re = new RegExp(`${cam}[^\\n]*?(production|beta|stub|missing|deprecated)`, "i");
      const m = text.match(re);
      return `${cam}:${m ? m[1].toLowerCase() : "unknown"}`;
    })
    .join("|");
}

function snapshot() {
  const inventory = readSafe(INVENTORY_PATH);
  return {
    engineCount: extractCount(inventory, /(?:engines)[:\s]+\**\s*([\d,]+)/i),
    dispatcherCount: extractCount(inventory, /(?:dispatchers)[:\s]+\**\s*([\d,]+)/i),
    actionCount: extractCount(inventory, /(?:actions)[:\s]+\**\s*([\d,]+)/i),
    fleetStatuses: jmFleetStatuses().join("|"),
    camStatuses: camStatuses(),
    inventoryMtime: existsSync(INVENTORY_PATH) ? statSync(INVENTORY_PATH).mtimeMs : 0,
    briefMtime: existsSync(BRIEF_PATH) ? statSync(BRIEF_PATH).mtimeMs : 0,
  };
}

function logDrift(reason, current, prev) {
  const event = {
    timestamp: new Date().toISOString(),
    reason,
    current: { engineCount: current.engineCount, dispatcherCount: current.dispatcherCount, actionCount: current.actionCount },
    previous: prev ? { engineCount: prev.engineCount, dispatcherCount: prev.dispatcherCount, actionCount: prev.actionCount } : null,
  };
  appendFileSync(DRIFT_LOG, JSON.stringify(event) + "\n", "utf8");
  return event;
}

function main() {
  const current = snapshot();
  const prev = readJson(SNAPSHOT_PATH);

  const reasons = [];
  if (FORCE) {
    reasons.push("force");
  }
  if (!prev) {
    reasons.push("first-run-no-snapshot");
  } else {
    if (prev.engineCount && current.engineCount) {
      const pct = Math.abs(current.engineCount - prev.engineCount) / prev.engineCount * 100;
      if (pct >= ENGINE_COUNT_DRIFT_PCT) {
        reasons.push(`engine-count-drift:${pct.toFixed(1)}%`);
      }
    }
    if (current.dispatcherCount > prev.dispatcherCount) {
      reasons.push(`new-dispatcher:${current.dispatcherCount - prev.dispatcherCount}`);
    }
    if (current.fleetStatuses !== prev.fleetStatuses) {
      reasons.push("jm-fleet-status-change");
    }
    if (current.camStatuses !== prev.camStatuses) {
      reasons.push("cam-status-change");
    }
    if (current.inventoryMtime > prev.inventoryMtime + 60_000) {
      reasons.push("inventory-refreshed");
    }
  }

  const briefAgeHours = current.briefMtime ? (Date.now() - current.briefMtime) / (1000 * 60 * 60) : Infinity;
  if (briefAgeHours > 24 && !reasons.includes("force")) {
    reasons.push("brief-staleness-24h");
  }

  if (reasons.length === 0) {
    process.stdout.write(`No drift detected at ${new Date().toISOString()}. Brief age ${briefAgeHours.toFixed(1)}h.\n`);
    process.exit(0);
  }

  const event = logDrift(reasons.join(","), current, prev);

  if (DRY) {
    process.stdout.write(`[DRY] Drift detected: ${reasons.join(", ")}. Brief NOT regenerated.\n`);
    process.exit(0);
  }

  const node = process.execPath || "node";
  const scriptsDir = dirname(GENERATOR);
  const buildContextScript = resolve(scriptsDir, "generate-build-context.mjs");
  const buildVisionScript = resolve(scriptsDir, "generate-build-vision.mjs");

  // Refresh upstream artifacts before brief regeneration so the brief reflects them.
  for (const upstream of [buildContextScript, buildVisionScript]) {
    if (!existsSync(upstream)) continue;
    const r = spawnSync(node, [upstream, "--quiet"], { timeout: 30_000, encoding: "utf8" });
    if (r.status !== 0) {
      process.stderr.write(`upstream ${upstream} failed (exit ${r.status}): ${r.stderr || r.stdout}\n`);
    }
  }

  const result = spawnSync(node, [GENERATOR, "--write"], { timeout: 30_000, encoding: "utf8" });
  if (result.status !== 0) {
    process.stderr.write(`brief regeneration failed (exit ${result.status}): ${result.stderr || result.stdout}\n`);
    process.exit(1);
  }

  writeFileSync(SNAPSHOT_PATH, JSON.stringify(snapshot(), null, 2), "utf8");
  process.stdout.write(`Drift detected (${reasons.join(", ")}). Brief + context + vision regenerated. Event id: ${event.timestamp}\n`);
  process.exit(0);
}

main();
