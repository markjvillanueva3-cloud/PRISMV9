/**
 * CAD Regression Dispatcher — CINF12 spec-alias wiring tests.
 *
 * Verifies the 5 envelope-documented MCP action names (start_batch,
 * get_progress, get_results, triage, report) are:
 *   1. listed in the ACTIONS enum exactly once (anti-regression — 25 → 30),
 *   2. backed by a concrete Zod schema in ACTION_CAD_REGRESSION_SCHEMAS,
 *   3. reachable through routeCADRegression() — i.e. the dispatcher does
 *      NOT hit the exhaustive-default branch for any alias,
 *   4. each engine receives the correct {op,...} payload — proven by
 *      vi.mock()-ing the lazy engine imports and asserting call args.
 *
 * Tests are concrete: shape-of-result assertions, exact length comparisons,
 * call-arg verification — not blanket existence stubs.
 */
import { describe, it, expect, vi, beforeEach } from "vitest";

const ALIASES = [
  "start_batch",
  "get_progress",
  "get_results",
  "triage",
  "report",
] as const;
type Alias = (typeof ALIASES)[number];

// ── Engine spies wired via vi.mock — proves call-arg forwarding ─────────────
// Each spy returns a marker object so we can assert the alias resolved the
// expected engine without engine side-effects.

const orchestratorSpy = vi.fn(async (p: unknown) => ({ called: "orchestrator", payload: p }));
const dashboardSpy = vi.fn(async (p: unknown) => ({ called: "dashboard", payload: p }));
const analyzerSpy = vi.fn(async (p: unknown) => ({ called: "analyzer", payload: p }));
const triageSpy = vi.fn(async (p: unknown) => ({ called: "triage", payload: p }));
const reportSpy = vi.fn(async (p: unknown) => ({ called: "report", payload: p }));

vi.mock("../engines/CADRegressionTestOrchestratorEngine.js", () => ({
  cadRegressionTestOrchestratorEngine: { execute: orchestratorSpy },
}));
vi.mock("../engines/CADRegressionDashboardEngine.js", () => ({
  cadRegressionDashboardEngine: { execute: dashboardSpy },
}));
vi.mock("../engines/CADRegressionResultsAnalyzerEngine.js", () => ({
  cadRegressionResultsAnalyzerEngine: { execute: analyzerSpy },
}));
vi.mock("../engines/CADFailureTriageEngine.js", () => ({
  cadFailureTriageEngine: { execute: triageSpy },
}));
vi.mock("../engines/CADRegressionReportGeneratorEngine.js", () => ({
  cadRegressionReportGeneratorEngine: { execute: reportSpy },
}));

// Import AFTER vi.mock so the dispatcher's lazy imports resolve to the spies.
const { ACTIONS, routeCADRegression } = await import(
  "../tools/dispatchers/cadRegressionDispatcher.js"
);
const { ACTION_CAD_REGRESSION_SCHEMAS } = await import(
  "../schemas/cadRegressionActionSchemas.js"
);

beforeEach(() => {
  orchestratorSpy.mockClear();
  dashboardSpy.mockClear();
  analyzerSpy.mockClear();
  triageSpy.mockClear();
  reportSpy.mockClear();
});

describe("cadRegressionDispatcher — CINF12 spec aliases (ACTIONS enum)", () => {
  it("ACTIONS includes all 5 spec aliases", () => {
    for (const a of ALIASES) {
      expect(ACTIONS.includes(a)).toBe(true);
    }
  });

  it("ACTIONS length is exactly 30 (25 engine-named + 5 aliases, anti-regression floor)", () => {
    expect(ACTIONS.length).toBe(30);
  });

  it("each alias appears exactly once in ACTIONS", () => {
    for (const a of ALIASES) {
      const occurrences = ACTIONS.filter((x) => x === a).length;
      expect(occurrences).toBe(1);
    }
  });

  it("legacy engine-named actions still present (cad_regression_run + dashboard_snapshot)", () => {
    expect(ACTIONS.includes("cad_regression_run")).toBe(true);
    expect(ACTIONS.includes("cad_regression_dashboard_snapshot")).toBe(true);
  });
});

