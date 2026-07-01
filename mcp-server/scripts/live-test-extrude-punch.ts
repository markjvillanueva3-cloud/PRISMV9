/**
 * live-test-extrude-punch.ts — Build JM Die part 2475-037 (Extrude Punch) live.
 *
 * Source: H:\PRISM\JM DIE\JM DIE COMPANY\2475-037 (EXTRUDE PUNCH) Drawing v3.pdf
 *
 * Method: revolve a sketched half-profile around the long axis. Profile = 5 stepped
 * diameters along the axial direction (drawing reads left-to-right, here built in +Y).
 *
 * Run:  npx tsx mcp-server/scripts/live-test-extrude-punch.ts
 */
import { fusion360LiveBridgeEngine as fb } from "../src/engines/Fusion360LiveBridgeEngine.js";

// ── Profile from drawing 2475-037 ───────────────────────────────
// All values from the title block / dimensions, in inches → cm at runtime.
const IN_TO_CM = 2.54;

// Diameters (inches → radii in cm)
const D_HEAD_IN = 0.94;       // Ø.94 — head/face
const D_SHANK_IN = 0.86;      // Ø.86 (.86/.8595 mid)
const D_MID_IN = 0.5;         // Ø.5 — relief
const D_GROOVE_IN = 0.07;     // Ø.07 — narrow neck
const D_BACK_IN = 0.12;       // Ø.12 — back stub

// Axial transition points (inches from face)
const Z_HEAD_END_IN = 0.3283;     // head ends here
const Z_SHANK_END_IN = 2.1617;    // main shank ends, step to Ø.5
const Z_MID_END_IN = 3.7375;      // Ø.5 ends, step to Ø.07
const Z_GROOVE_END_IN = 3.7725;   // Ø.07 ends, step to Ø.12 (3.7375 + 0.035)
const Z_TOTAL_IN = 4.11;          // overall length

// Convert to cm radii / axial positions
const r_head = (D_HEAD_IN / 2) * IN_TO_CM;
const r_shank = (D_SHANK_IN / 2) * IN_TO_CM;
const r_mid = (D_MID_IN / 2) * IN_TO_CM;
const r_groove = (D_GROOVE_IN / 2) * IN_TO_CM;
const r_back = (D_BACK_IN / 2) * IN_TO_CM;

const z_head = Z_HEAD_END_IN * IN_TO_CM;
const z_shank = Z_SHANK_END_IN * IN_TO_CM;
const z_mid = Z_MID_END_IN * IN_TO_CM;
const z_groove = Z_GROOVE_END_IN * IN_TO_CM;
const z_total = Z_TOTAL_IN * IN_TO_CM;

function ok<T>(label: string, r: T): T {
  const success = (r as { success?: boolean }).success;
  const err = (r as { error?: string }).error;
  console.log(`${success === false ? "✗" : "✓"} ${label}${err ? ` — ${err}` : ""}`);
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

  ok("new doc", await fb.newDocument("PRISM_2475-037_Extrude_Punch"));

  // ── Build half-profile + revolve via executeRaw ─────────────
  // Sketch in XY plane:  X = radial, Y = axial.  Revolve around Y axis (yConstructionAxis) → solid of revolution.
  // Profile is a 12-point closed polyline tracing the outline from axis (origin) clockwise
  // out around the OD steps and back along the right end face to the axis.
  const profilePoints: [number, number][] = [
    [0, 0],
    [r_head, 0],
    [r_head, z_head],
    [r_shank, z_head],
    [r_shank, z_shank],
    [r_mid, z_shank],
    [r_mid, z_mid],
    [r_groove, z_mid],
    [r_groove, z_groove],
    [r_back, z_groove],
    [r_back, z_total],
    [0, z_total],
  ];

  const ptLines = profilePoints
    .map(([x, y], i) => `p${i} = adsk.core.Point3D.create(${x.toFixed(6)}, ${y.toFixed(6)}, 0)`)
    .join("\n");
  const lineLines = profilePoints
    .map((_, i) => {
      const j = (i + 1) % profilePoints.length;
      return `lines.addByTwoPoints(p${i}, p${j})`;
    })
    .join("\n");

  ok(
    "sketch + revolve punch",
    await fb.executeRaw(`
app = adsk.core.Application.get()
design = adsk.fusion.Design.cast(app.activeProduct)
root = design.rootComponent

# Sketch on XY plane, build closed polyline = right-half profile of punch
sk = root.sketches.add(root.xYConstructionPlane)
sk.name = 'PunchProfile'
lines = sk.sketchCurves.sketchLines

${ptLines}

${lineLines}

# Sanity: must form one closed profile
if sk.profiles.count != 1:
    result = {'success': False, 'error': f'expected 1 profile, got {sk.profiles.count}'}
else:
    profile = sk.profiles.item(0)
    rev_in = root.features.revolveFeatures.createInput(
        profile,
        root.yConstructionAxis,
        adsk.fusion.FeatureOperations.NewBodyFeatureOperation,
    )
    rev_in.setAngleExtent(False, adsk.core.ValueInput.createByString('360 deg'))
    feat = root.features.revolveFeatures.add(rev_in)
    result = {'success': True, 'feature_name': feat.name, 'body_count': root.bRepBodies.count}
`),
  );

  // ── Verify ───────────────────────────────────────────────────
  const geo = (await fb.getGeometry()) as {
    body_count: number;
    bodies: Array<{ name: string; volume_mm3: number; area_mm2: number; bounding_box_mm: number[]; face_count: number }>;
  };

  console.log("\n── final geometry ──");
  console.log(`bodies: ${geo.body_count}`);
  for (const b of geo.bodies) {
    console.log(
      `  ${b.name}: V=${b.volume_mm3.toFixed(1)}mm³ · A=${b.area_mm2.toFixed(1)}mm² · bbox=${b.bounding_box_mm.map((v) => v.toFixed(2)).join("×")}mm · faces=${b.face_count}`,
    );
  }

  // Analytical truth: sum of 5 cylinder volumes (in inches³ → mm³)
  // V_i = π · r_i² · L_i
  const segs: Array<[string, number, number]> = [
    ["head", D_HEAD_IN / 2, Z_HEAD_END_IN],
    ["shank", D_SHANK_IN / 2, Z_SHANK_END_IN - Z_HEAD_END_IN],
    ["mid", D_MID_IN / 2, Z_MID_END_IN - Z_SHANK_END_IN],
    ["groove", D_GROOVE_IN / 2, Z_GROOVE_END_IN - Z_MID_END_IN],
    ["back", D_BACK_IN / 2, Z_TOTAL_IN - Z_GROOVE_END_IN],
  ];
  const IN3_TO_MM3 = 16387.064;
  const total = segs.reduce((s, [, r, L]) => s + Math.PI * r * r * L, 0) * IN3_TO_MM3;
  console.log(`\nAnalytical (sum of 5 cylinder steps):  ${total.toFixed(1)} mm³`);
  console.log(`Length expected:  ${(Z_TOTAL_IN * 25.4).toFixed(1)} mm`);
  console.log(`Bbox-X expected:  ${(D_HEAD_IN * 25.4).toFixed(1)} mm  (Ø.94 head)`);
}

main().catch((e: unknown) => {
  console.error("\nLIVE TEST CRASHED:", e instanceof Error ? e.stack : e);
  process.exit(2);
});
