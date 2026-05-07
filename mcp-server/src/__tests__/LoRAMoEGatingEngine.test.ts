import { describe, it, expect, beforeEach } from "vitest";
import { loraMoEGatingEngine } from "../engines/LoRAMoEGatingEngine.js";
const e = () => ({ adapter_id: "a", domain: "cutting_force" as const, quality_score: { accuracy: 0.9, stability: 0.8, coverage: 0.7, confidence: 0.9, freshness: 0.8 }, rank: 8, alpha: 16 });
describe("LoRAMoEGatingEngine", () => {
  beforeEach(() => loraMoEGatingEngine.clear());
  it("registers expert", () => { loraMoEGatingEngine.registerExpert(e()); expect(loraMoEGatingEngine.getExpert("a")).toBeDefined(); });
  it("registers multiple", () => { expect(loraMoEGatingEngine.registerExperts([e()]).registered).toBe(1); });
  it("lists by domain", () => { loraMoEGatingEngine.registerExpert(e()); expect(loraMoEGatingEngine.listExperts("cutting_force").length).toBe(1); });
  it("gates top-k", () => { loraMoEGatingEngine.registerExpert(e()); expect(loraMoEGatingEngine.gate({ domain: "cutting_force", top_k: 1 }).selected_experts.length).toBe(1); });
  it("softmax sums to 1", () => { loraMoEGatingEngine.registerExperts([e(), {...e(), adapter_id: "b"}]); const r = loraMoEGatingEngine.gate({ domain: "cutting_force", top_k: 2 }); expect(r.selected_experts.reduce((s,x) => s + x.weight, 0)).toBeCloseTo(1); });
  it("ranks by quality", () => { loraMoEGatingEngine.registerExperts([{...e(), adapter_id: "low", quality_score: {...e().quality_score, accuracy: 0.1}}, e()]); expect(loraMoEGatingEngine.gate({ domain: "cutting_force", top_k: 2 }).selected_experts[0].adapter_id).toBe("a"); });
  it("batch gates", () => { loraMoEGatingEngine.registerExpert(e()); expect(loraMoEGatingEngine.batchGate([{ domain: "cutting_force", top_k: 1 }]).length).toBe(1); });
  it("unregisters", () => { loraMoEGatingEngine.registerExpert(e()); expect(loraMoEGatingEngine.unregisterExpert("a")).toBe(true); });
  it("gets stats", () => { loraMoEGatingEngine.registerExpert(e()); expect(loraMoEGatingEngine.getStats().total_experts).toBe(1); });
  it("clears", () => { loraMoEGatingEngine.registerExpert(e()); loraMoEGatingEngine.clear(); expect(loraMoEGatingEngine.listExperts().length).toBe(0); });
});
