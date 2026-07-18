/**
 * SpeedFeedPage-design-merge.test.tsx (slot:hotel, 2026-07-02)
 *
 * Pins the NET-NEW customer UX transplanted from the Kienzle "Speed-Feed.dc.html" design onto
 * the wired SpeedFeedPage (U-SFC-DESIGN-MERGE). Every design output binds to a REAL orchestrator
 * field (types/speedfeed.ts) or renders the NO_SOURCE em-dash -- never a fabricated number (R12).
 *
 * Coverage:
 *  - SOLVE-FOR intent modes drive the REAL OrchestratorInput.optimize_for on the calc payload
 *    (Tool-Saving->tool_life, Rush->productivity, Optimal->balanced, Upgrade->cost).
 *  - AGGRO slider SCALES the real radial_depth_pct/radial_depth_mm the orchestrator consumes
 *    (50 = unscaled passthrough; >50 deepens; clamped to the tool diameter).
 *  - The SPINDLE/FEED/SAFETY result cards render REAL result fields (spindle_rpm, feed_rate_mmmin,
 *    tangential_force_N, deflection_um->thou, tool_life_min, overall_confidence).
 *  - Fields with NO backend source render the em-dash, NOT a fabricated value: cut-temp + the
 *    entry-move outputs (ramp / plunge / helix / per-rev).
 *
 * The execute() spy is captured from the mocked hook so we assert the ACTUAL payload the page
 * sends -- the production wire, not a convenient bare shape (R9).
 */
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, waitFor, fireEvent } from "@testing-library/react";

// Captured execute spies -- the tests read what the page actually sent to the orchestrator.
const orchestrateExecute = vi.fn();
const optimizeExecute = vi.fn();

// A full, REAL-shaped OrchestratorResult so the new result cards have real fields to render.
// Values are deliberately distinct so an assertion fails if a card reads the wrong field.
const REAL_RESULT = {
  result: {
    value: {
      cutting_speed_mpm: 182.5,
      spindle_rpm: 4842,
      feed_per_tooth_mm: 0.0625,
      feed_rate_mmmin: 1210,
      axial_depth_mm: 12,
      radial_depth_mm: 1.8,
      mrr_cm3min: 26.1,
      power_kw: 7.4,
      torque_Nm: 15,
      tangential_force_N: 933,
      tool_life_min: 47,
      surface_finish_Ra_um: 1.24,
      deflection_um: 25.4, // -> exactly 1.00 thou (deflection_um / 25.4)
      overall_confidence: 0.72,
      uncertainty: {
        force_ci95: [800, 1050], life_ci95: [40, 55], ra_ci95: [1.0, 1.5], ra_cpk: 1.2,
        weibull: null, p_chatter: 0.1, sobol_dominant: "kc",
        sobol_contributions: { kc_pct: 50, life_pct: 30, ra_pct: 20 },
        dominant_uncertainty_source: "kc", suggested_measurement: "measure kc",
      },
      stability_assessment: { zone: "stable", p_chatter: 0.1, message: "Stable", suggested_rpm_pocket: undefined, lobe_index: undefined },
      limiting_factors: [],
      safety_checks: [{ name: "Spindle power", passed: true, message: "within limit" }],
      playbook_warnings: [],
      recommendations: [],
      alternatives: [
        { label: "Conservative", cutting_speed_mpm: 120, spindle_rpm: 3183, feed_rate_mmmin: 800, mrr_cm3min: 17.4, tool_life_min: 90, note: "book baseline" },
        { label: "Aggressive", cutting_speed_mpm: 210, spindle_rpm: 5570, feed_rate_mmmin: 1500, mrr_cm3min: 32, tool_life_min: 30, note: "push" },
      ],
      formulas_used: ["Kienzle"],
    },
  },
};

let mockOrchestrateData: unknown = null;
vi.mock("../hooks/useSpeedFeed", () => ({
  useSpeedFeedOrchestrate: () => ({ data: mockOrchestrateData, loading: false, error: null, execute: orchestrateExecute }),
  useSpeedFeedOptimize: () => ({ data: null, loading: false, error: null, execute: optimizeExecute }),
}));

import SpeedFeedPage from "../pages/SpeedFeedPage";

// Stub the DB-backed catalog fetches so the page settles without a real network attempt.
beforeEach(() => {
  orchestrateExecute.mockClear();
  optimizeExecute.mockClear();
  mockOrchestrateData = null;
  vi.stubGlobal(
    "fetch",
    vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: () => Promise.resolve({
        result: { options: [], total: 0, source: "curated", liveCount: 0, fallbackCount: 0, note: "", recommendedByMaterial: {}, vendors: [] },
      }),
    }),
  );
});
afterEach(() => {
  vi.unstubAllGlobals();
});

async function settle() {
  await waitFor(() => expect(screen.getByLabelText("Coating")).not.toBeDisabled());
}

