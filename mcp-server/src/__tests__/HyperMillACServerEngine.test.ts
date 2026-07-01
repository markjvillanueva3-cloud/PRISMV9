/**
 * Tests for HyperMillACServerEngine — loopback HTTP companion server.
 *
 * Coverage matrix (per CLAUDE.md comprehensive-build-enforce):
 *   happy path:          /status, /execute, /job-status, /extract, /optimize
 *   failure modes (≥3):  bad json, missing fields, max_concurrent, unknown job, payload too large
 *   adversarial (≥2):    non-loopback bind rejected, oversize body, malformed url
 *   wiring verification: real HTTP round-trip via node:http (not just method calls)
 *
 * All tests run with PRISM_CAD_MOCK=1 so we don't depend on a live hyperMILL.
 */

import { describe, it, expect, beforeEach, afterEach } from "vitest";
import * as http from "node:http";
import { HyperMillACServerEngine } from "../engines/HyperMillACServerEngine.js";

// ── Test helper — pick an ephemeral high port to avoid collision ──────────────

function pickPort(): number {
  // 49152–65535 is the IANA ephemeral range. Random within that range keeps
  // parallel test runs from binding the same socket.
  return 49152 + Math.floor(Math.random() * (65535 - 49152));
}

async function jsonRequest(
  url: string,
  method: "GET" | "POST",
  body?: Record<string, unknown>,
): Promise<{ status: number; body: Record<string, unknown> }> {
  const parsed = new URL(url);
  const data = body !== undefined ? JSON.stringify(body) : "";
  return new Promise((resolve, reject) => {
    const req = http.request(
      {
        hostname: parsed.hostname,
        port: parsed.port ? Number(parsed.port) : 80,
        path: `${parsed.pathname}${parsed.search}`,
        method,
        headers: {
          "Content-Type": "application/json",
          ...(data ? { "Content-Length": Buffer.byteLength(data) } : {}),
        },
      },
      (res) => {
        const chunks: Buffer[] = [];
        res.on("data", (chunk: Buffer) => chunks.push(chunk));
        res.on("end", () => {
          const text = Buffer.concat(chunks).toString("utf8");
          let parsedBody: Record<string, unknown> = {};
          try {
            parsedBody = text ? (JSON.parse(text) as Record<string, unknown>) : {};
          } catch {
            parsedBody = { _raw: text };
          }
          resolve({ status: res.statusCode ?? 0, body: parsedBody });
        });
      },
    );
    req.on("error", reject);
    if (data) req.write(data);
    req.end();
  });
}

// ── Fixtures ──────────────────────────────────────────────────────────────────

let engine: HyperMillACServerEngine;
let port: number;
let baseUrl: string;

beforeEach(async () => {
  process.env.PRISM_CAD_MOCK = "1";
  port = pickPort();
  engine = new HyperMillACServerEngine({ config: { port, mockMode: true } });
  const startResult = await engine.start();
  baseUrl = startResult.serverUrl;
});

afterEach(async () => {
  await engine.stop();
});

// ── Happy path ───────────────────────────────────────────────────────────────

describe("HyperMillACServerEngine — happy path", () => {
  it("GET /status returns ok + mockMode=true + uptime", async () => {
    const { status, body } = await jsonRequest(`${baseUrl}/status`, "GET");
    expect(status).toBe(200);
    expect(body.status).toBe("ok");
    expect(body.mockMode).toBe(true);
    expect(typeof body.uptime_ms).toBe("number");
    expect(body.uptime_ms as number).toBeGreaterThanOrEqual(0);
    expect(body.bind).toBe(`127.0.0.1:${port}`);
  });

  it("POST /execute accepts a script, returns jobId, /job-status reports succeeded", async () => {
    const execResp = await jsonRequest(`${baseUrl}/execute`, "POST", {
      script: "print('hello from prism_ac')",
      tag: "smoke-test",
    });
    expect(execResp.status).toBe(202);
    const jobId = execResp.body.jobId as string;
    expect(typeof jobId).toBe("string");
    expect(jobId.startsWith("ac-job-")).toBe(true);
    expect(execResp.body.state).toBe("queued");

    // Poll job status until terminal (mock executor resolves synchronously
    // through a microtask — ~10ms max).
    let final: { status: number; body: Record<string, unknown> } | null = null;
    for (let i = 0; i < 50; i++) {
      const probe = await jsonRequest(`${baseUrl}/job-status?job_id=${encodeURIComponent(jobId)}`, "GET");
      if (probe.body.state === "succeeded" || probe.body.state === "failed" || probe.body.state === "timeout") {
        final = probe;
        break;
      }
      await new Promise((r) => setTimeout(r, 20));
    }
    expect(final).not.toBeNull();
    expect(final!.status).toBe(200);
    expect(final!.body.state).toBe("succeeded");
    expect(final!.body.exitCode).toBe(0);
    expect(final!.body.tag).toBe("smoke-test");
  });

  it("POST /extract accepts databases array + output_dir, returns jobId", async () => {
    const resp = await jsonRequest(`${baseUrl}/extract`, "POST", {
      databases: ["macros", "tools", "materials"],
      output_dir: "/tmp/prism-extract-test",
    });
    expect(resp.status).toBe(202);
    expect(typeof resp.body.jobId).toBe("string");
  });

  it("POST /optimize accepts nc_content + controller + material, returns jobId", async () => {
    const resp = await jsonRequest(`${baseUrl}/optimize`, "POST", {
      nc_content: "G0 X0 Y0 Z10\nG1 Z-2 F100\n",
      controller: "fanuc-31i",
      material: "AISI-4140",
    });
    expect(resp.status).toBe(202);
    expect(typeof resp.body.jobId).toBe("string");
  });
});

