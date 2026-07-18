#!/usr/bin/env node
/**
 * CAD-UIX-MS0 P8-SHOP-REAL-TIME — final phase, 56 units.
 *
 * Exhaustive real-time proof against live shop licenses for all 6 priority
 * CADs. Capstone: print → CAD → print round-trip validated on real
 * JM Die customer data.
 *
 * Source: 6 parallel CAD-specialist test-designer Agents, 2026-04-21.
 */
import { readFileSync, writeFileSync } from "node:fs";

const UIX = "H:/PRISM/mcp-server/data/milestones/CAD-UIX-MS0.json";
const IDX = "H:/PRISM/mcp-server/data/roadmap-index.json";
const DATE = "2026-04-21";

const uix = JSON.parse(readFileSync(UIX, "utf8"));
const idx = JSON.parse(readFileSync(IDX, "utf8"));

// ── P8 Phase Definition ───────────────────────────────────────────────────
const P8 = {
  phase_id: "P8-SHOP-REAL-TIME",
  name: "Shop Real-Time Proof — Live Licensed Exhaustive Testing on Real JM Die Data",
  rationale:
    "Final phase. All prior phases specify units; P8 PROVES the capability by running against live shop licenses (Mastercam seat / CodeMeter hyperCAD-S / Autodesk Identity Fusion / Inventor / SNL SolidWorks / OSS FreeCAD) on real JM Die customer files and scanned prints. Capstone is the print↔CAD↔print round-trip: scanned customer PDF → master AI generates 3D CAD from scratch → master AI generates drawing from that CAD → dimensions auto-placed → diff to original print must match within stated tolerances. This is the exhaustive real-time test the user specified as the ultimate proof of capability.",
  unit_list: [
    // ── Cross-cut shared infrastructure (8 units) ──────────────────────
    { id: "U-CUIX-P8-INFRA-01", title: "ShopLicenseOrchestratorEngine — unified license pool across all 6 CADs (Mastercam FlexLM/NHaspX, HyperCAD-S CodeMeter+OpenMind server, Autodesk Identity Fusion, Inventor COM lock, SolidWorks SNL, FreeCAD no-op)",
      acceptance: "Single interface checkout(cad)/release(cad)/pool_status(); per-CAD adapter respects license-tier entitlements; leak detection fails a run if seat held >test duration + 60s buffer; clean release on SIGTERM/crash proven across 50 cycles per CAD.",
      depends_on: ["U-CADC-AI02"] },
    { id: "U-CUIX-P8-INFRA-02", title: "GoldenCorpusRegistryEngine — SHA-256-locked manifest for ground-truth corpus across all 6 CADs (paired scanned print PDF + golden CAD file + golden NC where applicable)",
      acceptance: "≥80 corpus assets total (≥15 per CAD for P1-P5; ≥17 for OSS-reliant P6); corpus.lock.json with BRep fingerprint + mass + feature-count goldens; CorpusIntegrityEngine verifies on every P8 run; immutable versioning with schema v1." },
    { id: "U-CUIX-P8-INFRA-03", title: "ScannedPrintIngestEngine — PDF OCR + GD&T symbol recognition + dimension vectorization + title-block parse for feeding scanned prints to master AI",
      acceptance: "300dpi PDF → structured intent JSON with feature list + dims + GDT + title-block fields; validated on 20 JM Die customer prints with ≥95% dim-value accuracy + 100% GDT symbol recognition on Y14.5-compliant prints; OCR engine pinned version + golden set for regression." },
    { id: "U-CUIX-P8-INFRA-04", title: "PrintVsCADDiffEngine — pixel + vector + semantic diff between scanned print and AI-generated drawing output",
      acceptance: "Produces 3-axis diff score: pixel IoU on rendered drawing, vector-graph edit distance on extracted geometry, semantic match on GDT/dim/BOM payload; golden threshold ≥0.92 composite on 10 reference print/drawing pairs; false-positive rate ≤2%." },
    { id: "U-CUIX-P8-INFRA-05", title: "BRepFingerprintEngine — cross-CAD part-comparison hash (volume + surface area + face/edge/vertex count + topology graph hash)",
      acceptance: "Same part exported from ≥3 CADs produces fingerprints within ε=1e-4; different parts differ by ≥0.02; used by all P8-MSTR/HCAD/F360/INV/SW/FC round-trip gates.",
      depends_on: ["U-CUIX-P8-INFRA-02"] },
    { id: "U-CUIX-P8-INFRA-06", title: "P8RealtimeAuditLogEngine — signed append-only audit log per P8 run + web dashboard skill (/cad-p8-status)",
      acceptance: "Every run emits signed JSONL entry: license holder, timestamp, corpus SHA, per-phase latency, pass/fail per criterion, operator override log; retention 90 days; dashboard skill renders last 30 days with pass-rate histogram per CAD." },
    { id: "U-CUIX-P8-INFRA-07", title: "P8ResultAccountabilityBusEngine — pass/fail surfaces to master brain + human sign-off queue + regression gate for CI",
      acceptance: "CI blocks merge on P8 regression; human sign-off required for capstone P8-CAPSTONE; accountability routes results into MasterBrainBackpropPropagator (U-CADC-LP04) so failures feed NN head training.",
      depends_on: ["U-CADC-LP01", "U-CADC-LP04"] },
    { id: "U-CUIX-P8-INFRA-08", title: "P8CrossCADRoundTripDemoEngine — same scanned print runs through all 6 CADs concurrently; cross-CAD consistency via CrossCADConsistencyValidator",
      acceptance: "1 intent → 6 CAD outputs (or 4/6 when license gates block SW/HCAD); BRep fingerprints within ε across supported CADs; consistency report generated; aggregated Omega score ≥0.90.",
      depends_on: ["U-CADC-CRD01", "U-CADC-CRD03", "U-CUIX-P8-INFRA-05"] },

    // ── Mastercam (8 units) ─────────────────────────────────────────────
    { id: "U-CUIX-P8-MSTR-01", title: "MastercamLiveLicenseOrchestrationHarness — check out JM Die Mastercam seat via FlexLM/NHaspX, launch Mastercam.exe with NetHook3/COM, release within 30s",
      acceptance: "Seat checkout+launch <60s; leak detection fails run if held >test duration + 60s; 50-cycle stress test passes.",
      depends_on: ["U-CUIX-P8-INFRA-01", "U-CUIX-P0-19"] },
    { id: "U-CUIX-P8-MSTR-02", title: "MastercamGoldenCorpusGOLD25 — 25-file corpus: 10 fastener dies (2 simple pierce + 3 progressive + 3 compound + 2 deep-draw), 5 sinker electrodes (Ø<0.5/0.5-2/>2), 5 wire EDM (2D/4ax taper/var taper), 5 5-axis aero brackets",
      acceptance: "25 corpus parts under data/corpus/mastercam-gold-25/, SHA-256 manifest, paired 300dpi PDF scans + golden .mcam-2024 + posted NC stored.",
      depends_on: ["U-CUIX-P8-INFRA-02"] },
    { id: "U-CUIX-P8-MSTR-03", title: "MastercamPrintToCADRoundTrip — PDF scanned print → master AI generates .mcam from scratch via VisionPrintReadEngine→PartReconstructionEngine→MastercamSolidsBridge",
      acceptance: "BRep fingerprint cosine ≥0.97 vs golden; mass ±0.5%; face-count exact; GDT feature-count exact; tolerance bands match ±1 IT-grade on 100% of callouts across 25 corpus parts.",
      depends_on: ["U-CUIX-P8-MSTR-01", "U-CUIX-P8-MSTR-02", "U-CUIX-P8-INFRA-03", "U-CUIX-P7-13"] },
    { id: "U-CUIX-P8-MSTR-04", title: "MastercamCADToPrintRoundTrip — golden .mcam → auto-generate drawing (views + sections + Y14.5 dims + GDT) + DWG export; diff to original scanned print",
      acceptance: "View-count exact; dim-value match ≥98% (±0.0005\"); GDT symbol placement within 2mm; title-block 100% populated.",
      depends_on: ["U-CUIX-P8-MSTR-01", "U-CUIX-P8-MSTR-02", "U-CUIX-P8-INFRA-04", "U-CUIX-P7-19"] },
    { id: "U-CUIX-P8-MSTR-05", title: "MastercamToolpathPostRegenFidelity — regen full op tree (stock/ops/tool library/WCS) + post to shop's Fanuc/Haas/Okuma; NC diff to golden",
      acceptance: "≥95% line-identical NC vs golden posted file (ignoring timestamps/comments/seq-nums); cycle-time ±3%; tool-list exact; collision-check clean." },
    { id: "U-CUIX-P8-MSTR-06", title: "MastercamFaultInjectionRecovery — inject 8 fault classes (license drop, NetHook crash, corrupt intent, missing tool, OOM, disk-full, bad post DLL, user-cancel)",
      acceptance: "8/8 faults produce graceful degradation + audit entry + zero license leaks; retry-with-backoff + seat-failover + checkpoint recovery verified." },
    { id: "U-CUIX-P8-MSTR-07", title: "MastercamCrossVersionParity — GOLD-25 across X8/2024/2025",
      acceptance: "BRep fingerprint drift ≤0.02 across versions; NC diff ≤2% line-variance; version-specific features documented." },
    { id: "U-CUIX-P8-MSTR-08", title: "MastercamAccountabilityDashboard — signed audit log per run + /mastercam-realtime-status skill",
      acceptance: "All 7 prior MSTR units emit audit JSONL; dashboard retention 90 days; immutable append-only log at data/state/MASTERCAM_REALTIME_AUDIT.jsonl.",
      depends_on: ["U-CUIX-P8-INFRA-06"] },

    // ── HyperCAD-S (8 units) ────────────────────────────────────────────
    { id: "U-CUIX-P8-HCAD-01", title: "HyperCADSLiveLicenseTierGating — CodeMeter dongle + OpenMind license server + concurrent checkout (EXPERT+5AXIS+ELECTRODE+VIRTUAL); forced tier-downgrade correctly blocks FT ops",
      acceptance: "All 11 license tiers probed; seat-exhaustion graceful-degrade; 10-min hold stress test passes.",
      depends_on: ["U-CUIX-P8-INFRA-01", "U-CUIX-P0-17"] },
    { id: "U-CUIX-P8-HCAD-02", title: "HyperCADSGoldenCorpus — 5 .hmc parts: ALCOA/EDM rib-electrode + ITW/5AX impeller + Optimas/FIX vise-jaw-step + SFS/MOLD 2-cavity-insert + Holo-Krome/MT shaft-A; paired scanned PDFs + golden VM G-code + golden burn tables",
      acceptance: "SHA-256 manifest; golden FT-tag set extracted; 3 post outputs stored; CorpusIntegrityEngine verifies.",
      depends_on: ["U-CUIX-P8-INFRA-02"] },
    { id: "U-CUIX-P8-HCAD-03", title: "HyperCADSPrintToCADFTGeneration — PDF OCR+GDT → master AI emits .hmc via hyperCAD-S COM API → FT engine tags features → diff golden FT set",
      acceptance: "≥95% feature-match (hole/pocket/boss/chamfer) + ≥90% dimensional tolerance match + zero missing critical GDT across 5 corpus parts.",
      depends_on: ["U-CUIX-P8-HCAD-01", "U-CUIX-P8-HCAD-02", "U-CUIX-P8-INFRA-03", "U-CUIX-P7-14"] },
    { id: "U-CUIX-P8-HCAD-04", title: "HyperCADSCADToPrintGeneration — golden .hmc → Drawing API auto-generates views/sections/dims/GDT → PDF → pixel+vector diff vs scanned print",
      acceptance: "≥92% dim-label match + ≥95% view-projection match + title-block parity.",
      depends_on: ["U-CUIX-P8-HCAD-01", "U-CUIX-P8-HCAD-02", "U-CUIX-P8-INFRA-04", "U-CUIX-P7-20"] },
    { id: "U-CUIX-P8-HCAD-05", title: "HyperCADSVirtualMachineKinematicFidelity — reconstructed Job Tree replayed across 3 kinematics (5-axis trunnion + mill-turn + 3-axis VMC)",
      acceptance: "Zero false-negative crashes; ≤2 false-positives; cycle-time ±3% vs golden." },
    { id: "U-CUIX-P8-HCAD-06", title: "HyperCADSNCPostDialectCoverage — same job tree posts to Heidenhain TNC640 + Siemens 840Dsl + Fanuc 31iB",
      acceptance: "≥98% token match line-by-line vs golden; 100% semantic equivalence (modal state + G-code order + tool calls + M-codes)." },
    { id: "U-CUIX-P8-HCAD-07", title: "HyperCADSElectrodeBurnTableGeneration — electrode corpus → ElectrodeDesignEngine → Mitsubishi EA12D format",
      acceptance: "Spark-gap + orbit + flush + step counts match golden within tolerance; erosion-time ±5%." },
    { id: "U-CUIX-P8-HCAD-08", title: "HyperCADSCrossVersionEquivalence — 2023.1/2024.1/2025.1 parity",
      acceptance: ".hmc structure + FT tags + NC + burn table semantically equivalent; version-drift matrix report." },

    // ── Fusion 360 (8 units) ────────────────────────────────────────────
    { id: "U-CUIX-P8-F360-01", title: "Fusion360LicenseExtensionOrchestration — 4 seats via Autodesk Identity; probe entitlement API; detect Manufacture Extension on exactly 2 seats",
      acceptance: "4/4 signed; extension flags logged to FusionSeatRegistry.json; zero license collisions over 10-min hold.",
      depends_on: ["U-CUIX-P8-INFRA-01"] },
    { id: "U-CUIX-P8-F360-02", title: "Fusion360PrintToF3DFullTimelineRegen — scanned print → master AI generates .f3d with named sketches + timeline",
      acceptance: "BRep fingerprint within 1e-4 of golden; parameter table match ≥95%; timeline op-count ±2 of golden for 16/18 corpus parts; re-edit proof (modify dim → timeline recomputes clean).",
      depends_on: ["U-CUIX-P8-F360-01", "U-CUIX-P8-INFRA-03", "U-CUIX-P7-15"] },
    { id: "U-CUIX-P8-F360-03", title: "Fusion360F3DToDrawingRoundTrip — golden .f3d → Drawing workspace views + dims + GDT + title block → diff to scanned print",
      acceptance: "Dim values ±0.0005\"; annotation count ±1; view projection + scale identical; GDT parse 100% on 6 drawing-capable parts.",
      depends_on: ["U-CUIX-P8-F360-02", "U-CUIX-P8-INFRA-04", "U-CUIX-P7-21"] },
    { id: "U-CUIX-P8-F360-04", title: "Fusion360ManufactureCAMPostRoundTrip — Setup + Tool library + Operations + .cps post on 2 CAM-complete golden parts (requires Manufacture Extension seat)",
      acceptance: "G-code line-diff ≤5%; cycle-time ±8%; tool list identical; collision-check clean." },
    { id: "U-CUIX-P8-F360-05", title: "Fusion360CloudSyncURNOfflineReconcile — Data Panel URN resolution + version pin + disconnect/edit/reconnect",
      acceptance: "URN round-trips 18/18; version history monotonic; non-overlap offline edits merge cleanly; overlap produces deterministic conflict marker." },
    { id: "U-CUIX-P8-F360-06", title: "Fusion360ExtensionGracefulDegradation — Gen/Sim/Nesting/Machining feature requests on non-extension seats",
      acceptance: "Typed ExtensionUnavailable error; fallback path logged; no silent-success false positives." },
    { id: "U-CUIX-P8-F360-07", title: "Fusion360CrossCloudBuildEquivalence — snapshots ≥14 days apart",
      acceptance: "BRep fingerprints stable (tol 1e-5); G-code line-diff ≤2% build-to-build; API deprecations surface via FusionBuildDriftRegistry.json as warnings." },
    { id: "U-CUIX-P8-F360-08", title: "Fusion360Capstone — print→F3D→Drawing→print-match closed loop on 3 blind parts (AI unseen)",
      acceptance: "Final AI-generated drawing dimensionally + annotationally matches original scanned print within unit tolerances; Omega ≥0.95; JM Die operator sign-off required.",
      depends_on: ["U-CUIX-P8-F360-02", "U-CUIX-P8-F360-03", "U-CUIX-P8-INFRA-07"] },

    // ── Inventor (8 units) ──────────────────────────────────────────────
    { id: "U-CUIX-P8-INV-01", title: "InventorLiveCOMOrchestration — launch Inventor 2024 headless + license checkout + open/close G1-G7 + clean Quit + file-lock serialization",
      acceptance: "Zero orphan Inventor.exe; license returned <10s of teardown; lock-file released; wall-clock ~120s per cycle.",
      depends_on: ["U-CUIX-P8-INFRA-01"] },
    { id: "U-CUIX-P8-INV-02", title: "InventorPrintToIPTCapstone(G1) — scanned print of simple bracket → MasterAIInventorGenerationEngine synthesizes .ipt via COM",
      acceptance: "Mass ±0.5%; feature count exact; feature-tree order ≥95% LCS; iProperties (Part Number, Material) exact.",
      depends_on: ["U-CUIX-P8-INV-01", "U-CUIX-P8-INFRA-03", "U-CUIX-P7-16"] },
    { id: "U-CUIX-P8-INV-03", title: "InventorPrintToIAMCapstone(G4) — Frame Generator assembly: print → .iam via API",
      acceptance: "Same profile family, lengths ±1mm; cut-list member count exact; total length ±0.3%; miter angles ±0.5°.",
      depends_on: ["U-CUIX-P8-INV-01", "U-CUIX-P8-INFRA-03", "U-CUIX-P7-22"] },
    { id: "U-CUIX-P8-INV-04", title: "InventorModelToIDWRoundTrip(G1/G2/G4) — golden .ipt/.iam → base+projected+section views → RetrieveDims + AI GDT → diff to print",
      acceptance: "Dim count ±2; GDT callouts exact set; title-block iProperty-linked; BOM row-count exact for G4.",
      depends_on: ["U-CUIX-P8-INV-01", "U-CUIX-P8-INFRA-04"] },
    { id: "U-CUIX-P8-INV-05", title: "InventoriLogicRuleRegenExecute(G7 Model States) — ILogicRuleSynthesisEngine regenerates rules → sandboxed execution → all 3 Model States",
      acceptance: "Post-regen mass + Model State active-member set matches golden; sandbox teardown verified." },
    { id: "U-CUIX-P8-INV-06", title: "InventorSheetMetalFlatPatternDXF(G2) — SheetMetalComponentDefinition.FlatPattern.ExportToDXF → parse",
      acceptance: "Bend count = 8 exact; bend-line lengths ±0.2mm; K-factor matches recomputed unfold math ±1%." },
    { id: "U-CUIX-P8-INV-07", title: "InventorContentCenterLinkIntegrity(G4/G5/G6) — full regen + ReferencedDocuments enumeration",
      acceptance: "Zero broken links; all CC parts resolve to cache; family-table member IDs unchanged." },
    { id: "U-CUIX-P8-INV-08", title: "InventorTubePipeCableHarnessRegen(G5/G6) — TubeAndPipeRunsEnumerator + harness topology regen",
      acceptance: "G5 fitting count exact, pipe length ±0.5%; G6 wire count exact, segment topology graph-isomorphic to golden." },

    // ── SolidWorks (8 units) ────────────────────────────────────────────
    { id: "U-CUIX-P8-SW-01", title: "SolidWorksLicensedProcessLifecycle — SW.exe spawn via ISldWorks.Visible=false + SNL token checkout + force-kill reclaim + zombie-process reaper",
      acceptance: "Token <15s checkout; crash reclaim <60s via SNL poll; zero zombies across 50 cycles × 4 versions.",
      depends_on: ["U-CUIX-P8-INFRA-01", "U-CUIX-P0-18"] },
    { id: "U-CUIX-P8-SW-02", title: "SolidWorksJMDieGroundTruthCorpus — ≥10 parts from ITW/Alcoa: single-config + multi-config Design Table + 100+ comp assembly + weldment + sheet-metal + mold-tool + surfacing + toolbox + in-context + Large Assembly 500+",
      acceptance: "SHA-256 locked; mass/COG/volume goldens via GetMassProperties2; 4-hour curation.",
      depends_on: ["U-CUIX-P8-INFRA-02"] },
    { id: "U-CUIX-P8-SW-03", title: "SolidWorksPrintToSLDPRTRoundTrip — scanned print (PDF+DXF overlay) → feature-tree intent → SolidWorksCodeGeneratorAdapter → VBA/C# macro",
      acceptance: "Mass ±0.5%; feature count exact; Equations restored; configurations preserved; 10 parts × ≥80% pass rate.",
      depends_on: ["U-CUIX-P8-SW-01", "U-CUIX-P8-SW-02", "U-CUIX-P8-INFRA-03", "U-CUIX-P7-17"] },
    { id: "U-CUIX-P8-SW-04", title: "SolidWorksSLDPRTToSLDDRWDimXpert — IDrawingDoc.InsertModelInPredefinedView + DimXpertManager.AutoDimensionScheme",
      acceptance: "Dim-count Δ ≤10%; all GDT symbols retrieved; tolerance stack preserved.",
      depends_on: ["U-CUIX-P8-SW-01", "U-CUIX-P8-SW-02", "U-CUIX-P8-INFRA-04"] },
    { id: "U-CUIX-P8-SW-05", title: "SolidWorksDesignTableMultiConfigRegen — Alcoa bushing ≥5 configs → export→drop→regen",
      acceptance: "Activate 3 configs via ShowConfiguration2; mass/dim per config ±0.25%." },
    { id: "U-CUIX-P8-SW-06", title: "SolidWorksMateUniverseExercise — assembly with Standard + Advanced + Mechanical + Magnetic mate categories",
      acceptance: "Strip all mates; regen via AddMate5 from intent graph; zero over-defined; zero missing refs; DOF count identical." },
    { id: "U-CUIX-P8-SW-07", title: "SolidWorksEPDMWorkflowTransition — IEdmVault5.LoginAuto + check-out + edit + check-in + workflow WIP→Review→Released",
      acceptance: "Revision bump + history log + permission gate verified." },
    { id: "U-CUIX-P8-SW-08", title: "SolidWorksLicenseTierDegradeMatrix — disable Sim/Flow/Plastics/Electrical/Visualize tokens one-at-a-time at SNL",
      acceptance: "Typed LicenseUnavailableError + fallback path (FEA→analytical; Flow→Re/Nu correlation; Visualize→OpenGL screenshot); no SW crash across 8 scenarios." },

    // ── FreeCAD (8 units) ───────────────────────────────────────────────
    { id: "U-CUIX-P8-FC-01", title: "FreeCADHeadlessOrchestrator4RegimeBinaryMatrix — freecadcmd 0.19/0.20/0.21/1.0.1 matrix runner",
      acceptance: "≥99% success across 17×4=68 boot cycles; ≤8s cold-start per regime; zero cross-test pollution (isolated FREECAD_USER_HOME)." },
    { id: "U-CUIX-P8-FC-02", title: "FreeCADCorpusFingerprintEngine — 3-axis hash (BRep TopoShape.hashCode + property graph JSON + InList/OutList dep-graph SHA)",
      acceptance: "Golden fingerprints locked for all 17 parts; same-part fingerprints stable across regimes.",
      depends_on: ["U-CUIX-P8-INFRA-02", "U-CUIX-P8-INFRA-05"] },
    { id: "U-CUIX-P8-FC-03", title: "FreeCADPrintToFCStdAIRoundTrip — master AI consumes scanned print → emits Python recipe → executes via App.ActiveDocument.addObject",
      acceptance: "BRep fingerprint match ≥98% to golden on ≥14/17 parts; failures auto-classify (sketch vs pad vs constraint).",
      depends_on: ["U-CUIX-P8-FC-01", "U-CUIX-P8-INFRA-03", "U-CUIX-P7-18"] },
    { id: "U-CUIX-P8-FC-04", title: "FreeCADFCStdToTechDrawRoundTrip — golden → TechDraw::DrawPage + views + dims + GDT",
      acceptance: "Extracted dim set diffs to scanned-print ground truth within ±0.001\" linear / ±0.01° angular; ≥15/17 parts pass.",
      depends_on: ["U-CUIX-P8-FC-01", "U-CUIX-P8-INFRA-04", "U-CUIX-P7-24"] },
    { id: "U-CUIX-P8-FC-05", title: "FreeCADTNPElementMapRegimeRoundTrip — PartDesign part loaded pre-0.19 → 0.19-0.20 ElementMap v1 → 0.21 v2 → 1.0.1 robust",
      acceptance: "Downstream chamfer reference survives across ≥3 regime migrations without NullShape." },
    { id: "U-CUIX-P8-FC-06", title: "FreeCADExpressionEngineCrossDocRoundTrip — Spreadsheet aliases + <<MasterParams>>#<<Sheet>>.boreDia across 3 docs + save/close/reopen/recompute",
      acceptance: "All 24 expressions re-bind; dependency cycle detector catches injected cycle." },
    { id: "U-CUIX-P8-FC-07", title: "FreeCADArchIFC4.3BIMRoundTrip — ArchIFCRoundTripEngine generates wall+door+window + IfcOpenShell export 4.3 + re-import",
      acceptance: "Entity hierarchy isomorphism (IfcWall/IfcDoor/IfcOpeningElement counts + GlobalId stability); ≥3/3 BIM fixtures." },
    { id: "U-CUIX-P8-FC-08", title: "FreeCADPathJobPostprocessorNCDiff — Path Job over 3 Path fixtures + grbl_post + linuxcnc_post",
      acceptance: "Normalized NC (strip comments/line numbers) diffs to golden within 0 G-code token deltas on required ops; canary ≥10 of ~100 posts." },
  ],
};

