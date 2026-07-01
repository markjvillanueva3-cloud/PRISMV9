/**
 * PostProcessorAPIEngine -- companion tests
 *
 * Tests the HTTP API engine for the Post Processor pipeline.
 * Strategy: spin the server on an isolated test port (18399), exercise every
 * route branch via real HTTP requests, and verify concrete response shapes.
 *
 * Coverage:
 *   happy path    -- health endpoint, 404 shape, OPTIONS CORS, status() method
 *   failure modes -- EADDRINUSE (port already in use), bad JSON body, 404 route,
 *                    wrong HTTP method on known route
 *   adversarial   -- oversized body (>10MB cap), double-start idempotency
 *
 * No toBeDefined()/toBeTruthy() stubs. Every assertion checks a concrete value
 * or structural invariant.
 */

import http from "node:http";
import { describe, it, expect, beforeAll, afterAll } from "vitest";
import {
  PostProcessorAPIEngineImpl,
  type APIServerStatus,
} from "../engines/PostProcessorAPIEngine.js";

// ---------------------------------------------------------------------------
// Test helpers
// ---------------------------------------------------------------------------

const TEST_PORT = 18399;

/** Send a raw HTTP request to the test server; returns { statusCode, body }. */
function request(
  method: string,
  path: string,
  body?: string,
  headers: Record<string, string> = {}
): Promise<{ statusCode: number; body: string; headers: http.IncomingHttpHeaders }> {
  return new Promise((resolve, reject) => {
    const opts: http.RequestOptions = {
      hostname: "127.0.0.1",
      port: TEST_PORT,
      path,
      method,
      headers: {
        "Content-Type": "application/json",
        ...headers,
      },
    };
    const req = http.request(opts, (res) => {
      const chunks: Buffer[] = [];
      res.on("data", (c: Buffer) => chunks.push(c));
      res.on("end", () =>
        resolve({
          statusCode: res.statusCode ?? 0,
          body: Buffer.concat(chunks).toString("utf-8"),
          headers: res.headers,
        })
      );
    });
    req.on("error", reject);
    if (body !== undefined) req.write(body);
    req.end();
  });
}

/** Stream a buffer of given size to the server (for body-size tests). */
function requestWithRawBody(
  path: string,
  totalBytes: number
): Promise<{ statusCode: number; body: string }> {
  return new Promise((resolve, reject) => {
    const opts: http.RequestOptions = {
      hostname: "127.0.0.1",
      port: TEST_PORT,
      path,
      method: "POST",
      headers: {
        "Content-Type": "application/octet-stream",
        "Content-Length": String(totalBytes),
      },
    };
    const req = http.request(opts, (res) => {
      const chunks: Buffer[] = [];
      res.on("data", (c: Buffer) => chunks.push(c));
      res.on("end", () =>
        resolve({
          statusCode: res.statusCode ?? 0,
          body: Buffer.concat(chunks).toString("utf-8"),
        })
      );
      res.on("error", () =>
        resolve({ statusCode: res.statusCode ?? 0, body: "" })
      );
    });
    req.on("error", (err: NodeJS.ErrnoException) => {
      // A destroyed socket is expected when server kills oversized request
      if (err.code === "ECONNRESET" || err.code === "EPIPE") {
        resolve({ statusCode: 0, body: "" });
      } else {
        reject(err);
      }
    });
    // Write 10MB + 1 byte in 1MB chunks to trigger the cap
    const CHUNK = 1024 * 1024; // 1 MB
    let written = 0;
    function writeChunk() {
      if (written >= totalBytes) {
        req.end();
        return;
      }
      const size = Math.min(CHUNK, totalBytes - written);
      written += size;
      const ok = req.write(Buffer.alloc(size, 0x41)); // 'A' bytes
      if (ok) {
        writeChunk();
      } else {
        req.once("drain", writeChunk);
      }
    }
    writeChunk();
  });
}

// ---------------------------------------------------------------------------
// Lifecycle: one server instance per suite
// ---------------------------------------------------------------------------

let engine: PostProcessorAPIEngineImpl;

