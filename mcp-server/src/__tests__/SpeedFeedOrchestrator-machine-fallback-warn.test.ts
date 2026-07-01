/**
 * SpeedFeedOrchestrator-machine-fallback-warn.test.ts
 *
 * U-SFC-MACHINE-FALLBACK-WARN (slot:oscar, 2026-06-22).
 *
 * When a machine_name is supplied but matches NO capability/catalog/registry source, the
 * orchestrator silently falls back to generic type defaults for power/rpm/torque (confidence 0.4)
 * while resolved_machine.name still echoes the user's name at high confidence -- so the result LOOKS
 * machine-specific while the power/torque safety limits are generic. The fix surfaces a playbook
 * warning naming the machine + the generic specs (oscar soul: never publish without disclosing the
 * uncertainty). It does NOT fabricate specs.
 *
 * Detection key: resolved power_kw provenance -- a real match yields source capability_ / catalog_ /
 * user_input; an unfound named machine yields default_for_ + type.
 */

import { describe, it, expect } from "vitest";
import { speedFeedOrchestratorEngine as E } from "../engines/SpeedFeedOrchestratorEngine.js";
import type { OrchestratorInput } from "../engines/SpeedFeedOrchestratorEngine.js";

const BASE: OrchestratorInput = {
  material: "steel", iso_group: "P", tool_diameter_mm: 10, flutes: 4, tool_material: "carbide",
  tool_coating: "TiAlN", operation: "milling", cut_type: "roughing", axial_depth_mm: 5,
  radial_depth_mm: 3, coolant_type: "flood",
};

const WARN_FRAGMENT = "not found in the capability database";
const hasFallbackWarn = (warnings: string[]) => warnings.some(w => w.includes(WARN_FRAGMENT));

describe("SpeedFeedOrchestrator machine-fallback warning (U-SFC-MACHINE-FALLBACK-WARN)", () => {

  it("named machine NOT in the DB: emits an honest generic-default warning naming the machine + its generic specs", () => {
    const v = E.compute({ ...BASE, machine_name: "totally-unknown-machine-zzz-9000" }).value;
    const warn = v.playbook_warnings.find(w => w.includes(WARN_FRAGMENT)) ?? "";
    // the warning must exist (empty string fails the content checks below) and name the machine
    expect(warn).toContain("totally-unknown-machine-zzz-9000");
    // must disclose it is generic + that the safety limits are not machine-specific
    expect(warn).toContain("generic");
    expect(warn).toContain("NOT machine-specific");
    // provenance proof: power is the low-confidence generic default
    expect(v.resolved_machine.power_kw.source.startsWith("default_for_")).toBe(true);
    expect(v.resolved_machine.power_kw.confidence).toBeLessThanOrEqual(0.5);
  });

  it("known machine (haas vf-2): does NOT emit the fallback warning (real specs resolved)", () => {
    const v = E.compute({ ...BASE, machine_name: "haas vf-2" }).value;
    expect(hasFallbackWarn(v.playbook_warnings)).toBe(false);
    // proof the specs are real (not default): power resolves to the haas's real ~22.4 kW, not generic 15
    expect(v.resolved_machine.power_kw.source.startsWith("default_for_")).toBe(false);
    expect(v.resolved_machine.power_kw.value).toBeGreaterThan(18);
  });

  it("no machine_name supplied: does NOT emit the fallback warning (the user named nothing to resolve)", () => {
    const v = E.compute({ ...BASE }).value;
    expect(hasFallbackWarn(v.playbook_warnings)).toBe(false);
  });

  it("named-unknown machine + explicit machine_power_kw: warning is SUPPRESSED (user provided the spec)", () => {
    const v = E.compute({
      ...BASE,
      machine_name: "totally-unknown-machine-zzz-9000",
      machine_power_kw: 30,
      machine_max_rpm: 15000,
      machine_max_torque_nm: 200,
    }).value;
    expect(hasFallbackWarn(v.playbook_warnings)).toBe(false);
    // the explicit user spec is honored (source user_input, value 30)
    expect(v.resolved_machine.power_kw.source).toBe("user_input");
    expect(v.resolved_machine.power_kw.value).toBeCloseTo(30, 1);
  });

});
