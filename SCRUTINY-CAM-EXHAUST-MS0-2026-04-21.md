# SCRUTINY — CAM-EXHAUST-MS0 (CAM-Addon Roadmap)
## "Every input command across Mastercam, hyperMILL, Fusion 360, Inventor HSM, SolidCAM"
## Date: 2026-04-21 | Reviewer: Claude (Opus 4.7, 1M) | HEAD: `5a2f67925`

**Source of truth:** `mcp-server/data/milestones/CAM-EXHAUST-MS0.json` (245 units across 8 phases, claimed `completed_units: 8`).

---

## PHASE STATUS (ROADMAP vs REPO)

| Phase | Title | Planned | JSON-complete | Actually shipped |
|---|---|---|---|---|
| 1 | Tier-1 CAM function mapping (hyperMILL / Mastercam / Fusion360 / Inventor HSM) | 52 | 0 | **partial** — 8 catalog JSONs captured (see F1) but no U-CAM status flipped |
| 2 | Tier-2 (SolidCAM / NX / PowerMill / CATIA) | 32 | 0 | **0** — no SolidCAM catalog, no NX/PowerMill/CATIA files |
| 3 | Tier-3 (10 secondary CAMs) | 30 | 0 | tips only (`*-cam-tips.ts`), no function catalogs |
| 4 | PDF/video extraction (1,009 PDFs, 3,000 tips) | 30 | 0 | partial — 4 PDFs downloaded, corpus not extracted |
| 5 | Engine generation (Router/Validator/Strategy/Optimizer/Translator/AGI/Tribal/Feature) | 16 | 0 | **0** — zero consumer engines exist |
| 6 | Integration tests / validation | 8 | 0 | 0 |
| 7 | Intelligent Vericut-style plugins | 28 | 8 | 8 (per JSON) + recent U-CAM96/104/105 + U-CAMTEST01/02 not reflected in status |
| 8 | AI/ML + CAMLoRA + Ollama + AGI orchestration | 32 | 0 | 0 |
| **Σ** | | **228** (roadmap totals 245 — 17-unit gap) | **8** | ~10-12 |

Phase total mismatch — `total_units: 245` but summed phase `units: 228`. **17 units unaccounted**.

---

## F1 — Catalog capture happened overnight but NOT tracked in roadmap status  [HIGH]

**Evidence (files created 2026-04-20 22:46 → 00:19):**

```
mcp-server/data/cam-functions/hypermill/
  2d-operations.json              (769 lines)
  3d-operations.json              (767 lines)
  5axis-maxx-millturn-catalog.json (1,433 lines)
  HYPERMILL_2D_3D_COMPLETE.json   (528 params, 22 ops, 47 formulas, 86 tips)

mcp-server/data/cam-functions/mastercam/
  MASTERCAM_X8_2D_3D_HS_CATALOG.json   (923 params)
  MASTERCAM_X8_ADVANCED_MODULES_AUDIT.json  (no total_parameters field — structurally different)

mcp-server/data/cam-ui/fusion360/FUSION360_CAM_UI_COMPLETE.json  (387 UI elements, 9 regions)
mcp-server/data/cam-ui/inventor-hsm/INVENTOR_HSM_UI_COMPLETE.json (2,716 nodes)
```

**vs. JSON claim (`agent_research_summary`):**

| System | Claimed params | Observed in catalog |
|---|---|---|
| hyperMILL | 1,323 | 528 (HYPERMILL_2D_3D) — 3 feeder JSONs may add more |
| Mastercam X8 | 1,689 | 923 (main catalog) + undeclared in advanced-modules-audit |
| Fusion 360 | 1,459 | 387 (UI elements) — params likely elsewhere |
| Inventor HSM | 1,247 | node-count 2,716 but no `total_parameters` field |
| SolidCAM | — (not in summary) | **0 — no catalog exists** |

**Problems:**
1. None of the units U-CAM02…U-CAM32 have been flipped to `complete` despite clear overnight work → roadmap JSON drifts from reality.
2. Counts in the `agent_research_summary` (generated 2026-04-19) don't match the files captured (2026-04-20/21). Either the summary is aspirational or the captures are incomplete. There's no ground-truth rule stating "this catalog is done when N params ≥ claimed N."
3. File structure inconsistent across CAMs: Mastercam uses `total_parameters`, hyperMILL uses `total_operations + total_parameters + tribal_tips_count`, Fusion uses `totalElements`, Inventor uses nested nodes. **No unifying schema enforced.**

**Fix:** Every overnight catalog capture must (a) set the matching U-CAM status + a checksum of param count, (b) validate against `CAMFunctionIndexSchema` (see F3), (c) reject merge if param count < 80% of `agent_research_summary` claim or re-baseline the claim.

---

## F2 — SolidCAM is MISSING from the priority-5, despite being called out  [HIGH]

User's stated priority set: **Mastercam, hyperMILL, Fusion 360, Inventor, SolidCAM**.

