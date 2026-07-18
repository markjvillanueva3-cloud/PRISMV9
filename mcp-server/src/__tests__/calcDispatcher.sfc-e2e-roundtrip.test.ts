import { describe, it, expect } from "vitest";
import { registerCalcDispatcher } from "../tools/dispatchers/calcDispatcher.js";

/**
 * MS-CRITWIRE U-CW-16 -- SFC E2E round-trip. An SFC recommendation must flow THROUGH the wired
 * prism_calc actions (material_resolve -> sf_orchestrate -> deflection_calculate), not just the
 * engine singletons, for >=3 spanning (material x machine x tool-coating x engagement-regime) cells,
 * and the cross-action result must be physically consistent.
 *
 * Load-bearing physical invariant (from SpeedFeedOrchestrator-force-parity): specific cutting energy
 * u = power_kw*60 / mrr_cm3min [J/mm3] is a material property (~2-7 for P-steel, lower for N-aluminum,
 * higher for S-superalloy) that is nearly operating-point independent -- the cleanest cross-action
 * physical check. rpm must also respect the derate-only machine cap, and deflection at the recommended
 * force must be finite/positive.
 */
interface CapturedTool { name: string; handler: (args: any) => Promise<any>; }

function calcTool(): CapturedTool {
  const tools: CapturedTool[] = [];
  const server = { tool(name: string, _d: string, _s: any, handler: any) { tools.push({ name, handler }); } };
  registerCalcDispatcher(server);
  return tools[0];
}

async function call(tool: CapturedTool, action: string, params: Record<string, any> = {}): Promise<any> {
  const r = await tool.handler({ action, params });
  const text = r?.content?.[0]?.text;
  return text ? JSON.parse(text) : r;
}

/** sf_orchestrate returns an AtomicValue-wrapped OrchestratorResult; unwrap wherever the fields live. */
function sfFields(r: any): any {
  return r?.value ?? r?.result?.value ?? r?.data ?? r;
}
const specificEnergy = (v: any) => (v.power_kw * 60) / Math.max(v.mrr_cm3min, 1e-9);

// 3 spanning cells: P-steel/Haas/uncoated/low-radial, N-alu/Hurco/uncoated/full-slot, S-Ti/Okuma/coated/mid.
const CELLS = [
  {
    name: "P-steel 4140 / Haas VF-2 / uncoated / 15% radial",
    designation: "4140", expectIso: "P",
    orch: {
      material: "4140 prehard", iso_group: "P", hardness_hb: 300,
      machine_name: "Haas VF-2", machine_power_kw: 22.4, machine_max_rpm: 8100, machine_max_torque_nm: 122,
      tool_diameter_mm: 12, flutes: 4, tool_material: "carbide", tool_coating: "none", corner_radius_mm: 0.5,
      tool_stickout_mm: 20, operation: "milling", cut_type: "roughing", strategy: "conventional",
      axial_depth_mm: 6, radial_depth_mm: 1.8, radial_depth_pct: 15, coolant_type: "flood",
      optimize_for: "balanced", feature_tolerance_mm: 0.05,
    },
    uMin: 2.0, uMax: 7.0,
  },
  {
    name: "N-aluminum 6061-T6 / Hurco VM30i / uncoated / 100% slot",
    designation: "6061-T6", expectIso: "N",
    orch: {
      material: "6061-T6 aluminum", iso_group: "N", hardness_hb: 95,
      machine_name: "Hurco VM30i", machine_power_kw: 15, machine_max_rpm: 12000,
      tool_diameter_mm: 12, flutes: 3, tool_material: "carbide", tool_coating: "none", corner_radius_mm: 0.5,
      tool_stickout_mm: 20, operation: "milling", cut_type: "roughing", strategy: "conventional",
      axial_depth_mm: 6, radial_depth_mm: 12, radial_depth_pct: 100, coolant_type: "flood",
      optimize_for: "balanced", feature_tolerance_mm: 0.05,
    },
    uMin: 0.4, uMax: 3.0,
  },
  {
    name: "S-titanium Ti-6Al-4V / Okuma M460V / coated / 50% radial",
    designation: "Ti-6Al-4V", expectIso: "S",
    orch: {
      material: "Ti-6Al-4V", iso_group: "S", hardness_hb: 350,
      machine_name: "Okuma M460V-5AX", machine_power_kw: 22, machine_max_rpm: 15000, machine_max_torque_nm: 199,
      tool_diameter_mm: 10, flutes: 4, tool_material: "carbide", tool_coating: "AlTiN", corner_radius_mm: 0.5,
      tool_stickout_mm: 25, operation: "milling", cut_type: "roughing", strategy: "conventional",
      axial_depth_mm: 4, radial_depth_mm: 5, radial_depth_pct: 50, coolant_type: "high_pressure",
      optimize_for: "balanced", feature_tolerance_mm: 0.05,
    },
    uMin: 2.0, uMax: 12.0,
  },
] as const;

