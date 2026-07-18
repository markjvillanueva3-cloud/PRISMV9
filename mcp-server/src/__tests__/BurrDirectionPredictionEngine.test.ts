import { describe, it, expect } from "vitest";
import {
  burrDirectionPredictionEngine as eng,
  BurrDirectionPredictionEngine,
  type BurrPredictionInput,
} from "../engines/BurrDirectionPredictionEngine.js";

function nominal(o: Partial<BurrPredictionInput> = {}): BurrPredictionInput {
  return {
    edge_id: "E1",
    edge_type: "perimeter",
    material: "aluminum",
    chip_exit: "side",
    tool_diameter_mm: 10,
    exit_wall_thickness_mm: 10,
    feed_per_tooth_mm: 0.1,
    cutting_speed_m_min: 200,
    ...o,
  };
}

describe("BurrDirectionPredictionEngine", () => {
  it("exports a singleton with predict()", () => {
    expect(eng).toBeInstanceOf(BurrDirectionPredictionEngine);
    expect(typeof eng.predict).toBe("function");
  });

  it("throws on missing inputs", () => {
    expect(() => eng.predict({} as BurrPredictionInput)).toThrow(/edge_id \+ material \+ edge_type/);
  });

  it("throws on non-positive tool or feed", () => {
    expect(() => eng.predict(nominal({ tool_diameter_mm: 0 }))).toThrow(/positive tool \+ feed/);
    expect(() => eng.predict(nominal({ feed_per_tooth_mm: -0.01 }))).toThrow(/positive tool \+ feed/);
  });

  it("thin_wall_exit → breakout burr type + manual_file deburr", () => {
    const r = eng.predict(nominal({ edge_type: "thin_wall_exit", exit_wall_thickness_mm: 0.5 }));
    expect(r.burr_type).toBe("breakout");
    expect(r.deburr_strategy).toBe("manual_file");
    expect(r.warnings.some(w => /manual finish/.test(w))).toBe(true);
  });

  it("cast iron → tear burr type", () => {
    const r = eng.predict(nominal({ material: "cast_iron" }));
    expect(r.burr_type).toBe("tear");
  });

  it("side-exit ductile → rollover burr type", () => {
    const r = eng.predict(nominal({ chip_exit: "side", material: "aluminum" }));
    expect(r.burr_type).toBe("rollover");
  });

  it("aluminum (ductile, ductility=0.9) gives larger rollover than steel (0.6)", () => {
    const al = eng.predict(nominal({ material: "aluminum" }));
    const st = eng.predict(nominal({ material: "steel" }));
    expect(al.predicted_burr_height_um.value).toBeGreaterThan(st.predicted_burr_height_um.value);
  });

  it("higher cutting speed reduces burr height (1/sqrt(v) dependence)", () => {
    const lo = eng.predict(nominal({ cutting_speed_m_min: 50 }));
    const hi = eng.predict(nominal({ cutting_speed_m_min: 800 }));
    expect(hi.predicted_burr_height_um.value).toBeLessThan(lo.predicted_burr_height_um.value);
  });

  it("higher feed per tooth raises burr height linearly", () => {
    const lo = eng.predict(nominal({ feed_per_tooth_mm: 0.05 }));
    const hi = eng.predict(nominal({ feed_per_tooth_mm: 0.20 }));
    expect(hi.predicted_burr_height_um.value).toBeGreaterThan(lo.predicted_burr_height_um.value);
  });

  it("deburr_required=true + exceeds_spec=true when burr > spec", () => {
    const r = eng.predict(nominal({ material: "aluminum", feed_per_tooth_mm: 0.3, cutting_speed_m_min: 100 }));
    expect(r.exceeds_spec).toBe(true);
    expect(r.deburr_required).toBe(true);
    expect(r.deburr_strategy).not.toBe("none");
  });

  it("deburr_required=false when burr < spec", () => {
    const r = eng.predict(nominal({ material: "stainless", feed_per_tooth_mm: 0.02, cutting_speed_m_min: 400 }));
    expect(r.exceeds_spec).toBe(false);
    expect(r.deburr_required).toBe(false);
    expect(r.deburr_strategy).toBe("none");
  });

  it("thru_hole_exit → chamfer_tool deburr strategy", () => {
    const r = eng.predict(nominal({ edge_type: "thru_hole_exit", feed_per_tooth_mm: 0.2 }));
    expect(["chamfer_tool", "manual_file"]).toContain(r.deburr_strategy);
  });

  it("slot_exit → abrasive_brush deburr strategy when not breakout", () => {
    const r = eng.predict(nominal({ edge_type: "slot_exit", material: "aluminum", feed_per_tooth_mm: 0.2 }));
    expect(["abrasive_brush", "chamfer_tool", "manual_file"]).toContain(r.deburr_strategy);
  });

  it("warns on through-hole + thin exit wall (breakout risk)", () => {
    const r = eng.predict(nominal({ edge_type: "thru_hole_exit", exit_wall_thickness_mm: 0.5 }));
    expect(r.warnings.some(w => /breakout risk|pre-drill|peck/.test(w))).toBe(true);
  });

  it("warns when burr > 2× spec — recommends toolpath re-strategy", () => {
    const r = eng.predict(nominal({ material: "aluminum", feed_per_tooth_mm: 0.5, cutting_speed_m_min: 50, burr_height_spec_um: 20 }));
    expect(r.warnings.some(w => /re-strategize|climb mill/.test(w))).toBe(true);
  });

  it("source cites Gillespie + Aurich + Sandvik + ISO 13715", () => {
    const r = eng.predict(nominal());
    expect(r.source).toMatch(/Gillespie|Aurich|Sandvik|ISO 13715/);
  });
});
