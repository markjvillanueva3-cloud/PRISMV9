/**
 * dispatcher.pipelineMetrics.test.ts — round-trip coverage for
 * WIRE-UNWIRED-MS0/U-WIRE-PME dispatcher wiring (PipelineMetricsEngine).
 *
 * Drives all 3 pure methods through real `prism_dev`. Engine docstring
 * guarantees pure (caller supplies filesystem state, engine does no I/O).
 */

import { describe, it, expect, beforeAll } from "vitest";
import { registerDevDispatcher } from "../tools/dispatchers/devDispatcher.js";
import { ACTION_DEV_SCHEMAS } from "../schemas/devActionSchemas.js";
import { pipelineMetricsEngine } from "../engines/PipelineMetricsEngine.js";

interface CapturedTool {
  name: string;
  handler: (args: { action: string; params?: Record<string, unknown> }) => Promise<unknown>;
}

function makeStubServer(): {
  tools: CapturedTool[];
  tool: (name: string, desc: string, schema: unknown, h: CapturedTool["handler"]) => void;
} {
  const tools: CapturedTool[] = [];
  return {
    tools,
    tool(name, _desc, _schema, handler) { tools.push({ name, handler }); },
  };
}

async function invokeHandler(
  handler: CapturedTool["handler"],
  action: string,
  params: Record<string, unknown> = {},
): Promise<Record<string, unknown>> {
  const res = (await handler({ action, params })) as Record<string, unknown>;
  if (Array.isArray((res as { content?: unknown[] }).content)) {
    const text = ((res as { content: Array<{ text?: string }> }).content[0]?.text) ?? "";
    return JSON.parse(text) as Record<string, unknown>;
  }
  return res;
}

const SAMPLE_SURVIVAL = [
  { path: "/a.md", bytes: 1000, mtimeMs: 1_700_000_000_000 },
  { path: "/b.md", bytes: 2000, mtimeMs: 1_700_000_005_000 },
  { path: "/c.md", bytes: 3000, mtimeMs: 1_700_000_010_000 },
];

const SAMPLE_HANDOFFS = [
  { path: "/h1.md", mtimeMs: 1_700_000_000_000 },
  { path: "/h2.md", mtimeMs: 1_700_000_005_000 },
  { path: "/h3.md", mtimeMs: 1_700_000_015_000 },
];

const SAMPLE_LINKS = [
  { stage: "init", empty: false },
  { stage: "compact", empty: true },
  { stage: "snapshot", empty: false },
  { stage: "publish", empty: true },
];

let devHandler: CapturedTool["handler"];

beforeAll(() => {
  const srv = makeStubServer();
  registerDevDispatcher(srv as unknown as Parameters<typeof registerDevDispatcher>[0]);
  const t = srv.tools.find((x) => x.name === "prism_dev");
  if (!t) throw new Error("prism_dev not registered");
  devHandler = t.handler;
});

describe("WIRE-UNWIRED-MS0/U-WIRE-PME — Zod schemas", () => {
  it("pme_collect accepts {} (all arrays default to [])", () => {
    expect(ACTION_DEV_SCHEMAS["pme_collect"].safeParse({}).success).toBe(true);
  });

  it("pme_collect rejects survivalFiles entry missing bytes", () => {
    expect(ACTION_DEV_SCHEMAS["pme_collect"].safeParse({
      survivalFiles: [{ path: "/x", mtimeMs: 0 }],
    }).success).toBe(false);
  });

  it("pme_collect caps arrays at 10_000 (DoS guard)", () => {
    const big = Array.from({ length: 10_001 }, (_, i) => ({
      path: `/p${i}`, bytes: 1, mtimeMs: 0,
    }));
    expect(ACTION_DEV_SCHEMAS["pme_collect"].safeParse({ survivalFiles: big }).success).toBe(false);
  });

  it("pme_collect rejects bytes > 1 GB cap", () => {
    expect(ACTION_DEV_SCHEMAS["pme_collect"].safeParse({
      survivalFiles: [{ path: "/x", bytes: 1_000_000_001, mtimeMs: 0 }],
    }).success).toBe(false);
  });

  it("pme_compute_survival_bytes accepts {} (files defaults to [])", () => {
    expect(ACTION_DEV_SCHEMAS["pme_compute_survival_bytes"].safeParse({}).success).toBe(true);
  });

  it("pme_compute_handoff_roundtrip accepts {} (files defaults to [])", () => {
    expect(ACTION_DEV_SCHEMAS["pme_compute_handoff_roundtrip"].safeParse({}).success).toBe(true);
  });
});

