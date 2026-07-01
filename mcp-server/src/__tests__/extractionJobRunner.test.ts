/**
 * extractionJobRunner.test.ts -- U-XRAY-EXTRACTION-JOB-RUNNER.
 * Drives the runner against a REAL ExtractionJobStore (temp dir) with a mock OCR + mock callTool, covering
 * the happy path, every failure mode (OCR error / no-fused / contract error / thrown), and the
 * no-double-run claim guard.
 */
import { describe, it, expect, beforeEach, afterEach } from "vitest";
import * as fs from "fs";
import * as os from "os";
import * as path from "path";
import { ExtractionJobStore } from "../engines/blueprint-vision/extractionJobStore.js";
import { runExtractionJob, annotateEmptyExtraction, type JobRunnerDeps } from "../engines/blueprint-vision/extractionJobRunner.js";

let dir: string;
let store: ExtractionJobStore;
let clock: number;

function isoSeq(): string {
  // distinct, monotonically-increasing ISO timestamps
  return new Date(Date.UTC(2026, 5, 24, 12, 0, clock++)).toISOString();
}

function makeDeps(over: Partial<JobRunnerDeps> = {}): { deps: JobRunnerDeps; calls: any[] } {
  const calls: any[] = [];
  const deps: JobRunnerDeps = {
    store,
    ocr: async (source: string) => { calls.push({ ocr: source }); return { fused: { dimensions: [{ value_mm: 25.4 }], summary: { n_models: 2 } }, models_ok: 2 }; },
    callTool: async (toolName: string, action: string, params?: Record<string, unknown>) => {
      calls.push({ toolName, action, params });
      return { success: true, data: { contract: { schemaVersion: "1.0.0", dimensions: [{ value_mm: 25.4 }] }, plan: { consumers: [{ id: "quote" }] }, producer: "fused", valid: true } };
    },
    nowIso: isoSeq,
    ...over,
  };
  return { deps, calls };
}

beforeEach(() => {
  clock = 0;
  dir = path.join(os.tmpdir(), `prism-xray-jobrunner-${process.pid}-${performance.now().toString().replace(".", "")}`);
  store = new ExtractionJobStore(dir);
});
afterEach(() => {
  try { fs.rmSync(dir, { recursive: true, force: true }); } catch { /* best-effort */ }
});

function enqueue(jobId = "j"): string {
  store.create({ jobId, producer: "ocr-ensemble", source: "/up/print.pdf", nowIso: isoSeq() });
  return jobId;
}

