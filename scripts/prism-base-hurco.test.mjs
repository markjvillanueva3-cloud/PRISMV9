#!/usr/bin/env node
/**
 * prism-base-hurco.test.mjs — headless round-trip test for the Tier-1 base post.
 * Stubs the Fusion post API + the included feed core, drives onOpen→onSection→onLinear→
 * onClose on a canned 2-op toolpath, captures the emitted NC, then:
 *   - lints it with the shared post-nc-dialect-lint (expect 0 ERROR for Hurco),
 *   - asserts the emitted feed === programmed feed × the prismPaths multiplier,
 *   - asserts dialect/structure correctness (units, spindle, coolant-after-spindle, end).
 * Run: node --test scripts/prism-base-hurco.test.mjs
 */
import { test } from "node:test";
import assert from "node:assert/strict";
import vm from "node:vm";
import { readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { createRequire } from "node:module";
import { lintNc } from "./post-nc-dialect-lint.mjs";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const require = createRequire(import.meta.url);
const POSTS = path.join(__dirname, "..", "mcp-server", "data", "posts", "prism-base");
const feedCore = require(path.join(POSTS, "prism-paths-feed.cps")); // CommonJS-guarded → loads
const postSrc = readFileSync(path.join(POSTS, "PRISM-Base-Hurco-3Axis.cps"), "utf8");

// Build a Fusion-post sandbox: stub the API surface the base post touches, inject the feed
// core (simulating include()), evaluate the post, return its module.exports + the live OUT.
function loadPost(props, toolObj, sectionParams, cycleObj) {
  const sandbox = {
    // Fusion post constants/globals the header + post read
    CAPABILITY_MILLING: 1, PLANE_XY: 0, MM: "mm", IN: "inch", unit: props.__units === "mm" ? "mm" : "inch",
    spatial: (v) => v, setCodePage: () => {}, include: () => {}, getProperty: (id) => (id in props ? props[id] : undefined),
    tool: toolObj, cycle: cycleObj || null,
    currentSection: { hasParameter: (n) => n in sectionParams, getParameter: (n) => sectionParams[n] },
    writeln: () => {}, // post also buffers to OUT; we read OUT
    console, Math, Number, String, Array, parseInt, parseFloat, isFinite, isNaN, RegExp, Object,
    module: { exports: {} },
  };
  // inject the feed core functions as globals (Fusion include() exposes them in post scope)
  for (const k of Object.keys(feedCore)) sandbox[k] = feedCore[k];
  vm.createContext(sandbox);
  vm.runInContext(postSrc, sandbox, { filename: "PRISM-Base-Hurco-3Axis.cps" });
  return { post: sandbox.module.exports, getOut: () => sandbox.module.exports._getOut() };
}

const TOOL = { number: 5, diameter: 0.5, fluteLength: 1.0, bodyLength: 2.5, numberOfFlutes: 4, spindleRPM: 6000, lengthOffset: 5 };
const SECTION = { "operation:tool_stepover": 0.1, "operation:tool_stepdown": 0.3, "operation-strategy": "adaptive2d", "operation:tool_feedCutting": 600 };
const BASE_PROPS = {
  prismProgramNumber: 1234, prismMachineMaxRPM: 10000, prismSpindleHP: 20, prismSpindleTorqueFtLb: 100,
  prismMaterialISO: "P", prismMaterialHRC: 0, prismAggressivenessLevel: 5,
  prismEnableHardness: true, prismEnableChipThinning: true, prismEnableAxialDepth: true, prismEnableAdaptive3D: true,
  prismEnableAggressiveness: true, prismEnableStickout: true, prismEnableAeMaxSafe: true, prismEnablePowerGuard: true,
  prismProveOut: false, prismShowFeedNotes: true, prismCoolant: "flood", __units: "inch",
};

function runProgram(props = BASE_PROPS, tool = TOOL, section = SECTION) {
  const { post, getOut } = loadPost(props, tool, section);
  post.onOpen();
  post.onSection();
  post._setPrev(0, 0, 0);
  post.onRapid(1.0, 1.0, 0.5);
  post.onLinear(1.0, 1.0, -0.2, 300);
  post.onLinear(3.0, 1.0, -0.2, 600);
  post.onSectionEnd();
  post.onClose();
  return { post, nc: getOut().join("\n") };
}

test("emits a structurally complete Hurco program (units, spindle, coolant, end)", () => {
  const { nc } = runProgram();
  assert.match(nc, /O1234/, "program number");
  assert.match(nc, /G20 G17 G90 G94 G54/, "safe start line");
  assert.match(nc, /T5 M06/, "tool change");
  assert.match(nc, /S6000 M03/, "spindle at speed");
  assert.match(nc, /M08/, "coolant");
  assert.match(nc, /G43 .*H5/, "tool length comp");
  assert.match(nc, /M30/, "program end");
});

test("emitted NC lints clean for the Hurco dialect (0 ERROR)", () => {
  const { nc } = runProgram();
  const r = lintNc(nc, { dialect: "hurco", filename: "base.nc" });
  assert.equal(r.counts.ERROR, 0, `expected 0 lint ERRORs, got ${r.counts.ERROR}: ${JSON.stringify(r.findings.filter(f => f.severity === "ERROR"))}`);
});

test("coolant M08 is emitted AFTER spindle M03 (mill ordering rule)", () => {
  const { nc } = runProgram();
  const lines = nc.split("\n");
  const iSpindle = lines.findIndex((l) => /M03/.test(l));
  const iCoolant = lines.findIndex((l) => /M08/.test(l));
  assert.ok(iSpindle >= 0 && iCoolant > iSpindle, `coolant(${iCoolant}) must follow spindle(${iSpindle})`);
});

test("emitted feed === programmed feed × prismPaths multiplier (not raw feed)", () => {
  const { post, nc } = runProgram();
  const mult = post.computeSectionFeedMultiplier();
  assert.ok(mult > 0 && mult !== 1, `multiplier should be active+non-trivial: ${mult}`);
  // the first cutting move was programmed F300 → expect F = 300*mult
  const fLine = nc.split("\n").find((l) => /G01/.test(l) && /F/.test(l));
  const fVal = Number(/F([\d.]+)/.exec(fLine)[1]);
  assert.ok(Math.abs(fVal - 300 * mult) < 0.01, `feed ${fVal} should equal 300*${mult}=${300 * mult}`);
});

test("safety stages stay active even when toggled off (unless prove-out)", () => {
  const heavyTool = { ...TOOL, diameter: 2.0, fluteLength: 1.0, bodyLength: 9.0 }; // L/D 4.5 stickout + big cut
  const heavySection = { "operation:tool_stepover": 2.0, "operation:tool_stepdown": 0.25, "operation-strategy": "pocket" };
  const offProps = { ...BASE_PROPS, prismEnableStickout: false, prismEnablePowerGuard: false, prismSpindleHP: 5, prismMaterialISO: "S" };
  const { post } = runProgram(offProps, heavyTool, heavySection);
  const mult = post.computeSectionFeedMultiplier();
  assert.ok(mult < 1, `safety should still clamp despite toggles off: ${mult}`);
  // prove-out lets them be skipped → multiplier rises
  const proveProps = { ...offProps, prismProveOut: true };
  const { post: p2 } = runProgram(proveProps, heavyTool, heavySection);
  assert.ok(p2.computeSectionFeedMultiplier() > mult, "prove-out skips safety → higher multiplier");
});

test("material variability: S (Inconel) on a small spindle clamps harder than N (alum)", () => {
  const heavyTool = { ...TOOL, diameter: 1.0, fluteLength: 1.5, bodyLength: 3.0, spindleRPM: 2000 };
  const heavySection = { "operation:tool_stepover": 0.5, "operation:tool_stepdown": 0.5, "operation-strategy": "pocket", "operation:tool_feedCutting": 400 };
  const mk = (iso) => runProgram({ ...BASE_PROPS, prismMaterialISO: iso, prismSpindleHP: 7.5 }, heavyTool, heavySection).post.computeSectionFeedMultiplier();
  assert.ok(mk("S") < mk("N"), `S should clamp below N: S=${mk("S")} N=${mk("N")}`);
});

test("disabledStages maps the feed toggles correctly", () => {
  const { post } = runProgram({ ...BASE_PROPS, prismEnableChipThinning: false, prismEnableAdaptive3D: false });
  const d = post.disabledStages();
  assert.ok(d.includes("chipThinning") && d.includes("adaptive3D"), `got ${JSON.stringify(d)}`);
  assert.ok(!d.includes("hardnessSpeed"), "enabled stage not in disabled set");
});

test("canned G83 peck cycle: first hole = full G98 G83 X Y Z R Q F, repeats = X/Y only, ends with G80", () => {
  const cyc = { type: "deep-drilling", retract: 0.1, bottom: -0.5, incrementalDepth: 0.15, feedrate: 150 };
  const drillTool = { ...TOOL, number: 4, diameter: 0.25, fluteLength: 1.5, bodyLength: 3.0, numberOfFlutes: 2, spindleRPM: 4000, lengthOffset: 4 };
  const drillSec = { "operation:tool_stepover": 0.25, "operation:tool_stepdown": 0.25, "operation-strategy": "drill", "operation:tool_feedCutting": 150 };
  const { post, getOut } = loadPost(BASE_PROPS, drillTool, drillSec, cyc);
  post.onOpen(); post.onSection();
  post.onCyclePoint(1.0, 1.0, -0.5);
  post.onCyclePoint(3.0, 1.0, -0.5);
  post.onCyclePoint(1.0, 2.0, -0.5);
  post.onSectionEnd();
  const nc = getOut().join("\n");
  const lines = nc.split("\n");
  const first = lines.find((l) => /G83/.test(l));
  assert.ok(first, "first hole emits a G83 cycle block");
  assert.match(first, /G98 G83 X1 Y1 Z-0\.5 R0\.1 Q0\.15 F/, `full cycle def: ${first}`);
  // the prismPaths multiplier is applied to the cycle feed (NOT the raw 150)
  const mult = post.computeSectionFeedMultiplier();
  const fVal = Number(/F([\d.]+)/.exec(first)[1]);
  assert.ok(Math.abs(fVal - 150 * mult) < 0.01, `cycle feed ${fVal} should equal 150*${mult}`);
  // exactly ONE cycle definition; the other two holes repeat with X/Y only
  assert.equal((nc.match(/G83/g) || []).length, 1, "only one G83 definition for the whole pattern");
  const repeats = lines.filter((l) => /^X3 Y1$|^X1 Y2$/.test(l));
  assert.equal(repeats.length, 2, `2 repeat holes emit X/Y only: ${JSON.stringify(repeats)}`);
  // G80 cancels the cycle BEFORE the section's safe-Z retract (the FIRST G28 is the onOpen
  // start-home, so check that a G28 retract follows G80, not that G80 precedes the first G28).
  const iG80 = lines.findIndex((l) => /G80/.test(l));
  assert.ok(iG80 >= 0, "G80 cycle-cancel emitted");
  assert.ok(lines.slice(iG80 + 1).some((l) => /G28/.test(l)), "the section-end G28 retract follows G80");
  assert.equal(lintNc(nc, { dialect: "hurco" }).counts.ERROR, 0, "cycle NC lints clean for Hurco");
});

test("arc after a linear move takes I/J from the linear endpoint (every move tracks position, no stale center)", () => {
  const { post, getOut } = loadPost(BASE_PROPS, TOOL, SECTION);
  post.onOpen(); post.onSection(); post._setPrev(0, 0, 0);
  post.onRapid(0.5, 0.5, 0.1);
  post.onLinear(2.0, 0.5, -0.3, 400);                              // end at (2.0, 0.5)
  post.onCircular(false, 2.0, 0.75, -0.3, 2.25, 0.75, -0.3, 400); // center (2.0,0.75), endpoint (2.25,0.75)
  post.onSectionEnd(); post.onClose();
  const arc = getOut().join("\n").split("\n").find((l) => /G0[23]/.test(l));
  assert.ok(arc, "an arc was emitted");
  // I = cx-startx = 2.0-2.0 = 0 ; J = cy-starty = 0.75-0.5 = 0.25 (a stale center would give I2 J0.75)
  assert.match(arc, /G03 X2\.25 Y0\.75 I0 J0\.25 /, `arc I/J from the true start, not a stale center: ${arc}`);
});

test("BUNDLED single-file post (feed core inlined) emits IDENTICAL NC to the include version", async () => {
  const { buildBundle } = await import("./bundle-base-post.mjs");
  const bundleSrc = buildBundle();
  // load the bundle WITHOUT injecting the feed core — the bundle contains it (IIFE attaches to globalThis)
  const sandbox = {
    CAPABILITY_MILLING: 1, PLANE_XY: 0, MM: "mm", IN: "inch", unit: "inch",
    spatial: (v) => v, setCodePage: () => {}, include: () => {}, getProperty: (id) => (id in BASE_PROPS ? BASE_PROPS[id] : undefined),
    tool: TOOL, currentSection: { hasParameter: (n) => n in SECTION, getParameter: (n) => SECTION[n] },
    writeln: () => {}, console, Math, Number, String, Array, parseInt, parseFloat, isFinite, isNaN, RegExp, Object,
    module: { exports: {} },
  };
  vm.createContext(sandbox);
  vm.runInContext(bundleSrc, sandbox, { filename: "PRISM-Base-Hurco-3Axis-Bundled.cps" });
  const bp = sandbox.module.exports;
  bp.onOpen(); bp.onSection(); bp._setPrev(0, 0, 0);
  bp.onRapid(1.0, 1.0, 0.5); bp.onLinear(1.0, 1.0, -0.2, 300); bp.onLinear(3.0, 1.0, -0.2, 600);
  bp.onSectionEnd(); bp.onClose();
  const bundleNc = bp._getOut().join("\n");
  const { nc: includeNc } = runProgram();
  assert.equal(bundleNc, includeNc, "bundle and include-version must emit byte-identical NC");
  assert.equal(lintNc(bundleNc, { dialect: "hurco" }).counts.ERROR, 0, "bundle NC lints clean");
});