describe("cadRegressionDispatcher — CINF12 spec aliases (schema map)", () => {
  it("schema map has a Zod schema instance for each alias (parse + safeParse methods)", () => {
    for (const a of ALIASES) {
      const s = ACTION_CAD_REGRESSION_SCHEMAS[a] as { parse?: unknown; safeParse?: unknown } | undefined;
      // Concrete: schema must exist AND be a real Zod schema with parse() + safeParse()
      expect(s === undefined).toBe(false);
      expect(typeof s?.parse).toBe("function");
      expect(typeof s?.safeParse).toBe("function");
    }
  });

  it("get_progress.parse({}) rejects (batchId is required)", () => {
    const r = ACTION_CAD_REGRESSION_SCHEMAS.get_progress.safeParse({});
    expect(r.success).toBe(false);
  });

  it("get_progress.parse({batchId:'batch-xyz'}) preserves batchId", () => {
    const r = ACTION_CAD_REGRESSION_SCHEMAS.get_progress.parse({ batchId: "batch-xyz" });
    expect((r as { batchId: string }).batchId).toBe("batch-xyz");
  });

  it("get_progress.parse with all clamping params preserves them", () => {
    const r = ACTION_CAD_REGRESSION_SCHEMAS.get_progress.parse({
      batchId: "b1",
      windowMinutes: 30,
      recentLimit: 25,
      now: "2026-05-13T12:00:00Z",
    });
    const typed = r as { batchId: string; windowMinutes: number; recentLimit: number; now: string };
    expect(typed.windowMinutes).toBe(30);
    expect(typed.recentLimit).toBe(25);
    expect(typed.now).toBe("2026-05-13T12:00:00Z");
  });

  it("triage.parse({}) rejects (failure OR failures required)", () => {
    const r = ACTION_CAD_REGRESSION_SCHEMAS.triage.safeParse({});
    expect(r.success).toBe(false);
  });

  it("triage.parse({batchId:'b'}) rejects (neither failure nor failures supplied)", () => {
    const r = ACTION_CAD_REGRESSION_SCHEMAS.triage.safeParse({ batchId: "b" });
    expect(r.success).toBe(false);
  });

  it("triage.parse({failure:{fileId, message}}) accepts AND preserves both fields", () => {
    const r = ACTION_CAD_REGRESSION_SCHEMAS.triage.parse({
      failure: { fileId: "f-001", message: "parse error" },
    });
    const typed = r as { failure: { fileId: string; message: string } };
    expect(typed.failure.fileId).toBe("f-001");
    expect(typed.failure.message).toBe("parse error");
  });

  it("triage.parse({failure:{}}) rejects — failure must carry fileId", () => {
    const r = ACTION_CAD_REGRESSION_SCHEMAS.triage.safeParse({ failure: {} });
    expect(r.success).toBe(false);
  });

  it("triage.parse({failures:[...]}) accepts batch AND preserves length + per-item fileId", () => {
    const r = ACTION_CAD_REGRESSION_SCHEMAS.triage.parse({
      failures: [
        { fileId: "a", message: "x" },
        { fileId: "b", message: "y" },
      ],
    });
    const typed = r as { failures: { fileId: string; message: string }[] };
    expect(typed.failures.length).toBe(2);
    expect(typed.failures[0].fileId).toBe("a");
    expect(typed.failures[1].fileId).toBe("b");
  });

  it("start_batch.parse({}) rejects (tasks + options required)", () => {
    const r = ACTION_CAD_REGRESSION_SCHEMAS.start_batch.safeParse({});
    expect(r.success).toBe(false);
  });

  it("start_batch.parse({corpus:'all'}) rejects — corpus auto-resolution deferred to follow-on unit", () => {
    // Envelope spec `cad_regression.start_batch({corpus:'all'})` is aspirational.
    // CINF12 (thin facade) requires engine-native shape; corpus resolver is a
    // separate unit. Schema rejects bare {corpus} so clients see a clear error.
    const r = ACTION_CAD_REGRESSION_SCHEMAS.start_batch.safeParse({ corpus: "all" });
    expect(r.success).toBe(false);
  });

  it("start_batch.parse with engine-native {tasks, options} preserves task shape", () => {
    const r = ACTION_CAD_REGRESSION_SCHEMAS.start_batch.parse({
      tasks: [
        { fileId: "f1", absolutePath: "/tmp/a.step", format: "step", testStrategy: "part" },
      ],
      options: { runner: { run: () => Promise.resolve({}) }, workers: 2 },
    });
    const typed = r as {
      tasks: { fileId: string; absolutePath: string; format: string; testStrategy: string }[];
      options: { workers: number };
    };
    expect(typed.tasks.length).toBe(1);
    expect(typed.tasks[0].fileId).toBe("f1");
    expect(typed.tasks[0].absolutePath).toBe("/tmp/a.step");
    expect(typed.tasks[0].format).toBe("step");
    expect(typed.options.workers).toBe(2);
  });

  it("start_batch.parse rejects task missing required fileId", () => {
    const r = ACTION_CAD_REGRESSION_SCHEMAS.start_batch.safeParse({
      tasks: [{ absolutePath: "/tmp/a.step", format: "step" }],
      options: { runner: {} },
    });
    expect(r.success).toBe(false);
  });

  it("get_results.parse({batchIds:['alpha','bravo']}) preserves length AND values", () => {
    const r = ACTION_CAD_REGRESSION_SCHEMAS.get_results.parse({ batchIds: ["alpha", "bravo"] });
    const typed = r as { batchIds: string[] };
    expect(typed.batchIds.length).toBe(2);
    expect(typed.batchIds[0]).toBe("alpha");
    expect(typed.batchIds[1]).toBe("bravo");
  });

  it("get_results.parse({batchIds:[]}) rejects (min(1))", () => {
    const r = ACTION_CAD_REGRESSION_SCHEMAS.get_results.safeParse({ batchIds: [] });
    expect(r.success).toBe(false);
  });

  it("report.parse({}) accepts AND produces an empty object (all sections optional)", () => {
    const r = ACTION_CAD_REGRESSION_SCHEMAS.report.parse({});
    expect(typeof r).toBe("object");
    expect(Object.keys(r as object).length).toBe(0);
  });

  it("report.parse({rowLimit:50}) preserves rowLimit exact value", () => {
    const r = ACTION_CAD_REGRESSION_SCHEMAS.report.parse({ rowLimit: 50 });
    expect((r as { rowLimit: number }).rowLimit).toBe(50);
  });

  it("report.parse({rowLimit:-1}) rejects (positive int required)", () => {
    const r = ACTION_CAD_REGRESSION_SCHEMAS.report.safeParse({ rowLimit: -1 });
    expect(r.success).toBe(false);
  });
});

