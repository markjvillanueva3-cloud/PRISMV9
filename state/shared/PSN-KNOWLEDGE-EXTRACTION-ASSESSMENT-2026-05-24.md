# PSN Knowledge Extraction Assessment — 2026-05-24

**Slot:** delta · **Asked:** (a) did we extract all usable data from engineering courses + CAD software PDFs? (b) would per-function-type + input wiki/tribal nodes (NN-traversable) be beneficial?

## Part A — extraction completeness today

### CAD software PDFs / SDKs — **MOSTLY EXTRACTED**

- **21+ per-CAD `*FunctionIndexEngine.ts`** on disk: Alphacam, BobCAD-CAM, CAMWorks, CATIA Machining, Cimatron, Creo, Edgecam, Esprit, FeatureCAM, Fusion360 (×2), GibbsCAM, hyperCAD, hyperMILL, Inventor (CAD/CAM/HSM), Mastercam (×2), NX (×3), Powermill, SolidCAM, SolidWorks, Tebis, TopSolid, Vericut, WorkNC, more.
- **551+ wiki entries** under `knowledge/wiki/architecture/actions/cam/*-function-index-*.md` exposing the 10 standard verbs per system (get/list/find-parameter/search-parameters/get-section/get-summary/get-operation/get-operations-by-category/list-sections/list-operations).
- **Today's ship:** `HYPERMILL_SDK_APIS.json` (schemaVersion 1, 7 categories, machine-readable) + `HYPERMILL_SDK_REFERENCE.md` companion.
- **29 PDF/doc extracts** under `knowledge/wiki/architecture/extracts/` (Fusion360, hyperMILL, FreeCAD complete inventories, knowledge graphs).

**Gap:** per-function INPUT parameters not fully enumerated. Wiki entry "find-parameter" exists, but the actual parameter table per function (name, type, units, valid-range, default) is partial — most extracts are 1.8-1.9 KB summary stubs, not the full enumerated parameter trees.

### Engineering courses (MIT-OCW + Academy) — **METADATA-ONLY, NOT EXTRACTED**

- **~461 MIT/course memo references** in `knowledge/memories/reference/` matching `mit_|fall_200|spring_200` patterns.
- **Spot-check** of `node_formula_mit_10_34_fall_2015_crystal_structures.md` (3 lines of content): just course code + candidate-engine pointers — **no actual formulas, no concept text, no problem sets extracted**.
- The memo annotation literally says: `"(catalog metadata only — lima audit pending)"`. This is the open audit named in the reference-memo system itself.
- Academy courses (`academy_course_0a..6_to_12`, 10+ memos) are the same shape: pointer stubs, no content.

**Verdict:** course corpus has been *indexed by name* but **the actual knowledge inside the courses has not been pulled into PRISM's wiki/tribal/formula layers**. The `lima` slot has the standing audit.

## Part B — should every function-type + input become a wiki + tribal node?

### Short answer: **YES, with priority ordering — this is the right architecture.**

### Why it's right

1. **Already partially proven.** The 551-entry per-CAD function-index wiki layer + tribal-by-domain inject IS this pattern. It works — the master-index pre-search hits CAD nodes by token match per UserPromptSubmit. Doubling down on enumeration is incremental, not architectural change.
2. **Closes the NN reference-pool gap.** The current GraphSAGE tier-5 wiring-inference is **DORMANT** (AUROC 0.096, gate ≥0.78) per CLAUDE.md §NN-GRAPH-MS2 because the reference pool is too small. Every per-input node is one more labeled edge the GraphSAGE retrainer can ground on. **More nodes → bigger reference pool → tier-5 promotes from dormant to active.**
3. **PSN leg synergy.** Per-input nodes feed simultaneously: leg #3 Wiki + leg #5 Tribal + leg #6 System Viz + leg #10 NN/GNN. One write surface compounds across four legs — the highest-leverage compounding pattern PRISM has.
4. **Closes the production-CAD-gen gap.** The 2026-05-24 capability assessment named **corpus scale-up** as the #1 gap before production-grade. Per-function/per-input nodes ARE the corpus scale-up.

### Why ordering matters

| Priority | Surface | Effort | Compounding |
|---|---|---|---|
| **P0** | MIT courses → real formula/concept extraction | High (461 stubs × full content pull) | HIGH — closes the "lima audit pending" backlog + feeds every physics/material/manufacturing engine prior |
| **P1** | Per-CAD function INPUT enumeration (param trees) | Medium (extend existing 21 FunctionIndexEngines) | HIGH — directly increases NN-graph reference pool size; closes wiki gap |
| **P2** | Tribal nodes per function-input combo | Low (auto-generate from P1) | Medium — duplicates P1 surface; only useful if tribal-by-domain inject is wider than master-index |
| **P3** | Cross-CAD function-equivalence edges (e.g., Fusion HoleFeature ↔ SolidWorks Hole-Wizard) | Low (one engine, table-driven) | HIGH — multi-CAD adapter just shipped today already encodes this; promoting it to a node graph is one engine away |

### What to avoid

- **Don't enumerate before extracting.** Empty pointer-stub nodes (the current MIT pattern) inflate node count without growing reference-pool quality. The NN AUROC failure is *because* of pointer-stub nodes. Extract content FIRST, node second.
- **Don't duplicate the function-index layer.** Wiki + tribal-by-domain already serves this for invocation. Per-input nodes should be *children* of the existing function nodes, not parallel surfaces.

## Recommendation

**4 units to close both gaps in one milestone (call it `KNOWLEDGE-EXTRACT-COMPLETE-MS0`):**

1. **`U-KEC-MIT-CONTENT-PULL`** — process 461 MIT memo stubs through a real-content extractor (problem sets, lecture notes, equations). Wire `lima` slot as owner (matches the existing "lima audit pending" tag).
2. **`U-KEC-CAD-PARAM-ENUMERATE`** — extend `*FunctionIndexEngine` outputs to emit full parameter trees (name, type, units, range, default) per function. Auto-generate one wiki + tribal node per function-input pair.
3. **`U-KEC-CAD-EQUIV-GRAPH`** — promote the multi-CAD adapter feature-name map (`CADSystemNeuralArchAdapterEngine` shipped today) to a graph edge type the NN-graph retrain stage can use as labeled training data.
4. **`U-KEC-NN-RETRAIN-WITH-CORPUS`** — re-run the NN-GRAPH-MS2/U2 retrain lifecycle with the expanded reference pool from #1-#3. Target: AUROC 0.096 → ≥0.78 (promotion gate).

Net effect: closes the "lima audit pending" backlog, scales the NN reference pool ~10×, and gives `cad_multi_system_produce_part` (today's facade) real per-input grounding it can hop through when it needs to pick a function for a feature.
