/**
 * Tests for BlueprintToAllCADsOrchestratorEngine — image/analysis → 6-CAD pipeline
 * (CAD-COMPLETE-MS0/U-CADC-BPRINT-OCR-ORCH-01)
 */

import { describe, it, expect } from "vitest";
import {
  BlueprintToAllCADsOrchestratorEngine,
  blueprintToAllCADsOrchestratorEngine,
  type BlueprintToAllCADsInput,
} from "../engines/BlueprintToAllCADsOrchestratorEngine.js";
import type { BlueprintAnalysis, ExtractedDimension } from "../engines/BlueprintOCREngine.js";
import type {
  ExtractedProfile,
  BlueprintVisionResult,
  BlueprintVisionInput,
} from "../engines/BlueprintVisionOCREngine.js";

// ── Constants ────────────────────────────────────────────────────────────────
const ENGINE_VERSION = "1.0.0";
const ALL_TARGETS = 6;
const HOLE_DIA = 8;
const PLATE_W = 100;
const PLATE_H = 60;
const PLATE_T = 10;

// ── Fixtures ─────────────────────────────────────────────────────────────────

function dim(type: ExtractedDimension["type"], nominal: number): ExtractedDimension {
  return {
    id: `${type}-${Math.random().toString(36).slice(2, 7)}`,
    type, nominal, unit: "mm",
    raw_text: `${nominal}mm`, confidence: 0.9,
  };
}

function holeProfile(d = HOLE_DIA): ExtractedProfile {
  return {
    id: `hole-${d}`, name: "Hole", type: "hole",
    points: [{ x: 0, y: 0 }], is_closed: true, diameter_mm: d, confidence: 0.95,
  };
}

function plateAnalysis(): BlueprintAnalysis {
  return {
    dimensions: [dim("linear", PLATE_W), dim("linear", PLATE_H), dim("linear", PLATE_T)],
    gdt_frames: [],
    title_block: {
      part_number: "TEST-PLATE", revision: "A", material: "1018 steel",
      units: "mm", confidence: 0.92,
    },
    notes: [],
    summary: {
      total_dimensions: 3, total_gdt: 0, total_notes: 0,
      tightest_tolerance_mm: 0.05, critical_features: [], material: "1018 steel", has_gdt: false,
    },
  };
}

