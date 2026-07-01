#!/usr/bin/env node
/**
 * emit-base-sample-nc.mjs — generate a representative NC program FROM the Tier-1 base post,
 * so it can be loaded into Hurco WinMax (ISNC/G-code mode) for a syntax/sim sanity check.
 *
 * Drives the SHIPPED bundled post through a stubbed Fusion post API on a small canned
 * 2-tool toolpath and writes the emitted .nc. NOT a real Fusion toolpath (canned moves) —
 * it represents the post's dialect/structure/feed behavior, good for a WinMax load test.
 * The real production test is running the post inside Fusion on an actual CAM setup.
 *
 * Usage: node scripts/emit-base-sample-nc.mjs [outPath]
 */
import vm from "node:vm";
import { readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const BUNDLE = path.join(__dirname, "..", "mcp-server", "data", "posts", "prism-base", "PRISM-Base-Hurco-3Axis-Bundled.cps");

const PROPS = {
  prismProgramNumber: 1001, prismMachineMaxRPM: 10000, prismSpindleHP: 20, prismSpindleTorqueFtLb: 100,
  prismMaterialISO: "P", prismMaterialHRC: 0, prismAggressivenessLevel: 5,
  prismEnableHardness: true, prismEnableChipThinning: true, prismEnableAxialDepth: true, prismEnableAdaptive3D: true,
  prismEnableAggressiveness: true, prismEnableStickout: true, prismEnableAeMaxSafe: true, prismEnablePowerGuard: true,
  prismProveOut: false, prismShowFeedNotes: true, prismCoolant: "flood",
};

// Load the post ONCE; the `tool`/`currentSection` globals are mutated between sections so a
// single onOpen..onClose emits a clean multi-tool program (the post reads them as globals).
const sandbox = {
  CAPABILITY_MILLING: 1, PLANE_XY: 0, MM: "mm", IN: "inch", unit: "inch",
  spatial: (v) => v, setCodePage: () => {}, include: () => {},
  getProperty: (id) => (id in PROPS ? PROPS[id] : undefined),
  tool: null, currentSection: null,
  writeln: () => {}, console, Math, Number, String, Array, parseInt, parseFloat, isFinite, isNaN, RegExp, Object,
  module: { exports: {} },
};
vm.createContext(sandbox);
vm.runInContext(readFileSync(BUNDLE, "utf8"), sandbox, { filename: "bundle.cps" });
const post = sandbox.module.exports;
function setOp(tool, section) {
  sandbox.tool = tool;
  sandbox.currentSection = { hasParameter: (n) => n in section, getParameter: (n) => section[n] };
}

// Two ops: a 1/2" adaptive rough in P-steel, then a 1/4" finish contour.
const OP1_TOOL = { number: 1, diameter: 0.5, fluteLength: 1.0, bodyLength: 2.5, numberOfFlutes: 4, spindleRPM: 6000, lengthOffset: 1 };
const OP1_SEC = { "operation:tool_stepover": 0.1, "operation:tool_stepdown": 0.3, "operation-strategy": "adaptive2d", "operation:tool_feedCutting": 600 };
const OP2_TOOL = { number: 2, diameter: 0.25, fluteLength: 0.75, bodyLength: 1.75, numberOfFlutes: 3, spindleRPM: 9000, lengthOffset: 2 };
const OP2_SEC = { "operation:tool_stepover": 0.01, "operation:tool_stepdown": 0.1, "operation-strategy": "contour", "operation:tool_feedCutting": 300 };

setOp(OP1_TOOL, OP1_SEC);
post.onOpen();
post.onSection();
post._setPrev(0, 0, 0);
post.onRapid(0.25, 0.25, 0.1);
post.onLinear(0.25, 0.25, -0.3, 300);
post.onLinear(2.25, 0.25, -0.3, 600);
post.onLinear(2.25, 1.75, -0.3, 600);
post.onCircular(true, 2.25, 1.5, -0.3, 2.0, 1.75, -0.3, 600);
post.onLinear(0.25, 1.75, -0.3, 600);
post.onSectionEnd();

setOp(OP2_TOOL, OP2_SEC);   // tool change for op 2
post.onSection();
post._setPrev(0.25, 1.75, -0.3);
post.onLinear(0.25, 1.75, -0.1, 150);
post.onLinear(2.25, 1.75, -0.1, 300);
post.onSectionEnd();
post.onClose();

const nc = post._getOut().join("\n");
const out = process.argv[2] || path.join(__dirname, "..", "mcp-server", "data", "posts", "prism-base", "SAMPLE-PRISM-Base-Hurco.nc");
writeFileSync(out, nc + "\n");
console.log("sample NC -> " + out + " (" + nc.split("\n").length + " lines)");
console.log(nc);
