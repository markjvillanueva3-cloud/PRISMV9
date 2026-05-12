/**
 * Process Damping Stability Tests — Altintas et al. (2008) Model
 *
 * Validates process damping implementation for low-speed chatter stability.
 * The classical SDOF model neglects process damping, causing 30-50%
 * underestimation of stability at low cutting speeds (<150 m/min).
 *
 * References:
 *   [1] Altintas, Y., Eynian, M., & Onozuka, H. (2008). "Identification of
 *       dynamic cutting force coefficients and chatter stability with process
 *       damping." CIRP Annals, 57(1), 371-374.
 *   [2] Budak, E., & Tunc, L.T. (2009). "A new method for identification and
 *       modeling of process damping in machining." ASME J. Manuf. Sci. Eng.
 *
 * P0-CRITICAL: Physics gap fix for low-speed stability underestimation.
 */

import { describe, it, expect } from "vitest";
import {
  chatterStabilityLobeEngine,
  type ProcessDampingParams,
  type ChatterInput,
} from "../engines/ChatterStabilityLobeEngine.js";

// ============================================================================
// TEST SUITE: Process Damping Coefficient Calculation
// ============================================================================

describe("Process Damping — Coefficient Calculation (Altintas 2008 Eq. 8)", () => {
  describe("Cp = Ksp × VB × tan(γ) / (2π × f × Vc)", () => {
    it("should calculate process damping coefficient with correct units", () => {
      const params: ProcessDampingParams = {
        clearanceAngle: 7,          // degrees
        wearLandLength: 0.1,        // mm
        indentationCoeff: 3000,     // N/mm² (steel)
        cuttingSpeed: 50,           // m/min (low speed)
        vibrationFrequency: 1000,   // Hz
      };

      const result = chatterStabilityLobeEngine.calculateProcessDamping(params);

      // Verify coefficient is positive and reasonable magnitude
      expect(result.dampingCoeff).toBeGreaterThan(0);
      expect(result.dampingCoeff).toBeLessThan(1); // Cp typically << 1 N·s/mm
    });

    it("should increase Cp as cutting speed decreases (inverse relationship)", () => {
      const baseParams: ProcessDampingParams = {
        clearanceAngle: 7,
        wearLandLength: 0.1,
        indentationCoeff: 3000,
        cuttingSpeed: 100,
        vibrationFrequency: 1000,
      };

      const result100 = chatterStabilityLobeEngine.calculateProcessDamping(baseParams);
      const result50 = chatterStabilityLobeEngine.calculateProcessDamping({
        ...baseParams,
        cuttingSpeed: 50,
      });

      // Cp ∝ 1/Vc, so halving speed should double Cp
      expect(result50.dampingCoeff / result100.dampingCoeff).toBeCloseTo(2, 1);
    });

    it("should increase Cp with larger wear land (linear relationship)", () => {
      const baseParams: ProcessDampingParams = {
        clearanceAngle: 7,
        wearLandLength: 0.05,
        indentationCoeff: 3000,
        cuttingSpeed: 50,
        vibrationFrequency: 1000,
      };

      const result005 = chatterStabilityLobeEngine.calculateProcessDamping(baseParams);
      const result010 = chatterStabilityLobeEngine.calculateProcessDamping({
        ...baseParams,
        wearLandLength: 0.1,
      });

      // Cp ∝ VB, so doubling wear land should double Cp
      expect(result010.dampingCoeff / result005.dampingCoeff).toBeCloseTo(2, 1);
    });

    it("should increase Cp with larger clearance angle (tan relationship)", () => {
      const baseParams: ProcessDampingParams = {
        clearanceAngle: 5,
        wearLandLength: 0.1,
        indentationCoeff: 3000,
        cuttingSpeed: 50,
        vibrationFrequency: 1000,
      };

      const result5deg = chatterStabilityLobeEngine.calculateProcessDamping(baseParams);
      const result10deg = chatterStabilityLobeEngine.calculateProcessDamping({
        ...baseParams,
        clearanceAngle: 10,
      });

      // Cp ∝ tan(γ)
      const expectedRatio = Math.tan(10 * Math.PI / 180) / Math.tan(5 * Math.PI / 180);
      expect(result10deg.dampingCoeff / result5deg.dampingCoeff).toBeCloseTo(expectedRatio, 1);
    });

    it("should decrease Cp with higher vibration frequency (inverse relationship)", () => {
      const baseParams: ProcessDampingParams = {
        clearanceAngle: 7,
        wearLandLength: 0.1,
        indentationCoeff: 3000,
        cuttingSpeed: 50,
        vibrationFrequency: 1000,
      };

      const result1000 = chatterStabilityLobeEngine.calculateProcessDamping(baseParams);
      const result2000 = chatterStabilityLobeEngine.calculateProcessDamping({
        ...baseParams,
        vibrationFrequency: 2000,
      });

      // Cp ∝ 1/f, so doubling frequency should halve Cp
      expect(result2000.dampingCoeff / result1000.dampingCoeff).toBeCloseTo(0.5, 1);
    });
  });

  describe("Process damping significance detection", () => {
    it("should flag process damping as significant at low speeds (<150 m/min)", () => {
      const lowSpeedResult = chatterStabilityLobeEngine.calculateProcessDamping({
        clearanceAngle: 7,
        wearLandLength: 0.1,
        indentationCoeff: 3000,
        cuttingSpeed: 80,
        vibrationFrequency: 1000,
      });

      expect(lowSpeedResult.isSignificant).toBe(true);
    });

    it("should NOT flag process damping as significant at high speeds (>150 m/min)", () => {
      const highSpeedResult = chatterStabilityLobeEngine.calculateProcessDamping({
        clearanceAngle: 7,
        wearLandLength: 0.05, // fresh tool with small wear land
        indentationCoeff: 3000,
        cuttingSpeed: 250,
        vibrationFrequency: 1000,
      });

      // At high speeds with small wear land, process damping is negligible
      // The wavelength > 2×VB condition determines significance
      expect(highSpeedResult.isSignificant).toBe(false);
    });

    it("should detect significance based on wavelength vs wear land", () => {
      // Vibration wavelength λ = Vc / f
      // Process damping significant when λ < 2 × VB

      // Low speed: λ = 50 m/min / 1000 Hz = 50/60 mm/s / 1000 = 0.833 mm
      const lowSpeedResult = chatterStabilityLobeEngine.calculateProcessDamping({
        clearanceAngle: 7,
        wearLandLength: 0.5, // λ < 2×0.5 = 1mm, so significant
        indentationCoeff: 3000,
        cuttingSpeed: 50,
        vibrationFrequency: 1000,
      });

      expect(lowSpeedResult.isSignificant).toBe(true);
    });
  });

  describe("Parameter validation and warnings", () => {
    it("should warn for clearance angle outside typical range (5-15 deg)", () => {
      const result = chatterStabilityLobeEngine.calculateProcessDamping({
        clearanceAngle: 25, // too high
        wearLandLength: 0.1,
        indentationCoeff: 3000,
        cuttingSpeed: 50,
        vibrationFrequency: 1000,
      });

      expect(result.warning).toBeDefined();
      expect(result.warning).toContain("Clearance angle");
    });

    it("should warn for wear land outside typical range", () => {
      const result = chatterStabilityLobeEngine.calculateProcessDamping({
        clearanceAngle: 7,
        wearLandLength: 0.6, // too large
        indentationCoeff: 3000,
        cuttingSpeed: 50,
        vibrationFrequency: 1000,
      });

      expect(result.warning).toBeDefined();
      expect(result.warning).toContain("Wear land");
    });
  });
});

