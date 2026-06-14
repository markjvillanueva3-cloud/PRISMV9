/**
 * U-DEA-november-P04 (DEA-MS0) — calculateWithLaserInterferometer + machine_warmup_with_laser_interferometer
 *
 * Tests the cross-wire activation of the dormant precision-cluster:
 *   LaserInterferometerCompensationEngine.{compensateWavelength, generateCompensationTable}
 *     -> MachineWarmupEngine.calculateWithLaserInterferometer
 *
 * Dispatcher action `machine_warmup_with_laser_interferometer` (prism_machine_setup)
 * orchestrates the two engines; this suite asserts the engine-level chain in the
 * same shape.
 *
 * Coverage:
 *   happy path · no overlay -> no_data · partial (wavelength only) ·
 *   partial (comp_table only) · marginal-accuracy gate ·
 *   3 failure modes · 2 adversarial · backwards-compat · dispatcher contract.
 */
import { describe, it, expect } from "vitest";
import {
  machineWarmupEngine,
  type MachineWarmupInput,
  type LaserOverlayInput,
  type MachineWarmupResultWithLaser,
} from "../engines/MachineWarmupEngine.js";

const BASE_WARMUP: MachineWarmupInput = {
  max_spindle_rpm: 12000,
  spindle_type: "direct",
  ambient_temp_c: 22,
  ambient_change_c_hr: 1,
  machine_class: "precision",
  idle_hours: 12,
  required_accuracy_mm: 0.010,
  axes: 3,
  has_linear_scale: true,
  has_spindle_chiller: false,
};

const STANDARD_WAVELENGTH = {
  wavelength_nm: 632.991,    // HeNe stabilized
  temperature_C: 22,
  pressure_hPa: 1013.25,
  humidity_pct: 50,
  co2_ppm: 450,
};

// 5-point bidirectional measurement on the X axis — ISO 230-2 minimum.
const NOMINAL_COMP_TABLE: LaserOverlayInput["comp_table"] = {
  axis: "X",
  measurement_points: [
    { position_mm:   0, error_um:  0.0, direction: "forward" },
    { position_mm:   0, error_um:  0.2, direction: "reverse" },
    { position_mm: 100, error_um:  1.5, direction: "forward" },
    { position_mm: 100, error_um:  1.8, direction: "reverse" },
    { position_mm: 200, error_um:  3.1, direction: "forward" },
    { position_mm: 200, error_um:  3.4, direction: "reverse" },
    { position_mm: 300, error_um:  4.8, direction: "forward" },
    { position_mm: 300, error_um:  5.2, direction: "reverse" },
    { position_mm: 400, error_um:  6.2, direction: "forward" },
    { position_mm: 400, error_um:  6.6, direction: "reverse" },
  ],
};

