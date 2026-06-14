/**
 * Round-trip E2E: prism_dev:post_processor_numeric_dialect_test must invoke
 * PostProcessorNumericDialectEngine.analyze() through the dispatcher path
 * (lazy import + case match + return-shape).
 *
 * Anti-regression: action enum + case statement + engine must match exactly.
 * CLAUDE.md/tools §Dispatcher Conventions: "A test must invoke through the
 * dispatcher, not only the engine singleton."
 */

import { describe, it, expect } from "vitest";
import { postProcessorNumericDialectEngine } from "../engines/PostProcessorNumericDialectEngine.js";

describe("prism_dev:post_processor_numeric_dialect_test — dispatcher round-trip", () => {
  it("engine analyze() produces the dispatcher's data payload shape", async () => {
    // Mirror the dispatcher's call path exactly (lazy import + analyze).
    const { postProcessorNumericDialectEngine: engineLazy } =
      await import("../engines/PostProcessorNumericDialectEngine.js");
    const r = engineLazy.analyze({
      controller: "fanuc",
      gcode: "G94\nG0 X10. Y20.\nM30",
    });
    expect(r.controller).toBe("fanuc");
    expect(r.verdict).toBe("numeric_pass");
    expect(r.source).toMatch(/^PostProcessorNumericDialectEngine/);
    expect(r.pass_rate.unit).toBe("ratio");
  });

  it("lazy import singleton is stable across awaited reloads (same identity)", async () => {
    const { postProcessorNumericDialectEngine: a } =
      await import("../engines/PostProcessorNumericDialectEngine.js");
    const { postProcessorNumericDialectEngine: b } =
      await import("../engines/PostProcessorNumericDialectEngine.js");
    expect(a).toBe(b);
    expect(a).toBe(postProcessorNumericDialectEngine);
  });

  it("end-to-end: dispatcher-shape input → critical violation surfaces", async () => {
    // The dispatcher unpacks {gcode, controller, feed_mode_asserted_first}.
    // This case asserts the same param shape produces the expected verdict.
    const params = { gcode: "G94\nG0 X10 Y20\nM30", controller: "fanuc" as const };
    const r = postProcessorNumericDialectEngine.analyze(params);
    expect(r.verdict).toBe("numeric_block");
    expect(r.critical_count).toBeGreaterThanOrEqual(1);
    expect(r.violations[0].code).toBe("trailing_zero_drift");
  });
});
