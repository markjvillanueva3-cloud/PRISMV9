/**
 * live-test-turbine-rotor.ts — Drive the FULL 8-blade turbine rotor LIVE.
 *
 * Exercises every advanced path the typed bridge does not cover:
 *   • taperAngle on extrude        (executeRaw, Fusion API direct)
 *   • circular pattern of bodies    (typed bridge /pattern)
 *   • multi-body boolean join       (typed bridge /combine)
 *   • body.edges introspection +
 *     fillet of selected circular
 *     edges                        (executeRaw — same path as static rotor)
 *
 * Requires PRISMBridge add-in running on localhost:18360.
 *
 * Run:  npx tsx mcp-server/scripts/live-test-turbine-rotor.ts
 */
import { fusion360LiveBridgeEngine as fb } from "../src/engines/Fusion360LiveBridgeEngine.js";

const HUB_R_MM = 25;
const HUB_H_MM = 20;
const BORE_R_MM = 5;
const BORE_DEPTH_MM = 25;
const BLADE_W_MM = 3;
const BLADE_RADIAL_MM = 35;
const BLADE_H_MM = 30;
const BLADE_TAPER_DEG = 15;
const BLADE_COUNT = 8;
const HUB_FILLET_R_MM = 1.5;

function ok<T>(label: string, r: T): T {
  const success = (r as { success?: boolean }).success;
  const err = (r as { error?: string }).error;
  const status = success === false ? "✗" : "✓";
  console.log(`${status} ${label}${err ? ` — ${err}` : ""}`);
  if (success === false) {
    console.error(JSON.stringify(r, null, 2));
    process.exit(2);
  }
  return r;
}

