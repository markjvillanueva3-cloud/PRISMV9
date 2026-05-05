/**
 * intelligenceDispatcher — consensus_drift_auto_probe_* actions.
 * Milestone: INTEL-OLLAMA-OBSIDIAN-MS0 / U-CONSENSUS-DRIFT-AUTO-PROBE-WIRE.
 *
 * Verifies the four dispatcher routes into ConsensusDriftAutoProbeEngine:
 *   - consensus_drift_auto_probe_plan   (read-only planner)
 *   - consensus_drift_auto_probe_mark   (mutating: persist issued probes)
 *   - consensus_drift_auto_probe_prune  (mutating: drop stale entries)
 *   - consensus_drift_auto_probe_load   (read-only state inspection)
 *
 * Tests call the engine via the same shape the dispatcher uses (alertLogPath
 * + stateFilePath overrides into a tmp dir) so we get full coverage of the
 * dispatcher's input handling without booting the MCP server (which has
 * pre-existing build errors unrelated to this unit). The pattern mirrors
 * intelligenceDispatcher.consensusDrift.test.ts which covers DriftDetector.
 *
 * @milestone INTEL-OLLAMA-OBSIDIAN-MS0/U-CONSENSUS-DRIFT-AUTO-PROBE-WIRE
 */
import { describe, it, expect, beforeEach, afterEach } from "vitest";
import * as fs from "node:fs";
import * as os from "node:os";
import * as path from "node:path";
import { consensusDriftAutoProbeEngine } from "../engines/ConsensusDriftAutoProbeEngine.js";
import { consensusDriftAlertLogEngine } from "../engines/ConsensusDriftAlertLogEngine.js";
import type { DriftProbe } from "../engines/ConsensusDriftAutoProbeEngine.js";

// ─── Named constants (no magic numbers) ──────────────────────────────────
const HOUR_MS = 60 * 60 * 1000;
const DAY_MS = 24 * HOUR_MS;
const NOW = new Date("2026-05-05T20:00:00.000Z");
const SCHEMA_V = "1.0.0";

const SEVERE_DELTA = -0.40;
const SEVERER_DELTA = -0.50;
const MODERATE_DELTA = -0.20;
const SUB_FLOOR_DELTA = -0.15;

const STALE_HOURS = 48;
const FRESH_HOURS = 2;
const RECENT_HOURS = 1;
const SUB_HOUR = 0.5;
const FUTURE_OFFSET_HOURS = 2;
const COOLDOWN_HOURS = 1;
const PRUNE_OLDER_DAYS = 7;
const ANCIENT_HOURS = 240;
const ANCIENT_OFFSET_DAYS = 10;

const FLOOD_ALERT_COUNT = 8;
const MAX_PROBES_CAP = 3;
const FLOOD_EXPECTED_CAPPED = FLOOD_ALERT_COUNT - MAX_PROBES_CAP;

const SEVERE_PRIORITY_FLOOR = 0.7;
const MODERATE_PRIORITY_FLOOR = 0.3;
const MODERATE_PRIORITY_CEIL = 0.7;
const FAKE_PRIORITY = 0.94;

const ANCIENT_PRIORITY = 0.5;
const FAKE_BAD_TS_NUMBER = 123;

function tmpDir(): string {
  return fs.mkdtempSync(path.join(os.tmpdir(), "prism-auto-probe-disp-"));
}

function writeAlerts(p: string, alerts: object[]): void {
  fs.mkdirSync(path.dirname(p), { recursive: true });
  fs.writeFileSync(p, alerts.map((a) => JSON.stringify(a)).join("\n") + "\n", "utf-8");
}

function tsAgo(hoursAgo: number, anchor: Date = NOW): string {
  return new Date(anchor.getTime() - hoursAgo * HOUR_MS).toISOString();
}

