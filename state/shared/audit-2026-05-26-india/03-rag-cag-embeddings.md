---
audit: 2026-05-26-india
scope: RAG/CAG/embedding/cache substrate
slot: india
schemaVersion: 1.0.0
sources:
  - mcp-server/src/engines/PromptCachingEngine.ts
  - state/shared/AUDIT-HOOK-STACK-COST-BASELINE.json (2026-05-16)
  - knowledge/wiki/architecture/article-synthesis-memory-cag-2026-05-26.md
  - 8 .claude/hooks/*-inject.mjs files
related_findings:
  - AUDIT-2026-05-16 F1 (P1, open) — static-doctrine churn
  - AUDIT-2026-05-16 F6 (P1, open) — no context-utilization telemetry
---

# Audit — RAG/CAG/embedding/cache substrate (slot india, 2026-05-26)

## PromptCachingEngine — built vs wired (call-site grep results)

Engine: `mcp-server/src/engines/PromptCachingEngine.ts` (8.7 KB, AGENT-MS5 U-AGT19).
- Singleton export `promptCachingEngine` with `buildCachedSystem()`, `wrapSystemPrompt()`, `recordUsage()`, `getStats()`, `breakEvenReads()`.
- Anthropic `cache_control: { type: "ephemeral" }` markers; 4 breakpoint limit; DEFAULT_MIN_CACHE_CHARS = 4096.
- 28 tests in `mcp-server/src/__tests__/PromptCachingEngine.test.ts` — confirmed.

**Call-site grep — total wiring:**

| Surface | Files referencing `buildCachedSystem` / `promptCachingEngine` |
|---|---|
| Engine source | `mcp-server/src/engines/PromptCachingEngine.ts` (definition) |
| MCP dispatcher | `mcp-server/src/tools/dispatchers/devDispatcher.ts` (one action wires it) |
| Schema | `mcp-server/src/schemas/devActionSchemas.ts` |
| Tests | `mcp-server/src/__tests__/PromptCachingEngine.test.ts`, `dispatcher.promptCaching.test.ts` |
| **`.claude/hooks/*.mjs`** | **0 files. ZERO.** |
| `scripts/**/*.mjs` | 0 files |

**R12 fail-loud:** the engine + tests + a `prism_dev` dispatcher action exist; the 8 UserPromptSubmit / SessionStart / SubagentStart injectors that emit doctrine every turn DO NOT call it. The cache wrapper is reachable only by hand-invoking the MCP action. WIRE-UNWIRED-MS0/U-WIRE-PC is the wiring commit referenced by the graph but its scope was the MCP layer, not the hook layer. **F1's gap is exactly here.**

## 8 injectors classified Cold/Hot/Mixed

Reading the head of each injector (sources, gating, ranking inputs) tells us whether output varies per-session vs is stable doctrine. Token estimates from `AUDIT-HOOK-STACK-COST-BASELINE.json` (each `inject` role = 400 tokens/fire; baseline UserPromptSubmit = 24 hooks × ~3,420 tokens/event).

| # | Injector | Event | Cold / Hot / Mixed | Why |
|---|---|---|---|---|
| 1 | `master-index-precheck-inject.mjs` | UserPromptSubmit | **Mixed** | Indexes system-graph.json (slow-drift, cache-friendly); BM25-lite against prompt text (dynamic). The **graph data** is cold; the **per-prompt top-K slice** is hot. Static-slice opportunity: pre-cache graph node dump + degree map. |
| 2 | `wiki-precheck-inject.mjs` | UserPromptSubmit | **Mixed** | Wiki corpus (722 entries) re-parsed/cached against mtime — cold. Per-prompt BM25 + Ollama cosine fallback — hot. Stage-1 widened recall × stage-2 lexical rerank both pure per-prompt. Cold opportunity: ship the BM25 vocab + leaf-index as a SessionStart cached block. |
| 3 | `memory-relevance-inject.mjs` | PreToolUse Edit/Write | **Hot (file-bound)** | Scans `~/.claude/projects/H--prism/memory/*.md` keyed on the file path of the impending edit. Output is per-edit, not per-session. Rate-limited 24h per `(session, file)` pair — so amortized cost is already low; not a cache target. |
| 4 | `tribal-by-domain-inject.mjs` | UserPromptSubmit | **Mixed** | Tribal embed index (`state/shared/tribal-embed-index.json`) is cold; per-prompt cosine rerank against domain tokens + lexical stage-2 is hot. Domain mapping per slot is cold. Per-prompt cost spawns the rerank subprocess each turn. |
| 5 | `psn-leg-state-inject.mjs` | UserPromptSubmit | **Mixed** | Reads 6 sidecars (`.knowledge-link-audit.json`, memory mtime, tribal mtime, `system-graph.json` age, `PRISM-INVENTORY-LATEST.md` unwired count, `NN-EVAL.json` AUROC). Sidecars drift slowly — re-read every turn is the waste. **Surfaces only concerning state** (silent when healthy) — so amortized cost is already gated. Tier-3 advisory. |
| 6 | `slot-context-bundle-inject.mjs` | UserPromptSubmit | **Hot** | Loads slot-bound context (soul refuse_list / loop running / token zone / bridge units / decision recommendation) — these are session-current state, dynamic by definition. Not a cache target. |
| 7 | `slot-soul-inject.mjs` | UserPromptSubmit | **COLD** | Reads `state/shared/slot-souls/<slot>.md` — frontmatter + voice + behavior. Same content every turn within a slot. 5-min dedup TTL already on it (`scripts/lib/injection-dedup.mjs`). **Prime cold-cache candidate** — fixed per-slot, re-emitted across burst prompts. Move to SessionStart cached block. |
| 8 | `subagent-start-context.mjs` | SubagentStart | **Mixed (per-subagent)** | Builds spawned-agent bundle (CLAUDE-BRIEF + BUILD_STATE + MILESTONE_PROGRESS + SVI + handoff + master-index pre-search). The 5 first sources are session-stable (cold); the master-index pre-search + tribal pre-search bake in the subagent's task prompt (hot). Cold slice = the 5 file reads — they're the same for every subagent within a session. |

**Summary:**
- **1 Pure Cold** (`slot-soul-inject` — frozen per slot, ~400 tok/fire × every prompt)
- **5 Mixed** — large cold slice + small hot slice (master-index, wiki-precheck, tribal-by-domain, psn-leg-state, subagent-start-context). Each currently emits ~400 tokens/fire end-to-end.
- **2 Pure Hot** (`memory-relevance-inject`, `slot-context-bundle-inject`) — bound to per-turn dynamic state; correctly excluded from caching.

Mixed-slice carve-out is the F1 close. Pure-cold migration is the cheapest ROI (slot-soul).

## RaBitQ status — R12 fail-loud

Tool description in `prism_safe` MCP advertises 3 RaBitQ actions: `embeddings_rabitq_build`, `embeddings_rabitq_search`, `embeddings_rabitq_status`.

**Grep across `mcp-server/src/**`:** 0 matches for any of those action strings.
**Engine present:** `mcp-server/src/engines/QuantizationProfileEngine.ts` (RaBitQ profile selector) + `sessionDispatcher.ts` references it twice as a comment for HMEMV11.
**Dispatcher action:** **NONE WIRED.** The 3 advertised actions cannot be invoked. The tool catalog lies.

This is a P1 follow-up. Either (a) wire the 3 actions in `embeddings_*` dispatcher OR (b) remove the unimplemented action declarations from the tool description. Per Karpathy R12: surfacing this is the deliverable; the fix is a separate unit.

## Memory-relevance + tribal-by-domain backends

- **`memory-relevance-inject.mjs`** — scans `~/.claude/projects/H--prism/memory/*.md` via `readdirSync` + content match. Local filesystem only. No Qdrant. Lexical rerank via `scripts/lib/lexical-rerank.mjs`. Pure CPU.
- **`tribal-by-domain-inject.mjs`** — `state/shared/tribal-embed-index.json` (local L1 vector index, JSON-shape) + spawns `.claude/scripts/tribal-rerank.mjs` subprocess (cosine + Ollama-embed via `nomic-embed-text` if up; falls back to lexical when down). No Qdrant. Lexical rerank stage-2.

**Qdrant usage today (across the 8 injectors): zero.** Qdrant is the dispatcher surface (`qdrant_vector_search` / `qdrant_vector_upsert`) but the per-prompt retrieval layer is local-file JSON + Ollama-embed-on-demand. This is intentional — Qdrant launch latency would kill the UserPromptSubmit budget — but it does mean RaBitQ quantization (its natural Qdrant role) sits unused even if the actions were wired.

## Article incorporation candidates — F1/F6-closing units, ROI-ordered

Naming convention: `U-CAG-NN-<short-slug>`. Each unit ≤1 day, additive, no roadmap restructure.

1. **U-CAG-01-soul-to-sessionstart** — ROI: highest. `slot-soul-inject.mjs` content is fixed per slot. Move to SessionStart cached block via `promptCachingEngine.wrapSystemPrompt(soulMd)`. Delete from UserPromptSubmit chain or gate behind soul-mutation detection. Expected savings: 400 tok × N prompts/session.
2. **U-CAG-02-telemetry-channel (closes F6)** — Build the cache-stats sidecar. `PromptCachingEngine.getStats()` already tracks `hit_rate / cached_input_tokens / cache_creation_tokens / estimated_token_savings`. Surface via Stop hook → `state/shared/dashboards/prompt-cache-stats.jsonl`. Telemetry is F1's calibration channel; F1 numbers are heuristic without it.
3. **U-CAG-03-static-slice-extract (closes F1 mid-slice)** — Carve out the cold slice of `master-index-precheck-inject` + `wiki-precheck-inject` (graph dump, BM25 vocab, leaf-index head) → SessionStart cached block. Keep the per-prompt rerank stage as the hot layer. Expected: 2 × 400 = 800 tok/prompt → ~80 tok/prompt cached + rerank-only.
4. **U-CAG-04-rabitq-wire-or-remove (R12 fix)** — Either wire `embeddings_rabitq_{build,search,status}` in the `embeddings_*` dispatcher AND a minimal end-to-end test against `tribal-embed-index.json`, OR strike the actions from the MCP tool description. Tool catalogs must not lie.
5. **U-CAG-05-layer4-review-gate (article 1 mistake #4)** — Verify `stop-obsidian-memory-feed.mjs` writes `<file>.new.md` before promotion + emits a Stop-time advisory listing files awaiting review. If it doesn't (suspected), add the staging step. This is the article-1 corroboration; F1+F6 are article-2.

## Cross-refs

- `knowledge/wiki/architecture/article-synthesis-memory-cag-2026-05-26.md` — origin synthesis (slot india, today)
- `knowledge/wiki/architecture/audit-token-context-memory-2026-05-16.md` — F1/F6 origin (slot juliett)
- `mcp-server/src/__tests__/PromptCachingEngine.test.ts` — 28 tests, engine layer verified
- `state/shared/AUDIT-HOOK-STACK-COST-BASELINE.json` — token-cost baseline (2026-05-16)
- `scripts/audit-hook-stack-cost.mjs` — measurement re-runner
