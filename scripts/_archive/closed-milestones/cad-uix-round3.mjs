#!/usr/bin/env node
/**
 * CAD-UIX-MS0 Scrutiny Round 3 — 163 new units across 7 phases + rename 17
 * boilerplate units in CAD-COMPLETE-MS0 PHASE-30/31/33/34 (AI control +
 * neural architectures + cross-CAD coord + learning propagation).
 *
 * Source: 7 parallel Agent reports (6 CAD specialists + 1 AI-integration audit),
 * 2026-04-21.
 *
 * This is a roadmap-only change — no engine code. Plan:
 * H:/.claude/plans/piped-soaring-crab.md (extended for round 3).
 */
import { readFileSync, writeFileSync } from "node:fs";

const UIX = "H:/PRISM/mcp-server/data/milestones/CAD-UIX-MS0.json";
const CC = "H:/PRISM/mcp-server/data/milestones/CAD-COMPLETE-MS0.json";
const IDX = "H:/PRISM/mcp-server/data/roadmap-index.json";
const ROUND3_DATE = "2026-04-21";

const uix = JSON.parse(readFileSync(UIX, "utf8"));
const cc = JSON.parse(readFileSync(CC, "utf8"));
const idx = JSON.parse(readFileSync(IDX, "utf8"));

// ── CAD-UIX-MS0 additions ────────────────────────────────────────────────
const ADD = {
  // P0-INFRA: +6 units (AI-integration layer from round-3 auditor)
  "P0-INFRA": [
    { id: "U-CUIX-P0-17", title: "HyperCADSCodeGeneratorAdapter — extends UnifiedCADCodeGeneratorBase for hyperCAD-S AutomationCenter Python emission",
      acceptance: "Adapter covers all 85+ CAD_OPERATION_KINDS; supportedOps matrix ≥80%; round-trip emit→execute→extract on 3 reference parts; registered with cadAdapterRegistry." },
    { id: "U-CUIX-P0-18", title: "SolidWorksCodeGeneratorAdapter — extends UnifiedCADCodeGeneratorBase for SW COM/.NET emission (Windows license-gated)",
      acceptance: "Adapter covers full CAD_OPERATION_KINDS vocabulary via ISldWorks + ModelDoc2 interfaces; supportedOps matrix ≥85%; infra gate documented; round-trip on 3 reference parts when SW license present." },
    { id: "U-CUIX-P0-19", title: "PrismCADDispatcherActions — prism_cad.build_part + build_assembly + plan_ops MCP action group routed per cadSystem",
      acceptance: "3 new actions in prism_cad dispatcher; routes by cadSystem to correct adapter singleton; Zod schemas in cadActionSchemas.ts; 6/6 priority CADs invokable via MCP." },
    { id: "U-CUIX-P0-20", title: "CADOperationPlannerEngine — intent/feature spec → ordered CADOperation[] with dependency graph + per-CAD retarget",
      acceptance: "Accepts structured intent (feature tree + constraints + target CAD); emits valid CADOperation sequence; same intent produces valid output on ≥3 CADs with adapter-respecting op reorder." },
    { id: "U-CUIX-P0-21", title: "ComplexPartPlannerEngine — multi-feature, multi-body, multi-configuration part planning",
      acceptance: "Generates ≥10 JM-die-representative complex parts (multi-body fastener dies, cavity + core blocks, multi-config families) across ≥4 adapters with posted-geometry equivalence." },
    { id: "U-CUIX-P0-22", title: "AssemblyPlannerEngine — components + mates/joints + BOM + drawing-view set planning",
      acceptance: "Generates reference 5-component assembly with mates/joints, BOM, exploded view, drawing sheet set; round-trips on Fusion/Inventor/SolidWorks/FreeCAD adapters with mate topology preserved." },
  ],
  // P1-MASTERCAM: +22 units (ribbon coverage, managers, post debugger, SW bridge, probing)
  "P1-MASTERCAM": [
    { id: "U-CUIX-P1-39", title: "MastercamTransformEngine — Translate/Rotate/Mirror/Scale/Offset/Offset-Contour/Project/Trim-Extend/Dynamic-Xform/Fit-to-Frame/Stretch/Roll/Unroll (Transform ribbon)",
      acceptance: "Catalog ≥14 transform dialogs; bridge applies each to wireframe+solid+mesh; delta-matrix test round-trip." },
    { id: "U-CUIX-P1-40", title: "MastercamAnalyzeManagerEngine — Entity/Position/Distance/Area-Volume/Angle/Chain/Contour/Surface-Curvature/Dynamic/Check/Compare (Analyze ribbon)",
      acceptance: "Catalog ≥12 analyze probes; bridge returns identical values to Mastercam reference on 5 synthetic parts." },
    { id: "U-CUIX-P1-41", title: "MastercamSurfacesEngine — Loft/Revolve/Sweep/Ruled/Coons/Net/Draft/Offset/Extend/Trim/Untrim/Flat-Patterning/Primitive (Surfaces ribbon)",
      acceptance: "Catalog ≥18 surface creation/edit dialogs; topology round-trip on 3 golden surfaces." },
    { id: "U-CUIX-P1-42", title: "MastercamSolidsEngine — Extrude/Revolve/Sweep/Loft/Boolean/Fillet/Chamfer/Shell/Thicken/Draft/Hole/Pattern/Thread-on-Solid/Variable-Fillet (Solids ribbon)",
      acceptance: "Catalog ≥20 solid-creation dialogs + 8 edit ops; feature tree persists across save." },
    { id: "U-CUIX-P1-43", title: "MastercamMeshEngine — Mesh creation/repair/decimation/boolean/convert-to-solid/STL-export/remesh/smooth/wrap (Mesh ribbon)",
      acceptance: "≥12 mesh operations covered; round-trip STL import→edit→export matches." },
    { id: "U-CUIX-P1-44", title: "MastercamFileIOEngine — Open/Save/Import/Export for STEP/IGES/Parasolid/SolidWorks/Inventor/CATIA/Pro-E-Creo/NX/ACIS/DXF/DWG/STL/VDA + part-name/search-path config",
      acceptance: "≥14 file-format adapters; round-trip preservation tests." },
    { id: "U-CUIX-P1-45", title: "MastercamPostDebuggerEngine — MP Post Debugger IDE: breakpoints, step-in, watch vars, string buffer inspection, postblock call stack",
      acceptance: "Load stock post, set 5 breakpoints, step through 1 op, verify variable state matches manual expected." },
    { id: "U-CUIX-P1-46", title: "MastercamPostSwitchRuntimeEngine — runtime post-switch (in-session controller swap) + post-chain handoff + variable migration",
      acceptance: "Swap post mid-session; re-regen on all ops; NC header+footer reflects new control." },
    { id: "U-CUIX-P1-47", title: "MastercamForSolidWorksBridge — Mastercam for SolidWorks add-in COM/REST bridge: sync part edits, propagate feature tree, associativity",
      acceptance: "SW-edit feature → Mastercam ops mark dirty → regen passes NC diff <1%." },
    { id: "U-CUIX-P1-48", title: "MastercamVersionFormatMatrixEngine — X8/X9/2017/2018/2019/2020/2021/2022/2023/2024/2025 file-format + dialog-delta catalog",
      acceptance: "≥11 version deltas documented; migration path test on 5 files each version." },
    { id: "U-CUIX-P1-49", title: "MastercamAccelerated3DFinishingEngine — Accelerated Finishing dialog + tool-form (barrel/oval/lens) + step-over math",
      acceptance: "Catalog 4 form types; param set (step/contact-angle/overlap) validated; NC diff <1% vs golden." },
    { id: "U-CUIX-P1-50", title: "MastercamProbingEngine — On-machine probing cycles (Renishaw Inspection Plus, Mastercam Probe): Part-Setup/Feature-Probe/Tool-Probe/Reporting",
      acceptance: "≥10 probe routines; posted NC validates on Fanuc + Okuma." },
    { id: "U-CUIX-P1-51", title: "MastercamLatheYBCAxisContourEngine — Y-axis contour + B-axis turning + driven-tool milling + polar interpolation (lathe ribbon advanced)",
      acceptance: "4 live-tool ops; C→Y interpolation verified; Okuma-style post compliant." },
    { id: "U-CUIX-P1-52", title: "MastercamRefLineManagerEngine — Reference Line Manager + Geometry Tolerance + Layout sheets",
      acceptance: "Ref-line schema; bridge creates/edits; persists save/load." },
    { id: "U-CUIX-P1-53", title: "MastercamRecentFunctionsManagerEngine — Recent Functions panel + Function Search + ribbon pin/customize",
      acceptance: "Catalog personalization API; pin/unpin round-trip; search index." },
    { id: "U-CUIX-P1-54", title: "MastercamDrillingPointManagerEngine — Drill-Point Manager: manual/auto-point selection, sort-by-proximity/tool-tip/XY, depth-from-geometry",
      acceptance: "4 sort modes; 3 depth-ref modes; order deterministic." },
    { id: "U-CUIX-P1-55", title: "MastercamWorkOffsetsManagerEngine — WCS/G54-G59/P-extensions/origin-per-operation + fixture offset cascade",
      acceptance: "Multi-WCS job; per-op offset override; posted NC M-codes match." },
    { id: "U-CUIX-P1-56", title: "MastercamNetHook3EventHooksEngine — App events (OnPartLoad/OnOpGenerate/OnPost/OnChainChange/OnStockUpdate) + custom toolbar hosting",
      acceptance: "8 event subscriptions fire on bridge-driven actions; custom button registers." },
    { id: "U-CUIX-P1-57", title: "MastercamNestingEngine — 2D/True-Shape/Guillotine nesting, Mastercam.Nesting namespace, multi-sheet layout",
      acceptance: "≥5 nesting strategies; yield metric validated; NC output per sheet." },
    { id: "U-CUIX-P1-58", title: "MastercamSupportUtilitiesEngine — Mastercam.Support + Mastercam.Math namespace (vector/matrix/geometry utilities used by all managers)",
      acceptance: "≥100 utility methods exposed; cross-check vs Mastercam API docs." },
    { id: "U-CUIX-P1-59", title: "MastercamLicenseRuntimeEngine — HASP/Sentinel LDK runtime detection, Maintenance/Subscription tier, CodeMeter fallback, feature-code-to-UI-gate map",
      acceptance: "Detects 3 license states; gates ribbon accordingly; matches P1-37 spec at runtime." },
    { id: "U-CUIX-P1-60", title: "MastercamCoverageRegen2Engine — posted-NC equivalence gate ≥95% across 500 JM Die programs spanning X8→2025 versions",
      acceptance: "500-file regen; ≥95% line-identical NC; chain rebind 100%; posts on 4 controllers." },
  ],
  // P2-HYPERCAD-S: +20 units
  "P2-HYPERCAD-S": [
    { id: "U-CUIX-P2-32", title: "HyperCADSFTDatabaseEngine — parse/write OPEN MIND FT XML (.ftdb); FT CRUD adapter",
      acceptance: "Round-trip on ≥20 real feature defs with param sets, tol classes, pattern rules." },
    { id: "U-CUIX-P2-33", title: "HyperCADSAutoFeatureRecognitionBridge — invoke hyperMILL AutoFeature via FT API",
      acceptance: "≥95% recall vs manually-tagged pocket/hole/boss corpus from JM Die SOLID archive." },
    { id: "U-CUIX-P2-34", title: "HyperCADSMacroDatabaseIOEngine — read/write hyperMILL Macro Library (.mdb)",
      acceptance: "Preserve strategy chain + tool refs + cutting-data refs; semantic diff of two .mdb files." },
    { id: "U-CUIX-P2-35", title: "HyperCADSStrategyParamRegistryEngine — catalog strategy param enums (HPC/HSC/5X-Rework/Rest-Machining/Z-Level/Equidistant/Profile)",
      acceptance: "Validated against 2020.2–2025.1 schemas." },
    { id: "U-CUIX-P2-36", title: "HyperCADSUserMacroAuthoringEngine — author custom macros keyed to FT tokens",
      acceptance: "Tool/stock/approach binding survives FT re-recognition." },
    { id: "U-CUIX-P2-37", title: "HyperCADSJobStateMachineEngine — Job states (Calculated/Outdated/Error/Linked) + parent/child deps DAG",
      acceptance: "Detect cycles + broken Job Linker refs on ≥5 test DAGs." },
    { id: "U-CUIX-P2-38", title: "HyperCADSJobLinkerEngine — cross-project Job reference resolution + stale-link detection + auto-reheal",
      acceptance: "Broken cross-link auto-rehealed via Project API on source change." },
    { id: "U-CUIX-P2-39", title: "HyperCADSBatchOrchestratorEngine — queue N Jobs w/ priority + resource locks + crash-resume",
      acceptance: "Batch N=20 jobs; deterministic resume after mid-batch kill." },
    { id: "U-CUIX-P2-40", title: "HyperCADSNCPostDialectEngine — post authoring for Heidenhain iTNC/TNC7, Siemens 840D/One, Fanuc 30i, Okuma OSP",
      acceptance: "G-code parity vs JM Die golden outputs on 4 controllers." },
    { id: "U-CUIX-P2-41", title: "HyperCADSNCPostDebuggerEngine — step through post with breakpoints, inspect $VAR/$TOOL/$FEATURE scope",
      acceptance: "Trace matches hyperMILL's native debugger on 5 golden fixtures." },
    { id: "U-CUIX-P2-42", title: "HyperCADSNCPostLibraryEngine — registry of posts per machine + post-switch migration",
      acceptance: "Re-post of existing Job to new controller yields expected G-code delta (dialect only, not geometry)." },
    { id: "U-CUIX-P2-43", title: "HyperCADSVirtualMachineKinematicEngine — parse machine-def (carriers/axes/offsets tree) + mass/inertia schema",
      acceptance: "Validated against Hermle/DMG/Makino fixtures; kinematic chain matches reference." },
    { id: "U-CUIX-P2-44", title: "HyperCADSCollisionClassEngine — Tool/Holder/Stock/Fixture/Machine collision classes + crash-back",
      acceptance: "Detect first-crash timestamp; rollback to pre-collision block on 3 contrived cases." },
    { id: "U-CUIX-P2-45", title: "HyperCADSApproachRetractRuleEngine — Ramp/helix/plunge/lead-in/lead-out + safe-plane rules per strategy",
      acceptance: "Safe-plane math matches hyperMILL on 5 5X contour cases." },
    { id: "U-CUIX-P2-46", title: "HyperCADSMAXXTrochoidalEngine — trochoidal step, engagement angle, specific-load cap",
      acceptance: "MAXX output equivalence vs hyperMILL reference on 3 cases." },
    { id: "U-CUIX-P2-47", title: "HyperCADSBestFitAutoToolpathEngine — AutoFeature → BestFit Tool → AutoToolpath chain",
      acceptance: "Top-1 tool matches operator pick on JM Die corpus ≥80%." },
    { id: "U-CUIX-P2-48", title: "HyperCADSProbingCycleBuilderEngine — Renishaw Inspection Plus, Blum Productivity+, Hexagon OMP macros",
      acceptance: "WCS-update, tool-break, part-setting cycles parse on ≥2 controllers." },
    { id: "U-CUIX-P2-49", title: "HyperCADSElectrodeWorkflowEngine — Design → Machine → Burn; .elx round-trip + burn-table emit",
      acceptance: "Round-trip .elx electrode files; burn table emitted for Mitsubishi EA12D." },
    { id: "U-CUIX-P2-50", title: "HyperCADSLiveBridgeEngine — detect hyperCAD Live session + mirror sketch/solid changes bidirectionally",
      acceptance: "Edit-in-Live reflects in hyperCAD-S within 1 refresh." },
    { id: "U-CUIX-P2-51", title: "HyperCADSAutomationCenterEventsEngine — COM ribbon/button registration + CommandDispatch events",
      acceptance: "≥12 event types fire (BeforeSave/AfterCalc/OnJobChange)." },
  ],
  // P3-FUSION360: +30 units (full adsk.* coverage)
  "P3-FUSION360": [
    { id: "U-CUIX-P3-51", title: "Fusion360AdskCoreAppDocumentEventsEngine — documentOpened/Saved/Closing + activeDocumentChanged across 13 workspaces",
      acceptance: "Smoke-test each event fires with expected payload across all 13 workspaces." },
    { id: "U-CUIX-P3-52", title: "Fusion360AdskCoreUICommandDefinitionsEngine — full CommandDefinition.id enumeration (800+)",
      acceptance: "Walk every CommandDefinition.id; verify controlDefinition + promoteToPanel state." },
    { id: "U-CUIX-P3-53", title: "Fusion360AdskCoreSelectionFilterDSLEngine — 40 selection filters + filterExpression grammar",
      acceptance: "Round-trip all 40 filters incl. 'SolidBodies+MeshBodies+ConstructionPlanes'." },
    { id: "U-CUIX-P3-54", title: "Fusion360AdskCoreObjectCollectionEngine — add/removeByItem/removeByIndex parity + freeze semantics",
      acceptance: "Cover typed-array conversions + mutation semantics." },
    { id: "U-CUIX-P3-55", title: "Fusion360AdskCoreMath3DEngine — Matrix3D/Vector3D/Point3D math-suite parity",
      acceptance: "Determinant/invert/setWithCoordinateSystem/transformBy/angleTo validated against NumPy reference." },
    { id: "U-CUIX-P3-56", title: "Fusion360AdskCoreTransactionEngine — nested transactions, abort semantics, cross-document transaction guard",
      acceptance: "Undo stack atomicity across ≥5 nested-transaction scenarios." },
    { id: "U-CUIX-P3-57", title: "Fusion360AdskCoreProgressCancelEngine — Progress.isCancelled polling on generativeDesign + simulation jobs",
      acceptance: "Long-op cancel path validated on 2 study types." },
    { id: "U-CUIX-P3-58", title: "Fusion360HTMLCommandInputsPaletteEngine — postMessage security + origin whitelist + Chromium-embed eval sandbox",
      acceptance: "Bridge isolates palette from host; XSS/CSP tests pass." },
    { id: "U-CUIX-P3-59", title: "Fusion360AdskFusionTimelineAdvancedEngine — marker/group/rollback/timeline.playFromStart full API",
      acceptance: "Suppress/unsuppress/reorder/rollback-to-marker + group collapse round-trip." },
    { id: "U-CUIX-P3-60", title: "Fusion360AdskFusionJointAdvancedEngine — 7 joint types + limits/rest/motion + AsBuiltJoint + MotionLink + ContactSet",
      acceptance: "All 7 joint types enumerated; motion-study export for each." },
    { id: "U-CUIX-P3-61", title: "Fusion360AdskFusionFeaturesCompletenessEngine — Emboss/Rib/Web/PressPull/Thicken/Scale/Split-Body/Split-Face/Replace-Face/Boundary-Fill/Move-Face/Combine(4 ops)",
      acceptance: "Coverage explicit for 12+ edge features beyond P3-01..50." },
    { id: "U-CUIX-P3-62", title: "Fusion360AdskFusionBRepTraversalEngine — Body/Face/Edge/Vertex/Shell/Lump/Loop/CoEdge + geometry type dispatch",
      acceptance: "Half-edge topology + face convexity + Plane/Cylinder/Cone/Sphere/Torus/NURBS/Spline dispatch." },
    { id: "U-CUIX-P3-63", title: "Fusion360AdskFusionOccurrenceReuseEngine — Rigid-group + in-place activate + flatten-to-bodies + propertiesManager",
      acceptance: "Occurrence reuse across component hierarchy ≥3 deep." },
    { id: "U-CUIX-P3-64", title: "Fusion360AdskCamSetupTypesEngine — Milling/Turning/WCS-probe/Additive/Inspection setup types",
      acceptance: "5 setup-type probe incl. stock-from-solid, stock-from-offset, fixture coord systems." },
    { id: "U-CUIX-P3-65", title: "Fusion360AdskCamOperationTaxonomyEngine — 80+ ops incl. Steep/Shallow/Morph/Pencil/Scallop/Spiral/Radial/Swarf/Multi-Axis Contour/Rotary/Flow/Turning Profile/Groove/Thread/Bore/Face/Part/Inspection-Surface",
      acceptance: "Full 80-op taxonomy enumerated; op-specific parameter schemas authored." },
    { id: "U-CUIX-P3-66", title: "Fusion360AdskCamToolLibraryEngine — Tool + Holder + ToolLibrary (cloud + local) + presets + holder-collision tape",
      acceptance: "tool-library.xml round-trip + cloud library sync." },
    { id: "U-CUIX-P3-67", title: "Fusion360PostProcessorCPSAudit200Engine — .cps 200-function audit (writeBlock/writeWords/formatWords/mFormat/gFormat/feedFormat + properties/groups/capabilities + onSection/onMovement/onCircular/onCommand)",
      acceptance: "200 built-ins + 150 properties + ~20 groups + 30 event handlers documented." },
    { id: "U-CUIX-P3-68", title: "Fusion360MachineConfigXMLEngine — post property groups (20 canonical) + machine-config-schema validation",
      acceptance: "allowedCircularPlanes / highFeedMapping / maximumCircularRadius / tolerance / washdown vs Autodesk schema." },
    { id: "U-CUIX-P3-69", title: "Fusion360AdskCamSimulationStockEngine — stock simulation + stock-to-leave heatmap + ViewCube-sync + collision-on-holder",
      acceptance: "Material-removal + collision on holder validated on 3 programs." },
    { id: "U-CUIX-P3-70", title: "Fusion360MachiningExtensionLicenseGateEngine — 5-axis-simultaneous / Steep-and-Shallow / Adaptive-3D / Probing-WCS entitlement",
      acceptance: "License probe returns entitlement map; gated ops blocked without license." },
    { id: "U-CUIX-P3-71", title: "Fusion360GenerativeDesignLifecycleEngine — study lifecycle + load-case + obstacle + preserve + starting-shape + manufacturing constraints + outcome export",
      acceptance: "Manufacturing constraint paths (milling/casting/additive/unrestricted) all tested." },
    { id: "U-CUIX-P3-72", title: "Fusion360SimulationStudyTypesEngine — Static-Stress / Modal / Thermal / Thermal-Stress / Buckling / Nonlinear-Static / Event-Simulation / Shape-Optimization",
      acceptance: "8 study types; signoff license gate; FEA result extraction." },
    { id: "U-CUIX-P3-73", title: "Fusion360NestingFabricationEngine — sheet placement + grain direction + tab generation + kerf compensation + DXF export",
      acceptance: "Multi-part layout on sheet + DXF export validated." },
    { id: "U-CUIX-P3-74", title: "Fusion360SheetMetalAdvancedEngine — rules library + per-rule param set + K-factor/bend-allowance + forming tools + flat-pattern.dxf round-trip",
      acceptance: "Rules XML round-trip + flat-pattern DXF matches source sheet body." },
    { id: "U-CUIX-P3-75", title: "Fusion360ElectronicsPCBEngine — schematic + PCB + 3D PCB + push-pull sync + symbol/footprint/3D-package binding + DRC/ERC",
      acceptance: "ECAD-MCAD co-design sync on 1 reference board; library ecosystem (Octopart/Digikey) hooks tested." },
    { id: "U-CUIX-P3-76", title: "Fusion360AdditiveWorkspaceEngine — FFF/SLS/SLA/DED/LMD + build-orientation + support generation + slice-preview + lattice infill",
      acceptance: "Build setup exported to 3MF/SLM for 5 process types." },
    { id: "U-CUIX-P3-77", title: "Fusion360ForgeAPSWebAPIEngine — Data Management + Model Derivative (SVF/SVF2/OBJ/STL/STEP) + Design Automation + ACC + 3-legged OAuth",
      acceptance: "OAuth flow + WorkItem submission + ACC file retrieval validated." },
    { id: "U-CUIX-P3-78", title: "Fusion360DataPanelURNStateMachineEngine — Hub/Project/Folder/Item/Version + branch/compare/merge + derive-link vs break-link state + offline-cache reconcile",
      acceptance: "Branch/compare/merge state transitions tested; offline-cache reconciliation on re-connect." },
    { id: "U-CUIX-P3-79", title: "Fusion360Preferences30CategoriesEngine — General/Graphics/Material/Design/Manufacture/Simulation/Render/Animation/Drawing/Generative/Electronics/Data/Network/Preview-Features full enumeration",
      acceptance: "Every field in every category catalogued." },
    { id: "U-CUIX-P3-80", title: "Fusion360FileFormatEdgeCasesEngine — STEP AP203/214/242 + IGES + Parasolid + ACIS + 3MF + USD + glTF + DWG R12..2024 + IFC + JT + CATIA V5 R25+ + NX + Creo + Inventor",
      acceptance: "40+ import/export formats with edge-case variant coverage." },
  ],
  // P4-INVENTOR: +40 units
  "P4-INVENTOR": [
    { id: "U-CUIX-P4-81", title: "InventorSheetMetalAdvancedEngine — Lofted-Flange + Rolled-Flange + Multi-Body SM + Corner-Round/Chamfer + Rip-face + Cosmetic-Bends",
      acceptance: "Harvest every SM-specific feature beyond P4-06 base." },
    { id: "U-CUIX-P4-82", title: "InventorSheetMetalPunchEngine — .ide Punch-Tool authoring + iFeature-in-SM + PunchTable + Geometry vs Thumbnail preview",
      acceptance: "Punch catalog extractable with thumbnails." },
    { id: "U-CUIX-P4-83", title: "InventorSheetMetalFlatPatternEngine — FlatPattern.Orientation + DXF/DWG export + K/A/B/Custom bend tables",
      acceptance: "Flat-pattern roundtrip produces correct bend allowance." },
    { id: "U-CUIX-P4-84", title: "InventorSheetMetalStylesEngine — Sheet-Metal Styles XML + Material/Thickness/Unfold-Rule/Gap linkage + multi-gauge in single part",
      acceptance: "Style library harvested 100%." },
    { id: "U-CUIX-P4-85", title: "InventorWeldmentSymbolsEngine — Weld Symbols (AWS/ISO) + Weld-Bead (Cosmetic/Fillet/Groove) + Weld-Caterpillar + end-fill per view",
      acceptance: "Weld symbol library complete; drawing end-fill consistency." },
    { id: "U-CUIX-P4-86", title: "InventorFramePublisherEngine — Frame Member Publisher + Structural Shape Authoring + author custom shapes to Content Center",
      acceptance: "Custom shape published into CC and usable in Frame Generator." },
    { id: "U-CUIX-P4-87", title: "InventorFrameBOMEngine — Frame Member List + Frame Analysis BOM + stretch/compress summary",
      acceptance: "Frame BOM reconciles with structured BOM on round-trip." },
    { id: "U-CUIX-P4-88", title: "InventorFrameAnalysisEngine — Frame Analysis env (beam elements) + continuous/gusset/pin joints + nodal loads + reaction/deflection",
      acceptance: "Separate FEA env from Stress Analysis; beam results validated." },
    { id: "U-CUIX-P4-89", title: "InventorTubePipeStylesEngine — Rigid/Flexible/Bent style authoring + fitting-to-pipe rules + min-segment/bend-radius/overstock",
      acceptance: "Style XML round-trip." },
    { id: "U-CUIX-P4-90", title: "InventorTubePipeISOGenEngine — pipe isometric drawing (isogen) + spool drawings + P&ID tags",
      acceptance: "Isometric drawing regenerates from 3D route." },
    { id: "U-CUIX-P4-91", title: "InventorCableHarnessNailboardEngine — Nailboard view + flatten-to-drawing + wire-list/from-to/cutting-list reports",
      acceptance: "Nailboard rebuilds from 3D harness." },
    { id: "U-CUIX-P4-92", title: "InventorCableHarnessLibraryEngine — Wire/Cable/Segment library (.xml) + electrical-properties editor + Excel import",
      acceptance: "Library round-trip." },
    { id: "U-CUIX-P4-93", title: "InventoriLogicRuleTesterEngine — Rule Tester + breakpoints + debug-print + CaptureCurrentState + timers",
      acceptance: "Debugger surface full; 5 breakpoint+step scenarios." },
    { id: "U-CUIX-P4-94", title: "InventoriLogicAdvancedAPIEngine — iLogic Capture + RuleArguments + ThisRule + ThisDoc + UserInterfaceManager",
      acceptance: "Full ilogic runtime API surface." },
    { id: "U-CUIX-P4-95", title: "InventoriLogicDriveEngine — Drive-Constraint + Drive-Joint via iLogic + Sequence Manager + Presenter launch",
      acceptance: "Motion sequences reproducible on ≥2 assemblies." },
    { id: "U-CUIX-P4-96", title: "InventorDesignViewRepsEngine — Design View Representations (independent of Model States) + camera/visibility/style + drawing-view mapping",
      acceptance: "Enumerate all view reps; DV↔drawing mapping stable." },
    { id: "U-CUIX-P4-97", title: "InventorLevelOfDetailLegacyEngine — LoD reps (pre-2022 independent) + All-Parts-Suppressed + Master + Substitute-LoD",
      acceptance: "Coexistence with P4-41 Model States validated." },
    { id: "U-CUIX-P4-98", title: "InventorPositionalRepsEngine — Positional Reps (flexible-assembly positions) + overrides + drawing-view use",
      acceptance: "Legacy-only but still present in 2024+ for migration." },
    { id: "U-CUIX-P4-99", title: "InventorDirectEditEngine — Move/Size/Scale/Rotate/Delete on imported geometry + history-free bodies",
      acceptance: "3D-Interconnect direct-edit path covered." },
    { id: "U-CUIX-P4-100", title: "InventorMeshModelingEngine — Mesh Features (Refine/Reduce/Plane-Cut/Close-Holes) + Convert-to-Base-Feature + STL/OBJ/3MF roundtrip",
      acceptance: "Mesh BRep conversion roundtrip." },
    { id: "U-CUIX-P4-101", title: "InventorGenerativeDesignEngine — Shape Generator topology optimization + load cases + preserve/obstacle + promote-to-solid",
      acceptance: "Shape-gen study round-trip." },
    { id: "U-CUIX-P4-102", title: "InventorSurfaceModelingEngine — Surface Patch/Boundary-Patch/Sculpt/Stitch/Replace-Face/Extend/Trim + surface→solid",
      acceptance: "Full surface toolkit." },
    { id: "U-CUIX-P4-103", title: "InventorPlasticPartFeaturesEngine — Plastic env: Lip/Grille/Rest/Rule-Fillet/Boss/Snap-Fit (cantilever+trap)/Draft-Analysis",
      acceptance: "Plastic toolkit covered." },
    { id: "U-CUIX-P4-104", title: "InventorMoldDesignEnvEngine — Mold Design env (MoldFlow link) + core/cavity/parting-line/runner/gate/ejector",
      acceptance: "Mold env covered end-to-end." },
    { id: "U-CUIX-P4-105", title: "InventorTolerancesAndGDTEngine — 3D Tolerance (DimXpert/General) + Hole/Thread/Feature-of-Size + PMI export + GD&T FCFs in part",
      acceptance: "3D MBD surface covered." },
    { id: "U-CUIX-P4-106", title: "InventorDrawingAdvancedEngine — iProperty text-fields + SM drawing views (flat-pattern) + Weldment drawing states + bend-notes",
      acceptance: "SM/weld drawing specifics." },
    { id: "U-CUIX-P4-107", title: "InventorDrawingDimensionsEngine — Linear/angular/radial/ordinate/arc-length/chain/baseline + Retrieve-Dims + Model-Dims + DimXpert-in-drawing",
      acceptance: "Every dim variant catalogued." },
    { id: "U-CUIX-P4-108", title: "InventorHoleFeatureEngine — Simple/Clearance/Tapped/Taper-Tapped/Counterbore/Countersink/Spotface + Hole-Table + thread.xls linkage",
      acceptance: "100% hole surface." },
    { id: "U-CUIX-P4-109", title: "InventorFastenerGeneratorEngine — Bolted-Connection dialog + Holes-in-Plate + grip-length calc + torque per ASME/ISO",
      acceptance: "Distinct from P4-14 Design Accelerator base gen." },
    { id: "U-CUIX-P4-110", title: "InventorVisualStyleAndRenderEngine — Visual Styles (Realistic/Shaded/Hidden-Edge/Wireframe/Illustration/Watercolor/Sketch) + Studio render + Ray-Tracing",
      acceptance: "Rendering path covered." },
    { id: "U-CUIX-P4-111", title: "InventorStudioAnimationEngine — Studio animation timeline + camera + component animate + fade + publish AVI/WMV",
      acceptance: "Studio env separate from IPN." },
    { id: "U-CUIX-P4-112", title: "InventorBIMExchangeEngine — BIM Content env + Simplify + Revit RFA export + IFC + AnyCAD for Revit + COBie",
      acceptance: "BIM env (P4-02 only lists tab; full workflow here)." },
    { id: "U-CUIX-P4-113", title: "InventorFactoryDesignEngine — Factory-Design-Utilities + asset publishing + layout-to-Revit + AutoCAD-Architecture interop",
      acceptance: "Factory vertical covered." },
    { id: "U-CUIX-P4-114", title: "InventorElectricalCatalogEngine — AutoCAD Electrical (ACADE) interop + wire-list import + harness-to-ACADE roundtrip",
      acceptance: "Separate from P4-21 Cable/Harness." },
    { id: "U-CUIX-P4-115", title: "InventorVBAMacroEngine — Inventor VBA IDE + ThisApplication macros + .ivb project + UserForm harvest",
      acceptance: "VBA separate from COM bridge." },
    { id: "U-CUIX-P4-116", title: "InventorAPISamplesAndCommandManagerEngine — CommandManager.Post + UserInputEvents + InteractionEvents + SelectEvents + TransactionManager",
      acceptance: "Full interactive API." },
    { id: "U-CUIX-P4-117", title: "InventorTransientGeometryEngine — TransientGeometry + TransientObjects + MatrixFactory + ObjectCollection",
      acceptance: "API primitives for programmatic geometry construction." },
    { id: "U-CUIX-P4-118", title: "InventorReportsAndDesignDocEngine — Design Doctor + Sketch-Doctor + Update-Mass-Properties + Engineer's Notebook export",
      acceptance: "Diagnostics surface." },
    { id: "U-CUIX-P4-119", title: "InventorMigrationEngine — Task-Scheduler + Migrate-Files + .ipj migration + Configurations→ModelStates migration + up-convert warnings",
      acceptance: "Migration tooling." },
    { id: "U-CUIX-P4-120", title: "InventorPerformanceEngine — Express-Mode + Deferred-Update + Relationship-Mgr + LoD-on-open + Memory-Saver + Design-Data-Locator",
      acceptance: "Perf surface." },
  ],
  // P5-SOLIDWORKS: +25 units
  "P5-SOLIDWORKS": [
    { id: "U-CUIX-P5-32", title: "SolidWorksISldWorksRootTraversalEngine — ISldWorks.GetDocuments/ActiveDoc → ModelDoc2 downcast across all 7 ModelType enums",
      acceptance: "PartDoc/AssemblyDoc/DrawingDoc/etc downcast harness validated." },
    { id: "U-CUIX-P5-33", title: "SolidWorksFeatureManagerRecursionEngine — FeatureManagerTree + IFeature.GetTypeName2/GetSpecificFeature2 recursion over sub-features",
      acceptance: "Authored for all feature classes; recursive walk tested." },
    { id: "U-CUIX-P5-34", title: "SolidWorksPropertyManagerPage2ControlCatalogEngine — PMPTextbox/Numberbox/Combobox/Checkbox/Slider/Button/WindowFromHandle/SelectionBox/ListBox/OptionCheck/Label/Group/Tab/Bitmap",
      acceptance: "All ~40 control types authored with OnPreview/OnClose handlers." },
    { id: "U-CUIX-P5-35", title: "SolidWorksSelectionMgrEngine — ISelectionMgr.GetSelectedObject6 + GetSelectByIdSpecification for 120+ swSelectType_e marks",
      acceptance: "All filter marks covered." },
    { id: "U-CUIX-P5-36", title: "SolidWorksEventBusEngine — ISwAddin AttachEventHandlers: DocumentEvents + FeatureMgrEvents + ModelViewEvents + SelectionMgrEvents (~250 events)",
      acceptance: "Detach-on-close lifecycle proven." },
    { id: "U-CUIX-P5-37", title: "SolidWorksMateUniverseEngine — Standard(8) + Advanced(7 incl Width/Path/Linear-Coupler/Distance-Limit/Angle-Limit/Symmetric/Universal-Joint) + Mechanical(7) + Magnetic + MateReferences + SmartMates",
      acceptance: "All ≥30 mate variants authored via IMateFeatureData." },
    { id: "U-CUIX-P5-38", title: "SolidWorksConfigurationsEngine — IConfiguration parent/child + InsertFamilyTable Excel round-trip + ConfigurationPublisher control-to-config rules",
      acceptance: "Design Table round-trip + Publisher rules tested." },
    { id: "U-CUIX-P5-39", title: "SolidWorksDisplayStatesEngine — IDisplayStateSetting per-config overlays (hide/show, transparency, appearance) independent of configuration switches",
      acceptance: "Display State overlay distinct from Config switch." },
    { id: "U-CUIX-P5-40", title: "SolidWorksWeldmentFullEngine — IWeldmentFeatureData structural members + trim/extend + weld beads + sub-weldment folder + cut-list properties",
      acceptance: "Cut list properties preserved end-to-end." },
    { id: "U-CUIX-P5-41", title: "SolidWorksSheetMetalCompleteEngine — ISheetMetalFeatureData bend tables + K-factor/bend-allowance/bend-deduction + gauge tables + forming tools + Flatten/UnFlatten state",
      acceptance: "Flatten state reversible; bend tables round-trip." },
    { id: "U-CUIX-P5-42", title: "SolidWorksMoldToolsPipelineEngine — Split-Line + Shut-Off-Surface + Parting-Line + Parting-Surface + Tooling-Split + Core/Cavity body separation",
      acceptance: "End-to-end mold flow validated on reference part." },
    { id: "U-CUIX-P5-43", title: "SolidWorksSurfacing25FeatureEngine — Extruded/Revolved/Swept/Lofted/Boundary/Filled/Planar/Ruled/Radiated/Offset/Mid/Knit/Trim/Untrim/Extend/Delete-Hole/Move-Face",
      acceptance: "≥25 surface features authored." },
    { id: "U-CUIX-P5-44", title: "SolidWorksMBDPMI3DPDFEngine — IDimXpertManager auto-dim schemes + annotation views + 3D-PDF template publish + PMI GD&T export",
      acceptance: "MBD + 3D PDF round-trip." },
    { id: "U-CUIX-P5-45", title: "SolidWorksSimulationStudyMatrixEngine — Static/Frequency/Buckling/Thermal/Drop/Fatigue/Nonlinear/LinearDynamic + Motion studies",
      acceptance: "Mesh/contact/load authoring; results extraction for all 8+1 study types." },
    { id: "U-CUIX-P5-46", title: "SolidWorksFlowSimulationEngine — CwProject/CwGoal/CwBoundaryCondition + mesh refinement + goals + BCs via Flow API COM wrapper",
      acceptance: "CFD study on reference geometry." },
    { id: "U-CUIX-P5-47", title: "SolidWorksRoutingSuiteEngine — Pipe/Tube/Electrical-Cable/Wire-Harness routing + flatten route + BOM harness drawing",
      acceptance: "Routing API authored for all 4 route types." },
    { id: "U-CUIX-P5-48", title: "SolidWorksEPDMVaultEngine — IEdmVault7 check-in/out + version promotion + workflow-state transitions + notifications + data-cards (C# add-in)",
      acceptance: "PDM workflow validated." },
    { id: "U-CUIX-P5-49", title: "SolidWorksToolboxConfiguratorEngine — SWBrowser.sldedb parametric PN generation + Excel-driven custom families + Smart Fastener",
      acceptance: "Excel-driven family round-trip." },
    { id: "U-CUIX-P5-50", title: "SolidWorksEquationsLinkValuesGlobalVarsEngine — IEquationMgr add/edit/evaluate + LinkValues dimension coupling + Global-Variable scoping",
      acceptance: "Equation cascade + global var scoping validated." },
    { id: "U-CUIX-P5-51", title: "SolidWorksSensorsEngine — ISensor mass/dimension/interference/proximity/simulation sensors + threshold alerts",
      acceptance: "Sensor alerts trigger on threshold breach." },
    { id: "U-CUIX-P5-52", title: "SolidWorksLargeAssemblyPerformanceEngine — LightweightMode + SpeedPak + Large Design Review (LDR) read-only graphics mode + perf policy",
      acceptance: "LDR graphics mode validated on 1000+ component assembly." },
    { id: "U-CUIX-P5-53", title: "SolidWorksIntegratedCAMBridgeEngine — CAMWorks + Mastercam-for-SolidWorks + HSMWorks-legacy add-in detection + feature-tree round-trip",
      acceptance: "3-CAM detection + feature round-trip." },
    { id: "U-CUIX-P5-54", title: "SolidWorksMacroRecorderTriadEngine — .swp VBA + .swb binary + .NET macro record/play/edit",
      acceptance: "All 3 macro formats round-trip." },
    { id: "U-CUIX-P5-55", title: "SolidWorksElectricalComposerVisualizeInspectionEngine — Electrical-Schematic/3D sync + Composer + Visualize + Inspection ballooning bridge",
      acceptance: "4 add-on products' bridges authored." },
    { id: "U-CUIX-P5-56", title: "SolidWorksDriveWorksEDrawingsEngine — DriveWorks-Solo/Pro project binding + eDrawings ActiveX viewer embed",
      acceptance: "Configurator-driven workflows + embeddable viewer." },
  ],
  // P6-FREECAD: +20 units
  "P6-FREECAD": [
    { id: "U-CUIX-P6-19", title: "FreeCADSurfaceWorkbenchEngine — surface.Filling/GeomFillSurface/Sections/Extend/Curves-on-surface/Cut-on-surface",
      acceptance: "NURBS weight/knot editing verified against 0.19-1.0.1 regimes." },
    { id: "U-CUIX-P6-20", title: "FreeCADPointsReverseEngineeringEngine — Points.show/PointsFromMesh + Reverse (fitBSpline/approxSurface/segmentByCurvature/mergeSurfaces/RegionGrowing/poissonReconstruction)",
      acceptance: "Point-cloud to BREP round-trip asserted." },
    { id: "U-CUIX-P6-21", title: "FreeCADNicheWorkbenchesEngine — Plot/Image/Web/Show/Test workbenches",
      acceptance: "All 5 niche workbench APIs exercised." },
    { id: "U-CUIX-P6-22", title: "FreeCADMeasureWorkbenchEngine — Measure::Measurement + App.measure distance/angle/radius/length/area/volume/center-of-mass/MoI",
      acceptance: "Pre/post 0.21 split verified." },
    { id: "U-CUIX-P6-23", title: "FreeCADMaterialFrameworkEngine — Materials.MaterialManager + FCMat card I/O + legacy Material vs new Materials module (1.0+) + QuantityUnit properties",
      acceptance: "Dual-regime path covered." },
    { id: "U-CUIX-P6-24", title: "FreeCADDraftModifierFullEngine — Upgrade/Downgrade/Heal/SubelementHighlight/Join/Split/Stretch/Trimex/Offset/Edit-mode/Draft2Sketch/ShapeString (40+ ops)",
      acceptance: "All 40+ Draft ops + legacy Draft.make_* shims." },
    { id: "U-CUIX-P6-25", title: "FreeCADSketcherAdvancedEngine — ExternalGeometry/Carbon-copy/CopyConstraints/TrimEdge/ExtendEdge/SplitEdge/ConvertToNURBS/B-spline edits/constraint toggling",
      acceptance: "100% Sketcher operator surface." },
    { id: "U-CUIX-P6-26", title: "FreeCADPartDesignDatumPrimitiveEngine — AdditivePrimitives (Box/Cylinder/Sphere/Cone/Ellipsoid/Torus/Prism/Wedge) + Subtractive + ShapeBinder vs SubShapeBinder + DatumLine/Plane/Point/CS",
      acceptance: "Full datum/primitive matrix + 23 MapMode enum." },
    { id: "U-CUIX-P6-27", title: "FreeCADPartAttachmentEngineEngine — All 23 MapMode values (ObjectXY/Plane/FaceNormal/TangentPlane/AxisOfInertia1-3/ThreePointsPlane/ThreePointsNormal/Folding/etc.)",
      acceptance: "Attachment substrate for PartDesign/Draft/Sketcher across all modes." },
    { id: "U-CUIX-P6-28", title: "FreeCADExpressionEngineUnitsEngine — ExpressionEngine.setExpression on any Property + cross-doc <<Doc>>#<<Sheet>>.alias + units-in-expr (10 mm + 0.5 in) + conditional/hasexpr/clear",
      acceptance: "Unit-safe parser validation." },
    { id: "U-CUIX-P6-29", title: "FreeCADImportExportMatrixEngine — STEP/IGES (AP203/214/242) + STL (ascii/bin) + OBJ/PLY/DXF (R12-R2018)/DWG (ODA/LibreDWG)/BREP/IFC (2x3/4/4.3)/glTF/3MF/VRML/X3D",
      acceptance: "All importExport modules + import hooks tested." },
    { id: "U-CUIX-P6-30", title: "FreeCADTNPRegimeEngine — Pre-0.19 / 0.19-0.20 / 0.21-RC / 1.0+ ElementMap regimes",
      acceptance: "Cross-version file open with name-upgrade + downstream feature naming resolved." },
    { id: "U-CUIX-P6-31", title: "FreeCADUndoRedoTransactionEngine — openTransaction/commitTransaction/abortTransaction + setEditingTransaction + recompute(force,checkCycles) + mustExecute/touch/purgeTouched",
      acceptance: "Transaction semantics validated + skip-recompute on load." },
    { id: "U-CUIX-P6-32", title: "FreeCADMacroRecorderPythonEngine — Gui.doCommand/doCommandGui/addModule + macro recording start/stop + Python console globals",
      acceptance: "Macro playback across regimes." },
    { id: "U-CUIX-P6-33", title: "FreeCADViewProviderSelectionEngine — Gui.ViewProvider claimChildren/updateData/onChanged/attach/setEdit/doubleClicked + SelectionGate/SelectionObserver + Coin3D SoNode",
      acceptance: "3D view scripting surface; selection with sub-element hashes." },
    { id: "U-CUIX-P6-34", title: "FreeCADPathDressupsToolBitEngine — Dressup (Boundary/Tag/DogboneII/LeadInOut/Zigzag/Axis-map/RampEntry/HoldingTags) + ToolBit (20+ shape templates) + ToolController overrides",
      acceptance: "Path.Command-level assertions on all dressups + 20 tool shapes." },
    { id: "U-CUIX-P6-35", title: "FreeCADFEMSolverMatrixEngine — Calculix/Elmer/Mystran/Z88/OpenFOAM + equation binding (Elasticity/Heat/Flow/Electrostatics/Magnetodynamics) + constraints + VTK pipeline",
      acceptance: "Multi-solver parity on reference model." },
    { id: "U-CUIX-P6-36", title: "FreeCADArchBIMIFCEngine — NativeIFC (1.0+) vs legacy IfcOpenShell + IFC4.3 entities + Schedules + Rebar + Panel/Frame + Pipe network",
      acceptance: "Regime-split IFC coverage." },
    { id: "U-CUIX-P6-37", title: "FreeCADPreferencesParametersEngine — ParameterGrp.GetBool/Int/Float/String + User.cfg/System.cfg hives + 7 unit schemas + preference-pack roundtrip + Addon Manager",
      acceptance: "Config-substrate tests." },
    { id: "U-CUIX-P6-38", title: "FreeCADPropertyLinkScopesEngine — PropertyLink ScopeType (Local/Child/Global/Hidden) + PropertyXLink external doc refs + PropertyXLinkSubList + dependency-graph cycle detection",
      acceptance: "Full link semantics + copy-on-change + link-redirect on file open." },
  ],
};

