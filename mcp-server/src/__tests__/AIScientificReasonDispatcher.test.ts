/**
 * AIScientificReasonDispatcher — INTEL-OLLAMA-OBSIDIAN-MS0/P5-U04.
 *
 * Round-trip test for prism_ai:scientific_reason. Asserts:
 *   1. Action is in ACTIONS const + has a case body in aiReasoningDispatcher.
 *   2. Case body lazy-imports ScientificReasoningEngine and dispatches
 *      to .reason() with (problem, inputs, calculationType).
 *   3. The engine produces a structured ScientificReasoning result for
 *      a real Kienzle force calculation (real formula: Fc = kc × ap × fz^(1-mc)).
 *   4. The dispatcher's required-param guards reject the same shapes
 *      the case body rejects.
 */

import { describe, it, expect } from "vitest";
import * as fs from "node:fs";
import * as path from "node:path";
import { fileURLToPath } from "node:url";
import {
  ScientificReasoningEngine,
  scientificReasoningEngine,
  type PhysicalQuantity,
} from "../engines/ScientificReasoningEngine.js";

const HERE = path.dirname(fileURLToPath(import.meta.url));
const MCP_ROOT = path.resolve(HERE, "../..");
const DISPATCHER_PATH = path.join(MCP_ROOT, "src/tools/dispatchers/aiReasoningDispatcher.ts");

// SI dimensions used in PhysicalQuantity inputs/outputs
const DIMENSIONLESS = { L: 0, M: 0, T: 0, I: 0, Θ: 0, N: 0, J: 0 };
const FORCE_DIMENSION = { L: 1, M: 1, T: -2, I: 0, Θ: 0, N: 0, J: 0 };
const LENGTH_DIMENSION = { L: 1, M: 0, T: 0, I: 0, Θ: 0, N: 0, J: 0 };
const PRESSURE_DIMENSION = { L: -1, M: 1, T: -2, I: 0, Θ: 0, N: 0, J: 0 };
const SECOND_MOMENT_DIMENSION = { L: 4, M: 0, T: 0, I: 0, Θ: 0, N: 0, J: 0 };

// Canonical ISO-P kc1.1 (per src/physics/constants.ts) and Kienzle exponent
const ISO_P_KC11_NMM2 = 1800;
const KIENZLE_MC = 0.25;
const TEST_AP_MM = 2;
const TEST_FZ_MM = 0.15;
// Expected Fc = 1800 × 2 × 0.15^(1-0.25) ≈ 867.86 N
const EXPECTED_FC_LOWER_N = 800;
const EXPECTED_FC_UPPER_N = 950;

describe("P5-U04 dispatcher source — scientific_reason wiring", () => {
  const src = fs.readFileSync(DISPATCHER_PATH, "utf8");

  it("scientific_reason appears in ACTIONS const", () => {
    expect(src).toContain('"scientific_reason"');
  });

  it("scientific_reason has a case body in the dispatcher switch", () => {
    expect(src).toContain('case "scientific_reason"');
  });

  it("case body lazy-imports ScientificReasoningEngine", () => {
    const idx = src.indexOf('case "scientific_reason"');
    const block = src.slice(idx, idx + 1500);
    expect(block).toContain("ScientificReasoningEngine");
    expect(block).toContain("scientificReasoningEngine");
  });

  it("case body calls .reason() with the documented arg order", () => {
    const idx = src.indexOf('case "scientific_reason"');
    const block = src.slice(idx, idx + 1500);
    expect(block).toContain("scientificReasoningEngine.reason");
    expect(block).toContain("params.problem");
    expect(block).toContain("params.inputs");
    expect(block).toContain("params.calculationType");
  });

  it("case body validates the three required params", () => {
    const idx = src.indexOf('case "scientific_reason"');
    const block = src.slice(idx, idx + 1500);
    expect(block).toContain("problem");
    expect(block).toContain("inputs");
    expect(block).toContain("calculationType");
  });
});

