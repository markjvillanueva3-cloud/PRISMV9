/**
 * Tests for HyperMillMultiAxisPhysicsPipeline — CAM-EXHAUST-MS0
 *
 * Covers:
 *  - Class shape (singleton + run method)
 *  - Material→ISO mapping for all 9 ImpellerMaterial entries
 *  - Thermal wear engagement only for ISO S superalloy / titanium
 *  - Wall-thickness gate (<2 mm reduces feed by 30%)
 *  - Strategy selection per goal (roughing big tool / roughing small / finishing / semi)
 *  - Kienzle force calculation against CANONICAL_KIENZLE
 *  - Cantilever deflection formula and 25 μm deep-channel gate
 *  - Failure modes (zero/negative dimensions, default ISO P fallback)
 *  - Adversarial inputs (extreme overhang, NaN/Infinity, blisk, ap/fz override)
 */

import { describe, it, expect, beforeEach } from "vitest";
import {
  HyperMillMultiAxisPhysicsPipeline,
  hyperMillMultiAxisPhysicsPipeline,
  type ImpellerPipelineInput,
  type ImpellerMaterial,
} from "../engines/HyperMillMultiAxisPhysicsPipeline.js";
import { CANONICAL_KIENZLE } from "../physics/constants.js";

// ============================================================================
// Named constants
// ============================================================================
const WALL_THIN_THRESHOLD_MM = 2.0;
const WALL_THIN_FEED_REDUCTION = 0.70; // 30% reduction
const DEFLECTION_LIMIT_UM = 25.0;
const DEEP_CHANNEL_FACTOR = 3.0;
const STAGE_COUNT_MIN = 5; // material/thermal/wall/strategy/force/deflection

const TI = "Ti-6Al-4V";
const INC718 = "Inconel_718";
const INC625 = "Inconel_625";
const PH17_4 = "17-4PH";
const SS304 = "304_stainless";
const SS316L = "316L_stainless";
const AL7075 = "Aluminum_7075";
const STEEL = "generic_steel";
const SUPER = "generic_superalloy";

const ALL_THERMAL_WEAR_MATERIALS: ImpellerMaterial[] = [TI, INC718, INC625, SUPER];
const ALL_NON_THERMAL_MATERIALS: ImpellerMaterial[] = [PH17_4, SS304, SS316L, AL7075, STEEL];

function baseInput(material: ImpellerMaterial): ImpellerPipelineInput {
  return {
    material,
    geometry: {
      bladeCount: 7,
      hasSplitterBlades: false,
      hubShroudRatio: 0.5,
      wallThicknessMm: 3.0,
      channelDepthMm: 20.0,
      geometryType: "impeller",
    },
    tool: {
      diameterMm: 10,
      overhangMm: 30,
      flutes: 4,
      toolMaterial: "carbide",
    },
    goal: "roughing",
  };
}

