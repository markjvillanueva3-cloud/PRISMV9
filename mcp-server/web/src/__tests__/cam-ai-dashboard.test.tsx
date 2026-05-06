// @vitest-environment jsdom
/**
 * U-CAM123 — CAM AI Health Dashboard tests.
 *
 * Coverage:
 *  - classifyHealth: high/low direction, exact-boundary, missing field,
 *    NaN/Infinity, empty thresholds  (8 cases)
 *  - classifyFleet: severity sort + stable model_id ordering           (1 case)
 *  - threshold registration: SLO-backed entries present                (1 case)
 *  - CamAiDashboardPage: loading header, error surface, KPI render,
 *    empty fleet, no lifecycle buttons                                 (5 cases)
 *
 * Total 15 cases — exceeds the milestone's ≥10 floor.
 */

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { cleanup, render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";

import {
  CAM_AI_ALERT_THRESHOLDS,
  classifyFleet,
  classifyHealth,
  type AlertThreshold,
} from "../data/camAiAlerts";
import type { CamServeHealth } from "../api/camServe";

vi.mock("../api/camServe", () => ({
  camServeApi: {
    listModels: vi.fn(),
    listHealth: vi.fn(),
    listRoutingPolicies: vi.fn(),
    listPendingConfirmations: vi.fn(),
    getModel: vi.fn(),
    getHealth: vi.fn(),
  },
}));

import { camServeApi } from "../api/camServe";
import CamAiDashboardPage from "../pages/cam-ai-dashboard";

const mockApi = vi.mocked(camServeApi);

// Threshold values used across multiple tests — keeps assertions
// resilient to threshold tuning without losing test specificity.
const P95_WARN = CAM_AI_ALERT_THRESHOLDS.find((t) => t.id === "p95_latency_ms")!.warn;
const P95_CRIT = CAM_AI_ALERT_THRESHOLDS.find((t) => t.id === "p95_latency_ms")!.crit;
const ERR_CRIT = CAM_AI_ALERT_THRESHOLDS.find((t) => t.id === "error_rate")!.crit;
const REQ_WARN = CAM_AI_ALERT_THRESHOLDS.find((t) => t.id === "request_count")!.warn;
const REQ_CRIT = CAM_AI_ALERT_THRESHOLDS.find((t) => t.id === "request_count")!.crit;

function makeHealth(overrides: Partial<CamServeHealth> = {}): CamServeHealth {
  return {
    model_id: "model-x",
    status: "active",
    request_count: 1000,
    error_count: 0,
    error_rate: 0.0,
    p95_latency_ms: 100,
    ...overrides,
  };
}

// ─── classifyHealth ──────────────────────────────────────────────

describe("classifyHealth", () => {
  it("returns no alerts when every metric is healthy", () => {
    const h = makeHealth({
      p95_latency_ms: 50,
      error_rate: 0.001,
      drift_score: 0.05,
      queue_depth: 5,
      request_count: 5000,
    });
    expect(classifyHealth(h)).toEqual([]);
  });

  it("emits a critical p95 alert with full metadata above the crit threshold", () => {
    const h = makeHealth({ model_id: "m1", p95_latency_ms: P95_CRIT + 100, request_count: 5000 });
    const lat = classifyHealth(h).find((a) => a.threshold_id === "p95_latency_ms");
    expect(lat).toMatchObject({
      threshold_id: "p95_latency_ms",
      model_id: "m1",
      severity: "critical",
      value: P95_CRIT + 100,
      warn: P95_WARN,
      crit: P95_CRIT,
    });
    expect(lat!.message).toContain("crossed critical threshold");
  });

  it("treats the warn boundary inclusively (value = warn ⇒ warning)", () => {
    const h = makeHealth({ p95_latency_ms: P95_WARN, request_count: 5000 });
    const lat = classifyHealth(h).find((a) => a.threshold_id === "p95_latency_ms");
    expect(lat?.severity).toBe("warning");
    expect(lat?.value).toBe(P95_WARN);
  });

  it("emits a critical alert when error_rate crosses the crit threshold", () => {
    const h = makeHealth({ error_rate: ERR_CRIT + 0.05, request_count: 5000 });
    const err = classifyHealth(h).find((a) => a.threshold_id === "error_rate");
    expect(err?.severity).toBe("critical");
    expect(err?.value).toBeCloseTo(ERR_CRIT + 0.05, 6);
  });

  it("classifies low-direction request_count: count below crit ⇒ critical", () => {
    const belowCrit = REQ_CRIT - 1;
    const h = makeHealth({ request_count: belowCrit });
    const sample = classifyHealth(h).find((a) => a.threshold_id === "request_count");
    expect(sample?.severity).toBe("critical");
    expect(sample?.value).toBe(belowCrit);
    expect(sample?.message).toContain("below critical threshold");
  });

  it("classifies low-direction request_count between crit and warn as warning", () => {
    const between = Math.floor((REQ_CRIT + REQ_WARN) / 2);
    const h = makeHealth({ request_count: between });
    const sample = classifyHealth(h).find((a) => a.threshold_id === "request_count");
    expect(sample?.severity).toBe("warning");
    expect(sample?.value).toBe(between);
  });

  it("skips metrics that are absent on the health row", () => {
    const h = makeHealth({ p95_latency_ms: 50, error_rate: 0, request_count: 5000 });
    const ids = classifyHealth(h).map((a) => a.threshold_id);
    expect(ids).not.toContain("drift_score");
    expect(ids).not.toContain("queue_depth");
    expect(ids).toEqual([]); // every present metric is also healthy
  });

  it("rejects NaN and Infinity defensively (no alerts emitted)", () => {
    const h = makeHealth({
      p95_latency_ms: Number.NaN,
      error_rate: Number.POSITIVE_INFINITY,
      drift_score: Number.NEGATIVE_INFINITY,
      request_count: 5000,
    });
    expect(classifyHealth(h)).toEqual([]);
  });

  it("respects an empty thresholds list (returns no alerts)", () => {
    const h = makeHealth({ p95_latency_ms: 99_999 });
    const empty: readonly AlertThreshold[] = [];
    expect(classifyHealth(h, empty)).toEqual([]);
  });
});

// ─── classifyFleet ───────────────────────────────────────────────

describe("classifyFleet", () => {
  it("sorts critical alerts before warnings and breaks ties by model_id", () => {
    const fleet: CamServeHealth[] = [
      makeHealth({ model_id: "z-model", p95_latency_ms: P95_WARN + 50, request_count: 5000 }),
      makeHealth({ model_id: "b-model", p95_latency_ms: P95_CRIT + 100, request_count: 5000 }),
      makeHealth({ model_id: "a-model", p95_latency_ms: P95_CRIT + 200, request_count: 5000 }),
    ];
    const out = classifyFleet(fleet);
    expect(out).toHaveLength(3);
    expect(out.map((a) => `${a.model_id}:${a.severity}`)).toEqual([
      "a-model:critical",
      "b-model:critical",
      "z-model:warning",
    ]);
  });
});

// ─── Threshold table sanity ──────────────────────────────────────

describe("CAM_AI_ALERT_THRESHOLDS", () => {
  it("registers SLO-backed thresholds with consistent direction + crit > warn semantics", () => {
    const ids = CAM_AI_ALERT_THRESHOLDS.map((t) => t.id);
    expect(ids).toContain("p95_latency_ms");
    expect(ids).toContain("error_rate");
    expect(ids).toContain("drift_score");
    for (const t of CAM_AI_ALERT_THRESHOLDS) {
      if (t.direction === "high") {
        expect(t.crit).toBeGreaterThan(t.warn);
      } else {
        expect(t.crit).toBeLessThan(t.warn);
      }
    }
  });
});

// ─── Page render ─────────────────────────────────────────────────

function renderPage() {
  return render(
    <MemoryRouter>
      <CamAiDashboardPage />
    </MemoryRouter>,
  );
}

describe("CamAiDashboardPage", () => {
  beforeEach(() => {
    cleanup();
    vi.clearAllMocks();
  });
  afterEach(() => cleanup());

  it("renders the page header even before data loads", () => {
    // Pending promises that never resolve — header must still mount.
    mockApi.listModels.mockReturnValue(new Promise(() => {}));
    mockApi.listHealth.mockReturnValue(new Promise(() => {}));
    mockApi.listRoutingPolicies.mockReturnValue(new Promise(() => {}));
    mockApi.listPendingConfirmations.mockReturnValue(new Promise(() => {}));

    renderPage();
    const heading = screen.getByRole("heading", { name: /CAM AI Health Dashboard/i });
    expect(heading.tagName).toBe("H1");
    expect(heading.textContent).toContain("CAM AI Health Dashboard");
  });

  it("surfaces the upstream error message when an endpoint fails", async () => {
    mockApi.listModels.mockRejectedValue(new Error("503 backend down"));
    mockApi.listHealth.mockResolvedValue({ success: true, health: [] });
    mockApi.listRoutingPolicies.mockResolvedValue({ success: true, policies: [] });
    mockApi.listPendingConfirmations.mockResolvedValue({ success: true, confirmations: [] });

    renderPage();
    const errEl = await waitFor(() => screen.getByTestId("dashboard-error"));
    expect(errEl.textContent).toBe("503 backend down");
  });

  it("renders the overview KPIs with concrete fleet counts when data arrives", async () => {
    mockApi.listModels.mockResolvedValue({
      success: true,
      models: [
        { id: "m1", status: "active", task: "strategy_recommend", cam_system: "fusion360" },
        { id: "m2", status: "canary", task: "strategy_recommend", cam_system: "fusion360" },
        { id: "m3", status: "shadow", task: "parameter_extract", cam_system: "mastercam" },
      ],
    });
    mockApi.listHealth.mockResolvedValue({
      success: true,
      health: [
        makeHealth({ model_id: "m1", p95_latency_ms: 80, error_rate: 0.001, request_count: 5000 }),
        makeHealth({ model_id: "m2", p95_latency_ms: P95_WARN + 50, error_rate: 0.04, request_count: 2000 }),
        makeHealth({ model_id: "m3", p95_latency_ms: P95_CRIT + 200, error_rate: ERR_CRIT + 0.10, request_count: 5000 }),
      ],
    });
    mockApi.listRoutingPolicies.mockResolvedValue({
      success: true,
      policies: [{ cam_system: "fusion360", task: "strategy_recommend", kind: "weighted" }],
    });
    mockApi.listPendingConfirmations.mockResolvedValue({ success: true, confirmations: [] });

    renderPage();

    // The Alerts tab embeds the count of warning+critical alerts.
    // m2 has p95 warning, m3 has p95 critical AND error_rate critical ⇒ 3.
    // findByRole waits for the dashboard to mount with data.
    const alertsTab = await screen.findByRole("tab", { name: /Alerts \(3\)/ });
    expect(alertsTab.textContent).toContain("(3)");

    // The status breakdown is rendered as a single <p> with mixed text/JSX
    // children. The middle-dot separator concatenates predictably.
    const breakdownNodes = screen.getAllByText((_t, el) => {
      if (!el || el.tagName !== "P") return false;
      const txt = el.textContent ?? "";
      return /\bactive\b/.test(txt) && /\bcanary\b/.test(txt) && /\bshadow\b/.test(txt);
    });
    expect(breakdownNodes.length).toBeGreaterThanOrEqual(1);
    const text = breakdownNodes[0].textContent ?? "";
    expect(text).toMatch(/1\s*active/);
    expect(text).toMatch(/1\s*canary/);
    expect(text).toMatch(/1\s*shadow/);
    expect(text).toMatch(/0\s*retired/);
  });

  it("renders the empty-fleet state and a refresh button", async () => {
    mockApi.listModels.mockResolvedValue({ success: true, models: [] });
    mockApi.listHealth.mockResolvedValue({ success: true, health: [] });
    mockApi.listRoutingPolicies.mockResolvedValue({ success: true, policies: [] });
    mockApi.listPendingConfirmations.mockResolvedValue({ success: true, confirmations: [] });

    renderPage();
    const nominal = await waitFor(() => screen.getByText("All thresholds nominal."));
    expect(nominal.textContent).toBe("All thresholds nominal.");
    const refresh = screen.getByRole("button", { name: /Refresh/i });
    expect(refresh.tagName).toBe("BUTTON");
  });

  it("does not expose lifecycle-mutating buttons (read-only by design)", async () => {
    mockApi.listModels.mockResolvedValue({ success: true, models: [] });
    mockApi.listHealth.mockResolvedValue({ success: true, health: [] });
    mockApi.listRoutingPolicies.mockResolvedValue({ success: true, policies: [] });
    mockApi.listPendingConfirmations.mockResolvedValue({ success: true, confirmations: [] });

    renderPage();
    await waitFor(() => screen.getByText("All thresholds nominal."));

    expect(screen.queryByRole("button", { name: /Promote/i })).toBeNull();
    expect(screen.queryByRole("button", { name: /Rollback/i })).toBeNull();
    expect(screen.queryByRole("button", { name: /Retire/i })).toBeNull();
    expect(screen.queryByRole("button", { name: /Deploy/i })).toBeNull();
  });
});
