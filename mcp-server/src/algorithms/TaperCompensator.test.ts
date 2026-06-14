import { describe, it, expect } from "vitest";
import { compensate, TaperCompensator, type TaperInput } from "./TaperCompensator.js";

describe("TaperCompensator", () => {
  it("Sodick AQ: upper offset = (guide + workpiece) · tan(angle), no lower offset", () => {
    const r = compensate({ machine: "sodick_aq", taper_angle_deg: 5, workpiece_thickness_mm: 30 });
    const expected = (50 + 30) * Math.tan(5 * Math.PI / 180);
    expect(r.upper_offset_mm.value).toBeCloseTo(expected, 4);
    expect(r.lower_offset_mm.value).toBe(0);
  });
  it("Makino UPJ: both upper + lower offsets (opposite-tilt heads)", () => {
    const r = compensate({ machine: "makino_upj", taper_angle_deg: 10, workpiece_thickness_mm: 20 });
    const tanA = Math.tan(10 * Math.PI / 180);
    expect(r.upper_offset_mm.value).toBeCloseTo(50 * tanA, 4);
    expect(r.lower_offset_mm.value).toBeCloseTo(-50 * tanA, 4);
  });
  it("Mitsubishi MV: workpiece-relative offset", () => {
    const r = compensate({ machine: "mitsubishi_mv", taper_angle_deg: 5, workpiece_thickness_mm: 40 });
    expect(r.upper_offset_mm.value).toBeCloseTo(40 * Math.tan(5 * Math.PI / 180), 4);
  });
  it("Fanuc Robocut: full-stack relative", () => {
    const r = compensate({ machine: "fanuc_robocut", taper_angle_deg: 5, workpiece_thickness_mm: 30 });
    const expected = (50 + 30 + 50) * Math.tan(5 * Math.PI / 180);
    expect(r.upper_offset_mm.value).toBeCloseTo(expected, 4);
  });
  it("Sodick 25° within 30° limit → within_machine_limit=true", () => {
    const r = compensate({ machine: "sodick_aq", taper_angle_deg: 25, workpiece_thickness_mm: 20 });
    expect(r.within_machine_limit).toBe(true);
  });
  it("Mitsubishi MV 20° EXCEEDS 15° limit → within_machine_limit=false + warning", () => {
    const r = compensate({ machine: "mitsubishi_mv", taper_angle_deg: 20, workpiece_thickness_mm: 20 });
    expect(r.within_machine_limit).toBe(false);
    expect(r.notes.join("|")).toContain("exceeds");
  });
  it("zero angle → zero offset, full baseline tension 12N", () => {
    const r = compensate({ machine: "sodick_aq", taper_angle_deg: 0, workpiece_thickness_mm: 30 });
    expect(r.upper_offset_mm.value).toBe(0);
    expect(r.recommended_wire_tension_N.value).toBe(12);
  });
  it("high taper reduces wire tension (sag compensation)", () => {
    const r = compensate({ machine: "sodick_aq", taper_angle_deg: 20, workpiece_thickness_mm: 20 });
    expect(r.recommended_wire_tension_N.value).toBeLessThan(12);
    expect(r.recommended_wire_tension_N.value).toBeGreaterThanOrEqual(6);
  });
  it("negative angle (taper inward) flips offset sign", () => {
    const r = compensate({ machine: "sodick_aq", taper_angle_deg: -5, workpiece_thickness_mm: 30 });
    expect(r.upper_offset_mm.value).toBeLessThan(0);
  });
  it("unknown machine diagnostic", () => {
    expect(compensate({ machine: "agie" as TaperInput["machine"], taper_angle_deg: 5, workpiece_thickness_mm: 20 }).notes.join("|")).toContain("unknown machine");
  });
  it("angle beyond hard 30° limit diagnostic", () => {
    expect(compensate({ machine: "sodick_aq", taper_angle_deg: 45, workpiece_thickness_mm: 20 }).notes.join("|")).toContain("outside");
  });
  it("NaN angle diagnostic", () => {
    expect(compensate({ machine: "sodick_aq", taper_angle_deg: NaN, workpiece_thickness_mm: 20 }).notes.join("|")).toContain("not finite");
  });
  it("zero thickness diagnostic", () => {
    expect(compensate({ machine: "sodick_aq", taper_angle_deg: 5, workpiece_thickness_mm: 0 }).notes.join("|")).toContain("outside");
  });
  it("missing input diagnostic", () => {
    expect(compensate(null as unknown as TaperInput).notes.join("|")).toContain("missing");
  });
  it("version 1.0.0", () => {
    expect(TaperCompensator.version).toBe("1.0.0");
  });
});
