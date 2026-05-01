/**
 * hypermill-ms7-millturn-medical.test.ts
 *
 * Test suite for HM-REV-MS7:
 *   S1: Mill-Turn Geometry Types + Turning Physics Pipeline
 *       - HyperMillStrategyEngine: mill-turn geometry types + turning physics
 *       - HyperMillMillTurnStrategyEngine: CSS limit check + C-axis sync + multi-channel
 *
 *   S2: Medical Domain
 *       - HyperMillMedicalMaterialProfiles: CoCr + PEEK + Ti + Zirconia
 *       - HyperMillDentalBlankRouter: disc/block routing
 *       - HyperMillMillTurnHooks: CSS limit hook + biomedical validation hook
 *
 * Exit gate: ✓ 14+ mill-turn geometry types | ✓ CSS limit hook | ✓ CoCr/PEEK params
 *            ✓ dental blank router | ✓ biomedical validation | ✓ 21+ tests
 */

import { describe, it, expect } from "vitest";

import { hyperMillStrategyEngine } from "../engines/HyperMillStrategyEngine.js";
import { hyperMillMillTurnStrategyEngine } from "../engines/HyperMillMillTurnStrategyEngine.js";
import { hyperMillMedicalMaterialProfiles } from "../engines/HyperMillMedicalMaterialProfiles.js";
import { hyperMillDentalBlankRouter } from "../engines/HyperMillDentalBlankRouter.js";
import { hyperMillCSSLimitHook, hyperMillBiomedicalValidationHook } from "../hooks/HyperMillMillTurnHooks.js";

// ============================================================================
// S1: Mill-Turn Geometry Types — HyperMillStrategyEngine
// ============================================================================

describe("HyperMillStrategyEngine — Mill-Turn Geometry Types (HM-REV-MS7 U-HMR38)", () => {

  it("OD profile roughing returns MT:Rough Turning with G96 CSS physics", () => {
    const r = hyperMillStrategyEngine.calculate({
      geometryType: "od_profile",
      operationGoal: "roughing",
      materialGroup: "P",
    });
    expect(r.hyperMillCycle).toContain("MT:");
    expect(r.turningPhysics).toBeDefined();
    expect(r.turningPhysics!.cssMode).toBe("G96");
    expect(r.turningPhysics!.tnrcRequired).toBe(true);
    expect(r.turningPhysics!.vcRecommended_m_min).toBeGreaterThan(0);
    expect(r.turningPhysics!.kc1_1).toBe(1800);  // ISO P group from CANONICAL_KIENZLE
    expect(r.confidence).toBeGreaterThan(0);
  });

  it("ID profile finishing returns MT:Finish Turning with TNRC required", () => {
    const r = hyperMillStrategyEngine.calculate({
      geometryType: "id_profile",
      operationGoal: "finishing",
      materialGroup: "M",
    });
    expect(r.hyperMillCycle).toContain("MT:");
    expect(r.turningPhysics).toBeDefined();
    expect(r.turningPhysics!.cssMode).toBe("G96");
    expect(r.turningPhysics!.tnrcRequired).toBe(true);
    expect(r.turningPhysics!.kc1_1).toBe(2100);  // ISO M group from CANONICAL_KIENZLE
  });

  it("Thread OD requires G97 (constant RPM) and disables TNRC", () => {
    const r = hyperMillStrategyEngine.calculate({
      geometryType: "thread_od",
      operationGoal: "finishing",
      materialGroup: "P",
    });
    expect(r.hyperMillCycle).toContain("MT:");
    expect(r.turningPhysics!.cssMode).toBe("G97");   // Threading MUST be G97
    expect(r.turningPhysics!.tnrcRequired).toBe(false); // No TNRC during threading
    expect(r.turningPhysics!.notes.some((n) => n.includes("G97"))).toBe(true);
  });

  it("Parting requires G97 (D→0 singularity)", () => {
    const r = hyperMillStrategyEngine.calculate({
      geometryType: "parting",
      operationGoal: "finishing",
    });
    expect(r.hyperMillCycle).toContain("MT:");
    expect(r.turningPhysics!.cssMode).toBe("G97");
    expect(r.turningPhysics!.notes.some((n) => n.toLowerCase().includes("parting"))).toBe(true);
  });

  it("Groove OD roughing returns Groove Turning or Groove Plunging", () => {
    const r = hyperMillStrategyEngine.calculate({
      geometryType: "groove_od",
      operationGoal: "roughing",
    });
    expect(r.hyperMillCycle).toContain("MT:");
    expect(["MT:Groove Turning", "MT:Groove Plunging"]).toContain(r.hyperMillCycle);
    expect(r.turningPhysics).toBeDefined();
  });

  it("Cross hole returns C-axis live-tool note in physics", () => {
    const r = hyperMillStrategyEngine.calculate({
      geometryType: "cross_hole",
      operationGoal: "finishing",
    });
    expect(r.hyperMillCycle).toContain("MT:");
    expect(r.turningPhysics!.cssMode).toBe("G97");  // live tool, not CSS
    const hasLiveToolNote = r.turningPhysics!.notes.some((n) => n.toLowerCase().includes("live tool") || n.toLowerCase().includes("c-axis"));
    expect(hasLiveToolNote).toBe(true);
  });

  it("listMillTurnGeometryTypes returns 14 mill-turn types", () => {
    const types = hyperMillStrategyEngine.listMillTurnGeometryTypes();
    expect(types.length).toBeGreaterThanOrEqual(14);
    const typeIds = types.map((t) => t.geometryType);
    expect(typeIds).toContain("od_profile");
    expect(typeIds).toContain("id_profile");
    expect(typeIds).toContain("thread_od");
    expect(typeIds).toContain("thread_id");
    expect(typeIds).toContain("parting");
    expect(typeIds).toContain("cross_hole");
    expect(typeIds).toContain("cross_slot");
    expect(typeIds).toContain("off_center_feature");
  });

  it("Superalloy (ISO S) gets kc1.1=2800 in turning physics", () => {
    const r = hyperMillStrategyEngine.calculate({
      geometryType: "od_profile",
      operationGoal: "roughing",
      materialGroup: "S",
    });
    expect(r.turningPhysics!.kc1_1).toBe(2800);  // CANONICAL_KIENZLE.S
    expect(r.turningPhysics!.mc).toBeCloseTo(0.28, 2);
  });

  it("Nose radius > 0.2mm forces TNRC even for bore geometry", () => {
    const r = hyperMillStrategyEngine.calculate({
      geometryType: "bore",
      operationGoal: "finishing",
      noseRadiusMm: 0.8,  // large nose radius → TNRC mandatory
    });
    expect(r.turningPhysics!.tnrcRequired).toBe(true);
  });
});

