/**
 * Tests for the CAD-regression dashboard Express routes (U-CINF08).
 *
 * Real-behavior tests via supertest. Seeds a tmp state dir with a real
 * TestBatch JSON document + asserts concrete counts/lifecycle from the
 * resulting DashboardSnapshot.
 */
import { describe, it, expect, beforeAll, afterAll } from "vitest";
import express from "express";
import request from "supertest";
import { mkdirSync, writeFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { createCadRegressionRouter } from "../routes/cadRegression.js";
import { cadRegressionDashboardEngine } from "../engines/CADRegressionDashboardEngine.js";

const TMP_ROOT = join(tmpdir(), `cad-regression-route-test-${Date.now()}`);
const STATE_DIR = join(TMP_ROOT, "running");
const BATCH_ID = "test-batch-cinf08";

beforeAll(() => {
  mkdirSync(STATE_DIR, { recursive: true });
  const batch = {
    schemaVersion: 1,
    batchId: BATCH_ID,
    createdAt: "2026-05-13T07:00:00.000Z",
    lastCheckpoint: "2026-05-13T07:05:00.000Z",
    updatedAt: "2026-05-13T07:05:00.000Z",
    files: {
      "a.step": {
        fileId: "a.step", status: "pass", errorType: "none",
        durationMs: 1200, retries: 0, completedAt: "2026-05-13T07:01:00.000Z",
      },
      "b.step": {
        fileId: "b.step", status: "fail", errorType: "parse",
        durationMs: 800, retries: 1, completedAt: "2026-05-13T07:02:00.000Z",
      },
      "c.iges": {
        fileId: "c.iges", status: "pending", errorType: "none",
        durationMs: 0, retries: 0, completedAt: null,
      },
    },
  };
  writeFileSync(join(STATE_DIR, `${BATCH_ID}.json`), JSON.stringify(batch));
});

afterAll(() => {
  try { rmSync(TMP_ROOT, { recursive: true, force: true }); } catch { /* best effort */ }
});

function makeApp(stateDir?: string) {
  const app = express();
  if (stateDir) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const eng = cadRegressionDashboardEngine as any;
    const origSnap = eng.snapshot.bind(eng);
    const origList = eng.listBatches.bind(eng);
    eng.snapshot = async (id: string) => origSnap(id, stateDir);
    eng.listBatches = async () => origList(stateDir);
  }
  app.use("/api/v1/cad-regression", createCadRegressionRouter());
  return app;
}

describe("cadRegression route — /progress input validation", () => {
  it("missing batchId returns 400 with regex hint", async () => {
    const app = makeApp();
    const r = await request(app).get("/api/v1/cad-regression/progress");
    expect(r.status).toBe(400);
    expect(typeof r.body.error).toBe("string");
    expect(r.body.error).toMatch(/batchId/i);
  });

  it("path-traversal batchId rejected with 400", async () => {
    const app = makeApp();
    const r = await request(app).get("/api/v1/cad-regression/progress?batchId=../etc/passwd");
    expect(r.status).toBe(400);
  });

  it("batchId longer than 64 chars rejected with 400", async () => {
    const app = makeApp();
    const long = "x".repeat(65);
    const r = await request(app).get(`/api/v1/cad-regression/progress?batchId=${long}`);
    expect(r.status).toBe(400);
  });

  it("batchId with shell metacharacter rejected with 400", async () => {
    const app = makeApp();
    const r = await request(app).get(`/api/v1/cad-regression/progress?batchId=foo;rm`);
    expect(r.status).toBe(400);
  });
});

