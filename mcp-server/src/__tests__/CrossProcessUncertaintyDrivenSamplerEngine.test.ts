/**
 * CrossProcessUncertaintyDrivenSamplerEngine — T11-01 tests.
 * Active learning via k-NN variance ranking.
 */

import { describe, it, expect } from "vitest";
import {
  CrossProcessUncertaintyDrivenSamplerEngine as Sampler,
  crossProcessUncertaintyDrivenSampler,
  type PendingJob,
  type HistoricalEvent,
} from "../engines/CrossProcessUncertaintyDrivenSamplerEngine.js";

const HIST_BASE: HistoricalEvent[] = [
  { material_iso: "P", sf: 100, fz: 0.05, process: "mill", outcome: 0.8 },
  { material_iso: "P", sf: 110, fz: 0.06, process: "mill", outcome: 0.85 },
  { material_iso: "P", sf: 105, fz: 0.05, process: "mill", outcome: 0.82 },
  { material_iso: "S", sf: 60, fz: 0.03, process: "mill", outcome: 0.4 },
  { material_iso: "S", sf: 65, fz: 0.04, process: "mill", outcome: 0.6 },
  { material_iso: "S", sf: 70, fz: 0.03, process: "mill", outcome: 0.2 },
  { material_iso: "K", sf: 200, fz: 0.1, process: "lathe", outcome: 0.5 },
  { material_iso: "N", sf: 400, fz: 0.15, process: "mill", outcome: 0.95 },
];

describe("select — k-NN variance ranking", () => {
  it("returns ranked array sorted descending by variance", () => {
    const r = Sampler.select({
      pending: [{ job_id: "j1", material_iso: "S", sf: 65, fz: 0.035, process: "mill" }],
      history: HIST_BASE,
    });
    expect(r.ranked.length).toBe(1);
    expect(r.ranked[0].variance).toBeGreaterThan(0);
  });

  it("orders multiple pending by variance descending", () => {
    const pending: PendingJob[] = [
      { job_id: "low_var", material_iso: "P", sf: 105, fz: 0.05, process: "mill" },  // P region is uniform
      { job_id: "high_var", material_iso: "S", sf: 65, fz: 0.035, process: "mill" }, // S region varies (0.2-0.6)
    ];
    const r = Sampler.select({ pending, history: HIST_BASE });
    expect(r.ranked[0].job_id).toBe("high_var");
    expect(r.ranked[1].job_id).toBe("low_var");
  });

  it("top_picks slices to top_n entries", () => {
    const pending: PendingJob[] = [
      { job_id: "a", material_iso: "P", sf: 100, fz: 0.05, process: "mill" },
      { job_id: "b", material_iso: "S", sf: 65, fz: 0.04, process: "mill" },
      { job_id: "c", material_iso: "K", sf: 200, fz: 0.1, process: "lathe" },
    ];
    const r = Sampler.select({ pending, history: HIST_BASE, top_n: 2 });
    expect(r.top_picks.length).toBe(2);
  });

  it("k_used is capped by history size when k > |history|", () => {
    const r = Sampler.select({
      pending: [{ job_id: "j1", material_iso: "P", sf: 100, fz: 0.05, process: "mill" }],
      history: HIST_BASE.slice(0, 3),
      k: 10,  // request more than available
    });
    expect(r.ranked[0].k_used).toBe(3);
  });

  it("mean_outcome reflects k-NN average outcome", () => {
    const r = Sampler.select({
      pending: [{ job_id: "j1", material_iso: "P", sf: 100, fz: 0.05, process: "mill" }],
      history: HIST_BASE,
      k: 3,
    });
    const r0 = r.ranked[0];
    expect(r0.mean_outcome).toBeGreaterThan(0.7);  // P-region neighbors are 0.8-0.85
    expect(r0.mean_outcome).toBeLessThan(0.9);
  });

  it("rationale tier reflects variance magnitude", () => {
    const high = Sampler.select({
      pending: [{ job_id: "j1", material_iso: "S", sf: 65, fz: 0.035, process: "mill" }],
      history: HIST_BASE,
    });
    const r = high.ranked[0];
    if (r.variance > 0.5) expect(r.rationale).toMatch(/High variance/);
    else if (r.variance > 0.1) expect(r.rationale).toMatch(/Moderate variance/);
    else expect(r.rationale).toMatch(/Low variance/);
  });

  it("rejects empty pending (Zod min(1))", () => {
    expect(() => Sampler.select({ pending: [], history: HIST_BASE })).toThrow();
  });

  it("rejects empty history (Zod min(1))", () => {
    expect(() => Sampler.select({
      pending: [{ job_id: "j1", material_iso: "P", sf: 100, fz: 0.05, process: "mill" }],
      history: [],
    })).toThrow();
  });

  it("rejects negative sf in candidate (Zod positive)", () => {
    expect(() => Sampler.select({
      pending: [{ job_id: "j1", material_iso: "P", sf: -10, fz: 0.05, process: "mill" }],
      history: HIST_BASE,
    })).toThrow();
  });

  it("rejects k=0 (Zod min(1))", () => {
    expect(() => Sampler.select({
      pending: [{ job_id: "j1", material_iso: "P", sf: 100, fz: 0.05, process: "mill" }],
      history: HIST_BASE,
      k: 0,
    })).toThrow();
  });

  it("variance is non-negative for any input", () => {
    const r = Sampler.select({
      pending: HIST_BASE.slice(0, 5).map((h, i) => ({ job_id: `j${i}`, ...h })),
      history: HIST_BASE,
    });
    for (const j of r.ranked) expect(j.variance).toBeGreaterThanOrEqual(0);
  });
});

describe("rationale lookup", () => {
  it("returns rationale string for known job_id", () => {
    const r = Sampler.select({
      pending: [{ job_id: "j1", material_iso: "P", sf: 100, fz: 0.05, process: "mill" }],
      history: HIST_BASE,
    });
    const rat = Sampler.rationale("j1", r);
    expect(typeof rat).toBe("string");
    expect(rat!.length).toBeGreaterThan(0);
  });

  it("returns null for unknown job_id", () => {
    const r = Sampler.select({
      pending: [{ job_id: "j1", material_iso: "P", sf: 100, fz: 0.05, process: "mill" }],
      history: HIST_BASE,
    });
    expect(Sampler.rationale("nonexistent", r)).toBeNull();
  });
});

describe("Engine identity", () => {
  it("exposes engineId/version/tier matching T11-01", () => {
    expect(Sampler.engineId).toBe("CrossProcessUncertaintyDrivenSamplerEngine");
    expect(Sampler.version).toBe("1.0.0");
    expect(Sampler.tier).toBe("T11-01");
  });
});

describe("Dispatcher wrapper", () => {
  it("xproc_active_select returns ranked with variance fields", () => {
    const r = crossProcessUncertaintyDrivenSampler("xproc_active_select", {
      pending: [{ job_id: "j1", material_iso: "P", sf: 100, fz: 0.05, process: "mill" }],
      history: HIST_BASE,
    }) as { ranked: Array<{ variance: number }> };
    expect(r.ranked.length).toBe(1);
    expect(typeof r.ranked[0].variance).toBe("number");
  });

  it("rejects unknown action", () => {
    expect(() => crossProcessUncertaintyDrivenSampler("unknown", {})).toThrow(/unknown action/i);
  });
});
