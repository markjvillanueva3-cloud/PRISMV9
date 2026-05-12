/**
 * Tests for CompositeMachiningPhysicsEngine
 *
 * Covers all 8 physics models: Hocheng-Dharan delamination,
 * fiber orientation force, delamination factor, thermal damage,
 * tool wear, surface roughness, chip formation, specific cutting energy.
 */

import { describe, it, expect } from "vitest";
import {
  CompositeMachiningPhysicsEngine,
  COMPOSITE_MATERIAL_DB,
} from "../engines/CompositeMachiningPhysicsEngine.js";

const engine = new CompositeMachiningPhysicsEngine();

// ─── Material Presets ────────────────────────────────────────────

describe("Material Database", () => {
  it("should have 8 material presets", () => {
    const keys = engine.listMaterials();
    expect(keys.length).toBe(8);
  });

  it("all presets return valid properties", () => {
    for (const key of engine.listMaterials()) {
      const mat = engine.getMaterialPreset(key);
      expect(mat).toBeDefined();
      expect(mat!.GIc).toBeGreaterThan(0);
      expect(mat!.E).toBeGreaterThan(0);
      expect(mat!.nu).toBeGreaterThan(0);
      expect(mat!.nu).toBeLessThan(0.5);
      expect(mat!.Vf).toBeGreaterThan(0);
      expect(mat!.Vf).toBeLessThanOrEqual(1);
      expect(mat!.rho).toBeGreaterThan(0);
      expect(mat!.cp).toBeGreaterThan(0);
      expect(mat!.kc_fiber).toBeGreaterThan(0);
      expect(mat!.kc_matrix).toBeGreaterThan(0);
      expect(mat!.wear_K).toBeGreaterThan(0);
      expect(mat!.fiber_diameter_m).toBeGreaterThan(0);
    }
  });

  it("CFRP materials have Tg, MMC/CMC do not", () => {
    expect(COMPOSITE_MATERIAL_DB["CFRP-T300"].Tg).toBe(180);
    expect(COMPOSITE_MATERIAL_DB["CFRP-T700"].Tg).toBe(175);
    expect(COMPOSITE_MATERIAL_DB["MMC-Al-SiC"].Tg).toBeNull();
    expect(COMPOSITE_MATERIAL_DB["CMC-Al2O3-SiCw"].Tg).toBeNull();
  });
});

// ─── Model 1: Hocheng-Dharan Delamination ────────────────────────

describe("Hocheng-Dharan Delamination Model", () => {
  it("CFRP-T300 — known analytical value", () => {
    const mat = COMPOSITE_MATERIAL_DB["CFRP-T300"];
    const h = 0.125e-3; // single ply = 0.125 mm
    const result = engine.hochengDharanDelamination({
      GIc: mat.GIc,
      E: mat.E,
      h,
      nu: mat.nu,
    });
    // Fc = π × √(8 × 250 × 135e9 × (0.125e-3)³ / (3 × (1 - 0.09)))
    // h³ = (1.25e-4)³ = 1.953125e-12
    // numerator = 8 × 250 × 135e9 × 1.953e-12 = 527.34
    // denominator = 3 × 0.91 = 2.73
    // inside sqrt = 527.34 / 2.73 = 193.17
    // Fc = π × √193.17 ≈ π × 13.899 ≈ 43.66 N
    expect(result.Fc_N).toBeGreaterThan(40);
    expect(result.Fc_N).toBeLessThan(50);
    expect(result.D_Nm).toBeGreaterThan(0);
  });

  it("thicker uncut layer → higher critical force", () => {
    const mat = COMPOSITE_MATERIAL_DB["CFRP-T300"];
    const thin = engine.hochengDharanDelamination({
      GIc: mat.GIc, E: mat.E, h: 0.125e-3, nu: mat.nu,
    });
    const thick = engine.hochengDharanDelamination({
      GIc: mat.GIc, E: mat.E, h: 0.5e-3, nu: mat.nu,
    });
    expect(thick.Fc_N).toBeGreaterThan(thin.Fc_N);
  });

  it("higher GIc → higher critical force", () => {
    const r1 = engine.hochengDharanDelamination({
      GIc: 250, E: 135e9, h: 0.25e-3, nu: 0.3,
    });
    const r2 = engine.hochengDharanDelamination({
      GIc: 800, E: 135e9, h: 0.25e-3, nu: 0.3,
    });
    expect(r2.Fc_N).toBeGreaterThan(r1.Fc_N);
  });

  it("rejects invalid inputs", () => {
    expect(() => engine.hochengDharanDelamination({
      GIc: -1, E: 100e9, h: 0.1e-3, nu: 0.3,
    })).toThrow("GIc must be positive");
    expect(() => engine.hochengDharanDelamination({
      GIc: 250, E: 100e9, h: 0.1e-3, nu: 0.5,
    })).toThrow("Poisson");
  });
});

