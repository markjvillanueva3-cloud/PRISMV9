import express from "express";
import http from "node:http";
import { once } from "node:events";
import type { AddressInfo } from "node:net";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { registerRoutes } from "../routes/index.js";

let server: http.Server;
let port = 0;
let idSeq = 0;

function nextId(prefix: string): string {
  idSeq += 1;
  return `${prefix}-${Date.now().toString(36)}-${idSeq}`;
}

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

describe("Traveler and dispatch mounted routes", () => {
  beforeAll(async () => {
    const app = express();
    app.use(express.json());
    registerRoutes(app, async () => ({ ok: true }));

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

  it("creates a traveler and completes a mounted setup-to-cycle workflow", async () => {
    const jobId = nextId("JOB-TRAVEL");
    const operatorId = nextId("OP");
    const createResponse = await httpRequest("POST", "/api/v1/traveler", {
      job_id: jobId,
      steps: [
        { step_number: 10, operation: "Op 10 Saw", est_setup_min: 12, est_cycle_min: 18 },
        { step_number: 20, operation: "Op 20 Mill", machine_id: "VF2", est_setup_min: 20, est_cycle_min: 45 },
      ],
    });

    expect(createResponse.status).toBe(200);
    expect(createResponse.data.data.count).toBe(2);
    expect(createResponse.data.data.steps[0]).toMatchObject({
      job_id: jobId,
      step_number: 10,
      status: "pending",
    });
    expect(createResponse.data.data.prism_sync).toMatchObject({
      event: {
        job_id: jobId,
        trigger: "traveler-created",
      },
    });

    const activeResponse = await httpRequest("GET", "/api/v1/traveler");
    expect(activeResponse.status).toBe(200);
    expect(activeResponse.data.data.count).toBe(1);
    expect(activeResponse.data.data.travelers[0]).toMatchObject({
      job_id: jobId,
      total_steps: 2,
      completed_steps: 0,
    });

    const setupResponse = await httpRequest("POST", `/api/v1/traveler/${jobId}/steps/10/start-setup`, {
      operator_id: operatorId,
      notes: "Fixture loaded",
    });
    expect(setupResponse.status).toBe(200);
    expect(setupResponse.data.data.step).toMatchObject({
      job_id: jobId,
      step_number: 10,
      status: "setup",
      operator_id: operatorId,
    });
    expect(setupResponse.data.data.timer.entry_type).toBe("setup");
    expect(setupResponse.data.data.prism_sync?.event.trigger).toBe("traveler-step-started");

    const activeTravelersResponse = await httpRequest("GET", "/api/v1/traveler");
    expect(activeTravelersResponse.status).toBe(200);
    expect(activeTravelersResponse.data.data.count).toBeGreaterThan(0);
    expect(
      activeTravelersResponse.data.data.travelers.some(
        (traveler: { job_id: string; current_step?: { step_number: number } }) =>
          traveler.job_id === jobId && traveler.current_step?.step_number === 10,
      ),
    ).toBe(true);

    const cycleResponse = await httpRequest("POST", `/api/v1/traveler/${jobId}/steps/10/start-cycle`, {
      operator_id: operatorId,
    });
    expect(cycleResponse.status).toBe(200);
    expect(cycleResponse.data.data.step.status).toBe("running");
    expect(cycleResponse.data.data.timer.entry_type).toBe("cycle");
    expect(cycleResponse.data.data.prism_sync?.event.trigger).toBe("traveler-step-started");

    const completeResponse = await httpRequest("POST", `/api/v1/traveler/${jobId}/steps/10/complete`, {
      operator_id: operatorId,
      parts_complete: 6,
      parts_scrapped: 1,
    });
    expect(completeResponse.status).toBe(200);
    expect(completeResponse.data.data.step).toMatchObject({
      status: "complete",
      parts_complete: 6,
      parts_scrapped: 1,
    });
    expect(completeResponse.data.data.summary).toMatchObject({
      job_id: jobId,
      completed_steps: 1,
      pct_complete: 50,
    });
    expect(completeResponse.data.data.prism_sync?.event.trigger).toBe("traveler-step-completed");

    const travelerResponse = await httpRequest("GET", `/api/v1/traveler/${jobId}`);
    expect(travelerResponse.status).toBe(200);
    expect(travelerResponse.data.data).toMatchObject({
      job_id: jobId,
      total_steps: 2,
      completed_steps: 1,
    });
    expect(travelerResponse.data.data.steps[0].status).toBe("complete");

    const activeTravelersAfterCompleteResponse = await httpRequest("GET", "/api/v1/traveler");
    expect(activeTravelersAfterCompleteResponse.status).toBe(200);
    expect(activeTravelersAfterCompleteResponse.data.data.count).toBeGreaterThanOrEqual(1);
    expect(
      activeTravelersAfterCompleteResponse.data.data.travelers.some(
        (traveler: { job_id: string; completed_steps: number }) =>
          traveler.job_id === jobId && traveler.completed_steps === 1,
      ),
    ).toBe(true);
  });

  it("supports scan-driven traveler transitions on the mounted route", async () => {
    const jobId = nextId("JOB-SCAN");
    const operatorId = nextId("OP");

    await httpRequest("POST", "/api/v1/traveler", {
      job_id: jobId,
      steps: [{ step_number: 1, operation: "Op 10 Deburr" }],
    });

    const firstScan = await httpRequest("POST", "/api/v1/traveler/scan", {
      code: `JOB-${jobId}-STEP-1`,
      operator_id: operatorId,
    });
    expect(firstScan.status).toBe(200);
    expect(firstScan.data.data.action).toBe("start_setup");
    expect(firstScan.data.data.step.status).toBe("setup");
    expect(firstScan.data.data.prism_sync?.event.trigger).toBe("traveler-scan-transition");

    const secondScan = await httpRequest("POST", "/api/v1/traveler/scan", {
      code: `JOB-${jobId}-STEP-1`,
      operator_id: operatorId,
    });
    expect(secondScan.status).toBe(200);
    expect(secondScan.data.data.action).toBe("start_cycle");
    expect(secondScan.data.data.step.status).toBe("running");
    expect(secondScan.data.data.prism_sync?.event.trigger).toBe("traveler-scan-transition");

    const thirdScan = await httpRequest("POST", "/api/v1/traveler/scan", {
      code: `JOB-${jobId}`,
      operator_id: operatorId,
    });
    expect(thirdScan.status).toBe(200);
    expect(thirdScan.data.data.action).toBe("complete");
    expect(thirdScan.data.data.summary).toMatchObject({
      job_id: jobId,
      completed_steps: 1,
      pct_complete: 100,
    });
    expect(thirdScan.data.data.prism_sync?.event.trigger).toBe("traveler-scan-transition");
  });

  it("manages a mounted machine dispatch queue end to end", async () => {
    const machineId = nextId("MACH");
    const firstJobId = nextId("JOB-DISP");
    const secondJobId = nextId("JOB-DISP");
    const queuedBy = nextId("planner");

    const firstAssign = await httpRequest("POST", "/api/v1/dispatch/assign", {
      machine_id: machineId,
      job_id: firstJobId,
      routing_step_id: "rs-10",
      priority: 20,
      estimated_duration_min: 90,
      queued_by: queuedBy,
    });
    expect(firstAssign.status).toBe(200);
    expect(firstAssign.data.data).toMatchObject({
      machine_id: machineId,
      job_id: firstJobId,
      status: "queued",
    });
    expect(firstAssign.data.data.prism_sync?.event.trigger).toBe("dispatch-job-queued");

    const secondAssign = await httpRequest("POST", "/api/v1/dispatch/assign", {
      machine_id: machineId,
      job_id: secondJobId,
      routing_step_id: "rs-20",
      priority: 10,
      estimated_duration_min: 45,
      queued_by: queuedBy,
    });
    expect(secondAssign.status).toBe(200);
    expect(secondAssign.data.data).toMatchObject({
      machine_id: machineId,
      job_id: secondJobId,
      status: "queued",
    });
    expect(secondAssign.data.data.prism_sync?.event.trigger).toBe("dispatch-job-queued");

    const queueResponse = await httpRequest("GET", `/api/v1/dispatch/queue/${machineId}`);
    expect(queueResponse.status).toBe(200);
    expect(queueResponse.data.data.machine_id).toBe(machineId);
    expect(queueResponse.data.data.total_queued).toBe(2);
    expect(queueResponse.data.data.entries.map((entry: { job_id: string }) => entry.job_id)).toEqual([
      secondJobId,
      firstJobId,
    ]);

    const boardResponse = await httpRequest("GET", "/api/v1/dispatch/board");
    expect(boardResponse.status).toBe(200);
    const machineBoard = boardResponse.data.data.machines.find(
      (machine: { machine_id: string }) => machine.machine_id === machineId,
    );
    expect(machineBoard).toBeDefined();
    expect(machineBoard.total_queued).toBe(2);

    const reorderResponse = await httpRequest("POST", "/api/v1/dispatch/reorder", {
      machine_id: machineId,
      order: [firstAssign.data.data.id, secondAssign.data.data.id],
      reordered_by: queuedBy,
    });
    expect(reorderResponse.status).toBe(200);
    expect(reorderResponse.data.data.entries.map((entry: { job_id: string }) => entry.job_id)).toEqual([
      firstJobId,
      secondJobId,
    ]);
    expect(reorderResponse.data.data.prism_sync?.event.trigger).toBe("dispatch-queue-reordered");

    const whatIfResponse = await httpRequest("POST", "/api/v1/dispatch/what-if", {
      machine_id: machineId,
      insert_position: 0,
      job_id: nextId("JOB-HYP"),
      estimated_duration_min: 30,
    });
    expect(whatIfResponse.status).toBe(200);
    expect(whatIfResponse.data.data.modified_queue[0].job_id).toMatch(/^JOB-HYP-/);
    expect(whatIfResponse.data.data.impact.jobs_delayed).toBeGreaterThanOrEqual(0);
    expect(whatIfResponse.data.data.prism_sync?.event.trigger).toBe("dispatch-what-if-ran");

    const removeResponse = await httpRequest("POST", "/api/v1/dispatch/remove", {
      entry_id: secondAssign.data.data.id,
      removed_by: queuedBy,
    });
    expect(removeResponse.status).toBe(200);
    expect(removeResponse.data.data).toMatchObject({
      id: secondAssign.data.data.id,
      status: "cancelled",
    });
    expect(removeResponse.data.data.prism_sync?.event.trigger).toBe("dispatch-entry-removed");

    const emptyQueueResponse = await httpRequest("GET", `/api/v1/dispatch/queue/${nextId("MACH-EMPTY")}`);
    expect(emptyQueueResponse.status).toBe(200);
    expect(emptyQueueResponse.data.data).toMatchObject({
      entries: [],
      total_queued: 0,
      total_est_min: 0,
    });
  });

  it("fails closed for invalid traveler and dispatch payloads", async () => {
    const missingSteps = await httpRequest("POST", "/api/v1/traveler", {
      job_id: nextId("JOB-BAD"),
      steps: [],
    });
    expect(missingSteps.status).toBe(400);
    expect(missingSteps.data).toMatchObject({
      ok: false,
      error: "At least one routing step is required",
    });

    const missingTraveler = await httpRequest("GET", `/api/v1/traveler/${nextId("JOB-MISSING")}`);
    expect(missingTraveler.status).toBe(404);
    expect(missingTraveler.data.ok).toBe(false);

    const badScan = await httpRequest("POST", "/api/v1/traveler/scan", {
      code: "INVALID",
      operator_id: nextId("OP"),
    });
    expect(badScan.status).toBe(400);
    expect(badScan.data).toMatchObject({
      ok: false,
      error: "Invalid scan code format: 'INVALID'. Expected JOB-{id}-STEP-{num}",
    });

    const badAssign = await httpRequest("POST", "/api/v1/dispatch/assign", {
      machine_id: "",
      job_id: nextId("JOB-NOPE"),
    });
    expect(badAssign.status).toBe(400);
    expect(badAssign.data).toMatchObject({
      ok: false,
      error: "machine_id is required",
    });

    const badRemove = await httpRequest("POST", "/api/v1/dispatch/remove", {
      entry_id: "missing-entry",
      removed_by: "scheduler",
    });
    expect(badRemove.status).toBe(400);
    expect(badRemove.data).toMatchObject({
      ok: false,
      error: "Queue entry 'missing-entry' not found",
    });
  });
});
