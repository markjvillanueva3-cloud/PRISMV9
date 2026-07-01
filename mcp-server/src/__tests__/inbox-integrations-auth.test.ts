/**
 * inbox-integrations-auth.test.ts -- U-INBOX-INTEGRATIONS-AUTH (slot:hotel, 2026-06-24)
 *
 * The document-inbox + ERP/measurement-import + document-management/learning routers are all mounted under
 * /api where `optionalToken` NEVER rejects anon -- so every route was ANONYMOUSLY reachable. They leak/mutate
 * shop-internal data:
 *   - inbox.ts      (/api/v1/inbox)      -> prism_inbox: InboxItem.extracted_data = OCR'd customer prints/
 *                                          POs/invoices; ingested_by = employee PII; ingest/match/status = writes.
 *   - integrations  (/api/v1/integrations)-> prism_integration: /erp imports work orders, /measurement imports
 *                                          CMM inspection results (both privileged WRITES).
 *   - learning      (/api/v1/learning)    -> prism_doc_learn (the 5 /document/* routes, incl DELETE).
 *   - doc-learn     (/api/v1/doc-learn)   -> prism_doc_learn: the LIVE SPA upload surface (same corpus).
 *   - doc           (/api/v1/doc)         -> prism_doc: /write,/append,/migrate write server documents
 *                                          (path.join(DOCS_DIR, name) -> anon server-side file write risk).
 *
 * This unit added `verifyToken` (401 on missing/invalid Bearer) on all of the above, plus `requireRole` on the
 * privileged WRITES (/integrations/erp, /integrations/measurement, /doc/write, /doc/append, /doc/migrate). This
 * test pins the AUTHORIZATION MATRIX:
 *   - ANON (no token)        -> 401 on every gated route (the verifyToken gate).
 *   - AUTHED non-privileged  -> 200 on read/baseline routes; 403 on a privileged write.
 *   - AUTHED right role      -> 200 on the privileged write.
 *   - PUBLIC routes left open -> 200 with NO token (learning /assess, /api/v1/data, manus) -- proves the gate
 *                                did NOT over-reach (operator decision: leave data.ts + the public learning
 *                                routes open so the anon Speed-Feed Calculator + learning dashboard still work).
 *
 * FIDELITY: we use the REAL `requireRole` (the authorization decision under test, via importActual) and stub
 * ONLY `verifyToken` (token plumbing) to read roles from an `x-test-roles` header -- exactly what the real
 * verifyToken does (populate req.userId + req.userRoles from a validated token). No header => 401 (the real
 * anon path). This exercises the genuine role-gate logic without coupling to AuthEngine internals.
 */
import { describe, it, expect, beforeEach, vi } from "vitest";
import express from "express";

// Stub ONLY verifyToken; keep the REAL requireRole so the authz logic is genuinely tested.
vi.mock("../middleware/auth.js", async (importOriginal) => {
  const actual = await importOriginal<typeof import("../middleware/auth.js")>();
  return {
    ...actual,
    verifyToken: (req: any, res: any, next: () => void) => {
      const hdr = req.headers["x-test-roles"];
      if (hdr === undefined) {
        res.status(401).json({ error: { status: 401, message: "Missing or invalid Authorization header", code: "AUTH_REQUIRED" } });
        return;
      }
      req.userId = "test-user";
      req.userRoles = String(hdr).split(",").map((s) => s.trim()).filter(Boolean);
      next();
    },
    // requireRole is the REAL one (from actual) -- the authorization decision under test.
  };
});

import { createInboxRouter } from "../routes/inbox.js";
import { createIntegrationsRouter } from "../routes/integrations.js";
import { createLearningRouter } from "../routes/learning.js";
import { createDocLearnRouter } from "../routes/docLearn.js";
import { createDocRouter } from "../routes/doc.js";
import { createDataRouter } from "../routes/data.js";
import { createManusRouter } from "../routes/manus.js";

