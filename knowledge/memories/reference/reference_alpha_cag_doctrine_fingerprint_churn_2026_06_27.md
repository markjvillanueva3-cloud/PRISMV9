---
name: reference_alpha_cag_doctrine_fingerprint_churn_2026_06_27
description: "galaxy-reasoning-bridge CAG hit-rate stuck ~9-14% -- whole-corpus doctrine fingerprint busts ALL cached answers on ANY doctrine edit; safe fix = strip volatile metadata from the fingerprint input (2026-06-27, slot:alpha)"
type: reference
source: prism-memory
synced: 2026-06-27T20:30:46.466Z
aliases: reference_alpha_cag_doctrine_fingerprint_churn_2026_06_27
---


**CAG (galaxy-reasoning-bridge) low hit-rate root cause: whole-corpus doctrine-fingerprint churn — SAFE SLICE SHIPPED `f33d8afa0d` (U-CAG-FINGERPRINT-DENOISE, slot:alpha 2026-06-27, 3-of-3 PASS).**

**SHIPPED:** `normalizeForFingerprint(text)` in `galaxy-cag-cache.mjs` strips ISO-8601 datetimes + relative-time tokens + `claude-<id>`/UUIDs from the fingerprint INPUT (not the reasoning corpus). Never-stale preserved (real doctrine edits still invalidate; 3 reviewers verified). Live-validated: 3 galaxies, cosmetic timestamp regen now `regen-stable=true`. 12/12 cag-cache + 45/45 bridge tests; 4 new R9. One-time re-key self-heals (invalidated bucket). DEEPER tier (per-question top-K fingerprint) NOT done — has a stale-reasoning correctness tradeoff = operator-scoped. P2s logged (3-of-3): isolated claude-id test; a load-bearing GUID in doctrine would normalize away (low-likelihood, soft-advisory-bounded).

SessionStart headline (this session): galaxy-reasoning CAG **9% hit-rate** over 803 lookups (warm-traffic 14%), **447 of 730 misses "recoverable" = doctrine-fingerprint churn** (the named fixable signal). Stats sink: `prism_session:cag_stats` / `scripts/cag-cache-stats.mjs`; per-galaxy telemetry beside the cagFile.

**Mechanism** (`scripts/lib/galaxy-reasoning-bridge.mjs:495-529`): the CAG hot path caches a reasoning answer keyed by `galaxy+model+question`, content-invalidated by `corpusFingerprint(reasoningDocs)` (line 526) computed over the **ENTIRE** bounded galaxy doctrine corpus (galaxy CLAUDE.md + MEMORY.md + AWARENESS snapshot + resolved [[wiki-link]] bodies; `gatherGalaxyDocs`). Comment line 497: "A doctrine edit changes the fingerprint -> cache miss -> re-reason." So **any** edit ANYWHERE in a galaxy's corpus busts **EVERY** cached answer for that galaxy — and the corpus includes high-churn content (the AWARENESS snapshot regenerates per session; MEMORY.md has a "Last synced" date + auto-counts; wiki bodies edit constantly fleet-wide). Hence chronic ~9% hit-rate.

**Two fix tiers:**
- **SAFE slice (likely auto-buildable, zero correctness risk):** exclude VOLATILE non-doctrine content from the fingerprint INPUT — session-id/AWARENESS-snapshot, "Last synced" dates, auto-regenerated counts/timestamps — since those don't affect the reasoning answer. Pure efficiency gain; needs reading `corpusFingerprint` + `gatherGalaxyDocs` to confirm what volatile fields are currently included. (NOT YET DONE — capped at drift ≤1 tick.)
- **DEEPER (correctness tradeoff — operator-scoped):** narrow the fingerprint to only the per-question top-K RETRIEVED sections (not the whole corpus), so an unrelated doctrine edit elsewhere doesn't invalidate this question's cache. Risk: a doctrine edit that SHOULD invalidate an answer might not if the retrieval set is computed wrong → stale reasoning. Needs careful design + 3-of-3.

**Why deferred:** launching the fix = a NEW operator-unrequested initiative (goal/scope change → operator-gated per the crossroad-auto-decide directive). Recommended next-unit candidate for an alpha CAG-efficiency thread; start with the SAFE slice (read `corpusFingerprint`/`gatherGalaxyDocs`, strip volatile fields, measure hit-rate lift via `cag_stats`).

Related: [[feedback_psn_definition]] (CAG is the AI-substrate cache leg) · galaxy [[galaxy/token-optimization]].
