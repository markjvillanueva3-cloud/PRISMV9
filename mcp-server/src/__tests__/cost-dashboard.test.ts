/**
 * COST-CASCADE-MS0/U-COST-DASHBOARD test suite.
 *
 * 3 spec cases:
 *   1. empty telemetry → ok:true, zero totals, no rows
 *   2. full window → aggregated totals match real summation
 *   3. partial tentacle outage → records with degraded/missing fields tolerated
 *
 * Plus HTML content checks (XSS-safe DOM ops, no CDN deps, charts present).
 */

import { describe, it, expect, afterEach } from "vitest";
import * as fs from "node:fs";
import * as path from "node:path";
import * as os from "node:os";
import {
  buildCostAggregate,
  COST_DASHBOARD_HTML,
  type CostAggregateResponse,
} from "../routes/cost.js";

interface Fixture {
  root: string;
  cleanup: () => void;
}

function mkFixture(telemetryLines: string[], config?: object): Fixture {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "prism-cost-dash-"));
  const stateDir = path.join(root, "mcp-server", "data", "state");
  fs.mkdirSync(stateDir, { recursive: true });
  fs.writeFileSync(path.join(stateDir, "cost-telemetry.jsonl"), telemetryLines.join("\n"), "utf8");
  if (config) fs.writeFileSync(path.join(stateDir, "cost-alarm-config.json"), JSON.stringify(config), "utf8");
  fs.mkdirSync(path.join(root, "state", "shared"), { recursive: true });
  return {
    root,
    cleanup: () => fs.rmSync(root, { recursive: true, force: true }),
  };
}

describe("buildCostAggregate — 3 spec cases", () => {
  let fix: Fixture | null = null;
  afterEach(() => {
    if (fix) {
      fix.cleanup();
      fix = null;
    }
  });

  it("case 1: empty telemetry → ok:true with zero totals and empty rows", () => {
    fix = mkFixture([]);
    const r = buildCostAggregate({
      prismRoot: fix.root,
      now: new Date("2026-05-20T15:00:00.000Z"),
      windowHours: 24,
    });
    expect(r.ok).toBe(true);
    expect(r.daily?.totalUSD).toBe(0);
    expect(r.daily?.recordCount).toBe(0);
    expect(r.weekly?.totalUSD).toBe(0);
    expect(r.perTentacle).toEqual({});
    expect(r.hourlyUSD).toEqual([]);
    expect(r.truncatedTailLines).toBe(0);
  });

  it("case 2: full window → JSON returns aggregated counts across tentacles + task classes + hours", () => {
    const lines = [
      mkLine("2026-05-20T10:30:00.000Z", "claude-sonnet-4", "deep_reasoning", 1.5, 1000, 200),
      mkLine("2026-05-20T11:15:00.000Z", "claude-sonnet-4", "deep_reasoning", 0.5, 500, 100),
      mkLine("2026-05-20T11:45:00.000Z", "ollama-qwen2.5", "lint", 0.0, 50, 10),
      mkLine("2026-05-20T13:00:00.000Z", "gpt-4o", "code_review", 0.25, 200, 80),
      // Outside the 24h window — must be excluded
      mkLine("2026-05-15T10:00:00.000Z", "claude-sonnet-4", "deep_reasoning", 100.0, 999999, 0),
    ];
    fix = mkFixture(lines);
    const r = buildCostAggregate({
      prismRoot: fix.root,
      now: new Date("2026-05-20T15:00:00.000Z"),
      windowHours: 24,
    });
    expect(r.ok).toBe(true);
    expect(r.daily?.recordCount).toBe(4);
    expect(r.daily?.totalUSD).toBeCloseTo(2.25, 5);
    expect(r.daily?.totalTokens).toBe(2140);
    expect(r.perTentacle["claude-sonnet-4"]).toEqual({ usd: 2.0, tokens: 1800, count: 2 });
    expect(r.perTentacle["ollama-qwen2.5"]).toEqual({ usd: 0.0, tokens: 60, count: 1 });
    expect(r.perTentacle["gpt-4o"]).toEqual({ usd: 0.25, tokens: 280, count: 1 });
    expect(r.daily?.perTaskClass.deep_reasoning).toEqual({ usd: 2.0, tokens: 1800, count: 2 });
    expect(r.daily?.perTaskClass.lint).toEqual({ usd: 0.0, tokens: 60, count: 1 });
    expect(r.daily?.perTaskClass.code_review).toEqual({ usd: 0.25, tokens: 280, count: 1 });
    expect(r.hourlyUSD).toHaveLength(3);
    expect(r.hourlyUSD[0].hourStartIso).toBe("2026-05-20T10:00:00.000Z");
    expect(r.hourlyUSD[1].hourStartIso).toBe("2026-05-20T11:00:00.000Z");
    expect(r.hourlyUSD[2].hourStartIso).toBe("2026-05-20T13:00:00.000Z");
    expect(r.hourlyUSD[0].usd).toBeCloseTo(1.5, 5);
    expect(r.hourlyUSD[1].usd).toBeCloseTo(0.5, 5);
    expect(r.hourlyUSD[2].usd).toBeCloseTo(0.25, 5);
    expect(r.weekly?.recordCount).toBe(5);
  });

  it("case 3: partial tentacle outage → degraded records counted, malformed JSON lines counted as truncatedTailLines", () => {
    const lines = [
      mkLine("2026-05-20T10:00:00.000Z", "claude-sonnet-4", "deep_reasoning", 1.0, 500, 100),
      JSON.stringify({
        schemaVersion: 1,
        ts: "2026-05-20T11:00:00.000Z",
        tentacle: "ollama-qwen2.5",
        taskClass: "lint",
        inputTokens: 100,
        outputTokens: 0,
        costUSD: 0,
        degraded: true,
      }),
      "{this is not valid json",
      JSON.stringify({ tentacle: "gpt-4o", taskClass: "x", inputTokens: 1, outputTokens: 1, costUSD: 1 }),
    ];
    fix = mkFixture(lines);
    const r = buildCostAggregate({
      prismRoot: fix.root,
      now: new Date("2026-05-20T15:00:00.000Z"),
      windowHours: 24,
    });
    expect(r.ok).toBe(true);
    expect(r.daily?.recordCount).toBe(2);
    expect(r.daily?.totalUSD).toBeCloseTo(1.0, 5);
    expect(r.perTentacle["ollama-qwen2.5"]).toEqual({ usd: 0, tokens: 100, count: 1 });
    expect(r.truncatedTailLines).toBe(2);
  });
});

