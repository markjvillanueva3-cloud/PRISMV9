import express from "express";
import http from "node:http";
import { once } from "node:events";
import type { AddressInfo } from "node:net";
import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import { OperatingSystemHotJobsEngine } from "../engines/OperatingSystemHotJobsEngine.js";
import { registerRoutes } from "../routes/index.js";

type CallRecord = {
  toolName: string;
  action: string;
  params?: Record<string, unknown>;
};

const calls: CallRecord[] = [];

let server: http.Server;
let port = 0;

function httpRequest(
  method: string,
  urlPath: string,
  body?: Record<string, unknown>,
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
          ? {
              "Content-Type": "application/json",
              "Content-Length": Buffer.byteLength(serialized).toString(),
            }
          : {},
      },
      (res) => {
        const chunks: Buffer[] = [];
        res.on("data", (chunk: Buffer) => chunks.push(chunk));
        res.on("end", () => {
          const text = Buffer.concat(chunks).toString();
          try {
            resolve({ status: res.statusCode ?? 0, data: JSON.parse(text) });
          } catch {
            resolve({ status: res.statusCode ?? 0, data: text });
          }
        });
      },
    );

    req.on("error", reject);
    if (serialized) {
      req.write(serialized);
    }
    req.end();
  });
}

describe("M-0 mounted route coverage", () => {
  beforeAll(async () => {
    const app = express();
    app.use(express.json());
    registerRoutes(app, async (toolName, action, params) => {
      calls.push({ toolName, action, params });

      if (toolName === "prism_business" && action === "quoting_generate") {
        return {
          quote_id: "Q-M0-001",
          total: 1875,
          unit_price: 75,
        };
      }

      return { ok: true };
    });

    server = app.listen(0);
    await once(server, "listening");
    port = (server.address() as AddressInfo).port;
  });

  afterAll(async () => {
    if (server.listening) {
      await new Promise<void>((resolve, reject) => {
        server.close((err) => (err ? reject(err) : resolve()));
      });
    }
  });

  beforeEach(() => {
    calls.length = 0;
    OperatingSystemHotJobsEngine.reset();
  });

  it("mounts the M-0 happy-path surface through the route registry", async () => {
    const job = {
      id: "JOB-M0-100",
      customer: "Helios Motion",
      part_number: "VALVE-100",
      description: "Valve body",
      status: "queued",
      quantity: 12,
      due_date: "2026-04-03",
      priority: "high",
      material: "17-4PH",
      estimated_hours: 10,
      actual_hours: 0,
      created_at: "2026-03-29",
    };

    const quoteResponse = await httpRequest("POST", "/api/v1/quote/generate", {
      material: "17-4PH",
      quantity: 25,
    });
    expect(quoteResponse.status).toBe(200);
    expect(calls[0]).toMatchObject({
      toolName: "prism_business",
      action: "quoting_generate",
      params: {
        material: "17-4PH",
        quantity: 25,
      },
    });
    expect(quoteResponse.data.result).toMatchObject({
      quote_id: "Q-M0-001",
      total: 1875,
      unit_price: 75,
    });

    const billingResponse = await httpRequest("GET", "/api/v1/billing/status");
    expect(billingResponse.status).toBe(200);
    expect(billingResponse.data).toMatchObject({
      userId: "anonymous",
      plan: "free",
      authenticated: false,
    });

    const hotSetResponse = await httpRequest("POST", "/api/v1/operating-system/hot-jobs/set", {
      jobId: "JOB-M0-100",
      partNumber: "VALVE-100",
      customer: "Helios Motion",
      dueDate: "2026-04-03",
      note: "Customer expedite approved.",
      setBy: "Operations lead",
    });
    expect(hotSetResponse.status).toBe(200);
    expect(hotSetResponse.data.data[0]).toMatchObject({
      jobId: "JOB-M0-100",
      partNumber: "VALVE-100",
    });

    const hotListResponse = await httpRequest("GET", "/api/v1/operating-system/hot-jobs");
    expect(hotListResponse.status).toBe(200);
    expect(hotListResponse.data.data).toHaveLength(1);

    const messagesResponse = await httpRequest("POST", "/api/v1/operating-system/messages/workspace", {
      profileId: "planner",
      threadId: "thread-planner-orders",
    });
    expect(messagesResponse.status).toBe(200);
    expect(messagesResponse.data.data.identityLabel).toContain("Jordan Vale");
    expect(messagesResponse.data.data.selectedThreadId).toBe("thread-planner-orders");

    const approvalsResponse = await httpRequest("POST", `/api/v1/operating-system/jobs/${job.id}/approvals`, {
      job,
    });
    expect(approvalsResponse.status).toBe(200);
    expect(approvalsResponse.data.data).toHaveLength(3);

    const packetResponse = await httpRequest("POST", `/api/v1/operating-system/jobs/${job.id}/packet`, {
      job,
      options: { seed: 1 },
    });
    expect(packetResponse.status).toBe(200);
    expect(packetResponse.data.data.jobId).toBe(job.id);
    expect(packetResponse.data.data.qrPayload).toContain("PRISMJOB|");

    const intakePreviewResponse = await httpRequest(
      "POST",
      "/api/v1/operating-system/jobs/intake-preview",
      {
        customer: "Helios Motion",
        part_number: "VALVE-100",
        description: "Valve body",
        quantity: "12",
        material: "17-4PH",
        due_date: "2026-04-03",
        priority: "rush",
      },
    );
    expect(intakePreviewResponse.status).toBe(200);
    expect(intakePreviewResponse.data.data.previewJob).toMatchObject({
      customer: "Helios Motion",
      part_number: "VALVE-100",
      priority: "rush",
    });
    expect(intakePreviewResponse.data.data.packet.qrPayload).toContain("job=");
  });

  it("returns validation responses for mounted M-0 write endpoints instead of missing-route failures", async () => {
    const hotSetResponse = await httpRequest("POST", "/api/v1/operating-system/hot-jobs/set", {});
    expect(hotSetResponse.status).toBe(400);
    expect(hotSetResponse.data).toMatchObject({
      ok: false,
      error: "Missing jobId in request body",
    });

    const approvalsResponse = await httpRequest("POST", "/api/v1/operating-system/jobs/JOB-M0-100/approvals", {});
    expect(approvalsResponse.status).toBe(400);
    expect(approvalsResponse.data).toMatchObject({
      ok: false,
      error: "Missing job in request body",
    });

    const packetResponse = await httpRequest("POST", "/api/v1/operating-system/jobs/JOB-M0-100/packet", {});
    expect(packetResponse.status).toBe(400);
    expect(packetResponse.data).toMatchObject({
      ok: false,
      error: "Missing job in request body",
    });
  });
});
