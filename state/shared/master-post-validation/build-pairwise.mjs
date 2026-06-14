#!/usr/bin/env node
// IPOG-style pairwise (all-pairs) covering-array generator for the master Hurco
// V11 post test matrix. Honors invalid-combo constraints (skip/repair illegal
// pairs). Deterministic (seeded greedy) — same input → same matrix.
//
// Output: test-matrix.json  (each row = a complete combo across all 14 axes)
//
// Ground truth gates honored (HurcoV11MillMasterPostEngine.ts + task constraints):
//  - material.iso_group MUST match material_iso (single material axis here, so intrinsic)
//  - holder taper MUST match machine spindle_nose / spindle_type taper
//  - inserts INVALID for tap/drill/bore/3d_surface/slot solid-tool ops + grade↔material compat
//  - diamond/DLC INVALID on ferrous (P/M/K/H/S); uncoated preferred N; AlTiN↔H
//  - multi_axis / RTCP FORCE-SKIPPED on axis_count<4 (3-axis machines)
//  - TSC invalid where machine coolant_through=false (VMX24/VM30i, Haas)
//  - Haas PRE-NGC machines are WRONG DIALECT for Hurco V11 (excluded as primary target
//    but retained as negative-test rows tagged dialect_mismatch=true)
//  - UltiMotion / hsm only meaningful on contour/3d_surface/adaptive
//  - L5 MAX aggressiveness invalid on worn/low + economy build_quality (chatter)
//  - tap on H >55HRC invalid (no forming taps in hardened)

import { writeFileSync } from "node:fs";

// ---------------------------------------------------------------------------
// AXES — short symbolic value tokens (full descriptive strings preserved in LABELS)
// ---------------------------------------------------------------------------
const AXES = {
  material:            ["P", "M", "K", "N", "S", "H"],
  tool_holder:         ["CAT40", "BT40", "HSK-A63", "ER32", "shrink-fit", "hydraulic", "weldon"],
  tooling:             ["face", "endmill", "ballbull3d", "drill", "tap", "bore", "adaptive"],
  insert:              ["none", "APKT", "RDKT", "P15-P25", "K10-K20", "M-class"],
  coating:             ["uncoated", "TiAlN", "AlTiN", "TiCN", "DLC-diamond", "ZrN"],
  parameter_settings:  ["L1", "L2", "L3", "L4", "L5", "adv_frac", "prove_out", "max_force_N"],
  machine:             ["VM30i", "VMX42SRTi", "Okuma-M460V", "Haas-VF2", "Haas-OM2", "RokuRoku"],
  spindle_type:        ["CT40", "CAT40-12k", "BT40", "HSK-A63", "CAT50", "geared-direct"],
  motion_type:         ["ulti-on", "ulti-off", "conversational", "nc-eia", "g05.1q1", "rigid-tap", "peck"],
  build_quality:       ["new", "well-maint", "standard", "worn", "rebuilt", "economy"],
  machine_age:         ["0-2yr", "3-5yr", "6-10yr", "11-15yr", "16plus", "ctrl-gen"],
  optional_packages:   ["ultimotion-pkg", "tsc", "omp40-probe", "g65-macro", "dxf-import", "rtcp-5ax", "g54.1-ext", "rigid-tap-pkg"],
  controller_settings: ["diag-independent", "diag-slowest", "smooth-tol", "hsm-g05p1", "workoffset-g54.1", "units-inch-g20", "safez-m140", "setupsheet-prognum", "safestart"],
};