// ============================================================================
// S1: CSS Limit Validation — HyperMillMillTurnStrategyEngine
// ============================================================================

describe("HyperMillMillTurnStrategyEngine — CSS Limit Check (HM-REV-MS7 U-HMR39)", () => {

  it("CSS safe: Vc=220 m/min, D_min=30mm → RPM=2334, machine max 6000 → ok", () => {
    const r = hyperMillMillTurnStrategyEngine.checkCSSLimit({
      vcDesired_m_min: 220,
      minDiameter_mm: 30,
      machineMaxRpm: 6000,
    });
    expect(r.status).toBe("ok");
    // RPM = (1000 × 220) / (π × 30) = 2334.4
    expect(r.rpmAtMinDiameter).toBeCloseTo(2334, 0);
    expect(r.recommendation).toContain("G96");
  });

  it("CSS blocked: Vc=220 m/min, D_min=3mm → RPM=23345, machine max 6000 → blocked", () => {
    const r = hyperMillMillTurnStrategyEngine.checkCSSLimit({
      vcDesired_m_min: 220,
      minDiameter_mm: 3,
      machineMaxRpm: 6000,
    });
    expect(r.status).toBe("rpm_cap_exceeded");
    // RPM = (1000 × 220) / (π × 3) = 23342.72 → rounds to 23343
    expect(r.rpmAtMinDiameter).toBeCloseTo(23343, 0);
    expect(r.rpmCapped).toBe(6000);
    // vcAtCap = π × 3 × 6000 / 1000 = 56.5 m/min
    expect(r.vcAtCapRpm_m_min).toBeCloseTo(56.5, 0);
  });

  it("CSS error: D_min=0 returns error status", () => {
    const r = hyperMillMillTurnStrategyEngine.checkCSSLimit({
      vcDesired_m_min: 100,
      minDiameter_mm: 0,
      machineMaxRpm: 6000,
    });
    expect(r.status).toBe("error");
    expect(r.recommendation).toContain("G97");
  });

  it("C-axis cross-hole sync: 4 holes at 90° spacing, generates 4 positions", () => {
    const r = hyperMillMillTurnStrategyEngine.calculateCAxisSync({
      syncType: "cross_hole",
      cAngle_deg: 0,
      liveToolRpm: 8000,
      liveToolDiameter_mm: 8,
      featureCount: 4,
    });
    expect(r.cAxisPositions_deg).toHaveLength(4);
    expect(r.cAxisPositions_deg[0]).toBe(0);
    expect(r.cAxisPositions_deg[1]).toBe(90);
    expect(r.cAxisPositions_deg[2]).toBe(180);
    expect(r.cAxisPositions_deg[3]).toBe(270);
    expect(r.requiresSpindleIndex).toBe(true);
    // Vc_eff = π × 8 × 8000 / 1000 = 201.1 m/min
    expect(r.vcEffective_m_min).toBeCloseTo(201.1, 0);
  });

  it("C-axis cross-slot sync: generates correct hyperMILL cycle", () => {
    const r = hyperMillMillTurnStrategyEngine.calculateCAxisSync({
      syncType: "cross_slot",
      cAngle_deg: 45,
      liveToolRpm: 6000,
      liveToolDiameter_mm: 6,
      featureCount: 1,
    });
    expect(r.cAxisPositions_deg[0]).toBe(45);
    expect(r.hyperMillCycle).toContain("Pocket Milling");
    expect(r.requiresSpindleIndex).toBe(true);
  });

  it("Multi-channel sync: parallel ops return > 0% efficiency", () => {
    const r = hyperMillMillTurnStrategyEngine.generateMultiChannelSync({
      channel1Ops: ["OD_rough", "OD_finish", "thread_od"],
      channel2Ops: ["sub_face", "sub_drill"],
      controllerFamily: "fanuc",
      partTransferRequired: true,
    });
    expect(r.parallelEfficiency_pct).toBeGreaterThan(0);
    expect(r.syncCodeTemplate).toContain("M200");  // Fanuc wait codes
    expect(r.warnings.some((w) => w.includes("Part transfer") || w.includes("part transfer"))).toBe(true);
  });
});

