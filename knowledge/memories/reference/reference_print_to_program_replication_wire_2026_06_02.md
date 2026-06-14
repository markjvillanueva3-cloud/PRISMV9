---
name: reference_print_to_program_replication_wire_2026_06_02
description: Wired the orphaned hyperMILL print-to-program replication chain (retrieve-similar-program + adapt) into a dispatcher via a new composer engine + axis gate; plus the complexityScore 0-10 scale gotcha.
type: reference
source: prism-memory
synced: 2026-06-09T14:54:10.882Z
aliases: reference_print_to_program_replication_wire_2026_06_02
---


**Print-to-program by RETRIEVAL+ADAPTATION wired (foxtrot /goal /loop, 2026-06-02, branch cad-fusion-live-ms0)**

Goal: "generate replicated mill programs just by reading a print, 3→4→5 axis, using existing programs/posts/toolpaths/databases."

**Discovery (R8 paid off):** the entire chain ALREADY existed in `mcp-server/src/engines/hypermill/` but was **0-dispatcher orphaned**:
- `HMCProjectParserEngine` — parses real `.hmc` projects → `FeatureSequenceRecord` (corpus builder).
- `PartSimilaritySearchEngine` — `index`/`indexBatch`/`search()` → `SimilarityMatch[]` (retrieval; weights feature 0.30, dim 0.20, material 0.20, complexity 0.15, op 0.15). `search()` is full-scan; `materialGroup` AND `partType` are **HARD filters** (must NOT pass them or cross-material/cross-type templates are silently excluded — the replicator's whole reason to exist).
- `FeatureSequenceReplicatorEngine` — `replicate(template, input)` scales dims + Kienzle-derived S/F factor (sqrt(kc_old/kc_new)) + feature reconcile → adapted record + AC Python.

**Fix:** new composer `MillProgramReplicationEngine.ts` (singleton) = build query record → retrieve → AXIS-GATE → adapt. Wired 3 actions into `multiAxisProgramDispatcher` (`replicate_from_print`, `replicate_similarity_search`, `replicate_corpus_index`) + schemas + `index.ts` reg comment. 22 tests.

**Axis-escalation gate (safety invariant):** `deriveAxisCount(record)` = 5 iff a `operationType:"5axis"` op; 4 iff a feature needs rotary (custom axis / |angle|>0.5); else 3. A corpus program needing MORE axes than the target machine is REJECTED — never hand a 5-axis program to a 3-axis machine. Caveat: trusts `operationType` tagging (reliable for `hmc_project`, inferred for `step_inferred`/`manual_entry`) → warns when a non-hmc source is selected.

**Generalizable gotcha (both scrutiny reviewers, P1-2):** `complexityScore` is on a **0-10** scale (HMCProjectParser convention) and `complexityMatch = 1-|Δ|/10`. A 0-100 query value vs a 0-10 corpus value floors that term to 0 for EVERY candidate → silently drags all similarity scores down ~15 pts. Match the corpus scale when constructing a query record for `PartSimilaritySearchEngine`. **How to apply:** before feeding any synthetic record into a similarity/scoring engine, verify the numeric SCALE of each scored field matches the corpus — a scale mismatch is a silent ranking-degrader, not a crash.

Related: [[reference_u_bridge_wire_mill_loop_2026_05_22]] · [[reference_cam_corpus_locations]] · [[feedback_parallel_scrutiny_per_file]]
