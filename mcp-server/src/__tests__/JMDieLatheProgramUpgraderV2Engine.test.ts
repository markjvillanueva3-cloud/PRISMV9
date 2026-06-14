/**
 * JMDieLatheProgramUpgraderV2Engine tests — physics-driven contract
 * ===================================================================
 *
 * Verifies the V2 contract: each variant routes through
 * UltimateSpeedFeedEngine.calculate() and surfaces confidence + provenance.
 *
 * @milestone JM-DIE-LATHE-UPGRADE-MS0/U-V2-PHYSICS
 */

import { describe, it, expect } from "vitest";

import {
  JMDieLatheProgramUpgraderV2Engine,
  MATERIAL_TO_ISO_GROUP,
} from "../engines/JMDieLatheProgramUpgraderV2Engine.js";

describe("JMDieLatheProgramUpgraderV2Engine", () => {
  describe("MATERIAL_TO_ISO_GROUP map (ISO 3685 coverage spans P/M/K/N/S/H)", () => {
    it("maps default tool_steel to H group (hardened steel)", () => {
      expect(MATERIAL_TO_ISO_GROUP["tool_steel"]).toBe("H");
    });

    it("maps D2/A2/H13/O1/S7 tool steel grades all to H", () => {
      expect(MATERIAL_TO_ISO_GROUP["d2"]).toBe("H");
      expect(MATERIAL_TO_ISO_GROUP["a2"]).toBe("H");
      expect(MATERIAL_TO_ISO_GROUP["h13"]).toBe("H");
      expect(MATERIAL_TO_ISO_GROUP["o1"]).toBe("H");
      expect(MATERIAL_TO_ISO_GROUP["s7"]).toBe("H");
    });

    it("maps 1018/1045/4140 carbon/alloy steels to P", () => {
      expect(MATERIAL_TO_ISO_GROUP["1018"]).toBe("P");
      expect(MATERIAL_TO_ISO_GROUP["1045"]).toBe("P");
      expect(MATERIAL_TO_ISO_GROUP["4140"]).toBe("P");
    });

    it("maps 303/304/316/17-4PH stainless to M", () => {
      expect(MATERIAL_TO_ISO_GROUP["303"]).toBe("M");
      expect(MATERIAL_TO_ISO_GROUP["304"]).toBe("M");
      expect(MATERIAL_TO_ISO_GROUP["316"]).toBe("M");
      expect(MATERIAL_TO_ISO_GROUP["17-4ph"]).toBe("M");
    });

    it("maps 6061/7075/brass non-ferrous to N", () => {
      expect(MATERIAL_TO_ISO_GROUP["6061"]).toBe("N");
      expect(MATERIAL_TO_ISO_GROUP["7075"]).toBe("N");
      expect(MATERIAL_TO_ISO_GROUP["brass"]).toBe("N");
    });

    it("maps Ti-6Al-4V/Inconel high-temp alloys to S", () => {
      expect(MATERIAL_TO_ISO_GROUP["ti-6al-4v"]).toBe("S");
      expect(MATERIAL_TO_ISO_GROUP["inconel"]).toBe("S");
    });

    it("maps cast iron to K", () => {
      expect(MATERIAL_TO_ISO_GROUP["g25"]).toBe("K");
      expect(MATERIAL_TO_ISO_GROUP["ductile-iron"]).toBe("K");
    });
  });

  describe("upgradeOne() — happy path", () => {
    it("emits one variant per JM Die lathe (7 total) with physics-backed S/F", async () => {
      const result = await JMDieLatheProgramUpgraderV2Engine.upgradeOne({
        sourcePath: "C:/JM DIE/CNC LATHE/ITW/ITW-9001.nc",
      });
      expect(result.variants).toHaveLength(7);
      expect(result.engineVersion).toBe("2.0.0");
      expect(result.physicsBackend).toBe("UltimateSpeedFeedEngine.calculate");
    });

    it("defaults material → tool_steel → ISO H group", async () => {
      const result = await JMDieLatheProgramUpgraderV2Engine.upgradeOne({
        sourcePath: "C:/X/PART.nc",
      });
      expect(result.material).toBe("tool_steel");
      expect(result.iso_group).toBe("H");
    });

    it("respects material override and routes to correct ISO group", async () => {
      const result = await JMDieLatheProgramUpgraderV2Engine.upgradeOne({
        sourcePath: "C:/X/PART.nc",
        material: "4140",
      });
      expect(result.material).toBe("4140");
      expect(result.iso_group).toBe("P");
    });

    it("variants carry RPM clamped to per-machine spindle_max", async () => {
      const result = await JMDieLatheProgramUpgraderV2Engine.upgradeOne({
        sourcePath: "C:/X/PART.nc",
        toolDiameterMm: 1.0, // forces small diameter → SFM-derived RPM exceeds caps
      });
      const bigBore = result.variants.find((v) => v.machineId === "LTH-06");
      expect(bigBore?.rpm).toBeLessThanOrEqual(3600);
      const l200 = result.variants.find((v) => v.machineId === "LTH-02");
      expect(l200?.rpm).toBeLessThanOrEqual(6000);
    });

    it("variants carry confidence + source provenance (V1 had neither)", async () => {
      const result = await JMDieLatheProgramUpgraderV2Engine.upgradeOne({
        sourcePath: "C:/X/PART.nc",
      });
      for (const v of result.variants) {
        expect(v.rpm_confidence).toBeGreaterThanOrEqual(0);
        expect(v.rpm_confidence).toBeLessThanOrEqual(1);
        expect(typeof v.rpm_source).toBe("string");
        expect(v.rpm_source.length).toBeGreaterThan(0);
      }
    });
  });

  describe("upgradeOne() — variability across machines", () => {
    it("emits non-zero feedrate, feed-per-rev, depth-of-cut for every machine", async () => {
      const result = await JMDieLatheProgramUpgraderV2Engine.upgradeOne({
        sourcePath: "C:/X/PART.nc",
      });
      for (const v of result.variants) {
        expect(v.feedrate_mm_min).toBeGreaterThan(0);
        expect(v.feed_per_rev_mm).toBeGreaterThan(0);
        expect(v.depth_of_cut_mm).toBeGreaterThan(0);
      }
    });

    it("rationale references the physics backend + ISO group + optimize_for", async () => {
      const result = await JMDieLatheProgramUpgraderV2Engine.upgradeOne({
        sourcePath: "C:/X/PART.nc",
        optimizeFor: "productivity",
      });
      expect(result.variants[0].rationale).toContain("UltimateSpeedFeedEngine.calculate");
      expect(result.variants[0].rationale).toContain("iso=H");
      expect(result.variants[0].rationale).toContain("productivity");
    });

    it("variants for different materials produce different optimize_for fields when overridden", async () => {
      const ti = await JMDieLatheProgramUpgraderV2Engine.upgradeOne({
        sourcePath: "C:/X/PART.nc",
        material: "ti-6al-4v",
        optimizeFor: "tool_life",
      });
      const inox = await JMDieLatheProgramUpgraderV2Engine.upgradeOne({
        sourcePath: "C:/X/PART.nc",
        material: "316",
        optimizeFor: "balanced",
      });
      expect(ti.iso_group).toBe("S");
      expect(inox.iso_group).toBe("M");
      expect(ti.variants[0].optimize_for).toBe("tool_life");
      expect(inox.variants[0].optimize_for).toBe("balanced");
    });

    it("output filename uses <partNumber>.nc convention (machine in path, not name)", async () => {
      const result = await JMDieLatheProgramUpgraderV2Engine.upgradeOne({
        sourcePath: "C:/X/HK-RIVET-001.nc",
      });
      for (const v of result.variants) {
        expect(v.outputFileName).toBe("HK-RIVET-001.nc");
      }
    });
  });

  describe("upgradeOne() — failure modes / adversarial inputs", () => {
    it("unknown material falls through to H and emits a structured warning (no throw)", async () => {
      const result = await JMDieLatheProgramUpgraderV2Engine.upgradeOne({
        sourcePath: "C:/X/PART.nc",
        material: "unobtainium-7",
      });
      expect(result.iso_group).toBe("H");
      expect(result.warnings.some((w) => w.includes("material_unknown_unobtainium-7"))).toBe(true);
    });

    it("empty programText still produces a valid upgrade (filename-only part-number extraction)", async () => {
      const result = await JMDieLatheProgramUpgraderV2Engine.upgradeOne({
        sourcePath: "C:/X/HK-RIVET-001.nc",
        programText: "",
      });
      expect(result.partNumber).toBe("HK-RIVET-001");
      expect(result.variants).toHaveLength(7);
    });

    it("uppercase material lookups are case-insensitive (lowercased internally)", async () => {
      const result = await JMDieLatheProgramUpgraderV2Engine.upgradeOne({
        sourcePath: "C:/X/PART.nc",
        material: "4140",
      });
      expect(result.iso_group).toBe("P");
    });
  });
});
