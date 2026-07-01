/**
 * CostAlarmEngine — COST-CASCADE-MS0/U-COST-ALARM
 *
 * 5 spec cases + adversarial coverage of R12 invariants:
 *   below-threshold-no-alarm
 *   above-daily
 *   above-weekly-not-daily
 *   cool-down-suppresses
 *   config-missing → safe defaults
 *
 *   Plus adversarial: clock-skew (telemetry-ts vs wall-clock), threshold=0
 *   gated by cool-down, corrupt JSONL counted, channel write fail isolated,
 *   per-task-class overrides, test-tentacle filter, tentacle allow-list,
 *   torn-tail JSONL counted as truncatedTailLines.
 */

import { describe, it, expect } from "vitest";
import {
  CostAlarmEngine,
  normalizeConfig,
  aggregateTelemetry,
  lookupThresholds,
  lastFiredAt,
  isCoolDownActive,
  type CostAlarmConfig,
  type CostAlarmDeps,
  type TelemetryRecord,
  type AlarmRecord,
} from "../engines/CostAlarmEngine.js";

// ----------------------------------------------------------------------------
// Helpers
// ----------------------------------------------------------------------------

function makeConfig(overrides: Partial<CostAlarmConfig> = {}): CostAlarmConfig {
  return normalizeConfig(
    {
      schemaVersion: 1,
      thresholds: { dailyUSD: 5, weeklyUSD: 25, dailyTokens: 1_500_000, weeklyTokens: 7_500_000 },
      coolDownMinutes: 60,
      channels: [
        { type: "jsonl", path: "x.jsonl" },
        { type: "agent_chat", path: "y.md" },
      ],
      rotation: { alarmLogMaxBytes: 524_288, alarmLogKeepArchives: 5 },
      taskClassOverrides: {},
      tentacleAllowList: null,
      ignoreTestTentacles: true,
      testTentaclePrefixes: ["__wiretest__", "__test__"],
      ...overrides,
    },
    () => undefined,
  );
}

function tRec(over: Partial<TelemetryRecord>): TelemetryRecord {
  return {
    ts: over.ts ?? "2026-05-20T12:00:00.000Z",
    tentacle: over.tentacle ?? "claude-sonnet-4",
    taskClass: over.taskClass ?? "deep_reasoning",
    inputTokens: over.inputTokens ?? 1000,
    outputTokens: over.outputTokens ?? 500,
    latencyMs: over.latencyMs ?? 1200,
    costUSD: over.costUSD ?? 0.02,
    degraded: over.degraded ?? false,
    meta: over.meta,
  };
}

function buildDeps(args: {
  config?: CostAlarmConfig | null;
  records?: TelemetryRecord[];
  truncatedTailLines?: number;
  alarmLog?: AlarmRecord[];
  now?: Date;
  jsonlSink?: AlarmRecord[];
  chatSink?: string[];
  jsonlThrow?: boolean;
  chatThrow?: boolean;
  configThrow?: boolean;
  telemetryThrow?: boolean;
  warnings?: string[];
}): CostAlarmDeps {
  const jsonlSink = args.jsonlSink ?? [];
  const chatSink = args.chatSink ?? [];
  const warnings = args.warnings ?? [];
  return {
    readConfig: () => {
      if (args.configThrow) throw new Error("config-blowup");
      return args.config ?? null;
    },
    readTelemetry: () => {
      if (args.telemetryThrow) throw new Error("telemetry-blowup");
      return { records: args.records ?? [], truncatedTailLines: args.truncatedTailLines ?? 0 };
    },
    readAlarmLog: () => args.alarmLog ?? [],
    appendAlarmJsonl: (rec) => {
      if (args.jsonlThrow) throw new Error("jsonl-blowup");
      jsonlSink.push(rec);
    },
    appendAgentChatLine: (line) => {
      if (args.chatThrow) throw new Error("chat-blowup");
      chatSink.push(line);
    },
    now: () => args.now ?? new Date("2026-05-20T15:00:00.000Z"),
    logWarn: (m) => warnings.push(m),
  };
}

const ENGINE = new CostAlarmEngine();

// ============================================================================
// 5 SPEC CASES
// ============================================================================

