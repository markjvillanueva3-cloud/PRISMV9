/**
 * Kienzle Fc-vs-feed FORCE-ratio proof — round-tripped through prism_calc
 * =======================================================================
 *
 * SFC-HARDEN / U-oscar-FcVsFeedRatio-TEST (slot:oscar)
 *
 * Closes the ONE hardening gap the wave-v4 forces audit flagged: the (1-mc)
 * Kienzle exponent was verified via kc multi-point (kc = kc1.1·h^(-mc)) and the
 * specific-energy two-feed ratio, but NO test asserted the ratio directly on the
 * MAIN CUTTING FORCE Fc as a function of FEED, round-tripped through the dispatcher.
 *
 * Physics (Kienzle 1952; Altintas, Manufacturing Automation 2012, Ch. 2):
 *   kc(h) = kc1.1 · h^(-mc)                        [specific cutting force]
 *   Fc    = kc_corrected · b · h                   [main cutting force]
 * For turning at approach angle κ_r = 90° (default): sin κ_r = 1, so
 *   h = f · sin κ_r = f          and     b = ap / sin κ_r = ap
 *   ⇒ Fc(f) = kc1.1 · h^(-mc) · b · h = kc1.1 · ap · f^(1-mc)
 * Therefore, at FIXED material (kc1.1, mc) and ap, with all correction factors
 * held identical (they cancel), the force ratio between two feeds is:
 *   Fc(f2) / Fc(f1) = (f2 / f1)^(1-mc)             [EXPONENT PROOF on FORCE]
 *
 * mc hand-derived from CANONICAL_KIENZLE (src/physics/constants.ts):
 *   ISO P (steel):    kc1.1 = 1800,  mc = 0.25  ⇒ 1-mc = 0.75
 *   ISO N (aluminum): kc1.1 =  700,  mc = 0.22  ⇒ 1-mc = 0.78
 *
 * Correction-factor neutrality (so the pure power law holds at a single point):
 *   rake_angle_deg = 6 (reference γ₀)  ⇒ rake_factor  = 1
 *   flank_wear_mm  = 0                 ⇒ wear_factor  = 1
 *   cutting_speed_mpm = 200 (outside BUE band [20,60] m/min) ⇒ speed_factor = 1
 *
 * All computations round-trip THROUGH prism_calc (action "kienzle_force" →
 * KienzleForceModelEngine.calculateSpecificCuttingForce), not the singleton,
 * per R15 (test through the dispatcher).
 *
 * @milestone SFC-HARDEN
 * @unit U-oscar-FcVsFeedRatio-TEST
 */

import { describe, it, expect, beforeEach } from "vitest";
import { registerCalcDispatcher } from "../tools/dispatchers/calcDispatcher.js";
import { CANONICAL_KIENZLE, kienzleForce } from "../physics/constants.js";

// ── Dispatcher round-trip harness (mirrors calcDispatcher.uwire10.test.ts) ──────

interface CapturedTool {
  name: string;
  description: string;
  schema: unknown;
  handler: (args: { action: string; params?: Record<string, unknown> }) => Promise<unknown>;
}

class MockMCPServer {
  tools: CapturedTool[] = [];
  tool(name: string, description: string, schema: unknown, handler: CapturedTool["handler"]) {
    this.tools.push({ name, description, schema, handler });
  }
}

async function call(
  server: MockMCPServer,
  action: string,
  params: Record<string, unknown> = {},
): Promise<{ ok: boolean; data: Record<string, unknown> }> {
  const tool = server.tools[0]!;
  const raw = (await tool.handler({ action, params })) as
    | { content: { type: string; text: string }[] }
    | { success: false; error: string };
  if (raw && typeof raw === "object" && "success" in raw && (raw as { success: boolean }).success === false) {
    return { ok: false, data: raw as unknown as Record<string, unknown> };
  }
  const envelope = raw as { content: { type: string; text: string }[] };
  const text = envelope.content[0]!.text;
  let parsed: Record<string, unknown>;
  try {
    parsed = JSON.parse(text);
  } catch {
    return { ok: false, data: { rawText: text } };
  }
  if (parsed && typeof parsed === "object" && "error" in parsed) {
    return { ok: false, data: parsed };
  }
  return { ok: true, data: parsed };
}

