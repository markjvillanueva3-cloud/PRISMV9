/**
 * CNCMaintenanceEngine — Unit Tests
 * @milestone FORGE-ENGINES-B26
 */
import { describe, it, expect } from "vitest";
import {
  cncMaintenanceEngine,
} from "../engines/CNCMaintenanceEngine.js";

describe("CNCMaintenanceEngine", () => {
  it("calculates spindle lube interval", () => {
    const r = cncMaintenanceEngine.calculate({});
    expect(r.spindle_lube_interval.value).toBeGreaterThan(0);
  });

  it("direct drive spindle has longer lube interval", () => {
    const belt = cncMaintenanceEngine.calculate({
      spindle_type: "belt",
    });
    const direct = cncMaintenanceEngine.calculate({
      spindle_type: "direct",
    });
    expect(direct.spindle_lube_interval.value).toBeGreaterThan(
      belt.spindle_lube_interval.value
    );
  });

  it("synthetic coolant lasts longer", () => {
    const oil = cncMaintenanceEngine.calculate({
      coolant_type: "soluble_oil",
    });
    const syn = cncMaintenanceEngine.calculate({
      coolant_type: "synthetic",
    });
    expect(syn.coolant_change_interval.value).toBeGreaterThan(
      oil.coolant_change_interval.value
    );
  });

  it("older machine has higher risk score", () => {
    const young = cncMaintenanceEngine.calculate({
      machine_age_years: 2,
    });
    const old = cncMaintenanceEngine.calculate({
      machine_age_years: 15,
    });
    expect(old.downtime_risk_score.value).toBeGreaterThan(
      young.downtime_risk_score.value
    );
  });

  it("annual maintenance cost > 0", () => {
    const r = cncMaintenanceEngine.calculate({});
    expect(r.annual_maintenance_cost.value).toBeGreaterThan(0);
  });

  it("more axes increases way lube consumption", () => {
    const three = cncMaintenanceEngine.calculate({ axes: 3 });
    const five = cncMaintenanceEngine.calculate({ axes: 5 });
    expect(five.way_lube_consumption.value).toBeGreaterThan(
      three.way_lube_consumption.value
    );
  });

  it("high utilization warns", () => {
    const r = cncMaintenanceEngine.calculate({
      machine_hours_per_month: 500,
    });
    expect(
      r.warnings.some(w => w.includes("utilization"))
    ).toBe(true);
  });

  it("high RPM reduces lube interval", () => {
    const low = cncMaintenanceEngine.calculate({
      spindle_rpm_avg: 4000,
    });
    const high = cncMaintenanceEngine.calculate({
      spindle_rpm_avg: 18000,
    });
    expect(high.spindle_lube_interval.value).toBeLessThan(
      low.spindle_lube_interval.value
    );
  });

  it("filter interval shorter without conveyor", () => {
    const with_ = cncMaintenanceEngine.calculate({
      has_chip_conveyor: true,
    });
    const without = cncMaintenanceEngine.calculate({
      has_chip_conveyor: false,
    });
    expect(without.filter_change_interval.value).toBeLessThan(
      with_.filter_change_interval.value
    );
  });

  it("PM ROI is positive", () => {
    const r = cncMaintenanceEngine.calculate({});
    expect(r.pm_roi.value).toBeGreaterThan(0);
  });
});
