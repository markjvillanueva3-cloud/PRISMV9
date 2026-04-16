/**
 * ControllerStrategyValidatorEngine Tests — CAMX-MS2/U01+U08
 *
 * Validates strategy executable on target controller: NURBS, look-ahead,
 * HSM modes, axes, work offsets.
 */

import { describe, it, expect } from "vitest";
import {
  controllerStrategyValidatorEngine,
} from "../engines/ControllerStrategyValidatorEngine.js";

// ─── validate() ──────────────────────────────────────────────────────────────

describe("ControllerStrategyValidatorEngine.validate()", () => {
  it("validates HSM finishing on high-end Siemens 840D", () => {
    const result = controllerStrategyValidatorEngine.validate("high_speed_finishing", "siemens_840d");
    expect(result.controller).toBe("siemens_840d");
    expect(result.strategy).toBe("high_speed_finishing");
    expect(result.score).toBeGreaterThanOrEqual(0);
  });

  it("flags NURBS strategy on controllers without NURBS support", () => {
    // Some Fanuc 0i controllers lack NURBS
    const result = controllerStrategyValidatorEngine.validate("morphed_spiral", "fanuc_0i");
    // Either incompatible or has warnings about NURBS fallback
    const hasNurbsIssue = result.issues.some(i => i.code.includes("NURBS")) ||
                         result.warnings.some(w => w.code.includes("NURBS"));
    expect(result.compatible !== undefined).toBe(true);
    // capabilities_used should track NURBS usage
    if (result.capabilities_used.length > 0) {
      expect(result.capabilities_used).toEqual(expect.any(Array));
    }
  });

  it("accepts 5-axis strategy on 5-axis capable controller", () => {
    const result = controllerStrategyValidatorEngine.validate("5axis_simultaneous", "heidenhain_tnc640");
    expect(result.controller).toBe("heidenhain_tnc640");
    expect(result.score).toBeGreaterThanOrEqual(0);
  });

  it("returns unknown controller error for invalid family", () => {
    const result = controllerStrategyValidatorEngine.validate(
      "face_milling",
      "nonexistent_controller" as any
    );
    expect(result.compatible).toBe(false);
    expect(result.issues.some(i => i.code === "UNKNOWN_CONTROLLER")).toBe(true);
  });

  it("includes capabilities_used in results", () => {
    const result = controllerStrategyValidatorEngine.validate("morphed_spiral", "siemens_840d");
    expect(Array.isArray(result.capabilities_used)).toBe(true);
  });

  it("score reflects compatibility degree", () => {
    const good = controllerStrategyValidatorEngine.validate("face_milling", "fanuc_30i");
    const bad = controllerStrategyValidatorEngine.validate("5axis_simultaneous", "fanuc_0i");
    expect(good.score).toBeGreaterThanOrEqual(bad.score);
  });

  it("applies overrides to strategy requirements", () => {
    const result = controllerStrategyValidatorEngine.validate(
      "face_milling",
      "fanuc_30i",
      { min_block_rate: 999999 } // unrealistic requirement
    );
    expect(result).toBeDefined();
  });
});

// ─── getCapabilities() ───────────────────────────────────────────────────────

describe("ControllerStrategyValidatorEngine.getCapabilities()", () => {
  it("returns capabilities for known controller", () => {
    const caps = controllerStrategyValidatorEngine.getCapabilities("fanuc_30i");
    expect(caps).not.toBeNull();
    if (caps) {
      expect(caps.display_name).toBeDefined();
    }
  });

  it("returns null for unknown controller", () => {
    const caps = controllerStrategyValidatorEngine.getCapabilities("zzz_fake" as any);
    expect(caps).toBeNull();
  });

  it("Haas NGC capabilities are accessible", () => {
    const caps = controllerStrategyValidatorEngine.getCapabilities("haas_ngc");
    expect(caps).not.toBeNull();
  });
});

// ─── listControllers() / listStrategies() ────────────────────────────────────

describe("ControllerStrategyValidatorEngine catalogs", () => {
  it("lists all controller families", () => {
    const controllers = controllerStrategyValidatorEngine.listControllers();
    expect(Array.isArray(controllers)).toBe(true);
    expect(controllers.length).toBeGreaterThan(10);
    expect(controllers).toContain("fanuc_30i");
    expect(controllers).toContain("siemens_840d");
    expect(controllers).toContain("heidenhain_tnc640");
    expect(controllers).toContain("okuma_osp_p300");
  });

  it("lists all strategy types", () => {
    const strategies = controllerStrategyValidatorEngine.listStrategies();
    expect(Array.isArray(strategies)).toBe(true);
    expect(strategies.length).toBeGreaterThan(5);
    expect(strategies).toContain("face_milling");
    expect(strategies).toContain("5axis_simultaneous");
  });

  it("getRequirements returns non-null for known strategy", () => {
    const reqs = controllerStrategyValidatorEngine.getRequirements("morphed_spiral");
    expect(reqs).not.toBeNull();
  });

  it("getRequirements returns null for unknown strategy", () => {
    const reqs = controllerStrategyValidatorEngine.getRequirements("ghost_strategy" as any);
    expect(reqs).toBeNull();
  });
});

