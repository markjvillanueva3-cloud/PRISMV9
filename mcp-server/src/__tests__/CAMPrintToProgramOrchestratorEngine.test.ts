/**
 * CAMPrintToProgramOrchestratorEngine tests — CAM-AI-TRAINING-MS0/U-CAMT-P2P
 */
import { describe, it, expect } from "vitest";
import { CAMPrintToProgramOrchestratorEngine } from "../engines/CAMPrintToProgramOrchestratorEngine.js";
import type { SoftwareCatalog } from "../engines/CAMClickSequenceEngine.js";

const FUSION_CATALOG: SoftwareCatalog = {
  toolpaths: {
    "FACE": { description: "Face", tabs: { Tool: { parameters: [
      { name: "Tool", type: "selection", required: true },
      { name: "Spindle Speed", type: "numeric", unit: "RPM" },
      { name: "Cutting Feedrate", type: "numeric", unit: "mm/min" },
      { name: "Coolant", type: "dropdown", options: ["Flood"], default: "Flood" },
    ] } } },
    "DRILL": { description: "Drill", tabs: { Tool: { parameters: [
      { name: "Tool", type: "selection", required: true },
      { name: "Spindle Speed", type: "numeric", unit: "RPM" },
      { name: "Plunge Feedrate", type: "numeric", unit: "mm/min" },
      { name: "Coolant", type: "dropdown", options: ["Flood"], default: "Flood" },
    ] } } },
  },
};

describe("CAMPrintToProgramOrchestratorEngine", () => {

  it("orchestrates 'face mill top surface' → ok=true with face op + click sequence", () => {
    const engine = new CAMPrintToProgramOrchestratorEngine(() => FUSION_CATALOG);
    const r = engine.orchestrate("face mill top surface to nominal Z", {
      system: "fusion360",
      overrides: { tool: "EM-12-4FL" },
    });
    expect(r.ok).toBe(true);
    expect(r.classification.feature).toBe("face");
    expect(r.selection?.best).toBe("face");
    expect(r.template?.op).toBe("face");
    expect(r.clickSequence?.system).toBe("fusion360");
    expect(r.clickSequence?.steps.length).toBeGreaterThan(0);
  });

  it("orchestrates 'thru hole 0.500' → ok=true with drill op", () => {
    const engine = new CAMPrintToProgramOrchestratorEngine(() => FUSION_CATALOG);
    const r = engine.orchestrate("drill thru hole 0.500 dia", {
      system: "fusion360",
      overrides: { tool: "DRL-0.500", depth: 25.0 },
    });
    expect(r.ok).toBe(true);
    expect(r.classification.feature).toBe("thru_hole");
    expect(r.selection?.best).toBe("drill");
  });

  it("returns ok=false + classification_failed when no feature matches", () => {
    const engine = new CAMPrintToProgramOrchestratorEngine(() => FUSION_CATALOG);
    const r = engine.orchestrate("xyzzy abc 123", { system: "fusion360" });
    expect(r.ok).toBe(false);
    expect(r.reason).toMatch(/classification_failed/);
    expect(r.classification.feature).toBeNull();
    expect(r.selection).toBeNull();
    expect(r.template).toBeNull();
  });

  it("returns ok=false + template_failed when system doesn't support the selected op", () => {
    const engine = new CAMPrintToProgramOrchestratorEngine(() => null);
    // 'face' is supported on most systems but vericut is verification-only → no support
    const r = engine.orchestrate("face mill top surface", { system: "vericut" });
    expect(r.ok).toBe(false);
    expect(r.reason).toMatch(/template_failed|click_failed/);
  });

  it("returns ok=false + click_failed when no catalog loader is available", () => {
    const engine = new CAMPrintToProgramOrchestratorEngine(null);
    const r = engine.orchestrate("face mill", { system: "fusion360" });
    expect(r.ok).toBe(false);
    expect(r.reason).toMatch(/click_failed/);
    // Earlier stages still ran
    expect(r.classification.feature).toBe("face");
    expect(r.selection?.best).toBe("face");
    expect(r.template).not.toBeNull();
  });

  it("explicit overrides forward to template and into the click sequence", () => {
    const engine = new CAMPrintToProgramOrchestratorEngine(() => FUSION_CATALOG);
    const r = engine.orchestrate("face mill top surface", {
      system: "fusion360",
      overrides: { tool: "EM-25-6FL-coated", spindle_rpm: 12000 },
    });
    expect(r.ok).toBe(true);
    const rpm = r.clickSequence?.steps.find((s) => s.target === "Spindle Speed");
    expect(rpm?.value).toBe(12000);
    // .find returns the first match — both open_tab + select_geometry use
    // target='Tool', so filter to the selection step explicitly.
    const tool = r.clickSequence?.steps.find((s) => s.target === "Tool" && s.kind === "select_geometry");
    expect(tool?.value).toBe("EM-25-6FL-coated");
  });

  it("intermediate stages persist on failure for audit trail", () => {
    const engine = new CAMPrintToProgramOrchestratorEngine(() => FUSION_CATALOG);
    const r = engine.orchestrate("face mill", { system: "vericut" });
    expect(r.ok).toBe(false);
    // Even though final stages failed, classification + selection ran
    expect(r.classification.feature).toBe("face");
    expect(r.selection?.best).toBe("face");
  });

  it("validate rejects non-object input", () => {
    const engine = new CAMPrintToProgramOrchestratorEngine();
    expect(engine.validate(null)).toMatch(/object/);
    expect(engine.validate({})).toBeNull();
  });

  it("getCapabilities exposes orchestrate + explain", () => {
    const engine = new CAMPrintToProgramOrchestratorEngine();
    const names = engine.getCapabilities().map((c) => c.name);
    expect(names).toContain("orchestrate");
    expect(names).toContain("explain");
  });
});