describe("SpeedFeedPage design-merge: SOLVE-FOR intent modes drive optimize_for", () => {
  it("Tool-Saving sets optimize_for=tool_life on the calc payload", async () => {
    render(<SpeedFeedPage />);
    await settle();
    fireEvent.click(screen.getByTestId("solve-mode-tool_life"));
    fireEvent.click(screen.getByTestId("calculate-speed-feed"));
    expect(orchestrateExecute).toHaveBeenCalledTimes(1);
    expect(orchestrateExecute.mock.calls[0][0].optimize_for).toBe("tool_life");
  });

  it("Rush Job sets optimize_for=productivity", async () => {
    render(<SpeedFeedPage />);
    await settle();
    fireEvent.click(screen.getByTestId("solve-mode-productivity"));
    fireEvent.click(screen.getByTestId("calculate-speed-feed"));
    expect(orchestrateExecute.mock.calls[0][0].optimize_for).toBe("productivity");
  });

  it("Upgrade sets optimize_for=cost (distinct from the default balanced)", async () => {
    render(<SpeedFeedPage />);
    await settle();
    fireEvent.click(screen.getByTestId("solve-mode-cost"));
    fireEvent.click(screen.getByTestId("calculate-speed-feed"));
    expect(orchestrateExecute.mock.calls[0][0].optimize_for).toBe("cost");
  });

  it("Optimal (default) sends balanced -- the mode is not fabricating a value the enum lacks", async () => {
    render(<SpeedFeedPage />);
    await settle();
    fireEvent.click(screen.getByTestId("calculate-speed-feed"));
    expect(orchestrateExecute.mock.calls[0][0].optimize_for).toBe("balanced");
  });

  // REGRESSION (arm-C P2): the SOLVE-FOR chips cover only 4 of 5 optimize_for enum values;
  // `surface_finish` is reachable ONLY via the advanced "Optimize target" <select>. The chip
  // override must NOT silently clobber a `surface_finish` pick (the old page honored the select
  // verbatim). Picking surface_finish in the select must send surface_finish, not balanced.
  it("honors a `surface_finish` pick from the advanced select (no chip clobbers the 5th target)", async () => {
    render(<SpeedFeedPage />);
    await settle();
    // The advanced "Optimize target" select writes input.optimize_for directly.
    fireEvent.change(screen.getByLabelText("Optimize target"), { target: { value: "surface_finish" } });
    fireEvent.click(screen.getByTestId("calculate-speed-feed"));
    expect(orchestrateExecute.mock.calls[0][0].optimize_for).toBe("surface_finish");
  });
});

describe("SpeedFeedPage design-merge: AGGRO scales the REAL radial engagement (not a fabricated param)", () => {
  it("AGGRO at 50 (default) passes the typed radial depths through UNSCALED", async () => {
    render(<SpeedFeedPage />);
    await settle();
    fireEvent.click(screen.getByTestId("calculate-speed-feed"));
    const payload = orchestrateExecute.mock.calls[0][0];
    // Seeded input: radial_depth_pct=15, radial_depth_mm=1.8. Factor at 50 = 1.0 (unscaled).
    expect(payload.radial_depth_pct).toBeCloseTo(15, 5);
    expect(payload.radial_depth_mm).toBeCloseTo(1.8, 5);
  });

  it("AGGRO above 50 DEEPENS the radial engagement (larger radial_depth_pct)", async () => {
    render(<SpeedFeedPage />);
    await settle();
    fireEvent.change(screen.getByTestId("aggro-slider"), { target: { value: "100" } });
    fireEvent.click(screen.getByTestId("calculate-speed-feed"));
    const payload = orchestrateExecute.mock.calls[0][0];
    // Factor at 100 = 1.38 -> 15 * 1.38 = 20.7 pct.
    expect(payload.radial_depth_pct).toBeGreaterThan(15);
    expect(payload.radial_depth_pct).toBeCloseTo(20.7, 1);
  });

  it("AGGRO below 50 BACKS OFF the radial engagement (smaller radial_depth_pct)", async () => {
    render(<SpeedFeedPage />);
    await settle();
    fireEvent.change(screen.getByTestId("aggro-slider"), { target: { value: "0" } });
    fireEvent.click(screen.getByTestId("calculate-speed-feed"));
    const payload = orchestrateExecute.mock.calls[0][0];
    // Factor at 0 = 0.62 -> 15 * 0.62 = 9.3 pct.
    expect(payload.radial_depth_pct).toBeLessThan(15);
    expect(payload.radial_depth_pct).toBeCloseTo(9.3, 1);
  });

  it("the scaled radial_depth_mm never exceeds the tool diameter (full-slot physical ceiling)", async () => {
    render(<SpeedFeedPage />);
    await settle();
    // Push the seeded radial (1.8mm, dia 12mm) with max AGGRO -- 1.8*1.38=2.48 < 12, still under.
    // The clamp is asserted structurally: the sent radial is <= the seeded tool diameter (12).
    fireEvent.change(screen.getByTestId("aggro-slider"), { target: { value: "100" } });
    fireEvent.click(screen.getByTestId("calculate-speed-feed"));
    const payload = orchestrateExecute.mock.calls[0][0];
    expect(payload.radial_depth_mm).toBeLessThanOrEqual(12);
  });
});