type ToolCall = { tool: string; action: string; params: any };
function mockCallTool(captured: ToolCall[]) {
  return async (tool: string, action: string, params: any) => {
    captured.push({ tool, action, params });
    // Return a value the inbox/doc-learn routers can shape -- include a domain marker so docLearn's
    // docDispatchError() treats it as a 200 success (it maps a marker-less {error} to 4xx).
    return { ok: true, document_id: "D1", items: [], data: {} };
  };
}

/** Fire a request; `roles` undefined => no x-test-roles header => anon. */
async function req(
  app: express.Express,
  method: "GET" | "POST" | "DELETE",
  path: string,
  roles?: string,
  body?: any,
): Promise<{ status: number; json: any }> {
  return new Promise((resolve, reject) => {
    const http = require("http");
    const server = app.listen(0, () => {
      const port = (server.address() as { port: number }).port;
      const headers: Record<string, string> = { "Content-Type": "application/json" };
      if (roles !== undefined) headers["x-test-roles"] = roles;
      const data = body !== undefined ? JSON.stringify(body) : "";
      if (data) headers["Content-Length"] = String(Buffer.byteLength(data));
      const r = http.request({ hostname: "127.0.0.1", port, path, method, headers }, (res: any) => {
        let raw = "";
        res.on("data", (c: Buffer) => (raw += c.toString()));
        res.on("end", () => {
          server.close();
          try { resolve({ status: res.statusCode, json: raw ? JSON.parse(raw) : {} }); }
          catch { resolve({ status: res.statusCode, json: {} }); }
        });
      });
      r.on("error", reject);
      if (data) r.write(data);
      r.end();
    });
  });
}

