/**
 * R9 tests for NLPCAMParserEngine.extractDimensions() and parseWithContext()
 * These methods were absent; added to close camDispatcher nlp_cam_parse_context /
 * nlp_cam_extract_dims drift.
 *
 * Intent encoded:
 *   - extractDimensions returns only the numeric dimension values, not feature/material fields
 *   - extractDimensions correctly parses wxh, depth, diameter, length, tolerance, Ra
 *   - extractDimensions returns empty object when no dims found
 *   - parseWithContext delegates feature/operation parsing to parse()
 *   - parseWithContext overrides material and iso group when explicit material string supplied
 *   - parseWithContext overrides machine_name when explicit machine string supplied
 *   - parseWithContext raises confidence when context overrides are applied
 *   - parseWithContext confidence never exceeds 0.95
 */

import { describe, it, expect } from "vitest";
import { NLPCAMParserEngine, ParsedDimensions } from "../engines/NLPCAMParserEngine.js";

const engine = new NLPCAMParserEngine();

// ── extractDimensions ─────────────────────────────────────────────────────────

describe("NLPCAMParserEngine.extractDimensions", () => {
  it("extracts length and width from WxH notation", () => {
    const dims = engine.extractDimensions("pocket 80x50mm");
    expect(dims.length_mm).toBe(80);
    expect(dims.width_mm).toBe(50);
  });

  it("extracts depth from 'Nmm deep' pattern", () => {
    const dims = engine.extractDimensions("15mm deep pocket");
    expect(dims.depth_mm).toBe(15);
  });

  it("extracts diameter from 'Nmm dia' pattern", () => {
    const dims = engine.extractDimensions("drill 10mm dia");
    expect(dims.diameter_mm).toBe(10);
  });

  it("extracts diameter from 'dia Nmm' pattern", () => {
    const dims = engine.extractDimensions("bore dia 25mm");
    expect(dims.diameter_mm).toBe(25);
  });

  it("extracts tolerance from 'tolerance N' pattern", () => {
    // DIM_PATTERNS.tolerance matches: "tolerance 0.02" (word branch)
    const dims = engine.extractDimensions("tolerance 0.02mm");
    expect(dims.tolerance_mm).toBeCloseTo(0.02);
  });

  it("extracts surface finish Ra", () => {
    const dims = engine.extractDimensions("Ra 0.8 finish required");
    expect(dims.surface_finish_Ra).toBeCloseTo(0.8);
  });

  it("extracts all dimension types when all are present", () => {
    // DIM_PATTERNS.tolerance matches "tolerance 0.01" (word branch)
    const dims = engine.extractDimensions("pocket 80x50mm, 15mm deep, dia 10mm, Ra 1.6, tolerance 0.01");
    expect(dims.length_mm).toBe(80);
    expect(dims.width_mm).toBe(50);
    expect(dims.depth_mm).toBe(15);
    expect(dims.diameter_mm).toBe(10);
    expect(dims.surface_finish_Ra).toBeCloseTo(1.6);
    expect(dims.tolerance_mm).toBeCloseTo(0.01);
  });

  it("returns empty object when no dimensions present", () => {
    const dims = engine.extractDimensions("rough milling, P20 steel");
    expect(Object.keys(dims)).toHaveLength(0);
  });

  it("handles fractional dimension values", () => {
    const dims = engine.extractDimensions("slot 12.5x3.2mm, 8.75mm deep");
    expect(dims.length_mm).toBeCloseTo(12.5);
    expect(dims.width_mm).toBeCloseTo(3.2);
    expect(dims.depth_mm).toBeCloseTo(8.75);
  });

  // Adversarial: verify result only has ParsedDimensions keys, not extra fields
  it("result only contains numeric dimension keys (no type/operation/material)", () => {
    const dims: ParsedDimensions = engine.extractDimensions("pocket 80x50mm P20 steel Haas VF2");
    const allowedKeys: Array<keyof ParsedDimensions> = [
      "length_mm", "width_mm", "depth_mm", "diameter_mm",
      "tolerance_mm", "surface_finish_Ra",
    ];
    const actualKeys = Object.keys(dims);
    for (const key of actualKeys) {
      expect(allowedKeys).toContain(key);
    }
  });

  // Adversarial: zero dims text returns empty (not partial result)
  it("returns object with no keys for pure feature text", () => {
    const dims = engine.extractDimensions("finish pass on contour");
    expect(Object.keys(dims)).toHaveLength(0);
  });
});

