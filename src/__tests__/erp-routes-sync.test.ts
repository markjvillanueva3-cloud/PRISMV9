import express from "express";
import http from "node:http";
import { once } from "node:events";
import type { AddressInfo } from "node:net";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { authEngine } from "../engines/AuthEngine.js";
import { registerRoutes } from "../routes/index.js";

let server: http.Server;
let port = 0;
let idSeq = 0;
let internalAuthHeaders: Record<string, string>;

function nextId(prefix: string): string {
  idSeq += 1;
  return `${prefix}-${Date.now().toString(36)}-${idSeq}`;
}

function httpRequest(
  method: string,
  urlPath: string,
  body?: Record<string, unknown>,
  headers?: Record<string, string>,
): Promise<{ status: number; data: any }> {
  return new Promise((resolve, reject) => {
    const serialized = body ? JSON.stringify(body) : undefined;
    const req = http.request(
      {
        hostname: "127.0.0.1",
        port,
        path: urlPath,
        method,
        headers: {
          ...(serialized
            ? {
                "Content-Type": "application/json",
                "Content-Length": Buffer.byteLength(serialized).toString(),
              }
            : {}),
          ...(headers ?? {}),
        },
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

describe("ERP PRISM sync routes", () => {
  beforeAll(async () => {
    const username = nextId("erp-admin");
    const password = "ErpSync123!";
    const registered = authEngine.register(username, password, ["admin"]);
    expect(registered.success).toBe(true);
    const login = authEngine.login(username, password);
    expect(login.success).toBe(true);
    internalAuthHeaders = {
      Authorization: `Bearer ${login.token!.access_token}`,
    };

    const app = express();
    app.use(express.json());
    registerRoutes(app, async (_toolName, action, params) => {
      const timestamp = typeof params?.timestamp === "string" ? params.timestamp : new Date().toISOString();
      switch (action) {
        case "clock_in":
          return {
            id: nextId("SH"),
            employee_id: params?.employee_id,
            clock_in: timestamp,
            break_minutes: 0,
            status: "active",
          };
        case "clock_out":
          return {
            id: nextId("SH"),
            employee_id: params?.employee_id,
            clock_in: timestamp,
            clock_out: timestamp,
            break_minutes: 0,
            status: "completed",
          };
        case "job_time_start":
          return {
            id: nextId("JT"),
            employee_id: params?.employee_id,
            shift_entry_id: nextId("SH"),
            job_id: params?.job_id,
            operation: params?.operation ?? "Op 10",
            machine_id: params?.machine_id,
            start_time: timestamp,
            process_type: "production_run",
            pause_periods: [],
            status: "active",
            notes: "",
          };
        case "job_time_pause":
          return {
            id: nextId("JT"),
            employee_id: params?.employee_id,
            shift_entry_id: nextId("SH"),
            job_id: params?.job_id,
            operation: "Op 10",
            start_time: timestamp,
            process_type: "production_run",
            pause_periods: [{ start: timestamp, reason: params?.reason ?? "" }],
            status: "paused",
            notes: "",
          };
        case "job_time_resume":
          return {
            id: nextId("JT"),
            employee_id: params?.employee_id,
            shift_entry_id: nextId("SH"),
            job_id: params?.job_id,
            operation: "Op 10",
            start_time: timestamp,
            process_type: "production_run",
            pause_periods: [{ start: timestamp, end: timestamp, reason: "resume" }],
            status: "active",
            notes: "",
          };
        case "job_time_stop":
          return {
            id: nextId("JT"),
            employee_id: params?.employee_id,
            shift_entry_id: nextId("SH"),
            job_id: params?.job_id,
            operation: "Op 10",
            start_time: timestamp,
            end_time: timestamp,
            process_type: "production_run",
            pause_periods: [],
            status: "completed",
            good_parts: params?.good_parts ?? 8,
            scrap_count: params?.scrap_count ?? 1,
            notes: params?.notes ?? "",
          };
        case "job_create":
          return {
            id: params?.job_id ?? nextId("JOB"),
            customer: params?.customer ?? "Acme",
            part_number: params?.part_number ?? "BRK-1001",
            status: params?.status ?? "planned",
          };
        case "job_update_status":
          return {
            job_id: params?.job_id,
            status: params?.status ?? "planned",
          };
        case "order_create":
        case "order_work_order_create":
          return {
            id: nextId("WO"),
            job_id: params?.job_id,
            part_number: params?.part_number ?? "BRK-1001",
            machine_id: params?.machine_id ?? "VF-2SS",
            status: params?.status ?? "planned",
          };
        case "order_update_status":
          return {
            order_id: params?.order_id,
            job_id: params?.job_id,
            status: params?.status ?? "in_progress",
          };
        case "order_log_time":
          return {
            order_id: params?.order_id,
            job_id: params?.job_id,
            employee_id: params?.employee_id,
            hours: params?.hours ?? 0,
            operation: params?.operation ?? "Op 10",
          };
        case "order_log_production":
          return {
            order_id: params?.order_id,
            job_id: params?.job_id,
            quantity_completed: params?.quantity_completed ?? 0,
            scrap_qty: params?.scrap_qty ?? 0,
            notes: params?.notes ?? "",
          };
        default:
          return { ok: true };
      }
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

  it("returns result aliases for shift routes and emits canonical sync memory for job-time writes", async () => {
    const employeeId = nextId("EMP");
    const jobId = nextId("JOB-ERP");
    const timestamp = new Date().toISOString();

    const shiftInResponse = await httpRequest(
      "POST",
      "/api/v1/erp/shift-clock-in",
      { employee_id: employeeId, timestamp },
      internalAuthHeaders,
    );
    expect(shiftInResponse.status).toBe(200);
    expect(shiftInResponse.data.result).toMatchObject({
      employee_id: employeeId,
      status: "active",
    });

    const startResponse = await httpRequest(
      "POST",
      "/api/v1/erp/job-time-start",
      { employee_id: employeeId, job_id: jobId, operation: "Op 10", timestamp },
      internalAuthHeaders,
    );
    expect(startResponse.status).toBe(200);
    expect(startResponse.data.result).toMatchObject({
      job_id: jobId,
      status: "active",
    });
    expect(startResponse.data.result.prism_sync).toMatchObject({
      event: {
        job_id: jobId,
        trigger: "shop-floor-job-started",
      },
    });

    const pauseResponse = await httpRequest(
      "POST",
      "/api/v1/erp/job-time-pause",
      { employee_id: employeeId, job_id: jobId, reason: "tool swap", timestamp },
      internalAuthHeaders,
    );
    expect(pauseResponse.status).toBe(200);
    expect(pauseResponse.data.result.prism_sync?.event.trigger).toBe("shop-floor-job-paused");

    const resumeResponse = await httpRequest(
      "POST",
      "/api/v1/erp/job-time-resume",
      { employee_id: employeeId, job_id: jobId, timestamp },
      internalAuthHeaders,
    );
    expect(resumeResponse.status).toBe(200);
    expect(resumeResponse.data.result.prism_sync?.event.trigger).toBe("shop-floor-job-started");

    const stopResponse = await httpRequest(
      "POST",
      "/api/v1/erp/job-time-stop",
      { employee_id: employeeId, job_id: jobId, good_parts: 11, scrap_count: 2, timestamp },
      internalAuthHeaders,
    );
    expect(stopResponse.status).toBe(200);
    expect(stopResponse.data.result).toMatchObject({
      job_id: jobId,
      status: "completed",
      good_parts: 11,
      scrap_count: 2,
    });
    expect(stopResponse.data.result.prism_sync?.event.trigger).toBe("shop-floor-job-stopped");
    expect(stopResponse.data.result.prism_sync?.recent_events.length).toBeGreaterThanOrEqual(1);
  });

  it("emits canonical sync memory for job and order lifecycle writes", async () => {
    const jobId = nextId("JOB-LIFE");

    const jobCreateResponse = await httpRequest(
      "POST",
      "/api/v1/erp/job-create",
      {
        job_id: jobId,
        customer: "Orbit Aero",
        part_number: "TB-42",
      },
      internalAuthHeaders,
    );
    expect(jobCreateResponse.status).toBe(200);
    expect(jobCreateResponse.data.result).toMatchObject({
      id: jobId,
      customer: "Orbit Aero",
    });
    expect(jobCreateResponse.data.result.prism_sync?.event.trigger).toBe("job-created");

    const jobStatusResponse = await httpRequest(
      "POST",
      "/api/v1/erp/job-update-status",
      {
        job_id: jobId,
        status: "in_progress",
      },
      internalAuthHeaders,
    );
    expect(jobStatusResponse.status).toBe(200);
    expect(jobStatusResponse.data.result.prism_sync?.event.trigger).toBe("job-status-changed");

    const orderCreateResponse = await httpRequest(
      "POST",
      "/api/v1/erp/order-create",
      {
        job_id: jobId,
        part_number: "TB-42",
        machine_id: "VF-2SS",
      },
      internalAuthHeaders,
    );
    expect(orderCreateResponse.status).toBe(200);
    expect(orderCreateResponse.data.result.prism_sync?.event.trigger).toBe("order-created");

    const orderStatusResponse = await httpRequest(
      "POST",
      "/api/v1/erp/order-update-status",
      {
        order_id: nextId("WO"),
        job_id: jobId,
        status: "in_progress",
      },
      internalAuthHeaders,
    );
    expect(orderStatusResponse.status).toBe(200);
    expect(orderStatusResponse.data.result.prism_sync?.event.trigger).toBe("order-status-changed");

    const orderTimeResponse = await httpRequest(
      "POST",
      "/api/v1/erp/order-log-time",
      {
        order_id: nextId("WO"),
        job_id: jobId,
        employee_id: nextId("EMP"),
        hours: 2,
        operation: "Setup prove-out",
      },
      internalAuthHeaders,
    );
    expect(orderTimeResponse.status).toBe(200);
    expect(orderTimeResponse.data.result.prism_sync?.event.trigger).toBe("order-time-logged");

    const orderProductionResponse = await httpRequest(
      "POST",
      "/api/v1/erp/order-log-production",
      {
        order_id: nextId("WO"),
        job_id: jobId,
        quantity_completed: 12,
        scrap_qty: 1,
        notes: "First article complete",
      },
      internalAuthHeaders,
    );
    expect(orderProductionResponse.status).toBe(200);
    expect(orderProductionResponse.data.result.prism_sync?.event.trigger).toBe("order-production-logged");
    expect(orderProductionResponse.data.result.prism_sync?.recent_events.length).toBeGreaterThanOrEqual(1);
  });
});
