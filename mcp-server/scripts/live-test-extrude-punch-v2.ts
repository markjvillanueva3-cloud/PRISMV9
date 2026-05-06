/**
 * live-test-extrude-punch-v2.ts — Build JM Die 2475-037 LIVE with Detail A geometry.
 *
 * v2 upgrades over v1 (lessons from cad-blueprint-revolve-2475-037 wiki entry):
 *   • Detail A front-end profile  — Ø.456 tip → Ø.756 transition → Ø.94 flange
 *   • Tapered transitions          — between Ø changes (was sharp steps in v1)
 *   • Central oil hole             — Ø.05 through the entire part
 *   • Typed revolveStepProfile API — no executeRaw boilerplate for the macro shape
 *
 * Run:  npx tsx mcp-server/scripts/live-test-extrude-punch-v2.ts
 */
import { fusion360LiveBridgeEngine as fb } from "../src/engines/Fusion360LiveBridgeEngine.js";

const IN_TO_MM = 25.4;

// ── Profile from drawing 2475-037 (Detail A + main view) ─────────
// Axial Y=0 at the working face (front), grows toward back stub.
const STEPS_IN: Array<{ d_in: number; len_in: number; d_end_in?: number; note: string }> = [
  { d_in: 0.456, len_in: 0.039, note: "working tip Ø.456" },
  { d_in: 0.456, len_in: 0.0325, d_end_in: 0.756, note: "tip → mid-flange tapered transition" },
  { d_in: 0.756, len_in: 0.178, note: "mid-flange Ø.756" },
  { d_in: 0.756, len_in: 0.0325, d_end_in: 0.94, note: "mid-flange → outer-flange tapered transition" },
  // 4.11 − (.039+.0325+.178+.0325 + 1.8334+1.5758+.035+.3375) = 4.11 − 4.0637 = .0463
  { d_in: 0.94, len_in: 0.0463, note: "outer-flange Ø.94 (closes total length to 4.11\")" },
  // sharp step to main shank (drawing shows 8° chamfer; using sharp here — chamfer face
  // is small enough that visual difference is negligible vs the 4.11" overall length)
  { d_in: 0.86, len_in: 1.8334, note: "main shank Ø.86 (z=.3283 → 2.1617)" },
  { d_in: 0.5, len_in: 1.5758, note: "mid relief Ø.5 (z=2.1617 → 3.7375)" },
  { d_in: 0.07, len_in: 0.035, note: "groove Ø.07 (z=3.7375 → 3.7725)" },
  { d_in: 0.12, len_in: 0.3375, note: "back stub Ø.12 (z=3.7725 → 4.11)" },
];

const OIL_HOLE_DIA_IN = 0.05;
const OIL_HOLE_DEPTH_IN = 4.11; // through entire part

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

  ok("new doc", await fb.newDocument("PRISM_2475-037_Extrude_Punch_v2"));

  // ── 1. Revolve the stepped profile via the new typed API ───
  const steps_mm = STEPS_IN.map((s) => ({
    diameter_mm: s.d_in * IN_TO_MM,
    length_mm: s.len_in * IN_TO_MM,
    end_diameter_mm: s.d_end_in !== undefined ? s.d_end_in * IN_TO_MM : undefined,
  }));
  console.log("Profile (mm):");
  for (let i = 0; i < STEPS_IN.length; i++) {
    const s = STEPS_IN[i];
    if (!s) continue;
    const m = steps_mm[i];
    if (!m) continue;
    const tail = s.d_end_in !== undefined ? ` → Ø${(s.d_end_in * IN_TO_MM).toFixed(2)}` : "";
    console.log(`  ${(i + 1).toString().padStart(2)}. Ø${m.diameter_mm.toFixed(2)}${tail}  × ${m.length_mm.toFixed(2)}mm  — ${s.note}`);
  }

  ok(
    "revolveStepProfile",
    await fb.revolveStepProfile({
      steps: steps_mm,
      axis: "Y",
      sketch_name: "PunchProfile_v2",
    }),
  );

  // ── 2. Central oil hole Ø.05 through entire part ────────────
  // The front face of the working tip is at y=0, normal pointing -Y.
  // Use executeRaw because typed createHole requires a face index lookup
  // and we want a precise centered through-hole regardless of face indexing.
  const oilHoleR_cm = (OIL_HOLE_DIA_IN / 2) * IN_TO_MM * 0.1;
  const oilHoleL_cm = OIL_HOLE_DEPTH_IN * IN_TO_MM * 0.1;
  ok(
    "oil hole Ø.05 through",
    await fb.executeRaw(`
app = adsk.core.Application.get()
design = adsk.fusion.Design.cast(app.activeProduct)
root = design.rootComponent
# Sketch on XZ plane (perpendicular to Y axis), centered on origin
sk = root.sketches.add(root.xZConstructionPlane)
sk.name = 'OilHoleProfile'
sk.sketchCurves.sketchCircles.addByCenterRadius(adsk.core.Point3D.create(0, 0, 0), ${oilHoleR_cm.toFixed(6)})
profile = sk.profiles.item(0)
ext_in = root.features.extrudeFeatures.createInput(profile, adsk.fusion.FeatureOperations.CutFeatureOperation)
ext_in.setDistanceExtent(False, adsk.core.ValueInput.createByReal(${oilHoleL_cm.toFixed(6)}))
feat = root.features.extrudeFeatures.add(ext_in)
result = {'success': True, 'feature_name': feat.name, 'body_count': root.bRepBodies.count}
`),
  );

  // ── 3. Verify ───────────────────────────────────────────────
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

  // ── Analytical comparison ───────────────────────────────────
  // Sum trunk volume (each step is a frustum or cylinder) and subtract oil hole.
  let v_in3 = 0;
  for (const s of STEPS_IN) {
    const r1 = s.d_in / 2;
    const r2 = (s.d_end_in ?? s.d_in) / 2;
    // frustum: V = π·L·(r1² + r1·r2 + r2²)/3
    v_in3 += (Math.PI * s.len_in * (r1 * r1 + r1 * r2 + r2 * r2)) / 3;
  }
  const oil_in3 = Math.PI * (OIL_HOLE_DIA_IN / 2) ** 2 * OIL_HOLE_DEPTH_IN;
  v_in3 -= oil_in3;
  const IN3_TO_MM3 = 16387.064;
  const expected_mm3 = v_in3 * IN3_TO_MM3;

  console.log(`\nAnalytical (frustums − Ø.05 oil hole):  ${expected_mm3.toFixed(1)} mm³`);
  console.log(`  trunk: ${(v_in3 + oil_in3).toFixed(4)} in³`);
  console.log(`  oil:   ${oil_in3.toFixed(4)} in³`);
  console.log(`Bbox-X expected:  ${(0.94 * IN_TO_MM).toFixed(2)} mm  (Ø.94 outer flange)`);
  console.log(`Length expected:  ${(4.11 * IN_TO_MM).toFixed(2)} mm`);

  // Delta vs v1
  const v1_mm3 = 26320.6;
  const v2_mm3 = geo.bodies[0]?.volume_mm3 ?? 0;
  console.log(`\nDelta vs v1:   v1=${v1_mm3.toFixed(1)} mm³ → v2=${v2_mm3.toFixed(1)} mm³  (Δ=${(v2_mm3 - v1_mm3).toFixed(1)})`);
}

main().catch((e: unknown) => {
  console.error("\nLIVE TEST CRASHED:", e instanceof Error ? e.stack : e);
  process.exit(2);
});
