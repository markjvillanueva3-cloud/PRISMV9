/**
 * ConsensusDriftAutoProbeEngine.test.ts — drift-driven probe planning,
 * dedup, cooldown, severity floor, recency, persistence.
 *
 * Milestone: INTEL-OLLAMA-OBSIDIAN-MS0 / U-CONSENSUS-DRIFT-AUTO-PROBE.
 */
import { describe, it, expect, beforeEach, afterEach } from "vitest";
import * as fs from "node:fs";
import * as os from "node:os";
import * as path from "node:path";

import {
  ConsensusDriftAutoProbeEngine,
  consensusDriftAutoProbeEngine,
} from "../engines/ConsensusDriftAutoProbeEngine.js";
import type { DriftProbe } from "../engines/ConsensusDriftAutoProbeEngine.js";

const HOUR_MS = 60 * 60 * 1000;
const DAY_MS = 24 * HOUR_MS;

interface AlertLine {
  schema_version: string;
  ts: string;
  kind: "alert" | "summary";
  vendor?: string;
  taskType?: string;
  severity?: "minor" | "moderate" | "severe";
  delta?: number;
  emaBefore?: number;
  emaAfter?: number;
  nBefore?: number;
  nAfter?: number;
}

function alertLine(partial: Partial<AlertLine>): string {
  const full: AlertLine = {
    schema_version: "1.0.0",
    ts: partial.ts ?? "2026-05-05T12:00:00.000Z",
    kind: partial.kind ?? "alert",
    vendor: partial.vendor,
    taskType: partial.taskType,
    severity: partial.severity,
    delta: partial.delta,
    emaBefore: partial.emaBefore,
    emaAfter: partial.emaAfter,
    nBefore: partial.nBefore,
    nAfter: partial.nAfter,
  };
  return JSON.stringify(full);
}

interface PersistedRecord {
  schemaVersion: string;
  issued: Record<
    string,
    {
      lastProbedTs: string;
      alertTs: string;
      severity: "moderate" | "severe";
      delta: number;
    }
  >;
}

function readPersisted(p: string): PersistedRecord {
  return JSON.parse(fs.readFileSync(p, "utf-8")) as PersistedRecord;
}

function makeTmpDir(): string {
  return fs.mkdtempSync(path.join(os.tmpdir(), "drift-auto-probe-"));
}

function rmDir(p: string): void {
  try {
    fs.rmSync(p, { recursive: true, force: true });
  } catch {
    /* test-cleanup best-effort */
  }
}

