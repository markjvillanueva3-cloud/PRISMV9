---
name: reference_kilo_cam_vendor_bridges_2026_05_28
description: CAM vendor bridges — 6 tier-1 + ~20 adapters; extraction-log status (do NOT re-extract Mastercam/hyperMILL)
type: reference
source: prism-memory
synced: 2026-06-09T14:54:09.183Z
aliases: reference_kilo_cam_vendor_bridges_2026_05_28
---


2026-05-28 (slot:kilo): CAM vendor landscape.

**6 tier-1 bridges** (CLAUDE-BRIEF canonical): Fusion 360 · hyperMILL · Mastercam · Esprit · Inventor HSM · SolidWorks CAM.

**Vendor adapters (~20):** NX-CAM · PowerMill · CATIA Manufacturing/KBM · SolidCAM (iMachining) · GibbsCAM · BobCAD · Cimatron · TopSolid · WorkNC · CAMWorks · Tebis · FeatureCAM · Edgecam · SprutCAM · AlphaCAM · SURFCAM · VISI · Creo · PartMaker · Vericut · NCSIMUL.

**hyperMILL sub-galaxy:** `engines/hypermill/` (68 engines) — AC bridge (connection/executor/server-config/standard-tool-DB), AI orchestration, blade roughing, 5-axis tilt-limit hook, automation bridge.

**Cross-vendor transfer rule (load-bearing):** same strategy NAME across vendors ≠ same physics. Map via `CAM_VENDOR_REGISTRY.json` + `CAMCrossSystemTranslatorEngine`, NEVER parameter-name string-match.

**Extraction status (do NOT re-extract — `mcp-server/data/state/extraction-log.json`):** Mastercam(45), hyperMILL(25) already extracted. Before any new CAM engine: `duplicationGuardEngine.mustCheckBeforeCreating()` (71 CAM* + 68 hyperMILL already exist).
