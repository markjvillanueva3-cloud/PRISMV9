---
name: bridge-wiki-synergy-2026-06-13
description: 2026-06-13 (slot:bravo) — wired each galaxy's WIKI into the galaxy-reasoning-bridge RAG corpus (the /goal's "synergized with wikis across all galaxies"). 3 commits; the 3-of-3 scrutiny caught TWO real gaps my own VALIDATE missed (dense/fingerprint dropping wiki; then a test that didn't pin the fix). Final: live-validated + regression-pinned + 3-of-3 PASS, all 34 galaxies.
type: reference
source: prism-memory
synced: 2026-06-27T20:30:46.488Z
aliases: reference_bridge_wiki_synergy_2026_06_13
---


2026-06-13 (slot:bravo, session 17b9f42e) — closed the last enumerated AI-synergy `/goal` facet I could safely build: **"synergized with ... wikis across all galaxies."** The `galaxy-reasoning-bridge` (PSN leg #10) read each galaxy's CLAUDE/SOUL/MEMORY/AWARENESS/synthesis but NOT its wiki, so per-galaxy AI reasoning couldn't draw on the galaxy's curated wiki (the Karpathy LLM-wiki the CLAUDE.md says to "query before re-deriving"). Confirmed gap by reading `gatherGalaxyDocs` (R8).

## What shipped (3 commits on slot/bravo, all 3-of-3 PASS at the end)
1. **U-BRIDGE-WIKI** (`63bf1c9229`): resolve the galaxy's own `[[wiki-links]]` → wiki bodies under `knowledge/wiki/**`, added as RAG candidates. Pure exports `extractWikiLinks` + `resolveGalaxyWikiDocs`; NAMES-ONLY memoized wiki index (readdir, not a content vault-scan); bounded + fail-soft. **Cross-consumer safety (R8):** `gatherGalaxyDocs` ALSO feeds `build-galaxy-node-embeddings.mjs` (india GNN node features), so wiki is OPT-IN there (default OFF) → GNN features unchanged; default ON only on the reasoning path. Mirrors the masterBrain opt-in pattern (R11).
2. **U-BRIDGE-WIKI-DENSE-FIX** (`5ab3d8...`): **3-of-3 arm C FAIL caught a real P1** — `reasonForGalaxy`'s dense-rerank arm (default-ON) + the CAG fingerprint re-gathered the corpus WITHOUT wiki and overwrote `context.retrieved`, so wiki was silently DROPPED on the live default path; the cache was wiki-blind. Fix: shared `resolveWikiMode()` single-sources the decision; threaded into the prompt + dense + fingerprint corpora; `cacheModel` namespaced `+wiki`.
3. **U-BRIDGE-WIKI-TEST-PIN** (`23692f9...`): **3-of-3 arm B FAIL caught a test-integrity gap** — my P1 test called `gatherGalaxyDocs` directly with a hardcoded flag, so it PASSED even with the fix reverted (didn't pin). Fix: (a) single-corpus refactor — `reasonForGalaxy` gathers `reasoningDocs` ONCE feeding both fingerprint + dense (one call site, divergence structurally impossible); (b) `opts.cagFile` injection; (c) a real regression-pinned test that drives `reasonForGalaxy` via a seeded CAG hit keyed by the WIKI-included fingerprint.

## Evidence (R15 VALIDATE, live on the recovered Ollama substrate)
- `assembleGalaxyContext("hermes-zulu", wiki-query)` → `wiki/zulu-ledger-reconciler` in top-5 retrieved; `includeWiki:false` → 0 wiki.
- Live dense `reasonForGalaxy` → `ok=true degraded=false sources=[CLAUDE.md, retrieved-hybrid:5, ...]`; dense corpus carried 5 wiki entries.
- Tests **39/39**; the pin verified to **FAIL on revert** two ways (env `PRISM_GALAXY_BRIDGE_WIKI=0` + actual source-strip, then git-restored clean).

## LESSONS (R9/R12 — the compounding value)
- **A passing structural gate != a working runtime path, and a green test != a test that PINS the fix.** My own VALIDATE tested the component (`assembleGalaxyContext`) not the wired path (`reasonForGalaxy`+dense), masking the P1; then my first pin-test tested the helper directly, not the call site, so it passed on revert. The 3-of-3 gate caught BOTH — exactly why it exists. **A test that still passes when you revert the fix is worthless as a regression guard — always verify the pin by reverting.**
- **Single-source a decision that multiple sites must agree on** (R7): the dense/fingerprint/prompt corpora drifted because each re-gathered; one `reasoningDocs` gather + one `resolveWikiMode()` makes divergence impossible.
- **Knob:** `PRISM_GALAXY_BRIDGE_WIKI=0` opts out wiki on the reasoning path; `PRISM_GALAXY_BRIDGE_WIKI_CAP` bounds entries. → [[reference_bridge_keepalive_fix_2026_06_13]] · [[reference_ollama_wedged_orphan_runner_recovery_2026_06_13]] · [[feedback_read_full_content_not_titles]]