async function main(): Promise<void> {
  if (!(await fb.healthCheck())) {
    console.error("FAIL: Fusion bridge not reachable on :18360");
    process.exit(1);
  }
  console.log("✓ bridge healthy\n");

  // ── 1. Fresh document ─────────────────────────────────────────
  ok("new doc", await fb.newDocument("PRISM_Turbine_Rotor_LIVE"));

  // ── 2. Hub disk Ø50 × 20mm ────────────────────────────────────
  ok(
    "hub sketch",
    await fb.createSketch({
      plane: "XY",
      shapes: [{ type: "circle", center_x_mm: 0, center_y_mm: 0, radius_mm: HUB_R_MM }],
    }),
  );
  ok("hub extrude", await fb.extrude({ depth_mm: HUB_H_MM, operation: "new" }));

  // ── 3. Through-bore Ø10 cut ───────────────────────────────────
  ok(
    "bore sketch",
    await fb.createSketch({
      plane: "XY",
      shapes: [{ type: "circle", center_x_mm: 0, center_y_mm: 0, radius_mm: BORE_R_MM }],
    }),
  );
  ok("bore cut", await fb.extrude({ depth_mm: BORE_DEPTH_MM, operation: "cut" }));

  // ── 4. Blade w/ 15° taper as a NEW body (executeRaw — typed
  //    bridge does not surface taperAngle) ─────────────────────
  // Root just inside hub OD (x=23..58), 3mm wide centred on +X axis.
  // Sketch on top face (z = HUB_H_MM cm), extrude up 30mm with 15° draft.
  const taperRad = (BLADE_TAPER_DEG * Math.PI) / 180;
  const x0 = (HUB_R_MM - 2) / 10; // cm
  const x1 = x0 + BLADE_RADIAL_MM / 10;
  const y0 = (-BLADE_W_MM / 2) / 10;
  const y1 = (BLADE_W_MM / 2) / 10;
  const zTop = HUB_H_MM / 10;
  const blade = ok(
    "blade taper-extrude",
    await fb.executeRaw(`
app = adsk.core.Application.get()
design = adsk.fusion.Design.cast(app.activeProduct)
root = design.rootComponent

# Sketch on top face of hub at z=${zTop}cm
xy_offset = root.constructionPlanes.createInput()
plane_input = adsk.core.ValueInput.createByReal(${zTop})
xy_offset.setByOffset(root.xYConstructionPlane, plane_input)
top_plane = root.constructionPlanes.add(xy_offset)
sk = root.sketches.add(top_plane)
sk.name = 'BladeProfile'
lines = sk.sketchCurves.sketchLines
p1 = adsk.core.Point3D.create(${x0}, ${y0}, 0)
p2 = adsk.core.Point3D.create(${x1}, ${y1}, 0)
lines.addTwoPointRectangle(p1, p2)

# Extrude with taperAngle and operation=NewBody
ext_in = root.features.extrudeFeatures.createInput(
    sk.profiles.item(0),
    adsk.fusion.FeatureOperations.NewBodyFeatureOperation,
)
ext_in.setDistanceExtent(False, adsk.core.ValueInput.createByReal(${BLADE_H_MM / 10}))
ext_in.taperAngle = adsk.core.ValueInput.createByReal(${taperRad.toFixed(6)})
feat = root.features.extrudeFeatures.add(ext_in)
result = {'success': True, 'feature_name': feat.name, 'body_count': root.bRepBodies.count}
`),
  );
  console.log(`   feature: ${(blade as { result?: { feature_name?: string } }).result?.feature_name}`);

  // ── 5. Circular pattern blade body × 8 around Z ─────────────
  ok(
    "pattern 8 blades",
    await fb.pattern({ type: "circular", count: BLADE_COUNT, axis: "Z", total_angle_deg: 360 }),
  );

  // ── 6. Combine all blade bodies into hub ────────────────────
  // After pattern: body[0]=hub, body[1..8]=blade bodies (some may be merged into pattern feature bodies).
  // Use executeRaw to enumerate and join — count is dynamic.
  ok(
    "combine all into hub",
    await fb.executeRaw(`
app = adsk.core.Application.get()
design = adsk.fusion.Design.cast(app.activeProduct)
root = design.rootComponent
n = root.bRepBodies.count
result = {'success': True, 'body_count_before': n}
if n >= 2:
    target = root.bRepBodies.item(0)
    tools = adsk.core.ObjectCollection.create()
    for i in range(1, n):
        tools.add(root.bRepBodies.item(i))
    combine_input = root.features.combineFeatures.createInput(target, tools)
    combine_input.operation = adsk.fusion.FeatureOperations.JoinFeatureOperation
    feat = root.features.combineFeatures.add(combine_input)
    result['feature_name'] = feat.name
    result['body_count_after'] = root.bRepBodies.count
`),
  );

  // ── 7. Fillet top hub edge (z = 2.0cm circular edges) ───────
  ok(
    "fillet top hub",
    await fb.executeRaw(`
app = adsk.core.Application.get()
design = adsk.fusion.Design.cast(app.activeProduct)
root = design.rootComponent
body = root.bRepBodies.item(0)
top_edges = adsk.core.ObjectCollection.create()
for e in body.edges:
    bb = e.boundingBox
    if abs(bb.minPoint.z - ${zTop}) < 0.01 and abs(bb.maxPoint.z - ${zTop}) < 0.01:
        if e.geometry.objectType == adsk.core.Circle3D.classType():
            top_edges.add(e)
result = {'success': True, 'edges_found': top_edges.count}
if top_edges.count > 0:
    fr_in = root.features.filletFeatures.createInput()
    fr_in.addConstantRadiusEdgeSet(top_edges, adsk.core.ValueInput.createByReal(${HUB_FILLET_R_MM / 10}), True)
    feat = root.features.filletFeatures.add(fr_in)
    result['feature_name'] = feat.name
`),
  );

  // ── 8. Verify geometry ───────────────────────────────────────
  const geo = (await fb.getGeometry()) as { body_count: number; bodies: Array<{ name: string; volume_mm3: number; area_mm2: number; bounding_box_mm: number[]; face_count: number }> };
  console.log("\n── final geometry ──");
  console.log(`bodies: ${geo.body_count}`);
  for (const b of geo.bodies) {
    console.log(
      `  ${b.name}: V=${b.volume_mm3.toFixed(1)}mm³ · A=${b.area_mm2.toFixed(1)}mm² · bbox=${b.bounding_box_mm.map((v) => v.toFixed(1)).join("×")} · faces=${b.face_count}`,
    );
  }

  // Expected hub volume (no blades, no bore): π·25²·20 = 39269.9
  // With Ø10 bore through 20mm: -π·5²·20 = -1570.8 → hub net = 37699.1
  // 8 blades (idealised straight prism, ignoring taper):  3·35·30 = 3150 each → 25200 total
  // Real geometry = 37699 + (tapered-blade volumes ≈ 22000-24000) ≈ 60k mm³
  const v = geo.bodies[0]?.volume_mm3 ?? 0;
  console.log(`\nVolume check: ${v.toFixed(1)}mm³  (expected ~58000-65000 with 8 tapered blades + bore)`);
}

main().catch((e: unknown) => {
  console.error("\nLIVE TEST CRASHED:", e instanceof Error ? e.stack : e);
  process.exit(2);
});
