import { describe, it, expect } from "vitest";
import { toolholderDynamicsEngine } from "../engines/ToolholderDynamicsEngine.js";
import type { ToolholderInput } from "../engines/ToolholderDynamicsEngine.js";
import { registerCalcDispatcher } from "../tools/dispatchers/calcDispatcher.js";
import { CANONICAL_TOOL_MODULUS } from "../physics/constants.js";

/**
 * SPINDLE-INTERFACE (taper) build-quality stiffness hardening — ToolholderDynamicsEngine.
 *
 * WHY (wave-v4 machine-bucket DEPTH-ONLY): the spindle-toolholder interface's build quality
 * is modeled ONLY as a scalar TAPER_STIFFNESS factor per taper class
 * (BT30 0.5 · CAT40 0.75 · BT40 0.8 · CAT50 0.95 · BT50 1.0 · HSK-A63 1.2 · HSK-A100 1.5,
 * ToolholderDynamicsEngine.ts:91-95) that scales the holder-base stiffness inside the
 * series-spring combined static stiffness. The engine's only prior coverage
 * (l2-pass2-specialty-engines.test.ts:189, machine-tooling-engines.test.ts:96) is
 * shallow `toBeGreaterThan(0)` — it does NOT pin the taper ORDERING or any reference
 * value, so a silent regression of a taper factor (e.g. HSK-A100 dropped below CAT40, or
 * BT30 nudged above BT50) would pass unnoticed and a downstream chatter/stability call
 * would trust a wrong interface stiffness. This suite PINS the ordering + hand-derived
 * reference values through the physics AND round-trips them through prism_calc.
 *
 * ── PHYSICS (all reference values below are hand-derived from the engine model, not echoed) ──
 * Combined static stiffness is two springs in series — the cantilevered tool beam and the
 * holder+spindle base:
 *     toolStiff_N_per_um = 3·E·I / L^3 / 1e6            (Euler-Bernoulli cantilever k = 3EI/L^3)
 *         I = π·d^4/64,  d = tool_diameter_mm/1000,  L = tool_stickout_mm/1000,  E = TOOL_E·1e9
 *     holderBase_N_per_um = 50 · holderStiff · taperStiff · (holder_diameter_mm/40)^2
 *     static_stiffness    = 1 / (1/toolStiff + 1/holderBase)          (rounded to 2 decimals)
 *
 * REF_BASE config used for the taper sweep: holder=shrink_fit (holderStiff 1.8),
 * holder_diameter_mm 40 → (40/40)^2 = 1.0, tool=carbide 12 mm dia, 60 mm stickout.
 * Engine inlines TOOL_E.carbide = 620 GPa (see the modulus-divergence test below).
 *     I           = π·(0.012)^4/64          = 1.0178760e-9 m^4
 *     toolStiff   = 3·620e9·I / 0.06^3 /1e6 = 8.7650435 N/µm         (1/toolStiff = 0.11408909)
 *     holderBase  = 50·1.8·taperStiff·1     = 90 · taperStiff N/µm
 * → static_stiffness per taper class (combined series spring, 2-dec rounded):
 *     BT30   (0.5 ): holderBase 45   → 1/(0.11408909+1/45)   = 7.34
 *     CAT40  (0.75): holderBase 67.5 → 1/(0.11408909+1/67.5) = 7.76
 *     BT40   (0.8 ): holderBase 72   → 1/(0.11408909+1/72)   = 7.81
 *     CAT50  (0.95): holderBase 85.5 → 1/(0.11408909+1/85.5) = 7.95
 *     BT50   (1.0 ): holderBase 90   → 1/(0.11408909+1/90)   = 7.99
 *     HSK-A63(1.2 ): holderBase 108  → 1/(0.11408909+1/108)  = 8.11
 *     HSK-A100(1.5): holderBase 135  → 1/(0.11408909+1/135)  = 8.23
 *
 * The taper factor is compressed by the tool-beam series term (a 3× factor swing 0.5→1.5
 * moves combined only 7.34→8.23, ~+12%) — that compression is itself physics we pin, so a
 * "fix" that removes the series coupling and lets combined ≈ holderBase would fail loudly.
 */

const REF_BASE = {
  holder_type: "shrink_fit" as const,
  gauge_length_mm: 90,
  holder_diameter_mm: 40,
  tool_diameter_mm: 12,
  tool_stickout_mm: 60,
  tool_material: "carbide" as const,
};

