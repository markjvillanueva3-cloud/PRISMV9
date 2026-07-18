---
name: reference_action_surface_separability_measure_2026_06_21
description: "MEASURE-FIRST VERDICT (slot:india, commit df4a0ba279, 2026-06-21): does the engine ACTION-SURFACE feature (U-ENGINE-ACTION-SURFACE) separate engines by dispatcher class better than the name/description text? scripts/measure-action-surface-separability.mjs embeds each labeled engine's humanized NAME vs its ACTION-SURFACE text via the same nomic model + runs the SAME classSeparability metric on identical nodes/classes. RESULT (1822 engines, 18 classes, min-class 5, 0 embed failures): NAME 5/18 separable meanMargin 0.0377 -> ACTION-SURFACE 6/18 separable meanMargin 0.0432 (+1 class, +0.0055 margin). Gains concentrate in the right manufacturing domains: cad +0.0672 (0.056->0.123), cam +0.0318, data +0.0282, turning +0.0232, infra +0.023, session +0.0145 (8 classes improved). VERDICT (R12, no overclaim): action-surface is a REAL but MODEST additive feature -- justifies WIRING it into build-node-embeddings sourceSignal as ONE additive signal (helps cad/cam/turning), but does NOT alone clear the bar (6/18~=33%, meanMargin still <0.05 'entangled') and only 57% of engines have a surface. Full-coverage GNN lift still needs MULTIPLE sharper features + H2GCN/GPU retrain -- do NOT spend the GPU retrain on this feature ALONE."
type: reference
source: prism-memory
synced: 2026-06-27T20:30:46.460Z
aliases: reference_action_surface_separability_measure_2026_06_21
---


**CONTEXT:** slot:india autonomous /loop 2026-06-21. After U-ENGINE-ACTION-SURFACE (fd49523511) built the action-surface feature CORE, india-soul demands measure-BEFORE-promote: prove the feature helps before any production mutation or GPU retrain. This is that measurement (commit df4a0ba279).

**HARNESS:** `scripts/measure-action-surface-separability.mjs` (non-destructive). Fair test: for each labeled single-dispatcher engine WITH a non-empty action surface, embed BOTH its humanized NAME and its ACTION-SURFACE text via `nomic-embed-text` (same model the deployed pipeline uses), group by dispatcher, run the SAME `classSeparability` metric (from analyze-ghost-embed-separability) on each -- isolating the feature effect on identical nodes/classes. Report: `state/shared/nn-graph/action-surface-separability-report.json`.

**RESULT (real numbers, 0 embed failures):**
| feature | separable | meanMargin |
|---|---|---|
| NAME (description proxy) | 5/18 | 0.0377 |
| ACTION-SURFACE | **6/18** | **0.0432** |
| (deployed DESCRIPTION ref) | 1/7 | 0.0263 |

Per-class margin gains (surface - name): **cad +0.0672** (0.0557->0.1229), **cam +0.0318**, **data +0.0282**, **turning +0.0232**, infra +0.023, session +0.0145, quoting +0.0107, shop +0.0106 -- 8 classes improved, concentrated in the distinctive-action-vocabulary manufacturing domains.

**VERDICT (R12 -- honest, no softening):** action-surface is a **REAL but MODEST** additive feature.
- It SHARPENS the key cad/cam/turning/data domains (the cad lift is substantial: 0.056->0.123).
- It does NOT alone clear the bar: 6/18 ~= 33% separable, meanMargin 0.0432 still < the 0.05 'usefully separable' threshold (mostly 'entangled').
- Only **57%** of labeled engines have an action surface (43% empty -> the feature is silent for them).
- **Decision:** wiring action-surface into `build-node-embeddings` `sourceSignal` as ONE additive feature is JUSTIFIED (cheap, helps the manufacturing domains), but the full-coverage GNN lift needs MULTIPLE sharper features + an H2GCN/GPU retrain -- do NOT spend a GPU retrain cycle on this single feature expecting it to clear the deploy gate (AUROC>=0.78/macroF1>=0.55/Brier<=0.15 multi-seed). Stack more features (e.g. wiki-section text, AST call-graph) THEN retrain.

This is exactly the go/no-go evidence the measure-first step exists to produce -- it prevents a wasted GPU retrain on an over-hyped single feature (the india-soul anti-pattern).

**NEXT:** (a) wire action-surface into sourceSignal as an additive feature (modest but real, cheap, leak-stripped per the GAP1 spec seam); (b) BEFORE the GPU retrain, identify + measure 1-2 MORE dense features to stack (the meanMargin needs to roughly double to clear 0.05 broadly). Spec: `state/shared/specs/GAP1-GNN-FEATURE-ENRICHMENT-SCOPE-2026-06-21.md`.

**SIBLINGS:** [[reference_engine_action_surface_2026_06_21]] · [[reference_gnn_embed_separability_diagnostic_2026_06_21]] · [[reference_gnn_structural_feature_probe_2026_06_21]] · [[feedback_multiseed_before_auroc_claim]].
