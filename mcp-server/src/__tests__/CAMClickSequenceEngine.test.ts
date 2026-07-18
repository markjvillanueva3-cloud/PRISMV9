/**
 * CAMClickSequenceEngine tests — CAM-AI-TRAINING-MS0/U-CAMT-B-CLICK
 *
 * End-to-end Phase-B composition: B03 CamTemplate + per-software catalog
 * → ordered ClickSequence. Catalog is injected (no fs I/O) so tests pass
 * canned vendor-shape catalogs inline.
 *
 * Per [[feedback_engine_tests_in_tests_dir]], lives in src/__tests__/.
 */
import { describe, it, expect } from "vitest";
import {
  CAMClickSequenceEngine,
  type SoftwareCatalog,
} from "../engines/CAMClickSequenceEngine.js";
import { camTemplateGeneratorEngine } from "../engines/CAMTemplateGeneratorEngine.js";
import type { CamTemplate } from "../engines/CAMTemplateGeneratorEngine.js";

// Canned catalog matching the real Fusion 360 2D Adaptive Clearing shape
// from mcp-server/data/cam-functions/fusion360/2d-operations.json. Slimmed
// to the rows we map in PARAM_LABEL_MAP — tests cover the binding path
// without dragging in the 600-row vendor file.
const FUSION360_CATALOG: SoftwareCatalog = {
  schemaVersion: "1.0.0",
  toolpaths: {
    "2D_ADAPTIVE_CLEARING": {
      description: "High-efficiency roughing with constant tool engagement",
      tabs: {
        Tool: {
          parameters: [
            { name: "Tool", type: "selection", required: true },
            { name: "Coolant", type: "dropdown", options: ["Flood", "Mist", "Through Tool"], default: "Flood" },
            { name: "Spindle Speed", type: "numeric", unit: "RPM" },
            { name: "Cutting Feedrate", type: "numeric", unit: "mm/min" },
            { name: "Plunge Feedrate", type: "numeric", unit: "mm/min" },
          ],
        },
        Heights: {
          parameters: [
            { name: "Retract Height Offset", type: "numeric", unit: "mm", default: 5 },
          ],
        },
        Passes: {
          parameters: [
            { name: "Optimal Load", type: "numeric", unit: "mm" },
            { name: "Maximum Roughing Stepdown", type: "numeric", unit: "mm" },
            { name: "Radial Stock to Leave", type: "numeric", unit: "mm" },
          ],
        },
      },
    },
    FACE: {
      description: "Face milling",
      tabs: {
        Tool: {
          parameters: [
            { name: "Tool", type: "selection", required: true },
            { name: "Coolant", type: "dropdown", options: ["Flood"], default: "Flood" },
            { name: "Spindle Speed", type: "numeric", unit: "RPM" },
            { name: "Cutting Feedrate", type: "numeric", unit: "mm/min" },
            { name: "Plunge Feedrate", type: "numeric", unit: "mm/min" },
          ],
        },
        Heights: {
          parameters: [
            { name: "Retract Height Offset", type: "numeric", unit: "mm", default: 5 },
          ],
        },
      },
    },
  },
};