// Validate no id collisions across the additions
{
  const all = Object.values(ADD).flat().map((u) => u.id);
  const dupes = all.filter((x, i) => all.indexOf(x) !== i);
  if (dupes.length) throw new Error("Duplicate new-unit IDs: " + dupes.join(","));
}

let added = 0;
for (const [phaseId, newUnits] of Object.entries(ADD)) {
  const phase = uix.phases.find((p) => p.phase_id === phaseId);
  if (!phase) throw new Error(`Phase ${phaseId} not found in CAD-UIX-MS0`);
  if (!Array.isArray(phase.unit_list)) throw new Error(`Phase ${phaseId} missing unit_list`);
  for (const u of newUnits) {
    if (phase.unit_list.some((x) => x.id === u.id)) {
      throw new Error(`Unit id ${u.id} already in ${phaseId}`);
    }
    phase.unit_list.push(u);
    added++;
  }
}
if (added !== 163) throw new Error(`Expected 163 additions, got ${added}`);

const totalBefore = uix.total_units;
const totalAfter = uix.phases.reduce((s, p) => s + p.unit_list.length, 0);
if (totalAfter !== totalBefore + 163)
  throw new Error(`Total mismatch: before=${totalBefore}, after=${totalAfter}`);
uix.total_units = totalAfter;

