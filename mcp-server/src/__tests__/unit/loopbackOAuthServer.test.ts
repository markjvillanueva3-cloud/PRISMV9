/**
 * PRISM MCP Server — loopbackOAuthServer Unit Tests
 *
 * Real HTTP loopback round-trips (not mocked) — the server is the unit under
 * test; mocking node:http would defeat the purpose. Tests use random high
 * ports to avoid collision; each test owns its own port.
 *
 * Coverage:
 *   - Happy path: valid callback returns code + state
 *   - State mismatch → CSRF defense triggers
 *   - OAuth provider error (?error=access_denied)
 *   - Missing code on otherwise valid callback
 *   - Timeout
 *   - AbortSignal (mid-wait and pre-aborted)
 *   - Port already in use
 *   - Input validation (port range, state, timeout, path)
 *   - Wrong path / method → 404
 *   - Browser-facing HTML (success + escaped error)
 *   - 127.0.0.1-only bind (cross-host requests should fail)
 */

import { describe, it, expect } from "vitest";
import * as http from "node:http";
import {
  awaitOAuthCallback,
  OAuthCallbackError,
  type OAuthCallbackOptions,
} from "../../utils/loopbackOAuthServer.js";

// ─────────────────────────────────────────────────────────────────────────────
// Constants
// ─────────────────────────────────────────────────────────────────────────────

// Random ports in the IANA "Dynamic/Private" range (49152-65535).
// Each test picks its own port to avoid collisions on parallel suite runs.
const PORT_BASE = 49500;
let portCursor = 0;
function nextPort(): number {
  return PORT_BASE + (portCursor++ % 200);
}

const TEST_STATE = "test-state-7c9f2a";
const TEST_CODE = "test-auth-code-abc123";
const SHORT_TIMEOUT_MS = 2000;     // safety net for "should-finish-fast" tests
const TIMEOUT_OBSERVE_MS = 200;    // explicit timeout test target
const ABORT_FIRE_MS = 50;          // when to fire abort relative to start
const HTTP_REQUEST_TIMEOUT_MS = 3000; // generous bound on a localhost HTTP round-trip

// ─────────────────────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────────────────────

/** Fire a GET request at the loopback server; returns {status, body}. */
function httpGet(port: number, path: string): Promise<{ status: number; body: string }> {
  return new Promise((resolve, reject) => {
    const req = http.get(
      { host: "127.0.0.1", port, path, timeout: HTTP_REQUEST_TIMEOUT_MS },
      (res) => {
        const chunks: Buffer[] = [];
        res.on("data", (c: Buffer) => chunks.push(c));
        res.on("end", () => {
          resolve({ status: res.statusCode ?? 0, body: Buffer.concat(chunks).toString("utf8") });
        });
        res.on("error", reject);
      },
    );
    req.on("error", reject);
    req.on("timeout", () => {
      req.destroy(new Error("client timeout"));
    });
  });
}

/**
 * Pre-attach helper — eliminates the unhandled-rejection timing window where
 * a promise rejects synchronously inside the request handler before the test's
 * .rejects.toThrow chain has a chance to attach. Returns a "settled" promise
 * that resolves with either the value or the error, so the test can assert
 * either outcome without ever leaving the original rejection unhandled.
 */
function captureSettlement<T>(p: Promise<T>): Promise<{ ok: true; value: T } | { ok: false; error: unknown }> {
  return p.then((value) => ({ ok: true as const, value })).catch((error: unknown) => ({ ok: false as const, error }));
}

/** Wait until the server is accepting connections (up to N ms). */
async function waitUntilListening(port: number, deadlineMs = 1000): Promise<void> {
  const start = Date.now();
  while (Date.now() - start < deadlineMs) {
    try {
      await new Promise<void>((resolve, reject) => {
        const socket = http
          .get({ host: "127.0.0.1", port, path: "/__ping_does_not_match__", timeout: 100 })
          .on("response", () => {
            socket.destroy();
            resolve();
          })
          .on("error", reject)
          .on("timeout", () => {
            socket.destroy();
            reject(new Error("not yet"));
          });
      });
      return; // got a response (even 404) — server is up
    } catch {
      await new Promise((r) => setTimeout(r, 10));
    }
  }
  throw new Error(`server on port ${port} did not start within ${deadlineMs}ms`);
}

// ─────────────────────────────────────────────────────────────────────────────
// Tests
// ─────────────────────────────────────────────────────────────────────────────

describe("awaitOAuthCallback — happy path", () => {
  it("returns code + state when callback URL is hit with matching state", async () => {
    const port = nextPort();
    const waiter = awaitOAuthCallback({
      port,
      expectedState: TEST_STATE,
      timeoutMs: SHORT_TIMEOUT_MS,
    });
    await waitUntilListening(port);
    const resp = await httpGet(port, `/callback?code=${TEST_CODE}&state=${TEST_STATE}`);
    expect(resp.status).toBe(200);
    expect(resp.body).toContain("Authorization received");
    const result = await waiter;
    expect(result.code).toBe(TEST_CODE);
    expect(result.state).toBe(TEST_STATE);
  });

  it("uses custom path when options.path provided", async () => {
    const port = nextPort();
    const waiter = awaitOAuthCallback({
      port,
      expectedState: TEST_STATE,
      timeoutMs: SHORT_TIMEOUT_MS,
      path: "/my-redirect",
    });
    await waitUntilListening(port);
    const resp = await httpGet(port, `/my-redirect?code=${TEST_CODE}&state=${TEST_STATE}`);
    expect(resp.status).toBe(200);
    const result = await waiter;
    expect(result.code).toBe(TEST_CODE);
  });
});

