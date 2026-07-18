/**
 * drawingRoute.test.ts -- unit tests for the pure orchestration core of POST /api/v1/drawing/extract
 * (U-XRAY-DRAWING-EXTRACT-ROUTE). Exercises `extractDrawingChain` with a recording mock callTool, so the
 * chain logic (producer -> contract+route selection, async-OCR gating, path confinement, error
 * propagation, param pass-through) is verified WITHOUT an express harness. The composed dispatcher
 * actions (drawing_extract / blueprint_extract_{contract,and_route}) are tested in their own suites.
 */
import { describe, it, expect } from "vitest";
import * as os from "os";
import * as path from "path";
import { extractDrawingChain, drawingExtractAllowRoots, pollJobResponse, executePlanResponse } from "../routes/drawing.js";

// An in-allowed-root path (the upload staging dir). The mock callTool intercepts the producer, so the
// file is never actually read -- the guard only does path-resolution string math.
const ROOT = path.join(os.tmpdir(), "prism-uploads");
const DXF_PATH = path.join(ROOT, "widget.dxf");

const PRODUCER = {
  action: "drawing_extract",
  success: true,
  metadata: { units: "mm", entityCount: 3 },
  dimensions: [{ id: "d1", type: "linear", value: 25.4, unit: "mm", text: "25.4" }],
  annotations: [],
  partInfo: { partNumber: "ABC-123" },
  warnings: [],
};
const CAD_AND_ROUTE = {
  success: true,
  data: {
    contract: { schemaVersion: "1.0.0", units: "mm", dimensions: [{ value_mm: 25.4, needs_confirm: false }] },
    plan: { consumers: [{ id: "quote", eligible: true }] },
    producer: "drawing",
    valid: true,
  },
};
const CAD_CONTRACT = {
  success: true,
  data: { contract: { schemaVersion: "1.0.0", units: "mm", dimensions: [] }, producer: "drawing", valid: true },
};

function makeCallTool(responses: Record<string, unknown | ((p: any) => unknown)>) {
  const calls: Array<{ toolName: string; action: string; params: any }> = [];
  const fn = async (toolName: string, action: string, params?: Record<string, any>) => {
    calls.push({ toolName, action, params });
    const r = responses[`${toolName}:${action}`];
    return typeof r === "function" ? (r as (p: any) => unknown)(params) : r;
  };
  return { fn: fn as any, calls };
}

// Mock async-OCR job substrate: records create/enqueue so the chain's enqueue behavior is asserted
// WITHOUT a real ExtractionJobStore / spawned OCR exec (that integration is covered by the store+runner
// suites). Deterministic jobId + clock.
function makeJobDeps() {
  const created: any[] = [];
  const enqueued: Array<{ jobId: string; source: string }> = [];
  const jobs = new Map<string, any>();
  let n = 0;
  const deps = {
    store: {
      create: (args: any) => { created.push(args); const rec = { ...args, status: "queued" }; jobs.set(args.jobId, rec); return rec; },
      get: (id: string) => jobs.get(id) ?? null,
    },
    enqueue: (jobId: string, source: string) => { enqueued.push({ jobId, source }); },
    newJobId: () => `job-${++n}`,
    nowIso: () => "2026-06-24T12:00:00.000Z",
  };
  return { deps, created, enqueued };
}

