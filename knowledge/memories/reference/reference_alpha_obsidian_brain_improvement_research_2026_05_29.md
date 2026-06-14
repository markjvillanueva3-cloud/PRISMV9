---
name: reference_alpha_obsidian_brain_improvement_research_2026_05_29
description: deep-dive research on improving the Obsidian brain galaxies — capture-not-compound root cause + 5-tier improvement roadmap (recall/synthesis/self-improve/cross-galaxy/quality)
type: reference
source: prism-memory
synced: 2026-06-09T14:54:09.017Z
aliases: reference_alpha_obsidian_brain_improvement_research_2026_05_29
---


Deep-dive research (2026-05-29, slot:alpha, 4 parallel agents ~460K tokens + first-party RAG + disk verification). Full report: `state/shared/specs/OBSIDIAN-BRAIN-GALAXY-IMPROVEMENT-RESEARCH-2026-05-29.md`.

**Root cause (3 independent agents converged + EMPIRICALLY proven on disk):** the brain CAPTURES but does not COMPOUND. `knowledge/memories/` namespace counts: reference 10578, feedback 190, scrutiny 58, project 42 — but **patterns 0, mistakes 0, weekly-synthesis 1-ever**. 10,578 raw episodic captures, ZERO distilled patterns. The missing tier is Distill→Reflect→Synthesize (Forte CODE, Matuschak evergreen, Karpathy ingest-time synthesis, Park reflection). "Value is in what comes OUT."

**5-tier roadmap (ranked):**
- **A (recall, ALPHA/S):** A1 `DEFAULT_NAMESPACES` (`memory-index-search-lib.mjs:21`) drops scrutiny/uncategorized/weekly-synthesis/galaxies (~334 files unindexed) — add+rebuild. A3 per-galaxy `engines/<g>/MEMORY.md` not in recall path at all (only auto-loaded). A4 zero consumption telemetry on memory-index-precheck (only wiki-precheck calls incrementFeature). **A6 highest-ROI: hybrid BM25+dense+RRF at the hot path — embeddings(nomic) + Qdrant are LIVE but UNUSED at the inject (BM25-only); Anthropic Contextual Retrieval = ~35-49% fewer failed retrievals.** A5 raise live-scan cap 8MB→64MB.
- **B (compounding, FLEET/structural win):** B1 importance-triggered per-galaxy reflection job (Ollama+Claude clusters reference_* → patterns/<galaxy>_synthesis.md) = THE compounding engine. B2 3-layer MEMORY.md (exec-summary/key-claims/pointers). B3 Express-gate on milestone close. B4 weekly-synthesis cadence + compounding metric (distilled÷raw). B5 concept-oriented evergreen notes.
- **C (self-improve loop, india/golf):** C1 de-noise capture (28% git-lock noise → ring buffer). C2 episodic→semantic→procedural promotion. C3 repeat-mistake PREVENT gate (Reflexion). C4 repeat-error-rate metric (revive dead meta-learning ledger). C5 Voyager verified-skill library (scrutiny gate = critic).
- **D (cross-galaxy synergy, ~50 LOC in galaxy-synergy-state.mjs):** D1 ≥3 outbound [[wikilinks]] to adjacent galaxies+orphan lint. D2 bridge reciprocity (A→B implies B→A). D3 CONN-5 recall round-trip column. D4 feed dense links to dormant GNN tier-5 pool.
- **E (content quality):** E1 fix galaxy-scaffold-pt keyword noise (intersect BUILD_STATE/graph node→galaxy edges vs raw substring — cad-fusion-live matched 236). E2 live-generate CLAUDE.md inventory.

**R12 correction:** an agent overstated "galaxies/ namespace dropped = whole brain unreachable" — verified FALSE (galaxies/ = 1 file; real galaxy brains in engines/<g>/MEMORY.md). And the "wiki-precheck unwired" claim is the recurring settings-grep blind spot — wiki-precheck FIRES via cag-router fan-out (live-verified). Verify orchestrator wiring before "fixing" unwired claims. Related: [[reference_alpha_memory_index_nofire_2026_05_29]], [[project_alpha_owns_obsidian_brain_2026_05_28]], [[feedback_psn_definition]].
