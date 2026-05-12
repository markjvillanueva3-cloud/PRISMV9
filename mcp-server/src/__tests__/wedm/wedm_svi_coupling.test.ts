/**
 * WEDM SVI Coupling Tests - Phase 0.17
 */

import { describe, it, expect } from "vitest";
import * as fs from "fs";
import * as path from "path";

const STATE_DIR = path.resolve(process.cwd(), "data/state");

describe("WEDM SVI Coupling", () => {
  const surfacesPath = path.join(STATE_DIR, "WEDM_SVI_SURFACES.json");

  it("WEDM_SVI_SURFACES.json exists", () => {
    expect(fs.existsSync(surfacesPath)).toBe(true);
  });

  if (fs.existsSync(surfacesPath)) {
    const data = JSON.parse(fs.readFileSync(surfacesPath, "utf-8"));

    it("has surfaces object", () => {
      expect(data.surfaces).toBeDefined();
    });

    it("has at least 10 tracked surfaces", () => {
      expect(Object.keys(data.surfaces).length).toBeGreaterThanOrEqual(10);
    });

    it("has psi object with current and target", () => {
      expect(data.psi).toBeDefined();
      expect(data.psi.target).toBe(1);
    });

    it("has milestone gate", () => {
      expect(data.milestoneGate).toBeDefined();
      expect(data.milestoneGate.minPsiDelta).toBeGreaterThan(0);
    });

    const expectedSurfaces = [
      "wedm-engines",
      "wedm-actions",
      "wedm-skills",
      "wedm-hooks",
      "wedm-playbooks",
      "wedm-state-files",
      "wedm-mit-integration",
    ];

    for (const surfaceName of expectedSurfaces) {
      it("has " + surfaceName + " surface", () => {
        expect(data.surfaces[surfaceName]).toBeDefined();
        expect(data.surfaces[surfaceName].psi_weight).toBeGreaterThan(0);
      });
    }

    it("psi weights sum to approximately 1.0", () => {
      const total = Object.values(data.surfaces).reduce(
        (sum: number, s: any) => sum + (s.psi_weight ?? 0),
        0
      );
      expect(total).toBeGreaterThan(0.9);
      expect(total).toBeLessThanOrEqual(1.1);
    });
  }
});
