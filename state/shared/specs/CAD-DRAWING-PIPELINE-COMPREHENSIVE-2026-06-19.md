<!--
  COMPREHENSIVE CAD-DRAWING PIPELINE — design spec + dependency-ordered build plan.
  Authored: slot:delta (CAD), 2026-06-19, in response to operator /goal work order.
  Grounded by a 4-agent cite-backed assessment of the live repo (H:/prism + H:/prism-slot-delta).
  Maintainer: slot delta. Status: DESIGN APPROVED-FOR-BUILD; build in progress (U-CADDRAW-FEATURE-LEDGER first).
-->

# Comprehensive CAD-Drawing Pipeline — print → validated CAD (Ollama-draws / Claude-failsafe)

## 0. Operator vision (verbatim intent)

> Assess our CAD drawing capabilities in Fusion. We ran a test yesterday on a print but **missed several features**. Build a **more comprehensive pipeline** that:
> 1. feeds **tribal knowledge + wikis + memories DURING drawing**;
> 2. authors **2D sketches → 3D features** as the **first line of defense** for checking work against the print;
> 3. **final validation** = regenerate a print of the drawn model and compare it **dimension-by-dimension, same layout** as the original → prove the CAD is **100% correct** (planning ahead for **secondary ops** — leave material for grind/hone, spark gap, etc.);
> 4. **final build** = local LLMs (Ollama) draw via the PRISM AI system (cheap/free); **Claude is the failsafe / last line of defense**.

## 1. Root-cause of "we missed several features" (ground truth, not assumed)

The yesterday-test was a **stepped-bore / bushing print** read by the **Ollama VLM ensemble** (`scripts/blueprint-ocr-training-loop.mjs` via `scripts/lib/ollama-vision-extract-lib.mjs`). It missed (a) the **far-side smaller bore diameter** and (b) the **internal lead-in transition chamfer**. **Root cause:** the extraction *prompt* never told the model a bore can have multiple diameters along its axis, nor to capture internal transition chamfers — the schema supported both. Fixed in commit `84a78522f8` (+3 prompt rules, +1 regression test, 65/65).

**Generalized lesson (the keystone):** features drop silently at *every* stage (extract, sketch, model, validate) because **nothing enumerates the print's full feature set and reconciles every downstream artifact against it**. The pipeline's backbone must be a **Feature Completeness Ledger** that fails loud on any feature present in the print but absent downstream. The fix in `84a78522f8` patched ONE prompt; the ledger structurally prevents the whole class.

## 2. Executive pipeline diagram

```
PRINT (PDF/image)
  │
  ▼  S0  EXHAUSTIVE EXTRACTION ............... [BUILT] PDFBlueprintDimensionExtractorEngine + VLM ensemble (84a78522f8 multi-dia/chamfer fix)
  │       └─ dims, GD&T, datums, feature list
  ▼  S0.5 FEATURE COMPLETENESS LEDGER ........ [NET-NEW ⭐ U-CADDRAW-FEATURE-LEDGER]  ← keystone; every stage reconciles to this
  │       └─ canonical enumerated {id,type,nominal,tol±,datum,view,status} ; stepped bore → N entries, not 1
  ▼  S1  SKETCH-FIRST AUTHORING .............. [PARTIAL] Fusion bridge createSketch (geometry-only, no constraints) + [NET-NEW] dim-capture+diff gate
  │       └─ per-view 2D sketch; capture sketch dims; DIFF vs ledger BEFORE 3D → per-sketch PASS/FAIL  (FIRST LINE OF DEFENSE)
  ▼  S2  TRIBAL/WIKI/MEMORY FEED (per feature) [NET-NEW] CADTribalDrawInjection (clone of CAMTribalKnowledgeInjectionEngine)
  │       └─ retrieve+APPLY: spark-gap, archetype-match-before-scale, no-periodic-Bspline, inch-units, topology-before-tolerance
  ▼  S3  3D FEATURE BUILD (sketch→feature) ... [PARTIAL] Fusion360LiveBridgeEngine extrude/revolve/loft/sweep (:18360, unproven live)
  │       └─ each built feature checks off its ledger entry (status: modeled)
  ▼  S4  SECONDARY-OP FINISH-STOCK ........... [NET-NEW] CADStockAllowance (geometry offset, datum-aware) ; spark-gap from constants.ts:643-668
  │       └─ bake grind/hone/spark-gap stock into geometry; record per-surface allowance for S5 reconcile
  ▼  S5  PRINT REGEN + DIM-BY-DIM VALIDATE ... [NET-NEW ⭐ all 5 sub-steps]  (FINAL GATE)
  │       └─ model→orthographic views (same layout) → extract regen dims → pair to ledger by feature/datum → per-callout PASS/FAIL (stock-reconciled)
  ▼  S6  GEOMETRY-FIDELITY CROSS-CHECK ....... [BUILT] CADGeometryComparisonEngine Hausdorff/Chamfer/volume(bbox)/Jaccard, unit-aware
  │
  ▼  VALIDATED CAD (STEP) + per-dimension proof table + ledger 100% reconciled

ROUTING OVERLAY (every stage): Ollama attempts → per-stage eval gate → escalate to Claude on fail/low-confidence
  [NET-NEW] add `cad_drawing` task class to AISystemRouterEngine (today CAD falls to "unknown", no fallback chain)
```

