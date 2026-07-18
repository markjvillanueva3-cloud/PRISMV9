/**
 * Wiring test for U-WIRE-WEDM-PROGRAM-COMPARE-1 — wires WEDMProgramComparisonEngine
 * into the `prism_edm` dispatcher as action `wedm_program_compare`.
 *
 * This is the linchpin of the operator's program-improvement workflow: feed in
 * a real-shop reference WEDM NC program and a PRISM-generated proposal, get back
 * a per-parameter deviation report + weighted match score + production_ready gate.
 *
 * Tests verify:
 *   1. enum/case/schema 3-way wiring registration in edmDispatcher;
 *   2. schema accepts a realistic input shape and rejects malformed input;
 *   3. the engine consumes the same schema-validated input shape and produces
 *      a deterministic, structurally-correct report.
 */
import { describe, it, expect } from "vitest";
import { promises as fsp } from "node:fs";
import path from "node:path";
import { wedmProgramComparisonEngine } from "../engines/WEDMProgramComparisonEngine.js";

const ACTION = "wedm_program_compare";

describe("U-WIRE-WEDM-PROGRAM-COMPARE-1 — dispatcher wiring registration", () => {
  it("registers the action in edmDispatcher with exactly one case body AND a distinct enum entry", async () => {
    const src = await fsp.readFile(
      path.resolve(__dirname, "..", "tools", "dispatchers", "edmDispatcher.ts"),
      "utf8",
    );
    const caseBodies = src.split(`case "${ACTION}":`).length - 1;
    expect(caseBodies).toBe(1);
    const totalQuoted = src.split(`"${ACTION}"`).length - 1;
    expect(totalQuoted - caseBodies).toBeGreaterThanOrEqual(1); // enum entry separate from case label
  });

  it("registers the schema in EDM_ACTION_SCHEMAS with a working safeParse", async () => {
    const { EDM_ACTION_SCHEMAS } = await import("../schemas/edmActionSchemas.js");
    expect(typeof EDM_ACTION_SCHEMAS[ACTION]?.safeParse).toBe("function");
  });
});

describe("wedm_program_compare — schema acceptance + rejection", () => {
  it("schema accepts the minimal valid shape (just reference_nc + generated_nc)", async () => {
    const { EDM_ACTION_SCHEMAS } = await import("../schemas/edmActionSchemas.js");
    expect(
      EDM_ACTION_SCHEMAS[ACTION]!.safeParse({
        reference_nc: "G92 X0 Y0\nM02\n",
        generated_nc: "G92 X0 Y0\nM02\n",
      }).success,
    ).toBe(true);
  });

  it("schema rejects empty reference_nc", async () => {
    const { EDM_ACTION_SCHEMAS } = await import("../schemas/edmActionSchemas.js");
    expect(
      EDM_ACTION_SCHEMAS[ACTION]!.safeParse({
        reference_nc: "",
        generated_nc: "G92 X0 Y0\n",
      }).success,
    ).toBe(false);
  });

  it("schema rejects empty generated_nc", async () => {
    const { EDM_ACTION_SCHEMAS } = await import("../schemas/edmActionSchemas.js");
    expect(
      EDM_ACTION_SCHEMAS[ACTION]!.safeParse({
        reference_nc: "G92 X0 Y0\n",
        generated_nc: "",
      }).success,
    ).toBe(false);
  });

  it("schema rejects a negative offset_rel_tol", async () => {
    const { EDM_ACTION_SCHEMAS } = await import("../schemas/edmActionSchemas.js");
    expect(
      EDM_ACTION_SCHEMAS[ACTION]!.safeParse({
        reference_nc: "G92\n",
        generated_nc: "G92\n",
        tolerances: { offset_rel_tol: -0.1 },
      }).success,
    ).toBe(false);
  });
});

describe("wedm_program_compare — engine produces structurally-correct report", () => {
  it("identical inputs → overall_match 1.0, grade excellent, production_ready true", () => {
    const same = "G92 X0 Y0\nM02\n";
    const r = wedmProgramComparisonEngine.compare(same, same);
    // Same parser output for both sides → every comparator returns 1.0 →
    // weighted score = 1.0 exactly, grade is the top band, no critical deviations.
    expect(r.overall_match).toBe(1);
    expect(r.overall_grade).toBe("excellent");
    expect(r.production_ready).toBe(true);
    // The 9 per-parameter deviations the compare() walks are all emitted.
    expect(r.deviations).toHaveLength(9);
    expect(r.deviations.every((d) => d.severity === "match")).toBe(true);
  });

  it("uses the caller-supplied filenames in the report", () => {
    const r = wedmProgramComparisonEngine.compare("G92\n", "G92\n", {
      reference_filename: "shop_PRG001.nc",
      generated_filename: "wizard_PRG001.nc",
    });
    expect(r.reference_filename).toBe("shop_PRG001.nc");
    expect(r.generated_filename).toBe("wizard_PRG001.nc");
    // The summary string embeds both filenames + the 100% match.
    expect(r.summary.includes("shop_PRG001.nc")).toBe(true);
    expect(r.summary.includes("wizard_PRG001.nc")).toBe(true);
    expect(r.summary.includes("100.0%")).toBe(true);
  });

  it("is deterministic — identical inputs yield identical reports", () => {
    const a = wedmProgramComparisonEngine.compare("G92\nM02\n", "G92\nM02\n");
    const b = wedmProgramComparisonEngine.compare("G92\nM02\n", "G92\nM02\n");
    expect(a).toEqual(b);
  });
});