let server: MockMCPServer;

beforeEach(() => {
  server = new MockMCPServer();
  registerCalcDispatcher(server);
});

// Canonical coefficients (single source of truth — never inlined)
const P = CANONICAL_KIENZLE.P; // { kc1_1: 1800, mc: 0.25 }
const N = CANONICAL_KIENZLE.N; // { kc1_1:  700, mc: 0.22 }

/**
 * Round-trip a single Kienzle force calc through prism_calc and return Fc [N].
 * Holds every correction factor at unity so Fc = kc1.1·ap·f^(1-mc) exactly.
 */
async function fcThroughDispatcher(
  kc1_1: number,
  mc: number,
  feed_mm: number,
  ap_mm: number,
): Promise<{ ok: boolean; Fc: unknown; data: Record<string, unknown> }> {
  const r = await call(server, "kienzle_force", {
    kc1_1,
    mc,
    feed_mm,
    depth_of_cut_mm: ap_mm,
    approach_angle_deg: 90,   // sin κ = 1  ⇒ h = f, b = ap
    rake_angle_deg: 6,        // reference γ₀ ⇒ rake_factor = 1
    flank_wear_mm: 0,         // sharp tool  ⇒ wear_factor = 1
    cutting_speed_mpm: 200,   // outside BUE [20,60] ⇒ speed_factor = 1
  });
  return { ok: r.ok, Fc: r.data.main_cutting_force_Fc, data: r.data };
}

// ══════════════════════════════════════════════════════════════════════════════
// (1-mc) EXPONENT PROOF ON FORCE:  Fc(f2)/Fc(f1) === (f2/f1)^(1-mc)
// ══════════════════════════════════════════════════════════════════════════════

