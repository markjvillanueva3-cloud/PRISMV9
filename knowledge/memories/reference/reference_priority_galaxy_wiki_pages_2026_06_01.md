---
name: reference_priority_galaxy_wiki_pages_2026_06_01
description: "All 11 named-priority galaxies now have an indexed wiki architecture-map page (knowledge/wiki/architecture/<domain>-galaxy.md); 8 alpha-seeded this session + 3 pre-existing, all in wiki/index.md hand-region"
type: reference
source: prism-memory
synced: 2026-06-09T14:54:10.883Z
aliases: reference_priority_galaxy_wiki_pages_2026_06_01
---


**Priority-galaxy wiki pages closed (2026-06-01, slot:alpha, GALAXY-CONTEXT-FEDERATION-MS0/U-WIKI-GALAXY-PAGES-8 + U-WIKI-INDEX-XRAY-JULIETT).**

Goal facet "wikis injection, highest priority oscar/echo/delta/kilo/foxtrot/mike/whiskey/xray/juliett/hotel/india." Found via deterministic probe (NOT an LLM workflow — see method lesson in [[reference_tribal_domain_map_gap_2026_06_01]]) that only 3 of the 11 priority galaxies had a `knowledge/wiki/architecture/<domain>-galaxy.md` page, and 2 of those 3 (blueprint-vision, database-expansion) weren't even in `wiki/index.md`.

**Shipped:**
- Indexed the 2 on-disk-but-unindexed pages (xray=blueprint-vision, juliett=database-expansion) — commit `U-WIKI-INDEX-XRAY-JULIETT`.
- Seeded 8 NEW galaxy pages (oscar=speed-feed, delta=cad, kilo=cam, foxtrot=mill, mike=wedm, whiskey=lathe, hotel=business, india=ai-training) + indexed echo's pre-existing post-processor page — commit `U-WIKI-GALAXY-PAGES-8`. All 9 entries added to the `wiki/index.md` line-~776 **hand-region** (between the first `## architecture` header and the auto-managed `scripts/generate-layer-wiki.mjs` marker — so the generator preserves them).

**Pattern (clone of echo's `post-processor-galaxy.md`):** thin ~40-line discovery/pointer page — frontmatter (title/type/domain/slot/maintainer/seeded_by/created/tags) + "Position in the pipeline" ASCII diagram + engine/surface counts + dispatcher + "See also" + honest `_Alpha-seeded discovery stub … domain owner refines._` footer. **Points to `mcp-server/src/engines/<domain>/MEMORY.md` as canonical — does NOT re-list engine names** (avoids the fleet's recurring galaxy-page hallucination bug; bravo/india/xray each had to correct fabricated engine names).

**Anti-hallucination method that worked:** derive ONLY from verified sources — the domain-owner-authored galaxy cards (`state/shared/galaxy-cards/ALL-CARDS.md`) + the master `MEMORY.md` `### Galaxy brain back-pointers` counts. Then a DETERMINISTIC probe confirmed every brain path + wikilink target resolves before commit (caught 2 dangling cad links — `[[cad-knowledge-index]]`/`[[cad-corpus-paths]]` are aspirational, not real files → replaced with the real `mcp-server/src/engines/cad/PATHS.md`). Brain pointers use the template's BARE repo-relative path (no `../` markdown href — a `../../` link from `knowledge/wiki/architecture/` is dead; needs `../../../`). Scrutiny: speed-feed got full 2-reviewer PASS; the 7 priority clones got 1 consolidated reviewer PASS (7/7) + deterministic ref-check.

**Then went comprehensive (R13) — `U-WIKI-GALAXY-PAGES-ALL34`:** authored + indexed the remaining 21 galaxy pages → **34/34 galaxies now have an indexed wiki architecture-map page** (deterministic probe confirms 0 gaps). Authoritative slot ownership for each pulled from that galaxy's own `mcp-server/src/engines/<domain>/MEMORY.md` head (not guessed) — e.g. discovery=tango, dormant-data=victor, wiring=romeo, backend-helper=papa, bug-hunting=uniform, hermes-zulu=bravo/zulu, the golf-authored meta galaxies (quality/shop-floor/compliance-safety/knowledge-conversion/corpus-aggregation/mit-curriculum/pdf-corpus/pdf-corpus-mill/tribal-knowledge/agent-orchestration/cad-fusion-live/[[feedback_golf_owns_reaper|fleet-hygiene]])=golf. Engine names cited in the meta pages came from the VISIBLE (non-truncated) ALL-CARDS.md card bodies + were spot-verified to resolve to real classes (AgentExecutor/HarvestPipelineEngine/MitCourseIndexEngine/OmegaSafetyScoreEngine/ShopStateEngine/TribalKnowledgeEngine/Fusion360MillTurnBridgeEngine all exist). Tool note: spawning ripgrep via a node child process returns uniform not-found because rg isn't on the child PATH — use the Grep tool (real ripgrep) to verify symbol existence, NOT a node-spawned rg. Related: [[reference_galaxy_context_federation_viz_roost_2026_06_01]], [[reference_tribal_domain_map_gap_2026_06_01]].