describe("calculateWithLaserInterferometer (U-DEA-november-P04)", () => {
  it("happy path: no overlay -> laser_overlay null, source no_data, base warmup intact", () => {
    const r = machineWarmupEngine.calculateWithLaserInterferometer(BASE_WARMUP);
    expect(r).not.toBeNull();
    expect(r.laser_overlay).toBeNull();
    expect(r.laser_overlay_source).toBe("no_data");
    // Base MachineWarmupResult contract preserved
    expect(typeof r.spindle_warmup_time.value).toBe("number");
    expect(r.spindle_warmup_time.unit).toBe("min");
    expect(r.total_warmup_time.value).toBeGreaterThan(0);
    expect(Array.isArray(r.warnings)).toBe(true);
  });

  it("overlay with both sub-blocks -> source consulted, both sub-results populated, environmental_drift_um derived", () => {
    const r = machineWarmupEngine.calculateWithLaserInterferometer(BASE_WARMUP, {
      wavelength: STANDARD_WAVELENGTH,
      comp_table: NOMINAL_COMP_TABLE,
      deadpath_length_mm: 200,
      target_accuracy_um: 5.0,
    });
    expect(r.laser_overlay_source).toBe("consulted");
    expect(r.laser_overlay).not.toBeNull();
    const ov = r.laser_overlay!;
    expect(ov.wavelength_compensation).not.toBeNull();
    expect(ov.comp_table).not.toBeNull();
    expect(ov.environmental_drift_um).not.toBeNull();
    expect(Array.isArray(ov.warnings)).toBe(true);
    // Refractive index of dry-ish air ~1.0002-1.0003
    expect(ov.wavelength_compensation!.refractive_index).toBeGreaterThan(1.0);
    expect(ov.wavelength_compensation!.refractive_index).toBeLessThan(1.001);
    expect(ov.wavelength_compensation!.wavelength_corrected_nm).toBeGreaterThan(0);
    // 5-point bidirectional table -> 5 entries, backlash > 0, accuracy > 0
    expect(ov.comp_table!.compensation_table).toHaveLength(5);
    expect(ov.comp_table!.backlash_um).toBeGreaterThan(0);
    expect(ov.comp_table!.accuracy_um).toBeGreaterThan(0);
    expect(typeof ov.accuracy_marginal).toBe("boolean");
  });

  it("partial overlay (wavelength only) -> comp_table null, environmental_drift_um populated", () => {
    const r = machineWarmupEngine.calculateWithLaserInterferometer(BASE_WARMUP, {
      wavelength: STANDARD_WAVELENGTH,
    });
    expect(r.laser_overlay_source).toBe("consulted");
    expect(r.laser_overlay!.wavelength_compensation).not.toBeNull();
    expect(r.laser_overlay!.comp_table).toBeNull();
    expect(r.laser_overlay!.environmental_drift_um).not.toBeNull();
    expect(r.laser_overlay!.warnings).toEqual([]);
    // no target_accuracy_um -> accuracy_marginal stays null
    expect(r.laser_overlay!.accuracy_marginal).toBeNull();
  });

  it("partial overlay (comp_table only) -> wavelength null, environmental_drift_um null", () => {
    const r = machineWarmupEngine.calculateWithLaserInterferometer(BASE_WARMUP, {
      comp_table: NOMINAL_COMP_TABLE,
    });
    expect(r.laser_overlay_source).toBe("consulted");
    expect(r.laser_overlay!.wavelength_compensation).toBeNull();
    expect(r.laser_overlay!.environmental_drift_um).toBeNull();
    expect(r.laser_overlay!.comp_table).not.toBeNull();
    expect(r.laser_overlay!.warnings).toEqual([]);
  });

  it("deadpath_length_mm overrides default 100mm -> environmental_drift_um scales linearly", () => {
    const r100 = machineWarmupEngine.calculateWithLaserInterferometer(BASE_WARMUP, {
      wavelength: STANDARD_WAVELENGTH,
      deadpath_length_mm: 100,
    });
    const r500 = machineWarmupEngine.calculateWithLaserInterferometer(BASE_WARMUP, {
      wavelength: STANDARD_WAVELENGTH,
      deadpath_length_mm: 500,
    });
    expect(r100.laser_overlay!.environmental_drift_um).not.toBeNull();
    expect(r500.laser_overlay!.environmental_drift_um).not.toBeNull();
    // 5× deadpath -> ~5× drift (within float tolerance)
    const ratio = r500.laser_overlay!.environmental_drift_um! / r100.laser_overlay!.environmental_drift_um!;
    expect(ratio).toBeGreaterThan(4.9);
    expect(ratio).toBeLessThan(5.1);
  });

  it("marginal-accuracy gate: poor repeatability vs tight target -> accuracy_marginal=true", () => {
    // Build a noisy comp table where 2σ exceeds the target accuracy.
    const noisyTable: LaserOverlayInput["comp_table"] = {
      axis: "X",
      measurement_points: [
        { position_mm:   0, error_um:  0.0, direction: "forward" },
        { position_mm:   0, error_um: 12.0, direction: "forward" },
        { position_mm:   0, error_um:  6.0, direction: "forward" },
        { position_mm:   0, error_um:  0.5, direction: "reverse" },
        { position_mm:   0, error_um: 11.5, direction: "reverse" },
        { position_mm: 100, error_um:  0.0, direction: "forward" },
        { position_mm: 100, error_um: 10.0, direction: "forward" },
      ],
    };
    const r = machineWarmupEngine.calculateWithLaserInterferometer(BASE_WARMUP, {
      comp_table: noisyTable,
      target_accuracy_um: 2.0, // tight — well below the ~10µm repeatability
    });
    expect(r.laser_overlay!.comp_table!.repeatability_um).toBeGreaterThan(2.0);
    expect(r.laser_overlay!.accuracy_marginal).toBe(true);
  });

  it("marginal-accuracy gate: clean measurements + loose target -> accuracy_marginal=false", () => {
    const r = machineWarmupEngine.calculateWithLaserInterferometer(BASE_WARMUP, {
      comp_table: NOMINAL_COMP_TABLE,
      target_accuracy_um: 100.0, // very loose
    });
    expect(r.laser_overlay!.comp_table!.repeatability_um).toBeLessThan(100.0);
    expect(r.laser_overlay!.accuracy_marginal).toBe(false);
  });

  it("failure mode: empty overlay object -> source no_data (no sub-block to consult)", () => {
    const r = machineWarmupEngine.calculateWithLaserInterferometer(BASE_WARMUP, {});
    expect(r.laser_overlay).toBeNull();
    expect(r.laser_overlay_source).toBe("no_data");
  });

  it("failure mode: target_accuracy_um=0 with overlay -> consulted but accuracy_marginal stays null", () => {
    const r = machineWarmupEngine.calculateWithLaserInterferometer(BASE_WARMUP, {
      wavelength: STANDARD_WAVELENGTH,
      target_accuracy_um: 0,
    });
    expect(r.laser_overlay_source).toBe("consulted");
    expect(r.laser_overlay!.accuracy_marginal).toBeNull();
  });

  it("failure mode: target_accuracy_um=NaN -> accuracy_marginal stays null (guarded)", () => {
    const r = machineWarmupEngine.calculateWithLaserInterferometer(BASE_WARMUP, {
      comp_table: NOMINAL_COMP_TABLE,
      target_accuracy_um: Number.NaN,
    });
    expect(r.laser_overlay_source).toBe("consulted");
    expect(r.laser_overlay!.accuracy_marginal).toBeNull();
  });

  it("adversarial: extreme ambient conditions (cold, low pressure) still produce finite refractive index", () => {
    const r = machineWarmupEngine.calculateWithLaserInterferometer(BASE_WARMUP, {
      wavelength: {
        wavelength_nm: 632.991,
        temperature_C: 5,       // unusually cold
        pressure_hPa: 600,      // mountain-altitude
        humidity_pct: 90,
        co2_ppm: 600,
      },
    });
    expect(r.laser_overlay_source).toBe("consulted");
    expect(r.laser_overlay!.wavelength_compensation).not.toBeNull();
    expect(Number.isFinite(r.laser_overlay!.wavelength_compensation!.refractive_index)).toBe(true);
    expect(r.laser_overlay!.wavelength_compensation!.refractive_index).toBeGreaterThan(1.0);
    expect(Number.isFinite(r.laser_overlay!.environmental_drift_um!)).toBe(true);
  });

  it("adversarial: comp_table with no measurement_points -> populated overlay with zero metrics", () => {
    const r = machineWarmupEngine.calculateWithLaserInterferometer(BASE_WARMUP, {
      comp_table: { axis: "X", measurement_points: [] },
    });
    expect(r.laser_overlay_source).toBe("consulted");
    expect(r.laser_overlay!.comp_table).not.toBeNull();
    expect(r.laser_overlay!.comp_table!.compensation_table).toEqual([]);
    expect(r.laser_overlay!.comp_table!.backlash_um).toBe(0);
    expect(r.laser_overlay!.comp_table!.repeatability_um).toBe(0);
    expect(r.laser_overlay!.comp_table!.accuracy_um).toBe(0);
    expect(r.laser_overlay!.warnings).toEqual([]);
  });

  it("backwards-compat: calculate() return shape has NO laser_overlay keys", () => {
    const base = machineWarmupEngine.calculate(BASE_WARMUP);
    const baseRec = base as unknown as Record<string, unknown>;
    const keys = Object.keys(baseRec);
    expect(keys).not.toContain("laser_overlay");
    expect(keys).not.toContain("laser_overlay_source");
    expect(base.total_warmup_time.value).toBeGreaterThan(0);
  });
});

describe("machine_warmup_with_laser_interferometer dispatcher contract (U-DEA-november-P04)", () => {
  it("dispatcher action chains engine + returns augmented MachineWarmupResultWithLaser shape", () => {
    const data = machineWarmupEngine.calculateWithLaserInterferometer(BASE_WARMUP, {
      wavelength: STANDARD_WAVELENGTH,
      comp_table: NOMINAL_COMP_TABLE,
      deadpath_length_mm: 300,
      target_accuracy_um: 5.0,
    });
    expect(data).not.toBeNull();
    const cap = data as MachineWarmupResultWithLaser;
    expect(cap.laser_overlay_source).toBe("consulted");
    expect(cap.laser_overlay).not.toBeNull();
    expect(cap.laser_overlay!.wavelength_compensation).not.toBeNull();
    expect(cap.laser_overlay!.comp_table).not.toBeNull();
    expect(cap.laser_overlay!.environmental_drift_um).not.toBeNull();
    expect(cap.laser_overlay!.environmental_drift_um).toBeGreaterThanOrEqual(0);
    expect(typeof cap.total_warmup_time.value).toBe("number");
    expect(cap.spindle_warmup_time.unit).toBe("min");
  });
});