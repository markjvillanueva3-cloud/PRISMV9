---
name: reference_cam_machine_export_verifiability_2026_06_09
description: "CAM machine-library export is verifiable (round-trippable) ONLY where a readable golden machine-def format + reader exist in-repo — Fusion yes (XML .machine), hyperMILL/Mastercam no (proprietary binary). TOOL export is covered for all three."
type: reference
source: prism-memory
synced: 2026-06-27T20:30:46.503Z
aliases: reference_cam_machine_export_verifiability_2026_06_09
---


**CAM-app database export — what is verifiably buildable (slot:romeo, 2026-06-09, CATALOG-APP-WIRING-MS0)**

The goal "all tool/holder/insert/machine databases added to fusion, hypermill, mastercam, hsmadvisor, gwizard, ..." splits by VERIFIABILITY, because romeo refuses wiring-without-round-trip-test:

**MACHINE databases (machine-profiles-catalog -> app machine library):**
- **Fusion 360: DONE + verifiable.** `.machine` is human-readable XML (ns `http://www.hsmworks.com/xml/2009/machine`). Real Autodesk goldens ship in `resources/FUSION360/hsm-posts/res/Machines/{Milling,Additive,Fabrication}/*.machine`. `FusionMachineLibraryExportEngine` (1082 machines, wired `prism_cam:fusion_export_machine_library`, commit 44c41ee643 + P2 a6d80537cf) round-trips emitted output AND live goldens. NOTE: `.machine` is XML, NOT JSON — read the golden before emitting.
- **hyperMILL: BLOCKED (not round-trippable in-repo).** Machine models are proprietary BINARY — `resources/HYPERMILL/` holds only `omMachineSimulation*.dll` / `omMachineAnalyse*.dll`, no readable `.mon`/machine-def golden. A faithful exporter can't be verified against anything in-repo.
- **Mastercam: BLOCKED (not round-trippable in-repo).** Machine defs are proprietary binary `.mcam-mmd`; `resources/MasterCam/` holds only `mwMachineConverter.dll` / `ArtMachine.dll`, no readable machine-def golden.
- **G-Wizard / HSMAdvisor: N/A** — these are speed/feed calculators; "machine" is a rigidity/power INPUT, not a library artifact. Their TOOL exporters shipped earlier (GWizardToolCribExportEngine, HSMAdvisorSettingsExportEngine).

**TOOL databases (73,827-tool catalog -> app tool library): COVERED + wired**
- Fusion: `FusionToolExportEngine` / `Fusion360ToolExportEngine` -> `prism_cam:fusion_export_tool_library` (full 62.7K corpus; the `ensureLoaded()` + `max_results: limit ?? 100_000` fix lifted the 20-cap, CATALOG-APP-WIRING-MS0/U3).
- hyperMILL: `HyperMillToolExportEngine` (wired camDispatcher).
- Mastercam: `MastercamToolExportEngine` (wired camDispatcher, `.tools` format).
- G-Wizard: `GWizardToolCribExportEngine`; HSMAdvisor: `HSMAdvisorSettingsExportEngine` (both shipped this session region).

**Lesson:** before promising a machine-DB exporter for a CAM app, check `resources/<APP>/` for a READABLE golden machine-def + confirm an in-repo reader/round-trip is possible. Binary/proprietary machine formats (hyperMILL, Mastercam) are NOT faithfully exportable without a real binary golden to reverse — that's a [SCOPED]/operator-decision, not a default romeo build. [[feedback_wire_test_validate_all_galaxies]]

**CONFIRMED BUG (next-unit, verifiable, in-lane) — hyperMILL tool export silently caps at 5000:**
`HyperMillToolExportEngine.exportToHMT` catalog-fallback (`src/engines/HyperMillToolExportEngine.ts:871` `toolCatalogEngine.search({ max_results: 5000 })`) and `_queryCatalog` (`:1126` `max_results: filter?.max_tools ?? 5000`) both cap at **5000**, while the catalog is ~74K tools and the method JSDoc says "(or empty for full catalog)" + header says "95K+ tool catalog". So a "full" hyperMILL `.hmt` export drops ~93% of the catalog — same silent-under-export class as the Fusion 20-cap (CATALOG-APP-WIRING-MS0/U3). Intent (full) != impl (5000) => bug, not a documented ceiling.
FIX: raise the default to a high ceiling (Fusion used `?? 100_000`) OR make 5000 an explicit, documented, dispatcher-overridable `max_tools` ceiling — not a silent cap labeled "full". Add a dispatcher round-trip test asserting the full-catalog tool_count (the camDispatcher case `hypermill_tool_export` @10349 already does `ensureLoaded()`; the cap is engine-side).
UNVERIFIED: `MastercamToolExportEngine.exportLibrary` (`:494`) catalog-query cap — the `:529` slice is per-manufacturer chunking, but whether the catalog QUERY itself caps is unread. Check before assuming Mastercam is clean.
