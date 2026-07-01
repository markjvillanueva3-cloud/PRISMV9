// @vitest-environment jsdom
/**
 * Tests for JMDieFleetScanStatusPanel — JM-DIE-FLEET-SCAN-MS0 / U-FS04.
 *
 * Hermetic: substitutes __testHooks.fetchLedgerStats with a fake. No network.
 */
import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { JMDieFleetScanStatusPanel, __testHooks } from "./JMDieFleetScanStatusPanel.js";

let originalFetcher: typeof __testHooks.fetchLedgerStats;
beforeEach(() => { originalFetcher = __testHooks.fetchLedgerStats; });
afterEach(() => { __testHooks.fetchLedgerStats = originalFetcher; });

describe("JMDieFleetScanStatusPanel — happy path", () => {
  it("renders unique_paths and total_rows from ledger stats", async () => {
    __testHooks.fetchLedgerStats = vi.fn().mockResolvedValue({
      ok: true,
      total_rows: 6474,
      unique_paths: 6474,
      by_source: { "fleet-scan-batch": 5744, "financial-baseline": 530, "program-analysis": 200 },
      by_kind: { "cnc-program": 313, "docustrata": 448, "other": 5713 },
      parse_errors: 0,
      ledger_path: "H:/kienzle/state/shared/scan-tracking/jm-die-scan-ledger.jsonl",
    });
    render(<JMDieFleetScanStatusPanel />);
    await waitFor(() => expect(screen.queryByText("6,474")).toBeTruthy());
    expect(screen.getAllByText("6,474").length).toBeGreaterThanOrEqual(2); // unique_paths + total_rows
  });

  it("renders per-source chips with correct labels and counts", async () => {
    __testHooks.fetchLedgerStats = vi.fn().mockResolvedValue({
      total_rows: 1000,
      unique_paths: 1000,
      by_source: { "fleet-scan-batch": 700, "seed": 300 },
      by_kind: {},
      parse_errors: 0,
    });
    render(<JMDieFleetScanStatusPanel />);
    await waitFor(() => expect(screen.getByTestId("jmdie-fleet-scan-by-source-fleet-scan-batch")).toBeTruthy());
    expect(screen.getByTestId("jmdie-fleet-scan-by-source-fleet-scan-batch").textContent).toContain("Fleet scan");
    expect(screen.getByTestId("jmdie-fleet-scan-by-source-fleet-scan-batch").textContent).toContain("700");
    expect(screen.getByTestId("jmdie-fleet-scan-by-source-seed").textContent).toContain("300");
  });

  it("renders per-kind chips with correct labels", async () => {
    __testHooks.fetchLedgerStats = vi.fn().mockResolvedValue({
      total_rows: 100, unique_paths: 100,
      by_source: {},
      by_kind: { "cnc-program": 70, "docustrata": 30 },
      parse_errors: 0,
    });
    render(<JMDieFleetScanStatusPanel />);
    await waitFor(() => expect(screen.getByTestId("jmdie-fleet-scan-by-kind-cnc-program")).toBeTruthy());
    expect(screen.getByTestId("jmdie-fleet-scan-by-kind-cnc-program").textContent).toContain("CNC program");
    expect(screen.getByTestId("jmdie-fleet-scan-by-kind-cnc-program").textContent).toContain("70");
  });
});

describe("JMDieFleetScanStatusPanel — refresh", () => {
  it("re-fetches stats when Refresh is clicked", async () => {
    const spy = vi.fn().mockResolvedValue({ total_rows: 1, unique_paths: 1, by_source: {}, by_kind: {}, parse_errors: 0 });
    __testHooks.fetchLedgerStats = spy;
    render(<JMDieFleetScanStatusPanel />);
    await waitFor(() => expect(spy).toHaveBeenCalledTimes(1));
    fireEvent.click(screen.getByTestId("jmdie-fleet-scan-refresh"));
    await waitFor(() => expect(spy).toHaveBeenCalledTimes(2));
  });
});

describe("JMDieFleetScanStatusPanel — R12 fail-loud", () => {
  it("renders dispatcher error reason instead of silent empty panel", async () => {
    __testHooks.fetchLedgerStats = vi.fn().mockResolvedValue({ reason: "http-503-service-unavailable" });
    render(<JMDieFleetScanStatusPanel />);
    await waitFor(() => expect(screen.getByTestId("jmdie-fleet-scan-error")).toBeTruthy());
    expect(screen.getByTestId("jmdie-fleet-scan-error").textContent).toContain("http-503-service-unavailable");
  });

  it("surfaces non-zero parse_errors as warning", async () => {
    __testHooks.fetchLedgerStats = vi.fn().mockResolvedValue({
      total_rows: 100, unique_paths: 98,
      by_source: {}, by_kind: {},
      parse_errors: 2,
      ledger_path: "/foo/ledger.jsonl",
    });
    render(<JMDieFleetScanStatusPanel />);
    await waitFor(() => expect(screen.getByTestId("jmdie-fleet-scan-parse-errors")).toBeTruthy());
    expect(screen.getByTestId("jmdie-fleet-scan-parse-errors").textContent).toContain("2");
  });

  it("hides parse-errors warning when count is zero", async () => {
    __testHooks.fetchLedgerStats = vi.fn().mockResolvedValue({
      total_rows: 100, unique_paths: 100, by_source: {}, by_kind: {}, parse_errors: 0,
    });
    render(<JMDieFleetScanStatusPanel />);
    await waitFor(() => expect(screen.queryByTestId("jmdie-fleet-scan-parse-errors")).toBeNull());
  });
});
