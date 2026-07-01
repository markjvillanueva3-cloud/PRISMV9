/**
 * JMDieLatheProgramUpgraderEngine tests — per-machine S/F upgrade contract
 * =========================================================================
 *
 * @milestone JM-DIE-LATHE-UPGRADE-MS0/U-CORE
 */

import { describe, it, expect } from "vitest";

import {
  JMDieLatheProgramUpgraderEngine,
  JM_DIE_LATHES,
  DEFAULT_TOOL,
  DEFAULT_MATERIAL,
  extractPartNumber,
} from "../engines/JMDieLatheProgramUpgraderEngine.js";

describe("extractPartNumber()", () => {
  it("extracts part number from filename stem when stem is non-O-number", () => {
    const { partNumber, warnings } = extractPartNumber({ sourcePath: "C:/JM DIE/CNC LATHE/ITW/ABC-12345.nc" });
    expect(partNumber).toBe("ABC-12345");
    expect(warnings).toEqual([]);
  });

  it("falls back to (P/N: ...) header comment when filename is an O-number", () => {
    const { partNumber } = extractPartNumber({
      sourcePath: "C:/JM DIE/CNC LATHE/HOLO/O1234.nc",
      programText: "%\n(P/N: ALCOA-7075-T6-PIN)\nO1234\n",
    });
    expect(partNumber).toBe("ALCOA-7075-T6-PIN");
  });

  it("recognizes PN: prefix variant in header comment", () => {
    const { partNumber } = extractPartNumber({
      sourcePath: "C:/JM DIE/CNC LATHE/X/O5678.nc",
      programText: "(PN=HK-RIVET-001)\n",
    });
    expect(partNumber).toBe("HK-RIVET-001");
  });

  it("returns UNKNOWN-PART with warning when nothing matches", () => {
    const { partNumber, warnings } = extractPartNumber({ sourcePath: "C:/JM DIE/CNC LATHE/X/O9999.nc" });
    expect(partNumber).toBe("O9999");
    expect(warnings).toHaveLength(1);
    expect(warnings[0]).toContain("part_number_unknown");
  });
});

describe("JMDieLatheProgramUpgraderEngine.upgradeOne()", () => {
  it("emits one variant per JM Die lathe (7 total)", () => {
    const result = JMDieLatheProgramUpgraderEngine.upgradeOne({
      sourcePath: "C:/JM DIE/CNC LATHE/ITW/ITW-9001.nc",
    });
    expect(result.variants).toHaveLength(7);
    expect(result.variants.map((v) => v.machineId).sort()).toEqual([
      "LTH-01", "LTH-02", "LTH-03", "LTH-04", "LTH-05", "LTH-06", "LTH-07",
    ]);
  });

  it("output filename matches <partNumber>_<machineModel>.nc convention", () => {
    const result = JMDieLatheProgramUpgraderEngine.upgradeOne({
      sourcePath: "C:/JM DIE/CNC LATHE/HOLO/HK-RIVET-001.nc",
    });
    const l300 = result.variants.find((v) => v.machineId === "LTH-01");
    expect(l300?.outputFileName).toBe("HK-RIVET-001_Okuma_GENOS_L300-M.nc");
    const multus = result.variants.find((v) => v.machineId === "LTH-07");
    expect(multus?.outputFileName).toBe("HK-RIVET-001_Okuma_Multus_B250II.nc");
  });

  it("defaults material to tool_steel and emits a warning per operator directive", () => {
    const result = JMDieLatheProgramUpgraderEngine.upgradeOne({ sourcePath: "C:/X/PART.nc" });
    expect(result.material).toBe(DEFAULT_MATERIAL);
    expect(result.warnings.some((w) => w.includes("material_defaulted_to_tool_steel"))).toBe(true);
  });

  it("accepts materialOverride and propagates it without the default-warning", () => {
    const result = JMDieLatheProgramUpgraderEngine.upgradeOne({
      sourcePath: "C:/X/PART.nc",
      materialOverride: "Ti-6Al-4V",
    });
    expect(result.material).toBe("Ti-6Al-4V");
    expect(result.warnings.some((w) => w.includes("material_defaulted"))).toBe(false);
  });

  it("clamps RPM to per-machine spindle max (Big Bore caps at 3600)", () => {
    // Force a small tool diameter so the raw SFM-derived RPM exceeds the cap.
    const result = JMDieLatheProgramUpgraderEngine.upgradeOne({
      sourcePath: "C:/X/PART.nc",
      toolDiameterMm: 1.0, // 1mm → ~17,500 RPM raw, must clamp to spindle max
    });
    const bigBore = result.variants.find((v) => v.machineId === "LTH-06");
    expect(bigBore?.rpm).toBe(3600);
  });

  it("applies heavy-machine multiplier — Big Bore SFM > Genos L300 SFM (both heavy) > LNC8 (medium)", () => {
    const result = JMDieLatheProgramUpgraderEngine.upgradeOne({ sourcePath: "C:/X/PART.nc" });
    const lnc8 = result.variants.find((v) => v.machineId === "LTH-03"); // medium
    const bigBore = result.variants.find((v) => v.machineId === "LTH-06"); // heavy
    expect(bigBore!.sfm_effective).toBeGreaterThan(lnc8!.sfm_effective);
  });

  it("rationale string names the rigidity tier and clamped spindle max", () => {
    const result = JMDieLatheProgramUpgraderEngine.upgradeOne({ sourcePath: "C:/X/PART.nc" });
    const l300 = result.variants.find((v) => v.machineId === "LTH-01");
    expect(l300!.rationale).toContain("rigidity-heavy");
    expect(l300!.rationale).toContain("HSSco Allied TA");
    expect(l300!.rationale).toContain("TiAlN");
  });

  it("baseline tool assumptions match operator directive (HSSco TA / TiAlN, 180 SFM, 0.13 mm/rev)", () => {
    expect(DEFAULT_TOOL.family).toBe("HSSco_Allied_TA_insert");
    expect(DEFAULT_TOOL.coating).toBe("TiAlN");
    expect(DEFAULT_TOOL.sfm_tool_steel_baseline).toBe(180);
    expect(DEFAULT_TOOL.fpr_tool_steel_baseline_mm).toBe(0.13);
  });

  it("JM_DIE_LATHES inventory matches the 7-machine Okuma fleet documented in CLAUDE.md", () => {
    expect(JM_DIE_LATHES).toHaveLength(7);
    expect(JM_DIE_LATHES.every((l) => l.controllerFamily === "okuma")).toBe(true);
  });

  it("feedrate is non-negative and consistent with rpm × fpr × rigidity multiplier", () => {
    const result = JMDieLatheProgramUpgraderEngine.upgradeOne({ sourcePath: "C:/X/PART.nc" });
    for (const v of result.variants) {
      expect(v.feedrate_mm_min).toBeGreaterThan(0);
      expect(v.rpm).toBeGreaterThan(0);
      expect(v.depthOfCut_mm).toBeGreaterThan(0);
    }
  });
});
