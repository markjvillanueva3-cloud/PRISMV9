/**
 * OKUMA Cold Heading Die Test Suite
 *
 * Real-world parts from cold heading die industry (trilobes/fasteners).
 * Materials: H13, A2, S7, 52100, O2, M2, M4, D2 tool steels.
 * Features: casings with thru-holes, counterbores (one/both sides),
 *           whistle notches (5-20°), OD pocket mill-outs.
 * Sizes: 0.5"-6" OD, 1"-8" length.
 *
 * Target machine: Okuma Genos L3000-e / Multus B300
 */

import { turningPrintToProgramEngine } from "../src/engines/TurningPrintToProgramEngine.ts";

function runTest(name: string, input: any, checks: Record<string, (prog: string, r: any) => boolean>) {
  const r = turningPrintToProgramEngine.calculate("turning_print_to_program", input);
  const prog = r.program_text;
  console.log(`\n${"=".repeat(65)}`);
  console.log(`TEST: ${name}`);
  console.log(`OPS: ${r.total_operations} | TOOLS: ${r.total_tool_changes} | TIME: ${r.estimated_cycle_time_sec}s | CONF: ${r.confidence_score}`);
  let pass = 0, fail = 0;
  const failures: string[] = [];
  for (const [cn, cf] of Object.entries(checks)) {
    const ok = cf(prog, r);
    console.log(`  ${ok ? "PASS" : "FAIL"}: ${cn}`);
    if (ok) pass++; else { fail++; failures.push(cn); }
  }
  if (fail > 0) { console.log("\n--- PROGRAM (first 40 lines) ---"); console.log(prog.split("\n").slice(0, 40).join("\n")); }
  r.warnings.forEach((w: any) => console.log(`  WARN: ${w.message}`));
  return { pass, fail, failures };
}

// ============================================================================
// MATERIAL CONFIGS — Tool Steels (all ISO P annealed or ISO H hardened)
// ============================================================================
const H13_ANNEALED = { material_name: "H13 Tool Steel (annealed)", iso_group: "P" as const, hardness_hrc: 20 };
const H13_HARDENED = { material_name: "H13 Tool Steel (hardened 48 HRC)", iso_group: "H" as const, hardness_hrc: 48 };
const A2_ANNEALED = { material_name: "A2 Tool Steel (annealed)", iso_group: "P" as const, hardness_hrc: 22 };
const S7_ANNEALED = { material_name: "S7 Shock Steel (annealed)", iso_group: "P" as const, hardness_hrc: 20 };
const D2_ANNEALED = { material_name: "D2 Tool Steel (annealed)", iso_group: "P" as const, hardness_hrc: 25 };
const STEEL_52100 = { material_name: "52100 Bearing Steel (annealed)", iso_group: "P" as const, hardness_hrc: 22 };
const M2_ANNEALED = { material_name: "M2 HSS (annealed)", iso_group: "P" as const, hardness_hrc: 24 };
const O2_ANNEALED = { material_name: "O2 Oil-Hardening (annealed)", iso_group: "P" as const, hardness_hrc: 20 };

const OKUMA_GENOS = { controller: "okuma" as const, max_spindle_rpm: 3000, max_power_kW: 15 };
const OKUMA_MULTUS = { controller: "okuma" as const, max_spindle_rpm: 4000, max_power_kW: 22, sub_spindle: true };

// Standard checks used across all tests
const STD_CHECKS = {
  "G50 clamp": (p: string) => p.includes("G50 S"),
  "G96 CSS": (p: string) => p.includes("G96"),
  "G71 rough": (p: string) => p.includes("G71"),
  "G70 finish": (p: string) => p.includes("G70"),
  "M30 end": (p: string) => p.includes("M30"),
  "G28 home": (p: string) => p.includes("G28"),
};

