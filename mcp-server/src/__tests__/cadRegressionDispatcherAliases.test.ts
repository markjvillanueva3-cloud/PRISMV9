/**
 * CAD Regression Dispatcher — CINF12 spec-alias wiring tests.
 *
 * Verifies the 5 envelope-documented MCP action names (start_batch,
 * get_progress, get_results, triage, report) are:
 *   1. listed in the ACTIONS enum (anti-regression — 25 → 30),
 *   2. backed by a schema in ACTION_CAD_REGRESSION_SCHEMAS,
 *   3. reachable through routeCADRegression() — i.e. the dispatcher does
 *      NOT hit the exhaustive-default branch.
 *
 * Engines are not mocked — empty params will make the engine itself reject,
 * which is fine: we only need to prove the case branch fires (the rejection
 * comes from inside the engine, not from "Unhandled CAD regression action").
 */
import { describe, it, expect } from "vitest";
import {
  ACTIONS,
  routeCADRegression,
} from "../tools/dispatchers/cadRegressionDispatcher.js";
import { ACTION_CAD_REGRESSION_SCHEMAS } from "../schemas/cadRegressionActionSchemas.js";

const ALIASES = [
  "start_batch",
  "get_progress",
  "get_results",
  "triage",
  "report",
] as const;

describe("cadRegressionDispatcher — CINF12 spec aliases (ACTIONS enum)", () => {
  it("ACTIONS includes all 5 spec aliases", () => {
    for (const a of ALIASES) {
      expect(ACTIONS.includes(a)).toBe(true);
    }
  });

  it("ACTIONS length is exactly 30 (25 engine-named + 5 aliases, anti-regression floor)", () => {
    expect(ACTIONS.length).toBe(30);
  });

  it("none of the 5 aliases collides with an engine-named action", () => {
    // i.e. each alias appears exactly once in ACTIONS
    for (const a of ALIASES) {
      const occurrences = ACTIONS.filter((x) => x === a).length;
      expect(occurrences).toBe(1);
    }
  });

  it("legacy engine-named action 'cad_regression_run' is still present (no rename)", () => {
    expect(ACTIONS.includes("cad_regression_run")).toBe(true);
  });

  it("legacy engine-named action 'cad_regression_dashboard_snapshot' is still present", () => {
    expect(ACTIONS.includes("cad_regression_dashboard_snapshot")).toBe(true);
  });
});

