import { describe, it, expect } from "vitest";
import { SystemSnapshotEngine } from "../engines/SystemSnapshotEngine.js";

describe("SystemSnapshotEngine", () => {
  const engine = new SystemSnapshotEngine();

  describe("getCompactSnapshot", () => {
    it("returns a compact string under 200 chars", () => {
      const snap = engine.getCompactSnapshot();
      expect(snap).toBeTruthy();
      expect(snap.length).toBeLessThan(200);
      expect(snap).toContain("E");
      expect(snap).toContain("D");
    });
  });

  describe("getLayeredSnapshot", () => {
    it("returns minimal snapshot (short)", () => {
      const snap = engine.getLayeredSnapshot("minimal");
      expect(snap).toBeTruthy();
      expect(snap.length).toBeLessThan(500);
    });

    it("returns standard snapshot (medium)", () => {
      const snap = engine.getLayeredSnapshot("standard");
      expect(snap).toBeTruthy();
      expect(snap.length).toBeGreaterThan(50);
    });

    it("returns full snapshot (detailed)", () => {
      const snap = engine.getLayeredSnapshot("full");
      expect(snap).toBeTruthy();
      expect(snap.length).toBeGreaterThan(100);
    });
  });

  describe("getChangeSummary", () => {
    it("returns changes since HEAD~5", () => {
      const summary = engine.getChangeSummary("HEAD~5");
      expect(summary).toBeTruthy();
    });

    it("returns recent changes without args", () => {
      const summary = engine.getChangeSummary();
      expect(summary).toBeTruthy();
    });
  });

  describe("getDriftReport", () => {
    it("returns drift report comparing live vs documented", () => {
      const drift = engine.getDriftReport();
      expect(drift).toBeTruthy();
    });
  });
});