describe("ConsensusDriftAutoProbeEngine", () => {
  let tmpDir: string;
  let alertLogPath: string;
  let stateFilePath: string;
  let engine: ConsensusDriftAutoProbeEngine;
  const NOW = new Date("2026-05-05T18:00:00.000Z");

  beforeEach(() => {
    tmpDir = makeTmpDir();
    alertLogPath = path.join(tmpDir, "alerts.jsonl");
    stateFilePath = path.join(tmpDir, "probes.json");
    engine = new ConsensusDriftAutoProbeEngine();
  });

  afterEach(() => {
    rmDir(tmpDir);
  });

  // ───── PLAN: empty / cold-start ─────

  it("returns zero probes when alert ledger is missing", () => {
    const result = engine.planProbes({ alertLogPath, stateFilePath, now: NOW });
    expect(result.probes).toEqual([]);
    expect(result.stats.alertsConsidered).toBe(0);
    expect(result.stats.deduplicatedToPairs).toBe(0);
  });

  it("returns zero probes when ledger only has summaries (no alerts)", () => {
    fs.writeFileSync(
      alertLogPath,
      alertLine({ kind: "summary", ts: "2026-05-05T17:55:00.000Z" }) + "\n",
    );
    const result = engine.planProbes({ alertLogPath, stateFilePath, now: NOW });
    expect(result.probes).toEqual([]);
  });

  // ───── PLAN: happy paths ─────

  it("emits one probe for a single severe alert", () => {
    fs.writeFileSync(
      alertLogPath,
      alertLine({
        ts: "2026-05-05T17:55:00.000Z",
        vendor: "openai",
        taskType: "reasoning",
        severity: "severe",
        delta: -0.3,
      }) + "\n",
    );
    const result = engine.planProbes({ alertLogPath, stateFilePath, now: NOW });
    expect(result.probes.length).toBe(1);
    const p = result.probes[0];
    expect(p.vendor).toBe("openai");
    expect(p.taskType).toBe("reasoning");
    expect(p.severity).toBe("severe");
    expect(p.reason).toBe("drift-severe");
    expect(p.delta).toBe(-0.3);
    expect(p.priority).toBeGreaterThan(0.7);
    expect(p.priority).toBeLessThanOrEqual(1.0);
  });

  it("emits one probe for a single moderate alert", () => {
    fs.writeFileSync(
      alertLogPath,
      alertLine({
        ts: "2026-05-05T17:55:00.000Z",
        vendor: "google",
        taskType: "extract",
        severity: "moderate",
        delta: -0.18,
      }) + "\n",
    );
    const result = engine.planProbes({ alertLogPath, stateFilePath, now: NOW });
    expect(result.probes.length).toBe(1);
    expect(result.probes[0].reason).toBe("drift-moderate");
    expect(result.probes[0].priority).toBeGreaterThan(0.3);
    expect(result.probes[0].priority).toBeLessThan(0.7);
  });

  // ───── PLAN: dedupe ─────

  it("dedupes multiple alerts for the same (vendor, task) — keeps most severe", () => {
    fs.writeFileSync(
      alertLogPath,
      [
        alertLine({
          ts: "2026-05-05T17:55:00.000Z",
          vendor: "openai",
          taskType: "reasoning",
          severity: "moderate",
          delta: -0.18,
        }),
        alertLine({
          ts: "2026-05-05T17:50:00.000Z",
          vendor: "openai",
          taskType: "reasoning",
          severity: "severe",
          delta: -0.3,
        }),
      ].join("\n") + "\n",
    );
    const result = engine.planProbes({ alertLogPath, stateFilePath, now: NOW });
    expect(result.probes.length).toBe(1);
    expect(result.probes[0].severity).toBe("severe");
    expect(result.stats.deduplicatedToPairs).toBe(1);
  });

  it("dedupes multiple alerts of same severity — keeps most recent", () => {
    fs.writeFileSync(
      alertLogPath,
      [
        alertLine({
          ts: "2026-05-05T17:00:00.000Z",
          vendor: "openai",
          taskType: "reasoning",
          severity: "severe",
          delta: -0.25,
        }),
        alertLine({
          ts: "2026-05-05T17:55:00.000Z",
          vendor: "openai",
          taskType: "reasoning",
          severity: "severe",
          delta: -0.35,
        }),
      ].join("\n") + "\n",
    );
    const result = engine.planProbes({ alertLogPath, stateFilePath, now: NOW });
    expect(result.probes.length).toBe(1);
    expect(result.probes[0].alertTs).toBe("2026-05-05T17:55:00.000Z");
    expect(result.probes[0].delta).toBe(-0.35);
  });

  it("emits separate probes for different (vendor, task) pairs", () => {
    fs.writeFileSync(
      alertLogPath,
      [
        alertLine({
          ts: "2026-05-05T17:55:00.000Z",
          vendor: "openai",
          taskType: "reasoning",
          severity: "severe",
          delta: -0.3,
        }),
        alertLine({
          ts: "2026-05-05T17:50:00.000Z",
          vendor: "google",
          taskType: "extract",
          severity: "moderate",
          delta: -0.2,
        }),
      ].join("\n") + "\n",
    );
    const result = engine.planProbes({ alertLogPath, stateFilePath, now: NOW });
    expect(result.probes.length).toBe(2);
    expect(result.stats.deduplicatedToPairs).toBe(2);
  });

  // ───── PLAN: severity floor ─────

  it("severity floor severe filters out moderate alerts", () => {
    fs.writeFileSync(
      alertLogPath,
      [
        alertLine({
          ts: "2026-05-05T17:55:00.000Z",
          vendor: "openai",
          taskType: "reasoning",
          severity: "severe",
          delta: -0.3,
        }),
        alertLine({
          ts: "2026-05-05T17:50:00.000Z",
          vendor: "google",
          taskType: "extract",
          severity: "moderate",
          delta: -0.2,
        }),
      ].join("\n") + "\n",
    );
    const result = engine.planProbes({
      alertLogPath,
      stateFilePath,
      severityFloor: "severe",
      now: NOW,
    });
    expect(result.probes.length).toBe(1);
    expect(result.probes[0].vendor).toBe("openai");
    expect(result.stats.excludedBySeverity).toBeGreaterThanOrEqual(1);
  });

  it("never emits a probe for minor severity even with floor=moderate", () => {
    fs.writeFileSync(
      alertLogPath,
      alertLine({
        ts: "2026-05-05T17:55:00.000Z",
        vendor: "openai",
        taskType: "reasoning",
        severity: "minor",
        delta: -0.06,
      }) + "\n",
    );
    const result = engine.planProbes({ alertLogPath, stateFilePath, now: NOW });
    expect(result.probes).toEqual([]);
    expect(result.stats.excludedBySeverity).toBe(1);
  });

  // ───── PLAN: recency ─────

  it("excludes alerts older than recency window", () => {
    const oldTs = new Date(NOW.getTime() - 25 * HOUR_MS).toISOString();
    const newTs = new Date(NOW.getTime() - 30 * 60 * 1000).toISOString();
    fs.writeFileSync(
      alertLogPath,
      [
        alertLine({
          ts: oldTs,
          vendor: "openai",
          taskType: "reasoning",
          severity: "severe",
          delta: -0.3,
        }),
        alertLine({
          ts: newTs,
          vendor: "google",
          taskType: "extract",
          severity: "severe",
          delta: -0.3,
        }),
      ].join("\n") + "\n",
    );
    const result = engine.planProbes({
      alertLogPath,
      stateFilePath,
      recencyMs: DAY_MS,
      now: NOW,
    });
    expect(result.probes.length).toBe(1);
    expect(result.probes[0].vendor).toBe("google");
    expect(result.stats.excludedByRecency).toBe(1);
  });

  // ───── PLAN: cooldown ─────

  it("excludes pairs probed within cooldown window", () => {
    fs.writeFileSync(
      alertLogPath,
      alertLine({
        ts: "2026-05-05T17:55:00.000Z",
        vendor: "openai",
        taskType: "reasoning",
        severity: "severe",
        delta: -0.3,
      }) + "\n",
    );
    fs.writeFileSync(
      stateFilePath,
      JSON.stringify({
        schemaVersion: "1.0.0",
        issued: {
          "openai|reasoning": {
            lastProbedTs: new Date(NOW.getTime() - 30 * 60 * 1000).toISOString(),
            alertTs: "2026-05-05T16:00:00.000Z",
            severity: "severe",
            delta: -0.3,
          },
        },
      }),
    );
    const result = engine.planProbes({
      alertLogPath,
      stateFilePath,
      cooldownMs: HOUR_MS,
      now: NOW,
    });
    expect(result.probes).toEqual([]);
    expect(result.stats.excludedByCooldown).toBe(1);
  });

  it("re-includes pairs whose last probe is past cooldown", () => {
    fs.writeFileSync(
      alertLogPath,
      alertLine({
        ts: "2026-05-05T17:55:00.000Z",
        vendor: "openai",
        taskType: "reasoning",
        severity: "severe",
        delta: -0.3,
      }) + "\n",
    );
    fs.writeFileSync(
      stateFilePath,
      JSON.stringify({
        schemaVersion: "1.0.0",
        issued: {
          "openai|reasoning": {
            lastProbedTs: new Date(NOW.getTime() - 4 * HOUR_MS).toISOString(),
            alertTs: "2026-05-05T13:00:00.000Z",
            severity: "severe",
            delta: -0.3,
          },
        },
      }),
    );
    const result = engine.planProbes({
      alertLogPath,
      stateFilePath,
      cooldownMs: HOUR_MS,
      now: NOW,
    });
    expect(result.probes.length).toBe(1);
    expect(result.stats.excludedByCooldown).toBe(0);
  });

  // ───── PLAN: sort + cap ─────

  it("sorts severe before moderate at equal magnitude", () => {
    fs.writeFileSync(
      alertLogPath,
      [
        alertLine({
          ts: "2026-05-05T17:55:00.000Z",
          vendor: "google",
          taskType: "extract",
          severity: "moderate",
          delta: -0.2,
        }),
        alertLine({
          ts: "2026-05-05T17:50:00.000Z",
          vendor: "openai",
          taskType: "reasoning",
          severity: "severe",
          delta: -0.2,
        }),
      ].join("\n") + "\n",
    );
    const result = engine.planProbes({ alertLogPath, stateFilePath, now: NOW });
    expect(result.probes.length).toBe(2);
    expect(result.probes[0].severity).toBe("severe");
    expect(result.probes[1].severity).toBe("moderate");
  });

  it("within same severity sorts larger |delta| first", () => {
    fs.writeFileSync(
      alertLogPath,
      [
        alertLine({
          ts: "2026-05-05T17:55:00.000Z",
          vendor: "alpha",
          taskType: "reasoning",
          severity: "severe",
          delta: -0.2,
        }),
        alertLine({
          ts: "2026-05-05T17:54:00.000Z",
          vendor: "beta",
          taskType: "reasoning",
          severity: "severe",
          delta: -0.45,
        }),
      ].join("\n") + "\n",
    );
    const result = engine.planProbes({ alertLogPath, stateFilePath, now: NOW });
    expect(result.probes[0].vendor).toBe("beta");
    expect(result.probes[0].delta).toBe(-0.45);
  });

  it("caps the plan at maxProbes and reports cappedAt count", () => {
    const lines: string[] = [];
    const ALERT_COUNT = 8;
    for (let i = 0; i < ALERT_COUNT; i++) {
      lines.push(
        alertLine({
          ts: `2026-05-05T17:5${i}:00.000Z`,
          vendor: `vendor${i}`,
          taskType: "reasoning",
          severity: "severe",
          delta: -0.3 - i * 0.01,
        }),
      );
    }
    fs.writeFileSync(alertLogPath, lines.join("\n") + "\n");
    const cap = 3;
    const result = engine.planProbes({
      alertLogPath,
      stateFilePath,
      maxProbes: cap,
      now: NOW,
    });
    expect(result.probes.length).toBe(cap);
    expect(result.stats.cappedAt).toBe(ALERT_COUNT - cap);
  });

  it("maxProbes=0 yields empty plan", () => {
    fs.writeFileSync(
      alertLogPath,
      alertLine({
        ts: "2026-05-05T17:55:00.000Z",
        vendor: "openai",
        taskType: "reasoning",
        severity: "severe",
        delta: -0.3,
      }) + "\n",
    );
    const result = engine.planProbes({
      alertLogPath,
      stateFilePath,
      maxProbes: 0,
      now: NOW,
    });
    expect(result.probes).toEqual([]);
    expect(result.stats.cappedAt).toBe(1);
  });

  // ───── markProbed ─────

  it("markProbed writes state file with one entry per probe", () => {
    const probes: DriftProbe[] = [
      {
        vendor: "openai",
        taskType: "reasoning",
        severity: "severe",
        delta: -0.3,
        alertTs: "2026-05-05T17:55:00.000Z",
        priority: 0.88,
        reason: "drift-severe",
      },
    ];
    const result = engine.markProbed({ stateFilePath, probes, now: NOW });
    expect(result.ok).toBe(true);
    expect(result.written).toBe(1);
    const record = readPersisted(stateFilePath);
    expect(record.issued["openai|reasoning"].lastProbedTs).toBe(NOW.toISOString());
    expect(record.issued["openai|reasoning"].severity).toBe("severe");
    expect(record.issued["openai|reasoning"].delta).toBe(-0.3);
    expect(record.issued["openai|reasoning"].alertTs).toBe("2026-05-05T17:55:00.000Z");
  });

  it("markProbed merges with existing state without losing prior entries", () => {
    fs.writeFileSync(
      stateFilePath,
      JSON.stringify({
        schemaVersion: "1.0.0",
        issued: {
          "google|extract": {
            lastProbedTs: "2026-05-05T16:00:00.000Z",
            alertTs: "2026-05-05T15:50:00.000Z",
            severity: "moderate",
            delta: -0.2,
          },
        },
      }),
    );
    engine.markProbed({
      stateFilePath,
      probes: [
        {
          vendor: "openai",
          taskType: "reasoning",
          severity: "severe",
          delta: -0.3,
          alertTs: "2026-05-05T17:55:00.000Z",
          priority: 0.9,
          reason: "drift-severe",
        },
      ],
      now: NOW,
    });
    const record = readPersisted(stateFilePath);
    expect(Object.keys(record.issued).sort()).toEqual([
      "google|extract",
      "openai|reasoning",
    ]);
    expect(record.issued["google|extract"].severity).toBe("moderate");
    expect(record.issued["openai|reasoning"].severity).toBe("severe");
  });

  it("markProbed empty array is a no-op success", () => {
    const result = engine.markProbed({ stateFilePath, probes: [], now: NOW });
    expect(result.ok).toBe(true);
    expect(result.written).toBe(0);
    expect(fs.existsSync(stateFilePath)).toBe(false);
  });

  // ───── pruneProbedRecord ─────

  it("pruneProbedRecord removes entries older than threshold", () => {
    const STALE_DAYS = 10;
    const RECENT_HOURS = 2;
    const oldTs = new Date(NOW.getTime() - STALE_DAYS * DAY_MS).toISOString();
    const recentTs = new Date(NOW.getTime() - RECENT_HOURS * HOUR_MS).toISOString();
    fs.writeFileSync(
      stateFilePath,
      JSON.stringify({
        schemaVersion: "1.0.0",
        issued: {
          "old|reasoning": {
            lastProbedTs: oldTs,
            alertTs: oldTs,
            severity: "severe",
            delta: -0.3,
          },
          "new|reasoning": {
            lastProbedTs: recentTs,
            alertTs: recentTs,
            severity: "severe",
            delta: -0.3,
          },
        },
      }),
    );
    const result = engine.pruneProbedRecord({
      stateFilePath,
      olderThanMs: 7 * DAY_MS,
      now: NOW,
    });
    expect(result.ok).toBe(true);
    expect(result.pruned).toBe(1);
    expect(result.remaining).toBe(1);
    const record = readPersisted(stateFilePath);
    expect(Object.keys(record.issued)).toEqual(["new|reasoning"]);
    expect(record.issued["new|reasoning"].lastProbedTs).toBe(recentTs);
  });

  it("pruneProbedRecord on missing file is a no-op success", () => {
    const result = engine.pruneProbedRecord({
      stateFilePath,
      olderThanMs: 7 * DAY_MS,
      now: NOW,
    });
    expect(result.ok).toBe(true);
    expect(result.pruned).toBe(0);
    expect(result.remaining).toBe(0);
  });

  // ───── robustness ─────

  it("loadProbedRecord returns empty record for corrupt JSON", () => {
    fs.writeFileSync(stateFilePath, "{not valid json");
    const record = engine.loadProbedRecord(stateFilePath);
    expect(record.issued).toEqual({});
    expect(record.schemaVersion).toBe("1.0.0");
  });

  it("loadProbedRecord drops malformed entries", () => {
    fs.writeFileSync(
      stateFilePath,
      JSON.stringify({
        schemaVersion: "1.0.0",
        issued: {
          "good|reasoning": {
            lastProbedTs: "2026-05-05T16:00:00.000Z",
            alertTs: "2026-05-05T15:50:00.000Z",
            severity: "severe",
            delta: -0.3,
          },
          "bad|missing-fields": { lastProbedTs: "2026-05-05T16:00:00.000Z" },
          "bad|wrong-severity": {
            lastProbedTs: "2026-05-05T16:00:00.000Z",
            alertTs: "2026-05-05T15:50:00.000Z",
            severity: "minor",
            delta: -0.05,
          },
        },
      }),
    );
    const record = engine.loadProbedRecord(stateFilePath);
    expect(Object.keys(record.issued)).toEqual(["good|reasoning"]);
    expect(record.issued["good|reasoning"].severity).toBe("severe");
  });

  it("rejects state file paths containing parent traversal", () => {
    // path.join normalizes ".." away, so we hand-build a literal
    // traversal string — that's the actual threat we guard against
    // (config-injected or env-supplied paths).
    const bad = `${tmpDir}/../escape.json`;
    const result = engine.markProbed({
      stateFilePath: bad,
      probes: [
        {
          vendor: "x",
          taskType: "y",
          severity: "severe",
          delta: -0.3,
          alertTs: NOW.toISOString(),
          priority: 0.9,
          reason: "drift-severe",
        },
      ],
      now: NOW,
    });
    expect(result.ok).toBe(false);
    expect(result.written).toBe(0);
    expect(result.error ?? "").toContain("unsafe");
  });

  it("singleton export is wired", () => {
    expect(consensusDriftAutoProbeEngine).toBeInstanceOf(ConsensusDriftAutoProbeEngine);
  });

  it("plan output includes schemaVersion and generatedAt", () => {
    fs.writeFileSync(alertLogPath, "");
    const result = engine.planProbes({ alertLogPath, stateFilePath, now: NOW });
    expect(result.schemaVersion).toBe("1.0.0");
    expect(result.generatedAt).toBe(NOW.toISOString());
  });
});
