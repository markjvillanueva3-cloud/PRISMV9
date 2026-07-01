/**
 * PRISM MCP Server -- Drawing Extraction Route (U-XRAY-DRAWING-EXTRACT-ROUTE)
 *
 * Phase-1 keystone of the blueprint-vision app-integration plan: the upload -> extract -> contract
 * chain. `routes/upload.ts` set `ready_for_ocr:true` and nothing consumed it; this route turns an
 * uploaded drawing into a structured, versioned BlueprintExtractionContract (+ the confirm-gated
 * consumer fan-out plan) in ONE HTTP call.
 *
 * Chain (no re-implementation -- composes already-wired, already-tested dispatcher actions):
 *   prism_resource_extraction:drawing_extract   (the producer -- reads the real DXF, U-XRAY-DRAWING-EXTRACT-REAL-DXF)
 *   -> prism_cad:blueprint_extract_and_route     (normalize to the versioned contract + fan-out plan)
 *   (or prism_cad:blueprint_extract_contract when `route:false`).
 *
 * Producer classes:
 *   - DXF / raw `content`  -> SYNCHRONOUS: the deterministic geometry parse is fast (<1s).
 *   - PDF / raster image   -> 202 queued: VLM-ensemble OCR is an async GPU job (10-60s); it is NOT
 *     run synchronously here (R12 -- never fake a sync OCR). A future async job+poll route exposes it.
 *
 * Pattern mirrors routes/document.ts; the orchestration is a pure exported function so it is unit-
 * testable with a mock callTool (no express harness).
 *
 * @module routes/drawing
 * @since   U-XRAY-DRAWING-EXTRACT-ROUTE (2026-06-24, slot xray)
 */
import { Router } from "express";
import * as fs from "fs";
import * as path from "path";
import * as os from "os";
import { spawn } from "child_process";
import { randomUUID } from "crypto";
import { ExtractionJobStore, type ExtractionJobRecord } from "../engines/blueprint-vision/extractionJobStore.js";
import { runExtractionJob, type OcrResult } from "../engines/blueprint-vision/extractionJobRunner.js";
import { executeExtractionPlan, type ExecutePlanOpts } from "../engines/blueprint-vision/extractionPlanExecutor.js";
import type { ExtractionRoutingPlan, ConsumerKind } from "../engines/blueprint-vision/blueprintExtractionRouter.js";
import type { CallToolFn } from "./index.js";

const VALID_KINDS: readonly ConsumerKind[] = Object.freeze(["advisory", "privacy", "commitment"]);

/**
 * Drive a blueprint extraction to actual downstream consumer dispatch (U-XRAY-EXTRACTION-PLAN-EXECUTOR).
 * SECURITY: the caller supplies a CONTRACT, not a raw plan -- the plan is re-derived via the trusted
 * `prism_cad:blueprint_extract_route` (which only ever builds KNOWN-consumer routes), so an unauthenticated
 * caller can NEVER inject an arbitrary `dispatcher:action` to execute. SAFETY: commitment consumers
 * (quote/program/inspection/...) never fire without their id in `confirmedConsumers`. Pure + DI-testable
 * with a mock callTool (no express harness), mirroring `extractDrawingChain`.
 *
 * Body: `{ contract, confirmedConsumers?: string[], allowedKinds?: string[], dryRun?: boolean }`.
 */
