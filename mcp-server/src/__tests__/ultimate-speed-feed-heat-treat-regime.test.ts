/**
 * UltimateSpeedFeedEngine heat_treat_regime wiring -- SFC-WIRING-MS0 gap #2.
 *
 * Wires the heat-treat regime physics into the live SFC Vc path via option C
 * (physics-reviewer): when NO measured hardness is supplied, a heat_treat_regime derives a
 * SINGLE Vc-derate hardness from regimeExpectedHardnessHb() (HB of the regime's MAX expected
 * HRC -- conservative/harder), which feeds the EXISTING hardnessSpeedFactor derate + the
 * effectiveIso H-switch. Measured hardness (hardness_hb / hardness_hrc) ALWAYS takes
 * precedence -> the regime is ignored when hardness is measured -> NO double-count of the
 * hardness Vc derate. Soft HRB-only regimes (annealed/normalized) -> null -> material-typical
 * fallback (no fabricated derate). Verified at the engine AND round-tripped THROUGH the calc
 * dispatcher (R15: .passthrough() carries the field + the engine consumes it).
 *
 * Baseline material "steel" has hardness_hb_typical 180 HB (ISO P) -> deterministic baseline.
 */
import { describe, it, expect } from "vitest";
import { ultimateSpeedFeedEngine } from "../engines/UltimateSpeedFeedEngine.js";
import { registerCalcDispatcher } from "../tools/dispatchers/calcDispatcher.js";

const BASE = { material: "steel", tool_diameter_mm: 10, flutes: 4, operation: "milling" };
const vc = (inp: Record<string, unknown>): number =>
  ultimateSpeedFeedEngine.calculate({ ...BASE, ...inp } as never).cutting_speed.value;

describe("UltimateSpeedFeed heat_treat_regime wiring (SFC-WIRING-MS0 gap #2)", () => {
  it("quenched_tempered regime derates Vc below the no-regime baseline", () => {
    expect(vc({ heat_treat_regime: "quenched_tempered" })).toBeLessThan(vc({}));
  }, 30000);

  it("harder regime -> lower Vc (through_hardened <= quenched_tempered)", () => {
    expect(vc({ heat_treat_regime: "through_hardened" }))
      .toBeLessThanOrEqual(vc({ heat_treat_regime: "quenched_tempered" }));
  }, 30000);

  it("soft regime (annealed) -> material-typical fallback -> Vc == baseline (no fabricated derate)", () => {
    expect(vc({ heat_treat_regime: "annealed" })).toBeCloseTo(vc({}), 4);
  }, 30000);

  it("NO double-count: measured hardness_hrc + regime == measured-hardness-only (regime ignored)", () => {
    expect(vc({ hardness_hrc: 40, heat_treat_regime: "through_hardened" }))
      .toBeCloseTo(vc({ hardness_hrc: 40 }), 4);
  }, 30000);

  it("NO double-count: measured hardness_hb + regime == measured-hardness-only", () => {
    expect(vc({ hardness_hb: 350, heat_treat_regime: "nitrided" }))
      .toBeCloseTo(vc({ hardness_hb: 350 }), 4);
  }, 30000);

  it("unknown/invalid regime (via passthrough) -> safe material-typical fallback (== baseline)", () => {
    // regimeExpectedHardnessHb returns null for an off-table regime -> no fabricated derate (R12-safe).
    expect(vc({ heat_treat_regime: "bogus" })).toBeCloseTo(vc({}), 4);
  }, 30000);

  it("surfaces the regime-derived hardness in the calc trace (transparency, R12)", () => {
    const r = ultimateSpeedFeedEngine.calculate({ ...BASE, heat_treat_regime: "quenched_tempered" } as never);
    expect(JSON.stringify(r)).toContain("heat_treat_regime=quenched_tempered");
  }, 30000);

  // R15: round-trip THROUGH the calc dispatcher -- proves .passthrough() carries the field
  // end to end and the engine consumes it (not just the singleton).
  it("round-trips through prism_calc ultimate_speed_feed (regime derates Vc via dispatcher)", async () => {
    interface CapturedTool {
      name: string;
      handler: (a: { action: string; params: Record<string, unknown> }) => Promise<unknown>;
    }
    const tools: CapturedTool[] = [];
    const server = {
      tool(name: string, _d: string, _s: unknown, h: CapturedTool["handler"]) {
        tools.push({ name, handler: h });
      },
    };
    registerCalcDispatcher(server as never);
    const calc = tools[0];
    const call = async (params: Record<string, unknown>) => {
      const out = (await calc.handler({ action: "ultimate_speed_feed", params })) as {
        content?: Array<{ text: string }>;
      };
      const text = out?.content?.[0]?.text;
      return (text ? JSON.parse(text) : out) as Record<string, never>;
    };
    const baseR = await call({ ...BASE });
    const hardR = await call({ ...BASE, heat_treat_regime: "through_hardened" });
    const pick = (o: Record<string, never>): number | undefined =>
      (o?.["cutting_speed"] as { value?: number })?.value ??
      ((o?.["data"] as Record<string, never>)?.["cutting_speed"] as { value?: number })?.value;
    const baseVc = pick(baseR);
    const hardVc = pick(hardR);
    expect(typeof baseVc).toBe("number");
    expect(typeof hardVc).toBe("number");
    expect(hardVc as number).toBeLessThan(baseVc as number);
  }, 60000);
});
