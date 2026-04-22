#!/usr/bin/env node
/**
 * CAD-UIX-MS0 Scrutiny Round 2 — gap-fill units + axis 15
 * One-off mutator for data/milestones/CAD-UIX-MS0.json and data/roadmap-index.json.
 *
 * Plan: H:/.claude/plans/piped-soaring-crab.md
 */
import { readFileSync, writeFileSync } from "node:fs";

const ENV_PATH = "H:/PRISM/mcp-server/data/milestones/CAD-UIX-MS0.json";
const IDX_PATH = "H:/PRISM/mcp-server/data/roadmap-index.json";
const ROUND2_DATE = "2026-04-21";

const env = JSON.parse(readFileSync(ENV_PATH, "utf8"));
const idx = JSON.parse(readFileSync(IDX_PATH, "utf8"));

// ── 1. Append axis 15 ─────────────────────────────────────────────────────
const AXIS_15 = {
  axis_id: 15,
  name: "function_signature_catalog",
  depth: "Every API method per CAD with full parameter signature: param name, type, unit, domain (range/enum), default, required, depends_on, callable-from (COM/.NET/Python/VBA/scripting), side-effects (read/write/transact). Mastercam NetHook3+CHook+COM ~10K; HyperCAD-S NetSDK+AutomationCenter ~2500; Fusion adsk.core/adsk.fusion/adsk.cam/adsk.drawing ~3500; Inventor COM+iLogic+Apprentice+Add-In ~6000; SolidWorks ISldWorks+PropertyManagerPage+~250 events+EPDM ~17000; FreeCAD App+Gui+Part+PartDesign+Sketcher+Draft+TechDraw+Path+Fem ~8000. Sums to ~47K function inputs across 6 priority CADs.",
  est_count_per_cad: "2500-17000",
};
if (env.exhaustion_axes.length !== 14) {
  throw new Error(`Expected 14 axes, found ${env.exhaustion_axes.length}`);
}
env.exhaustion_axes.push(AXIS_15);

