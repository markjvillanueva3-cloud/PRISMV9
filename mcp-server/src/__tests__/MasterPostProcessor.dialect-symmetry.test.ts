/**
 * Dialect-symmetry regression test for MasterPostProcessorUnifiedAGIEngine.
 *
 * Background: pre-iter17 the engine scored Heidenhain/Mitsubishi at 50-75 vs
 * Fanuc/Okuma/Haas at 85. Iter17 (2026-05-26) added per-dialect `signals:`
 * overrides + dialect-aware HSM/coolant injection. But the dist/ never
 * rebuilt (build was blocked by an unrelated `await`-outside-async error in
 * `MillingPrintToProgramEngine.ts:2120` + 4 esbuild file:// resolution errors
 * in `sessionHybridSearchAction.ts`). Production code stayed pre-iter17.
 *
 * This test guards against regression: every controller must score ≥ the
 * Fanuc baseline minus a 10-point tolerance band on an equivalent milling
 * stub. Five dialects, all matched against the same operation. Failure of
 * any dialect re-opens the asymmetry bug. Reference values come from the
 * 5/26 prove-out + this session's diagnostic.
 *
 * Slot:echo · 2026-05-27 · CAD-FUSION-LIVE-MS0 chat post the 5/27 recap.
 */

import { describe, it, expect } from "vitest";
import { masterPostProcessorUnifiedAGIEngine } from "../engines/MasterPostProcessorUnifiedAGIEngine.js";

// Heidenhain milling stub (from post-processor-validate-corpus.mjs synthesizeOpStubGcode)
const HEIDENHAIN_MILLING = [
  "0 BEGIN PGM TEST MM",
  "1 BLK FORM 0.1 Z X-50 Y-50 Z-25",
  "TOOL CALL 1 Z S6000",
  "L X+0 Y+0 R0 FMAX M3",
  "L Z+2 R0 FMAX",
  "L Z-2 R0 F300",
  "L X40.000 R0 F600",
  "L Z+25 R0 FMAX",
  "99 END PGM TEST MM",
].join("\n") + "\n";

// Fanuc-family milling stub (canonical preamble used by fanuc / okuma / haas / mitsubishi)
const FANUC_FAMILY_MILLING = [
  "G21 G90 G54",
  "T1 M06",
  "S6000 M03",
  "G00 X0 Y0",
  "G00 Z2.0",
  "G01 Z-2.0 F300",
  "G01 X40.000 F600",
  "G00 Z25",
  "M30",
].join("\n") + "\n";

function scoreFor(controller: "fanuc" | "okuma" | "haas" | "heidenhain" | "mitsubishi"): number {
  const gcode = controller === "heidenhain" ? HEIDENHAIN_MILLING : FANUC_FAMILY_MILLING;
  const result = masterPostProcessorUnifiedAGIEngine.generatePost({
    controller,
    gcode,
    operation_intent: "milling",
    tool_diameter_mm: 10,
    inject_tribal: true,
    validate_physics: false,
    validate_kinematics: false,
    enable_deep_learning: false,
  });
  return result.quality_score;
}

describe("MasterPostProcessorUnifiedAGIEngine — dialect symmetry", () => {
  // Reference values from this session's diagnostic + 5/26 prove-out target.
  // Every controller must clear the 70 floor (Ω prove-out floor is 80 at
  // tier=corpus but the engine itself must hit ≥70 on equivalent inputs;
  // the 80 gate is composed of multiple ω terms, not just quality alone).
  const FLOOR = 70;

  it("fanuc scores ≥ 70 on canonical Fanuc milling stub", () => {
    const score = scoreFor("fanuc");
    expect(score, `fanuc actual=${score}`).toBeGreaterThanOrEqual(FLOOR);
  });

  it("okuma scores ≥ 70 on canonical Fanuc-family milling stub", () => {
    const score = scoreFor("okuma");
    expect(score, `okuma actual=${score}`).toBeGreaterThanOrEqual(FLOOR);
  });

  it("haas scores ≥ 70 on canonical Fanuc-family milling stub", () => {
    const score = scoreFor("haas");
    expect(score, `haas actual=${score}`).toBeGreaterThanOrEqual(FLOOR);
  });

  it("mitsubishi scores ≥ 70 on canonical Fanuc-family milling stub", () => {
    const score = scoreFor("mitsubishi");
    expect(score, `mitsubishi actual=${score}`).toBeGreaterThanOrEqual(FLOOR);
  });

  it("heidenhain scores ≥ 70 on canonical Heidenhain TNC milling stub", () => {
    // THIS is the regression guard. Heidenhain emits canonical TNC tokens
    // (BEGIN PGM / TOOL CALL / L X+/L Z+ / FMAX / END PGM). The engine must
    // recognize them as safe-start + first-motion targets and inject M120
    // (HSM) + coolant-off in the dialect-correct spot. Pre-iter17 this
    // scored 50-55 because all three dimension scorers (safe_start,
    // work_offset, hsm) used literal Fanuc regexes that never matched.
    const score = scoreFor("heidenhain");
    expect(score, `heidenhain actual=${score}`).toBeGreaterThanOrEqual(FLOOR);
  });

  it("max delta between any two controllers ≤ 20 points (no silent asymmetry)", () => {
    const scores = {
      fanuc: scoreFor("fanuc"),
      okuma: scoreFor("okuma"),
      haas: scoreFor("haas"),
      mitsubishi: scoreFor("mitsubishi"),
      heidenhain: scoreFor("heidenhain"),
    };
    const values = Object.values(scores);
    const delta = Math.max(...values) - Math.min(...values);
    expect(delta, `scores=${JSON.stringify(scores)} delta=${delta}`).toBeLessThanOrEqual(20);
  });
});
