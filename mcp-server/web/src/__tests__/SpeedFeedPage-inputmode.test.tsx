/**
 * SpeedFeedPage-inputmode.test.tsx (slot:oscar)
 *
 * Pins the mobile-keyboard inputMode hint on SpeedFeedPage's numeric inputs. The SFC
 * product ships as a Capacitor mobile app and is numeric-forward (46 spinbuttons), so
 * web/CLAUDE.md calls `inputMode` "the lowest-effort highest-impact mobile UX win":
 *   - integer-step fields (flutes, RPM) -> inputMode="numeric" (plain number pad, no '.')
 *   - all other numeric fields + calibration factors -> inputMode="decimal"
 *
 * Only the network boundary (global.fetch, used by the coating DbBackedSelect) is stubbed
 * so the page settles; the assertions read the real rendered inputs.
 */
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";

vi.mock("../hooks/useSpeedFeed", () => ({
  useSpeedFeedOrchestrate: () => ({ data: null, loading: false, error: null, execute: vi.fn() }),
  useSpeedFeedOptimize: () => ({ data: null, loading: false, error: null, execute: vi.fn() }),
}));

import SpeedFeedPage from "../pages/SpeedFeedPage";

beforeEach(() => {
  vi.stubGlobal(
    "fetch",
    vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: () =>
        Promise.resolve({
          result: { options: [], total: 0, source: "curated", liveCount: 0, fallbackCount: 0, note: "" },
        }),
    }),
  );
});
afterEach(() => {
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

async function renderSettled() {
  const view = render(<SpeedFeedPage />);
  await waitFor(() => expect(screen.getByLabelText("Coating")).not.toBeDisabled());
  return view;
}

describe("SpeedFeedPage numeric inputs carry the correct mobile inputMode", () => {
  it("integer-step fields use the plain numeric pad", async () => {
    await renderSettled();
    // step:1 fields — flutes, max RPM
    expect(screen.getByLabelText("Flutes").getAttribute("inputmode")).toBe("numeric");
    expect(screen.getByLabelText("Max RPM").getAttribute("inputmode")).toBe("numeric");
  });

  it("decimal fields use the decimal pad", async () => {
    await renderSettled();
    expect(screen.getByLabelText("Diameter mm").getAttribute("inputmode")).toBe("decimal");
    expect(screen.getByLabelText("HB").getAttribute("inputmode")).toBe("decimal");
  });

  it("calibration factor inputs use the decimal pad", async () => {
    await renderSettled();
    expect(screen.getByLabelText("Cal confidence").getAttribute("inputmode")).toBe("decimal");
  });

  it("EVERY type=number input carries an inputMode (no mobile-keyboard gap left)", async () => {
    const { container } = await renderSettled();
    const numberInputs = Array.from(container.querySelectorAll('input[type="number"]')) as HTMLInputElement[];
    expect(numberInputs.length).toBeGreaterThanOrEqual(40); // the page is spinbutton-dense; realistic floor
    for (const el of numberInputs) {
      const mode = el.getAttribute("inputmode");
      expect(mode === "decimal" || mode === "numeric").toBe(true);
    }
  });
});