describe("Kienzle Fc-vs-feed ratio — (1-mc) exponent through prism_calc", () => {
  it("ISO P (steel, mc=0.25 ⇒ 1-mc=0.75): Fc(0.2)/Fc(0.1) === 2^0.75", async () => {
    const ap = 2.0;
    const f1 = 0.1, f2 = 0.2;
    const a = await fcThroughDispatcher(P.kc1_1, P.mc, f1, ap);
    const b = await fcThroughDispatcher(P.kc1_1, P.mc, f2, ap);
    expect(a.ok).toBe(true);
    expect(b.ok).toBe(true);

    const ratio = (b.Fc as number) / (a.Fc as number);
    const expectedRatio = Math.pow(f2 / f1, 1 - P.mc); // 2^0.75 ≈ 1.681792830...
    expect(ratio).toBeCloseTo(expectedRatio, 6);
    // Guard against a hardcoded/linear engine: the exponent is strictly < 1,
    // so the force ratio must be BELOW the naive feed ratio (2.0).
    expect(ratio).toBeLessThan(f2 / f1);
    expect(ratio).toBeGreaterThan(1);
  });

  it("ISO P: a second, wider feed span (0.08→0.32, 4×) still obeys (f2/f1)^0.75", async () => {
    const ap = 3.0;
    const f1 = 0.08, f2 = 0.32;
    const a = await fcThroughDispatcher(P.kc1_1, P.mc, f1, ap);
    const b = await fcThroughDispatcher(P.kc1_1, P.mc, f2, ap);
    const ratio = (b.Fc as number) / (a.Fc as number);
    expect(ratio).toBeCloseTo(Math.pow(f2 / f1, 1 - P.mc), 6); // 4^0.75 ≈ 2.828427...
  });

  it("ISO N (aluminum, mc=0.22 ⇒ 1-mc=0.78): Fc(0.30)/Fc(0.15) === 2^0.78", async () => {
    const ap = 2.5;
    const f1 = 0.15, f2 = 0.30;
    const a = await fcThroughDispatcher(N.kc1_1, N.mc, f1, ap);
    const b = await fcThroughDispatcher(N.kc1_1, N.mc, f2, ap);
    expect(a.ok).toBe(true);
    expect(b.ok).toBe(true);

    const ratio = (b.Fc as number) / (a.Fc as number);
    const expectedRatio = Math.pow(f2 / f1, 1 - N.mc); // 2^0.78 ≈ 1.716528...
    expect(ratio).toBeCloseTo(expectedRatio, 6);
    // N and P differ ONLY in mc; the ratio must reflect the DIFFERENT exponent.
    expect(expectedRatio).not.toBeCloseTo(Math.pow(f2 / f1, 1 - P.mc), 3);
  });

  it("force ratio is INVARIANT to ap (ap cancels in Fc(f2)/Fc(f1))", async () => {
    // Fc = kc1.1·ap·f^(1-mc): ap is a common factor, so the feed ratio must be
    // identical at two different depths of cut. A ratio that drifts with ap would
    // expose an engine that folds ap into the wrong term.
    const f1 = 0.12, f2 = 0.24;
    const expectedRatio = Math.pow(f2 / f1, 1 - P.mc);

    const shallowLo = await fcThroughDispatcher(P.kc1_1, P.mc, f1, 1.0);
    const shallowHi = await fcThroughDispatcher(P.kc1_1, P.mc, f2, 1.0);
    const deepLo = await fcThroughDispatcher(P.kc1_1, P.mc, f1, 6.0);
    const deepHi = await fcThroughDispatcher(P.kc1_1, P.mc, f2, 6.0);

    const ratioShallow = (shallowHi.Fc as number) / (shallowLo.Fc as number);
    const ratioDeep = (deepHi.Fc as number) / (deepLo.Fc as number);
    expect(ratioShallow).toBeCloseTo(expectedRatio, 6);
    expect(ratioDeep).toBeCloseTo(expectedRatio, 6);
    expect(ratioShallow).toBeCloseTo(ratioDeep, 6);
  });
});

// ══════════════════════════════════════════════════════════════════════════════
// MONOTONICITY:  Fc strictly increases with feed (0 < 1-mc, so f^(1-mc) is ↑)
// ══════════════════════════════════════════════════════════════════════════════

describe("Kienzle Fc monotonic in feed — through prism_calc", () => {
  it("ISO P: Fc strictly increases across feeds 0.05→0.35", async () => {
    const ap = 2.0;
    const feeds = [0.05, 0.10, 0.15, 0.20, 0.30, 0.35];
    const forces: number[] = [];
    for (const f of feeds) {
      const r = await fcThroughDispatcher(P.kc1_1, P.mc, f, ap);
      expect(r.ok).toBe(true);
      expect(Number.isFinite(r.Fc as number)).toBe(true);
      forces.push(r.Fc as number);
    }
    for (let i = 1; i < forces.length; i++) {
      expect(forces[i]!).toBeGreaterThan(forces[i - 1]!);
    }
  });

  it("ISO N: Fc strictly increases across feeds 0.05→0.35", async () => {
    const ap = 2.5;
    const feeds = [0.05, 0.10, 0.15, 0.20, 0.30, 0.35];
    const forces: number[] = [];
    for (const f of feeds) {
      const r = await fcThroughDispatcher(N.kc1_1, N.mc, f, ap);
      forces.push(r.Fc as number);
    }
    for (let i = 1; i < forces.length; i++) {
      expect(forces[i]!).toBeGreaterThan(forces[i - 1]!);
    }
  });
});

// ══════════════════════════════════════════════════════════════════════════════
// EXACT SINGLE-POINT:  Fc = kc1.1 · b · h^(1-mc)  (κ=90 ⇒ b=ap, h=f)
// Cross-checked against the canonical kienzleForce() helper from constants.ts.
// ══════════════════════════════════════════════════════════════════════════════