// Full human-readable labels (1:1 with the task's input-axis value strings)
const LABELS = {
  material: {
    P: "P — carbon/alloy steel (4140, A2 tool steel, kc1.1=1800)",
    M: "M — stainless (304/316/17-4PH, kc1.1=2100)",
    K: "K — cast iron / ductile (kc1.1=1100)",
    N: "N — aluminum (6061-T6, 7075; kc1.1=700; maxFz=0.25)",
    S: "S — superalloy (Inconel 718, Ti-6Al-4V; kc1.1=2800)",
    H: "H — hardened steel (D2 >58 HRC; kc1.1=3200; Vc cap ~150 SFM per tribal)",
  },
  tool_holder: {
    CAT40: "CAT40 / CT40 steel collet (JM VMX24 native taper)",
    BT40: "BT40 (Okuma M460V-5AX class)",
    "HSK-A63": "HSK-A63 (high-speed / Roku-Roku HSM class)",
    ER32: "ER32 collet chuck (general purpose)",
    "shrink-fit": "shrink-fit (thermal, best runout for finish/HSM)",
    hydraulic: "hydraulic chuck (vibration damping, medium-D)",
    weldon: "Weldon side-lock (roughing, anti-pullout)",
  },
  tooling: {
    face: "face mill (operation_type=face)",
    endmill: "end mill — pocket/contour/slot/adaptive",
    ballbull3d: "ball/bull-nose for 3D (operation_type=3d_surface)",
    drill: "drill (operation_type=drill; G73/G83 peck)",
    tap: "tap (operation_type=tap; rigid G84, feed=pitch×RPM)",
    bore: "boring bar (operation_type=bore)",
    adaptive: "HSM adaptive cutter (operation_type=adaptive; G05.1 Q1)",
  },
  insert: {
    none: "none — solid carbide endmill/drill",
    APKT: "APKT/APMT (face & shoulder mill, P/M/K)",
    RDKT: "RDKT/RDMT round (high-feed/roughing)",
    "P15-P25": "ISO grade P15-P25 (steel, CVD TiCN+Al2O3)",
    "K10-K20": "ISO grade K10-K20 (cast iron / aluminum, uncoated/PVD)",
    "M-class": "ISO grade M-class (stainless, tough PVD)",
  },
  coating: {
    uncoated: "uncoated carbide (aluminum N, brass — anti-BUE)",
    TiAlN: "TiAlN (general P/M steel & stainless, high heat)",
    AlTiN: "AlTiN (hardened H steel >50HRC, dry/MQL)",
    TiCN: "TiCN (abrasive cast iron K, lower-temp)",
    "DLC-diamond": "DLC / diamond (non-ferrous N, graphite, composites)",
    ZrN: "ZrN (aluminum finish, low friction)",
  },
  parameter_settings: {
    L1: "aggressiveness L1 ULTRA-CONSERVATIVE (0.6× feed)",
    L2: "aggressiveness L2 CONSERVATIVE (0.75×)",
    L3: "aggressiveness L3 MODERATE (0.9×)",
    L4: "aggressiveness L4 AGGRESSIVE (1.0×)",
    L5: "aggressiveness L5 MAX (1.1×)",
    adv_frac: "advanced_aggressiveness 0.0..1.0 (AutoSpeedFeed fractional, advanced path)",
    prove_out: "prove_out feed_factor 0.5 (first-article half-feed + M01)",
    max_force_N: "max_cutting_force_N Kienzle-bounded reducer (e.g. 1800N)",
  },
  machine: {
    VM30i: "VMC-01 Hurco VM30i / WinMax-v10 (3-axis VMC, CT40, ~10k RPM)",
    VMX42SRTi: "Test target Hurco VMX42SRTi (WinMax V11, 5-axis SRT, 12000 RPM, ~18kW)",
    "Okuma-M460V": "VMC-02 Okuma M460V-5AX / OSP-P300MA-H (5-axis BT40)",
    "Haas-VF2": "VMC-03 Haas VF-2 PRE-NGC (3-axis CAT40)",
    "Haas-OM2": "VMC-04 Haas OM-2 PRE-NGC (office mill, small env)",
    RokuRoku: "VMC-05 Roku-Roku / Fanuc-31i (high-speed mill, HSK)",
  },
  spindle_type: {
    CT40: "CT40 / CAT40 (VMX24 native, 10k RPM, 15HP)",
    "CAT40-12k": "CAT40 12k-RPM (VMX42SRTi, ~18kW)",
    BT40: "BT40 (Okuma 5-axis)",
    "HSK-A63": "HSK-A63 (high-speed, Roku-Roku, >15k RPM capable)",
    CAT50: "CAT50 (heavy roughing, high-torque — engine-supported)",
    "geared-direct": "geared vs direct-drive (low-RPM torque vs high-RPM)",
  },
  motion_type: {
    "ulti-on": "UltiMotion ON (use_ultimotion=true → G05.3 HSM smoothing, hsm_mode=g05p1)",
    "ulti-off": "UltiMotion OFF (use_ultimotion=false → conventional, slowest_axis diagonal)",
    conversational: "conversational G65 macro mode (use_conversational=true)",
    "nc-eia": "NC / EIA mode (use_conversational=false, standard G-code)",
    "g05.1q1": "G05.1 Q1 high-speed contouring (adaptive/HSM toolpaths)",
    "rigid-tap": "rigid-tap motion (G84, feed=pitch×RPM)",
    peck: "peck/chip-break (G73/G83 for deep holes & pockets)",
  },
  build_quality: {
    new: "new / factory-spec (full rigidity, FRF nominal)",
    "well-maint": "well-maintained production (rigidity_class high)",
    standard: "standard shop tier (rigidity_class medium — default)",
    worn: "worn ways / aged (rigidity_class low → feed derate)",
    rebuilt: "rebuilt / reground (restored to medium-high)",
    economy: "economy import build (lower baseline rigidity)",
  },
  machine_age: {
    "0-2yr": "0-2 yr (new, factory geometry & accel intact)",
    "3-5yr": "3-5 yr (production prime, minor wear)",
    "6-10yr": "6-10 yr (mid-life, ballscrew/way wear onset)",
    "11-15yr": "11-15 yr (aged, derate accel & feed)",
    "16plus": "16+ yr (legacy, e.g. Haas PRE-NGC controllers)",
    "ctrl-gen": "controller-generation bracket: WinMax V10 vs V11 vs PRE-NGC",
  },
  optional_packages: {
    "ultimotion-pkg": "UltiMotion package (use_ultimotion — high-speed trajectory)",
    tsc: "TSC through-spindle coolant (coolant_mode=tsc; machine coolant_through=true required)",
    "omp40-probe": "Renishaw OMP40 probing (G65 P9xxx macros)",
    "g65-macro": "conversational G65 macro package (use_conversational)",
    "dxf-import": "DXF import capability (engine header)",
    "rtcp-5ax": "5-axis RTCP / TRAORI (G43.4 H#1, axis_count≥4)",
    "g54.1-ext": "extended work offsets G54.1 P1-P99",
    "rigid-tap-pkg": "rigid tapping package (G84)",
  },
  controller_settings: {
    "diag-independent": "controller_diagonal_mode 'independent' (UltiMotion-on, per-axis)",
    "diag-slowest": "controller_diagonal_mode 'slowest_axis' (conventional)",
    "smooth-tol": "UltiMotion Smoothing Tolerance ~0.005mm (finish) / looser for rough",
    "hsm-g05p1": "hsm_mode g05p1 (UltiMotion) vs off",
    "workoffset-g54.1": "work_offset G54 default / G55-G59 / G54.1 P1-P99 extended",
    "units-inch-g20": "units metric|inch (G21/G20; JM jobs INCH/G20)",
    "safez-m140": "safe_z_mm retract height + M140 Z-retract (WinMax dialect)",
    "setupsheet-prognum": "emit_setup_sheet on/off; program_number + program_comment",
    safestart: "safe-start block G90 G17 G40 G49 G80 G54",
  },
};