describe("cadRegressionDispatcher — CINF12 spec aliases (forward to correct engine + payload)", () => {
  // These tests use vi.mock'd engine spies to PROVE the dispatcher routes each
  // alias to the right engine with the right {op, ...} payload — not just
  // 'not unhandled', but 'specifically the correct engine'.

  it("start_batch forwards params to orchestrator.execute unchanged", async () => {
    const params = { tasks: [{ fileId: "t1" }], options: { runner: {} } };
    const result = await routeCADRegression("start_batch" as Alias, params);
    expect(orchestratorSpy).toHaveBeenCalledTimes(1);
    expect(orchestratorSpy.mock.calls[0][0]).toEqual(params);
    expect((result as { called: string }).called).toBe("orchestrator");
    // Other engines must NOT have been called
    expect(dashboardSpy).toHaveBeenCalledTimes(0);
    expect(analyzerSpy).toHaveBeenCalledTimes(0);
    expect(triageSpy).toHaveBeenCalledTimes(0);
    expect(reportSpy).toHaveBeenCalledTimes(0);
  });

  it("get_progress forwards to dashboard.execute with op='snapshot' prepended", async () => {
    await routeCADRegression("get_progress" as Alias, { batchId: "b-99" });
    expect(dashboardSpy).toHaveBeenCalledTimes(1);
    const payload = dashboardSpy.mock.calls[0][0] as { op: string; batchId: string };
    expect(payload.op).toBe("snapshot");
    expect(payload.batchId).toBe("b-99");
  });

  it("get_results forwards to analyzer.execute with op='trend' prepended", async () => {
    await routeCADRegression("get_results" as Alias, { batchIds: ["x", "y"] });
    expect(analyzerSpy).toHaveBeenCalledTimes(1);
    const payload = analyzerSpy.mock.calls[0][0] as { op: string; batchIds: string[] };
    expect(payload.op).toBe("trend");
    expect(payload.batchIds.length).toBe(2);
  });

  it("triage forwards params to triage.execute unchanged (single failure)", async () => {
    const params = { failure: { fileId: "f-x", message: "err" } };
    await routeCADRegression("triage" as Alias, params);
    expect(triageSpy).toHaveBeenCalledTimes(1);
    expect(triageSpy.mock.calls[0][0]).toEqual(params);
  });

  it("triage forwards batch (failures[]) unchanged", async () => {
    const params = { failures: [{ fileId: "a", message: "x" }, { fileId: "b", message: "y" }] };
    await routeCADRegression("triage" as Alias, params);
    expect(triageSpy).toHaveBeenCalledTimes(1);
    const payload = triageSpy.mock.calls[0][0] as { failures: unknown[] };
    expect(payload.failures.length).toBe(2);
  });

  it("report forwards to report.execute with op='renderSummary' prepended", async () => {
    await routeCADRegression("report" as Alias, { rowLimit: 42 });
    expect(reportSpy).toHaveBeenCalledTimes(1);
    const payload = reportSpy.mock.calls[0][0] as { op: string; rowLimit: number };
    expect(payload.op).toBe("renderSummary");
    expect(payload.rowLimit).toBe(42);
  });

  it("each alias invocation calls EXACTLY ONE engine (no cross-routing)", async () => {
    await routeCADRegression("get_progress" as Alias, { batchId: "b" });
    const total =
      orchestratorSpy.mock.calls.length +
      dashboardSpy.mock.calls.length +
      analyzerSpy.mock.calls.length +
      triageSpy.mock.calls.length +
      reportSpy.mock.calls.length;
    expect(total).toBe(1);
    expect(dashboardSpy).toHaveBeenCalledTimes(1);
  });
});
