/**
 * PrintToCADTranslator — PHASE24 wiring tests.
 *
 * Pure-function blueprint-OCR → CADOperation[] translator. Asserts:
 *   - sanitizePartName strips bad chars and falls back to default
 *   - validateTranslatorInput rejects empty input, accepts profiles/dimensions
 *   - translateBlueprintToOps produces valid CADOperation[] for a circle profile
 *   - translateBlueprintToOps records partName, units, source attribution
 *   - throws on invalid input with descriptive label
 */
import { describe, it, expect } from "vitest";
import {
  sanitizePartName,
  validateTranslatorInput,
  translateBlueprintToOps,
  TRANSLATOR_VERSION,
  TRANSLATOR_CONSTANTS,
  PRINT_BRIDGE_SUPPORTED_OPS,
} from "../engines/PrintToCADTranslator.js";
import type { ExtractedDimension } from "../engines/BlueprintOCREngine.js";

describe("PrintToCADTranslator — sanitizePartName", () => {
  it("strips spaces and special chars to underscores", () => {
    expect(sanitizePartName("My Part Name!")).toBe("My_Part_Name_");
  });

  it("preserves alphanumerics, underscore, dash", () => {
    expect(sanitizePartName("Part_42-A")).toBe("Part_42-A");
  });

  it("falls back to default when undefined", () => {
    expect(sanitizePartName(undefined)).toBe("PRISM_BlueprintPart");
  });

  it("falls back to default for whitespace-only", () => {
    expect(sanitizePartName("   ")).toBe("PRISM_BlueprintPart");
  });

  it("clamps to 64 chars", () => {
    const long = "A".repeat(120);
    expect(sanitizePartName(long).length).toBe(64);
  });
});

describe("PrintToCADTranslator — validateTranslatorInput", () => {
  it("rejects null", () => {
    const r = validateTranslatorInput(null as unknown as Parameters<typeof validateTranslatorInput>[0]);
    expect(r.valid).toBe(false);
    expect(r.warnings.length).toBeGreaterThanOrEqual(1);
  });

  it("rejects empty object (no analysis/profiles/dimensions)", () => {
    const r = validateTranslatorInput({});
    expect(r.valid).toBe(false);
    expect(r.warnings[0]).toContain("at least one of");
  });

  it("accepts input with non-empty profiles", () => {
    const r = validateTranslatorInput({
      profiles: [
        {
          id: "P1",
          name: "outer",
          type: "external",
          points: [{ x: 0, y: 0 }, { x: 50, y: 0 }, { x: 50, y: 50 }, { x: 0, y: 50 }],
          is_closed: true,
          confidence: 0.9,
        },
      ],
    });
    expect(r.valid).toBe(true);
  });

  it("warns on invalid defaultDepth", () => {
    const r = validateTranslatorInput({
      profiles: [
        { id: "P1", name: "p", type: "external",
          points: [{ x: 0, y: 0 }, { x: 1, y: 0 }, { x: 0, y: 1 }],
          is_closed: true, confidence: 0.9 },
      ],
      defaultDepth: -5,
    });
    expect(r.valid).toBe(true);
    const hasWarning = r.warnings.some(w => w.includes("defaultDepth"));
    expect(hasWarning).toBe(true);
  });
});

describe("PrintToCADTranslator — translateBlueprintToOps", () => {
  it("emits ops for a single hole profile with diameter", () => {
    const r = translateBlueprintToOps(
      {
        profiles: [
          {
            id: "H1",
            name: "hole",
            type: "hole",
            points: [{ x: 0, y: 0 }, { x: 10, y: 0 }, { x: 10, y: 10 }, { x: 0, y: 10 }],
            is_closed: true,
            diameter_mm: 10,
            confidence: 0.95,
          },
        ],
        partName: "TestPart",
        units: "mm",
      },
      "test-translate",
    );
    expect(Array.isArray(r.ops)).toBe(true);
    expect(r.ops.length).toBeGreaterThanOrEqual(1);
    expect(r.partName).toBe("TestPart");
    expect(r.units).toBe("mm");
    expect(r.source).toBe("profiles");
    expect(r.profileCount).toBe(1);
    expect(r.validProfileCount).toBe(1);
  });

  it("throws with label prefix on invalid input", () => {
    expect(() =>
      translateBlueprintToOps({}, "MY_BRIDGE_LABEL"),
    ).toThrow(/MY_BRIDGE_LABEL/);
  });

  it("uses default partName when partName is omitted", () => {
    const r = translateBlueprintToOps(
      {
        profiles: [
          { id: "P1", name: "p", type: "external",
            points: [{ x: 0, y: 0 }, { x: 50, y: 0 }, { x: 50, y: 50 }, { x: 0, y: 50 }],
            is_closed: true, confidence: 0.9 },
        ],
      },
      "label",
    );
    expect(r.partName).toBe(TRANSLATOR_CONSTANTS.DEFAULT_PART_NAME);
  });

  it("source='dimensions_only' when only dimensions are provided", () => {
    const dim: ExtractedDimension = {
      id: "D1",
      type: "diameter",
      nominal: 25,
      unit: "mm",
      raw_text: "Ø25",
      confidence: 0.95,
    };
    const r = translateBlueprintToOps({ dimensions: [dim] }, "dim-only");
    expect(r.source).toBe("dimensions_only");
  });
});

describe("PrintToCADTranslator — exports", () => {
  it("TRANSLATOR_VERSION is a non-empty string", () => {
    expect(typeof TRANSLATOR_VERSION).toBe("string");
    expect(TRANSLATOR_VERSION.length).toBeGreaterThan(0);
  });

  it("PRINT_BRIDGE_SUPPORTED_OPS is a non-empty readonly list of CAD ops", () => {
    expect(Array.isArray(PRINT_BRIDGE_SUPPORTED_OPS)).toBe(true);
    expect(PRINT_BRIDGE_SUPPORTED_OPS.length).toBeGreaterThanOrEqual(1);
    expect(PRINT_BRIDGE_SUPPORTED_OPS).toContain("sketch_create");
  });
});
