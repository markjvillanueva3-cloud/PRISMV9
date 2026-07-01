---
name: reference_galaxy_context_federation_knows_map_2026_05_31
description: "GALAXY-CONTEXT-FEDERATION-MS0 / U-GCF-KNOWS-MAP (shipped 2026-05-31, slot alpha) — Phase B complete: master who-knows-what TF-IDF index over the 34 galaxy cards (token→galaxy routing via whoKnows). Recall bounded by ≤1KB cards — multi-token discriminates, bare ambiguous token ties (R12 stated)."
type: reference
source: prism-memory
synced: 2026-06-27T20:30:46.585Z
aliases: reference_galaxy_context_federation_knows_map_2026_05_31
---


**GALAXY-CONTEXT-FEDERATION-MS0 / U-GCF-KNOWS-MAP** (shipped 2026-05-31, slot alpha) — 7th federation unit,
**Phase B complete** (ROLLUP + KNOWS-MAP). Sisters: [[reference_galaxy_context_federation_rollup_2026_05_31]],
[[reference_galaxy_context_federation_compact_2026_05_31]], [[reference_galaxy_context_federation_salience_2026_05_31]].

**What it is:** the master **who-knows-what** index — which galaxy's brain holds context on topic X. Built
**TF-IDF-lite** over the 34 per-galaxy cards (each galaxy = a "document"): token weight = (role-line hit ?
ROLE_BOOST : 1) × idf(N, docFreq), idf = log(1 + N/df) (smoothed — a token in 1/34 galaxies routes strongly;
a token in all 34 self-suppresses to ≈0.69, kept-but-lowest). Galaxy-BRAIN-level routing, complementary to the
node-level master-index. `whoKnows(query)` is the 1-lookup; forward map (galaxy→topics) + inverted (token→galaxies).

**Shipped:** `scripts/lib/galaxy-knows-map.mjs` (pure-core + injected-deps + fail-soft; reuses tokenize/parseCardRole/
loadCardsFromIndex/DEFAULT_ROOTS; no ESM cycle; 19 node:test), `scripts/galaxy-knows-map.mjs` (CLI build|who).
Sidecar (regenerable, NOT committed): `state/shared/galaxy-cards/KNOWS-MAP.json`. Live: 34 galaxies, 767 tokens.

**How to apply / lessons:**
1. **TF-IDF over galaxy cards routes correctly — verified live.** "cutting force speed feed"→speed-feed(11.4),
   "post processor gcode controller"→post-processor(14.1), "obsidian memory recall"→token-optimization,
   "discharge"→wedm, "margin/pricing"→quoting. Smoothed idf = log(1+N/df) avoids the df===N zero-collapse while
   still strongly favoring rare/distinctive tokens (the routing signal).
2. **R12 — don't OVERCLAIM what the data delivers (arm-B P1, round 1).** The header + wiki first claimed
   "which galaxy holds context on X in ONE lookup." But recall is BOUNDED by the ≤1KB card distillations: a bare
   ambiguous single token ("cutting") ties across the cards that carry it and can alphabetical-tie-break to the
   WRONG authority (compliance-safety before speed-feed); "threading"/"chamfer" aren't in the distillations at
   all. The fix was NOT code — it was qualifying the claim honestly (multi-token queries discriminate sharply;
   bare ambiguous tokens may tie/miss; fall back to the node-level master-index; sharper routing is a CARD-CONTENT
   lever). A reviewer caught the overclaim by running whoKnows on a bare token. Lesson: when a feature's quality
   depends on upstream data richness, state the bound in the doc + encode it as a known-limit test (R9), don't
   imply unconditional capability.
3. **Reuse the SAME tokenizer as the master-index (R8)** — `tokenize` from master-index-search-lib — so galaxy
   routing and node routing share vocabulary (no drift). Binary presence (tokenize dedups) is fine for ≤1KB cards.
4. **Single-writer-per-file** (4th unit running): writes only KNOWS-MAP.json, never INDEX.json.
5. **Distinct from slot-galaxy-map** (a static slot-name→galaxy dict) — dedup-cleared; KNOWS-MAP is a content-derived
   capability index, net-new at the galaxy-brain level.

Knob: `PRISM_GCF_KNOWS_DISABLE=1`. Feeds U-GCF-XGALAXY-INJECT (can consume whoKnows instead of re-scoring).
Wiki: [[galaxy-context-federation]]. PSN [[feedback_psn_definition]].