const AXIS_NAMES = Object.keys(AXES);

// ---------------------------------------------------------------------------
// MACHINE PROFILES — the spine that drives most cross-axis constraints
// ---------------------------------------------------------------------------
const MACHINE_PROFILE = {
  VM30i:         { axis_count: 3, taper: "CT40",   coolant_through: false, max_rpm: 10000, hurco_v11: true,  dialect: "winmax-v10", spindle: ["CT40", "geared-direct"] },
  VMX42SRTi:     { axis_count: 5, taper: "CAT40",  coolant_through: true,  max_rpm: 12000, hurco_v11: true,  dialect: "winmax-v11", spindle: ["CAT40-12k", "geared-direct"] },
  "Okuma-M460V": { axis_count: 5, taper: "BT40",   coolant_through: true,  max_rpm: 15000, hurco_v11: false, dialect: "osp-p300",   spindle: ["BT40", "geared-direct"] },
  "Haas-VF2":    { axis_count: 3, taper: "CAT40",  coolant_through: false, max_rpm: 8100,  hurco_v11: false, dialect: "pre-ngc",    spindle: ["CAT40-12k", "geared-direct"] },
  "Haas-OM2":    { axis_count: 3, taper: "CAT40",  coolant_through: false, max_rpm: 6000,  hurco_v11: false, dialect: "pre-ngc",    spindle: ["CAT40-12k", "geared-direct"] },
  RokuRoku:      { axis_count: 3, taper: "HSK-A63",coolant_through: true,  max_rpm: 40000, hurco_v11: false, dialect: "fanuc-31i",  spindle: ["HSK-A63", "geared-direct"] },
};