## 3. Stage contracts (input → output · asset · eval gate)

| Stage | Input | Output | Asset (cite) | Eval gate |
|---|---|---|---|---|
| S0 | print PDF/img | `DimensionExtractionResult` (dims, GD&T, threads, finish) | **BUILT** `PDFBlueprintDimensionExtractorEngine.ts:21-66`; VLM `ollama-vision-extract-lib.mjs` (fix 84a78522f8) | per-field OCR conf ≥0.70 → operator-confirm |
| S0.5 | S0 output | canonical Feature Ledger (enumerated, schema-versioned, part-keyed) | **NET-NEW** `CADFeatureCompletenessLedgerEngine` | every print feature has a ledger entry; multi-dia bore = N entries |
| S1 | ledger + print views | per-view constrained sketch + dim-diff report | **PARTIAL** `Fusion360LiveBridgeEngine.createSketch():490` (no constraints) + **NET-NEW** sketch-dim-capture+diff | sketch dim within tol of ledger nominal → PASS, else block 3D |
| S2 | current feature + corpus | applied drawing rule(s) | **NET-NEW** CAD per-feature RAG (model on `CAMTribalKnowledgeInjectionEngine` @ `camDispatcher.ts:16162`); corpus `cad-tribal-delta.jsonl` (6 tips) | retrieved rule APPLIED (e.g. geometry reflects spark-gap), not just surfaced |
| S3 | passing sketches | 3D solid (STEP) | **PARTIAL** `Fusion360LiveBridgeEngine` extrude:506/revolve:557/loft:680/sweep:641 | feature built → ledger entry status=modeled |
| S4 | solid + finish plan | stock-thickened solid + allowance map | **NET-NEW** `CADStockAllowanceEngine`; spark-gap `constants.ts:643-668` | per-surface allowance recorded; validated nominal = finish+stock |
| S5 | stock solid + ledger | per-dimension PASS/FAIL table | **NET-NEW** model→drawing + view-match + dim-extract + pair + verdict | every ledger dim paired & within tol (stock-reconciled) |
| S6 | solid + reference STEP | Hausdorff/Chamfer/volume report | **BUILT** `CADGeometryComparisonEngine.ts` (cb1ec539a3) | Hausdorff/mean within fidelity band |

## 4. The 5 operator requirements → stage mapping + status

| # | Operator requirement | Satisfied by | Status |
|---|---|---|---|
| R1 | sketch-first as first line of defense | S1 (sketch dim-diff vs ledger before 3D) | PARTIAL (bridge exists, no constraints/dim-gate) → **NET-NEW gate** |
| R2 | tribal/wiki/memory feed **during** drawing | S2 (per-feature RAG + apply) | **NET-NEW** (CAM has it, CAD does not) |
| R3 | print-regen same-layout dim-by-dim → 100% | S5 (model→drawing→extract→pair→verdict) | **NET-NEW** (all 5 sub-steps; biggest build) |
| R4 | plan secondary ops (grind/hone/spark-gap stock) | S4 (geometry stock offset) | **NET-NEW** (stock is CAM-param only today) |
| R5 | Ollama draws via PRISM AI, Claude failsafe | routing overlay (cad_drawing task class + per-stage eval) | **NET-NEW** (router has no CAD class) |
| — | enumerate features so none are missed | S0.5 ledger (threads R1/R3) | **NET-NEW keystone** (root-cause fix) |

## 5. Build units — dependency-ordered (R15: WIRE→TEST→VALIDATE→APPLY)

> All buildable on trunk WITHOUT the operator-gated `U-MERGE-SLOT-DELTA` (410-commit merge), except where noted. Each ships engine + dispatcher wiring + real tests (happy + ≥3 failure + ≥2 adversarial, round-tripped through the dispatcher) + live-data validation in the same unit.