describe("prism_calc SFC E2E round-trip through wired actions (MS-CRITWIRE U-CW-16)", () => {
  const calc = calcTool();

  for (const cell of CELLS) {
    it(`${cell.name}: material_resolve -> sf_orchestrate -> deflection_calculate is physically consistent`, async () => {
      // 1) material_resolve: designation -> ISO group (the material identity the SFC math keys on).
      const mat = await call(calc, "material_resolve", { designation: cell.designation });
      expect(mat.success !== false).toBe(true);
      // material_resolve returns { success, resolved, material: ResolvedMaterial }; ISO is nested.
      const iso = mat.material?.iso_group ?? mat.iso_group ?? mat.material?.isoGroup;
      expect(iso).toBe(cell.expectIso);

      // 2) sf_orchestrate: the SFC recommendation.
      const orchRaw = await call(calc, "sf_orchestrate", cell.orch);
      const v = sfFields(orchRaw);
      expect(Number.isFinite(v.cutting_speed_mpm) && v.cutting_speed_mpm > 0).toBe(true);
      expect(Number.isFinite(v.spindle_rpm) && v.spindle_rpm > 0).toBe(true);
      expect(Number.isFinite(v.tangential_force_N) && v.tangential_force_N > 0).toBe(true);
      expect(v.tool_life_min).toBeGreaterThan(0);
      // rpm respects the derate-only machine cap (never recommends above the spindle nameplate).
      expect(v.spindle_rpm).toBeLessThanOrEqual(cell.orch.machine_max_rpm + 1);
      // rpm <-> Vc closed-form identity n = 1000*Vc/(pi*D) (allow clamp + display rounding).
      const rpmFromVc = (1000 * v.cutting_speed_mpm) / (Math.PI * cell.orch.tool_diameter_mm);
      expect(v.spindle_rpm).toBeLessThanOrEqual(rpmFromVc * 1.02 + 1);
      // specific cutting energy is physical for the ISO group (the cross-action force/power check).
      const u = specificEnergy(v);
      expect(u).toBeGreaterThan(cell.uMin);
      expect(u).toBeLessThan(cell.uMax);

      // 3) deflection_calculate at the recommended cutting force -> finite, positive.
      const defl = await call(calc, "deflection_calculate", {
        force: v.tangential_force_N, length: cell.orch.tool_stickout_mm,
        diameter: cell.orch.tool_diameter_mm, material: "carbide",
      });
      expect(defl.totalDeflection_um.value).toBeGreaterThan(0);
      expect(Number.isFinite(defl.totalDeflection_um.value)).toBe(true);
      expect(defl.stiffness_N_mm.value).toBeGreaterThan(0);
    });
  }

  it("cross-cell ordering: N-aluminum specific energy < P-steel (lower kc preserved end-to-end)", async () => {
    const steel = sfFields(await call(calc, "sf_orchestrate", CELLS[0].orch));
    const alu = sfFields(await call(calc, "sf_orchestrate", CELLS[1].orch));
    expect(specificEnergy(alu)).toBeLessThan(specificEnergy(steel));
  });

  it("material_resolve rejects a non-string designation without crashing the dispatcher", async () => {
    const r = await call(calc, "material_resolve", { designation: 4140 as any });
    expect(r.success).toBe(false);
    expect(String(r.error)).toMatch(/designation/i);
  });
});
