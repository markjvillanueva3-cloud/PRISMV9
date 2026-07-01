/**
 * Batch 94 — PultrusionProcess, AutoclaveProcess, PeristalticPump
 * @milestone FORGE-ENGINES-BATCH94
 */
import { describe, it, expect } from "vitest";
import { pultrusionProcessEngine } from "../engines/PultrusionProcessEngine.js";
import { autoclaveProcessEngine } from "../engines/AutoclaveProcessEngine.js";
import { peristalticPumpEngine } from "../engines/PeristalticPumpEngine.js";

describe("PultrusionProcessEngine", () => {
  const base = { cross_section_area_mm2: 500, perimeter_mm: 100 };
  it("pull force > 0", () => {
    expect(pultrusionProcessEngine.calculate(base).pull_force_kN.value).toBeGreaterThan(0);
  });
  it("degree of cure > 0", () => {
    expect(pultrusionProcessEngine.calculate(base).degree_of_cure_pct.value).toBeGreaterThan(0);
  });
  it("slower speed → higher cure", () => {
    const c1 = pultrusionProcessEngine.calculate({ ...base, line_speed_m_min: 1.0 }).degree_of_cure_pct.value;
    const c02 = pultrusionProcessEngine.calculate({ ...base, line_speed_m_min: 0.2 }).degree_of_cure_pct.value;
    expect(c02).toBeGreaterThan(c1);
  });
  it("production rate > 0", () => {
    expect(pultrusionProcessEngine.calculate(base).production_rate_m_h.value).toBeGreaterThan(0);
  });
  it("wetout index between 0-1", () => {
    const w = pultrusionProcessEngine.calculate(base).wetout_index.value;
    expect(w).toBeGreaterThan(0);
    expect(w).toBeLessThanOrEqual(1);
  });
  it("recommendations is array", () => {
    expect(Array.isArray(pultrusionProcessEngine.calculate(base).recommendations)).toBe(true);
  });
});

describe("AutoclaveProcessEngine", () => {
  const base = { part_thickness_mm: 3 };
  it("total cycle > 0", () => {
    expect(autoclaveProcessEngine.calculate(base).total_cycle_h.value).toBeGreaterThan(0);
  });
  it("degree of cure > 90% for standard", () => {
    expect(autoclaveProcessEngine.calculate(base).degree_of_cure_pct.value).toBeGreaterThan(90);
  });
  it("void content < 5%", () => {
    expect(autoclaveProcessEngine.calculate(base).void_content_pct.value).toBeLessThan(5);
  });
  it("Tg final > 100°C", () => {
    expect(autoclaveProcessEngine.calculate(base).Tg_final_C.value).toBeGreaterThan(100);
  });
  it("thicker part → longer cycle", () => {
    const t3 = autoclaveProcessEngine.calculate(base).total_cycle_h.value;
    const t15 = autoclaveProcessEngine.calculate({ ...base, part_thickness_mm: 15 }).total_cycle_h.value;
    expect(t15).toBeGreaterThan(t3);
  });
  it("recommendations is array", () => {
    expect(Array.isArray(autoclaveProcessEngine.calculate(base).recommendations)).toBe(true);
  });
});

describe("PeristalticPumpEngine", () => {
  const base = { tube_id_mm: 6 };
  it("flow rate > 0", () => {
    expect(peristalticPumpEngine.calculate(base).flow_rate_mL_min.value).toBeGreaterThan(0);
  });
  it("more rollers → less pulsation", () => {
    const p2 = peristalticPumpEngine.calculate({ ...base, roller_count: 2 }).pulsation_pct.value;
    const p6 = peristalticPumpEngine.calculate({ ...base, roller_count: 6 }).pulsation_pct.value;
    expect(p6).toBeLessThan(p2);
  });
  it("tube life > 0", () => {
    expect(peristalticPumpEngine.calculate(base).tube_life_hours.value).toBeGreaterThan(0);
  });
  it("higher RPM → more flow", () => {
    const f50 = peristalticPumpEngine.calculate({ ...base, rpm: 50 }).flow_rate_mL_min.value;
    const f200 = peristalticPumpEngine.calculate({ ...base, rpm: 200 }).flow_rate_mL_min.value;
    expect(f200).toBeGreaterThan(f50);
  });
  it("power > 0", () => {
    expect(peristalticPumpEngine.calculate(base).power_W.value).toBeGreaterThan(0);
  });
  it("recommendations is array", () => {
    expect(Array.isArray(peristalticPumpEngine.calculate(base).recommendations)).toBe(true);
  });
});