1. **⭐ U-CADDRAW-FEATURE-LEDGER** — `CADFeatureCompletenessLedgerEngine`. galaxy: `mcp-server/src/engines/` (cad). Wire: `cadDispatcher` actions `cad_feature_ledger_build` / `_reconcile` / `_status` (+ z.enum + schema + lazy import). Auto-invoke: advisory Stop/`cad_regen` post-hook that reconciles a drawn model vs its ledger (fires after a draw session). Scope: DOMAIN (cad) now; ledger pattern is FLEET-generalizable later. **#1 NEXT (see §6).**
2. **U-CADDRAW-SKETCH-DIM-GATE** — sketch-dimension capture + diff-vs-ledger (S1 first line of defense). Consumes ledger. Wire: `cadDispatcher:cad_sketch_dim_verify`. Depends on #1.
3. **U-CADDRAW-TRIBAL-INJECT** — `CADTribalDrawInjectionEngine` (clone `CAMTribalKnowledgeInjectionEngine`); seed real "how to draw X" corpus into `cad-tribal-delta.jsonl`. Wire: injected in the draw loop + `cad_tribal_draw_query`. APPLY-TO-ALL: the inject pattern already serves CAM; clone (don't fork) to CAD.
4. **U-CADDRAW-STOCK-OFFSET** — `CADStockAllowanceEngine` (datum-aware geometry offset; spark-gap from `constants.ts`). Wire: `cadDispatcher:cad_apply_stock_allowance`. Feeds S5 nominal reconcile.
5. **U-CADDRAW-ROUTE-CLASS** — add `cad_drawing` task class + Ollama-first/Claude-fallback chain to `AISystemRouterEngine`; per-stage confidence eval. Wire: consumed by every stage's attempt-then-escalate.
6. **⭐ U-CADDRAW-PRINT-REGEN-VALIDATE** (multi-unit) — S5 final gate: (6a) model→orthographic-view projection; (6b) same-layout view matching; (6c) dimension extraction from regen drawing; (6d) feature/datum dim pairing vs ledger; (6e) per-callout PASS/FAIL table + stock reconcile. Largest build; depends on #1 (ledger) + #4 (stock). Reuses `CrossSourceDimensionReconciliationEngine` for pairing logic.
7. **U-CADDRAW-STEPPED-BORE-FEATURE** — extend `CADFeatureRecognitionEngine` FeatureType with `counterbore`/`stepped_bore`/`transition_chamfer` (the exact yesterday-miss classes). Small; hardens S0.5 + S3.

## 6. The #1 next build unit — U-CADDRAW-FEATURE-LEDGER

**Why first (dependency-first + highest-ROI):** it is the keystone the operator's failure exposed — the structural fix for "we missed several features." It is the data contract S1 (sketch-diff) and S5 (final dim-pair) both reconcile against, so building it first unblocks the two requirements the operator emphasized most. It is buildable NOW from the already-BUILT `PDFBlueprintDimensionExtractorEngine` output (no merge, no Fusion live, no GPU), is small-to-medium, and is fully testable with real reference values (the recorded stepped-bore case: 2 diameters + 1 transition chamfer = **3** ledger entries; a 1-feature model must reconcile to **2 MISSING**). It also supplies the **persistent part-keyed ground-truth registry** the assessment found missing (`CrossSourceDimensionReconciliationEngine` is stateless).

**Engine contract:**
- `build(extraction, partNo) → Ledger` — canonical enumerated entries `{id, featureType, nominal, tolPlus, tolMinus, datumRef, view, sourceConfidence, status:'extracted'}`; stepped/multi-diameter bores enumerate one entry per diameter + one per internal transition chamfer (the yesterday-miss class).
- `reconcile(ledger, modelFeatures) → {missing[], extra[], mismatched[], complete:boolean}` — fail-loud: any ledger entry absent from the model = MISSING; out-of-tol = MISMATCHED.
- `advance(ledger, featureId, status)` — status transitions extracted→sketched→modeled→validated as stages check off.
- persist as schema-versioned JSON keyed by part number.

**R15 plan:** wire to `cadDispatcher` (3 actions + schema + z.enum + lazy import); tests = happy (stepped-bore 3-entry) + ≥3 failure (empty extraction, malformed dim, duplicate ids) + ≥2 adversarial (NaN nominal, Infinity tol, oversize count), all round-tripped through the dispatcher; validate against real `PDFBlueprintDimensionExtractorEngine` output and prove reconcile catches a deliberately-incomplete model. APPLY: DOMAIN-only (cad) for now; note the ledger/reconcile pattern as a FLEET candidate (quoting/CAM feature-completeness) for a later clone.
