/**
 * U-FE-DOC-LEARN-MOUNT route guard (slot:bravo 2026-06-19).
 *
 * Proves /api/v1/doc-learn/{upload,extract,list,:id} serves the SPA's docLearn client (raw-body
 * contract) by relaying to the REAL prism_doc_learn action names, replacing the 404 the SPA hit.
 * The dispatcher is integration-tested separately (document-learning-dispatcher.test.ts); this
 * verifies the route adapter + its error mapping. callTool is stubbed with the dispatcher's actual
 * envelope shapes (domain result vs {error,action} vs {blocked,reason,action}).
 *
 * Coverage: happy per verb (upload/extract/list/get/delete) + the CRITICAL distinction (a
 * doc_extract status:"failed" result is a 200 the SPA renders, NOT a 400) + dispatch error -> 400
 * + safety block -> 422 + /list-vs-/:id route ordering.
 */
import express from "express";
import http from "node:http";
import { once } from "node:events";
import type { AddressInfo } from "node:net";
import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";

import type { CallToolFn } from "../routes/index.js";
import { createDocLearnRouter } from "../routes/docLearn.js";

let server: http.Server;
let port = 0;
let calls: Array<{ tool: string; action: string; params: any }> = [];

// Stub returns prism_doc_learn's ACTUAL envelope shapes. Sentinels drive the error/block paths:
//   file_path "__err__"     -> dispatcher error envelope ({error,action}, no domain marker)
//   title     "__blocked__" -> safety-block envelope ({blocked,reason,action})
//   document_id "fail-doc"  -> a VALID failed-extraction domain result ({status:"failed",error})
const callTool: CallToolFn = async (tool, action, params) => {
  const p = (params ?? {}) as Record<string, any>;
  calls.push({ tool, action, params: p });
  if (p.file_path === "__err__") return { error: `Invalid params for ${action}`, action };
  if (p.title === "__blocked__") return { blocked: true, reason: "blocked by content-safety hook", action };
  switch (action) {
    case "doc_upload":
      return { document_id: p.document_id ?? "doc-1", status: "pending", format: "pdf", message: "registered" };
    case "doc_extract":
      return p.document_id === "fail-doc"
        ? { document_id: "fail-doc", status: "failed", error: "extraction failed", errors: ["unreadable page 3"] }
        : { document_id: p.document_id, status: "complete", is_valid: true, stats: { tips: 5 } };
    case "doc_list":
      return { count: 2, documents: [{ id: "d1" }, { id: "d2" }] };
    case "doc_get":
      // REAL handleDocGet shape: { document: {...}, knowledge } | { error } when not found.
      return p.document_id === "missing"
        ? { error: `Document not found: ${p.document_id}` }
        : { document: { id: p.document_id, title: "Spec", format: "pdf", status: "complete", created_at: "2026-06-19", file_path: "/docs/x.pdf" }, knowledge: { tips: 5 } };
    case "doc_delete":
      // REAL handleDocDelete shape: { deleted, message } | { error } when not found.
      return p.document_id === "missing"
        ? { error: `Document not found: ${p.document_id}` }
        : { deleted: p.document_id, message: "Document knowledge deleted successfully" };
    default:
      return { error: `Unknown action: ${action}`, action };
  }
};

function httpRequest(method: string, urlPath: string, body?: unknown): Promise<{ status: number; json: any }> {
  return new Promise((resolve, reject) => {
    const payload = body !== undefined ? JSON.stringify(body) : undefined;
    const headers: Record<string, string> = {};
    if (payload !== undefined) {
      headers["content-type"] = "application/json";
      headers["content-length"] = String(Buffer.byteLength(payload));
    }
    const req = http.request({ host: "127.0.0.1", port, method, path: urlPath, headers }, (resp) => {
      let text = "";
      resp.on("data", (c) => (text += c));
      resp.on("end", () => {
        let json: any;
        try { json = text ? JSON.parse(text) : undefined; } catch { json = undefined; }
        resolve({ status: resp.statusCode ?? 0, json });
      });
    });
    req.on("error", reject);
    if (payload !== undefined) req.write(payload);
    req.end();
  });
}

