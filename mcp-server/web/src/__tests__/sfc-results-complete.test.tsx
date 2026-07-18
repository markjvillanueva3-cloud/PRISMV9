/**
 * U-SFC-RESULTS-COMPLETE — ResultsDisplay surfaces MRR / spindle power / tool life
 * ================================================================================
 * The backend route (mcp-server/src/routes/sfc.ts normalizeSfcCalculateResponse) already
 * publishes the engine's secondary process metrics into result.meta.{mrr_cm3_min, power_kw,
 * tool_life_min}, but ResultsDisplay only rendered the 4 primaries (spindle/feed/speed/fz).
 * This surfaces the three secondary metrics. Tests pin: (a) they render from meta, (b) imperial
 * unit conversion for MRR (cm³→in³), (c) graceful "—" (never crash / NaN) when meta is
 * absent / partial / non-numeric, (d) no regression to the 4 primary cards.
 */
import { describe, it, expect } from "vitest";
import { render, screen, cleanup } from "@testing-library/react";
import { afterEach } from "vitest";
import ResultsDisplay from "../components/sfc/ResultsDisplay";
import type { SfcCalculateResult } from "../types/sfc";

afterEach(cleanup);

const BASE: SfcCalculateResult = {
  cutting_speed: 200,
  feed_per_tooth: 0.1,
  spindle_speed: 5300,
  feed_rate: 2120,
};

function withMeta(meta: Record<string, unknown>): SfcCalculateResult {
  return { ...BASE, meta };
}

function renderResult(result: SfcCalculateResult | null, imperial = false) {
  return render(<ResultsDisplay result={result} loading={false} error={null} imperial={imperial} />);
}

describe("ResultsDisplay — secondary metrics (MRR / power / tool life)", () => {
  it("HAPPY: renders MRR, spindle power, and tool life from result.meta (metric)", () => {
    renderResult(withMeta({ mrr_cm3_min: 53.4, power_kw: 4.2, tool_life_min: 62 }));
    // labels present
    expect(screen.getByText("Material Removal")).toBeTruthy();
    expect(screen.getByText("Spindle Power")).toBeTruthy();
    expect(screen.getByText("Tool Life")).toBeTruthy();
    // values (metric): MRR 2dp, power 2dp, tool life 0dp
    expect(screen.getByText("53.40")).toBeTruthy();
    expect(screen.getByText("cm³/min")).toBeTruthy();
    expect(screen.getByText("4.20")).toBeTruthy();
    expect(screen.getByText("kW")).toBeTruthy();
    expect(screen.getByText("62")).toBeTruthy();
    expect(screen.getByText("min")).toBeTruthy();
  });

  it("IMPERIAL: MRR converts cm³/min → in³/min with the imperial unit label", () => {
    renderResult(withMeta({ mrr_cm3_min: 53.4, power_kw: 4.2, tool_life_min: 62 }), true);
    const expectedIn3 = (53.4 / 16.387064).toFixed(4); // matches component's cm3ToIn3 + fmt(_,4)
    expect(screen.getByText(expectedIn3)).toBeTruthy();
    expect(screen.getByText("in³/min")).toBeTruthy();
    // power stays kW, tool life stays min on both unit systems
    expect(screen.getByText("kW")).toBeTruthy();
    expect(screen.getByText("min")).toBeTruthy();
  });

  it("MISSING meta: the three cards still render but show — (never crash)", () => {
    renderResult(BASE); // no meta at all
    expect(screen.getByText("Material Removal")).toBeTruthy();
    expect(screen.getByText("Spindle Power")).toBeTruthy();
    expect(screen.getByText("Tool Life")).toBeTruthy();
    // all three placeholders present (em dash from fmt(undefined))
    expect(screen.getAllByText("—").length).toBeGreaterThanOrEqual(3);
  });

  it("PARTIAL meta: only power_kw present → power shows value, MRR + tool life show —", () => {
    renderResult(withMeta({ power_kw: 7.5 }));
    expect(screen.getByText("7.50")).toBeTruthy();
    expect(screen.getByText("kW")).toBeTruthy();
    // MRR + tool life fall back to em dash
    expect(screen.getAllByText("—").length).toBeGreaterThanOrEqual(2);
  });

  it("ADVERSARIAL: non-numeric / NaN / null meta values coerce to —, no NaN leak", () => {
    renderResult(withMeta({ mrr_cm3_min: "abc", power_kw: null, tool_life_min: Number.NaN }));
    expect(screen.queryByText(/NaN/)).toBeNull();
    expect(screen.getAllByText("—").length).toBeGreaterThanOrEqual(3);
  });

  it("ADVERSARIAL: a finite 0 is a real value → renders 0.00, not — (metaNum allows finite)", () => {
    renderResult(withMeta({ mrr_cm3_min: 0, power_kw: 0, tool_life_min: 0 }));
    // MRR 0 -> "0.00", power 0 -> "0.00" (two), tool life 0 -> "0"
    expect(screen.getAllByText("0.00").length).toBeGreaterThanOrEqual(2);
    expect(screen.getByText("0")).toBeTruthy();
  });

  it("REGRESSION: the four primary cards still render unchanged", () => {
    renderResult(withMeta({ mrr_cm3_min: 53.4, power_kw: 4.2, tool_life_min: 62 }));
    expect(screen.getByText("Spindle Speed")).toBeTruthy();
    expect(screen.getByText("Feed Rate")).toBeTruthy();
    expect(screen.getByText("Cutting Speed")).toBeTruthy();
    expect(screen.getByText("Feed per Tooth")).toBeTruthy();
    expect(screen.getByText("5300")).toBeTruthy(); // spindle_speed, 0dp
  });
});
