#!/usr/bin/env node
/**
 * emit-rich-sample-nc.mjs — generate a REPRESENTATIVE multi-tool NC program FROM the Tier-1
 * base post, meaty enough to exercise the prismPaths adaptive-feed logic in a Hurco WinMax
 * sim (ISNC/G-code mode). Mirrors emit-base-sample-nc.mjs but with 4 real ops:
 *
 *   T1  2.0" face mill   — facing pass (wide stepover, shallow)            [strategy: face]
 *   T2  0.5" 4FL endmill — adaptive pocket rough, 3 Z-levels, 10% stepover [strategy: adaptive2d]
 *   T3  0.375" 3FL endmill — pocket finish contour with corner ARCS        [strategy: contour]
 *   T4  0.25" drill      — 4-hole pattern via a real G83 peck canned cycle (G98 G83 X Y Z R Q F
 *                          + G80), the way a Hurco post should emit drilling                [strategy: drill]
 *
 * Each op feeds different tool geometry + stepover/stepdown so the PRISM PATHS multiplier (and
 * thus the F values) differs per op — you can watch the adaptive feed change in the program.
 * NOT a real Fusion toolpath (canned moves), but real OUTPUT from the post: structure, dialect,
 * feed behavior, and arc geometry are exactly what the post produces. The production test is
 * still running the post inside Fusion on an actual CAM setup.
 *
 * Usage: node scripts/emit-rich-sample-nc.mjs [outPath]
 */
