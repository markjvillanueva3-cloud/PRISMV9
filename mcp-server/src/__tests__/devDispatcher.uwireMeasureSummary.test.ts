/**
 * devDispatcher U-WIRE-MEASURE round-trip tests -- MeasureSummaryEngine.
 *
 * Validates the 7 new measure_* actions wire through prism_dev:
 *   measure_add               -> addMeasurement(...)        (in-mem ingest)
 *   measure_generate_summary  -> generateSummary(part,...)  (aggregate + store)
 *   measure_get_summary       -> getSummary(id)
 *   measure_list_summaries    -> listSummaries(partNumber)
 *   measure_quality_trend     -> getQualityTrend(part, days?)
 *   measure_parts_with_issues -> getPartsWithIssues()
 *   measure_export            -> exportSummary(id, format)
 *
 * The engine aggregates CMM/surface/probe measurement data points (held in a
 * process-lifetime in-memory store) into pass/fail/Cpk summaries with severity
 * classification + disposition. Static methods on the exported class; pure compute.
 *
 * Content-sensitive proofs (a stub would fail these):
 *   - a fail with |deviation| > 2x tolerance is classified "critical" -> disposition "reject".
 *   - passRate is exact: 1 pass of 2 features = 50.0; 1 of 1 = 100.0.
 *   - an empty part yields features 0 / disposition "pending".
 *
 * Each test uses a UNIQUE partNumber because the in-mem store is shared across the
 * file's tests (module-level Maps).
 *
 * Wired slot:papa 2026-06-15 -- WIRE-UNWIRED-PAPA cross-galaxy v2.1 (post-11/11 audit
 * re-run surfaced this CLEAN engine; galaxy:quality wired into prism_dev, papa home).
 *
 * @milestone WIRE-UNWIRED-PAPA
 * @unit U-WIRE-MEASURE
 */

import { describe, it, expect, beforeEach } from "vitest";
import { registerDevDispatcher } from "../tools/dispatchers/devDispatcher.js";
import { MeasureSummaryEngine } from "../engines/MeasureSummaryEngine.js";

interface CapturedTool {
  name: string;
  description: string;
  schema: unknown;
  handler: (args: { action: string; params?: Record<string, unknown> }) => Promise<unknown>;
}

class MockMCPServer {
  tools: CapturedTool[] = [];
  tool(name: string, description: string, schema: unknown, handler: CapturedTool["handler"]) {
    this.tools.push({ name, description, schema, handler });
  }
}

async function call(
  server: MockMCPServer,
  action: string,
  params: Record<string, unknown> = {},
): Promise<{ ok: boolean; data: Record<string, unknown> }> {
  const tool = server.tools.find((t) => t.name === "prism_dev") ?? server.tools[0]!;
  const raw = (await tool.handler({ action, params })) as
    | { content: { type: string; text: string }[] }
    | { success: false; error: string; action: string; dispatcher: string };
  if (raw && typeof raw === "object" && "success" in raw && (raw as { success: boolean }).success === false) {
    return { ok: false, data: raw as unknown as Record<string, unknown> };
  }
  const envelope = raw as { content: { type: string; text: string }[] };
  const text = envelope.content[0]!.text;
  let parsed: Record<string, unknown>;
  try { parsed = JSON.parse(text); } catch { return { ok: false, data: { rawText: text } }; }
  if (parsed && typeof parsed === "object" && !Array.isArray(parsed) &&
      ("engine_error" in parsed || ("error" in parsed && !("success" in parsed)))) {
    return { ok: false, data: parsed };
  }
  return { ok: true, data: parsed };
}

let server: MockMCPServer;

beforeEach(() => {
  server = new MockMCPServer();
  registerDevDispatcher(server as unknown as { tool: MockMCPServer["tool"] });
});

// -- Engine-direct reference behavior ----------------------------------------
describe("U-WIRE-MEASURE -- MeasureSummaryEngine contract", () => {
  it("classifies a >2x-tolerance fail as critical and disposes 'reject'", () => {
    const part = "TEST-MEAS-CRIT";
    MeasureSummaryEngine.addMeasurement(part, "cmm", "dia_ok", true, 0.001, 0.01);
    MeasureSummaryEngine.addMeasurement(part, "cmm", "dia_bad", false, 0.03, 0.01); // |0.03| > 2*0.01 -> critical
    const s = MeasureSummaryEngine.generateSummary(part);
    expect(s.totals.features).toBe(2);
    expect(s.totals.passed).toBe(1);
    expect(s.totals.failed).toBe(1);
    expect(s.totals.passRate).toBe(50);                              // round((1/2)*10000)/100
    expect(s.criticalFailures.some((f) => f.severity === "critical")).toBe(true);
    expect(s.disposition).toBe("reject");                            // a critical failure forces reject
  });

  it("an empty part yields 0 features and 'pending' disposition", () => {
    const s = MeasureSummaryEngine.generateSummary("TEST-MEAS-EMPTY");
    expect(s.totals.features).toBe(0);
    expect(s.disposition).toBe("pending");
    expect(s.totals.passRate).toBe(100);                            // no features -> default 100
  });

  it("exportSummary JSON round-trips the real summary's fields", () => {
    const part = "TEST-MEAS-EXPORT";
    MeasureSummaryEngine.addMeasurement(part, "probe", "feat", true, 0, 0.01);
    const s = MeasureSummaryEngine.generateSummary(part);
    const json = MeasureSummaryEngine.exportSummary(s.id, "json");
    const parsed = JSON.parse(json ?? "{}") as { id: string; partNumber: string };
    expect(parsed.partNumber).toBe(part);                           // export reflects the real summary
    expect(parsed.id).toBe(s.id);
  });
});

