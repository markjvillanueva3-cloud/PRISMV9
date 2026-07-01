# token-optimization galaxy — cross-session synthesis (69 un-mined alpha sessions, 2026-05-12..27)

> **Method (R12 honest):** Operator asked for *Sonnet agents* to read+summarize. The Sonnet-subagent
> fan-out was **structurally blocked** by PRISM's own subagent context-injection — the SessionStart
> cold-cache anchors (CLAUDE.md 163KB + ENGINE_DIGEST 227KB + wiki-index 289KB + tribal corpus +
> awareness) overflow every subagent's prompt **before** it can read anything ("Prompt is too long" on
> 12/23 read batches, the rest API-rate-limited; 2.6M subagent tokens, 0 results). So the read+synthesis
> was done by the **main Opus chat (1M ctx, injection already amortized)** over deterministically-distilled
> evidence: `build-session-evidence-packs.mjs` streamed 1276MB of raw transcripts → 1.2MB bounded packs;
> `consolidate-evidence-digest.mjs` deduped to 1569 deferred + 131 article markers. The intent
> (a strong Claude model reads the sessions, not Ollama) is honored — the *mechanism* changed because the
> subagent path is unusable under PRISM's injection. **FOLLOW-UP UNIT (real, fleet-wide):**
> slim the subagent context bundle / gate the cold-cache anchors off for workflow subagents so the
> Sonnet-agent path works (this is itself a token-optimization-galaxy task — see queue below).

## ARTICLES / KNOWLEDGE FED (ingestion backlog — operator: "articles I've fed you")