describe("CostAlarmEngine — spec cases", () => {
  it("below-threshold-no-alarm: total under daily + weekly caps → no fires", () => {
    const records = [
      tRec({ ts: "2026-05-20T10:00:00.000Z", costUSD: 1.0, inputTokens: 100_000, outputTokens: 50_000 }),
      tRec({ ts: "2026-05-20T11:00:00.000Z", costUSD: 0.5, inputTokens: 50_000, outputTokens: 25_000 }),
    ];
    const jsonlSink: AlarmRecord[] = [];
    const chatSink: string[] = [];
    const result = ENGINE.check(buildDeps({ config: makeConfig(), records, jsonlSink, chatSink }));
    expect(result.ok).toBe(true);
    expect(result.fired).toHaveLength(0);
    expect(jsonlSink).toHaveLength(0);
    expect(chatSink).toHaveLength(0);
    expect(result.daily?.totalUSD).toBeCloseTo(1.5, 5);
    expect(result.weekly?.totalUSD).toBeCloseTo(1.5, 5);
  });

  it("above-daily: $7 daily vs $5 cap → daily_usd fires (weekly $7 also crosses $25? no — weekly cap=25 so no weekly fire)", () => {
    const records = [
      tRec({ ts: "2026-05-20T08:00:00.000Z", costUSD: 4.0 }),
      tRec({ ts: "2026-05-20T10:00:00.000Z", costUSD: 3.0 }),
    ];
    const jsonlSink: AlarmRecord[] = [];
    const chatSink: string[] = [];
    const result = ENGINE.check(buildDeps({ config: makeConfig(), records, jsonlSink, chatSink }));
    expect(result.fired.map((f) => f.alarmKey)).toContain("daily_usd::__all__");
    expect(result.fired.map((f) => f.alarmKey)).not.toContain("weekly_usd::__all__");
    expect(jsonlSink).toHaveLength(1);
    expect(jsonlSink[0].actual).toBeCloseTo(7.0, 5);
    expect(jsonlSink[0].cap).toBe(5);
    expect(jsonlSink[0].exceededBy).toBeCloseTo(2.0, 5);
    expect(chatSink[0]).toMatch(/cost-alarm daily_usd/);
  });

  it("above-weekly-not-daily: 6 days old $20 + today $0.50 → weekly $20.50 > $25? no — adjust to $30 total", () => {
    // Place a fat record outside the daily window but inside weekly window.
    const records = [
      tRec({ ts: "2026-05-14T12:00:00.000Z", costUSD: 28.0 }), // 6 days ago, inside 7d window
      tRec({ ts: "2026-05-20T10:00:00.000Z", costUSD: 0.5 }), // today
    ];
    const jsonlSink: AlarmRecord[] = [];
    const result = ENGINE.check(buildDeps({ config: makeConfig(), records, jsonlSink }));
    const fired = result.fired.map((f) => f.alarmKey);
    expect(fired).toContain("weekly_usd::__all__");
    expect(fired).not.toContain("daily_usd::__all__");
    expect(result.daily?.totalUSD).toBeCloseTo(0.5, 5);
    expect(result.weekly?.totalUSD).toBeCloseTo(28.5, 5);
  });

  it("cool-down-suppresses: alarm fired 30 min ago with 60-min cool-down → suppressed", () => {
    const records = [tRec({ ts: "2026-05-20T10:00:00.000Z", costUSD: 7.0 })];
    const recentAlarm: AlarmRecord = {
      alarmKey: "daily_usd::__all__",
      ts: "2026-05-20T14:30:00.000Z", // 30 min before now=15:00
      level: "daily_usd",
      taskClass: null,
      actual: 6.5,
      cap: 5,
      exceededBy: 1.5,
      suggestedAction: "prior",
    };
    const jsonlSink: AlarmRecord[] = [];
    const result = ENGINE.check(
      buildDeps({ config: makeConfig(), records, alarmLog: [recentAlarm], jsonlSink }),
    );
    expect(result.fired).toHaveLength(0);
    expect(result.suppressedByCoolDown.map((d) => d.alarmKey)).toContain("daily_usd::__all__");
    expect(jsonlSink).toHaveLength(0);
  });

  it("config-missing: readConfig returns null → safe defaults used, no crash", () => {
    const records = [tRec({ ts: "2026-05-20T10:00:00.000Z", costUSD: 7.0 })];
    const warnings: string[] = [];
    const result = ENGINE.check(buildDeps({ config: null, records, warnings }));
    expect(result.ok).toBe(true);
    expect(warnings.some((w) => w.includes("cost-alarm-config"))).toBe(true);
    // Safe-default cap is $5 → $7 still fires
    expect(result.fired.map((f) => f.alarmKey)).toContain("daily_usd::__all__");
  });
});

