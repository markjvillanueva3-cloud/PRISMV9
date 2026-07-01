---
name: galaxy-free-source-corpus-2026-06-09
description: "Per-galaxy authoritative free/legal EXTERNAL knowledge corpus index (315 tiered source pointers across 14 domain galaxies). Where to pull fresh authoritative domain data on demand so galaxy knowledge stays non-stagnant. Auto-invoked surface for the GALAXY-ENRICH program's deep-domain lane."
type: reference
source: prism-memory
synced: 2026-06-27T20:30:46.586Z
aliases: reference_galaxy_free_source_corpus_2026_06_09
---


**Where the external free-source corpus lives:** `state/shared/specs/GALAXY-FREE-SOURCE-CORPUS-2026-06-09.md` (commit `0fd4e8c30a`). HTML twin alongside. Regenerate: `node scripts/build-galaxy-free-source-corpus.mjs` (idempotent; re-run when a new deep-domain packet lands).

**What it is:** 315 deduped, **tiered** free + legal authoritative external source pointers across 14 domain galaxies (ai-training, speed-feed, cad, quality, mill, lathe, wedm, cam, post-processor, blueprint-vision, business, quoting, academy, shop-floor). This is the "pull fresh authoritative data on demand" corpus that keeps each domain's knowledge non-stagnant. **Complements** the INTERNAL corpus roots `reference_critical_resource_roots_2026_05_30` (`H:/PRISM/{resources,JM DIE,Docustrata}`): internal = our files; this = the world's free authoritative references.

**Tiers (corroborate before trusting a number):** T1=72 primary (gov/edu/standards/MIT-OCW/arXiv/NIST/NIMS/eCFR) - T2=40 vendor/OEM technical docs (Sandvik/Mitsubishi/ISCAR/Kennametal/Haas/Fanuc/Siemens) - T3=203 free articles/aggregators (secondary). T3 dominates, so it is surfaced honestly: a T3 number is a tunable prior until corroborated against T1/T2.

**R12 boundary (critical):** the corpus indexes VERIFIABLE source URLs only. It does NOT assert the physics/numeric/cost claims those sources contain. Those claims are drafted UNVERIFIED in each galaxy's `knowledge/wiki/<galaxy>/_staging/deep-domain-research-2026-06-09.md` and stay **owner-gated** until the owner slot spot-checks them against source (per `GALAXY-DEEPDOMAIN-STAGED-2026-06-09.md`). Never integrate an unverified domain claim into a live engine/schema/doctrine without owner verification.

**How to use:** answering a domain question (cost model, cutting physics, CAD format, controller dialect, quality SPC, training data source) -> open the corpus index, jump to the galaxy section, prefer T1 then T2 sources. Owners: integrate survivors of the verification gate into live galaxy MEMORY.md/wiki/tribal so per-domain recall surfaces them directly.

Part of the GALAXY-ENRICH program [[reference_galaxy_enrichment_program_2026_06_09]]. Related: [[reference_critical_resource_roots_2026_05_30]] - [[feedback_use_lima_pypdf_page_extractor]] (the page-by-page extractor for ingesting any PDF source from this corpus).