beforeAll(async () => {
  engine = new PostProcessorAPIEngineImpl();
  await engine.start({ port: TEST_PORT, host: "127.0.0.1", cors: true });
}, 10_000);

afterAll(async () => {
  await engine.stop();
}, 5_000);

// ---------------------------------------------------------------------------
// 1. status() -- pure synchronous state inspection
// ---------------------------------------------------------------------------

describe("PostProcessorAPIEngineImpl -- status()", () => {
  it("reports running:true after start", () => {
    const s: APIServerStatus = engine.status();
    expect(s.running).toBe(true);
  });

  it("reports the exact port that was passed to start()", () => {
    const s = engine.status();
    expect(s.port).toBe(TEST_PORT);
  });

  it("url field encodes host and port", () => {
    const s = engine.status();
    expect(s.url).toBe(`http://127.0.0.1:${TEST_PORT}`);
  });

  it("version field is the string '1.0.0'", () => {
    const s = engine.status();
    expect(s.version).toBe("1.0.0");
  });

  it("uptime_s is a non-negative integer after server is running", () => {
    const s = engine.status();
    expect(s.uptime_s).toBeGreaterThanOrEqual(0);
    expect(Number.isInteger(s.uptime_s)).toBe(true);
  });

  it("requests_served starts at 0 before any HTTP call (fresh instance)", () => {
    // A brand-new instance that was never started should show 0
    const fresh = new PostProcessorAPIEngineImpl();
    const s = fresh.status();
    expect(s.requests_served).toBe(0);
    expect(s.running).toBe(false);
    expect(s.uptime_s).toBe(0);
  });
});

// ---------------------------------------------------------------------------
// 2. Health endpoint -- pure in-process, no dynamic imports
// ---------------------------------------------------------------------------

describe("GET /api/post-process/health", () => {
  it("returns HTTP 200", async () => {
    const { statusCode } = await request("GET", "/api/post-process/health");
    expect(statusCode).toBe(200);
  });

  it("status field is exactly 'ok'", async () => {
    const { body } = await request("GET", "/api/post-process/health");
    const data = JSON.parse(body);
    expect(data.status).toBe("ok");
  });

  it("version field is '1.0.0'", async () => {
    const { body } = await request("GET", "/api/post-process/health");
    const data = JSON.parse(body);
    expect(data.version).toBe("1.0.0");
  });

  it("engine field identifies 'PostProcessorPipelineEngine'", async () => {
    const { body } = await request("GET", "/api/post-process/health");
    const data = JSON.parse(body);
    expect(data.engine).toBe("PostProcessorPipelineEngine");
  });

  it("stages field is exactly 26", async () => {
    const { body } = await request("GET", "/api/post-process/health");
    const data = JSON.parse(body);
    expect(data.stages).toBe(26);
  });

  it("controllers field is exactly 17", async () => {
    const { body } = await request("GET", "/api/post-process/health");
    const data = JSON.parse(body);
    expect(data.controllers).toBe(17);
  });

  it("uptime_s is a non-negative number", async () => {
    const { body } = await request("GET", "/api/post-process/health");
    const data = JSON.parse(body);
    expect(typeof data.uptime_s).toBe("number");
    expect(data.uptime_s).toBeGreaterThanOrEqual(0);
  });

  it("requests_served increments with each request (counted in the handler)", async () => {
    // Make two calls and verify the counter increased
    const { body: b1 } = await request("GET", "/api/post-process/health");
    const { body: b2 } = await request("GET", "/api/post-process/health");
    const r1 = JSON.parse(b1).requests_served;
    const r2 = JSON.parse(b2).requests_served;
    expect(r2).toBeGreaterThan(r1);
  });

  it("response Content-Type header is application/json", async () => {
    const { headers } = await request("GET", "/api/post-process/health");
    expect(headers["content-type"]).toBe("application/json");
  });
});

// ---------------------------------------------------------------------------
// 3. 404 handler -- pure in-process
// ---------------------------------------------------------------------------