// Round 3 summary + findings
uix.scrutiny_round_3_complete = true;
uix.scrutiny_round_3 = {
  date: ROUND3_DATE,
  method: "7-agent parallel scrutiny — 6 CAD domain specialists (Mastercam/HyperCAD-S/Fusion 360/Inventor/SolidWorks/FreeCAD) + 1 Master-AI × CAD integration auditor",
  agents_dispatched: 7,
  unit_estimate_before: 276,
  unit_estimate_after: totalAfter,
  expansion_factor: totalAfter / 276,
  axes_before: 15,
  axes_after: 15,
  axes_added: [],
};
uix.scrutiny_round_3_findings = {
  timestamp: new Date().toISOString(),
  agents_run: 7,
  rationale:
    "User directive: 'apply all fixes to the road map then scrutinize one more time with an agent for each cad software so we ensure we cover every single possible function. then make sure the master ai system and the cad/cam specific ai system/neural network/machine learning systems can fully control each cad software to produce highly complex parts and full assemblies.' Round 3 adds 163 units: 22 P1 + 20 P2 + 30 P3 + 40 P4 + 25 P5 + 20 P6 + 6 P0-INFRA AI-integration units.",
  gap_fills_added_by_phase: Object.fromEntries(
    Object.entries(ADD).map(([k, v]) => [k, v.map((u) => u.id)]),
  ),
  ai_integration_units: [
    "U-CUIX-P0-17 (HyperCADSCodeGeneratorAdapter)",
    "U-CUIX-P0-18 (SolidWorksCodeGeneratorAdapter)",
    "U-CUIX-P0-19 (PrismCADDispatcherActions — prism_cad.build_part/build_assembly/plan_ops)",
    "U-CUIX-P0-20 (CADOperationPlannerEngine — intent→ops)",
    "U-CUIX-P0-21 (ComplexPartPlannerEngine)",
    "U-CUIX-P0-22 (AssemblyPlannerEngine)",
  ],
  cross_links_to_cad_complete_ms0: [
    "PHASE-30 boilerplate renamed (4 units): Master CAD control brain + adapter registry + capability negotiator + intent↔ops bridge",
    "PHASE-31 boilerplate renamed (6 units): foundation encoder + per-CAD NN heads (Mastercam/HyperCAD-S/Fusion/Inventor/SW/FreeCAD)",
    "PHASE-33 boilerplate renamed (3 units): multi-CAD session + intent fusion + consistency validator",
    "PHASE-34 boilerplate renamed (4 units): execution outcome bus + per-adapter feedback + replay buffer + backprop propagator",
  ],
  total_units_before: 276,
  total_units_after: totalAfter,
  coverage_gates_unchanged: true,
  priority_order_unchanged: true,
  bottom_line: "Every gap identified by the 6 CAD specialists closed. Master AI + CAD-specific NN pipeline now has dedicated units covering every link in the chain: adapter → planner → per-CAD NN head → master control brain → cross-CAD session → closed-loop feedback. Prior to round 3, zero of 6 CADs could be fully driven by master AI end-to-end; after these units are implemented, 6/6 will have a complete path.",
};