describe("Kienzle Fc exact single-point value — through prism_calc", () => {
  it("ISO P: engine Fc equals kc1.1·ap·f^(1-mc) AND canonical kienzleForce()", async () => {
    const ap = 2.0, f = 0.2;
    const r = await fcThroughDispatcher(P.kc1_1, P.mc, f, ap);
    expect(r.ok).toBe(true);

    // Fc = kc1.1 · b · h^(1-mc), with b = ap/sin(90°) = ap and h = f·sin(90°) = f
    const expected = P.kc1_1 * ap * Math.pow(f, 1 - P.mc); // ≈ 1076.32 N
    expect(r.Fc as number).toBeCloseTo(expected, 4);
    // Independent tie to the canonical formula helper (kc1_1·ap·fz^(1-mc)).
    expect(r.Fc as number).toBeCloseTo(kienzleForce(P.kc1_1, P.mc, ap, f), 4);
  });

  it("ISO N: engine Fc equals kc1.1·ap·f^(1-mc) AND canonical kienzleForce()", async () => {
    const ap = 2.5, f = 0.25;
    const r = await fcThroughDispatcher(N.kc1_1, N.mc, f, ap);
    expect(r.ok).toBe(true);

    const expected = N.kc1_1 * ap * Math.pow(f, 1 - N.mc);
    expect(r.Fc as number).toBeCloseTo(expected, 4);
    expect(r.Fc as number).toBeCloseTo(kienzleForce(N.kc1_1, N.mc, ap, f), 4);
  });
});

// ══════════════════════════════════════════════════════════════════════════════
// ADVERSARIAL: degenerate / invalid feed inputs
// ══════════════════════════════════════════════════════════════════════════════

describe("Kienzle Fc adversarial feed inputs — through prism_calc", () => {
  it("feed = 0 → explicit guard returns Fc = 0 (not NaN, not a spurious force)", async () => {
    const r = await call(server, "kienzle_force", {
      kc1_1: P.kc1_1, mc: P.mc, feed_mm: 0, depth_of_cut_mm: 2.0,
    });
    expect(r.ok).toBe(true);
    expect(r.data.main_cutting_force_Fc).toBe(0);
    // The engine's _zeroResult guard emits a fail-loud warning.
    expect(Array.isArray(r.data.warnings)).toBe(true);
    expect(r.data.warnings as string[]).toContain("Feed must be > 0");
  });

  it("feed < 0 (−0.1) → same explicit guard, Fc = 0 (no negative/garbage force)", async () => {
    const r = await call(server, "kienzle_force", {
      kc1_1: P.kc1_1, mc: P.mc, feed_mm: -0.1, depth_of_cut_mm: 2.0,
    });
    expect(r.ok).toBe(true);
    expect(r.data.main_cutting_force_Fc).toBe(0);
    expect(r.data.warnings as string[]).toContain("Feed must be > 0");
  });

  it("feed = NaN → non-finite Fc (garbage-in surfaces as non-finite, never a plausible force)", async () => {
    // PIN (reported, source unchanged per scope): NaN feed is NOT caught by the
    // `feed_mm <= 0` guard (NaN <= 0 is false), so it propagates through the power
    // law to a NaN Fc. Serialized across the MCP JSON envelope, NaN becomes null.
    // Either way the result is non-finite — detectable garbage, not a valid force.
    const r = await call(server, "kienzle_force", {
      kc1_1: P.kc1_1, mc: P.mc, feed_mm: NaN, depth_of_cut_mm: 2.0,
    });
    expect(r.ok).toBe(true);
    expect(Number.isFinite(r.data.main_cutting_force_Fc as number)).toBe(false);
    // Explicitly NOT a positive finite force (the dangerous failure mode).
    expect((r.data.main_cutting_force_Fc as number) > 0).toBe(false);
  });
});
