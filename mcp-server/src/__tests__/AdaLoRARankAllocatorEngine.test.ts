import { describe, it, expect, beforeEach } from "vitest";
import { adaLoRARankAllocatorEngine } from "../engines/AdaLoRARankAllocatorEngine.js";
describe("AdaLoRARankAllocatorEngine", () => {
  beforeEach(() => adaLoRARankAllocatorEngine.clear());
  it("creates allocation", () => { const a = adaLoRARankAllocatorEngine.createAllocation({ adapter_id: "a", total_rank_budget: 12 }, ["l1","l2"]); expect(a.layer_ranks["l1"]).toBe(6); });
  it("updates importance", () => { adaLoRARankAllocatorEngine.createAllocation({ adapter_id: "a", total_rank_budget: 12, importance_metric: "svd" }, ["l1"]); expect(adaLoRARankAllocatorEngine.updateImportance("a", "l1", { weights: [[1,2],[3,4]] })).toBeGreaterThan(0); });
  it("reallocates ranks", () => { adaLoRARankAllocatorEngine.createAllocation({ adapter_id: "a", total_rank_budget: 20, min_rank: 2, max_rank: 16 }, ["hi","lo"]); adaLoRARankAllocatorEngine.updateImportance("a", "hi", { weights: [[10,10]] }); adaLoRARankAllocatorEngine.updateImportance("a", "lo", { weights: [[1,1]] }); const r = adaLoRARankAllocatorEngine.reallocateRanks("a"); expect(r.layer_ranks["hi"]).toBeGreaterThan(r.layer_ranks["lo"]); });
  it("steps training", () => { adaLoRARankAllocatorEngine.createAllocation({ adapter_id: "a", total_rank_budget: 8, reallocation_interval: 1 }, ["l1"]); expect(adaLoRARankAllocatorEngine.step("a", { l1: { weights: [[1]] } })).not.toBeNull(); });
  it("gets allocation", () => { adaLoRARankAllocatorEngine.createAllocation({ adapter_id: "a", total_rank_budget: 8 }, ["l1"]); expect(adaLoRARankAllocatorEngine.getAllocation("a")).not.toBeNull(); });
  it("gets total rank", () => { adaLoRARankAllocatorEngine.createAllocation({ adapter_id: "a", total_rank_budget: 12 }, ["l1","l2"]); expect(adaLoRARankAllocatorEngine.getTotalAllocatedRank("a")).toBe(12); });
  it("gets distribution", () => { adaLoRARankAllocatorEngine.createAllocation({ adapter_id: "a", total_rank_budget: 12 }, ["l1","l2"]); expect(adaLoRARankAllocatorEngine.getRankDistribution("a")?.mean).toBe(6); });
  it("lists allocations", () => { adaLoRARankAllocatorEngine.createAllocation({ adapter_id: "a", total_rank_budget: 8 }, ["l1"]); expect(adaLoRARankAllocatorEngine.listAllocations()).toContain("a"); });
  it("deletes allocation", () => { adaLoRARankAllocatorEngine.createAllocation({ adapter_id: "a", total_rank_budget: 8 }, ["l1"]); expect(adaLoRARankAllocatorEngine.deleteAllocation("a")).toBe(true); });
  it("gradient importance", () => { adaLoRARankAllocatorEngine.createAllocation({ adapter_id: "a", total_rank_budget: 8, importance_metric: "gradient" }, ["l1"]); expect(adaLoRARankAllocatorEngine.updateImportance("a", "l1", { gradients: [1,2,3] })).toBeGreaterThan(0); });
});