Repo reality:
- No `mcp-server/data/cam-functions/solidcam/` directory
- No `mcp-server/data/cam-ui/solidcam/` directory
- Only `src/data/solidcam-cam-tips.ts` (tips only — no function/parameter/action catalog)
- Roadmap puts SolidCAM in **Phase-2 (Tier-2)** at U-CAM33-U-CAM38 with dependencies on `U-CAM32 complete` (Inventor HSM done) — it will not start until Phase-1 is finished
- Not in `agent_research_summary.coverage_by_system` — zero documented parameters

**Implication:** If SolidCAM is truly in the priority-5, the tier assignment is wrong. It should be **Phase-1** (Tier-1) with U-CAMxx allocation between the existing Inventor slots and NX. Current structure guarantees SolidCAM gets worked last among the priority-5.

**Fix:** Promote SolidCAM to Phase-1. Add U-CAM33a…33f or renumber. Run a 10-agent research summary pass for SolidCAM to get a parameter claim + sources. Priority alignment, not just a later phase.

---

## F3 — `CAMFunctionIndexSchema` defined, consumed by nothing  [HIGH]

```
Grep for validateCAMFunctionIndex / CAMFunctionIndex import across src:
  → 2 hits: camFunctionIndexSchema.ts (self), camFunctionIndexSchema.test.ts (self-test)
```

The 570-line schema in `src/schemas/camFunctionIndexSchema.ts` + 454-line `camUIElementSchema.ts` are orphans. None of the 8 captured catalog JSONs are validated against them on load, and no engine imports the types.

**Impact:** The schema is specification-only. The captured catalogs are free-form. When Phase-5 (CAMFunctionRouterEngine / CAMParameterValidatorEngine / …) ships, either the schemas need rewriting to match what actually got captured, or the captures all need re-formatting. Either way it's a pre-paid cost sitting in the backlog invisibly.

**Fix:** Insert a **Phase-0.5 gate** (3 units) before Phase-1 work expands any further:
- `U-CAM-SCHEMA-BIND`: wire `validateCAMFunctionIndex()` into a `CAMCatalogLoaderEngine` that reads every file under `data/cam-functions/**/*.json`, validates, and throws on drift.
- `U-CAM-SCHEMA-MIGRATE`: migrate the 8 existing captures to the schema, OR relax the schema to a superset of observed shapes.
- `U-CAM-SCHEMA-TEST`: property-based test that `CAMFunctionIndex` round-trips through JSON parse + schema-parse for every live catalog.

Without this, Phase-5 engines cannot reliably consume Phase-1 output.

---

## F4 — Empty scaffolding directories, naming drift  [MEDIUM]

```
mcp-server/data/cam-functions/fusion/          ← EMPTY
mcp-server/data/cam-functions/fusion360/       ← EMPTY
mcp-server/data/cam-functions/inventorcam/     ← EMPTY
mcp-server/data/cam-functions/hypermill/       ← 4 JSONs
mcp-server/data/cam-functions/mastercam/       ← 2 JSONs
mcp-server/data/cam-ui/fusion360/              ← 1 JSON
mcp-server/data/cam-ui/inventor-hsm/           ← 1 JSON
mcp-server/data/cam-ui/hypermill/              ← (exists, not inspected)
mcp-server/data/cam-ui/mastercam/              ← (exists, not inspected)
```

