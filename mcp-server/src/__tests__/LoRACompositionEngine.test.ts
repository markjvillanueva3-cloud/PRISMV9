import { describe, it, expect, beforeEach } from "vitest";
import { loraCompositionEngine } from "../engines/LoRACompositionEngine.js";
import { loraMoEGatingEngine } from "../engines/LoRAMoEGatingEngine.js";
const e = (id: string) => ({ adapter_id: id, domain: "cutting_force" as const, quality_score: { accuracy: 0.9, stability: 0.8, coverage: 0.7, confidence: 0.9, freshness: 0.8 }, rank: 8, alpha: 16 });
describe("LoRACompositionEngine", () => {
  beforeEach(() => { loraCompositionEngine.clear(); loraMoEGatingEngine.clear(); });
  it("registers delta", () => { loraCompositionEngine.registerAdapterDelta("a", { x: 10 }); expect(loraCompositionEngine.getStats().registered_deltas).toBe(1); });
  it("registers multiple deltas", () => { expect(loraCompositionEngine.registerAdapterDeltas([{ adapter_id: "a", delta: { x: 1 } }]).registered).toBe(1); });
  it("composes weighted_sum", () => { loraMoEGatingEngine.registerExpert(e("a")); loraCompositionEngine.registerAdapterDelta("a", { v: 10 }); const r = loraCompositionEngine.compose({ domain: "cutting_force", context: {}, base_values: { v: 100 }, max_experts: 1 }); expect(r.adapted_values.v).toBeGreaterThan(100); });
  it("composes residual", () => { loraMoEGatingEngine.registerExpert(e("a")); loraCompositionEngine.registerAdapterDelta("a", { v: 10 }); const r = loraCompositionEngine.compose({ domain: "cutting_force", context: {}, base_values: { v: 100 }, composition_mode: "residual", max_experts: 1 }); expect(r.provenance.mode).toBe("residual"); });
  it("batch composes", () => { loraMoEGatingEngine.registerExpert(e("a")); loraCompositionEngine.registerAdapterDelta("a", { v: 1 }); expect(loraCompositionEngine.batchCompose([{ domain: "cutting_force", context: {}, base_values: { v: 0 }, max_experts: 1 }]).length).toBe(1); });
  it("configures", () => { loraCompositionEngine.configure({ residual_alpha: 0.3 }); expect(loraCompositionEngine.getConfig().residual_alpha).toBe(0.3); });
  it("gets stats", () => { expect(loraCompositionEngine.getStats().config).toBeDefined(); });
  it("clears deltas", () => { loraCompositionEngine.registerAdapterDelta("a", { x: 1 }); loraCompositionEngine.clearDeltas(); expect(loraCompositionEngine.getStats().registered_deltas).toBe(0); });
  it("composes <50ms", () => { loraMoEGatingEngine.registerExperts([e("a"),e("b")]); loraCompositionEngine.registerAdapterDeltas([{ adapter_id: "a", delta: { v: 1 } },{ adapter_id: "b", delta: { v: 2 } }]); const r = loraCompositionEngine.compose({ domain: "cutting_force", context: {}, base_values: { v: 0 }, max_experts: 2 }); expect(r.composition_time_ms).toBeLessThan(50); });
  it("tracks experts used", () => { loraMoEGatingEngine.registerExpert(e("a")); loraCompositionEngine.registerAdapterDelta("a", { v: 5 }); const r = loraCompositionEngine.compose({ domain: "cutting_force", context: {}, base_values: { v: 0 }, max_experts: 1 }); expect(r.experts_used.length).toBe(1); });
});