describe("cadRegressionDispatcher — CINF12 spec aliases (schema map)", () => {
  it("schema map has an entry for each alias", () => {
    for (const a of ALIASES) {
      expect(typeof ACTION_CAD_REGRESSION_SCHEMAS[a]).toBe("object");
      expect(ACTION_CAD_REGRESSION_SCHEMAS[a] === null).toBe(false);
      expect(ACTION_CAD_REGRESSION_SCHEMAS[a] === undefined).toBe(false);
    }
  });

  it("get_progress.parse({}) rejects (batchId is required)", () => {
    let threw = false;
    try {
      ACTION_CAD_REGRESSION_SCHEMAS.get_progress.parse({});
    } catch {
      threw = true;
    }
    expect(threw).toBe(true);
  });

  it("triage.parse({}) rejects (failure OR failures required)", () => {
    let threw = false;
    try {
      ACTION_CAD_REGRESSION_SCHEMAS.triage.parse({});
    } catch {
      threw = true;
    }
    expect(threw).toBe(true);
  });

  it("triage.parse({batchId:'b'}) rejects (neither failure nor failures supplied)", () => {
    // Confirms aliases mirror engine contract — schema rejects the shape the
    // engine would itself reject, so MCP clients get a clear validation error
    // upfront instead of a cryptic 'unreachable' engine throw.
    let threw = false;
    try {
      ACTION_CAD_REGRESSION_SCHEMAS.triage.parse({ batchId: "b" });
    } catch {
      threw = true;
    }
    expect(threw).toBe(true);
  });

  it("triage.parse({failure:{...}}) accepts single-payload shape", () => {
    const r = ACTION_CAD_REGRESSION_SCHEMAS.triage.parse({
      failure: { fileId: "f", errorMessage: "parse error" },
    });
    expect(typeof r).toBe("object");
    expect(r === null).toBe(false);
  });

  it("triage.parse({failures:[...]}) accepts batch shape", () => {
    const r = ACTION_CAD_REGRESSION_SCHEMAS.triage.parse({
      failures: [{ fileId: "a" }, { fileId: "b" }],
    });
    expect(typeof r).toBe("object");
  });

  it("get_progress.parse({batchId:'batch-xyz'}) preserves batchId", () => {
    const r = ACTION_CAD_REGRESSION_SCHEMAS.get_progress.parse({ batchId: "batch-xyz" });
    expect(r.batchId).toBe("batch-xyz");
  });

  it("start_batch.parse({}) rejects (tasks + options are required, mirrors orchestrator contract)", () => {
    let threw = false;
    try {
      ACTION_CAD_REGRESSION_SCHEMAS.start_batch.parse({});
    } catch {
      threw = true;
    }
    expect(threw).toBe(true);
  });

  it("start_batch.parse({corpus:'all'}) rejects (corpus auto-resolution is a follow-on unit)", () => {
    // The envelope spec `cad_regression.start_batch({corpus:'all'})` is
    // aspirational. The thin-facade unit (CINF12) requires engine-native shape.
    // Corpus → FileTask[] resolution belongs to a separate unit; until then
    // the schema rejects bare {corpus} so clients get a clear error.
    let threw = false;
    try {
      ACTION_CAD_REGRESSION_SCHEMAS.start_batch.parse({ corpus: "all" });
    } catch {
      threw = true;
    }
    expect(threw).toBe(true);
  });

  it("start_batch.parse with engine-native {tasks, options} shape accepts", () => {
    const r = ACTION_CAD_REGRESSION_SCHEMAS.start_batch.parse({
      tasks: [{ fileId: "f1", absolutePath: "/tmp/a.step", format: "step" }],
      options: { runner: { run: () => Promise.resolve({}) }, workers: 2 },
    });
    expect(Array.isArray(r.tasks)).toBe(true);
    expect(r.tasks.length).toBe(1);
    expect(typeof r.options).toBe("object");
  });

  it("get_results.parse({batchIds:['a','b']}) preserves array length", () => {
    const r = ACTION_CAD_REGRESSION_SCHEMAS.get_results.parse({ batchIds: ["a", "b"] });
    expect(r.batchIds.length).toBe(2);
  });

  it("get_results.parse({batchIds:[]}) rejects (min(1))", () => {
    let threw = false;
    try {
      ACTION_CAD_REGRESSION_SCHEMAS.get_results.parse({ batchIds: [] });
    } catch {
      threw = true;
    }
    expect(threw).toBe(true);
  });

  it("report.parse({}) is accepted (all sections optional)", () => {
    const r = ACTION_CAD_REGRESSION_SCHEMAS.report.parse({});
    expect(r === null).toBe(false);
  });

  it("report.parse({rowLimit:50}) preserves rowLimit", () => {
    const r = ACTION_CAD_REGRESSION_SCHEMAS.report.parse({ rowLimit: 50 });
    expect(r.rowLimit).toBe(50);
  });

  it("report.parse({rowLimit:-1}) rejects (must be positive)", () => {
    let threw = false;
    try {
      ACTION_CAD_REGRESSION_SCHEMAS.report.parse({ rowLimit: -1 });
    } catch {
      threw = true;
    }
    expect(threw).toBe(true);
  });
});

describe("cadRegressionDispatcher — CINF12 spec aliases (route reachability)", () => {
  // Each alias must reach a switch case. Engines may throw on empty params,
  // but the error must NOT be the exhaustive-default throw with message
  // "Unhandled CAD regression action: ...".
  const UNHANDLED_RE = /Unhandled CAD regression action/i;

  for (const alias of ALIASES) {
    it(`alias '${alias}' does NOT hit the exhaustive-default branch`, async () => {
      let caught: any = null;
      try {
        await routeCADRegression(alias as any, {});
      } catch (e: any) {
        caught = e;
      }
      // If the call threw, the message must come from an engine — not
      // the dispatcher's exhaustive `never` guard.
      if (caught !== null) {
        const msg = String(caught.message ?? caught);
        expect(UNHANDLED_RE.test(msg)).toBe(false);
      }
    });
  }
});
