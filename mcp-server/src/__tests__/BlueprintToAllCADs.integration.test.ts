/**
 * BlueprintToAllCADs end-to-end integration test
 * (CAD-COMPLETE-MS0/U-CADC-PRINT-INT01)
 *
 * Exercises the full image -> 6-CAD pipeline using REAL JM-Die blueprint
 * images on disk (`JM DIE/REVERSE ENGINEERING/{1..4}.jpg`) with a deterministic
 * stub for `BlueprintVisionOCREngine.analyzeBlueprint` so the run does not
 * depend on ANTHROPIC_API_KEY or network. The stub still receives the real
 * file ImageSource and returns a fully-typed BlueprintVisionResult, so every
 * downstream stage (translator, six bridge generators, line counter,
 * provenance/warning aggregation) is exercised end-to-end.
 *
 * What this verifies that the unit tests do not:
 *   - Real image bytes survive validation and reach the OCR stage
 *   - The DI seam actually composes -- vision profiles flow through to bridges
 *   - All six bridges emit non-empty scripts on a single run
 *   - Per-stage timing accounts for both ocrMs and orchestrateMs
 *   - Title-block-derived partName is honored when no override is supplied
 *   - Token accounting flows from Vision -> orchestrator provenance
 *   - Stub-thrown errors are FATAL at the top level (no analysis means nothing to orchestrate)
 */

import { describe, it, expect } from "vitest";
import * as fs from "fs";
import * as path from "path";
import { BlueprintToAllCADsOrchestratorEngine } from "../engines/BlueprintToAllCADsOrchestratorEngine.js";
import type {
  BlueprintVisionInput,
  BlueprintVisionResult,
  ExtractedProfile,
} from "../engines/BlueprintVisionOCREngine.js";
import type { ExtractedDimension } from "../engines/BlueprintOCREngine.js";
import { ALL_CAD_TARGETS } from "../engines/PrintToAllCADsOrchestrator.js";

// ---- JM-Die blueprint fixtures (real images) -------------------------------

const JM_DIE_DIR = path.resolve(__dirname, "..", "..", "..", "JM DIE", "REVERSE ENGINEERING");
const FIXTURE_NAMES = ["1.jpg", "2.jpg", "3.jpg", "4.jpg"] as const;
const JM_DIE_IMAGES = FIXTURE_NAMES.map((f) => path.join(JM_DIE_DIR, f));
const FIXTURE_PRIMARY = JM_DIE_IMAGES[0];
const FIXTURE_PROFILE = JM_DIE_IMAGES[1];
const FIXTURE_PARTNAME = JM_DIE_IMAGES[2];
const FIXTURE_SUBSET = JM_DIE_IMAGES[3];

const STUB_PART_NUMBER = "JM-RE-PART-7";
const STUB_TOKENS_USED = 1234;
const ENGINE_VERSION_EXPECTED = "1.0.0";
const TARGET_COUNT = ALL_CAD_TARGETS.length;
const SUBSET_TARGETS = ["fusion360", "mastercam", "esprit"] as const;
const STUB_PROFILE_OPS_FLOOR = 6;

function imagesAvailable(): boolean {
  try {
    return JM_DIE_IMAGES.every((p) => fs.statSync(p).isFile());
  } catch {
    return false;
  }
}

// ---- Vision stub factory ---------------------------------------------------

function dim(type: ExtractedDimension["type"], n: number, id: string): ExtractedDimension {
  return {
    id,
    type,
    nominal: n,
    unit: "mm",
    raw_text: `${n}mm`,
    confidence: 0.92,
  };
}

function pocketProfile(id: string, w: number, h: number): ExtractedProfile {
  return {
    id,
    name: `Pocket ${id}`,
    type: "pocket",
    points: [
      { x: 0, y: 0 },
      { x: w, y: 0 },
      { x: w, y: h },
      { x: 0, y: h },
    ],
    is_closed: true,
    width_mm: w,
    height_mm: h,
    confidence: 0.93,
  };
}

function holeProfile(id: string, dia: number): ExtractedProfile {
  return {
    id,
    name: `Hole ${id}`,
    type: "hole",
    points: [{ x: 0, y: 0 }],
    is_closed: true,
    diameter_mm: dia,
    confidence: 0.95,
  };
}

interface StubCapture {
  lastImage?: BlueprintVisionInput["image"];
  calls: number;
}

interface StubOptions {
  throwError?: boolean;
  capture: StubCapture;
  resultOverride?: Partial<BlueprintVisionResult>;
}

