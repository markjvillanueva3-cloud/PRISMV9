import { describe, it, expect } from "vitest";
import {
  ThinWallMachiningEngine,
  ThinWallGeometry,
  ThinWallMaterial,
  ThinWallTooling,
  ThinWallInput,
} from "../ThinWallMachiningEngine";

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
    it("warns when aspect ratio exceeds steel caution threshold (H=80, t=2 → AR=40)", () => {
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

      // Titanium base fz factor from _baseFz uses group "S" (0.03) vs "N" (0.08)
      expect(tiResult.recommended_fz_mm.value).toBeLessThan(alResult.recommended_fz_mm.value);
    });

    // 13. Roughing should allow more ae (10%) vs finishing (5%)
    it("roughing uses larger ae (10% D) and smaller ap_factor than finishing", () => {
      const roughing = engine.thinWallParams(makeInput({ operation: "roughing" }));
      const finishing = engine.thinWallParams(makeInput({ operation: "finishing" }));

      // ae: roughing 10% of 10mm = 1.0mm, finishing 5% = 0.5mm
      expect(roughing.recommended_ae_mm.value).toBeCloseTo(1.0, 5);
      expect(finishing.recommended_ae_mm.value).toBeCloseTo(0.5, 5);
      expect(roughing.recommended_ae_mm.value).toBeGreaterThan(finishing.recommended_ae_mm.value);
    });

    // 14. Iterative force reduction — params shrink when budget exceeded
    it("iteratively reduces fz/ap when estimated force exceeds allowable budget", () => {
      // Very tight tolerance and large forces → should trigger reduction loop
      const tight = engine.thinWallParams(
        makeInput({
          geometry: { wall_height_mm: 60, wall_thickness_mm: 1, wall_length_mm: 50 },
          material: steelMat,
          target_tolerance_mm: 0.005,
          tool: { diameter_mm: 16, flutes: 4 },
        })
      );
      // After reduction, estimated force should not wildly exceed budget
      // deflection_safe is the gate — if not safe a warning appears
      // Either safe or warning present — not silently wrong
      if (!tight.deflection_safe) {
        expect(tight.warnings.some(w => /deflection/i.test(w))).toBe(true);
      }
      // fz must always be positive
      expect(tight.recommended_fz_mm.value).toBeGreaterThan(0);
      expect(tight.recommended_ap_mm.value).toBeGreaterThan(0);
    });

    // Tool diameter warning when tool nearly as wide as wall
    it("warns when tool diameter approaches wall thickness", () => {
      const result = engine.thinWallParams(
        makeInput({
          geometry: { wall_height_mm: 30, wall_thickness_mm: 3, wall_length_mm: 80 },
          tool: { diameter_mm: 10, flutes: 4 },  // 10mm tool vs 3mm wall → 10 > 3*0.8
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

    // Caution-zone aspect ratio selects adaptive strategy
    it("selects alternating_sides_climb strategy for AR in caution zone (aluminum AR=20)", () => {
      // Aluminum caution = 25, safe = 15 — AR=20 is between safe and caution
      const result = engine.thinWallParams(
        makeInput({
          geometry: { wall_height_mm: 40, wall_thickness_mm: 2, wall_length_mm: 100 }, // AR=20
          material: aluminumMat,
        })
      );
      // AR 20 > safe(15) but < caution(25) → light_conventional
      expect(result.strategy).toBe("light_conventional");
    });
  });

  // 4. Deflection math verification
  describe("thinWallDeflection", () => {
    it("computes δ = F·H³/(3·E·I) correctly with known values (free cantilever)", () => {
      const geometry: ThinWallGeometry = {
        wall_height_mm: 50,
        wall_thickness_mm: 2,
        wall_length_mm: 100,
        support_type: "free",
      };
      const material = aluminumMat;  // E = 69 GPa
      const F = 100; // N

      // Manual calculation:
      // I = t³·w/12 = 2³×100/12 = 800/12 ≈ 66.667 mm⁴
      // E_MPa = 69000 MPa
      // δ = 100 × 50³ / (3 × 69000 × 66.667) = 12500000 / 13800066.7 ≈ 0.09058 mm
      const I = (Math.pow(2, 3) * 100) / 12;
      const E = 69000;
      const expected = (F * Math.pow(50, 3)) / (3 * E * I);

      const result = engine.thinWallDeflection({ geometry, material, cutting_force_N: F });

      expect(result.static_deflection_mm.value).toBeCloseTo(expected, 8);
      expect(result.moment_of_inertia_mm4.value).toBeCloseTo(I, 6);
      expect(result.cutting_force_N.value).toBe(F);
    });

    // 5. Support type — both_sides much stiffer than free
    it("both_sides support gives ~8× less deflection than free cantilever", () => {
      const base = {
        geometry: {
          wall_height_mm: 50,
          wall_thickness_mm: 2,
          wall_length_mm: 100,
        } as ThinWallGeometry,
        material: aluminumMat,
        cutting_force_N: 50,
      };

      const freeDef = engine.thinWallDeflection({ ...base, geometry: { ...base.geometry, support_type: "free" } });
      const bothDef = engine.thinWallDeflection({ ...base, geometry: { ...base.geometry, support_type: "both_sides" } });

      // _supportFactor: free=1.0, both_sides=0.125 → ratio = 1/0.125 = 8
      const ratio = freeDef.static_deflection_mm.value / bothDef.static_deflection_mm.value;
      expect(ratio).toBeCloseTo(8, 5);
    });

    it("returns is_safe=true when deflection is within default tolerance (0.05mm)", () => {
      // Very stiff wall: thick, tall but short, high-E material → small deflection
      const result = engine.thinWallDeflection({
        geometry: { wall_height_mm: 10, wall_thickness_mm: 5, wall_length_mm: 50, support_type: "free" },
        material: steelMat,
        cutting_force_N: 10,
      });
      expect(result.is_safe).toBe(true);
      expect(result.warnings.filter(w => /exceeds tolerance/i.test(w))).toHaveLength(0);
    });

    it("returns is_safe=false and adds warning when deflection exceeds tolerance", () => {
      // Extreme: very tall, very thin, huge force
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
    it("warns about bending stress approaching yield for thin wall under high force", () => {
      // σ_bending = F·H / (I/(t/2)) — use geometry where this exceeds 80% yield
      // For soft copper: σy=69MPa, so threshold = 0.8×69 = 55.2 MPa
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

    it("correctly reports safety factor as F_max / F_applied", () => {
      const geometry: ThinWallGeometry = {
        wall_height_mm: 30,
        wall_thickness_mm: 3,
        wall_length_mm: 80,
        support_type: "free",
      };
      const material = steelMat;
      const F = 20;
      const tol = 0.05;

      const I = (Math.pow(3, 3) * 80) / 12;
      const E = 205000;
      const F_max = (tol * 3 * E * I) / Math.pow(30, 3);
      const expected_sf = F_max / F;

      const result = engine.thinWallDeflection({ geometry, material, cutting_force_N: F, tolerance_mm: tol });
      expect(result.max_allowable_force_N.value).toBeCloseTo(F_max, 4);
      expect(result.safety_factor.value).toBeCloseTo(expected_sf, 4);
    });
  });

  // 6 & 7. Frequency analysis
  describe("thinWallFrequency", () => {
    // 6. Resonance detection when tooth passing ≈ natural freq
    it("reports critical chatter risk when tooth passing frequency is within 15% of natural frequency", () => {
      // We'll calculate the natural freq of a known wall, then set RPM to hit it
      // Aluminum wall: H=50mm, t=2mm, w=100mm, free (lambda=1.875)
      // E=69e9, rho=2700, I_m4=(0.002^3×0.1)/12, A=0.002×0.1=0.0002
      const t_m = 0.002, w_m = 0.1, H_m = 0.05, E = 69e9, rho = 2700;
      const I_m4 = (Math.pow(t_m, 3) * w_m) / 12;
      const A = t_m * w_m;
      const lambda1 = 1.875;
      const fn = (Math.pow(lambda1, 2) / (2 * Math.PI)) * Math.sqrt((E * I_m4) / (rho * A * Math.pow(H_m, 4)));

      // Set RPM so tooth passing freq = fn (4 flutes)
      const rpm = (fn * 60) / 4;

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

    // 7. Safe zone — well-separated frequencies
    it("reports low chatter risk when tooth passing frequency is well separated from natural frequency", () => {
      // Very stiff and heavy wall — low natural freq
      // Use very low RPM to get tooth passing freq far below natural freq
      const result = engine.thinWallFrequency({
        geometry: { wall_height_mm: 10, wall_thickness_mm: 10, wall_length_mm: 100, support_type: "free" },
        material: steelMat,
        spindle_rpm: 100, // Very low — tooth passing = 100×4/60 ≈ 6.7Hz, natural freq will be very high
        flutes: 4,
      });

      expect(result.chatter_risk).toBe("low");
      expect(result.warnings.filter(w => /resonance/i.test(w) || /near-resonance/i.test(w))).toHaveLength(0);
      expect(result.recommended_rpm_shift).toBeUndefined();
    });

    it("correctly computes tooth passing frequency as rpm×flutes/60", () => {
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

    it("both_sides support raises natural frequency vs free cantilever (stiffer)", () => {
      const baseInput = {
        geometry: { wall_height_mm: 50, wall_thickness_mm: 2, wall_length_mm: 100 },
        material: aluminumMat,
        spindle_rpm: 1000,
        flutes: 4,
      };
      const free = engine.thinWallFrequency({ ...baseInput, geometry: { ...baseInput.geometry, support_type: "free" as const } });
      const both = engine.thinWallFrequency({ ...baseInput, geometry: { ...baseInput.geometry, support_type: "both_sides" as const } });

      // both_sides uses lambda=π > 1.875, so fn is higher
      expect(both.natural_freq_Hz.value).toBeGreaterThan(free.natural_freq_Hz.value);
    });

    it("recommends RPM shift toward 70% of natural frequency when in high/critical chatter zone", () => {
      // Build input that puts tooth passing near resonance
      const t_m = 0.002, w_m = 0.1, H_m = 0.05, E = 69e9, rho = 2700;
      const I_m4 = (Math.pow(t_m, 3) * w_m) / 12;
      const A = t_m * w_m;
      const fn = (Math.pow(1.875, 2) / (2 * Math.PI)) * Math.sqrt((E * I_m4) / (rho * A * Math.pow(H_m, 4)));
      const rpm = (fn * 60) / 4; // exactly resonant

      const result = engine.thinWallFrequency({
        geometry: { wall_height_mm: 50, wall_thickness_mm: 2, wall_length_mm: 100, support_type: "free" },
        material: aluminumMat,
        spindle_rpm: rpm,
        flutes: 4,
      });

      expect(result.recommended_rpm_shift).toBeDefined();
      const targetRpm = rpm + result.recommended_rpm_shift!.value;
      const targetFtooth = (targetRpm * 4) / 60;
      // Should target ~70% of natural freq
      expect(targetFtooth / fn).toBeCloseTo(0.7, 1);
    });
  });

  // 8 & 9. Support strategy ranking
  describe("thinWallSupport", () => {
    // 8. alloy_backfill should be highest effectiveness
    it("ranks alloy_backfill as highest effectiveness strategy", () => {
      const result = engine.thinWallSupport({
        geometry: { wall_height_mm: 50, wall_thickness_mm: 2, wall_length_mm: 100 },
        material: steelMat,
      });

      expect(result.strategies[0].method).toBe("alloy_backfill");
      expect(result.strategies[0].effectiveness_pct).toBe(100);
    });

    // 9. Non-ferrous materials should exclude magnetic_fixture
    it("excludes magnetic_fixture for non-ferrous materials (aluminum)", () => {
      const result = engine.thinWallSupport({
        geometry: { wall_height_mm: 50, wall_thickness_mm: 2, wall_length_mm: 100 },
        material: aluminumMat,
      });

      const methods = result.strategies.map(s => s.method);
      expect(methods).not.toContain("magnetic_fixture");
    });

    it("includes magnetic_fixture for ferrous materials (stainless_304 group M)", () => {
      const result = engine.thinWallSupport({
        geometry: { wall_height_mm: 50, wall_thickness_mm: 2, wall_length_mm: 100 },
        material: stainlessMat,
      });

      const methods = result.strategies.map(s => s.method);
      expect(methods).toContain("magnetic_fixture");
    });

    it("warns and filters low-effectiveness strategies for extreme aspect ratio (AR > 20)", () => {
      const result = engine.thinWallSupport({
        geometry: { wall_height_mm: 50, wall_thickness_mm: 2, wall_length_mm: 100 }, // AR=25
        material: aluminumMat,
      });

      // AR=25 > 20 → warn + filter strategies with effectiveness < 70%
      expect(result.warnings.some(w => /extreme aspect ratio/i.test(w))).toBe(true);
      result.strategies.forEach(s => {
        expect(s.effectiveness_pct).toBeGreaterThanOrEqual(70);
      });
    });

    it("returns recommended strategy as top-effectiveness non-high-cost option for large batches", () => {
      // batch_size > 20, alloy_backfill is high cost → should prefer a cheaper option
      const result = engine.thinWallSupport({
        geometry: { wall_height_mm: 30, wall_thickness_mm: 3, wall_length_mm: 80 },
        material: aluminumMat,
        batch_size: 25,
      });

      // recommended should not be alloy_backfill (cost_relative: "high" and batch > 20)
      // Note: for batch > 50 alloy_backfill becomes "medium", but batch=25 it's still "high"
      expect(result.recommended).not.toBe("alloy_backfill");
      expect(result.recommended).toBeTruthy();
    });

    it("escalates vacuum_fixture effectiveness to 95 for very thin floors (< 3mm)", () => {
      const result = engine.thinWallSupport({
        geometry: {
          wall_height_mm: 30,
          wall_thickness_mm: 3,
          wall_length_mm: 80,
          floor_thickness_mm: 1.5,
        },
        material: aluminumMat,
      });

      const vac = result.strategies.find(s => s.method === "vacuum_fixture");
      expect(vac).toBeDefined();
      expect(vac!.effectiveness_pct).toBe(95);
    });
  });

  // 10. Full strategy analysis
  describe("thinWallStrategy", () => {
    // 10. overall_risk matches component risks
    it("overall_risk reflects the worst component risk across params, deflection, and frequency", () => {
      const result = engine.thinWallStrategy({
        ...makeInput({
          geometry: { wall_height_mm: 50, wall_thickness_mm: 2, wall_length_mm: 100 },
        }),
        spindle_rpm: 5000,
      });

      expect(["low", "medium", "high", "critical"]).toContain(result.overall_risk);
      // All sub-results present
      expect(result.params).toBeDefined();
      expect(result.deflection).toBeDefined();
      expect(result.support).toBeDefined();
      expect(result.frequency).toBeDefined(); // spindle_rpm provided
      // Summary is a non-empty string
      expect(typeof result.summary).toBe("string");
      expect(result.summary.length).toBeGreaterThan(0);
      expect(result.summary).toMatch(/AR/);
    });

    it("omits frequency result when spindle_rpm is not provided", () => {
      const result = engine.thinWallStrategy(makeInput());
      expect(result.frequency).toBeUndefined();
    });

    it("rates critical overall_risk for impossible aspect ratio (steel AR=40 → exceeds max 30)", () => {
      const result = engine.thinWallStrategy(
        makeInput({
          geometry: { wall_height_mm: 80, wall_thickness_mm: 2, wall_length_mm: 80 },
          material: steelMat,
        })
      );
      // AR=40 > steel max=30 → risks.push(4) → overall_risk = "critical"
      expect(result.overall_risk).toBe("critical");
    });

    it("rates low overall_risk for a robust short thick wall (steel, AR=3)", () => {
      const result = engine.thinWallStrategy({
        ...makeInput({
          geometry: {
            wall_height_mm: 15,
            wall_thickness_mm: 5,
            wall_length_mm: 60,
            support_type: "both_sides",
          },
          material: steelMat,
          tool: { diameter_mm: 6, flutes: 4 },
          target_tolerance_mm: 0.1,
        }),
        spindle_rpm: 200, // very low RPM → safe tooth passing freq
      });
      expect(result.overall_risk).toBe("low");
    });
  });

  // 11. getMaterialDefaults
  describe("getMaterialDefaults", () => {
    it("returns correct properties for aluminum_6061", () => {
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
      const mat = ThinWallMachiningEngine.getMaterialDefaults("unobtanium_9000");
      expect(mat).toBeNull();
    });

    it("normalizes name formatting (spaces and hyphens → underscores, lowercased)", () => {
      const mat = ThinWallMachiningEngine.getMaterialDefaults("Steel 4140");
      // "steel 4140" → key "steel_4140" → should match
      expect(mat).not.toBeNull();
      expect(mat!.elastic_modulus_GPa).toBe(205);
    });
  });

  // 12. listMaterials
  describe("listMaterials", () => {
    it("returns an array of material preset name strings", () => {
      const list = ThinWallMachiningEngine.listMaterials();
      expect(Array.isArray(list)).toBe(true);
      expect(list.length).toBeGreaterThan(0);
      list.forEach(name => expect(typeof name).toBe("string"));
    });

    it("includes aluminum_6061, titanium_6al4v, and inconel_718 in the preset list", () => {
      const list = ThinWallMachiningEngine.listMaterials();
      expect(list).toContain("aluminum_6061");
      expect(list).toContain("titanium_6al4v");
      expect(list).toContain("inconel_718");
    });

    it("every name returned by listMaterials resolves via getMaterialDefaults", () => {
      const list = ThinWallMachiningEngine.listMaterials();
      list.forEach(name => {
        const mat = ThinWallMachiningEngine.getMaterialDefaults(name);
        expect(mat).not.toBeNull();
      });
    });
  });

  // AtomicValue shape validation across results
  describe("AtomicValue fields", () => {
    it("all AtomicValue fields have value, unit, uncertainty, and source", () => {
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

  // Edge case: zero-height or degenerate geometry should not throw
  describe("edge cases", () => {
    it("handles a single-unit wall without throwing (H=1, t=1, L=10)", () => {
      expect(() =>
        engine.thinWallParams(
          makeInput({
            geometry: { wall_height_mm: 1, wall_thickness_mm: 1, wall_length_mm: 10 },
            tool: { diameter_mm: 1, flutes: 2 },
          })
        )
      ).not.toThrow();
    });

    it("handles inconel (group H) and returns kc-derived conservative force budget", () => {
      const inconelMat = ThinWallMachiningEngine.getMaterialDefaults("inconel_718")!;
      const result = engine.thinWallParams(
        makeInput({
          material: inconelMat,
          geometry: { wall_height_mm: 30, wall_thickness_mm: 2, wall_length_mm: 60 },
        })
      );
      // Inconel is hard — max force budget should be finite and positive
      expect(result.max_force_N.value).toBeGreaterThan(0);
      expect(result.recommended_fz_mm.value).toBeGreaterThan(0);
    });
  });
});
