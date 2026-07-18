---
name: reference_gnn_next_lever_import_fingerprint_2026_06_21
description: "DESIGN VERDICT (slot:india, 2026-06-21, fan-out investigation, no-code): the NEXT GNN tier-5 coverage lever after the text/source feature was exhausted (deployed GHOST_SOURCE = 23/43 separable @ 0.0527; action-surface +0.0018 redundant). A read-only 4-lens survey (dedup / candidate-features / ref-pool / ruled-out) picked the NON-ENGINE IMPORT FINGERPRINT: the IDF-weighted set of each engine's non-engine module imports (utility libs / formula files / domain packages — everything EXCEPT ./engines/ paths), top-K as embeddable text. ~100% coverage (vs the 28% of the dead engine->engine adjacency), HIGH independence from the text signal, NOT yet probed, NOT on the do-not-re-propose list. IMPORTANT CORRECTION of my prior handoff: the 'AST/import call-graph (who-calls-whom)' I had queued IS the engine->engine 1-hop adjacency, ALREADY RULED OUT (72% null, reference_gnn_structural_feature_probe_2026_06_21) — do NOT rebuild that; the import FINGERPRINT (non-engine imports) is a DIFFERENT, high-coverage feature. BUILD TARGET: new pure lib scripts/lib/engine-import-fingerprint.mjs (sibling of engine-action-surface.mjs) + GHOST_IMPORT_FP flag in build-node-embeddings + fresh OFF-vs-ON deployed-format separability gate (PASS = +2 separable classes AND meanMargin>0.060; KILL = <+2 classes OR gain<0.010). Full spec: state/shared/specs/GNN-NEXT-LEVER-IMPORT-FINGERPRINT-2026-06-21.md. Ref-pool growth is NOT the lever (cap=20 regressed live coverage 27.4->5.5%, feature-limited). Cross-fleet labeling of macro-F1 classes (data/edm/session/cad/5axis/safety) needs DOMAIN-OWNER slots, not india."
type: reference
source: prism-memory
synced: 2026-06-27T20:30:46.591Z
aliases: reference_gnn_next_lever_import_fingerprint_2026_06_21
---


**CONTEXT:** slot:india /loop 2026-06-21. After the action-surface arc closed (measured redundant, parked default-OFF — [[reference_gnn_action_surface_insitu_measure_2026_06_21]]), this is the DESIGN of the next leg-#10 lever. Produced by a read-only fan-out investigation (1 Explore agent, sonnet, after the multi-agent Workflow hit the fanout cost-gate 3×). Non-destructive — no code shipped; output is the spec + this verdict.

**THE PICK: non-engine import fingerprint.** Per-engine set of NON-engine module imports (drop `./engines/` paths = the dead engine→engine signal), IDF-weighted (suppress universal `zod`/sdk imports, keep rare domain imports like `kinematic-chain-lib`/`gcode-formatter`/`material-property-lookup`), top-K joined as an embeddable token string appended to the ghost source signal.
- **Coverage ~100%** (every engine imports something) vs **28%** for the ruled-out engine→engine adjacency.
- **Independence HIGH** — import topology is structural, carries no description prose.
- Leak-free: imports are written independent of the dispatcher label; an unwired ghost has the same imports under any label.

**THE CORRECTION (why this memory matters):** my handoff queued "AST/import call-graph (who-calls-whom)" as the next lever. The investigation caught that this IS the engine→engine 1-hop adjacency **already probed and rejected** (72% of engines import zero other engines, avg out-degree 0.62 — [[reference_gnn_structural_feature_probe_2026_06_21]]). The import FINGERPRINT (non-engine imports) is a genuinely different feature with 100% coverage. Don't conflate them.

**BUILD (next india unit, fresh window):** new pure lib `scripts/lib/engine-import-fingerprint.mjs` (mirror the `engine-action-surface.mjs` contract: `extractNonEngineImports` / `buildImportFingerprintMap` / `buildImportIdfMap` / `importFingerprintText`) + a default-OFF `PRISM_NNG_GHOST_IMPORT_FP` flag wired into `build-node-embeddings.mjs` `sourceSignalById` (same seam as the action-surface wire). Reuse `buildIdfMap`/`walkEngineSources` (build-node-embeddings) + `engineReferencedInConsumer` parse pattern (audit-unwired-engines.mjs:155-217).

**VERIFICATION GATE (R15, before any GPU retrain):** fresh OFF-vs-ON deployed-format separability over the 3208-engine codebase-wired refpool, to SEPARATE `--out` files (NEVER clobber `.cwref-newemb.jsonl`/`ghost-node-embeddings.jsonl`); compare vs **23/43 @ 0.0527**. PASS = ≥+2 new separable classes AND meanMargin>0.060 AND a low-margin class gains>0.015. KILL = <+2 classes OR meanMargin gain <0.010 (the action-surface noise floor) → ruled out, no retrain, document the numbers.

**RULED OUT / NOT the lever (do not re-propose):** engine→engine 1-hop adjacency (72% null); action-surface text (+0.0018 redundant); sharp-embed IDF (rejected at gate, AUROC 0.745→0.703); calibration (Brier dead-end); ref-pool cap=20 growth (ranking lever, coverage 27.4→5.5% regression); diagonal-Fisher reweight (+0.005, no-deploy). Ref-pool growth is feature-limited; macro-F1-lever class labeling needs domain-owner slots, not india.

**R12 risk / kill:** the redundancy trap (if the docblock already names the imported lib, nomic sees correlated tokens — same trap that killed action-surface). The OFF-vs-ON gate measures it directly; kill at +0.0018-class.

**FULL SPEC:** `state/shared/specs/GNN-NEXT-LEVER-IMPORT-FINGERPRINT-2026-06-21.md`.

**SIBLINGS:** [[reference_gnn_action_surface_insitu_measure_2026_06_21]] · [[reference_gnn_action_surface_wire_2026_06_21]] · [[reference_gnn_structural_feature_probe_2026_06_21]] · [[reference_gnn_refpool_cap20_reverify_2026_06_21]] · [[feedback_multiseed_before_auroc_claim]].