// ─── Model 2: Fiber Orientation Cutting Force ────────────────────

describe("Fiber Orientation Cutting Force", () => {
  it("force varies with fiber angle sweep 0/45/90/135°", () => {
    const angles = [0, 45, 90, 135];
    const forces = angles.map((theta) =>
      engine.fiberOrientationForce({
        theta_deg: theta, Fc0_N: 100,
      }).Fc_N
    );
    // All forces should be positive
    forces.forEach((f) => expect(f).toBeGreaterThan(0));
    // Forces at different angles should differ
    const unique = new Set(forces.map((f) => f.toFixed(4)));
    expect(unique.size).toBeGreaterThan(1);
  });

  it("regime classification is correct", () => {
    expect(engine.fiberOrientationForce({
      theta_deg: 30, Fc0_N: 100,
    }).regime).toBe("clean_cut");
    expect(engine.fiberOrientationForce({
      theta_deg: 90, Fc0_N: 100,
    }).regime).toBe("fiber_bending");
    expect(engine.fiberOrientationForce({
      theta_deg: 120, Fc0_N: 100,
    }).regime).toBe("fiber_bouncing");
  });

  it("chip type classification matches fiber angle", () => {
    expect(engine.fiberOrientationForce({
      theta_deg: 10, Fc0_N: 100,
    }).chip_type).toBe("I_deformation");
    expect(engine.fiberOrientationForce({
      theta_deg: 45, Fc0_N: 100,
    }).chip_type).toBe("II_shearing");
    expect(engine.fiberOrientationForce({
      theta_deg: 90, Fc0_N: 100,
    }).chip_type).toBe("III_bending");
    expect(engine.fiberOrientationForce({
      theta_deg: 150, Fc0_N: 100,
    }).chip_type).toBe("IV_macro_fracture");
  });

  it("zero fiber angle returns clean_cut with near-base force", () => {
    const r = engine.fiberOrientationForce({
      theta_deg: 0, Fc0_N: 100,
    });
    expect(r.regime).toBe("clean_cut");
    // At 0°: sin(0)=0, cos(0)=1 → ratio = 1 + 0 + 0.15 = 1.15
    expect(r.force_ratio).toBeCloseTo(1.15, 2);
  });
});

// ─── Model 3: Delamination Factor ────────────────────────────────

describe("Delamination Factor Prediction", () => {
  it("higher feed → higher delamination factor", () => {
    const low = engine.delaminationFactor({
      feed_mm_rev: 0.02,
      speed_rpm: 3000,
      drill_diameter_mm: 6,
    });
    const high = engine.delaminationFactor({
      feed_mm_rev: 0.15,
      speed_rpm: 3000,
      drill_diameter_mm: 6,
    });
    expect(high.Fd).toBeGreaterThanOrEqual(low.Fd);
    expect(high.thrust_force_N).toBeGreaterThan(low.thrust_force_N);
  });

  it("Fd is always >= 1.0", () => {
    const r = engine.delaminationFactor({
      feed_mm_rev: 0.01,
      speed_rpm: 5000,
      drill_diameter_mm: 3,
    });
    expect(r.Fd).toBeGreaterThanOrEqual(1.0);
  });

  it("Dmax = Fd × Dnom", () => {
    const r = engine.delaminationFactor({
      feed_mm_rev: 0.08,
      speed_rpm: 3000,
      drill_diameter_mm: 8,
    });
    expect(r.Dmax_mm).toBeCloseTo(r.Fd * r.Dnom_mm, 6);
  });
});

// ─── Model 4: Thermal Damage ─────────────────────────────────────

describe("Thermal Damage Model", () => {
  it("detects thermal damage when T > Tg", () => {
    const result = engine.thermalDamage({
      Fc_N: 500,
      Vc_m_min: 200,
      rho: 1580,
      cp: 900,
      chip_area_m2: 0.5e-6,
      Tg: 180,
      eta: 0.4,
    });
    // High force + high speed → large ΔT
    expect(result.delta_T_C).toBeGreaterThan(0);
    // Check structure
    expect(result.T_max_C).toBe(result.delta_T_C + 25);
    expect(result.thermal_damage).toBe(result.T_max_C > 180);
  });

  it("no damage at low speed", () => {
    const result = engine.thermalDamage({
      Fc_N: 50,
      Vc_m_min: 10,
      rho: 1580,
      cp: 900,
      chip_area_m2: 1e-6,
      Tg: 180,
    });
    expect(result.thermal_damage).toBe(false);
    expect(result.margin_C).toBeGreaterThan(0);
  });

  it("zero speed → zero temperature rise", () => {
    const result = engine.thermalDamage({
      Fc_N: 500,
      Vc_m_min: 0,
      rho: 1580,
      cp: 900,
      chip_area_m2: 1e-6,
      Tg: 180,
    });
    expect(result.delta_T_C).toBe(0);
    expect(result.T_max_C).toBe(25);
  });
});

