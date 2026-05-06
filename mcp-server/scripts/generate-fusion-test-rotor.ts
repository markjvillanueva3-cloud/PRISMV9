/**
 * generate-fusion-test-rotor.ts — End-to-end driver for Fusion 360 Adapter
 *
 * Generates a complex turbine-rotor part using the new Fusion360CADGeneratorAdapter,
 * writes the resulting Python to a known path on disk, and prints a one-step
 * instruction to run it inside Fusion 360's "Scripts and Add-Ins" panel.
 *
 * Run with:  npx tsx mcp-server/scripts/generate-fusion-test-rotor.ts
 *
 * Geometry plan (8-bladed centrifugal rotor, ~95mm OD):
 *   1. Hub disk (Ø50 × 20mm)             — sketch_circle + extrude
 *   2. Through-bore (Ø10)                 — sketch_circle + extrude_cut style via pocket
 *   3. Blade root profile (3 × 35 × 15)   — sketch_rectangle + extrude + taperAngle (twist)
 *   4. Circular pattern of 8 blades       — pattern_circular
 *   5. Custom Python footer to sweep up   — fillet hub edges via body.edges (timeline lookup)
 *
 * Why a rotor? It's the user's pick (turbine rotor 5-axis-style) and exercises
 * feature_revolve, feature_extrude with taperAngle (twist), pattern_circular, plus
 * a custom op that interoperates with the Adapter's pipeline.
 */

import { fusion360CADGeneratorAdapter } from "../src/engines/Fusion360CADGeneratorAdapter.js";
import type { CADOperation } from "../src/interfaces/ICADCodeGenerator.js";
import { writeFileSync, mkdirSync } from "node:fs";
import { resolve } from "node:path";

// ── Op stream ────────────────────────────────────────────────────────────────