describe("CAMClickSequenceEngine v1", () => {

  it("buildSequence with a Fusion 360 face-mill template emits the documented click order", () => {
    const tpl = camTemplateGeneratorEngine.generate("face", "fusion360", "face", {
      overrides: { tool: "EM-12-4FL-uncoated" },
    }) as CamTemplate;
    const eng = new CAMClickSequenceEngine(() => FUSION360_CATALOG);
    const seq = eng.buildSequence(tpl);

    expect(seq.op).toBe("face");
    expect(seq.system).toBe("fusion360");
    expect(seq.nativeOpName).toBe("Face");
    expect(seq.steps.length).toBeGreaterThan(0);

    // First step opens the Tool tab
    expect(seq.steps[0].kind).toBe("open_tab");
    expect(seq.steps[0].target).toBe("Tool");

    // The Tool tab includes a select_geometry for "Tool"
    const toolStep = seq.steps.find((s) => s.target === "Tool" && s.kind === "select_geometry");
    expect(toolStep?.kind).toBe("select_geometry");
    expect(toolStep?.value).toBe("EM-12-4FL-uncoated");

    // Spindle speed binding has the B03 default (8000) routed to the catalog row
    const rpm = seq.steps.find((s) => s.target === "Spindle Speed");
    expect(rpm?.kind).toBe("set_numeric");
    expect(rpm?.value).toBe(8000);
    expect(rpm?.unit).toBe("RPM");
    expect(rpm?.templateParamId).toBe("spindle_rpm");

    // Coolant binding picks the documented Fusion default "flood" via template
    const coolant = seq.steps.find((s) => s.target === "Coolant");
    expect(coolant?.kind).toBe("set_dropdown");
    expect(coolant?.value).toBe("flood");
    expect(coolant?.templateParamId).toBe("coolant");
  });

  it("fromCatalog with adaptive_clearing_2d binds Optimal Load + Stepdown + Stock", () => {
    const tpl = camTemplateGeneratorEngine.generate("adaptive_clearing_2d", "fusion360", "pocket") as CamTemplate;
    const eng = new CAMClickSequenceEngine();
    const seq = eng.fromCatalog(tpl, FUSION360_CATALOG);

    const stepover = seq.steps.find((s) => s.target === "Optimal Load");
    expect(stepover?.templateParamId).toBe("stepover");
    expect(stepover?.value).toBe(4.0); // template default for pocket feature class

    const stepdown = seq.steps.find((s) => s.target === "Maximum Roughing Stepdown");
    expect(stepdown?.templateParamId).toBe("stepdown");
    expect(stepdown?.value).toBe(2.0);

    const stock = seq.steps.find((s) => s.target === "Radial Stock to Leave");
    expect(stock?.templateParamId).toBe("stock_to_leave");
    expect(stock?.value).toBe(0.3); // pocket feature class override
  });

  it("step numbers are 1-based and strictly monotonic", () => {
    const tpl = camTemplateGeneratorEngine.generate("face", "fusion360", "face") as CamTemplate;
    const eng = new CAMClickSequenceEngine(() => FUSION360_CATALOG);
    const seq = eng.buildSequence(tpl);
    for (let i = 0; i < seq.steps.length; i++) {
      expect(seq.steps[i].step).toBe(i + 1);
    }
  });

  it("stats arithmetic: totalSteps = tabOpens + valuesSet", () => {
    const tpl = camTemplateGeneratorEngine.generate("face", "fusion360", "face") as CamTemplate;
    const eng = new CAMClickSequenceEngine(() => FUSION360_CATALOG);
    const seq = eng.buildSequence(tpl);
    expect(seq.stats.totalSteps).toBe(seq.stats.tabOpens + seq.stats.valuesSet);
    expect(seq.stats.totalSteps).toBe(seq.steps.length);
  });

  it("source provenance points back to the catalog (no fabricated targets)", () => {
    const tpl = camTemplateGeneratorEngine.generate("face", "fusion360", "face") as CamTemplate;
    const eng = new CAMClickSequenceEngine(() => FUSION360_CATALOG);
    const seq = eng.buildSequence(tpl);
    for (const s of seq.steps) {
      expect(s.source.startsWith("catalog.tabs.")).toBe(true);
    }
  });

  it("emits warning + empty sequence when no loader is injected", () => {
    const tpl = camTemplateGeneratorEngine.generate("face", "fusion360", "face") as CamTemplate;
    const eng = new CAMClickSequenceEngine(null);
    const seq = eng.buildSequence(tpl);
    expect(seq.steps).toEqual([]);
    expect(seq.warnings).toContain("no catalog loader injected");
  });

  it("emits warning when the loader returns null for the system", () => {
    const tpl = camTemplateGeneratorEngine.generate("face", "fusion360", "face") as CamTemplate;
    const eng = new CAMClickSequenceEngine(() => null);
    const seq = eng.buildSequence(tpl);
    expect(seq.steps).toEqual([]);
    expect(seq.warnings).toContain("no catalog for system: fusion360");
  });

  it("emits warning when no catalog key is mapped for the (system, op)", () => {
    // wedm_2axis isn't in OP_TO_CATALOG_KEY for any system in v1
    const tpl = {
      id: "wedm_2axis__fusion360__thru_profile",
      schemaVersion: "1.0.0" as const,
      generatedAt: new Date().toISOString(),
      op: "wedm_2axis" as const,
      system: "fusion360" as const,
      nativeName: "(unmapped)",
      featureClass: "thru_profile" as const,
      spec: { id: "wedm_2axis", family: "edm", axisCount: "2", defaultStock: "billet", strategy: "specialty", featureClasses: ["thru_profile"], description: "" } as never,
      parameters: [],
      synthetic: false as const,
      sources: [],
    };
    const eng = new CAMClickSequenceEngine(() => FUSION360_CATALOG);
    const seq = eng.buildSequence(tpl);
    expect(seq.warnings[0]).toMatch(/no catalog key resolvable/);
  });

  it("emits warning when the catalog toolpath has no tabs", () => {
    const tpl = camTemplateGeneratorEngine.generate("face", "fusion360", "face") as CamTemplate;
    const bareCatalog: SoftwareCatalog = {
      toolpaths: { FACE: { description: "stub" } }, // no tabs
    };
    const eng = new CAMClickSequenceEngine(() => bareCatalog);
    const seq = eng.buildSequence(tpl);
    expect(seq.warnings[0]).toMatch(/catalog has no tabs/);
  });

  it("surfaces missing-catalog-bindings for template params without a catalog row", () => {
    // The FUSION360_CATALOG above intentionally omits "Lead-In Radius" / "Lead-Out Radius".
    // Template carries those, so the engine should warn — never fabricate the click.
    const tpl = camTemplateGeneratorEngine.generate("face", "fusion360", "face") as CamTemplate;
    const eng = new CAMClickSequenceEngine(() => FUSION360_CATALOG);
    const seq = eng.buildSequence(tpl);
    expect(seq.warnings.some((w) => /no catalog binding for template param: lead_in_radius/.test(w))).toBe(true);
    expect(seq.warnings.some((w) => /no catalog binding for template param: lead_out_radius/.test(w))).toBe(true);
    expect(seq.stats.missingCatalogBindings).toBeGreaterThanOrEqual(2);
  });

  it("paramLabelFor returns the documented Fusion 360 vendor label", () => {
    const eng = new CAMClickSequenceEngine();
    expect(eng.paramLabelFor("fusion360", "spindle_rpm")).toBe("Spindle Speed");
    expect(eng.paramLabelFor("fusion360", "feed_xy")).toBe("Cutting Feedrate");
    expect(eng.paramLabelFor("fusion360", "stepover")).toBe("Optimal Load");
  });

  it("paramLabelFor returns the documented Mastercam vendor label", () => {
    const eng = new CAMClickSequenceEngine();
    expect(eng.paramLabelFor("mastercam", "feed_xy")).toBe("Feed Rate");
    expect(eng.paramLabelFor("mastercam", "feed_plunge")).toBe("Plunge Rate");
  });

  it("paramLabelFor returns the documented hyperMILL vendor label", () => {
    const eng = new CAMClickSequenceEngine();
    expect(eng.paramLabelFor("hypermill", "feed_xy")).toBe("Feed");
    expect(eng.paramLabelFor("hypermill", "feed_plunge")).toBe("Plunge Feed");
  });

  it("paramLabelFor returns null for unmapped (system, param) pair", () => {
    const eng = new CAMClickSequenceEngine();
    // vericut is verification-only — has zero mappings by design
    expect(eng.paramLabelFor("vericut", "spindle_rpm")).toBeNull();
    expect(eng.paramLabelFor("fusion360", "imaginary_param")).toBeNull();
  });

  it("getCapabilities exposes build_sequence/from_catalog/param_label_for", () => {
    const eng = new CAMClickSequenceEngine();
    const caps = eng.getCapabilities();
    const names = caps.map((c) => c.name);
    expect(names).toEqual(expect.arrayContaining(["build_sequence", "from_catalog", "param_label_for"]));
  });

  it("validate rejects non-object input", () => {
    const eng = new CAMClickSequenceEngine();
    expect(eng.validate(null)).toMatch(/object/);
    expect(eng.validate("string")).toMatch(/object/);
    expect(eng.validate({})).toBeNull();
  });

  it("click action kinds are documented (dropdown → set_dropdown, numeric → set_numeric, ...)", () => {
    const tpl = camTemplateGeneratorEngine.generate("face", "fusion360", "face", {
      overrides: { tool: "EM-12-4FL-uncoated" },
    }) as CamTemplate;
    const eng = new CAMClickSequenceEngine(() => FUSION360_CATALOG);
    const seq = eng.buildSequence(tpl);
    const kinds = new Set(seq.steps.map((s) => s.kind));
    expect(kinds.has("open_tab")).toBe(true);
    expect(kinds.has("set_numeric")).toBe(true);
    expect(kinds.has("set_dropdown")).toBe(true);
    expect(kinds.has("select_geometry")).toBe(true);
  });
});