beforeAll(async () => {
  const app = express();
  app.use(express.json());
  app.use(createDocLearnRouter(callTool));
  server = http.createServer(app);
  server.listen(0);
  await once(server, "listening");
  port = (server.address() as AddressInfo).port;
});

beforeEach(() => { calls = []; });

afterAll(() => new Promise<void>((resolve) => server.close(() => resolve())));

describe("/api/v1/doc-learn route -> prism_doc_learn", () => {
  it("POST /upload relays to doc_upload and returns the raw result", async () => {
    const { status, json } = await httpRequest("POST", "/upload", { file_path: "/docs/x.pdf", title: "Spec", document_id: "custom-7" });
    expect(status).toBe(200);
    expect(calls[0].action).toBe("doc_upload");
    expect(calls[0].params.document_id).toBe("custom-7");
    expect(json.document_id).toBe("custom-7"); // raw body, NOT an {ok,data} envelope
    expect(json.status).toBe("pending");
  });

  it("POST /extract relays to doc_extract on a successful extraction", async () => {
    const { status, json } = await httpRequest("POST", "/extract", { document_id: "d1" });
    expect(status).toBe(200);
    expect(calls[0].action).toBe("doc_extract");
    expect(calls[0].params.document_id).toBe("d1");
    expect(json.status).toBe("complete");
  });

  it("passes a FAILED extraction through as 200 (a valid domain result, NOT an HTTP error)", async () => {
    const { status, json } = await httpRequest("POST", "/extract", { document_id: "fail-doc" });
    expect(status).toBe(200); // the SPA renders status:failed -- it must NOT be turned into a throw
    expect(json.status).toBe("failed");
    expect(json.error).toBe("extraction failed");
  });

  it("GET /list relays to doc_list (and is NOT matched as doc_get id='list')", async () => {
    const { status, json } = await httpRequest("GET", "/list");
    expect(status).toBe(200);
    expect(calls[0].action).toBe("doc_list");
    expect(calls.some((c) => c.action === "doc_get")).toBe(false); // route ordering correct
    expect(json.count).toBe(2);
  });

  it("GET /:document_id relays to doc_get and returns the real {document,knowledge} shape", async () => {
    const { status, json } = await httpRequest("GET", "/d42");
    expect(status).toBe(200);
    expect(calls[0].action).toBe("doc_get");
    expect(calls[0].params.document_id).toBe("d42");
    expect(json.document.id).toBe("d42"); // matches SPA DocGetResult.document.id
    expect(json.document.file_path).toBe("/docs/x.pdf");
    expect(json.knowledge.tips).toBe(5); // knowledge sub-object passes through raw
  });

  it("DELETE /:document_id relays to doc_delete and returns the real {deleted,message} shape", async () => {
    const { status, json } = await httpRequest("DELETE", "/d42");
    expect(status).toBe(200);
    expect(calls[0].action).toBe("doc_delete");
    expect(calls[0].params.document_id).toBe("d42");
    expect(json.deleted).toBe("d42"); // matches SPA DocDeleteResult.deleted
    expect(json.message).toMatch(/deleted/i);
  });

  it("maps a not-found doc_get to 400 (error envelope has no domain marker)", async () => {
    const { status, json } = await httpRequest("GET", "/missing");
    expect(status).toBe(400);
    expect(json.message).toMatch(/Document not found: missing/);
  });

  it("maps a not-found doc_delete to 400", async () => {
    const { status, json } = await httpRequest("DELETE", "/missing");
    expect(status).toBe(400);
    expect(json.message).toMatch(/Document not found: missing/);
  });

  it("maps a dispatch-level error envelope to 400 with the SPA-facing message (fail-loud)", async () => {
    const { status, json } = await httpRequest("POST", "/upload", { file_path: "__err__" });
    expect(status).toBe(400);
    expect(json.message).toMatch(/Invalid params for doc_upload/);
  });

  it("maps a safety-block envelope to 422 with the reason", async () => {
    const { status, json } = await httpRequest("POST", "/upload", { file_path: "/docs/x.pdf", title: "__blocked__" });
    expect(status).toBe(422);
    expect(json.message).toMatch(/content-safety hook/);
  });
});
