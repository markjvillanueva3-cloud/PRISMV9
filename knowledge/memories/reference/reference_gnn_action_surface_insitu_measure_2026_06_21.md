---
name: reference_gnn_action_surface_insitu_measure_2026_06_21
description: "GO/NO-GO VERDICT (slot:india, 2026-06-21, measurement-only no-commit): the in-DEPLOYED-FORMAT separability re-measure of the action-surface GNN feature (the R15 VALIDATE for U-GNN-ACTION-SURFACE-WIRE 0672129dd1). Re-embedded the FULL codebase-wired refpool (3208 engines / 43 dispatcher classes / min-class 5) BOTH OFF and ON fresh via build-node-embeddings --ghosts-only (isolating only the PRISM_NNG_GHOST_ACTION_SURFACE flag; never clobbered .cwref-newemb.jsonl). RESULT: OFF (source-signal only) 23/43 separable meanMargin 0.0527 -> ON (+action-surface) 23/43 separable meanMargin 0.0545 = +0.0018 margin, ZERO new separable classes (34/43 classes nudge up, 9 down, all deltas ~+0.004 max). VERDICT: on top of the already-rich GHOST_SOURCE signal (docblock+class+methods), action-surface is LARGELY REDUNDANT -- a noise-level +0.0018 increment, NOT the 6/18-vs-5/18 lift the isolated name-vs-surface measure suggested (that compared surface ALONE vs name ALONE; in the deployed concatenation the source signal already carries the domain vocab). DECISION: KEEP PRISM_NNG_GHOST_ACTION_SURFACE default-OFF; do NOT flip the deployed default, do NOT GPU-retrain on this feature. SURPRISE CORRECTION: the deployed GHOST_SOURCE path already reaches 23/43 @ 0.0527 -- WELL ABOVE the description-only '1/7 @ 0.0263' baseline cited in the spec/handoff; source-signal enrichment (already shipped) was the BIG separability lever, not action-surface. The real full-coverage lever remains reference-pool growth + a genuinely DIFFERENT sharper feature (AST call-graph / structural), NOT another text feature redundant with the source signal."
type: reference
source: prism-memory
synced: 2026-06-27T20:30:46.588Z
aliases: reference_gnn_action_surface_insitu_measure_2026_06_21
---


**CONTEXT:** slot:india autonomous /loop 2026-06-21. The R15 VALIDATE step for U-GNN-ACTION-SURFACE-WIRE ([[reference_gnn_action_surface_wire_2026_06_21]], commit 0672129dd1): does the action-surface feature actually improve dispatcher-class separability IN THE DEPLOYED EMBED FORMAT (on top of the existing source signal), enough to flip the flag on / justify a retrain?

**METHOD (non-destructive, R12):** re-embedded the FULL codebase-wired refpool (3208 single-dispatcher engines, the labeled set) BOTH OFF and ON FRESH — same `build-node-embeddings --ghosts-only --max-old-space-size=8192` code, differing ONLY in `PRISM_NNG_GHOST_ACTION_SURFACE`, to two temp out files (NEVER touched the canonical `.cwref-newemb.jsonl`). Then `classSeparability` (from analyze-ghost-embed-separability) on each, grouped by `extractWiredEngines` ground-truth labels, min-class 5. Embedding fresh on BOTH sides isolates the action-surface delta cleanly (avoids conflating it with a possibly-different-scheme baseline cache).

**RESULT (real numbers):**
| condition | separable | meanMargin | min | max |
|---|---|---|---|---|
| OFF (GHOST_SOURCE source-signal only) | 23/43 | 0.0527 | 0.0113 | 0.1176 |
| ON (+ action-surface) | 23/43 | **0.0545** | 0.0123 | 0.1218 |

Delta: **+0.0018 meanMargin, 0 new separable classes.** 34/43 classes improved, 9 worsened, every delta ~+0.0036..+0.0042 at the top (weldingjoining/validation/l2engine/feasibility/formingcasting/operatingsystem/security...). A uniform, noise-level nudge.

**VERDICT (R12 — honest, no softening):**
1. **Action-surface is largely REDUNDANT with the source signal in the deployed format.** The isolated name-vs-surface measure ([[reference_action_surface_separability_measure_2026_06_21]]: 6/18 vs 5/18) compared each feature ALONE; but the deployed embed text is `[kind | label | info | engineSourceSignal]`, and `engineSourceSignal` (docblock + class + public methods) ALREADY carries the domain vocabulary that separates classes. Appending action names on top adds only +0.0018.
2. **KEEP the flag default-OFF.** A +0.0018 margin with zero new separable classes does NOT justify flipping the deployed default, and the india soul forbids a GPU-retrain on a feature this marginal. The wire (default-OFF, leak-free) stays as a measured-and-parked option.
3. **CORRECTION of the baseline framing:** the deployed GHOST_SOURCE path already reaches **23/43 separable @ 0.0527** — far above the description-only "1/7 @ 0.0263" the spec/handoff kept citing as "the baseline." The source-signal enrichment (GHOST_SOURCE, already shipped) was the BIG separability lever; the "1/7" number is the DESCRIPTION-only embedding, not the deployed source-signal one. Future leg-#10 work should baseline against 23/43 @ 0.0527, not 1/7 @ 0.0263.

**NEXT (the real lever, per this evidence):** full-coverage GNN lift is NOT another TEXT feature redundant with the source signal. It is (a) reference-pool growth (more high-confidence labeled refs) and/or (b) a genuinely DIFFERENT dense feature with INDEPENDENT signal — e.g. the AST/import call-graph structure (who-calls-whom), which the text embeddings cannot see. Measure any such candidate the same way (fresh OFF-vs-ON deployed-format separability) BEFORE any GPU/H2GCN retrain (multi-seed gate, [[feedback_multiseed_before_auroc_claim]]).

**SIBLINGS:** [[reference_gnn_action_surface_wire_2026_06_21]] · [[reference_engine_action_surface_2026_06_21]] · [[reference_action_surface_separability_measure_2026_06_21]] · [[reference_gnn_embed_separability_diagnostic_2026_06_21]] · [[feedback_multiseed_before_auroc_claim]].