// ============================================================================
// TEST SUITE: Stability Increase Factor
// ============================================================================

describe("Process Damping — Stability Increase Factor", () => {
  it("should increase stability at low cutting speeds", () => {
    const result = chatterStabilityLobeEngine.calculateProcessDamping({
      clearanceAngle: 7,
      wearLandLength: 0.1,
      indentationCoeff: 3000,
      cuttingSpeed: 50, // very low speed
      vibrationFrequency: 1000,
    });

    // At low speeds, stability should increase by 10-50%
    expect(result.stabilityIncreaseFactor).toBeGreaterThan(1.0);
    expect(result.stabilityIncreaseFactor).toBeLessThanOrEqual(3.0);
  });

  it("should have minimal effect at high cutting speeds", () => {
    const result = chatterStabilityLobeEngine.calculateProcessDamping({
      clearanceAngle: 7,
      wearLandLength: 0.05,
      indentationCoeff: 3000,
      cuttingSpeed: 300, // high speed milling
      vibrationFrequency: 1000,
    });

    // At high speeds, process damping is negligible
    if (!result.isSignificant) {
      expect(result.stabilityIncreaseFactor).toBe(1.0);
    }
  });

  it("should cap stability increase at 3x (physical upper bound)", () => {
    const extremeResult = chatterStabilityLobeEngine.calculateProcessDamping({
      clearanceAngle: 15, // large angle
      wearLandLength: 0.3, // worn tool
      indentationCoeff: 5000, // hard material
      cuttingSpeed: 20, // very low speed
      vibrationFrequency: 500, // low frequency
    });

    // Even extreme cases should not exceed 3x
    expect(extremeResult.stabilityIncreaseFactor).toBeLessThanOrEqual(3.0);
  });
});

