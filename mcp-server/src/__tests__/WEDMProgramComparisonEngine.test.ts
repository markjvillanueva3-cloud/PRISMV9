/**
 * U-CAL18: WEDMProgramComparisonEngine tests
 *
 * Validates program comparison between PRISM output and shop NC programs.
 */
import { describe, it, expect } from "vitest";
import { readFileSync } from "fs";
import { join } from "path";

const PROGRAMS_DIR = join(__dirname, "../../data/programs/wire-edm");

describe("U-CAL18: WEDMProgramComparisonEngine", () => {
  it("compares two identical programs with 100% score", async () => {
    const { wedmProgramComparisonEngine } = await import("../engines/WEDMProgramComparisonEngine.js");
    const content = readFileSync(join(PROGRAMS_DIR, "ITW SHAKEPROOF 500-30540-24000-04.NC"), "utf-8");
    const result = wedmProgramComparisonEngine.compare(content, content);
    expect(result.overall_score).toBe(100);
    expect(result.matched_count).toBe(result.parameter_count);
  });

  it("detects dialect match", async () => {
    const { wedmProgramComparisonEngine } = await import("../engines/WEDMProgramComparisonEngine.js");
    const content = readFileSync(join(PROGRAMS_DIR, "ITW SHAKEPROOF 500-30540-24000-04.NC"), "utf-8");
    const result = wedmProgramComparisonEngine.compare(content, content);
    const dialectDev = result.deviations.find((d) => d.param === "dialect");
    expect(dialectDev).toBeDefined();
    expect(dialectDev!.match).toBe(true);
    expect(dialectDev!.reference_value).toBe("mitsubishi");
  });

  it("detects pass count match", async () => {
    const { wedmProgramComparisonEngine } = await import("../engines/WEDMProgramComparisonEngine.js");
    const content = readFileSync(join(PROGRAMS_DIR, "NOZE TEST.NC"), "utf-8");
    const result = wedmProgramComparisonEngine.compare(content, content);
    const passDev = result.deviations.find((d) => d.param === "pass_count");
    expect(passDev).toBeDefined();
    expect(passDev!.match).toBe(true);
  });

  it("compares offsets within tolerance", async () => {
    const { wedmProgramComparisonEngine } = await import("../engines/WEDMProgramComparisonEngine.js");
    const content = readFileSync(join(PROGRAMS_DIR, "ITW SHAKEPROOF 500-30540-24000-04.NC"), "utf-8");
    const result = wedmProgramComparisonEngine.compare(content, content);
    const offsetDevs = result.deviations.filter((d) => d.param.startsWith("offset_H"));
    expect(offsetDevs.length).toBeGreaterThan(0);
    for (const od of offsetDevs) {
      expect(od.match).toBe(true);
    }
  });

  it("compares feed rates per pass", async () => {
    const { wedmProgramComparisonEngine } = await import("../engines/WEDMProgramComparisonEngine.js");
    const content = readFileSync(join(PROGRAMS_DIR, "NOZE TEST.NC"), "utf-8");
    const result = wedmProgramComparisonEngine.compare(content, content);
    const feedDevs = result.deviations.filter((d) => d.param.startsWith("feed_pass_"));
    expect(feedDevs.length).toBeGreaterThan(0);
    for (const fd of feedDevs) {
      expect(fd.match).toBe(true);
    }
  });

  it("detects taper settings", async () => {
    const { wedmProgramComparisonEngine } = await import("../engines/WEDMProgramComparisonEngine.js");
    const content = readFileSync(join(PROGRAMS_DIR, "NOZE TEST.NC"), "utf-8");
    const result = wedmProgramComparisonEngine.compare(content, content);
    const taperDev = result.deviations.find((d) => d.param === "taper_enabled");
    expect(taperDev).toBeDefined();
    expect(taperDev!.match).toBe(true);
    expect(taperDev!.reference_value).toBe(true);
  });

  it("produces meaningful summary", async () => {
    const { wedmProgramComparisonEngine } = await import("../engines/WEDMProgramComparisonEngine.js");
    const content = readFileSync(join(PROGRAMS_DIR, "ITW SHAKEPROOF 500-30540-24000-04.NC"), "utf-8");
    const result = wedmProgramComparisonEngine.compare(content, content);
    expect(result.summary).toContain("match");
  });

  it("detects differences between programs", async () => {
    const { wedmProgramComparisonEngine } = await import("../engines/WEDMProgramComparisonEngine.js");
    const itw = readFileSync(join(PROGRAMS_DIR, "ITW SHAKEPROOF 500-30540-24000-04.NC"), "utf-8");
    const noze = readFileSync(join(PROGRAMS_DIR, "NOZE TEST.NC"), "utf-8");
    const result = wedmProgramComparisonEngine.compare(itw, noze);
    expect(result.overall_score).toBeLessThan(100);
    expect(result.deviations.some((d) => !d.match)).toBe(true);
  });

  it("includes E-code coverage check", async () => {
    const { wedmProgramComparisonEngine } = await import("../engines/WEDMProgramComparisonEngine.js");
    const content = readFileSync(join(PROGRAMS_DIR, "ITW SHAKEPROOF 500-30540-24000-04.NC"), "utf-8");
    const result = wedmProgramComparisonEngine.compare(content, content);
    const ecodeDev = result.deviations.find((d) => d.param === "e_code_coverage");
    expect(ecodeDev).toBeDefined();
    expect(ecodeDev!.match).toBe(true);
  });

  it("checks safety markers (program end, wire stop)", async () => {
    const { wedmProgramComparisonEngine } = await import("../engines/WEDMProgramComparisonEngine.js");
    const content = readFileSync(join(PROGRAMS_DIR, "ITW SHAKEPROOF 500-30540-24000-04.NC"), "utf-8");
    const result = wedmProgramComparisonEngine.compare(content, content);
    const safetyDevs = result.deviations.filter((d) => d.param.startsWith("has_"));
    expect(safetyDevs.length).toBeGreaterThan(0);
  });
});
