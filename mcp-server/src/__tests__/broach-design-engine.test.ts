/**
 * BroachDesignEngine — Unit Tests
 * @milestone FORGE-ENGINES-B41
 */
import { describe, it, expect } from "vitest";
import { broachDesignEngine } from "../engines/BroachDesignEngine.js";

describe("BroachDesignEngine", () => {
  it("rise per tooth > 0", () => {
    const r = broachDesignEngine.calculate({});
    expect(r.rise_per_tooth.value).toBeGreaterThan(0);
  });

  it("deeper cut needs more roughing teeth", () => {
    const shallow = broachDesignEngine.calculate({ cut_depth_mm: 2 });
    const deep = broachDesignEngine.calculate({ cut_depth_mm: 8 });
    expect(deep.num_roughing_teeth.value).toBeGreaterThan(
      shallow.num_roughing_teeth.value
    );
  });

  it("total teeth > roughing teeth", () => {
    const r = broachDesignEngine.calculate({});
    expect(r.num_total_teeth.value).toBeGreaterThan(
      r.num_roughing_teeth.value
    );
  });

  it("wider cut increases cutting force", () => {
    const narrow = broachDesignEngine.calculate({ cut_width_mm: 5 });
    const wide = broachDesignEngine.calculate({ cut_width_mm: 20 });
    expect(wide.cutting_force.value).toBeGreaterThan(
      narrow.cutting_force.value
    );
  });

  it("aluminum has lower specific force than steel", () => {
    const steel = broachDesignEngine.calculate({ workpiece_material: "steel" });
    const alum = broachDesignEngine.calculate({ workpiece_material: "aluminum" });
    expect(alum.cutting_force.value).toBeLessThan(steel.cutting_force.value);
  });

  it("pull force > single tooth force", () => {
    const r = broachDesignEngine.calculate({});
    expect(r.pull_force.value).toBeGreaterThanOrEqual(r.cutting_force.value);
  });

  it("surface finish > 0", () => {
    const r = broachDesignEngine.calculate({});
    expect(r.surface_finish.value).toBeGreaterThan(0);
  });

  it("chip space ratio > 0", () => {
    const r = broachDesignEngine.calculate({});
    expect(r.chip_space_ratio.value).toBeGreaterThan(0);
  });

  it("broach length > 0", () => {
    const r = broachDesignEngine.calculate({});
    expect(r.broach_length.value).toBeGreaterThan(0);
  });

  it("tool life > 0", () => {
    const r = broachDesignEngine.calculate({});
    expect(r.tool_life.value).toBeGreaterThan(0);
  });
});
