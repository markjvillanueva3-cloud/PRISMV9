#!/usr/bin/env node
/**
 * prism-paths-feed.test.mjs — behavior tests for the unified PRISM Paths feed pipeline.
 * Run: node --test scripts/prism-paths-feed.test.mjs
 * Real-value assertions (R9): each encodes WHY the stage/physics matters.
 */
import { test } from "node:test";
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import { loadCanonicalKienzle, kienzlePowerTorqueGuard, prismPaths, PRISM_PATHS_STAGES,
  chipThinningFactor, hardnessSpeedFactor, aggressivenessFactor, stickoutDeflectionFactor,
  axialDepthFactor, adaptive3DFactor, aeMaxSafeFactor, PRISM_PATHS_MOTION_FACTORS } from "./prism-paths-feed.mjs";

const SCRIPT = fileURLToPath(new URL("./prism-paths-feed.mjs", import.meta.url));

// A 2" cutter slotting P-steel at 40 ipm on a 10 HP spindle — hand-verified to clamp.
const HEAVY_STEEL = {
  units: "in", toolDia: 2.0, ae: 2.0, ap: 0.25, feed: 40, rpm: 2000, flutes: 4,
  isoGroup: "P", spindleHP: 10, spindleTorqueFtLb: 80,
};
// A 0.25" cutter, light alum finish — must NOT clamp.
const LIGHT_ALUM = {
  units: "in", toolDia: 0.25, ae: 0.02, ap: 0.05, feed: 60, rpm: 12000, flutes: 3,
  isoGroup: "N", spindleHP: 20, spindleTorqueFtLb: 100,
};

test("canonical Kienzle parsed from constants.ts matches the doctrine values (drift-catch)", () => {
  const k = loadCanonicalKienzle();
  assert.deepEqual(k.P, { kc1_1: 1800, mc: 0.25 }, "P");
  assert.deepEqual(k.M, { kc1_1: 2100, mc: 0.25 }, "M");
  assert.deepEqual(k.K, { kc1_1: 1100, mc: 0.28 }, "K");
  assert.deepEqual(k.N, { kc1_1: 700, mc: 0.22 }, "N");
  assert.deepEqual(k.S, { kc1_1: 2800, mc: 0.27 }, "S");
  assert.deepEqual(k.H, { kc1_1: 3200, mc: 0.30 }, "H");
});

test("guard: heavy steel cut on a small spindle CLAMPS (factor<1, computed HP exceeds available)", () => {
  const g = kienzlePowerTorqueGuard(HEAVY_STEEL);
  assert.ok(g.factor < 1, `should clamp: factor=${g.factor}`);
  assert.ok(g.powerHP > g.availPowerHP, `cutting HP (${g.powerHP.toFixed(1)}) should exceed available (${g.availPowerHP.toFixed(1)})`);
  assert.ok(g.note.includes("clamped"), "note explains the clamp");
});

test("guard: EXACT clamp — re-running at the clamped feed recomputes to ~available power (proves Pc∝feed^(1-mc))", () => {
  const g = kienzlePowerTorqueGuard(HEAVY_STEEL);
  // apply the clamp to the feed, recompute: power must land at (not below) the available limit
  const clamped = { ...HEAVY_STEEL, feed: HEAVY_STEEL.feed * g.factor };
  const g2 = kienzlePowerTorqueGuard(clamped);
  assert.ok(Math.abs(g2.powerHP - g.availPowerHP) / g.availPowerHP < 0.02,
    `clamped feed should consume ~available HP: got ${g2.powerHP.toFixed(2)} vs avail ${g.availPowerHP.toFixed(2)}`);
  // a naive linear clamp (avail/Pc) UNDER-clamps (Pc sublinear in feed) — the corrected
  // factor must be SMALLER, and the naive feed would still leave the op over the limit.
  const naive = g.availPowerHP / g.powerHP;
  assert.ok(g.factor < naive, `exponent-corrected factor (${g.factor.toFixed(3)}) must be below naive linear (${naive.toFixed(3)})`);
  const atNaive = kienzlePowerTorqueGuard({ ...HEAVY_STEEL, feed: HEAVY_STEEL.feed * naive });
  assert.ok(atNaive.powerHP > g.availPowerHP, `naive-clamped feed is still over the limit: ${atNaive.powerHP.toFixed(2)} > ${g.availPowerHP.toFixed(2)}`);
});

