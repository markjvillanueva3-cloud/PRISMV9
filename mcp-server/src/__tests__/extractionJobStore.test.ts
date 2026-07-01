/**
 * extractionJobStore.test.ts -- U-XRAY-EXTRACTION-JOB-STORE.
 * Real lifecycle + durability + forward-only-transition + adversarial-jobId coverage on a temp dir.
 */
import { describe, it, expect, beforeEach, afterEach } from "vitest";
import * as fs from "fs";
import * as os from "os";
import * as path from "path";
import {
  ExtractionJobStore,
  canTransition,
  EXTRACTION_JOB_SCHEMA_VERSION,
  type JobStatus,
} from "../engines/blueprint-vision/extractionJobStore.js";

let dir: string;
let store: ExtractionJobStore;
const T0 = "2026-06-24T12:00:00.000Z";
const T1 = "2026-06-24T12:00:05.000Z";
const T2 = "2026-06-24T12:00:10.000Z";

beforeEach(() => {
  dir = path.join(os.tmpdir(), `prism-xray-jobstore-${process.pid}-${performance.now().toString().replace(".", "")}`);
  store = new ExtractionJobStore(dir);
});
afterEach(() => {
  try { fs.rmSync(dir, { recursive: true, force: true }); } catch { /* best-effort */ }
});

describe("canTransition (forward-only state machine)", () => {
  it("allows the legal forward moves", () => {
    expect(canTransition("queued", "running")).toBe(true);
    expect(canTransition("queued", "failed")).toBe(true);
    expect(canTransition("running", "done")).toBe(true);
    expect(canTransition("running", "failed")).toBe(true);
  });
  it("rejects skipping running (queued -> done) and any move out of a terminal state", () => {
    expect(canTransition("queued", "done")).toBe(false);
    expect(canTransition("done", "running")).toBe(false);
    expect(canTransition("done", "failed")).toBe(false);
    expect(canTransition("failed", "running")).toBe(false);
    expect(canTransition("running", "queued")).toBe(false); // never backward
  });
});

describe("ExtractionJobStore create/get", () => {
  it("creates a queued, schema-versioned record and reads it back", () => {
    const rec = store.create({ jobId: "job-1", producer: "ocr-ensemble", source: "/up/x.pdf", nowIso: T0 });
    expect(rec.status).toBe("queued");
    expect(rec.schemaVersion).toBe(EXTRACTION_JOB_SCHEMA_VERSION);
    const got = store.get("job-1");
    expect(got?.status).toBe("queued");
    expect(got?.source).toBe("/up/x.pdf");
    expect(got?.createdAt).toBe(T0);
  });

  it("returns null for an unknown job", () => {
    expect(store.get("nope")).toBeNull();
  });

  it("refuses to clobber an existing job (no silent overwrite)", () => {
    store.create({ jobId: "dup", producer: "ocr-ensemble", source: "a", nowIso: T0 });
    expect(() => store.create({ jobId: "dup", producer: "ocr-ensemble", source: "b", nowIso: T1 })).toThrow(/already exists/);
  });

  it("persists across a fresh store instance on the same dir (durability)", () => {
    store.create({ jobId: "durable", producer: "ocr-ensemble", source: "s", nowIso: T0 });
    const reopened = new ExtractionJobStore(dir);
    expect(reopened.get("durable")?.jobId).toBe("durable");
  });

  it("returns null (does not throw) on a corrupt/torn job file", () => {
    store.create({ jobId: "corrupt", producer: "ocr-ensemble", source: "s", nowIso: T0 });
    fs.writeFileSync(path.join(dir, "corrupt.json"), "{ not json", "utf-8");
    expect(store.get("corrupt")).toBeNull();
  });
});

