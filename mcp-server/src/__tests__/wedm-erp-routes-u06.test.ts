/**
 * WEDM-ERP-MS0 / U-WEDM-ERP06 — ERP Job CRUD routes
 *
 *   POST  /job/create                  (already existed — now persists with status)
 *   GET   /job/:id                     (already existed — now returns status + history)
 *   PATCH /job/:id/status              (new — update status with transition rules)
 *   GET   /job/list                    (new — filter + paginate + sort)
 *   GET   /job/queue/:machine_id       (new — per-machine active queue)
 */
import { describe, it, expect, beforeAll, afterAll, beforeEach, vi } from "vitest";

vi.mock("../middleware/auth.js", () => ({
  verifyToken: (req: unknown, _res: unknown, next: () => void) => {
    (req as { userId?: string; userRoles?: string[] }).userId = "test-user";
    (req as { userId?: string; userRoles?: string[] }).userRoles = ["job:write", "job:read"];
    next();
  },
  requireRole: () => (_req: unknown, _res: unknown, next: () => void) => next(),
  requirePermission: () => (_req: unknown, _res: unknown, next: () => void) => next(),
}));

import { createServer, type Server } from "http";
import express from "express";
import { createWedmErpRouter, _resetWedmErpState } from "../routes/wedm-erp.js";

let server: Server;
let baseUrl: string;

beforeAll(async () => {
  const app = express();
  app.use(express.json({ limit: "1mb" }));
  app.use("/api/v1/wedm-erp", createWedmErpRouter());
  server = createServer(app);
  await new Promise<void>((resolve) => server.listen(0, "127.0.0.1", () => resolve()));
  const addr = server.address();
  if (addr && typeof addr === "object") {
    baseUrl = `http://127.0.0.1:${addr.port}/api/v1/wedm-erp`;
  }
});

afterAll(async () => {
  await new Promise<void>((resolve) => server.close(() => resolve()));
});

beforeEach(() => {
  _resetWedmErpState();
});