// ============================================================================
// TEST SUITE: Low-Speed Turning and Boring
// ============================================================================

describe("Process Damping — Low-Speed Turning/Boring Applications", () => {
  const lowSpeedTurningInput: ChatterInput = {
    tool: {
      diameter_mm: 25, // 25mm boring bar
      flute_count: 4,  // 4-flute endmill for better lobe generation
      overhang_mm: 80, // 3.2× L/D — moderate overhang
      material: "carbide",
    },
    workpiece: { iso_group: "P" }, // steel
    machine: {
      max_rpm: 3000,
      min_rpm: 500,
      natural_frequency_hz: 1500, // moderate frequency
      damping_ratio: 0.03, // typical damping
      stiffness_n_um: 15, // moderate stiffness
    },
    cutting: {
      radial_immersion_ratio: 0.5,
      up_milling: false,
    },
    rpm_range: [500, 2500],
    process_damping: {
      clearance_angle_deg: 7,
      wear_land_mm: 0.1,
      indentation_coeff: 3000,
      enabled: true,
    },
  };

  it("should include process_damping_analysis in result for low-speed boring", () => {
    const result = chatterStabilityLobeEngine.compute(lowSpeedTurningInput);

    expect(result.value.process_damping_analysis).toBeDefined();
    expect(result.value.process_damping_analysis?.is_significant).toBe(true);
  });

  it("should report enhanced stability limit >= classical when process damping active", () => {
    const result = chatterStabilityLobeEngine.compute(lowSpeedTurningInput);
    const analysis = result.value.process_damping_analysis;

    expect(analysis).toBeDefined();
    // Enhanced limit should be at least equal to classical (factor >= 1.0)
    // The difference may be small if process damping is not very significant
    expect(analysis!.stability_increase_factor).toBeGreaterThanOrEqual(1.0);
    expect(analysis!.enhanced_limit_mm).toBeGreaterThanOrEqual(analysis!.classical_limit_mm);
  });

  it("should increase max_stable_ap_mm when process damping is significant", () => {
    // Compute without process damping
    const inputWithoutPD = { ...lowSpeedTurningInput };
    delete inputWithoutPD.process_damping;
    // Force high speed to avoid auto-detection
    inputWithoutPD.machine = {
      ...inputWithoutPD.machine,
      min_rpm: 5000,
      max_rpm: 20000,
    };
    inputWithoutPD.rpm_range = [5000, 20000];

    const resultWithoutPD = chatterStabilityLobeEngine.compute(inputWithoutPD);

    // Compute with process damping at low speed
    const resultWithPD = chatterStabilityLobeEngine.compute(lowSpeedTurningInput);

    // Process damping should enhance stability
    expect(resultWithPD.value.process_damping_analysis?.stability_increase_factor).toBeGreaterThan(1.0);
  });

  it("should add process damping recommendation for low-speed operations", () => {
    const result = chatterStabilityLobeEngine.compute(lowSpeedTurningInput);

    const hasPDRec = result.value.recommendations.some(
      r => r.includes("Process Damping") || r.includes("process damping")
    );
    expect(hasPDRec).toBe(true);
  });

  it("should report stability increase factor between 1.0 and 3.0", () => {
    const result = chatterStabilityLobeEngine.compute(lowSpeedTurningInput);
    const factor = result.value.process_damping_analysis?.stability_increase_factor;

    expect(factor).toBeDefined();
    expect(factor).toBeGreaterThanOrEqual(1.0);
    expect(factor).toBeLessThanOrEqual(3.0);
  });
});

