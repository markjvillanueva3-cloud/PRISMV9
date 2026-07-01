---
name: reference-cag-router-2026-05-26
description: CAG-router pure-fn library — classify queries as COLD/HOT/HYBRID for Cache-Augmented Generation routing; cuts ~12k token/query when cold-cache hits land
type: reference
source: prism-memory
synced: 2026-06-27T20:30:46.499Z
aliases: reference_cag_router_2026_05_26
---


# CAG-router (Cache-Augmented Generation) — 2026-05-26 (sierra /loop iter1)

**Files**: `scripts/lib/cag-router.mjs` + `scripts/lib/cag-router.test.mjs` (39/39 PASS)

**What**: pure-fn classifier that tells a UserPromptSubmit hook whether a query needs the static doctrine layer (cold), live retrieval layer (hot), or both (hybrid). Inspired by [akshay_pachaar's RAG-vs-CAG tweet](https://x.com/akshay_pachaar/status/2056714042455343160) — RAG hits the vector DB on every query even for static info that hasn't changed in months; CAG pre-loads static knowledge into KV-cache once and reuses it.

**Why PRISM**: every chat injects ~92KB of doctrine (CLAUDE.md + MEMORY.md + ENGINE_DIGEST.md + DISPATCHER_DIGEST.md) on every UserPromptSubmit even when the query is about live state. CAG-router classifies the query first so the downstream hooks can skip the cold inject when the query is pure-hot, or skip the hot RAG/master-index when the query is pure-cold.

**Cold-source registry** (curated, 7 entries): CLAUDE.md doctrine, MEMORY.md index, ENGINE_DIGEST.md, DISPATCHER_DIGEST.md, physics constants, wiki/index.md, tribal tips. Each entry has a `coldRationale` field explaining why it's stable (rarely-mutated).

**Tier resolution**: explicit HYBRID never averaged (R7). Hybrid-marker phrases force hybrid; both-tier-nonzero forces hybrid; pure-tier wins otherwise. The previous tie-break branch was unreachable + tautological test — removed per Reviewer A P2.

**Latency bound**: MAX_QUERY_BYTES=64KB. 10MB pathological query was 2.8s before the cap; ~20ms after.

**Composes with** (not duplicates of):
- `master-index-search-lib.mjs` (same keyword vocabulary on the hot side)
- `prompt-cache.mjs` (output cache — CAG is input cache)
- `aiSystemRouterEngine.route()` (Claude vs Ollama for *tasks*; CAG is cold-vs-hot for *queries*)
- `output_cache_*` dispatcher actions (response-side; CAG is query-side)

**Estimated savings**: 12k tokens per cold-hit (skips master-index + RAG + tribal-by-domain inject chain), 400ms latency. Hybrid hits save 4k tokens.

**Per-file scrutiny verdict**: PASS / PASS from both parallel reviewers (code-analyzer + reviewer). Findings P0=0, P1=0, P2=4 (2 fixed: MAX_QUERY_BYTES guard + unreachable tie branch removal; 2 accepted: slot-intent generous + sizeBytes drift). P3=2 (cosmetic).

**Follow-up units** (queued, not yet built):
- **U-CAG-HOOK-INJECT** — wire as UserPromptSubmit hook. Sets `PRISM_SKIP_MASTER_INDEX_INJECT=1` + `PRISM_SKIP_RAG_INJECT=1` on COLD-tier ≥0.4 confidence.
- **U-CAG-CACHE-CONTROL** — wrap doctrine block in `cache_control: ephemeral` so Anthropic API caches it across the fleet.
- **U-CAG-DASHBOARD** — `/system-viz` roost `ghost.cag_router` showing hit-rate + savings.

**Article sources**:
- [[reference_x_article_dunik_7_2026_05_26]] — could NOT fetch (R12 failure: X anti-scraper + browser-busy)
- [[reference_x_article_cyrilxbt_2026_05_26]] — partial fetch via threadreaderapp; topic = "Obsidian Vault writes BACK to itself" (next sierra unit)

**Wiki**: [[cag-router]]