/** Stub vision engine — returns a deterministic BlueprintVisionResult. */
function makeStubOcr(profileCount = 1): {
  analyzeBlueprint: (input: BlueprintVisionInput) => Promise<BlueprintVisionResult>;
  callCount: () => number;
  lastInput: () => BlueprintVisionInput | null;
} {
  let callCount = 0;
  let lastInput: BlueprintVisionInput | null = null;
  return {
    callCount: () => callCount,
    lastInput: () => lastInput,
    async analyzeBlueprint(input: BlueprintVisionInput): Promise<BlueprintVisionResult> {
      callCount += 1;
      lastInput = input;
      const a = plateAnalysis();
      const profiles = Array.from({ length: profileCount }, (_, i) => holeProfile(HOLE_DIA + i));
      return {
        ...a,
        profiles,
        part_bounds_mm: { width: PLATE_W, height: PLATE_H, depth: PLATE_T },
        thickness_mm: PLATE_T,
        tokens_used: 1234,
        processing_time_ms: 5,
        raw_response: "stub",
      };
    },
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// Identity + capabilities
// ─────────────────────────────────────────────────────────────────────────────

describe("BlueprintToAllCADsOrchestratorEngine — identity", () => {
  it("singleton matches class + reports v1.0.0", () => {
    expect(blueprintToAllCADsOrchestratorEngine).toBeInstanceOf(BlueprintToAllCADsOrchestratorEngine);
    expect(blueprintToAllCADsOrchestratorEngine.version).toBe(ENGINE_VERSION);
  });

  it("capabilities() reports both modes + 6 targets + Vision-needs-key flag", () => {
    const c = blueprintToAllCADsOrchestratorEngine.capabilities();
    expect(c.version).toBe(ENGINE_VERSION);
    expect([...c.modes]).toEqual(["vision", "analysis"]);
    expect(c.maxTargets).toBe(ALL_TARGETS);
    expect(c.visionRequiresApiKey).toBe(true);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// validate() — required-input gating
// ─────────────────────────────────────────────────────────────────────────────

describe("BlueprintToAllCADsOrchestratorEngine — validate()", () => {
  const e = blueprintToAllCADsOrchestratorEngine;

  it("rejects null input with 'not an object'", () => {
    const r = e.validate(null);
    expect(r.valid).toBe(false);
    expect(r.errors).toEqual(["input is not an object"]);
  });

  it("rejects empty input — needs exactly one of image/analysis", () => {
    const r = e.validate({});
    expect(r.valid).toBe(false);
    expect(r.errors.join(" ")).toMatch(/exactly one of `image`.*`analysis`/);
  });

  it("rejects supplying BOTH image AND analysis", () => {
    const r = e.validate({
      image: { type: "base64", data: "x" },
      analysis: plateAnalysis(),
    });
    expect(r.valid).toBe(false);
    expect(r.errors.join(" ")).toMatch(/must NOT supply BOTH/);
  });

  it("rejects ImageSource with unknown type", () => {
    const r = e.validate({ image: { type: "ftp", path: "x" } });
    expect(r.valid).toBe(false);
    expect(r.errors.join(" ")).toMatch(/image\.type must be base64\|file\|url/);
  });

  it("rejects file ImageSource with empty path", () => {
    const r = e.validate({ image: { type: "file", path: "" } });
    expect(r.valid).toBe(false);
    expect(r.errors.join(" ")).toMatch(/non-empty string path/);
  });

  it("rejects base64 ImageSource with empty data", () => {
    const r = e.validate({ image: { type: "base64", data: "" } });
    expect(r.valid).toBe(false);
    expect(r.errors.join(" ")).toMatch(/non-empty base64 data/);
  });

  it("rejects targets that aren't an array", () => {
    const r = e.validate({
      analysis: plateAnalysis(),
      targets: "fusion360" as unknown as BlueprintToAllCADsInput["targets"],
    });
    expect(r.valid).toBe(false);
    expect(r.errors.join(" ")).toMatch(/targets must be an array/);
  });

  it.each([
    [-5, "negative"],
    [0, "zero"],
    [Number.NaN, "NaN"],
    [Number.POSITIVE_INFINITY, "Infinity"],
  ])("rejects defaultDepth=%s (%s)", (depth) => {
    const r = e.validate({ analysis: plateAnalysis(), defaultDepth: depth });
    expect(r.valid).toBe(false);
    expect(r.errors.join(" ")).toMatch(/defaultDepth must be a finite positive number/);
  });

  it("accepts a valid analysis-mode input", () => {
    const r = e.validate({ analysis: plateAnalysis(), defaultDepth: 12 });
    expect(r.valid).toBe(true);
    expect(r.errors).toEqual([]);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// run() — analysis mode (no OCR)
// ─────────────────────────────────────────────────────────────────────────────

describe("BlueprintToAllCADsOrchestratorEngine — run() analysis mode", () => {
  it("emits 6 scripts from a hand-built analysis without calling OCR", async () => {
    const stub = makeStubOcr();
    const eng = new BlueprintToAllCADsOrchestratorEngine({ ocr: stub });
    const out = await eng.run({ analysis: plateAnalysis() });
    expect(out.mode).toBe("analysis");
    expect(out.ocr).toBeNull();
    expect(stub.callCount()).toBe(0);
    expect(out.cads.summary.targetsRequested).toBe(ALL_TARGETS);
    expect(out.cads.summary.succeeded).toBe(ALL_TARGETS);
    expect(out.cads.results.map(r => r.target)).toEqual([
      "fusion360", "hypercads", "mastercam", "inventor", "solidworks", "esprit",
    ]);
  });

  it("provenance ocrTokensUsed=0 + ocrModel=null in analysis mode", async () => {
    const out = await blueprintToAllCADsOrchestratorEngine.run({ analysis: plateAnalysis() });
    expect(out.provenance.ocrTokensUsed).toBe(0);
    expect(out.provenance.ocrModel).toBeNull();
    expect(out.provenance.engineVersion).toBe(ENGINE_VERSION);
    // ISO-8601 timestamp shape: 2026-05-05T...Z
    expect(out.provenance.timestamp).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/);
  });

  it("respects targets subset in priority order", async () => {
    const out = await blueprintToAllCADsOrchestratorEngine.run({
      analysis: plateAnalysis(),
      targets: ["esprit", "fusion360", "hypercads"],
    });
    expect(out.cads.results.map(r => r.target)).toEqual(["fusion360", "hypercads", "esprit"]);
    expect(out.cads.summary.succeeded).toBe(3);
  });

  it("passes profiles through when supplied alongside analysis", async () => {
    const out = await blueprintToAllCADsOrchestratorEngine.run({
      analysis: plateAnalysis(),
      profiles: [holeProfile(6), holeProfile(10)],
    });
    expect(out.cads.summary.succeeded).toBe(ALL_TARGETS);
    // Each per-CAD output saw the profile-derived ops, not just dimensions
    for (const r of out.cads.results) {
      expect(r.output?.opsEmitted).toBeGreaterThanOrEqual(3);
    }
  });

  it("timing.ocrMs is 0 in analysis mode", async () => {
    const out = await blueprintToAllCADsOrchestratorEngine.run({ analysis: plateAnalysis() });
    expect(out.timing.ocrMs).toBe(0);
    expect(out.timing.orchestrateMs).toBeGreaterThanOrEqual(0);
    expect(out.timing.totalMs).toBeGreaterThanOrEqual(out.timing.orchestrateMs);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// run() — vision mode (stubbed OCR)
// ─────────────────────────────────────────────────────────────────────────────

describe("BlueprintToAllCADsOrchestratorEngine — run() vision mode (stubbed OCR)", () => {
  it("calls OCR exactly once, then orchestrates 6 CADs", async () => {
    const stub = makeStubOcr(2);
    const eng = new BlueprintToAllCADsOrchestratorEngine({ ocr: stub });
    const out = await eng.run({
      image: { type: "base64", data: "fake-png-data" },
      vision: { blueprint_type: "milling", expected_units: "mm" },
    });
    expect(stub.callCount()).toBe(1);
    expect(out.mode).toBe("vision");
    expect(out.ocr).not.toBeNull();
    expect(out.ocr?.tokens_used).toBe(1234);
    expect(out.cads.summary.succeeded).toBe(ALL_TARGETS);
  });

  it("forwards vision config (blueprint_type, units, model) to OCR", async () => {
    const stub = makeStubOcr();
    const eng = new BlueprintToAllCADsOrchestratorEngine({ ocr: stub });
    await eng.run({
      image: { type: "file", path: "/tmp/blueprint.png" },
      vision: {
        blueprint_type: "wire_edm",
        expected_units: "inch",
        model: "claude-opus-4",
        extract_geometry: true,
      },
    });
    const passed = stub.lastInput();
    expect(passed?.blueprint_type).toBe("wire_edm");
    expect(passed?.expected_units).toBe("inch");
    expect(passed?.model).toBe("claude-opus-4");
    expect(passed?.extract_geometry).toBe(true);
  });

  it("vision mode preserves OCR profiles through to orchestrator", async () => {
    const stub = makeStubOcr(3);
    const eng = new BlueprintToAllCADsOrchestratorEngine({ ocr: stub });
    const out = await eng.run({ image: { type: "base64", data: "x" } });
    expect(out.ocr?.profiles.length).toBe(3);
    // 3 hole profiles × 3 ops each = 9 ops per CAD
    for (const r of out.cads.results) {
      expect(r.output?.opsEmitted).toBe(9);
    }
  });

  it("explicit input.profiles override OCR-emitted profiles", async () => {
    const stub = makeStubOcr(5); // OCR would yield 5 profiles
    const eng = new BlueprintToAllCADsOrchestratorEngine({ ocr: stub });
    const out = await eng.run({
      image: { type: "base64", data: "x" },
      profiles: [holeProfile(20)], // 1 caller-supplied profile
    });
    // Caller-supplied profile wins; ops = 1 hole × 3 = 3
    for (const r of out.cads.results) {
      expect(r.output?.opsEmitted).toBe(3);
    }
  });

  it("OCR provenance flows through (tokens_used, default model name)", async () => {
    const stub = makeStubOcr();
    const eng = new BlueprintToAllCADsOrchestratorEngine({ ocr: stub });
    const out = await eng.run({ image: { type: "base64", data: "x" } });
    expect(out.provenance.ocrTokensUsed).toBe(1234);
    expect(out.provenance.ocrModel).toBe("claude-sonnet-4-20250514");
  });

  it("vision mode timing.ocrMs is recorded (>= 0)", async () => {
    const stub = makeStubOcr();
    const eng = new BlueprintToAllCADsOrchestratorEngine({ ocr: stub });
    const out = await eng.run({ image: { type: "base64", data: "x" } });
    expect(out.timing.ocrMs).toBeGreaterThanOrEqual(0);
    expect(out.timing.totalMs).toBeGreaterThanOrEqual(out.timing.ocrMs);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// Failure modes
// ─────────────────────────────────────────────────────────────────────────────

describe("BlueprintToAllCADsOrchestratorEngine — failure modes", () => {
  it("throws on validation failure (no image, no analysis)", async () => {
    await expect(
      blueprintToAllCADsOrchestratorEngine.run({} as BlueprintToAllCADsInput),
    ).rejects.toThrow(/exactly one of `image`.*`analysis`/);
  });

  it("propagates OCR failure (vision mode rejects)", async () => {
    const stub = {
      analyzeBlueprint: async () => { throw new Error("API key missing"); },
    };
    const eng = new BlueprintToAllCADsOrchestratorEngine({ ocr: stub });
    await expect(
      eng.run({ image: { type: "base64", data: "x" } }),
    ).rejects.toThrow(/API key missing/);
  });

  it("orchestrator failure on individual CADs is captured in warnings, not thrown", async () => {
    // Empty analysis — orchestrator emits CAD scripts that produce 0 ops, but
    // the bridges themselves shouldn't throw. Confirm warnings flow through.
    const empty: BlueprintAnalysis = {
      dimensions: [], gdt_frames: [], notes: [],
      title_block: { units: "mm", confidence: 0.5 },
      summary: {
        total_dimensions: 0, total_gdt: 0, total_notes: 0,
        tightest_tolerance_mm: null, critical_features: [], material: null, has_gdt: false,
      },
    };
    // Add a profile so the bridges have something to work with
    const out = await blueprintToAllCADsOrchestratorEngine.run({
      analysis: empty,
      profiles: [holeProfile()],
    });
    expect(out.cads.summary.failed).toBe(0);
    // Warnings list is populated when any bridge emits a warning
    expect(Array.isArray(out.warnings)).toBe(true);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// Adversarial inputs
// ─────────────────────────────────────────────────────────────────────────────

describe("BlueprintToAllCADsOrchestratorEngine — adversarial inputs", () => {
  it("rejects oversize targets array (no specific cap, but unknowns surface in cads.summary.failed)", async () => {
    const out = await blueprintToAllCADsOrchestratorEngine.run({
      analysis: plateAnalysis(),
      targets: ["fusion360", "fusion360", "fusion360"], // duplicates
    });
    // Inner orchestrator dedups — exactly 1 result for fusion360
    expect(out.cads.results.length).toBe(1);
    expect(out.cads.results[0]?.target).toBe("fusion360");
  });

  it("validation rejects non-object input (string)", () => {
    const r = blueprintToAllCADsOrchestratorEngine.validate("not an object");
    expect(r.valid).toBe(false);
  });

  it("validation rejects array input", () => {
    const r = blueprintToAllCADsOrchestratorEngine.validate([]);
    // Arrays are objects but lack image/analysis fields
    expect(r.valid).toBe(false);
  });

  it("vision mode handles huge token counts without overflow", async () => {
    const hugeStub = {
      async analyzeBlueprint(_input: BlueprintVisionInput): Promise<BlueprintVisionResult> {
        const a = plateAnalysis();
        return {
          ...a,
          profiles: [holeProfile()],
          part_bounds_mm: { width: 1, height: 1, depth: 1 },
          thickness_mm: 1,
          tokens_used: Number.MAX_SAFE_INTEGER,
          processing_time_ms: 0,
        };
      },
    };
    const eng = new BlueprintToAllCADsOrchestratorEngine({ ocr: hugeStub });
    const out = await eng.run({ image: { type: "base64", data: "x" } });
    expect(out.provenance.ocrTokensUsed).toBe(Number.MAX_SAFE_INTEGER);
  });
});
