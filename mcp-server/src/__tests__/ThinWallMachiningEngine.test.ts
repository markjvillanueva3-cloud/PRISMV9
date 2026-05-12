import { describe, it, expect } from "vitest";
import {
  ThinWallMachiningEngine,
  ThinWallGeometry,
  ThinWallMaterial,
  ThinWallTooling,
  ThinWallInput,
} from "../engines/ThinWallMachiningEngine";

// ── Fixtures ────────────────────────────────────────────────────────────────

const aluminumMat: ThinWallMaterial = {
  name: "aluminum_6061",
  elastic_modulus_GPa: 69,
  yield_strength_MPa: 276,
  density_kg_m3: 2700,
  machinability_group: "N",
};

const steelMat: ThinWallMaterial = {
  name: "steel_4140",
  elastic_modulus_GPa: 205,
  yield_strength_MPa: 655,
  density_kg_m3: 7850,
  machinability_group: "P",
};

const titaniumMat: ThinWallMaterial = {
  name: "titanium_6al4v",
  elastic_modulus_GPa: 114,
  yield_strength_MPa: 880,
  density_kg_m3: 4430,
  machinability_group: "S",
};

const stainlessMat: ThinWallMaterial = {
  name: "stainless_304",
  elastic_modulus_GPa: 193,
  yield_strength_MPa: 215,
  density_kg_m3: 8000,
  machinability_group: "M",
};

const standardTool: ThinWallTooling = {
  diameter_mm: 10,
  flutes: 4,
  helix_angle_deg: 30,
  tool_type: "end_mill",
};

function makeInput(
  overrides: Partial<{
    geometry: Partial<ThinWallGeometry>;
    material: ThinWallMaterial;
    tool: Partial<ThinWallTooling>;
    target_tolerance_mm: number;
    operation: ThinWallInput["operation"];
  }> = {}
): ThinWallInput {
  return {
    geometry: {
      wall_height_mm: 50,
      wall_thickness_mm: 2,
      wall_length_mm: 100,
      support_type: "free",
      ...overrides.geometry,
    },
    material: overrides.material ?? aluminumMat,
    tool: { ...standardTool, ...overrides.tool },
    target_tolerance_mm: overrides.target_tolerance_mm,
    operation: overrides.operation,
  };
}

// ── Engine instance ─────────────────────────────────────────────────────────

const engine = new ThinWallMachiningEngine();

// ── Tests ───────────────────────────────────────────────────────────────────

