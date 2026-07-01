/**
 * ParameterPanel-coating.test.tsx (slot:oscar, U-OSC-SFC-COATING-FRONTEND-WIRE)
 *
 * Pins that the customer SFC ParameterPanel renders a Coating <select> and propagates the
 * selection through onChange. This is the input that was MISSING -- the shipped
 * ProductEngine.sfcCalculate coating derate (commit 226e256bb0) was UNREACHABLE from the customer
 * page because SfcParams had no coating field and buildSfcCalcRequest sent none. Options are limited
 * to the keys normalizeCoatingKey recognizes, so every option drives a real derate; the empty
 * option = uncoated (engine treats as neutral 1.0). Pairs with buildSfcRequest.test.ts (which pins
 * that the selection is forwarded into the request body).
 */
import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import ParameterPanel from "../components/sfc/ParameterPanel";
import type { SfcParams } from "../components/sfc/ParameterPanel";
import { getOperationById } from "../data/operations";

const operation = getOperationById("slot_milling")!;
const params: SfcParams = {
  tool_diameter: 12,
  number_of_teeth: 4,
  depth: 2,
  width: 6,
  tool_material: "Carbide",
  coolant: "flood",
};

function renderPanel(onChange = vi.fn()) {
  render(
    <ParameterPanel
      operation={operation}
      params={params}
      onChange={onChange}
      imperial={false}
      onToggleUnits={vi.fn()}
    />,
  );
  return onChange;
}

describe("ParameterPanel coating select (customer SFC coating input)", () => {
  it("renders a Coating select whose options are all backend-recognized coatings", () => {
    renderPanel();
    const coating = screen.getByLabelText("Coating") as HTMLSelectElement;
    expect(coating).toBeTruthy();
    // Each option maps to a normalizeCoatingKey override cell (drives a real derate), plus the
    // uncoated default. A regression that added a coating the engine silently ignores fails intent.
    for (const name of ["Uncoated / default", "TiAlN", "AlTiN", "AlCrN", "DLC", "Diamond / PCD"]) {
      expect(screen.getByRole("option", { name })).toBeTruthy();
    }
  });

  it("defaults to uncoated (empty value) so an untouched panel sends no coating", () => {
    renderPanel();
    const coating = screen.getByLabelText("Coating") as HTMLSelectElement;
    expect(coating.value).toBe("");
  });

  it("propagates a coating selection via onChange so buildSfcCalcRequest can forward it", () => {
    const onChange = renderPanel();
    fireEvent.change(screen.getByLabelText("Coating"), { target: { value: "diamond" } });
    expect(onChange).toHaveBeenCalledWith(expect.objectContaining({ coating: "diamond" }));
  });
});