describe("runExtractionJob", () => {
  it("happy path: OCR -> blueprint_extract_and_route -> done with {contract, plan}", async () => {
    enqueue();
    const { deps, calls } = makeDeps();
    await runExtractionJob("j", deps);
    const job = store.get("j");
    expect(job?.status).toBe("done");
    expect((job?.result as any).contract.schemaVersion).toBe("1.0.0");
    expect((job?.result as any).plan.consumers).toHaveLength(1);
    // the fused result was threaded to blueprint_extract_and_route as {fused}
    const cadCall = calls.find((c) => c.action === "blueprint_extract_and_route");
    expect(cadCall.params.fused.dimensions[0].value_mm).toBe(25.4);
  });

  it("OCR error -> failed with the OCR error surfaced, contract action NOT called", async () => {
    enqueue();
    const { deps, calls } = makeDeps({ ocr: async () => ({ fused: null, error: "no models survived" }) });
    await runExtractionJob("j", deps);
    expect(store.get("j")?.status).toBe("failed");
    expect(store.get("j")?.error).toMatch(/no models survived/);
    expect(calls.find((c) => c.action === "blueprint_extract_and_route")).toBeUndefined();
  });

  it("OCR returns no fused -> failed", async () => {
    enqueue();
    const { deps } = makeDeps({ ocr: async () => ({ fused: null }) });
    await runExtractionJob("j", deps);
    expect(store.get("j")?.status).toBe("failed");
    expect(store.get("j")?.error).toMatch(/no fused result/);
  });

  it("contract/route dispatcher error -> failed (generic message, no raw leak)", async () => {
    enqueue();
    const { deps } = makeDeps({ callTool: async () => ({ error: "normalizer rejected /tmp/secret.pdf" }) });
    await runExtractionJob("j", deps);
    expect(store.get("j")?.status).toBe("failed");
    expect(store.get("j")?.error).toBe("contract/route normalization failed");
    expect(store.get("j")?.error).not.toMatch(/\/tmp\//);
  });

  it("OCR throwing is caught and recorded as failed (runner never throws)", async () => {
    enqueue();
    const { deps } = makeDeps({ ocr: async () => { throw new Error("python rasterize crashed"); } });
    await expect(runExtractionJob("j", deps)).resolves.toBeUndefined();
    expect(store.get("j")?.status).toBe("failed");
    expect(store.get("j")?.error).toMatch(/rasterize crashed/);
  });

  it("missing job -> no-op (no throw, no OCR)", async () => {
    const { deps, calls } = makeDeps();
    await runExtractionJob("ghost", deps);
    expect(calls).toHaveLength(0);
  });

  it("does NOT re-run a job already past queued (no duplicate GPU OCR / clobber)", async () => {
    enqueue();
    store.transition("j", "running", { nowIso: isoSeq() });
    store.transition("j", "done", { result: { contract: { schemaVersion: "1.0.0" } }, nowIso: isoSeq() });
    const { deps, calls } = makeDeps();
    await runExtractionJob("j", deps);
    expect(calls).toHaveLength(0); // claim (queued->running) rejected -> no OCR
    expect(store.get("j")?.status).toBe("done"); // untouched
  });

  it("flags an empty extraction (0 dims + 0 callouts) on the done result -- no silent zero-content success", async () => {
    enqueue();
    const { deps } = makeDeps({
      callTool: async () => ({ success: true, data: { contract: { schemaVersion: "1.0.0", dimensions: [], gdt: [], notes: [] }, plan: {}, producer: "fused", valid: true } }),
    });
    await runExtractionJob("j", deps);
    const job = store.get("j");
    expect(job?.status).toBe("done"); // mechanically succeeded
    expect((job?.result as any).extraction_empty).toBe(true); // but the emptiness is surfaced
    expect((job?.result as any).warning).toMatch(/no dimensions or callouts/);
  });

  it("does NOT flag a non-empty extraction", async () => {
    enqueue();
    const { deps } = makeDeps(); // default contract has no dims array -> treat as content-bearing? assert via helper
    await runExtractionJob("j", deps);
    expect((store.get("j")?.result as any).extraction_empty).toBeUndefined();
  });

  describe("annotateEmptyExtraction (direct)", () => {
    it("annotates a fully-empty contract", () => {
      const out = annotateEmptyExtraction({ contract: { dimensions: [], gdt: [], notes: [], profiles: [], surface_finishes: [] }, plan: {} }) as any;
      expect(out.extraction_empty).toBe(true);
    });
    it("leaves a contract with any content untouched", () => {
      const payload = { contract: { dimensions: [{ value_mm: 5 }] }, plan: {} };
      expect(annotateEmptyExtraction(payload)).toBe(payload);
    });
    it("passes through a non-object payload unchanged", () => {
      expect(annotateEmptyExtraction(null)).toBeNull();
      expect(annotateEmptyExtraction("x")).toBe("x");
    });
  });

  it("transitions through running before completing", async () => {
    enqueue();
    // ocr observes the job is 'running' at OCR time (claim happened first)
    let statusAtOcr: string | undefined;
    const { deps } = makeDeps({
      ocr: async () => { statusAtOcr = store.get("j")?.status; return { fused: { dimensions: [] }, models_ok: 1 }; },
    });
    await runExtractionJob("j", deps);
    expect(statusAtOcr).toBe("running");
    expect(store.get("j")?.status).toBe("done");
  });
});
