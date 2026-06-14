---
name: reference_alpha_galaxy_brain_recall_enrichment_2026_05_29
description: "A3-enrichment — galaxy brains index their DOMAIN body text (heading/heuristic/rules), not the boilerplate header; lifts buried brains in hybrid recall"
type: reference
source: prism-memory
synced: 2026-06-09T14:54:09.014Z
aliases: reference_alpha_galaxy_brain_recall_enrichment_2026_05_29
---


A3-enrichment (2026-05-29, slot:alpha, commit after `481b725a38`) — the
quality refinement of [[reference_alpha_galaxy_brain_recall_indexing_a3_2026_05_29]].

**Problem A3 left:** the first A3 cut indexed only the galaxy brain's H1
(description) + first paragraph (opening). The cascade-index STUB brains
(lathe/wedm/speed-feed) share a VERBATIM header ("# X Galaxy MEMORY.md —
per-domain memory cascade index" + a `## Master-brain link` block), so their
indexed text described the FILE FORMAT, not the DOMAIN → they ranked >200 on
domain-term queries.

**Fix:** new exported pure `extractGalaxyDomainText(body, {maxChars=700})` in
`scripts/build-memory-index-sidecar.mjs` harvests the brain BODY's domain
vocabulary — `##`/`###` heading texts, the `Filename heuristic: lathe, turning,
css, g96, threading…` line, fenced domain rules ("G96 always paired with G50") —
and drops TWO noise clusters via `GALAXY_BOILERPLATE_RE`: (1) the cascade-index
template block, (2) the generic governance lead ("Cross-session working brain…
older entries collapse… MASTER-BRAIN-TEMPLATE… eats its own dogfood") that was
crowding real domain terms past the cap on RICH brains (Reviewer-B P2-1 found
post-processor losing Haas/Okuma/Fanuc behind 6KB of governance prose). Phrases
are DISTINCTIVE — bare "append-only" is NOT matched (legit database-galaxy domain
content; juliett). Wired into `collectGalaxyBrains`' `opening` (feeds BM25 +
`buildEmbedDocText`=name+description+opening, so both BM25 and the dense embedding
get the domain signal). Galaxy opening cap raised 200→700 (brains are domain HUBS;
vault records unchanged at 200).

**Real-data E2E (rebuild index + strip 34 galaxy vectors + re-embed enriched):**
`galaxies/lathe` >200→**61**, `wedm`→**33**, `speed-feed` 26→**8**,
`post-processor`→**4**, `token-optimization` held top-2 (no meaningful regression).
37/37 node:test (+6 enrichment incl. a rich-brain fixture + an append-only
false-drop guard); both per-file reviewers PASS, 0 P0/P1.

**Residual + P3 follow-up:** lathe/wedm still rank lower because they are thin
cascade STUBs with little body content to index — fixed only by POPULATING those
brains (a per-domain-slot content task, not alpha's builder). The capture is
document-ORDER; a P3 follow-up could prioritize the heuristic line + domain
headings ahead of session-meta for meta-heavy brains.

**Lesson reinforced:** the hermetic stub fixture (3 trivial lines) didn't mirror
the real heterogeneous brain shapes — Reviewer B caught the rich-brain dilution
only by running the extractor against the actual 34 brains. Same "fixtures must
mirror real shape" class as the A6 cold-model lesson. Test now carries a
representative rich-brain fixture.