// -- LIVE round-trip through prism_dev (the wire proof) -----------------------
describe("U-WIRE-MEASURE -- dispatcher round-trip (prism_dev)", () => {
  it("measure_add then measure_generate_summary reflects the ingested measurement", async () => {
    const part = "TEST-MEAS-RT-PASS";
    const add = await call(server, "measure_add", { partNumber: part, source: "cmm", featureName: "f1", passed: true, deviation: 0, tolerance: 0.01 });
    expect(add.ok).toBe(true);
    expect(add.data.added).toBe(true);
    const r = await call(server, "measure_generate_summary", { partNumber: part });
    expect(r.ok).toBe(true);
    const totals = r.data.totals as { features: number; passed: number; passRate: number };
    expect(totals.features).toBe(1);
    expect(totals.passed).toBe(1);
    expect(totals.passRate).toBe(100);
    expect(r.data.disposition).toBe("accept");
  });

  it("summary lifecycle round-trips: generate -> get -> list -> export", async () => {
    const part = "TEST-MEAS-RT-LIFECYCLE";
    await call(server, "measure_add", { partNumber: part, source: "cmm", featureName: "f1", passed: true, deviation: 0, tolerance: 0.01 });
    const gen = await call(server, "measure_generate_summary", { partNumber: part });
    const id = (gen.data as { id: string }).id;
    expect(id).toContain("SUM-");                                   // engine-assigned summary id

    const got = await call(server, "measure_get_summary", { id });
    expect(got.data.found).toBe(true);                             // miss-signal boolean (true survives slim)
    expect((got.data.summary as { partNumber: string }).partNumber).toBe(part);

    const list = await call(server, "measure_list_summaries", { partNumber: part });
    const summaries = list.data.summaries as { partNumber: string }[];
    expect(summaries[0].partNumber).toBe(part);                     // the part's summary is listed

    const exp = await call(server, "measure_export", { id, format: "json" });
    expect(exp.data.found).toBe(true);
    expect(exp.data.export as string).toContain(part);             // export reflects the real summary
  });

  it("measure_get_summary + measure_export signal a miss for an unknown id", async () => {
    const got = await call(server, "measure_get_summary", { id: "SUM-NONEXISTENT-ZZZ" });
    expect(got.ok).toBe(true);
    expect(got.data.found).toBe(false);                           // false survives slim; the wrapped null is stripped
    const exp = await call(server, "measure_export", { id: "SUM-NONEXISTENT-ZZZ", format: "json" });
    expect(exp.ok).toBe(true);
    expect(exp.data.found).toBe(false);
  });

  it("measure_parts_with_issues lists a part that disposed 'reject'", async () => {
    const part = "TEST-MEAS-RT-ISSUE";
    await call(server, "measure_add", { partNumber: part, source: "cmm", featureName: "bad", passed: false, deviation: 0.05, tolerance: 0.01 });
    await call(server, "measure_generate_summary", { partNumber: part });
    const r = await call(server, "measure_parts_with_issues", {});
    expect(r.ok).toBe(true);
    const parts = r.data.parts as { partNumber: string; rejectCount: number }[];
    const entry = parts.find((p) => p.partNumber === part);
    expect(entry?.rejectCount ?? 0).toBeGreaterThanOrEqual(1);      // the reject was aggregated (undefined -> 0 fails)
  });

  it("measure_quality_trend returns the part's trend + average pass rate", async () => {
    const part = "TEST-MEAS-RT-TREND";
    await call(server, "measure_add", { partNumber: part, source: "surface", featureName: "ra", passed: true, deviation: 0, tolerance: 0.5 });
    await call(server, "measure_generate_summary", { partNumber: part });
    const r = await call(server, "measure_quality_trend", { partNumber: part, days: 30 });
    expect(r.ok).toBe(true);
    expect(r.data.partNumber).toBe(part);
    expect(r.data.trend).toBe("insufficient_data");                 // a single summary is < 5 data points
    expect(r.data.averagePassRate).toBe(100);                       // one all-pass summary -> 100% average
  });
});

// -- Schema validation through the dispatcher (adversarial) -------------------
describe("U-WIRE-MEASURE -- schema rejection (prism_dev)", () => {
  it("rejects measure_add with a missing partNumber", async () => {
    const r = await call(server, "measure_add", { source: "cmm", featureName: "f", passed: true, deviation: 0, tolerance: 0.01 });
    expect(r.ok).toBe(false);
  });

  it("rejects measure_generate_summary with a missing partNumber", async () => {
    const r = await call(server, "measure_generate_summary", {});
    expect(r.ok).toBe(false);
  });

  it("rejects measure_export with an invalid format", async () => {
    const r = await call(server, "measure_export", { id: "SUM-1", format: "pdf" });
    expect(r.ok).toBe(false);
  });
});
