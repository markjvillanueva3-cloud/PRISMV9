/**
 * v11-prove-out-policy.test.mjs — concrete-value tests for explicit
 * prove-out mode policy. Every assertion is exact-value equality.
 *
 * @milestone POST-BRIDGE-SYNERGY-MS0/U-V11-PROVE-OUT-FLAG-EXPLICIT
 * @slot echo · @iter 25 · @date 2026-05-26
 */
import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  PROVE_OUT_MODES,
  DEFAULT_PROVE_OUT_MODE,
  resolveProveOutMode,
  getProveOutMultipliers,
  applyProveOut,
  renderProveOutBanner,
  shouldBlockEmitMissingMode,
} from "./v11-prove-out-policy.mjs";

describe("constants: PROVE_OUT_MODES shape", () => {
  it("has 4 mode keys", () => {
    assert.equal(Object.keys(PROVE_OUT_MODES).length, 4);
  });
  it("off mode speedMult = 1.00", () => {
    assert.equal(PROVE_OUT_MODES.off.speedMult, 1.0);
  });
  it("off mode feedMult = 1.00", () => {
    assert.equal(PROVE_OUT_MODES.off.feedMult, 1.0);
  });
  it("off mode label = PRODUCTION", () => {
    assert.equal(PROVE_OUT_MODES.off.label, "PRODUCTION");
  });
  it("conservative speedMult = 0.50", () => {
    assert.equal(PROVE_OUT_MODES.conservative.speedMult, 0.5);
  });
  it("conservative feedMult = 0.30", () => {
    assert.equal(PROVE_OUT_MODES.conservative.feedMult, 0.3);
  });
  it("standard speedMult = 0.80", () => {
    assert.equal(PROVE_OUT_MODES.standard.speedMult, 0.8);
  });
  it("standard feedMult = 0.50", () => {
    assert.equal(PROVE_OUT_MODES.standard.feedMult, 0.5);
  });
  it("production_ready speedMult = 1.00", () => {
    assert.equal(PROVE_OUT_MODES.production_ready.speedMult, 1.0);
  });
  it("production_ready label = PRODUCTION (PROVEN OUT)", () => {
    assert.equal(PROVE_OUT_MODES.production_ready.label, "PRODUCTION (PROVEN OUT)");
  });
});

describe("constants: DEFAULT_PROVE_OUT_MODE", () => {
  it("defaults to 'off' (production, no prove-out)", () => {
    assert.equal(DEFAULT_PROVE_OUT_MODE, "off");
  });
});

describe("resolveProveOutMode", () => {
  it("null → default 'off'", () => {
    assert.equal(resolveProveOutMode(null), "off");
  });
  it("undefined → default 'off'", () => {
    assert.equal(resolveProveOutMode(undefined), "off");
  });
  it("'standard' → 'standard'", () => {
    assert.equal(resolveProveOutMode("standard"), "standard");
  });
  it("'STANDARD' (uppercase) → 'standard'", () => {
    assert.equal(resolveProveOutMode("STANDARD"), "standard");
  });
  it("'production-ready' (dash) → 'production_ready'", () => {
    assert.equal(resolveProveOutMode("production-ready"), "production_ready");
  });
  it("'production ready' (space) → 'production_ready'", () => {
    assert.equal(resolveProveOutMode("production ready"), "production_ready");
  });
  it("unknown value 'bogus' → default 'off'", () => {
    assert.equal(resolveProveOutMode("bogus"), "off");
  });
  it("'conservative' → 'conservative'", () => {
    assert.equal(resolveProveOutMode("conservative"), "conservative");
  });
});

describe("getProveOutMultipliers", () => {
  it("'standard' → speedMult=0.8", () => {
    assert.equal(getProveOutMultipliers("standard").speedMult, 0.8);
  });
  it("'standard' → feedMult=0.5", () => {
    assert.equal(getProveOutMultipliers("standard").feedMult, 0.5);
  });
  it("'standard' → mode='standard'", () => {
    assert.equal(getProveOutMultipliers("standard").mode, "standard");
  });
  it("'standard' → label='PROVE-OUT STANDARD'", () => {
    assert.equal(getProveOutMultipliers("standard").label, "PROVE-OUT STANDARD");
  });
  it("null → mode='off'", () => {
    assert.equal(getProveOutMultipliers(null).mode, "off");
  });
  it("null → speedMult=1.0", () => {
    assert.equal(getProveOutMultipliers(null).speedMult, 1.0);
  });
});