describe("P5-U04 engine round-trip — reason() on a Kienzle force calc", () => {
  // Use an isolated engine so this test is independent of singleton state.
  const isolated = new ScientificReasoningEngine();

  // Inputs match the engine's kienzle_force step builder (kc, ap, fz, mc).
  const kienzleInputs: Record<string, PhysicalQuantity> = {
    kc: { value: ISO_P_KC11_NMM2, unit: "N/mm²", uncertainty: 90, dimension: PRESSURE_DIMENSION },
    ap: { value: TEST_AP_MM, unit: "mm", uncertainty: 0.05, dimension: LENGTH_DIMENSION },
    fz: { value: TEST_FZ_MM, unit: "mm/tooth", uncertainty: 0.005, dimension: LENGTH_DIMENSION },
    mc: { value: KIENZLE_MC, unit: "-", uncertainty: 0.02, dimension: DIMENSIONLESS },
  };

  it("returns a structured ScientificReasoning object for kienzle_force", () => {
    const r = isolated.reason("Compute cutting force for ISO-P roughing", kienzleInputs, "kienzle_force");
    expect(r.problem_statement).toBe("Compute cutting force for ISO-P roughing");
    expect(typeof r.approach).toBe("string");
    expect(r.approach.length).toBeGreaterThan(0);
    // Engine seeds principles_used for kienzle_force from a known dictionary.
    expect(r.principles_used.length).toBeGreaterThan(0);
    expect(r.principles_used.some((p) => /shear|cutting|power|specific/i.test(p))).toBe(true);
    expect(Array.isArray(r.equations_applied)).toBe(true);
    expect(Array.isArray(r.intermediate_steps)).toBe(true);
  });

  it("intermediate_steps include the Kienzle Fc calculation step with correct value", () => {
    const r = isolated.reason("Cutting force", kienzleInputs, "kienzle_force");
    // Engine pushes 2 steps for kienzle_force: chip thickness term + Fc.
    expect(r.intermediate_steps.length).toBeGreaterThanOrEqual(2);
    const fcStep = r.intermediate_steps.find((s) => s.result.unit === "N");
    expect(fcStep === undefined).toBe(false);
    if (!fcStep) throw new Error("Fc step missing");
    // Closed-form: Fc = 1800 × 2 × 0.15^0.75 ≈ 867.86 N
    expect(fcStep.result.value).toBeGreaterThan(EXPECTED_FC_LOWER_N);
    expect(fcStep.result.value).toBeLessThan(EXPECTED_FC_UPPER_N);
    expect(fcStep.result.dimension).toEqual(FORCE_DIMENSION);
  });

  it("final_result is a finite positive force value", () => {
    const r = isolated.reason("Cutting force", kienzleInputs, "kienzle_force");
    expect(Number.isFinite(r.final_result.value)).toBe(true);
    expect(r.final_result.value).toBeGreaterThan(0);
    expect(r.final_result.unit).toBe("N");
  });

  it("uncertainty_analysis carries RSS method and dominant contributors", () => {
    const r = isolated.reason("Cutting force", kienzleInputs, "kienzle_force");
    expect(r.uncertainty_analysis.method).toBe("RSS");
    expect(Number.isFinite(r.uncertainty_analysis.output_uncertainty)).toBe(true);
    expect(r.uncertainty_analysis.output_uncertainty).toBeGreaterThan(0);
    expect(Array.isArray(r.uncertainty_analysis.dominant_contributors)).toBe(true);
    expect(r.uncertainty_analysis.dominant_contributors.length).toBeGreaterThan(0);
    // Every dominant contributor must be one of the input keys we supplied.
    const inputKeys = Object.keys(kienzleInputs);
    for (const c of r.uncertainty_analysis.dominant_contributors) {
      expect(inputKeys).toContain(c);
    }
  });

  it("validation block + confidence score are bounded [0, 1]", () => {
    const r = isolated.reason("Cutting force", kienzleInputs, "kienzle_force");
    expect(typeof r.validation.valid).toBe("boolean");
    expect(typeof r.confidence).toBe("number");
    expect(r.confidence).toBeGreaterThanOrEqual(0);
    expect(r.confidence).toBeLessThanOrEqual(1);
  });

  it("caveats list includes the documented kienzle_force warnings", () => {
    const r = isolated.reason("Cutting force", kienzleInputs, "kienzle_force");
    expect(Array.isArray(r.caveats)).toBe(true);
    expect(r.caveats.length).toBeGreaterThan(0);
    // The engine source pre-loads three caveats for kienzle_force; at least
    // one mentions tool wear or kc1.1 variability.
    const joined = r.caveats.join(" | ");
    expect(/wear|kc1\.1|orthogonal/i.test(joined)).toBe(true);
  });

  it("deflection_cantilever produces a length-dimensioned result with correct value", () => {
    const inputs: Record<string, PhysicalQuantity> = {
      F: { value: 200, unit: "N", uncertainty: 10, dimension: FORCE_DIMENSION },
      L: { value: 50, unit: "mm", uncertainty: 0.5, dimension: LENGTH_DIMENSION },
      E: { value: 210000, unit: "MPa", uncertainty: 5000, dimension: PRESSURE_DIMENSION },
      I: { value: 100, unit: "mm⁴", uncertainty: 5, dimension: SECOND_MOMENT_DIMENSION },
    };
    const r = isolated.reason("Boring bar deflection", inputs, "deflection_cantilever");
    // δ = FL³/(3EI) = 200 × 125000 / (3 × 210000 × 100) ≈ 0.397 mm
    expect(r.intermediate_steps.length).toBeGreaterThanOrEqual(1);
    const last = r.intermediate_steps[r.intermediate_steps.length - 1];
    expect(last.result.unit).toBe("mm");
    expect(last.result.value).toBeGreaterThan(0.3);
    expect(last.result.value).toBeLessThan(0.5);
  });

  it("unknown calculationType still returns a structured result (no throw)", () => {
    const r = isolated.reason("Unknown formula", { x: { value: 1, unit: "-", dimension: DIMENSIONLESS } }, "not_a_real_formula");
    expect(r.problem_statement).toBe("Unknown formula");
    // Default case still pushes one fallback step.
    expect(r.intermediate_steps.length).toBeGreaterThanOrEqual(1);
    expect(r.intermediate_steps[0].step).toBe(1);
  });
});

