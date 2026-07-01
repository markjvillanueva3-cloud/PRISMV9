/**
 * run-fusion-test-rotor-live.ts — Drive Fusion 360 LIVE via PRISMBridge HTTP add-in
 *
 * Generates the turbine-rotor Python via Fusion360CADGeneratorAdapter, strips the
 * def-run(context) wrapper to match the bridge's /execute contract, POSTs to
 * http://127.0.0.1:18360/execute, and reports the result.
 *
 * Run with:  H:/prism/mcp-server/node_modules/.bin/tsx \
 *              H:/prism/mcp-server/scripts/run-fusion-test-rotor-live.ts
 *
 * Prerequisites:
 *   - Fusion 360 running with PRISMBridge add-in started (port 18360)
 *   - An untitled design active in Fusion (the script targets app.activeProduct)
 */

import { fusion360CADGeneratorAdapter } from "../src/engines/Fusion360CADGeneratorAdapter.js";
import type { CADOperation } from "../src/interfaces/ICADCodeGenerator.js";

// ── Op stream (same rotor as generate-fusion-test-rotor.ts) ──────────────────

const ops: CADOperation[] = [
  { kind: "sketch_create", args: { plane: "xy", name: "HubProfile" } },
  { kind: "sketch_circle", args: { sketch: "HubProfile", cx: 0, cy: 0, radius: 25 } },
  { kind: "feature_extrude", args: { sketch: "HubProfile", distance: 20, operation: "new" } },
  { kind: "sketch_create", args: { plane: "xy", name: "BoreSketch" } },
  { kind: "sketch_circle", args: { sketch: "BoreSketch", cx: 0, cy: 0, radius: 5 } },
  {
    kind: "feature_extrude",
    args: { sketch: "BoreSketch", distance: 25, operation: "cut", endCondition: "through_all" },
  },
  { kind: "sketch_create", args: { plane: "xy", name: "BladeProfile" } },
  {
    kind: "sketch_rectangle",
    args: { sketch: "BladeProfile", x: 23, y: -1.5, width: 35, height: 3 },
  },
  {
    kind: "feature_extrude",
    args: { sketch: "BladeProfile", distance: 30, operation: "join", taperAngle: 15 },
  },
  {
    kind: "pattern_circular",
    args: {
      features: ["design.timeline.item(design.timeline.count - 1).entity"],
      axis: "root.zConstructionAxis",
      count: 8,
      angle: 360,
    },
  },
  {
    kind: "custom",
    args: {
      body:
        "_body = root.bRepBodies.item(0)\n" +
        "_top_edges = adsk.core.ObjectCollection.create()\n" +
        "for _e in _body.edges:\n" +
        "    _bb = _e.boundingBox\n" +
        "    if abs(_bb.minPoint.z - 2.0) < 0.01 and abs(_bb.maxPoint.z - 2.0) < 0.01:\n" +
        "        if _e.geometry.objectType == adsk.core.Circle3D.classType():\n" +
        "            _top_edges.add(_e)\n" +
        "if _top_edges.count > 0:\n" +
        "    _fr_in = root.features.filletFeatures.createInput()\n" +
        "    _fr_in.addConstantRadiusEdgeSet(_top_edges, adsk.core.ValueInput.createByReal(0.15), True)\n" +
        "    root.features.filletFeatures.add(_fr_in)",
    },
  },
];

// ── Build + adapt script for /execute (drop wrapper + redundant app= line) ───

const built = fusion360CADGeneratorAdapter.buildScript(ops, {
  documentName: "PRISM_Turbine_Rotor",
  unitIn: "mm",
});

// Pull out the body lines between `try:` and `except:`, dedent 8 spaces, and
// drop the `app = adsk.core.Application.get()` line (the /execute endpoint
// pre-binds `app` in its local namespace).
function adaptForExecute(scriptBody: string): string {
  const lines = scriptBody.split("\n");
  const tryIdx = lines.findIndex((l) => l.trim() === "try:");
  const exceptIdx = lines.findIndex(
    (l, i) => i > tryIdx && /^\s*except:\s*$/.test(l),
  );
  if (tryIdx < 0 || exceptIdx < 0) {
    throw new Error("Could not locate try:/except: block in generated script");
  }
  const inner = lines.slice(tryIdx + 1, exceptIdx);
  const dedented = inner.map((l) => l.replace(/^ {8}/, ""));
  const cleaned = dedented
    .filter((l) => !/^\s*app\s*=\s*adsk\.core\.Application\.get\(\)\s*$/.test(l))
    .filter((l) => !/^\s*ui\s*=\s*app\.userInterface\s*$/.test(l));
  return cleaned.join("\n");
}

const codeForExecute = adaptForExecute(built.body);

// ── POST to PRISMBridge /execute ─────────────────────────────────────────────

const bridgeUrl = "http://127.0.0.1:18360/execute";

console.log(`Posting ${codeForExecute.split("\n").length} lines to ${bridgeUrl}...\n`);

try {
  const res = await fetch(bridgeUrl, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ code: codeForExecute }),
  });
  const text = await res.text();
  let json: unknown;
  try {
    json = JSON.parse(text);
  } catch {
    json = { _raw: text };
  }
  console.log(`HTTP ${res.status} ${res.statusText}`);
  console.log(JSON.stringify(json, null, 2));

  // Pull a fresh /status to confirm geometry landed
  const statusRes = await fetch("http://127.0.0.1:18360/status");
  const status = await statusRes.json();
  console.log(`\n--- Fusion state after run ---`);
  console.log(JSON.stringify(status, null, 2));
} catch (err) {
  console.error(`Failed to reach PRISMBridge: ${err instanceof Error ? err.message : String(err)}`);
  console.error(`\nIs Fusion 360 running with PRISMBridge add-in started?`);
  console.error(`Tools → Add-Ins (Shift+S) → PRISMBridge → Run`);
  process.exit(1);
}