writeFileSync(UIX, JSON.stringify(uix, null, 2) + "\n", "utf8");

// ── CAD-COMPLETE-MS0 rename pass (PHASE-30/31/33/34) ──────────────────────
const CC_RENAMES = {
  "PHASE-30": [
    { old: "U-CCCO01", id: "U-CADC-AI01", title: "MasterCADControlBrainEngine — routes user intent through planner → per-CAD head → adapter",
      acceptance: "One intent object yields validated CADOperation stream + executed output on any enrolled CAD adapter; supports adapter swap without intent rewrite." },
    { old: "U-CCCO02", id: "U-CADC-AI02", title: "CADAdapterRegistryEngine — singleton registry mapping cadSystem → adapter instance + capability matrix",
      acceptance: "register/lookup/list/deregister APIs; capability matrix composed from each adapter's supportedOps set." },
    { old: "U-CCCO03", id: "U-CADC-AI03", title: "CADCapabilityNegotiatorEngine — resolves intent vs adapter capability; falls back or fails-fast per policy",
      acceptance: "Intent referencing unsupported op either degrades gracefully (configurable) or throws UnsupportedCapabilityError with named op." },
    { old: "U-CCCO04", id: "U-CADC-AI04", title: "CADIntentToOpsBridgeEngine — couples NN tensor outputs to validated ReadonlyArray<CADOperation>",
      acceptance: "Accepts NN logits / token stream / diffusion step output; emits typed CADOperation[] passing Zod schema validation." },
  ],
  "PHASE-31": [
    { old: "U-CCCO01", id: "U-CADC-NN01", title: "CADFoundationEncoderEngine — shared BRep + sketch tokenizer for all per-CAD NN heads",
      acceptance: "Encodes BRep + sketch + feature tree into unified embedding space; tokenizer vocabulary derived from CAD_OPERATION_KINDS." },
    { old: "U-CCCO02", id: "U-CADC-NN02", title: "MastercamIntentNN — Mastercam-specific policy head (NetHook3 op sequencing + toolpath-strategy prediction)",
      acceptance: "Emits valid CADOperation[] ≥ baseline on held-out JM Die Mastercam corpus." },
    { old: "U-CCCO03", id: "U-CADC-NN03", title: "HyperCADSIntentNN — hyperCAD-S FT-aware head (Feature Technology recognition + macro selection)",
      acceptance: "Emits valid CADOperation[] on hyperCAD-S corpus with FT-aware feature tokens." },
    { old: "U-CCCO04", id: "U-CADC-NN04", title: "Fusion360DiffusionHead — diffusion-based sketch+feature generator targeting adsk.fusion",
      acceptance: "Denoise loop produces sketch + feature ops passing adsk.fusion schema validation." },
    { old: "U-CCCO05", id: "U-CADC-NN05", title: "InventorGNNHead — graph neural network over assembly/mate graph targeting Inventor COM/iLogic",
      acceptance: "Predicts mate/joint topology + op sequence from part/assembly graph." },
    { old: "U-CCCO06", id: "U-CADC-NN06", title: "SolidWorksTransformerHead + FreeCADPolicyRLHead — transformer for SW ISldWorks op sequences; PPO-style RL policy for FreeCAD Python",
      acceptance: "Dual heads: SW transformer on ISldWorks op sequences; FC RL policy on FreeCAD Python command stream — both validated on held-out sets." },
  ],
  "PHASE-33": [
    { old: "U-CCCO01", id: "U-CADC-CRD01", title: "MultiCADSessionEngine — coordinates simultaneous sessions across multiple CADs with shared intent state",
      acceptance: "Same intent executed on 2+ CADs concurrently; session state remains consistent; adapter-specific divergence logged." },
    { old: "U-CCCO02", id: "U-CADC-CRD02", title: "CrossCADIntentFusionEngine — fuses intents from heterogeneous sources (sketch, voice, drawing parse, prior session)",
      acceptance: "Fused intent outperforms single-source baseline on intent-recall benchmark." },
    { old: "U-CCCO03", id: "U-CADC-CRD03", title: "CrossCADConsistencyValidatorEngine — validates identical semantic output across 2+ CADs within tolerance",
      acceptance: "Output-consistency metric (feature count, mass, BRep fingerprint) within ε on 3 reference parts across ≥2 CADs." },
  ],
  "PHASE-34": [
    { old: "U-CCCO01", id: "U-CADC-LP01", title: "CADExecutionOutcomeBusEngine — pub/sub bus for CAD execution results (success/error/timing/collision/regeneration)",
      acceptance: "Emits structured outcome event per adapter call; subscribers receive within 100ms." },
    { old: "U-CCCO02", id: "U-CADC-LP02", title: "CADPerAdapterFeedbackCollectorEngine — collects per-adapter metrics and routes to corresponding NN head",
      acceptance: "Feedback routes correctly by cadSystem; per-NN-head feedback buffer grows." },
    { old: "U-CCCO03", id: "U-CADC-LP03", title: "CADHeadReplayBufferEngine — prioritized replay buffer for closed-loop NN training",
      acceptance: "Priority sampling; buffer eviction; deterministic replay mode for reproducible training." },
    { old: "U-CCCO04", id: "U-CADC-LP04", title: "MasterBrainBackpropPropagatorEngine — back-propagates CAD execution outcome to both master policy and per-CAD NN heads",
      acceptance: "Gradient update visible on both master and per-CAD heads after outcome batch; EWC++ / LoRA-safe preservation of prior skills." },
  ],
};