// ─── Model 5: Tool Wear ─────────────────────────────────────────

describe("Composite Tool Wear Model", () => {
  it("CFRP wears faster than GFRP at same conditions", () => {
    const cfrp = COMPOSITE_MATERIAL_DB["CFRP-T300"];
    const gfrp = COMPOSITE_MATERIAL_DB["GFRP-E-glass"];

    const wearCFRP = engine.compositeToolWear({
      Vc_m_min: 100, feed_mm_rev: 0.05,
      cutting_length_m: 10,
      K: cfrp.wear_K, a: cfrp.wear_a,
      b: cfrp.wear_b, c: cfrp.wear_c,
    });
    const wearGFRP = engine.compositeToolWear({
      Vc_m_min: 100, feed_mm_rev: 0.05,
      cutting_length_m: 10,
      K: gfrp.wear_K, a: gfrp.wear_a,
      b: gfrp.wear_b, c: gfrp.wear_c,
    });
    expect(wearCFRP.VB_mm).toBeGreaterThan(wearGFRP.VB_mm);
  });

  it("wear increases with cutting length", () => {
    const mat = COMPOSITE_MATERIAL_DB["CFRP-T300"];
    const short = engine.compositeToolWear({
      Vc_m_min: 100, feed_mm_rev: 0.05,
      cutting_length_m: 5,
      K: mat.wear_K, a: mat.wear_a,
      b: mat.wear_b, c: mat.wear_c,
    });
    const long = engine.compositeToolWear({
      Vc_m_min: 100, feed_mm_rev: 0.05,
      cutting_length_m: 50,
      K: mat.wear_K, a: mat.wear_a,
      b: mat.wear_b, c: mat.wear_c,
    });
    expect(long.VB_mm).toBeGreaterThan(short.VB_mm);
  });

  it("zero speed → zero wear", () => {
    const r = engine.compositeToolWear({
      Vc_m_min: 0, feed_mm_rev: 0.05,
      cutting_length_m: 10,
      K: 2.5e-6, a: 1.2, b: 0.8, c: 0.6,
    });
    expect(r.VB_mm).toBe(0);
    expect(r.remaining_life_fraction).toBe(1.0);
  });
});

// ─── Model 6: Surface Roughness ──────────────────────────────────

describe("Composite Surface Roughness Model", () => {
  it("roughness increases with feed rate", () => {
    const low = engine.compositeSurfaceRoughness({
      feed_mm_rev: 0.05, speed_m_min: 100,
      fiber_angle_deg: 45,
    });
    const high = engine.compositeSurfaceRoughness({
      feed_mm_rev: 0.2, speed_m_min: 100,
      fiber_angle_deg: 45,
    });
    expect(high.Ra_um).toBeGreaterThan(low.Ra_um);
  });

  it("worst roughness near 110° fiber angle (pullout peak)", () => {
    const angles = [0, 45, 90, 110, 135, 170];
    const results = angles.map((a) =>
      engine.compositeSurfaceRoughness({
        feed_mm_rev: 0.1, speed_m_min: 100,
        fiber_angle_deg: a,
      })
    );
    // Find angle with maximum pullout contribution
    const maxPullout = results.reduce((max, r) =>
      r.contributions.fiber_pullout > max.contributions.fiber_pullout
        ? r : max
    );
    expect(maxPullout.contributions.fiber_pullout).toBeGreaterThan(2.0);
  });

  it("tool wear degrades surface", () => {
    const fresh = engine.compositeSurfaceRoughness({
      feed_mm_rev: 0.1, speed_m_min: 100,
      fiber_angle_deg: 45, tool_wear_VB_mm: 0,
    });
    const worn = engine.compositeSurfaceRoughness({
      feed_mm_rev: 0.1, speed_m_min: 100,
      fiber_angle_deg: 45, tool_wear_VB_mm: 0.2,
    });
    expect(worn.Ra_um).toBeGreaterThan(fresh.Ra_um);
    expect(worn.contributions.tool_wear_effect).toBeGreaterThan(0);
  });
});

// ─── Model 7: Chip Formation ─────────────────────────────────────