describe("awaitOAuthCallback — failure paths", () => {
  it("rejects with state-mismatch reason — browser sees 400, waiter rejects", async () => {
    const port = nextPort();
    // Pre-attach via captureSettlement so the rejection has a handler before it fires.
    const settled = captureSettlement(
      awaitOAuthCallback({ port, expectedState: TEST_STATE, timeoutMs: SHORT_TIMEOUT_MS }),
    );
    await waitUntilListening(port);
    const resp = await httpGet(port, `/callback?code=${TEST_CODE}&state=wrong-state`);
    expect(resp.status).toBe(400);
    expect(resp.body).toContain("State mismatch");
    const result = await settled;
    expect(result.ok).toBe(false);
    expect(result.ok === false && result.error).toBeInstanceOf(OAuthCallbackError);
    expect(result.ok === false && (result.error as OAuthCallbackError).reason).toBe("state-mismatch");
  });

  it("rejects with oauth-error when provider returns ?error=access_denied", async () => {
    const port = nextPort();
    const settled = captureSettlement(
      awaitOAuthCallback({ port, expectedState: TEST_STATE, timeoutMs: SHORT_TIMEOUT_MS }),
    );
    await waitUntilListening(port);
    const resp = await httpGet(
      port,
      `/callback?error=access_denied&error_description=user%20cancelled&state=${TEST_STATE}`,
    );
    expect(resp.status).toBe(400);
    expect(resp.body).toContain("access_denied");
    const result = await settled;
    expect(result.ok).toBe(false);
    if (result.ok) throw new Error("unreachable — checked above");
    const err = result.error as OAuthCallbackError;
    expect(err).toBeInstanceOf(OAuthCallbackError);
    expect(err.reason).toBe("oauth-error");
    expect(err.details?.error).toBe("access_denied");
    expect(err.details?.error_description).toBe("user cancelled");
  });

  it("rejects with missing-code when callback has state but no code", async () => {
    const port = nextPort();
    const settled = captureSettlement(
      awaitOAuthCallback({ port, expectedState: TEST_STATE, timeoutMs: SHORT_TIMEOUT_MS }),
    );
    await waitUntilListening(port);
    const resp = await httpGet(port, `/callback?state=${TEST_STATE}`);
    expect(resp.status).toBe(400);
    const result = await settled;
    expect(result.ok).toBe(false);
    expect(result.ok === false && (result.error as OAuthCallbackError).reason).toBe("missing-code");
  });

  it("rejects with timeout when no callback received within timeoutMs", async () => {
    const port = nextPort();
    const t0 = Date.now();
    try {
      await awaitOAuthCallback({
        port,
        expectedState: TEST_STATE,
        timeoutMs: TIMEOUT_OBSERVE_MS,
      });
      throw new Error("should have thrown");
    } catch (e) {
      expect(e).toBeInstanceOf(OAuthCallbackError);
      expect((e as OAuthCallbackError).reason).toBe("timeout");
      const elapsed = Date.now() - t0;
      expect(elapsed).toBeGreaterThanOrEqual(TIMEOUT_OBSERVE_MS - 20);
      expect(elapsed).toBeLessThan(TIMEOUT_OBSERVE_MS + 500);
    }
  });

  it("rejects with aborted when AbortSignal fires mid-wait", async () => {
    const port = nextPort();
    const controller = new AbortController();
    setTimeout(() => controller.abort(), ABORT_FIRE_MS);
    const t0 = Date.now();
    try {
      await awaitOAuthCallback({
        port,
        expectedState: TEST_STATE,
        timeoutMs: SHORT_TIMEOUT_MS,
        signal: controller.signal,
      });
      throw new Error("should have thrown");
    } catch (e) {
      expect((e as OAuthCallbackError).reason).toBe("aborted");
      const elapsed = Date.now() - t0;
      expect(elapsed).toBeLessThan(500);
    }
  });

  it("rejects immediately with aborted when signal already aborted at entry", async () => {
    const port = nextPort();
    const controller = new AbortController();
    controller.abort();
    const t0 = Date.now();
    try {
      await awaitOAuthCallback({
        port,
        expectedState: TEST_STATE,
        timeoutMs: SHORT_TIMEOUT_MS,
        signal: controller.signal,
      });
      throw new Error("should have thrown");
    } catch (e) {
      expect((e as OAuthCallbackError).reason).toBe("aborted");
      expect(Date.now() - t0).toBeLessThan(200);
    }
  });

  it("rejects with port-in-use when port is already bound", async () => {
    const port = nextPort();
    // Bind a blocker server first
    const blocker = http.createServer();
    await new Promise<void>((resolve, reject) => {
      blocker.once("error", reject);
      blocker.listen(port, "127.0.0.1", resolve);
    });
    try {
      await awaitOAuthCallback({
        port,
        expectedState: TEST_STATE,
        timeoutMs: SHORT_TIMEOUT_MS,
      });
      throw new Error("should have thrown");
    } catch (e) {
      expect((e as OAuthCallbackError).reason).toBe("port-in-use");
      expect((e as OAuthCallbackError).message).toContain(String(port));
    } finally {
      await new Promise<void>((r) => blocker.close(() => r()));
    }
  });
});