export async function executePlanResponse(
  callTool: CallToolFn,
  body: unknown,
): Promise<{ status: number; body: unknown }> {
  const b = (body && typeof body === "object" ? body : {}) as Record<string, unknown>;
  if (!b.contract || typeof b.contract !== "object") {
    return { status: 422, body: { error: "execute requires `contract` (a BlueprintExtractionContract; obtain it via /api/v1/drawing/extract or prism_cad:blueprint_extract_contract)" } };
  }
  // Re-derive a TRUSTED plan from the contract -- never trust a caller-supplied plan of arbitrary
  // dispatcher:action pairs. blueprint_extract_route validates the contract + builds only known routes.
  const routed = await callTool("prism_cad", "blueprint_extract_route", { contract: b.contract });
  if (routed && typeof routed === "object" && (routed as { success?: unknown }).success === false) {
    return { status: 422, body: { error: "could not route the contract (invalid contract?)" } };
  }
  const plan = routed && typeof routed === "object" && "data" in routed
    ? (routed as { data?: { plan?: unknown } }).data?.plan
    : undefined;
  if (!plan || typeof plan !== "object" || !Array.isArray((plan as { routes?: unknown }).routes)) {
    return { status: 422, body: { error: "routing produced no plan" } };
  }
  const opts: ExecutePlanOpts = {};
  if (Array.isArray(b.confirmedConsumers)) {
    opts.confirmedConsumers = (b.confirmedConsumers as unknown[]).filter((x): x is string => typeof x === "string");
  }
  if (Array.isArray(b.allowedKinds)) {
    opts.allowedKinds = (b.allowedKinds as unknown[]).filter((x): x is ConsumerKind => typeof x === "string" && VALID_KINDS.includes(x as ConsumerKind));
  }
  if (b.dryRun === true) opts.dryRun = true;
  const report = await executeExtractionPlan(plan as ExtractionRoutingPlan, callTool, opts);
  return { status: 200, body: { report, plan_summary: (plan as ExtractionRoutingPlan).summary } };
}

/** Extensions whose extraction is an async VLM-OCR job, NOT run synchronously on this request. */
const ASYNC_OCR_EXTS = [".pdf", ".png", ".jpg", ".jpeg", ".bmp", ".tif", ".tiff"];

/**
 * Filesystem roots a caller-supplied `path` may be read from. The intended Phase-1 source is the
 * upload staging dir (where `routes/upload.ts` writes); without this confinement an HTTP caller could
 * POST `{path:"../../secret.dxf"}` and have the producer fs-read an arbitrary file (the /api middleware
 * is `optionalToken` -- non-blocking). Extra roots (e.g. a JM corpus dir) via
 * `PRISM_DRAWING_EXTRACT_ALLOW_ROOTS` (path-delimited). Mirrors the guard in routes/ppg.ts.
 */
export function drawingExtractAllowRoots(): string[] {
  const roots = [path.join(os.tmpdir(), "prism-uploads")];
  const extra = process.env.PRISM_DRAWING_EXTRACT_ALLOW_ROOTS;
  if (extra) roots.push(...extra.split(path.delimiter).map((s) => s.trim()).filter(Boolean));
  return roots;
}

/** True iff `target` resolves to within one of `roots` (no traversal escape). */
function isWithinAllowedRoot(target: string, roots: string[]): boolean {
  const resolved = path.resolve(target);
  return roots.some((r) => {
    const rr = path.resolve(r);
    return resolved === rr || resolved.startsWith(rr + path.sep);
  });
}

/**
 * Async-OCR job substrate injected into `extractDrawingChain` so the PDF/raster branch can enqueue a
 * real durable job (createJob + fire the runner) instead of returning an honest-but-inert 202 stub.
 * Injectable (not hard-wired) so the chain stays unit-testable with a mock store + a recording enqueue.
 */
export interface DrawingJobDeps {
  store: Pick<ExtractionJobStore, "create" | "get">;
  /** Fire-and-forget: launch the background runner for an enqueued job (does NOT await GPU OCR). */
  enqueue: (jobId: string, source: string) => void;
  /** New unique job id (crypto.randomUUID in production). */
  newJobId: () => string;
  /** ISO clock (real Date in production; injected so the store's createdAt is testable). */
  nowIso: () => string;
}

/** Candidate locations of the OCR exec script, most-specific first (env override wins). */
function ocrExtractScriptCandidates(): string[] {
  return [
    process.env.PRISM_OCR_EXTRACT_SCRIPT,
    path.resolve(process.cwd(), "scripts", "ocr-extract-one.mjs"),
    path.resolve(process.cwd(), "..", "scripts", "ocr-extract-one.mjs"),
  ].filter((c): c is string => typeof c === "string" && c.length > 0);
}