// ============================================================================
// R12 INVARIANT REGRESSION ORACLES (fail-on-revert)
// ============================================================================

describe("CostAlarmEngine — R12 invariants", () => {
  it("R12#1 aggregator throw → ok:false + errors[], not crash", () => {
    const result = ENGINE.check(buildDeps({ telemetryThrow: true }));
    expect(result.ok).toBe(false);
    expect(result.errors.some((e) => e.includes("readTelemetry"))).toBe(true);
    expect(result.fired).toEqual([]);
  });

  it("R12#2 config malformed (number, array, primitives) → safe defaults", () => {
    const warnings: string[] = [];
    const c1 = normalizeConfig(42, (m) => warnings.push(m));
    expect(c1.thresholds.dailyUSD).toBe(5);
    const c2 = normalizeConfig([1, 2, 3], (m) => warnings.push(m));
    expect(c2.thresholds.dailyUSD).toBe(5);
    const c3 = normalizeConfig({ thresholds: { dailyUSD: -1 } }, (m) => warnings.push(m));
    expect(c3.thresholds.dailyUSD).toBe(5); // negative → floor=0 fails → fallback
    const c4 = normalizeConfig({ thresholds: { dailyUSD: "abc" } }, (m) => warnings.push(m));
    expect(c4.thresholds.dailyUSD).toBe(5); // non-number → fallback
  });

  it("R12#3 test tentacles excluded from aggregate when ignoreTestTentacles=true", () => {
    const records = [
      tRec({ ts: "2026-05-20T10:00:00.000Z", costUSD: 100.0, tentacle: "__wiretest__" }),
      tRec({ ts: "2026-05-20T11:00:00.000Z", costUSD: 1.0, tentacle: "claude-sonnet-4" }),
    ];
    const result = ENGINE.check(buildDeps({ config: makeConfig(), records }));
    expect(result.daily?.totalUSD).toBeCloseTo(1.0, 5);
    expect(result.fired).toHaveLength(0);
  });

  it("R12#3b test tentacles INCLUDED when ignoreTestTentacles=false", () => {
    const records = [tRec({ ts: "2026-05-20T10:00:00.000Z", costUSD: 100.0, tentacle: "__wiretest__" })];
    const config = makeConfig({ ignoreTestTentacles: false });
    const result = ENGINE.check(buildDeps({ config, records }));
    expect(result.daily?.totalUSD).toBeCloseTo(100.0, 5);
    expect(result.fired.length).toBeGreaterThan(0);
  });

  it("R12#4 cool-down uses TELEMETRY timestamps, NOT wall-clock", () => {
    // A clock-skewed VM: wall-clock = today, but alarm log says it fired 5 min "in the future".
    // With wall-clock comparison this would wrap negative; with our impl elapsed=now-last,
    // which is negative → we treat as no-cool-down (the most defensible interpretation).
    // The KEY assertion: lastFiredAt reads alarm-log .ts, never wall-clock.
    const log: AlarmRecord[] = [
      {
        alarmKey: "daily_usd::__all__",
        ts: "2026-05-20T16:00:00.000Z", // future relative to "now" 15:00
        level: "daily_usd",
        taskClass: null,
        actual: 6,
        cap: 5,
        exceededBy: 1,
        suggestedAction: "",
      },
    ];
    const last = lastFiredAt("daily_usd::__all__", log);
    expect(last?.toISOString()).toBe("2026-05-20T16:00:00.000Z");
    expect(isCoolDownActive("daily_usd::__all__", log, 60, new Date("2026-05-20T15:00:00.000Z"))).toBe(false);
  });

  it("R12#5 jsonl write fail → channelWarnings tracked, chat still fires, fired[] still records", () => {
    const records = [tRec({ ts: "2026-05-20T10:00:00.000Z", costUSD: 7.0 })];
    const chatSink: string[] = [];
    const result = ENGINE.check(
      buildDeps({ config: makeConfig(), records, jsonlThrow: true, chatSink }),
    );
    expect(result.fired).toHaveLength(1);
    expect(result.channelWarnings.some((w) => w.includes("appendAlarmJsonl"))).toBe(true);
    expect(chatSink).toHaveLength(1);
  });

  it("R12#5b chat write fail → channelWarnings tracked, jsonl still fires", () => {
    const records = [tRec({ ts: "2026-05-20T10:00:00.000Z", costUSD: 7.0 })];
    const jsonlSink: AlarmRecord[] = [];
    const result = ENGINE.check(
      buildDeps({ config: makeConfig(), records, chatThrow: true, jsonlSink }),
    );
    expect(result.fired).toHaveLength(1);
    expect(result.channelWarnings.some((w) => w.includes("appendAgentChatLine"))).toBe(true);
    expect(jsonlSink).toHaveLength(1);
  });

  it("R12#6 cap=0 with actual=0 does NOT fire (strict `actual > cap`)", () => {
    const config = makeConfig({
      thresholds: { dailyUSD: 0, weeklyUSD: 0, dailyTokens: 0, weeklyTokens: 0 },
    });
    const result = ENGINE.check(buildDeps({ config, records: [] }));
    expect(result.fired).toHaveLength(0);
  });

  it("R12#6b cap=0 with actual>0 DOES fire", () => {
    const config = makeConfig({
      thresholds: { dailyUSD: 0, weeklyUSD: 999, dailyTokens: 999_999_999, weeklyTokens: 999_999_999 },
    });
    const records = [tRec({ ts: "2026-05-20T10:00:00.000Z", costUSD: 0.01 })];
    const result = ENGINE.check(buildDeps({ config, records }));
    expect(result.fired.map((f) => f.alarmKey)).toContain("daily_usd::__all__");
  });

  it("R12#6c cap=0 + actual>0 + cool-down active → STILL suppressed (cap=0 doesn't bypass cool-down)", () => {
    const config = makeConfig({
      thresholds: { dailyUSD: 0, weeklyUSD: 999, dailyTokens: 999_999_999, weeklyTokens: 999_999_999 },
    });
    const records = [tRec({ ts: "2026-05-20T10:00:00.000Z", costUSD: 0.01 })];
    const log: AlarmRecord[] = [
      {
        alarmKey: "daily_usd::__all__",
        ts: "2026-05-20T14:30:00.000Z",
        level: "daily_usd",
        taskClass: null,
        actual: 0.005,
        cap: 0,
        exceededBy: 0.005,
        suggestedAction: "",
      },
    ];
    const result = ENGINE.check(buildDeps({ config, records, alarmLog: log }));
    expect(result.fired).toHaveLength(0);
    expect(result.suppressedByCoolDown.map((d) => d.alarmKey)).toContain("daily_usd::__all__");
  });

  it("R12#7 truncatedTailLines surfaced in result", () => {
    const result = ENGINE.check(buildDeps({ config: makeConfig(), records: [], truncatedTailLines: 3 }));
    expect(result.truncatedTailLines).toBe(3);
    expect(result.daily?.truncatedTailLines).toBe(3);
  });
});

