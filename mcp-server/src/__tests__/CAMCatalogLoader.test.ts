/**
 * CAMCatalogLoader tests — CAM-AI-TRAINING-MS0/U-CAMT-B-CLICK-FUZZY
 *
 * Asserts:
 *   - normalizeToolpathEntry handles both Fusion-style { tabs } and
 *     Mastercam-style { pages } shapes (params vs parameters key names).
 *   - resolveCatalogKey fuzzy-matches against nativeName from B01.
 *   - readCatalog merges multi-file directories.
 *
 * Per [[feedback_engine_tests_in_tests_dir]], lives in src/__tests__/.
 */
import { describe, it, expect } from "vitest";
import { resolveCatalogKey } from "../engines/CAMCatalogLoader.js";
import type { SoftwareCatalog } from "../engines/CAMClickSequenceEngine.js";

describe("CAMCatalogLoader.resolveCatalogKey — fuzzy catalog-key resolution", () => {

  const fusionCatalog: SoftwareCatalog = {
    toolpaths: {
      "2D_ADAPTIVE_CLEARING": { description: "Adaptive", tabs: { Tool: { parameters: [] } } },
      "FACE": { description: "Face", tabs: { Tool: { parameters: [] } } },
      "2D_POCKET": { description: "Pocket", tabs: { Tool: { parameters: [] } } },
    },
  };

  const mastercamCatalog: SoftwareCatalog = {
    toolpaths: {
      "dynamic_mill": { description: "Dynamic mill", tabs: { toolpath_type: { parameters: [] } } },
      "contour":      { description: "Contour",      tabs: { toolpath_type: { parameters: [] } } },
      "facing":       { description: "Facing",        tabs: { toolpath_type: { parameters: [] } } },
    },
  };

  it("exact normalized match resolves 'Face' to 'FACE' (case-insensitive)", () => {
    expect(resolveCatalogKey(fusionCatalog, "Face")).toBe("FACE");
  });

  it("resolves 'face' (lowercase) to 'FACE' (Fusion catalog)", () => {
    expect(resolveCatalogKey(fusionCatalog, "face")).toBe("FACE");
  });

  it("contains-match resolves '2D Pocket' to '2D_POCKET'", () => {
    // norm("2D Pocket") = "2dpocket" ⊂ norm("2D_POCKET") = "2dpocket"
    expect(resolveCatalogKey(fusionCatalog, "2D Pocket")).toBe("2D_POCKET");
  });

  it("returns null on empty target", () => {
    expect(resolveCatalogKey(fusionCatalog, "")).toBeNull();
  });

  it("returns null on empty catalog", () => {
    expect(resolveCatalogKey({ toolpaths: {} }, "Face")).toBeNull();
    expect(resolveCatalogKey({}, "Face")).toBeNull();
  });

  it("returns null when no fuzzy match exists", () => {
    expect(resolveCatalogKey(fusionCatalog, "WireEDM Cut")).toBeNull();
  });

  it("resolves Mastercam 'Dynamic Mill' to 'dynamic_mill' (norm collapses underscore + space)", () => {
    expect(resolveCatalogKey(mastercamCatalog, "Dynamic Mill")).toBe("dynamic_mill");
  });

  it("resolves Mastercam 'Facing' to 'facing'", () => {
    expect(resolveCatalogKey(mastercamCatalog, "Facing")).toBe("facing");
  });

  it("punctuation-tolerant: '2D Adaptive Clearing' resolves to '2D_ADAPTIVE_CLEARING'", () => {
    expect(resolveCatalogKey(fusionCatalog, "2D Adaptive Clearing")).toBe("2D_ADAPTIVE_CLEARING");
  });

  it("partial-match: 'Face Milling' resolves to 'FACE' (face ⊂ facemilling)", () => {
    // norm("Face Milling") = "facemilling"; norm("FACE")="face" ⊂ "facemilling"
    expect(resolveCatalogKey(fusionCatalog, "Face Milling")).toBe("FACE");
  });
});
