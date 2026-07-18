/**
 * SpeedFeedPage-a11y-labels.test.tsx (slot:oscar)
 *
 * Pins WCAG-AA label-input association on the SFC SpeedFeedPage product page (web/CLAUDE.md
 * a11y floor: every form control has a programmatically-associated <label>). The page's field
 * helpers (numberField / stringField / selectField / calibrationField) + the material datalist
 * input + the JM-Die machine-preset select previously rendered a bare <label> with no `htmlFor`,
 * so screen readers could not associate them with their control.
 *
 * `getByLabelText` resolves a control ONLY through a correct htmlFor<->id (or wrapping/aria)
 * association, so each assertion here FAILS if the association regresses. This is the real
 * intent-encoding guard, not a structural toBeDefined() stub.
 *
 * Only the network boundary (global.fetch, used by the unrelated coating DbBackedSelect) is
 * stubbed so the page settles; everything else is the real page render.
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

describe("SpeedFeedPage form controls are label-associated (WCAG-AA)", () => {
  it("associates a numberField label with its input (getByLabelText resolves it)", async () => {
    await renderSettled();
    const hb = screen.getByLabelText("HB") as HTMLInputElement;
    expect(hb.tagName).toBe("INPUT");
    expect(hb.getAttribute("data-field")).toBe("hardness_hb");
    expect(hb.id).toBe("sf-hardness_hb");
  });

  it("associates a selectField label with its select", async () => {
    await renderSettled();
    const iso = screen.getByLabelText("ISO") as HTMLSelectElement;
    expect(iso.tagName).toBe("SELECT");
    expect(iso.getAttribute("data-field")).toBe("iso_group");
    expect(iso.id).toBe("sf-iso_group");
  });

  it("associates a stringField label with its input", async () => {
    await renderSettled();
    const machineName = screen.getByLabelText("Machine lookup name") as HTMLInputElement;
    expect(machineName.getAttribute("data-field")).toBe("machine_name");
    expect(machineName.id).toBe("sf-machine_name");
  });

  it("associates a calibrationField label with its input (separate id namespace)", async () => {
    await renderSettled();
    const conf = screen.getByLabelText("Cal confidence") as HTMLInputElement;
    expect(conf.getAttribute("data-calibration")).toBe("confidence");
    expect(conf.id).toBe("sf-cal-confidence");
  });

  it("associates the material datalist input and the machine-preset select", async () => {
    await renderSettled();
    const material = screen.getByLabelText("Material") as HTMLInputElement;
    expect(material.getAttribute("list")).toBe("sfc-material-suggestions");
    expect(material.id).toBe("sf-material");

    const preset = screen.getByLabelText("JM Die / Catalog Machine") as HTMLSelectElement;
    expect(preset.getAttribute("data-testid")).toBe("machine-preset");
    expect(preset.id).toBe("sf-machine-preset");
  });

  it("explicitly links each label's htmlFor to its control id (mechanism, not just RTL heuristic)", async () => {
    const { container } = await renderSettled();
    // Every label that carries an htmlFor must point at an element that actually exists.
    const labels = Array.from(container.querySelectorAll("label[for]")) as HTMLLabelElement[];
    // The page renders ~55 controls; a realistic floor catches a mass-association drop,
    // not just a "no labels at all" stub. The per-control tests above pin the specific ones.
    expect(labels.length).toBeGreaterThanOrEqual(40);
    for (const label of labels) {
      const target = label.htmlFor;
      expect(container.querySelector(`#${CSS.escape(target)}`)).not.toBeNull();
    }
  });

  it("emits no duplicate sf-* control ids (guards a future helper id collision)", async () => {
    const { container } = await renderSettled();
    const ids = Array.from(container.querySelectorAll("[id^='sf-']")).map(el => el.id);
    expect(ids.length).toBeGreaterThanOrEqual(40); // realistic floor, not a "few ids" stub
    expect(new Set(ids).size).toBe(ids.length); // all unique
  });
});
