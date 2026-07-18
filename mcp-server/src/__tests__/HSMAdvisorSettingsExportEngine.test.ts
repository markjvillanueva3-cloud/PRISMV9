/**
 * HSMAdvisorSettingsExportEngine tests — round-trip through the REAL read adapter.
 *
 * The exporter emits INCH (HSMAdvisor-native) from PRISM's mm catalog. The core test reads the
 * emitted settings_v2.xml back through `hsmAdvisorAdapterEngine.parseXml(..., convertToMm:true)`
 * (which scales length fields ×25.4) and asserts the original mm value is recovered — proving the
 * mm→inch→mm conversion runs in the correct direction (the units-first safety rail as a test).
 *
 * @milestone CATALOG-APP-WIRING / hsmadvisor_export_settings (romeo, 2026-06-09)
 */

import { describe, it, expect } from "vitest";
import {
  hsmAdvisorSettingsExportEngine,
  HSMAdvisorSettingsExportEngine,
} from "../engines/HSMAdvisorSettingsExportEngine.js";
import { hsmAdvisorAdapterEngine } from "../engines/HSMAdvisorAdapterEngine.js";

const SANDVIK_ENDMILL = {
  id: "sandvik-R390-11T308",
  manufacturer: "Sandvik",
  series: "CoroMill 390",
  designation: "R390-11T308M-PM",
  type: "end_mill",
  material: "carbide",
  coating: "TiAlN",
  physical: {
    cutting_diameter_mm: 12.0,
    shank_diameter_mm: 12.0,
    overall_length_mm: 83.0,
    flute_length_mm: 22.0,
    corner_radius_mm: 0.8,
  },
  flute_count: 4,
  helix_angle_deg: 30,
  iso_groups: ["P"],
  source: "sandvik-2022-tool-catalog",
};

/** Parse emitted XML back through the production adapter. */
function roundTrip(xml: string, convertToMm: boolean) {
  return hsmAdvisorAdapterEngine.parseXml(xml, {
    sourcePath: "test://settings_v2.xml",
    sourceMtimeMs: 0,
    convertToMm,
  });
}

