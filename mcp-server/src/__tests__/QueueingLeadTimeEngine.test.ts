/**
 * Tests for QueueingLeadTimeEngine (invention E7).
 * Real reference-value checks — Kingman VUT is exact arithmetic, so every
 * expected number below is hand-computed, not a stub.
 *
 *   CT_q = ((Ca^2 + Cs^2)/2) * (rho/(1-rho)) * te
 */
import { describe, it, expect } from "vitest";
import { QueueingLeadTimeEngine, queueingLeadTimeEngine } from "../engines/QueueingLeadTimeEngine.js";
import { registerSchedulingDispatcher } from "../tools/dispatchers/schedulingDispatcher.js";

const engine = new QueueingLeadTimeEngine();

/** Helper: a workstation with sensible defaults. */
function ws(id: string, over: Partial<{ te: number; ca: number; cs: number; rho: number }> = {}) {
  return {
    id,
    effectiveProcessTime_min: over.te ?? 10,
    arrivalCV: over.ca ?? 1,
    serviceCV: over.cs ?? 1,
    utilization: over.rho ?? 0.8,
  };
}

describe("QueueingLeadTimeEngine — Kingman VUT reference values", () => {
  it("rho=0.8, Ca=Cs=1, te=10 → queue time 40 min (hand-computed)", () => {
    // variability=(1+1)/2=1 ; U=0.8/0.2=4 ; CT_q=1*4*10=40
    const r = engine.predict({ workstations: [ws("A")], jobRouting: ["A"] });
    expect(r.perStation[0].queueTime_min).toBeCloseTo(40, 6);
    expect(r.totalProcessTime_min).toBe(10);
    expect(r.totalLeadTime_min).toBeCloseTo(50, 6);
  });

  it("rho=0.9 → queue 90 min ; rho=0.95 → queue 190 min (the rho/(1-rho) explosion)", () => {
    const r90 = engine.predict({ workstations: [ws("A", { rho: 0.9 })], jobRouting: ["A"] });
    const r95 = engine.predict({ workstations: [ws("A", { rho: 0.95 })], jobRouting: ["A"] });
    expect(r90.perStation[0].queueTime_min).toBeCloseTo(90, 6);   // 1 * 9 * 10
    expect(r95.perStation[0].queueTime_min).toBeCloseTo(190, 6);  // 1 * 19 * 10
    // 5 points of extra utilization (0.90->0.95) more than doubles queue time.
    expect(r95.perStation[0].queueTime_min).toBeGreaterThan(2 * r90.perStation[0].queueTime_min);
  });

  it("deterministic process (Ca=Cs=0) → zero queue time", () => {
    const r = engine.predict({ workstations: [ws("A", { ca: 0, cs: 0 })], jobRouting: ["A"] });
    expect(r.perStation[0].queueTime_min).toBe(0);
    expect(r.totalLeadTime_min).toBe(10); // process only
    expect(r.queueFraction).toBe(0);
  });

  it("multi-station routing sums queue + process across the route", () => {
    const r = engine.predict({
      workstations: [ws("A", { rho: 0.8 }), ws("B", { rho: 0.9 })],
      jobRouting: ["A", "B"],
    });
    // A: q=40, B: q=90 ; process 10+10=20 ; lead = 40+90+20 = 150
    expect(r.totalQueueTime_min).toBeCloseTo(130, 6);
    expect(r.totalProcessTime_min).toBe(20);
    expect(r.totalLeadTime_min).toBeCloseTo(150, 6);
    expect(r.queueFraction).toBeCloseTo(130 / 150, 6);
  });

  it("revisiting a station in the routing counts it twice", () => {
    const r = engine.predict({ workstations: [ws("A")], jobRouting: ["A", "A"] });
    expect(r.perStation).toHaveLength(2);
    expect(r.totalLeadTime_min).toBeCloseTo(100, 6); // 2 * (40 + 10)
  });
});

describe("QueueingLeadTimeEngine — bottleneck + hotspot", () => {
  it("identifies the highest-queue station as the bottleneck", () => {
    const r = engine.predict({
      workstations: [ws("A", { rho: 0.7 }), ws("B", { rho: 0.95 })],
      jobRouting: ["A", "B"],
    });
    expect(r.bottleneck?.id).toBe("B");
    expect(r.bottleneck?.utilization).toBe(0.95);
    expect(r.bottleneck?.recommendedUtilization).toBe(0.85);
    // backing B off 0.95 -> 0.85 must lower the predicted lead time
    expect(r.bottleneck!.leadTimeIfBackedOff_min).toBeLessThan(r.totalLeadTime_min);
  });

  it("marks the worst station as a hotspot", () => {
    const r = engine.predict({
      workstations: [ws("A", { rho: 0.6 }), ws("B", { rho: 0.95 })],
      jobRouting: ["A", "B"],
    });
    const b = r.perStation.find((s) => s.id === "B")!;
    expect(b.isHotspot).toBe(true);
  });

  it("does not recommend a backoff when no station is hot", () => {
    const r = engine.predict({ workstations: [ws("A", { rho: 0.7 })], jobRouting: ["A"] });
    expect(r.rationale).toMatch(/No station is in the high-utilization danger zone/);
  });
});