**Hermes trilogy (DIRECTLY the current goal's subject — "hermes agent", souls.md, agentic behavior):**
- **Akshay Pachaar — Hermes Masterclass** (x.com/akshay_pachaar/status/2054564519280804028) — SOUL.md / MEMORY.md / USER.md / skills / Curator / GEPA architecture. Read via Playwright (75K snapshot). PARTIALLY APPLIED (per-galaxy SOUL.md/MEMORY.md exist).
- **Shann Holmberg** (x.com/shannholmberg/status/2055335043904492011) — Hermes. Read.
- **Simback — "Hermes Agent Memory Guidebook"** (x.com/KSimback/status/2058262328496554021) — compared vs PRISM.
- **Bilgin Ibryam / @bibryam — "Adapt Claude Code to Large Codebases"** (x.com/bibryam/status/2059359166188208142, 2026-05-26) — 8 of 13 patterns. APPLIED via DOMAIN-GALAXY-DOCTRINE-MS0/MS1 (galactic-center sentinels, noise-paths, scoped-skills, LSP).
- **Vox / @Voxyz_ai — "12 Layers Every AI User Should Understand in 2026"** (status/2058222816474919343).
- **Kirill / @kirillk_web3 — "Kimi Agent Swarm: 300-Agent Parallel System"** (status/2057497197638242362).
- **Ahmad Osman — "Step-By-Step LLM Engineering Projects (2026 Edition)"** — 34-project / 21-part / 12-week LLM-stack curriculum (→ 34-unit envelope).
- **0xCodez** (x.com/0xCodez/status/2058156429559636069) — WebFetch 402; Playwright fallback.
- **dunik_7 article** (operator paste — 4-Layer memory rule).
- **DataChaz X · Anthropic cost docs · TDS agentic-AI** — see unbuilt list below.

**6 article-asks NEVER BUILT (concrete backlog from operator inputs):**
1. **semantic-cache** — cache embeddings/answers across sessions keyed by semantic similarity.
2. **targeted-compact** — compact only the stale/least-relevant context, not the whole window.
3. **agent-team-cap** — hard cap on concurrent agent-team size (cost governor).
4. **lazy-skill-body** — load skill bodies on demand, not all at SessionStart.
5. **cache-breakpoint-sweeper** — auto-place `cache_control` breakpoints on stable prompt prefixes (`U-CACHE-BREAKPOINT-SWEEPER` P0-3 scoping started, refactor deferred).
6. **CLAUDE.md ≤200 lines** — the Mnilax finding (compliance collapses past ~200 lines); CLAUDE.md is now ~163KB (far over) — pointer-index discipline only partially holds.

## TASKS LEFT TO COMPLETE (deduped, highest-impact first)

- **Slim subagent context bundle** so the Sonnet-agent / Workflow path works (cold-cache anchors overflow every subagent — blocks ALL multi-agent fan-out from this galaxy). **NEW, high-ROI.** [S/M]
- **semantic-cache + targeted-compact + lazy-skill-body** — the 3 highest-ROI unbuilt article-asks (direct token savings; the galaxy's core mandate). [M each]
- **DISPATCHER_DIGEST.md auto-generator** — still manually maintained; needs a generator script (flagged "next-session pick" repeatedly). [S]
- **M####/W#### memory+wiki shortcodes** — mirror E####/D## pattern, ~70% recall savings, deferred ≥2 sessions. [S]
- **MEMORY.md index compression** — blocked by the 22KB recall-ceiling hook; needs a compress pass. [S]
- **cache-breakpoint-sweeper** (U-CACHE-BREAKPOINT-SWEEPER P0-3) — scoping started, full refactor deferred. [M]
- **Ollama offload 8.9% → 30%** — widen OFFLOADABLE_PATTERNS (still below target; current surface awareness). [M]

## STARTED BUT NEVER FINISHED

- **U-CACHE-BREAKPOINT-SWEEPER** (P0-3) — scoping started, refactor checkpoint-deferred (R10).
- **HVA digest-parser** — case-count half fixed; the DISPATCHER_DIGEST.md generator half never built.
- **validate-unwired-signal sweep** (`--all` → VERIFIED-UNWIRED-ENGINES-2026-05-15.json) — "in flight"; downstream wiring milestones were told to consume the 43-clean-target list instead of BUILD_STATE's 870 mixed noise — verify that hand-off happened.

## DONE BUT DORMANT / NEVER WIRED  [most are stale — verify against current BUILD_STATE]

- **Unwired engines** — recurring theme across sessions (611 → 639 → 870 → 879 → 861). **LARGELY CLOSED since:** current BUILD_STATE = **64 unwired** (98% dispatcher coverage). The May backlog was worked down; remaining 64 are the real punch list. [verify-if-shipped — mostly shipped]
- **VERIFIED-UNWIRED-ENGINES-2026-05-15.json** (43 clean wiring targets) — was the intended feed for wiring milestones vs the noisy 870; confirm consumers point at it.
- **COMPACT_SCAN_BYTES 32MB bump / trust `usage.input_tokens` post-compact** — flagged as a compaction follow-up. **OVERLAPS the U-CBF01/02 marker-format root-cause fix shipped THIS session** (0a966b5696/0dda52f7da) — the deeper cause was the `compact_boundary` marker change, now fixed; the SCAN_BYTES bump is a complementary hardening. [verify-if-shipped — root cause shipped]

## OFF-DOMAIN sessions excluded
- Several "alpha-cad-fusion-liv" / "alpha-quoting-synerg" topics + cross-slot `*-token-savings-c` (lima/bravo/papa/romeo) sessions classified to this galaxy via shared terminals; their domain work (CAD/quoting) belongs to those galaxies — only their token-economy/efficiency findings are folded here.

## RECOMMENDED ROI-ORDERED TASK QUEUE (top 8)

1. **Slim subagent context bundle / gate cold-cache anchors for workflow subagents** — unblocks ALL Sonnet-agent fan-out (the operator's explicit mechanism is currently dead). [S/M] **P0**
2. **semantic-cache** (cross-session embedding/answer cache) — core token-savings mandate, fed-but-unbuilt. [M]
3. **targeted-compact** (compact stale context only, not whole window) — pairs with the compaction fix shipped this session. [M]
4. **Ollama offload 8.9%→30%** — widen OFFLOADABLE_PATTERNS; measurable galaxy KPI below target. [M]
5. **lazy-skill-body** load-on-demand — ~440 skills inject at SessionStart; lazy bodies cut cold-start tokens. [M]
6. **DISPATCHER_DIGEST.md auto-generator** — kill the manual-maintenance drift. [S]
7. **M####/W#### shortcodes** — ~70% recall savings, mirrors E####/D##. [S]
8. **cache-breakpoint-sweeper** (finish U-CACHE-BREAKPOINT-SWEEPER) — auto cache_control on stable prefixes. [M]

_Source mine: `state/shared/galaxy-transcript-mining/token-optimization/_evidence/` (69 packs) + `_DEFERRED-DIGEST.md` (deduped). Producers: `scripts/build-session-evidence-packs.mjs`, `scripts/consolidate-evidence-digest.mjs`. slot:alpha 2026-06-11._