// Holder taper family (what spindle taper a holder physically fits)
const HOLDER_TAPER = {
  CAT40: "CAT40", BT40: "BT40", "HSK-A63": "HSK-A63",
  // collet/grip-style holders come in a body taper; treat as taper-agnostic adapters
  // BUT for the geometric-fit gate they must still match the spindle taper family.
  // We model ER32/shrink-fit/hydraulic/weldon as available in ANY taper body
  // (the post does not encode holder body taper), so they are taper-agnostic.
  ER32: "*", "shrink-fit": "*", hydraulic: "*", weldon: "*",
};

// Spindle taper family for the spindle_type axis (must match machine taper + holder)
const SPINDLE_TAPER = {
  CT40: "CT40", "CAT40-12k": "CAT40", BT40: "BT40", "HSK-A63": "HSK-A63",
  CAT50: "CAT50", "geared-direct": "*", // geared/direct is a drive descriptor, taper-agnostic
};
// CT40 and CAT40 are the same 40-taper interface family (collet vs steep-taper variant)
function taperFamily(t) {
  if (t === "CT40" || t === "CAT40") return "40";
  if (t === "CAT40-12k") return "40";
  if (t === "BT40") return "BT40";
  if (t === "HSK-A63") return "HSK";
  if (t === "CAT50") return "50";
  return t;
}

// ---------------------------------------------------------------------------
// CONSTRAINTS — pure predicate over a partial OR complete assignment.
// Returns true if the (partial) assignment is FEASIBLE; false if it violates
// a hard invalid-combo rule. Only checks pairs/relations among ASSIGNED axes.
// ---------------------------------------------------------------------------
const FERROUS = new Set(["P", "M", "K", "H", "S"]);