// ── 2. Append 21 gap-fill units across 7 phases ───────────────────────────
const ADDITIONS = {
  "P0-INFRA": [
    {
      id: "U-CUIX-P0-16",
      title: "FunctionSignatureCatalogEngine — shared harvester base for axis 15 across all 6 priority CADs",
      acceptance: "Emits a per-CAD function_signature_catalog.json conforming to Zod schema {id, cad, module, method, signature:{name,type,unit,domain,default,required,depends_on}, callable_from, side_effects}; feeds U-CUIX-P1-38/P2-31/P3-50/P4-80/P5-31/P6-18; parity test exercises ≥10 methods per CAD with round-trip equivalence.",
    },
  ],
  "P1-MASTERCAM": [
    {
      id: "U-CUIX-P1-35",
      title: "MastercamSketchToolsEngine — Wireframe/Solids/Surfaces sketch entity set (line/arc/circle/rect/polygon/spline/ellipse/slot/point) + constraints where supported + dimensions",
      acceptance: "Catalog ≥80 sketch entity+constraint entries; cross-validated against Mastercam 2024/2025 Wireframe ribbon and Solids sketch environment; round-trip emit→parse equals.",
    },
    {
      id: "U-CUIX-P1-36",
      title: "MastercamConfigurationsEngine — MachineGroup/MachineDefinition/ControlDefinition variants + parameter-driven op templates + per-config tool/stock overlays",
      acceptance: "Catalog covers ≥20 configuration surfaces across MachineGroup Properties (Files/Tool Settings/Stock Setup/Safety Zones/etc.); swap-variant test preserves posted-NC equivalence on 3 golden parts.",
    },
    {
      id: "U-CUIX-P1-37",
      title: "MastercamLicenseTierEngine — UI gating per license (Mill Entry / Router / Mill Expert / Mill 3D / Mill-Turn / Swiss / Wire EDM / Swiss Expert / Design)",
      acceptance: "Catalog enumerates ≥9 tier surfaces; per-tier ribbon/dialog visibility diff produced; HASP/Sentinel license-string → capability map authored.",
    },
    {
      id: "U-CUIX-P1-38",
      title: "MastercamFunctionSignatureCatalog — NetHook3 C# + CHook C++ + COM Automation method-level signature capture (est ~10K methods)",
      acceptance: "Catalog ≥8000 function signatures with full parameter signature shape (axis 15); cross-validated against shipped NetHook3 assemblies (Mastercam.IO, Mastercam.App, Mastercam.Database, Mastercam.Curves, Mastercam.Solids, Mastercam.Tools, Mastercam.Toolpaths); coverage gate 0.80.",
    },
  ],
  "P2-HYPERCAD-S": [
    {
      id: "U-CUIX-P2-29",
      title: "HyperCADSOptionsPreferencesEngine — Application Options + Document Properties + Viewport preferences + unit systems + display templates",
      acceptance: "Catalog ≥150 preference entries across App/Doc/Viewport scopes; defaults per license tier documented; template round-trip preserves settings.",
    },
    {
      id: "U-CUIX-P2-30",
      title: "HyperCADSConfigurationsEngine — Feature Technology variants + Macro parameterization + Job variants + Tool/Holder variants per machine",
      acceptance: "Catalog ≥40 configuration surfaces (FT-variant + Macro-param); swap-variant test regenerates 3 golden parts with posted-NC equivalence.",
    },
    {
      id: "U-CUIX-P2-31",
      title: "HyperCADSFunctionSignatureCatalog — NetSDK C# + AutomationCenter COM + Macro VBA-like + FT/Job/Tool/Project/NCPost/Drawing/VirtualMachining/Electrode APIs (est ~2500 methods)",
      acceptance: "Catalog ≥2000 function signatures; license-tier annotation per method; coverage gate 0.80.",
    },
  ],
  "P3-FUSION360": [
    {
      id: "U-CUIX-P3-49",
      title: "Fusion360ConfigurationsEngine — 2024+ Configurations feature (configuration table + activation + feature suppression per config) + Simulation study variants + Generative study variants",
      acceptance: "Catalog ≥60 configuration surfaces incl. Configurations dialog + per-config parameter overrides + study-variant matrix; swap-variant test preserves adsk.fusion model state roundtrip.",
    },
    {
      id: "U-CUIX-P3-50",
      title: "Fusion360FunctionSignatureCatalog — adsk.core + adsk.fusion + adsk.cam + adsk.drawing + adsk.simulation + adsk.generativeDesign + adsk.nesting + adsk.electrical + adsk.additive + adsk.data (est ~3500 methods)",
      acceptance: "Catalog ≥3000 function signatures cross-validated against apihelp.autodesk.com; extension-gated methods flagged; coverage gate 0.85.",
    },
  ],
  "P4-INVENTOR": [
    {
      id: "U-CUIX-P4-79",
      title: "InventorFeatureTreeEngine — 40+ node types × Part/Assembly/Drawing environments + ModelStates (2022+) + legacy Configurations + DimXpert tree + Presentation IPN storyboard tree",
      acceptance: "Catalog ≥40 node types × 4 environment trees (Part/Assembly/Drawing/IPN); rollback + suppress + flexible + adaptive + locked-external state transitions tested; drag-drop semantics documented.",
    },
    {
      id: "U-CUIX-P4-80",
      title: "InventorFunctionSignatureCatalog — Inventor COM (C#/VB.NET/VBA) + iLogic Automation + Apprentice Server + Add-In framework (est ~6000 methods)",
      acceptance: "Catalog ≥5000 function signatures; iLogic Internal/External/Event-triggered/iTrigger annotated per method; coverage gate 0.85.",
    },
  ],
  "P5-SOLIDWORKS": [
    {
      id: "U-CUIX-P5-27",
      title: "SolidWorksFeatureTreeEngine — FeatureManager + ConfigurationManager + DimXpertManager + DisplayManager + MotionManager trees + Display States overlay + flexible/adaptive/external states",
      acceptance: "Catalog all 5 tree panels with node-type enumeration; Configurations × Display States overlay matrix documented; rollback bar + external-reference state transitions tested.",
    },
    {
      id: "U-CUIX-P5-28",
      title: "SolidWorksOptionsPreferencesEngine — System Options (17 categories) + Document Properties (20+ categories) + File Locations + keyboard customization + mouse gestures",
      acceptance: "Catalog ≥400 preference entries; per-template defaults authored; System vs Document scope clearly partitioned.",
    },
    {
      id: "U-CUIX-P5-29",
      title: "SolidWorksLicenseTierEngine — Std/Pro/Prem + Simulation Std/Pro/Prem + Flow Simulation + Plastics + PDM Std/Pro + Electrical Schematic/3D + Visualize + Inspection + Composer (≥15 tiers)",
      acceptance: "Catalog ≥15 tier surfaces with per-tier ribbon/dialog visibility diff; SolidNetWork License Manager tier-string → capability map authored.",
    },
    {
      id: "U-CUIX-P5-30",
      title: "SolidWorksCAMWorksPostOutputEngine — integrated CAMWorks post surface + Mastercam-for-SolidWorks bridge post pipeline + HSM-Works legacy posts",
      acceptance: "Catalog ≥50 post-related surfaces across CAMWorks tech db + Mastercam-for-SW + HSMWorks posts; posted-NC equivalence on 2 golden parts per path.",
    },
    {
      id: "U-CUIX-P5-31",
      title: "SolidWorksFunctionSignatureCatalog — ISldWorks + ISwAddin + PropertyManagerPage (~40 control types) + event handlers (~250 events) + Toolbox + Routing + Simulation + Flow + DriveWorks + eDrawings + EPDM (est ~17000 methods)",
      acceptance: "Catalog ≥13000 function signatures; COM-only/Windows-only/license-gated flags per method; coverage gate 0.80.",
    },
  ],
  "P6-FREECAD": [
    {
      id: "U-CUIX-P6-15",
      title: "FreeCADContextMenuEngine — workbench-scoped right-click entries × viewport/tree/face/edge/vertex/sketch-entity/component/drawing-view with command.isActive gating rules",
      acceptance: "Catalog ≥200 context-menu entries across 22 workbenches; isActive-rule per entry documented; multi-select behavior tested.",
    },
    {
      id: "U-CUIX-P6-16",
      title: "FreeCADFeatureTreeEngine — App::Part vs Body distinction + Tip feature + Link/XLink (Realthunder) + TNP version regimes (0.19/0.20/0.21/1.0) + Transaction/Undo stack semantics",
      acceptance: "Catalog covers all 4 TNP regimes with per-regime node-naming rules; Body/Part/Link placement cascade through 3-level hierarchy tested; Tip-feature reassignment state machine validated.",
    },
    {
      id: "U-CUIX-P6-17",
      title: "FreeCADConfigurationsEngine — Spreadsheet-driven + ExpressionEngine parameter variants + App::PropertyLink cross-doc + multi-doc driver model",
      acceptance: "Catalog ≥30 configuration surfaces (Spreadsheet cells as drivers + Expression bindings + cross-doc PropertyLink); swap-variant test regenerates 3 parts with equivalent BRep fingerprints.",
    },
    {
      id: "U-CUIX-P6-18",
      title: "FreeCADFunctionSignatureCatalog — App (Document/Object/Property 30+ types) + Gui (ViewObject/Selection/Command) + Part (TopoShape/BRep*) + PartDesign (Body/Features) + Sketcher (constraints 30+) + Draft (~40) + TechDraw + Path (~100 postprocessors) + Mesh + Fem (est ~8000 methods)",
      acceptance: "Catalog ≥6500 function signatures; Python-introspection harvested via `dir()`/`inspect` at v1.0.1 baseline; workbench-scoped identity preserved; coverage gate 0.70.",
    },
  ],
};

