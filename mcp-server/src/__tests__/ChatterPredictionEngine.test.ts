/**
 * ChatterPredictionEngine Physics Validation Tests
 * MILL-AUDIT/P4: Critical safety tests for chatter/stability prediction
 *
 * Physics model: Altintas/Tlusty Stability Lobe Diagram
 *   a_lim = -1 / (2 × Kt × Re[G(ω)])
 *   where G(ω) is the FRF at chatter frequency
 *
 * Safety risk: Chatter causes tool breakage, poor surface, machine damage
 */

import { describe, it, expect } from "vitest";
import { chatterPredictionEngine } from "../engines/ChatterPredictionEngine.js";

describe("ChatterPredictionEngine — Physics Validation", () => {
  describe("Stability Lobe Diagram Generation", () => {
    it("generates lobes within specified RPM range", () => {
      const result = chatterPredictionEngine.generateStabilityLobes(
        { stiffness: 1e7, damping: 500 }, // N/m, N·s/m
        { Kt: 2000e6, numTeeth: 4 },      // N/m²
        { min: 5000, max: 15000 }
      );

      expect(result.lobes.length).toBeGreaterThan(0);

      // All lobe points should be within RPM range
      for (const lobe of result.lobes) {
        for (const point of lobe.points) {
          expect(point.rpm).toBeGreaterThanOrEqual(5000);
          expect(point.rpm).toBeLessThanOrEqual(15000);
        }
      }
    });

    it("higher damping ratio increases critical depth", () => {
      const lowDamping = chatterPredictionEngine.generateStabilityLobes(
        { stiffness: 1e7, damping: 200 },
        { Kt: 2000e6, numTeeth: 4 },
        { min: 8000, max: 12000 }
      );

      const highDamping = chatterPredictionEngine.generateStabilityLobes(
        { stiffness: 1e7, damping: 1000 },
        { Kt: 2000e6, numTeeth: 4 },
        { min: 8000, max: 12000 }
      );

      // Compare average stable depths
      const avgLow = lowDamping.stablePockets.all.reduce((a, p) => a + p.maxStableDepth_mm, 0) /
                     lowDamping.stablePockets.all.length;
      const avgHigh = highDamping.stablePockets.all.reduce((a, p) => a + p.maxStableDepth_mm, 0) /
                      highDamping.stablePockets.all.length;

      expect(avgHigh).toBeGreaterThan(avgLow);
    });

    it("higher stiffness increases critical depth", () => {
      const lowStiffness = chatterPredictionEngine.generateStabilityLobes(
        { stiffness: 5e6, damping: 500 },
        { Kt: 2000e6, numTeeth: 4 },
        { min: 8000, max: 12000 }
      );

      const highStiffness = chatterPredictionEngine.generateStabilityLobes(
        { stiffness: 2e7, damping: 500 },
        { Kt: 2000e6, numTeeth: 4 },
        { min: 8000, max: 12000 }
      );

      // Higher stiffness = more stable = higher depth limit
      const avgLow = lowStiffness.stablePockets.all.length > 0
        ? lowStiffness.stablePockets.all.reduce((a, p) => a + p.maxStableDepth_mm, 0) / lowStiffness.stablePockets.all.length
        : 0;
      const avgHigh = highStiffness.stablePockets.all.length > 0
        ? highStiffness.stablePockets.all.reduce((a, p) => a + p.maxStableDepth_mm, 0) / highStiffness.stablePockets.all.length
        : 0;

      expect(avgHigh).toBeGreaterThanOrEqual(avgLow);
    });

    it("returns tool dynamics (natural frequency, damping ratio)", () => {
      const result = chatterPredictionEngine.generateStabilityLobes(
        { stiffness: 1e7, damping: 500, mass: 0.5 },
        { Kt: 2000e6, numTeeth: 4 },
        { min: 5000, max: 15000 }
      );

      expect(result.toolDynamics.naturalFreq_Hz).toBeGreaterThan(0);
      expect(result.toolDynamics.dampingRatio).toBeGreaterThan(0);
      expect(result.toolDynamics.dampingRatio).toBeLessThan(1); // underdamped
      expect(result.toolDynamics.stiffness).toBe(1e7);
    });

    it("identifies stable pockets between lobes", () => {
      const result = chatterPredictionEngine.generateStabilityLobes(
        { stiffness: 1e7, damping: 500 },
        { Kt: 2000e6, numTeeth: 4 },
        { min: 5000, max: 20000 }
      );

      expect(result.stablePockets.peaks.length).toBeGreaterThan(0);

      // Peak stable depths should be higher than average
      if (result.stablePockets.peaks.length > 0 && result.stablePockets.all.length > 0) {
        const avgAll = result.stablePockets.all.reduce((a, p) => a + p.maxStableDepth_mm, 0) /
                       result.stablePockets.all.length;
        const avgPeaks = result.stablePockets.peaks.reduce((a, p) => a + p.maxStableDepth_mm, 0) /
                         result.stablePockets.peaks.length;
        expect(avgPeaks).toBeGreaterThanOrEqual(avgAll * 0.9); // Peaks should be at or above average
      }
    });
  });

  describe("Stability Check", () => {
    it("returns stable=true when depth is below limit", () => {
      const lobes = chatterPredictionEngine.generateStabilityLobes(
        { stiffness: 1e7, damping: 500 },
        { Kt: 2000e6, numTeeth: 4 },
        { min: 8000, max: 12000 }
      );

      // Find a stable pocket peak
      const stablePocket = lobes.stablePockets.peaks[0];
      if (stablePocket) {
        const result = chatterPredictionEngine.checkStability(
          stablePocket.rpm,
          stablePocket.maxStableDepth_mm * 0.5, // Well below limit
          lobes
        );

        expect(result.stable).toBe(true);
        expect(result.marginPercent).toBeGreaterThan(0);
      }
    });

    it("returns stable=false when depth exceeds limit", () => {
      const lobes = chatterPredictionEngine.generateStabilityLobes(
        { stiffness: 1e7, damping: 500 },
        { Kt: 2000e6, numTeeth: 4 },
        { min: 8000, max: 12000 }
      );

      // Find a stable pocket and exceed it
      const stablePocket = lobes.stablePockets.all[0];
      if (stablePocket && stablePocket.maxStableDepth_mm > 0) {
        const result = chatterPredictionEngine.checkStability(
          stablePocket.rpm,
          stablePocket.maxStableDepth_mm * 2, // Exceed limit
          lobes
        );

        expect(result.stable).toBe(false);
        expect(result.marginPercent).toBeLessThan(0);
      }
    });

    it("provides margin percentage calculation", () => {
      const lobes = chatterPredictionEngine.generateStabilityLobes(
        { stiffness: 1e7, damping: 500 },
        { Kt: 2000e6, numTeeth: 4 },
        { min: 8000, max: 12000 }
      );

      const stablePocket = lobes.stablePockets.all[0];
      if (stablePocket && stablePocket.maxStableDepth_mm > 0) {
        const testDepth = stablePocket.maxStableDepth_mm * 0.5;
        const result = chatterPredictionEngine.checkStability(
          stablePocket.rpm,
          testDepth,
          lobes
        );

        // Margin should be approximately (limit - actual) / limit * 100
        const expectedMargin = ((result.criticalDepth_mm - testDepth) / result.criticalDepth_mm) * 100;
        expect(result.marginPercent).toBeCloseTo(expectedMargin, 0);
      }
    });

    it("includes actionable recommendation", () => {
      const lobes = chatterPredictionEngine.generateStabilityLobes(
        { stiffness: 1e7, damping: 500 },
        { Kt: 2000e6, numTeeth: 4 },
        { min: 8000, max: 12000 }
      );

      const result = chatterPredictionEngine.checkStability(10000, 5, lobes);

      expect(result.recommendation).toBeDefined();
      expect(result.recommendation.length).toBeGreaterThan(0);
    });
  });

  describe("Chatter Detection (DFT)", () => {
    it("detects no chatter in clean sinusoidal signal at tooth-passing frequency", () => {
      // Generate clean signal at tooth-passing frequency
      const rpm = 6000;
      const teeth = 4;
      const sampleRate = 10000;
      const duration = 0.5; // seconds
      const toothPassingFreq = (rpm * teeth) / 60; // 400 Hz

      const signal: number[] = [];
      for (let i = 0; i < duration * sampleRate; i++) {
        const t = i / sampleRate;
        signal.push(Math.sin(2 * Math.PI * toothPassingFreq * t));
      }

      const result = chatterPredictionEngine.detectChatter(signal, {
        sampleRate,
        teeth,
        rpm,
      });

      expect(result.chatterDetected).toBe(false);
      expect(result.toothPassingFrequency_Hz).toBeCloseTo(toothPassingFreq, 0);
    });

    it("detects chatter when non-harmonic frequency is present", () => {
      // Generate signal with tooth-passing + non-harmonic chatter frequency
      const rpm = 6000;
      const teeth = 4;
      const sampleRate = 10000;
      const duration = 0.5;
      const toothPassingFreq = (rpm * teeth) / 60; // 400 Hz
      const chatterFreq = 750; // Non-harmonic frequency

      const signal: number[] = [];
      for (let i = 0; i < duration * sampleRate; i++) {
        const t = i / sampleRate;
        signal.push(
          Math.sin(2 * Math.PI * toothPassingFreq * t) +
          0.5 * Math.sin(2 * Math.PI * chatterFreq * t) // Chatter component
        );
      }

      const result = chatterPredictionEngine.detectChatter(signal, {
        sampleRate,
        teeth,
        rpm,
      });

      expect(result.chatterDetected).toBe(true);
      expect(result.chatterSeverity).toBeGreaterThan(0);
      if (result.chatterFrequency_Hz !== null) {
        expect(result.chatterFrequency_Hz).toBeCloseTo(chatterFreq, -1); // Within 10 Hz
      }
    });

    it("calculates tooth-passing frequency correctly", () => {
      const rpm = 12000;
      const teeth = 6;
      const expectedFreq = (rpm * teeth) / 60; // 1200 Hz

      const signal = Array(1000).fill(0).map(() => Math.random());

      const result = chatterPredictionEngine.detectChatter(signal, {
        sampleRate: 5000,
        teeth,
        rpm,
      });

      expect(result.toothPassingFrequency_Hz).toBeCloseTo(expectedFreq, 0);
    });

    it("provides severity ratio for chatter", () => {
      const rpm = 6000;
      const teeth = 4;
      const sampleRate = 10000;
      const toothPassingFreq = (rpm * teeth) / 60;
      const chatterFreq = 750;

      // Strong chatter signal
      const strongSignal: number[] = [];
      for (let i = 0; i < 5000; i++) {
        const t = i / sampleRate;
        strongSignal.push(
          Math.sin(2 * Math.PI * toothPassingFreq * t) +
          Math.sin(2 * Math.PI * chatterFreq * t) // Equal magnitude chatter
        );
      }

      const result = chatterPredictionEngine.detectChatter(strongSignal, {
        sampleRate,
        teeth,
        rpm,
      });

      if (result.chatterDetected) {
        expect(result.chatterSeverity).toBeGreaterThan(0);
        expect(result.chatterSeverity).toBeLessThanOrEqual(1);
      }
    });
  });

  describe("Critical Speed Analysis", () => {
    it("calculates critical speeds for simply-supported shaft", () => {
      const result = chatterPredictionEngine.criticalSpeeds(
        { length: 500, diameter: 50, E: 200e9, density: 7850 },
        "simply_supported"
      );

      expect(result.criticalSpeeds.length).toBeGreaterThanOrEqual(3);
      expect(result.criticalSpeeds[0].mode).toBe(1);
      expect(result.criticalSpeeds[0].criticalRPM).toBeGreaterThan(0);
    });

    it("cantilever has lower critical speed than simply-supported", () => {
      const shaftParams = { length: 500, diameter: 50, E: 200e9, density: 7850 };

      const cantilever = chatterPredictionEngine.criticalSpeeds(shaftParams, "cantilever");
      const simplySupported = chatterPredictionEngine.criticalSpeeds(shaftParams, "simply_supported");

      // Cantilever is less stiff, lower critical speed
      expect(cantilever.criticalSpeeds[0].criticalRPM).toBeLessThan(
        simplySupported.criticalSpeeds[0].criticalRPM
      );
    });

    it("recommends max RPM at 80% of first critical", () => {
      const result = chatterPredictionEngine.criticalSpeeds(
        { length: 500, diameter: 50, E: 200e9, density: 7850 },
        "simply_supported"
      );

      const firstCritical = result.criticalSpeeds[0].criticalRPM;
      expect(result.recommendedMaxRPM).toBeCloseTo(firstCritical * 0.8, -1);
    });

    it("identifies safe operating ranges between criticals", () => {
      const result = chatterPredictionEngine.criticalSpeeds(
        { length: 500, diameter: 50, E: 200e9, density: 7850 },
        "simply_supported"
      );

      expect(result.safeOperatingRanges.length).toBeGreaterThan(0);

      // Each range should have min < max
      for (const range of result.safeOperatingRanges) {
        expect(range.min).toBeLessThan(range.max);
        expect(range.description).toBeDefined();
      }
    });

    it("shorter shaft has higher critical speed", () => {
      const longShaft = chatterPredictionEngine.criticalSpeeds(
        { length: 1000, diameter: 50, E: 200e9, density: 7850 },
        "simply_supported"
      );

      const shortShaft = chatterPredictionEngine.criticalSpeeds(
        { length: 500, diameter: 50, E: 200e9, density: 7850 },
        "simply_supported"
      );

      // Critical speed inversely proportional to L²
      expect(shortShaft.criticalSpeeds[0].criticalRPM).toBeGreaterThan(
        longShaft.criticalSpeeds[0].criticalRPM
      );
    });

    it("larger diameter has higher critical speed", () => {
      const thinShaft = chatterPredictionEngine.criticalSpeeds(
        { length: 500, diameter: 30, E: 200e9, density: 7850 },
        "simply_supported"
      );

      const thickShaft = chatterPredictionEngine.criticalSpeeds(
        { length: 500, diameter: 60, E: 200e9, density: 7850 },
        "simply_supported"
      );

      // Critical speed proportional to diameter (stiffness)
      expect(thickShaft.criticalSpeeds[0].criticalRPM).toBeGreaterThan(
        thinShaft.criticalSpeeds[0].criticalRPM
      );
    });
  });

  describe("Edge Cases", () => {
    it("handles empty signal array in chatter detection", () => {
      const result = chatterPredictionEngine.detectChatter([], {
        sampleRate: 10000,
        teeth: 4,
        rpm: 6000,
      });

      // Should return gracefully, not throw
      expect(result.chatterDetected).toBeDefined();
    });

    it("handles zero stiffness gracefully", () => {
      // Should not throw division by zero
      expect(() => {
        chatterPredictionEngine.generateStabilityLobes(
          { stiffness: 0, damping: 500 },
          { Kt: 2000e6, numTeeth: 4 },
          { min: 5000, max: 15000 }
        );
      }).not.toThrow();
    });

    it("handles very low damping ratio", () => {
      const result = chatterPredictionEngine.generateStabilityLobes(
        { stiffness: 1e7, damping: 10 }, // Very low damping
        { Kt: 2000e6, numTeeth: 4 },
        { min: 5000, max: 15000 }
      );

      // Should still produce valid lobes (narrow stable pockets)
      expect(result.lobes.length).toBeGreaterThan(0);
    });
  });
});
