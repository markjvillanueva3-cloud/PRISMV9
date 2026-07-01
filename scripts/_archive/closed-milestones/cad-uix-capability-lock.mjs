#!/usr/bin/env node
/**
 * CAD-UIX-MS0 Capability Lock — ensures the AI-control chain is not just
 * specified but provably deliverable.
 *
 *   1. +14 P7-EXIT capability gates: 6 complex-part gates (one per CAD),
 *      6 assembly gates (one per CAD), 1 cross-CAD consistency demo,
 *      1 print→AI→CAD end-to-end demo.
 *   2. Add `depends_on` to critical-path P0-INFRA AI units so the build
 *      order (adapter → planner → NN head → master brain → exit gate)
 *      is explicit.
 *   3. Supersede 10 empty CADCAM-AGI / CADCAM-DEEPAGI / CADCAM-DAGI
 *      envelopes by marking them in roadmap-index.json with
 *      superseded_by: "CAD-COMPLETE-MS0 + CAD-UIX-MS0" to prevent
 *      re-fragmentation.
 */
import { readFileSync, writeFileSync } from "node:fs";

const UIX = "H:/PRISM/mcp-server/data/milestones/CAD-UIX-MS0.json";
const IDX = "H:/PRISM/mcp-server/data/roadmap-index.json";
const DATE = "2026-04-21";

const uix = JSON.parse(readFileSync(UIX, "utf8"));
const idx = JSON.parse(readFileSync(IDX, "utf8"));