describe("U-INBOX-INTEGRATIONS-AUTH: authorization matrix on the anon document/ERP HTTP surfaces", () => {
  let app: express.Express;
  let captured: ToolCall[];

  beforeEach(() => {
    captured = [];
    app = express();
    app.use(express.json());
    app.use("/api/v1/inbox", createInboxRouter(mockCallTool(captured)));
    app.use("/api/v1/integrations", createIntegrationsRouter(mockCallTool(captured)));
    app.use("/api/v1/learning", createLearningRouter(mockCallTool(captured)));
    app.use("/api/v1/doc-learn", createDocLearnRouter(mockCallTool(captured)));
    app.use("/api/v1/doc", createDocRouter(mockCallTool(captured)));
    app.use("/api/v1/data", createDataRouter(mockCallTool(captured)));
    app.use("/api/v1/manus", createManusRouter(mockCallTool(captured)));
  });

  // ── inbox.ts: ALL routes gated (verifyToken) ───────────────────────────────
  it("ANON GET /inbox/list -> 401 (document-list leak gated)", async () => {
    const { status } = await req(app, "GET", "/api/v1/inbox/list", undefined);
    expect(status).toBe(401);
    expect(captured).toHaveLength(0); // never reached the engine
  });

  it("ANON POST /inbox/ingest -> 401 (document write gated)", async () => {
    const { status } = await req(app, "POST", "/api/v1/inbox/ingest", undefined, { filename: "p.pdf" });
    expect(status).toBe(401);
  });

  it("ANON GET /inbox/stats -> 401 (dashboard PII gated)", async () => {
    const { status } = await req(app, "GET", "/api/v1/inbox/stats", undefined);
    expect(status).toBe(401);
  });

  it("AUTHED operator GET /inbox/list -> 200 (any logged-in shop user may view the inbox)", async () => {
    const { status } = await req(app, "GET", "/api/v1/inbox/list", "operator");
    expect(status).toBe(200);
    expect(captured[0].tool).toBe("prism_inbox");
    expect(captured[0].action).toBe("inbox_list");
  });

  // ── integrations.ts: baseline verifyToken + lead-tier on the 2 writes ──────
  it("ANON POST /integrations/erp -> 401 (ERP work-order import gated)", async () => {
    const { status } = await req(app, "POST", "/api/v1/integrations/erp", undefined, {});
    expect(status).toBe(401);
  });

  it("ANON POST /integrations/cam -> 401 (baseline gate -- even non-write integrations require login)", async () => {
    const { status } = await req(app, "POST", "/api/v1/integrations/cam", undefined, {});
    expect(status).toBe(401);
  });

  it("AUTHED operator POST /integrations/cam -> 200 (baseline-tier route, any authed user)", async () => {
    const { status } = await req(app, "POST", "/api/v1/integrations/cam", "operator", {});
    expect(status).toBe(200);
    expect(captured[0].action).toBe("cam_recommend");
  });

  it("AUTHED operator POST /integrations/erp -> 403 (ERP import needs lead+)", async () => {
    const { status } = await req(app, "POST", "/api/v1/integrations/erp", "operator", {});
    expect(status).toBe(403);
    expect(captured).toHaveLength(0); // requireRole blocked before the engine
  });

  it("AUTHED operator POST /integrations/measurement -> 403 (CMM import needs lead+)", async () => {
    const { status } = await req(app, "POST", "/api/v1/integrations/measurement", "operator", {});
    expect(status).toBe(403);
    expect(captured).toHaveLength(0); // requireRole blocked before the engine (symmetry with the other deny tests)
  });

  it("AUTHED lead POST /integrations/erp -> 200 (lead is in the write tier)", async () => {
    const { status } = await req(app, "POST", "/api/v1/integrations/erp", "lead", {});
    expect(status).toBe(200);
    expect(captured[0].action).toBe("erp_import_wo");
  });

  it("AUTHED admin POST /integrations/measurement -> 200 (admin satisfies the write tier)", async () => {
    const { status } = await req(app, "POST", "/api/v1/integrations/measurement", "admin", {});
    expect(status).toBe(200);
    expect(captured[0].action).toBe("measure_cmm_import");
  });

  // ── doc.ts: baseline verifyToken + lead-tier on the FS mutations ───────────
  it("ANON POST /doc/write -> 401 (anon server-side file write gated -- highest severity)", async () => {
    const { status } = await req(app, "POST", "/api/v1/doc/write", undefined, { name: "x.md", content: "y" });
    expect(status).toBe(401);
    expect(captured).toHaveLength(0);
  });

  it("ANON GET /doc/list -> 401 (server-doc list gated)", async () => {
    const { status } = await req(app, "GET", "/api/v1/doc/list", undefined);
    expect(status).toBe(401);
  });

  it("AUTHED operator POST /doc/write -> 403 (FS mutation needs lead+)", async () => {
    const { status } = await req(app, "POST", "/api/v1/doc/write", "operator", { name: "x.md", content: "y" });
    expect(status).toBe(403);
    expect(captured).toHaveLength(0);
  });

  it("AUTHED operator POST /doc/migrate -> 403 (bulk-FS migrate needs lead+ -- teeth for the migrate gate)", async () => {
    // /doc/migrate -> prism_doc.migrate bulk-writes LEGACY_STATE_DIR files into DOCS_DIR. It MUST require
    // lead+, not bare verifyToken. A `lead -> 200` test passes whether or not the role gate exists (lead
    // satisfies verifyToken too); only this operator->403 case fails if DOC_WRITE_ROLES is dropped from /migrate.
    const { status } = await req(app, "POST", "/api/v1/doc/migrate", "operator", {});
    expect(status).toBe(403);
    expect(captured).toHaveLength(0); // requireRole blocked before the engine
  });

  it("AUTHED operator GET /doc/list -> 200 (read route, any authed user)", async () => {
    const { status } = await req(app, "GET", "/api/v1/doc/list", "operator");
    expect(status).toBe(200);
    expect(captured[0].tool).toBe("prism_doc");
    expect(captured[0].action).toBe("list");
  });

  it("AUTHED lead POST /doc/migrate -> 200 (lead is in the FS-write tier)", async () => {
    const { status } = await req(app, "POST", "/api/v1/doc/migrate", "lead", {});
    expect(status).toBe(200);
    expect(captured[0].action).toBe("migrate");
  });

  // ── doc-learn.ts + learning /document/*: gated (verifyToken) ───────────────
  it("ANON POST /doc-learn/upload -> 401 (live SPA upload surface gated)", async () => {
    const { status } = await req(app, "POST", "/api/v1/doc-learn/upload", undefined, { file_path: "/x" });
    expect(status).toBe(401);
  });

  it("ANON DELETE /doc-learn/:id -> 401 (destructive doc mutation gated)", async () => {
    const { status } = await req(app, "DELETE", "/api/v1/doc-learn/D1", undefined);
    expect(status).toBe(401);
  });

  it("AUTHED operator POST /doc-learn/upload -> 200 (any authed user may upload)", async () => {
    const { status } = await req(app, "POST", "/api/v1/doc-learn/upload", "operator", { file_path: "/x" });
    expect(status).toBe(200);
    expect(captured[0].tool).toBe("prism_doc_learn");
    expect(captured[0].action).toBe("doc_upload");
  });

  it("ANON POST /learning/document/upload -> 401 (the learning.ts doc surface is also gated)", async () => {
    const { status } = await req(app, "POST", "/api/v1/learning/document/upload", undefined, {});
    expect(status).toBe(401);
  });

  it("ANON DELETE /learning/document/:id -> 401 (the learning.ts doc DELETE is gated)", async () => {
    const { status } = await req(app, "DELETE", "/api/v1/learning/document/D1", undefined);
    expect(status).toBe(401);
  });

  // ── PUBLIC routes LEFT OPEN (operator decision) -- the gate must NOT over-reach ─
  it("ANON POST /learning/assess -> 200 (public learning route stays open -- gate is surgical)", async () => {
    const { status } = await req(app, "POST", "/api/v1/learning/assess", undefined, { domain: "CAD" });
    // 200 OR a non-401 domain status -- the key invariant is it is NOT 401 (not gated).
    expect(status).not.toBe(401);
  });

  it("ANON POST /data/material/search -> 200 (data.ts left open -- powers the anon calculator)", async () => {
    const { status } = await req(app, "POST", "/api/v1/data/material/search", undefined, { query: "steel" });
    expect(status).not.toBe(401);
  });

  it("ANON GET /manus/task/list -> 200 (manus left open -- agent orchestration, no PII/cost)", async () => {
    const { status } = await req(app, "GET", "/api/v1/manus/task/list", undefined);
    expect(status).not.toBe(401);
  });

  // ── /doc/append: FULL deny+allow matrix (R9 teeth -- a lead->200 alone passes with OR without the gate) ─
  it("ANON POST /doc/append -> 401 (FS append-write gated)", async () => {
    const { status } = await req(app, "POST", "/api/v1/doc/append", undefined, { name: "x.md", content: "y" });
    expect(status).toBe(401);
    expect(captured).toHaveLength(0);
  });

  it("AUTHED operator POST /doc/append -> 403 (FS append-write needs lead+ -- teeth for the append gate)", async () => {
    // Like /migrate: a lead->200 test passes whether or not DOC_WRITE_ROLES is on /append. Only this
    // operator->403 case fails if the gate is dropped -- it pins each gated write's OWN deny-path.
    const { status } = await req(app, "POST", "/api/v1/doc/append", "operator", { name: "x.md", content: "y" });
    expect(status).toBe(403);
    expect(captured).toHaveLength(0);
  });

  it("AUTHED lead POST /doc/append -> 200 (lead is in the FS-write tier; selective, not a blanket 403)", async () => {
    const { status } = await req(app, "POST", "/api/v1/doc/append", "lead", { name: "x.md", content: "y" });
    expect(status).toBe(200);
    expect(captured[0].action).toBe("append");
  });
});