/**
 * The real `ocr` dependency: spawn `scripts/ocr-extract-one.mjs` OUT OF PROCESS (heavy GPU OCR off the
 * Express event loop) and parse its slim JSON stdout into an `OcrResult`. Never throws -- any failure
 * (script missing, spawn error, non-JSON output) resolves to `{ fused: null, error }` so the runner
 * records the job `failed` (R12), never a silent hang.
 */
function ocrViaSubprocess(source: string): Promise<OcrResult> {
  const script = ocrExtractScriptCandidates().find((c) => fs.existsSync(c));
  if (!script) return Promise.resolve({ fused: null, error: "ocr-extract-one.mjs not found (set PRISM_OCR_EXTRACT_SCRIPT)" });
  return new Promise<OcrResult>((resolve) => {
    const child = spawn(process.execPath, [script, "--source", source], { windowsHide: true });
    let out = "";
    let err = "";
    child.stdout.on("data", (d) => { out += String(d); });
    child.stderr.on("data", (d) => { err += String(d); });
    child.on("error", (e) => {
      // Log the detail server-side; surface a GENERIC error (the poll endpoint is unauthenticated --
      // no spawn internals / paths to the client, matching this file's sync-path error hygiene).
      console.error(`[drawing/ocr] spawn error: ${e instanceof Error ? e.message : String(e)}`);
      resolve({ fused: null, error: "ocr exec failed to start" });
    });
    child.on("close", (code) => {
      // The script always prints exactly ONE JSON line LAST; take the last non-empty line so any stray
      // stdout from the shared ensemble core cannot corrupt the parse.
      const line = out.trim().split("\n").filter(Boolean).pop() || "";
      try {
        const j = JSON.parse(line) as { fused?: unknown; models_ok?: number; error?: string };
        resolve({ fused: j.fused ?? null, models_ok: j.models_ok, error: j.error });
      } catch {
        // stderr can carry python paths/tracebacks -- keep it in the server log, not the client error.
        if (err) console.error(`[drawing/ocr] exec exit ${code} stderr: ${err.slice(0, 400)}`);
        resolve({ fused: null, error: `ocr exec produced no valid result (exit ${code})` });
      }
    });
  });
}

export interface DrawingExtractResponse {
  status: number;
  body: Record<string, unknown>;
}

/**
 * Pure core for GET /api/v1/drawing/extract/job/:jobId. Returns 404 for an unknown (or invalid/traversal)
 * jobId -- the store's sanitized get() yields null for a bad id, so a path-escape can never read a file --
 * else 200 with the job status, surfacing `result`/`error` only when present. Pure so it is unit-testable
 * without an express harness (mirrors extractDrawingChain).
 */
export function pollJobResponse(store: Pick<ExtractionJobStore, "get">, jobId: string): DrawingExtractResponse {
  const job = store.get(jobId) as ExtractionJobRecord | null;
  if (!job) return { status: 404, body: { error: "job not found", jobId } };
  return {
    status: 200,
    body: {
      result: {
        jobId: job.jobId,
        status: job.status,
        updatedAt: job.updatedAt,
        ...(job.result !== undefined ? { result: job.result } : {}),
        ...(job.error ? { error: job.error } : {}),
      },
    },
  };
}

/**
 * Pure orchestration core for POST /api/v1/drawing/extract. Composes the producer + contract(+route)
 * dispatcher actions via the injected callTool. Returns an HTTP {status, body} so the express glue is
 * a one-liner and this logic is unit-testable with a mock callTool.
 *
 * @param callTool dispatcher call fn (toolName, action, params) -> Promise<result>
 * @param body     request body: { path?, content?, route?, confirmFloor?, source?, titleBlock? }
 */
