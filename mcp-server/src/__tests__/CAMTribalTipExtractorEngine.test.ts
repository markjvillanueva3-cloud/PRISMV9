/**
 * CAMTribalTipExtractorEngine tests — CAM-AI-TRAINING-MS0/U-CAMT-TRIBAL
 * Per [[feedback_engine_tests_in_tests_dir]], lives in src/__tests__/.
 */
import { describe, it, expect } from "vitest";
import { CAMTribalTipExtractorEngine } from "../engines/CAMTribalTipExtractorEngine.js";
import type { SoftwareCatalog } from "../engines/CAMClickSequenceEngine.js";

const engine = new CAMTribalTipExtractorEngine();

const CANNED_CATALOG: SoftwareCatalog = {
  toolpaths: {
    "2D_ADAPTIVE_CLEARING": {
      description: "Adaptive",
      tabs: {
        Passes: {
          parameters: [
            { name: "Optimal Load", type: "numeric", unit: "mm",
              description: "Maximum radial engagement as percentage of tool diameter" } as never,
            { name: "Maximum Roughing Stepdown", type: "numeric", unit: "mm",
              description: "Maximum stepdown between Z-levels" } as never,
            { name: "Short", type: "numeric", description: "too short" } as never, // filtered by minLength
            { name: "Bare", type: "numeric" } as never, // no description
          ],
        },
      },
    },
    "FACE_MILL": {
      tabs: {
        Tool: {
          parameters: [
            { name: "Coolant", type: "dropdown",
              options: ["Flood", "Mist", "Through Tool", "Air"],
              description: "Coolant delivery method during the cut" } as never,
          ],
        },
      },
    },
    "TURN_ROUGH": {
      tabs: {
        Cuts: {
          parameters: [
            { name: "Depth of Cut", type: "numeric", unit: "mm",
              description: "Radial depth per turning pass — keep under 60% of insert length" } as never,
          ],
        },
      },
    },
  },
};

describe("CAMTribalTipExtractorEngine", () => {

  it("extracts 4 tips from the canned catalog (filters too-short + no-desc rows)", () => {
    const tips = engine.extract("fusion360", CANNED_CATALOG);
    // 6 params total, 1 too short (description='too short' = 9 chars), 1 has
    // no description at all → 4 qualify.
    expect(tips.length).toBe(4);
  });

  it("tip carries opKey + tab + paramName + description", () => {
    const tips = engine.extract("fusion360", CANNED_CATALOG);
    const t = tips.find((x) => x.paramName === "Optimal Load");
    expect(t?.opKey).toBe("2D_ADAPTIVE_CLEARING");
    expect(t?.tab).toBe("Passes");
    expect(t?.tip).toMatch(/Maximum radial engagement/);
    expect(t?.unit).toBe("mm");
  });

  it("tip id stable for (system, opKey, tab, paramName)", () => {
    const tips = engine.extract("fusion360", CANNED_CATALOG);
    const t = tips.find((x) => x.paramName === "Optimal Load");
    expect(t?.id).toBe("fusion360:2D_ADAPTIVE_CLEARING:Passes:Optimal Load");
  });

  it("domain tag = 'mill' for ADAPTIVE / FACE / POCKET / MILL ops", () => {
    const tips = engine.extract("fusion360", CANNED_CATALOG);
    expect(tips.find((x) => x.opKey === "2D_ADAPTIVE_CLEARING")?.domain).toBe("mill");
    expect(tips.find((x) => x.opKey === "FACE_MILL")?.domain).toBe("mill");
  });

  it("domain tag = 'lathe' for TURN_* ops", () => {
    const tips = engine.extract("fusion360", CANNED_CATALOG);
    expect(tips.find((x) => x.opKey === "TURN_ROUGH")?.domain).toBe("lathe");
  });

  it("optionsCount populated for dropdown-type params", () => {
    const tips = engine.extract("fusion360", CANNED_CATALOG);
    const coolant = tips.find((x) => x.paramName === "Coolant");
    expect(coolant?.optionsCount).toBe(4);
  });

  it("minLength filter: 'too short' descriptions skipped at default ≥10 chars", () => {
    const tips = engine.extract("fusion360", CANNED_CATALOG);
    expect(tips.some((t) => t.paramName === "Short")).toBe(false);
  });

  it("custom minLength=200 filters all (no tip qualifies)", () => {
    const tips = engine.extract("fusion360", CANNED_CATALOG, { minLength: 200 });
    expect(tips.length).toBe(0);
  });

  it("source field traces back to data/cam-functions/<system> path", () => {
    const tips = engine.extract("fusion360", CANNED_CATALOG);
    expect(tips[0].source).toMatch(/^data\/cam-functions\/fusion360\//);
  });

  it("empty catalog returns empty tips", () => {
    expect(engine.extract("fusion360", { toolpaths: {} })).toEqual([]);
    expect(engine.extract("fusion360", {})).toEqual([]);
  });

  it("validate rejects non-object input", () => {
    expect(engine.validate(null)).toMatch(/object/);
    expect(engine.validate({})).toBeNull();
  });

  it("getCapabilities exposes extract + extract_with_min", () => {
    const caps = engine.getCapabilities();
    const names = caps.map((c) => c.name);
    expect(names).toContain("extract");
    expect(names).toContain("extract_with_min");
  });
});