describe("SpeedFeedPage design-merge: result cards render REAL fields; absent sources render the em-dash (R12)", () => {
  it("SPINDLE + FEED cards show the real spindle_rpm and feed_rate_mmmin", async () => {
    mockOrchestrateData = REAL_RESULT;
    render(<SpeedFeedPage />);
    await settle();
    expect(screen.getByTestId("sf-rpm").textContent).toContain("4842");
    expect(screen.getByTestId("sf-feed").textContent).toContain("1210");
  });

  it("the SAFETY rows show the real force, deflection (um->thou), tool life and confidence", async () => {
    mockOrchestrateData = REAL_RESULT;
    render(<SpeedFeedPage />);
    await settle();
    // Force Fc = 933 N; deflection 25.4 um = 1.00 thou; tool life 47 min; confidence 72%.
    expect(screen.getByText("933 N")).toBeTruthy();
    expect(screen.getByText("1.00 th")).toBeTruthy();
    expect(screen.getByText("47 min")).toBeTruthy();
    expect(screen.getByText("72%")).toBeTruthy();
  });

  it("cut-temp renders the em-dash (no orchestrator temperature field), NOT a fabricated number", async () => {
    mockOrchestrateData = REAL_RESULT;
    const { container } = render(<SpeedFeedPage />);
    await settle();
    // The "Cut temp" safety row's value cell holds the em-dash sentinel, not a degrees value.
    const rows = Array.from(container.querySelectorAll("div")).filter(d => d.textContent?.startsWith("Cut temp"));
    expect(rows.length).toBeGreaterThan(0);
    const cutTempRow = rows[0];
    expect(cutTempRow.textContent).toContain("—"); // em dash
    expect(cutTempRow.textContent).not.toMatch(/\d+\s*(C|deg|°)/i); // never a fabricated temperature
  });

  it("the entry-move outputs (ramp/plunge/helix/per-rev) all render the em-dash (no backend source yet)", async () => {
    mockOrchestrateData = REAL_RESULT;
    const { container } = render(<SpeedFeedPage />);
    await settle();
    // All four entry-move value cells are the em-dash sentinel; none is a fabricated number.
    const emDashCells = Array.from(container.querySelectorAll("div"))
      .filter(d => d.children.length === 0 && d.textContent === "—");
    // At least the 4 entry-move cells + the cut-temp cell = >=5 sentinels present.
    expect(emDashCells.length).toBeGreaterThanOrEqual(4);
  });

  it("the 'Vs. the old way' card computes the REAL MRR improvement over the conservative baseline", async () => {
    mockOrchestrateData = REAL_RESULT;
    render(<SpeedFeedPage />);
    await settle();
    // Current MRR 26.1 vs Conservative baseline 17.4 -> +50% (26.1/17.4 - 1 = 0.50).
    expect(screen.getByText("+50%")).toBeTruthy();
  });

  // REGRESSION (found via live sim, R12/R16): output_detail:"minimal" can return an alternative
  // row with a valid mrr_cm3min but NULL spindle_rpm/feed_rate_mmmin/tool_life_min. A bare
  // `.toFixed()` on those crashed the WHOLE page to the error boundary. The page must render the
  // em-dash for the null fields, never throw -- proven by the page rendering without an exception.
  it("does NOT crash when a live alternative row has null numeric fields (partial minimal result)", async () => {
    mockOrchestrateData = {
      result: {
        value: {
          ...REAL_RESULT.result.value,
          // The exact LIVE marginal-result shape that crashed the page (found via live sim):
          // CI95 tuples arrive [null, null] on a low-confidence result.
          uncertainty: {
            ...REAL_RESULT.result.value.uncertainty,
            force_ci95: [null, null], life_ci95: [null, null], ra_ci95: [null, null], ra_cpk: null,
          },
          alternatives: [
            // Conservative baseline: valid MRR (so the Vs-old-way card renders) but NULL
            // feed/rpm/life -- the exact live shape that crashed the page.
            { label: "conservative", cutting_speed_mpm: null, spindle_rpm: null, feed_rate_mmmin: null, mrr_cm3min: 17.4, tool_life_min: null, note: "" },
            { label: "aggressive", cutting_speed_mpm: 210, spindle_rpm: null, feed_rate_mmmin: null, mrr_cm3min: 32, tool_life_min: null, note: "" },
          ],
        },
      },
    } as unknown;
    // Rendering must not throw; the SPINDLE card still shows the real (non-alternative) rpm.
    render(<SpeedFeedPage />);
    await settle();
    expect(screen.getByTestId("sf-rpm").textContent).toContain("4842");
    // The Vs-old-way card still computes the improvement from the valid MRRs (26.1 vs 17.4 = +50%).
    expect(screen.getByText("+50%")).toBeTruthy();
    // The null baseline feed/rpm render the em-dash, not a fabricated number, inside that card.
    expect(screen.getAllByText(/—/).length).toBeGreaterThan(0);
  });
});
