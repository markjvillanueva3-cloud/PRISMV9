---
name: reference_obsidian_memwiki_rerank_2026_06_09
description: "Q11 revived + semantically-ranked the DORMANT memory->wiki promotion advisor (stop-memory-to-wiki-suggest.mjs). It was never wired AND its rerank was empty (token-Jaccard on titles). Wired it + injected a local-LLM nomic cosine rerank. LIVE: keyword 0/6 -> nomic 6/6 promotion-suggestion coverage. Also found Q4/Q6/Q7/Q8 of the synergy queue STALE."
type: reference
source: prism-memory
synced: 2026-06-09T14:54:09.232Z
aliases: reference_obsidian_memwiki_rerank_2026_06_09
---


# memory->wiki promotion advisor: revived + semantic-ranked (Q11, 2026-06-09)

**Two dead gaps closed.** `.claude/hooks/stop-memory-to-wiki-suggest.mjs`
(U-HRP06, bravo `d02bf0b697`) suggests which existing wiki entry a freshly
written memo should be promoted into — the PSN leg #3<->#4 (memory<->wiki)
compounding path. It had TWO defects: (1) **never wired** in settings.json
(orphan since creation -> never fired), and (2) even if fired, its `rerank`
slot was empty so it scored memo summaries against wiki entry **TITLES** by
token-set Jaccard — blind to synonymy.

**The fix (commits `60805c36c6` + scrutiny `b9b223d5e7` + margin `b7c763bbcd`).**
- NEW `scripts/lib/wiki-promo-rerank.mjs` — local-LLM nomic cosine rerank reusing
  `memo-embed-lib` (`embedTextBatch` /api/embed, `cosine`, JSONL `loadEmbedCache`).
  Title vectors disk-cached (`state/shared/wiki-promo-title-embed-cache.jsonl`),
  **chunked** (64/req — a ~500-string batch errors->null), **slug->words** denorm
  so nomic tokenises meaning, **time-bounded** build (deadline 4000 + 3500/chunk),
  **model-tag stale guard** (re-embed on model swap), **prune-to-live** rewrite
  (cache can't grow unbounded). Queries pre-embedded up-front (advisor calls
  `rerank()` SYNCHRONOUSLY). $0 Claude tokens (Blackwell nomic-embed-text).
- EDIT `main()` injects the rerank, **fail-open** to the keyword fallback
  (`ragMode` records which ran); newest-25 memo cap (bulk mtime-touch guard).
- WIRED in settings.json (C:->H: mirror) after `stop-bug-finding-wiki-gate`.

**LIVE proof (R15-VALIDATE, real numbers).** On 6 real recent memos: keyword
fallback **0/6** got any suggestion (zero title-token overlap = the synonymy
blind-spot); nomic rerank **6/6** (e.g. `reference_zulu_obsidian_live` ->
`obsidian-as-second-brain-low-token-operating-protocol` 0.65). Hook binary:
event Stop, ragMode rerank, valid JSON, 25 memos. 14/14 tests (cosine order,
cache build/reuse/chunk/chunk-fail/cap/deadline/stale-tag/prune, fail-open x4).

**Knobs:** `PRISM_MEM_TO_WIKI_NOMIC=0` (off), `PRISM_WIKI_PROMO_MIN_SCORE`,
`PRISM_WIKI_PROMO_EMBED_CHUNK`, `PRISM_WIKI_PROMO_{CHUNK_TIMEOUT_MS,BUILD_DEADLINE_MS,QUERY_TIMEOUT_MS}`,
`PRISM_MEM_TO_WIKI_MAX_MEMOS`, `PRISM_MEM_TO_WIKI_DEDUP=0`.

**Follow-up — per-session dedup, TWO iterations (R12 self-correction).** Wiring
the advisor exposed a token-waste in my own ship: it fires on EVERY Stop while
recent memos sit in the 15min horizon, re-emitting a ~9.3KB block.
- **Attempt 1 — set-fingerprint (`6ba603db28`): INSUFFICIENT.** Deduped on a
  fingerprint of the whole suggestion set. I claimed it worked (one Stop
  suppressed) but it did NOT: measured live, 1505 memos sit in the horizon ALL at
  age ~80s (a bulk mtime-touch — the obsidian memory-feed re-stamps files every
  Stop), so `findRecentMemoryFiles`' newest-25 slice returns an ARBITRARY churning
  subset each Stop → the per-set fingerprint never repeats → re-emits forever.
- **Attempt 2 — per-MEMO dedup (`1edf02aa26`): CORRECT.** `filterUnseenSuggestions`
  emits only memo NAMES not yet suggested this session, capped at SESSION_CAP=50
  (>that = bulk-touch signature). Robust to the slice churn (a memo shows once no
  matter which subset it lands in), converges to silent, still surfaces a
  genuinely-new memo. LIVE: fire1 emits 25, fire2/3 silent. 8/8 tests.
**Lessons:** (1) a fleet-wide Stop advisory keyed on file MTIME is defeated by any
process that re-stamps mtimes (the feed) → dedup on stable identity (memo name),
not on a churning derived set. (2) R12 — don't claim a fix works off one lucky
observation; verify against the real adversarial condition (the bulk-touch churn).

**Scrutiny.** Round-1 3-of-3: A/B PASS, C FAIL (P1: cold-build wall-clock
unbounded — 8 chunks x 8000ms vs 12s Stop budget). Fixed (deadline) + convergent
A/B/C P2s (model-tag guard enforced, cache prune). Round-2: A/B/C all PASS (B
mutation-tested every new test). C's residual timing-P2 then closed by tightening
the deadline. Lesson: a Stop-hook embed loop must be bounded by WALL-CLOCK, not
just count.

**STALE-QUEUE finding (R8/R12 — the code moved under the ultracode queue).**
Verifying `OBSIDIAN-VAULT-SYNERGY-QUEUE-2026-06-09` items live, 5 were stale:
- **Q4** MOOT — F3 semantic recall already LIVE 99.7% (float cache, 1517/1521),
  proven (`reference_subagent_memo_recall_live`... no, F3 is `memory-relevance-inject`).
  Int8 sidecar would be a DOWNGRADE.
- **Q6** mis-sized — superseded-EXCLUSION already built; redirect-follow needs 3
  sites for a ranking-margin gain.
- **Q7** dead — recall hooks read `architecture/_leaf-index.jsonl` (hourly cron);
  the root `index.jsonl` Q7 targets has NO live reader.
- **Q8** moot — `embedText` already has an AbortController timeout.
Q11 was the genuine open item. Pairs with
[[reference_obsidian_vault_synergy_queue_2026_06_09]].
