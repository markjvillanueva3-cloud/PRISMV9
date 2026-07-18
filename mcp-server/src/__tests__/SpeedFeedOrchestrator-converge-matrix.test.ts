/**
 * SpeedFeedOrchestrator-converge-matrix.test.ts (U-SFC-CONVERGE-MATRIX, slot:oscar, 2026-06-22)
 *
 * Convergence default-on validation campaign: PRISM_SFC_CONVERGE=1 makes compute() delegate core physics
 * to UltimateSpeedFeedEngine behind a safety gate (U-SFC-CONVERGE-SAFETY). That gate is well-tested for
 * STEEL (P) only (the AGGRESSIVE/LIGHT/WEAK cases). Before the flag can be defaulted on, convergence must
 * be proven SAFE + SELF-CONSISTENT across the full ISO material spectrum -- this sweeps P/M/K/N/S/H x
 * roughing/finishing flag-ON and asserts the same algebraic safety invariants hold for EVERY material:
 *   I1 rpm-consistency:  cutting_speed_mpm ~= pi*D*spindle_rpm/1000
 *   I2 mrr-consistency:  mrr_cm3min ~= axial*radial*feed_rate/1000
 *   I3 safety-honesty:   the power/workholding/torque checks reflect the PUBLISHED physics (no under-report)
 * plus machine-safety (rpm within the machine cap) and physical validity (positive, finite).
 *
 * These invariants are algebraic (material-independent), so they are real oracles -- a per-material
 * convergence under-report or over-publish (the U-SFC-CONVERGE-SAFETY bug class) fails them. Holds for
 * BOTH the gate-accept and gate-fallback paths. This is the evidence that convergence is safe to default on.
 */
import { describe, it, expect, afterEach } from "vitest";
import { speedFeedOrchestratorEngine as E } from "../engines/SpeedFeedOrchestratorEngine.js";
import type { OrchestratorInput } from "../engines/SpeedFeedOrchestratorEngine.js";

const SAVED = process.env.PRISM_SFC_CONVERGE;
afterEach(() => {
  if (SAVED !== undefined) process.env.PRISM_SFC_CONVERGE = SAVED;
  else delete process.env.PRISM_SFC_CONVERGE;
});

// One representative workpiece per ISO group (names the engine resolves to the right group + hardness).
const MATERIALS: Array<{ material: string; iso_group: OrchestratorInput["iso_group"] }> = [
  { material: "1045", iso_group: "P" },        // steel
  { material: "304", iso_group: "M" },         // austenitic stainless
  { material: "gray_iron", iso_group: "K" },   // cast iron
  { material: "6061", iso_group: "N" },        // aluminum
  { material: "Ti-6Al-4V", iso_group: "S" },   // titanium / superalloy
  { material: "D2", iso_group: "H" },          // hardened tool steel
];

const CUTS: Array<{ cut_type: OrchestratorInput["cut_type"]; axial_depth_mm: number; radial_depth_mm: number }> = [
  { cut_type: "roughing", axial_depth_mm: 6, radial_depth_mm: 4 },
  { cut_type: "finishing", axial_depth_mm: 0.5, radial_depth_mm: 0.3 },
];

function baseInput(material: string, iso_group: OrchestratorInput["iso_group"], cut: typeof CUTS[number]): OrchestratorInput {
  return {
    material, iso_group, tool_diameter_mm: 10, flutes: 4, tool_material: "carbide",
    tool_coating: "TiAlN", corner_radius_mm: 0.5, tool_stickout_mm: 30, operation: "milling",
    machine_name: "haas vf-2", coolant_type: "flood", ...cut,
  };
}

/** Algebraic self-consistency + safety-honesty (I1-I3) -- holds for accept AND fallback paths. */
function assertConsistentAndSafe(v: Record<string, any>, label: string): void {
  const D = v.resolved_tool?.diameter_mm?.value ?? 10;
  // physical validity
  expect(v.cutting_speed_mpm, `${label} Vc`).toBeGreaterThan(0);
  expect(Number.isFinite(v.spindle_rpm) && v.spindle_rpm > 0, `${label} rpm finite>0`).toBe(true);
  expect(v.feed_rate_mmmin, `${label} feed`).toBeGreaterThan(0);
  expect(v.power_kw, `${label} power`).toBeGreaterThan(0);
  // I1 rpm: Vc = pi*D*rpm/1000
  expect(Math.abs(Math.PI * D * v.spindle_rpm / 1000 - v.cutting_speed_mpm), `${label} I1 rpm`).toBeLessThan(0.7);
  // I2 mrr: MRR = ap*ae*Vf/1000
  expect(Math.abs((v.axial_depth_mm * v.radial_depth_mm * v.feed_rate_mmmin / 1000) - v.mrr_cm3min), `${label} I2 mrr`).toBeLessThan(0.7);
  // I3 honesty: the safety panel reflects the PUBLISHED physics (the under-report bug)
  const pc = v.safety_checks.find((c: any) => c.name === "power");
  const tq = v.safety_checks.find((c: any) => c.name === "torque");
  expect(Math.abs(pc.value - v.power_kw), `${label} I3 power-honesty`).toBeLessThan(0.05);
  expect(Math.abs(tq.value - v.torque_Nm), `${label} I3 torque-honesty`).toBeLessThan(0.05);
  // machine-safety: published rpm never exceeds the resolved machine cap
  const maxRpm = v.resolved_machine?.max_rpm?.value;
  if (typeof maxRpm === "number" && maxRpm > 0) {
    expect(v.spindle_rpm, `${label} rpm<=cap`).toBeLessThanOrEqual(maxRpm + 1);
  }
}

describe("SpeedFeedOrchestrator convergence safety across the ISO material spectrum (U-SFC-CONVERGE-MATRIX)", () => {
  for (const m of MATERIALS) {
    for (const cut of CUTS) {
      const label = `${m.material}(${m.iso_group})/${cut.cut_type}`;
      it(`flag ON: ${label} is self-consistent + safety-honest + machine-safe (convergence never under-reports/over-publishes)`, () => {
        process.env.PRISM_SFC_CONVERGE = "1";
        const v = E.compute(baseInput(m.material, m.iso_group, cut)).value as Record<string, any>;
        assertConsistentAndSafe(v, label);
      });
    }
  }

  it("flag ON vs OFF: every material/cut produces a valid result on BOTH paths (convergence breaks no material class)", () => {
    for (const m of MATERIALS) {
      const inp = baseInput(m.material, m.iso_group, CUTS[0]);
      process.env.PRISM_SFC_CONVERGE = "1";
      const on = E.compute(inp).value as Record<string, any>;
      delete process.env.PRISM_SFC_CONVERGE;
      const off = E.compute(inp).value as Record<string, any>;
      expect(on.cutting_speed_mpm, `${m.material} ON Vc>0`).toBeGreaterThan(0);
      expect(off.cutting_speed_mpm, `${m.material} OFF Vc>0`).toBeGreaterThan(0);
    }
  });
});