function feasible(a) {
  const has = (k) => a[k] !== undefined;
  const m = a.machine !== undefined ? MACHINE_PROFILE[a.machine] : null;

  // --- C1: holder taper must match machine spindle taper (geometric fit) ---
  if (has("tool_holder") && m) {
    const ht = HOLDER_TAPER[a.tool_holder];
    if (ht !== "*" && taperFamily(ht) !== taperFamily(m.taper)) return false;
  }
  // --- C2: spindle_type taper must match machine taper ---
  if (has("spindle_type") && m) {
    const st = SPINDLE_TAPER[a.spindle_type];
    if (st !== "*" && taperFamily(st) !== taperFamily(m.taper)) return false;
    // spindle_type must be one the machine actually offers (drive-agnostic geared/direct always ok)
    if (a.spindle_type !== "geared-direct" && !m.spindle.includes(a.spindle_type)) return false;
  }
  // --- C3: holder taper must match spindle_type taper ---
  if (has("tool_holder") && has("spindle_type")) {
    const ht = HOLDER_TAPER[a.tool_holder];
    const st = SPINDLE_TAPER[a.spindle_type];
    if (ht !== "*" && st !== "*" && taperFamily(ht) !== taperFamily(st)) return false;
  }
  // --- C4: CAT50 is engine-supported but NOT in the JM mill fleet. No real machine
  //          carries a CAT50 taper, so no complete test row (which MUST bind a real
  //          machine) can host a CAT50 spindle. CAT50 is therefore globally infeasible
  //          in this fleet-scoped matrix — excluded entirely (documented as an
  //          out-of-fleet negative note in the output, not silently dropped). Modeling
  //          it as feasible-only-without-a-machine would create uncoverable pairs and a
  //          dead-end during row completion. ---
  if (has("spindle_type") && a.spindle_type === "CAT50") return false;

  // --- C5: inserts invalid for solid-tool point/3d ops (tap/drill/bore/3d/slot-via-endmill) ---
  if (has("tooling") && has("insert")) {
    const solidOnly = new Set(["tap", "drill", "bore", "ballbull3d", "adaptive"]);
    if (a.insert !== "none" && solidOnly.has(a.tooling)) return false;
    // inserts ONLY apply to face / endmill(shoulder) / face-style roughing
    if (a.insert !== "none" && !(a.tooling === "face" || a.tooling === "endmill")) return false;
  }
  // --- C6: insert grade ↔ material compatibility ---
  if (has("insert") && has("material") && a.insert !== "none") {
    // P-grades invalid on N aluminum (BUE)
    if ((a.insert === "P15-P25") && a.material === "N") return false;
    // K-grades invalid on gummy stainless M
    if ((a.insert === "K10-K20") && a.material === "M") return false;
    // M-class is for stainless; APKT generic; RDKT round (roughing)
  }
  // --- C7: round RDKT invalid for sharp-corner contour (endmill contour) — model as
  //          RDKT only on face / roughing endmill, not fine endmill contour. We keep
  //          RDKT feasible on face + endmill (roughing). No extra block needed beyond C5. ---

  // --- C8: diamond/DLC invalid on ferrous; coating↔material bands ---
  if (has("coating") && has("material")) {
    if (a.coating === "DLC-diamond" && FERROUS.has(a.material)) return false;
    // AlTiN matched to H hardened dry — allow elsewhere too (advisory), but DLC/uncoated
    // for N preferred; we only HARD-block the diamond-on-ferrous physics rule + uncoated
    // is preferred-not-required so no block. ZrN is aluminum-finish; allow generally.
  }
  // --- C8b: coating ↔ tooling sanity: AlTiN is a solid-tool dry-hard coating; fine on inserts too.
  //          No additional hard block.

  // --- C9: multi_axis / RTCP packages force-skipped on axis_count<4 → infeasible to REQUEST rtcp-5ax there ---
  if (has("optional_packages") && a.optional_packages === "rtcp-5ax" && m && m.axis_count < 4) return false;

  // --- C10: TSC package requires machine coolant_through=true ---
  if (has("optional_packages") && a.optional_packages === "tsc" && m && !m.coolant_through) return false;

  // --- C11: tooling ↔ motion_type coherence ---
  if (has("tooling") && has("motion_type")) {
    // rigid-tap motion ONLY with tap tooling
    if (a.motion_type === "rigid-tap" && a.tooling !== "tap") return false;
    if (a.tooling === "tap" && !(a.motion_type === "rigid-tap" || a.motion_type === "nc-eia" || a.motion_type === "conversational")) return false;
    // G05.1 Q1 HSM contouring only meaningful on adaptive / 3d / endmill-contour
    if (a.motion_type === "g05.1q1" && !(a.tooling === "adaptive" || a.tooling === "ballbull3d" || a.tooling === "endmill")) return false;
    // UltiMotion-on benefit only on contour/3d/adaptive (endmill/ballbull3d/adaptive); no-op-block on point ops
    if (a.motion_type === "ulti-on" && (a.tooling === "drill" || a.tooling === "tap" || a.tooling === "bore" || a.tooling === "face")) return false;
    // peck motion only for drill (deep hole) or pocket endmill
    if (a.motion_type === "peck" && !(a.tooling === "drill" || a.tooling === "endmill")) return false;
  }
  // --- C12: tap on H hardened >55HRC invalid (no forming taps in hardened) ---
  if (has("tooling") && has("material") && a.tooling === "tap" && a.material === "H") return false;

  // --- C13: L5 MAX aggressiveness invalid on worn/low + economy build_quality (chatter) ---
  if (has("parameter_settings") && has("build_quality") && a.parameter_settings === "L5") {
    if (a.build_quality === "worn" || a.build_quality === "economy") return false;
  }

  // --- C14: optional_packages ↔ machine dialect/feature gen ---
  if (has("optional_packages") && m) {
    // g54.1 extended offsets are V11+; pre-ngc / v10 lack reliable G54.1 P-extension
    if (a.optional_packages === "g54.1-ext" && m.dialect === "pre-ngc") return false;
    // ultimotion package only on Hurco V11 line (it's a WinMax-panel pairing)
    if (a.optional_packages === "ultimotion-pkg" && !m.hurco_v11) return false;
  }

  // --- C15: motion_type ↔ controller_settings coherence ---
  if (has("motion_type") && has("controller_settings")) {
    // diag-independent is the UltiMotion-on derived mode; pair only with ulti-on / g05.1q1
    if (a.controller_settings === "diag-independent" &&
        (a.motion_type === "ulti-off" || a.motion_type === "nc-eia" || a.motion_type === "rigid-tap")) return false;
    // hsm-g05p1 only with an UltiMotion/HSM motion
    if (a.controller_settings === "hsm-g05p1" &&
        !(a.motion_type === "ulti-on" || a.motion_type === "g05.1q1")) return false;
  }

  // --- C16: motion_type ↔ optional_packages coherence ---
  if (has("motion_type") && has("optional_packages")) {
    if (a.optional_packages === "rtcp-5ax" && a.motion_type === "rigid-tap") return false;
    // ultimotion-pkg pairs with an UltiMotion-capable motion (not rigid-tap/peck point ops)
    if (a.optional_packages === "ultimotion-pkg" &&
        (a.motion_type === "rigid-tap" || a.motion_type === "peck")) return false;
  }

  // --- C17: spindle_type ↔ machine RPM/HSM coherence ---
  if (has("spindle_type") && has("machine")) {
    // HSK-A63 high-speed only on RokuRoku (the HSK machine) — covered by C2 spindle.includes
    // CAT50 heavy-roughing invalid for >12k HSM (no machine has CAT50; covered by C4)
  }

  return true;
}