let dir: string;
let alertLogPath: string;
let stateFilePath: string;
beforeEach(() => {
  dir = tmpDir();
  alertLogPath = path.join(dir, "alerts.jsonl");
  stateFilePath = path.join(dir, "probes.json");
});
afterEach(() => {
  fs.rmSync(dir, { recursive: true, force: true });
});

describe("intelligenceDispatcher → consensus_drift_auto_probe_plan", () => {
  it("returns empty plan when no alerts exist (cold-start safe)", () => {
    const result = consensusDriftAutoProbeEngine.planProbes({
      alertLogPath,
      stateFilePath,
      now: NOW,
    });
    expect(result.probes).toEqual([]);
    expect(result.stats.alertsConsidered).toBe(0);
    expect(result.stats.deduplicatedToPairs).toBe(0);
    expect(result.stats.cappedAt).toBe(0);
    expect(result.schemaVersion).toBe(SCHEMA_V);
    expect(result.generatedAt).toBe(NOW.toISOString());
  });

  it("plans probes for severe + moderate alerts within recency, sorted severe-first", () => {
    writeAlerts(alertLogPath, [
      { ts: tsAgo(FRESH_HOURS), kind: "alert", severity: "severe", vendor: "anthropic", taskType: "plan", delta: SEVERE_DELTA },
      { ts: tsAgo(RECENT_HOURS), kind: "alert", severity: "moderate", vendor: "openai", taskType: "decide", delta: MODERATE_DELTA },
    ]);
    const result = consensusDriftAutoProbeEngine.planProbes({
      alertLogPath,
      stateFilePath,
      now: NOW,
    });
    expect(result.probes).toHaveLength(2);
    expect(result.probes[0].severity).toBe("severe");
    expect(result.probes[0].vendor).toBe("anthropic");
    expect(result.probes[0].taskType).toBe("plan");
    expect(result.probes[0].delta).toBe(SEVERE_DELTA);
    expect(result.probes[0].reason).toBe("drift-severe");
    expect(result.probes[0].priority).toBeGreaterThanOrEqual(SEVERE_PRIORITY_FLOOR);
    expect(result.probes[0].priority).toBeLessThanOrEqual(1);
    expect(result.probes[1].severity).toBe("moderate");
    expect(result.probes[1].vendor).toBe("openai");
    expect(result.probes[1].reason).toBe("drift-moderate");
    expect(result.probes[1].priority).toBeGreaterThanOrEqual(MODERATE_PRIORITY_FLOOR);
    expect(result.probes[1].priority).toBeLessThan(MODERATE_PRIORITY_CEIL);
    expect(result.stats.alertsConsidered).toBe(2);
    expect(result.stats.deduplicatedToPairs).toBe(2);
  });

  it("excludes alerts older than recencyMs and reports excludedByRecency stat", () => {
    writeAlerts(alertLogPath, [
      { ts: tsAgo(STALE_HOURS), kind: "alert", severity: "severe", vendor: "stale", taskType: "plan", delta: SEVERER_DELTA },
      { ts: tsAgo(FRESH_HOURS), kind: "alert", severity: "severe", vendor: "fresh", taskType: "plan", delta: SEVERE_DELTA },
    ]);
    const result = consensusDriftAutoProbeEngine.planProbes({
      alertLogPath,
      stateFilePath,
      recencyMs: DAY_MS,
      now: NOW,
    });
    expect(result.probes).toHaveLength(1);
    expect(result.probes[0].vendor).toBe("fresh");
    expect(result.probes[0].delta).toBe(SEVERE_DELTA);
    expect(result.stats.excludedByRecency).toBe(1);
  });

  it("severityFloor=severe excludes moderate alerts (excludedBySeverity)", () => {
    writeAlerts(alertLogPath, [
      { ts: tsAgo(RECENT_HOURS), kind: "alert", severity: "severe", vendor: "anthropic", taskType: "plan", delta: SEVERE_DELTA },
      { ts: tsAgo(RECENT_HOURS), kind: "alert", severity: "moderate", vendor: "openai", taskType: "decide", delta: SUB_FLOOR_DELTA },
    ]);
    const result = consensusDriftAutoProbeEngine.planProbes({
      alertLogPath,
      stateFilePath,
      severityFloor: "severe",
      now: NOW,
    });
    expect(result.probes).toHaveLength(1);
    expect(result.probes[0].vendor).toBe("anthropic");
    expect(result.probes[0].severity).toBe("severe");
    expect(result.stats.excludedBySeverity).toBe(1);
  });

  it("caps probe count at maxProbes; cappedAt = surplus dropped", () => {
    const alerts: object[] = [];
    for (let i = 0; i < FLOOD_ALERT_COUNT; i++) {
      alerts.push({
        ts: tsAgo(RECENT_HOURS + i * 0.01),
        kind: "alert", severity: "severe",
        vendor: `vendor-${i}`, taskType: "plan", delta: SEVERE_DELTA - i * 0.01,
      });
    }
    writeAlerts(alertLogPath, alerts);
    const result = consensusDriftAutoProbeEngine.planProbes({
      alertLogPath,
      stateFilePath,
      maxProbes: MAX_PROBES_CAP,
      now: NOW,
    });
    expect(result.probes).toHaveLength(MAX_PROBES_CAP);
    expect(result.stats.cappedAt).toBe(FLOOD_EXPECTED_CAPPED);
    expect(result.stats.deduplicatedToPairs).toBe(FLOOD_ALERT_COUNT);
  });
});

