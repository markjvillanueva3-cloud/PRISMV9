/**
 * R9 tests for formatCvBreakdown (U-SFC-UI-CV-RENDER, slot:oscar) -- the per-metric CV formatter that
 * surfaces the previously-unrendered uncertainty.*_cv_pct fields in the SFC Uncertainty tab.
 */
import { describe, it, expect } from "vitest";
import { formatCvBreakdown } from "../components/sfc/formatCvBreakdown";

describe("formatCvBreakdown", () => {
  it("formats all five CV metrics in order with +/- and one decimal", () => {
    const s = formatCvBreakdown({
      speed_cv_pct: 3.14,
      feed_cv_pct: 2.0,
      life_cv_pct: 11.5,
      force_cv_pct: 4.25,
      ra_cv_pct: 1.0,
    } as never);
    expect(s).toBe("Vc +/-3.1%, Feed +/-2.0%, Life +/-11.5%, Force +/-4.3%, Ra +/-1.0%");
  });

  it("includes only the metrics that are present (subset)", () => {
    const s = formatCvBreakdown({ speed_cv_pct: 5, ra_cv_pct: 2 } as never);
    expect(s).toBe("Vc +/-5.0%, Ra +/-2.0%");
  });

  it("returns null when no CV metric is present", () => {
    expect(formatCvBreakdown({ force_ci95: [1, 2] } as never)).toBeNull();
  });

  it("returns null for undefined / null uncertainty (additive: renders nothing)", () => {
    expect(formatCvBreakdown(undefined)).toBeNull();
    expect(formatCvBreakdown(null)).toBeNull();
  });

  it("excludes NaN / non-finite CV values", () => {
    const s = formatCvBreakdown({ speed_cv_pct: Number.NaN, feed_cv_pct: 3 } as never);
    expect(s).toBe("Feed +/-3.0%");
  });
});
