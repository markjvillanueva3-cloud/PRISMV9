/**
 * Tests for the LIVE SFC API client (src/api/sfc.ts -- consumed by hooks/useSfc.ts)
 * and the shared envelope guard (src/api/envelopeGuard.ts).
 *
 * The load-bearing assertion is the SILENT-ZERO guard: a `200 OK` whose body is
 * `{ error: "..." }` MUST reject (with the backend's real message), not resolve
 * as success. That is the #1 regression class in this galaxy
 * (frontend-app/CLAUDE.md s2 + s5). These tests would all fail if the guard in
 * sfc.ts:post were removed. `fetch` + `getRequestHeaders` are mocked because the
 * SUT is the client's transport + envelope-guard logic, not the network or auth.
 */
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

// Mock the request-header source but preserve the real ApiError re-export so the
// guard throws a genuine ApiError instance (verified by `instanceof` below).
vi.mock("../api/client", async (importOriginal) => {
  const actual = await importOriginal<typeof import("../api/client")>();
  return { ...actual, getRequestHeaders: () => ({ "Content-Type": "application/json", "X-Test-Auth": "tok" }) };
});

import { sfcApi } from "../api/sfc";
import { assertNoEnvelopeError, envelopeErrorMessage, assertNotBlocked, blockedEnvelopeMessage } from "../api/envelopeGuard";
import { ApiError } from "../api/client";

function mockResponse(status: number, jsonBody: unknown): Response {
  return {
    ok: status >= 200 && status < 300,
    status,
    statusText: `Status ${status}`,
    json: async () => jsonBody,
  } as unknown as Response;
}