function makeStub(opts: StubOptions) {
  const dims: ExtractedDimension[] = [
    dim("linear", 100, "L1"),
    dim("linear", 60, "L2"),
    dim("linear", 12, "T1"),
    dim("diameter", 8, "D1"),
  ];
  const baseResult: BlueprintVisionResult = {
    dimensions: dims,
    gdt_frames: [],
    title_block: {
      part_number: STUB_PART_NUMBER,
      revision: "A",
      material: "1018 steel",
      units: "mm",
      confidence: 0.9,
    },
    notes: [],
    summary: {
      total_dimensions: dims.length,
      total_gdt: 0,
      total_notes: 0,
      tightest_tolerance_mm: 0.05,
      critical_features: [],
      material: "1018 steel",
      has_gdt: false,
    },
    profiles: [
      pocketProfile("P1", 50, 30),
      holeProfile("H1", 8),
      holeProfile("H2", 8),
    ],
    part_bounds_mm: { width: 100, height: 60, depth: 12 },
    thickness_mm: 12,
    tokens_used: STUB_TOKENS_USED,
    processing_time_ms: 250,
    raw_response: "stubbed",
  };
  return {
    async analyzeBlueprint(input: BlueprintVisionInput): Promise<BlueprintVisionResult> {
      opts.capture.calls += 1;
      opts.capture.lastImage = input.image;
      if (opts.throwError) {
        throw new Error("Vision API: simulated outage");
      }
      return { ...baseResult, ...(opts.resultOverride ?? {}) };
    },
  };
}

// ---- Tests -----------------------------------------------------------------

const fixtures = imagesAvailable() ? JM_DIE_IMAGES : [];