// ── 1. P7-EXIT capability gates (+14 units) ──────────────────────────────
const CAPABILITY_GATES = [
  // Complex-part gates — one per CAD, in priority order
  { id: "U-CUIX-P7-13", title: "MastercamComplexPartCapabilityGate — master AI drives Mastercam end-to-end to produce a JM Die fastener die (≥20 features, multi-body, with toolpath) from NL + drawing intent",
    acceptance: "Intent → MastercamIntentNN (NN02) → MastercamCADGeneratorAdapter → NetHook3 execute → validated .mcam part + posted NC; ≥95% line-identical NC vs reference; 60s timeout; 3 attempt retry with UnsupportedCapabilityError surfacing." },
  { id: "U-CUIX-P7-14", title: "HyperCADSComplexPartCapabilityGate — master AI drives hyperCAD-S to produce a multi-body electrode block (burn face + cooling channels + cavity pocket) via FT-aware intent",
    acceptance: "Intent → HyperCADSIntentNN (NN03) → HyperCADSCodeGeneratorAdapter (P0-17) → AutomationCenter Python execute → validated .hmc part + .elx electrode burn-table; FT recognition round-trip; ≥20 features." },
  { id: "U-CUIX-P7-15", title: "Fusion360ComplexPartCapabilityGate — master AI drives Fusion 360 to produce a multi-configuration sheet-metal enclosure (parametric variants + flat pattern + drawing)",
    acceptance: "Intent → Fusion360DiffusionHead (NN04) → Fusion360CADGeneratorAdapter → adsk.fusion execute → validated .f3d with ≥3 configs + flat patterns + drawing sheet; posted NC on ≥1 op." },
  { id: "U-CUIX-P7-16", title: "InventorComplexPartCapabilityGate — master AI drives Inventor to produce a sheet-metal weldment fixture (multi-body + weld beads + cut list + BOM)",
    acceptance: "Intent → InventorGNNHead (NN05) → InventorCADGeneratorAdapter → COM/iLogic execute → validated .ipt/.iam with weldment cut list + flat pattern + structured BOM; Model State per config." },
  { id: "U-CUIX-P7-17", title: "SolidWorksComplexPartCapabilityGate — master AI drives SolidWorks to produce a multi-config mold half (core/cavity + slider + ejector pins + drawing)",
    acceptance: "Intent → SolidWorksTransformerHead (NN06.SW) → SolidWorksCodeGeneratorAdapter (P0-18) → ISldWorks execute → validated .sldprt with ≥3 configs + Display States + parting surface + drawing; Windows license gate respected." },
  { id: "U-CUIX-P7-18", title: "FreeCADComplexPartCapabilityGate — master AI drives FreeCAD 1.0+ to produce an Arch BIM assembly (walls + structure + windows + IFC export) via Python",
    acceptance: "Intent → FreeCADPolicyRLHead (NN06.FC) → FreeCADCodeGeneratorEngine → Python execute → validated .FCStd with Arch entities + IFC 4.3 export; TNP 1.0+ ElementMap preserved across regen." },
  // Assembly gates — one per CAD
  { id: "U-CUIX-P7-19", title: "MastercamFullAssemblyCapabilityGate — master AI drives Mastercam Machine Group assembly: stock + fixture + ≥5 tools + ≥10 ops + posted multi-op NC",
    acceptance: "AssemblyPlannerEngine (P0-22) → Mastercam MachineGroup + Stock + Tool + Ops; assembly round-trip; NC output has all ops chained; OperationsManager dirty-flag cascade correct." },
  { id: "U-CUIX-P7-20", title: "HyperCADSFullAssemblyCapabilityGate — master AI drives hyperCAD-S full Job Tree assembly: ≥5 components + FT-matched macros + Virtual Machine kinematic sim + post",
    acceptance: "AssemblyPlannerEngine → HyperCADS Job Tree with linked FT features + Macro Database selections; Virtual Machine collision-free; posted NC on 1 controller." },
  { id: "U-CUIX-P7-21", title: "Fusion360FullAssemblyCapabilityGate — master AI drives Fusion 360 assembly with 15 joint types across ≥10 components + drawing set + animation",
    acceptance: "AssemblyPlannerEngine → Fusion components/occurrences + ≥7 joint types used + contact set + motion link; drawing sheet set (≥5 views) + animation storyboard; .f3z export intact." },
  { id: "U-CUIX-P7-22", title: "InventorFullAssemblyCapabilityGate — master AI drives Inventor assembly with Frame Generator + Tube & Pipe + Cable & Harness in single .iam + drawings",
    acceptance: "AssemblyPlannerEngine → Inventor .iam containing structural frame (Frame Generator) + at least 1 pipe route + 1 cable route; drawings regenerate all 3; BOM structured mode correct." },
  { id: "U-CUIX-P7-23", title: "SolidWorksFullAssemblyCapabilityGate — master AI drives SolidWorks assembly with all mate categories (Standard + Advanced + Mechanical + Magnetic) + Large Assembly Mode",
    acceptance: "AssemblyPlannerEngine → .sldasm with ≥15 mates across all 4 categories + configurations + display states + Large Assembly LDR mode validated on ≥50 components." },
  { id: "U-CUIX-P7-24", title: "FreeCADFullAssemblyCapabilityGate — master AI drives FreeCAD 1.0+ native Assembly env with joints + ExpressionEngine-driven constraints + TechDraw drawing set",
    acceptance: "AssemblyPlannerEngine → FreeCAD Assembly 1.0+ with ≥5 components + joints + App::PropertyXLink cross-doc refs + ExpressionEngine-driven dimensions + TechDraw drawing sheet; IFC export round-trip." },
  // Cross-CAD + end-to-end capstones
  { id: "U-CUIX-P7-25", title: "CrossCADConsistencyCapabilityGate — same intent produces semantically-equivalent parts on ≥3 of 6 CADs via MultiCADSessionEngine (CRD01)",
    acceptance: "CrossCADConsistencyValidator (CRD03) asserts feature-count + mass + BRep fingerprint within ε across 3 CAD targets on 3 reference intents." },
  { id: "U-CUIX-P7-26", title: "PrintToAssemblyEndToEndCapabilityGate — customer print PDF → BlueprintReadEngine + master AI → per-CAD choice → complex assembly → posted NC → delivery doc",
    acceptance: "E2E pipeline on 3 real JM Die customer prints (Alcoa/ITW/Optimas): PDF OCR → structured intent → master AI routes to appropriate CAD/CAM → complete .iam/.f3z/.sldasm + posted NC + setup sheet + inspection plan; signoff from CAD-UIX + master-brain feedback loop closed." },
];

