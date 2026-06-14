---
name: reference_memo_semantic_recall_f3_2026_06_08
description: "CONTEXT-RETENTION/U-MEMO-SEMANTIC-RECALL (F3, commits 636d36bf59 + 75c44d8412, slot:alpha): memory-relevance-inject.mjs gains nomic-embed semantic recall over the memory vault — the obsidian-fully-wired keystone. Was lexical-only; now surfaces meaning-similar memos a name-match misses (incl. when lexical=0). Self-refreshing cache. Live-proven."
type: reference
source: prism-memory
synced: 2026-06-09T14:54:09.207Z
aliases: reference_memo_semantic_recall_f3_2026_06_08
---


**F3 — semantic memory recall (2026-06-08, slot:alpha, commits `636d36bf59` core + `75c44d8412` auto-refresh).** The obsidian-fully-wired/synergized keystone of the alpha /goal (token-savings + context-retention + obsidian). Shipped + 3-of-3 scrutiny PASS + live-proven in-session.

## The gap it closed
`.claude/hooks/memory-relevance-inject.mjs` (PreToolUse Edit/Write recall) was **LEXICAL-ONLY** — term-frequency `indexOf` over ~1496 memos. A file whose DOMAIN has tribal knowledge but whose NAME matches no memo got **ZERO recall**. That lexical-only recall was THE "obsidian not fully wired/synergized" gap.

## What shipped (R13 logical order: F3a safe → F3b hot-path → P1 close)
1. **`scripts/lib/memo-embed-lib.mjs`** — shared, single-sourced helpers (`salientSlice`, `embedText`, `loadEmbedCache`, `cosine`, `semanticTopK`) imported by BOTH the builder and the hook so they can't drift. 12/12 unit tests (`memo-embed-lib.test.mjs`).
2. **`scripts/build-memo-embedding-cache.mjs`** — offline, incremental (sha256-of-salient hash-reuse), atomic-write (tmp+rename) builder. Embeds each memo's salient slice (frontmatter description + title + opening, ≤800 ch) via Ollama `nomic-embed-text` (768-d). Live: 1496 vectors in ~36s full / seconds incremental. Cache `state/shared/memo-embedding-cache.jsonl` (22MB, **gitignored** — rebuild per-machine).
3. **`memory-relevance-inject.mjs`** (F3b) — additive `🔎 Semantically related` subsection: embed the file's terms, cosine vs cache, top-2 (≥0.60) memos the lexical match missed. **Fires even when lexical=0.** `async main().catch`. **Fail-OPEN**: cache absent / Ollama down / timeout(1500ms) / parse / empty-query → exactly the prior lexical-only behavior. Standalone cache = **NO MCP dependency** (the daemon is often down when this hot-path fires). Knobs: `PRISM_MEMORY_SEMANTIC=0`, `PRISM_MEMORY_SEMANTIC_MIN` (default 0.60), `PRISM_MEMORY_SEMANTIC_K` (default 2).
4. **`stop-obsidian-memory-feed.mjs`** (`75c44d8412`, closes arm-C P1) — fires a **detached, default-ON, incremental** cache rebuild on the same cadence memos are fed (≤once/3min, throttle-shared), so the cache never silently goes stale. Mirrors the proven dream-stage detached-spawn (detached+unref+stdio-log, fail-soft, Stop never blocks). Disable: `PRISM_MEMO_EMBED_REFRESH_DISABLE=1`.

## Live proof (this session)
- Editing `memo-embed-lib.test.mjs` → **0 lexical + 2 semantic** (`reference_embedding_ssot_ms0` cos 0.62, ollama-expand cos 0.60) — recall that before F3 injected **nothing**.
- Fail-open: dead Ollama → lexical-only in 0.28s; absent cache → lexical-only; `PRISM_MEMORY_SEMANTIC=0` → byte-identical prior behavior.
- Auto-refresh: Stop smoke {continue:true} 0.23s non-blocking → detached builder embedded exactly the 6 missing memos (reused 1490) → cache 1490→1496, staleness gap closed.

## Scrutiny
3-of-3 PASS (session claude-773b6557): arm A holistic (fail-open polarity, async safety, union/dedup), arm B test-integrity (12/12 R9, single-source, imports), arm C regression/IO (hot-path latency ~120ms read + ≤1.5s embed bounded by 24h rate-limit; flagged the staleness P1 → closed by `75c44d8412`). Honest residual P2s: query↔memo embedding asymmetric (nomic handles it; `search_query:`/`search_document:` prefixes would tighten — needs cache rebuild); `--limit` smoke clobbers live cache (dev-only foot-gun); gitignored cache absent on fresh checkout until first build (fail-open to lexical).

## Goal status
This + [[reference_slot_domain_dedup_2026_06_08]] (token-savings #2) + [[reference_autoresume_stale_window_f5_2026_06_08]] (retention #3) = the alpha /goal's buildable deliverables shipped. F3 directly satisfies #4 (obsidian fully wired — recall now semantic over the whole vault) + #5 (vault value — tribal knowledge surfaces by meaning, not just name). Remaining: F2 (handoff scan-storm), the rate-limited ultracode discovery lanes (#1).

## R8 honesty — partial infra overlap with A6 (surfaced by F3 itself, R12)
F3's own semantic recall, firing on the write of this memo, surfaced [[reference_alpha_hybrid_memory_retrieval_a6_2026_05_29]] (cos 0.73) — **A6 already built nomic dense recall over the memory vault** (2026-05-29, slot:alpha). They are DIFFERENT hooks/surfaces (no hook-level dup): A6 = `memory-index-search-lib.mjs` via `memory-index-precheck-inject.mjs` (per-PROMPT memory-index search); F3 = `memory-relevance-inject.mjs` (per-EDIT file recall, which A6 left lexical-only — F3's genuine new capability). **BUT F3 partially reinvented A6's embedding INFRASTRUCTURE**: a 2nd nomic sidecar (`memo-embedding-cache.jsonl` 22MB float) + a 2nd embed/cosine lib (`memo-embed-lib.mjs`) over the overlapping memory corpus, where A6 already has `memory-embeddings-sidecar.json` (int8, 13.7MB, 10,892 vec) + `embedQueryViaOllamaSync`. R8 miss: I verified the hook was lexical-only but did not check for existing memory-embedding infra before building the new lib. **FOLLOW-UP (next fire):** converge F3's hook onto A6's existing int8 sidecar + shared embed helper, retire the redundant float cache + dedup the lib (A6's int8 quant is 3× smaller). Until then both co-exist — functional + fail-open, but wasteful dual-maintenance. NOT reverting F3: the per-edit semantic capability is real, tested, live-proven; the fix is infra-convergence, not removal.

Related: [[reference_slot_domain_dedup_2026_06_08]] · [[reference_autoresume_stale_window_f5_2026_06_08]] · [[reference_alpha_hybrid_memory_retrieval_a6_2026_05_29]] (converge onto this) · [[feedback_auto_memory_feeds_obsidian_stophook]] · [[reference_embedding_ssot_ms0_2026_05_30]] · [[reference_cyrilxbt_obsidian_hermes_apply_assessment_2026_06_02]].
