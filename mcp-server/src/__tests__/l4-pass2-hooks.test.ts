/**
 * L4-P1-MS1: 20 PASS2 Specialty Hooks + 6 Cadences — unit tests
 */
import { describe, it, expect } from "vitest";
import { specialtyManufacturingHooks } from "../hooks/SpecialtyManufacturingHooks.js";
import { specialtyCadences } from "../hooks/SpecialtyCadences.js";
import { HookContext } from "../engines/HookExecutor.js";

function makeCtx(data: Record<string, any> = {}): HookContext {
  return { target: { data }, source: "test", timestamp: Date.now() } as any;
}

// ============================================================================
// Registration
// ============================================================================
describe("L4 PASS2 registration", () => {
  it("specialtyManufacturingHooks exports 20 hooks", () => {
    expect(specialtyManufacturingHooks.length).toBe(20);
  });

  it("specialtyCadences exports 6 cadences", () => {
    expect(specialtyCadences.length).toBe(6);
  });

  it("6 blocking hooks", () => {
    const blocking = specialtyManufacturingHooks.filter(
      h => h.mode === "blocking"
    );
    expect(blocking.length).toBe(6);
  });

  it("14 warning hooks", () => {
    const warning = specialtyManufacturingHooks.filter(
      h => h.mode === "warning"
    );
    expect(warning.length).toBe(14);
  });

  it("all unique ids", () => {
    const all = [...specialtyManufacturingHooks, ...specialtyCadences];
    const ids = all.map(h => h.id);
    expect(new Set(ids).size).toBe(ids.length);
  });
});

// ============================================================================
// Blocking hooks (6)
// ============================================================================
describe("PASS2 blocking hooks", () => {
  const find = (id: string) =>
    specialtyManufacturingHooks.find(h => h.id === id)!;

  it("singularity-approach blocks near singularity", () => {
    const r = find("singularity-approach").handler(
      makeCtx({ A_angle_deg: 0.5, singularityThreshold_deg: 2, headTableType: "table-table" })
    ) as any;
    expect(r.blocked).toBe(true);
  });

  it("singularity-approach passes safely", () => {
    const r = find("singularity-approach").handler(
      makeCtx({ A_angle_deg: 30, singularityThreshold_deg: 2 })
    ) as any;
    expect(r.blocked).toBe(false);
  });

  it("rtcp-mismatch blocks unsupported RTCP", () => {
    const r = find("rtcp-mismatch").handler(
      makeCtx({ rtcpEnabled: true, machineSupportsRTCP: false })
    ) as any;
    expect(r.blocked).toBe(true);
  });

  it("work-envelope-exceeded blocks overtravel", () => {
    const r = find("work-envelope-exceeded").handler(
      makeCtx({
        maxX_mm: 600,
        machineTravel: { X_max: 500 },
      })
    ) as any;
    expect(r.blocked).toBe(true);
  });

  it("chuck-crush-risk blocks thin wall crush", () => {
    const r = find("chuck-crush-risk").handler(
      makeCtx({
        wallThickness_mm: 1,
        outerDiameter_mm: 50,
        jawForce_N: 30000,
        yieldStrength_MPa: 200,
      })
    ) as any;
    expect(r.blocked).toBe(true);
  });

  it("live-tool-torque-exceeded blocks over-torque", () => {
    const r = find("live-tool-torque-exceeded").handler(
      makeCtx({ requiredTorque_Nm: 60, liveToolMaxTorque_Nm: 40 })
    ) as any;
    expect(r.blocked).toBe(true);
  });

  it("tool-reach-insufficient blocks short tool", () => {
    const r = find("tool-reach-insufficient").handler(
      makeCtx({ featureDepth_mm: 100, clearance_mm: 5, toolLength_mm: 80 })
    ) as any;
    expect(r.blocked).toBe(true);
  });
});