// ── Validate and append ───────────────────────────────────────────────────
if (uix.phases.some((p) => p.phase_id === "P8-SHOP-REAL-TIME")) {
  throw new Error("P8-SHOP-REAL-TIME already present");
}
const allIds = P8.unit_list.map((u) => u.id);
const dups = allIds.filter((x, i) => allIds.indexOf(x) !== i);
if (dups.length) throw new Error("Dup P8 IDs: " + dups.join(","));
const existing = uix.phases.flatMap((p) => p.unit_list.map((u) => u.id));
const collisions = allIds.filter((x) => existing.includes(x));
if (collisions.length) throw new Error("P8 collides with existing: " + collisions.join(","));

uix.phases.push(P8);

// ── Update P7-12 to depend on P8 capstone completion ─────────────────────
const p7 = uix.phases.find((p) => p.phase_id === "P7-EXIT");
const p7_12 = p7.unit_list.find((u) => u.id === "U-CUIX-P7-12");
if (p7_12) {
  p7_12.depends_on = (p7_12.depends_on || []).concat([
    "U-CUIX-P8-MSTR-08",
    "U-CUIX-P8-HCAD-08",
    "U-CUIX-P8-F360-08",
    "U-CUIX-P8-INV-08",
    "U-CUIX-P8-SW-08",
    "U-CUIX-P8-FC-08",
    "U-CUIX-P8-INFRA-08",
  ]);
  p7_12.title = p7_12.title + " (NOW: all P7 gates + all 6 P8 per-CAD suites + cross-CAD demo)";
}

