---
name: reference_gnn_edge_class_homophily_2026_06_21
description: "DECISIVE evidence-backed REDIRECT for GNN leg #10 (slot:india, 2026-06-21, U-GNN-EDGE-CLASS-HOMOPHILY-MEASURE commit 1580c44d98). After two per-node features both measured marginal (the text-embedding per-node ceiling at 23/43 @ 0.0527), I measured whether the GRAPH EDGES carry dispatcher-class signal -- and they DO, strongly. scripts/measure-edge-class-homophily.mjs (non-destructive, 27/27 tests, 2-arm PASS) computes per-edge-type same-class homophily vs the random-pair null over the 3208 single-class codebase-wired engines, EXCLUDING action-engine edges (the disp.<dispatcher>.action.* endpoint IS the class label = leak). LIVE: engine_import (direct 1-hop) ratio 0.686 vs null 0.148 = 4.63x lift; shared_test (2-hop) 0.675 vs 0.133 = 5.07x; shared_schema 0.600 vs 0.286 = 2.09x; shared_physics 0.281 vs 0.279 = 1.01x (NEGATIVE CONTROL -- physics constants span domains, validates the method discriminates). VERDICT: EDGES-CARRY-CLASS-SIGNAL. The deployed tier-5 is direct-embed cosine k-NN (throws away ALL edges) -- it leaves strong homophilous structure on the table. Reconciles with the CLAUDE.md heterophily notes: the FULL training graph is heterophilous because hub edges (action-engine wiring + parent-contains) dominate by count; the ISOLATED leak-free engine-engine subgraph is homophilous. NEXT UNIT (well-justified now, not a blind hypothesis): build a neighbor-vote / message-passing classification path over the homophilous leak-free edges (import + test + schema; NOT physics, NOT action-engine) and measure it vs direct-embed. The lever is the RIGHT edges, not edges-vs-none."
type: reference
source: prism-memory
synced: 2026-06-27T20:30:46.590Z
aliases: reference_gnn_edge_class_homophily_2026_06_21
---


**CONTEXT:** slot:india /loop 2026-06-21, fresh post-compact window. The prior session reached a per-node-FEATURE terminal conclusion (action-surface +0.0018, import-fingerprint +0.0005 both marginal -> text embedding at 23/43 @ 0.0527, [[reference_gnn_import_fingerprint_probe_2026_06_21]]) and named "graph edges / message-passing" as the next lever -- but as an UNMEASURED hypothesis. This unit MEASURES it before any edge-build (R13 measure-before-build).

**KEY ARCHITECTURAL FINDING (read the body, not the title):** the DEPLOYED tier-5 classifier is `directEmbed: true` -- pure cosine k-NN over the node embeddings (`measure-codebase-wired-refpool-auroc.mjs:296-303`, "direct-embed is pure cosine k-NN over embeddings -- no edges/model needed"). The GraphSAGE message-passing model exists but is link-prediction PRETEXT, NOT the deployed path. So the deployed classifier uses ZERO edges. The question: do the engine-engine edges carry dispatcher-class signal that direct-embed is throwing away?

**METHOD:** `scripts/measure-edge-class-homophily.mjs` (non-destructive, read-only; reads the small per-type `*-edges-augmentation.json` in state/shared/system-viz/, NOT the 542MB graph). For each leak-free engine-engine edge type, fraction of engine pairs sharing dispatcher class vs the random-pair null (sum_c n_c(n_c-1)/N(N-1)). Restricted to engines wired to EXACTLY ONE dispatcher (the confidence-1.0 single-class refpool semantics; 3208 engines). **LEAK DISCIPLINE:** `action-engine-edges-augmentation.json` is EXCLUDED -- its `from` endpoint is `disp.<dispatcher>.action.*`, i.e. the dispatcher IS the class label, and an unwired ghost has no such edge (it is the very thing tier-5 predicts) -> trivially 1.0 homophilous = leak.

**RESULT (real numbers, live):**
| edge type | mode | ratio | null | **lift** |
|---|---|---|---|---|
| engine_import | direct 1-hop | 0.686 | 0.148 | **4.63x** |
| shared_test | 2-hop | 0.675 | 0.133 | **5.07x** |
| shared_schema | 2-hop | 0.600 | 0.286 | **2.09x** |
| shared_physics | 2-hop | 0.281 | 0.279 | **1.01x** (negative control) |

`shared_physics ~1.0x` is the internal-validity check: physics constants (kienzle/taylor) are shared across domains, so they SHOULD be class-agnostic -- the method correctly returns ~null for them, proving it isn't just returning "homophilous" for everything. **VERDICT: EDGES-CARRY-CLASS-SIGNAL.**

**RECONCILES WITH THE CLAUDE.md HETEROPHILY NOTES (no contradiction):** the FULL training graph is heterophilous (AUROC-0.096 era, H2GCN machinery shipped default-off) because it is dominated BY COUNT by hub edges -- action-engine wiring (dispatcher -> many different-class engines) + parent-contains (galaxy -> many different-class engines). Mixing homophilous import/test edges into that hub flood gives a heterophilous aggregate. The ISOLATED leak-free engine-engine subgraph is homophilous. So the lever is **the RIGHT edges, not edges-vs-none.**

**STRATEGIC UPDATE to the prior redirect:** per-node features remain exhausted (the text embedding is at ceiling). But "graph edges" is NO LONGER a blind hypothesis -- it is now evidence-backed (4.6x direct homophily). The deployed direct-embed cosine k-NN provably leaves homophilous structure on the table.

**NEXT UNIT (well-justified, measure-before-promote):** build a neighbor-vote / label-propagation / message-passing classification path that uses ONLY the homophilous leak-free engine-engine edges (engine_import + shared_test + shared_schema; EXCLUDE shared_physics and action-engine) and measure it head-to-head vs the deployed direct-embed at the production gate (AUROC>=0.78, selective coverage + classes-spanned). A neighbor-vote over import+test neighbors may beat/complement direct-embed WITHOUT a GNN retrain. Keep it leak-free + non-destructive + multi-seed before any promote.

**CAVEAT (R12, in the docstring):** the null is the unweighted participating-population distribution, NOT a degree-preserving configuration model. A borderline lift (~1.0-1.3) on a hub-dominated type could be a false negative -- re-check against a degree-preserving null before acting. Irrelevant for the actual 4.63x/1.01x decision gap (huge separation).

**DO-NOT-RE-PROPOSE (unchanged):** per-node features -- engine->engine 1-hop ADJACENCY AS A NODE FEATURE (72% null), action-surface text (+0.0018), non-engine import fingerprint (+0.0005), sharp-embed (gate-rejected), calibration (Brier dead-end), ref-pool cap20 (coverage regression). NOTE: the engine->engine adjacency was dead AS A PER-NODE FEATURE; it is ALIVE as a MESSAGE-PASSING EDGE (this unit) -- different mechanism, do not conflate.

**Artifacts:** `scripts/measure-edge-class-homophily.mjs` + `.test.mjs` (27/27), commit `1580c44d98` on cad-fusion-live-ms0. Re-run: `node scripts/measure-edge-class-homophily.mjs [--json]`.

**SIBLINGS:** [[reference_gnn_import_fingerprint_probe_2026_06_21]] · [[reference_gnn_action_surface_insitu_measure_2026_06_21]] · [[reference_gnn_next_lever_import_fingerprint_2026_06_21]] · [[reference_gnn_selective_deploy_2026_06_06]] · [[feedback_multiseed_before_auroc_claim]].
