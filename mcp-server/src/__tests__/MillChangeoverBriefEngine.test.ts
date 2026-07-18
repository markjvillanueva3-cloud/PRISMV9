import { describe, it, expect } from "vitest";
import {
  millChangeoverBriefEngine as eng,
  type MillChangeoverBriefInput,
} from "../engines/MillChangeoverBriefEngine.js";

function nominal(o: Partial<MillChangeoverBriefInput> = {}): MillChangeoverBriefInput {
  return {
    part_number: "P-12345",
    revision: "B",
    machine_id: "HAAS-VF2-001",
    axis_count: 3,
    workholding_type: "vise",
    tool_magazine: [
      { pocket: 1, description: "1/2 endmill 4FL", projection_mm: 50 },
      { pocket: 2, description: "1/4 drill", projection_mm: 80 },
    ],
    program_number: 1234,
    ...o,
  };
}

describe("MillChangeoverBriefEngine", () => {
  it("getStats reports 7 sections, 9 workholding types, 6 coolant types", () => {
    const s = eng.getStats();
    expect(s.sections).toBe(7);
    expect(s.supported_workholding_types).toContain("vise");
    expect(s.supported_workholding_types).toContain("5axis_trunnion");
    expect(s.supported_workholding_types.length).toBe(9);
    expect(s.supported_coolant_types).toEqual(["flood", "tsc", "mist", "mql", "air_blast", "dry"]);
    expect(s.reference).toMatch(/AIAG CQI-8|Haas|Mazak/);
  });

  it("throws on missing part_number", () => {
    expect(() => eng.generate(nominal({ part_number: "" }))).toThrow(/part_number required/);
  });

  it("throws on missing revision", () => {
    expect(() => eng.generate(nominal({ revision: "" }))).toThrow(/revision required/);
  });

  it("throws on missing machine_id", () => {
    expect(() => eng.generate(nominal({ machine_id: "" }))).toThrow(/machine_id required/);
  });

  it("throws on missing tool_magazine", () => {
    expect(() => eng.generate(nominal({ tool_magazine: null as never }))).toThrow(/tool_magazine\[\] required/);
  });

  it("throws on invalid axis_count", () => {
    expect(() => eng.generate(nominal({ axis_count: 6 as never }))).toThrow(/axis_count must be 3, 4, or 5/);
  });

  it("nominal 3-axis vise + 2 tools → returns 6 sections (no warnings), document_id, checklist", () => {
    const r = eng.generate(nominal());
    expect(r.section_ordered.length).toBe(6); // no warnings/notes section
    expect(r.document_id).toMatch(/^MILL-CB-P-12345-B-HAAS-VF2-001-/);
    expect(r.warnings).toEqual([]);
    expect(r.operator_check_list.length).toBeGreaterThan(5);
    expect(r.markdown).toMatch(/^# MILL-CB-P-12345-B-HAAS-VF2-001-/);
  });

  it("workholding section cites vise type + grip area when supplied", () => {
    const r = eng.generate(nominal({ grip_area_mm: { x: 100, y: 50 }, datum_scheme: "3-2-1" }));
    const wh = r.section_ordered.find(s => s.title === "2. Work Holding");
    if (!wh) throw new Error("Expected Work Holding section");
    expect(wh.lines.some(l => /vise/.test(l))).toBe(true);
    expect(wh.lines.some(l => /X=100mm × Y=50mm/.test(l))).toBe(true);
    expect(wh.lines.some(l => /Datum scheme: 3-2-1/.test(l))).toBe(true);
  });

  it("tool magazine section renders one row per tool with projection", () => {
    const r = eng.generate(nominal());
    const mag = r.section_ordered.find(s => s.title === "3. Tool Magazine");
    if (!mag) throw new Error("Expected Tool Magazine section");
    expect(mag.lines.length).toBe(3); // header + 2 tools
    expect(mag.lines[1]).toMatch(/T01.*1\/2 endmill 4FL.*50mm/);
    expect(mag.lines[2]).toMatch(/T02.*1\/4 drill.*80mm/);
  });

  it("work offsets section renders G54 X/Y/Z all three axes (mill, vs lathe X/Z only)", () => {
    const r = eng.generate(nominal({
      work_offset_g54_x_mm: 100,
      work_offset_g54_y_mm: 50,
      work_offset_g54_z_mm: -10,
    }));
    const off = r.section_ordered.find(s => s.title === "4. Work Offsets");
    if (!off) throw new Error("Expected Work Offsets section");
    expect(off.lines[0]).toMatch(/G54 X=100mm.*Y=50mm.*Z=-10mm/);
  });

  it("auxiliary G55-G59 offsets render with X/Y/Z each", () => {
    const r = eng.generate(nominal({
      auxiliary_work_offsets: {
        G55: { x_mm: 200, y_mm: 0, z_mm: -5 },
        G56: { x_mm: 0, y_mm: 100, z_mm: -5 },
      },
    }));
    const off = r.section_ordered.find(s => s.title === "4. Work Offsets");
    if (!off) throw new Error("Expected Work Offsets section");
    expect(off.lines.some(l => /G55 X=200mm.*Y=0mm.*Z=-5mm/.test(l))).toBe(true);
    expect(off.lines.some(l => /G56 X=0mm.*Y=100mm.*Z=-5mm/.test(l))).toBe(true);
  });

  it("coolant section shows TSC availability flag", () => {
    const r = eng.generate(nominal({
      coolant_type: "tsc",
      coolant_pressure_bar: 70,
      coolant_level_percent: 80,
      tsc_available: true,
    }));
    const cool = r.section_ordered.find(s => s.title === "5. Coolant & Spindle");
    if (!cool) throw new Error("Expected Coolant section");
    expect(cool.lines[0]).toMatch(/tsc.*70 bar.*80%.*TSC: yes/);
  });

  it("low coolant level (<40%) → auto-warning", () => {
    const r = eng.generate(nominal({ coolant_level_percent: 30 }));
    expect(r.warnings.some(w => /Coolant level 30%.*top up/.test(w))).toBe(true);
  });

  it("TSC commanded but no TSC plumbing → auto-warning", () => {
    const r = eng.generate(nominal({ coolant_type: "tsc", tsc_available: false }));
    expect(r.warnings.some(w => /TSC.*no TSC plumbing/.test(w))).toBe(true);
  });

  it("soft_jaw_vise without bore note → auto-warning", () => {
    const r = eng.generate(nominal({ workholding_type: "soft_jaw_vise" }));
    expect(r.warnings.some(w => /Soft jaws.*bore dimension/.test(w))).toBe(true);
  });

  it("soft_jaw_vise WITH bore in notes → no soft-jaw warning", () => {
    const r = eng.generate(nominal({ workholding_type: "soft_jaw_vise", notes: "Bored to 50.000mm" }));
    expect(r.warnings.some(w => /Soft jaws.*bore dimension/.test(w))).toBe(false);
  });

  it("vacuum_table without parallels height → warning about flatness/seal", () => {
    const r = eng.generate(nominal({ workholding_type: "vacuum_table" }));
    expect(r.warnings.some(w => /Vacuum table.*flatness.*seal/.test(w))).toBe(true);
  });

  it("5-axis machine without head_tilt_limit_deg → warning about singularity", () => {
    const r = eng.generate(nominal({ axis_count: 5 }));
    expect(r.warnings.some(w => /5-axis.*singularity/.test(w))).toBe(true);
  });

  it("4-axis + vise (rotary clearance concern) → warning", () => {
    const r = eng.generate(nominal({ axis_count: 4, workholding_type: "vise" }));
    expect(r.warnings.some(w => /4-axis machine with vise.*clearance/.test(w))).toBe(true);
  });

  it("Tool with projection > 100mm → deflection check warning per tool", () => {
    const r = eng.generate(nominal({
      tool_magazine: [
        { pocket: 1, description: "1/4 long-reach endmill", projection_mm: 150 },
        { pocket: 2, description: "1/2 normal endmill", projection_mm: 50 },
      ],
    }));
    expect(r.warnings.some(w => /T1.*1\/4 long-reach.*150mm.*mill_deflection_check/.test(w))).toBe(true);
    expect(r.warnings.filter(w => /mill_deflection_check/.test(w)).length).toBe(1);
  });

  it("warnings + notes section appears when warnings exist", () => {
    const r = eng.generate(nominal({ coolant_level_percent: 30 }));
    const warn = r.section_ordered.find(s => s.title === "7. Warnings & Notes");
    if (!warn) throw new Error("Expected Warnings & Notes section");
    expect(warn.lines.some(l => /⚠.*Coolant level/.test(l))).toBe(true);
  });

  it("operator_check_list differs by axis_count (5-axis cites rotary axis homing)", () => {
    const r3 = eng.generate(nominal({ axis_count: 3 }));
    const r5 = eng.generate(nominal({ axis_count: 5, head_tilt_limit_deg: { min: -90, max: 90 } }));
    expect(r3.operator_check_list.some(l => /Z-zero verified at top of part/.test(l))).toBe(true);
    expect(r5.operator_check_list.some(l => /Rotary axis homed.*head tilt limits cleared/.test(l))).toBe(true);
  });

  it("markdown output is single string with all sections + checklist", () => {
    const r = eng.generate(nominal());
    expect(typeof r.markdown).toBe("string");
    expect(r.markdown).toMatch(/## 1\. Job Header/);
    expect(r.markdown).toMatch(/## 2\. Work Holding/);
    expect(r.markdown).toMatch(/## 3\. Tool Magazine/);
    expect(r.markdown).toMatch(/## 4\. Work Offsets/);
    expect(r.markdown).toMatch(/## 5\. Coolant & Spindle/);
    expect(r.markdown).toMatch(/## 6\. Program & First-Off/);
    expect(r.markdown).toMatch(/## Operator Checklist/);
  });

  it("generated_at is ISO timestamp", () => {
    const r = eng.generate(nominal());
    expect(r.generated_at).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/);
  });
});
