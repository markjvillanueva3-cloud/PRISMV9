# GALAXY-CONTEXT-FEDERATION-MS0 — design (per-galaxy retention → master roll-up → selective redistribution + Obsidian token savings)

**Author:** claude-da9aacf5 slot alpha · 2026-05-31 · token/efficiency/Obsidian domain.
**Status:** DESIGN (build deferred to a fresh context — capturing at ctx 69% rather than half-build, which is itself the discipline this milestone is about).
**Operator question:** *now that Obsidian is fully operational — improve context retention per galaxy, feed up to the main galaxy, redistribute to other galaxies as needed; and use Obsidian for better token utilization/efficiency/savings?*

## Thesis
The hub-and-spoke context topology the operator describes is **mostly wiring existing primitives into a loop**, not net-new infra — which is the token-efficient way to build it. The federation IS the token savings: **recall-instead-of-reread** + **cache-anchored small context-cards** + **cross-galaxy dedup** turn thousands of injected/read tokens into hundreds.

## Reuse map (R8 — verify each before building; extend, don't duplicate)
| Primitive | Exists | Role in federation |
|---|---|---|
| Per-galaxy brain `engines/<g>/{CLAUDE,MEMORY,PATHS,TOOLBELT}.md` | ✅ | the spoke (per-galaxy retention) |
| Master `MEMORY.md` `[galaxy:*]` back-pointers + 4-axis "Master-brain link" | ✅ | the hub (feed-up registry) |
| `stop-obsidian-memory-feed.mjs` (C:→H: knowledge/memories) | ✅ | the up-pipe |
| `master-index-precheck-inject` (top-K graph hits/prompt) | ✅ | the down-pipe (EXTEND → cross-galaxy-aware) |
| CAG cold-cache anchor (`cag-router.mjs#COLD_SOURCES`) | ✅ | prompt-cache anchoring (EXTEND → galaxy cards) |
| `tribal-embed-index` + `tribal-by-domain-inject` | ✅ | semantic recall substrate |
| `semantic_search` (`prism_memory`) | ✅ | recall-instead-of-reread |
| `memory-size-watch.mjs` + MEMORY-ARCHIVE pattern | ✅ | per-galaxy compaction |
| working-path-capture (this session) cross-galaxy transfer | ✅ | a precedent for down-redistribution |
| PSN-savings / route-savings telemetry | ✅ | measure the savings (EXTEND) |

## Units (prioritized; alpha-owned unless noted)

### Phase A — per-galaxy RETENTION
- **U-GCF-CARD** — a compact auto-generated **galaxy context-card** per galaxy (≤~1 KB: top-N salient facts + active work + key paths). The cheap inject unit (vs reading the whole MEMORY.md). The single highest-leverage retention+savings primitive.
- **U-GCF-SALIENCE** — salience score = recency × access-frequency × outcome-impact (outcome from india's bus). Drives what the card keeps + what archives.
- **U-GCF-COMPACT** — per-galaxy MEMORY.md size-watchdog + pointer-compression (the 24 KB-ceiling lesson, applied per galaxy) so recall stays high-signal, not bloated.

### Phase B — FEED-UP (galaxy → master)
- **U-GCF-ROLLUP** — aggregator (Stop-hook/cron) that pulls each galaxy's context-card + high-salience deltas into a master **fleet context digest** + refreshes the `[galaxy:*]` registry with a salience summary line. Ollama-summarized (free tokens).
- **U-GCF-KNOWS-MAP** — master **who-knows-what** index (domain → salient-topics), so the hub can answer "which galaxy holds context on X" in 1 lookup.

### Phase C — REDISTRIBUTE-DOWN (master → galaxies that need it) — the hard, high-value part
- **U-GCF-XGALAXY-INJECT** — extend `master-index-precheck-inject` to be **cross-galaxy-aware**: when chat A's prompt matches galaxy B's salient topics (via KNOWS-MAP), inject `galaxy B has relevant context: [pointer + 1 line]`. Selective (top-K + threshold), never broadcast — broadcast is the token-waste failure mode.
- **U-GCF-PUSH** — when a galaxy ships a high-impact learning, push a one-line pointer to galaxies whose `domain_filter` matches (selective fan-out; the working-path cross-galaxy transfer is the precedent).

### Phase D — Obsidian TOKEN SAVINGS (integrates with A–C)
- **U-GCF-CAG-CARDS** — anchor the small per-galaxy context-cards in the CAG cold-cache so the prompt-cache anchors them once/session → near-zero marginal recall cost.
- **U-GCF-RECALL-FIRST** — enforce + measure recall-instead-of-reread (`semantic_search` ~3 snippets ≈ 300 tok vs whole-file ≈ 3000 tok). A nudge + a metric.
- **U-GCF-XDEDUP** — cross-galaxy memory dedup: the same fact stored in N galaxy memories wastes recall + inject tokens → ONE canonical + pointers (`[[...]]`).
- **U-GCF-OLLAMA-MAINT** — route memory compaction/summarization/embedding to Ollama (free tokens) per "Ollama owns ≥70% maintenance" (gate on Ollama health — see `reference_alpha_ollama_chat_hang_host_saturation_2026_05_30`).
- **U-GCF-SAVINGS-TELEMETRY** — measure recall-vs-reread token savings per galaxy (extend PSN-savings); proves the milestone delivers (R12 — savings measured, not asserted).

## Sequencing (R13)
A (card+salience+compact) is the foundation everything else consumes → build first. B (roll-up + knows-map) needs the cards. C (down-inject + push) needs the knows-map. D interleaves (CAG-cards after U-GCF-CARD; telemetry last to prove it).

## Token-budget honesty (the meta-point)
This design was captured at ctx 69% **instead of** building it now — building a 12-unit federation from a near-full context is exactly the waste this milestone eliminates. The build should start in a fresh context (a clean `/checkin-alpha /loop` picks this spec up). Estimated highest-ROI first unit: **U-GCF-CARD + U-GCF-CAG-CARDS** (compact cards, cache-anchored) — biggest savings for the least code.

Memory: [[feedback_psn_definition]] (the 11-leg brain) · working-path-capture [[working-path-capture]] (sibling federation channel). Wiki entry to add on build: `knowledge/wiki/architecture/galaxy-context-federation.md`.