let renamed = 0;
for (const [phaseId, renames] of Object.entries(CC_RENAMES)) {
  const phase = cc.phases.find((p) => p.id === phaseId);
  if (!phase) throw new Error(`CC phase ${phaseId} not found`);
  for (const r of renames) {
    const idx = (phase.units || []).findIndex((u) =>
      (typeof u === "string" ? u : u.id) === r.old,
    );
    if (idx === -1) throw new Error(`Unit ${r.old} not found in ${phaseId}`);
    phase.units[idx] = {
      id: r.id,
      title: r.title,
      acceptance: r.acceptance,
      status: "pending",
      renamed_from: r.old,
      renamed_in_round: 3,
    };
    renamed++;
  }
}
if (renamed !== 17) throw new Error(`Expected 17 renames, got ${renamed}`);

cc.scrutiny_round_r3_cross_envelope = {
  date: ROUND3_DATE,
  triggered_by: "CAD-UIX-MS0 scrutiny round 3",
  renamed_units: Object.fromEntries(
    Object.entries(CC_RENAMES).map(([ph, rs]) => [ph, rs.map((r) => `${r.old} → ${r.id}`)]),
  ),
  rationale:
    "PHASE-30/31/33/34 contained 17 boilerplate units with duplicate IDs across phases (U-CCCO01..06). AI-integration auditor identified these as the Master-AI/CAD-NN/Cross-CAD/Learning-propagation layer — gave each a unique ID and concrete title + acceptance.",
};

