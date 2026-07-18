import { turningPrintToProgramEngine } from "../src/engines/TurningPrintToProgramEngine.ts";

function runTest(name: string, input: any, checks: Record<string, (prog: string) => boolean>) {
  const r = turningPrintToProgramEngine.calculate("turning_print_to_program", input);
  const prog = r.program_text;
  console.log(`\n${"=".repeat(60)}`);
  console.log(`TEST: ${name}`);
  console.log(`OPS: ${r.total_operations} | TOOLS: ${r.total_tool_changes} | TIME: ${r.estimated_cycle_time_sec}s`);
  let pass = 0, fail = 0;
  for (const [cn, cf] of Object.entries(checks)) {
    const ok = cf(prog);
    console.log(`  ${ok ? "PASS" : "FAIL"}: ${cn}`);
    if (ok) pass++; else fail++;
  }
  if (fail > 0) { console.log("\n--- PROGRAM ---"); console.log(prog); }
  r.warnings.forEach((w: any) => console.log(`  ${w.severity}: ${w.message}`));
  return { pass, fail };
}

const B: any = { controller: "okuma", max_spindle_rpm: 3000, max_power_kW: 15, material: { material_name: "Steel 4140", iso_group: "P" } };

// T1: Simple face + single OD
const t1 = runTest("T1: Simple Shaft", { ...B, part_number: "OKU-T1", bar_stock_od_mm: 55, finished_od_mm: 50, part_length_mm: 75, features: [
  { id: "f", type: "face", length_mm: 55, od_mm: 55 },
  { id: "od1", type: "od_straight", od_mm: 50, length_mm: 75, depth_mm: 2.5, surface_finish_Ra_um: 3.2 },
]}, {
  "Has G50 clamp": (p) => p.includes("G50 S"),
  "Has G96 CSS": (p) => p.includes("G96"),
  "Has G71 rough": (p) => p.includes("G71"),
  "Has M30": (p) => p.includes("M30"),
  "Has coolant": (p) => p.includes("M08") || p.includes("M50"),
  "Has home G28": (p) => p.includes("G28"),
});

// T2: 3-step shaft with profile_points
const t2 = runTest("T2: Stepped Shaft", { ...B, part_number: "OKU-T2", bar_stock_od_mm: 65, part_length_mm: 100, features: [
  { id: "f", type: "face", length_mm: 65, od_mm: 65 },
  { id: "s", type: "od_contour", od_mm: 60, length_mm: 100, depth_mm: 17.5, surface_finish_Ra_um: 1.6, tolerance_mm: 0.025, profile_points: [
    { X: 30, Z: 0, type: "linear", feed: 0.15 }, { X: 30, Z: -30, type: "linear" },
    { X: 45, Z: -30, type: "linear" }, { X: 45, Z: -65, type: "linear" },
    { X: 60, Z: -65, type: "linear" }, { X: 60, Z: -100, type: "linear" },
  ]},
]}, {
  "G42 TNC": (p) => p.includes("G42"),
  "G40 cancel": (p) => p.includes("G40"),
  "G71/G70 pair": (p) => p.includes("G71") && p.includes("G70"),
  "P/Q match": (p) => { const a = p.match(/G71 P(\d+) Q(\d+)/); const b = p.match(/G70 P(\d+) Q(\d+)/); return !!(a && b && a[1]===b[1] && a[2]===b[2]); },
  "6 profile segments": (p) => (p.match(/G01 X|G01 Z/g) || []).length >= 5,
});

// T3: Chamfer + R3 fillet
const t3 = runTest("T3: Chamfer + Fillet", { ...B, part_number: "OKU-T3", bar_stock_od_mm: 55, part_length_mm: 80, features: [
  { id: "f", type: "face", length_mm: 55, od_mm: 55 },
  { id: "p", type: "od_contour", od_mm: 50, length_mm: 80, depth_mm: 10, surface_finish_Ra_um: 1.6, profile_points: [
    { X: 33, Z: 1, type: "linear", feed: 0.12 }, { X: 35, Z: 0, type: "linear" },
    { X: 35, Z: -35, type: "linear" }, { X: 50, Z: -38, type: "arc_ccw", R: 3 },
    { X: 50, Z: -80, type: "linear" },
  ]},
]}, {
  "G03 arc": (p) => p.includes("G03"),
  "R3 radius": (p) => p.includes("R3") || p.includes("R3.000"),
  "TNC on/off": (p) => p.includes("G42") && p.includes("G40"),
});