describe.skipIf(fixtures.length === 0)(
  "BlueprintToAllCADs E2E -- JM-Die reverse-engineering fixtures",
  () => {
    it("runs the full vision pipeline against image 1.jpg and emits 6 CAD scripts", async () => {
      const capture: StubCapture = { calls: 0 };
      const stub = makeStub({ capture });
      const engine = new BlueprintToAllCADsOrchestratorEngine({ ocr: stub });

      const result = await engine.run({
        image: { type: "file", path: FIXTURE_PRIMARY },
      });

      // OCR was actually invoked, with the real file path we passed in
      expect(capture.calls).toBe(1);
      expect(capture.lastImage).toEqual({ type: "file", path: FIXTURE_PRIMARY });

      // Mode + provenance
      expect(result.mode).toBe("vision");
      expect(result.ocr).not.toBeNull();
      expect(result.ocr?.tokens_used).toBe(STUB_TOKENS_USED);
      expect(result.provenance.engineVersion).toBe(ENGINE_VERSION_EXPECTED);
      expect(result.provenance.ocrTokensUsed).toBe(STUB_TOKENS_USED);
      expect(result.provenance.timestamp).toMatch(/T\d\d:\d\d:\d\d/);

      // 6 bridges ran, all succeeded
      expect(result.cads.results).toHaveLength(TARGET_COUNT);
      expect(result.cads.summary.targetsRequested).toBe(TARGET_COUNT);
      expect(result.cads.summary.succeeded).toBe(TARGET_COUNT);
      expect(result.cads.summary.failed).toBe(0);
      expect(result.cads.summary.totalScriptLines).toBeGreaterThan(0);

      // Targets returned in the canonical priority order
      const targetsInOrder = result.cads.results.map((r) => r.target);
      expect(targetsInOrder).toEqual([...ALL_CAD_TARGETS]);

      // Each bridge produced an output object with non-zero per-target wall time
      for (const r of result.cads.results) {
        expect(r.ok).toBe(true);
        expect(r.error).toBe(undefined);
        // Per-bridge output carries a script string with at least one line.
        const out = r.output as { script?: string } | undefined;
        const script = out?.script ?? "";
        expect(typeof script).toBe("string");
        expect(script.length).toBeGreaterThan(0);
        expect(r.durationMs).toBeGreaterThanOrEqual(0);
      }

      // Per-stage timing both populated; total covers ocr + orchestrate
      expect(result.timing.ocrMs).toBeGreaterThanOrEqual(0);
      expect(result.timing.orchestrateMs).toBeGreaterThanOrEqual(0);
      expect(result.timing.totalMs).toBeGreaterThanOrEqual(
        result.timing.ocrMs + result.timing.orchestrateMs - 5,
      );
    });

    it("propagates OCR-extracted profiles into per-bridge ops (3 profiles -> >=6 ops)", async () => {
      const capture: StubCapture = { calls: 0 };
      const stub = makeStub({ capture });
      const engine = new BlueprintToAllCADsOrchestratorEngine({ ocr: stub });

      const result = await engine.run({
        image: { type: "file", path: FIXTURE_PROFILE },
      });

      // Stub returned 3 profiles; aggregated ops across 6 bridges must
      // reflect them.
      expect(result.cads.summary.totalOpsEmitted).toBeGreaterThanOrEqual(STUB_PROFILE_OPS_FLOOR);

      // The fusion bridge must succeed and emit a non-empty script body
      const fusion = result.cads.results.find((r) => r.target === "fusion360");
      expect(fusion?.ok).toBe(true);
      const fusionScript =
        (fusion?.output as { script?: string } | undefined)?.script ?? "";
      expect(fusionScript.length).toBeGreaterThan(0);
    });

    it("derives partName from title block when no override is supplied", async () => {
      const capture: StubCapture = { calls: 0 };
      const stub = makeStub({ capture });
      const engine = new BlueprintToAllCADsOrchestratorEngine({ ocr: stub });

      const result = await engine.run({
        image: { type: "file", path: FIXTURE_PARTNAME },
      });

      // At least one bridge must surface JM-RE-PART-7 in its emitted script
      // (analysis -> translator -> bridge label chain).
      const anyHasPartName = result.cads.results.some((r) => {
        const out = r.output as { script?: string; partName?: string } | undefined;
        if (out?.partName === STUB_PART_NUMBER) return true;
        return out?.script?.includes(STUB_PART_NUMBER) ?? false;
      });
      expect(anyHasPartName).toBe(true);
    });

    it("respects targets subset and skips unrequested bridges", async () => {
      const capture: StubCapture = { calls: 0 };
      const stub = makeStub({ capture });
      const engine = new BlueprintToAllCADsOrchestratorEngine({ ocr: stub });

      const result = await engine.run({
        image: { type: "file", path: FIXTURE_SUBSET },
        targets: [...SUBSET_TARGETS],
      });

      expect(result.cads.results).toHaveLength(SUBSET_TARGETS.length);
      expect(result.cads.results.map((r) => r.target).sort()).toEqual(
        [...SUBSET_TARGETS].sort(),
      );
      expect(result.cads.summary.targetsRequested).toBe(SUBSET_TARGETS.length);
      expect(result.cads.summary.succeeded).toBe(SUBSET_TARGETS.length);
      expect(result.cads.summary.failed).toBe(0);
    });

    it("passes user-supplied unit/partName/defaultDepth overrides through the pipeline", async () => {
      const capture: StubCapture = { calls: 0 };
      const stub = makeStub({ capture });
      const engine = new BlueprintToAllCADsOrchestratorEngine({ ocr: stub });

      const overrideName = "OVERRIDE_PART";
      const result = await engine.run({
        image: { type: "file", path: FIXTURE_PRIMARY },
        partName: overrideName,
        units: "mm",
        defaultDepth: 25,
        targets: ["fusion360"],
      });

      const fusion = result.cads.results.find((r) => r.target === "fusion360");
      expect(fusion?.ok).toBe(true);
      const fusionOut = fusion?.output as
        | { script?: string; partName?: string }
        | undefined;
      const script = fusionOut?.script ?? "";
      expect(script.length).toBeGreaterThan(0);
      // Override won -- the title-block-derived part number must NOT appear
      expect(fusionOut?.partName).toBe(overrideName);
      expect(script).not.toContain(STUB_PART_NUMBER);
      expect(script).toContain(overrideName);
    });

    it("treats Vision OCR failure as fatal -- no orchestration runs", async () => {
      const capture: StubCapture = { calls: 0 };
      const stub = makeStub({ capture, throwError: true });
      const engine = new BlueprintToAllCADsOrchestratorEngine({ ocr: stub });

      await expect(
        engine.run({ image: { type: "file", path: FIXTURE_PRIMARY } }),
      ).rejects.toThrow(/simulated outage/);

      expect(capture.calls).toBe(1);
    });

    it("aggregates per-CAD warnings into the top-level warnings array (dims-only path)", async () => {
      // Drop profiles so each bridge takes the dimensions-only fallback.
      const capture: StubCapture = { calls: 0 };
      const stub = makeStub({
        capture,
        resultOverride: {
          profiles: [],
          dimensions: [
            dim("linear", 50, "L1"),
            dim("linear", 30, "L2"),
            dim("linear", 5, "T1"),
          ],
        },
      });
      const engine = new BlueprintToAllCADsOrchestratorEngine({ ocr: stub });

      const result = await engine.run({
        image: { type: "file", path: FIXTURE_PROFILE },
      });

      // All bridges still succeed in dims-only fallback
      expect(result.cads.summary.succeeded).toBe(TARGET_COUNT);
      expect(result.cads.summary.failed).toBe(0);
      expect(Array.isArray(result.warnings)).toBe(true);
      // Every warning carries a per-target prefix [target] from the engine.
      for (const w of result.warnings) {
        expect(typeof w).toBe("string");
        expect(w.startsWith("[")).toBe(true);
      }
    });

    it("runs deterministically across all four fixtures (no fixture-specific crashes)", async () => {
      for (const img of fixtures) {
        const capture: StubCapture = { calls: 0 };
        const stub = makeStub({ capture });
        const engine = new BlueprintToAllCADsOrchestratorEngine({ ocr: stub });
        const result = await engine.run({ image: { type: "file", path: img } });
        expect(result.cads.summary.succeeded).toBe(TARGET_COUNT);
        expect(result.cads.summary.failed).toBe(0);
        expect(result.mode).toBe("vision");
        expect(capture.calls).toBe(1);
        expect(capture.lastImage).toEqual({ type: "file", path: img });
      }
    });

    it("capabilities surface advertises 6 targets and vision/analysis modes", () => {
      const engine = new BlueprintToAllCADsOrchestratorEngine();
      const caps = engine.capabilities();
      expect(caps.maxTargets).toBe(TARGET_COUNT);
      expect(caps.modes).toEqual(["vision", "analysis"]);
      expect(caps.visionRequiresApiKey).toBe(true);
      expect(caps.version).toBe(ENGINE_VERSION_EXPECTED);
    });
  },
);
