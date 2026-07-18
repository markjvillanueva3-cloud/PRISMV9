// Tests the extensible component health-check registry added to healthProbes.ts.
// Intent (R9): with nothing registered /health is the old behavior (no extra
// keys); a registered pass check folds in additively; a registered FAIL
// downgrades overall status to 503; a registered WARN downgrades to warn but
// stays 200; a THROWING check is caught and reported as fail (the probe is never
// taken down); unregister removes it. This lets DB/vector/LLM modules plug cheap
// deep probes into /health without editing the handler (R15 apply-to-all).
import { describe, it, expect, afterEach } from "vitest";
import type { Request, Response } from "express";
import {
  healthHandler,
  registerHealthCheck,
  unregisterHealthCheck,
  markReady,
} from "../mcp/healthProbes.js";

interface Captured { code: number; body: any }
function mockRes(): { res: Response; captured: Captured } {
  const captured: Captured = { code: 0, body: null };
  const res = {
    status(c: number) { captured.code = c; return res; },
    json(b: any) { captured.body = b; return res; },
  } as unknown as Response;
  return { res, captured };
}
const REQ = {} as Request;

describe("healthProbes extensible component checks", () => {
  afterEach(() => {
    unregisterHealthCheck("db");
    unregisterHealthCheck("vector");
    unregisterHealthCheck("boom");
  });

  it("default /health exposes no component keys and is pass/200 when ready", () => {
    markReady();
    const { res, captured } = mockRes();
    healthHandler(REQ, res);
    expect("db" in captured.body.checks).toBe(false); // none registered -> absent
    expect(captured.body.checks.uptime.status).toBe("pass");
    expect(captured.code).toBe(200);
  });

  it("folds a registered passing check into /health additively", () => {
    markReady();
    registerHealthCheck("db", () => ({ status: "pass", value: "5/20 conns" }));
    const { res, captured } = mockRes();
    healthHandler(REQ, res);
    expect(captured.body.checks.db).toEqual({ status: "pass", value: "5/20 conns" });
    expect(captured.code).toBe(200);
  });

  it("a registered FAIL check downgrades overall status to fail/503", () => {
    markReady();
    registerHealthCheck("vector", () => ({ status: "fail", value: "qdrant unreachable" }));
    const { res, captured } = mockRes();
    healthHandler(REQ, res);
    expect(captured.body.checks.vector.status).toBe("fail");
    expect(captured.body.status).toBe("fail");
    expect(captured.code).toBe(503);
  });

  it("a registered WARN check makes overall warn but stays 200", () => {
    markReady();
    registerHealthCheck("db", () => ({ status: "warn", value: "18/20 conns" }));
    const { res, captured } = mockRes();
    healthHandler(REQ, res);
    expect(captured.body.checks.db.status).toBe("warn");
    expect(captured.body.status).toBe("warn");
    expect(captured.code).toBe(200);
  });

  it("a THROWING check is caught and reported as fail, never crashing the probe", () => {
    markReady();
    registerHealthCheck("boom", () => { throw new Error("kaboom"); });
    const { res, captured } = mockRes();
    expect(() => healthHandler(REQ, res)).not.toThrow();
    expect(captured.body.checks.boom.status).toBe("fail");
    expect(String(captured.body.checks.boom.value)).toContain("kaboom");
    expect(captured.code).toBe(503);
  });

  it("unregister removes the check from subsequent /health responses", () => {
    markReady();
    registerHealthCheck("db", () => ({ status: "pass" }));
    unregisterHealthCheck("db");
    const { res, captured } = mockRes();
    healthHandler(REQ, res);
    expect("db" in captured.body.checks).toBe(false); // removed -> absent again
  });
});
