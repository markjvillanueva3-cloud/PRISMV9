/**
 * TextToCADGenerationEngine — PHASE24 wiring tests.
 *
 * Covers parseText (dimension extraction, feature recognition, machine-category
 * detection), createContext, detectRefinements, applyRefinement, capabilities,
 * supported feature catalog. The async generate() path needs a backend and is
 * exercised by the dispatcher round-trip suite.
 */
import { describe, it, expect } from "vitest";
import {
  TextToCADGenerationEngine,
  textToCADGenerationEngine,
  type FeatureSpec,
} from "../engines/TextToCADGenerationEngine.js";

describe("TextToCADGenerationEngine", () => {
  it("singleton is a real TextToCADGenerationEngine instance", () => {
    expect(textToCADGenerationEngine).toBeInstanceOf(TextToCADGenerationEngine);
  });

  it("getCapabilities returns 4 capability slots", () => {
    const caps = textToCADGenerationEngine.getCapabilities();
    expect(caps.length).toBe(4);
    const names = caps.map(c => c.name).sort();
    expect(names).toEqual(["context", "from_text", "parse_text", "refine"]);
  });

  it("validate rejects null", () => {
    expect(textToCADGenerationEngine.validate(null)).toBe("input must be an object");
  });

  it("validate rejects object without text", () => {
    expect(textToCADGenerationEngine.validate({})).toBe(
      "text is required and must be a string",
    );
  });

  it("validate accepts object with text string", () => {
    expect(textToCADGenerationEngine.validate({ text: "make a bushing" })).toBe(null);
  });

  it("parseText extracts mm dimensions", () => {
    const parsed = textToCADGenerationEngine.parseText(
      "Make a flanged bushing with 20mm bore, 40mm OD, 10mm flange",
    );
    expect(parsed.description).toBe(
      "Make a flanged bushing with 20mm bore, 40mm OD, 10mm flange",
    );
    expect(Array.isArray(parsed.dimensions)).toBe(true);
    expect(parsed.dimensions.length).toBeGreaterThanOrEqual(1);
    const allMm = parsed.dimensions.every(d => d.unit === "mm");
    expect(allMm).toBe(true);
  });

  it("parseText detects lathe machine category from 'turning'", () => {
    const parsed = textToCADGenerationEngine.parseText(
      "Turning a 25mm shaft to 20mm diameter",
    );
    expect(parsed.machineCategory).toBe("lathe");
  });

  it("parseText detects mill machine category from 'pocket'", () => {
    const parsed = textToCADGenerationEngine.parseText(
      "Mill a 30mm wide pocket 10mm deep",
    );
    expect(parsed.machineCategory).toBe("mill");
  });

  it("parseText detects wire_edm machine category", () => {
    const parsed = textToCADGenerationEngine.parseText("Wire EDM cut a profile");
    expect(parsed.machineCategory).toBe("wire_edm");
  });

  it("createContext returns context with empty turns and provided session id", () => {
    const ctx = textToCADGenerationEngine.createContext("test-session-42");
    expect(ctx.sessionId).toBe("test-session-42");
    expect(ctx.turns).toEqual([]);
    expect(ctx.currentSpec).toEqual([]);
  });

  it("createContext auto-generates session id when omitted", () => {
    const ctx = textToCADGenerationEngine.createContext();
    expect(typeof ctx.sessionId).toBe("string");
    expect(ctx.sessionId.startsWith("session-")).toBe(true);
  });

  it("detectRefinements returns array (may be empty for plain creation text)", () => {
    const refs = textToCADGenerationEngine.detectRefinements("make a 20mm bushing");
    expect(Array.isArray(refs)).toBe(true);
  });

  it("getSupportedFeatures returns a non-empty list of keywords", () => {
    const feats = textToCADGenerationEngine.getSupportedFeatures();
    expect(Array.isArray(feats)).toBe(true);
    expect(feats.length).toBeGreaterThanOrEqual(1);
    const allStrings = feats.every(f => typeof f === "string" && f.length > 0);
    expect(allStrings).toBe(true);
  });

  it("applyRefinement returns array of features", () => {
    const start: FeatureSpec[] = [{ type: "cylinder", params: { diameter: 20, length: 50 } }];
    const ref = { type: "add" as const, description: "add chamfer", feature: { type: "chamfer", params: { size: 1 } } };
    const result = textToCADGenerationEngine.applyRefinement(start, ref);
    expect(Array.isArray(result)).toBe(true);
    expect(result.length).toBeGreaterThanOrEqual(start.length);
  });

  it("class instances are independent of singleton", () => {
    const fresh = new TextToCADGenerationEngine();
    expect(fresh).not.toBe(textToCADGenerationEngine);
    expect(fresh.getCapabilities().length).toBe(4);
  });
});
