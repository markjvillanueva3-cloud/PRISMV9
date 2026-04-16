/**
 * LATHE-PRO-MS-2 Session 6 — U-LPU08
 * Lathe Turning Route Tests
 *
 * Verifies the REST API endpoints for the zero-experience lathe UI:
 *   POST /api/v1/lathe/upload        — File upload → intake engine
 *   POST /api/v1/lathe/wizard-submit — Wizard → full pipeline (returns jobId)
 *   GET  /api/v1/lathe/result/:id    — Fetch completed result
 *   GET  /api/v1/lathe/progress/:id  — SSE progress stream
 *   GET  /api/v1/lathe/download/:id/:artifact — Download artifacts
 */

import express from "express";
import http from "node:http";
import { once } from "node:events";
import type { AddressInfo } from "node:net";
import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import { registerRoutes } from "../routes/index.js";

type CallRecord = {
  toolName: string;
  action: string;
  params?: Record<string, any>;
};

let server: http.Server;
let port = 0;
const calls: CallRecord[] = [];

function httpRequest(
  method: string,
  urlPath: string,
  body?: Record<string, any>,
): Promise<{ status: number; data: any }> {
  return new Promise((resolve, reject) => {
    const serialized = body ? JSON.stringify(body) : undefined;
    const req = http.request(
      {
        hostname: "127.0.0.1",
        port,
        path: urlPath,
        method,
        headers: serialized
          ? { "Content-Type": "application/json", "Content-Length": Buffer.byteLength(serialized).toString() }
          : {},
      },
      (res) => {
        const chunks: Buffer[] = [];
        res.on("data", (chunk: Buffer) => chunks.push(chunk));
        res.on("end", () => {
          const text = Buffer.concat(chunks).toString();
          try { resolve({ status: res.statusCode ?? 0, data: JSON.parse(text) }); }
          catch { resolve({ status: res.statusCode ?? 0, data: text }); }
        });
      },
    );
    req.on("error", reject);
    if (serialized) req.write(serialized);
    req.end();
  });
}

/** Poll until job completes or timeout */
async function waitForJob(jobId: string, timeoutMs = 10000): Promise<{ status: number; data: any }> {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    const r = await httpRequest("GET", `/api/v1/lathe/result/${jobId}`);
    if (r.status === 200) return r;
    await new Promise(res => setTimeout(res, 200));
  }
  throw new Error(`Job ${jobId} did not complete in ${timeoutMs}ms`);
}