// ============================================================================
// S2: Medical Material Profiles — HyperMillMedicalMaterialProfiles
// ============================================================================

describe("HyperMillMedicalMaterialProfiles — CoCr + PEEK (HM-REV-MS7 U-HMR41)", () => {

  it("CoCr roughing: kc1.1=2800 from CANONICAL_KIENZLE, Vc 20-40 m/min, climb mandatory", () => {
    const r = hyperMillMedicalMaterialProfiles.getProfile("cocr", "roughing");
    expect(r.profile.kc1_1).toBe(2800);  // CANONICAL_KIENZLE.S
    expect(r.profile.mc).toBeCloseTo(0.28, 2);
    expect(r.vcRecommended_m_min).toBeGreaterThanOrEqual(20);
    expect(r.vcRecommended_m_min).toBeLessThanOrEqual(40);
    expect(r.profile.climbMillingMandatory).toBe(true);
    expect(r.profile.throughSpindleCoolantRequired).toBe(true);
    expect(r.hasViolations).toBe(false);
    expect(r.warnings.some((w) => w.includes("climb"))).toBe(true);
  });

  it("CoCr finishing: achievable Ra ≤ 0.4 µm", () => {
    const r = hyperMillMedicalMaterialProfiles.getProfile("cocr", "finishing");
    expect(r.profile.achievableRaFinishing_um).toBeLessThanOrEqual(0.4);
    expect(r.vcRecommended_m_min).toBeGreaterThanOrEqual(30);
    expect(r.vcRecommended_m_min).toBeLessThanOrEqual(50);
  });

  it("CoCr worn tool (70%) triggers violation (kc correction)", () => {
    const r = hyperMillMedicalMaterialProfiles.getProfile("cocr", "roughing", 0.71);
    expect(r.hasViolations).toBe(true);
    expect(r.violations.some((v) => v.toLowerCase().includes("change tool"))).toBe(true);
    // kc corrected = 2800 × (1 + 0.71 × 0.25) = 2800 × 1.1775 = 3297
    expect(r.kcCorrected).toBeGreaterThan(2800);
    expect(r.kcCorrected).toBeCloseTo(2800 * (1 + 0.71 * 0.25), 0);
  });

  it("PEEK thermal ceiling = 250°C, kc1.1=700, no work hardening", () => {
    const r = hyperMillMedicalMaterialProfiles.getProfile("peek", "roughing");
    expect(r.profile.thermalCeiling_C).toBe(250);
    expect(r.profile.kc1_1).toBe(700);
    expect(r.profile.workHardeningFactor).toBe(1.0);
    expect(r.profile.sharpToolMandatory).toBe(true);
  });

  it("PEEK finishing: Vc 300-500 m/min range", () => {
    const r = hyperMillMedicalMaterialProfiles.getProfile("peek", "finishing");
    expect(r.vcRecommended_m_min).toBeGreaterThanOrEqual(300);
    expect(r.vcRecommended_m_min).toBeLessThanOrEqual(500);
  });

  it("resolveMaterialKey maps common aliases correctly", () => {
    expect(hyperMillMedicalMaterialProfiles.resolveMaterialKey("CoCrMo")).toBe("cocr");
    expect(hyperMillMedicalMaterialProfiles.resolveMaterialKey("cobalt_chromium")).toBe("cocr");
    expect(hyperMillMedicalMaterialProfiles.resolveMaterialKey("PEEK")).toBe("peek");
    expect(hyperMillMedicalMaterialProfiles.resolveMaterialKey("Ti-6Al-4V")).toBe("titanium_gr5");
    expect(hyperMillMedicalMaterialProfiles.resolveMaterialKey("zirconia")).toBe("zirconia_sintered");
    expect(hyperMillMedicalMaterialProfiles.resolveMaterialKey("zirconia green")).toBe("zirconia_green");
    expect(hyperMillMedicalMaterialProfiles.resolveMaterialKey("unknown_plastic")).toBeNull();
  });
});