// ============================================================================
// Pure-core unit tests
// ============================================================================

describe("aggregateTelemetry — pure", () => {
  it("filters by window using telemetry ts, not wall-clock", () => {
    const records = [
      tRec({ ts: "2026-05-19T12:00:00.000Z", costUSD: 1 }),
      tRec({ ts: "2026-05-20T12:00:00.000Z", costUSD: 2 }),
      tRec({ ts: "2026-05-21T12:00:00.000Z", costUSD: 4 }), // future relative to window-end
    ];
    const agg = aggregateTelemetry(
      records,
      new Date("2026-05-19T11:00:00.000Z"),
      new Date("2026-05-20T13:00:00.000Z"),
      makeConfig(),
    );
    expect(agg.totalUSD).toBeCloseTo(3, 5);
    expect(agg.recordCount).toBe(2);
  });

  it("groups perTaskClass with usd + tokens + count", () => {
    const records = [
      tRec({ ts: "2026-05-20T10:00:00.000Z", taskClass: "deep_reasoning", costUSD: 1.5, inputTokens: 1000, outputTokens: 200 }),
      tRec({ ts: "2026-05-20T11:00:00.000Z", taskClass: "deep_reasoning", costUSD: 0.5, inputTokens: 500, outputTokens: 100 }),
      tRec({ ts: "2026-05-20T12:00:00.000Z", taskClass: "lint", costUSD: 0.02, inputTokens: 50, outputTokens: 10 }),
    ];
    const agg = aggregateTelemetry(records, new Date("2026-05-20T00:00:00.000Z"), new Date("2026-05-20T23:59:59.999Z"), makeConfig());
    expect(agg.perTaskClass.deep_reasoning).toEqual({ usd: 2.0, tokens: 1800, count: 2 });
    expect(agg.perTaskClass.lint).toEqual({ usd: 0.02, tokens: 60, count: 1 });
  });

  it("tentacleAllowList filters when non-null", () => {
    const records = [
      tRec({ ts: "2026-05-20T10:00:00.000Z", tentacle: "claude-sonnet-4", costUSD: 1 }),
      tRec({ ts: "2026-05-20T11:00:00.000Z", tentacle: "gpt-4o", costUSD: 2 }),
      tRec({ ts: "2026-05-20T12:00:00.000Z", tentacle: "ollama-qwen2.5", costUSD: 4 }),
    ];
    const config = makeConfig({ tentacleAllowList: ["claude-sonnet-4", "ollama-qwen2.5"] });
    const agg = aggregateTelemetry(records, new Date("2026-05-20T00:00:00.000Z"), new Date("2026-05-20T23:59:59.999Z"), config);
    expect(agg.totalUSD).toBeCloseTo(5, 5);
    expect(agg.recordCount).toBe(2);
  });

  it("ignores records with non-finite costUSD or token fields (defensive)", () => {
    const records: TelemetryRecord[] = [
      tRec({ ts: "2026-05-20T10:00:00.000Z", costUSD: NaN, inputTokens: Infinity, outputTokens: 50 }),
      tRec({ ts: "2026-05-20T11:00:00.000Z", costUSD: 1, inputTokens: 100, outputTokens: 50 }),
    ];
    const agg = aggregateTelemetry(records, new Date("2026-05-20T00:00:00.000Z"), new Date("2026-05-20T23:59:59.999Z"), makeConfig());
    // NaN cost contributes 0, Infinity tokens contributes 0; record still counted because it's in-window
    expect(agg.totalUSD).toBeCloseTo(1, 5);
    expect(agg.totalTokens).toBe(50 + 100 + 50); // 50 from rec1 (output), 150 from rec2
    expect(agg.recordCount).toBe(2);
  });
});