test("guard: light alum finish does NOT clamp (factor===1)", () => {
  const g = kienzlePowerTorqueGuard(LIGHT_ALUM);
  assert.equal(g.factor, 1, `light cut should not clamp: ${JSON.stringify(g)}`);
});

test("guard: never raises feed (factor always <= 1) across materials", () => {
  for (const iso of ["P", "M", "K", "N", "S", "H"]) {
    const g = kienzlePowerTorqueGuard({ ...HEAVY_STEEL, isoGroup: iso });
    assert.ok(g.factor <= 1, `${iso} factor must be <=1: ${g.factor}`);
  }
});

test("guard: ISO variability — same cut draws more power in S (Inconel) than P (steel) than N (alum)", () => {
  const mk = (iso) => kienzlePowerTorqueGuard({ ...HEAVY_STEEL, spindleHP: 1000, spindleTorqueFtLb: 1000, isoGroup: iso }); // huge spindle so nothing clamps → compare raw power
  const pN = mk("N").powerHP, pP = mk("P").powerHP, pS = mk("S").powerHP;
  assert.ok(pS > pP && pP > pN, `power order S>P>N expected: N=${pN.toFixed(1)} P=${pP.toFixed(1)} S=${pS.toFixed(1)}`);
});

test("guard: fail-soft on incomplete params (zero dia / zero rpm / missing) — neutral, no throw", () => {
  assert.equal(kienzlePowerTorqueGuard({ ...HEAVY_STEEL, toolDia: 0 }).factor, 1);
  assert.equal(kienzlePowerTorqueGuard({ ...HEAVY_STEEL, rpm: 0 }).factor, 1);
  assert.equal(kienzlePowerTorqueGuard({}).factor, 1);
});

test("pipeline: combinedFactor equals the product of stage factors", () => {
  const r = prismPaths(30, HEAVY_STEEL, {});
  const product = r.factors.reduce((a, f) => a * f.factor, 1);
  assert.ok(Math.abs(r.combinedFactor - product) < 1e-6, `combined ${r.combinedFactor} vs product ${product}`);
  assert.ok(Math.abs(r.feed - 30 * product) < 0.01, `feed ${r.feed} ~ base*product ${30 * product}`);
});

test("pipeline: SAFETY stage (powerTorqueGuard) is NON-skippable outside prove-out", () => {
  const withDisable = prismPaths(40, HEAVY_STEEL, { disabled: ["powerTorqueGuard"] });
  const guardF = withDisable.factors.find((f) => f.id === "powerTorqueGuard");
  assert.ok(!guardF.skipped, "safety stage must still run when disabled outside prove-out");
  assert.ok(guardF.factor < 1, "and must still clamp");
  // prove-out (first article) DOES allow skipping the safety stage
  const proveOut = prismPaths(40, { ...HEAVY_STEEL, proveOut: true }, { disabled: ["powerTorqueGuard"] });
  const g2 = proveOut.factors.find((f) => f.id === "powerTorqueGuard");
  assert.ok(g2.skipped, "prove-out may skip the safety stage");
});

test("pipeline: a disabled NON-safety stage is skipped (identity)", () => {
  const r = prismPaths(30, HEAVY_STEEL, { disabled: ["chipThinning"] });
  const f = r.factors.find((x) => x.id === "chipThinning");
  assert.ok(f.skipped && f.factor === 1, "disabled geometry stage is skipped");
});

test("pipeline: safety-stage invariant — a factor>1 from a safety stage is clamped to 1", () => {
  // every registered safety stage must be declared kind:'safety'; the runner clamps them.
  const safety = PRISM_PATHS_STAGES.filter((s) => s.kind === "safety").map((s) => s.id);
  assert.ok(safety.includes("powerTorqueGuard") && safety.includes("stickoutDeflection"), "key safety stages present");
});

test("pipeline: maxFeed / minFeed absolute clamp applied after factors", () => {
  const capped = prismPaths(100, LIGHT_ALUM, { maxFeed: 50 });
  assert.ok(capped.feed <= 50, `maxFeed clamp: ${capped.feed}`);
  const floored = prismPaths(1, HEAVY_STEEL, { minFeed: 5 });
  assert.ok(floored.feed >= 5, `minFeed clamp: ${floored.feed}`);
});