describe("HyperMillMultiAxisPhysicsPipeline", () => {
  let pipeline: HyperMillMultiAxisPhysicsPipeline;

  beforeEach(() => {
    pipeline = new HyperMillMultiAxisPhysicsPipeline();
  });

  // ──────────────────────────────────────────────────────────────────────────
  // Class shape
  // ──────────────────────────────────────────────────────────────────────────
  describe("class shape", () => {
    it("singleton is a HyperMillMultiAxisPhysicsPipeline", () => {
      expect(hyperMillMultiAxisPhysicsPipeline).toBeInstanceOf(HyperMillMultiAxisPhysicsPipeline);
    });

    it("source field cites canonical references", () => {
      const r = pipeline.run(baseInput(TI));
      expect(r.source).toMatch(/CANONICAL_KIENZLE/);
      expect(r.source).toMatch(/ISO-3685/);
    });
  });

  // ──────────────────────────────────────────────────────────────────────────
  // Material → ISO mapping
  // ──────────────────────────────────────────────────────────────────────────
  describe("material → ISO mapping", () => {
    it("Ti-6Al-4V maps to ISO S with kc1.1=2800", () => {
      const r = pipeline.run(baseInput(TI));
      expect(r.isoGroup).toBe("S");
      expect(r.kc1_1).toBe(CANONICAL_KIENZLE.S.kc1_1);
    });

    it("Inconel_718 maps to ISO S", () => {
      const r = pipeline.run(baseInput(INC718));
      expect(r.isoGroup).toBe("S");
    });

    it("Inconel_625 maps to ISO S", () => {
      const r = pipeline.run(baseInput(INC625));
      expect(r.isoGroup).toBe("S");
    });

    it("17-4PH stainless maps to ISO M with kc1.1=2100", () => {
      const r = pipeline.run(baseInput(PH17_4));
      expect(r.isoGroup).toBe("M");
      expect(r.kc1_1).toBe(CANONICAL_KIENZLE.M.kc1_1);
    });

    it("304 stainless maps to ISO M", () => {
      const r = pipeline.run(baseInput(SS304));
      expect(r.isoGroup).toBe("M");
    });

    it("316L stainless maps to ISO M", () => {
      const r = pipeline.run(baseInput(SS316L));
      expect(r.isoGroup).toBe("M");
    });

    it("Aluminum 7075 maps to ISO N with kc1.1=700", () => {
      const r = pipeline.run(baseInput(AL7075));
      expect(r.isoGroup).toBe("N");
      expect(r.kc1_1).toBe(CANONICAL_KIENZLE.N.kc1_1);
    });

    it("generic_steel maps to ISO P with kc1.1=1800", () => {
      const r = pipeline.run(baseInput(STEEL));
      expect(r.isoGroup).toBe("P");
      expect(r.kc1_1).toBe(CANONICAL_KIENZLE.P.kc1_1);
    });

    it("generic_superalloy maps to ISO S", () => {
      const r = pipeline.run(baseInput(SUPER));
      expect(r.isoGroup).toBe("S");
    });
  });

  // ──────────────────────────────────────────────────────────────────────────
  // Thermal wear gate
  // ──────────────────────────────────────────────────────────────────────────
  describe("thermal wear engagement", () => {
    it("ISO S thermal-wear materials engage SLD avoidance", () => {
      for (const m of ALL_THERMAL_WEAR_MATERIALS) {
        const r = pipeline.run(baseInput(m));
        expect(r.thermalWearEngaged).toBe(true);
        expect(r.sldAvoidanceActive).toBe(true);
        expect(r.warnings.some((w) => /thermal wear/i.test(w))).toBe(true);
        expect(r.warnings.some((w) => /SLD/i.test(w))).toBe(true);
      }
    });

    it("non-superalloy materials do NOT engage thermal wear", () => {
      for (const m of ALL_NON_THERMAL_MATERIALS) {
        const r = pipeline.run(baseInput(m));
        expect(r.thermalWearEngaged).toBe(false);
        expect(r.sldAvoidanceActive).toBe(false);
      }
    });
  });

  // ──────────────────────────────────────────────────────────────────────────
  // Wall thickness gate
  // ──────────────────────────────────────────────────────────────────────────
  describe("wall thickness feed reduction", () => {
    it("wall=1.0mm triggers 30% feed reduction (factor=0.70)", () => {
      const input = baseInput(STEEL);
      input.geometry.wallThicknessMm = 1.0;
      const r = pipeline.run(input);
      expect(r.feedReductionFactor).toBeCloseTo(WALL_THIN_FEED_REDUCTION, 6);
      expect(r.warnings.some((w) => /thin/i.test(w) || /reduced/i.test(w))).toBe(true);
    });

    it("wall=2.0mm exactly does NOT trigger reduction (boundary)", () => {
      const input = baseInput(STEEL);
      input.geometry.wallThicknessMm = WALL_THIN_THRESHOLD_MM;
      const r = pipeline.run(input);
      expect(r.feedReductionFactor).toBe(1.0);
    });

    it("wall=3.0mm has full feed (factor=1.0)", () => {
      const input = baseInput(STEEL);
      input.geometry.wallThicknessMm = 3.0;
      const r = pipeline.run(input);
      expect(r.feedReductionFactor).toBe(1.0);
    });
  });

  // ──────────────────────────────────────────────────────────────────────────
  // Strategy selection
  // ──────────────────────────────────────────────────────────────────────────
  describe("strategy selection", () => {
    it("roughing with diameter ≥ 8mm picks Tangent Roughing (ItmX5)", () => {
      const input = baseInput(STEEL);
      input.tool.diameterMm = 12;
      input.goal = "roughing";
      const r = pipeline.run(input);
      expect(r.strategy).toBe("5X Impeller Tangent Roughing");
      expect(r.cycleCode).toBe("ItmX5");
    });

    it("roughing with diameter < 8mm picks Impeller Roughing (IrX5)", () => {
      const input = baseInput(STEEL);
      input.tool.diameterMm = 6;
      input.goal = "roughing";
      const r = pipeline.run(input);
      expect(r.strategy).toBe("5X Impeller Roughing");
      expect(r.cycleCode).toBe("IrX5");
    });

    it("finishing goal picks Hub Finishing (IfX5)", () => {
      const input = baseInput(STEEL);
      input.goal = "finishing";
      const r = pipeline.run(input);
      expect(r.strategy).toBe("5X Impeller Hub Finishing");
      expect(r.cycleCode).toBe("IfX5");
    });

    it("semi_finishing goal picks Point Roughing (IdX5)", () => {
      const input = baseInput(STEEL);
      input.goal = "semi_finishing";
      const r = pipeline.run(input);
      expect(r.strategy).toBe("5X Impeller Point Roughing");
      expect(r.cycleCode).toBe("IdX5");
    });

    it("blisk geometry adds blisk warning", () => {
      const input = baseInput(STEEL);
      input.geometry.geometryType = "blisk";
      const r = pipeline.run(input);
      expect(r.warnings.some((w) => /blisk/i.test(w))).toBe(true);
    });
  });

  // ──────────────────────────────────────────────────────────────────────────
  // Kienzle force
  // ──────────────────────────────────────────────────────────────────────────
  describe("Kienzle cutting force", () => {
    it("reports Fc and stages array contains a kienzle_force entry", () => {
      const r = pipeline.run(baseInput(STEEL));
      expect(r.cuttingForce_N).toBeGreaterThan(0);
      expect(Number.isFinite(r.cuttingForce_N)).toBe(true);
      const stage = r.stages.find((s) => s.stageName === "kienzle_force")!;
      expect(stage.passed).toBe(true);
      expect(stage.unit).toBe("N");
    });

    it("ap and fz overrides are honored in force calculation", () => {
      const a: ImpellerPipelineInput = { ...baseInput(STEEL), ap_mm: 1, fz_mm: 0.05 };
      const b: ImpellerPipelineInput = { ...baseInput(STEEL), ap_mm: 4, fz_mm: 0.05 };
      const ra = pipeline.run(a);
      const rb = pipeline.run(b);
      expect(rb.cuttingForce_N).toBeGreaterThan(ra.cuttingForce_N);
    });

    it("titanium produces higher Fc than aluminum at identical geometry", () => {
      const ti = pipeline.run(baseInput(TI));
      const al = pipeline.run(baseInput(AL7075));
      expect(ti.cuttingForce_N).toBeGreaterThan(al.cuttingForce_N);
    });
  });

  // ──────────────────────────────────────────────────────────────────────────
  // Deflection
  // ──────────────────────────────────────────────────────────────────────────
  describe("deflection gate", () => {
    it("reports finite deflection for nominal carbide tool", () => {
      const r = pipeline.run(baseInput(STEEL));
      expect(Number.isFinite(r.deflection_um)).toBe(true);
      expect(r.deflection_um).toBeGreaterThanOrEqual(0);
    });

    it("HSS tool (lower E) deflects more than carbide for same geometry", () => {
      const carbideInput = baseInput(STEEL);
      const hssInput: ImpellerPipelineInput = {
        ...carbideInput,
        tool: { ...carbideInput.tool, toolMaterial: "hss" },
      };
      const carbide = pipeline.run(carbideInput);
      const hss = pipeline.run(hssInput);
      expect(hss.deflection_um).toBeGreaterThan(carbide.deflection_um);
    });

    it("longer overhang → larger deflection (cubic relationship)", () => {
      const a = baseInput(STEEL);
      a.tool.overhangMm = 25;
      const b = baseInput(STEEL);
      b.tool.overhangMm = 50;
      const ra = pipeline.run(a);
      const rb = pipeline.run(b);
      expect(rb.deflection_um).toBeGreaterThan(ra.deflection_um);
    });

    it("deep channel (depth > 3×D) AND deflection > 25 μm fails the gate", () => {
      const input = baseInput(STEEL);
      input.tool.diameterMm = 4;
      input.tool.overhangMm = 80;
      input.geometry.channelDepthMm = 50;
      const r = pipeline.run(input);
      expect(r.deflectionPass).toBe(false);
      const stage = r.stages.find((s) => s.stageName === "deflection_gate")!;
      expect(stage.passed).toBe(false);
      expect(r.warnings.some((w) => /DEFLECTION EXCEEDS/i.test(w))).toBe(true);
    });

    it("shallow channel passes deflection gate even with high deflection", () => {
      const input = baseInput(STEEL);
      input.tool.diameterMm = 4;
      input.tool.overhangMm = 80;
      input.geometry.channelDepthMm = 5;
      const r = pipeline.run(input);
      expect(r.deflectionPass).toBe(true);
    });

    it("flute count affects effective second-moment and thus deflection", () => {
      const a = baseInput(STEEL);
      a.tool.flutes = 2;
      const b = baseInput(STEEL);
      b.tool.flutes = 6;
      const ra = pipeline.run(a);
      const rb = pipeline.run(b);
      expect(rb.deflection_um).toBeLessThan(ra.deflection_um);
    });
  });

  // ──────────────────────────────────────────────────────────────────────────
  // Failure modes
  // ──────────────────────────────────────────────────────────────────────────
  describe("failure modes", () => {
    it("stages always include all 6 named gates", () => {
      const r = pipeline.run(baseInput(STEEL));
      expect(r.stages.length).toBeGreaterThanOrEqual(STAGE_COUNT_MIN);
      const names = r.stages.map((s) => s.stageName);
      expect(names).toContain("material_resolution");
      expect(names).toContain("thermal_wear_check");
      expect(names).toContain("wall_thickness_gate");
      expect(names).toContain("strategy_selection");
      expect(names).toContain("kienzle_force");
      expect(names).toContain("deflection_gate");
    });

    it("zero overhang produces zero deflection", () => {
      const input = baseInput(STEEL);
      input.tool.overhangMm = 0;
      const r = pipeline.run(input);
      expect(r.deflection_um).toBe(0);
      expect(r.deflectionPass).toBe(true);
    });

    it("zero flutes still computes (engine guards via fluteCorrection)", () => {
      const input = baseInput(STEEL);
      input.tool.flutes = 0;
      const r = pipeline.run(input);
      expect(Number.isFinite(r.deflection_um)).toBe(true);
    });

    it("confidence is reduced when warnings are present", () => {
      const ti = pipeline.run(baseInput(TI));
      const steel = pipeline.run(baseInput(STEEL));
      expect(ti.confidence).toBeLessThanOrEqual(steel.confidence);
    });
  });

  // ──────────────────────────────────────────────────────────────────────────
  // Adversarial inputs
  // ──────────────────────────────────────────────────────────────────────────
  describe("adversarial inputs", () => {
    it("NaN ap_mm override yields NaN cutting force but does not throw", () => {
      const input: ImpellerPipelineInput = { ...baseInput(STEEL), ap_mm: Number.NaN };
      const r = pipeline.run(input);
      expect(r.stages.length).toBeGreaterThan(0);
      expect(Number.isNaN(r.cuttingForce_N)).toBe(true);
    });

    it("Infinity overhang produces Infinity deflection without throwing", () => {
      const input = baseInput(STEEL);
      input.tool.overhangMm = Number.POSITIVE_INFINITY;
      const r = pipeline.run(input);
      expect(r.deflection_um === Number.POSITIVE_INFINITY).toBe(true);
    });

    it("extremely thin wall (0.1 mm) still applies feed reduction", () => {
      const input = baseInput(STEEL);
      input.geometry.wallThicknessMm = 0.1;
      const r = pipeline.run(input);
      expect(r.feedReductionFactor).toBeCloseTo(WALL_THIN_FEED_REDUCTION, 6);
    });

    it("blade count of 1 (degenerate) is tolerated", () => {
      const input = baseInput(STEEL);
      input.geometry.bladeCount = 1;
      const r = pipeline.run(input);
      expect(r.strategy.length).toBeGreaterThan(0);
    });

    it("very deep channel (depth/D ≫ 3) sets deep-channel limit field on gate", () => {
      const input = baseInput(STEEL);
      input.tool.diameterMm = 1;
      input.geometry.channelDepthMm = 100;
      const r = pipeline.run(input);
      expect(r.warnings.some((w) => /Deep channel/i.test(w))).toBe(true);
      const ratio = input.geometry.channelDepthMm / input.tool.diameterMm;
      expect(ratio).toBeGreaterThan(DEEP_CHANNEL_FACTOR);
      const stage = r.stages.find((s) => s.stageName === "deflection_gate")!;
      expect(stage.limit).toBe(DEFLECTION_LIMIT_UM);
    });
  });
});
