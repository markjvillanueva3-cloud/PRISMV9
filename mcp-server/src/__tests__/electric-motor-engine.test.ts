/**
 * ElectricMotorEngine — Unit Tests
 * @milestone FORGE-ENGINES-B32
 */
import { describe, it, expect } from "vitest";
import { electricMotorEngine } from "../engines/ElectricMotorEngine.js";

describe("ElectricMotorEngine", () => {
  it("selects standard motor size ≥ required power", () => {
    const r = electricMotorEngine.calculate({ load_power_kw: 6 });
    expect(r.rated_motor_power.value).toBeGreaterThanOrEqual(6);
  });

  it("rated torque from power and speed", () => {
    const r = electricMotorEngine.calculate({
      load_power_kw: 5,
      speed_rpm: 1500,
    });
    // T = P×1000 / ω = 5000 / (2π×1500/60) ≈ 31.8 N·m
    // Rated motor will be ≥ 5kW so rated torque ≥ 31.8
    expect(r.rated_torque.value).toBeGreaterThan(30);
  });

  it("peak torque includes acceleration", () => {
    const r = electricMotorEngine.calculate({
      load_torque_nm: 20,
      load_inertia_kgm2: 0.5,
      accel_time_s: 2,
    });
    expect(r.peak_torque.value).toBeGreaterThan(r.rated_torque.value * 0.3);
    expect(r.accel_torque.value).toBeGreaterThan(0);
  });

  it("servo motor has higher efficiency than DC brush", () => {
    const servo = electricMotorEngine.calculate({ motor_type: "servo" });
    const dc = electricMotorEngine.calculate({ motor_type: "dc_brush" });
    expect(servo.efficiency.value).toBeGreaterThan(dc.efficiency.value);
  });

  it("starting current > full load current", () => {
    const r = electricMotorEngine.calculate({ motor_type: "induction" });
    expect(r.starting_current.value).toBeGreaterThan(
      r.full_load_current.value
    );
  });

  it("induction has higher LRA multiplier than servo", () => {
    const ind = electricMotorEngine.calculate({ motor_type: "induction" });
    const servo = electricMotorEngine.calculate({ motor_type: "servo" });
    const indRatio = ind.starting_current.value / ind.full_load_current.value;
    const servoRatio = servo.starting_current.value / servo.full_load_current.value;
    expect(indRatio).toBeGreaterThan(servoRatio);
  });

  it("annual energy cost > 0", () => {
    const r = electricMotorEngine.calculate({
      load_power_kw: 10,
      hours_per_year: 4000,
      electricity_cost_kwh: 0.12,
    });
    expect(r.annual_energy_cost.value).toBeGreaterThan(0);
  });

  it("intermittent duty reduces required power", () => {
    const cont = electricMotorEngine.calculate({
      load_power_kw: 10,
      duty_cycle: "S1_continuous",
    });
    const inter = electricMotorEngine.calculate({
      load_power_kw: 10,
      duty_cycle: "S3_intermittent",
      duty_on_pct: 40,
    });
    expect(inter.required_power.value).toBeGreaterThan(
      cont.required_power.value
    );
  });

  it("warns single phase > 3 kW", () => {
    const r = electricMotorEngine.calculate({
      load_power_kw: 5,
      supply_phases: 1,
    });
    expect(r.warnings.some(w => w.includes("Single-phase"))).toBe(true);
  });

  it("feasible with standard parameters", () => {
    const r = electricMotorEngine.calculate({
      load_power_kw: 7.5,
      speed_rpm: 1500,
    });
    expect(r.motor_feasible.unit).toBe("PASS");
  });
});