export async function extractDrawingChain(
  callTool: CallToolFn,
  body: unknown,
  jobDeps?: DrawingJobDeps,
): Promise<DrawingExtractResponse> {
  const b = (body && typeof body === "object" ? body : {}) as Record<string, unknown>;
  // NB: named bodyPath, not `path`, to avoid shadowing the module `import * as path`.
  const bodyPath = typeof b.path === "string" ? b.path : undefined;
  const content = typeof b.content === "string" ? b.content : undefined;

  if (!bodyPath && content === undefined) {
    return { status: 400, body: { error: "Provide `path` (a .dxf/.dwg file) or `content` (raw DXF text)" } };
  }

  const effPath = bodyPath && bodyPath.length ? bodyPath : "inline.dxf";
  const ext = effPath.toLowerCase().slice(effPath.lastIndexOf("."));

  // PDF/raster with no inline DXF content -> async VLM-OCR job. Inline `content` is always a deterministic
  // drawing parse (the caller supplied DXF text directly), so it never reaches this branch.
  if (content === undefined && ASYNC_OCR_EXTS.includes(ext)) {
    // Path confinement: the background OCR exec WILL fs-read effPath, so -- exactly like the .dxf branch
    // below -- an out-of-root path is an arbitrary-file-read hole. Confine BEFORE enqueuing.
    if (!isWithinAllowedRoot(effPath, drawingExtractAllowRoots())) {
      return { status: 403, body: { error: "path is outside the allowed upload directory", stage: "path_guard" } };
    }
    if (!jobDeps) {
      // No async substrate wired (e.g. a caller that did not inject jobDeps) -- fail loud, not a fake queue.
      return { status: 503, body: { error: "async OCR job substrate not configured", stage: "async_ocr" } };
    }
    const jobId = jobDeps.newJobId();
    try {
      jobDeps.store.create({ jobId, producer: "ocr-ensemble", source: effPath, nowIso: jobDeps.nowIso() });
    } catch {
      return { status: 500, body: { error: "failed to enqueue OCR job", stage: "async_ocr" } };
    }
    jobDeps.enqueue(jobId, effPath); // fire-and-forget: the GPU ensemble runs out-of-band; poll for the result.
    return {
      status: 202,
      body: {
        result: {
          status: "queued",
          jobId,
          document_type: ext === ".pdf" ? "blueprint" : "photo",
          poll_url: `/api/v1/drawing/extract/job/${jobId}`,
          message:
            "PDF/raster blueprint OCR is an async multi-model VLM job (typically 10-60s). Poll poll_url for " +
            "{ status: queued|running|done|failed, result?, error? }.",
        },
      },
    };
  }

  // Path confinement: when the producer will fs-read the file (a .dxf path, no inline content), the
  // resolved path MUST be within an allowed root -- else an HTTP caller could read an arbitrary file.
  if (content === undefined && ext === ".dxf" && !isWithinAllowedRoot(effPath, drawingExtractAllowRoots())) {
    return { status: 403, body: { error: "path is outside the allowed upload directory", stage: "path_guard" } };
  }

  // Deterministic drawing producer (reads the real DXF off disk, or parses inline content).
  const producer = await callTool("prism_resource_extraction", "drawing_extract", { path: effPath, content });
  if (producer && typeof producer === "object" && "error" in producer) {
    // Generic message -- callTool already logs the dispatcher error server-side (index.ts); do not echo
    // the raw error (it can carry filesystem paths) back to an unauthenticated client.
    return { status: 422, body: { error: "drawing extraction failed", stage: "producer" } };
  }

  const wantRoute = b.route !== false; // default: also return the confirm-gated consumer fan-out plan
  const cadAction = wantRoute ? "blueprint_extract_and_route" : "blueprint_extract_contract";
  const cadParams: Record<string, unknown> = { drawing: producer };
  if (typeof b.confirmFloor === "number") cadParams.confirmFloor = b.confirmFloor;
  if (typeof b.source === "string") cadParams.source = b.source;
  if (b.titleBlock && typeof b.titleBlock === "object") cadParams.titleBlock = b.titleBlock;

  const cad = await callTool("prism_cad", cadAction, cadParams);
  if (cad && typeof cad === "object" && "error" in cad) {
    return { status: 422, body: { error: "contract normalization failed", stage: "contract_route" } };
  }

  // Slim producer summary (the full extraction can be 1000s of entities; the app binds to the contract).
  const p = (producer && typeof producer === "object" ? producer : {}) as Record<string, any>;
  const producerSummary = {
    units: p.metadata?.units,
    entity_count: p.metadata?.entityCount ?? (Array.isArray(p.entities) ? p.entities.length : 0),
    dimension_count: Array.isArray(p.dimensions) ? p.dimensions.length : 0,
    warnings: Array.isArray(p.warnings) ? p.warnings : [],
    part_info: p.partInfo,
  };
  // payload carries the contract + plan + `producer` TYPE TAG ("drawing"/"fused") + valid; expose the
  // extraction STATS under a distinct key so the spread's `producer` tag is not clobbered.
  const payload = (cad && typeof cad === "object" && "data" in cad ? (cad as { data: unknown }).data : cad) as Record<string, unknown>;
  return { status: 200, body: { result: { ...payload, producer_summary: producerSummary } } };
}

