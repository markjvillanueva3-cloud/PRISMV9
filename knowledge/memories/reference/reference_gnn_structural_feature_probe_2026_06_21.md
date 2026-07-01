---
name: reference_gnn_structural_feature_probe_2026_06_21
description: "EVIDENCE-BACKED NEGATIVE result (slot:india 2026-06-21): the two CHEAP leak-free structural features the GNN separability diagnostic suggested (engine->engine import adjacency; domain-subdir path one-hot) are BOTH non-viable for the deployed engine population. (1) engine->engine imports: only 27.9% of 3847 engines import any other engine (null for 72%; avg out-degree 0.62) -> a 1-hop neighbor feature is empty for most nodes, sparser still for unwired ghosts. (2) domain-subdir path: ALL 3623 dispatcher-wired engines live FLAT in src/engines/ root (resolve to '(root)', dispatcher purity 0.26) -- the domain-organized subdirs (lathe/mill/cad/...) hold mostly UNWIRED engines, so a domain one-hot only separates wired-vs-unwired, not predicts dispatcher. CONCLUSION: no cheap tabular structural feature lifts GNN class separability here; the coverage lever genuinely needs a NEW dense node-feature source (per-engine action-surface text / AST call-graph) + GPU/H2GCN retrain. Confirms the 2026-06-18 'needs sharper features' conclusion with the concrete WHY. Do NOT build a 1-hop-import or domain-one-hot feature -- it would be null/flat."
type: reference
source: prism-memory
synced: 2026-06-27T20:30:46.593Z
aliases: reference_gnn_structural_feature_probe_2026_06_21
---


**CONTEXT:** slot:india autonomous /loop 2026-06-21. After the separability diagnostic ([[reference_gnn_embed_separability_diagnostic_2026_06_21]]: 1/7 classes separable in the 768-d text embeddings) pointed at "add structural features (import-adjacency / dispatcher-cooccurrence / domain one-hot)", I began the structural-features unit by PROBING feature viability BEFORE building (R8 + the fake-0.98 leakage discipline). Key constraint: features must be LEAK-FREE (computable for an UNWIRED ghost, never the node's own dispatcher label) -- dispatcher-cooccurrence is UNAVAILABLE for an unwired ghost (imported by no dispatcher, by definition), so only engine->engine relationships + node metadata qualify.

**PROBE 1 -- engine->engine import density** (relative-path basename resolution over `mcp-server/src/engines/**/*.ts`):
- 3847 engine files; **1075 (27.9%) import >=1 other engine**; 2376 total edges; avg out-degree 0.62.
- Histogram: 0 edges=2772 (72%), 1-2=830, 3-5=186, 6-10=43, 11+=16.
- VERDICT: a 1-hop neighbor-dispatcher-histogram feature is NULL for 72% of engines (and unwired ghosts -- newer/peripheral -- are sparser still). Too sparse to be a coverage lever.
- (First pass with the `/engines/<Name>` absolute-path regex returned 0 -- a regex artifact: siblings import via RELATIVE paths `./FooEngine.js`. The basename-resolution re-probe gave the real 27.9%.)

**PROBE 2 -- domain-subdir -> dispatcher purity** (`buildEngineDispatcherMap` labels x engine-file domain subdir):
- **3623 wired engines ALL resolve to the `(root)` domain** (flat in `src/engines/*.ts`), dispatcher purity **0.26** (dominant prism_cam) -- the same undifferentiated blob the text embeddings showed.
- 0 high-purity (>=0.8, n>=3) domains. The domain-organized galaxy subdirs (lathe/mill/cad/wedm/...) hold mostly UNWIRED engines.
- VERDICT: a domain-subdir one-hot is CONSTANT across the wired reference set -> zero class signal; it would only separate wired-vs-unwired, not predict dispatcher.

**CONCLUSION (R12, evidence-backed NEGATIVE):** neither cheap leak-free structural feature (engine-import 1-hop; domain one-hot) is viable for THIS engine population (import-sparse + root-flat). There is no cheap tabular add that lifts GNN class separability. The real coverage lever needs a **new DENSE leak-free node-feature source** -- candidates: per-engine dispatcher-ACTION-surface text (the action names/descriptions an engine backs, embedded), or an AST-derived call-graph (richer than the file-import graph) -- concatenated/learned via a **GPU/H2GCN retrain** (heterophily-aware; the deployed GraphSAGE already message-passes the system-graph edges). This SHARPENS + confirms the 2026-06-18 "full-coverage needs sharper features / H2GCN / GPU retrain" conclusion ([[reference_codebase_wired_refpool_rejected_2026_06_18]]) with the concrete reason the cheap path fails.

**NEXT UNIT (scoped, fresh context, GPU):** build a per-engine action-surface feature extractor (engine -> its dispatcher action names/descriptions -> embed) as the new dense node-feature, MEASURE separability vs the 768-d text baseline (1/7) on the 178-ref holdout BEFORE any retrain, then H2GCN/GPU retrain gated on AUROC>=0.78/macroF1>=0.55/Brier<=0.15 multi-seed ([[feedback_multiseed_before_auroc_claim]]). Do NOT build the ruled-out 1-hop-import or domain-one-hot features.

**SIBLINGS:** [[reference_gnn_embed_separability_diagnostic_2026_06_21]] · [[reference_gnn_refpool_cap20_reverify_2026_06_21]] · [[reference_codebase_wired_refpool_rejected_2026_06_18]] · [[feedback_multiseed_before_auroc_claim]].
