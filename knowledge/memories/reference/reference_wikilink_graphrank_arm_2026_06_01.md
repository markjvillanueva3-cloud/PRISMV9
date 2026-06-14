---
name: reference_wikilink_graphrank_arm_2026_06_01
description: "Wikilink graph-rank recall arm (OBS-1/2/5) — personalized PageRank over the [[wikilink]] memory/wiki graph as an RRF-fusable recall signal; prism_ml:wikilink_graph_rank. slot india, 2026-06-01, branch slot/india, commit 4d6f0fcd17."
type: reference
source: prism-memory
synced: 2026-06-09T14:54:11.056Z
aliases: reference_wikilink_graphrank_arm_2026_06_01
---


**Wikilink graph-rank recall arm** — shipped 2026-06-01, slot india, branch `slot/india`, commit `4d6f0fcd17` `[AI-SYSTEMS-SWEEP]/U-OBS-GRAPHRANK`. First build of the AI-SYSTEMS-IMPROVEMENT-SWEEP backlog (`state/shared/specs/AI-SYSTEMS-IMPROVEMENT-SWEEP-2026-05-31.md`, avenues OBS-1/OBS-2/OBS-5). This is the answer to the operator's "would Obsidian help the AI systems" question: **the leverage is the `[[wikilink]]` graph the memories already encode, NOT the running app** (links live in plain `.md` — no Obsidian process required).

**What shipped (3 files + 2 edits, 22 tests):**
- `mcp-server/src/utils/wikilinkGraphBuilder.ts` (+test, 10) — `[[link]]` markdown corpus → `DependencyGraph` (nodes=slugs, edges=source→target, weight=link multiplicity). Pure/deterministic.
- `mcp-server/src/utils/wikilinkGraphRankArm.ts` (+test, 6) — personalized PageRank (via existing `PageRankEngine.compute(personalization)`) seeded from query top-hits → `{source:"graphrank", ids}` (structurally an RRF arm, fuses with `reciprocalRankFusion`). Graceful-empty, never throws.
- `prism_ml:wikilink_graph_rank` action (+integration test, 6) — enum + schema in `mlActionSchemas.ts`, case in `mlDispatcher.ts`. Inline `docs` OR recursive `corpus_dir` walk (depth-capped 12).

**3 real catches this build (carry forward):**
1. **AI-T8 — WikiLintEngine.extractWikilinks DROPS aliased links.** Its regex `/\[\[([^\]|]+?)\]\]/g` EXCLUDES `|`, so `[[target|alias]]` fails to match entirely (NOT alias-stripped). The sweep dossier conflated it with `ObsidianVaultSyncEngine.extractWikiLinks` (alias-aware but private). Use an alias-aware extractor for graph completeness. See [[feedback_verify_actual_contract_not_proxy]].
2. **AI-T8 — OBS-3 (fuse graphrank into `rag_search_rerank`) is an id-space mismatch.** rag_search_rerank operates over tribal-tip ids; the wikilink graph is in memory/wiki-slug space — they don't overlap. Built a STANDALONE `wikilink_graph_rank` action (slug-space) instead; alpha fuses it into `memory_search` (OBS-4, alpha lane).
3. **`slimResponse` strips empty arrays from the wire** (`responseSlimmer.ts`) — an empty `ranked:[]` came back ABSENT, breaking the "RRF-fusable, iterable" contract on the no-signal path. Fixed at `mlDispatcher.ts` return: re-add `ranked` post-slim when the result had it. Any list-typed primary product on a slimmed ml action needs this guard.

**Other bugs caught by tests/reviewers (R12):** `normalizeSlug` trimmed AFTER stripping `.md` (trailing-space slugs missed) → trim first; space-delimited edge-key corrupted space-containing slugs → NUL (`String.fromCharCode(0)`) delimiter; unbounded `[^\]]+?` regex was O(n²) on long `[` runs → `[^\]\n]{1,256}?`.

**Synergy (PSN):** Obsidian memory-graph (PSN leg #1) → recall. Memory RECALL is **alpha** lane (alpha's BM25+dense+RRF `memory_search`, BRAIN-SYNERGY-MS0). India owns this substrate + the standalone action; alpha wires the 4th RRF arm into memory_search (OBS-4, main). Sibling: [[reference_rag_hybrid_v2_dense_arm_2026_05_31]] (the dense arm this composes with), [[reference_embedding_pipeline_lexical_honesty_u_path_6_2026_05_31]]. Next sweep units: reasoning→outcome-bus+safety (Unit 2), Layer-4 consolidator re-enable (Unit 3, DISABLED since 2026-05-10), SFC-gate wire (Unit 4).