describe("ExtractionJobStore transition (forward-only, persisted)", () => {
  it("advances queued -> running -> done with a result, persisted", () => {
    store.create({ jobId: "j", producer: "ocr-ensemble", source: "s", nowIso: T0 });
    expect(store.transition("j", "running", { nowIso: T1 }).ok).toBe(true);
    const done = store.transition("j", "done", { result: { contract: { schemaVersion: "1.0.0" }, plan: {} }, nowIso: T2 });
    expect(done.ok).toBe(true);
    const got = store.get("j");
    expect(got?.status).toBe("done");
    expect(got?.updatedAt).toBe(T2);
    expect((got?.result as any).contract.schemaVersion).toBe("1.0.0");
  });

  it("records a failure with an error message", () => {
    store.create({ jobId: "f", producer: "ocr-ensemble", source: "s", nowIso: T0 });
    store.transition("f", "running", { nowIso: T1 });
    const res = store.transition("f", "failed", { error: "ocr returned 0 models", nowIso: T2 });
    expect(res.ok).toBe(true);
    expect(store.get("f")?.status).toBe("failed");
    expect(store.get("f")?.error).toMatch(/0 models/);
  });

  it("rejects an illegal transition (done -> running) without mutating the record", () => {
    store.create({ jobId: "j", producer: "ocr-ensemble", source: "s", nowIso: T0 });
    store.transition("j", "running", { nowIso: T1 });
    store.transition("j", "done", { result: {}, nowIso: T2 });
    const bad = store.transition("j", "running", { nowIso: "2026-06-24T13:00:00.000Z" });
    expect(bad.ok).toBe(false);
    if (!bad.ok) expect(bad.reason).toMatch(/illegal transition/);
    expect(store.get("j")?.status).toBe("done"); // unchanged
    expect(store.get("j")?.updatedAt).toBe(T2);
  });

  it("rejects a transition on a missing job", () => {
    const res = store.transition("ghost", "running", { nowIso: T1 });
    expect(res.ok).toBe(false);
    if (!res.ok) expect(res.reason).toMatch(/not found/);
  });
});

describe("ExtractionJobStore adversarial jobId (filename safety)", () => {
  it("rejects a traversal jobId on create", () => {
    expect(() => store.create({ jobId: "../escape", producer: "p", source: "s", nowIso: T0 })).toThrow(/invalid jobId/);
  });
  it("rejects a jobId with a path separator or dot-segments", () => {
    expect(() => store.create({ jobId: "a/b", producer: "p", source: "s", nowIso: T0 })).toThrow(/invalid jobId/);
    expect(() => store.create({ jobId: "..", producer: "p", source: "s", nowIso: T0 })).toThrow(/invalid jobId/);
  });
  it("get returns null (not throw) for an invalid jobId", () => {
    expect(store.get("../../etc/passwd")).toBeNull();
  });
});

describe("ExtractionJobStore prune", () => {
  it("removes old terminal jobs, keeps fresh + non-terminal", () => {
    const old = "2026-06-24T00:00:00.000Z"; // 12h before nowMs below
    store.create({ jobId: "old-done", producer: "p", source: "s", nowIso: old });
    store.transition("old-done", "running", { nowIso: old });
    store.transition("old-done", "done", { result: {}, nowIso: old });
    store.create({ jobId: "old-queued", producer: "p", source: "s", nowIso: old }); // non-terminal -> keep
    store.create({ jobId: "fresh-done", producer: "p", source: "s", nowIso: T0 });
    store.transition("fresh-done", "running", { nowIso: T0 });
    store.transition("fresh-done", "done", { result: {}, nowIso: T0 });

    const nowMs = Date.parse("2026-06-24T12:00:00.000Z");
    const removed = store.prune(nowMs, 6 * 3600 * 1000); // 6h TTL
    expect(removed).toBe(1); // only old-done
    expect(store.get("old-done")).toBeNull();
    expect(store.get("old-queued")?.status).toBe("queued"); // non-terminal preserved
    expect(store.get("fresh-done")?.status).toBe("done"); // within TTL preserved
  });
});