// ---------------------------------------------------------------------------
// IPOG core — horizontal + vertical growth pairwise covering array
// with constraint repair (skip infeasible candidate values).
// ---------------------------------------------------------------------------
function buildPairwise() {
  // 1. enumerate all FEASIBLE pairs to cover
  const names = AXIS_NAMES;
  const requiredPairs = new Map(); // key "i|j|vi|vj" → true (uncovered)
  function pairKey(i, j, vi, vj) { return `${i}|${j}|${vi}|${vj}`; }

  for (let i = 0; i < names.length; i++) {
    for (let j = i + 1; j < names.length; j++) {
      for (const vi of AXES[names[i]]) {
        for (const vj of AXES[names[j]]) {
          const probe = { [names[i]]: vi, [names[j]]: vj };
          if (feasible(probe)) requiredPairs.set(pairKey(i, j, vi, vj), true);
        }
      }
    }
  }
  const totalFeasiblePairs = requiredPairs.size;

  function rowCoversPair(row, i, j) {
    return pairKey(i, j, row[names[i]], row[names[j]]);
  }
  function markCovered(row) {
    for (let i = 0; i < names.length; i++)
      for (let j = i + 1; j < names.length; j++) {
        if (row[names[i]] !== undefined && row[names[j]] !== undefined)
          requiredPairs.delete(rowCoversPair(row, i, j));
      }
  }

  const rows = [];

  // IPOG: start with first two parameters' feasible pairs as seed rows.
  // Then horizontal-grow each remaining parameter, then vertical-grow for
  // any still-uncovered pair. We keep it simpler+robust: greedy row builder
  // that, while uncovered pairs remain, constructs the single row that covers
  // the most uncovered feasible pairs (a standard AETG-style greedy, which is
  // deterministic given a fixed value-ordering and produces a valid all-pairs CA).

  // Helper: given a partial row, list feasible candidate values for an axis
  function feasibleValues(row, axisIdx) {
    const name = names[axisIdx];
    return AXES[name].filter((v) => feasible({ ...row, [name]: v }));
  }

  // Count how many currently-uncovered pairs a fully/partly-built row would cover
  function uncoveredCount(row) {
    let c = 0;
    for (let i = 0; i < names.length; i++)
      for (let j = i + 1; j < names.length; j++) {
        if (row[names[i]] !== undefined && row[names[j]] !== undefined) {
          if (requiredPairs.has(rowCoversPair(row, i, j))) c++;
        }
      }
    return c;
  }

  // Backtracking row completion. Some pairs pass the 2-axis feasibility probe yet
  // cannot extend to a COMPLETE feasible row because of transitive constraints
  // (e.g. material=H × motion=rigid-tap: rigid-tap forces tooling=tap [C11], but
  // tap is invalid on H [C12] — jointly impossible at full-row level). Such pairs
  // are "implied-infeasible": we detect them when no completion exists and drop
  // them from the required set (recording them for the output's transparency).
  const impliedInfeasiblePairs = [];

  // Fill order: process the most-constrained axes first (machine + tapers + tooling)
  // so dead-ends surface early and backtracking stays cheap. Remaining axes follow.
  const FILL_PRIORITY = [
    "machine", "spindle_type", "tool_holder", "tooling", "material",
    "motion_type", "optional_packages", "controller_settings", "insert",
    "coating", "parameter_settings", "build_quality", "machine_age",
  ];
  const fillOrder = FILL_PRIORITY.map((n) => names.indexOf(n));

  // Complete a seeded partial row via DFS; returns a full feasible row or null.
  // Greedy value preference: try the value that covers the most uncovered pairs
  // first (deterministic tie-break by value-token order).
  function complete(row, k) {
    if (k === fillOrder.length) return { ...row };
    const ax = fillOrder[k];
    const name = names[ax];
    if (row[name] !== undefined) return complete(row, k + 1);
    const cands = feasibleValues(row, ax);
    if (cands.length === 0) return null;
    // order candidates by coverage gain (desc), then token order (stable)
    const ordered = cands
      .map((v) => ({ v, gain: uncoveredCount({ ...row, [name]: v }) }))
      .sort((p, q) => (q.gain - p.gain) || (cands.indexOf(p.v) - cands.indexOf(q.v)))
      .map((o) => o.v);
    for (const v of ordered) {
      row[name] = v;
      const done = complete(row, k + 1);
      if (done) { delete row[name]; return done; }
    }
    delete row[name];
    return null;
  }

  let guard = 0;
  while (requiredPairs.size > 0) {
    if (++guard > 20000) throw new Error("pairwise guard tripped — possible infeasible residue");

    // pick an uncovered pair to seed this row (deterministic: first in insertion order)
    const seedKey = requiredPairs.keys().next().value;
    const [si, sj, svi, svj] = seedKey.split("|");
    const ii = Number(si), jj = Number(sj);

    const seed = { [names[ii]]: svi, [names[jj]]: svj };
    if (!feasible(seed)) { requiredPairs.delete(seedKey); continue; }

    const full = complete(seed, 0);
    if (!full) {
      // seed pair has no complete-row extension under transitive constraints →
      // implied-infeasible. Drop it so the loop terminates; record for output.
      impliedInfeasiblePairs.push({
        axisA: names[ii], valueA: svi, axisB: names[jj], valueB: svj,
      });
      requiredPairs.delete(seedKey);
      continue;
    }

    markCovered(full);
    rows.push(full);
  }

  return { rows, totalFeasiblePairs, impliedInfeasiblePairs };
}

