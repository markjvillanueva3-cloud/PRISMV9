/**
 * Render tests for UncertaintyAdvisoryBanner (U-SFC-UI-UNCERTAINTY, slot:oscar).
 * Proves the rendered DOM actually surfaces the signals the SFC UI previously dropped:
 * condition_warning (no field on the old type) and recommendations[] (rendered on no page),
 * and that a hard safety failure dominates a high numeric confidence.
 */
import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import UncertaintyAdvisoryBanner from "../components/sfc/UncertaintyAdvisoryBanner";

const result = (over: Record<string, unknown> = {}) =>
  ({
    overall_confidence: 0.9,
    uncertainty: { dominant_uncertainty_source: "material_kc1.1", suggested_measurement: "measure kc1.1" },
    safety_checks: [{ name: "spindle_power", passed: true, message: "within limit" }],
    limiting_factors: [],
    playbook_warnings: [],
    recommendations: [],
    ...over,
  }) as never;

describe("UncertaintyAdvisoryBanner", () => {
  it("renders nothing when there is no result", () => {
    const { container } = render(<UncertaintyAdvisoryBanner result={null} />);
    expect(container.firstChild).toBeNull();
  });

  it("a clean high-confidence result renders an OK status with the confidence and 'no warnings'", () => {
    render(<UncertaintyAdvisoryBanner result={result()} />);
    const el = screen.getByTestId("sfc-uncertainty-advisory");
    expect(el.getAttribute("role")).toBe("status");
    expect(el.getAttribute("aria-label")).toContain("OK");
    expect(el.textContent).toContain("Confidence 90%");
    expect(el.textContent).toContain("no warnings flagged");
  });

  it("surfaces the previously-dropped condition_warning and raises the level to Warning", () => {
    render(
      <UncertaintyAdvisoryBanner
        result={result({ uncertainty: { condition_warning: "thin-wall thermal risk" } })}
      />,
    );
    const el = screen.getByTestId("sfc-uncertainty-advisory");
    expect(el.textContent).toContain("Edge condition");
    expect(el.textContent).toContain("thin-wall thermal risk");
    // the edge signal changes the advisory level away from OK
    expect(el.getAttribute("aria-label")).toContain("Warning");
    expect(el.getAttribute("aria-label")).not.toContain("OK");
  });

  it("renders both recommendation items in order (previously rendered on neither SFC page)", () => {
    render(
      <UncertaintyAdvisoryBanner result={result({ recommendations: ["reduce ap by 20%", "add coolant"] })} />,
    );
    const recGroup = screen.getByTestId("sfc-advisory-recommendations");
    const items = Array.from(recGroup.querySelectorAll("li")).map((li) => li.textContent);
    expect(items).toEqual(["reduce ap by 20%", "add coolant"]);
  });

  it("a failed safety check renders a Critical advisory and lists the failure, beating a 95% confidence", () => {
    render(
      <UncertaintyAdvisoryBanner
        result={result({
          overall_confidence: 0.95,
          safety_checks: [{ name: "workholding", passed: false, message: "clamping force inadequate" }],
        })}
      />,
    );
    const el = screen.getByTestId("sfc-uncertainty-advisory");
    expect(el.getAttribute("aria-label")).toContain("Critical");
    expect(el.getAttribute("aria-label")).not.toContain("OK");
    const safetyList = screen.getByTestId("sfc-advisory-safety");
    expect(safetyList.textContent).toContain("clamping force inadequate");
  });

  // Dark-canonical parity (slot:oscar, SFC frontend dark-mode pass). The app body is always
  // dark (main.tsx forces data-theme='ios'); a status panel WITHOUT a dark-mode background
  // variant renders as a washed-out light pastel on the dark surface -- a safety panel that is
  // hard to read under-reports (oscar soul). This pins "every advisory level carries a dark:bg
  // variant" without pinning an exact shade, so it fails iff the dark treatment is removed.
  it("the OK panel carries a dark-mode background variant (not a light-only pastel)", () => {
    render(<UncertaintyAdvisoryBanner result={result()} />);
    const el = screen.getByTestId("sfc-uncertainty-advisory");
    expect(el.className).toMatch(/dark:bg-/);
  });

  it("the Critical (failed-safety) panel carries a dark-mode background variant (must read on the dark surface)", () => {
    render(
      <UncertaintyAdvisoryBanner
        result={result({
          overall_confidence: 0.95,
          safety_checks: [{ name: "workholding", passed: false, message: "clamping force inadequate" }],
        })}
      />,
    );
    const el = screen.getByTestId("sfc-uncertainty-advisory");
    expect(el.className).toMatch(/dark:bg-red-/);
  });
});
