/**
 * build-dispatcher-capacity.test.mjs — verification of CLEANUP-MS0 / U-CLEANUP-F7.
 *
 * Coverage floor:
 *   - happy path
 *   - >= 3 failure modes (missing AGGREGATE / malformed AGGREGATE / missing thresholds)
 *   - >= 2 adversarial inputs (NaN / Infinity / negative / oversize action counts)
 *   - >= 3 spanning variability configs (light / mixed / saturated cohorts;
 *     different ceiling sources: override / adaptive / default)
 *   - round-trip CLI invocation via main() that writes the real MD + JSON files
 *
 * Real reference values — no toBeDefined() / toBeUndefined() stubs.
 *
 * Spec: mcp-server/data/milestones/CLEANUP-MS0.json U-CLEANUP-F7.
 */

import { describe, it, expect, beforeEach, afterEach } from "vitest";
import {
  mkdtempSync,
  mkdirSync,
  writeFileSync,
  rmSync,
  existsSync,
  readFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

import {
  parseArgs,
  computeCapacityReport,
  renderMarkdown,
  main,
  _internals,
} from "../build-dispatcher-capacity.mjs";

const NOW = "2026-05-14T00:00:00.000Z";

// ──────────────────────────────────────────────────────────────────────
// Fixture helpers
// ──────────────────────────────────────────────────────────────────────

function makeRepo() {
  const root = mkdtempSync(join(tmpdir(), "dispatcher-capacity-"));
  mkdirSync(join(root, "state/shared"), { recursive: true });
  mkdirSync(join(root, "mcp-server/data/dispatcher-health"), { recursive: true });
  return root;
}

function writeAggregate(root, body) {
  writeFileSync(
    join(root, "mcp-server/data/dispatcher-health/AGGREGATE.json"),
    JSON.stringify(body),
    "utf-8",
  );
}

function writeThresholds(root, body) {
  writeFileSync(
    join(root, "state/shared/adaptive-thresholds.json"),
    JSON.stringify(body),
    "utf-8",
  );
}

function makeAggregate(rows, opts = {}) {
  return {
    timestamp: opts.timestamp ?? NOW,
    totalDispatchers: rows.length,
    totalActions: rows.reduce((acc, r) => acc + (Number.isFinite(r.actions) ? r.actions : 0), 0),
    healthyActions: 0,
    overallCoverage: { caseCoverage: 0.82, schemaCoverage: 0, testCoverage: 0, skillCoverage: 0 },
    dispatcherReports: rows.map((r) => ({
      name: r.name,
      actions: r.actions,
      healthy: 0,
      coverage: 0,
    })),
  };
}

const SPANNING_ROWS = [
  // critical (>= 200 at ceiling 200)
  { name: "aiReasoningDispatcher", actions: 470 },
  { name: "calcDispatcher", actions: 220 },
  // warn (>= 160 at ceiling 200)
  { name: "camDispatcher", actions: 180 },
  // ok (< 160)
  { name: "adaptiveControlDispatcher", actions: 12 },
  { name: "agentDispatcher", actions: 8 },
  { name: "atcsDispatcher", actions: 12 },
];

// ──────────────────────────────────────────────────────────────────────
// parseArgs
// ──────────────────────────────────────────────────────────────────────

describe("parseArgs", () => {
  it("defaults", () => {
    const a = parseArgs([]);
    expect(a.json).toBe(false);
    expect(a.help).toBe(false);
    expect(a.ceilingOverride).toBe(null);
    expect(a.frozenTime).toBe(null);
    expect(a.aggregatePath).toBe(null);
    expect(a.thresholdsPath).toBe(null);
    expect(a.outMd).toBe(null);
    expect(a.outJson).toBe(null);
  });

  it("--json + --frozen-time + --ceiling + path overrides", () => {
    const a = parseArgs([
      "--json",
      "--frozen-time", NOW,
      "--ceiling", "300",
      "--aggregate", "/a.json",
      "--thresholds", "/t.json",
      "--out-md", "/md",
      "--out-json", "/json",
    ]);
    expect(a.json).toBe(true);
    expect(a.frozenTime).toBe(NOW);
    expect(a.ceilingOverride).toBe(300);
    expect(a.aggregatePath).toBe("/a.json");
    expect(a.thresholdsPath).toBe("/t.json");
    expect(a.outMd).toBe("/md");
    expect(a.outJson).toBe("/json");
  });

  it("--help", () => {
    const a = parseArgs(["--help"]);
    expect(a.help).toBe(true);
  });

  it("-h alias", () => {
    const a = parseArgs(["-h"]);
    expect(a.help).toBe(true);
  });

  it("--ceiling rejects non-positive / non-finite values", () => {
    // non-numeric → no override
    expect(parseArgs(["--ceiling", "abc"]).ceilingOverride).toBe(null);
    // zero → no override (must be > 0)
    expect(parseArgs(["--ceiling", "0"]).ceilingOverride).toBe(null);
    // negative → no override
    expect(parseArgs(["--ceiling", "-5"]).ceilingOverride).toBe(null);
    // valid
    expect(parseArgs(["--ceiling", "150"]).ceilingOverride).toBe(150);
  });
});

// ──────────────────────────────────────────────────────────────────────
// computeCapacityReport — pure-function core
// ──────────────────────────────────────────────────────────────────────

describe("computeCapacityReport — happy path", () => {
  it("classifies rows into critical / warn / ok using adaptive ceiling 200", () => {
    const aggregate = makeAggregate(SPANNING_ROWS);
    const thresholds = { values: { dispatcher_capacity_ceiling: 200 } };
    const r = computeCapacityReport({
      aggregate,
      thresholds,
      ceilingOverride: null,
      nowIso: NOW,
      aggregateMtimeIso: NOW,
    });

    expect(r.schemaVersion).toBe(1);
    expect(r.ceiling).toBe(200);
    expect(r.ceilingSource).toBe("adaptive");
    expect(r.totals.dispatchers).toBe(6);
    expect(r.totals.actions).toBe(470 + 220 + 180 + 12 + 8 + 12);
    expect(r.counts.critical).toBe(2); // aiReasoning + calc
    expect(r.counts.warn).toBe(1); // cam
    expect(r.counts.ok).toBe(3); // adaptiveControl, agent, atcs

    // Sorted descending by ratio — aiReasoning first
    expect(r.rows[0].name).toBe("aiReasoningDispatcher");
    expect(r.rows[0].ratio).toBe(2.35);
    expect(r.rows[0].status).toBe("critical");

    // calc next
    expect(r.rows[1].name).toBe("calcDispatcher");
    expect(r.rows[1].ratio).toBe(1.1);

    // Max ratio matches top row
    expect(r.stats.maxRatio).toBe(2.35);

    // No staleness
    expect(r.sourceStale).toBe(false);
    expect(r.sourceAgeDays).toBe(0);
  });

  it("flagged includes only warn + critical (sorted desc by ratio)", () => {
    const aggregate = makeAggregate(SPANNING_ROWS);
    const r = computeCapacityReport({
      aggregate,
      thresholds: { values: { dispatcher_capacity_ceiling: 200 } },
      ceilingOverride: null,
      nowIso: NOW,
      aggregateMtimeIso: NOW,
    });
    expect(r.flagged.length).toBe(3);
    expect(r.flagged.map((x) => x.name)).toEqual([
      "aiReasoningDispatcher",
      "calcDispatcher",
      "camDispatcher",
    ]);
  });

  it("top10 limited to first 10 entries even when N>10", () => {
    const many = [];
    for (let i = 0; i < 25; i++) many.push({ name: `d${String(i).padStart(2, "0")}`, actions: 250 - i });
    const r = computeCapacityReport({
      aggregate: makeAggregate(many),
      thresholds: null,
      ceilingOverride: null,
      nowIso: NOW,
      aggregateMtimeIso: NOW,
    });
    expect(r.top10.length).toBe(10);
    expect(r.top10[0].name).toBe("d00"); // 250 actions = highest ratio
    expect(r.top10[9].name).toBe("d09");
  });

  it("stable sort: equal-ratio rows fall back to name ascending", () => {
    const tie = [
      { name: "zenDispatcher", actions: 100 },
      { name: "alphaDispatcher", actions: 100 },
      { name: "midDispatcher", actions: 100 },
    ];
    const r = computeCapacityReport({
      aggregate: makeAggregate(tie),
      thresholds: { values: { dispatcher_capacity_ceiling: 200 } },
      ceilingOverride: null,
      nowIso: NOW,
      aggregateMtimeIso: NOW,
    });
    expect(r.rows.map((x) => x.name)).toEqual([
      "alphaDispatcher",
      "midDispatcher",
      "zenDispatcher",
    ]);
  });
});

describe("computeCapacityReport — ceiling source resolution (3 spanning configs)", () => {
  const aggregate = makeAggregate([{ name: "d1", actions: 100 }]);

  it("override > adaptive > default", () => {
    // override wins
    const a = computeCapacityReport({
      aggregate,
      thresholds: { values: { dispatcher_capacity_ceiling: 500 } },
      ceilingOverride: 100,
      nowIso: NOW,
      aggregateMtimeIso: NOW,
    });
    expect(a.ceiling).toBe(100);
    expect(a.ceilingSource).toBe("override");
    expect(a.rows[0].ratio).toBe(1);
    expect(a.rows[0].status).toBe("critical");
  });

  it("adaptive when no override + thresholds present", () => {
    const a = computeCapacityReport({
      aggregate,
      thresholds: { values: { dispatcher_capacity_ceiling: 500 } },
      ceilingOverride: null,
      nowIso: NOW,
      aggregateMtimeIso: NOW,
    });
    expect(a.ceiling).toBe(500);
    expect(a.ceilingSource).toBe("adaptive");
    expect(a.rows[0].ratio).toBe(0.2);
    expect(a.rows[0].status).toBe("ok");
  });

  it("default + note when thresholds missing/null", () => {
    const a = computeCapacityReport({
      aggregate,
      thresholds: null,
      ceilingOverride: null,
      nowIso: NOW,
      aggregateMtimeIso: NOW,
    });
    expect(a.ceiling).toBe(_internals.DEFAULT_CEILING);
    expect(a.ceilingSource).toBe("default");
    expect(a.notes.some((n) => n.includes("not found"))).toBe(true);
  });

  it("default when thresholds.values present but ceiling missing/<=0/non-finite", () => {
    // missing key
    expect(
      computeCapacityReport({
        aggregate,
        thresholds: { values: {} },
        ceilingOverride: null,
        nowIso: NOW,
        aggregateMtimeIso: NOW,
      }).ceilingSource,
    ).toBe("default");
    // zero
    expect(
      computeCapacityReport({
        aggregate,
        thresholds: { values: { dispatcher_capacity_ceiling: 0 } },
        ceilingOverride: null,
        nowIso: NOW,
        aggregateMtimeIso: NOW,
      }).ceilingSource,
    ).toBe("default");
    // non-finite
    expect(
      computeCapacityReport({
        aggregate,
        thresholds: { values: { dispatcher_capacity_ceiling: "high" } },
        ceilingOverride: null,
        nowIso: NOW,
        aggregateMtimeIso: NOW,
      }).ceilingSource,
    ).toBe("default");
  });
});

describe("computeCapacityReport — failure modes", () => {
  it("missing dispatcherReports → empty rows + note", () => {
    const r = computeCapacityReport({
      aggregate: { timestamp: NOW },
      thresholds: { values: { dispatcher_capacity_ceiling: 200 } },
      ceilingOverride: null,
      nowIso: NOW,
      aggregateMtimeIso: NOW,
    });
    expect(r.totals.dispatchers).toBe(0);
    expect(r.totals.actions).toBe(0);
    expect(r.rows).toEqual([]);
    expect(r.notes.some((n) => n.includes("dispatcherReports"))).toBe(true);
    // Stats degrade gracefully to 0.
    expect(r.stats.meanRatio).toBe(0);
    expect(r.stats.maxRatio).toBe(0);
    expect(r.stats.p95Ratio).toBe(0);
  });

  it("malformed entries (no name) are silently dropped", () => {
    const aggregate = {
      timestamp: NOW,
      dispatcherReports: [
        { name: "good", actions: 50 },
        { actions: 1000 }, // no name → drop
        null, // null → drop
        { name: 123, actions: 50 }, // non-string name → drop
        { name: "good2", actions: 100 },
      ],
    };
    const r = computeCapacityReport({
      aggregate,
      thresholds: { values: { dispatcher_capacity_ceiling: 200 } },
      ceilingOverride: null,
      nowIso: NOW,
      aggregateMtimeIso: NOW,
    });
    expect(r.rows.length).toBe(2);
    expect(r.rows.map((x) => x.name).sort()).toEqual(["good", "good2"]);
  });

  it("flags STALE source when AGGREGATE timestamp > 7 days old", () => {
    const oldTs = "2026-01-01T00:00:00.000Z"; // ~4 months before NOW
    const aggregate = { timestamp: oldTs, dispatcherReports: [{ name: "d", actions: 1 }] };
    const r = computeCapacityReport({
      aggregate,
      thresholds: { values: { dispatcher_capacity_ceiling: 200 } },
      ceilingOverride: null,
      nowIso: NOW,
      aggregateMtimeIso: oldTs,
    });
    expect(r.sourceStale).toBe(true);
    expect(r.sourceAgeDays).toBeGreaterThan(_internals.STALE_DAYS);
    expect(r.notes.some((n) => n.includes("STALE") || n.includes("stale"))).toBe(true);
  });
});

describe("computeCapacityReport — adversarial inputs", () => {
  it("NaN / Infinity / negative action counts coerce to 0", () => {
    const aggregate = {
      timestamp: NOW,
      dispatcherReports: [
        { name: "a", actions: NaN },
        { name: "b", actions: Infinity },
        { name: "c", actions: -50 },
        { name: "d", actions: null },
        { name: "e", actions: "300" }, // string is non-finite -> coerced to 0
      ],
    };
    const r = computeCapacityReport({
      aggregate,
      thresholds: { values: { dispatcher_capacity_ceiling: 200 } },
      ceilingOverride: null,
      nowIso: NOW,
      aggregateMtimeIso: NOW,
    });
    // All 5 coerced to 0 actions, all classed as ok
    expect(r.totals.actions).toBe(0);
    expect(r.counts.ok).toBe(5);
    expect(r.counts.warn).toBe(0);
    expect(r.counts.critical).toBe(0);
  });

  it("oversize counts produce critical status with proportional ratio", () => {
    const aggregate = makeAggregate([{ name: "d", actions: 100000 }]);
    const r = computeCapacityReport({
      aggregate,
      thresholds: { values: { dispatcher_capacity_ceiling: 200 } },
      ceilingOverride: null,
      nowIso: NOW,
      aggregateMtimeIso: NOW,
    });
    expect(r.rows[0].ratio).toBe(500); // 100000 / 200
    expect(r.rows[0].status).toBe("critical");
    expect(r.stats.maxRatio).toBe(500);
  });

  it("non-numeric ceiling override is ignored (parseArgs rejects)", () => {
    // CLI-level guard
    expect(parseArgs(["--ceiling", "Infinity"]).ceilingOverride).toBe(null);
    expect(parseArgs(["--ceiling", "NaN"]).ceilingOverride).toBe(null);
  });

  it("empty aggregate (no dispatchers) produces a valid empty report", () => {
    const r = computeCapacityReport({
      aggregate: { timestamp: NOW, dispatcherReports: [] },
      thresholds: null,
      ceilingOverride: null,
      nowIso: NOW,
      aggregateMtimeIso: NOW,
    });
    expect(r.totals.dispatchers).toBe(0);
    expect(r.flagged).toEqual([]);
    expect(r.top10).toEqual([]);
  });
});

describe("computeCapacityReport — variability axes", () => {
  // VARIABILITY: cohort 1 of 3 — all green
  it("light cohort (all under 80%)", () => {
    const rows = Array.from({ length: 5 }, (_, i) => ({ name: `d${i}`, actions: 50 + i * 5 }));
    const r = computeCapacityReport({
      aggregate: makeAggregate(rows),
      thresholds: { values: { dispatcher_capacity_ceiling: 200 } },
      ceilingOverride: null,
      nowIso: NOW,
      aggregateMtimeIso: NOW,
    });
    expect(r.counts.critical).toBe(0);
    expect(r.counts.warn).toBe(0);
    expect(r.counts.ok).toBe(5);
  });

  // VARIABILITY: cohort 2 of 3 — mixed
  it("mixed cohort (each status non-empty)", () => {
    const r = computeCapacityReport({
      aggregate: makeAggregate(SPANNING_ROWS),
      thresholds: { values: { dispatcher_capacity_ceiling: 200 } },
      ceilingOverride: null,
      nowIso: NOW,
      aggregateMtimeIso: NOW,
    });
    expect(r.counts.critical).toBeGreaterThan(0);
    expect(r.counts.warn).toBeGreaterThan(0);
    expect(r.counts.ok).toBeGreaterThan(0);
  });

  // VARIABILITY: cohort 3 of 3 — all critical (saturated)
  it("saturated cohort (all critical)", () => {
    const rows = Array.from({ length: 4 }, (_, i) => ({ name: `d${i}`, actions: 500 + i * 10 }));
    const r = computeCapacityReport({
      aggregate: makeAggregate(rows),
      thresholds: { values: { dispatcher_capacity_ceiling: 200 } },
      ceilingOverride: null,
      nowIso: NOW,
      aggregateMtimeIso: NOW,
    });
    expect(r.counts.critical).toBe(4);
    expect(r.counts.warn).toBe(0);
    expect(r.counts.ok).toBe(0);
  });
});

// ──────────────────────────────────────────────────────────────────────
// renderMarkdown
// ──────────────────────────────────────────────────────────────────────

describe("renderMarkdown", () => {
  it("includes status counts, top10, flagged section, and source line", () => {
    const aggregate = makeAggregate(SPANNING_ROWS);
    const r = computeCapacityReport({
      aggregate,
      thresholds: { values: { dispatcher_capacity_ceiling: 200 } },
      ceilingOverride: null,
      nowIso: NOW,
      aggregateMtimeIso: NOW,
    });
    const md = renderMarkdown(r);
    expect(md).toContain("# Dispatcher Capacity Audit");
    expect(md).toContain("Ceiling: 200 actions/dispatcher (source: adaptive)");
    expect(md).toContain("critical (≥100%)");
    expect(md).toContain("aiReasoningDispatcher");
    expect(md).toContain("Top 10 by ratio");
    expect(md).toContain("CLEANUP-MS0 / U-CLEANUP-F7");
  });

  it("empty rows path renders 'no dispatcher rows'", () => {
    const r = computeCapacityReport({
      aggregate: { timestamp: NOW, dispatcherReports: [] },
      thresholds: { values: { dispatcher_capacity_ceiling: 200 } },
      ceilingOverride: null,
      nowIso: NOW,
      aggregateMtimeIso: NOW,
    });
    const md = renderMarkdown(r);
    expect(md).toContain("no dispatcher rows");
  });

  it("no-flagged path renders 'all dispatchers below 80% capacity'", () => {
    const rows = [{ name: "d", actions: 10 }];
    const r = computeCapacityReport({
      aggregate: makeAggregate(rows),
      thresholds: { values: { dispatcher_capacity_ceiling: 200 } },
      ceilingOverride: null,
      nowIso: NOW,
      aggregateMtimeIso: NOW,
    });
    const md = renderMarkdown(r);
    expect(md).toContain("all dispatchers below 80% capacity");
  });
});

// ──────────────────────────────────────────────────────────────────────
// main — round-trip CLI: real file I/O happens here
// ──────────────────────────────────────────────────────────────────────

describe("main (round-trip)", () => {
  let root;
  let logs;
  let errs;

  beforeEach(() => {
    root = makeRepo();
    logs = [];
    errs = [];
  });
  afterEach(() => {
    rmSync(root, { recursive: true, force: true, maxRetries: 5, retryDelay: 100 });
  });

  it("writes MD + JSON outputs with computed report", async () => {
    writeAggregate(root, makeAggregate(SPANNING_ROWS));
    writeThresholds(root, { values: { dispatcher_capacity_ceiling: 200 } });

    const res = await main({
      argv: ["--frozen-time", NOW],
      repo: root,
      out: (...a) => logs.push(a.join(" ")),
      err: (...a) => errs.push(a.join(" ")),
    });

    expect(res.exitCode).toBe(0);
    const md = readFileSync(join(root, "state/shared/DISPATCHER_CAPACITY.md"), "utf-8");
    const js = JSON.parse(
      readFileSync(join(root, "state/shared/DISPATCHER_CAPACITY.json"), "utf-8"),
    );
    expect(md).toContain("aiReasoningDispatcher");
    expect(js.schemaVersion).toBe(1);
    expect(js.generatedAt).toBe(NOW);
    expect(js.ceiling).toBe(200);
    expect(js.counts.critical).toBe(2);
    expect(js.counts.warn).toBe(1);
    expect(js.counts.ok).toBe(3);
    // stdout summary line
    expect(logs.join("\n")).toMatch(/F7.*capacity report/);
  });

  it("--json writes nothing and emits JSON to stdout sink", async () => {
    writeAggregate(root, makeAggregate(SPANNING_ROWS));
    writeThresholds(root, { values: { dispatcher_capacity_ceiling: 200 } });

    const res = await main({
      argv: ["--json", "--frozen-time", NOW],
      repo: root,
      out: (...a) => logs.push(a.join(" ")),
      err: (...a) => errs.push(a.join(" ")),
    });

    expect(res.exitCode).toBe(0);
    // Outputs not written
    expect(existsSync(join(root, "state/shared/DISPATCHER_CAPACITY.md"))).toBe(false);
    expect(existsSync(join(root, "state/shared/DISPATCHER_CAPACITY.json"))).toBe(false);
    // stdout has parseable JSON
    const parsed = JSON.parse(logs.join("\n"));
    expect(parsed.schemaVersion).toBe(1);
    expect(parsed.totals.dispatchers).toBe(6);
  });

  it("--help short-circuits with exit 0 and no writes", async () => {
    writeAggregate(root, makeAggregate(SPANNING_ROWS));
    const res = await main({
      argv: ["--help"],
      repo: root,
      out: (...a) => logs.push(a.join(" ")),
      err: (...a) => errs.push(a.join(" ")),
    });
    expect(res.exitCode).toBe(0);
    expect(logs.join("\n")).toContain("Dispatcher capacity audit");
    expect(existsSync(join(root, "state/shared/DISPATCHER_CAPACITY.md"))).toBe(false);
  });

  it("returns exitCode 1 when AGGREGATE is missing (fatal)", async () => {
    // No AGGREGATE written.
    const res = await main({
      argv: ["--frozen-time", NOW],
      repo: root,
      out: (...a) => logs.push(a.join(" ")),
      err: (...a) => errs.push(a.join(" ")),
    });
    expect(res.exitCode).toBe(1);
    expect(errs.join("\n")).toMatch(/FATAL.*AGGREGATE/);
  });

  it("missing adaptive-thresholds does NOT fail — falls back to default + note", async () => {
    writeAggregate(root, makeAggregate(SPANNING_ROWS));
    // no thresholds written
    const res = await main({
      argv: ["--frozen-time", NOW],
      repo: root,
      out: (...a) => logs.push(a.join(" ")),
      err: (...a) => errs.push(a.join(" ")),
    });
    expect(res.exitCode).toBe(0);
    const js = JSON.parse(
      readFileSync(join(root, "state/shared/DISPATCHER_CAPACITY.json"), "utf-8"),
    );
    expect(js.ceilingSource).toBe("default");
    expect(js.ceiling).toBe(_internals.DEFAULT_CEILING);
    expect(js.notes.some((n) => n.includes("not found"))).toBe(true);
  });

  it("malformed AGGREGATE JSON returns exitCode 1", async () => {
    writeFileSync(
      join(root, "mcp-server/data/dispatcher-health/AGGREGATE.json"),
      "{not-json",
      "utf-8",
    );
    const res = await main({
      argv: ["--frozen-time", NOW],
      repo: root,
      out: (...a) => logs.push(a.join(" ")),
      err: (...a) => errs.push(a.join(" ")),
    });
    expect(res.exitCode).toBe(1);
    expect(errs.join("\n")).toMatch(/FATAL/);
  });

  it("--ceiling override propagates to written JSON report", async () => {
    writeAggregate(root, makeAggregate([{ name: "d", actions: 100 }]));
    writeThresholds(root, { values: { dispatcher_capacity_ceiling: 500 } });
    const res = await main({
      argv: ["--frozen-time", NOW, "--ceiling", "100"],
      repo: root,
      out: (...a) => logs.push(a.join(" ")),
      err: (...a) => errs.push(a.join(" ")),
    });
    expect(res.exitCode).toBe(0);
    const js = JSON.parse(
      readFileSync(join(root, "state/shared/DISPATCHER_CAPACITY.json"), "utf-8"),
    );
    expect(js.ceiling).toBe(100);
    expect(js.ceilingSource).toBe("override");
    expect(js.rows[0].ratio).toBe(1);
    expect(js.rows[0].status).toBe("critical");
  });

  it("re-running with same inputs is idempotent (file content stable byte-for-byte)", async () => {
    writeAggregate(root, makeAggregate(SPANNING_ROWS));
    writeThresholds(root, { values: { dispatcher_capacity_ceiling: 200 } });

    const first = await main({
      argv: ["--frozen-time", NOW],
      repo: root,
      out: () => {},
      err: () => {},
    });
    const md1 = readFileSync(join(root, "state/shared/DISPATCHER_CAPACITY.md"), "utf-8");
    const js1 = readFileSync(join(root, "state/shared/DISPATCHER_CAPACITY.json"), "utf-8");

    const second = await main({
      argv: ["--frozen-time", NOW],
      repo: root,
      out: () => {},
      err: () => {},
    });
    const md2 = readFileSync(join(root, "state/shared/DISPATCHER_CAPACITY.md"), "utf-8");
    const js2 = readFileSync(join(root, "state/shared/DISPATCHER_CAPACITY.json"), "utf-8");

    expect(first.exitCode).toBe(0);
    expect(second.exitCode).toBe(0);
    expect(md1).toBe(md2);
    expect(js1).toBe(js2);
  });
});