describe("buildCostAggregate — additional safety", () => {
  let fix: Fixture | null = null;
  afterEach(() => {
    if (fix) {
      fix.cleanup();
      fix = null;
    }
  });

  it("windowHours clamps to [1, 720]", () => {
    fix = mkFixture([]);
    const tooSmall = buildCostAggregate({ prismRoot: fix.root, now: new Date(), windowHours: 0 });
    expect(tooSmall.windowHours).toBe(1);
    const tooBig = buildCostAggregate({ prismRoot: fix.root, now: new Date(), windowHours: 100_000 });
    expect(tooBig.windowHours).toBe(720);
    const negative = buildCostAggregate({ prismRoot: fix.root, now: new Date(), windowHours: -5 });
    expect(negative.windowHours).toBe(1);
  });

  it("test-tentacle records excluded from perTentacle when default config", () => {
    const lines = [
      mkLine("2026-05-20T10:00:00.000Z", "__wiretest__seam", "wire_seam_probe", 50.0, 5, 5),
      mkLine("2026-05-20T11:00:00.000Z", "claude-sonnet-4", "deep_reasoning", 1.0, 100, 50),
    ];
    fix = mkFixture(lines);
    const r = buildCostAggregate({
      prismRoot: fix.root,
      now: new Date("2026-05-20T15:00:00.000Z"),
      windowHours: 24,
    });
    expect(r.perTentacle).not.toHaveProperty("__wiretest__seam");
    expect(r.perTentacle["claude-sonnet-4"]).toEqual({ usd: 1.0, tokens: 150, count: 1 });
    expect(r.daily?.totalUSD).toBeCloseTo(1.0, 5);
  });

  it("missing telemetry file → ok:true with zero totals (treated as empty)", () => {
    const root = fs.mkdtempSync(path.join(os.tmpdir(), "prism-cost-dash-"));
    fix = { root, cleanup: () => fs.rmSync(root, { recursive: true, force: true }) };
    const r = buildCostAggregate({ prismRoot: root, now: new Date(), windowHours: 24 });
    expect(r.ok).toBe(true);
    expect(r.daily?.totalUSD).toBe(0);
    expect(r.daily?.recordCount).toBe(0);
  });
});

describe("COST_DASHBOARD_HTML — content checks", () => {
  it("HTML contains the dashboard skeleton and same-origin aggregate fetch", () => {
    expect(COST_DASHBOARD_HTML).toContain("<!DOCTYPE html>");
    expect(COST_DASHBOARD_HTML).toContain("PRISM Cost Dashboard");
    expect(COST_DASHBOARD_HTML).toContain("./aggregate?windowHours=24");
    expect(COST_DASHBOARD_HTML).not.toMatch(/<script[^>]+src=/i);
    expect(COST_DASHBOARD_HTML).not.toMatch(/<link[^>]+rel=["']?stylesheet["']?[^>]+href=/i);
    expect(COST_DASHBOARD_HTML).not.toMatch(/\binnerHTML\s*=/);
  });

  it("HTML has the SVG hourly chart container", () => {
    expect(COST_DASHBOARD_HTML).toContain('id="hourlyChart"');
    expect(COST_DASHBOARD_HTML).toContain('viewBox="0 0 800 120"');
  });

  it("HTML wires the 4 stat slots", () => {
    expect(COST_DASHBOARD_HTML).toContain('id="dailyUsd"');
    expect(COST_DASHBOARD_HTML).toContain('id="weeklyUsd"');
    expect(COST_DASHBOARD_HTML).toContain('id="dailyTokens"');
    expect(COST_DASHBOARD_HTML).toContain('id="recordCount"');
  });

  it("type export shape carries the expected keys", () => {
    const sample: CostAggregateResponse = {
      ok: true,
      asOf: "2026-05-20T15:00:00.000Z",
      windowHours: 24,
      daily: null,
      weekly: null,
      perTentacle: {},
      hourlyUSD: [],
      truncatedTailLines: 0,
      source: "cost.aggregate",
    };
    expect(Object.keys(sample).sort()).toEqual([
      "asOf", "daily", "hourlyUSD", "ok", "perTentacle", "source", "truncatedTailLines", "weekly", "windowHours",
    ]);
  });
});

function mkLine(ts: string, tentacle: string, taskClass: string, costUSD: number, inTok: number, outTok: number): string {
  return JSON.stringify({
    schemaVersion: 1,
    ts,
    tentacle,
    taskClass,
    inputTokens: inTok,
    outputTokens: outTok,
    latencyMs: 100,
    costUSD,
    degraded: false,
  });
}