describe("Chip Formation Classification", () => {
  it("classifies all four types correctly", () => {
    const cases: Array<[number, string]> = [
      [5, "I_deformation"],
      [45, "II_shearing"],
      [90, "III_bending"],
      [150, "IV_macro_fracture"],
    ];
    for (const [angle, expected] of cases) {
      const r = engine.chipFormation({
        fiber_angle_deg: angle,
        depth_of_cut_mm: 0.5,
        fiber_diameter_m: 7e-6,
      });
      expect(r.chip_type).toBe(expected);
      expect(r.mechanism.length).toBeGreaterThan(10);
      expect(r.recommendation.length).toBeGreaterThan(10);
    }
  });

  it("subsurface damage increases with angle", () => {
    const angles = [5, 45, 90, 150];
    const severities = angles.map((a) =>
      engine.chipFormation({
        fiber_angle_deg: a,
        depth_of_cut_mm: 0.5,
        fiber_diameter_m: 7e-6,
      }).subsurface_damage_severity
    );
    // Each subsequent angle should have higher damage
    for (let i = 1; i < severities.length; i++) {
      expect(severities[i]).toBeGreaterThan(severities[i - 1]);
    }
  });

  it("severity is clamped to [0, 1]", () => {
    const r = engine.chipFormation({
      fiber_angle_deg: 170,
      depth_of_cut_mm: 10,
      fiber_diameter_m: 1e-6,
    });
    expect(r.subsurface_damage_severity).toBeLessThanOrEqual(1.0);
    expect(r.subsurface_damage_severity).toBeGreaterThanOrEqual(0);
  });
});

// ─── Model 8: Specific Cutting Energy ────────────────────────────

describe("Specific Cutting Energy", () => {
  it("CFRP-T300 composite energy matches rule of mixtures", () => {
    const mat = COMPOSITE_MATERIAL_DB["CFRP-T300"];
    const r = engine.specificCuttingEnergy({
      Vf: mat.Vf,
      kc_fiber: mat.kc_fiber,
      kc_matrix: mat.kc_matrix,
      kc_interface: mat.kc_interface,
    });
    const expected = mat.Vf * mat.kc_fiber
      + (1 - mat.Vf) * mat.kc_matrix
      + mat.kc_interface;
    expect(r.kc_composite).toBeCloseTo(expected, 0);
    // Fractions should sum to 1
    const sum = r.fiber_fraction
      + r.matrix_fraction + r.interface_fraction;
    expect(sum).toBeCloseTo(1.0, 6);
  });

  it("100% fiber fraction → only fiber + interface", () => {
    const r = engine.specificCuttingEnergy({
      Vf: 1.0,
      kc_fiber: 1000e6,
      kc_matrix: 200e6,
      kc_interface: 50e6,
    });
    expect(r.kc_composite).toBe(1000e6 + 50e6);
    expect(r.matrix_fraction).toBeCloseTo(0, 6);
  });

  it("0% fiber fraction → only matrix + interface", () => {
    const r = engine.specificCuttingEnergy({
      Vf: 0,
      kc_fiber: 1000e6,
      kc_matrix: 200e6,
      kc_interface: 50e6,
    });
    expect(r.kc_composite).toBe(200e6 + 50e6);
    expect(r.fiber_fraction).toBeCloseTo(0, 6);
  });

  it("rejects Vf outside [0, 1]", () => {
    expect(() => engine.specificCuttingEnergy({
      Vf: 1.5,
      kc_fiber: 1000e6,
      kc_matrix: 200e6,
      kc_interface: 50e6,
    })).toThrow("volume fraction");
  });
});

// ─── Cross-Model Consistency ─────────────────────────────────────

describe("Cross-Model Consistency", () => {
  it("higher thrust force → higher delamination factor", () => {
    // Low feed → low thrust → low Fd
    const low = engine.delaminationFactor({
      feed_mm_rev: 0.02,
      speed_rpm: 3000,
      drill_diameter_mm: 6,
      material_key: "CFRP-T300",
    });
    // High feed → high thrust → high Fd
    const high = engine.delaminationFactor({
      feed_mm_rev: 0.2,
      speed_rpm: 3000,
      drill_diameter_mm: 6,
      material_key: "CFRP-T300",
    });
    expect(high.thrust_force_N).toBeGreaterThan(
      low.thrust_force_N
    );
    expect(high.Fd).toBeGreaterThanOrEqual(low.Fd);
  });

  it("MMC harder to cut than GFRP (higher kc)", () => {
    const mmc = COMPOSITE_MATERIAL_DB["MMC-Al-SiC"];
    const gfrp = COMPOSITE_MATERIAL_DB["GFRP-E-glass"];
    const rMmc = engine.specificCuttingEnergy({
      Vf: mmc.Vf,
      kc_fiber: mmc.kc_fiber,
      kc_matrix: mmc.kc_matrix,
      kc_interface: mmc.kc_interface,
    });
    const rGfrp = engine.specificCuttingEnergy({
      Vf: gfrp.Vf,
      kc_fiber: gfrp.kc_fiber,
      kc_matrix: gfrp.kc_matrix,
      kc_interface: gfrp.kc_interface,
    });
    expect(rMmc.kc_composite).toBeGreaterThan(
      rGfrp.kc_composite
    );
  });
});
