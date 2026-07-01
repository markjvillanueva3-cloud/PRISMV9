import { describe, it, expect } from "vitest";
import { optimize, RetractPlaneOptimizer, type RetractPlaneInput } from "./RetractPlaneOptimizer.js";

describe("RetractPlaneOptimizer", () => {
  it("standard case: fixture 50mm + tool 100mm + 25mm margin = 175mm global", () => {
    const r = optimize({ fixture_top_z_mm: 50, max_tool_length_mm: 100, machine_z_travel_mm: 500 });
    expect(r.global_clearance_mm.value).toBe(175);
  });
  it("between-op is closer to workpiece (saves air-time)", () => {
    const r = optimize({ fixture_top_z_mm: 50, max_tool_length_mm: 100, machine_z_travel_mm: 500 });
    expect(r.between_op_clearance_mm.value).toBeLessThan(r.global_clearance_mm.value);
  });
  it("feed plane is 5mm above workpiece top", () => {
    const r = optimize({ fixture_top_z_mm: 50, max_tool_length_mm: 100, machine_z_travel_mm: 500, workpiece_top_z_mm: 20 });
    expect(r.feed_plane_mm.value).toBe(25);
  });
  it("tool change clearance = machine Z travel", () => {
    const r = optimize({ fixture_top_z_mm: 50, max_tool_length_mm: 100, machine_z_travel_mm: 500 });
    expect(r.tool_change_clearance_mm.value).toBe(500);
  });
  it("custom safety margin respected", () => {
    const r = optimize({ fixture_top_z_mm: 50, max_tool_length_mm: 100, machine_z_travel_mm: 500, safety_margin_mm: 50 });
    expect(r.global_clearance_mm.value).toBe(200);
  });
  it("clamps to machine Z when stack+margin exceeds travel", () => {
    const r = optimize({ fixture_top_z_mm: 80, max_tool_length_mm: 200, machine_z_travel_mm: 100 });
    expect(r.global_clearance_mm.value).toBe(100);
    expect(r.notes.join("|")).toContain("clamped");
  });
  it("NaN fixture diagnostic", () => {
    expect(optimize({ fixture_top_z_mm: NaN, max_tool_length_mm: 100, machine_z_travel_mm: 500 }).notes.join("|")).toContain("not finite");
  });
  it("negative fixture diagnostic", () => {
    expect(optimize({ fixture_top_z_mm: -5, max_tool_length_mm: 100, machine_z_travel_mm: 500 }).notes.join("|")).toContain("outside");
  });
  it("Z travel below floor diagnostic", () => {
    expect(optimize({ fixture_top_z_mm: 50, max_tool_length_mm: 100, machine_z_travel_mm: 10 }).notes.join("|")).toContain("outside");
  });
  it("missing input diagnostic", () => {
    expect(optimize(null as unknown as RetractPlaneInput).notes.join("|")).toContain("missing");
  });
  it("between-op explanation note present", () => {
    const r = optimize({ fixture_top_z_mm: 50, max_tool_length_mm: 100, machine_z_travel_mm: 500 });
    expect(r.notes.join("|")).toContain("air-time saved");
  });
  it("version 1.0.0", () => {
    expect(RetractPlaneOptimizer.version).toBe("1.0.0");
  });
});