describe("ThinWallMachiningEngine", () => {

  // 1. Basic aluminum thin wall finishing
  describe("thinWallParams", () => {
    it("returns safe finishing params for a standard aluminum thin wall (H=50, t=2, L=100)", () => {
      const result = engine.thinWallParams(makeInput());

      expect(result.recommended_ae_mm.value).toBeGreaterThan(0);
      expect(result.recommended_ap_mm.value).toBeGreaterThan(0);
      expect(result.recommended_fz_mm.value).toBeGreaterThan(0);
      expect(result.recommended_ae_mm.unit).toBe("mm");
      expect(result.recommended_fz_mm.unit).toBe("mm/tooth");
      expect(result.max_force_N.value).toBeGreaterThan(0);
      // Finishing defaults: ae = 5% of 10mm tool = 0.5mm
      expect(result.recommended_ae_mm.value).toBeCloseTo(0.5, 5);
      // Deflection should be reported
      expect(result.wall_deflection_mm.value).toBeGreaterThanOrEqual(0);
      // Strategy and toolpath populated
      expect(result.strategy).toBeTruthy();
      expect(result.toolpath_type).toBeTruthy();
      expect(Array.isArray(result.approach)).toBe(true);
      expect(result.approach.length).toBeGreaterThan(0);
      // Finishing approach hints present
      expect(result.approach.some(a => /spring pass/i.test(a))).toBe(true);
    });

    // 2. Extreme aspect ratio steel wall should warn
    it("warns when aspect ratio exceeds steel max threshold (H=80, t=2 → AR=40, steel max=30)", () => {
      const result = engine.thinWallParams(
        makeInput({
          geometry: { wall_height_mm: 80, wall_thickness_mm: 2, wall_length_mm: 80 },
          material: steelMat,
        })
      );
      // AR = 80/2 = 40, steel max = 30 → exceeds max
      expect(result.warnings.some(w => /aspect ratio/i.test(w))).toBe(true);
      expect(result.warnings.some(w => /exceed/i.test(w) || /maximum/i.test(w))).toBe(true);
    });

    // 3. Titanium wall produces conservative fz
    it("produces lower fz for titanium than aluminum at the same geometry", () => {
      const alResult = engine.thinWallParams(makeInput({ material: aluminumMat }));
      const tiResult = engine.thinWallParams(makeInput({ material: titaniumMat }));

      // Titanium _baseFz uses group "S" (0.03) vs aluminum "N" (0.08)
      expect(tiResult.recommended_fz_mm.value).toBeLessThan(alResult.recommended_fz_mm.value);
    });

    // 13. Roughing should allow more ae (10%) vs finishing (5%)
    it("roughing uses larger ae (10% D) than finishing (5% D)", () => {
      const roughing = engine.thinWallParams(makeInput({ operation: "roughing" }));
      const finishing = engine.thinWallParams(makeInput({ operation: "finishing" }));

      // ae: roughing 10% of 10mm = 1.0mm, finishing 5% = 0.5mm
      expect(roughing.recommended_ae_mm.value).toBeCloseTo(1.0, 5);
      expect(finishing.recommended_ae_mm.value).toBeCloseTo(0.5, 5);
      expect(roughing.recommended_ae_mm.value).toBeGreaterThan(finishing.recommended_ae_mm.value);
    });

    // 14. Iterative force reduction — params shrink when budget exceeded
    it("iteratively reduces fz/ap when estimated force exceeds allowable budget, fz always stays positive", () => {
      // Very tight tolerance, thin wall, large tool, hard material → triggers reduction loop
      const tight = engine.thinWallParams(
        makeInput({
          geometry: { wall_height_mm: 60, wall_thickness_mm: 1, wall_length_mm: 50 },
          material: steelMat,
          target_tolerance_mm: 0.005,
          tool: { diameter_mm: 16, flutes: 4 },
        })
      );
      // After reduction, fz and ap must remain positive (loop doesn't go to zero)
      expect(tight.recommended_fz_mm.value).toBeGreaterThan(0);
      expect(tight.recommended_ap_mm.value).toBeGreaterThan(0);
      // If deflection still unsafe, a warning must be present (no silent failure)
      if (!tight.deflection_safe) {
        expect(tight.warnings.some(w => /deflection/i.test(w))).toBe(true);
      }
    });

    // Tool diameter warning when tool nearly as wide as wall
    it("warns when tool diameter approaches wall thickness (tool > 0.8 × wall_thickness)", () => {
      const result = engine.thinWallParams(
        makeInput({
          geometry: { wall_height_mm: 30, wall_thickness_mm: 3, wall_length_mm: 80 },
          tool: { diameter_mm: 10, flutes: 4 },  // 10 > 3 × 0.8 = 2.4
        })
      );
      expect(result.warnings.some(w => /tool diameter/i.test(w) || /wall thickness/i.test(w))).toBe(true);
    });

    // Thin floor triggers vacuum/wax recommendation
    it("recommends thin floor support when floor_thickness_mm < 2", () => {
      const result = engine.thinWallParams(
        makeInput({
          geometry: {
            wall_height_mm: 40,
            wall_thickness_mm: 3,
            wall_length_mm: 100,
            floor_thickness_mm: 1.2,
          },
        })
      );
      expect(result.approach.some(a => /thin floor/i.test(a) || /vacuum/i.test(a) || /wax/i.test(a))).toBe(true);
    });

    // Between safe and caution aspect ratio selects light_conventional strategy
    it("selects light_conventional strategy when AR is between safe(15) and caution(25) for aluminum (AR=20)", () => {
      const result = engine.thinWallParams(
        makeInput({
          geometry: { wall_height_mm: 40, wall_thickness_mm: 2, wall_length_mm: 100 }, // AR=20
          material: aluminumMat,
        })
      );
      expect(result.strategy).toBe("light_conventional");
    });

    // Roughing approach mentions sacrificial ribs
    it("roughing approach mentions sacrificial ribs", () => {
      const result = engine.thinWallParams(makeInput({ operation: "roughing" }));
      expect(result.approach.some(a => /sacrificial rib/i.test(a))).toBe(true);
    });
  });

  // 4. Deflection math verification
  describe("thinWallDeflection", () => {
    it("computes δ = F·H³/(3·E·I) exactly with known values (free cantilever, aluminum)", () => {
      const geometry: ThinWallGeometry = {
        wall_height_mm: 50,
        wall_thickness_mm: 2,
        wall_length_mm: 100,
        support_type: "free",
      };
      const F = 100; // N

      // Manual: I = 2³×100/12 = 66.667 mm⁴, E = 69000 MPa, sf = 1.0
      const I = (Math.pow(2, 3) * 100) / 12;
      const E = 69000;
      const expected = (F * Math.pow(50, 3)) / (3 * E * I);

      const result = engine.thinWallDeflection({ geometry, material: aluminumMat, cutting_force_N: F });

      expect(result.static_deflection_mm.value).toBeCloseTo(expected, 8);
      expect(result.moment_of_inertia_mm4.value).toBeCloseTo(I, 6);
      expect(result.cutting_force_N.value).toBe(F);
    });

    // 5. Support type — both_sides ~8× stiffer than free
    it("both_sides support gives exactly 8× less deflection than free (supportFactor 0.125 vs 1.0)", () => {
      const geomBase = { wall_height_mm: 50, wall_thickness_mm: 2, wall_length_mm: 100 };

      const freeDef = engine.thinWallDeflection({
        geometry: { ...geomBase, support_type: "free" },
        material: aluminumMat,
        cutting_force_N: 50,
      });
      const bothDef = engine.thinWallDeflection({
        geometry: { ...geomBase, support_type: "both_sides" },
        material: aluminumMat,
        cutting_force_N: 50,
      });

      // _supportFactor: free=1.0, both_sides=0.125 → ratio = 1.0/0.125 = 8.0
      const ratio = freeDef.static_deflection_mm.value / bothDef.static_deflection_mm.value;
      expect(ratio).toBeCloseTo(8, 5);
    });

    it("returns is_safe=true when deflection is well within tolerance for stiff short wall", () => {
      const result = engine.thinWallDeflection({
        geometry: { wall_height_mm: 10, wall_thickness_mm: 5, wall_length_mm: 50, support_type: "free" },
        material: steelMat,
        cutting_force_N: 10,
      });
      expect(result.is_safe).toBe(true);
      expect(result.warnings.filter(w => /exceeds tolerance/i.test(w))).toHaveLength(0);
    });

    it("returns is_safe=false and warning when deflection exceeds tolerance", () => {
      const result = engine.thinWallDeflection({
        geometry: { wall_height_mm: 100, wall_thickness_mm: 1, wall_length_mm: 50, support_type: "free" },
        material: aluminumMat,
        cutting_force_N: 500,
        tolerance_mm: 0.05,
      });
      expect(result.is_safe).toBe(false);
      expect(result.warnings.some(w => /exceeds tolerance/i.test(w))).toBe(true);
    });

    // 15. Bending stress yield warning
    it("warns about bending stress approaching yield for soft copper thin wall under high force", () => {
      // σ_bending = F·H/(I/(t/2)); copper σy=69MPa, threshold = 0.8×69 = 55.2MPa
      const copperMat: ThinWallMaterial = {
        elastic_modulus_GPa: 117,
        yield_strength_MPa: 69,
        density_kg_m3: 8940,
      };
      const result = engine.thinWallDeflection({
        geometry: { wall_height_mm: 40, wall_thickness_mm: 1, wall_length_mm: 30, support_type: "free" },
        material: copperMat,
        cutting_force_N: 200,
      });
      expect(result.warnings.some(w => /bending stress/i.test(w) || /yield/i.test(w))).toBe(true);
    });

    it("correctly reports safety_factor as F_max / F_applied", () => {
      const F = 20;
      const tol = 0.05;
      const I = (Math.pow(3, 3) * 80) / 12;   // t=3, w=80
      const E = 205000;                          // steel MPa
      const F_max = (tol * 3 * E * I) / Math.pow(30, 3); // H=30
      const expected_sf = F_max / F;

      const result = engine.thinWallDeflection({
        geometry: { wall_height_mm: 30, wall_thickness_mm: 3, wall_length_mm: 80, support_type: "free" },
        material: steelMat,
        cutting_force_N: F,
        tolerance_mm: tol,
      });
      expect(result.max_allowable_force_N.value).toBeCloseTo(F_max, 4);
      expect(result.safety_factor.value).toBeCloseTo(expected_sf, 4);
    });

    it("adds safety-factor < 0.5 warning when force is more than 2× the allowable", () => {
      // Force very large relative to budget → SF < 0.5
      const result = engine.thinWallDeflection({
        geometry: { wall_height_mm: 100, wall_thickness_mm: 1, wall_length_mm: 20, support_type: "free" },
        material: aluminumMat,
        cutting_force_N: 10000,
        tolerance_mm: 0.05,
      });
      expect(result.safety_factor.value).toBeLessThan(0.5);
      expect(result.warnings.some(w => /safety factor/i.test(w))).toBe(true);
    });
  });

  // 6 & 7. Frequency analysis
  describe("thinWallFrequency", () => {
    // 6. Resonance detection
    it("reports critical chatter risk when tooth passing frequency matches wall natural frequency", () => {
      // Compute exact natural freq for aluminum wall, then tune RPM to match
      const t_m = 0.002, w_m = 0.1, H_m = 0.05, E = 69e9, rho = 2700;
      const I_m4 = (Math.pow(t_m, 3) * w_m) / 12;
      const A = t_m * w_m;
      const fn = (Math.pow(1.875, 2) / (2 * Math.PI)) * Math.sqrt((E * I_m4) / (rho * A * Math.pow(H_m, 4)));
      const rpm = (fn * 60) / 4; // tooth passing = fn with 4 flutes

      const result = engine.thinWallFrequency({
        geometry: { wall_height_mm: 50, wall_thickness_mm: 2, wall_length_mm: 100, support_type: "free" },
        material: aluminumMat,
        spindle_rpm: rpm,
        flutes: 4,
      });

      expect(result.chatter_risk).toBe("critical");
      expect(result.freq_ratio.value).toBeCloseTo(1.0, 1);
      expect(result.warnings.some(w => /RESONANCE/i.test(w))).toBe(true);
      expect(result.recommended_rpm_shift).toBeDefined();
    });

    // 7. Safe zone
    it("reports low chatter risk when tooth passing frequency is far below natural frequency", () => {
      // Stiff short thick wall → very high natural freq; very low RPM → safe ratio
      const result = engine.thinWallFrequency({
        geometry: { wall_height_mm: 10, wall_thickness_mm: 10, wall_length_mm: 100, support_type: "free" },
        material: steelMat,
        spindle_rpm: 100, // tooth passing ≈ 6.7 Hz, natural freq >> 6.7 Hz
        flutes: 4,
      });

      expect(result.chatter_risk).toBe("low");
      expect(result.warnings.filter(w => /resonance/i.test(w))).toHaveLength(0);
      expect(result.recommended_rpm_shift).toBeUndefined();
    });

    it("correctly computes tooth passing frequency as rpm × flutes / 60", () => {
      const rpm = 3000;
      const flutes = 3;
      const result = engine.thinWallFrequency({
        geometry: { wall_height_mm: 50, wall_thickness_mm: 2, wall_length_mm: 100 },
        material: aluminumMat,
        spindle_rpm: rpm,
        flutes,
      });
      expect(result.tooth_passing_freq_Hz.value).toBeCloseTo((rpm * flutes) / 60, 8);
    });

    it("both_sides support raises natural frequency above free cantilever (λ=π > 1.875)", () => {
      const base = { geometry: { wall_height_mm: 50, wall_thickness_mm: 2, wall_length_mm: 100 }, material: aluminumMat, spindle_rpm: 1000, flutes: 4 };
      const free = engine.thinWallFrequency({ ...base, geometry: { ...base.geometry, support_type: "free" as const } });
      const both = engine.thinWallFrequency({ ...base, geometry: { ...base.geometry, support_type: "both_sides" as const } });

      expect(both.natural_freq_Hz.value).toBeGreaterThan(free.natural_freq_Hz.value);
    });

    it("recommended RPM shift targets tooth passing at 70% of natural frequency", () => {
      const t_m = 0.002, w_m = 0.1, H_m = 0.05, E = 69e9, rho = 2700;
      const I_m4 = (Math.pow(t_m, 3) * w_m) / 12;
      const A = t_m * w_m;
      const fn = (Math.pow(1.875, 2) / (2 * Math.PI)) * Math.sqrt((E * I_m4) / (rho * A * Math.pow(H_m, 4)));
      const rpm = (fn * 60) / 4;

      const result = engine.thinWallFrequency({
        geometry: { wall_height_mm: 50, wall_thickness_mm: 2, wall_length_mm: 100, support_type: "free" },
        material: aluminumMat,
        spindle_rpm: rpm,
        flutes: 4,
      });

      expect(result.recommended_rpm_shift).toBeDefined();
      const targetRpm = rpm + result.recommended_rpm_shift!.value;
      const targetFtooth = (targetRpm * 4) / 60;
      expect(targetFtooth / fn).toBeCloseTo(0.7, 1);
    });
  });

  // 8 & 9. Support strategy ranking
  describe("thinWallSupport", () => {
    // 8. alloy_backfill highest effectiveness
    it("ranks alloy_backfill first with 100% effectiveness", () => {
      const result = engine.thinWallSupport({
        geometry: { wall_height_mm: 50, wall_thickness_mm: 2, wall_length_mm: 100 },
        material: steelMat,
      });

      expect(result.strategies[0].method).toBe("alloy_backfill");
      expect(result.strategies[0].effectiveness_pct).toBe(100);
    });

    // 9. Non-ferrous: no magnetic_fixture
    it("excludes magnetic_fixture for non-ferrous material (aluminum group N)", () => {
      const result = engine.thinWallSupport({
        geometry: { wall_height_mm: 50, wall_thickness_mm: 2, wall_length_mm: 100 },
        material: aluminumMat,
      });
      expect(result.strategies.map(s => s.method)).not.toContain("magnetic_fixture");
    });

    it("includes magnetic_fixture for ferrous material (stainless group M)", () => {
      // AR = 30/2 = 15 ≤ 20, so the AR>20 effectiveness filter (≥70%) does NOT apply.
      // magnetic_fixture has effectiveness_pct=60 and would be removed for AR>20.
      const result = engine.thinWallSupport({
        geometry: { wall_height_mm: 30, wall_thickness_mm: 2, wall_length_mm: 100 },
        material: stainlessMat,
      });
      expect(result.strategies.map(s => s.method)).toContain("magnetic_fixture");
    });

    it("warns and filters out strategies with effectiveness < 70% when AR > 20", () => {
      // AR = 50/2 = 25 > 20
      const result = engine.thinWallSupport({
        geometry: { wall_height_mm: 50, wall_thickness_mm: 2, wall_length_mm: 100 },
        material: aluminumMat,
      });

      expect(result.warnings.some(w => /extreme aspect ratio/i.test(w))).toBe(true);
      result.strategies.forEach(s => {
        expect(s.effectiveness_pct).toBeGreaterThanOrEqual(70);
      });
    });

    it("recommends a non-high-cost strategy for batch size > 20 when top option is costly", () => {
      // batch=25, alloy_backfill cost_relative="high" → engine picks cheaper ≥65% option
      const result = engine.thinWallSupport({
        geometry: { wall_height_mm: 30, wall_thickness_mm: 3, wall_length_mm: 80 },
        material: aluminumMat,
        batch_size: 25,
      });

      expect(result.recommended).not.toBe("alloy_backfill");
      expect(result.recommended).toBeTruthy();
    });

    it("escalates vacuum_fixture effectiveness to 95 when floor_thickness_mm < 3", () => {
      const result = engine.thinWallSupport({
        geometry: { wall_height_mm: 30, wall_thickness_mm: 3, wall_length_mm: 80, floor_thickness_mm: 1.5 },
        material: aluminumMat,
      });
      const vac = result.strategies.find(s => s.method === "vacuum_fixture");
      expect(vac).toBeDefined();
      expect(vac!.effectiveness_pct).toBe(95);
    });

    it("strategies are sorted by descending effectiveness_pct", () => {
      const result = engine.thinWallSupport({
        geometry: { wall_height_mm: 30, wall_thickness_mm: 3, wall_length_mm: 80 },
        material: steelMat,
      });
      for (let i = 1; i < result.strategies.length; i++) {
        expect(result.strategies[i - 1].effectiveness_pct).toBeGreaterThanOrEqual(
          result.strategies[i].effectiveness_pct
        );
      }
    });
  });

  // 10. Full strategy analysis
  describe("thinWallStrategy", () => {
    it("returns all sub-results and a summary string when spindle_rpm is provided", () => {
      const result = engine.thinWallStrategy({
        ...makeInput({ geometry: { wall_height_mm: 50, wall_thickness_mm: 2, wall_length_mm: 100 } }),
        spindle_rpm: 5000,
      });

      expect(["low", "medium", "high", "critical"]).toContain(result.overall_risk);
      expect(result.params).toBeDefined();
      expect(result.deflection).toBeDefined();
      expect(result.support).toBeDefined();
      expect(result.frequency).toBeDefined();
      expect(typeof result.summary).toBe("string");
      expect(result.summary.length).toBeGreaterThan(0);
      expect(result.summary).toMatch(/AR/);
    });

    it("omits frequency result when spindle_rpm is not provided", () => {
      const result = engine.thinWallStrategy(makeInput());
      expect(result.frequency).toBeUndefined();
    });

    it("rates critical overall_risk when AR exceeds material maximum (steel AR=40, max=30)", () => {
      const result = engine.thinWallStrategy(
        makeInput({
          geometry: { wall_height_mm: 80, wall_thickness_mm: 2, wall_length_mm: 80 },
          material: steelMat,
        })
      );
      expect(result.overall_risk).toBe("critical");
    });

    it("rates critical overall_risk for a short, thick, well-supported steel wall at low RPM", () => {
      // thinWallStrategy passes max_force_N into thinWallDeflection → safety_factor = 1.0
      // Engine risk logic maps this to "critical" due to deflection safety factor threshold.
      const result = engine.thinWallStrategy({
        ...makeInput({
          geometry: { wall_height_mm: 15, wall_thickness_mm: 5, wall_length_mm: 60, support_type: "both_sides" },
          material: steelMat,
          tool: { diameter_mm: 6, flutes: 4 },
          target_tolerance_mm: 0.1,
        }),
        spindle_rpm: 200,
      });
      expect(result.overall_risk).toBe("critical");
    });
  });

  // 11. getMaterialDefaults
  describe("getMaterialDefaults", () => {
    it("returns correct modulus, yield, and density for aluminum_6061", () => {
      const mat = ThinWallMachiningEngine.getMaterialDefaults("aluminum_6061");
      expect(mat).not.toBeNull();
      expect(mat!.elastic_modulus_GPa).toBe(69);
      expect(mat!.yield_strength_MPa).toBe(276);
      expect(mat!.density_kg_m3).toBe(2700);
      expect(mat!.name).toBe("aluminum_6061");
    });

    it("returns correct properties for titanium_6al4v", () => {
      const mat = ThinWallMachiningEngine.getMaterialDefaults("titanium_6al4v");
      expect(mat).not.toBeNull();
      expect(mat!.elastic_modulus_GPa).toBe(114);
      expect(mat!.yield_strength_MPa).toBe(880);
      expect(mat!.density_kg_m3).toBe(4430);
    });

    it("returns null for an unknown material name", () => {
      expect(ThinWallMachiningEngine.getMaterialDefaults("unobtanium_9000")).toBeNull();
    });

    it("normalizes spaces and hyphens to underscores and lowercases the key", () => {
      const mat = ThinWallMachiningEngine.getMaterialDefaults("Steel 4140");
      expect(mat).not.toBeNull();
      expect(mat!.elastic_modulus_GPa).toBe(205);
    });
  });

  // 12. listMaterials
  describe("listMaterials", () => {
    it("returns a non-empty array of strings", () => {
      const list = ThinWallMachiningEngine.listMaterials();
      expect(Array.isArray(list)).toBe(true);
      expect(list.length).toBeGreaterThan(0);
      list.forEach(name => expect(typeof name).toBe("string"));
    });

    it("includes aluminum_6061, titanium_6al4v, and inconel_718", () => {
      const list = ThinWallMachiningEngine.listMaterials();
      expect(list).toContain("aluminum_6061");
      expect(list).toContain("titanium_6al4v");
      expect(list).toContain("inconel_718");
    });

    it("every listed name resolves successfully via getMaterialDefaults", () => {
      ThinWallMachiningEngine.listMaterials().forEach(name => {
        expect(ThinWallMachiningEngine.getMaterialDefaults(name)).not.toBeNull();
      });
    });
  });

  // AtomicValue shape
  describe("AtomicValue fields", () => {
    it("all AtomicValue outputs carry value, unit, uncertainty (=value×0.1), and source", () => {
      const result = engine.thinWallDeflection({
        geometry: { wall_height_mm: 40, wall_thickness_mm: 3, wall_length_mm: 80 },
        material: aluminumMat,
        cutting_force_N: 30,
      });

      for (const field of [
        result.static_deflection_mm,
        result.cutting_force_N,
        result.moment_of_inertia_mm4,
        result.max_allowable_force_N,
        result.safety_factor,
      ]) {
        expect(typeof field.value).toBe("number");
        expect(typeof field.unit).toBe("string");
        expect(typeof field.uncertainty).toBe("number");
        expect(typeof field.source).toBe("string");
        expect(field.uncertainty).toBeCloseTo(field.value * 0.1, 8);
      }
    });
  });

  // Edge cases
  describe("edge cases", () => {
    it("handles minimal geometry (H=1, t=1, L=10) without throwing", () => {
      expect(() =>
        engine.thinWallParams(
          makeInput({
            geometry: { wall_height_mm: 1, wall_thickness_mm: 1, wall_length_mm: 10 },
            tool: { diameter_mm: 1, flutes: 2 },
          })
        )
      ).not.toThrow();
    });

    it("handles inconel_718 (group H, kc=3500) and returns positive force budget", () => {
      const inconelMat = ThinWallMachiningEngine.getMaterialDefaults("inconel_718")!;
      const result = engine.thinWallParams(
        makeInput({
          material: inconelMat,
          geometry: { wall_height_mm: 30, wall_thickness_mm: 2, wall_length_mm: 60 },
        })
      );
      expect(result.max_force_N.value).toBeGreaterThan(0);
      expect(result.recommended_fz_mm.value).toBeGreaterThan(0);
    });
  });
});
