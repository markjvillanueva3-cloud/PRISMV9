/**
 * DYN-GFORCE-HARDEN / U-oscar-VibrationGForce-TEST
 * ------------------------------------------------------------------------
 * DEPTH-ONLY hardening for the dynamics bucket: vibration ACCELERATION in g-units.
 *
 * WHY THIS FILE EXISTS (verified coverage gap):
 *   - VibrationAnalysisEngine.sdofForcedResponse (VibrationAnalysisEngine.ts:145)
 *     returns DISPLACEMENT amplitude + magnificationFactor + transmissibility, but
 *     NEVER an acceleration output (see the ForcedResponseResult interface at
 *     VibrationAnalysisEngine.ts:35 — no acceleration_g / acceleration_ms2 field).
 *   - MachineVibrationEngine (MachineVibrationEngine.ts:89) grades ISO-10816
 *     VELOCITY zones (mm/s RMS) — again no acceleration in g.
 *   - The only pre-existing forced-response cases (batch9-engines.test.ts:71-97)
 *     assert magnificationFactor / frequencyRatio / powerDissipated — acceleration
 *     in g is NEVER a computed+asserted output anywhere in *.test.ts.
 *
 * So EXPLICIT vibration acceleration in g is un-tested. Because the engine does not
 * expose it, this test DERIVES it from the engine's displacement amplitude:
 *
 *     steady-state harmonic response:  x(t) = X · sin(ω t − φ)
 *     acceleration amplitude:          a = ω² · X            [m/s²]      (ẍ = −ω² x)
 *     in g:                            a_g = a / g₀           g = 9.80665 m/s²
 *
 * Note ω here is the EXCITATION angular frequency (rad/s) that the engine takes as
 * `excitation.frequency` (VibrationAnalysisEngine.ts:150, `omega`). Since ω = 2πf,
 * a = ω²·X is identical to the task's a = (2πf)²·X form (asserted explicitly below).
 *
 * DEPTH GAP REPORTED (do NOT fix engine source — safety-gated):
 *   1. sdofForcedResponse has no acceleration_g field. It could add one
 *      (a_g = frequency² · amplitude / 9.80665) so downstream consumers don't
 *      re-derive it. Pinned by the "engine surface" describe block below.
 *   2. amplitude is rounded to 1e-4 (r4, VibrationAnalysisEngine.ts:163/315). For
 *      small-displacement / high-frequency responses the displacement UNDERFLOWS to
 *      0, so any g-force derived from the engine output reads 0 even when the true
 *      acceleration is >1000 g (pinned in the adversarial block). A native
 *      acceleration_g field computed from the UNROUNDED amplitude would avoid this.
 *
 * Reference SDOF (canonical unit-test system — large displacements chosen so the
 * engine's 1e-4 amplitude rounding is exact/negligible, NOT a machine operating point):
 *     m = 1 kg, k = 1e6 N/m, c = 100 N·s/m
 *     ω_n = √(k/m) = 1000 rad/s ;  ζ = c/(2√(km)) = 0.05 ;  F0/k = 10000/1e6 = 0.01 m
 */
import { describe, it, expect } from "vitest";
import { vibrationAnalysisEngine } from "../engines/VibrationAnalysisEngine.js";
import { registerCalcDispatcher } from "../tools/dispatchers/calcDispatcher.js";

// ── Standard gravity ──────────────────────────────────────────────────────────
// ISO 80000-3 / CGPM 1901 conventional standard acceleration of free fall.
// constants.ts has CANONICAL_KIENZLE (used for cutting physics) but NO gravity
// constant — SECONDARY GAP: constants.ts could export STANDARD_GRAVITY_MS2 = 9.80665.
// This is an EXACT defined constant (like Math.PI), not a tunable physics parameter.
const STANDARD_GRAVITY_MS2 = 9.80665;

// Reference system
const M = 1;         // kg
const K = 1e6;       // N/m  → ω_n = 1000 rad/s
const C = 100;       // N·s/m → ζ = 0.05
const F0 = 10000;    // N    → static deflection F0/k = 0.01 m
const OMEGA_N = Math.sqrt(K / M); // 1000 rad/s
const sys = { mass: M, stiffness: K, damping: C };

/** Derive acceleration amplitude in g from displacement amplitude X and excitation ω. */
function accelG(omega: number, displacementAmplitude: number): number {
  return (omega * omega * displacementAmplitude) / STANDARD_GRAVITY_MS2;
}

/** Closed-form SDOF steady-state displacement amplitude X = (F0/k) / √((1−r²)²+(2ζr)²). */
function closedFormX(omega: number): number {
  const zeta = C / (2 * Math.sqrt(K * M));
  const r = omega / OMEGA_N;
  const denom = Math.sqrt((1 - r * r) ** 2 + (2 * zeta * r) ** 2);
  return (F0 / K) / denom;
}

