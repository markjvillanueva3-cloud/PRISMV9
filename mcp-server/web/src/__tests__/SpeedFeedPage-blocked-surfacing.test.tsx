/**
 * SpeedFeedPage-blocked-surfacing.test.tsx (slot:oscar, 2026-06-22)
 *
 * Regression guard for a FAIL-SILENT UX bug found via the live e2e visual pass: the SFC orchestrate
 * backend can return a GATE BLOCK instead of a physics result -- shape { result: { blocked: true,
 * reason, blocker } } (e.g. the pre-machine-completeness-gate). The page reads `result?.result?.value`,
 * which is undefined for that shape, so before the fix the page rendered NOTHING on a blocked calc:
 * no result, no error, no reason -- the user clicked Calculate and got a blank panel. oscar soul: a
 * safety/completeness block must be SURFACED, never swallowed (R12 fail-loud).
 *
 * The fix surfaces the block in a prominent (red, dark-canonical) panel with the reason + gate name.
 * This pins that the reason and gate render when the API returns { blocked: true }.
 */
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";

const BLOCKED = {
  result: {
    blocked: true,
    reason: "INCOMPLETE MACHINE DATA: Critical machine fields missing: spindle.max_rpm, spindle.power",
    blocker: "pre-machine-completeness-gate",
  },
};

vi.mock("../hooks/useSpeedFeed", () => ({
  useSpeedFeedOrchestrate: () => ({ data: BLOCKED, loading: false, error: null, execute: vi.fn() }),
  useSpeedFeedOptimize: () => ({ data: null, loading: false, error: null, execute: vi.fn() }),
}));

import SpeedFeedPage from "../pages/SpeedFeedPage";

// SpeedFeedPage now renders a DB-backed Coating <select> (DbBackedSelect) that fetches
// /api/v1/data/coating/catalog on mount. Stub the network so it resolves cleanly -- this
// suite asserts the blocked-panel behavior, not coatings, but the page must still settle
// without a real network attempt or an un-acted async state update.
beforeEach(() => {
  vi.stubGlobal(
    "fetch",
    vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: () =>
        Promise.resolve({
          result: { options: [], total: 0, source: "curated", liveCount: 0, fallbackCount: 0, note: "", recommendedByMaterial: {} },
        }),
    }),
  );
});
afterEach(() => {
  vi.unstubAllGlobals();
});

describe("SpeedFeedPage blocked-response surfacing (never swallow a safety/completeness block)", () => {
  it("renders a prominent blocked panel with the reason + gate when orchestrate returns { blocked: true }", async () => {
    render(<SpeedFeedPage />);
    const panel = screen.getByTestId("sfc-blocked");
    expect(panel.getAttribute("role")).toBe("alert");
    expect(panel.textContent).toMatch(/blocked/i);
    expect(panel.textContent).toContain("INCOMPLETE MACHINE DATA");
    expect(panel.textContent).toContain("spindle.max_rpm");
    expect(panel.textContent).toContain("pre-machine-completeness-gate");
    // Settle the DB-backed Coating select's post-mount fetch inside act.
    await waitFor(() => expect(screen.getByLabelText("Coating")).not.toBeDisabled());
  });

  it("does NOT render the 'select a machine' empty-state while a block is showing (no silent blank)", async () => {
    render(<SpeedFeedPage />);
    expect(screen.queryByText(/Select a JM Die machine and milling setup/i)).toBeNull();
    await waitFor(() => expect(screen.getByLabelText("Coating")).not.toBeDisabled());
  });
});
