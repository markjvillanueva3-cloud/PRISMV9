# Obsidian Vault Synergy — Buildable Queue (2026-06-09, slot:alpha)

> Produced by ultracode Workflow `wf_789a6526-933` (4 agents, ~968K tokens, 3 lenses: H-drive↔Obsidian wiring-completeness · vault-value · local-LLM/Blackwell leverage → synthesis). Grounded in the LIVE system (MCP restored this session). All targets verified present + pure-`node:fs`/non-elevated unless flagged. **Scope contract:** alpha = token/efficiency/Obsidian/memory-recall surfaces; embedding-PIPELINE builds = india/sierra; tribal V8-cap write-side = blocked (needs sharding); canonical-wiki `--apply` = operator-gated.

## SHIPPED
- **Q1 ✓ DONE** (`caabc8fea6`) — `tribal-consolidate-weekly.mjs --apply --max-topics 200` → **176 vault reference nodes** materialized (12,228 tips clustered) into `knowledge/memories/reference/tribal-*.md` (`epistemic_only:true`). The tribal→memory promotion path had produced ZERO output ever. **Direct clause-4 vault-value enhancement.**
- **Q3 ✓ DONE** (`edea8cb893` + `828cc3a6f0`) — subagent Obsidian memo recall dormant→LIVE (ungated from the OOM-killed master-index gate). [[reference_subagent_memo_recall_live_2026_06_09]].
- **Q11 ✓ DONE** (`60805c36c6` + `b9b223d5e7` + `b7c763bbcd`, fire-2) — REVIVED + semantic-ranked the dormant memory→wiki promotion advisor (unwired orphan AND keyword-Jaccard-on-titles). Wired + local-LLM nomic cosine rerank. LIVE: keyword **0/6** → nomic **6/6** coverage; 14/14 tests; 3-of-3 PASS. [[reference_obsidian_memwiki_rerank_2026_06_09]].
- **Q9 ✓ DONE** (`c3dc47ed23` + `c9d1e590cf`, fire-3) — local-LLM "why these connect" rationale for the dream-cycle (Obsidian-graph cron). `scripts/lib/dream-llm-annotate.mjs` + `--llm-synth`/`PRISM_DREAM_LLM_SYNTH=1`, default-OFF, fail-open, byte-identical default path. Uses qwen2.5-coder:32b directly (NOT the reasoning-model resolver, which returns empty at low num_predict). LIVE: edge gets a real Blackwell rationale; 43/43 tests; 1-reviewer PASS (P2(b) underscore-escape closed). [[reference_obsidian_dream_llm_synth_2026_06_09]].
- **Q14 ✓ DONE** (applied to C: source, fire-4) — backfilled **409 alias-preserving cross-ref `[[wikilinks]]` into 236 canonical memos** via `backfill-wiki-links-in-memories.mjs --flat --vault-root <C:>` (Rule-4 doctrine: links in memory bodies). Densifies the Obsidian graph + every recall hook that reads links/aliases — the "fully wired / synergized" + context-retention clause. Targeted C: (not the default H:, which the C:→H: feed would clobber). Alias-preserving (display text kept), atomic, frontmatter intact. Vault data — propagates C:→H: via the feed.
- **Q10 ✓ DONE** (`<this-commit>`, fire-4) — local-LLM per-galaxy "week's theme" for `weekly-memory-synthesis.mjs` (was list-only). `scripts/lib/weekly-synth-llm.mjs` + `--llm-synth`/`PRISM_WEEKLY_LLM_SYNTH=1`, default-OFF, fail-open, byte-identical default. Token SAVING ($0 Claude, Blackwell coder) + context EXPANSION (week digests for `prism_memory:weekly_synthesis_get`). LIVE: W24 (1739 memos/5 galaxies) → themed 3 real syntheses; 10/10 tests. [[reference_obsidian_weekly_q14_q10_2026_06_09]].

