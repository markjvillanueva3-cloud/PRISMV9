// @vitest-environment jsdom
/**
 * Tests for QuotingTrainingLoopPanel — JM-DIE-QUOTE-TRAINING-MS0 / U-QT02.
 * Hermetic: substitutes __testHooks.runTrainingCycle. No network.
 */
import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { QuotingTrainingLoopPanel, __testHooks } from "../components/quoting/QuotingTrainingLoopPanel.js";

let originalRun: typeof __testHooks.runTrainingCycle;
beforeEach(() => { originalRun = __testHooks.runTrainingCycle; });
afterEach(() => { __testHooks.runTrainingCycle = originalRun; });

describe("Initial render — no report yet", () => {
  it("shows 'Click \"Run new cycle\"' hint and the run button enabled", () => {
    __testHooks.runTrainingCycle = vi.fn().mockResolvedValue({});
    render(<QuotingTrainingLoopPanel />);
    expect(screen.getByText(/Click "Run new cycle"/)).not.toBeNull();
    const btn = screen.getByTestId("qt-run-cycle") as HTMLButtonElement;
    expect(btn.disabled).toBe(false);
  });
});

describe("Run-cycle button → dispatcher call + metric render", () => {
  it("clicking 'Run new cycle' invokes runTrainingCycle once with DEMO_RECORDS shape", async () => {
    const spy = vi.fn().mockResolvedValue({
      ok: true, total_records: 3, total_predicted: 3, total_skipped: 0,
      metrics: { mae_usd: 12.34, rmse_usd: 15.67, mape_pct: 8.5, mean_signed_pct_error: 3.2 },
      per_customer_bias: [], psi_delta_fed_count: 3,
    });
    __testHooks.runTrainingCycle = spy;
    render(<QuotingTrainingLoopPanel />);
    fireEvent.click(screen.getByTestId("qt-run-cycle"));
    await waitFor(() => expect(spy.mock.calls.length).toBe(1));
    const records = spy.mock.calls[0][0] as Array<Record<string, unknown>>;
    expect(records.length).toBe(3);
    expect(records[0].customer).toBe("ACCURATE");
  });

  it("renders MAE / RMSE / MAPE / signed-bias metrics with exact formatted values", async () => {
    __testHooks.runTrainingCycle = vi.fn().mockResolvedValue({
      ok: true, total_records: 3, total_predicted: 3, total_skipped: 0,
      metrics: { mae_usd: 12.34, rmse_usd: 15.67, mape_pct: 8.5, mean_signed_pct_error: 3.2 },
      per_customer_bias: [],
    });
    render(<QuotingTrainingLoopPanel />);
    fireEvent.click(screen.getByTestId("qt-run-cycle"));
    await waitFor(() => expect(screen.queryByTestId("qt-metric-mae")?.textContent).toContain("$12.34"));
    expect(screen.getByTestId("qt-metric-rmse").textContent).toContain("$15.67");
    expect(screen.getByTestId("qt-metric-mape").textContent).toContain("8.5%");
    expect(screen.getByTestId("qt-metric-bias").textContent).toContain("+3.2%");
  });

  it("renders per-customer bias rows with direction-coded labels", async () => {
    __testHooks.runTrainingCycle = vi.fn().mockResolvedValue({
      ok: true, total_records: 4, total_predicted: 4, total_skipped: 0,
      metrics: { mae_usd: 10, rmse_usd: 10, mape_pct: 15, mean_signed_pct_error: 0 },
      per_customer_bias: [
        { customer: "ACCURATE", record_count: 2, mean_pct_error: 12.5, mean_abs_pct_error: 12.5, systematic_direction: "over-predicting" },
        { customer: "ITW",      record_count: 1, mean_pct_error: -8.3, mean_abs_pct_error: 8.3,  systematic_direction: "under-predicting" },
        { customer: "OPTIMAS",  record_count: 1, mean_pct_error: 1.2,  mean_abs_pct_error: 1.2,  systematic_direction: "balanced" },
      ],
    });
    render(<QuotingTrainingLoopPanel />);
    fireEvent.click(screen.getByTestId("qt-run-cycle"));
    await waitFor(() => expect(screen.queryByTestId("qt-bias-row-ACCURATE")).not.toBeNull());
    expect(screen.getByTestId("qt-bias-row-ACCURATE").textContent).toContain("over-predicting");
    expect(screen.getByTestId("qt-bias-row-ACCURATE").textContent).toContain("+12.5%");
    expect(screen.getByTestId("qt-bias-row-ITW").textContent).toContain("under-predicting");
    expect(screen.getByTestId("qt-bias-row-ITW").textContent).toContain("-8.3%");
    expect(screen.getByTestId("qt-bias-row-OPTIMAS").textContent).toContain("balanced");
  });

  it("shows psi_delta signal count when > 0 (proves PSN feed-back wiring is surfaced to operator)", async () => {
    __testHooks.runTrainingCycle = vi.fn().mockResolvedValue({
      ok: true, total_records: 3, total_predicted: 3, total_skipped: 0,
      metrics: { mae_usd: 0, rmse_usd: 0, mape_pct: 0, mean_signed_pct_error: 0 },
      per_customer_bias: [], psi_delta_fed_count: 3,
    });
    render(<QuotingTrainingLoopPanel />);
    fireEvent.click(screen.getByTestId("qt-run-cycle"));
    await waitFor(() => expect(screen.queryByTestId("qt-customer-bias")).not.toBeNull());
    expect(screen.getByTestId("qt-training-loop-panel").textContent).toContain("3 psi_delta signals fed to PSN");
  });
});

describe("R12 fail-loud", () => {
  it("dispatcher error reason renders in error banner with exact text", async () => {
    __testHooks.runTrainingCycle = vi.fn().mockResolvedValue({ reason: "http-503-service-unavailable" });
    render(<QuotingTrainingLoopPanel />);
    fireEvent.click(screen.getByTestId("qt-run-cycle"));
    await waitFor(() => expect(screen.queryByTestId("qt-error")?.textContent).toContain("http-503-service-unavailable"));
  });
});