describe("Lathe Turning route registration", () => {
  beforeAll(async () => {
    const app = express();
    app.use(express.json());
    registerRoutes(app, async (toolName, action, params) => {
      calls.push({ toolName, action, params });
      // Return a realistic mock result for turning_print_to_program
      if (action === "turning_print_to_program") {
        return {
          success: true,
          part_number: params?.part_number ?? "MOCK",
          material: "4140 Steel",
          bar_stock_od_mm: 50,
          part_length_mm: 80,
          operations: [{ type: "od_rough", tool_number: 1 }],
          total_operations: 1,
          total_tool_changes: 1,
          estimated_cycle_time_sec: 120,
          program_text: "O0001\nG28 U0 W0\nM30\n",
          program_line_count: 3,
          setup_notes: ["Chuck at Z0", "Tool T0101 = CNMG 120408"],
          confidence_score: 85,
          warnings: [],
        };
      }
      return { ok: true, toolName, action, params };
    });

    server = app.listen(0);
    await once(server, "listening");
    port = (server.address() as AddressInfo).port;
  });

  afterAll(async () => {
    if (server?.listening) {
      await new Promise<void>((resolve, reject) => {
        server.close((err) => (err ? reject(err) : resolve()));
      });
    }
  });

  beforeEach(() => {
    calls.length = 0;
  });

  // ── Upload endpoint ────────────────────────────────────────────────────

  it("POST /upload routes photo files to blueprint intake", async () => {
    const response = await httpRequest("POST", "/api/v1/lathe/upload", {
      fileName: "drawing.jpg",
      fileData: "base64encodeddata",
      fileType: "photo",
    });
    expect(response.status).toBe(200);
    expect(response.data.ok).toBe(true);
    expect(response.data.detectedRoute).toBe("photo");
    expect(calls).toHaveLength(1);
    expect(calls[0]).toMatchObject({
      toolName: "prism_turning_program",
      action: "turning_blueprint_intake",
    });
  });

  it("POST /upload routes CAD files to cad import", async () => {
    const response = await httpRequest("POST", "/api/v1/lathe/upload", {
      fileName: "part.step",
      fileData: "base64encodedstep",
      fileType: "cad",
    });
    expect(response.status).toBe(200);
    expect(response.data.ok).toBe(true);
    expect(response.data.detectedRoute).toBe("cad");
    expect(calls).toHaveLength(1);
    expect(calls[0]).toMatchObject({
      toolName: "prism_turning_program",
      action: "turning_cad_import",
    });
  });

  it("POST /upload routes PDF to blueprint intake", async () => {
    const response = await httpRequest("POST", "/api/v1/lathe/upload", {
      fileName: "print.pdf",
      fileData: "base64encodedpdf",
      fileType: "pdf",
    });
    expect(response.status).toBe(200);
    expect(calls[0]).toMatchObject({
      toolName: "prism_turning_program",
      action: "turning_blueprint_intake",
    });
  });

  it("POST /upload rejects missing fileName", async () => {
    const response = await httpRequest("POST", "/api/v1/lathe/upload", {
      fileData: "abc",
    });
    expect(response.status).toBe(400);
    expect(response.data.ok).toBe(false);
  });

  it("POST /upload auto-detects file type from extension", async () => {
    const response = await httpRequest("POST", "/api/v1/lathe/upload", {
      fileName: "blueprint.png",
      fileData: "base64png",
    });
    expect(response.status).toBe(200);
    expect(response.data.detectedRoute).toBe("photo");
  });

  // ── Wizard submit endpoint ─────────────────────────────────────────────

  it("POST /wizard-submit returns jobId immediately", async () => {
    const response = await httpRequest("POST", "/api/v1/lathe/wizard-submit", {
      part_number: "WIZ-001",
      material: { material_name: "AISI 4140", iso_group: "P" },
      bar_stock_od_mm: 50,
      part_length_mm: 80,
      features: [{ id: "f1", type: "face", length_mm: 0 }],
    });
    expect(response.status).toBe(200);
    expect(response.data.ok).toBe(true);
    expect(response.data.jobId).toBeDefined();
    expect(typeof response.data.jobId).toBe("string");
  });

  // ── Result endpoint ────────────────────────────────────────────────────

  it("GET /result/:id returns 404 for unknown job", async () => {
    const response = await httpRequest("GET", "/api/v1/lathe/result/nonexistent-id");
    expect(response.status).toBe(404);
    expect(response.data.ok).toBe(false);
  });

  it("GET /result/:id returns result after pipeline completes", async () => {
    // Submit a job
    const submit = await httpRequest("POST", "/api/v1/lathe/wizard-submit", {
      part_number: "RES-001",
      material: { material_name: "AISI 4140", iso_group: "P" },
      bar_stock_od_mm: 50,
      part_length_mm: 80,
      features: [{ id: "f1", type: "face", length_mm: 0 }],
    });
    const jobId = submit.data.jobId;

    const result = await waitForJob(jobId);
    expect(result.status).toBe(200);
    expect(result.data.ok).toBe(true);
    expect(result.data.result).toBeDefined();
    expect(result.data.result.program_text).toBeDefined();
  });

  // ── Download endpoints ─────────────────────────────────────────────────

  it("GET /download/:id/gcode returns .nc file after completion", async () => {
    const submit = await httpRequest("POST", "/api/v1/lathe/wizard-submit", {
      part_number: "DL-001",
      material: { material_name: "AISI 4140", iso_group: "P" },
      bar_stock_od_mm: 50,
      part_length_mm: 80,
      features: [{ id: "f1", type: "face", length_mm: 0 }],
    });
    const jobId = submit.data.jobId;
    await waitForJob(jobId);

    // Raw HTTP to check headers
    const response = await new Promise<{ status: number; headers: any; body: string }>((resolve, reject) => {
      const req = http.request(
        { hostname: "127.0.0.1", port, path: `/api/v1/lathe/download/${jobId}/gcode`, method: "GET" },
        (res) => {
          const chunks: Buffer[] = [];
          res.on("data", (chunk: Buffer) => chunks.push(chunk));
          res.on("end", () => resolve({
            status: res.statusCode ?? 0,
            headers: res.headers,
            body: Buffer.concat(chunks).toString(),
          }));
        },
      );
      req.on("error", reject);
      req.end();
    });

    expect(response.status).toBe(200);
    expect(response.headers["content-type"]).toContain("text/plain");
    expect(response.headers["content-disposition"]).toContain(".nc");
    expect(response.body).toContain("G28");
  });

  it("GET /download/:id/setup returns setup sheet", async () => {
    const submit = await httpRequest("POST", "/api/v1/lathe/wizard-submit", {
      part_number: "DL-002",
      material: { material_name: "AISI 4140", iso_group: "P" },
      bar_stock_od_mm: 50,
      part_length_mm: 80,
      features: [{ id: "f1", type: "face", length_mm: 0 }],
    });
    const jobId = submit.data.jobId;
    await waitForJob(jobId);

    const response = await httpRequest("GET", `/api/v1/lathe/download/${jobId}/setup`);
    // Setup sheet is plain text, httpRequest tries JSON parse which may fail
    expect(response.status).toBe(200);
  });

  it("GET /download/:id/report returns physics report", async () => {
    const submit = await httpRequest("POST", "/api/v1/lathe/wizard-submit", {
      part_number: "DL-003",
      material: { material_name: "AISI 4140", iso_group: "P" },
      bar_stock_od_mm: 50,
      part_length_mm: 80,
      features: [{ id: "f1", type: "face", length_mm: 0 }],
    });
    const jobId = submit.data.jobId;
    await waitForJob(jobId);

    const response = await httpRequest("GET", `/api/v1/lathe/download/${jobId}/report`);
    expect(response.status).toBe(200);
  });

  it("GET /download/:id/invalid returns 400", async () => {
    const submit = await httpRequest("POST", "/api/v1/lathe/wizard-submit", {
      part_number: "DL-004",
      features: [{ id: "f1", type: "face", length_mm: 0 }],
    });
    const jobId = submit.data.jobId;
    await waitForJob(jobId);

    const response = await httpRequest("GET", `/api/v1/lathe/download/${jobId}/invalid`);
    expect(response.status).toBe(400);
  });

  // ── Progress SSE endpoint ──────────────────────────────────────────────

  it("GET /progress/:id returns 404 for unknown job", async () => {
    const response = await httpRequest("GET", "/api/v1/lathe/progress/nonexistent");
    expect(response.status).toBe(404);
  });

  it("GET /progress/:id streams SSE events for active job", async () => {
    const submit = await httpRequest("POST", "/api/v1/lathe/wizard-submit", {
      part_number: "SSE-001",
      features: [{ id: "f1", type: "face", length_mm: 0 }],
    });
    const jobId = submit.data.jobId;

    // Connect SSE and collect a few events
    const events = await new Promise<string[]>((resolve) => {
      const collected: string[] = [];
      const req = http.request(
        { hostname: "127.0.0.1", port, path: `/api/v1/lathe/progress/${jobId}`, method: "GET" },
        (res) => {
          res.on("data", (chunk: Buffer) => {
            collected.push(chunk.toString());
            // After receiving some data, close
            if (collected.length >= 3) {
              req.destroy();
              resolve(collected);
            }
          });
        },
      );
      req.on("error", () => resolve(collected));
      // Timeout fallback
      setTimeout(() => { req.destroy(); resolve(collected); }, 3000);
      req.end();
    });

    // Should have received at least one SSE event
    const allText = events.join("");
    expect(allText).toContain("event:");
    expect(allText).toContain("data:");
  });
});
