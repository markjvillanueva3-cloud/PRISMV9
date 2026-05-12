import { describe, it, expect } from "vitest";
import { inverseStackupAllocatorEngine } from "../engines/InverseStackupAllocatorEngine.js";

describe("InverseStackupAllocatorEngine", () => {
  const threeComp = [
    { id: "A", nominal_mm: 10, min_tolerance_mm: 0.001 },
    { id: "B", nominal_mm: 20, min_tolerance_mm: 0.001 },
    { id: "C", nominal_mm: 15, min_tolerance_mm: 0.001 },
  ];

  it("equal allocation divides budget evenly (RSS basis)", () => {
    const r = inverseStackupAllocatorEngine.allocate({
      assembly_tolerance_mm: 0.1,
      method: "equal",
      components: threeComp,
    });
    expect(r.allocations).toHaveLength(3);
    const diffs = r.allocations.map((a) => a.allocated_tolerance_mm);
    const max = Math.max(...diffs);
    const min = Math.min(...diffs);
    expect(max - min).toBeLessThan(0.001);
    expect(r.feasible).toBe(true);
  });

  it("RSS allocation satisfies T = sqrt(sum Ti²)", () => {
    const r = inverseStackupAllocatorEngine.allocate({
      assembly_tolerance_mm: 0.1,
      method: "rss",
      components: threeComp,
    });
    expect(Math.abs(r.total_allocated_rss - 0.1)).toBeLessThan(0.002);
  });

  it("worst_case allocation satisfies T = Σ Ti", () => {
    const r = inverseStackupAllocatorEngine.allocate({
      assembly_tolerance_mm: 0.1,
      method: "worst_case",
      components: threeComp,
    });
    expect(Math.abs(r.total_allocated_wc - 0.1)).toBeLessThan(0.002);
  });

  it("cost-weighted: higher cost_exponent gets tighter tol", () => {
    const r = inverseStackupAllocatorEngine.allocate({
      assembly_tolerance_mm: 0.1,
      method: "cost_weighted",
      components: [
        { id: "cheap", cost_exponent: 0.5 },
        { id: "expensive", cost_exponent: 3.0 },
      ],
    });
    const cheap = r.allocations.find((a) => a.id === "cheap")!;
    const expensive = r.allocations.find((a) => a.id === "expensive")!;
    expect(cheap.allocated_tolerance_mm).toBeGreaterThan(expensive.allocated_tolerance_mm);
  });

  it("capability-weighted: low Cpk gets looser tol", () => {
    const r = inverseStackupAllocatorEngine.allocate({
      assembly_tolerance_mm: 0.1,
      method: "capability_weighted",
      components: [
        { id: "weak", cpk: 0.8 },
        { id: "strong", cpk: 2.0 },
      ],
    });
    const weak = r.allocations.find((a) => a.id === "weak")!;
    const strong = r.allocations.find((a) => a.id === "strong")!;
    expect(weak.allocated_tolerance_mm).toBeGreaterThan(strong.allocated_tolerance_mm);
  });

  it("fixed component is preserved in result", () => {
    const r = inverseStackupAllocatorEngine.allocate({
      assembly_tolerance_mm: 0.2,
      method: "rss",
      components: [
        { id: "fixed", fixed_tolerance_mm: 0.05 },
        { id: "free1" },
        { id: "free2" },
      ],
    });
    const fixed = r.allocations.find((a) => a.id === "fixed")!;
    expect(fixed.allocated_tolerance_mm).toBe(0.05);
    expect(fixed.note).toBe("fixed");
  });

  it("flags infeasibility when floors exceed budget", () => {
    const r = inverseStackupAllocatorEngine.allocate({
      assembly_tolerance_mm: 0.01,
      method: "rss",
      components: [
        { id: "A", min_tolerance_mm: 0.008 },
        { id: "B", min_tolerance_mm: 0.008 },
        { id: "C", min_tolerance_mm: 0.008 },
      ],
    });
    expect(r.feasible).toBe(false);
    expect(r.warnings.length).toBeGreaterThan(0);
  });

  it("feasibility_score in [0, 1]", () => {
    const r = inverseStackupAllocatorEngine.allocate({
      assembly_tolerance_mm: 0.05,
      method: "rss",
      components: threeComp,
    });
    expect(r.feasibility_score).toBeGreaterThanOrEqual(0);
    expect(r.feasibility_score).toBeLessThanOrEqual(1);
  });

  it("returns empty allocations for no components", () => {
    const r = inverseStackupAllocatorEngine.allocate({
      assembly_tolerance_mm: 0.1,
      method: "rss",
      components: [],
    });
    expect(r.allocations).toHaveLength(0);
    expect(r.feasible).toBe(false);
  });

  it("respects mixed fixed + free with floors", () => {
    const r = inverseStackupAllocatorEngine.allocate({
      assembly_tolerance_mm: 0.1,
      method: "rss",
      components: [
        { id: "fixed", fixed_tolerance_mm: 0.02 },
        { id: "free1", min_tolerance_mm: 0.001 },
        { id: "free2", min_tolerance_mm: 0.001 },
      ],
    });
    const fixedEntry = r.allocations.find((a) => a.id === "fixed")!;
    expect(fixedEntry.allocated_tolerance_mm).toBe(0.02);
    // RSS: free RSS = sqrt(0.01 - 0.0004) = 0.098
    const free1 = r.allocations.find((a) => a.id === "free1")!;
    const free2 = r.allocations.find((a) => a.id === "free2")!;
    const freeRss = Math.sqrt(free1.allocated_tolerance_mm ** 2 + free2.allocated_tolerance_mm ** 2);
    expect(Math.abs(freeRss - Math.sqrt(0.01 - 0.0004))).toBeLessThan(0.005);
  });

  it("getStats describes models", () => {
    const s = inverseStackupAllocatorEngine.getStats();
    expect(s.methods).toContain("rss");
    expect(s.models.rss).toMatch(/sqrt/i);
  });
});
