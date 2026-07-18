/**
 * dashboard-auth-header.test.ts -- U-WIRE-DASHBOARD-AUTH (slot:hotel, LAUNCH-WIRE)
 *
 * web/src/api/dashboard.ts fetchRoute() sent only Content-Type, no auth header. Two of the four
 * dashboard routes it fans out to are verifyToken-gated on the backend:
 *   - GET  /api/v1/erp/job-dashboard  (erp.ts:587, verifyToken)
 *   - POST /api/v1/erp/tool-usage     (erp.ts:596, verifyToken)
 * so a signed-in user WITHOUT the Bearer 401s on those -> loadDashboardSnapshot silently falls to
 * DEMO_JOBS / DEMO_TOOLS (describeDashboardSource -> 'demo') and the shop owner sees fabricated demo
 * figures instead of their live shop data. The fix attaches getRequestHeaders() (client.ts, the
 * canonical shared auth helper) to EVERY dashboard fetch.
 *
 * R9: this test mocks global.fetch to CAPTURE the headers each fetch received, then asserts the auth
 * header reached all four calls. Revert the fix (drop getRequestHeaders from fetchRoute) and the
 * Authorization assertion fails -> the test has teeth. getRequestHeaders is mocked to a deterministic
 * Bearer so the assertion is stable regardless of localStorage state in the test env.
 */
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

// Mock the canonical auth helper to a deterministic Bearer so the test does not depend on
// localStorage/token state. This is the SAME helper the fix imports (R8 reuse), so mocking it here
// exercises the real wiring: fetchRoute must spread its result into the fetch headers.
vi.mock("../api/client", () => ({
  getRequestHeaders: () => ({ Authorization: "Bearer test-token", "X-Client": "prism-web" }),
}));

// Capture every fetch call's URL + init so we can assert the auth header propagated.
const fetchCalls: Array<{ url: string; init: RequestInit | undefined }> = [];

beforeEach(() => {
  fetchCalls.length = 0;
  // Each route resolves to an empty-but-ok body -> normalizers return [] / null -> snapshot falls to
  // demo, which is fine: we are asserting the REQUEST headers, not the response data.
  vi.stubGlobal("fetch", vi.fn(async (url: string, init?: RequestInit) => {
    fetchCalls.push({ url: String(url), init });
    return {
      ok: true,
      status: 200,
      json: async () => ({}),
    } as Response;
  }));
});

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("dashboard.ts fetchRoute -- auth header attached to every request (U-WIRE-DASHBOARD-AUTH)", () => {
  it("attaches the Bearer to ALL four dashboard fetches (GET and POST)", async () => {
    const { loadDashboardSnapshot } = await import("../api/dashboard");
    await loadDashboardSnapshot();

    // All four routes must have been called.
    const urls = fetchCalls.map((c) => c.url);
    expect(urls.some((u) => u.includes("/machine-live/list"))).toBe(true);
    expect(urls.some((u) => u.includes("/erp/job-dashboard"))).toBe(true);
    expect(urls.some((u) => u.includes("/erp/tool-usage"))).toBe(true);
    expect(urls.some((u) => u.includes("/telemetry/dashboard"))).toBe(true);

    // LOAD-BEARING: every fetch carries the auth header (the dead-panel signature is its ABSENCE on
    // the verifyToken-gated /erp routes). Revert the fix -> headers is undefined on GETs / only
    // Content-Type on POSTs -> Authorization is missing -> this fails.
    expect(fetchCalls.length).toBe(4);
    for (const call of fetchCalls) {
      const headers = (call.init?.headers ?? {}) as Record<string, string>;
      expect(headers.Authorization).toBe("Bearer test-token");
    }
  });

  it("the verifyToken-gated /erp routes specifically carry the Bearer (not just the anon routes)", async () => {
    const { loadDashboardSnapshot } = await import("../api/dashboard");
    await loadDashboardSnapshot();

    for (const path of ["/erp/job-dashboard", "/erp/tool-usage"]) {
      const call = fetchCalls.find((c) => c.url.includes(path));
      expect(call, `${path} must have been fetched`).toBeTruthy();
      const headers = (call!.init?.headers ?? {}) as Record<string, string>;
      // Without this the gated route 401s and the ERP surface silently demo-falls back.
      expect(headers.Authorization).toBe("Bearer test-token");
    }
  });

  it("POST routes keep Content-Type AND gain the auth header (headers merged, not replaced)", async () => {
    const { loadDashboardSnapshot } = await import("../api/dashboard");
    await loadDashboardSnapshot();

    // /erp/tool-usage is a POST with a body -> must have BOTH Content-Type and Authorization.
    const post = fetchCalls.find((c) => c.url.includes("/erp/tool-usage"));
    expect(post).toBeTruthy();
    const headers = (post!.init?.headers ?? {}) as Record<string, string>;
    expect(headers["Content-Type"]).toBe("application/json");
    expect(headers.Authorization).toBe("Bearer test-token");
  });
});