async function post(path: string, body: unknown) {
  const res = await fetch(`${baseUrl}${path}`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: "Bearer test" },
    body: JSON.stringify(body),
  });
  const b = (await res.json().catch(() => ({}))) as Record<string, unknown>;
  return { status: res.status, body: b };
}
async function patch(path: string, body: unknown) {
  const res = await fetch(`${baseUrl}${path}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json", Authorization: "Bearer test" },
    body: JSON.stringify(body),
  });
  const b = (await res.json().catch(() => ({}))) as Record<string, unknown>;
  return { status: res.status, body: b };
}
async function get(path: string) {
  const res = await fetch(`${baseUrl}${path}`, {
    headers: { Authorization: "Bearer test" },
  });
  const b = (await res.json().catch(() => ({}))) as Record<string, unknown>;
  return { status: res.status, body: b };
}

// ─── Program result fixture — minimal shape that WEDMJobCreatorEngine accepts ──

function makeProgramResult(overrides: Record<string, unknown> = {}): Record<string, unknown> {
  return {
    success: true,
    controller: "mitsubishi",
    line_count: 120,
    profiles_cut: 1,
    passes_per_profile: 4,
    estimated_time_min: 45,
    predicted_ra_um: 1.8,
    wire_consumption_m: 52,
    program: "%\n(TEST)\nM30\n%",
    setup_sheet: {
      part_number: "P-12345",
      part_name: "Test Die",
      material: "D2",
      thickness_mm: 25.4,
      wire_type: "brass",
      wire_diameter_mm: 0.25,
    },
    pass_details: [
      { pass_number: 1, type: "rough", offset_mm: 0.180, e_pack_code: "E282R", predicted_ra_um: 3.5, tension_N: 8 },
      { pass_number: 2, type: "skim", offset_mm: 0.140, e_pack_code: "E162S", predicted_ra_um: 2.2, tension_N: 9 },
      { pass_number: 3, type: "skim", offset_mm: 0.130, e_pack_code: "E142S", predicted_ra_um: 1.5, tension_N: 10 },
      { pass_number: 4, type: "skim", offset_mm: 0.128, e_pack_code: "E122S", predicted_ra_um: 1.1, tension_N: 11 },
    ],
    warnings: [],
    ...overrides,
  };
}

async function createJob(options: Record<string, unknown> = {}, programOverrides: Record<string, unknown> = {}) {
  const r = await post("/job/create", {
    program_result: makeProgramResult(programOverrides),
    options: {
      customer: "ITW",
      part_number: "P-12345",
      part_name: "Test Die",
      quantity: 10,
      due_date: "2026-05-01",
      priority: "standard",
      machine_id: "mitsubishi-mv1200r-01",
      ...options,
    },
  });
  expect(r.status).toBe(200);
  const data = r.body.data as { job: { jobId: string }; status: string };
  return { jobId: data.job.jobId, status: data.status };
}

// ─── POST /job/create — persistence ─────────────────────────────────────────

describe("U-WEDM-ERP06: POST /job/create (persists with status)", () => {
  it("creates a job with status 'scheduled' and empty history", async () => {
    const { jobId, status } = await createJob();
    expect(jobId).toMatch(/^WEDM-/);
    expect(status).toBe("scheduled");
    const g = await get(`/job/${jobId}`);
    expect(g.status).toBe(200);
    const data = g.body.data as { status: string; history: unknown[]; actuals: unknown };
    expect(data.status).toBe("scheduled");
    expect(data.history).toEqual([]);
    expect(data.actuals).toBeNull();
  });
});

// ─── GET /job/:id ───────────────────────────────────────────────────────────

describe("U-WEDM-ERP06: GET /job/:id", () => {
  it("returns 404 for unknown job", async () => {
    const r = await get("/job/NOPE");
    expect(r.status).toBe(404);
  });

  it("returns full tracked state including created_at timestamp", async () => {
    const { jobId } = await createJob();
    const r = await get(`/job/${jobId}`);
    const data = r.body.data as { created_at: string; updated_at: string; job: { jobId: string } };
    expect(data.created_at).toMatch(/^\d{4}-\d{2}-\d{2}T/);
    expect(data.updated_at).toBe(data.created_at);
    expect(data.job.jobId).toBe(jobId);
  });
});

// ─── PATCH /job/:id/status ──────────────────────────────────────────────────

describe("U-WEDM-ERP06: PATCH /job/:id/status", () => {
  it("advances scheduled → threading and records history", async () => {
    const { jobId } = await createJob();
    const r = await patch(`/job/${jobId}/status`, { status: "threading", operator: "alice" });
    expect(r.status).toBe(200);
    const data = r.body.data as { from: string; to: string; history: Array<Record<string, unknown>> };
    expect(data.from).toBe("scheduled");
    expect(data.to).toBe("threading");
    expect(data.history).toHaveLength(1);
    expect(data.history[0].operator).toBe("alice");
  });

  it("rejects illegal transition with 409 (scheduled → qc)", async () => {
    const { jobId } = await createJob();
    const r = await patch(`/job/${jobId}/status`, { status: "qc" });
    expect(r.status).toBe(409);
    expect(String(r.body.error)).toMatch(/illegal transition/i);
  });

  it("rejects same-status update with 400", async () => {
    const { jobId } = await createJob();
    const r = await patch(`/job/${jobId}/status`, { status: "scheduled" });
    expect(r.status).toBe(400);
    expect(String(r.body.error)).toMatch(/already in status/i);
  });

  it("complete is terminal — any further transition rejected with 409", async () => {
    const { jobId } = await createJob();
    await patch(`/job/${jobId}/status`, { status: "threading" });
    await patch(`/job/${jobId}/status`, { status: "rough_cutting" });
    await patch(`/job/${jobId}/status`, { status: "skim_cutting" });
    await patch(`/job/${jobId}/status`, { status: "qc" });
    await patch(`/job/${jobId}/status`, { status: "complete" });
    const r = await patch(`/job/${jobId}/status`, { status: "rough_cutting" });
    expect(r.status).toBe(409);
    expect(String(r.body.error)).toMatch(/terminal|illegal/i);
  });

  it("on_hold → resume back to scheduled is allowed", async () => {
    const { jobId } = await createJob();
    await patch(`/job/${jobId}/status`, { status: "threading" });
    await patch(`/job/${jobId}/status`, { status: "on_hold", note: "wire break" });
    const r = await patch(`/job/${jobId}/status`, { status: "threading" });
    expect(r.status).toBe(200);
    const data = r.body.data as { history: Array<{ note: string | null }> };
    expect(data.history).toHaveLength(3);
    expect(data.history[1].note).toBe("wire break");
  });

  it("returns 404 for unknown job", async () => {
    const r = await patch("/job/NOPE/status", { status: "threading" });
    expect(r.status).toBe(404);
  });

  it("rejects invalid status enum with 400", async () => {
    const { jobId } = await createJob();
    const r = await patch(`/job/${jobId}/status`, { status: "frolicking" });
    expect(r.status).toBe(400);
  });

  it("marks target department 'current' when advancing", async () => {
    const { jobId } = await createJob();
    await patch(`/job/${jobId}/status`, { status: "threading" });
    const g = await get(`/job/${jobId}`);
    const job = (g.body.data as { job: { departments: Array<{ id: string; status: string }> } }).job;
    const setupDept = job.departments.find((d) => d.id === "setup");
    expect(setupDept?.status).toBe("current");
  });
});

// ─── GET /job/list ──────────────────────────────────────────────────────────

describe("U-WEDM-ERP06: GET /job/list", () => {
  it("lists all jobs with pagination metadata", async () => {
    await createJob({ priority: "standard", machine_id: "mv1200r-01" });
    await createJob({ priority: "rush", machine_id: "mv1200r-02" });
    await createJob({ priority: "emergency", machine_id: "mv1200r-01" });
    const r = await get("/job/list");
    expect(r.status).toBe(200);
    const data = r.body.data as { total: number; count: number; jobs: unknown[] };
    expect(data.total).toBe(3);
    expect(data.count).toBe(3);
    expect(data.jobs).toHaveLength(3);
  });

  it("default sort priority_desc puts emergency first", async () => {
    await createJob({ priority: "standard" });
    await createJob({ priority: "emergency" });
    await createJob({ priority: "rush" });
    const r = await get("/job/list");
    const jobs = (r.body.data as { jobs: Array<{ priority: string }> }).jobs;
    expect(jobs[0].priority).toBe("emergency");
    expect(jobs[1].priority).toBe("rush");
    expect(jobs[2].priority).toBe("standard");
  });

  it("filters by machine_id", async () => {
    await createJob({ machine_id: "mv1200r-01" });
    await createJob({ machine_id: "mv2400s-01" });
    await createJob({ machine_id: "mv1200r-01" });
    const r = await get("/job/list?machine_id=mv1200r-01");
    const data = r.body.data as { total: number };
    expect(data.total).toBe(2);
  });

  it("filters by status", async () => {
    const a = await createJob();
    await createJob();
    await patch(`/job/${a.jobId}/status`, { status: "threading" });
    const r = await get("/job/list?status=scheduled");
    expect((r.body.data as { total: number }).total).toBe(1);
  });

  it("filters by customer (case-insensitive substring)", async () => {
    await createJob({ customer: "ITW Fasteners" });
    await createJob({ customer: "Alcoa" });
    const r = await get("/job/list?customer=itw");
    expect((r.body.data as { total: number }).total).toBe(1);
  });

  it("respects limit + offset", async () => {
    for (let i = 0; i < 5; i++) await createJob();
    const r = await get("/job/list?limit=2&offset=1");
    const data = r.body.data as { total: number; count: number; limit: number; offset: number };
    expect(data.total).toBe(5);
    expect(data.count).toBe(2);
    expect(data.limit).toBe(2);
    expect(data.offset).toBe(1);
  });

  it("rejects invalid query params with 400", async () => {
    const r = await get("/job/list?limit=9999");
    expect(r.status).toBe(400);
  });
});

// ─── GET /job/queue/:machine_id ─────────────────────────────────────────────

describe("U-WEDM-ERP06: GET /job/queue/:machine_id", () => {
  it("returns only active jobs for the specified machine", async () => {
    const a = await createJob({ machine_id: "mv1200r-01", priority: "rush" });
    await createJob({ machine_id: "mv1200r-02" });
    const b = await createJob({ machine_id: "mv1200r-01", priority: "emergency" });

    // Complete one job — it should leave the queue
    const c = await createJob({ machine_id: "mv1200r-01" });
    await patch(`/job/${c.jobId}/status`, { status: "threading" });
    await patch(`/job/${c.jobId}/status`, { status: "rough_cutting" });
    await patch(`/job/${c.jobId}/status`, { status: "skim_cutting" });
    await patch(`/job/${c.jobId}/status`, { status: "qc" });
    await patch(`/job/${c.jobId}/status`, { status: "complete" });

    const r = await get("/job/queue/mv1200r-01");
    expect(r.status).toBe(200);
    const data = r.body.data as {
      machine_id: string;
      count: number;
      queue: Array<{ job_id: string; priority: string }>;
      total_estimated_minutes: number;
    };
    expect(data.machine_id).toBe("mv1200r-01");
    expect(data.count).toBe(2);
    // emergency before rush
    expect(data.queue[0].job_id).toBe(b.jobId);
    expect(data.queue[1].job_id).toBe(a.jobId);
    expect(data.total_estimated_minutes).toBeGreaterThan(0);
  });

  it("returns empty queue (not 404) for a machine with no active jobs", async () => {
    await createJob({ machine_id: "mv1200r-01" });
    const r = await get("/job/queue/mv2400s-99");
    expect(r.status).toBe(200);
    const data = r.body.data as { count: number; queue: unknown[] };
    expect(data.count).toBe(0);
    expect(data.queue).toEqual([]);
  });
});