let added = 0;
for (const [phaseId, newUnits] of Object.entries(ADDITIONS)) {
  const phase = env.phases.find((p) => p.phase_id === phaseId);
  if (!phase) throw new Error(`Phase ${phaseId} not found`);
  if (!Array.isArray(phase.unit_list)) throw new Error(`Phase ${phaseId} missing unit_list`);
  for (const u of newUnits) {
    if (phase.unit_list.some((x) => x.id === u.id)) {
      throw new Error(`Duplicate unit id ${u.id} in ${phaseId}`);
    }
    phase.unit_list.push(u);
    added++;
  }
}
if (added !== 21) throw new Error(`Expected 21 additions, got ${added}`);

// ── 3. Round 2 findings ───────────────────────────────────────────────────
const GAP_FILL_IDS = Object.values(ADDITIONS).flat().map((u) => u.id);
env.scrutiny_round_2_complete = true;
env.scrutiny_round_2 = {
  date: ROUND2_DATE,
  method: "2-agent parallel scrutiny — Explore agent for (axis × CAD) zero-cell audit + Explore agent for scaffolding/schema/hook conventions",
  agents_dispatched: 2,
  unit_estimate_before: 255,
  unit_estimate_after: 276,
  expansion_factor: 1.08,
  axes_before: 14,
  axes_after: 15,
  axes_added: ["function_signature_catalog"],
};
env.scrutiny_round_2_findings = {
  timestamp: new Date().toISOString(),
  agents_run: 2,
  rationale:
    "User emphasis on 'every single input AND FUNCTION INPUTS' surfaced two round-1 gaps: (a) 15 confirmed (CAD × axis) zero cells from a title-keyword audit cross-checked by Explore agent, (b) function-signature cataloging was implicit sub-scope of per-subsystem engines rather than a first-class axis with its own coverage gate.",
  gap_fills_added: GAP_FILL_IDS,
  axis_added: {
    axis_id: 15,
    name: "function_signature_catalog",
    rationale:
      "Promotes 'every function input' from an implicit sub-scope to a first-class exhaustion axis with its own per-CAD coverage gate. Est ~47K function inputs across 6 priority CADs.",
  },
  skipped_with_rationale: [
    {
      cell: "P6-FREECAD × license_matrix (axis 12)",
      rationale: "FreeCAD is OSS with no license tiers; axis 12 is N/A for this CAD.",
    },
  ],
  zero_cells_confirmed_by_explore_agent: [
    "P1-MASTERCAM × sketch_environment",
    "P1-MASTERCAM × configuration_variant_system",
    "P1-MASTERCAM × license_matrix_infrastructure",
    "P2-HYPERCAD-S × settings_preferences",
    "P2-HYPERCAD-S × configuration_variant_system",
    "P3-FUSION360 × configuration_variant_system",
    "P4-INVENTOR × feature_part_tree",
    "P5-SOLIDWORKS × feature_part_tree",
    "P5-SOLIDWORKS × settings_preferences",
    "P5-SOLIDWORKS × license_matrix_infrastructure",
    "P5-SOLIDWORKS × post_processor_nc_output",
    "P6-FREECAD × context_menus",
    "P6-FREECAD × feature_part_tree",
    "P6-FREECAD × configuration_variant_system",
    "P6-FREECAD × license_matrix_infrastructure (skipped — N/A for OSS)",
  ],
  total_units_before: 255,
  total_units_after: 276,
  coverage_gates_unchanged: true,
  priority_order_unchanged: true,
};

