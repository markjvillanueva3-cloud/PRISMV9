# SCRUTINY ROUND-2 — CAM-EXHAUST-MS0 (post-fix, 5-agent parallel audit)
## Date: 2026-04-21 | 5 parallel Explore agents — one per priority-5 CAM

**Baseline:** Round-1 scrutiny `SCRUTINY-CAM-EXHAUST-MS0-2026-04-21.md`. Fixes F1-F7 applied (see `post_scrutiny_2026_04_21` block in `CAM-EXHAUST-MS0.json`). Round-2 asks each CAM its own audit question.

**Build state after fixes:** TS clean (`tsc --noEmit` passed); 18/18 new tests green (`CAMCatalogLoaderEngine.test.ts`).

---

## SUMMARY — PER-CAM CONFIDENCE TO "ABSOLUTE FULL CONTROL"

| CAM | Claimed params | Observed | Coverage | Adapter wired | Confidence | Top blocker |
|---|---|---|---|---|---|---|
| **hyperMILL** | 1,323 | **1,375** (+52 over) | 104% | Adapter typed, **plugin DLL missing** | **0.72** | Plugin DLL + tool/stock catalogs (U-CAM09/10) |
| **Mastercam** | 1,689 | ~1,238 | 73% (below 80%) | NET-Hook adapter **real**, read-only | **0.62** | Can't *create* operations — only analyze (U-CAM89 extend) |
| **Inventor HSM** | 1,247 | 1,247 | 100% but 0% schema compliance | Adapter typed (726 lines), **orphan** | **0.72** | Zero physics_links / tribal_tips / ai_actions in catalog; adapter not wired |
| **Fusion 360** | 1,459 | 847+612=1,459 | 100% but **fragmented** across 3 dirs | Adapter real (JSON-RPC 2.0), untested | **0.62** | Catalog split (2D in extracted-knowledge/, 3D in data/fusion360/, UI in cam-ui/) — LoaderEngine won't find 2/3 of it |
| **SolidCAM** | 0 | 0 | 0% | Bridge live (Port 18363) | **0.78** | No catalog, no PDFs; **adapter_protocol labeled wrong** in registry |

**Aggregate confidence for "absolute full control of the priority-5": ~0.69.** Up from ~0.35 pre-fix (gated on F3/F4 before). The ceiling is 0.90+ within the existing 245-unit plan if the 6 blockers below resolve.

---

## 6 BLOCKERS IDENTIFIED BY ≥2 AGENTS INDEPENDENTLY

### B1 — Schema compliance is 0% across all 5 CAMs  [CRITICAL]

Every agent flagged the same thing: the captured JSONs carry parameter lists but **none populate `physics_links[]`, `tribal_tips[]`, or `ai_actions[]` from `camFunctionIndexSchema.ts`**. `CAMCatalogLoaderEngine` now binds shape but the content is still disconnected from PRISM's physics + tribal layers.

**Impact:** Phase-5 engines (Router/Validator/Strategy/Optimizer/Translator/AGIReasoning/TribalKnowledge/FeatureLearning) can traverse the catalogs but receive zero physics or tribal signal from them. All their "stub" outputs stay stubs even if we re-implement, because the knowledge graph is flat.