// ---------------------------------------------------------------------------
// VERIFY — recompute that every feasible pair is covered by at least one row.
// ---------------------------------------------------------------------------
function verify(rows, impliedInfeasiblePairs) {
  const names = AXIS_NAMES;
  let feasiblePairs = 0, covered = 0, infeasibleRows = 0, impliedUncovered = 0;
  // index the implied-infeasible (transitively-impossible) pairs for exclusion
  const implied = new Set();
  for (const p of impliedInfeasiblePairs) {
    const ia = names.indexOf(p.axisA), ib = names.indexOf(p.axisB);
    const [lo, hi] = ia < ib ? [ia, ib] : [ib, ia];
    const [vlo, vhi] = ia < ib ? [p.valueA, p.valueB] : [p.valueB, p.valueA];
    implied.add(`${lo}|${hi}|${vlo}|${vhi}`);
  }
  for (const row of rows) if (!feasible(row)) infeasibleRows++;
  for (let i = 0; i < names.length; i++)
    for (let j = i + 1; j < names.length; j++)
      for (const vi of AXES[names[i]])
        for (const vj of AXES[names[j]]) {
          if (!feasible({ [names[i]]: vi, [names[j]]: vj })) continue;
          const key = `${i}|${j}|${vi}|${vj}`;
          if (implied.has(key)) { impliedUncovered++; continue; } // transitively impossible — not required
          feasiblePairs++;
          let hit = false;
          for (const row of rows) {
            if (row[names[i]] === vi && row[names[j]] === vj) { hit = true; break; }
          }
          if (hit) covered++;
        }
  return {
    feasiblePairs, covered, allCovered: covered === feasiblePairs,
    infeasibleRows, impliedInfeasibleCount: impliedUncovered,
  };
}