describe("QueueingLeadTimeEngine — failure modes", () => {
  it("rho >= 1 → unbounded lead time, station flagged over-capacity", () => {
    const r = engine.predict({ workstations: [ws("A", { rho: 1.0 })], jobRouting: ["A"] });
    expect(r.totalLeadTime_min).toBe(Infinity);
    expect(r.overCapacityStations).toContain("A");
    expect(r.rationale).toMatch(/UNBOUNDED/);
  });

  it("rho <= 0 → throws", () => {
    expect(() => engine.predict({ workstations: [ws("A", { rho: 0 })], jobRouting: ["A"] })).toThrow(/utilization must be > 0/);
    expect(() => engine.predict({ workstations: [ws("A", { rho: -0.5 })], jobRouting: ["A"] })).toThrow(/utilization/);
  });

  it("negative CV → throws", () => {
    expect(() => engine.predict({ workstations: [ws("A", { ca: -1 })], jobRouting: ["A"] })).toThrow(/CV values must be >= 0/);
  });

  it("empty workstations → throws", () => {
    expect(() => engine.predict({ workstations: [], jobRouting: ["A"] })).toThrow(/at least one workstation/);
  });

  it("empty routing → throws", () => {
    expect(() => engine.predict({ workstations: [ws("A")], jobRouting: [] })).toThrow(/jobRouting must be a non-empty array/);
  });

  it("routing references an unknown station → throws", () => {
    expect(() => engine.predict({ workstations: [ws("A")], jobRouting: ["Z"] })).toThrow(/unknown workstation 'Z'/);
  });
});

describe("QueueingLeadTimeEngine — adversarial inputs", () => {
  it("NaN in a numeric field → throws", () => {
    expect(() => engine.predict({ workstations: [ws("A", { te: NaN })], jobRouting: ["A"] })).toThrow(/finite number/);
  });

  it("Infinity in a numeric field → throws", () => {
    expect(() => engine.predict({ workstations: [ws("A", { rho: Infinity })], jobRouting: ["A"] })).toThrow(/finite number/);
  });

  it("missing/empty workstation id → throws", () => {
    expect(() => engine.predict({ workstations: [{ ...ws("A"), id: "" }], jobRouting: ["A"] })).toThrow(/non-empty string id/);
  });

  it("null input → throws", () => {
    expect(() => engine.predict(null as any)).toThrow(/input object required/);
  });

  it("negative process time → throws", () => {
    expect(() => engine.predict({ workstations: [ws("A", { te: -5 })], jobRouting: ["A"] })).toThrow(/effectiveProcessTime_min must be >= 0/);
  });
});

describe("QueueingLeadTimeEngine — variability spanning configurations", () => {
  it("low-variability (CV 0.25) vs high-variability (CV 1.5) at the same rho", () => {
    const low = engine.predict({ workstations: [ws("A", { ca: 0.25, cs: 0.25 })], jobRouting: ["A"] });
    const high = engine.predict({ workstations: [ws("A", { ca: 1.5, cs: 1.5 })], jobRouting: ["A"] });
    // variability term: low=(0.0625+0.0625)/2=0.0625 ; high=(2.25+2.25)/2=2.25
    expect(low.perStation[0].queueTime_min).toBeCloseTo(0.0625 * 4 * 10, 6);  // 2.5
    expect(high.perStation[0].queueTime_min).toBeCloseTo(2.25 * 4 * 10, 6);   // 90
    expect(high.perStation[0].queueTime_min).toBeGreaterThan(low.perStation[0].queueTime_min);
  });

  it("singleton export is usable + matches a fresh instance", () => {
    const a = queueingLeadTimeEngine.predict({ workstations: [ws("A")], jobRouting: ["A"] });
    const b = engine.predict({ workstations: [ws("A")], jobRouting: ["A"] });
    expect(a.totalLeadTime_min).toBe(b.totalLeadTime_min);
  });
});

describe("QueueingLeadTimeEngine — round-trip through prism_scheduling dispatcher", () => {
  /** Capture the handler the dispatcher registers via server.tool(). */
  function getDispatcherHandler(): (a: { action: string; params?: Record<string, unknown> }) => Promise<any> {
    let handler: any;
    const mockServer = { tool: (_n: string, _d: string, _s: unknown, h: any) => { handler = h; } };
    registerSchedulingDispatcher(mockServer);
    if (!handler) throw new Error("dispatcher did not register a handler");
    return handler;
  }

  it("queue_lead_time action round-trips through the dispatcher", async () => {
    const handler = getDispatcherHandler();
    const res = await handler({
      action: "queue_lead_time",
      params: {
        workstations: [
          { id: "A", effectiveProcessTime_min: 10, arrivalCV: 1, serviceCV: 1, utilization: 0.8 },
          { id: "B", effectiveProcessTime_min: 10, arrivalCV: 1, serviceCV: 1, utilization: 0.9 },
        ],
        jobRouting: ["A", "B"],
      },
    });
    expect(res.content?.[0]?.type).toBe("text");
    const data = JSON.parse(res.content[0].text);
    // A queue 40, B queue 90, process 20 → lead 150 (matches the engine-direct test)
    expect(data.totalLeadTime_min).toBeCloseTo(150, 6);
    expect(data.bottleneck.id).toBe("B");
  });

  it("dispatcher rejects invalid queue_lead_time params (schema gate)", async () => {
    const handler = getDispatcherHandler();
    const res = await handler({ action: "queue_lead_time", params: { workstations: "not-an-array" } });
    const text = res.content?.[0]?.text ?? JSON.stringify(res);
    expect(text).toMatch(/Invalid params|error/i);
  });

  it("dispatcher still exposes the legacy lead_time_estimate action", async () => {
    const handler = getDispatcherHandler();
    const res = await handler({
      action: "lead_time_estimate",
      params: { operations: [{ time_min: 10 }, { time_min: 20 }] },
    });
    const data = JSON.parse(res.content[0].text);
    expect(data.process_time_min).toBe(30); // anti-regression: legacy action intact
  });
});