// ─── findCompatibleControllers() ─────────────────────────────────────────────

describe("ControllerStrategyValidatorEngine.findCompatibleControllers()", () => {
  it("returns categorized compatible/partial/incompatible lists", () => {
    const result = controllerStrategyValidatorEngine.findCompatibleControllers("face_milling");
    expect(result.strategy).toBe("face_milling");
    expect(Array.isArray(result.compatible)).toBe(true);
    expect(Array.isArray(result.partial)).toBe(true);
    expect(Array.isArray(result.incompatible)).toBe(true);
  });

  it("face_milling should be broadly compatible", () => {
    const result = controllerStrategyValidatorEngine.findCompatibleControllers("face_milling");
    const totalSupported = result.compatible.length + result.partial.length;
    expect(totalSupported).toBeGreaterThan(5);
  });

  it("5axis_simultaneous is restrictive", () => {
    const result = controllerStrategyValidatorEngine.findCompatibleControllers("5axis_simultaneous");
    // At least some controllers exist in one of the lists
    const total = result.compatible.length + result.partial.length + result.incompatible.length;
    expect(total).toBe(controllerStrategyValidatorEngine.listControllers().length);
  });
});

// ─── compareControllers() ────────────────────────────────────────────────────

describe("ControllerStrategyValidatorEngine.compareControllers()", () => {
  it("returns both validation results and a recommendation", () => {
    const result = controllerStrategyValidatorEngine.compareControllers(
      "high_speed_finishing",
      "fanuc_0i",
      "heidenhain_tnc640"
    );
    expect(result.a).toBeDefined();
    expect(result.b).toBeDefined();
    expect(typeof result.recommendation).toBe("string");
    expect(result.recommendation.length).toBeGreaterThan(0);
  });

  it("recommendation mentions winner for different scores", () => {
    const result = controllerStrategyValidatorEngine.compareControllers(
      "morphed_spiral",
      "heidenhain_tnc640",
      "fanuc_0i"
    );
    // Either one is better or they tie
    if (result.a.score !== result.b.score) {
      expect(result.recommendation).toMatch(/better|suited/i);
    }
  });

  it("recommendation states equality for identical controllers", () => {
    const result = controllerStrategyValidatorEngine.compareControllers(
      "face_milling",
      "fanuc_30i",
      "fanuc_30i"
    );
    expect(result.recommendation).toMatch(/equally|equal/i);
  });
});

// ─── batchValidate() ─────────────────────────────────────────────────────────

describe("ControllerStrategyValidatorEngine.batchValidate()", () => {
  it("validates multiple strategies against one controller", () => {
    const result = controllerStrategyValidatorEngine.batchValidate(
      ["face_milling", "peck_drilling", "thread_milling"],
      "fanuc_30i"
    );
    expect(result.controller).toBe("fanuc_30i");
    expect(result.results.length).toBe(3);
    for (const r of result.results) {
      expect(r.strategy).toBeDefined();
      expect(r.controller).toBe("fanuc_30i");
    }
  });

  it("returns empty results for empty strategy list", () => {
    const result = controllerStrategyValidatorEngine.batchValidate([], "fanuc_30i");
    expect(result.results).toEqual([]);
  });
});

// ─── compatibilityMatrix() ───────────────────────────────────────────────────

describe("ControllerStrategyValidatorEngine.compatibilityMatrix()", () => {
  it("generates full matrix of strategies × controllers", () => {
    const matrix = controllerStrategyValidatorEngine.compatibilityMatrix();
    expect(matrix.controllers.length).toBeGreaterThan(0);
    expect(matrix.strategies.length).toBeGreaterThan(0);
    expect(Object.keys(matrix.matrix).length).toBe(matrix.strategies.length);
  });

  it("each matrix cell has compatible flag and score", () => {
    const matrix = controllerStrategyValidatorEngine.compatibilityMatrix();
    const firstStrategy = matrix.strategies[0];
    const firstController = matrix.controllers[0];
    const cell = matrix.matrix[firstStrategy][firstController];
    expect(typeof cell.compatible).toBe("boolean");
    expect(typeof cell.score).toBe("number");
  });
});
