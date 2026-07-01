---
name: article-synthesis-memory-cag-2026-05-26
type: architecture
status: synthesis
shipped: 2026-05-26
slot: india
schemaVersion: 1.0.0
sources:
  - https://x.com/dunik_7/status/2058905748579418615
  - https://x.com/akshay_pachaar/status/2056714042455343160
related:
  - audit-token-context-memory-2026-05-16
  - backend-dev-token-efficiency
  - promptcachingengine
  - token-savings-pivot
  - obsidian-memory-feed-hook
---

# Article synthesis — 4-layer agent memory + RAG/CAG hybrid

Two posts ingested 2026-05-26 by slot `india`. Both validate **already-identified P1 open gaps** in PRISM's 2026-05-16 token/context/memory audit. The deliverable here is the mapping, not new units.

## Article 1 — dunik_7 (2026-05-25): "Give Your Claude Agent a Memory: The 4 Layers"

Four layers, each fixing what the layer below cannot:

| Layer | What | PRISM today |
|---|---|---|
| 1 — Sticky note | One-shot preference statement in a fresh chat | User `CLAUDE.md` + project `CLAUDE.md` — ✓ present |
| 2 — Project | Persistent workspace; persists **instructions, not history** | `H:/prism/.claude/CLAUDE.md` — ✓ present. **Trap:** chats expect history continuity from the Project surface; PRISM closes this gap with Layer 3 |
| 3 — Living memory file | Single file the agent reads at start, updates at end. **Rule one: keep it lean. Rule two: give it structure.** Filter: *"would this change how the agent acts next time?"* | Memory vault @ `~/.claude/projects/H--prism/memory/*.md` (495 files) + `MEMORY.md` index. ⚠ **Bloated** — project CLAUDE.md sits at 67KB (was 162KB pre-compress). Index hits 24KB ceiling (audit F7). Filter-discipline at write-time is informal |
| 4 — Consolidator ("dreaming") | Scheduled background process rewrites memory clean. **Safety rule: write to a NEW file, keep old read-only until reviewed** | `stop-obsidian-memory-feed.mjs` (Stop hook) + `weekly-synthesis` skill + `memory-prune`. ⚠ Auto-feed today writes into place — **no NEW-file + review-gate is documented**. Mistake #4 risk |

**Four mistakes** the article calls out — all map onto PRISM history:

1. *Treating Projects as memory* — guarded by per-chat handoffs (`HANDOFF-<id>-<topic>.md`) and `state/shared/` ledgers
2. *Dumping everything into the memory file* — **active gap**. CLAUDE.md compress was a one-shot; the discipline isn't enforced
3. *Storing with no filter* — informal. The "would this change behavior next time?" filter is not at write-time
4. *Auto-deploying a consolidation you didn't read* — **needs verification**. `stop-obsidian-memory-feed.mjs` should write `<file>.new.md` first; today it copies in place

## Article 2 — akshay_pachaar (2026-05-19): "RAG vs. CAG, clearly explained"

Core thesis: every query that hits the vector DB for **static** information is unnecessary cost. Cache-Augmented Generation (CAG) caches static knowledge in the model's KV memory; RAG handles dynamic data. Hybrid = best of both. Quoted article cites **Claude Code itself hits 92% cache hit-rate** via Anthropic prompt caching.

| Concept | PRISM today |
|---|---|
| Cold (cacheable, static) vs Hot (retrievable, dynamic) split | **Not explicit**. The 8 UserPromptSubmit injectors (`master-index-precheck-inject`, `wiki-precheck-inject`, `memory-relevance-inject`, `tribal-by-domain-inject`, …) re-inject doctrine every turn even when static |
| Anthropic `cache_control` markers | `PromptCachingEngine` exists (AGENT-MS5 U-AGT19, 28 tests, `mcp-server/src/__tests__/PromptCachingEngine.test.ts`) — wraps cache_control + stats + break-even analysis. ✓ Engine layer present |
| Wiring engine → live hook chain | **Not done.** The injectors do not call `PromptCachingEngine.buildCachedSystem()`. This is the gap |
| Cache hit-rate measurement | **No telemetry channel.** This is audit finding F6 |