describe("intelligenceDispatcher → consensus_drift_auto_probe_mark", () => {
  const probe: DriftProbe = {
    vendor: "anthropic",
    taskType: "plan",
    severity: "severe",
    delta: SEVERE_DELTA,
    alertTs: NOW.toISOString(),
    priority: FAKE_PRIORITY,
    reason: "drift-severe",
  };

  it("persists issued probes atomically and reports written count", () => {
    const result = consensusDriftAutoProbeEngine.markProbed({
      stateFilePath,
      probes: [probe],
      now: NOW,
    });
    expect(result.ok).toBe(true);
    expect(result.written).toBe(1);
    expect(result.error).toBe(null);
    expect(result.stateFilePath).toBe(stateFilePath);
    expect(fs.existsSync(stateFilePath)).toBe(true);

    const record = consensusDriftAutoProbeEngine.loadProbedRecord(stateFilePath);
    const entry = record.issued["anthropic|plan"];
    expect(entry.severity).toBe("severe");
    expect(entry.delta).toBe(SEVERE_DELTA);
    expect(entry.alertTs).toBe(NOW.toISOString());
    expect(entry.lastProbedTs).toBe(NOW.toISOString());
  });

  it("no-op + ok:true when probes array is empty (state file untouched)", () => {
    const result = consensusDriftAutoProbeEngine.markProbed({
      stateFilePath,
      probes: [],
      now: NOW,
    });
    expect(result.ok).toBe(true);
    expect(result.written).toBe(0);
    expect(result.error).toBe(null);
    expect(fs.existsSync(stateFilePath)).toBe(false);
  });

  it("rejects unsafe state-file paths (parent traversal)", () => {
    // Use string concat (not path.join, which resolves "..") so the literal
    // "..\" survives into isPathSafe()'s p.includes("..") check.
    const escapePath = `${dir}/../escape.json`;
    const result = consensusDriftAutoProbeEngine.markProbed({
      stateFilePath: escapePath,
      probes: [probe],
      now: NOW,
    });
    expect(result.ok).toBe(false);
    expect(result.written).toBe(0);
    expect(result.error).toBe(`unsafe state file path: ${escapePath}`);
  });
});