// ── Dispatcher round-trip harness (mirrors calcDispatcher.thermal-wear-coupling-wire.test.ts) ──
interface CapturedTool { name: string; handler: (args: any) => Promise<any>; }
function calcTool(): CapturedTool {
  const tools: CapturedTool[] = [];
  const server = { tool(name: string, _d: string, _s: any, handler: any) { tools.push({ name, handler }); } };
  registerCalcDispatcher(server as any);
  return tools[0];
}
async function call(tool: CapturedTool, action: string, params: Record<string, any> = {}): Promise<any> {
  const r = await tool.handler({ action, params });
  const text = r?.content?.[0]?.text;
  return text ? JSON.parse(text) : r;
}

describe("DYN-GFORCE-HARDEN — vibration acceleration in g (VibrationAnalysisEngine.sdofForcedResponse)", () => {

  // ── DEPTH GAP PIN: engine surface exposes displacement, NOT acceleration ──────
  describe("engine surface (DEPTH gap pin)", () => {
    it("returns displacement amplitude + magnificationFactor but NO acceleration field", () => {
      const r = vibrationAnalysisEngine.sdofForcedResponse(sys, { amplitude: F0, frequency: OMEGA_N });
      // Positive: the displacement + MF the derivation needs ARE present.
      expect(typeof r.amplitude).toBe("number");
      expect(typeof r.magnificationFactor).toBe("number");
      // GAP: no acceleration output of any name — g-force must be derived downstream.
      expect("acceleration_g" in r).toBe(false);
      expect("acceleration_ms2" in r).toBe(false);
      expect("acceleration" in r).toBe(false);
    });

    it("a = (2πf)²·X is identical to a = ω²·X (engine `frequency` param IS ω in rad/s)", () => {
      const omega = OMEGA_N;               // engine takes angular frequency (rad/s)
      const f_Hz = omega / (2 * Math.PI);  // equivalent ordinary frequency
      // The two forms must be algebraically identical for the same physical excitation.
      expect((2 * Math.PI * f_Hz) ** 2).toBeCloseTo(omega ** 2, 6);
    });
  });

  // ── REFERENCE g-VALUES: resonance vs off-resonance (hand-derived) ─────────────
  describe("reference g-force: resonance vs off-resonance", () => {
    it("RESONANCE (r=1): X=0.1 m, MF=10, a_g ≈ 10197.16 g", () => {
      const r = vibrationAnalysisEngine.sdofForcedResponse(sys, { amplitude: F0, frequency: OMEGA_N });
      // X = (F0/k)/(2ζ) = 0.01/0.1 = 0.1 m ; MF = 1/(2ζ) = 10.
      expect(r.amplitude).toBeCloseTo(0.1, 4);
      expect(r.magnificationFactor).toBeCloseTo(10, 4);
      expect(r.isResonant).toBe(true);
      // a = ω²·X = 1000²·0.1 = 1e5 m/s² ; a_g = 1e5/9.80665 = 10197.16 g.
      const aG = accelG(OMEGA_N, r.amplitude);
      expect(aG).toBeCloseTo(10197.16, 1);
    });

    it("OFF-RESONANCE LOW (r=0.1, quasi-static): X≈0.0101 m, MF≈1.01, a_g ≈ 10.30 g", () => {
      const omega = 100; // r = 0.1
      const r = vibrationAnalysisEngine.sdofForcedResponse(sys, { amplitude: F0, frequency: omega });
      expect(r.amplitude).toBeCloseTo(closedFormX(omega), 4); // ≈0.0101 m
      expect(r.magnificationFactor).toBeCloseTo(1.01, 2);     // barely amplified
      expect(r.isResonant).toBe(false);
      // a = 100²·0.0101 = 101 m/s² ; a_g = 101/9.80665 = 10.30 g.
      const aG = accelG(omega, r.amplitude);
      expect(aG).toBeCloseTo(10.30, 1);
    });

    it("OFF-RESONANCE HIGH (r=2, mass-controlled): X≈0.0033 m, MF<1, a_g ≈ 1346 g", () => {
      const omega = 2000; // r = 2
      const r = vibrationAnalysisEngine.sdofForcedResponse(sys, { amplitude: F0, frequency: omega });
      expect(r.amplitude).toBeCloseTo(closedFormX(omega), 4); // ≈0.0033 m
      expect(r.magnificationFactor).toBeLessThan(1);          // attenuated above resonance (0.3326)
      expect(r.isResonant).toBe(false);
      // a = 2000²·0.0033 = 13200 m/s² ; a_g = 13200/9.80665 = 1346.0 g.
      const aG = accelG(omega, r.amplitude);
      expect(aG).toBeCloseTo(1346.03, 1);
    });

    it("ORDERING: resonance a_g >> both off-resonance a_g (resonance dominates)", () => {
      const res = vibrationAnalysisEngine.sdofForcedResponse(sys, { amplitude: F0, frequency: OMEGA_N });
      const low = vibrationAnalysisEngine.sdofForcedResponse(sys, { amplitude: F0, frequency: 100 });
      const high = vibrationAnalysisEngine.sdofForcedResponse(sys, { amplitude: F0, frequency: 2000 });
      const gRes = accelG(OMEGA_N, res.amplitude);
      const gLow = accelG(100, low.amplitude);
      const gHigh = accelG(2000, high.amplitude);
      expect(gRes).toBeGreaterThan(gHigh);
      expect(gHigh).toBeGreaterThan(gLow);
      // Resonance is ~1000× the quasi-static acceleration for ζ=0.05.
      expect(gRes / gLow).toBeGreaterThan(900);
    });

    it("MAGNIFICATION > 1 strictly at resonance, ≈1 quasi-static, <1 far above", () => {
      const res = vibrationAnalysisEngine.sdofForcedResponse(sys, { amplitude: F0, frequency: OMEGA_N });
      const low = vibrationAnalysisEngine.sdofForcedResponse(sys, { amplitude: F0, frequency: 50 });   // r=0.05
      const high = vibrationAnalysisEngine.sdofForcedResponse(sys, { amplitude: F0, frequency: 3000 }); // r=3
      expect(res.magnificationFactor).toBeGreaterThan(1);
      expect(low.magnificationFactor).toBeCloseTo(1, 1);
      expect(high.magnificationFactor).toBeLessThan(1);
    });
  });

  // ── FAILURE MODES (>=3) ───────────────────────────────────────────────────────
  describe("failure modes", () => {
    it("DC excitation (ω=0): finite static displacement but ZERO acceleration", () => {
      const r = vibrationAnalysisEngine.sdofForcedResponse(sys, { amplitude: F0, frequency: 0 });
      // r=0 → denom=1 → X = F0/k = 0.01 m (static), MF=1.
      expect(r.amplitude).toBeCloseTo(0.01, 4);
      expect(r.magnificationFactor).toBeCloseTo(1, 4);
      // a = 0²·X = 0 → a_g = 0 exactly, despite a nonzero displacement.
      expect(accelG(0, r.amplitude)).toBe(0);
    });

    it("UNDAMPED resonance (ζ=0, r=1): amplitude + a_g diverge to Infinity (singularity pin)", () => {
      const r = vibrationAnalysisEngine.sdofForcedResponse(
        { mass: M, stiffness: K, damping: 0 }, { amplitude: F0, frequency: OMEGA_N },
      );
      // denom = √((1−1)²+0) = 0 → X = (F0/k)/0 = Infinity. The engine does NOT guard this.
      expect(r.amplitude).toBe(Infinity);
      expect(r.magnificationFactor).toBe(Infinity);
      const aG = accelG(OMEGA_N, r.amplitude);
      expect(Number.isFinite(aG)).toBe(false);
      expect(aG).toBe(Infinity);
    });

    it("NEGATIVE stiffness (k<0): ω_n=√(neg)=NaN propagates to NaN amplitude + NaN a_g", () => {
      const r = vibrationAnalysisEngine.sdofForcedResponse(
        { mass: M, stiffness: -K, damping: C }, { amplitude: F0, frequency: OMEGA_N },
      );
      // GAP (robustness): the engine performs no input validation on stiffness sign,
      // so an unphysical k<0 yields a silent NaN rather than a structured error.
      expect(Number.isNaN(r.amplitude)).toBe(true);
      expect(Number.isNaN(accelG(OMEGA_N, r.amplitude))).toBe(true);
    });
  });

  // ── ADVERSARIAL (>=2) ─────────────────────────────────────────────────────────
  describe("adversarial inputs", () => {
    it("NaN mass: NaN propagates end-to-end (no throw, no silent 0)", () => {
      const r = vibrationAnalysisEngine.sdofForcedResponse(
        { mass: Number.NaN, stiffness: K, damping: C }, { amplitude: F0, frequency: OMEGA_N },
      );
      expect(Number.isNaN(r.amplitude)).toBe(true);
      expect(Number.isNaN(accelG(OMEGA_N, r.amplitude))).toBe(true);
    });

    it("NEGATIVE frequency (ω=−ω_n): |a_g| symmetric with resonance, yet isResonant=false", () => {
      const r = vibrationAnalysisEngine.sdofForcedResponse(sys, { amplitude: F0, frequency: -OMEGA_N });
      // (2ζr)² is even in r → denom identical to r=+1 → X = 0.1 m, MF = 10.
      expect(r.amplitude).toBeCloseTo(0.1, 4);
      expect(r.magnificationFactor).toBeCloseTo(10, 4);
      // a = ω²·X is even in ω → identical g-force magnitude as the +resonance case.
      expect(accelG(-OMEGA_N, r.amplitude)).toBeCloseTo(10197.16, 1);
      // BUG (latent, PIN — do NOT fix): isResonant uses |r−1|<0.1, which only catches
      // r≈+1, so a magnitude-resonant negative frequency is mislabeled non-resonant.
      // VibrationAnalysisEngine.ts:169. Harmless for physical (ω>0) inputs; pinned here.
      expect(r.isResonant).toBe(false);
    });

    it("r4 UNDERFLOW (r=20): engine amplitude rounds to 0 → derived a_g=0 while TRUE a_g≈1022 g", () => {
      const omega = 20000; // r = 20
      const r = vibrationAnalysisEngine.sdofForcedResponse(sys, { amplitude: F0, frequency: omega });
      // True X ≈ 2.506e-5 m, but r4 (round to 1e-4, VibrationAnalysisEngine.ts:163) → 0.
      const xTrue = closedFormX(omega);
      expect(xTrue).toBeGreaterThan(2e-5);
      expect(r.amplitude).toBe(0);
      // GAP CONSEQUENCE: any g-force derived from the engine's rounded amplitude reads 0…
      expect(accelG(omega, r.amplitude)).toBe(0);
      // …while the PHYSICALLY TRUE acceleration is ~1022 g — a >1000 g silent loss.
      // This is the strongest argument for a native acceleration_g field computed from
      // the UNROUNDED amplitude inside the engine.
      const aGTrue = accelG(omega, xTrue);
      expect(aGTrue).toBeGreaterThan(1000);
      expect(aGTrue).toBeCloseTo(1022.26, 1);
    });
  });

  // ── DISPATCHER ROUND-TRIP (prism_calc:vibration_forced_response, calcDispatcher.ts:2150) ──
  describe("round-trip through prism_calc:vibration_forced_response", () => {
    const calc = calcTool();

    it("routes to the engine (not the unknown-action throw) and returns displacement amplitude", async () => {
      const r = await call(calc, "vibration_forced_response", {
        mass: M, stiffness: K, damping: C, force_amplitude: F0, frequency: OMEGA_N,
      });
      expect(JSON.stringify(r).slice(0, 4000)).not.toMatch(/Unknown calculation action/);
      expect(typeof r.amplitude).toBe("number");
    });

    it("RESONANCE round-trip: derived a_g ≈ 10197.16 g through the dispatcher", async () => {
      const r = await call(calc, "vibration_forced_response", {
        mass: M, stiffness: K, damping: C, force_amplitude: F0, frequency: OMEGA_N,
      });
      expect(r.amplitude).toBeCloseTo(0.1, 4);
      expect(r.magnificationFactor).toBeCloseTo(10, 4);
      expect(accelG(OMEGA_N, r.amplitude)).toBeCloseTo(10197.16, 1);
    });

    it("OFF-RESONANCE round-trip: derived a_g ≈ 10.30 g (quasi-static)", async () => {
      const r = await call(calc, "vibration_forced_response", {
        mass: M, stiffness: K, damping: C, force_amplitude: F0, frequency: 100,
      });
      expect(r.amplitude).toBeCloseTo(0.0101, 4);
      expect(accelG(100, r.amplitude)).toBeCloseTo(10.30, 1);
    });

    it("DC round-trip: finite displacement, ZERO derived a_g", async () => {
      const r = await call(calc, "vibration_forced_response", {
        mass: M, stiffness: K, damping: C, force_amplitude: F0, frequency: 0,
      });
      expect(r.amplitude).toBeCloseTo(0.01, 4);
      expect(accelG(0, r.amplitude)).toBe(0);
    });

    it("UNDAMPED-resonance round-trip: Infinity amplitude serializes to null (JSON-lossy pin)", async () => {
      // JSON.stringify(Infinity) === "null": a diverging response is silently nulled on
      // the dispatcher boundary — a downstream consumer must guard for null, not just NaN.
      const r = await call(calc, "vibration_forced_response", {
        mass: M, stiffness: K, damping: 0, force_amplitude: F0, frequency: OMEGA_N,
      });
      expect(r.amplitude).toBeNull();
      expect(r.magnificationFactor).toBeNull();
    });
  });
});