writeFileSync(CC, JSON.stringify(cc, null, 2) + "\n", "utf8");

// ── roadmap-index.json mirror ────────────────────────────────────────────
const idxEntry = idx.milestones.find((m) => m.id === "CAD-UIX-MS0");
if (!idxEntry) throw new Error("CAD-UIX-MS0 not in roadmap-index");
idxEntry.total_units = totalAfter;
idxEntry.scrutiny_round_3_complete = true;
idxEntry.description =
  (idxEntry.description || "").replace(/\s*$/, "") +
  ` Round 3 (${ROUND3_DATE}): +163 units (P0+6 AI-integration, P1+22, P2+20, P3+30, P4+40, P5+25, P6+20) = ${totalAfter}u total; PHASE-30/31/33/34 of CAD-COMPLETE-MS0 had 17 boilerplate units renamed with concrete AI-control/NN-head/cross-CAD/closed-loop titles.`;
idx.updated_at = new Date().toISOString();

writeFileSync(IDX, JSON.stringify(idx, null, 2) + "\n", "utf8");

console.log("CAD-UIX-MS0: total_units=" + uix.total_units + " axes=" + uix.exhaustion_axes.length);
console.log("CAD-COMPLETE-MS0: renamed " + renamed + " boilerplate units across PHASE-30/31/33/34");
console.log("roadmap-index: CAD-UIX-MS0 total_units=" + idxEntry.total_units);
console.log("Added " + added + " new UIX units; renamed " + renamed + " CC units.");