## QUEUE DRAINED
All TIER-1/2/3 items are now SHIPPED (Q1,Q3,Q9,Q10,Q11,Q14) or VERIFIED-STALE (Q2,Q4,Q6,Q7,Q8). Q12/Q13 are TIER-4 operator-gated/cross-lane (route, don't auto-claim). The alpha-lane Obsidian-synergy queue is drained.

## VERIFIED STALE (fire-2, R8/R12 — code moved under the queue; do NOT build as written)
- **Q4 ✗ MOOT** — F3 semantic recall already LIVE 99.7% (float cache 1517/1521, full-fidelity); the int8 sidecar would be a DOWNGRADE.
- **Q6 ✗ mis-sized** — superseded-EXCLUSION already built (`memory-index-search-lib.mjs:707` + `SUPERSEDED_DECL_RE`); redirect-follow needs the sidecar builder + 2 search sites for a ranking-margin gain.
- **Q7 ✗ dead** — recall hooks read `architecture/_leaf-index.jsonl` (hourly cron); the root `index.jsonl` Q7 targets has NO live reader (only `wiki-bootstrap.mjs` writes it).
- **Q8 ✗ moot** — `embedText` already has an AbortController hard timeout; F3's hot path is already protected.

## TIER 1 — next (zero-risk, in-session, biggest levers)
- **Q2** — flip the lying `state:"running"` marker in `state/shared/embed-all-wiki-progress.json` → `"stalled"` (stale 24h+/done:0/no-PID; mirrors alpha's `c83ca9be64` staleness fix). Honesty fix, NOT the embed (that's india/sierra). S.
- **Q3** — wire memo recall into the SUBAGENT turn (`.claude/hooks/subagent-start-context.mjs:58` injects only a tribal pointer, never memos). Reuse `runMemoryIndexSearch` (`memory-index-search-lib.mjs:636`, sync BM25 ~0.3s). The single biggest UNCOVERED turn-type — subagents build with zero vault context. S, additive, fail-open.
- **Q4** — point F3 edit-turn recall at A6's 11.4k int8 sidecar (F3 float cache absent at canonical path → semantic arm dark). Via `tryLoadEmbeddingsSidecar`+`cosineSimInt8`. **R8 caveat:** verify int8 scorer matches the sidecar's quant/scale before trusting scores. M. (Sequence before Q8.)

## TIER 2 — recall/honesty polish (additive, compounding)
- **Q5** — run `wiki-tribal-cross-ref-audit.mjs` for the TRUE coverage number (the "83.7%/6,401-missing" stat is from a never-run task). S, read-only.
- **Q6** — surface superseded-redirect targets instead of dropping them (`memory-index-search-lib.mjs:207/217` discards the `[SUPERSEDED → [[target]]]` capture). Self-healing vault recall. S.
- **Q7** — regenerate the 32-day-stale `knowledge/wiki/index.jsonl` (body `index.md` is current). **R12 verify-first:** confirm `/wiki-sync` writes `.jsonl` from `.md` not reverse. S.
- **Q8** — consolidate the two query-embed paths (F3 async-fetch no-breaker vs A6 curl+breaker; R7). Do AFTER Q4. M.

## TIER 3 — Blackwell local-LLM synthesis offloads (batch/scheduled, $0 Claude tokens)
Shared substrate: `ask-ollama.mjs callLocalModel` + `resolveSynthesisModel` → `qwen2.5-coder:32b` on home_blackwell.
- **Q9** — add an LLM prose pass to the dream-cycle (`hermes-dream-cycle-synth.mjs`, 100% Jaccard today; task ENABLED). Per-edge "why these connect" prose. Knob `PRISM_DREAM_LLM_SYNTH=1` default-off until validated. M. **Cheapest LLM-tier ship.**
- **Q10** — local roll-up in `weekly-memory-synthesis.mjs` (concatenates, never synthesizes). M.
- **Q11** — inject a local `rerank` into `stop-memory-to-wiki-suggest.mjs:191` (the `rerank` slot is empty → keyword Jaccard). nomic-cosine or qwen judged. M (reuse Q8 path).

## TIER 4 — operator-gated / cross-lane (route, don't auto-claim)
- **Q12** — tribal-distill local first-draft body (`stop-tribal-distill-suggest.mjs:46`). Keep advisory/draft-only (wiki authoring = human gate). M.
- **Q13** — Hermes-Obsidian bridge source is EMPTY (`hermes-obsidian-memory-bridge.mjs:54` → `%LOCALAPPDATA%/hermes/memories/` never written; real brain = `…/hermes/SOUL.md`). **Operator confirm** before repointing `DEFAULT_SOURCE`. S once confirmed.
- **Q14** — backlink the ~47 link-less feedback memos (`backfill-wiki-links-in-memories.mjs`). S, low priority.

## ROUTED OUT (NOT alpha)
- wiki→tribal embed (6,609 backlog) / rebuild `memo-embedding-cache.jsonl` → **india/sierra** (GPU nomic embed).
- tribal index V8 512MB-cap sharding → **BLOCKED** (india/sierra).
- `promote-tribal-to-wiki.mjs --apply` (canonical wiki write) → **operator-gated** (alpha may dry-run only).
- re-enabling disabled scheduled tasks → needs elevation; unnecessary (run the `.mjs` directly, as Q1 did).

_Full synthesis: workflow output `wf_789a6526-933`. Memory: [[reference_obsidian_vault_synergy_queue_2026_06_09]]._
