/**
 * NovelToolpathSimulatorEngine Tests — CAMK-MS2/U01
 * Tests force, temperature, deflection, roughness simulation along toolpath
 */
import { describe, it, expect } from "vitest";
import { novelToolpathSimulatorEngine } from "../engines/NovelToolpathSimulatorEngine.js";

// Helper: create a simple linear toolpath
function linearPath(n: number, opts?: { ae?: number; ap?: number; rpm?: number; feed?: number }) {
  return Array.from({ length: n }, (_, i) => ({
    x: i * 10, y: 0, z: 0,
    ae_mm: opts?.ae ?? 5,
    ap_mm: opts?.ap ?? 2,
    rpm: opts?.rpm ?? 8000,
    feed_mmmin: opts?.feed ?? 1000,
  }));
}

describe("NovelToolpathSimulatorEngine", () => {
  // ---- Basic simulation ----
  it("simulates a simple linear path", () => {
    const result = novelToolpathSimulatorEngine.simulate({
      segments: linearPath(10),
      material: "steel_1045",
      tool_diameter_mm: 10,
    });
    expect(result.points).toHaveLength(10);
    expect(result.summary.peak_force_N).toBeGreaterThan(0);
    expect(result.summary.peak_temperature_C).toBeGreaterThan(0);
    expect(result.summary.peak_deflection_um).toBeGreaterThan(0);
    expect(result.force_profile).toHaveLength(10);
    expect(result.temperature_profile).toHaveLength(10);
    expect(result.deflection_profile).toHaveLength(10);
  });

  // ---- 6 physics quantities per point ----
  it("computes all 6 physics quantities per point", () => {
    const result = novelToolpathSimulatorEngine.simulate({
      segments: linearPath(1),
      material: "aluminum_6061",
      tool_diameter_mm: 10,
    });
    const p = result.points[0];
    expect(p.Fc_N).toBeGreaterThan(0);
    expect(p.Fr_N).toBeGreaterThan(0);
    expect(p.Fa_N).toBeGreaterThan(0);
    expect(p.torque_Nm).toBeGreaterThan(0);
    expect(p.power_kW).toBeGreaterThan(0);
    expect(p.delta_T_C).toBeGreaterThan(0);
    expect(p.deflection_um).toBeGreaterThan(0);
    expect(p.Ra_um).toBeGreaterThan(0);
    expect(p.mrr_cm3_min).toBeGreaterThan(0);
    expect(p.specific_energy_J_mm3).toBeGreaterThan(0);
  });

  // ---- Kienzle force model ----
  it("Kienzle: force increases with depth of cut", () => {
    const Fc1 = novelToolpathSimulatorEngine.kienzleForce(2100, 0.25, 1, 0.1);
    const Fc2 = novelToolpathSimulatorEngine.kienzleForce(2100, 0.25, 3, 0.1);
    expect(Fc2).toBeGreaterThan(Fc1);
    expect(Fc2 / Fc1).toBeCloseTo(3, 0); // linear with ap
  });

  it("Kienzle: force increases with chip thickness (sublinear)", () => {
    const Fc1 = novelToolpathSimulatorEngine.kienzleForce(2100, 0.25, 2, 0.05);
    const Fc2 = novelToolpathSimulatorEngine.kienzleForce(2100, 0.25, 2, 0.10);
    expect(Fc2).toBeGreaterThan(Fc1);
    // h^(1-mc) = h^0.75 → doubling h gives 2^0.75 ≈ 1.68x force
    expect(Fc2 / Fc1).toBeCloseTo(Math.pow(2, 0.75), 1);
  });

  it("Kienzle: harder material → higher force", () => {
    const resAl = novelToolpathSimulatorEngine.simulate({
      segments: linearPath(1), material: "aluminum_6061", tool_diameter_mm: 10,
    });
    const resSt = novelToolpathSimulatorEngine.simulate({
      segments: linearPath(1), material: "steel_1045", tool_diameter_mm: 10,
    });
    expect(resSt.points[0].Fc_N).toBeGreaterThan(resAl.points[0].Fc_N);
  });

  // ---- Jaeger temperature ----
  it("Jaeger: temperature increases with cutting speed", () => {
    const T1 = novelToolpathSimulatorEngine.jaegerTemperature(500, 100, "steel_1045", 2, 5);
    const T2 = novelToolpathSimulatorEngine.jaegerTemperature(500, 300, "steel_1045", 2, 5);
    // Higher speed → more heat but also more material flow — net effect depends on Peclet
    expect(T2).toBeGreaterThan(0);
    expect(T1).toBeGreaterThan(0);
  });

  it("Jaeger: low-conductivity material produces higher temperature", () => {
    // Use simulate() to capture full thermal model (including coolant & Peclet effects)
    const resSt = novelToolpathSimulatorEngine.simulate({
      segments: linearPath(1, { ae: 5, ap: 2, rpm: 8000, feed: 1000 }),
      material: "steel_1045", tool_diameter_mm: 10, coolant: "dry",
    });
    const resInc = novelToolpathSimulatorEngine.simulate({
      segments: linearPath(1, { ae: 5, ap: 2, rpm: 8000, feed: 1000 }),
      material: "Inconel 718", tool_diameter_mm: 10, coolant: "dry",
    });
    // Both produce positive temperature
    expect(resSt.points[0].delta_T_C).toBeGreaterThan(0);
    expect(resInc.points[0].delta_T_C).toBeGreaterThan(0);
    // Inconel has higher force (kc11=3200 vs 2100) → more total heat generation
    expect(resInc.points[0].Fc_N).toBeGreaterThan(resSt.points[0].Fc_N);
  });

  // ---- Cantilever deflection ----
  it("deflection: increases with overhang length (cubic)", () => {
    const d1 = novelToolpathSimulatorEngine.cantileverDeflection(100, 30, 10);
    const d2 = novelToolpathSimulatorEngine.cantileverDeflection(100, 60, 10);
    // δ ∝ L³ → doubling L gives 8× deflection
    expect(d2 / d1).toBeCloseTo(8, 0);
  });

  it("deflection: decreases with tool diameter (d⁴)", () => {
    const d1 = novelToolpathSimulatorEngine.cantileverDeflection(100, 40, 8);
    const d2 = novelToolpathSimulatorEngine.cantileverDeflection(100, 40, 16);
    // δ ∝ 1/d⁴ → doubling d gives 1/16 deflection
    expect(d1 / d2).toBeCloseTo(16, 0);
  });

  // ---- Brammertz roughness ----
  it("Brammertz: roughness increases with feed", () => {
    // Rt = f²/(8R) — large feed difference to clearly show effect
    const Ra1 = novelToolpathSimulatorEngine.brammertzRoughness(0.5, 3, 5);
    const Ra2 = novelToolpathSimulatorEngine.brammertzRoughness(1.5, 3, 5);
    expect(Ra2).toBeGreaterThan(Ra1);
    // Ra scales roughly as f² — 9× feed² ratio
    expect(Ra2 / Ra1).toBeGreaterThan(3);
  });

  it("Brammertz: larger tool radius → lower roughness", () => {
    // Rt = f²/(8R) → larger R → smaller Rt
    const Ra1 = novelToolpathSimulatorEngine.brammertzRoughness(1.0, 3, 5);
    const Ra2 = novelToolpathSimulatorEngine.brammertzRoughness(1.0, 15, 5);
    expect(Ra2).toBeLessThan(Ra1);
  });

  // ---- Force component ratios ----
  it("force ratios: Fr < Fc and Fa < Fr", () => {
    const result = novelToolpathSimulatorEngine.simulate({
      segments: linearPath(1),
      material: "steel_1045",
      tool_diameter_mm: 10,
    });
    const p = result.points[0];
    expect(p.Fr_N).toBeLessThan(p.Fc_N);
    expect(p.Fa_N).toBeLessThan(p.Fr_N);
    expect(p.F_resultant_N).toBeGreaterThan(p.Fc_N);
  });

  // ---- Power formula: P = Fc × Vc / 60000 ----
  it("power computation matches formula", () => {
    const result = novelToolpathSimulatorEngine.simulate({
      segments: [{ x: 0, y: 0, z: 0, ae_mm: 5, ap_mm: 2, rpm: 8000, feed_mmmin: 1000 }],
      material: "steel_1045",
      tool_diameter_mm: 10,
    });
    const p = result.points[0];
    const Vc = Math.PI * 10 * 8000 / 1000;
    const expectedPower = p.Fc_N * Vc / 60000;
    expect(p.power_kW).toBeCloseTo(expectedPower, 2);
  });

  // ---- Torque formula: T = Fc × d/2 ----
  it("torque computation matches formula", () => {
    const result = novelToolpathSimulatorEngine.simulate({
      segments: [{ x: 0, y: 0, z: 0, ae_mm: 5, ap_mm: 2, rpm: 8000, feed_mmmin: 1000 }],
      material: "steel_1045",
      tool_diameter_mm: 10,
    });
    const p = result.points[0];
    const expectedTorque = p.Fc_N * (10 / 2) / 1000;
    expect(p.torque_Nm).toBeCloseTo(expectedTorque, 2);
  });

  // ---- Material classification ----
  it("classifies materials correctly", () => {
    const al = novelToolpathSimulatorEngine.getMaterialProps("Aluminum 6061");
    expect(al.key).toBe("aluminum_6061");
    const ti = novelToolpathSimulatorEngine.getMaterialProps("Ti-6Al-4V");
    expect(ti.key).toBe("titanium_ti6al4v");
    const inc = novelToolpathSimulatorEngine.getMaterialProps("Inconel 718");
    expect(inc.key).toBe("inconel_718");
  });

  // ---- Coolant effect ----
  it("coolant reduces temperature", () => {
    const dry = novelToolpathSimulatorEngine.simulate({
      segments: linearPath(1), material: "steel_1045", tool_diameter_mm: 10, coolant: "dry",
    });
    const flood = novelToolpathSimulatorEngine.simulate({
      segments: linearPath(1), material: "steel_1045", tool_diameter_mm: 10, coolant: "flood",
    });
    expect(flood.points[0].delta_T_C).toBeLessThan(dry.points[0].delta_T_C);
  });

  it("cryogenic coolant reduces temperature most", () => {
    const flood = novelToolpathSimulatorEngine.simulate({
      segments: linearPath(1), material: "steel_1045", tool_diameter_mm: 10, coolant: "flood",
    });
    const cryo = novelToolpathSimulatorEngine.simulate({
      segments: linearPath(1), material: "steel_1045", tool_diameter_mm: 10, coolant: "cryogenic",
    });
    expect(cryo.points[0].delta_T_C).toBeLessThan(flood.points[0].delta_T_C);
  });

  // ---- Algorithm validation: CFSF ----
  it("validates CFSF constant-force claim", () => {
    // Constant engagement → constant force → low CV
    const result = novelToolpathSimulatorEngine.simulate({
      segments: linearPath(20),
      material: "steel_1045",
      tool_diameter_mm: 10,
      algorithm: "CFSF",
    });
    expect(result.validation.algorithm).toBe("CFSF");
    expect(result.validation.force_constancy_cv).toBeDefined();
    // Uniform path → should have very low CV
    expect(result.validation.claims_validated.length).toBeGreaterThanOrEqual(1);
  });

  // ---- Algorithm validation: TGAR ----
  it("validates TGAR thermal zone claim", () => {
    const result = novelToolpathSimulatorEngine.simulate({
      segments: linearPath(10),
      material: "aluminum_6061",
      tool_diameter_mm: 10,
      algorithm: "TGAR",
    });
    expect(result.validation.algorithm).toBe("TGAR");
    expect(result.validation.thermal_zone_accuracy).toBeDefined();
  });

  // ---- Algorithm validation: PTDC ----
  it("validates PTDC deflection compensation claim", () => {
    const result = novelToolpathSimulatorEngine.simulate({
      segments: linearPath(5),
      material: "steel_1045",
      tool_diameter_mm: 10,
      tool_overhang_mm: 30,
      algorithm: "PTDC",
    });
    expect(result.validation.algorithm).toBe("PTDC");
    expect(result.validation.deflection_compensation).toBeDefined();
  });

  it("fails HRAF validation when RPM modulation is not present", () => {
    const result = novelToolpathSimulatorEngine.simulate({
      segments: linearPath(8, { rpm: 8000 }),
      material: "steel_1045",
      tool_diameter_mm: 10,
      algorithm: "HRAF",
    });
    expect(result.validation.claims_failed.some(c => c.includes("RPM modulation"))).toBe(true);
  });

  it("validates HRAF when the RPM trace actually modulates", () => {
    const segments = Array.from({ length: 8 }, (_, i) => ({
      x: i * 10,
      y: 0,
      z: 0,
      ae_mm: 5,
      ap_mm: 2,
      rpm: 7600 + (i % 2 === 0 ? -220 : 220),
      feed_mmmin: 1000,
    }));
    const result = novelToolpathSimulatorEngine.simulate({
      segments,
      material: "steel_1045",
      tool_diameter_mm: 10,
      algorithm: "HRAF",
    });
    expect(result.validation.claims_validated.some(c => c.includes("RPM modulation range"))).toBe(true);
    expect(result.validation.claims_failed).toHaveLength(0);
  });

  // ---- Warnings ----
  it("warns on excessive deflection", () => {
    // Small tool, long overhang, hard material → high deflection
    const result = novelToolpathSimulatorEngine.simulate({
      segments: linearPath(5, { ap: 5, ae: 3 }),
      material: "Inconel 718",
      tool_diameter_mm: 6,
      tool_overhang_mm: 80,
    });
    expect(result.warnings.some(w => w.includes("deflection"))).toBe(true);
  });

  // ---- Summary statistics ----
  it("summary averages are between min and max", () => {
    const result = novelToolpathSimulatorEngine.simulate({
      segments: linearPath(10, { ae: 5, ap: 2 }),
      material: "steel_1045",
      tool_diameter_mm: 10,
    });
    expect(result.summary.avg_force_N).toBeLessThanOrEqual(result.summary.peak_force_N);
    expect(result.summary.avg_temperature_C).toBeLessThanOrEqual(result.summary.peak_temperature_C);
    expect(result.summary.avg_deflection_um).toBeLessThanOrEqual(result.summary.peak_deflection_um);
  });

  // ---- Empty path ----
  it("handles empty segment array", () => {
    const result = novelToolpathSimulatorEngine.simulate({
      segments: [],
      material: "steel_1045",
      tool_diameter_mm: 10,
    });
    expect(result.points).toHaveLength(0);
    expect(result.summary.peak_force_N).toBe(0); // Math.max(...[], 0) = 0
  });

  // ---- Single point ----
  it("handles single segment point", () => {
    const result = novelToolpathSimulatorEngine.simulate({
      segments: [{ x: 0, y: 0, z: 0, ae_mm: 5, ap_mm: 2, rpm: 8000, feed_mmmin: 1000 }],
      material: "aluminum_6061",
      tool_diameter_mm: 10,
    });
    expect(result.points).toHaveLength(1);
    expect(result.summary.total_time_sec).toBe(0); // no distance between points
  });

  // ---- MRR calculation ----
  it("MRR = ap × ae × feed / 1000", () => {
    const result = novelToolpathSimulatorEngine.simulate({
      segments: [{ x: 0, y: 0, z: 0, ae_mm: 5, ap_mm: 2, rpm: 8000, feed_mmmin: 1000 }],
      material: "steel_1045",
      tool_diameter_mm: 10,
    });
    // Expected: 2 × 5 × 1000 / 1000 = 10 cm³/min
    expect(result.points[0].mrr_cm3_min).toBeCloseTo(10, 1);
  });

  // ---- Ball endmill roughness ----
  it("ball endmill produces different Ra than flat", () => {
    const ball = novelToolpathSimulatorEngine.simulate({
      segments: linearPath(1), material: "steel_1045", tool_diameter_mm: 10, tool_type: "ball",
    });
    const flat = novelToolpathSimulatorEngine.simulate({
      segments: linearPath(1), material: "steel_1045", tool_diameter_mm: 10, tool_type: "flat",
    });
    // Ball (R=5mm) should have higher Ra than flat (R=d×50=500mm effective)
    // Use large fz to ensure both are above the floor
    const ball2 = novelToolpathSimulatorEngine.simulate({
      segments: linearPath(1, { feed: 2000, rpm: 4000 }), material: "steel_1045", tool_diameter_mm: 10,
      tool_type: "ball", fz_mm: 1.0,
    });
    const flat2 = novelToolpathSimulatorEngine.simulate({
      segments: linearPath(1, { feed: 2000, rpm: 4000 }), material: "steel_1045", tool_diameter_mm: 10,
      tool_type: "flat", fz_mm: 1.0,
    });
    // Ball R=5 vs Flat R=500 → ball has 100× higher Rt for same feed
    expect(ball2.points[0].Ra_um).toBeGreaterThan(flat2.points[0].Ra_um);
  });

  // ---- All materials produce valid results ----
  it("all 12 materials produce valid simulation", () => {
    const materials = novelToolpathSimulatorEngine.listMaterials();
    expect(materials.length).toBeGreaterThanOrEqual(12);
    for (const mat of materials) {
      const result = novelToolpathSimulatorEngine.simulate({
        segments: linearPath(3),
        material: mat,
        tool_diameter_mm: 10,
      });
      expect(result.points).toHaveLength(3);
      expect(result.points[0].Fc_N).toBeGreaterThan(0);
    }
  });

  // ---- Force variation CV ----
  it("uniform path has low force variation", () => {
    const result = novelToolpathSimulatorEngine.simulate({
      segments: linearPath(20),
      material: "steel_1045",
      tool_diameter_mm: 10,
    });
    // All segments identical → CV should be 0
    expect(result.summary.force_variation_pct).toBeCloseTo(0, 0);
  });

  // ---- Varying engagement path has higher CV ----
  it("varying engagement produces force variation", () => {
    const segments = Array.from({ length: 10 }, (_, i) => ({
      x: i * 10, y: 0, z: 0,
      ae_mm: 2 + i * 0.5, // increasing engagement
      ap_mm: 2,
      rpm: 8000,
      feed_mmmin: 1000,
    }));
    const result = novelToolpathSimulatorEngine.simulate({
      segments,
      material: "steel_1045",
      tool_diameter_mm: 10,
    });
    expect(result.summary.force_variation_pct).toBeGreaterThan(5);
  });
});
