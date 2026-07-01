import { describe, it, expect, beforeEach } from "vitest";
import {
  MillLoRAResourceManagerEngine,
  DEFAULT_QUOTA_SOFT_LIMIT,
  DEFAULT_QUOTA_HARD_LIMIT,
  DEFAULT_RESERVATION_TIMEOUT_MS,
  MILL_CANONICAL_RESOURCE_TYPES,
} from "../engines/MillLoRAResourceManagerEngine.js";

let eng: MillLoRAResourceManagerEngine;

beforeEach(() => {
  eng = new MillLoRAResourceManagerEngine();
});

describe("MillLoRAResourceManagerEngine", () => {
  it("getStats: 8 resource types, 3 mill-canonical, empty pools/allocs at init", () => {
    const s = eng.getStats();
    expect(s.resource_types.length).toBe(8);
    expect(s.mill_canonical_resource_types).toEqual(["tcpm_solver_slots", "vericut_slots", "postprocessor_slots"]);
    expect(s.total_pools).toBe(0);
    expect(s.total_allocations).toBe(0);
  });

  it("MILL_CANONICAL_RESOURCE_TYPES contains 3 mill-only types", () => {
    expect(MILL_CANONICAL_RESOURCE_TYPES).toEqual(["tcpm_solver_slots", "vericut_slots", "postprocessor_slots"]);
  });

  it("getConfig: default soft=0.8, hard=0.95, timeout=30s, quotas enabled", () => {
    const c = eng.getConfig();
    expect(c.quota_soft_limit).toBe(DEFAULT_QUOTA_SOFT_LIMIT);
    expect(c.quota_hard_limit).toBe(DEFAULT_QUOTA_HARD_LIMIT);
    expect(c.reservation_timeout_ms).toBe(DEFAULT_RESERVATION_TIMEOUT_MS);
    expect(c.enable_quotas).toBe(true);
  });

  it("setConfig: partial override merges with defaults", () => {
    eng.setConfig({ quota_soft_limit: 0.5 });
    const c = eng.getConfig();
    expect(c.quota_soft_limit).toBe(0.5);
    expect(c.quota_hard_limit).toBe(DEFAULT_QUOTA_HARD_LIMIT);
  });

  it("setPool: throws on negative total", () => {
    expect(() => eng.setPool("cpu_cores", -1)).toThrow(/total must be >= 0/);
  });

  it("setPool then getPool returns the pool with allocated=0 and reserved=0", () => {
    eng.setPool("cpu_cores", 16);
    const pool = eng.getPool("cpu_cores");
    expect(pool?.total).toBe(16);
    expect(pool?.allocated).toBe(0);
    expect(pool?.reserved).toBe(0);
  });

  it("setPool: re-set preserves allocated + reserved", () => {
    eng.setPool("cpu_cores", 16);
    eng.allocate("user1", { cpu_cores: 4 });
    eng.setPool("cpu_cores", 32);
    const pool = eng.getPool("cpu_cores");
    expect(pool?.total).toBe(32);
    expect(pool?.allocated).toBe(4);
  });

  it("canAllocate: returns false when pool missing", () => {
    expect(eng.canAllocate({ cpu_cores: 1 })).toBe(false);
  });

  it("canAllocate: returns false when needed > available", () => {
    eng.setPool("cpu_cores", 4);
    expect(eng.canAllocate({ cpu_cores: 10 })).toBe(false);
  });

  it("canAllocate: returns false when allocation would breach hard limit (96/100 > 0.95)", () => {
    eng.setPool("cpu_cores", 100);
    eng.allocate("u", { cpu_cores: 90 });
    expect(eng.canAllocate({ cpu_cores: 6 })).toBe(false);
  });

  it("canAllocate: returns true at exactly hard-limit fraction (95/100 == 0.95)", () => {
    eng.setPool("cpu_cores", 100);
    expect(eng.canAllocate({ cpu_cores: 95 })).toBe(true);
  });

  it("allocate: returns null when insufficient", () => {
    eng.setPool("cpu_cores", 2);
    expect(eng.allocate("u", { cpu_cores: 10 })).toBeNull();
  });

  it("allocate: returns ResourceAllocation with id, owner, priority, resources", () => {
    eng.setPool("cpu_cores", 16);
    const a = eng.allocate("user1", { cpu_cores: 4 }, "high");
    expect(a?.owner).toBe("user1");
    expect(a?.priority).toBe("high");
    expect(a?.resources).toEqual({ cpu_cores: 4 });
    expect(typeof a?.id).toBe("string");
    expect((a?.id ?? "").length).toBeGreaterThan(5);
  });

  it("release: returns true and frees the allocated count", () => {
    eng.setPool("cpu_cores", 16);
    const a = eng.allocate("u", { cpu_cores: 4 });
    expect(eng.release(a!.id)).toBe(true);
    expect(eng.getPool("cpu_cores")?.allocated).toBe(0);
  });

  it("release: returns false for unknown id", () => {
    expect(eng.release("MISSING")).toBe(false);
  });

  it("reserve + unreserve: tracks reserved separately from allocated", () => {
    eng.setPool("ram_mb", 1024);
    expect(eng.reserve({ ram_mb: 256 })).toBe(true);
    expect(eng.getPool("ram_mb")?.reserved).toBe(256);
    eng.unreserve({ ram_mb: 256 });
    expect(eng.getPool("ram_mb")?.reserved).toBe(0);
  });

  it("reserve: returns false when not enough available", () => {
    eng.setPool("ram_mb", 100);
    eng.allocate("u", { ram_mb: 90 });
    expect(eng.reserve({ ram_mb: 50 })).toBe(false);
  });

  it("getUtilization: pool.allocated / pool.total", () => {
    eng.setPool("cpu_cores", 16);
    eng.allocate("u", { cpu_cores: 4 });
    expect(eng.getUtilization("cpu_cores")).toBeCloseTo(0.25, 4);
  });

  it("getUtilization: returns 0 for missing pool", () => {
    expect(eng.getUtilization("gpu_count")).toBe(0);
  });

  it("getOwnerAllocations returns only owner's allocs", () => {
    eng.setPool("cpu_cores", 16);
    eng.allocate("user1", { cpu_cores: 2 });
    eng.allocate("user2", { cpu_cores: 4 });
    eng.allocate("user1", { cpu_cores: 1 });
    expect(eng.getOwnerAllocations("user1").length).toBe(2);
    expect(eng.getOwnerAllocations("user2").length).toBe(1);
  });

  it("MILL-CANONICAL: tcpm_solver_slots pool can be set + allocated + utilization tracked", () => {
    eng.setPool("tcpm_solver_slots", 4);
    const a = eng.allocate("5axis_op_1", { tcpm_solver_slots: 1 });
    expect(a?.resources.tcpm_solver_slots).toBe(1);
    expect(eng.getUtilization("tcpm_solver_slots")).toBeCloseTo(0.25, 4);
  });

  it("MILL-CANONICAL: vericut_slots pool blocks 3rd allocation when 2/2 used", () => {
    eng.setPool("vericut_slots", 2);
    eng.allocate("sim1", { vericut_slots: 1 });
    eng.allocate("sim2", { vericut_slots: 1 });
    expect(eng.canAllocate({ vericut_slots: 1 })).toBe(false);
  });

  it("MILL-CANONICAL: postprocessor_slots tracks CAM post compile concurrency", () => {
    eng.setPool("postprocessor_slots", 3);
    const a = eng.allocate("mastercam_post", { postprocessor_slots: 1 }, "high");
    expect(a?.priority).toBe("high");
    expect(eng.getPool("postprocessor_slots")?.allocated).toBe(1);
  });

  it("findPreemptable: lowest-priority first; satisfies needed count", () => {
    eng.setPool("cpu_cores", 10);
    const a_low = eng.allocate("lo", { cpu_cores: 4 }, "low");
    const a_norm = eng.allocate("no", { cpu_cores: 3 }, "normal");
    eng.allocate("hi", { cpu_cores: 3 }, "high");
    const preempt = eng.findPreemptable({ cpu_cores: 5 });
    expect(preempt[0].id).toBe(a_low!.id);
    expect(preempt.length).toBe(2);
    expect(preempt[1].id).toBe(a_norm!.id);
  });

  it("findPreemptable: critical-priority allocs are NEVER preempted", () => {
    eng.setPool("cpu_cores", 10);
    eng.allocate("crit", { cpu_cores: 10 }, "critical");
    expect(eng.findPreemptable({ cpu_cores: 5 })).toEqual([]);
  });

  it("findPreemptable: returns empty when no non-critical can satisfy", () => {
    eng.setPool("cpu_cores", 10);
    eng.allocate("lo", { cpu_cores: 1 }, "low");
    expect(eng.findPreemptable({ cpu_cores: 5 })).toEqual([]);
  });

  it("getStats: counts soft + hard limit pools correctly", () => {
    eng.setPool("cpu_cores", 100);
    eng.allocate("u", { cpu_cores: 85 });
    const s = eng.getStats();
    expect(s.pools_at_soft_limit).toBe(1);
    expect(s.pools_at_hard_limit).toBe(0);
  });

  it("variability ≥3 resource types in same allocation: cpu_cores + gpu_count + tcpm_solver_slots", () => {
    eng.setPool("cpu_cores", 16);
    eng.setPool("gpu_count", 2);
    eng.setPool("tcpm_solver_slots", 4);
    const a = eng.allocate("training", { cpu_cores: 8, gpu_count: 1, tcpm_solver_slots: 1 });
    expect(a?.resources).toEqual({ cpu_cores: 8, gpu_count: 1, tcpm_solver_slots: 1 });
    expect(eng.getPool("cpu_cores")?.allocated).toBe(8);
    expect(eng.getPool("gpu_count")?.allocated).toBe(1);
    expect(eng.getPool("tcpm_solver_slots")?.allocated).toBe(1);
  });

  it("reset: clears pools to empty, allocations to empty, config to defaults", () => {
    eng.setPool("cpu_cores", 16);
    eng.allocate("u", { cpu_cores: 4 });
    eng.setConfig({ quota_soft_limit: 0.5 });
    eng.reset();
    expect(eng.getPools()).toEqual([]);
    expect(eng.getOwnerAllocations("u")).toEqual([]);
    expect(eng.getConfig().quota_soft_limit).toBe(DEFAULT_QUOTA_SOFT_LIMIT);
  });

  it("getSummary: returns header + stat lines", () => {
    eng.setPool("cpu_cores", 16);
    const summary = eng.getSummary();
    expect(summary).toMatch(/Mill LoRA Resource Manager Summary/);
    expect(summary).toMatch(/Pools: 1/);
    expect(summary).toMatch(/Allocations: 0/);
  });

  it("allocate IDs are unique across calls", () => {
    eng.setPool("cpu_cores", 100);
    const a1 = eng.allocate("u", { cpu_cores: 1 });
    const a2 = eng.allocate("u", { cpu_cores: 1 });
    expect(a1?.id === a2?.id).toBe(false);
  });

  it("getAllocation returns identical record by id", () => {
    eng.setPool("cpu_cores", 16);
    const a = eng.allocate("u", { cpu_cores: 4 });
    expect(eng.getAllocation(a!.id)).toEqual(a);
  });

  it("getAllocation returns undefined for missing id (null-vs-undefined check)", () => {
    expect(eng.getAllocation("MISSING") === undefined).toBe(true);
  });

  it("canAllocate with quotas DISABLED: hard limit ignored, only available capacity matters", () => {
    eng.setConfig({ enable_quotas: false });
    eng.setPool("cpu_cores", 100);
    eng.allocate("u", { cpu_cores: 99 });
    expect(eng.canAllocate({ cpu_cores: 2 })).toBe(false);
    expect(eng.canAllocate({ cpu_cores: 1 })).toBe(true);
  });

  it("multiple allocations to same pool sum into pool.allocated", () => {
    eng.setPool("cpu_cores", 16);
    eng.allocate("u1", { cpu_cores: 2 });
    eng.allocate("u2", { cpu_cores: 3 });
    eng.allocate("u3", { cpu_cores: 5 });
    expect(eng.getPool("cpu_cores")?.allocated).toBe(10);
  });

  it("getPools returns all pools in arbitrary order, length matches", () => {
    eng.setPool("cpu_cores", 16);
    eng.setPool("gpu_count", 2);
    eng.setPool("tcpm_solver_slots", 4);
    expect(eng.getPools().length).toBe(3);
  });
});
