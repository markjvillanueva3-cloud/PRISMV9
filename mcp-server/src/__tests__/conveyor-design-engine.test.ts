/**
 * ConveyorDesignEngine — Unit Tests
 * @milestone FORGE-ENGINES-B34
 */
import { describe, it, expect } from "vitest";
import { conveyorDesignEngine } from "../engines/ConveyorDesignEngine.js";

describe("ConveyorDesignEngine", () => {
  it("drive power > 0", () => {
    const r = conveyorDesignEngine.calculate({});
    expect(r.drive_power.value).toBeGreaterThan(0);
  });

  it("higher throughput needs wider belt", () => {
    const low = conveyorDesignEngine.calculate({ throughput_tph: 50 });
    const high = conveyorDesignEngine.calculate({ throughput_tph: 500 });
    expect(high.required_belt_width.value).toBeGreaterThan(
      low.required_belt_width.value
    );
  });

  it("longer conveyor needs more power", () => {
    const short = conveyorDesignEngine.calculate({ conveyor_length_m: 20 });
    const long = conveyorDesignEngine.calculate({ conveyor_length_m: 200 });
    expect(long.drive_power.value).toBeGreaterThan(short.drive_power.value);
  });

  it("lift height adds gravity force", () => {
    const flat = conveyorDesignEngine.calculate({ lift_height_m: 0 });
    const incline = conveyorDesignEngine.calculate({ lift_height_m: 10 });
    expect(incline.gravity_force.value).toBeGreaterThan(
      flat.gravity_force.value
    );
  });

  it("tight side > slack side tension", () => {
    const r = conveyorDesignEngine.calculate({});
    expect(r.tight_side_tension.value).toBeGreaterThan(
      r.slack_side_tension.value
    );
  });

  it("warns steep incline > 18°", () => {
    const r = conveyorDesignEngine.calculate({
      conveyor_length_m: 20,
      lift_height_m: 10,
    });
    expect(r.warnings.some(w => w.includes("chevron") || w.includes("18"))).toBe(true);
  });

  it("warns high belt speed > 4 m/s", () => {
    const r = conveyorDesignEngine.calculate({ belt_speed_m_s: 5 });
    expect(r.warnings.some(w => w.includes("4.0"))).toBe(true);
  });

  it("take-up travel proportional to length", () => {
    const short = conveyorDesignEngine.calculate({ conveyor_length_m: 30 });
    const long = conveyorDesignEngine.calculate({ conveyor_length_m: 300 });
    expect(long.take_up_travel.value).toBeGreaterThan(
      short.take_up_travel.value
    );
  });

  it("pulley diameter selected by tension", () => {
    const r = conveyorDesignEngine.calculate({});
    expect(r.min_pulley_diameter.value).toBeGreaterThan(0);
  });

  it("feasible with standard parameters", () => {
    const r = conveyorDesignEngine.calculate({
      throughput_tph: 100,
      conveyor_length_m: 50,
    });
    expect(r.conveyor_feasible.unit).toBe("PASS");
  });
});