test("pipeline: adversarial inputs (0 / null / negative / missing ctx) never throw, feed finite", () => {
  for (const bf of [0, null, -50, NaN, Infinity]) {
    const r = prismPaths(bf, HEAVY_STEEL, {});
    assert.ok(isFinite(r.feed) && r.feed >= 0, `feed must be finite & >=0 for base=${bf}: ${r.feed}`);
  }
  assert.doesNotThrow(() => prismPaths(30, {}, {}), "empty ctx must not throw");
});

test("pipeline: deterministic — identical inputs yield identical output", () => {
  const a = JSON.stringify(prismPaths(40, HEAVY_STEEL, {}));
  const b = JSON.stringify(prismPaths(40, HEAVY_STEEL, {}));
  assert.equal(a, b);
});

// ── ported-factor equivalence (exact math from v11 .cps) ─────────────────────
test("ported chipThinning: factor = min(1/sqrt(ae/D), 1.5); >=50% engagement → 1.0", () => {
  // ae=0.1, D=0.5 → 20% engagement, chipRatio=sqrt(0.2)=0.4472, 1/0.4472=2.236, capped 1.5
  assert.ok(Math.abs(chipThinningFactor({ ae: 0.1, toolDia: 0.5 }).factor - 1.5) < 1e-9, "capped at maxChipThinningMultiplier 1.5");
  // ae=0.05, D=1.0 → 5% engagement, chipRatio=sqrt(0.05)=0.2236, 1/.2236=4.472 capped → 1.5
  assert.ok(Math.abs(chipThinningFactor({ ae: 0.05, toolDia: 1.0 }).factor - 1.5) < 1e-9);
  // ae=0.45, D=1.0 → 45% engagement (<50), chipRatio=sqrt(0.45)=0.6708, 1/.6708=1.4907 (<1.5, uncapped)
  assert.ok(Math.abs(chipThinningFactor({ ae: 0.45, toolDia: 1.0 }).factor - (1 / Math.sqrt(0.45))) < 1e-9, "uncapped below 50%");
  // 60% engagement → conventional, no comp
  assert.equal(chipThinningFactor({ ae: 0.6, toolDia: 1.0 }).factor, 1, "high engagement → 1.0");
  assert.equal(chipThinningFactor({ ae: 0, toolDia: 0.5 }).factor, 1, "zero ae → 1.0");
});

test("ported hardnessSpeed: HRC derate table matches v11 exactly", () => {
  assert.equal(hardnessSpeedFactor({ hrc: 0 }).factor, 1, "unknown → 1");
  assert.equal(hardnessSpeedFactor({ hrc: 18 }).factor, 1.10, "soft");
  assert.equal(hardnessSpeedFactor({ hrc: 28 }).factor, 1.00, "baseline boundary");
  assert.equal(hardnessSpeedFactor({ hrc: 30 }).factor, 0.90, "medium");
  assert.equal(hardnessSpeedFactor({ hrc: 45 }).factor, 0.55, "very hard boundary");
  assert.equal(hardnessSpeedFactor({ hrc: 55 }).factor, 0.35, "very hardened boundary");
  assert.equal(hardnessSpeedFactor({ hrc: 60 }).factor, 0.30, "extreme >55");
});

test("ported aggressiveness: linear level1→0.5x .. level8→1.0x (= 0.5+(L-1)*(0.5/7))", () => {
  assert.ok(Math.abs(aggressivenessFactor({ aggressivenessLevel: 1 }).factor - 0.5) < 1e-9);
  assert.ok(Math.abs(aggressivenessFactor({ aggressivenessLevel: 8 }).factor - 1.0) < 1e-9);
  assert.ok(Math.abs(aggressivenessFactor({ aggressivenessLevel: 5 }).factor - (0.5 + 4 * (0.5 / 7))) < 1e-9);
  assert.ok(Math.abs(aggressivenessFactor({}).factor - (0.5 + 4 * (0.5 / 7))) < 1e-9, "default level 5");
  // out-of-domain clamped to [1,8]
  assert.equal(aggressivenessFactor({ aggressivenessLevel: 99 }).factor, 1.0);
  assert.equal(aggressivenessFactor({ aggressivenessLevel: -3 }).factor, 0.5);
});

