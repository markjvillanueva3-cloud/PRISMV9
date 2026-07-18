// Tests bridgeError() — the helper that gives the bridge routes the structured
// logging they previously lacked (they respond directly in catch, bypassing the
// global errorHandler). R9: asserts the preserved { ok:false, error } 500 shape
// is unchanged, plus non-Error/null adversarial inputs.
import { describe, it, expect } from "vitest";
import { bridgeError } from "../routes/bridge.js";

function mockRes() {
  const calls: { status: number | null; json: any } = { status: null, json: null };
  const res: any = {
    status(code: number) {
      calls.status = code;
      return { json(body: unknown) { calls.json = body; return body; } };
    },
  };
  return { res, calls };
}

describe("bridgeError", () => {
  it("emits the preserved { ok:false, error } 500 shape from an Error", () => {
    const { res, calls } = mockRes();
    bridgeError(res, "register_endpoint", new Error("nope"));
    expect(calls.status).toBe(500);
    expect(calls.json).toEqual({ ok: false, error: "nope" });
  });

  it("keeps ok:false with an undefined error message for a non-Error throw", () => {
    const { res, calls } = mockRes();
    bridgeError(res, "route", { not: "an error" });
    expect(calls.status).toBe(500);
    expect(calls.json.ok).toBe(false);
    expect(calls.json.error).toBe(undefined);
  });

  it("does not rethrow on a null error and still responds 500", () => {
    const { res, calls } = mockRes();
    let threw = false;
    try { bridgeError(res, "health", null); } catch { threw = true; }
    expect(threw).toBe(false);
    expect(calls.status).toBe(500);
    expect(calls.json.ok).toBe(false);
  });
});