describe("lookupThresholds — pure", () => {
  it("returns top-level thresholds when taskClass=null", () => {
    const t = lookupThresholds(null, makeConfig());
    expect(t.dailyUSD).toBe(5);
    expect(t.coolDownMinutes).toBe(60);
  });

  it("returns override + falls through to top-level for unspecified keys", () => {
    const config = makeConfig({
      taskClassOverrides: { lint: { dailyUSD: 0.1, coolDownMinutes: 240 } },
    });
    const t = lookupThresholds("lint", config);
    expect(t.dailyUSD).toBe(0.1);
    expect(t.weeklyUSD).toBe(25); // fell through
    expect(t.coolDownMinutes).toBe(240);
  });

  it("missing override → top-level", () => {
    const config = makeConfig({
      taskClassOverrides: { lint: { dailyUSD: 0.1 } },
    });
    const t = lookupThresholds("not_in_overrides", config);
    expect(t.dailyUSD).toBe(5);
    expect(t.coolDownMinutes).toBe(60);
  });
});

describe("decideAlarms + per-task-class overrides", () => {
  it("per-task-class override that's tighter than top-level fires earlier", () => {
    const records = [
      tRec({ ts: "2026-05-20T10:00:00.000Z", taskClass: "wire_seam_probe", costUSD: 0.15 }),
    ];
    const config = makeConfig({
      taskClassOverrides: { wire_seam_probe: { dailyUSD: 0.10, weeklyUSD: 0.50 } },
    });
    const jsonlSink: AlarmRecord[] = [];
    const result = ENGINE.check(buildDeps({ config, records, jsonlSink }));
    const keys = result.fired.map((f) => f.alarmKey);
    expect(keys).toContain("daily_usd::wire_seam_probe");
    expect(keys).not.toContain("daily_usd::__all__"); // top-level $5 not exceeded by $0.15
  });

  it("cool-down per-task-class uses override coolDownMinutes", () => {
    const config = makeConfig({
      taskClassOverrides: { wire_seam_probe: { dailyUSD: 0.10, coolDownMinutes: 240 } },
    });
    const log: AlarmRecord[] = [
      {
        alarmKey: "daily_usd::wire_seam_probe",
        ts: "2026-05-20T12:00:00.000Z", // 3h before now=15:00
        level: "daily_usd",
        taskClass: "wire_seam_probe",
        actual: 0.15,
        cap: 0.10,
        exceededBy: 0.05,
        suggestedAction: "",
      },
    ];
    const records = [
      tRec({ ts: "2026-05-20T14:00:00.000Z", taskClass: "wire_seam_probe", costUSD: 0.20 }),
    ];
    // 3h < 4h cool-down → suppress
    const result = ENGINE.check(buildDeps({ config, records, alarmLog: log }));
    expect(result.fired).toHaveLength(0);
    expect(result.suppressedByCoolDown.map((d) => d.alarmKey)).toContain("daily_usd::wire_seam_probe");
  });
});

