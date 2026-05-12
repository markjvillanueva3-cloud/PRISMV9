/**
 * PPG-REAL S6b U-PPR26: Chatter stability SLD wiring tests.
 * Validates: clampToStableRange in CPS, graceful skip when no SLD data,
 * RPM shift with comment explanation, 20% shift limit, pipeline Stage 1.3.
 */
import { describe, it, expect } from "vitest";
import * as fs from "fs";
import * as path from "path";

const CPS_PATH = path.resolve(__dirname, "../../scripts/fusion360-post/PRISM-Master.cps");
const cpsContent = fs.readFileSync(CPS_PATH, "utf-8");

describe("U-PPR26: clampToStableRange function in CPS", () => {
  it("CPS defines clampToStableRange function", () => {
    expect(cpsContent).toContain("function clampToStableRange(rpm)");
  });

  it("reads stable_rpm_min and stable_rpm_max from currentPrismData", () => {
    const fn = cpsContent.substring(
      cpsContent.indexOf("function clampToStableRange"),
      cpsContent.indexOf("function applyWearDerating")
    );
    expect(fn).toContain("currentPrismData");
    expect(fn).toContain("stable_rpm_min");
    expect(fn).toContain("stable_rpm_max");
  });

  it("returns RPM unchanged when no SLD data (graceful skip)", () => {
    const fn = cpsContent.substring(
      cpsContent.indexOf("function clampToStableRange"),
      cpsContent.indexOf("function applyWearDerating")
    );
    // No currentPrismData → return rpm unchanged
    expect(fn).toContain("if (!currentPrismData) { return rpm; }");
    // No sMin/sMax → return rpm unchanged
    expect(fn).toContain("if (!sMin || !sMax");
  });

  it("returns RPM unchanged when already in stable zone", () => {
    const fn = cpsContent.substring(
      cpsContent.indexOf("function clampToStableRange"),
      cpsContent.indexOf("function applyWearDerating")
    );
    expect(fn).toContain("rpm >= sMin && rpm <= sMax");
    expect(fn).toContain("return rpm");
  });

  it("shifts RPM to nearest stable boundary when outside range", () => {
    const fn = cpsContent.substring(
      cpsContent.indexOf("function clampToStableRange"),
      cpsContent.indexOf("function applyWearDerating")
    );
    // Shift to sMin if below
    expect(fn).toContain("if (rpm < sMin)");
    expect(fn).toContain("rpm = sMin");
    // Shift to sMax if above
    expect(fn).toContain("rpm = sMax");
  });

  it("limits auto-shift to 20% — does not shift large deltas", () => {
    const fn = cpsContent.substring(
      cpsContent.indexOf("function clampToStableRange"),
      cpsContent.indexOf("function applyWearDerating")
    );
    expect(fn).toContain("shiftPct > 20");
    expect(fn).toContain("verify manually");
    expect(fn).toContain("return original");
  });

  it("writes explanatory comment when shifting RPM", () => {
    const fn = cpsContent.substring(
      cpsContent.indexOf("function clampToStableRange"),
      cpsContent.indexOf("function applyWearDerating")
    );
    expect(fn).toContain("PRISM: RPM shifted S");
    expect(fn).toContain("for chatter stability");
    expect(fn).toContain("stable zone");
  });
});

describe("U-PPR26: clampToStableRange wired to RPM chain in CPS", () => {
  it("Heidenhain RPM chain includes clampToStableRange", () => {
    const heiSection = cpsContent.substring(
      cpsContent.indexOf("var heiRpm = applyProveOutSpeed"),
      cpsContent.indexOf("var heiRpm = applyProveOutSpeed") + 200
    );
    expect(heiSection).toContain("clampToStableRange(heiRpm)");
  });

  it("Siemens RPM chain includes clampToStableRange", () => {
    const sieSection = cpsContent.substring(
      cpsContent.indexOf("var sieRpm = applyProveOutSpeed"),
      cpsContent.indexOf("var sieRpm = applyProveOutSpeed") + 200
    );
    expect(sieSection).toContain("clampToStableRange(sieRpm)");
  });

  it("Fanuc RPM chain includes clampToStableRange", () => {
    const fanSection = cpsContent.substring(
      cpsContent.indexOf("var fanRpm = applyProveOutSpeed"),
      cpsContent.indexOf("var fanRpm = applyProveOutSpeed") + 200
    );
    expect(fanSection).toContain("clampToStableRange(fanRpm)");
  });

  it("Fanuc-compatible RPM chain includes clampToStableRange", () => {
    const fcSection = cpsContent.substring(
      cpsContent.indexOf("var fcRpm = applyProveOutSpeed"),
      cpsContent.indexOf("var fcRpm = applyProveOutSpeed") + 200
    );
    expect(fcSection).toContain("clampToStableRange(fcRpm)");
  });

  it("onSpindleSpeed function includes clampToStableRange", () => {
    const fn = cpsContent.substring(
      cpsContent.indexOf("function onSpindleSpeed"),
      cpsContent.indexOf("function onSpindleSpeed") + 200
    );
    expect(fn).toContain("clampToStableRange(s)");
  });
});

describe("U-PPR26: currentPrismData module-level variable", () => {
  it("CPS declares currentPrismData as module-level variable", () => {
    expect(cpsContent).toContain("var currentPrismData = null;");
  });

  it("onSection sets currentPrismData from parsePrismComment()", () => {
    const onSection = cpsContent.substring(
      cpsContent.indexOf("function onSection()"),
      cpsContent.indexOf("function onSection()") + 2000
    );
    expect(onSection).toContain("currentPrismData = prismData");
  });
});

describe("U-PPR26: Pipeline Stage 1.3 stability lobes", () => {
  it("PostProcessorPipelineEngine has Stage 1.3 stability_lobes", async () => {
    const ppePath = path.resolve(__dirname, "../engines/PostProcessorPipelineEngine.ts");
    const ppe = fs.readFileSync(ppePath, "utf-8");
    expect(ppe).toContain("1.3_stability_lobes");
    expect(ppe).toContain("chatter_risk");
    expect(ppe).toContain("recommended_rpm");
    expect(ppe).toContain("stable_rpm_pockets");
  });

  it("Pipeline Stage 1.3 shifts RPM with reason comment", async () => {
    const ppePath = path.resolve(__dirname, "../engines/PostProcessorPipelineEngine.ts");
    const ppe = fs.readFileSync(ppePath, "utf-8");
    expect(ppe).toContain("Stability: RPM shifted to");
    expect(ppe).toContain("chatter risk");
  });

  it("Pipeline Stage 1.3 can be skipped/disabled", async () => {
    const ppePath = path.resolve(__dirname, "../engines/PostProcessorPipelineEngine.ts");
    const ppe = fs.readFileSync(ppePath, "utf-8");
    expect(ppe).toContain("stability_lobes");
    // The stage is conditional on stageFlags
    expect(ppe).toContain("stageFlags.stability_lobes");
  });
});
