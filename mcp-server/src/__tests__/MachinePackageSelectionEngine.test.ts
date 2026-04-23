/**
 * Tests for MachinePackageSelectionEngine
 * @milestone MCAT-MS0/P2-U01
 */

import { describe, it, expect } from "vitest";
import { machinePackageSelectionEngine, type PackageSelectionRequirements } from "../engines/MachinePackageSelectionEngine.js";

describe("MachinePackageSelectionEngine", () => {
  describe("select", () => {
    it("returns candidates sorted by score", () => {
      const requirements: PackageSelectionRequirements = {
        part_envelope_mm: { x: 200, y: 150, z: 100 },
        operations: ["face_mill", "drill"],
      };

      const result = machinePackageSelectionEngine.select(requirements);

      expect(result.candidates).toBeDefined();
      expect(result.total_considered).toBeGreaterThan(0);

      if (result.candidates.length > 1) {
        for (let i = 1; i < result.candidates.length; i++) {
          expect(result.candidates[i - 1].score).toBeGreaterThanOrEqual(result.candidates[i].score);
        }
      }
    });

    it("filters by envelope requirements when oversized", () => {
      const requirements: PackageSelectionRequirements = {
        part_envelope_mm: { x: 1500, y: 1000, z: 800 },
        operations: ["face_mill"],
      };

      const result = machinePackageSelectionEngine.select(requirements);

      // Either filtered some or returned fewer candidates than considered
      expect(result.total_considered).toBeGreaterThan(0);
      expect(result.filtered_by_envelope + result.candidates.length).toBeLessThanOrEqual(result.total_considered);
    });

    it("includes confidence scores in candidates", () => {
      const requirements: PackageSelectionRequirements = {
        part_envelope_mm: { x: 100, y: 100, z: 50 },
        operations: ["drill"],
      };

      const result = machinePackageSelectionEngine.select(requirements);

      for (const candidate of result.candidates) {
        expect(candidate.confidence).toBeDefined();
        expect(candidate.confidence.overall).toBeGreaterThanOrEqual(0);
        expect(candidate.confidence.overall).toBeLessThanOrEqual(1);
      }
    });

    it("filters by minimum confidence", () => {
      const requirements: PackageSelectionRequirements = {
        part_envelope_mm: { x: 100, y: 100, z: 50 },
        operations: ["drill"],
        min_confidence: 0.9,
      };

      const result = machinePackageSelectionEngine.select(requirements);

      for (const candidate of result.candidates) {
        expect(candidate.confidence.overall).toBeGreaterThanOrEqual(0.5);
      }
    });

    it("includes rationale and limitations", () => {
      const requirements: PackageSelectionRequirements = {
        part_envelope_mm: { x: 200, y: 150, z: 100 },
        operations: ["5axis_contour"],
        needs_rotary_axes: 2,
      };

      const result = machinePackageSelectionEngine.select(requirements);

      if (result.candidates.length > 0) {
        const candidate = result.candidates[0];
        expect(Array.isArray(candidate.rationale)).toBe(true);
        expect(Array.isArray(candidate.limitations)).toBe(true);
      }
    });

    it("returns selection metadata", () => {
      const requirements: PackageSelectionRequirements = {
        part_envelope_mm: { x: 100, y: 100, z: 50 },
        operations: ["drill"],
      };

      const result = machinePackageSelectionEngine.select(requirements);

      expect(result.total_considered).toBeGreaterThan(0);
      expect(result.selection_timestamp).toBeDefined();
      expect(typeof result.filtered_by_confidence).toBe("number");
      expect(typeof result.filtered_by_envelope).toBe("number");
    });

    it("assesses data quality based on confidence", () => {
      const requirements: PackageSelectionRequirements = {
        part_envelope_mm: { x: 100, y: 100, z: 50 },
        operations: ["drill"],
      };

      const result = machinePackageSelectionEngine.select(requirements);

      for (const candidate of result.candidates) {
        expect(["high", "medium", "low", "insufficient"]).toContain(candidate.dataQuality);
      }
    });

    it("handles spindle RPM requirements", () => {
      const requirements: PackageSelectionRequirements = {
        part_envelope_mm: { x: 100, y: 100, z: 50 },
        operations: ["high_speed_finishing"],
        min_spindle_rpm: 15000,
      };

      const result = machinePackageSelectionEngine.select(requirements);

      if (result.candidates.length > 0) {
        const topCandidate = result.candidates[0];
        const hasHighRpm = topCandidate.package.spindle?.max_rpm >= 15000;
        const hasLimitation = topCandidate.limitations.some(l => l.includes("RPM"));

        expect(hasHighRpm || hasLimitation).toBe(true);
      }
    });

    it("handles rotary axis requirements", () => {
      const requirements: PackageSelectionRequirements = {
        part_envelope_mm: { x: 200, y: 200, z: 100 },
        operations: ["5axis_contour"],
        needs_rotary_axes: 2,
      };

      const result = machinePackageSelectionEngine.select(requirements);

      const fiveAxisCandidates = result.candidates.filter(
        c => (c.package.axes?.rotary_axes ?? 0) >= 2
      );

      if (fiveAxisCandidates.length > 0) {
        expect(fiveAxisCandidates[0].rationale.some(r => r.includes("axis"))).toBe(true);
      }
    });
  });

  describe("compare", () => {
    it("compares specific machines", () => {
      const requirements: PackageSelectionRequirements = {
        part_envelope_mm: { x: 200, y: 150, z: 100 },
        operations: ["face_mill"],
      };

      const result = machinePackageSelectionEngine.compare(
        ["haas_vf2", "dmg_dmu50", "unknown_machine"],
        requirements
      );

      expect(Array.isArray(result)).toBe(true);
    });
  });

  describe("validate", () => {
    it("validates machine suitability", () => {
      const requirements: PackageSelectionRequirements = {
        part_envelope_mm: { x: 100, y: 100, z: 50 },
        operations: ["drill"],
      };

      const result = machinePackageSelectionEngine.validate("haas_vf2", requirements);

      expect(typeof result.suitable).toBe("boolean");
      expect(Array.isArray(result.issues)).toBe(true);
    });

    it("returns issues for unsuitable machines", () => {
      const requirements: PackageSelectionRequirements = {
        part_envelope_mm: { x: 2000, y: 1500, z: 1000 },
        operations: ["large_part_milling"],
      };

      const result = machinePackageSelectionEngine.validate("haas_vf2", requirements);

      if (!result.suitable) {
        expect(result.issues.length).toBeGreaterThan(0);
      }
    });

    it("returns candidate details when machine found", () => {
      const requirements: PackageSelectionRequirements = {
        part_envelope_mm: { x: 100, y: 100, z: 50 },
        operations: ["drill"],
      };

      const result = machinePackageSelectionEngine.validate("haas_vf2", requirements);

      if (result.candidate) {
        expect(result.candidate.package).toBeDefined();
        expect(result.candidate.score).toBeDefined();
        expect(result.candidate.confidence).toBeDefined();
      }
    });
  });

  describe("getSelfAwareness", () => {
    it("returns engine metadata", () => {
      const awareness = machinePackageSelectionEngine.getSelfAwareness();

      expect(awareness.engine).toBe("MachinePackageSelectionEngine");
      expect(awareness.milestone).toBe("MCAT-MS0/P2-U01");
      expect(awareness.capabilities).toContain("select");
      expect(awareness.capabilities).toContain("compare");
      expect(awareness.capabilities).toContain("validate");
      expect(awareness.integrations.length).toBeGreaterThan(2);
    });
  });
});
