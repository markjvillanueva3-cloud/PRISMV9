/**
 * WorkEnvelopeEngine — Unit Tests
 * @milestone FORGE-ENGINES-B22
 */
import { describe, it, expect } from "vitest";
import { workEnvelopeEngine } from "../engines/WorkEnvelopeEngine.js";

describe("WorkEnvelopeEngine", () => {
  it("small part fits in VMC", () => {
    const r = workEnvelopeEngine.calculate({
      part_size_x_mm: 200,
      part_size_y_mm: 150,
      part_size_z_mm: 100,
    });
    expect(r.overall_fit.value).toBe(1);
  });

  it("oversized part fails X", () => {
    const r = workEnvelopeEngine.calculate({
      part_size_x_mm: 1000,
      part_size_y_mm: 100,
      part_size_z_mm: 100,
      machine_travel_x_mm: 762,
    });
    expect(r.fits_x.value).toBe(0);
    expect(r.remaining_x.value).toBeLessThan(0);
  });

  it("remaining travel is positive when part fits", () => {
    const r = workEnvelopeEngine.calculate({
      part_size_x_mm: 200,
      part_size_y_mm: 150,
      part_size_z_mm: 100,
    });
    expect(r.remaining_x.value).toBeGreaterThan(0);
    expect(r.remaining_y.value).toBeGreaterThan(0);
    expect(r.remaining_z.value).toBeGreaterThan(0);
  });

  it("fixture height reduces Z availability", () => {
    const low = workEnvelopeEngine.calculate({
      part_size_x_mm: 200,
      part_size_y_mm: 150,
      part_size_z_mm: 100,
      fixture_height_mm: 50,
    });
    const high = workEnvelopeEngine.calculate({
      part_size_x_mm: 200,
      part_size_y_mm: 150,
      part_size_z_mm: 100,
      fixture_height_mm: 200,
    });
    expect(high.remaining_z.value).toBeLessThan(
      low.remaining_z.value
    );
  });

  it("utilization increases with part size", () => {
    const small = workEnvelopeEngine.calculate({
      part_size_x_mm: 100,
      part_size_y_mm: 100,
      part_size_z_mm: 50,
    });
    const large = workEnvelopeEngine.calculate({
      part_size_x_mm: 500,
      part_size_y_mm: 300,
      part_size_z_mm: 300,
    });
    expect(large.utilization_x.value).toBeGreaterThan(
      small.utilization_x.value
    );
  });

  it("warns high utilization", () => {
    const r = workEnvelopeEngine.calculate({
      part_size_x_mm: 650,
      part_size_y_mm: 350,
      part_size_z_mm: 400,
    });
    expect(
      r.warnings.some(w => w.includes("utilization"))
    ).toBe(true);
  });

  it("warns tool reach insufficient", () => {
    const r = workEnvelopeEngine.calculate({
      part_size_x_mm: 200,
      part_size_y_mm: 150,
      part_size_z_mm: 300,
      tool_length_mm: 50,
      holder_length_mm: 30,
    });
    expect(r.z_reach_ok.value).toBe(0);
    expect(
      r.warnings.some(w => w.includes("reach"))
    ).toBe(true);
  });

  it("HMC has different default travels", () => {
    const vmc = workEnvelopeEngine.calculate({
      part_size_x_mm: 200,
      part_size_y_mm: 200,
      part_size_z_mm: 100,
      machine_type: "vmc",
    });
    const hmc = workEnvelopeEngine.calculate({
      part_size_x_mm: 200,
      part_size_y_mm: 200,
      part_size_z_mm: 100,
      machine_type: "hmc",
    });
    expect(hmc.remaining_y.value).not.toBe(vmc.remaining_y.value);
  });

  it("overall_fit is FAIL when any axis fails", () => {
    const r = workEnvelopeEngine.calculate({
      part_size_x_mm: 200,
      part_size_y_mm: 200,
      part_size_z_mm: 600,
      machine_travel_z_mm: 500,
    });
    expect(r.overall_fit.value).toBe(0);
  });
});