// ── parseWithContext ──────────────────────────────────────────────────────────

describe("NLPCAMParserEngine.parseWithContext", () => {
  it("with no overrides produces same feature type and operation as parse()", () => {
    const text = "pocket 80x50mm, 15mm deep";
    const plain = engine.parse(text);
    const ctx = engine.parseWithContext(text);
    expect(ctx.features[0].type).toBe(plain.features[0].type);
    expect(ctx.features[0].operation).toBe(plain.features[0].operation);
    expect(ctx.features[0].dimensions?.length_mm).toBe(plain.features[0].dimensions?.length_mm);
  });

  it("overrides material and sets ISO group S for Ti-6Al-4V", () => {
    const result = engine.parseWithContext("pocket 80x50mm", "Ti-6Al-4V");
    expect(result.material).toContain("Ti");
    expect(result.material_iso_group).toBe("S");
  });

  it("stores raw material string when no pattern matches", () => {
    const result = engine.parseWithContext("pocket 80x50mm", "ExoticAlloyXYZ-999");
    expect(result.material).toBe("ExoticAlloyXYZ-999");
  });

  it("overrides machine_name with the explicit machine string", () => {
    const result = engine.parseWithContext("pocket 80x50mm, P20 steel", undefined, "Hermle C600");
    expect(result.machine_name).toBe("Hermle C600");
  });

  it("raises confidence above parse() baseline when material override applied", () => {
    const text = "pocket 80x50mm";
    const plain = engine.parse(text);
    const ctx = engine.parseWithContext(text, "4140 alloy steel");
    expect(ctx.confidence).toBeGreaterThan(plain.confidence);
  });

  it("raises confidence above parse() baseline when machine override applied", () => {
    const text = "pocket 80x50mm";
    const plain = engine.parse(text);
    const ctx = engine.parseWithContext(text, undefined, "Okuma MU-6300V");
    expect(ctx.confidence).toBeGreaterThan(plain.confidence);
  });

  it("confidence does not exceed 0.95 even with rich text plus both overrides", () => {
    const text = "pocket 80x50mm, 15mm deep, P20 steel, Haas VF2, Ra 1.6";
    const result = engine.parseWithContext(text, "4140", "DMG DMU 50");
    expect(result.confidence).toBeLessThanOrEqual(0.95);
  });

  it("returns features array with at least one entry having type and operation", () => {
    const result = engine.parseWithContext("drill 10mm dia, 30mm deep, 304 stainless");
    expect(result.features.length).toBeGreaterThanOrEqual(1);
    expect(typeof result.features[0].type).toBe("string");
    expect(typeof result.features[0].operation).toBe("string");
    // Drilling text -> expect drilling operation
    expect(result.features[0].operation).toBe("drilling");
  });

  // Adversarial: machine override replaces machine extracted from text
  it("machine override wins over machine name in text", () => {
    const text = "pocket 80x50mm, Haas VF2";
    const result = engine.parseWithContext(text, undefined, "Hermle C400");
    expect(result.machine_name).toBe("Hermle C400");
  });

  // Adversarial: stainless material -> ISO group M
  it("316 stainless material override sets ISO group M", () => {
    const result = engine.parseWithContext("pocket 50x30mm", "316 stainless");
    expect(result.material_iso_group).toBe("M");
  });

  // Adversarial: aluminum material -> ISO group N
  it("6061 aluminum material override sets ISO group N", () => {
    const result = engine.parseWithContext("pocket 50x30mm", "6061-T6 aluminum");
    expect(result.material_iso_group).toBe("N");
  });
});