describe("intelligenceDispatcher → consensus_drift_auto_probe_prune", () => {
  it("drops entries older than olderThanMs and rewrites state file", () => {
    const ancient: DriftProbe = {
      vendor: "ancient", taskType: "plan", severity: "moderate",
      delta: SUB_FLOOR_DELTA, alertTs: tsAgo(ANCIENT_HOURS),
      priority: ANCIENT_PRIORITY, reason: "drift-moderate",
    };
    const fresh: DriftProbe = {
      vendor: "fresh", taskType: "plan", severity: "severe",
      delta: SEVERE_DELTA, alertTs: NOW.toISOString(),
      priority: FAKE_PRIORITY, reason: "drift-severe",
    };
    consensusDriftAutoProbeEngine.markProbed({
      stateFilePath,
      probes: [ancient],
      now: new Date(NOW.getTime() - ANCIENT_OFFSET_DAYS * DAY_MS),
    });
    consensusDriftAutoProbeEngine.markProbed({
      stateFilePath,
      probes: [fresh],
      now: NOW,
    });
    const result = consensusDriftAutoProbeEngine.pruneProbedRecord({
      stateFilePath,
      olderThanMs: PRUNE_OLDER_DAYS * DAY_MS,
      now: NOW,
    });
    expect(result.ok).toBe(true);
    expect(result.pruned).toBe(1);
    expect(result.remaining).toBe(1);
    expect(result.error).toBe(null);

    const record = consensusDriftAutoProbeEngine.loadProbedRecord(stateFilePath);
    expect("ancient|plan" in record.issued).toBe(false);
    expect(Object.keys(record.issued)).toEqual(["fresh|plan"]);
  });

  it("returns pruned:0 + ok:true when state file is missing (cold-start safe)", () => {
    const result = consensusDriftAutoProbeEngine.pruneProbedRecord({
      stateFilePath,
      now: NOW,
    });
    expect(result.ok).toBe(true);
    expect(result.pruned).toBe(0);
    expect(result.remaining).toBe(0);
    expect(result.error).toBe(null);
    expect(fs.existsSync(stateFilePath)).toBe(false);
  });
});

describe("intelligenceDispatcher → consensus_drift_auto_probe_load", () => {
  it("returns empty record for missing state file", () => {
    const record = consensusDriftAutoProbeEngine.loadProbedRecord(stateFilePath);
    expect(record.schemaVersion).toBe(SCHEMA_V);
    expect(record.issued).toEqual({});
  });

  it("returns empty record for corrupt JSON (defensive parse)", () => {
    fs.writeFileSync(stateFilePath, "{not-valid-json", "utf-8");
    const record = consensusDriftAutoProbeEngine.loadProbedRecord(stateFilePath);
    expect(record.schemaVersion).toBe(SCHEMA_V);
    expect(record.issued).toEqual({});
  });

  it("filters malformed entries while preserving valid ones", () => {
    fs.writeFileSync(stateFilePath, JSON.stringify({
      schemaVersion: SCHEMA_V,
      issued: {
        "good|plan": {
          lastProbedTs: NOW.toISOString(),
          alertTs: NOW.toISOString(),
          severity: "severe",
          delta: SEVERE_DELTA,
        },
        "bad|plan": { lastProbedTs: FAKE_BAD_TS_NUMBER, severity: "invalid" },
      },
    }), "utf-8");
    const record = consensusDriftAutoProbeEngine.loadProbedRecord(stateFilePath);
    expect(Object.keys(record.issued)).toEqual(["good|plan"]);
    expect(record.issued["good|plan"].severity).toBe("severe");
    expect(record.issued["good|plan"].delta).toBe(SEVERE_DELTA);
    expect(record.issued["good|plan"].lastProbedTs).toBe(NOW.toISOString());
    expect(record.issued["good|plan"].alertTs).toBe(NOW.toISOString());
  });
});