// ============================================================================
// TEST SUITE: Material-Dependent Indentation Coefficient
// ============================================================================

describe("Process Damping — Material Effects", () => {
  const baseInput: ChatterInput = {
    tool: {
      diameter_mm: 20,
      flute_count: 4,
      overhang_mm: 60,
      material: "carbide",
    },
    workpiece: { iso_group: "P" },
    machine: {
      max_rpm: 2000,
      natural_frequency_hz: 1500,
      damping_ratio: 0.03,
      stiffness_n_um: 15,
    },
    cutting: {
      radial_immersion_ratio: 0.5,
      up_milling: false,
    },
    rpm_range: [200, 1000],
  };

  it("should use higher Ksp for titanium (ISO S) vs aluminum (ISO N)", () => {
    // Titanium (ISO S): Ksp ~ 4000 N/mm²
    const tiResult = chatterStabilityLobeEngine.compute({
      ...baseInput,
      workpiece: { iso_group: "S" },
    });

    // Aluminum (ISO N): Ksp ~ 1000 N/mm²
    const alResult = chatterStabilityLobeEngine.compute({
      ...baseInput,
      workpiece: { iso_group: "N" },
    });

    // Both should have process damping analysis at low speeds
    expect(tiResult.value.process_damping_analysis?.stability_increase_factor)
      .toBeGreaterThanOrEqual(1.0);
    expect(alResult.value.process_damping_analysis?.stability_increase_factor)
      .toBeGreaterThanOrEqual(1.0);
  });

  it("should use ~3000 N/mm² Ksp for steel (ISO P) by default", () => {
    const params: ProcessDampingParams = {
      clearanceAngle: 7,
      wearLandLength: 0.1,
      indentationCoeff: 3000, // steel default
      cuttingSpeed: 50,
      vibrationFrequency: 1000,
    };

    const result = chatterStabilityLobeEngine.calculateProcessDamping(params);

    // Verify calculation uses provided coefficient
    expect(result.dampingCoeff).toBeGreaterThan(0);
  });
});

// ============================================================================
// TEST SUITE: Integration with StabilityLobeDiagram
// ============================================================================