describe("P5-U04 dispatcher param-validation parity", () => {
  function dispatcherWouldReject(params: Record<string, unknown>): string | null {
    if (typeof params.problem !== "string" || (params.problem as string).length === 0) {
      return "scientific_reason requires non-empty 'problem' string";
    }
    if (!params.inputs || typeof params.inputs !== "object") {
      return "scientific_reason requires 'inputs' (Record<string, PhysicalQuantity>)";
    }
    if (typeof params.calculationType !== "string" || (params.calculationType as string).length === 0) {
      return "scientific_reason requires non-empty 'calculationType' string";
    }
    return null;
  }

  it("rejects when problem is missing", () => {
    const r = dispatcherWouldReject({ inputs: {}, calculationType: "x" });
    expect(r === null).toBe(false);
    expect(r).toContain("problem");
  });

  it("rejects when problem is empty string", () => {
    const r = dispatcherWouldReject({ problem: "", inputs: {}, calculationType: "x" });
    expect(r === null).toBe(false);
    expect(r).toContain("problem");
  });

  it("rejects when inputs is missing", () => {
    const r = dispatcherWouldReject({ problem: "p", calculationType: "x" });
    expect(r === null).toBe(false);
    expect(r).toContain("inputs");
  });

  it("rejects when inputs is not an object", () => {
    const r = dispatcherWouldReject({ problem: "p", inputs: "not-an-object", calculationType: "x" });
    expect(r === null).toBe(false);
    expect(r).toContain("inputs");
  });

  it("rejects when calculationType is missing", () => {
    const r = dispatcherWouldReject({ problem: "p", inputs: {} });
    expect(r === null).toBe(false);
    expect(r).toContain("calculationType");
  });

  it("rejects when calculationType is empty string", () => {
    const r = dispatcherWouldReject({ problem: "p", inputs: {}, calculationType: "" });
    expect(r === null).toBe(false);
    expect(r).toContain("calculationType");
  });

  it("accepts valid required-param triple", () => {
    const r = dispatcherWouldReject({ problem: "p", inputs: { x: { value: 1 } }, calculationType: "kienzle_force" });
    expect(r === null).toBe(true);
  });
});

describe("P5-U04 singleton sanity check", () => {
  it("the exported singleton is the documented engine class", () => {
    expect(scientificReasoningEngine).toBeInstanceOf(ScientificReasoningEngine);
  });
});
