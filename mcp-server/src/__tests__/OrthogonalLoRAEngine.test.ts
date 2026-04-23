import { describe, it, expect, beforeEach } from "vitest";
import { orthogonalLoRAEngine } from "../engines/OrthogonalLoRAEngine.js";
describe("OrthogonalLoRAEngine", () => {
  beforeEach(() => orthogonalLoRAEngine.clear());
  it("registers direction", () => { orthogonalLoRAEngine.registerDirection("a", [1,0,0]); expect(orthogonalLoRAEngine.listAdapters()).toContain("a"); });
  it("registers multiple", () => { expect(orthogonalLoRAEngine.registerDirections([{ adapter_id: "a", direction: [1,0] }]).registered).toBe(1); });
  it("computes orthogonality", () => { orthogonalLoRAEngine.registerDirection("x", [1,0,0]); orthogonalLoRAEngine.registerDirection("y", [0,1,0]); expect(orthogonalLoRAEngine.computeOrthogonality("x","y")?.cosine_similarity).toBeCloseTo(0); });
  it("detects parallel", () => { orthogonalLoRAEngine.registerDirection("a", [1,2,3]); orthogonalLoRAEngine.registerDirection("b", [2,4,6]); expect(orthogonalLoRAEngine.computeOrthogonality("a","b")?.cosine_similarity).toBeCloseTo(1); });
  it("computes all pairwise", () => { orthogonalLoRAEngine.registerDirection("a", [1,0]); orthogonalLoRAEngine.registerDirection("b", [0,1]); expect(orthogonalLoRAEngine.computeAllPairwiseMetrics().length).toBe(1); });
  it("gets violations", () => { orthogonalLoRAEngine.registerDirection("a", [1,0.1]); orthogonalLoRAEngine.registerDirection("b", [1,0.2]); expect(orthogonalLoRAEngine.getViolations(0.5).length).toBe(1); });
  it("orthogonalizes", () => { orthogonalLoRAEngine.registerDirection("base", [1,0,0]); orthogonalLoRAEngine.registerDirection("t", [1,1,0]); const r = orthogonalLoRAEngine.orthogonalize("t", ["base"]); expect(r![0]).toBeCloseTo(0); });
  it("orthogonalizes all", () => { orthogonalLoRAEngine.registerDirection("a", [1,1]); orthogonalLoRAEngine.registerDirection("b", [1,0]); orthogonalLoRAEngine.orthogonalizeAll(); expect(orthogonalLoRAEngine.getViolations(0.01).length).toBe(0); });
  it("adds constraint", () => { orthogonalLoRAEngine.registerDirection("a", [1,0]); orthogonalLoRAEngine.registerDirection("b", [1,0]); orthogonalLoRAEngine.addConstraint({ adapter_ids: ["a","b"], constraint_strength: 0.5 }); expect(orthogonalLoRAEngine.computeConstrainedLoss().total_loss).toBeGreaterThan(0); });
  it("gets domain stats", () => { orthogonalLoRAEngine.registerDirection("a", [1,0], "d"); orthogonalLoRAEngine.registerDirection("b", [0,1], "d"); expect(orthogonalLoRAEngine.getDomainOrthogonality("d")?.adapter_count).toBe(2); });
});