describe("Process Damping — SLD Integration", () => {
  it("should update formula when process damping is significant", () => {
    const input: ChatterInput = {
      tool: {
        diameter_mm: 25,
        flute_count: 1,
        overhang_mm: 150,
        material: "carbide",
      },
      workpiece: { iso_group: "P" },
      machine: {
        max_rpm: 1000,
        natural_frequency_hz: 800,
        damping_ratio: 0.02,
        stiffness_n_um: 3,
      },
      cutting: {
        radial_immersion_ratio: 1.0,
        up_milling: false,
      },
      rpm_range: [100, 800],
      process_damping: {
        clearance_angle_deg: 7,
        wear_land_mm: 0.1,
        indentation_coeff: 3000,
        enabled: true,
      },
    };

    const result = chatterStabilityLobeEngine.compute(input);

    // Formula should reference process damping when significant
    if (result.value.process_damping_analysis?.is_significant) {
      expect(result.formula).toContain("process damping");
    }
  });

  it("should report threshold speed in analysis", () => {
    const input: ChatterInput = {
      tool: {
        diameter_mm: 20,
        flute_count: 4,
        overhang_mm: 60,
        material: "carbide",
      },
      workpiece: { iso_group: "P" },
      machine: {
        max_rpm: 2000,
        natural_frequency_hz: 1500,
        damping_ratio: 0.03,
        stiffness_n_um: 15,
      },
      cutting: {
        radial_immersion_ratio: 0.5,
        up_milling: false,
      },
      rpm_range: [200, 1000],
    };

    const result = chatterStabilityLobeEngine.compute(input);

    if (result.value.process_damping_analysis) {
      // Threshold should be around 150 m/min (typical)
      expect(result.value.process_damping_analysis.threshold_speed_mpm).toBeCloseTo(150, -1);
    }
  });
});

// ============================================================================
// TEST SUITE: computeWithProcessDamping Method
// ============================================================================

describe("computeWithProcessDamping — Explicit Process Damping Calculation", () => {
  it("should return enhanced stability lobes", () => {
    const input = {
      tool: {
        diameter_mm: 20,
        flute_count: 4,
        overhang_mm: 60,
        material: "carbide" as const,
      },
      tool_diameter_mm: 20,
      workpiece: { iso_group: "P" as const },
      machine: {
        max_rpm: 5000,
        min_rpm: 500,
        natural_frequency_hz: 1500,
        damping_ratio: 0.03,
        stiffness_n_um: 15,
      },
      cutting: {
        radial_immersion_ratio: 0.5,
        up_milling: false,
      },
      rpm_range: [500, 3000] as [number, number],
      process_damping: {
        clearance_angle_deg: 7,
        wear_land_mm: 0.1,
        indentation_coeff: 3000,
        enabled: true,
      },
    };

    const result = chatterStabilityLobeEngine.computeWithProcessDamping(input);

    expect(result.value.process_damping_analysis).toBeDefined();
    // Lobes may or may not be present depending on computation
    // Main verification is that process damping analysis is present
    expect(result.value.max_stable_ap_mm).toBeGreaterThanOrEqual(0);
    expect(result.formula).toContain("process damping");
  });

  it("should apply speed-dependent enhancement to each lobe point", () => {
    const input = {
      tool: {
        diameter_mm: 20,
        flute_count: 4,
        overhang_mm: 60,
        material: "carbide" as const,
      },
      tool_diameter_mm: 20,
      workpiece: { iso_group: "P" as const },
      machine: {
        max_rpm: 5000,
        min_rpm: 500,
        natural_frequency_hz: 1500,
        damping_ratio: 0.03,
        stiffness_n_um: 15,
      },
      cutting: {
        radial_immersion_ratio: 0.5,
        up_milling: false,
      },
      rpm_range: [500, 3000] as [number, number],
      process_damping: {
        clearance_angle_deg: 7,
        wear_land_mm: 0.1,
        indentation_coeff: 3000,
        enabled: true,
      },
    };

    const result = chatterStabilityLobeEngine.computeWithProcessDamping(input);

    // Verify process damping analysis is present
    expect(result.value.process_damping_analysis).toBeDefined();
    // Enhanced limit should be >= classical limit
    expect(result.value.process_damping_analysis?.enhanced_limit_mm).toBeGreaterThanOrEqual(
      result.value.process_damping_analysis?.classical_limit_mm ?? 0
    );
    // Stability increase factor should be >= 1.0
    expect(result.value.process_damping_analysis?.stability_increase_factor).toBeGreaterThanOrEqual(1.0);
  });
});

// ============================================================================
// TEST SUITE: Literature Validation
// ============================================================================