describe("awaitOAuthCallback — input validation (fail loud)", () => {
  it("rejects port < 1", async () => {
    await expect(
      awaitOAuthCallback({ port: 0, expectedState: TEST_STATE } as OAuthCallbackOptions),
    ).rejects.toThrow(/invalid port/);
  });

  it("rejects port > 65535", async () => {
    await expect(
      awaitOAuthCallback({ port: 70000, expectedState: TEST_STATE } as OAuthCallbackOptions),
    ).rejects.toThrow(/invalid port/);
  });

  it("rejects non-integer port", async () => {
    await expect(
      awaitOAuthCallback({ port: 8765.5, expectedState: TEST_STATE } as OAuthCallbackOptions),
    ).rejects.toThrow(/invalid port/);
  });

  it("rejects empty expectedState", async () => {
    await expect(
      awaitOAuthCallback({ port: nextPort(), expectedState: "" } as OAuthCallbackOptions),
    ).rejects.toThrow(/expectedState is required/);
  });

  it("rejects timeoutMs=0 (would prevent any callback observation)", async () => {
    await expect(
      awaitOAuthCallback({
        port: nextPort(),
        expectedState: TEST_STATE,
        timeoutMs: 0,
      } as OAuthCallbackOptions),
    ).rejects.toThrow(/invalid timeoutMs/);
  });

  it("rejects NaN timeoutMs", async () => {
    await expect(
      awaitOAuthCallback({
        port: nextPort(),
        expectedState: TEST_STATE,
        timeoutMs: NaN,
      } as OAuthCallbackOptions),
    ).rejects.toThrow(/invalid timeoutMs/);
  });

  it("rejects path without leading slash", async () => {
    await expect(
      awaitOAuthCallback({
        port: nextPort(),
        expectedState: TEST_STATE,
        path: "callback",
      } as OAuthCallbackOptions),
    ).rejects.toThrow(/path must start with/);
  });
});

describe("awaitOAuthCallback — HTTP routing", () => {
  it("returns 404 on non-callback path while waiting", async () => {
    const port = nextPort();
    const waiter = awaitOAuthCallback({
      port,
      expectedState: TEST_STATE,
      timeoutMs: SHORT_TIMEOUT_MS,
    });
    await waitUntilListening(port);
    const resp = await httpGet(port, "/some-other-path");
    expect(resp.status).toBe(404);
    expect(resp.body).toBe("Not Found");
    // Waiter is still running — fulfill it via the real callback so the test can close
    await httpGet(port, `/callback?code=${TEST_CODE}&state=${TEST_STATE}`);
    const result = await waiter;
    expect(result.code).toBe(TEST_CODE);
  });
});

describe("awaitOAuthCallback — security", () => {
  it("HTML-escapes error_description to prevent reflected XSS", async () => {
    const port = nextPort();
    const settled = captureSettlement(
      awaitOAuthCallback({ port, expectedState: TEST_STATE, timeoutMs: SHORT_TIMEOUT_MS }),
    );
    await waitUntilListening(port);
    const xssPayload = "%3Cscript%3Ealert(1)%3C%2Fscript%3E"; // <script>alert(1)</script>
    const resp = await httpGet(
      port,
      `/callback?error=bad&error_description=${xssPayload}&state=${TEST_STATE}`,
    );
    expect(resp.status).toBe(400);
    expect(resp.body).not.toContain("<script>");
    expect(resp.body).toContain("&#60;script&#62;"); // Numeric-entity-escaped <
    const result = await settled;
    expect(result.ok).toBe(false);
    expect(result.ok === false && (result.error as OAuthCallbackError).reason).toBe("oauth-error");
  });

  it("binds 127.0.0.1 only — not 0.0.0.0 (smoke-test via local request still works)", async () => {
    const port = nextPort();
    const waiter = awaitOAuthCallback({
      port,
      expectedState: TEST_STATE,
      timeoutMs: SHORT_TIMEOUT_MS,
    });
    await waitUntilListening(port);
    // We can't easily test that 0.0.0.0 is NOT bound without root/iptables.
    // But we CAN confirm the server still answers on 127.0.0.1.
    const resp = await httpGet(port, `/callback?code=${TEST_CODE}&state=${TEST_STATE}`);
    expect(resp.status).toBe(200);
    const result = await waiter;
    expect(result.code).toBe(TEST_CODE);
  });
});
