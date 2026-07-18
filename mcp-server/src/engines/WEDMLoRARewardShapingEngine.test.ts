import { describe, it, expect, beforeEach } from "vitest";
import {
  wedmLoRARewardShapingEngine,
  type WedmRewardConfig,
} from "./WEDMLoRARewardShapingEngine.js";

/**
 * Test coverage for U-WCTP-A2b-REWARD — WEDMLoRARewardShapingEngine.
 *
 * Asserts WEDM-specific reward shaping: physics bounds match the
 * Klocke/Kunieda/Toenshoff WEDM envelope (not the lathe spindle-RPM/SFM
 * envelope), dialect patterns recognize Sodick/Mitsubishi/Agie tokens
 * (not lathe G50 clamping), safety keywords are WEDM (AWT/wire-break-detect/
 * anti-electrolysis, not coolant/chuck), and domain terms are wire-EDM
 * (taper/UV/recast/HAZ, not roughing/threading/grooving).
 */
describe("WEDMLoRARewardShapingEngine", () => {
  beforeEach(() => {
    // Reset to default config — singleton engine carries state across tests
    wedmLoRARewardShapingEngine.setConfig({
      syntax_weight: 0.2,
      physics_weight: 0.3,
      safety_weight: 0.25,
      reasoning_weight: 0.15,
      domain_weight: 0.1,
      penalty_severity: "moderate",
    });
  });

  // ----- config -----------------------------------------------------------

  it("setConfig merges and getConfig returns a defensive copy", () => {
    wedmLoRARewardShapingEngine.setConfig({ syntax_weight: 0.5 });
    const a = wedmLoRARewardShapingEngine.getConfig();
    a.syntax_weight = 999;
    const b = wedmLoRARewardShapingEngine.getConfig();
    expect(b.syntax_weight).toBe(0.5);
  });

  // ----- calculateReward shape -------------------------------------------

  it("returns 5 components in the expected order", () => {
    const r = wedmLoRARewardShapingEngine.calculateReward("a wire-edm rough pass with skim cycle");
    const names = r.components.map((c) => c.name);
    expect(names).toEqual(["syntax", "physics", "safety", "reasoning", "domain"]);
  });

  it("total_reward is clamped to [-1, 1]", () => {
    // Empty input — all components score low, hits multiple penalties
    const empty = wedmLoRARewardShapingEngine.calculateReward("");
    expect(empty.total_reward).toBeGreaterThanOrEqual(-1);
    expect(empty.total_reward).toBeLessThanOrEqual(1);

    // Rich input — all components score high
    const rich = wedmLoRARewardShapingEngine.calculateReward(
      "Step 1: M80 wire-on, T84 threading mode, E2500 energy table. Set wire diameter 0.25 mm, " +
      "wire tension 12 N, flushing pressure 8 bar, T_ON 6 us, T_OFF 25 us. Because the workpiece " +
      "thickness is 12.7 mm, schedule 4 passes (1 rough + 3 skim) targeting Ra 0.8 um. " +
      "Verify AWT recovery enabled, anti-electrolysis on, dielectric level OK, wire-break-detect armed. " +
      "Therefore the taper is 5 deg with UV offset, MRR 45 mm3/min."
    );
    expect(rich.total_reward).toBeGreaterThanOrEqual(-1);
    expect(rich.total_reward).toBeLessThanOrEqual(1);
    expect(rich.total_reward).toBeGreaterThan(empty.total_reward);
  });

  it("physics_accuracy and safety_score are surfaced separately for telemetry", () => {
    const r = wedmLoRARewardShapingEngine.calculateReward(
      "wire diameter 0.25 mm, wire tension 12 N, flushing 8 bar, AWT enabled, dielectric flush"
    );
    expect(r.physics_accuracy).toBeGreaterThan(0);
    expect(r.physics_accuracy).toBeLessThanOrEqual(1);
    expect(r.safety_score).toBeGreaterThan(0);
    expect(r.safety_score).toBeLessThanOrEqual(1);
  });

  // ----- syntax check (WEDM dialect, not lathe G-code) -------------------

  it("syntax credits Sodick LN M/T/E codes", () => {
    const r = wedmLoRARewardShapingEngine.calculateReward("M80 T84 E2500 wire on threading mode energy table");
    const syntax = r.components.find((c) => c.name === "syntax")!;
    expect(syntax.score).toBeGreaterThan(0.7);
    expect(syntax.details).toMatch(/M-codes/);
    expect(syntax.details).toMatch(/T-codes/);
    expect(syntax.details).toMatch(/E-codes/);
  });

  it("syntax credits XYUV coordinates (UV is wire-EDM taper offset, not lathe)", () => {
    const r = wedmLoRARewardShapingEngine.calculateReward("G01 X10.5 Y20.0 U0.5 V0.3");
    const syntax = r.components.find((c) => c.name === "syntax")!;
    expect(syntax.details).toMatch(/coordinates/i);
    expect(syntax.score).toBeGreaterThan(0.5);
  });

  it("syntax scores low on plain prose (no dialect tokens)", () => {
    const r = wedmLoRARewardShapingEngine.calculateReward("just a description of the part with no codes");
    const syntax = r.components.find((c) => c.name === "syntax")!;
    expect(syntax.score).toBeLessThanOrEqual(0.5);
  });

  // ----- physics check (WEDM envelope) -----------------------------------

  it("physics credits in-range WEDM parameters", () => {
    const r = wedmLoRARewardShapingEngine.calculateReward(
      "wire diameter 0.25 mm, wire tension 12 N, flushing pressure 8 bar, " +
      "T_ON 6 us, T_OFF 25 us, MRR 45, Ra 0.8, thickness 12.7 mm, taper 5 deg"
    );
    const physics = r.components.find((c) => c.name === "physics")!;
    expect(physics.score).toBeGreaterThan(0.8);
    expect(physics.details).toMatch(/in WEDM envelope|in range/);
  });

  it("physics penalizes out-of-range WEDM parameters", () => {
    // wire diameter 1.5 mm (>0.36 max), wire tension 500 N, MRR 5000 — all blown
    const r = wedmLoRARewardShapingEngine.calculateReward(
      "wire diameter 1.5 mm, wire tension 500 N, MRR 5000"
    );
    const physics = r.components.find((c) => c.name === "physics")!;
    expect(physics.score).toBeLessThan(0.5);
    expect(physics.details).toMatch(/Out of range/);
  });

  it("physics returns neutral 0.5 when no parameters are detected", () => {
    const r = wedmLoRARewardShapingEngine.calculateReward("just a high-level plan with no numbers");
    const physics = r.components.find((c) => c.name === "physics")!;
    expect(physics.score).toBe(0.5);
    expect(physics.details).toMatch(/No physics parameters/);
  });

  it("physics envelope is WEDM-specific (rejects lathe spindle RPM as physics value but is permissive — RPM keyword unknown)", () => {
    // Lathe would call out "spindle 3000 RPM" — WEDM doesn't recognize that
    // parameter, so it's neutral, NOT credited as in-range. This guards
    // against accidental lathe-pattern carryover.
    const r = wedmLoRARewardShapingEngine.calculateReward("spindle 3000 RPM, feed 0.05 IPR");
    const physics = r.components.find((c) => c.name === "physics")!;
    // No WEDM physics keywords detected → 0.5 neutral, not credited
    expect(physics.score).toBe(0.5);
  });

  // ----- safety check (WEDM keywords) ------------------------------------

  it("safety credits AWT / wire-break-detect / anti-electrolysis", () => {
    const r = wedmLoRARewardShapingEngine.calculateReward(
      "AWT enabled, wire-break-detect armed, anti-electrolysis on, dielectric flushing OK"
    );
    const safety = r.components.find((c) => c.name === "safety")!;
    expect(safety.score).toBeGreaterThanOrEqual(1);
  });

  it("safety reports zero when no WEDM safety keywords present", () => {
    const r = wedmLoRARewardShapingEngine.calculateReward("just cutting parameters with no safety mention");
    const safety = r.components.find((c) => c.name === "safety")!;
    expect(safety.score).toBe(0);
    expect(safety.details).toMatch(/No WEDM safety/);
  });

  // ----- reasoning check -------------------------------------------------

  it("reasoning credits step markers + causal connectives + structured bullets", () => {
    const r = wedmLoRARewardShapingEngine.calculateReward(
      "Step 1: select wire diameter.\nStep 2: set tension.\n" +
      "- Because the thickness is large, multi-pass is required\n" +
      "- Therefore use 1 rough + 3 skim passes\n" +
      "The rationale is to balance Ra and MRR. " +
      "This adds enough length to clear the substantive-length bonus threshold which requires more than two hundred characters in the output text body."
    );
    const reasoning = r.components.find((c) => c.name === "reasoning")!;
    expect(reasoning.score).toBeGreaterThanOrEqual(0.9);
  });

  it("reasoning scores low on terse one-liners", () => {
    const r = wedmLoRARewardShapingEngine.calculateReward("M80");
    const reasoning = r.components.find((c) => c.name === "reasoning")!;
    expect(reasoning.score).toBeLessThan(0.5);
  });

  // ----- domain alignment (WEDM terms) -----------------------------------

  it("domain credits WEDM terms (taper / UV / skim / recast / HAZ)", () => {
    const r = wedmLoRARewardShapingEngine.calculateReward(
      "Schedule 1 roughing pass + 3 skim passes. Apply 5 deg taper with UV offset. " +
      "Minimize recast layer and HAZ. EDM dielectric flush at 8 bar."
    );
    const domain = r.components.find((c) => c.name === "domain")!;
    expect(domain.score).toBeGreaterThanOrEqual(1);
  });

  it("domain scores low on off-topic content", () => {
    const r = wedmLoRARewardShapingEngine.calculateReward("the weather is nice today and I like ice cream");
    const domain = r.components.find((c) => c.name === "domain")!;
    expect(domain.score).toBeLessThanOrEqual(0.2);
  });

  // ----- penalty severity scaling ----------------------------------------

  it("penalty_severity=strict drops total_reward further than lenient", () => {
    const poor = "x"; // hits every penalty
    wedmLoRARewardShapingEngine.setConfig({ penalty_severity: "lenient" });
    const lenient = wedmLoRARewardShapingEngine.calculateReward(poor).total_reward;
    wedmLoRARewardShapingEngine.setConfig({ penalty_severity: "strict" });
    const strict = wedmLoRARewardShapingEngine.calculateReward(poor).total_reward;
    expect(strict).toBeLessThanOrEqual(lenient);
  });

  // ----- penalty / bonus reason surfacing --------------------------------

  it("penalty_reasons surface WEDM-specific labels", () => {
    const r = wedmLoRARewardShapingEngine.calculateReward("");
    expect(r.penalty_reasons.join(" ")).toMatch(/WEDM/);
  });

  it("bonus_reasons surface when components score >0.9", () => {
    const r = wedmLoRARewardShapingEngine.calculateReward(
      "Step 1: M80 T84 E2500. " +
      "Set wire diameter 0.25 mm, wire tension 12 N, flushing pressure 8 bar, T_ON 6 us, T_OFF 25 us. " +
      "Apply 5 deg taper with UV offset. Therefore use 1 rough + 3 skim passes targeting Ra 0.8 um. " +
      "AWT enabled, wire-break-detect armed, anti-electrolysis on, dielectric flush at 8 bar. " +
      "Minimize recast and HAZ. The rationale is to balance Ra and MRR across the WEDM operation. " +
      "This output is intentionally long enough to clear the substantive-length reasoning bonus threshold of two hundred characters."
    );
    expect(r.bonus_reasons.length).toBeGreaterThan(0);
  });

  // ----- API parity with lathe -------------------------------------------

  it("WedmRewardConfig type carries the same 6 fields as the lathe config", () => {
    const cfg: WedmRewardConfig = wedmLoRARewardShapingEngine.getConfig();
    expect(cfg).toHaveProperty("syntax_weight");
    expect(cfg).toHaveProperty("physics_weight");
    expect(cfg).toHaveProperty("safety_weight");
    expect(cfg).toHaveProperty("reasoning_weight");
    expect(cfg).toHaveProperty("domain_weight");
    expect(cfg).toHaveProperty("penalty_severity");
  });
});
