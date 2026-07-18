/**
 * audit-fe-route-wiring.mjs norm() -- path canonicalization tests.
 * The critical logic is the query-string-vs-path-param distinction: a `${...}` glued to a segment is a
 * query string (strip it), a `${...}` that is a whole segment (after `/`) is a param (-> :x). Reverting
 * that distinction would re-inflate the dead-wire count with false positives (kaizen-suggestions${qs}).
 */
import { describe, it, expect } from "vitest";
import { norm, tailOf, classifyCall } from "./audit-fe-route-wiring.mjs";

describe("audit-fe-route-wiring norm()", () => {
  it("leaves a plain path unchanged", () => {
    expect(norm("/api/v1/sfc/kienzle")).toBe("/api/v1/sfc/kienzle");
  });
  it("normalizes a :param segment to :x", () => {
    expect(norm("/api/v1/job/:jobId")).toBe("/api/v1/job/:x");
  });
  it("normalizes a ${...} path segment (after a slash) to :x", () => {
    expect(norm("/api/v1/job/${id}")).toBe("/api/v1/job/:x");
  });
  it("normalizes a numeric id segment to :x", () => {
    expect(norm("/api/v1/job/12345")).toBe("/api/v1/job/:x");
  });
  it("strips a query-string template glued to a segment (NOT a path param)", () => {
    expect(norm("/api/v1/erp/kaizen-suggestions${qs}")).toBe("/api/v1/erp/kaizen-suggestions");
  });
  it("strips a literal ?query string", () => {
    expect(norm("/api/v1/erp/rfq-list?status=open")).toBe("/api/v1/erp/rfq-list");
  });
  it("strips a glued ${qs} (who-clocked-in case from the live audit)", () => {
    expect(norm("/api/v1/erp/who-clocked-in${qs}")).toBe("/api/v1/erp/who-clocked-in");
  });
});

describe("audit-fe-route-wiring tailOf()", () => {
  it("returns method + the last two path segments", () => {
    expect(tailOf("POST /api/v1/orchestration/atcs/stage")).toBe("POST atcs/stage");
  });
  it("matches the same endpoint mounted under a different base (the near-miss signal)", () => {
    expect(tailOf("POST /api/v1/orchestration/atcs/stage")).toBe(tailOf("POST /api/v1/atcs/stage"));
  });
  it("differs when the endpoint genuinely differs", () => {
    expect(tailOf("GET /api/v1/admin/users")).not.toBe(tailOf("GET /api/v1/admin/config"));
  });
  it("differs when only the method differs", () => {
    expect(tailOf("GET /api/v1/x/status")).not.toBe(tailOf("POST /api/v1/x/status"));
  });
});

describe("audit-fe-route-wiring classifyCall()", () => {
  const reg = new Set(["POST /api/v1/machine-live/list", "GET /api/v1/dev/svi", "POST /api/v1/orch/atcs/stage"]);
  const tails = new Set([...reg].map(tailOf));

  it("flags an unparsed ${} template as dynamic", () => {
    expect(classifyCall("GET /api/v1/erp/x${qs}", reg, tails)).toBe("dynamic");
  });
  it("flags method-mismatch when the exact path is registered under a different verb", () => {
    // /machine-live/list exists as POST; a GET call is a client-verb bug, not a missing route.
    expect(classifyCall("GET /api/v1/machine-live/list", reg, tails)).toBe("method-mismatch");
  });
  it("flags near-miss when the same method+tail exists under a different base", () => {
    expect(classifyCall("POST /api/v1/orchestration/atcs/stage", reg, tails)).toBe("near-miss");
  });
  it("flags no-route when nothing matches", () => {
    expect(classifyCall("GET /api/v1/totally/missing/thing", reg, tails)).toBe("no-route");
  });
  it("prefers method-mismatch over no-route (specificity order)", () => {
    expect(classifyCall("DELETE /api/v1/dev/svi", reg, tails)).toBe("method-mismatch");
  });
});