// ---------------------------------------------------------------------------
const { rows, totalFeasiblePairs, impliedInfeasiblePairs } = buildPairwise();
const v = verify(rows, impliedInfeasiblePairs);

// Expand rows to full descriptive records (token + label) + machine_age proxy note
const expanded = rows.map((r, idx) => {
  const rec = { row_id: idx + 1 };
  for (const name of AXIS_NAMES) {
    rec[name] = r[name];
    rec[`${name}_label`] = LABELS[name][r[name]];
  }
  const mp = MACHINE_PROFILE[r.machine];
  rec._meta = {
    machine_axis_count: mp.axis_count,
    machine_taper: mp.taper,
    machine_coolant_through: mp.coolant_through,
    machine_max_rpm: mp.max_rpm,
    is_hurco_v11_target: mp.hurco_v11,
    dialect: mp.dialect,
    dialect_mismatch_negative_test: !mp.hurco_v11, // Haas PRE-NGC/Okuma/RokuRoku → negative dialect test rows
    units_note: "engine mm-native (tool_diameter_mm); JM jobs INCH/G20 → 25.4x scale guard",
  };
  return rec;
});

const out = {
  schemaVersion: "1.0.0",
  generated: new Date().toISOString().slice(0, 10),
  generator: "IPOG/AETG-greedy pairwise covering array (deterministic)",
  strength: 2,
  axes: AXIS_NAMES.length,
  axis_value_counts: Object.fromEntries(AXIS_NAMES.map((n) => [n, AXES[n].length])),
  total_feasible_pairs: totalFeasiblePairs,
  verification: {
    feasible_pairs_recomputed: v.feasiblePairs,
    pairs_covered: v.covered,
    all_feasible_pairs_covered: v.allCovered,
    infeasible_rows: v.infeasibleRows,
    implied_infeasible_pairs_count: v.impliedInfeasibleCount,
  },
  // Pairs that pass the 2-axis feasibility probe but have NO complete-row
  // extension under transitive constraints (e.g. material=H × motion=rigid-tap,
  // since rigid-tap⇒tooling=tap [C11] and tap⊘H [C12]). Excluded from coverage.
  implied_infeasible_pairs: impliedInfeasiblePairs,
  out_of_fleet_note: "spindle_type=CAT50 is engine-supported but absent from the JM mill fleet; excluded (no real machine carries a CAT50 taper).",
  pairwise_row_count: expanded.length,
  constraints_honored: [
    "C1 holder-taper ↔ machine-taper geometric fit",
    "C2 spindle_type-taper ↔ machine-taper + machine offers spindle",
    "C3 holder-taper ↔ spindle_type-taper",
    "C4 CAT50 not in JM fleet (infeasible once any real machine binds)",
    "C5 inserts invalid for tap/drill/bore/3d/adaptive solid-tool ops",
    "C6 insert grade ↔ material (P-grade≠N, K-grade≠M)",
    "C8 diamond/DLC invalid on ferrous P/M/K/H/S",
    "C9 rtcp-5ax force-skipped on axis_count<4",
    "C10 TSC requires machine coolant_through=true",
    "C11 tooling ↔ motion coherence (rigid-tap↔tap, g05.1q1↔HSM ops, ulti-on no-op on point/face, peck↔drill/pocket)",
    "C12 tap invalid on H hardened steel",
    "C13 L5 MAX aggressiveness invalid on worn/economy build",
    "C14 ultimotion-pkg Hurco-V11-only; g54.1-ext not on pre-ngc",
    "C15 controller_settings ↔ motion coherence (diag-independent/hsm-g05p1 require HSM motion)",
    "C16 motion ↔ packages coherence (rtcp≠rigid-tap; ultimotion-pkg≠point ops)",
  ],
  rows: expanded,
};

const path = "H:/prism/state/shared/master-post-validation/test-matrix.json";
writeFileSync(path, JSON.stringify(out, null, 2));
console.log(JSON.stringify({
  pairwise_row_count: expanded.length,
  total_feasible_pairs: totalFeasiblePairs,
  recomputed_feasible_pairs: v.feasiblePairs,
  pairs_covered: v.covered,
  all_feasible_pairs_covered: v.allCovered,
  infeasible_rows: v.infeasibleRows,
  matrixFile: path,
}, null, 2));