describe("sfcApi (live SFC client)", () => {
  let fetchMock: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);
  });
  afterEach(() => {
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  // -- Happy path: wiring, auth headers, abort signal forwarding -------------
  it("calculate posts to /api/v1/sfc/calculate with auth headers, body, and the abort signal", async () => {
    fetchMock.mockResolvedValueOnce(mockResponse(200, { result: { cutting_speed: 120, feed_per_tooth: 0.1, spindle_speed: 3800, feed_rate: 1520 } }));
    const ac = new AbortController();
    const out = await sfcApi.calculate({ material: "4140", operation: "slot" }, ac.signal);

    const [url, init] = fetchMock.mock.calls[0];
    expect(url).toBe("/api/v1/sfc/calculate");
    expect(init.method).toBe("POST");
    expect(init.headers).toMatchObject({ "X-Test-Auth": "tok" });
    expect(init.signal).toBe(ac.signal);
    expect(JSON.parse(init.body as string)).toEqual({ material: "4140", operation: "slot" });
    expect(out.result.cutting_speed).toBe(120);
  });

  it("routes each method to its exact endpoint", async () => {
    const cases: Array<[() => Promise<unknown>, string]> = [
      [() => sfcApi.cycleTime({ feed_rate: 500, cut_length: 100 }), "/api/v1/sfc/cycle-time"],
      [() => sfcApi.engagement({ tool_diameter: 10, radial_depth: 3 }), "/api/v1/sfc/engagement"],
      [() => sfcApi.deflection({ tool_diameter: 10, stickout: 40, cutting_force: 200 }), "/api/v1/sfc/deflection"],
      [() => sfcApi.powerTorque({ cutting_speed: 120, feed_rate: 500, depth: 2, width: 5 }), "/api/v1/sfc/power-torque"],
      [() => sfcApi.surfaceFinish({ feed: 0.1, nose_radius: 0.8 }), "/api/v1/sfc/surface-finish"],
      [() => sfcApi.toolLife({ cutting_speed: 120, feed: 0.1, depth: 2 }), "/api/v1/sfc/tool-life"],
    ];
    for (const [call, expectedUrl] of cases) {
      fetchMock.mockResolvedValueOnce(mockResponse(200, { result: {} }));
      await call();
      const calls = fetchMock.mock.calls;
      expect(calls[calls.length - 1][0]).toBe(expectedUrl);
    }
  });

  // -- Silent-zero guard (the core intent; would pass-as-success without it) -
  it("rejects a 200 OK string { error } envelope with status 200 and the backend message", async () => {
    fetchMock.mockResolvedValueOnce(mockResponse(200, { error: "engine refused: bad material" }));
    await expect(sfcApi.calculate({ material: "???", operation: "slot" })).rejects.toMatchObject({
      name: "ApiError",
      status: 200,
      message: expect.stringContaining("engine refused: bad material"),
    });
  });

  it("rejects a 200 OK object { error: { message } } envelope with the nested message", async () => {
    fetchMock.mockResolvedValueOnce(mockResponse(200, { error: { message: "validation failed" } }));
    await expect(sfcApi.deflection({ tool_diameter: 0, stickout: 0, cutting_force: 0 })).rejects.toMatchObject({
      status: 200,
      message: expect.stringContaining("validation failed"),
    });
  });

  it("rejects a 200 OK numeric { error: 422 } envelope (dispatcher error code)", async () => {
    fetchMock.mockResolvedValueOnce(mockResponse(200, { error: 422 }));
    await expect(sfcApi.toolLife({ cutting_speed: 0, feed: 0, depth: 0 })).rejects.toMatchObject({
      status: 200,
      message: expect.stringContaining("error code 422"),
    });
  });

  // -- Blocked-gate guard (silent-zero via { blocked } instead of { error }) -
  // The SFC pre-machine-completeness-gate returns 200 with { result: { blocked:
  // true, reason } } (NO `error` key) when machine spindle data is missing. That
  // is a calc that DID NOT RUN -- it must reject with the backend reason, not
  // resolve into a blank result panel (verified live on :3100).
  it("rejects a 200 OK { result: { blocked: true, reason } } gate envelope with the reason", async () => {
    fetchMock.mockResolvedValueOnce(mockResponse(200, {
      result: { blocked: true, blocker: "pre-machine-completeness-gate", reason: "INCOMPLETE MACHINE DATA: Critical machine fields missing: spindle.max_rpm, spindle.power", action: "sfc_calculate" },
    }));
    await expect(sfcApi.calculate({ material: "4140", operation: "milling" })).rejects.toMatchObject({
      name: "ApiError",
      status: 200,
      message: expect.stringContaining("INCOMPLETE MACHINE DATA"),
    });
  });

  it("rejects a top-level { blocked: true } envelope (no result nesting) too", async () => {
    fetchMock.mockResolvedValueOnce(mockResponse(200, { blocked: true, reason: "gate X" }));
    await expect(sfcApi.toolLife({ cutting_speed: 120, feed: 0.1, depth: 2 })).rejects.toMatchObject({
      status: 200,
      message: expect.stringContaining("gate X"),
    });
  });

  it("does NOT reject when blocked is falsy/absent (a normal calc resolves)", async () => {
    fetchMock.mockResolvedValueOnce(mockResponse(200, { result: { blocked: false, cutting_speed_m_min: 240 } }));
    const out = await sfcApi.calculate({ material: "4140", operation: "milling" });
    expect((out.result as { cutting_speed_m_min?: number }).cutting_speed_m_min).toBe(240);
  });

  // -- Adversarial: empty / null error is NOT a failure ---------------------
  it("resolves when error is null, returning the real result payload", async () => {
    fetchMock.mockResolvedValueOnce(mockResponse(200, { result: { Ra: 0.8, Rz: 3.2 }, error: null }));
    const out = await sfcApi.surfaceFinish({ feed: 0.1, nose_radius: 0.8 });
    expect(out.result).toEqual({ Ra: 0.8, Rz: 3.2 });
  });

  it("resolves when error is an empty string", async () => {
    fetchMock.mockResolvedValueOnce(mockResponse(200, { result: { engagement_angle: 90 }, error: "" }));
    const out = await sfcApi.engagement({ tool_diameter: 10, radial_depth: 5 });
    expect(out.result.engagement_angle).toBe(90);
  });

  // -- HTTP error path (the pre-existing !res.ok branch, preserved) ----------
  it("rejects an HTTP 500 carrying the backend error message", async () => {
    fetchMock.mockResolvedValue(mockResponse(500, { error: "server down" }));
    await expect(sfcApi.powerTorque({ cutting_speed: 120, feed_rate: 500, depth: 2, width: 5 }))
      .rejects.toThrow(/server down/);
  });
});

describe("envelopeErrorMessage", () => {
  it("returns the trimmed string for a non-empty string error", () => {
    expect(envelopeErrorMessage("  boom  ")).toBe("boom");
  });
  it("returns a coded message for a non-zero finite number", () => {
    expect(envelopeErrorMessage(422)).toBe("error code 422");
  });
  it("returns the nested message for an object error", () => {
    expect(envelopeErrorMessage({ message: " bad " })).toBe("bad");
  });
  it("returns null for non-error shapes (empty/whitespace, 0, NaN, array, bool, null, message-less object)", () => {
    expect(envelopeErrorMessage("")).toBeNull();
    expect(envelopeErrorMessage("   ")).toBeNull();
    expect(envelopeErrorMessage(0)).toBeNull();
    expect(envelopeErrorMessage(Number.NaN)).toBeNull();
    expect(envelopeErrorMessage([])).toBeNull();
    expect(envelopeErrorMessage(true)).toBeNull();
    expect(envelopeErrorMessage(null)).toBeNull();
    expect(envelopeErrorMessage({ code: 1 })).toBeNull();
    expect(envelopeErrorMessage({ message: "" })).toBeNull();
  });
});