describe("applyProveOut: speed/feed math", () => {
  it("standard mode: 1000 RPM → 800 RPM", () => {
    assert.equal(applyProveOut(1000, 100, "standard").speed, 800);
  });
  it("standard mode: 100 mm/min → 50 mm/min", () => {
    assert.equal(applyProveOut(1000, 100, "standard").feed, 50);
  });
  it("conservative mode: 1000 RPM → 500 RPM", () => {
    assert.equal(applyProveOut(1000, 100, "conservative").speed, 500);
  });
  it("conservative mode: 100 mm/min → 30 mm/min", () => {
    assert.equal(applyProveOut(1000, 100, "conservative").feed, 30);
  });
  it("off mode: speed unchanged", () => {
    assert.equal(applyProveOut(1234, 567, "off").speed, 1234);
  });
  it("off mode: feed unchanged", () => {
    assert.equal(applyProveOut(1234, 567, "off").feed, 567);
  });
  it("off mode: applied=false", () => {
    assert.equal(applyProveOut(1000, 100, "off").applied, false);
  });
  it("standard mode: applied=true", () => {
    assert.equal(applyProveOut(1000, 100, "standard").applied, true);
  });
  it("production_ready: applied=false (no multipliers)", () => {
    assert.equal(applyProveOut(1000, 100, "production_ready").applied, false);
  });
  it("invalid baseSpeed (NaN) → speed=NaN", () => {
    assert.equal(Number.isNaN(applyProveOut(NaN, 100, "standard").speed), true);
  });
  it("invalid baseFeed (string) → applied=false", () => {
    assert.equal(applyProveOut(1000, "abc", "standard").applied, false);
  });
});

describe("renderProveOutBanner", () => {
  it("'off' renders PRISM SPEED/FEED MODE header", () => {
    assert.equal(renderProveOutBanner("off").includes("PRISM SPEED/FEED MODE"), true);
  });
  it("'off' includes 'PRODUCTION' label", () => {
    assert.equal(renderProveOutBanner("off").includes("PRODUCTION"), true);
  });
  it("'off' includes opt-in instruction for prove-out", () => {
    assert.equal(renderProveOutBanner("off").includes("prismProveOutMode = standard"), true);
  });
  it("'standard' renders PROVE-OUT MODE ACTIVE header", () => {
    assert.equal(renderProveOutBanner("standard").includes("PROVE-OUT MODE ACTIVE"), true);
  });
  it("'standard' includes Speed 80%", () => {
    assert.equal(renderProveOutBanner("standard").includes("Speed 80%"), true);
  });
  it("'standard' includes Feed 50%", () => {
    assert.equal(renderProveOutBanner("standard").includes("Feed 50%"), true);
  });
  it("'standard' includes DISABLE AFTER FIRST GOOD PART instruction", () => {
    assert.equal(renderProveOutBanner("standard").includes("DISABLE AFTER FIRST GOOD PART"), true);
  });
  it("'conservative' includes Speed 50%", () => {
    assert.equal(renderProveOutBanner("conservative").includes("Speed 50%"), true);
  });
  it("'conservative' includes Feed 30%", () => {
    assert.equal(renderProveOutBanner("conservative").includes("Feed 30%"), true);
  });
  it("'production_ready' renders no PROVE-OUT MODE ACTIVE (multipliers=1)", () => {
    assert.equal(renderProveOutBanner("production_ready").includes("PROVE-OUT MODE ACTIVE"), false);
  });
  it("'production_ready' includes 'PRODUCTION (PROVEN OUT)' label", () => {
    assert.equal(renderProveOutBanner("production_ready").includes("PRODUCTION (PROVEN OUT)"), true);
  });
});

describe("shouldBlockEmitMissingMode: hard-block gate", () => {
  it("null mode + production tier → block=true", () => {
    assert.equal(shouldBlockEmitMissingMode(null, "production").block, true);
  });
  it("null mode + production tier → reason includes PRISM_PROVE_OUT_MODE_REQUIRED", () => {
    assert.equal(
      shouldBlockEmitMissingMode(null, "production").reason.includes("PRISM_PROVE_OUT_MODE_REQUIRED"),
      true
    );
  });
  it("explicit 'off' mode + production tier → block=false", () => {
    assert.equal(shouldBlockEmitMissingMode("off", "production").block, false);
  });
  it("explicit 'standard' + production tier → block=false", () => {
    assert.equal(shouldBlockEmitMissingMode("standard", "production").block, false);
  });
  it("null mode + prototype tier → block=false (non-prod doesn't require)", () => {
    assert.equal(shouldBlockEmitMissingMode(null, "prototype").block, false);
  });
  it("null mode + null tier → block=false", () => {
    assert.equal(shouldBlockEmitMissingMode(null, null).block, false);
  });
  it("null mode + 'PRODUCTION' (case-insensitive) → block=true", () => {
    assert.equal(shouldBlockEmitMissingMode(null, "PRODUCTION").block, true);
  });
});