describe("WIRE-UNWIRED-MS0/U-WIRE-PME — prism_dev :: pme_compute_survival_bytes", () => {
  it("empty input → all-zero stats", async () => {
    const r = await invokeHandler(devHandler, "pme_compute_survival_bytes", { files: [] });
    const s = (r as { stats: { count: number; total: number; max: number; min: number; avg: number } }).stats;
    expect(s.count).toBe(0);
    expect(s.total).toBe(0);
    expect(s.max).toBe(0);
    expect(s.min).toBe(0);
    expect(s.avg).toBe(0);
  });

  it("3-file sample: total=6000, max=3000, min=1000, avg=2000", async () => {
    const r = await invokeHandler(devHandler, "pme_compute_survival_bytes", { files: SAMPLE_SURVIVAL });
    const s = (r as { stats: { count: number; total: number; max: number; min: number; avg: number } }).stats;
    expect(s.count).toBe(3);
    expect(s.total).toBe(6000);
    expect(s.max).toBe(3000);
    expect(s.min).toBe(1000);
    expect(s.avg).toBe(2000);
  });

  it("ROUTING PROOF — wire stats byte-equals engine-direct computeSurvivalBytes()", async () => {
    const r = await invokeHandler(devHandler, "pme_compute_survival_bytes", { files: SAMPLE_SURVIVAL });
    const wire = (r as { stats: unknown }).stats;
    const direct = pipelineMetricsEngine.computeSurvivalBytes(SAMPLE_SURVIVAL);
    expect(JSON.stringify(wire)).toBe(JSON.stringify(direct));
  });
});

describe("WIRE-UNWIRED-MS0/U-WIRE-PME — prism_dev :: pme_compute_handoff_roundtrip", () => {
  it("≤1 file → 0 ms", async () => {
    const r1 = await invokeHandler(devHandler, "pme_compute_handoff_roundtrip", { files: [] });
    expect((r1 as { roundtripMs?: number }).roundtripMs).toBe(0);
    const r2 = await invokeHandler(devHandler, "pme_compute_handoff_roundtrip", { files: [{ path: "/h", mtimeMs: 100 }] });
    expect((r2 as { roundtripMs?: number }).roundtripMs).toBe(0);
  });

  it("3-handoff sample: freshest(15000) − oldest(0) = 15000 ms", async () => {
    const r = await invokeHandler(devHandler, "pme_compute_handoff_roundtrip", { files: SAMPLE_HANDOFFS });
    // freshest 1_700_000_015_000 − oldest 1_700_000_000_000 = 15_000
    expect((r as { roundtripMs?: number }).roundtripMs).toBe(15_000);
  });

  it("ROUTING PROOF — wire roundtripMs equals engine-direct computeHandoffRoundtrip()", async () => {
    const r = await invokeHandler(devHandler, "pme_compute_handoff_roundtrip", { files: SAMPLE_HANDOFFS });
    const wire = (r as { roundtripMs?: number }).roundtripMs;
    const direct = pipelineMetricsEngine.computeHandoffRoundtrip(SAMPLE_HANDOFFS);
    expect(wire).toBe(direct);
  });
});