function frf(overrides: Partial<ToolholderInput>): ReturnType<typeof toolholderDynamicsEngine.analyzeFRF> {
  return toolholderDynamicsEngine.analyzeFRF({ ...REF_BASE, ...overrides } as ToolholderInput);
}

// Hand-derived reference static stiffness (N/µm) per taper class, REF_BASE config.
const TAPER_REF: Record<string, number> = {
  BT30: 7.34,
  CAT40: 7.76,
  BT40: 7.81,
  CAT50: 7.95,
  BT50: 7.99,
  "HSK-A63": 8.11,
  "HSK-A100": 8.23,
};

// ── dispatcher round-trip harness (mirrors calcDispatcher.rcsa-wire.test.ts) ──
interface CapturedTool { name: string; handler: (args: any) => Promise<any>; }
function calcTool(): CapturedTool {
  const tools: CapturedTool[] = [];
  const server = { tool(name: string, _d: string, _s: any, handler: any) { tools.push({ name, handler }); } };
  registerCalcDispatcher(server);
  return tools[0];
}
async function call(tool: CapturedTool, action: string, params: Record<string, any> = {}): Promise<any> {
  const r = await tool.handler({ action, params });
  const text = r?.content?.[0]?.text;
  return text ? JSON.parse(text) : r;
}
/** Unwrap the toolholder FRF result whether returned flat or nested by response middleware. */
function stiffOf(r: any): number {
  return r?.static_stiffness_N_per_um ?? r?.data?.static_stiffness_N_per_um ?? r?.result?.static_stiffness_N_per_um;
}