## Direct mapping to AUDIT-2026-05-16 open findings

The 2026-05-16 audit (`audit-token-context-memory-2026-05-16`, slot juliett) shipped 7 findings. Article 2 is **external corroboration** for two open P1 items:

- **F1 (P1, open):** *"8 per-turn injectors re-emit static doctrine every turn, churning the message-level prompt cache. Move static→SessionStart. Savings real in direction, uncalibrated in magnitude (flat-400 heuristic; F6 builds the calibration channel)."*
  - Article 2 = explicit doctrine for this exact pattern. Cold/Hot split = static-to-SessionStart vs dynamic-per-turn.
- **F6 (P1, open):** *"no context-utilization telemetry (the gap that makes F1's number real)."*
  - Article 2 cites Claude Code's 92% hit-rate — proves measurable. F6 is the calibration channel that makes F1 commitable.

Article 1 corroborates two additional audit-adjacent properties:

- **Memory-file lean+filter discipline** (Rule one + Rule two + the filter) — audit F7 was the truncation watchdog; the *write-time filter* is the next iteration
- **Consolidation safety rule** (NEW file + review gate) — verify `stop-obsidian-memory-feed.mjs` honors this; if not, that's a P1 follow-up

## What this synthesis is NOT

- Not a new milestone. F1+F6 in AUDIT-2026-05-16 are the existing open units that close this surface.
- Not a duplicate engine proposal. `PromptCachingEngine` already exists with 28 tests; the work is **wiring**, not building.
- Not a memory-architecture rewrite. The 4-layer model maps onto PRISM as-is; only Layer 4's review-gate needs verification + Layer 3's filter-discipline needs enforcement.

## Action items (in priority order, for india's TOKEN-SAVINGS-PIVOT lineage)

1. **Close F1** — pick the smallest scope: identify the 2–3 highest-fire static doctrine blocks injected per turn (CLAUDE.md slice, RTK doctrine, dispatcher map) and migrate them to SessionStart cached blocks via `PromptCachingEngine.buildCachedSystem()`. Measure via the hook-stack-cost baseline (`scripts/audit-hook-stack-cost.mjs`). The PromptCachingEngine carries the cache_control wrapper; the missing piece is one or two hook callsites.
2. **Build F6** — the calibration channel. PromptCachingEngine tracks stats internally; surface them as a per-session telemetry sidecar (mirror the TOKEN-SAVINGS-PIVOT atomic-write pattern) so we can MEASURE cache hit-rate trending toward Claude Code's 92%.
3. **Verify Layer-4 review-gate** — read `stop-obsidian-memory-feed.mjs` end-to-end. If it writes in place, add a `<file>.new.md` stage + a Stop-time advisory that lists files awaiting review. If it already does, this surface is closed; just document.
4. **Layer-3 write-time filter** — wrap the auto-feed with a model-side filter prompt: *"would this change how the agent acts next time? If no, discard."* Cuts memory-bloat at the source rather than via periodic compress.

## Cross-refs

- [[audit-token-context-memory-2026-05-16]] — origin audit, F1+F6 open
- [[backend-dev-token-efficiency]] — standing playbook; this synthesis fills the §3 ("keep conversation in cache") gap
- [[token-savings-pivot]] — tool-level nudge milestone (iter14); F1+F6 are the prompt-level sibling
- [[promptcachingengine]] — engine wrapper, AGENT-MS5 U-AGT19
- [[obsidian-memory-feed-hook]] — Layer-4 consolidator; needs review-gate audit
- `reference_articles_memory_cag_2026_05_26.md` — Obsidian memory mirror
