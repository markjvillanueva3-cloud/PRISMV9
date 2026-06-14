---
name: post-processor_synthesis
description: "[auto-synth · verify] Compounding synthesis of the post-processor domain — recurring patterns, decisions, open threads distilled from 24 memories (LLM-generated; verify against source memories before trusting)"
metadata:
  type: patterns
  galaxy: post-processor
  synthesizedFrom: 24
  model: gpt-oss:120b
  synthesizedAt: 2026-06-11T04:49:00.538Z
  sourceHash: 4daa08b194a7
  advisoryOnly: true
  mustHumanVerify: true
---

# post-processor — domain synthesis (compounding)

> ⚠ ADVISORY — LLM-generated (gpt-oss:120b), `mustHumanVerify`. Auto-distilled by
> `galaxy-reflection-synthesis.mjs` (B1) from 24 domain-relevant memories via the
> A6/A3 hybrid recall. Verify any rule here against its cited source memory before trusting
> it as fact (esp. safety-relevant thresholds). Regenerated on each run — edit the source
> memories, not this file. The compounding arm of the Obsidian brain.

## Recurring patterns
- **Vector‑store fallback** – When `prism_memory:semantic_search` cannot reach Qdrant, the system automatically switches to a *memory‑relevance* write‑hook index and falls back to the master `MEMORY.md` file [reference/reference_bravo_qdrant_down_fallback].
- **Silent container loss** – A renamed/leftover Docker container can leave Qdrant “Created” but non‑running, degrading PSN without fleet alerts; manual `docker start <real_name>` restores service [reference/reference_qdrant_down_created_leftover_2026_06_08].
- **Per‑galaxy file locality** – Authoritative CLAUDE/MEMORY/PATHS/TOOLBELT files reside on the shared integration tree (`cad-fusion-live-ms0`) rather than on individual slot worktrees; slots reference them via canonical paths [feedback/feedback_foxtrot_galaxy_recover_not_rebuild] [feedback/feedback_galaxy_dirs_are_doctrine_only].
- **Slot‑owned buildouts** – Each slot runs an 11‑step galaxy buildout that creates sentinel files (`CLAUDE.md`, `MEMORY.md`, etc.) marking completion; these sentinels are the source of truth for ownership and version [reference/reference_bravo_galaxy_buildout_2026_05_28] [reference/reference_delta_galaxy_buildout_2026_05_28].
- **Self‑committing galaxies** – After buildout, a galaxy commits directly to the integration branch (`cad-fusion-live-ms0`) instead of relying on Golf as an integrator [feedback/feedback_galaxy_self_commit].
- **Doctrine‑only engine directories** – `mcp-server/src/engines/<galaxy>/` contain only declarative artefacts (CLAUDE, MEMORY, PATHS, TOOLBELT); executable code lives elsewhere [feedback/feedback_galaxy_dirs_are_doctrine_only].
- **Context federation & ranking** – A TF‑IDF “who‑knows‑what” index routes tokens to the correct galaxy; a salience scorer re‑ranks results by recency and impact [reference/reference_galaxy_context_federation_knows_map_2026_05_31] [reference/reference_galaxy_context_federation_salience_2026_05_31].
- **Hybrid RAG bridge default** – The dense/hybrid reasoning‑bridge is now enabled fleet‑wide by operator directive, superseding the previous off‑by‑default setting [reference/reference_galaxy_bridge_hybrid_on_default_2026_06_10].

## Key decisions & rules
1. **Fallback rule:** If Qdrant returns `{ok:false,error:"qdrant not connected"}`, immediately switch to the memory‑relevance write‑hook and log a fallback event [reference/reference_bravo_qdrant_down_fallback].
2. **Recovery over rebuild:** When galaxy artefacts are missing from a slot worktree, first attempt recovery from `cad-fusion-live-ms0`; never perform a blind rebuild that could overwrite custom extensions [feedback/feedback_foxtrot_galaxy_recover_not_rebuild].
3. **Ownership mapping:** Slot‑to‑galaxy ownership is authoritative in `state/shared/CHAT-SLOT-DOMAINS.md` and must be consulted before any merge or delete operation [project/project_foxtrot_mill_galaxy_ownership_2026_05_28] [reference/reference_charlie_quoting_galaxy_2026_05_28].
4. **Commit pipeline:** Each galaxy’s CI/CD pushes commits directly to the integration branch; Golf is only used for cross‑slot merges, not for individual galaxy changes [feedback/feedback_galaxy_self_commit].
5. **Sentinel validation:** Presence of `CLAUDE.md`, `MEMORY.md`, `PATHS.md`, and `TOOLBELT.md` in a galaxy directory constitutes a successful buildout; any missing sentinel triggers a recovery workflow [reference/reference_delta_galaxy_buildout_2026_05_28] [reference/reference_bravo_galaxy_buildout_2026_05_28].
6. **Doctrine‑only constraint:** Engine directories must never contain executable code or third‑party binaries; all logic lives in shared libraries or slot worktrees [feedback/feedback_galaxy_dirs_are_doctrine_only].
7. **Hybrid bridge activation:** The operator directive `U-FLOR-HYBRID-DEFAULT` forces the dense/hybrid RAG arm on for every fleet node; any deviation must be logged and justified [reference/reference_galaxy_bridge_hybrid_on_default_2026_06_10].
8. **External corpus indexing:** The free/legal source corpus (315 pointers across 14 galaxies) is the single source for fresh domain data; updates are pulled via the path `state/shared/external-corpus/` and must be reflected in each galaxy’s MEMORY.md [reference/reference_galaxy_free_source_corpus_2026_06_09].

## Open threads
- **Qdrant health visibility:** No fleet‑wide alert was emitted when Qdrant entered a “Created” state, leading to silent degradation [reference/reference_qdrant_down_created_leftover_2026_06_08]. Need a monitoring hook that surfaces container status changes.
- **Slot vs. integration sync:** Stale slot worktrees can supersede newer integration files (e.g., `hermes-zulu` CLAUDE.md discrepancy) [reference/reference_bravo_slot_worktree_galaxy_split]; a reconciliation process is pending.
- **Automated corpus refresh:** The mechanism for periodically ingesting updates from the external free‑source corpus into each galaxy’s MEMORY.md remains undocumented.
- **Hybrid bridge scaling:** While enabled fleet‑wide, performance impact on low‑resource nodes has not been measured; guidelines for selective disabling are under discussion.
- **Sentinel consistency across slots:** Some galaxies (e.g., `mill`) have multiple sentinel versions due to incremental recoveries [reference/reference_foxtrot_mill_galaxy_buildout_2026_05_28]; a unified versioning schema is needed.