// T4: Thread + groove + cutoff
const t4 = runTest("T4: Thread+Groove+Cutoff", { ...B, part_number: "OKU-T4", bar_stock_od_mm: 45, part_length_mm: 60, features: [
  { id: "f", type: "face", length_mm: 45, od_mm: 45 },
  { id: "od", type: "od_straight", od_mm: 40, length_mm: 60, depth_mm: 2.5 },
  { id: "gr", type: "groove_od", od_mm: 40, groove_depth_mm: 2, groove_width_mm: 3, position_z_mm: 25 },
  { id: "th", type: "thread_od", od_mm: 40, length_mm: 20, thread_pitch_mm: 1.5 },
  { id: "co", type: "part_off", od_mm: 45, length_mm: 3 },
]}, {
  "G76 thread": (p) => p.includes("G76"),
  "G75 groove": (p) => p.includes("G75"),
  "G97 before G76": (p) => { const i = p.indexOf("G76"); return i > 0 && p.lastIndexOf("G97", i) > 0; },
  "Cutoff last": (p) => p.indexOf("part_off") > p.indexOf("G76") || p.indexOf("Part off") > p.indexOf("G76"),
  "5+ ops": (p) => (p.match(/\(OP\d+:/g) || []).length >= 5,
});

// T5: Bore + drill
const t5 = runTest("T5: Bore+Drill", { ...B, part_number: "OKU-T5", bar_stock_od_mm: 65, part_length_mm: 50, features: [
  { id: "f", type: "face", length_mm: 65, od_mm: 65 },
  { id: "od", type: "od_straight", od_mm: 60, length_mm: 50, depth_mm: 2.5 },
  { id: "bore", type: "id_bore", id_mm: 25, depth_mm: 55, tolerance_mm: 0.021, surface_finish_Ra_um: 0.8 },
]}, {
  "Center drill": (p) => p.toLowerCase().includes("center"),
  "Peck drill G83": (p) => p.includes("G83"),
  "Bore rough": (p) => p.toLowerCase().includes("bore_rough"),
  "Bore finish": (p) => p.toLowerCase().includes("bore_finish") || (p.match(/G70/g) || []).length >= 2,
  "Drill before bore": (p) => p.indexOf("drill") < (p.indexOf("bore_rough") || p.indexOf("bore")),
});

// T6: COMPLEX full-feature part
const t6 = runTest("T6: COMPLEX Full Feature", { ...B, part_number: "OKU-T6", bar_stock_od_mm: 80, finished_od_mm: 25, part_length_mm: 120, features: [
  { id: "f", type: "face", length_mm: 80, od_mm: 80 },
  { id: "od", type: "od_contour", od_mm: 75, length_mm: 120, depth_mm: 27.5, surface_finish_Ra_um: 0.8, tolerance_mm: 0.013, profile_points: [
    { X: 25, Z: 0, type: "linear", feed: 0.10 }, { X: 25, Z: -15, type: "linear" },
    { X: 35, Z: -17, type: "linear", feed: 0.08 }, { X: 35, Z: -35, type: "linear" },
    { X: 50, Z: -42.5, type: "arc_ccw", R: 7.5 }, { X: 50, Z: -60, type: "linear" },
    { X: 55, Z: -60, type: "linear" }, { X: 55, Z: -65, type: "linear" },
    { X: 60, Z: -65, type: "linear" }, { X: 60, Z: -90, type: "linear" },
    { X: 75, Z: -95, type: "arc_cw", R: 5 }, { X: 75, Z: -120, type: "linear" },
  ]},
  { id: "gr", type: "groove_od", od_mm: 55, groove_depth_mm: 3, groove_width_mm: 4, position_z_mm: 62 },
  { id: "th", type: "thread_od", od_mm: 55, length_mm: 20, thread_pitch_mm: 2.0 },
  { id: "bore", type: "id_bore", id_mm: 15, depth_mm: 40, surface_finish_Ra_um: 1.6 },
]}, {
  "8+ ops": (p) => (p.match(/\(OP\d+:/g) || []).length >= 8,
  "G71/G70": (p) => p.includes("G71") && p.includes("G70"),
  "G42 TNC": (p) => p.includes("G42"),
  "G40 cancel": (p) => p.includes("G40"),
  "G02 arc": (p) => p.includes("G02"),
  "G03 arc": (p) => p.includes("G03"),
  "R7.5 fillet": (p) => p.includes("R7.5") || p.includes("R7.500"),
  "G76 thread": (p) => p.includes("G76"),
  "G75 groove": (p) => p.includes("G75"),
  "G97 before G76": (p) => { const i = p.indexOf("G76"); return i > 0 && p.lastIndexOf("G97", i) > 0; },
  "Bore ops": (p) => p.toLowerCase().includes("bore") || p.toLowerCase().includes("drill"),
  "P/Q match": (p) => { const a = p.match(/G71 P(\d+) Q(\d+)/); const b = p.match(/G70 P(\d+) Q(\d+)/); return !!(a && b && a[1]===b[1] && a[2]===b[2]); },
  "12-pt profile": (p) => (p.match(/N\d+ G0[123] X/g) || []).length >= 10,
  "Groove after finish": (p) => p.indexOf("G75") > p.indexOf("G70"),
  "Thread after groove": (p) => p.indexOf("G76") > p.indexOf("G75"),
});

// Summary
console.log(`\n${"=".repeat(60)}`);
console.log("OKUMA TEST SUITE SUMMARY");
console.log("=".repeat(60));
const all = [
  { n: "T1: Simple Shaft", ...t1 },
  { n: "T2: Stepped Shaft", ...t2 },
  { n: "T3: Chamfer+Fillet", ...t3 },
  { n: "T4: Thread+Groove+Cutoff", ...t4 },
  { n: "T5: Bore+Drill", ...t5 },
  { n: "T6: COMPLEX Full Feature", ...t6 },
];
let tp = 0, tf = 0;
for (const t of all) { console.log(`  ${t.fail===0?"PASS":"FAIL"}: ${t.n} (${t.pass}/${t.pass+t.fail})`); tp+=t.pass; tf+=t.fail; }
console.log(`\nTOTAL: ${tp}/${tp+tf} (${Math.round(tp/(tp+tf)*100)}%)`);