const p7 = uix.phases.find((p) => p.phase_id === "P7-EXIT");
if (!p7) throw new Error("P7-EXIT not found");
for (const u of CAPABILITY_GATES) {
  if (p7.unit_list.some((x) => x.id === u.id)) throw new Error(`Dup: ${u.id}`);
  p7.unit_list.push(u);
}

// ── 2. Critical-path dependencies on P0-INFRA AI units ───────────────────
// Attach a `depends_on` array to each unit so the build order is explicit.
// Schema is additive — future units may read depends_on to sequence claims.
const DEPS = {
  // Adapters depend on the shared harvester infra already in P0
  "U-CUIX-P0-17": ["U-CUIX-P0-09"],  // HyperCADS adapter ← CADUIInputBridgeEngine base
  "U-CUIX-P0-18": ["U-CUIX-P0-09"],  // SolidWorks adapter ← base bridge
  // Dispatcher needs adapters registered first
  "U-CUIX-P0-19": ["U-CUIX-P0-17", "U-CUIX-P0-18"],
  // Planner needs all 6 adapters reachable
  "U-CUIX-P0-20": ["U-CUIX-P0-19"],
  // Complex-part planner needs operation planner
  "U-CUIX-P0-21": ["U-CUIX-P0-20"],
  // Assembly planner needs complex-part planner
  "U-CUIX-P0-22": ["U-CUIX-P0-20", "U-CUIX-P0-21"],
};
for (const phase of uix.phases) {
  for (const u of phase.unit_list) {
    if (DEPS[u.id]) u.depends_on = DEPS[u.id];
  }
}
// Each capability gate (P7-13..24) depends on its CAD's NN head + AssemblyPlanner (where applicable)
const CAPABILITY_DEPS = {
  "U-CUIX-P7-13": ["U-CADC-NN02", "U-CUIX-P0-21"],              // Mastercam complex part
  "U-CUIX-P7-14": ["U-CADC-NN03", "U-CUIX-P0-17", "U-CUIX-P0-21"],
  "U-CUIX-P7-15": ["U-CADC-NN04", "U-CUIX-P0-21"],
  "U-CUIX-P7-16": ["U-CADC-NN05", "U-CUIX-P0-21"],
  "U-CUIX-P7-17": ["U-CADC-NN06", "U-CUIX-P0-18", "U-CUIX-P0-21"],
  "U-CUIX-P7-18": ["U-CADC-NN06", "U-CUIX-P0-21"],
  "U-CUIX-P7-19": ["U-CUIX-P7-13", "U-CUIX-P0-22"],
  "U-CUIX-P7-20": ["U-CUIX-P7-14", "U-CUIX-P0-22"],
  "U-CUIX-P7-21": ["U-CUIX-P7-15", "U-CUIX-P0-22"],
  "U-CUIX-P7-22": ["U-CUIX-P7-16", "U-CUIX-P0-22"],
  "U-CUIX-P7-23": ["U-CUIX-P7-17", "U-CUIX-P0-22"],
  "U-CUIX-P7-24": ["U-CUIX-P7-18", "U-CUIX-P0-22"],
  "U-CUIX-P7-25": ["U-CADC-CRD01", "U-CADC-CRD03"],
  "U-CUIX-P7-26": [
    "U-CUIX-P7-19", "U-CUIX-P7-20", "U-CUIX-P7-21",
    "U-CUIX-P7-22", "U-CUIX-P7-23", "U-CUIX-P7-24",
    "U-CADC-LP01", "U-CADC-LP04",
  ],
};
for (const u of p7.unit_list) {
  if (CAPABILITY_DEPS[u.id]) u.depends_on = CAPABILITY_DEPS[u.id];
}

