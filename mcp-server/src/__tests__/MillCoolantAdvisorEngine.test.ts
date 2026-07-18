import { describe, it, expect } from "vitest";
import {
  millCoolantAdvisorEngine as eng,
  type MillCoolantAdvisorInput,
  type MillCoolantMode,
} from "../engines/MillCoolantAdvisorEngine.js";

function nominal(o: Partial<MillCoolantAdvisorInput> = {}): MillCoolantAdvisorInput {
  return {
    iso_group: "P",
    operation: "end_milling_rough",
    tool_material: "carbide",
    ...o,
  };
}

describe("MillCoolantAdvisorEngine", () => {
  it("exports singleton with advise + getStats", () => {
    expect(typeof eng.advise).toBe("function");
    expect(typeof eng.getStats).toBe("function");
  });

  it("getStats lists 7 modes including mill-canonical air_blast", () => {
    const stats = eng.getStats();
    expect(stats.modes).toEqual(["flood", "high_pressure", "mist", "mql", "air_blast", "dry", "cryogenic"]);
    expect(stats.modes.length).toBe(7);
    expect(stats.factors_considered).toEqual(expect.arrayContaining([
      "iso_group", "operation", "tool_material", "adaptive_toolpath",
      "deep_pocket", "deep_hole", "air_blast_available",
    ]));
  });

  it("nominal steel end-mill roughing → flood is top recommendation", () => {
    const r = eng.advise(nominal());
    expect(r.recommendation).toBe("flood");
    expect(r.confidence).toBeGreaterThan(0);
    expect(r.confidence).toBeLessThanOrEqual(1);
    expect(r.parameters.flow_rate_lpm).toBe(60); // roughing flow boost
    expect(r.parameters.concentration_pct).toBe(8);
  });

  it("nominal aluminum end-mill finish + air_blast available → air_blast over flood", () => {
    const r = eng.advise(nominal({
      iso_group: "N",
      operation: "end_milling_finish",
      air_blast_available: true,
      sustainability_priority: "high",
    }));
    expect(r.recommendation).toBe("air_blast");
    expect(r.parameters.air_pressure_bar).toBe(6);
    expect(r.reasoning.some(s => /aluminum.*air-blast|JM Die preferred|sticky chips/i.test(s))).toBe(true);
  });

  it("titanium (S group) → cryogenic when LN2 available, else HPC", () => {
    const rCryo = eng.advise(nominal({ iso_group: "S", cryo_available: true, thru_spindle_available: true }));
    expect(rCryo.recommendation).toBe("cryogenic");
    expect(rCryo.parameters.cryo_kg_hr).toBe(8);
    expect(rCryo.safety_notes.some(s => /LN2|asphyxiation|O₂|O2/i.test(s))).toBe(true);

    const rHpc = eng.advise(nominal({ iso_group: "S", cryo_available: false, thru_spindle_available: true }));
    expect(rHpc.recommendation).toBe("high_pressure");
  });

  it("cast iron (K group) face milling → dry is canonical recommendation", () => {
    const r = eng.advise(nominal({ iso_group: "K", operation: "face_milling" }));
    expect(r.recommendation).toBe("dry");
    expect(r.reasoning.some(s => /cast iron|graphite/i.test(s))).toBe(true);
  });

  it("hardened steel (H group, ≥45 HRC) + CBN → dry preferred for insert thermal stability", () => {
    const r = eng.advise(nominal({ iso_group: "H", tool_material: "cbn", hardened_workpiece: true }));
    expect(r.recommendation).toBe("dry");
    expect(r.reasoning.some(s => /CBN|thermal stability|hardened/i.test(s))).toBe(true);
  });

  it("deep pocket + TSC available → HPC top recommendation", () => {
    const r = eng.advise(nominal({
      iso_group: "M",
      operation: "pocket_milling",
      deep_pocket: true,
      thru_spindle_available: true,
    }));
    expect(r.recommendation).toBe("high_pressure");
    expect(r.parameters.pressure_bar).toBe(140);
    expect(r.parameters.flow_rate_lpm).toBe(20);
  });

  it("deep hole drilling → HPC for chip evacuation", () => {
    const r = eng.advise(nominal({
      iso_group: "P",
      operation: "drilling",
      deep_hole: true,
      thru_spindle_available: true,
    }));
    expect(r.recommendation).toBe("high_pressure");
    expect(r.reasoning.some(s => /deep|chip evac/i.test(s))).toBe(true);
  });

  it("ceramic tool → flood penalized (thermal shock risk), favors dry or MQL", () => {
    const r = eng.advise(nominal({ tool_material: "ceramic", iso_group: "K" }));
    expect(r.recommendation).not.toBe("flood");
    expect(["dry", "mql"]).toContain(r.recommendation);
  });

  it("aluminum + adaptive toolpath + air_blast available → air_blast preferred over flood", () => {
    const r = eng.advise(nominal({
      iso_group: "N",
      operation: "pocket_milling",
      adaptive_toolpath: true,
      air_blast_available: true,
    }));
    expect(r.recommendation).toBe("air_blast");
    expect(r.reasoning.some(s => /adaptive|low-engagement|JM Die/i.test(s))).toBe(true);
  });

  it("high sustainability + Al + MQL preferred over flood when no air-blast", () => {
    const r = eng.advise(nominal({
      iso_group: "N",
      operation: "end_milling_rough",
      sustainability_priority: "high",
      air_blast_available: false,
    }));
    expect(["mql", "mist", "air_blast"]).toContain(r.recommendation);
    expect(r.recommendation).not.toBe("flood");
  });

  it("confidence is in [0,1]", () => {
    const r = eng.advise(nominal());
    expect(r.confidence).toBeGreaterThanOrEqual(0);
    expect(r.confidence).toBeLessThanOrEqual(1);
  });

  it("alternatives include all non-top 6 modes ranked by score", () => {
    const r = eng.advise(nominal());
    expect(r.alternatives.length).toBe(6); // 7 modes - 1 top = 6
    // Monotonic non-increasing score
    for (let i = 1; i < r.alternatives.length; i++) {
      expect(r.alternatives[i].score).toBeLessThanOrEqual(r.alternatives[i - 1].score);
    }
  });

  it("safety notes surface for high-risk modes", () => {
    const rCryo = eng.advise(nominal({ iso_group: "S", cryo_available: true }));
    expect(rCryo.safety_notes.some(s => /LN2|O₂|O2|asphyx/i.test(s))).toBe(true);

    const rHpc = eng.advise(nominal({
      iso_group: "M",
      operation: "pocket_milling",
      deep_pocket: true,
      thru_spindle_available: true,
    }));
    if (rHpc.recommendation === "high_pressure") {
      expect(rHpc.safety_notes.some(s => /HPC|hose|crimp/i.test(s))).toBe(true);
    }

    const rMist = eng.advise(nominal({ iso_group: "N", operation: "thread_milling", sustainability_priority: "high" }));
    if (rMist.recommendation === "mist") {
      expect(rMist.safety_notes.some(s => /mist|enclosure|extraction/i.test(s))).toBe(true);
    }
  });

  it("thread_milling + Al → mist is reasonable (mist scores high for threading + Al)", () => {
    const r = eng.advise(nominal({
      iso_group: "N",
      operation: "thread_milling",
      air_blast_available: false,
    }));
    expect(["mist", "flood", "mql", "air_blast"]).toContain(r.recommendation);
  });

  it("face_milling cast iron NEVER recommends flood (cast iron sludge rule)", () => {
    const r = eng.advise(nominal({ iso_group: "K", operation: "face_milling" }));
    expect(r.recommendation).not.toBe("flood");
  });

  it("no cryo_available → cryogenic never wins regardless of S group", () => {
    const r = eng.advise(nominal({ iso_group: "S", cryo_available: false, thru_spindle_available: true }));
    expect(r.recommendation).not.toBe("cryogenic");
  });

  it("no thru_spindle → HPC heavily penalized but can still win deep pocket if delta still positive", () => {
    const r = eng.advise(nominal({
      iso_group: "P",
      operation: "end_milling_rough",
      thru_spindle_available: false,
      deep_pocket: false,
    }));
    // Should NOT be HPC under typical conditions (delta -25 means low score)
    expect(r.recommendation).not.toBe("high_pressure");
  });

  it("reasoning array is never empty for the top recommendation (at least 1 explanation)", () => {
    const r = eng.advise(nominal({ iso_group: "K", operation: "face_milling" }));
    expect(r.reasoning.length).toBeGreaterThan(0);
  });

  it("score clamping — extreme combo input stays in [0, 100] for all alternatives", () => {
    const r = eng.advise({
      iso_group: "S",
      operation: "drilling",
      tool_material: "ceramic",
      Vc_m_min: 500,
      deep_hole: true,
      hardened_workpiece: true,
      cryo_available: false,
      sustainability_priority: "high",
      thru_spindle_available: false,
      air_blast_available: false,
    });
    for (const alt of r.alternatives) {
      expect(alt.score).toBeGreaterThanOrEqual(0);
      expect(alt.score).toBeLessThanOrEqual(100);
    }
  });
});