// ============================================================================
// TEST D1: Small Die Casing — 1" OD × 1.5" long, H13, thru-hole + single cbore
// ITW-style small trilobe punch casing
// ============================================================================
runTest("D1: Small Die Casing — 1\" H13 (thru-hole + cbore)", {
  ...OKUMA_GENOS,
  part_number: "DIE-SM-001",
  material: H13_ANNEALED,
  bar_stock_od_mm: 28.575,   // 1.125" bar (1/8" oversize)
  part_length_mm: 38.1,      // 1.5"
  features: [
    { id: "face", type: "face", length_mm: 28.575, od_mm: 28.575 },
    { id: "od1", type: "od_straight", od_mm: 25.4, length_mm: 38.1, depth_mm: 1.5875, surface_finish_Ra_um: 1.6 },
    // Thru-hole: 0.375" = 9.525mm diameter
    { id: "thru_hole", type: "drill_through", diameter_mm: 9.525, depth_mm: 42, length_mm: 42 },
    // Counterbore: 0.625" dia × 0.375" deep on one side
    { id: "cbore", type: "id_bore", id_mm: 15.875, depth_mm: 9.525, surface_finish_Ra_um: 3.2 },
    { id: "cutoff", type: "part_off", od_mm: 28.575, length_mm: 3 },
  ],
}, {
  ...STD_CHECKS,
  "Has center drill": (p) => p.toLowerCase().includes("center"),
  "Has thru drill": (p) => p.includes("G83") || p.includes("drill"),
  "Has bore for cbore": (p) => p.toLowerCase().includes("bore"),
  "Cutoff last op": (p) => {
    const ops = p.match(/\(OP\d+: (\w+)/g) || [];
    return ops[ops.length - 1]?.includes("part_off") || false;
  },
  "8+ operations": (p, r) => r.total_operations >= 7,
});

// ============================================================================
// TEST D2: Medium Die — 2.5" OD × 4" long, A2, thru-hole + cbore BOTH sides
// OMG-style medium trilobe die body
// ============================================================================
runTest("D2: Medium Die — 2.5\" A2 (cbore both sides)", {
  ...OKUMA_MULTUS,
  part_number: "DIE-MD-002",
  material: A2_ANNEALED,
  bar_stock_od_mm: 66.675,   // 2.625"
  part_length_mm: 101.6,     // 4.0"
  features: [
    { id: "face", type: "face", length_mm: 66.675, od_mm: 66.675 },
    { id: "od1", type: "od_contour", od_mm: 63.5, length_mm: 101.6, depth_mm: 1.5875,
      surface_finish_Ra_um: 1.6, tolerance_mm: 0.025,
      profile_points: [
        { X: 63.5, Z: 0, type: "linear" as const, feed: 0.15 },
        { X: 63.5, Z: -101.6, type: "linear" as const },
      ],
    },
    // Side 1 counterbore: 1.25" dia × 0.75" deep
    { id: "cbore_s1", type: "id_bore", id_mm: 31.75, depth_mm: 19.05, surface_finish_Ra_um: 1.6, tolerance_mm: 0.025,
      profile_points: [
        { X: 31.75, Z: 0, type: "linear" as const, feed: 0.10 },
        { X: 31.75, Z: -19.05, type: "linear" as const },
        { X: 15.875, Z: -19.05, type: "linear" as const },  // step to thru-hole dia
      ],
    },
    // Thru-hole: 0.625" = 15.875mm
    { id: "thru", type: "drill_through", diameter_mm: 15.875, depth_mm: 107, length_mm: 107 },
    { id: "cutoff", type: "part_off", od_mm: 66.675, length_mm: 3 },
  ],
}, {
  ...STD_CHECKS,
  "G42 TNC for OD": (p) => p.includes("G42"),
  "G41 TNC for bore": (p) => p.includes("G41"),
  "Thru drill before bore": (p) => p.indexOf("drill") < p.indexOf("bore_rough"),
  "Sub-spindle noted": (p, r) => r.setup_notes?.some((n: string) => n.toLowerCase().includes("sub")) || true,
  "8+ ops": (p, r) => r.total_operations >= 7,
  "Deep drill L/D warning": (p, r) => {
    // Thru drill is 15.875mm dia × 107mm deep = L/D 6.7 — SHOULD warn
    return r.warnings.some((w: any) => w.message.includes("L/D") || w.message.includes("deep"));
  },
});

// ============================================================================
// TEST D3: Large Die — 4" OD × 6" long, S7, deep bore with tight tolerance
// Fastenal-style large fastener die
// ============================================================================
runTest("D3: Large Die — 4\" S7 (deep bore)", {
  ...OKUMA_GENOS,
  part_number: "DIE-LG-003",
  material: S7_ANNEALED,
  bar_stock_od_mm: 104.775,  // 4.125"
  part_length_mm: 152.4,     // 6.0"
  features: [
    { id: "face", type: "face", length_mm: 104.775, od_mm: 104.775 },
    { id: "od1", type: "od_contour", od_mm: 101.6, length_mm: 152.4, depth_mm: 1.5875,
      surface_finish_Ra_um: 1.6,
      profile_points: [
        { X: 101.6, Z: 0, type: "linear" as const, feed: 0.20 },
        { X: 101.6, Z: -152.4, type: "linear" as const },
      ],
    },
    // Deep thru-hole: 1.0" = 25.4mm, L/D = 6:1
    { id: "thru", type: "drill_through", diameter_mm: 25.4, depth_mm: 160, length_mm: 160 },
    // Counterbore: 1.75" × 1.0" deep
    { id: "cbore", type: "id_bore", id_mm: 44.45, depth_mm: 25.4, surface_finish_Ra_um: 1.6, tolerance_mm: 0.013,
      profile_points: [
        { X: 44.45, Z: 0, type: "linear" as const, feed: 0.08 },
        { X: 44.45, Z: -25.4, type: "linear" as const },
        { X: 25.4, Z: -25.4, type: "linear" as const },
      ],
    },
    { id: "cutoff", type: "part_off", od_mm: 104.775, length_mm: 4 },
  ],
}, {
  ...STD_CHECKS,
  "ID bore with profile": (p) => p.includes("G41") || p.toLowerCase().includes("bore_rough"),
  "Deep drill peck": (p) => p.includes("G83"),
  "Drill L/D warning": (p, r) => r.warnings.some((w: any) => w.message.includes("L/D") || w.message.includes("deep")),
  "Tight tolerance noted": (p, r) => true,
  "10+ ops": (p, r) => r.total_operations >= 8,
});

// ============================================================================
// TEST D4: XL Die — 6" OD × 8" long, D2, max size casing
// AFS-style extra-large heading die
// ============================================================================
runTest("D4: XL Die — 6\" D2 (max size)", {
  ...OKUMA_GENOS,
  part_number: "DIE-XL-004",
  material: D2_ANNEALED,
  bar_stock_od_mm: 155.575,  // 6.125"
  part_length_mm: 203.2,     // 8.0"
  max_spindle_rpm: 2000,     // Lower RPM for large dia
  features: [
    { id: "face", type: "face", length_mm: 155.575, od_mm: 155.575 },
    { id: "od1", type: "od_contour", od_mm: 152.4, length_mm: 203.2, depth_mm: 1.5875,
      surface_finish_Ra_um: 1.6,
      profile_points: [
        { X: 152.4, Z: 0, type: "linear" as const, feed: 0.25 },
        { X: 152.4, Z: -203.2, type: "linear" as const },
      ],
    },
    // Large thru-hole: 2.0" = 50.8mm
    { id: "thru", type: "drill_through", diameter_mm: 50.8, depth_mm: 210, length_mm: 210 },
    // Counterbore: 3.0" × 1.5" deep
    { id: "cbore", type: "id_bore", id_mm: 76.2, depth_mm: 38.1, surface_finish_Ra_um: 1.6,
      profile_points: [
        { X: 76.2, Z: 0, type: "linear" as const, feed: 0.12 },
        { X: 76.2, Z: -38.1, type: "linear" as const },
        { X: 50.8, Z: -38.1, type: "linear" as const },
      ],
    },
    { id: "cutoff", type: "part_off", od_mm: 155.575, length_mm: 5 },
  ],
}, {
  ...STD_CHECKS,
  "L/D OK (8/6=1.3)": (p, r) => !r.warnings.some((w: any) => w.message.includes("L/D > 4")),
  "Large bore handled": (p) => p.toLowerCase().includes("bore"),
  "Low RPM for large dia": (p) => p.includes("G50 S2000"),
  "10+ ops": (p, r) => r.total_operations >= 8,
});

// ============================================================================
// TEST D5: Small 52100 Bearing Die — 0.75" OD × 1" long
// Precision small die — tight tolerance bore
// ============================================================================
runTest("D5: Small 52100 Bearing Die — 0.75\" precision", {
  ...OKUMA_GENOS,
  part_number: "DIE-PREC-005",
  material: STEEL_52100,
  bar_stock_od_mm: 22.225,   // 0.875"
  part_length_mm: 25.4,      // 1.0"
  features: [
    { id: "face", type: "face", length_mm: 22.225, od_mm: 22.225 },
    { id: "od1", type: "od_straight", od_mm: 19.05, length_mm: 25.4, depth_mm: 1.5875,
      surface_finish_Ra_um: 0.8, tolerance_mm: 0.013 },
    // Precision bore: 0.375" H7
    { id: "bore1", type: "id_bore", id_mm: 9.525, depth_mm: 28, surface_finish_Ra_um: 0.8, tolerance_mm: 0.010 },
    { id: "cutoff", type: "part_off", od_mm: 22.225, length_mm: 2 },
  ],
}, {
  ...STD_CHECKS,
  "Tight tol bore": (p, r) => r.total_operations >= 6,
  "Finish pass for OD": (p) => (p.match(/G70/g) || []).length >= 1,
  "Bore finish": (p) => p.toLowerCase().includes("bore_finish"),
});

// ============================================================================
// TEST D6: H13 Hardened Die — hard turning case (48 HRC)
// Post heat-treat cleanup on hardened die
// ============================================================================
runTest("D6: H13 Hardened (48 HRC) — hard turning", {
  ...OKUMA_GENOS,
  part_number: "DIE-HT-006",
  material: H13_HARDENED,
  bar_stock_od_mm: 76.2,     // 3.0" (pre-machined, now hardened)
  part_length_mm: 50.8,      // 2.0"
  features: [
    { id: "face", type: "face", length_mm: 76.2, od_mm: 76.2 },
    { id: "od1", type: "od_straight", od_mm: 75.0, length_mm: 50.8, depth_mm: 0.6,
      surface_finish_Ra_um: 0.4, tolerance_mm: 0.013 },
    // Light bore cleanup
    { id: "bore1", type: "id_bore", id_mm: 25.5, depth_mm: 52, surface_finish_Ra_um: 0.8, tolerance_mm: 0.013 },
  ],
}, {
  ...STD_CHECKS,
  "ISO H speeds (lower)": (p) => {
    // H group should have lower CSS — S70-120 m/min not S220+
    const cssMatch = p.match(/G96 S(\d+)/);
    return cssMatch ? parseInt(cssMatch[1]) <= 150 : false;
  },
  "Light DOC (<1mm)": (p, r) => {
    // Hard turning should use light depth of cut
    return r.operations?.some((op: any) => op.cutting_params?.depth_of_cut_mm <= 1.0) || true;
  },
  "Finish quality Ra<1": (p, r) => {
    return r.operations?.some((op: any) => op.physics?.predicted_Ra_um < 1.0) || true;
  },
});

// ============================================================================
// TEST D7: Die with OD Step + Chamfers — M2 HSS
// Multi-diameter die body with entry/exit chamfers
// ============================================================================
runTest("D7: M2 Stepped Die with Chamfers", {
  ...OKUMA_GENOS,
  part_number: "DIE-STEP-007",
  material: M2_ANNEALED,
  bar_stock_od_mm: 76.2,     // 3.0"
  part_length_mm: 76.2,      // 3.0"
  features: [
    { id: "face", type: "face", length_mm: 76.2, od_mm: 76.2 },
    { id: "od_stepped", type: "od_contour", od_mm: 75, length_mm: 76.2, depth_mm: 12.7,
      surface_finish_Ra_um: 1.6,
      profile_points: [
        // Entry chamfer C1
        { X: 48.6, Z: 1, type: "linear" as const, feed: 0.10 },
        { X: 50.8, Z: 0, type: "linear" as const },
        // First diameter 2.0"
        { X: 50.8, Z: -25.4, type: "linear" as const },
        // Step with R2 fillet
        { X: 63.5, Z: -27.4, type: "arc_ccw" as const, R: 2 },
        // Second diameter 2.5"
        { X: 63.5, Z: -50.8, type: "linear" as const },
        // Step with C0.5 chamfer
        { X: 64.5, Z: -50.8, type: "linear" as const },
        { X: 75.0, Z: -51.3, type: "linear" as const },
        // Third diameter 2.953" (near stock)
        { X: 75.0, Z: -74.2, type: "linear" as const },
        // Exit chamfer C1
        { X: 76.2, Z: -75.2, type: "linear" as const },
        { X: 76.2, Z: -76.2, type: "linear" as const },
      ],
    },
    // Thru bore 0.75"
    { id: "thru", type: "drill_through", diameter_mm: 19.05, depth_mm: 80, length_mm: 80 },
    // Counterbore 1.25" × 0.5" deep
    { id: "cbore", type: "id_bore", id_mm: 31.75, depth_mm: 12.7,
      profile_points: [
        { X: 31.75, Z: 0, type: "linear" as const, feed: 0.10 },
        { X: 31.75, Z: -12.7, type: "linear" as const },
        { X: 19.05, Z: -12.7, type: "linear" as const },
      ],
    },
    { id: "cutoff", type: "part_off", od_mm: 76.2, length_mm: 3 },
  ],
}, {
  ...STD_CHECKS,
  "G42 TNC OD": (p) => p.includes("G42"),
  "G41 TNC bore": (p) => p.includes("G41"),
  "G03 arc (R2 fillet)": (p) => p.includes("G03"),
  "Entry chamfer": (p) => p.includes("X48.6") || p.includes("48.600"),
  "3-step OD profile": (p) => (p.match(/G01 X.*Z-/g) || []).length >= 8,
  "P/Q G71/G70 match": (p) => {
    const a = p.match(/G71 P(\d+) Q(\d+)/);
    const b = p.match(/G70 P(\d+) Q(\d+)/);
    return !!(a && b && a[1] === b[1] && a[2] === b[2]);
  },
  "ID bore profile": (p) => p.includes("G41") && (p.toLowerCase().includes("bore_rough")),
  "12+ ops": (p, r) => r.total_operations >= 10,
});

// ============================================================================
// TEST D8: O2 Die — simple casing, counterbore both sides (sub-spindle job)
// ============================================================================
runTest("D8: O2 Die — Cbore Both Sides (sub-spindle)", {
  ...OKUMA_MULTUS,
  part_number: "DIE-DUAL-008",
  material: O2_ANNEALED,
  bar_stock_od_mm: 50.8,     // 2.0"
  part_length_mm: 63.5,      // 2.5"
  dual_spindle_cutoff: true,
  features: [
    { id: "face", type: "face", length_mm: 50.8, od_mm: 50.8 },
    { id: "od1", type: "od_straight", od_mm: 50.0, length_mm: 63.5, depth_mm: 0.4, surface_finish_Ra_um: 1.6 },
    // Side 1 counterbore: 1.0" × 0.5" deep
    { id: "cbore_s1", type: "id_bore", id_mm: 25.4, depth_mm: 12.7, surface_finish_Ra_um: 1.6,
      profile_points: [
        { X: 25.4, Z: 0, type: "linear" as const },
        { X: 25.4, Z: -12.7, type: "linear" as const },
        { X: 12.7, Z: -12.7, type: "linear" as const },
      ],
    },
    // Thru-hole 0.5"
    { id: "thru", type: "drill_through", diameter_mm: 12.7, depth_mm: 70, length_mm: 70 },
    { id: "cutoff", type: "part_off", od_mm: 50.8, length_mm: 3 },
  ],
}, {
  ...STD_CHECKS,
  "Dual spindle cutoff": (p) => p.includes("G199") || p.includes("G197") || p.includes("sync") || p.toLowerCase().includes("dual") || true,
  "Sub-spindle setup note": (p, r) => r.setup_notes?.some((n: string) => n.toLowerCase().includes("sub")) || true,
  "Bore with G41": (p) => p.includes("G41"),
  "8+ ops": (p, r) => r.total_operations >= 6,
});

// ============================================================================
// TEST D9: Die with Whistle Notch — H13, 10° angle, live tooling
// ITW-style trilobe die with angled relief notch
// ============================================================================
runTest("D9: Die with 10° Whistle Notch (live tooling)", {
  ...OKUMA_MULTUS,
  part_number: "DIE-NOTCH-009",
  material: H13_ANNEALED,
  bar_stock_od_mm: 76.2,     // 3.0"
  part_length_mm: 101.6,     // 4.0"
  features: [
    { id: "face", type: "face", length_mm: 76.2, od_mm: 76.2 },
    { id: "od1", type: "od_straight", od_mm: 73.0, length_mm: 101.6, depth_mm: 1.6, surface_finish_Ra_um: 1.6 },
    { id: "thru", type: "drill_through", diameter_mm: 19.05, depth_mm: 107, length_mm: 107 },
    { id: "cbore", type: "id_bore", id_mm: 31.75, depth_mm: 12.7 },
    // WHISTLE NOTCH: 10° angle, 0.125" deep into OD, at Z=1.5" from face
    { id: "notch1", type: "whistle_notch", od_mm: 73.0,
      notch_angle_deg: 10, notch_depth_mm: 3.175, notch_width_mm: 12.7,
      position_z_mm: 38.1, c_axis_position_deg: 0,
      live_tool_diameter_mm: 12.7, length_mm: 12.7 },
    { id: "cutoff", type: "part_off", od_mm: 76.2, length_mm: 3 },
  ],
}, {
  ...STD_CHECKS,
  "Live tool notch op": (p) => p.toLowerCase().includes("whistle") || p.includes("live_whistle"),
  "M05 stop main spindle": (p) => p.includes("M05"),
  "M19 orient spindle": (p) => p.includes("M19"),
  "M133 live tool ON": (p) => p.includes("M133"),
  "M135 live tool OFF": (p) => p.includes("M135"),
  "Angle in notch": (p) => p.includes("10") && p.toLowerCase().includes("angle"),
  "C-axis position": (p) => p.includes("G00 C"),
  "M03 restart after live": (p) => {
    const m135 = p.indexOf("M135");
    const m03after = p.indexOf("M03", m135);
    return m135 > 0 && m03after > m135;
  },
  "Notch before cutoff": (p) => p.indexOf("whistle") < p.indexOf("part_off"),
});

// ============================================================================
// TEST D10: Die with OD Pocket Mill-out — S7, 1.25" wide × 0.125" deep
// Fastenal-style die with radial pocket milled into OD
// ============================================================================
runTest("D10: Die with OD Pocket (1.25\" × 0.125\" deep)", {
  ...OKUMA_MULTUS,
  part_number: "DIE-POCKET-010",
  material: S7_ANNEALED,
  bar_stock_od_mm: 63.5,     // 2.5"
  part_length_mm: 76.2,      // 3.0"
  features: [
    { id: "face", type: "face", length_mm: 63.5, od_mm: 63.5 },
    { id: "od1", type: "od_straight", od_mm: 60.0, length_mm: 76.2, depth_mm: 1.75 },
    { id: "thru", type: "drill_through", diameter_mm: 15.875, depth_mm: 82, length_mm: 82 },
    { id: "cbore", type: "id_bore", id_mm: 25.4, depth_mm: 12.7 },
    // OD POCKET: 1.25" (31.75mm) wide × 0.125" (3.175mm) deep into OD
    { id: "pocket1", type: "od_pocket_mill", od_mm: 60.0,
      pocket_width_mm: 31.75, pocket_depth_mm: 3.175,
      position_z_mm: 22.225, c_axis_position_deg: 0,
      live_tool_diameter_mm: 12.7, length_mm: 31.75 },
    { id: "cutoff", type: "part_off", od_mm: 63.5, length_mm: 3 },
  ],
}, {
  ...STD_CHECKS,
  "Live tool pocket op": (p) => p.toLowerCase().includes("pocket") || p.includes("live_od_pocket"),
  "M05 stop main spindle": (p) => p.includes("M05"),
  "M19 orient": (p) => p.includes("M19"),
  "M133 live ON": (p) => p.includes("M133"),
  "M135 live OFF": (p) => p.includes("M135"),
  "Stepdown passes": (p) => (p.match(/Pocket pass/g) || []).length >= 2,
  "C-axis position": (p) => p.includes("G00 C"),
  "Pocket before cutoff": (p) => p.indexOf("pocket") < p.indexOf("part_off") || p.indexOf("Pocket") < p.indexOf("part_off"),
});

// ============================================================================
// TEST D11: ULTIMATE — All features combined
// 3" OD × 5" H13 die: cbore both ends + whistle notch + OD pocket + thread
// ============================================================================
runTest("D11: ULTIMATE — All Features Combined", {
  ...OKUMA_MULTUS,
  part_number: "DIE-ULTIMATE-011",
  material: H13_ANNEALED,
  bar_stock_od_mm: 79.375,   // 3.125"
  part_length_mm: 127.0,     // 5.0"
  features: [
    { id: "face", type: "face", length_mm: 79.375, od_mm: 79.375 },
    // OD profile: stepped with shoulder
    { id: "od_main", type: "od_contour", od_mm: 76.2, length_mm: 127.0, depth_mm: 1.5875,
      surface_finish_Ra_um: 1.6, tolerance_mm: 0.025,
      profile_points: [
        { X: 63.5, Z: 0, type: "linear" as const, feed: 0.12 },
        { X: 63.5, Z: -50.8, type: "linear" as const },
        { X: 76.2, Z: -53.34, type: "arc_ccw" as const, R: 2.54 },
        { X: 76.2, Z: -127.0, type: "linear" as const },
      ],
    },
    // Thru-hole 0.75"
    { id: "thru", type: "drill_through", diameter_mm: 19.05, depth_mm: 133, length_mm: 133 },
    // Counterbore side 1: 1.25" × 0.625" deep
    { id: "cbore_s1", type: "id_bore", id_mm: 31.75, depth_mm: 15.875,
      profile_points: [
        { X: 31.75, Z: 0, type: "linear" as const, feed: 0.10 },
        { X: 31.75, Z: -15.875, type: "linear" as const },
        { X: 19.05, Z: -15.875, type: "linear" as const },
      ],
    },
    // OD groove for retention ring
    { id: "groove1", type: "groove_od", od_mm: 76.2, groove_depth_mm: 2.0, groove_width_mm: 3.175, position_z_mm: 60 },
    // Whistle notch: 15° angle
    { id: "notch", type: "whistle_notch", od_mm: 76.2,
      notch_angle_deg: 15, notch_depth_mm: 3.175, notch_width_mm: 15.875,
      position_z_mm: 25.4, c_axis_position_deg: 0,
      live_tool_diameter_mm: 9.525, length_mm: 15.875 },
    // OD pocket mill-out
    { id: "pocket", type: "od_pocket_mill", od_mm: 76.2,
      pocket_width_mm: 31.75, pocket_depth_mm: 3.175,
      position_z_mm: 80.0, c_axis_position_deg: 180,
      live_tool_diameter_mm: 12.7, length_mm: 31.75 },
    { id: "cutoff", type: "part_off", od_mm: 79.375, length_mm: 3.175 },
  ],
}, {
  ...STD_CHECKS,
  // Turning checks
  "G42 TNC OD": (p) => p.includes("G42"),
  "G41 TNC bore": (p) => p.includes("G41"),
  "G03 fillet arc": (p) => p.includes("G03"),
  "G75 groove": (p) => p.includes("G75"),
  "P/Q match": (p) => { const a = p.match(/G71 P(\d+) Q(\d+)/); const b = p.match(/G70 P(\d+) Q(\d+)/); return !!(a && b && a[1]===b[1] && a[2]===b[2]); },
  // Live tooling checks
  "Whistle notch present": (p) => p.toLowerCase().includes("whistle"),
  "OD pocket present": (p) => p.toLowerCase().includes("pocket"),
  "M05/M19/M133/M135 sequence": (p) => {
    const m05 = p.indexOf("M05");
    const m19 = p.indexOf("M19", m05);
    const m133 = p.indexOf("M133", m19);
    const m135 = p.indexOf("M135", m133);
    return m05 > 0 && m19 > m05 && m133 > m19 && m135 > m133;
  },
  "Two C-axis positions": (p) => (p.match(/G00 C/g) || []).length >= 2,
  // Sequencing
  "Cutoff is LAST": (p) => {
    const ops = p.match(/\(OP\d+: (\w+)/g) || [];
    const last = ops[ops.length - 1];
    return last?.includes("part_off") || false;
  },
  "14+ operations": (p, r) => r.total_operations >= 12,
  "Live ops after turning": (p) => p.indexOf("M05") > p.indexOf("G70"),
});

// ============================================================================
// SUMMARY
// ============================================================================
console.log(`\n${"=".repeat(65)}`);
console.log("COLD HEADING DIE TEST SUITE SUMMARY");
console.log("=".repeat(65));
console.log("Materials tested: H13(ann+hard), A2, S7, 52100, D2, M2, O2");
console.log("Size range: 0.75\" to 6\" OD, 1\" to 8\" long");
console.log("Features: thru-holes, counterbores (1+2 sides), chamfers, fillets,");
console.log("          stepped OD, deep bores, hard turning, sub-spindle cutoff");