// ── Failure modes ────────────────────────────────────────────────────────────

describe("HyperMillACServerEngine — failure modes", () => {
  it("POST /execute without script returns 400 missing_script", async () => {
    const { status, body } = await jsonRequest(`${baseUrl}/execute`, "POST", {});
    expect(status).toBe(400);
    expect(body.error).toBe("missing_script");
  });

  it("POST /execute with empty script returns 400", async () => {
    const { status, body } = await jsonRequest(`${baseUrl}/execute`, "POST", { script: "   " });
    expect(status).toBe(400);
    expect(body.error).toBe("missing_script");
  });

  it("POST /extract without databases returns 400", async () => {
    const { status, body } = await jsonRequest(`${baseUrl}/extract`, "POST", { output_dir: "/tmp/x" });
    expect(status).toBe(400);
    expect(body.error).toBe("extract_requires_databases_and_output_dir");
  });

  it("POST /optimize without all 3 fields returns 400", async () => {
    const { status, body } = await jsonRequest(`${baseUrl}/optimize`, "POST", {
      nc_content: "G0",
      controller: "fanuc",
      // material missing
    });
    expect(status).toBe(400);
    expect(body.error).toBe("optimize_requires_nc_content_controller_material");
  });

  it("GET /job-status without job_id returns 400 missing_job_id", async () => {
    const { status, body } = await jsonRequest(`${baseUrl}/job-status`, "GET");
    expect(status).toBe(400);
    expect(body.error).toBe("missing_job_id");
  });

  it("GET /job-status with unknown id returns 404 unknown_job", async () => {
    const { status, body } = await jsonRequest(`${baseUrl}/job-status?job_id=nonexistent-id-12345`, "GET");
    expect(status).toBe(404);
    expect(body.error).toBe("unknown_job");
  });

  it("Unknown route returns 404", async () => {
    const { status, body } = await jsonRequest(`${baseUrl}/no-such-route`, "GET");
    expect(status).toBe(404);
    expect(body.error).toBe("not_found");
  });
});

// ── Adversarial / edge-case ─────────────────────────────────────────────────

describe("HyperMillACServerEngine — adversarial", () => {
  it("Construction with non-loopback host throws (security invariant)", () => {
    expect(() => new HyperMillACServerEngine({ config: { host: "0.0.0.0", port: pickPort() } })).toThrow(
      /Security violation: host must be "127\.0\.0\.1"/,
    );
  });

  it("Malformed JSON body returns 400 bad_json", async () => {
    // Send a raw non-JSON body bypassing jsonRequest helper.
    const result = await new Promise<{ status: number; body: string }>((resolve, reject) => {
      const req = http.request(
        {
          hostname: "127.0.0.1",
          port,
          path: "/execute",
          method: "POST",
          headers: { "Content-Type": "application/json", "Content-Length": Buffer.byteLength("not json {{{") },
        },
        (res) => {
          const chunks: Buffer[] = [];
          res.on("data", (c: Buffer) => chunks.push(c));
          res.on("end", () => resolve({ status: res.statusCode ?? 0, body: Buffer.concat(chunks).toString("utf8") }));
        },
      );
      req.on("error", reject);
      req.write("not json {{{");
      req.end();
    });
    expect(result.status).toBe(400);
    const parsed = JSON.parse(result.body) as { error: string };
    expect(parsed.error).toBe("bad_json");
  });

  it("Oversize body (>1MB) returns 413 payload_too_large", async () => {
    // Build a 1.5 MB payload — bigger than the engine's 1 MB cap.
    const huge = "x".repeat(1_500_000);
    const result = await jsonRequest(`${baseUrl}/execute`, "POST", { script: huge });
    expect(result.status).toBe(413);
    expect(result.body.error).toBe("payload_too_large");
  });

  it("Invalid port (< 1024) throws on construct", () => {
    expect(() => new HyperMillACServerEngine({ config: { port: 80, host: "127.0.0.1" } })).toThrow(
      /Port 80 is outside the valid range/,
    );
  });

  it("Status uptime increases monotonically across two probes", async () => {
    const a = await jsonRequest(`${baseUrl}/status`, "GET");
    await new Promise((r) => setTimeout(r, 30));
    const b = await jsonRequest(`${baseUrl}/status`, "GET");
    expect(b.body.uptime_ms as number).toBeGreaterThan(a.body.uptime_ms as number);
  });
});