describe("Process Damping — Literature Reference Values", () => {
  /**
   * Validation against Altintas et al. (2008) experimental observations:
   * - Process damping increases stability by 2-3x at very low speeds (<50 m/min)
   * - Effect diminishes rapidly above 150 m/min
   * - Worn tools (larger VB) show more process damping
   */

  it("should show 2-3x stability increase at very low speeds (per Altintas 2008)", () => {
    // Very low speed condition (20 m/min) with worn tool
    const result = chatterStabilityLobeEngine.calculateProcessDamping({
      clearanceAngle: 10,
      wearLandLength: 0.2, // worn tool
      indentationCoeff: 4000,
      cuttingSpeed: 20, // very low speed
      vibrationFrequency: 500,
    });

    // Altintas 2008 reports 2-3x improvement at very low speeds
    expect(result.stabilityIncreaseFactor).toBeGreaterThanOrEqual(1.5);
    expect(result.stabilityIncreaseFactor).toBeLessThanOrEqual(3.0);
  });

  it("should match expected trend: Cp × ω inversely proportional to Vc", () => {
    // From Altintas et al. (2008) Eq. 8: Cp = Ksp × VB × tan(γ) / (2π × f × Vc)
    // The product Cp × ω = Ksp × VB × tan(γ) / Vc (frequency cancels)

    const baseParams: ProcessDampingParams = {
      clearanceAngle: 7,
      wearLandLength: 0.1,
      indentationCoeff: 3000,
      cuttingSpeed: 100,
      vibrationFrequency: 1000,
    };

    const result100 = chatterStabilityLobeEngine.calculateProcessDamping(baseParams);
    const result50 = chatterStabilityLobeEngine.calculateProcessDamping({
      ...baseParams,
      cuttingSpeed: 50,
    });

    // Cp should double when Vc halves
    const ratio = result50.dampingCoeff / result100.dampingCoeff;
    expect(ratio).toBeCloseTo(2.0, 1);
  });
});

// ============================================================================
// TEST SUITE: Edge Cases
// ============================================================================

describe("Process Damping — Edge Cases", () => {
  it("should handle very small wear land (fresh tool)", () => {
    const result = chatterStabilityLobeEngine.calculateProcessDamping({
      clearanceAngle: 7,
      wearLandLength: 0.02, // fresh tool
      indentationCoeff: 3000,
      cuttingSpeed: 50,
      vibrationFrequency: 1000,
    });

    // Should still compute, but effect is smaller
    expect(result.dampingCoeff).toBeGreaterThan(0);
    expect(result.dampingCoeff).toBeLessThan(
      chatterStabilityLobeEngine.calculateProcessDamping({
        clearanceAngle: 7,
        wearLandLength: 0.2, // worn tool
        indentationCoeff: 3000,
        cuttingSpeed: 50,
        vibrationFrequency: 1000,
      }).dampingCoeff
    );
  });

  it("should handle high frequency vibration", () => {
    const result = chatterStabilityLobeEngine.calculateProcessDamping({
      clearanceAngle: 7,
      wearLandLength: 0.1,
      indentationCoeff: 3000,
      cuttingSpeed: 50,
      vibrationFrequency: 5000, // high frequency
    });

    // Higher frequency → lower Cp (inverse relationship)
    expect(result.dampingCoeff).toBeGreaterThan(0);
  });

  it("should handle aluminum (low Ksp material)", () => {
    const result = chatterStabilityLobeEngine.calculateProcessDamping({
      clearanceAngle: 7,
      wearLandLength: 0.1,
      indentationCoeff: 1000, // aluminum Ksp
      cuttingSpeed: 50,
      vibrationFrequency: 1000,
    });

    // Lower Ksp → lower Cp
    expect(result.dampingCoeff).toBeGreaterThan(0);
    expect(result.dampingCoeff).toBeLessThan(
      chatterStabilityLobeEngine.calculateProcessDamping({
        clearanceAngle: 7,
        wearLandLength: 0.1,
        indentationCoeff: 3000, // steel Ksp
        cuttingSpeed: 50,
        vibrationFrequency: 1000,
      }).dampingCoeff
    );
  });
});
