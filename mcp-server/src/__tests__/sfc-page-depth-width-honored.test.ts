import { describe, it, expect } from "vitest";
import { productSFC } from "../engines/ProductEngine.js";

/**
 * Regression: the SFC web page (SfcCalculatorPage) posts the customer's cut geometry as
 * `depth` / `width` (the SfcParams field names), but ProductEngine.sfcCalculate read ONLY
 * `depth_of_cut` / `width_of_cut`, and nothing in the prism_product chain mapped the two.
 * => the customer's depth-of-cut + width-of-cut were SILENTLY IGNORED and the engine used
 * `toolDiam * 0.5` for both, so every page force / MRR / power / safety number was computed
 * at the wrong (default) depth. The fix makes the engine accept `depth`/`width` as aliases.
 */
describe("ProductEngine sfc_calculate honors the page's depth/width field names", () => {
  const base = {
    material: "1045",
    operation: "slot_milling",
    tool_material: "Carbide",
    tool_diameter: 12,
    number_of_teeth: 4,
  };

  it("frontend 'depth'/'width' flow to the engine (not silently defaulted to toolDiam*0.5)", () => {
    const r = productSFC("sfc_calculate", { ...base, depth: 8, width: 4 });
    const res = (r as { result: { depth_of_cut_mm: number; width_of_cut_mm: number } }).result;
    // Before the fix these were 6 (= tool_diameter 12 * 0.5) because `depth`/`width` were dropped.
    expect(res.depth_of_cut_mm).toBe(8);
    expect(res.width_of_cut_mm).toBe(4);
  });

  it("canonical depth_of_cut/width_of_cut still work and take precedence over the aliases", () => {
    const r = productSFC("sfc_calculate", {
      ...base, depth_of_cut: 5, width_of_cut: 3, depth: 99, width: 99,
    });
    const res = (r as { result: { depth_of_cut_mm: number; width_of_cut_mm: number } }).result;
    expect(res.depth_of_cut_mm).toBe(5); // canonical wins over the alias
    expect(res.width_of_cut_mm).toBe(3);
  });

  it("a deeper cut raises the cutting force (depth is load-bearing, not cosmetic)", () => {
    const shallow = (productSFC("sfc_calculate", { ...base, depth: 1, width: 6 }) as { result: { cutting_force_N: number } }).result;
    const deep = (productSFC("sfc_calculate", { ...base, depth: 8, width: 6 }) as { result: { cutting_force_N: number } }).result;
    // Kienzle Fc scales ~linearly with axial depth ap -> 8x ap must raise Fc well above shallow.
    expect(deep.cutting_force_N).toBeGreaterThan(shallow.cutting_force_N * 3);
  });
});
