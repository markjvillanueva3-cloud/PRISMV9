/**
 * Tests for the document-extraction Express routes (U-XRAY-DOCUMENT-REST-ROUTE).
 *
 * Dependency-free (no supertest): invokes each route handler directly off the express Router stack with
 * a stub callTool that records (tool, action, params). Proves every endpoint forwards to the correct
 * prism_resource_extraction action, wraps the result as {result}, and propagates a dispatcher rejection
 * to next(e) (never throws to the client) -- the REST parity for the blueprint extract routes. The
 * contract/router LOGIC is covered by resourceExtractionDispatcher.documentContract + documentExtractionRouter
 * tests; THIS file proves the REST surface forwards correctly.
 */
import { describe, it, expect } from "vitest";
import { createDocumentRouter } from "../routes/document.js";

interface Call { tool: string; action: string; params: any }

/** Pull the POST handler registered for `path` out of an express Router's layer stack. */
function getPostHandler(router: any, path: string): (req: any, res: any, next: any) => any {
  const layer = router.stack.find((l: any) => l.route && l.route.path === path && l.route.methods?.post);
  if (!layer) throw new Error(`no POST handler registered for ${path}`);
  const sub = layer.route.stack[layer.route.stack.length - 1];
  return sub.handle;
}

/** Invoke a route handler with a mock req/res/next; capture the json payload, status, and any next(err). */
async function invoke(router: any, path: string, body: any): Promise<{ statusCode: number; body: any; nextErr: any }> {
  const handler = getPostHandler(router, path);
  const out: { statusCode: number; body: any } = { statusCode: 200, body: undefined };
  const res = {
    status(c: number) { out.statusCode = c; return res; },
    json(payload: any) { out.body = payload; return res; },
  };
  let nextErr: any = null;
  await handler({ body }, res, (e: any) => { nextErr = e ?? null; });
  return { statusCode: out.statusCode, body: out.body, nextErr };
}

describe("document extraction routes (U-XRAY-DOCUMENT-REST-ROUTE)", () => {
  it("POST /extract-contract forwards to prism_resource_extraction:document_extract_contract and returns {result}", async () => {
    const calls: Call[] = [];
    const spy = async (tool: string, action: string, params: any): Promise<any> => {
      calls.push({ tool, action, params });
      return { contract: { schemaVersion: "1.0.0", doc_type: "manual" }, producer: "doclearn", valid: true };
    };
    const router = createDocumentRouter(spy as any);
    const r = await invoke(router, "/extract-contract", { producer: "doclearn", ingestion: { items: [] } });
    expect(calls).toHaveLength(1);
    expect(calls[0]).toMatchObject({ tool: "prism_resource_extraction", action: "document_extract_contract" });
    expect(calls[0].params.producer).toBe("doclearn"); // body forwarded verbatim
    expect(r.body.result.valid).toBe(true);
    expect(r.body.result.contract.doc_type).toBe("manual");
    expect(r.nextErr).toBeNull();
  });

  it("POST /extract-route forwards to prism_resource_extraction:document_extract_route", async () => {
    const calls: Call[] = [];
    const spy = async (tool: string, action: string, params: any): Promise<any> => {
      calls.push({ tool, action, params });
      return { plan: { summary: { n_eligible: 2, n_ineligible: 3 } } };
    };
    const router = createDocumentRouter(spy as any);
    const r = await invoke(router, "/extract-route", { contract: { schemaVersion: "1.0.0", entries: [] } });
    expect(calls[0]).toMatchObject({ tool: "prism_resource_extraction", action: "document_extract_route" });
    expect(r.body.result.plan.summary.n_eligible).toBe(2);
    expect(r.nextErr).toBeNull();
  });

  it("a dispatcher rejection is passed to next(e), never thrown to the client (res.json not called)", async () => {
    const spy = async (): Promise<any> => { throw new Error("boom"); };
    const router = createDocumentRouter(spy as any);
    const r = await invoke(router, "/extract-route", { contract: {} });
    expect(r.nextErr).toBeInstanceOf(Error);
    expect(r.nextErr.message).toBe("boom");
    expect(r.body).toBeUndefined();
  });

  it("the two endpoints target DISTINCT actions (no copy-paste action collision)", async () => {
    const actions: string[] = [];
    const spy = async (_t: string, action: string): Promise<any> => { actions.push(action); return {}; };
    const router = createDocumentRouter(spy as any);
    await invoke(router, "/extract-contract", {});
    await invoke(router, "/extract-route", {});
    expect(actions).toEqual(["document_extract_contract", "document_extract_route"]);
  });
});
