import { afterAll, describe, expect, it } from "vitest";
import { execSync } from "child_process";

import { CadBridge } from "../engines/CadBridge.js";
import { booleanKernelEngine } from "../engines/BooleanKernelEngine.js";

let hasCadQuery = false;
try {
  execSync('python -c "import cadquery"', { timeout: 5000, stdio: "pipe" });
  hasCadQuery = true;
} catch {
  hasCadQuery = false;
}

const bridge = hasCadQuery
  ? CadBridge.getInstance({ timeout: 15_000 })
  : (null as unknown as ReturnType<typeof CadBridge.getInstance>);

afterAll(async () => {
  if (hasCadQuery) {
    await bridge.shutdown();
  }
});

describe.skipIf(!hasCadQuery)("BooleanKernelEngine", () => {
  it("subtracts solids through the real CAD bridge kernel", async () => {
    const box = await bridge.createGeometry({
      type: "box",
      width: 20,
      height: 20,
      depth: 20,
    });
    const cyl = await bridge.createGeometry({
      type: "cylinder",
      radius: 5,
      height: 30,
    });

    const result = await booleanKernelEngine.execute({
      operation: "subtract",
      solid_a: box.solid_id,
      solid_b: cyl.solid_id,
      validate_geometry: true,
    });

    expect(result.success).toBe(true);
    expect(result.kernel).toBe("cadquery_bridge");
    expect(result.solid_id).toBeTruthy();
    expect(result.volume_mm3).toBeCloseTo(6429.2, 0);
    expect(result.validation?.is_valid).toBe(true);
  });

  it("reports failure honestly for invalid solid ids", async () => {
    const result = await booleanKernelEngine.execute({
      operation: "intersect",
      solid_a: "missing_a",
      solid_b: "missing_b",
    });

    expect(result.success).toBe(false);
    expect(result.solid_id).toBeNull();
    expect(result.errors.some(error => /Boolean intersect failed/i.test(error))).toBe(true);
  });
});
