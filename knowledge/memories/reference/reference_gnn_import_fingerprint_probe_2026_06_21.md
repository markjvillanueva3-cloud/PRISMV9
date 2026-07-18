---
name: reference_gnn_import_fingerprint_probe_2026_06_21
description: "KILL VERDICT + STRATEGIC REDIRECT (slot:india, 2026-06-21, measure-only): the non-engine import-fingerprint GNN feature (built+wired default-OFF in U-GNN-IMPORT-FINGERPRINT-WIRE commit 2acc3984e8) was measured OFF-vs-ON in the deployed embed format over the FULL 3208-engine codebase-wired refpool. RESULT: OFF 23/43 separable @ meanMargin 0.0527 -> ON 22/43 @ 0.0532 = +0.0005 marginGain AND -1 separable class (18 improved / 24 worsened). FAR below the +0.010 kill-criterion and the +2-separable-class gate -> RULED OUT. PRISM_NNG_GHOST_IMPORT_FP stays default-OFF (wire kept as measured-and-parked). Root cause: after the adjacency-clean keyset filter (which correctly removed the ruled-out engine->engine 1-hop signal, 1024 engines -> 0), surviving non-engine import tokens are thin (~1/engine), so the feature adds noise-level signal. STRATEGIC REDIRECT (the bigger finding): TWO independent per-node features now both measured marginal on top of the deployed GHOST_SOURCE text signal -- action-surface +0.0018 (reference_gnn_action_surface_insitu_measure_2026_06_21) and import-fingerprint +0.0005. The GHOST_SOURCE nomic text embedding is at/near the per-node-FEATURE ceiling for dispatcher-class separability (23/43 @ 0.0527). The tier-5 coverage ceiling is NOT a node-feature problem. Stop hunting node features; the remaining real levers are: (1) GRAPH EDGES / message-passing (GraphSAGE structure, not node features); (2) a learned projection or a DIFFERENT embedding model (not nomic-embed-text); (3) ref-pool growth for RANKING/macro-F1 (needs domain-owner labeling, not india). A few structural-import domains DID gain (resourceextraction +0.0122, security +0.0074, machine +0.0066) -- import structure is distinctive THERE, but globally it is a wash."
type: reference
source: prism-memory
synced: 2026-06-27T20:30:46.591Z
aliases: reference_gnn_import_fingerprint_probe_2026_06_21
---


**CONTEXT:** slot:india /loop 2026-06-21. The R15 VALIDATE for U-GNN-IMPORT-FINGERPRINT-WIRE (commit 2acc3984e8) — does the non-engine import-fingerprint feature lift dispatcher-class separability enough to justify flipping it on / a retrain? Measure-only, non-destructive (no commit; the wire is already committed default-OFF).

**METHOD:** fresh OFF-vs-ON deployed-format separability over the FULL 3208-engine codebase-wired refpool — same `build-node-embeddings --ghosts-only --max-old-space-size=8192` code, differing ONLY in `PRISM_NNG_GHOST_IMPORT_FP`, to two temp out files (NEVER touched `.cwref-newemb.jsonl`). `classSeparability` (min-class 5) on each.

**RESULT (real numbers):**
| condition | separable | meanMargin |
|---|---|---|
| OFF (GHOST_SOURCE) | 23/43 | 0.0527 |
| ON (+ import-fp) | **22/43** | 0.0532 |

marginGain **+0.0005**, **newSeparable −1**, 18 classes improved / 24 worsened. **KILL** (< +0.010 gain AND loses a separable class). Per-class: a few structural-import domains gained (resourceextraction +0.0122, security +0.0074, machine +0.0066, resourceharvester +0.0057) — import structure IS distinctive there — but globally a wash.

**WHY it failed:** after the adjacency-clean keyset filter (arm-B P1 fix — removed the ruled-out engine→engine same-dir tokens, live 1024 engines → 0), surviving non-engine tokens are thin (~3744 tokens / 3847 engines ≈ 1/engine). Too sparse to separate classes after IDF + top-K.

**STRATEGIC REDIRECT (the real value of this negative result):** TWO independent per-node features have now both measured marginal on top of GHOST_SOURCE — action-surface (+0.0018) and import-fingerprint (+0.0005). The deployed nomic text embedding is **at/near the per-node-FEATURE ceiling** (23/43 @ 0.0527). The tier-5 coverage ceiling is NOT a node-feature problem. **STOP hunting per-node features.** Remaining real levers for leg #10:
1. **GRAPH EDGES / message-passing** — improve the GraphSAGE *structure* (more/better edges between engines + refs), not the node feature vector. This is where GraphSAGE's actual power is; the node feature is near-saturated.
2. **Learned projection / different embedding model** — nomic-embed-text may be the ceiling; a supervised projection head or a stronger embedding model could re-separate the entangled classes.
3. **Ref-pool growth for RANKING/macro-F1** — needs domain-owner labeling of the macro-F1 classes (data/edm/session/cad/5axis/safety), NOT india; it broadens ranking quality, not coverage (cap20 regressed coverage 27.4→5.5%).

**DO-NOT-RE-PROPOSE (updated):** + non-engine import fingerprint (+0.0005, this probe). Joins: engine→engine adjacency (72% null), action-surface (+0.0018), sharp-embed (gate-rejected), calibration (Brier dead-end), ref-pool cap20 (coverage regression).

**Status of the wire:** `PRISM_NNG_GHOST_IMPORT_FP` default-OFF, committed (2acc3984e8), leak-free + adjacency-clean + 25/25 tested. Parked (not flipped, no retrain) — same disposition as the action-surface wire.

**SIBLINGS:** [[reference_gnn_next_lever_import_fingerprint_2026_06_21]] · [[reference_gnn_action_surface_insitu_measure_2026_06_21]] · [[reference_gnn_structural_feature_probe_2026_06_21]] · [[reference_gnn_refpool_cap20_reverify_2026_06_21]] · [[feedback_multiseed_before_auroc_claim]].