// ── Recount + round 4 block ──────────────────────────────────────────────
const sum = uix.phases.reduce((s, p) => s + p.unit_list.length, 0);
const before = uix.total_units;
uix.total_units = sum;

uix.scrutiny_round_4_complete = true;
uix.scrutiny_round_4 = {
  date: DATE,
  method: "6-agent parallel scrutiny — final — one real-time-test-designer per priority CAD (Mastercam/HyperCAD-S/Fusion 360/Inventor/SolidWorks/FreeCAD)",
  agents_dispatched: 6,
  unit_estimate_before: before,
  unit_estimate_after: sum,
  expansion_factor: sum / before,
  axes_before: 15,
  axes_after: 15,
  axes_added: [],
  new_phase: "P8-SHOP-REAL-TIME",
};
uix.scrutiny_round_4_findings = {
  timestamp: new Date().toISOString(),
  agents_run: 6,
  rationale:
    "User directive: 'the road map should end with exhaustive testing of each cad system in real time using the shop keys and software...print→CAD→print round-trip on scanned customer prints as the best test.' Round 4 adds P8-SHOP-REAL-TIME (56 units = 8 shared infra + 8 per priority CAD × 6) as the FINAL phase of the envelope. Every unit exercises live shop licenses against real JM Die customer data. The capstone gates (MSTR-03/04, HCAD-03/04, F360-02/03/08, INV-02/04, SW-03/04, FC-03/04) implement the print→CAD→print round-trip: scanned PDF → master AI generates 3D CAD from scratch → master AI generates drawing from that CAD → dimensions placed → diff to original print must match within stated tolerances (BRep fingerprint ≥0.97, dim values ±0.0005\", GDT 100% recognition).",
  new_phase_units: P8.unit_list.map((u) => u.id),
  wall_clock_budget: {
    mastercam: "~4-5hr single-version, ~13-15hr 3-version matrix",
    hypercad_s: "~8hr full phase",
    fusion360: "~26hr (parallelizable to ~8hr across 4 seats)",
    inventor: "~25-30min serial (single-COM-instance constraint)",
    solidworks: "~9hr/version × 4 versions = ~36hr full matrix",
    freecad: "~32min full matrix (8-core, OSS no-license advantage)",
  },
  infrastructure_blockers: [
    "Mastercam 1 reserved seat + FlexLM admin read + SDK dev license",
    "HyperCAD-S CodeMeter dongle + OpenMind license server + tier pool (EXPERT/5AXIS/ELECTRODE/VIRTUAL)",
    "Fusion 360: 4 seats + 2 Manufacture Extension + Autodesk Identity + 50Mbps network for cloud sync",
    "Inventor: single-COM-instance serialization (no concurrent runs)",
    "SolidWorks: Windows VM + SNL + Premium + Sim + Flow + Plastics + PDM Pro + Visualize (~$32K/yr)",
    "FreeCAD: none — OSS; 8-core CI runner recommended",
  ],
  total_units_before: before,
  total_units_after: sum,
  coverage_gates_unchanged: true,
  priority_order_unchanged: true,
  bottom_line:
    "The roadmap now ENDS with the exact test the user specified: for each of 6 priority CADs, against live shop license, using real JM Die customer prints + CAD files, the master AI must generate a 3D CAD from a scanned print and then generate a drawing FROM that CAD that matches the original print within stated tolerances. 56 units specify this end-to-end proof; every unit has concrete numeric acceptance criteria; critical-path dependencies trace back through the entire envelope. If P8 is green, PRISM demonstrably controls every priority CAD software to produce complex parts and full assemblies.",
};

writeFileSync(UIX, JSON.stringify(uix, null, 2) + "\n", "utf8");

// ── Roadmap-index mirror ─────────────────────────────────────────────────
const entry = idx.milestones.find((m) => m.id === "CAD-UIX-MS0");
entry.total_units = sum;
entry.scrutiny_round_4_complete = true;
entry.description = (entry.description || "").replace(/\s*$/, "") +
  ` Round 4 (${DATE}): P8-SHOP-REAL-TIME phase appended (+56 units: 8 shared infra + 48 per-CAD real-time tests, all against live shop licenses on real JM Die data) = ${sum}u total. Capstone: print↔CAD↔print round-trip per CAD.`;
idx.updated_at = new Date().toISOString();
writeFileSync(IDX, JSON.stringify(idx, null, 2) + "\n", "utf8");

console.log("P8-SHOP-REAL-TIME added: " + P8.unit_list.length + " units");
console.log("CAD-UIX-MS0 total_units: " + before + " → " + sum);
console.log("P7-12 now depends on: " + p7_12.depends_on.length + " gates (P7 + P8)");