describe("spindle-taper build-quality stiffness hardening (ToolholderDynamicsEngine, U-oscar-SpindleTaperStiffness-TEST)", () => {
  // ── HAPPY: taper ordering ────────────────────────────────────────────────
  it("HAPPY core ordering: static stiffness HSK-A100 > CAT40 > BT30 (stiffer spindle interface ⇒ stiffer assembly)", () => {
    const hsk = frf({ taper: "HSK-A100" }).static_stiffness_N_per_um;
    const cat = frf({ taper: "CAT40" }).static_stiffness_N_per_um;
    const bt30 = frf({ taper: "BT30" }).static_stiffness_N_per_um;
    expect(hsk).toBeGreaterThan(cat);
    expect(cat).toBeGreaterThan(bt30);
  });

  it("HAPPY reference values: BT30=7.34, CAT40=7.76, HSK-A100=8.23 N/µm (hand-derived, series spring)", () => {
    expect(frf({ taper: "BT30" }).static_stiffness_N_per_um).toBeCloseTo(7.34, 2);
    expect(frf({ taper: "CAT40" }).static_stiffness_N_per_um).toBeCloseTo(7.76, 2);
    expect(frf({ taper: "HSK-A100" }).static_stiffness_N_per_um).toBeCloseTo(8.23, 2);
  });

  it("HAPPY full 7-class monotonic sweep + every reference value pinned", () => {
    const order = ["BT30", "CAT40", "BT40", "CAT50", "BT50", "HSK-A63", "HSK-A100"];
    const vals = order.map((t) => frf({ taper: t as ToolholderInput["taper"] }).static_stiffness_N_per_um);
    // each reference value pinned to 2 decimals
    order.forEach((t, i) => expect(vals[i]).toBeCloseTo(TAPER_REF[t], 2));
    // strictly increasing with the taper factor (0.5<0.75<0.8<0.95<1.0<1.2<1.5)
    for (let i = 1; i < vals.length; i++) expect(vals[i]).toBeGreaterThan(vals[i - 1]);
  });

  // ── HAPPY: holder build-quality (task: shrink_fit >= collet) ──────────────
  it("HAPPY shrink_fit >= collet (holder build quality): 7.81 vs 7.19 N/µm at BT40", () => {
    const shrink = frf({ holder_type: "shrink_fit", taper: "BT40" }).static_stiffness_N_per_um;
    const collet = frf({ holder_type: "collet_ER", taper: "BT40" }).static_stiffness_N_per_um;
    expect(shrink).toBeGreaterThanOrEqual(collet);
    expect(shrink).toBeCloseTo(7.81, 2);
    expect(collet).toBeCloseTo(7.19, 2);
  });

  // ── ADVERSARIAL: tool modulus diverges from the canonical source ──────────
  it("ADVERSARIAL modulus divergence: engine's inlined carbide E (620 GPa) ≠ CANONICAL_TOOL_MODULUS (600 GPa)", () => {
    // Canonical source of truth, imported (never inlined) per constants discipline.
    expect(CANONICAL_TOOL_MODULUS.carbide).toBe(600000); // MPa = 600 GPa
    // Isolate the tool beam: a 400 mm "holder" ⇒ holderBase = 50·1.8·1.0·(400/40)^2 = 9000 N/µm,
    // so combined ≈ toolStiff. With the engine's inlined 620 GPa ⇒ 8.76 N/µm; the canonical
    // 600 GPa would give ≈ 8.47 N/µm. The engine tracks 620, NOT the canonical 600.
    const stiffCarbide = frf({ holder_diameter_mm: 400, taper: "BT50" }).static_stiffness_N_per_um;
    expect(stiffCarbide).toBeCloseTo(8.76, 1);           // engine's inlined 620 GPa
    expect(Math.abs(stiffCarbide - 8.47)).toBeGreaterThan(0.15); // NOT the canonical 600 GPa
    // BUG (reported, engine source NOT modified — safety-gated): ToolholderDynamicsEngine.ts:99
    // inlines TOOL_E.carbide = 620 (GPa) which diverges from CANONICAL_TOOL_MODULUS.carbide = 600 GPa
    // (constants.ts:834). A shared-constants fix should route the engine through CANONICAL_TOOL_MODULUS;
    // this test pins the CURRENT (620 GPa) behavior so that fix is a deliberate, visible change.
  });

  // ── FAILURE / unknown-enum: unknown taper falls back to 0.8 default ───────
  it("FAILURE unknown taper enum → falls back to the || 0.8 default factor (== BT40 result)", () => {
    // TAPER_STIFFNESS[input.taper] || 0.8 (engine:112) → an unknown taper is silently treated as 0.8.
    const unknown = frf({ taper: "HSK-A125" as unknown as ToolholderInput["taper"] }).static_stiffness_N_per_um;
    const bt40 = frf({ taper: "BT40" }).static_stiffness_N_per_um; // taperStiff 0.8
    expect(unknown).toBeCloseTo(bt40, 5);
    expect(unknown).toBeCloseTo(7.81, 2);
  });

  // ── FAILURE / unknown-enum: unknown holder falls back to 1.0 default ──────
  it("FAILURE unknown holder_type → falls back to the || 1.0 default (== collet_ER result)", () => {
    // HOLDER_STIFFNESS[input.holder_type] || 1.0 (engine:110) → unknown holder ≡ collet_ER (1.0).
    const unknown = frf({ holder_type: "magnetic_grip" as unknown as ToolholderInput["holder_type"], taper: "BT50" }).static_stiffness_N_per_um;
    const collet = frf({ holder_type: "collet_ER", taper: "BT50" }).static_stiffness_N_per_um;
    expect(unknown).toBeCloseTo(collet, 5);
  });

  // ── ADVERSARIAL zero: zero stickout collapses the tool beam to ∞ ──────────
  it("ADVERSARIAL zero stickout: combined stiffness collapses to holderBase (90 N/µm) and fn → non-finite", () => {
    // L=0 ⇒ toolStiff = 3EI/0 = +∞ ⇒ 1/toolStiff = 0 ⇒ combined = holderBase (50·1.8·1.0·1 = 90).
    const r = frf({ taper: "BT50", tool_stickout_mm: 0 });
    expect(r.static_stiffness_N_per_um).toBeCloseTo(90, 2);
    // natural frequency divides by L^2 = 0 → engine has no guard, emits a non-finite fn.
    expect(Number.isFinite(r.natural_freq_Hz)).toBe(false);
    // BUG (reported, not fixed): the engine performs no positive-stickout guard; L=0 yields a
    // non-physical +∞ tool beam. A hardened engine should reject non-positive stickout.
  });

  // ── ADVERSARIAL negative: no input guard → non-physical negative stiffness ─
  it("ADVERSARIAL negative stickout: engine returns a NON-PHYSICAL negative stiffness (no guard)", () => {
    // L<0 ⇒ L^3<0 ⇒ toolStiff<0 ⇒ combined = 1/(-0.11408909 + 1/90) = -9.71 N/µm.
    const r = frf({ taper: "BT50", tool_stickout_mm: -60 });
    expect(r.static_stiffness_N_per_um).toBeLessThan(0);
    expect(r.static_stiffness_N_per_um).toBeCloseTo(-9.71, 1);
    // BUG (reported, not fixed): stiffness must be strictly positive; a negative value silently
    // poisons any downstream chatter/deflection consumer. Pinned so the missing guard is visible.
  });

  // ── ADVERSARIAL NaN: NaN input propagates to a NaN result ─────────────────
  it("ADVERSARIAL NaN stickout → NaN static stiffness (no NaN guard)", () => {
    const r = frf({ taper: "BT50", tool_stickout_mm: NaN });
    expect(Number.isNaN(r.static_stiffness_N_per_um)).toBe(true);
  });

  // ── ROUND-TRIP through prism_calc (toolholder_frf / toolholder_compare) ───
  describe("round-trip through prism_calc dispatcher", () => {
    const calc = calcTool();
    // dispatcher-legal params (schema: gauge/tool_diameter/tool_stickout required & positive;
    // holder_diameter_mm + tool_material flow through .passthrough()).
    const rtBase = (taper: string, holder_type = "shrink_fit") => ({
      holder_type, taper,
      gauge_length_mm: 90, holder_diameter_mm: 40,
      tool_diameter_mm: 12, tool_stickout_mm: 60, tool_material: "carbide",
    });

    it("toolholder_frf routes and pins the taper ordering HSK-A100 > CAT40 > BT30", async () => {
      const hsk = await call(calc, "toolholder_frf", rtBase("HSK-A100"));
      const cat = await call(calc, "toolholder_frf", rtBase("CAT40"));
      const bt30 = await call(calc, "toolholder_frf", rtBase("BT30"));
      expect(JSON.stringify(hsk)).not.toMatch(/Unknown calculation action|Invalid params/);
      expect(stiffOf(hsk)).toBeGreaterThan(stiffOf(cat));
      expect(stiffOf(cat)).toBeGreaterThan(stiffOf(bt30));
    });

    it("toolholder_frf reference values survive the dispatcher path unchanged (BT30=7.34, HSK-A100=8.23)", async () => {
      const bt30 = await call(calc, "toolholder_frf", rtBase("BT30"));
      const hsk = await call(calc, "toolholder_frf", rtBase("HSK-A100"));
      expect(stiffOf(bt30)).toBeCloseTo(7.34, 2);
      expect(stiffOf(hsk)).toBeCloseTo(8.23, 2);
      // dispatcher is a faithful passthrough of the engine math
      expect(stiffOf(bt30)).toBeCloseTo(frf({ taper: "BT30" }).static_stiffness_N_per_um, 5);
    });

    it("toolholder_frf holder build-quality strict ordering: shrink_fit > press_fit > hydraulic > milling_chuck > collet", async () => {
      const results = await Promise.all(
        ["shrink_fit", "press_fit", "hydraulic", "milling_chuck", "collet"].map((h) =>
          call(calc, "toolholder_frf", rtBase("BT50", h)),
        ),
      );
      const vals = results.map(stiffOf);
      for (let i = 1; i < vals.length; i++) expect(vals[i - 1]).toBeGreaterThan(vals[i]);
      expect(vals[0]).toBeCloseTo(7.99, 2); // shrink_fit @ BT50
    });

    it("toolholder_compare picks the stiffer HSK-A100 interface over BT30 (same tool/holder)", async () => {
      const r = await call(calc, "toolholder_compare", {
        holder_a: rtBase("HSK-A100"),
        holder_b: rtBase("BT30"),
      });
      expect(JSON.stringify(r)).not.toMatch(/Unknown calculation action|Invalid params/);
      const cmp = r?.recommended ? r : (r?.data ?? r?.result ?? r);
      expect(cmp.recommended).toBe("A");
      expect(cmp.holder_a.stiffness_N_per_um).toBeGreaterThan(cmp.holder_b.stiffness_N_per_um);
    });

    it("FAILURE dispatcher schema REJECTS non-positive stickout (guard the engine lacks)", async () => {
      const r = await call(calc, "toolholder_frf", { ...rtBase("BT50"), tool_stickout_mm: -60 });
      expect(JSON.stringify(r)).toMatch(/Invalid params/i);
      expect(stiffOf(r)).toBeUndefined();
    });

    it("FAILURE dispatcher schema REJECTS an unknown taper enum", async () => {
      const r = await call(calc, "toolholder_frf", { ...rtBase("HSK-A125") });
      expect(JSON.stringify(r)).toMatch(/Invalid params/i);
      expect(stiffOf(r)).toBeUndefined();
    });
  });
});