describe("WIRE-UNWIRED-MS0/U-WIRE-PME — prism_dev :: pme_collect", () => {
  it("returns full snapshot with all 8 fields", async () => {
    const r = await invokeHandler(devHandler, "pme_collect", {
      survivalFiles: SAMPLE_SURVIVAL,
      handoffFiles: SAMPLE_HANDOFFS,
      integrityLinks: SAMPLE_LINKS,
      capturedAt: "2026-05-17T00:00:00Z",
    });
    const s = (r as { snapshot: {
      schemaVersion: number; capturedAt: string; compactionCount: number;
      survivalBytes: { count: number }; handoffRoundtripMs: number;
      handoffCount: number; emptyFileRate: number; emptyLinkCount: number; totalLinkCount: number;
    } }).snapshot;
    expect(s.schemaVersion).toBe(1);
    expect(s.capturedAt).toBe("2026-05-17T00:00:00Z");
    expect(s.compactionCount).toBe(3);
    expect(s.survivalBytes.count).toBe(3);
    expect(s.handoffRoundtripMs).toBe(15_000);
    expect(s.handoffCount).toBe(3);
    expect(s.totalLinkCount).toBe(4);
    expect(s.emptyLinkCount).toBe(2);
    expect(s.emptyFileRate).toBeCloseTo(0.5, 4);
  });

  it("emptyFileRate is rounded to 4 decimal places (engine invariant)", async () => {
    const r = await invokeHandler(devHandler, "pme_collect", {
      integrityLinks: [
        { stage: "a", empty: true },
        { stage: "b", empty: true },
        { stage: "c", empty: false },
      ],
    });
    // 2/3 ≈ 0.6667
    const s = (r as { snapshot: { emptyFileRate: number } }).snapshot;
    expect(s.emptyFileRate).toBe(0.6667);
  });

  it("VARIABILITY — distinct emptyFileRate values across 3 link configs", async () => {
    const cfgs = [
      { integrityLinks: [] }, // 0
      { integrityLinks: [{ stage: "a", empty: true }, { stage: "b", empty: false }] }, // 0.5
      { integrityLinks: [{ stage: "a", empty: true }, { stage: "b", empty: true }] }, // 1.0
    ];
    const rates: number[] = [];
    for (const c of cfgs) {
      const r = await invokeHandler(devHandler, "pme_collect", c);
      rates.push((r as { snapshot: { emptyFileRate: number } }).snapshot.emptyFileRate);
    }
    expect(rates[0]).toBe(0);
    expect(rates[1]).toBe(0.5);
    expect(rates[2]).toBe(1);
    expect(new Set(rates).size).toBe(3);
  });

  it("empty-input default: all arrays absent → all-zero metrics + non-empty capturedAt", async () => {
    const r = await invokeHandler(devHandler, "pme_collect", {});
    const s = (r as { snapshot: {
      compactionCount: number; handoffCount: number; totalLinkCount: number;
      emptyLinkCount: number; emptyFileRate: number; capturedAt: string;
    } }).snapshot;
    expect(s.compactionCount).toBe(0);
    expect(s.handoffCount).toBe(0);
    expect(s.totalLinkCount).toBe(0);
    expect(s.emptyLinkCount).toBe(0);
    expect(s.emptyFileRate).toBe(0);
    expect(typeof s.capturedAt).toBe("string");
    expect(s.capturedAt.length).toBeGreaterThan(0);
  });

  it("ROUTING PROOF — wire snapshot byte-equals engine-direct collect() with frozen capturedAt", async () => {
    const input = {
      survivalFiles: SAMPLE_SURVIVAL,
      handoffFiles: SAMPLE_HANDOFFS,
      integrityLinks: SAMPLE_LINKS,
      capturedAt: "2026-05-17T12:00:00Z",
    };
    const r = await invokeHandler(devHandler, "pme_collect", input);
    const wire = (r as { snapshot: unknown }).snapshot;
    const direct = pipelineMetricsEngine.collect(input);
    expect(JSON.stringify(wire)).toBe(JSON.stringify(direct));
  });
});

describe("WIRE-UNWIRED-MS0/U-WIRE-PME — error envelope", () => {
  it("pme_collect with malformed survivalFiles entry → schema rejects", async () => {
    const r = await invokeHandler(devHandler, "pme_collect", {
      survivalFiles: [{ path: "/x" }], // missing bytes + mtimeMs
    });
    expect(((r as { error?: string }).error ?? "").length).toBeGreaterThan(0);
  });

  it("pme_collect with bytes > 1 GB cap → schema rejects", async () => {
    const r = await invokeHandler(devHandler, "pme_collect", {
      survivalFiles: [{ path: "/x", bytes: 2_000_000_000, mtimeMs: 0 }],
    });
    expect(((r as { error?: string }).error ?? "").length).toBeGreaterThan(0);
  });
});