describe("isCoolDownActive — pure", () => {
  it("returns false when log is empty", () => {
    expect(isCoolDownActive("k", [], 60, new Date("2026-05-20T15:00:00.000Z"))).toBe(false);
  });

  it("returns false when coolDownMinutes <= 0", () => {
    const log: AlarmRecord[] = [
      { alarmKey: "k", ts: "2026-05-20T14:59:00.000Z", level: "daily_usd", taskClass: null, actual: 1, cap: 0, exceededBy: 1, suggestedAction: "" },
    ];
    expect(isCoolDownActive("k", log, 0, new Date("2026-05-20T15:00:00.000Z"))).toBe(false);
    expect(isCoolDownActive("k", log, -10, new Date("2026-05-20T15:00:00.000Z"))).toBe(false);
  });

  it("returns true when elapsed < cool-down window", () => {
    const log: AlarmRecord[] = [
      { alarmKey: "k", ts: "2026-05-20T14:30:00.000Z", level: "daily_usd", taskClass: null, actual: 1, cap: 0, exceededBy: 1, suggestedAction: "" },
    ];
    expect(isCoolDownActive("k", log, 60, new Date("2026-05-20T15:00:00.000Z"))).toBe(true);
  });

  it("returns false when elapsed >= cool-down window", () => {
    const log: AlarmRecord[] = [
      { alarmKey: "k", ts: "2026-05-20T13:30:00.000Z", level: "daily_usd", taskClass: null, actual: 1, cap: 0, exceededBy: 1, suggestedAction: "" },
    ];
    expect(isCoolDownActive("k", log, 60, new Date("2026-05-20T15:00:00.000Z"))).toBe(false);
  });
});

// ============================================================================
// End-to-end smoke through CostAlarmEngine.check()
// ============================================================================

describe("CostAlarmEngine.check() — E2E smoke", () => {
  it("fires multiple alarms in one tick + cooldown registers for next tick", () => {
    const records = [
      tRec({ ts: "2026-05-20T10:00:00.000Z", costUSD: 4.0, inputTokens: 800_000, outputTokens: 200_000 }),
      tRec({ ts: "2026-05-20T11:00:00.000Z", costUSD: 4.0, inputTokens: 800_000, outputTokens: 200_000 }),
    ];
    const jsonlSink: AlarmRecord[] = [];
    const chatSink: string[] = [];
    const result = ENGINE.check(buildDeps({ config: makeConfig(), records, jsonlSink, chatSink }));
    expect(result.fired.length).toBeGreaterThanOrEqual(2); // daily_usd + daily_tokens at minimum
    expect(jsonlSink.length).toBe(result.fired.length);
    expect(chatSink.length).toBe(result.fired.length);

    // Simulate second tick — alarm log now contains the prior emissions
    const result2 = ENGINE.check(buildDeps({ config: makeConfig(), records, alarmLog: jsonlSink, jsonlSink: [] }));
    expect(result2.fired).toHaveLength(0);
    expect(result2.suppressedByCoolDown.length).toBe(result.fired.length);
  });
});
