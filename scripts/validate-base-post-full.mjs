#!/usr/bin/env node
/**
 * validate-base-post-full.mjs — FULL feature-matrix validation of the Tier-1 Hurco base post.
 *
 * Drives the SHIPPED bundled post through a stubbed Fusion API across the whole feature space and
 * asserts physics-grounded + structural invariants on the emitted ISNC, then lints every program
 * for the Hurco dialect. This is the "test fully" harness — complements the unit suites by checking
 * cross-cutting behavior (material ordering, cycle family, feed-stage toggles, prove-out, units,
 * safety clamps) end-to-end on the real post output. Exit 0 = all PASS, non-zero = a failure.
 *
 * Run: node scripts/validate-base-post-full.mjs
 */
import vm from "node:vm";
import { readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { lintNc } from "./post-nc-dialect-lint.mjs";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const BUNDLE = path.join(__dirname, "..", "mcp-server", "data", "posts", "prism-base", "PRISM-Base-Hurco-3Axis-Bundled.cps");
const BUNDLE_SRC = readFileSync(BUNDLE, "utf8");

const BASE_PROPS = {
  prismProgramNumber: 1000, prismMachineMaxRPM: 10000, prismSpindleHP: 20, prismSpindleTorqueFtLb: 100,
  prismMaterialISO: "P", prismMaterialHRC: 0, prismAggressivenessLevel: 5,
  prismEnableHardness: true, prismEnableChipThinning: true, prismEnableAxialDepth: true, prismEnableAdaptive3D: true,
  prismEnableAggressiveness: true, prismEnableStickout: true, prismEnableAeMaxSafe: true, prismEnablePowerGuard: true,
  prismProveOut: false, prismShowFeedNotes: true, prismCoolant: "flood", __units: "inch",
};
const TOOL = { number: 1, diameter: 0.5, fluteLength: 1.0, bodyLength: 2.5, numberOfFlutes: 4, spindleRPM: 6000, lengthOffset: 1 };
const SECTION = { "operation:tool_stepover": 0.05, "operation:tool_stepdown": 0.2, "operation-strategy": "adaptive2d", "operation:tool_feedCutting": 600 };

function run(props = BASE_PROPS, tool = TOOL, section = SECTION, cycle = null) {
  const sandbox = {
    CAPABILITY_MILLING: 1, PLANE_XY: 0, MM: "mm", IN: "inch", unit: props.__units === "mm" ? "mm" : "inch",
    spatial: (v) => v, setCodePage: () => {}, include: () => {},
    getProperty: (id) => (id in props ? props[id] : undefined),
    tool, currentSection: { hasParameter: (n) => n in section, getParameter: (n) => section[n] }, cycle,
    writeln: () => {}, console, Math, Number, String, Array, parseInt, parseFloat, isFinite, isNaN, RegExp, Object,
    module: { exports: {} },
  };
  vm.createContext(sandbox);
  vm.runInContext(BUNDLE_SRC, sandbox, { filename: "bundle.cps" });
  const p = sandbox.module.exports;
  p.onOpen(); p.onSection(); p._setPrev(0, 0, 0);
  p.onRapid(1, 1, 0.1); p.onLinear(1, 1, -0.2, 300); p.onLinear(3, 1, -0.2, 600);
  if (cycle) { p.onCyclePoint(1, 1, cycle.bottom); p.onCyclePoint(2, 1, cycle.bottom); }
  p.onSectionEnd(); p.onClose();
  return { nc: p._getOut().join("\n"), mult: p.computeSectionFeedMultiplier(), post: p };
}

// ── assertion harness ──
let pass = 0, fail = 0; const failures = [];
function check(name, cond, detail) {
  if (cond) { pass++; console.log("  ✓ " + name); }
  else { fail++; failures.push(name + (detail ? " — " + detail : "")); console.log("  ✗ " + name + (detail ? " — " + detail : "")); }
}
function section(title) { console.log("\n" + title); }

// ── 1. all 6 ISO materials lint clean + power-limited feed ordering by kc (N<K<P<M<S<H power) ──
section("1. ISO materials (lint + power-limited feed ordering)");
const POWER_TOOL = { ...TOOL, diameter: 1.0, fluteLength: 1.5, bodyLength: 3.0, spindleRPM: 2500 };
const POWER_SEC = { "operation:tool_stepover": 0.9, "operation:tool_stepdown": 0.6, "operation-strategy": "pocket", "operation:tool_feedCutting": 500 };
const matMult = {};
for (const iso of ["P", "M", "K", "N", "S", "H"]) {
  const r = run({ ...BASE_PROPS, prismMaterialISO: iso, prismSpindleHP: 5 }, POWER_TOOL, POWER_SEC);
  matMult[iso] = r.mult;
  const errs = lintNc(r.nc, { dialect: "hurco" }).counts.ERROR;
  check(`material ${iso} lints clean`, errs === 0, `${errs} errors`);
}
// kc ordering N(700) < K(1100) < P(1800) < M(2100) < S(2800) < H(3200) ⇒ feed mult N≥K≥P≥M≥S≥H when power-limited
check("alum (N) feeds faster than superalloy (S)", matMult.N > matMult.S, `N=${matMult.N.toFixed(3)} S=${matMult.S.toFixed(3)}`);
check("hardened (H) is the most-clamped material", matMult.H <= Math.min(matMult.N, matMult.K, matMult.P, matMult.M, matMult.S) + 1e-9, JSON.stringify(matMult));
check("feed multiplier is monotonic non-increasing across kc order N→H",
  [matMult.N, matMult.K, matMult.P, matMult.M, matMult.S, matMult.H].every((v, i, a) => i === 0 || v <= a[i - 1] + 1e-9),
  `[N,K,P,M,S,H]=${["N","K","P","M","S","H"].map((k) => matMult[k].toFixed(3)).join(",")}`);

// ── 2. every canned-cycle family emits the right G-code + G80 cancel + clean lint ──
section("2. canned drilling cycle family");
const CYC = (type, extra = {}) => ({ type, retract: 0.1, bottom: -0.5, feedrate: 150, ...extra });
const cycleCases = [
  ["drilling", "G81", {}], ["counter-boring", "G82", { dwell: 0.5 }], ["deep-drilling", "G83", { incrementalDepth: 0.15 }],
  ["chip-breaking", "G73", { incrementalDepth: 0.1 }], ["tapping", "G84", {}], ["left-tapping", "G74", {}], ["reaming", "G85", {}],
];
const drillTool = { ...TOOL, diameter: 0.25, bodyLength: 3.0 };
const drillSec = { "operation:tool_stepover": 0.25, "operation:tool_stepdown": 0.25, "operation-strategy": "drill", "operation:tool_feedCutting": 150 };
for (const [type, g, extra] of cycleCases) {
  const r = run(BASE_PROPS, drillTool, drillSec, CYC(type, extra));
  const re = new RegExp("G98 " + g + " ");
  check(`${type} → ${g}`, re.test(r.nc), r.nc.split("\n").find((l) => /G9[78] G[78]/.test(l)) || "(no cycle line)");
  check(`${type} cancels with G80`, /\bG80\b/.test(r.nc));
  check(`${type} repeats 2nd hole as X/Y only`, (r.nc.match(new RegExp(g, "g")) || []).length === 1, "expected one cycle def");
  check(`${type} lints clean`, lintNc(r.nc, { dialect: "hurco" }).counts.ERROR === 0);
}
// peck Q present for G83/G73; dwell P for G82
check("G83 carries a Q peck increment", /G83 .*Q0\.15/.test(run(BASE_PROPS, drillTool, drillSec, CYC("deep-drilling", { incrementalDepth: 0.15 })).nc));
check("G82 carries a P dwell (ms)", /G82 .*P500/.test(run(BASE_PROPS, drillTool, drillSec, CYC("counter-boring", { dwell: 0.5 })).nc));

// ── 3. feed-stage toggles move the multiplier in the right direction ──
section("3. feed-stage enable/disable matrix (light radial cut)");
const base = run().mult;  // all stages on, light cut (chip-thinning + adaptive boosting)
check("disabling chip-thinning lowers feed on a light cut",
  run({ ...BASE_PROPS, prismEnableChipThinning: false }).mult < base, `off=${run({ ...BASE_PROPS, prismEnableChipThinning: false }).mult.toFixed(3)} on=${base.toFixed(3)}`);
check("disabling 3D-adaptive boost lowers feed",
  run({ ...BASE_PROPS, prismEnableAdaptive3D: false }).mult < base);
check("disabling axial-depth scaling changes feed",
  Math.abs(run({ ...BASE_PROPS, prismEnableAxialDepth: false }).mult - base) > 1e-9);

// ── 4. safety stages stay active when toggled off (unless prove-out) ──
section("4. safety stages (stickout / ae / power) — active unless prove-out");
const CLAMP_TOOL = { ...TOOL, diameter: 0.25, fluteLength: 0.75, bodyLength: 3.0 }; // L/D 12 stickout
const CLAMP_PROPS = { ...BASE_PROPS, prismSpindleHP: 4, prismMaterialISO: "S", prismEnableStickout: false, prismEnableAeMaxSafe: false, prismEnablePowerGuard: false };
const clamped = run(CLAMP_PROPS, CLAMP_TOOL, POWER_SEC).mult;
const proveOut = run({ ...CLAMP_PROPS, prismProveOut: true }, CLAMP_TOOL, POWER_SEC).mult;
check("safety still clamps (mult < 1) despite toggles off", clamped < 1, `mult=${clamped.toFixed(3)}`);
check("prove-out lets safety skip → higher multiplier", proveOut > clamped, `prove=${proveOut.toFixed(3)} normal=${clamped.toFixed(3)}`);

// ── 5. units: mm → G21, inch → G20 ──
section("5. units");
check("inch program emits G20", /\bG20\b/.test(run({ ...BASE_PROPS, __units: "inch" }).nc));
check("mm program emits G21", /\bG21\b/.test(run({ ...BASE_PROPS, __units: "mm" }).nc));

// ── 6. aggressiveness monotonic L1 < L8 ──
section("6. aggressiveness scalar");
const aggL1 = run({ ...BASE_PROPS, prismAggressivenessLevel: 1 }).mult;
const aggL8 = run({ ...BASE_PROPS, prismAggressivenessLevel: 8 }).mult;
check("L1 (conservative) feeds slower than L8 (max MRR)", aggL1 < aggL8, `L1=${aggL1.toFixed(3)} L8=${aggL8.toFixed(3)}`);

// ── 7. structural completeness + every multi-op program lints clean ──
section("7. structure + dialect lint");
const sref = run();
for (const [label, re] of [["program number O####", /O\d{3,}/], ["safe start", /G20 G17 G90 G94 G54/], ["tool change", /T\d+ M06/],
  ["spindle at speed", /S\d+ M03/], ["coolant M08", /M08/], ["tool-length comp G43", /G43 .*H\d/], ["program end M30", /M30/]]) {
  check(label, re.test(sref.nc));
}
check("coolant M08 AFTER spindle M03 (mill rule)", sref.nc.indexOf("M08") > sref.nc.indexOf("M03"));
check("reference program lints clean (0 ERROR)", lintNc(sref.nc, { dialect: "hurco" }).counts.ERROR === 0);

// ── report ──
console.log("\n" + "=".repeat(58));
console.log(`FULL VALIDATION: ${pass} passed, ${fail} failed (${pass + fail} checks)`);
if (fail) { console.log("FAILURES:"); for (const f of failures) console.log("  - " + f); }
console.log(fail === 0 ? "RESULT: ✅ PASS — post validated across the full feature matrix" : "RESULT: ❌ FAIL");
process.exit(fail === 0 ? 0 : 1);
