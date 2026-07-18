/**
 * extractionJobRunner.ts -- runs an enqueued async blueprint-OCR job to completion
 * (U-XRAY-EXTRACTION-JOB-RUNNER). Drives the lifecycle:
 *   queued -> running -> (OCR -> fused -> normalize-contract+route) -> done | failed
 *
 * Every side-effect is an INJECTED dependency, so the runner is fully unit-testable with mocks AND the
 * heavy GPU OCR stays out-of-process (the `ocr` dep, default = a child-process spawn of the ensemble,
 * is supplied by the route -- NOT run here). The runner NEVER throws: any failure is recorded on the job
 * as `failed` so the poll endpoint always returns a definite terminal state (R12 fail-loud, on the job).
 */
import type { ExtractionJobStore } from "./extractionJobStore.js";

/** Shape returned by the OCR dependency: the VLM-ensemble `fused` extraction (or an error). */
export interface OcrResult {
  fused: unknown;
  models_ok?: number;
  error?: string;
}

/** Total extracted content in a contract (dims + gd&t + notes + profiles + surface finishes). */
function contractContentCount(contract: unknown): number {
  if (!contract || typeof contract !== "object") return 0;
  const c = contract as Record<string, unknown>;
  return ["dimensions", "gdt", "notes", "profiles", "surface_finishes"].reduce(
    (n, k) => n + (Array.isArray(c[k]) ? (c[k] as unknown[]).length : 0),
    0,
  );
}

/**
 * Honest empty-extraction signal. A mechanically-successful job that read NOTHING (0 dims + 0
 * gd&t/notes/finishes) is still `done` (the page may be blank/unreadable), but a BARE `done` on a
 * zero-content extraction is the silent-loss the galaxy's "confidence-blind extraction forbidden" rail
 * prohibits -- so the result is annotated `extraction_empty` for the poll endpoint to surface.
 */
export function annotateEmptyExtraction(payload: unknown): unknown {
  if (!payload || typeof payload !== "object") return payload;
  const contract = (payload as Record<string, unknown>).contract;
  if (contractContentCount(contract) === 0) {
    return {
      ...(payload as object),
      extraction_empty: true,
      warning: "OCR produced no dimensions or callouts (the page may be blank or unreadable) -- operator review required",
    };
  }
  return payload;
}

export interface JobRunnerDeps {
  store: ExtractionJobStore;
  /** OCR one source (pdf/png path) -> { fused }. Injected: GPU work stays out-of-process + testable. */
  ocr: (source: string) => Promise<OcrResult>;
  /** Dispatcher call (toolName, action, params) -> result. Used for prism_cad blueprint_extract_and_route. */
  callTool: (toolName: string, action: string, params?: Record<string, unknown>) => Promise<unknown>;
  /** Injected clock (ISO) so transitions are deterministically testable. */
  nowIso: () => string;
}

/**
 * Run job `jobId` to a terminal state. Idempotent against re-entry: a job not in `queued` (already
 * running/terminal) is left untouched (the running-transition guard rejects, so we return without re-OCR).
 */
export async function runExtractionJob(jobId: string, deps: JobRunnerDeps): Promise<void> {
  const { store, ocr, callTool, nowIso } = deps;

  const job = store.get(jobId);
  if (!job) return; // nothing to run

  // Claim the job: queued -> running. If this fails the job is already running/terminal (raced or
  // double-dispatched) -- do NOT re-run (avoids a duplicate GPU OCR + a clobbered result).
  const claimed = store.transition(jobId, "running", { nowIso: nowIso() });
  if (!claimed.ok) return;

  try {
    const ocrRes = await ocr(job.source);
    if (!ocrRes || ocrRes.error || ocrRes.fused == null) {
      store.transition(jobId, "failed", {
        error: `OCR failed: ${ocrRes?.error ?? "no fused result"}`,
        nowIso: nowIso(),
      });
      return;
    }

    const cad = await callTool("prism_cad", "blueprint_extract_and_route", { fused: ocrRes.fused });
    if (cad && typeof cad === "object" && "error" in cad) {
      // Generic message -- the dispatcher logs the detail; do not surface raw internals on the job.
      store.transition(jobId, "failed", { error: "contract/route normalization failed", nowIso: nowIso() });
      return;
    }

    const payload = cad && typeof cad === "object" && "data" in cad ? (cad as { data: unknown }).data : cad;
    store.transition(jobId, "done", { result: annotateEmptyExtraction(payload), nowIso: nowIso() });
  } catch (e) {
    store.transition(jobId, "failed", { error: e instanceof Error ? e.message : String(e), nowIso: nowIso() });
  }
}
