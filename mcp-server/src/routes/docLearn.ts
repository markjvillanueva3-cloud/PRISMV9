import { Router } from "express";
import type { Response, NextFunction } from "express";
import type { CallToolFn } from "./index.js";
import { verifyToken } from "../middleware/auth.js";

/**
 * Document-Learning REST bridge for the SPA (CC-EXT-MS0 U07).
 *
 * U-FE-DOC-LEARN-MOUNT (slot:bravo 2026-06-19). The SPA's web/src/api/docLearn.ts posts to
 * /api/v1/doc-learn/{upload,extract,list,:id} and casts the WHOLE response body to its result
 * type (DocUploadResult / DocExtractResult / DocListResult / ...). The prism_doc_learn dispatcher
 * (documentLearningDispatcher, registered index.ts) is fully built, and routes/learning.ts already
 * proves the call pattern -- but learning.ts mounts those at /api/v1/learning/document/* AND wraps
 * results in an {ok,data} envelope the SPA does not expect. So the SPA 404'd. This router serves the
 * SPA's exact endpoints at the right prefix and returns the RAW dispatcher result.
 *
 * Error mapping (faithful to the SPA's `if(!res.ok) throw ApiError(status, message)` contract):
 * prism_doc_learn returns a DOMAIN object on success (carrying document_id / documents / count /
 * status) and its own error/block envelope on a dispatch-level failure ({error,action} or
 * {blocked,reason,action}). A doc_extract result with status:"failed"+error is a VALID 200 the SPA
 * renders -- so ONLY a true dispatch error (an `error` string with no domain marker) or a safety
 * block maps to a non-2xx; everything else passes through as the raw 200 body.
 */
function docDispatchError(r: any): { status: number; body: Record<string, unknown> } | null {
  if (r == null || typeof r !== "object") return null;
  if (r.blocked === true) {
    return { status: 422, body: { message: String(r.reason ?? "blocked by safety hook"), blocker: r.blocker } };
  }
  // A real success result carries one of these UNIQUE domain markers (verified against every
  // handleDoc* return: upload/extract -> document_id, list -> count+documents, get -> document,
  // delete -> deleted). `status` is intentionally NOT a marker -- it is redundant with document_id
  // (a doc_extract status:"failed" result still has document_id, so it passes through as a 200 the
  // SPA renders). A dispatcher error envelope ({error,action}) has NO marker -> mapped to 400.
  const hasDomainMarker =
    r.document_id !== undefined || r.documents !== undefined || r.count !== undefined ||
    r.document !== undefined || r.deleted !== undefined;
  if (typeof r.error === "string" && !hasDomainMarker) return { status: 400, body: { message: r.error } };
  return null;
}

export function createDocLearnRouter(callTool: CallToolFn): Router {
  const router = Router();

  // AUTH (U-INBOX-INTEGRATIONS-AUTH slot:hotel): mounted under /api (optionalToken, never rejects anon).
  // These relay to prism_doc_learn -- the same uploaded-document corpus as inbox/learning (customer
  // prints/notes/papers), incl. DELETE -- so every route requires a login (-> 401 for anon). No public view.
  router.use(verifyToken);

  async function relay(res: Response, next: NextFunction, tool: string, action: string, params: Record<string, unknown>): Promise<void> {
    try {
      const r = await callTool(tool, action, params);
      const errd = docDispatchError(r);
      if (errd) { res.status(errd.status).json(errd.body); return; }
      res.json(r);
    } catch (e) {
      next(e);
    }
  }

  // POST /upload -> doc_upload ({ file_path, title?, document_id? })
  router.post("/upload", (req, res, next) => relay(res, next, "prism_doc_learn", "doc_upload", req.body ?? {}));

  // POST /extract -> doc_extract ({ document_id, force_domain? })
  router.post("/extract", (req, res, next) => relay(res, next, "prism_doc_learn", "doc_extract", req.body ?? {}));

  // GET /list -> doc_list. MUST be registered BEFORE GET /:document_id, else Express matches
  // "/list" as doc_get with document_id="list".
  router.get("/list", (_req, res, next) => relay(res, next, "prism_doc_learn", "doc_list", {}));

  // GET /:document_id -> doc_get
  router.get("/:document_id", (req, res, next) =>
    relay(res, next, "prism_doc_learn", "doc_get", { document_id: req.params.document_id }));

  // DELETE /:document_id -> doc_delete
  router.delete("/:document_id", (req, res, next) =>
    relay(res, next, "prism_doc_learn", "doc_delete", { document_id: req.params.document_id }));

  return router;
}