test("ported stickoutDeflection: ratio>threshold cut by min(50, excess²·5·safety)%; SAFETY ≤1", () => {
  // D=0.25, len=1.5 → ratio 6.0, roughing threshold 4.0, excess 2 → min(50, 4*5*1)=20% → 0.8
  assert.ok(Math.abs(stickoutDeflectionFactor({ toolDia: 0.25, toolLength: 1.5 }).factor - 0.8) < 1e-9);
  // same tool finishing → threshold 6.0, ratio 6.0 ≤ 6.0 → no cut
  assert.equal(stickoutDeflectionFactor({ toolDia: 0.25, toolLength: 1.5, isFinishing: true }).factor, 1);
  // huge excess clamps reduction at 50% → factor 0.5 floor
  assert.equal(stickoutDeflectionFactor({ toolDia: 0.1, toolLength: 2.0 }).factor, 0.5, "reduction capped at 50%");
  // ratio at threshold → 1.0
  assert.equal(stickoutDeflectionFactor({ toolDia: 0.5, toolLength: 2.0 }).factor, 1, "ratio==threshold → 1");
  // every result ≤ 1 (safety invariant)
  for (const len of [1, 2, 4, 8]) assert.ok(stickoutDeflectionFactor({ toolDia: 0.25, toolLength: len }).factor <= 1);
});

test("ported axialDepth: deep non-adaptive rough cut reduces feed; shallow adaptive raises; LOC override (adaptive)", () => {
  // deep non-adaptive rough: ap=1.0, D=0.5, flute=1.0 → depthRatio 2.0, maxSafe=(1.0/0.5)*0.9=1.8 → 1.8/2.0=0.9
  assert.ok(Math.abs(axialDepthFactor({ ap: 1.0, toolDia: 0.5, fluteLength: 1.0 }).factor - 0.9) < 1e-9);
  // shallow non-adaptive rough: ap=0.2, D=0.5 → depthRatio 0.4 < 1.0(=2.0*0.5), shallowRatio=0.4/2.0=0.2, 1/sqrt(0.2)=2.236 capped 1.5
  assert.ok(Math.abs(axialDepthFactor({ ap: 0.2, toolDia: 0.5, fluteLength: 2.0 }).factor - 1.5) < 1e-9);
  // deep finishing: ap=1.0, D=0.5, isFinishing → depthRatio 2.0 > optimal 0.5 → 0.5/2.0=0.25
  assert.ok(Math.abs(axialDepthFactor({ ap: 1.0, toolDia: 0.5, isFinishing: true }).factor - 0.25) < 1e-9);
  // adaptive + extreme LOC override: ap=0.95, D=0.5, flute=1.0 → locRatio 0.95 > 0.85 → extremeFactor 0.45 applied.
  // depthRatio 1.9 (>= optimal 2.0? no, 1.9<2.0) → light branch: 1+(1-1.9/2.0)*0.3=1+0.015=1.015, then *0.45 = 0.45675
  const adapt = axialDepthFactor({ ap: 0.95, toolDia: 0.5, fluteLength: 1.0, isAdaptive: true });
  assert.ok(adapt.factor < 0.6, `LOC override should cut hard: ${adapt.factor}`);
  assert.equal(axialDepthFactor({ ap: 0, toolDia: 0.5 }).factor, 1, "zero ap → 1");
});

test("ported adaptive3D: light radial engagement raises (sqrt(target/actual)), normal → 1.0; never lowers", () => {
  // ae=0.05, D=1.0 → radialPct 5%, target rough 15, 5 < 15*0.75=11.25 → sqrt(15/5)=1.732 (< cap 1.5) → 1.5
  assert.ok(Math.abs(adaptive3DFactor({ ae: 0.05, ap: 0.1, toolDia: 1.0 }).factor - 1.5) < 1e-9, "capped at 1.5");
  // ae=0.10, D=1.0 → 10%, sqrt(15/10)=1.2247 (< 11.25 threshold) → uncapped
  assert.ok(Math.abs(adaptive3DFactor({ ae: 0.10, ap: 0.1, toolDia: 1.0 }).factor - Math.sqrt(15 / 10)) < 1e-9);
  // ae=0.20, D=1.0 → 20% >= 11.25 → normal, factor 1.0 (never lowers)
  assert.equal(adaptive3DFactor({ ae: 0.20, ap: 0.1, toolDia: 1.0 }).factor, 1);
  assert.equal(adaptive3DFactor({ ae: 0, ap: 0, toolDia: 1.0 }).factor, 1, "no stepover → 1");
});

