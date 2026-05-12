/**
 * ConveyorBeltEngine — Unit Tests
 * @milestone FORGE-ENGINES-B47
 */
import { describe, it, expect } from "vitest";
import { conveyorBeltEngine } from "../engines/ConveyorBeltEngine.js";

describe("ConveyorBeltEngine", () => {
  it("effective tension > 0", () => {
    const r = conveyorBeltEngine.calculate({});
    expect(r.effective_tension.value).toBeGreaterThan(0);
  });

  it("drive power > 0", () => {
    const r = conveyorBeltEngine.calculate({});
    expect(r.drive_power.value).toBeGreaterThan(0);
  });

  it("motor power > drive power (efficiency loss)", () => {
    const r = conveyorBeltEngine.calculate({});
    expect(r.motor_power.value).toBeGreaterThan(
      r.drive_power.value
    );
  });

  it("longer conveyor increases tension", () => {
    const short = conveyorBeltEngine.calculate({ belt_length_m: 50 });
    const long = conveyorBeltEngine.calculate({ belt_length_m: 500 });
    expect(long.effective_tension.value).toBeGreaterThan(
      short.effective_tension.value
    );
  });

  it("lift height increases power", () => {
    const flat = conveyorBeltEngine.calculate({ lift_height_m: 0 });
    const incl = conveyorBeltEngine.calculate({ lift_height_m: 20 });
    expect(incl.drive_power.value).toBeGreaterThan(
      flat.drive_power.value
    );
  });

  it("tight side > slack side", () => {
    const r = conveyorBeltEngine.calculate({});
    expect(r.tight_side_tension.value).toBeGreaterThan(
      r.slack_side_tension.value
    );
  });

  it("counterweight > 0", () => {
    const r = conveyorBeltEngine.calculate({});
    expect(r.counterweight.value).toBeGreaterThan(0);
  });

  it("belt sag > 0", () => {
    const r = conveyorBeltEngine.calculate({});
    expect(r.belt_sag_pct.value).toBeGreaterThan(0);
  });

  it("wider belt increases capacity", () => {
    const narrow = conveyorBeltEngine.calculate({ belt_width_mm: 500 });
    const wide = conveyorBeltEngine.calculate({ belt_width_mm: 1200 });
    expect(wide.belt_capacity.value).toBeGreaterThan(
      narrow.belt_capacity.value
    );
  });

  it("warns steep incline", () => {
    const r = conveyorBeltEngine.calculate({
      belt_length_m: 50, incline_deg: 25,
    });
    expect(r.warnings.some(w => w.includes("ncline") || w.includes("slide"))).toBe(true);
  });
});