**Fix:** Add `U-CAM-SCHEMA-ENRICH` as a Phase-0.6 gate (between F3's binding and Phase-5 real engines). Three sub-units:
- `U-CAM-ENRICH-PHYSICS`: for every parameter that maps to Kienzle/Taylor/deflection, inject `physics_links[{ formula_id, canonical_ref }]`. Cross-reference against `src/physics/constants.ts` + existing formula registries (e.g. `hypermill-formula-registry.ts`).
- `U-CAM-ENRICH-TRIBAL`: link the 202 SolidCAM tips + 3,700 existing tribal tips to the parameters they describe. Requires `TribalKnowledgeEngine.match(param_id) → tip_ids[]`.
- `U-CAM-ENRICH-ACTIONS`: populate `ai_actions[]` with the 6 standard verbs (validate / recommend / optimize / translate / reason / learn) per parameter, pointing to the Phase-5 engines now scaffolded.

### B2 — Fusion 360 catalog lives in THREE directories, not one  [CRITICAL — unique to Fusion]

Agent-F found real data split across:
- `data/fusion360/FUSION360_CAM_COMPLETE_CATALOG.json` (847 params — 3D/Multi-Axis/Turning/Probing)
- `data/extracted-knowledge/fusion360-cam/Fusion360-2D-Toolpath-Parameters.json` (612 params — 2D, 11 toolpath types)
- `data/cam-ui/fusion360/FUSION360_CAM_UI_COMPLETE.json` (387 UI elements)

`CAMCatalogLoaderEngine` only scans `cam-functions/fusion360/` (empty) and `cam-ui/fusion360/`. It finds 387 UI elements and **misses 1,459 real parameters**. The loader reports "coverage 26%" when actual coverage is 100%.

**Fix:** Either (a) move `FUSION360_CAM_COMPLETE_CATALOG.json` + the 2D file into `cam-functions/fusion360/` with a checksum-verified migration, or (b) extend `CAMSystemRegistry` to declare additional catalog roots per system. (a) is cleaner and 1-unit work.

### B3 — Mastercam adapter is read-only  [HIGH — unique to Mastercam]

U-CAM89 `MastercamPluginAdapterEngine` is real code, but the NET-Hook bindings only cover **read** operations (getGeometry, getOperationTree, exportSTEP, analyzeOperation). **Nothing in the current code path creates an operation, sets parameters, or posts output.** "Full control" requires operation-create via `Mastercam.IO.Operation` tree.

**Fix:** `U-CAM89-EXTEND` — add OLE methods for machine-group create, stock/WCS set, operation instantiation, parameter assignment, post-process invoke. Write order-of-operations test against a headless Mastercam instance.

### B4 — hyperMILL plugin DLL missing from build path  [HIGH — unique to hyperMILL]

Agent-H found the adapter engine (`HyperMillPluginAdapterEngine.ts`, 300+ LOC with typed schemas) references `HyperMillPRISMPlugin.dll` which **does not exist** under any expected path. COM marshalling layer is interface-only. The XML-RPC COM bridge claimed complete under U-CAM86 is currently an interface contract, not a working adapter.

**Fix:** Either (a) locate/generate the DLL (likely needs a C# project under `/plugins/hypermill/` — check `H:/PRISM/plugins/` first), or (b) flip U-CAM86 status from `complete` back to `in_progress` and add a sub-unit `U-CAM86-DLL` with a concrete deliverable. Current `complete` status is inaccurate.

### B5 — SolidCAM `adapter_protocol` is mislabeled  [HIGH — unique to SolidCAM]

Agent-S caught a category error I introduced in F3. `CAMSystemRegistry.ts` has SolidCAM as `adapter_protocol: "com-ilogic"`. **iLogic is Inventor's scripting, not SolidWorks's.** SolidCAM is a SolidWorks add-in using SolidWorks COM API. The existing `SolidCAMSolidWorksBridgeEngine` (Port 18363) uses SolidWorks API correctly — it's only the registry slug that's wrong.

**Fix (trivial):** Change `adapter_protocol` to `"com-sw"` (new enum value) and extend the adapter-protocol union type in `CAMSystemRegistry.ts`.

### B6 — Inventor HSM adapter orphaned  [HIGH — unique to Inventor HSM]

Agent-I verified `InventorHSMPluginAdapterEngine.ts` (726 lines, 25 passing tests, real COM + iLogic rule synthesis) exists but is **wired to nothing**. No hook into `CAMCatalogLoaderEngine`, `CAMSystemRegistry`, or the Phase-5 stubs. iLogic rules are generated but never dispatched to a live Inventor process.

**Fix:** `U-CAM88-WIRE` — register the adapter under `CAMSystemRegistry["inventor-hsm"].plugin_adapter_class` and expose via `camDispatcher` actions. One-session scope.

---

## EMERGENT THEME — "Real code exists, wiring does not"

Across all 5 audits, the pattern is identical:
- hyperMILL: 60 engines + 13 data assets + adapter + speed-feed catalog — but no end-to-end action chain exposed
- Mastercam: adapter real, 1,238 params captured — but adapter is read-only and Phase-5 engines don't consume the params
- Fusion 360: adapter real, 1,459 params captured — but params live in 3 directories the loader doesn't scan
- Inventor HSM: adapter real (726 lines), 1,247 params — adapter orphan, catalog has no physics/tribal links
- SolidCAM: bridge real (port 18363), 202 tips — no catalog, no PDFs, wrong protocol label

**The F3 schema-binding fix bought us the shape contract. It didn't buy us the content contract** (physics/tribal/actions per parameter) or the operation contract (create/modify, not just read).

---

## REVISED PRIORITY QUEUE (ordered by leverage × blocker count)

1. **B2 — Fusion 360 catalog consolidation** (single-session fix, restores 1,459 visible params immediately)
2. **B5 — SolidCAM protocol label fix** (10-minute fix, unblocks correct adapter wiring)
3. **B1 — Schema enrichment gate** (1-2 sessions; 5 CAMs × 3 sub-units = 15 unit-equivalents but trivially parallelizable; unblocks EVERY Phase-5 real engine)
4. **B6 — Inventor HSM adapter wire-up** (single session; turns 726 lines of real code from dormant to dispatched)
5. **B4 — hyperMILL plugin DLL investigate** (likely under `plugins/` or needs creation; 1-3 sessions depending on whether C# project exists)
6. **B3 — Mastercam operation-create extend** (largest surface; 2-3 sessions)

After this queue, Round-3 scrutiny should re-run the same 5-agent protocol to confirm.

---

## FIXES THAT DID LAND CORRECTLY (Round-1 follow-up)

| Round-1 finding | Status in Round-2 |
|---|---|
| F1 — `completed_units` stale | ✓ Now 14 with explicit `completed_unit_ids[]` |
| F2 — SolidCAM not in Phase-1 | ✓ Promoted; dirs scaffolded; in coverage_by_system (0 params with status: research_pending) |
| F3 — orphan schemas | ✓ `CAMCatalogLoaderEngine` + tests bind shape; content enrichment is B1 |
| F4 — naming drift | ✓ `fusion/`, `fusion360/` (empty), `inventorcam/` under cam-functions removed; canonical slugs enforced via `CAMSystemRegistry` |
| F5 — Phase-5 engines absent | ✓ 8 stubs scaffolded (`CAMFunctionRouterEngine` + 7 in `CAMPhase5Stubs.ts`); each returns live `catalog_coverage_pct` telemetry |
| F6 — off-plan commits | ✓ Documented; protocol in `post_scrutiny_2026_04_21.post_commit_hook` |
| F7 — PDF extraction | Deferred (async; not a blocker for priority-5 control) |

None of the Round-1 fixes regressed into Round-2 blockers. B1-B6 are all deeper-layer issues that only became visible once the shape contract was enforced.

---

## WHAT RE-RUNNING ROUND-3 WOULD COST

The 5-agent Round-2 audit took ~5 minutes of parallel agent time and surfaced 6 blockers that Round-1 couldn't see (because Round-1 was looking at roadmap/status drift, not per-CAM integration drift). A Round-3 pass after B1-B6 is worth running **only after the schema-enrichment gate (B1) lands**, since that's the gate with the largest coverage expansion. Running earlier would re-surface B1 in every report.