describe("HSMAdvisorSettingsExportEngine", () => {
  it("round-trips mm→inch→mm through the real adapter (units-first proof)", () => {
    const out = hsmAdvisorSettingsExportEngine.export({ tool: SANDVIK_ENDMILL });
    expect(out.tool_emitted).toBe(true);

    // Read back asking for mm — adapter multiplies the emitted inch fields by 25.4.
    const state = roundTrip(out.xml, true);
    expect(state.tool).not.toBe(null);
    const t = state.tool!;
    expect(t.diameter).toBeCloseTo(12.0, 2); // 12mm → 0.4724in → ×25.4 → 12.0mm
    expect(t.shank_dia).toBeCloseTo(12.0, 2);
    expect(t.flute_len).toBeCloseTo(22.0, 2);
    expect(t.corner_rad).toBeCloseTo(0.8, 2);
    expect(t.flutes).toBe(4); // unitless — never scaled
    expect(t.helix_angle).toBe(30); // unitless
    expect(t.type).toBe("endmill"); // mapped from end_mill
  });

  it("emits INCH natively (read with convertToMm=false yields the inch value)", () => {
    const out = hsmAdvisorSettingsExportEngine.export({ tool: SANDVIK_ENDMILL });
    const t = roundTrip(out.xml, false).tool!;
    // 12mm expressed in inches, no scaling applied on read.
    expect(t.diameter).toBeCloseTo(12.0 / 25.4, 4); // ≈ 0.47244
    expect(t.flute_len).toBeCloseTo(22.0 / 25.4, 4);
  });

  it("produces deterministic, UUID-shaped GUIDs (idempotent re-export)", () => {
    const g1 = hsmAdvisorSettingsExportEngine.toolGuid("sandvik-R390-11T308");
    const g2 = hsmAdvisorSettingsExportEngine.toolGuid("sandvik-R390-11T308");
    const g3 = hsmAdvisorSettingsExportEngine.toolGuid("kennametal-KSEM");
    expect(g1).toBe(g2);
    expect(g1).not.toBe(g3);
    expect(g1).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/);
    // Round-trips intact through the adapter (XML-escaped guid survives).
    const a = roundTrip(hsmAdvisorSettingsExportEngine.export({ tool: SANDVIK_ENDMILL }).xml, false).tool!;
    expect(a.guid).toBe(g1);
  });

  it("round-trips the <Settings> block (sfm_pc / ipt_pc)", () => {
    const out = hsmAdvisorSettingsExportEngine.export({ tool: SANDVIK_ENDMILL, sfm_pc: 85, ipt_pc: 110 });
    const s = roundTrip(out.xml, false).settings;
    expect(s.sfm_pc).toBe(85);
    expect(s.ipt_pc).toBe(110);
  });

  it("warns (does not throw) and emits no <Tool> when nothing resolves", () => {
    // No tool, no tool_id, and a filter that the catalog can't satisfy in a bare env.
    const out = hsmAdvisorSettingsExportEngine.export({ type: "nonexistent_tool_type_xyz" });
    expect(out.tool_emitted).toBe(false);
    expect(out.warnings.some((w) => /no tool resolved/i.test(w))).toBe(true);
    // Settings-only XML still parses cleanly through the adapter (tool comes back null).
    const state = roundTrip(out.xml, false);
    expect(state.tool).toBe(null);
    expect(state.settings.sfm_pc).toBe(100); // default emitted
  });

  it("surfaces a material-not-mapped warning (HSMAdvisor enum ids unknown)", () => {
    const out = hsmAdvisorSettingsExportEngine.export({ tool: SANDVIK_ENDMILL });
    expect(out.warnings.some((w) => /material .*not mapped/i.test(w))).toBe(true);
    // And the enum id is emitted as the safe default 0 (not a guess).
    const t = roundTrip(out.xml, false).tool!;
    expect(t.tool_material_id).toBe(0);
  });

  it("XML-escapes special characters in text fields so the doc stays well-formed", () => {
    const t = { ...SANDVIK_ENDMILL, id: "amp-test", manufacturer: "A&B <Tools>", designation: 'R"390"' };
    const out = hsmAdvisorSettingsExportEngine.export({ tool: t });
    // The raw XML must not contain a bare & or < inside the comment value.
    expect(out.xml).toContain("&amp;");
    expect(out.xml).toContain("&lt;");
    // And it must still parse through the adapter (no malformed-block failure). The adapter does
    // NOT un-escape entities (raw slice between tags), so the comment comes back escaped — which
    // itself proves the escaping ran AND the <comment> block boundaries survived.
    const parsed = roundTrip(out.xml, false).tool!;
    expect(parsed.comment).toContain("A&amp;B");
    expect(parsed.diameter).toBeCloseTo(12.0 / 25.4, 4); // tool block intact despite special chars
  });

  it("maps a drill type and falls back to endmill for unknown types", () => {
    const drill = { ...SANDVIK_ENDMILL, id: "drill-x", type: "drill" };
    const turning = { ...SANDVIK_ENDMILL, id: "turn-x", type: "turning_tool" };
    const weird = { ...SANDVIK_ENDMILL, id: "weird-x", type: "made_up_type" };
    expect(roundTrip(hsmAdvisorSettingsExportEngine.export({ tool: drill }).xml, false).tool!.type).toBe("drill");
    expect(roundTrip(hsmAdvisorSettingsExportEngine.export({ tool: turning }).xml, false).tool!.type).toBe("turning");
    expect(roundTrip(hsmAdvisorSettingsExportEngine.export({ tool: weird }).xml, false).tool!.type).toBe("endmill");
  });

  it("is exported as a singleton and a constructable class", () => {
    expect(hsmAdvisorSettingsExportEngine).toBeInstanceOf(HSMAdvisorSettingsExportEngine);
    const fresh = new HSMAdvisorSettingsExportEngine();
    expect(fresh.toolGuid("z")).toBe(hsmAdvisorSettingsExportEngine.toolGuid("z"));
  });
});