// ============================================================================
// S2: Dental Blank Router — HyperMillDentalBlankRouter
// ============================================================================

describe("HyperMillDentalBlankRouter — Disc/Block Strategy Routing (HM-REV-MS7 U-HMR42)", () => {

  it("Zirconia disc crown → 3+2 A-axis strategy, dry milling, shrinkage 22%", () => {
    const r = hyperMillDentalBlankRouter.route({
      blankType: "disc",
      material: "zirconia",
      restorationCategory: "single_unit",
      zirconiaState: "green",
    });
    expect(r.strategyType).toBe("3plus2_aaxis");
    expect(r.shrinkageCompensation_pct).toBe(22.0);
    expect(r.hyperMillSettings.coolantType).toBe("dry");
    expect(r.cycles.length).toBeGreaterThanOrEqual(2);
    expect(r.cycles[0].hyperMillCycle).toContain("5X:");
    expect(r.cycles[0].coolant).toBe("dry");
  });

  it("CoCr block bridge → 5-axis simultaneous, through-spindle coolant, climb milling", () => {
    const r = hyperMillDentalBlankRouter.route({
      blankType: "block",
      material: "cocr",
      restorationCategory: "multi_unit",
    });
    expect(r.strategyType).toBe("5axis_simultaneous");
    expect(r.hyperMillSettings.climbMilling).toBe(true);
    expect(r.hyperMillSettings.coolantType).toBe("through_spindle");
    expect(r.cycles[0].coolant).toBe("wet_through_spindle");
    expect(r.complianceNotes.some((n) => n.includes("ASTM F75"))).toBe(true);
  });

  it("PEEK disc abutment → 3+2 strategy, air blast, no climb mandatory", () => {
    const r = hyperMillDentalBlankRouter.route({
      blankType: "disc",
      material: "peek",
      restorationCategory: "implant_prosthetic",
    });
    expect(r.strategyType).toBe("3plus2_aaxis");
    expect(r.hyperMillSettings.coolantType).toBe("air_blast");
    expect(r.cycles[0].coolant).toBe("air_blast");
    expect(r.complianceNotes.some((n) => n.includes("ISO 10993"))).toBe(true);
  });

  it("Sintered zirconia → wet milling, low feeds, diamond tools note", () => {
    const r = hyperMillDentalBlankRouter.route({
      blankType: "block",
      material: "zirconia",
      restorationCategory: "single_unit",
      zirconiaState: "sintered",
    });
    expect(r.hyperMillSettings.coolantType).toBe("through_spindle_wet");
    expect(r.cycles[0].stepoverMm).toBeLessThanOrEqual(0.05);
    const hasDiamondNote = r.toolingNotes.some((n) => n.toLowerCase().includes("diamond"));
    expect(hasDiamondNote).toBe(true);
  });
});