Issues:
- `fusion` and `fusion360` are both empty under `cam-functions/` — which name is canonical?
- `cam-functions/inventorcam/` is empty but UI is under `cam-ui/inventor-hsm/` — **different ID** (InventorCAM vs Inventor HSM; these are separate products in real life! InventorCAM is the SolidCAM partner-plugin, HSM is Autodesk's free CAM. This is a category error.)
- Fusion 360's catalog went to `cam-ui/` not `cam-functions/` — the split is inconsistent.

**Fix:** Establish a canonical slug set `{mastercam, hypermill, fusion360, inventor-hsm, solidcam, nx, powermill, catia, ...}` in a single registry (e.g. `src/registries/CAMSystemRegistry.ts`). Every directory under `cam-functions/` and `cam-ui/` must match. Remove empty dirs; reconcile `inventorcam` vs `inventor-hsm` as **two distinct systems**, not aliases.

---

## F5 — Phase-5 engine surface is 8 engines deep, none scaffolded  [HIGH]

Phase-5 plans these engines (U-CAM71-U-CAM79):
1. CAMFunctionRouterEngine
2. CAMParameterValidatorEngine
3. CAMStrategyRecommenderEngine
4. CAMParameterOptimizerEngine
5. CAMCrossSystemTranslatorEngine
6. CAMAGIReasoningEngine
7. CAMTribalKnowledgeEngine
8. CAMFeatureLearningEngine
+ dispatcher wiring (U-CAM79)

**Grep for any of these in `src/engines/*.ts`: zero matches.**

The project has ~2,705 engines built (per `PRISM-INVENTORY-LATEST.md`) — yet the central consumer surface of the 5,718-parameter CAM corpus doesn't exist. The captured catalogs are currently dead data.

**Fix:** A catalog without a consumer is not value delivered. Either:
- (a) scaffold the 8 engines now as stubs with schema-bound input/output, returning placeholder decisions. This turns every Phase-1 addition into a live signal (router resolution rate, validator pass rate). OR
- (b) explicitly de-scope Phase-5 until Phase-1 reaches ≥80% coverage, and document in the roadmap that catalogs are "knowledge graph only, no runtime control" until then.

Current state is implicitly (a) without the scaffolding — which is how "completed_units: 8" gets frozen while work continues.

---

## F6 — `completed_units` counter out of sync with git history  [LOW]

JSON says 8 complete. git log shows at least these post-baseline:

```
6b3f65d09 CAM-EXHAUST-MS0/U-CAM105: Plugin Documentation — User Guides
b9b5213ef CAM-EXHAUST-MS0/U-CAM104: Plugin Test Suite — Integration Tests
963f8fedf CAM-EXHAUST-MS0/U-CAMTEST02: Fusion 360 JS Add-In In-Host Test Runner Skeleton
d8d34040e CAM-EXHAUST-MS0/U-CAMTEST01-FOLLOWUP: ship hyperMILL Python runner skeleton
16da6deeb CAM-EXHAUST-MS0/U-CAMTEST01: hyperMILL Python In-Host Test Runner Skeleton
43ea812c5 CAM-EXHAUST-MS0/U-CAM-REAL-AUDIT: real-corpus integration tests + ESM fix
```

That's at least 6 shipped units not in the JSON. Also: `U-CAMTEST01/02` and `U-CAM-REAL-AUDIT` aren't even in the 245-unit list — they're off-plan additions. No harm, but they should be retro-inserted as Phase-7 sub-units so the count is honest.

**Fix:** Single source-of-truth for unit status. Every `CAM-EXHAUST-MS0/U-CAMxx:` commit should trigger a `completed_units++` via a post-commit hook OR the roadmap JSON becomes advisory-only and status derives from `git log --grep="CAM-EXHAUST-MS0/"`.

---

## F7 — PDF corpus pending, blocking Phase-4 → Phase-5 gate  [MEDIUM]

`PHASE-4.downloaded_resources` lists 4 PDFs (~20MB / 290 pages total):
- Fusion360-CAM-Programming-Guide.pdf
- InventorHSM-Getting-Started.pdf
- Mastercam-Basic-3D-Machining.pdf
- Mastercam-Basics-Tutorial.pdf

vs. claimed 1,009 PDFs in `PDF_RESOURCE_MANIFEST.json` targeting 3,000 tips. 0.4% download completion. Phase-5 engines nominally depend on Phase-4 (tribal corpus).

**Fix:** Phase-4 is cheap to parallelize — kick off `/pdf-learn` as 10 concurrent agents on the manifest's top-100 PDFs overnight. Gating Phase-5 on complete Phase-4 is wasteful; instead, Phase-5 engines should degrade gracefully when the corpus is partial (return lower-confidence recommendations rather than erroring).

---

## PRIORITIZED RECOMMENDATIONS

1. **F3 Schema bind + F4 naming fix** (1 session) — precondition for all Phase-1 work. Makes every subsequent catalog capture reject-on-drift, eliminates `fusion` vs `fusion360` ambiguity, separates InventorCAM from Inventor HSM as distinct systems. Without this, every added catalog accumulates structural debt.

2. **F2 SolidCAM promotion to Phase-1** (30-min roadmap edit + 1 agent-research pass) — current ordering contradicts the stated priority-5. Blocking condition on `U-CAM32 complete` must be dropped; SolidCAM gets its own parameter claim.

3. **F5 Scaffold Phase-5 engines as stubs** (1 session) — turns catalog captures into live telemetry. Router resolution rate becomes a measurable per-CAM completion signal rather than "`not_started` forever until all 52 Phase-1 units flip."

4. **F1 + F6 Status consolidation** (~1 hour) — post-commit hook updates `completed_units` from commit SIDs; CI fails if a `U-CAMxx` commit doesn't find the unit in the JSON (catches off-plan additions like U-CAMTEST01/02).

5. **F7 Parallel PDF extraction** (overnight, async) — unblocks Phase-4 without waiting on the Phase-1 sequencer.

---

## WHAT I DID *NOT* RE-REVIEW

- `docs/cam-plugins/{architecture,mastercam,hypermill,fusion360,inventor-hsm,...}.md` — user-facing docs, not roadmap.
- Per-catalog parameter correctness (would need a domain specialist + vendor manual to verify e.g. "Fusion 360 Adaptive Clearing has 47 params" vs Autodesk's real count).
- Plugin adapter protocol choices (XML-RPC / JSON-RPC / COM / NET-Hook) — those live in U-CAM86-89 and are already marked `complete`. Trust but verify in a later pass.
- AI/ML Phase-8 (CAMLoRA / Ollama / AGI orchestration) — dependent on Phases 1-7, not actionable yet.

**Bottom line:** The catalog-capture work the user did last night is real and substantial (roughly 4,600 JSON lines of CAM function data), but it's landing into (a) an orphan schema, (b) inconsistent directories, (c) a status tracker that doesn't know it happened, and (d) zero consuming engines. Five fixes above unblock the "absolute full control" objective without changing the unit count.
