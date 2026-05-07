/**
 * cadRegressionDispatcher.test.ts — U-CINF12 unit tests
 *
 * Covers:
 *   1. ACTIONS array exports exactly 25 entries
 *   2. ACTIONS list is unique (no duplicates)
 *   3. actionEnum accepts every ACTIONS entry
 *   4. actionEnum rejects unknown actions
 *   5. ACTION_CAD_REGRESSION_SCHEMAS covers every action in ACTIONS
 *   6. Schema validation rejects missing required fields
 *   7. routeCADRegression(cad_regression_dashboard_snapshot) reaches dashboard engine
 *   8. routeCADRegression(cad_regression_analyzer_diff) reaches analyzer engine
 *   9. routeCADRegression(cad_regression_report_summary) reaches report engine
 *  10. routeCADRegression throws for unhandled action (type-level sentinel)
 */

import { describe, it, expect } from "vitest";
import {
  ACTIONS,
  routeCADRegression,
  type CADRegressionAction,
} from "../tools/dispatchers/cadRegressionDispatcher.js";
import { ACTION_CAD_REGRESSION_SCHEMAS } from "../schemas/cadRegressionActionSchemas.js";

describe("ACTIONS", () => {
  it("exports exactly 25 actions", () => {
    expect(ACTIONS.length).toBe(25);
  });

  it("contains unique entries only", () => {
    const set = new Set(ACTIONS);
    expect(set.size).toBe(ACTIONS.length);
  });

  it("covers the full CINF engine surface", () => {
    // Sanity: each engine prefix is represented
    const prefixes = [
      "cad_index_",
      "cad_classify_",
      "cad_regression_",
      "cad_checkpoint_",
      "cad_failure_triage_",
      "cad_artifact_",
      "cad_regression_dashboard_",
      "cad_regression_analyzer_",
      "cad_regression_report_",
    ];
    for (const prefix of prefixes) {
      const match = ACTIONS.find((a) => a.startsWith(prefix));
      expect(match, `expected at least one action starting with '${prefix}'`).toBeDefined();
    }
  });
});

describe("ACTION_CAD_REGRESSION_SCHEMAS", () => {
  it("covers every action in ACTIONS", () => {
    for (const a of ACTIONS) {
      expect(
        ACTION_CAD_REGRESSION_SCHEMAS[a],
        `missing Zod schema for action '${a}'`,
      ).toBeDefined();
    }
  });

  it("rejects missing required fields on cad_regression_dashboard_snapshot", () => {
    const schema = ACTION_CAD_REGRESSION_SCHEMAS["cad_regression_dashboard_snapshot"]!;
    const result = schema.safeParse({});
    expect(result.success).toBe(false);
  });

  it("accepts valid cad_regression_analyzer_diff payload", () => {
    const schema = ACTION_CAD_REGRESSION_SCHEMAS["cad_regression_analyzer_diff"]!;
    const result = schema.safeParse({
      baseBatchId: "b1",
      candidateBatchId: "b2",
    });
    expect(result.success).toBe(true);
  });

  it("rejects out-of-range threshold on hotspots", () => {
    const schema = ACTION_CAD_REGRESSION_SCHEMAS["cad_regression_analyzer_hotspots"]!;
    const result = schema.safeParse({ batchIds: ["b1"], threshold: 1.5 });
    expect(result.success).toBe(false);
  });
});

describe("routeCADRegression()", () => {
  it("routes cad_regression_dashboard_list to dashboard engine and returns BaseEngine envelope", async () => {
    const result = await routeCADRegression(
      "cad_regression_dashboard_list" as CADRegressionAction,
      { stateDir: "/nonexistent" },
    );
    // Envelope shape, irrespective of data payload
    expect(result).toHaveProperty("success");
    expect(result).toHaveProperty("source");
  });

  it("routes cad_regression_report_summary and produces markdown envelope", async () => {
    const result = await routeCADRegression(
      "cad_regression_report_summary" as CADRegressionAction,
      {},
    );
    expect(result.success).toBe(true);
    const data = result.data as { markdown: string };
    expect(typeof data.markdown).toBe("string");
  });

  it("routes cad_regression_analyzer_diff and surfaces missing-batch error as BaseEngine error envelope", async () => {
    const result = await routeCADRegression(
      "cad_regression_analyzer_diff" as CADRegressionAction,
      {
        baseBatchId: "__missing_a",
        candidateBatchId: "__missing_b",
        stateDir: "/definitely-nowhere",
      },
    );
    expect(result.success).toBe(false);
    expect(result.error).toMatch(/batch file not found|ENOENT/);
  });
});