// ── 3. Recount + update ───────────────────────────────────────────────────
const sum = uix.phases.reduce((s, p) => s + p.unit_list.length, 0);
uix.total_units = sum;

// Extend round-3 findings with capability-lock pass
if (!uix.scrutiny_round_3_findings) uix.scrutiny_round_3_findings = {};
uix.scrutiny_round_3_findings.capability_lock_extension = {
  timestamp: new Date().toISOString(),
  rationale:
    "User directive: 'update the road map to ensure we're capable of doing this' — this = master AI + per-CAD NN/ML fully controls each of the 6 priority CADs to produce highly complex parts + full assemblies. Round 3 specified the units; capability-lock adds (a) 14 P7 exit gates that PROVE the chain works end-to-end per CAD, (b) critical-path depends_on edges so claim/build order is explicit, (c) supersedes 10 empty CADCAM-AGI/DEEPAGI/DAGI envelopes to prevent re-fragmentation.",
  capability_gates_added: CAPABILITY_GATES.map((u) => u.id),
  critical_path_deps_added: Object.keys(DEPS).concat(Object.keys(CAPABILITY_DEPS)),
  total_units_before_capability_lock: 439,
  total_units_after: sum,
};

writeFileSync(UIX, JSON.stringify(uix, null, 2) + "\n", "utf8");

// ── 4. Supersede 10 empty envelopes in roadmap-index ─────────────────────
const SUPERSEDED_IDS = [
  "CADCAM-AGI-MS0", "CADCAM-DEEPAGI-MASTER",
  "CADCAM-DAGI-MS0", "CADCAM-DAGI-MS1", "CADCAM-DAGI-MS2",
  "CADCAM-DAGI-MS3", "CADCAM-DAGI-MS4", "CADCAM-DAGI-MS5",
  "CADCAM-DAGI-MS6", "CADCAM-DAGI-MS7",
];
const SUPERSEDE_NOTE =
  `Superseded ${DATE} by CAD-COMPLETE-MS0 (PHASE-30/31/33/34 AI control + NN + cross-CAD + learning propagation, ` +
  `17 renamed units) + CAD-UIX-MS0 (P0-INFRA AI-integration units + P7-EXIT capability gates). ` +
  `Empty shell at supersession: 0 phases / 0 unit_list entries. Do NOT populate; route new AI-control scope to CAD-COMPLETE + CAD-UIX.`;

let superseded = 0;
for (const id of SUPERSEDED_IDS) {
  const m = idx.milestones.find((x) => x.id === id);
  if (!m) { console.warn(`Note: ${id} not in roadmap-index — skip`); continue; }
  m.status = "superseded";
  m.superseded_by = ["CAD-COMPLETE-MS0", "CAD-UIX-MS0"];
  m.superseded_at = DATE;
  m.description = (m.description || "") + " [SUPERSEDED] " + SUPERSEDE_NOTE;
  superseded++;
}

// Mirror UIX total_units + capability-lock note
const uixEntry = idx.milestones.find((m) => m.id === "CAD-UIX-MS0");
uixEntry.total_units = sum;
uixEntry.description = (uixEntry.description || "").replace(/\s*$/, "") +
  ` CAPABILITY LOCK (${DATE}): +14 P7 capability gates (6 complex-part + 6 full-assembly + 1 cross-CAD + 1 E2E) = ${sum}u total; critical-path depends_on edges set on P0-17..22 + P7-13..26; 10 CADCAM-AGI/DEEPAGI/DAGI envelopes superseded.`;

idx.updated_at = new Date().toISOString();
writeFileSync(IDX, JSON.stringify(idx, null, 2) + "\n", "utf8");

console.log("CAD-UIX-MS0 total_units: " + uix.total_units + " (was 439, +14)");
console.log("P7-EXIT units: " + p7.unit_list.length);
console.log("Superseded envelopes: " + superseded + "/" + SUPERSEDED_IDS.length);
console.log("Critical-path deps set on: " + (Object.keys(DEPS).length + Object.keys(CAPABILITY_DEPS).length) + " units");