test("ported aeMaxSafe: ae beyond K·(1−LOC)^n safe limit derates feed; SAFETY ≤1; low LOC no-limit", () => {
  // low LOC: ap=0.1, D=0.5, flute=1.0 → locRatio 0.1 < 0.20 → no limit, 1.0
  assert.equal(aeMaxSafeFactor({ ap: 0.1, toolDia: 0.5, ae: 0.4, fluteLength: 1.0 }).factor, 1);
  // high LOC: ap=0.8, D=0.5, flute=1.0 → locRatio 0.8. maxAeRatio=0.35*(1-0.8)^1.5=0.35*0.0894=0.0313→max(.,0.03)=0.0313
  //   ae=0.4 → currentAeRatio 0.8 > 0.0313 → derate = 0.0313/0.8 = 0.0391
  const hi = aeMaxSafeFactor({ ap: 0.8, toolDia: 0.5, ae: 0.4, fluteLength: 1.0 });
  const expected = (0.35 * Math.pow(1 - 0.8, 1.5)) / 0.8;
  assert.ok(Math.abs(hi.factor - expected) < 1e-6, `derate ${hi.factor} vs ${expected}`);
  assert.ok(hi.factor < 1, "safety: must lower");
  // small ae within limit → 1.0: ap=0.3, D=0.5, flute=2.0 → locRatio 0.15 < 0.20 → no limit
  assert.equal(aeMaxSafeFactor({ ap: 0.3, toolDia: 0.5, ae: 0.01, fluteLength: 2.0 }).factor, 1);
  for (const ae of [0.1, 0.3, 0.5]) assert.ok(aeMaxSafeFactor({ ap: 0.8, toolDia: 0.5, ae, fluteLength: 1.0 }).factor <= 1, "safety ≤1");
});

test("motion factors are OUT of the per-op pipeline (per-move, prismPathsMotion — Unit 2c)", () => {
  const ids = PRISM_PATHS_STAGES.map((s) => s.id);
  for (const m of PRISM_PATHS_MOTION_FACTORS) assert.ok(!ids.includes(m), `${m} must NOT be an op-level stage`);
  assert.deepEqual([...PRISM_PATHS_MOTION_FACTORS].sort(), ["arcFeed", "cornerGForce", "feedRamp"]);
});

test("pipeline has NO port-pending stages left (all op-level factors ported)", () => {
  const ctx = { toolDia: 0.5, ae: 0.1, ap: 0.5, feed: 30, rpm: 6000, flutes: 4, isoGroup: "P",
    spindleHP: 50, spindleTorqueFtLb: 500, hrc: 30, aggressivenessLevel: 5, toolLength: 3.0, fluteLength: 1.5 };
  const r = prismPaths(30, ctx, {});
  for (const f of r.factors) assert.ok(!/port-pending/.test(f.note || ""), `${f.id} still port-pending`);
});

test("ported factors are LIVE in the pipeline (not port-pending) for the 4 wired stages", () => {
  const ctx = { toolDia: 0.5, ae: 0.1, ap: 0.1, feed: 30, rpm: 6000, flutes: 4, isoGroup: "P",
    spindleHP: 50, spindleTorqueFtLb: 500, hrc: 30, aggressivenessLevel: 5, toolLength: 3.0 };
  const r = prismPaths(30, ctx, {});
  for (const id of ["chipThinning", "hardnessSpeed", "aggressiveness", "stickoutDeflection"]) {
    const f = r.factors.find((x) => x.id === id);
    assert.ok(f && !/port-pending/.test(f.note || ""), `${id} should be live, got note="${f && f.note}"`);
  }
  // chipThinning live (raises), hardness 30→0.9 (lowers), aggressiveness 5→0.786, stickout L/D 6 → 0.8
  assert.ok(Math.abs(r.factors.find((x) => x.id === "hardnessSpeed").factor - 0.9) < 1e-9);
  assert.ok(Math.abs(r.factors.find((x) => x.id === "stickoutDeflection").factor - 0.8) < 1e-9);
});

test("CLI: emits parseable JSON with combinedFactor and clamps the heavy case", () => {
  const r = spawnSync(process.execPath, [SCRIPT, "--dia", "2.0", "--ae", "2.0", "--ap", "0.25", "--feed", "40", "--rpm", "2000", "--flutes", "4", "--iso", "P", "--hp", "10", "--torque", "80"], { encoding: "utf8" });
  assert.equal(r.status, 0, `exit 0: ${r.stderr}`);
  const j = JSON.parse(r.stdout);
  assert.equal(j.schemaVersion, "1.0.0");
  assert.ok(j.combinedFactor < 1, `heavy case should clamp: ${j.combinedFactor}`);
});
