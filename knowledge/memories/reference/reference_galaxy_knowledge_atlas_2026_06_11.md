---
name: galaxy-knowledge-atlas-2026-06-11
description: "Plotted each domain's knowledge/tribal/memory + UNIFORM Obsidian vault recall routing into all 34 galaxy PATHS.md via an idempotent marked-block generator (enrich-galaxy-paths-knowledge-atlas.mjs). Delivers the operator /loop goal 'populate each domain to max + plot paths + route vault the same way'. Commit 1da02ab4db."
type: reference
source: prism-memory
synced: 2026-06-27T20:30:46.586Z
aliases: reference_galaxy_knowledge_atlas_2026_06_11
---


**Galaxy knowledge-atlas (slot:zulu, 2026-06-11, commit `1da02ab4db`).** Operator /loop: *"populate each primary PRISM domain with the maximum data (knowledge, tribal, memories); plot file paths for every relevant file/folder per domain; make sure the Obsidian vault is routed the SAME way for each domain so each galaxy learns its whole domain to the max."*

## Finding
Per-galaxy `PATHS.md` were thin **auto-derived baselines** (`galaxy-scaffold-pt.mjs` name-match + CLAUDE.md ref-extraction), explicitly flagged *"the owning slot should ENRICH"* / *"NOT a hand-verified atlas"*. They plotted engines + CLAUDE-cited refs but NOT each domain's knowledge/wiki/tribal/memory surfaces or any uniform vault recall routing. The 8 primary domains (mill/lathe/etc.) had RICH hand-built atlases; the other ~26 were thin. Vault-routing PRESENCE was already 34/34 `UDM` (UP+DOWN+master-index) in MEMORY.md; what was missing was the per-domain KNOWLEDGE plotting + an IDENTICAL recall contract.

## Build (R15, build-once-apply-34)
`scripts/enrich-galaxy-paths-knowledge-atlas.mjs` splices ONE idempotent marked block (`BEGIN/END:knowledge-atlas`, same pattern as the existing `critical-resource-roots` block) into every PATHS.md, plotting -- **existence-checked, never fabricated (R12)** -- the domain wiki dir (`knowledge/wiki/<g>/`) + Obsidian synthesis brain (`knowledge/memories/patterns/<g>_synthesis.md`) + galaxy brain artifacts, PLUS the **UNIFORM recall routing IDENTICAL across all 34** (only the galaxy-name token differs): `prism_memory:semantic_search query="<g>"`, tribal-rerank (PSN leg #5), `galaxy-reasoning-bridge.mjs <g>` (PSN leg #10, hybrid CAG+RAG), UP/DOWN vault. Test asserts the routing shape is byte-identical across galaxies (the "routed the same way" clause).

## Validation
9/9 tests (uniform-routing, R12 no-fabrication, idempotency, replace-not-duplicate, no-clobber-outside-markers). LIVE: 34/34 enriched; immediate re-run = 0 changes (idempotent); bug-hunting plots real `knowledge/wiki/bug-hunting/` (5 entries) + synthesis; mill hand-content survived; final integrity = all 34 carry BOTH critical-resource-roots AND knowledge-atlas blocks (no block lost). Non-duplicate vs papa's `resource-atlas` (external local+YouTube+online learning inputs) -- this is the INTERNAL knowledge + recall routing layer.

## Lesson (R7/R8 -- attribution-bleed on the shared tree)
`git add mcp-server/src/engines/*/PATHS.md` on the shared `H:/prism` tree swept an UNCOMMITTED peer edit (juliett's `wire-db-stores` `undefined`->real db-intake path fix, sitting in the working tree) into my commit. It was an IMPROVEMENT (no regression) but it absorbed juliett's pending work under my commit subject. On the shared tree, prefer adding only your own diff (or commit from the slot worktree) so a broad glob-add doesn't claim a peer's uncommitted changes. Related: [[feedback_commit_to_slot_worktree]], [[reference_slot_zulu_diverged_cannot_commit_2026_06_11]].