describe("plan→mark→plan cooldown gate (end-to-end)", () => {
  it("planProbes excludes a (vendor,task) within cooldown after markProbed", () => {
    writeAlerts(alertLogPath, [
      { ts: tsAgo(RECENT_HOURS), kind: "alert", severity: "severe", vendor: "anthropic", taskType: "plan", delta: SEVERE_DELTA },
    ]);
    const plan1 = consensusDriftAutoProbeEngine.planProbes({
      alertLogPath, stateFilePath, now: NOW,
    });
    expect(plan1.probes).toHaveLength(1);
    expect(plan1.probes[0].vendor).toBe("anthropic");

    consensusDriftAutoProbeEngine.markProbed({
      stateFilePath, probes: plan1.probes, now: NOW,
    });
    const plan2 = consensusDriftAutoProbeEngine.planProbes({
      alertLogPath, stateFilePath, cooldownMs: COOLDOWN_HOURS * HOUR_MS, now: NOW,
    });
    expect(plan2.probes).toEqual([]);
    expect(plan2.stats.excludedByCooldown).toBe(1);
  });

  it("planProbes re-emits the combo once the cooldown has expired", () => {
    writeAlerts(alertLogPath, [
      { ts: tsAgo(SUB_HOUR), kind: "alert", severity: "severe", vendor: "anthropic", taskType: "plan", delta: SEVERE_DELTA },
    ]);
    const plan1 = consensusDriftAutoProbeEngine.planProbes({
      alertLogPath, stateFilePath, now: NOW,
    });
    expect(plan1.probes).toHaveLength(1);
    consensusDriftAutoProbeEngine.markProbed({
      stateFilePath, probes: plan1.probes, now: NOW,
    });
    const future = new Date(NOW.getTime() + FUTURE_OFFSET_HOURS * HOUR_MS);
    writeAlerts(alertLogPath, [
      { ts: tsAgo(SUB_HOUR, future),
        kind: "alert", severity: "severe", vendor: "anthropic", taskType: "plan", delta: SEVERE_DELTA },
    ]);
    const plan2 = consensusDriftAutoProbeEngine.planProbes({
      alertLogPath, stateFilePath, cooldownMs: COOLDOWN_HOURS * HOUR_MS, now: future,
    });
    expect(plan2.probes).toHaveLength(1);
    expect(plan2.probes[0].vendor).toBe("anthropic");
    expect(plan2.stats.excludedByCooldown).toBe(0);
  });
});

describe("schema parity with alert-log writer (regression guard)", () => {
  it("alert-log recordReport + auto-probe planProbes use the same JSONL shape", () => {
    // Build a minimal DriftReport with one severe event; recordReport
    // persists it as a JSONL "alert" line. The auto-probe planner must
    // read that exact shape back. If the alert schema drifts, this fails.
    const report = {
      events: [{
        vendor: "anthropic",
        taskType: "plan",
        severity: "severe" as const,
        emaBefore: 0.90,
        emaAfter: 0.50,
        delta: SEVERE_DELTA,
        nBefore: 30,
        nAfter: 33,
      }],
      counts: { totalCompared: 1, severe: 1, moderate: 0, minor: 0 },
      exempt: [],
      beforeAt: tsAgo(FRESH_HOURS),
      afterAt: NOW.toISOString(),
    };
    const writeRes = consensusDriftAlertLogEngine.recordReport({
      report,
      logPath: alertLogPath,
      now: NOW,
    });
    expect(writeRes.ok).toBe(true);
    expect(writeRes.alertsWritten).toBe(1);

    const result = consensusDriftAutoProbeEngine.planProbes({
      alertLogPath, stateFilePath, now: NOW,
    });
    expect(result.probes).toHaveLength(1);
    expect(result.probes[0].vendor).toBe("anthropic");
    expect(result.probes[0].taskType).toBe("plan");
    expect(result.probes[0].severity).toBe("severe");
    expect(result.probes[0].delta).toBe(SEVERE_DELTA);
    expect(result.probes[0].reason).toBe("drift-severe");
  });
});
