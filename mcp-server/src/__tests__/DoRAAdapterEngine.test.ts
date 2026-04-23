import { describe, it, expect, beforeEach } from "vitest";
import { doRAAdapterEngine } from "../engines/DoRAAdapterEngine.js";
describe("DoRAAdapterEngine", () => {
  beforeEach(() => doRAAdapterEngine.clear());
  it("creates adapter", () => { expect(doRAAdapterEngine.createAdapter({ adapter_id: "d", rank: 4, alpha: 8 }).adapter_id).toBe("d"); });
  it("initializes weights", () => { doRAAdapterEngine.createAdapter({ adapter_id: "d", rank: 2, alpha: 1 }); const w = doRAAdapterEngine.initializeWeights("d", 4, 3); expect(w.magnitude.length).toBe(3); });
  it("gets weights", () => { doRAAdapterEngine.createAdapter({ adapter_id: "d", rank: 2, alpha: 1 }); doRAAdapterEngine.initializeWeights("d", 4, 3); expect(doRAAdapterEngine.getWeights("d")).not.toBeNull(); });
  it("computes deltaW", () => { doRAAdapterEngine.createAdapter({ adapter_id: "d", rank: 2, alpha: 1 }); doRAAdapterEngine.initializeWeights("d", 4, 3, 0.1); expect(doRAAdapterEngine.computeDeltaW("d")).not.toBeNull(); });
  it("forward pass", () => { doRAAdapterEngine.createAdapter({ adapter_id: "d", rank: 2, alpha: 1 }); doRAAdapterEngine.initializeWeights("d", 4, 3, 0.1); expect(doRAAdapterEngine.forward("d", [1,0,0,0])?.length).toBe(3); });
  it("batch forward", () => { doRAAdapterEngine.createAdapter({ adapter_id: "d", rank: 2, alpha: 1 }); doRAAdapterEngine.initializeWeights("d", 4, 3, 0.1); expect(doRAAdapterEngine.batchForward("d", [[1,0,0,0]])?.length).toBe(1); });
  it("magnitude stats", () => { doRAAdapterEngine.createAdapter({ adapter_id: "d", rank: 2, alpha: 1 }); doRAAdapterEngine.initializeWeights("d", 4, 3); expect(doRAAdapterEngine.getMagnitudeStats("d")?.mean).toBe(1); });
  it("lists adapters", () => { doRAAdapterEngine.createAdapter({ adapter_id: "d", rank: 2, alpha: 1 }); expect(doRAAdapterEngine.listAdapters()).toContain("d"); });
  it("deletes adapter", () => { doRAAdapterEngine.createAdapter({ adapter_id: "d", rank: 2, alpha: 1 }); expect(doRAAdapterEngine.deleteAdapter("d")).toBe(true); });
  it("throws on unknown", () => { expect(() => doRAAdapterEngine.initializeWeights("x", 4, 4)).toThrow(); });
});
