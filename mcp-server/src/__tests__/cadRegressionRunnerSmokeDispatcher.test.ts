/**
 * Dispatcher round-trip test for `cad_regression_runner_smoke` (U-CINF04.x).
 *
 * Verifies:
 *   - Action is in ACTIONS enum (anti-regression — never drop)
 *   - Schema validates required + accepts optional fields
 *   - Schema rejects bad input (empty tasks, unsafe poolSize)
 *   - routeCADRegression() actually invokes the runner and returns
 *     {results, stats} with `stats.terminated: true`
 *   - End-to-end: dispatcher constructs runner → spawns workers →
 *     dispatches tasks → workers echo → results aggregated → pool terminates
 */

import { describe, it, expect } from "vitest";
import {
  ACTIONS,
  routeCADRegression,
  type CADRegressionAction,
} from "../tools/dispatchers/cadRegressionDispatcher.js";
import { ACTION_CAD_REGRESSION_SCHEMAS } from "../schemas/cadRegressionActionSchemas.js";

describe("dispatcher wire — cad_regression_runner_smoke", () => {
  it("action is in ACTIONS enum", () => {
    expect(ACTIONS.includes("cad_regression_runner_smoke" as CADRegressionAction)).toBe(true);
  });

  it("schema exists in ACTION_CAD_REGRESSION_SCHEMAS", () => {
    expect("cad_regression_runner_smoke" in ACTION_CAD_REGRESSION_SCHEMAS).toBe(true);
  });

  it("schema validates a well-formed payload", () => {
    const schema = ACTION_CAD_REGRESSION_SCHEMAS.cad_regression_runner_smoke;
    const out = schema?.safeParse({
      tasks: [
        {
          fileId: "wire-1",
          absolutePath: "/tmp/x.sldprt",
          format: "sldprt",
          testStrategy: "part-validate",
        },
      ],
    });
    expect(out?.success).toBe(true);
  });

  it("schema rejects empty tasks array", () => {
    const schema = ACTION_CAD_REGRESSION_SCHEMAS.cad_regression_runner_smoke;
    const out = schema?.safeParse({ tasks: [] });
    expect(out?.success).toBe(false);
  });

  it("schema rejects tasks > 100 (resource bound)", () => {
    const schema = ACTION_CAD_REGRESSION_SCHEMAS.cad_regression_runner_smoke;
    const tasks = Array.from({ length: 101 }, (_, i) => ({
      fileId: `t-${i}`,
      absolutePath: `/tmp/${i}.x`,
      format: "x",
      testStrategy: "x",
    }));
    const out = schema?.safeParse({ tasks });
    expect(out?.success).toBe(false);
  });

  it("schema rejects poolSize > 16 (resource ceiling)", () => {
    const schema = ACTION_CAD_REGRESSION_SCHEMAS.cad_regression_runner_smoke;
    const out = schema?.safeParse({
      tasks: [{ fileId: "x", absolutePath: "/x", format: "x", testStrategy: "x" }],
      poolSize: 100,
    });
    expect(out?.success).toBe(false);
  });

  it("schema rejects invalid task handler enum", () => {
    const schema = ACTION_CAD_REGRESSION_SCHEMAS.cad_regression_runner_smoke;
    const out = schema?.safeParse({
      tasks: [
        { fileId: "x", absolutePath: "/x", format: "x", testStrategy: "x", handler: "explode" },
      ],
    });
    expect(out?.success).toBe(false);
  });

  it("round-trip: routeCADRegression runs 3 tasks through the pool, returns stats", async () => {
    const out = (await routeCADRegression("cad_regression_runner_smoke", {
      tasks: [
        { fileId: "wire-a", absolutePath: "/x/a", format: "sldprt", testStrategy: "part-validate" },
        { fileId: "wire-b", absolutePath: "/x/b", format: "sldprt", testStrategy: "part-validate" },
        { fileId: "wire-c", absolutePath: "/x/c", format: "sldprt", testStrategy: "part-validate" },
      ],
      poolSize: 2,
    })) as { results: Array<{ fileId: string; status: string }>; stats: { tasksSucceeded: number; terminated: boolean } };

    expect(out.results).toHaveLength(3);
    expect(out.results.map((r) => r.fileId).sort()).toEqual(["wire-a", "wire-b", "wire-c"]);
    expect(out.results.every((r) => r.status === "pass")).toBe(true);
    expect(out.stats.tasksSucceeded).toBe(3);
    expect(out.stats.terminated).toBe(true);
  });

  it("round-trip: handler=fail produces fail status with comparison error", async () => {
    const out = (await routeCADRegression("cad_regression_runner_smoke", {
      tasks: [
        {
          fileId: "wire-fail",
          absolutePath: "/x/fail",
          format: "sldprt",
          testStrategy: "part-validate",
          handler: "fail",
        },
      ],
    })) as { results: Array<{ status: string; errorType: string }> };

    expect(out.results[0].status).toBe("fail");
    expect(out.results[0].errorType).toBe("comparison");
  });

  it("round-trip: poolSize default works (no value passed)", async () => {
    const out = (await routeCADRegression("cad_regression_runner_smoke", {
      tasks: [{ fileId: "wire-default", absolutePath: "/x/d", format: "sldprt", testStrategy: "part-validate" }],
    })) as { results: Array<{ status: string }>; stats: { terminated: boolean } };

    expect(out.results[0].status).toBe("pass");
    expect(out.stats.terminated).toBe(true);
  });

  it("action enum did not lose any pre-existing actions (anti-regression floor)", () => {
    // Snapshot of pre-U-CINF04.x action count: 30 (per dispatcher JSDoc)
    // After adding cad_regression_runner_smoke: 31.
    expect(ACTIONS.length).toBeGreaterThanOrEqual(31);
    // Sanity: a sample of the existing actions still present
    const sample: CADRegressionAction[] = [
      "cad_index_run",
      "cad_classify_run",
      "cad_regression_run",
      "cad_checkpoint_save",
      "cad_failure_triage_one",
      "cad_artifact_write",
      "cad_regression_dashboard_snapshot",
      "cad_regression_analyzer_diff",
      "cad_regression_report_snapshot",
      "start_batch",
      "triage",
      "report",
    ];
    for (const a of sample) {
      expect(ACTIONS.includes(a)).toBe(true);
    }
  });
});