describe("extractDrawingChain (POST /api/v1/drawing/extract core)", () => {
  it("DXF path: producer -> blueprint_extract_and_route, returns contract + plan + slim producer", async () => {
    const { fn, calls } = makeCallTool({
      "prism_resource_extraction:drawing_extract": PRODUCER,
      "prism_cad:blueprint_extract_and_route": CAD_AND_ROUTE,
    });
    const r = await extractDrawingChain(fn, { path: DXF_PATH });
    expect(r.status).toBe(200);
    const result = (r.body as any).result;
    expect(result.producer_summary.units).toBe("mm");
    expect(result.producer_summary.dimension_count).toBe(1);
    expect(result.producer).toBe("drawing"); // payload's producer TYPE TAG survives the spread
    expect(result.contract.schemaVersion).toBe("1.0.0");
    expect(result.plan.consumers).toHaveLength(1);
    // chain order + args
    expect(calls[0]).toMatchObject({ toolName: "prism_resource_extraction", action: "drawing_extract" });
    expect(calls[0].params).toMatchObject({ path: DXF_PATH });
    expect(calls[1]).toMatchObject({ toolName: "prism_cad", action: "blueprint_extract_and_route" });
    expect(calls[1].params.drawing).toBe(PRODUCER); // producer result threaded as the `drawing` producer
  });

  it("route:false -> uses blueprint_extract_contract (no fan-out plan)", async () => {
    const { fn, calls } = makeCallTool({
      "prism_resource_extraction:drawing_extract": PRODUCER,
      "prism_cad:blueprint_extract_contract": CAD_CONTRACT,
    });
    const r = await extractDrawingChain(fn, { path: DXF_PATH, route: false });
    expect(r.status).toBe(200);
    expect(calls[1].action).toBe("blueprint_extract_contract");
    expect((r.body as any).result.plan).toBeUndefined();
  });

  it("in-root PDF -> 202 queued with jobId + poll_url; job created + enqueued; NO sync producer/contract call", async () => {
    const PDF = path.join(ROOT, "print.pdf");
    const { fn, calls } = makeCallTool({});
    const { deps, created, enqueued } = makeJobDeps();
    const r = await extractDrawingChain(fn, { path: PDF }, deps as any);
    expect(r.status).toBe(202);
    const result = (r.body as any).result;
    expect(result.status).toBe("queued");
    expect(result.jobId).toBe("job-1");
    expect(result.document_type).toBe("blueprint");
    expect(result.poll_url).toBe("/api/v1/drawing/extract/job/job-1");
    expect(created).toHaveLength(1);
    expect(created[0]).toMatchObject({ jobId: "job-1", producer: "ocr-ensemble", source: PDF });
    expect(enqueued).toEqual([{ jobId: "job-1", source: PDF }]);
    expect(calls).toHaveLength(0); // async path: no synchronous producer/contract dispatch -- honest, not fake OCR
  });

  it("in-root raster image -> 202 queued, document_type photo", async () => {
    const { fn } = makeCallTool({});
    const { deps } = makeJobDeps();
    const r = await extractDrawingChain(fn, { path: path.join(ROOT, "part.png") }, deps as any);
    expect(r.status).toBe(202);
    expect((r.body as any).result.document_type).toBe("photo");
  });

  it("ADVERSARIAL: an out-of-root PDF -> 403 (the OCR exec would fs-read it), no job created/enqueued", async () => {
    const { fn } = makeCallTool({});
    const { deps, created, enqueued } = makeJobDeps();
    const r = await extractDrawingChain(fn, { path: "/scan/secret.pdf" }, deps as any);
    expect(r.status).toBe(403);
    expect((r.body as any).stage).toBe("path_guard");
    expect(created).toHaveLength(0);
    expect(enqueued).toHaveLength(0);
  });

  it("no jobDeps injected -> 503 (fail loud, never a fake queue)", async () => {
    const { fn } = makeCallTool({});
    const r = await extractDrawingChain(fn, { path: path.join(ROOT, "print.pdf") }); // no 3rd arg
    expect(r.status).toBe(503);
    expect((r.body as any).stage).toBe("async_ocr");
  });

  it("store.create throwing (e.g. duplicate id) -> 500, NOT enqueued", async () => {
    const { fn } = makeCallTool({});
    const { deps, enqueued } = makeJobDeps();
    deps.store.create = () => { throw new Error("job already exists"); };
    const r = await extractDrawingChain(fn, { path: path.join(ROOT, "print.pdf") }, deps as any);
    expect(r.status).toBe(500);
    expect((r.body as any).stage).toBe("async_ocr");
    expect(enqueued).toHaveLength(0); // never enqueued if create failed
  });

  it("no path and no content -> 400", async () => {
    const { fn, calls } = makeCallTool({});
    const r = await extractDrawingChain(fn, {});
    expect(r.status).toBe(400);
    expect(calls).toHaveLength(0);
  });

  it("ADVERSARIAL: an out-of-root .dxf path -> 403, producer NOT called (no arbitrary file read)", async () => {
    const { fn, calls } = makeCallTool({ "prism_resource_extraction:drawing_extract": PRODUCER });
    const r = await extractDrawingChain(fn, { path: "/etc/secret.dxf" });
    expect(r.status).toBe(403);
    expect((r.body as any).stage).toBe("path_guard");
    expect(calls).toHaveLength(0); // confined BEFORE any fs read
  });

  it("ADVERSARIAL: a traversal path escaping the allowed root -> 403", async () => {
    const { fn, calls } = makeCallTool({ "prism_resource_extraction:drawing_extract": PRODUCER });
    const escape = path.join(ROOT, "..", "..", "escape.dxf");
    const r = await extractDrawingChain(fn, { path: escape });
    expect(r.status).toBe(403);
    expect(calls).toHaveLength(0);
  });

  it("inline content is NOT path-guarded (no disk read) even with an out-of-root path name", async () => {
    const { fn } = makeCallTool({
      "prism_resource_extraction:drawing_extract": PRODUCER,
      "prism_cad:blueprint_extract_and_route": CAD_AND_ROUTE,
    });
    const r = await extractDrawingChain(fn, { path: "/anywhere/x.dxf", content: "0\nSECTION\n2\nENTITIES\n0\nENDSEC\n0\nEOF" });
    expect(r.status).toBe(200); // content path never touches disk -> guard does not apply
  });

  it("producer error -> 422, contract action NOT called", async () => {
    const { fn, calls } = makeCallTool({
      "prism_resource_extraction:drawing_extract": { error: "path is required for drawing_extract" },
    });
    const r = await extractDrawingChain(fn, { path: DXF_PATH });
    expect(r.status).toBe(422);
    expect((r.body as any).stage).toBe("producer");
    expect((r.body as any).error).not.toMatch(/path is required/); // generic message, no raw dispatcher error leak
    expect(calls).toHaveLength(1); // stopped before the cad call
  });

  it("contract/route error -> 422 (generic message)", async () => {
    const { fn } = makeCallTool({
      "prism_resource_extraction:drawing_extract": PRODUCER,
      "prism_cad:blueprint_extract_and_route": { error: "normalizer produced an invalid contract for /tmp/x.dxf" },
    });
    const r = await extractDrawingChain(fn, { path: DXF_PATH });
    expect(r.status).toBe(422);
    expect((r.body as any).stage).toBe("contract_route");
    expect((r.body as any).error).not.toMatch(/\/tmp\//); // does not leak the dispatcher's path
  });

  it("content-only (no path) -> uses inline.dxf and parses content (not async-OCR-gated)", async () => {
    const { fn, calls } = makeCallTool({
      "prism_resource_extraction:drawing_extract": PRODUCER,
      "prism_cad:blueprint_extract_and_route": CAD_AND_ROUTE,
    });
    const r = await extractDrawingChain(fn, { content: "0\nSECTION\n2\nENTITIES\n0\nENDSEC\n0\nEOF" });
    expect(r.status).toBe(200);
    expect(calls[0].params.path).toBe("inline.dxf");
    expect(calls[0].params.content).toContain("ENTITIES");
  });

  it("threads confirmFloor / source / titleBlock through to the contract action", async () => {
    const { fn, calls } = makeCallTool({
      "prism_resource_extraction:drawing_extract": PRODUCER,
      "prism_cad:blueprint_extract_and_route": CAD_AND_ROUTE,
    });
    await extractDrawingChain(fn, { path: DXF_PATH, confirmFloor: 0.8, source: "JM/ITW-500", titleBlock: { customer: "X" } });
    expect(calls[1].params).toMatchObject({ confirmFloor: 0.8, source: "JM/ITW-500", titleBlock: { customer: "X" } });
  });

  it("the allowed-roots helper includes the upload staging dir", () => {
    expect(drawingExtractAllowRoots().some((r) => r.includes("prism-uploads"))).toBe(true);
  });
});

describe("pollJobResponse (GET /api/v1/drawing/extract/job/:jobId core)", () => {
  // Minimal store mock: get(id) -> the seeded record or null.
  const storeOf = (rec: any) => ({ get: (id: string) => (rec && rec.jobId === id ? rec : null) });

  it("unknown jobId -> 404 (no file escape; the store's sanitized get returns null)", () => {
    const r = pollJobResponse({ get: () => null }, "nope");
    expect(r.status).toBe(404);
    expect((r.body as any).error).toBe("job not found");
    expect((r.body as any).jobId).toBe("nope");
  });

  it("a traversal jobId resolves to null -> 404 (backstop, never reads a file)", () => {
    // the real store's sanitizeJobId throws -> get returns null; the mock models that null.
    const r = pollJobResponse({ get: () => null }, "../../etc/passwd");
    expect(r.status).toBe(404);
  });

  it("queued job -> 200 status only, no result/error fields", () => {
    const r = pollJobResponse(storeOf({ jobId: "j1", status: "queued", updatedAt: "T" }), "j1");
    expect(r.status).toBe(200);
    const result = (r.body as any).result;
    expect(result).toMatchObject({ jobId: "j1", status: "queued", updatedAt: "T" });
    expect("result" in result).toBe(false);
    expect("error" in result).toBe(false);
  });

  it("running job -> 200 status running", () => {
    const r = pollJobResponse(storeOf({ jobId: "j2", status: "running", updatedAt: "T" }), "j2");
    expect((r.body as any).result.status).toBe("running");
  });

  it("done job -> 200 surfaces the result, NOT an error field", () => {
    const done = { jobId: "j3", status: "done", updatedAt: "T", result: { contract: { schemaVersion: "1.0.0" }, plan: {} } };
    const r = pollJobResponse(storeOf(done), "j3");
    expect(r.status).toBe(200);
    const result = (r.body as any).result;
    expect(result.status).toBe("done");
    expect(result.result.contract.schemaVersion).toBe("1.0.0");
    expect("error" in result).toBe(false);
  });

  it("failed job -> 200 surfaces the error, NOT a result field", () => {
    const failed = { jobId: "j4", status: "failed", updatedAt: "T", error: "OCR produced no fused result" };
    const r = pollJobResponse(storeOf(failed), "j4");
    expect(r.status).toBe(200);
    const result = (r.body as any).result;
    expect(result.status).toBe("failed");
    expect(result.error).toBe("OCR produced no fused result");
    expect("result" in result).toBe(false);
  });

  it("a falsy-but-present result (e.g. null) is still surfaced (result !== undefined check, not truthiness)", () => {
    const r = pollJobResponse(storeOf({ jobId: "j5", status: "done", updatedAt: "T", result: null }), "j5");
    expect("result" in (r.body as any).result).toBe(true);
    expect((r.body as any).result.result).toBeNull();
  });
});

describe("executePlanResponse — POST /api/v1/drawing/execute (contract -> trusted plan -> consumer dispatch, U-XRAY-EXTRACTION-PLAN-EXECUTOR)", () => {
  // a realistic trusted plan the mocked blueprint_extract_route returns (advisory + privacy + a commitment)
  const PLAN = {
    schemaVersion: "1.0.0", contract_version: "1.0.0",
    routes: [
      { consumer: "feature_recognize", dispatcher: "prism_cad", action: "feature_recognize", kind: "advisory", eligible: true, reason: "", requires_confirmation: false, blocking_fields: 0, payload: { dimensions: [] } },
      { consumer: "redact", dispatcher: "prism_cad", action: "blueprint_redact", kind: "privacy", eligible: true, reason: "", requires_confirmation: false, blocking_fields: 0, payload: { extraction: {} } },
      { consumer: "quote", dispatcher: "prism_business", action: "blueprint_to_quote", kind: "commitment", eligible: true, reason: "", requires_confirmation: false, blocking_fields: 0, payload: { material: "4140" } },
    ],
    summary: { n_eligible: 3, n_ready: 3, n_blocked_on_confirm: 0, n_ineligible: 0, n_needs_confirm: 0 },
  };
  const responses = () => ({
    "prism_cad:blueprint_extract_route": { success: true, data: { plan: PLAN } },
    "prism_cad:feature_recognize": { success: true, data: {} },
    "prism_cad:blueprint_redact": { success: true, data: {} },
    "prism_business:blueprint_to_quote": { success: true, data: { quote: 42 } },
  });

  it("422 without a contract (never executes anything)", async () => {
    const { fn, calls } = makeCallTool({});
    const r = await executePlanResponse(fn, {});
    expect(r.status).toBe(422);
    expect(JSON.stringify(r.body)).toContain("contract");
    expect(calls.length).toBe(0);
  });

  it("default: SECURITY re-derives the plan via blueprint_extract_route, executes advisory+privacy, SKIPS the commitment", async () => {
    const { fn, calls } = makeCallTool(responses());
    const r = await executePlanResponse(fn, { contract: { schemaVersion: "1.0.0", units: "mm" } });
    expect(r.status).toBe(200);
    const report = (r.body as any).report;
    expect(report.summary.executed).toBe(2);           // feature_recognize + redact
    expect(report.summary.needs_confirmation).toBe(1); // quote skipped (no confirmation)
    expect(calls.some((c) => c.action === "blueprint_extract_route")).toBe(true); // plan re-derived, not caller-supplied
    expect(calls.some((c) => c.action === "blueprint_to_quote")).toBe(false);     // commitment NEVER auto-fired
  });

  it("confirmedConsumers:['quote'] fires the commitment through the route", async () => {
    const { fn, calls } = makeCallTool(responses());
    const r = await executePlanResponse(fn, { contract: {}, confirmedConsumers: ["quote"] });
    expect((r.body as any).report.summary.executed).toBe(3);
    expect(calls.some((c) => c.action === "blueprint_to_quote")).toBe(true);
  });

  it("dryRun plans without dispatching any consumer (only the plan re-derivation runs)", async () => {
    const { fn, calls } = makeCallTool(responses());
    const r = await executePlanResponse(fn, { contract: {}, confirmedConsumers: ["quote"], dryRun: true });
    const report = (r.body as any).report;
    expect(report.dryRun).toBe(true);
    expect(report.summary.planned).toBe(3);
    expect(report.summary.executed).toBe(0);
    expect(calls.filter((c) => c.action !== "blueprint_extract_route").length).toBe(0); // no consumer fired
  });

  it("a failing route derivation (invalid contract) -> 422, never executes", async () => {
    const { fn, calls } = makeCallTool({ "prism_cad:blueprint_extract_route": { success: false, error: "invalid contract" } });
    const r = await executePlanResponse(fn, { contract: { bad: true } });
    expect(r.status).toBe(422);
    expect(calls.filter((c) => c.action !== "blueprint_extract_route").length).toBe(0);
  });

  it("exposes plan_summary alongside the execution report", async () => {
    const { fn } = makeCallTool(responses());
    const r = await executePlanResponse(fn, { contract: {} });
    expect((r.body as any).plan_summary.n_eligible).toBe(3);
  });
});