const ops: CADOperation[] = [
  // ── Hub disk ──────────────────────────────────────────────────────────────
  {
    kind: "sketch_create",
    args: { plane: "xy", name: "HubProfile" },
    description: "Create XY sketch for hub disk",
  },
  {
    kind: "sketch_circle",
    args: { sketch: "HubProfile", cx: 0, cy: 0, radius: 25 },
    description: "Hub OD circle Ø50",
  },
  {
    kind: "feature_extrude",
    args: { sketch: "HubProfile", distance: 20, operation: "new" },
    description: "Hub disk extrude (20mm)",
  },

  // ── Center bore (Ø10 through) ─────────────────────────────────────────────
  {
    kind: "sketch_create",
    args: { plane: "xy", name: "BoreSketch" },
    description: "Bore sketch on hub top",
  },
  {
    kind: "sketch_circle",
    args: { sketch: "BoreSketch", cx: 0, cy: 0, radius: 5 },
    description: "Bore Ø10 circle",
  },
  {
    kind: "feature_extrude",
    args: {
      sketch: "BoreSketch",
      distance: 25,
      operation: "cut",
      endCondition: "through_all",
    },
    description: "Through-bore cut",
  },

  // ── Blade (single, will pattern below) ────────────────────────────────────
  // Sketch a rectangular blade root at (radial offset from hub OD), extrude up
  // with taperAngle=15° to twist the blade tip. Real turbine blades are
  // lofted/swept; this is a recognizable simplified airfoil that exercises
  // taperAngle conversion in the Adapter.
  {
    kind: "sketch_create",
    args: { plane: "xy", name: "BladeProfile" },
    description: "Blade root profile sketch (top face of hub)",
  },
  // Blade root: 3mm wide × 35mm radial, located on hub top, root just outside
  // the hub OD-2 (so it bites into the hub for clean blend).
  {
    kind: "sketch_rectangle",
    args: {
      sketch: "BladeProfile",
      x: 23,            // root edge starts inside hub OD (25mm)
      y: -1.5,          // 3mm width centred on +X axis
      width: 35,        // tip extends to r=58 (well past hub OD)
      height: 3,
    },
    description: "Blade root rectangle (3 × 35mm)",
  },
  {
    kind: "feature_extrude",
    args: {
      sketch: "BladeProfile",
      distance: 30,
      operation: "join",
      taperAngle: 15,   // 15° draft → tip is 30 * tan(15°) ≈ 8mm narrower per side
    },
    description: "Blade extrude with 15° twist",
  },

  // ── Pattern: 8 blades around Z axis ──────────────────────────────────────
  // The Adapter emits `_pc_feats.add(<feature_var>)` per item. Fusion needs
  // the last extrude feature here. We pass the well-known timeline lookup
  // expression as the feature reference — the runtime will resolve it inside
  // Python. The Adapter doesn't know about timelines, so we inject the lookup
  // through the args.features array as a raw Python expression.
  {
    kind: "pattern_circular",
    args: {
      features: ["design.timeline.item(design.timeline.count - 1).entity"],
      axis: "root.zConstructionAxis",
      count: 8,
      angle: 360,
    },
    description: "Circular-pattern 8 blades around Z",
  },

  // ── Custom Python footer: fillet the blade-to-hub junction ───────────────
  // Pull edges from the most-recently created body and round root edges. This
  // is genuinely beyond the typed Adapter's surface (edge-by-direction
  // selection requires Fusion API introspection), so we use the `custom` op.
  {
    kind: "custom",
    args: {
      body:
        "# Fillet the top hub edge for visual polish\n" +
        "_body = root.bRepBodies.item(0)\n" +
        "_top_edges = adsk.core.ObjectCollection.create()\n" +
        "for _e in _body.edges:\n" +
        "    # Top edge of hub disk: circular edges at z = 2.0 cm\n" +
        "    _bb = _e.boundingBox\n" +
        "    if abs(_bb.minPoint.z - 2.0) < 0.01 and abs(_bb.maxPoint.z - 2.0) < 0.01:\n" +
        "        # Circular edges (start == end) only\n" +
        "        if _e.geometry.objectType == adsk.core.Circle3D.classType():\n" +
        "            _top_edges.add(_e)\n" +
        "if _top_edges.count > 0:\n" +
        "    _fr_in = root.features.filletFeatures.createInput()\n" +
        "    _fr_in.addConstantRadiusEdgeSet(_top_edges, adsk.core.ValueInput.createByReal(0.15), True)\n" +
        "    root.features.filletFeatures.add(_fr_in)\n" +
        "    print(f'Filleted {_top_edges.count} top-hub edge(s)')",
    },
    description: "Fillet top hub edges (custom Python)",
  },
];

// ── Generate ────────────────────────────────────────────────────────────────

const script = fusion360CADGeneratorAdapter.buildScript(ops, {
  documentName: "PRISM_Turbine_Rotor",
  unitIn: "mm",
});

// ── Write to disk ───────────────────────────────────────────────────────────

const outDir = resolve(import.meta.dirname ?? __dirname, "..", "..", "out", "fusion-tests");
const outPath = resolve(outDir, script.filename);
mkdirSync(outDir, { recursive: true });
writeFileSync(outPath, script.body, "utf8");

// ── Summary ─────────────────────────────────────────────────────────────────

console.log(`\n✓ Generated ${script.body.split("\n").length} lines of Fusion 360 Python`);
console.log(`✓ ${ops.length} CAD operations → ${script.lineage.length} lineage entries`);
console.log(`✓ ${script.warnings.length} warnings`);
if (script.warnings.length > 0) {
  for (const w of script.warnings) {
    console.log(`  • [${w.kind}] ${w.message}`);
  }
}
console.log(`\nScript saved to:`);
console.log(`  ${outPath}\n`);
console.log(`Run in Fusion 360:`);
console.log(`  1. Open Fusion → Utilities tab → Add-Ins... (or Shift+S)`);
console.log(`  2. Scripts tab → click the green "+" → "Existing"`);
console.log(`  3. Browse to:  ${outPath}`);
console.log(`  4. Select PRISM_Turbine_Rotor → Run`);
console.log(`\nA new Fusion design should open with the rotor geometry.\n`);