import vm from "node:vm";
import { readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const BUNDLE = path.join(__dirname, "..", "mcp-server", "data", "posts", "prism-base", "PRISM-Base-Hurco-3Axis-Bundled.cps");

const PROPS = {
  prismProgramNumber: 1002, prismMachineMaxRPM: 10000, prismSpindleHP: 20, prismSpindleTorqueFtLb: 100,
  prismMaterialISO: "P", prismMaterialHRC: 0, prismAggressivenessLevel: 5,
  prismEnableHardness: true, prismEnableChipThinning: true, prismEnableAxialDepth: true, prismEnableAdaptive3D: true,
  prismEnableAggressiveness: true, prismEnableStickout: true, prismEnableAeMaxSafe: true, prismEnablePowerGuard: true,
  prismProveOut: false, prismShowFeedNotes: true, prismCoolant: "flood",
};

const sandbox = {
  CAPABILITY_MILLING: 1, PLANE_XY: 0, MM: "mm", IN: "inch", unit: "inch",
  spatial: (v) => v, setCodePage: () => {}, include: () => {},
  getProperty: (id) => (id in PROPS ? PROPS[id] : undefined),
  tool: null, currentSection: null, cycle: null,
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
function comment(t) { post.onComment(t); }

// ── geometry: 4 x 3 x 1 in P-steel plate, WCS top-front-left corner, pocket 3 x 2 centered ──
const CLR = 0.1;            // clearance plane
const POCKET = { x0: 0.5, x1: 3.5, y0: 0.5, y1: 2.5, depth: -0.6 };

post.onOpen();

// ── T1: 2.0" face mill — face the top to Z-0.02 in 3 passes ──
setOp(
  { number: 1, diameter: 2.0, fluteLength: 0.5, bodyLength: 2.0, numberOfFlutes: 5, spindleRPM: 3000, lengthOffset: 1 },
  { "operation:tool_stepover": 1.4, "operation:tool_stepdown": 0.02, "operation-strategy": "face", "operation:tool_feedCutting": 800 }
);
post.onSection();
comment("FACE TOP");
let zf = -0.02;
post.onRapid(-0.3, 0.5, CLR);
post.onLinear(-0.3, 0.5, zf, 200);          // plunge
post.onLinear(4.3, 0.5, zf, 800);           // pass 1  ->X
post.onRapid(4.3, 1.5, CLR);
post.onLinear(4.3, 1.5, zf, 200);
post.onLinear(-0.3, 1.5, zf, 800);          // pass 2  <-X
post.onRapid(-0.3, 2.5, CLR);
post.onLinear(-0.3, 2.5, zf, 200);
post.onLinear(4.3, 2.5, zf, 800);           // pass 3  ->X
post.onRapid(4.3, 2.5, CLR);
post.onSectionEnd();

// ── T2: 0.5" endmill — adaptive pocket rough, 3 Z levels, 10% radial stepover ──
setOp(
  { number: 2, diameter: 0.5, fluteLength: 1.0, bodyLength: 2.5, numberOfFlutes: 4, spindleRPM: 6000, lengthOffset: 2 },
  { "operation:tool_stepover": 0.05, "operation:tool_stepdown": 0.2, "operation-strategy": "adaptive2d", "operation:tool_feedCutting": 600 }
);
post.onSection();
comment("POCKET ROUGH (ADAPTIVE)");
const r = 0.25;                              // tool radius offset off the pocket wall
for (const z of [-0.2, -0.4, -0.6]) {
  comment("Z LEVEL " + z.toFixed(3));
  post.onRapid(POCKET.x0 + r, POCKET.y0 + r, CLR);
  post.onLinear(POCKET.x0 + r, POCKET.y0 + r, z, 150);           // plunge
  post.onLinear(POCKET.x1 - r, POCKET.y0 + r, z, 600);           // outer loop, tool-center inset
  post.onLinear(POCKET.x1 - r, POCKET.y1 - r, z, 600);
  post.onLinear(POCKET.x0 + r, POCKET.y1 - r, z, 600);
  post.onLinear(POCKET.x0 + r, POCKET.y0 + r, z, 600);
  post.onLinear(POCKET.x0 + 0.75, POCKET.y0 + 0.5, z, 600);      // one inner clearing pass
  post.onLinear(POCKET.x1 - 0.75, POCKET.y0 + 0.5, z, 600);
  post.onLinear(POCKET.x1 - 0.75, POCKET.y1 - 0.5, z, 600);
  post.onLinear(POCKET.x0 + 0.75, POCKET.y1 - 0.5, z, 600);
  post.onRapid(POCKET.x0 + 0.75, POCKET.y0 + 0.5, CLR);          // retract before next level
}
post.onSectionEnd();

// ── T3: 0.375" endmill — pocket FINISH contour (rounded-rectangle, corner ARCS) at full depth ──
setOp(
  { number: 3, diameter: 0.375, fluteLength: 0.75, bodyLength: 1.75, numberOfFlutes: 3, spindleRPM: 8000, lengthOffset: 3 },
  { "operation:tool_stepover": 0.005, "operation:tool_stepdown": 0.6, "operation-strategy": "contour", "operation:tool_feedCutting": 400 }
);
post.onSection();
comment("POCKET FINISH (CONTOUR + ARCS)");
const cr = 0.25;                             // corner radius
const zc = POCKET.depth;
post.onRapid(POCKET.x0 + cr, POCKET.y0, CLR);
post.onLinear(POCKET.x0 + cr, POCKET.y0, zc, 150);               // plunge at bottom edge
post.onLinear(POCKET.x1 - cr, POCKET.y0, zc, 400);              // bottom edge ->X (CCW lap)
post.onCircular(false, POCKET.x1 - cr, POCKET.y0 + cr, zc, POCKET.x1, POCKET.y0 + cr, zc, 400); // BR arc G03
post.onLinear(POCKET.x1, POCKET.y1 - cr, zc, 400);              // right edge ^Y
post.onCircular(false, POCKET.x1 - cr, POCKET.y1 - cr, zc, POCKET.x1 - cr, POCKET.y1, zc, 400); // TR arc
post.onLinear(POCKET.x0 + cr, POCKET.y1, zc, 400);              // top edge <-X
post.onCircular(false, POCKET.x0 + cr, POCKET.y1 - cr, zc, POCKET.x0, POCKET.y1 - cr, zc, 400); // TL arc
post.onLinear(POCKET.x0, POCKET.y0 + cr, zc, 400);              // left edge vY
post.onCircular(false, POCKET.x0 + cr, POCKET.y0 + cr, zc, POCKET.x0 + cr, POCKET.y0, zc, 400); // BL arc
post.onRapid(POCKET.x0 + cr, POCKET.y0, CLR);
post.onSectionEnd();

// ── T4: 0.25" drill — 4 holes as peck plunges (NO canned cycle in Tier-1; honest plunge/retract) ──
setOp(
  { number: 4, diameter: 0.25, fluteLength: 1.5, bodyLength: 3.0, numberOfFlutes: 2, spindleRPM: 4000, lengthOffset: 4 },
  { "operation:tool_stepover": 0.25, "operation:tool_stepdown": 0.25, "operation-strategy": "drill", "operation:tool_feedCutting": 150 }
);
post.onSection();
comment("DRILL 4X .25 - G83 PECK CANNED CYCLE");
// G83 deep-peck cycle: R plane 0.1, final Z -0.5, peck increment Q 0.15. Fusion sets these on the
// `cycle` global; here we set it directly. First hole emits the full cycle, the rest repeat X/Y.
sandbox.cycle = { type: "deep-drilling", retract: CLR, bottom: -0.5, incrementalDepth: 0.15, feedrate: 150 };
for (const [hx, hy] of [[1.0, 1.0], [3.0, 1.0], [3.0, 2.0], [1.0, 2.0]]) {
  post.onCyclePoint(hx, hy, -0.5);
}
post.onSectionEnd();   // emits G80 (cancel) before retract
sandbox.cycle = null;

post.onClose();

const nc = post._getOut().join("\n");
const out = process.argv[2] || path.join(__dirname, "..", "mcp-server", "data", "posts", "prism-base", "SAMPLE-PRISM-Base-Hurco-RICH.nc");
writeFileSync(out, nc + "\n");
console.log("rich sample NC -> " + out + " (" + nc.split("\n").length + " lines)");
