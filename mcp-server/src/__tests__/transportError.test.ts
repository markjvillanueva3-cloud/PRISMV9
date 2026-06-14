// Tests respondTransportError() — the extracted, unit-testable catch path for
// the POST /mcp handler. R9: full-shape assertions on the JSON-RPC 500 vs
// res.end() branch, plus adversarial non-Error reason + res.status() throwing.
import { describe, it, expect } from "vitest";
import { respondTransportError } from "../utils/transportError.js";

function mockRes(headersSent: boolean) {
  const calls: { status: number | null; json: any; ended: boolean } = { status: null, json: null, ended: false };
  const res = {
    headersSent,
    status(code: number) {
      calls.status = code;
      return { json(body: unknown) { calls.json = body; return body; } };
    },
    end() { calls.ended = true; return undefined; },
  };
  return { res, calls };
}

describe("respondTransportError", () => {
  it("emits a JSON-RPC 500 with the echoed id when headers are not yet sent", () => {
    const { res, calls } = mockRes(false);
    respondTransportError(res, new Error("boom"), 7);
    expect(calls.status).toBe(500);
    expect(calls.json).toEqual({ jsonrpc: "2.0", error: { code: -32000, message: "boom" }, id: 7 });
    expect(calls.ended).toBe(false);
  });

  it("ends the half-written response (no status) when headers are already sent", () => {
    const { res, calls } = mockRes(true);
    respondTransportError(res, new Error("late"), 1);
    expect(calls.status).toBe(null);
    expect(calls.ended).toBe(true);
  });

  it("echoes id null when the request id is absent", () => {
    const { res, calls } = mockRes(false);
    respondTransportError(res, new Error("x"), null);
    expect(calls.json).toEqual({ jsonrpc: "2.0", error: { code: -32000, message: "x" }, id: null });
  });

  it("coerces a non-Error rejection reason to its string message", () => {
    const { res, calls } = mockRes(false);
    respondTransportError(res, "string-reason", 2);
    expect(calls.json).toEqual({ jsonrpc: "2.0", error: { code: -32000, message: "string-reason" }, id: 2 });
  });

  it("does not rethrow if res.status() itself throws (best-effort, socket torn down)", () => {
    const res = { headersSent: false, status() { throw new Error("socket gone"); }, end() { return undefined; } } as any;
    let threw = false;
    try { respondTransportError(res, new Error("y"), 1); } catch { threw = true; }
    expect(threw).toBe(false);
  });
});