// ============================================================================
// Warning hooks (14 — sample key ones)
// ============================================================================
describe("PASS2 warning hooks", () => {
  const find = (id: string) =>
    specialtyManufacturingHooks.find(h => h.id === id)!;

  it("white-layer-risk warns on hard turning at speed", () => {
    const r = find("white-layer-risk").handler(
      makeCtx({ hardness_hrc: 60, cuttingSpeed_m_min: 250 })
    ) as any;
    expect(r.warnings).toBeDefined();
    expect(r.warnings.length).toBeGreaterThan(0);
  });

  it("recast-layer-thick warns when exceeding spec", () => {
    const r = find("recast-layer-thick").handler(
      makeCtx({ predictedRecast_um: 40, maxRecast_um: 25 })
    ) as any;
    expect(r.warnings).toBeDefined();
  });

  it("steady-rest-needed warns high L/D", () => {
    const r = find("steady-rest-needed").handler(
      makeCtx({ length_mm: 500, diameter_mm: 50 })
    ) as any;
    expect(r.warnings).toBeDefined();
  });

  it("passivation-required warns on SS without callout", () => {
    const r = find("passivation-required").handler(
      makeCtx({ material: "316 Stainless", passivationCallout: false })
    ) as any;
    expect(r.warnings).toBeDefined();
  });

  it("chip-wrap-risk warns on unattended ductile", () => {
    const r = find("chip-wrap-risk").handler(
      makeCtx({
        material: "6061 Aluminum",
        unattendedOperation: true,
        hasChipBreaker: false,
      })
    ) as any;
    expect(r.warnings).toBeDefined();
  });

  it("material-cert-unverified warns", () => {
    const r = find("material-cert-unverified").handler(
      makeCtx({ materialCertVerified: false })
    ) as any;
    expect(r.warnings).toBeDefined();
  });

  it("minimum-wall-thickness warns thin wall", () => {
    const r = find("minimum-wall-thickness").handler(
      makeCtx({ wallThickness_mm: 0.5, minimumWall_mm: 1.0 })
    ) as any;
    expect(r.warnings).toBeDefined();
  });

  it("thread-relief-missing warns", () => {
    const r = find("thread-relief-missing").handler(
      makeCtx({ hasThread: true, hasThreadRelief: false })
    ) as any;
    expect(r.warnings).toBeDefined();
  });
});

// ============================================================================
// Cadences (6)
// ============================================================================
describe("PASS2 cadences", () => {
  const find = (id: string) =>
    specialtyCadences.find(h => h.id === id)!;

  it("frf-library-match warns low match", () => {
    const r = find("cadence-frf-library-match").handler(
      makeCtx({ frfMatchScore: 0.3 })
    ) as any;
    expect(r.warnings).toBeDefined();
  });

  it("tolerance-risk-score warns high risk", () => {
    const r = find("cadence-tolerance-risk-score").handler(
      makeCtx({ tightToleranceCount: 10, historicalCpk: 1.0 })
    ) as any;
    expect(r.warnings).toBeDefined();
  });

  it("operator-skill-match warns mismatch", () => {
    const r = find("cadence-operator-skill-match").handler(
      makeCtx({ jobDifficulty: 5, operatorSkillLevel: 2 })
    ) as any;
    expect(r.warnings).toBeDefined();
  });

  it("machine-utilization warns low util", () => {
    const r = find("cadence-machine-utilization").handler(
      makeCtx({ machines: [{ id: "M1", utilizationPct: 30 }] })
    ) as any;
    expect(r.warnings).toBeDefined();
  });

  it("ncr-trend warns high rate", () => {
    const r = find("cadence-ncr-trend").handler(
      makeCtx({ ncrRate: 5 })
    ) as any;
    expect(r.warnings).toBeDefined();
  });

  it("tool-standardization succeeds normally", () => {
    const r = find("cadence-tool-standardization").handler(
      makeCtx({ uniqueToolCount: 20, totalToolChanges: 100 })
    ) as any;
    expect(r.success).toBe(true);
  });
});