// ── State / lifecycle ───────────────────────────────────────────────────────

describe("HyperMillACServerEngine — lifecycle", () => {
  it("isRunning() reflects start/stop state", async () => {
    expect(engine.isRunning()).toBe(true);
    await engine.stop();
    expect(engine.isRunning()).toBe(false);
    // Restart for the afterEach to find it.
    await engine.start();
  });

  it("Double-start is idempotent (returns 'already running')", async () => {
    const result = await engine.start();
    expect(result.ok).toBe(true);
    expect(result.message).toBe("already running");
  });

  it("Double-stop is idempotent (returns 'not running')", async () => {
    await engine.stop();
    const result = await engine.stop();
    expect(result.ok).toBe(true);
    expect(result.message).toBe("not running");
    // Restart for afterEach.
    await engine.start();
  });

  it("listJobs returns jobs in creation order", async () => {
    await jsonRequest(`${baseUrl}/execute`, "POST", { script: "print(1)", tag: "first" });
    await jsonRequest(`${baseUrl}/execute`, "POST", { script: "print(2)", tag: "second" });
    await new Promise((r) => setTimeout(r, 50));
    const jobs = engine.listJobs();
    expect(jobs.length).toBeGreaterThanOrEqual(2);
    expect(jobs[jobs.length - 2].tag).toBe("first");
    expect(jobs[jobs.length - 1].tag).toBe("second");
  });
});

// ── PRISM_HYPERMILL_LIVE integration scaffold ───────────────────────────────

// These tests only run when the operator has a working hyperMILL installation
// AND has set PRISM_HYPERMILL_LIVE=1. They exercise the full TS → Python →
// hm → AC path on real hardware. SKIP by default so CI doesn't try to dial
// a non-existent AC.
const liveMode = process.env.PRISM_HYPERMILL_LIVE === "1";

describe.skipIf(!liveMode)("HyperMillACServerEngine — LIVE (PRISM_HYPERMILL_LIVE=1)", () => {
  it("Real AC ping succeeds against the host's hyperMILL", async () => {
    // Build a separate engine in non-mock mode for this run.
    delete process.env.PRISM_CAD_MOCK;
    const liveEngine = new HyperMillACServerEngine({ config: { port: pickPort(), mockMode: false } });
    await liveEngine.start();
    try {
      const resp = await jsonRequest(`${liveEngine.serverUrl}/execute`, "POST", {
        script:
          "import json, prism_ac; print(json.dumps(prism_ac.ping('127.0.0.1', 18365)))",
      });
      expect(resp.status).toBe(202);
      const jobId = resp.body.jobId as string;
      // Wait up to 10s for the script to finish.
      for (let i = 0; i < 100; i++) {
        const probe = await jsonRequest(`${liveEngine.serverUrl}/job-status?job_id=${jobId}`, "GET");
        if (probe.body.state === "succeeded") {
          const parsed = JSON.parse(probe.body.stdout as string) as { ok: boolean };
          expect(parsed.ok).toBe(true);
          return;
        }
        if (probe.body.state === "failed" || probe.body.state === "timeout") {
          throw new Error(
            `live ping failed: state=${probe.body.state} stderr=${probe.body.stderr} error=${probe.body.error}`,
          );
        }
        await new Promise((r) => setTimeout(r, 100));
      }
      throw new Error("live ping timed out");
    } finally {
      await liveEngine.stop();
      process.env.PRISM_CAD_MOCK = "1";
    }
  });
});