describe("assertNoEnvelopeError", () => {
  it("returns a clean payload unchanged (same reference)", () => {
    const p = { result: { x: 1 } };
    expect(assertNoEnvelopeError<typeof p>(p, "/calculate")).toBe(p);
  });
  it("throws ApiError(200) embedding the endpoint and message on a real error", () => {
    let thrown: unknown;
    try { assertNoEnvelopeError({ error: "nope" }, "/calculate"); } catch (e) { thrown = e; }
    expect(thrown).toBeInstanceOf(ApiError);
    expect((thrown as ApiError).status).toBe(200);
    expect((thrown as ApiError).message).toBe("/calculate: nope");
  });
  it("passes through when error is missing, null, or whitespace-only", () => {
    expect(assertNoEnvelopeError({ result: 1 }, "/x")).toEqual({ result: 1 });
    expect(assertNoEnvelopeError({ error: null }, "/x")).toEqual({ error: null });
    expect(assertNoEnvelopeError({ error: "   " }, "/x")).toEqual({ error: "   " });
  });
});

describe("blockedEnvelopeMessage", () => {
  it("extracts reason + blocker code from a real { blocked: true } gate", () => {
    expect(blockedEnvelopeMessage({ blocked: true, blocker: "pre-machine-completeness-gate", reason: "INCOMPLETE MACHINE DATA" }))
      .toEqual({ message: "INCOMPLETE MACHINE DATA", code: "pre-machine-completeness-gate" });
  });
  it("falls back to a generic message + undefined code when reason/blocker are absent", () => {
    expect(blockedEnvelopeMessage({ blocked: true })).toEqual({ message: "calculation blocked by a safety/completeness gate", code: undefined });
  });
  it("trims a whitespace-padded reason and ignores an empty reason", () => {
    expect(blockedEnvelopeMessage({ blocked: true, reason: "  gate Y  " })?.message).toBe("gate Y");
    expect(blockedEnvelopeMessage({ blocked: true, reason: "   " })?.message).toBe("calculation blocked by a safety/completeness gate");
  });
  it("returns null when blocked is not strictly true (falsy/absent/truthy-non-bool)", () => {
    expect(blockedEnvelopeMessage({ blocked: false })).toBeNull();
    expect(blockedEnvelopeMessage({ blocked: "true" })).toBeNull();
    expect(blockedEnvelopeMessage({ blocked: 1 })).toBeNull();
    expect(blockedEnvelopeMessage({ result: 1 })).toBeNull();
  });
  it("returns null for non-object inputs (null, string, number, array)", () => {
    expect(blockedEnvelopeMessage(null)).toBeNull();
    expect(blockedEnvelopeMessage("blocked")).toBeNull();
    expect(blockedEnvelopeMessage(42)).toBeNull();
    expect(blockedEnvelopeMessage([])).toBeNull();
  });
});

describe("assertNotBlocked", () => {
  it("returns a clean payload unchanged (same reference)", () => {
    const p = { result: { cutting_speed_m_min: 240 } };
    expect(assertNotBlocked<typeof p>(p, "/calculate")).toBe(p);
  });
  it("throws ApiError(200) with endpoint + reason on a nested { result: { blocked } }", () => {
    let thrown: unknown;
    try { assertNotBlocked({ result: { blocked: true, blocker: "pre-machine-completeness-gate", reason: "INCOMPLETE MACHINE DATA" } }, "/calculate"); }
    catch (e) { thrown = e; }
    expect(thrown).toBeInstanceOf(ApiError);
    expect((thrown as ApiError).status).toBe(200);
    expect((thrown as ApiError).message).toBe("/calculate: INCOMPLETE MACHINE DATA");
    expect((thrown as ApiError & { code?: string }).code).toBe("pre-machine-completeness-gate");
  });
  it("throws on a top-level { blocked: true } envelope (no result nesting)", () => {
    expect(() => assertNotBlocked({ blocked: true, reason: "gate Z" }, "/x")).toThrow(/gate Z/);
  });
  it("passes through when neither the payload nor its .result is blocked", () => {
    expect(assertNotBlocked({ result: { blocked: false, x: 1 } }, "/x")).toEqual({ result: { blocked: false, x: 1 } });
    expect(assertNotBlocked({ result: { x: 1 } }, "/x")).toEqual({ result: { x: 1 } });
  });
});