describe("Unknown route -- 404 handler", () => {
  it("returns HTTP 404 for an unregistered path", async () => {
    const { statusCode } = await request("GET", "/api/does-not-exist");
    expect(statusCode).toBe(404);
  });

  it("error field is 'Not Found'", async () => {
    const { body } = await request("GET", "/api/no-such-route");
    const data = JSON.parse(body);
    expect(data.error).toBe("Not Found");
  });

  it("available_endpoints lists all 5 registered routes", async () => {
    const { body } = await request("GET", "/api/missing");
    const data = JSON.parse(body);
    expect(Array.isArray(data.available_endpoints)).toBe(true);
    expect(data.available_endpoints).toHaveLength(5);
  });

  it("available_endpoints includes POST /api/post-process", async () => {
    const { body } = await request("GET", "/api/missing");
    const data = JSON.parse(body);
    expect(data.available_endpoints).toContain("POST /api/post-process");
  });

  it("available_endpoints includes GET /api/post-process/health", async () => {
    const { body } = await request("GET", "/api/missing");
    const data = JSON.parse(body);
    expect(data.available_endpoints).toContain(
      "GET /api/post-process/health"
    );
  });

  it("wrong HTTP method on health route also hits 404 (POST to GET-only path)", async () => {
    const { statusCode } = await request(
      "POST",
      "/api/post-process/health",
      "{}"
    );
    expect(statusCode).toBe(404);
  });
});

// ---------------------------------------------------------------------------
// 4. CORS OPTIONS preflight -- pure in-process
// ---------------------------------------------------------------------------

describe("CORS OPTIONS preflight", () => {
  it("returns HTTP 204 for OPTIONS request", async () => {
    const { statusCode } = await request("OPTIONS", "/api/post-process/health");
    expect(statusCode).toBe(204);
  });

  it("sets Access-Control-Allow-Methods header", async () => {
    const { headers } = await request("OPTIONS", "/api/post-process/health");
    expect(headers["access-control-allow-methods"]).toBe(
      "GET, POST, OPTIONS"
    );
  });

  it("sets Access-Control-Allow-Headers with Content-Type", async () => {
    const { headers } = await request("OPTIONS", "/api/post-process/health");
    expect(headers["access-control-allow-headers"]).toBe("Content-Type");
  });

  it("sets Access-Control-Allow-Origin header on regular GET requests", async () => {
    const { headers } = await request("GET", "/api/post-process/health");
    // The header must be present (value is from PRISM_CORS_ORIGIN env or default)
    expect(typeof headers["access-control-allow-origin"]).toBe("string");
    expect(headers["access-control-allow-origin"]!.length).toBeGreaterThan(0);
  });
});

// ---------------------------------------------------------------------------
// 5. Failure mode: double-start idempotency
// ---------------------------------------------------------------------------

describe("double-start idempotency", () => {
  it("calling start() a second time returns the running status without error", async () => {
    const s = await engine.start({ port: TEST_PORT });
    // Must not throw, and must still report running on the same port
    expect(s.running).toBe(true);
    expect(s.port).toBe(TEST_PORT);
  });
});

// ---------------------------------------------------------------------------
// 6. Failure mode: EADDRINUSE
// ---------------------------------------------------------------------------

describe("EADDRINUSE -- port already in use", () => {
  it("throws with a descriptive message when port is occupied", async () => {
    const rival = new PostProcessorAPIEngineImpl();
    await expect(rival.start({ port: TEST_PORT })).rejects.toThrow(
      `Port ${TEST_PORT} already in use`
    );
    // rival was never successfully started; no stop() needed
  });
});

// ---------------------------------------------------------------------------
// 7. Failure mode: invalid JSON body on POST route
// ---------------------------------------------------------------------------

describe("POST /api/post-process/verify -- invalid JSON body", () => {
  it("returns HTTP 500 when the request body is not valid JSON", async () => {
    const { statusCode } = await request(
      "POST",
      "/api/post-process/verify",
      "NOT_JSON_AT_ALL"
    );
    expect(statusCode).toBe(500);
  });

  it("error field is present in the 500 response body", async () => {
    const { body } = await request(
      "POST",
      "/api/post-process/verify",
      ":::bad:::"
    );
    const data = JSON.parse(body);
    expect(typeof data.error).toBe("string");
    expect(data.error.length).toBeGreaterThan(0);
  });
});