// ── 4. total_units bump ───────────────────────────────────────────────────
const actual = env.phases.reduce((s, p) => s + (p.unit_list?.length || 0), 0);
if (actual !== 276) throw new Error(`Parity check failed: sum of unit_list = ${actual}, expected 276`);
env.total_units = 276;

// ── 5. Write envelope ─────────────────────────────────────────────────────
writeFileSync(ENV_PATH, JSON.stringify(env, null, 2) + "\n", "utf8");

// ── 6. Mirror in roadmap-index.json ───────────────────────────────────────
const entry = idx.milestones.find((m) => m.id === "CAD-UIX-MS0");
if (!entry) throw new Error("CAD-UIX-MS0 not found in roadmap-index.json");
entry.total_units = 276;
entry.scrutiny_round_2_complete = true;
entry.description = (entry.description || "").replace(/\s*$/, "") +
  ` Round 2 (${ROUND2_DATE}): +21 gap-fill units + axis 15 function_signature_catalog = 276u total.`;
idx.updated_at = new Date().toISOString();
writeFileSync(IDX_PATH, JSON.stringify(idx, null, 2) + "\n", "utf8");

console.log("envelope: axes=" + env.exhaustion_axes.length + " units_sum=" + actual + " total_units=" + env.total_units);
console.log("index: total_units=" + entry.total_units + " scrutiny_round_2_complete=" + entry.scrutiny_round_2_complete);
console.log("gap_fill_ids: " + GAP_FILL_IDS.join(", "));