describe("cadRegression route — /progress real fixture", () => {
  it("returns snapshot with exact counts.total === 3", async () => {
    const app = makeApp(STATE_DIR);
    const r = await request(app).get(`/api/v1/cad-regression/progress?batchId=${BATCH_ID}`);
    expect(r.status).toBe(200);
    expect(r.body.batchId).toBe(BATCH_ID);
    expect(r.body.schemaVersion).toBe(1);
    expect(r.body.counts.total).toBe(3);
  });

  it("counts.passed === 1 and counts.failed === 1 for the seeded fixture", async () => {
    const app = makeApp(STATE_DIR);
    const r = await request(app).get(`/api/v1/cad-regression/progress?batchId=${BATCH_ID}`);
    expect(r.body.counts.passed).toBe(1);
    expect(r.body.counts.failed).toBe(1);
    expect(r.body.counts.pending).toBe(1);
  });

  it("errorBreakdown.parse === 1 (matches seeded fail row)", async () => {
    const app = makeApp(STATE_DIR);
    const r = await request(app).get(`/api/v1/cad-regression/progress?batchId=${BATCH_ID}`);
    expect(r.body.errorBreakdown.parse).toBe(1);
    expect(r.body.errorBreakdown.format).toBe(0);
    expect(r.body.errorBreakdown.timeout).toBe(0);
  });

  it("lifecycle === 'running' (1 pending file in batch)", async () => {
    const app = makeApp(STATE_DIR);
    const r = await request(app).get(`/api/v1/cad-regression/progress?batchId=${BATCH_ID}`);
    expect(r.body.lifecycle).toBe("running");
  });

  it("pctComplete === 67 (2 of 3 → 66.67 rounds to 67)", async () => {
    const app = makeApp(STATE_DIR);
    const r = await request(app).get(`/api/v1/cad-regression/progress?batchId=${BATCH_ID}`);
    expect(r.body.pctComplete).toBe(67);
  });

  it("windowMinutes=9999 clamps to throughput.windowMinutes === 60", async () => {
    const app = makeApp(STATE_DIR);
    const r = await request(app).get(
      `/api/v1/cad-regression/progress?batchId=${BATCH_ID}&windowMinutes=9999`,
    );
    expect(r.status).toBe(200);
    expect(r.body.throughput.windowMinutes).toBe(60);
  });

  it("recentLimit=9999 clamps recentFailures.length <= 100", async () => {
    const app = makeApp(STATE_DIR);
    const r = await request(app).get(
      `/api/v1/cad-regression/progress?batchId=${BATCH_ID}&recentLimit=9999`,
    );
    expect(r.status).toBe(200);
    expect(r.body.recentFailures.length <= 100).toBe(true);
  });
});

describe("cadRegression route — /summary", () => {
  it("count field matches batches.length", async () => {
    const app = makeApp(STATE_DIR);
    const r = await request(app).get("/api/v1/cad-regression/summary");
    expect(r.status).toBe(200);
    expect(Array.isArray(r.body.batches)).toBe(true);
    expect(r.body.count).toBe(r.body.batches.length);
  });

  it("seeded batch appears with total === 3 and completed === 2", async () => {
    const app = makeApp(STATE_DIR);
    const r = await request(app).get("/api/v1/cad-regression/summary");
    const found = r.body.batches.find((b: { batchId: string }) => b.batchId === BATCH_ID);
    expect(found === undefined).toBe(false);
    expect(found.total).toBe(3);
    expect(found.completed).toBe(2);
  });
});

describe("cadRegression route — /stream (SSE)", () => {
  it("missing batchId returns 400", async () => {
    const app = makeApp();
    const r = await request(app).get("/api/v1/cad-regression/stream");
    expect(r.status).toBe(400);
  });

  it("completed batch produces SSE response with content-type text/event-stream", async () => {
    const completedDir = join(TMP_ROOT, "completed");
    mkdirSync(completedDir, { recursive: true });
    const completedId = "completed-batch";
    const batch = {
      schemaVersion: 1,
      batchId: completedId,
      createdAt: "2026-05-13T06:00:00.000Z",
      lastCheckpoint: "2026-05-13T06:05:00.000Z",
      updatedAt: "2026-05-13T06:05:00.000Z",
      files: {
        "p.step": {
          fileId: "p.step", status: "pass", errorType: "none",
          durationMs: 500, retries: 0, completedAt: "2026-05-13T06:01:00.000Z",
        },
      },
    };
    writeFileSync(join(completedDir, `${completedId}.json`), JSON.stringify(batch));

    const app = makeApp(completedDir);
    const r = await request(app).get(`/api/v1/cad-regression/stream?batchId=${completedId}`);
    expect(r.status).toBe(200);
    expect(r.headers["content-type"]).toMatch(/text\/event-stream/);
    expect(r.text.includes("event: snapshot")).toBe(true);
    expect(r.text.includes(completedId)).toBe(true);
  });
});