/** Creates the drawing-extraction router. @param callTool dispatcher call fn @returns router */
export function createDrawingRouter(callTool: CallToolFn): Router {
  const router = Router();

  // Durable async-OCR job store (per-job files). Co-located with the upload staging dir under tmp;
  // env-overridable. Terminal jobs are pruned lazily by the store's prune() (not auto-scheduled here).
  const jobsDir = process.env.PRISM_EXTRACTION_JOBS_DIR || path.join(os.tmpdir(), "prism-extraction-jobs");
  // Terminal-job retention before lazy pruning (default 1h; OCR jobs are ephemeral 10-60s). Clamp to a
  // >=60s floor so a malformed/tiny env (e.g. "5" or "-1") can never prune a just-done result before a
  // client polls poll_url (a sub-minute TTL would be a self-inflicted footgun).
  const ttlEnv = Number(process.env.PRISM_EXTRACTION_JOBS_TTL_MS);
  const jobsTtlMs = Number.isFinite(ttlEnv) && ttlEnv >= 60000 ? ttlEnv : 3600000;
  const store = new ExtractionJobStore(jobsDir);
  const jobDeps: DrawingJobDeps = {
    store,
    newJobId: () => `ocr-${randomUUID()}`,
    nowIso: () => new Date().toISOString(),
    enqueue: (jobId, _source) => {
      // Bound tmp growth WITHOUT a background timer (no R14 orphan): sweep terminal jobs older than the
      // TTL on each enqueue. Best-effort; the fresh queued job is younger than the TTL so it is untouched.
      try { store.prune(Date.now(), jobsTtlMs); } catch { /* best-effort cleanup, never blocks the new job */ }
      // Launch the runner; its `ocr` dep spawns the out-of-process ensemble exec. Fire-and-forget --
      // runExtractionJob never throws (records `failed` on any error), the .catch is belt-and-suspenders.
      void runExtractionJob(jobId, {
        store,
        ocr: (src: string) => ocrViaSubprocess(src),
        callTool,
        nowIso: () => new Date().toISOString(),
      }).catch(() => { /* runner is self-contained; nothing to surface here */ });
    },
  };

  // POST /api/v1/drawing/extract -- upload-to-contract in one call (see module doc). PDF/raster -> 202
  // {jobId, poll_url}; DXF/inline -> 200 contract synchronously.
  router.post("/extract", async (req, res, next) => {
    try {
      const { status, body } = await extractDrawingChain(callTool, req.body, jobDeps);
      res.status(status).json(body);
    } catch (e) { next(e); }
  });

  // GET /api/v1/drawing/extract/job/:jobId -- poll an async OCR job. 404 if unknown (an invalid/traversal
  // jobId resolves to null in the store's sanitized get(), so it is a clean 404, never a file escape).
  router.get("/extract/job/:jobId", (req, res, next) => {
    try {
      const { status, body } = pollJobResponse(store, req.params.jobId);
      res.status(status).json(body);
    } catch (e) { next(e); }
  });

  // POST /api/v1/drawing/execute -- drive a (reviewed) extraction CONTRACT to actual downstream consumer
  // dispatch end-to-end. Body: { contract, confirmedConsumers?, allowedKinds?, dryRun? }. The plan is
  // re-derived from the contract via the trusted blueprint_extract_route (no caller-injected actions);
  // commitment consumers (quote/program/inspection/...) NEVER fire without their id in confirmedConsumers.
  router.post("/execute", async (req, res, next) => {
    try {
      const { status, body } = await executePlanResponse(callTool, req.body);
      res.status(status).json(body);
    } catch (e) { next(e); }
  });

  return router;
}
