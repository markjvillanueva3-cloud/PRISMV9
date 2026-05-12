import { describe, it, expect } from "vitest";
import { latheChangeoverBriefEngine } from "../engines/LatheChangeoverBriefEngine.js";

const BASE = {
  part_number: "PN-1001",
  revision: "A",
  machine_id: "LATHE-07",
  chuck_id: "KITAGAWA-10",
  jaw_type: "soft" as const,
  jaw_grip_od_mm: 40,
  jaw_grip_length_mm: 10,
  turret: [
    { turret_position: 1, description: "Rough OD" },
    { turret_position: 2, description: "Finish OD" },
  ],
  program_number: 1234,
};

describe("LatheChangeoverBriefEngine", () => {
  it("generates a document id", () => {
    const r = latheChangeoverBriefEngine.generate(BASE);
    expect(r.document_id).toContain("PN-1001");
    expect(r.document_id).toContain("LATHE-07");
  });

  it("produces 6+ ordered sections for core brief", () => {
    const r = latheChangeoverBriefEngine.generate(BASE);
    expect(r.section_ordered.length).toBeGreaterThanOrEqual(6);
  });

  it("includes chuck and jaw type in workholding section", () => {
    const r = latheChangeoverBriefEngine.generate(BASE);
    const wh = r.section_ordered.find((s) => /Work Holding/i.test(s.title));
    expect(wh?.lines.join("\n")).toMatch(/KITAGAWA-10/);
    expect(wh?.lines.join("\n")).toMatch(/soft/);
  });

  it("populates turret listing", () => {
    const r = latheChangeoverBriefEngine.generate(BASE);
    const t = r.section_ordered.find((s) => /Turret/i.test(s.title));
    expect(t?.lines.some((l) => /T01/.test(l))).toBe(true);
    expect(t?.lines.some((l) => /T02/.test(l))).toBe(true);
  });

  it("auto-warns on soft jaws without bore note", () => {
    const r = latheChangeoverBriefEngine.generate(BASE);
    expect(r.warnings.some((w) => /soft/i.test(w) && /bore/i.test(w))).toBe(true);
  });

  it("no soft-jaw warning if bore mentioned in notes", () => {
    const r = latheChangeoverBriefEngine.generate({ ...BASE, notes: "Bore jaws to 40.02mm" });
    expect(r.warnings.some((w) => /soft.*bore/i.test(w))).toBe(false);
  });

  it("warns on low coolant level", () => {
    const r = latheChangeoverBriefEngine.generate({ ...BASE, coolant_level_percent: 30 });
    expect(r.warnings.some((w) => /coolant.*level/i.test(w))).toBe(true);
  });

  it("includes G54 work offsets", () => {
    const r = latheChangeoverBriefEngine.generate({
      ...BASE,
      work_offset_g54_x_mm: 0,
      work_offset_g54_z_mm: -10,
    });
    const offsets = r.section_ordered.find((s) => /Offsets/i.test(s.title));
    expect(offsets?.lines.some((l) => /G54/.test(l))).toBe(true);
  });

  it("auxiliary offsets appear when provided", () => {
    const r = latheChangeoverBriefEngine.generate({
      ...BASE,
      auxiliary_work_offsets: { G55: { x_mm: 2, z_mm: -5 } },
    });
    const offsets = r.section_ordered.find((s) => /Offsets/i.test(s.title));
    expect(offsets?.lines.some((l) => /G55/.test(l))).toBe(true);
  });

  it("emits markdown version of brief", () => {
    const r = latheChangeoverBriefEngine.generate(BASE);
    expect(r.markdown).toContain("# ");
    expect(r.markdown.length).toBeGreaterThan(100);
  });

  it("operator checklist non-empty", () => {
    const r = latheChangeoverBriefEngine.generate(BASE);
    expect(r.operator_check_list.length).toBeGreaterThan(3);
  });

  it("tailstock line reflects used/unused", () => {
    const r = latheChangeoverBriefEngine.generate({
      ...BASE,
      tailstock_used: true,
      tailstock_position_z_mm: -120,
    });
    const wh = r.section_ordered.find((s) => /Work Holding/i.test(s.title));
    expect(wh?.lines.some((l) => /Tailstock/i.test(l) && /-120/.test(l))).toBe(true);
  });

  it("generated_at is an ISO timestamp", () => {
    const r = latheChangeoverBriefEngine.generate(BASE);
    expect(r.generated_at).toMatch(/T/);
  });
});
