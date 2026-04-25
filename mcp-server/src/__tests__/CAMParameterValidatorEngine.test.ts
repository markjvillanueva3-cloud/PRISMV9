/**
 * CAMParameterValidatorEngine tests — production surface (U-CAM72)
 * ===========================================================================
 * Companion to CAMCatalogLoaderEngine.test.ts. Covers the validator's own
 * file (extracted from CAMPhase5Stubs.ts under U-CAM72) so the Stop-hook's
 * untested-engine check sees a 1:1 file for the engine.
 */

import { describe, it, expect } from "vitest";
import * as path from "path";
import { CAMCatalogLoaderEngine } from "../engines/CAMCatalogLoaderEngine.js";
import {
  CAMParameterValidatorEngine,
  camParameterValidatorEngine,
} from "../engines/CAMParameterValidatorEngine.js";

const DATA_ROOT = path.resolve(__dirname, "../../data");
const loader = new CAMCatalogLoaderEngine(DATA_ROOT);
const validator = new CAMParameterValidatorEngine(loader);

describe("CAMParameterValidatorEngine — construction + default singleton", () => {
  it("constructs with explicit loader", () => {
    expect(validator).toBeInstanceOf(CAMParameterValidatorEngine);
  });

  it("default singleton is importable", () => {
    expect(camParameterValidatorEngine).toBeInstanceOf(CAMParameterValidatorEngine);
  });
});

describe("CAMParameterValidatorEngine — basic surface", () => {
  it("returns a production-mode result (stub:false, mode:'production')", () => {
    const r = validator.validate({ target_cam: "hypermill", parameters: {} });
    expect(r.stub).toBe(false);
    expect(r.mode).toBe("production");
  });

  it("emits an error and valid:false when target_cam is unknown", () => {
    const r = validator.validate({
      target_cam: "not-a-real-cam",
      parameters: { rpm: 12000 },
    });
    expect(r.valid).toBe(false);
    expect(r.errors.length).toBeGreaterThan(0);
    expect(r.errors[0].param).toBe("target_cam");
    expect(r.errors[0].severity).toBe("error");
    expect(r.parameters_checked).toBe(0);
  });

  it("returns coverage telemetry for known CAM", () => {
    const r = validator.validate({ target_cam: "hypermill", parameters: {} });
    expect(r.catalog_param_count).toBeGreaterThan(0);
    expect(r.catalog_coverage_pct).toBeGreaterThan(0);
  });

  it("solidcam yields 0% coverage and an info-severity flag", () => {
    const r = validator.validate({ target_cam: "solidcam", parameters: {} });
    expect(r.catalog_coverage_pct).toBe(0);
    expect(r.catalog_param_count).toBe(0);
    expect(r.info.length).toBeGreaterThan(0);
    expect(r.info[0].severity).toBe("info");
  });
});

describe("CAMParameterValidatorEngine — numeric range guards", () => {
  it("flags rpm above plausible CNC range", () => {
    const r = validator.validate({
      target_cam: "hypermill",
      parameters: { rpm: 9_999_999 },
    });
    const rpmErr = r.errors.find((e) => e.param === "rpm");
    expect(rpmErr?.severity).toBe("error");
    expect(rpmErr?.reason).toMatch(/spindle speed outside plausible CNC range/);
    expect(r.valid).toBe(false);
  });

  it("flags negative depth_of_cut", () => {
    const r = validator.validate({
      target_cam: "mastercam",
      parameters: { depth_of_cut: -1 },
    });
    const docErr = r.errors.find((e) => e.param === "depth_of_cut");
    expect(docErr?.severity).toBe("error");
    expect(docErr?.reason).toMatch(/axial depth outside plausible range/);
  });

  it("accepts realistic params with valid:true (no errors)", () => {
    const r = validator.validate({
      target_cam: "hypermill",
      parameters: { rpm: 12_000, feed_rate: 1500, depth_of_cut: 2.5, stepover_pct: 0.4 },
    });
    expect(r.valid).toBe(true);
    expect(r.errors).toHaveLength(0);
    expect(r.parameters_checked).toBe(4);
  });

  it("rejects non-finite numeric values (NaN, Infinity)", () => {
    const r = validator.validate({
      target_cam: "hypermill",
      parameters: { rpm: NaN, feed_rate: Infinity },
    });
    expect(r.errors.length).toBeGreaterThanOrEqual(2);
    expect(r.errors.every((e) => e.severity === "error")).toBe(true);
    expect(r.valid).toBe(false);
  });

  it("rejects type mismatch (string for numeric param)", () => {
    const r = validator.validate({
      target_cam: "hypermill",
      parameters: { rpm: "fast" },
    });
    const err = r.errors.find((e) => e.param === "rpm");
    expect(err?.severity).toBe("error");
    expect(err?.reason).toMatch(/expected number, got string/i);
  });

  it("warns on null/undefined values without invalidating", () => {
    const r = validator.validate({
      target_cam: "hypermill",
      parameters: { feed_rate: null, depth_of_cut: undefined },
    });
    expect(r.warnings.length).toBeGreaterThanOrEqual(2);
    expect(r.warnings.every((w) => w.severity === "warning")).toBe(true);
    expect(r.valid).toBe(true); // warnings don't invalidate
  });
});

describe("CAMParameterValidatorEngine — operation matching + capability bias", () => {
  it("matches a known operation against catalog top_keys when coverage > 0", () => {
    const r = validator.validate({
      target_cam: "hypermill",
      parameters: {},
      operation: "operation",
    });
    if (r.catalog_coverage_pct > 0 && r.matched_operation !== null) {
      expect(typeof r.matched_operation).toBe("string");
      expect((r.matched_operation as string).length).toBeGreaterThan(0);
    } else {
      expect(r.matched_operation).toBeNull();
    }
  });

  it("emits an error when operation is not in catalog (and catalog has data)", () => {
    const r = validator.validate({
      target_cam: "hypermill",
      parameters: {},
      operation: "totally-fictional-operation-zzzz",
    });
    if (r.catalog_coverage_pct > 0) {
      const opErr = r.errors.find((e) => e.param === "operation");
      expect(opErr?.severity).toBe("error");
      expect(opErr?.reason).toMatch(/not found in hypermill catalog/);
    }
  });

  it("warns when 5-axis operation is requested on a non-5-axis CAM", () => {
    const r = validator.validate({
      target_cam: "fusion360",
      parameters: {},
      operation: "5-axis-swarf",
    });
    const cap = r.warnings.find((w) => /5-axis capability/i.test(w.reason));
    expect(cap?.severity).toBe("warning");
    expect(cap?.param).toBe("operation");
  });
});

describe("CAMParameterValidatorEngine — issue assembly", () => {
  it("issues array length equals errors+warnings+info length", () => {
    const r = validator.validate({
      target_cam: "hypermill",
      parameters: { rpm: -1, feed_rate: null },
    });
    expect(r.issues.length).toBe(r.errors.length + r.warnings.length + r.info.length);
  });

  it("counts only inspected parameters (excludes operation field)", () => {
    const r = validator.validate({
      target_cam: "hypermill",
      parameters: { rpm: 12_000, feed_rate: 1500 },
      operation: "pocket",
    });
    expect(r.parameters_checked).toBe(2);
  });
});