// ============================================================================
// S2: Biomedical Hooks — hypermill-css-limit + hypermill-biomedical-validation
// ============================================================================

describe("hypermill-css-limit hook (HM-REV-MS7 U-HMR39)", () => {

  const makeCtx = (data: Record<string, any>) => ({
    id: "test",
    target: { data },
    metadata: {},
    timestamp: Date.now(),
    sessionId: "test-session",
  }) as any;

  it("Passes when CSS mode not active", () => {
    const r = hyperMillCSSLimitHook.handler(makeCtx({}));
    expect(r.status).toBe("success");
  });

  it("Passes when G96 + RPM within limits", () => {
    const r = hyperMillCSSLimitHook.handler(makeCtx({
      cssMode: "G96",
      vc_m_min: 200,
      min_diameter_mm: 30,
      machine_max_rpm: 6000,
    }));
    expect(r.status).toBe("success");
    expect(r.message).toContain("safe");
  });

  it("Blocks when G96 + RPM exceeds machine max", () => {
    const r = hyperMillCSSLimitHook.handler(makeCtx({
      cssMode: "G96",
      vc_m_min: 200,
      min_diameter_mm: 2,
      machine_max_rpm: 6000,
    }));
    expect(r.status).toBe("blocked");
    expect(r.message).toContain("EXCEEDED");
    // Issues should contain fix options
    const issues = (r as any).issues ?? [];
    expect(issues.length).toBeGreaterThan(0);
  });

  it("Hook has correct metadata (id, mode, phase, priority)", () => {
    expect(hyperMillCSSLimitHook.id).toBe("hypermill-css-limit");
    expect(hyperMillCSSLimitHook.mode).toBe("blocking");
    expect(hyperMillCSSLimitHook.phase).toBe("pre-toolpath");
    expect(hyperMillCSSLimitHook.priority).toBe("critical");
  });
});

describe("hypermill-biomedical-validation hook (HM-REV-MS7 U-HMR43)", () => {

  const makeCtx = (data: Record<string, any>) => ({
    id: "test",
    target: { data },
    metadata: {},
    timestamp: Date.now(),
    sessionId: "test-session",
  }) as any;

  it("Passes for non-medical material (steel)", () => {
    const r = hyperMillBiomedicalValidationHook.handler(makeCtx({ material: "carbon_steel" }));
    expect(r.status).toBe("success");
  });

  it("Blocks when CoCr uses conventional milling", () => {
    const r = hyperMillBiomedicalValidationHook.handler(makeCtx({
      material: "CoCr",
      cuttingMode: "conventional",
      implant_surface: true,
    }));
    expect(r.status).toBe("blocked");
    const issues = (r as any).issues ?? [];
    expect(issues.some((i: string) => i.includes("COCR WORK HARDENING"))).toBe(true);
  });

  it("Blocks when implant surface Ra > 0.8µm", () => {
    const r = hyperMillBiomedicalValidationHook.handler(makeCtx({
      material: "titanium_gr5",
      implant_surface: true,
      predicted_ra_um: 1.6,
      coolantType: "through_spindle",
    }));
    expect(r.status).toBe("blocked");
    const issues = (r as any).issues ?? [];
    expect(issues.some((i: string) => i.includes("SURFACE FINISH"))).toBe(true);
  });

  it("Blocks when implant-grade material uses non-through-spindle coolant", () => {
    const r = hyperMillBiomedicalValidationHook.handler(makeCtx({
      material: "cocr",
      implant_surface: true,
      coolantType: "flood",
      cuttingMode: "climb",  // correct cutting mode
    }));
    expect(r.status).toBe("blocked");
    const issues = (r as any).issues ?? [];
    expect(issues.some((i: string) => i.includes("COOLANT"))).toBe(true);
  });

  it("Blocks when PEEK cutting temperature exceeds 250°C", () => {
    const r = hyperMillBiomedicalValidationHook.handler(makeCtx({
      material: "peek",
      estimated_temp_c: 300,
      implant_surface: true,
    }));
    expect(r.status).toBe("blocked");
    const issues = (r as any).issues ?? [];
    expect(issues.some((i: string) => i.includes("PEEK THERMAL"))).toBe(true);
  });

  it("Hook has FDA/MDR compliance in description", () => {
    expect(hyperMillBiomedicalValidationHook.description).toContain("FDA 21 CFR 820");
    expect(hyperMillBiomedicalValidationHook.description).toContain("EU MDR");
  });
});