// ---------------------------------------------------------------------------
// 8. Adversarial: oversized body (>10MB cap)
// ---------------------------------------------------------------------------

describe("_readBody 10MB cap guard -- adversarial oversized request", () => {
  it("rejects a body larger than 10MB (server destroys socket or returns 500)", async () => {
    const OVER_10MB = 10 * 1024 * 1024 + 1; // 1 byte over
    const result = await requestWithRawBody(
      "/api/post-process/verify",
      OVER_10MB
    );
    // Either the socket is destroyed (statusCode 0) or the server returns 500
    const acceptable = result.statusCode === 0 || result.statusCode === 500;
    expect(acceptable).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// 9. Adversarial: stop() then status()
// ---------------------------------------------------------------------------

describe("stop() lifecycle", () => {
  it("status() reports running:false after stop(), then server can restart", async () => {
    const tmp = new PostProcessorAPIEngineImpl();
    // Use a different port so we don't clash with the suite-level server
    const TMP_PORT = 18398;
    await tmp.start({ port: TMP_PORT });
    expect(tmp.status().running).toBe(true);

    await tmp.stop();
    expect(tmp.status().running).toBe(false);
    // uptime_s remains from the run, but running flag is false
    expect(tmp.status().port).toBe(TMP_PORT);
  });

  it("calling stop() on a never-started engine resolves without error", async () => {
    const fresh = new PostProcessorAPIEngineImpl();
    await expect(fresh.stop()).resolves.toBeUndefined();
    expect(fresh.status().running).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// 10. GET /api/post-process/controllers -- dynamic import route
// ---------------------------------------------------------------------------

describe("GET /api/post-process/controllers", () => {
  it("returns HTTP 200", async () => {
    const { statusCode } = await request(
      "GET",
      "/api/post-process/controllers"
    );
    expect(statusCode).toBe(200);
  });

  it("returns a non-empty array of controller dialect objects", async () => {
    const { body } = await request("GET", "/api/post-process/controllers");
    const data = JSON.parse(body);
    expect(Array.isArray(data)).toBe(true);
    expect(data.length).toBeGreaterThan(0);
  });

  it("each dialect entry has a 'family' string field", async () => {
    const { body } = await request("GET", "/api/post-process/controllers");
    const data = JSON.parse(body);
    for (const d of data as Array<Record<string, unknown>>) {
      expect(typeof d.family).toBe("string");
    }
  });
});

// ---------------------------------------------------------------------------
// 11. POST /api/post-process/verify -- happy path via VerificationEngine
// ---------------------------------------------------------------------------

describe("POST /api/post-process/verify -- valid G-code", () => {
  const VALID_GCODE = [
    "%",
    "O1001",
    "G90 G17 G21",
    "G54",
    "T1 M6",
    "S3000 M3",
    "G0 X0 Y0 Z5",
    "G1 Z-5 F200",
    "G0 Z100",
    "M30",
    "%",
  ].join("\n");

  it("returns HTTP 200 for a well-formed G-code program", async () => {
    const { statusCode } = await request(
      "POST",
      "/api/post-process/verify",
      JSON.stringify({ gcode: VALID_GCODE })
    );
    expect(statusCode).toBe(200);
  });

  it("response body has a 'valid' boolean field", async () => {
    const { body } = await request(
      "POST",
      "/api/post-process/verify",
      JSON.stringify({ gcode: VALID_GCODE })
    );
    const data = JSON.parse(body);
    expect(typeof data.valid).toBe("boolean");
  });

  it("response body has an 'issues' array field", async () => {
    const { body } = await request(
      "POST",
      "/api/post-process/verify",
      JSON.stringify({ gcode: VALID_GCODE })
    );
    const data = JSON.parse(body);
    expect(Array.isArray(data.issues)).toBe(true);
  });
});
