# TRIBAL × AI ARCHITECTURE

**Date:** 2026-05-09
**Author:** Claude (claude-99eca613)
**Companion to:** `TRIBAL-KNOWLEDGE-LEVERAGE-PLAN.md`

> User: "Can we use our NN / deep learning / deep reasoning / AI systems to utilize the tribal knowledge to its fullest extent with current counts and the ability to automatically wire in new additions as we add to it?"

**Verdict: yes, with 6 layers stacked over the existing corpus.** Each layer reuses an engine that already exists in PRISM. Auto-wiring falls out as a property of the pipeline — every new tribal entry goes through the same path the existing 1,200 take.

---

## Architecture (top → bottom = query path)

```
                ┌──────────────────────────────────┐
   QUERY ──►    │ L0  Active-task context resolver │  current milestone, file path,
                │     (telemetry-autofire derive)  │  domain, tier, ai-priority
                └──────────────────────────────────┘
                                │
                                ▼
                ┌──────────────────────────────────┐
                │ L1  Vector retrieval (ANN top-50)│  PRISMCreativeReasoningEngine
                │     unified embed store          │  + Ollama qwen2.5-coder:7b embed
                └──────────────────────────────────┘
                                │
                                ▼
                ┌──────────────────────────────────┐
                │ L2  Cross-encoder reranker       │  CrossDisciplinaryDeepLearningEngine
                │     → top-3 candidates           │  scores against task + tier
                └──────────────────────────────────┘
                                │
                                ▼
                ┌──────────────────────────────────┐
                │ L3  Synthesis (deep reasoning)   │  PRISMCreativeReasoningEngine.explore()
                │     compose answer from top-3    │  contradiction-resolve, cite sources
                └──────────────────────────────────┘
                                │
                                ▼
                ┌──────────────────────────────────┐
                │ L4  Inject into PreToolUse       │  tribal-inject-on-edit.mjs hook
                │     surface to active session    │  ≤200 tokens, top-3 only
                └──────────────────────────────────┘

                ┌─ AUTO-GROW (write path, runs on commit / corpus change) ─┐
                │                                                           │
COMMIT ──►      │ L5  Distill (TribalKnowledgeEngine + auto-categorize)    │
                │     · diff + commit msg + telemetry → candidate tip      │
                │     · novelty gate vs corpus (cosine < 0.85)             │
                │     · cite source: sha + files                            │
                │                                                           │
                │ L6  Auto-wire (re-embed + index)                          │
                │     · add to vector store (incremental)                   │
                │     · update wiki/index.md frontmatter                    │
                │     · emit citation log entry                             │
                └───────────────────────────────────────────────────────────┘
                                │
                                └────► back to L1 (corpus grew, retrieval improves)
```

The closed loop is: **better retrieval → more cited tips → more outcomes data → better synthesis → cleaner distillation → less noise in next retrieval.**

---

## Layer-by-layer design

### L0 · Active-task resolver (shipped)
- **Engine:** `derive-milestone` + `derive-stage` already in `telemetry-autofire.mjs`
- **Output:** `{milestone, stage, files[], domain, tier, aiPriorityScore}`
- **Cost:** ~5ms per query — cheap enough to run on every PreToolUse
- **Status:** ✅ already exists

### L1 · Unified embedding store (TO BUILD — `tribal-embed-index.mjs`)
- **Source corpora (single index, schema-tagged):**
  - 770 wiki entries
  - 99 memory files (42 + 26 + 31)
  - 75 extraction-log entries (Mastercam/hyperMILL/Okuma/Fanuc/Haas/Titans, 238 cited)
  - 46 WEDM tribal tips (engine-internal)
  - JM Die corpus (`jm-die-profile.ts`)
- **Embedding model:** Ollama `nomic-embed-text` (already on machine) OR `qwen2.5-coder:7b` for code-tribal segments. Local, free, no API cost.
- **Storage:** SQLite + sqlite-vss (or flat JSON ANN if avoiding the dep). ~3 MB total at this scale.
- **Incremental rebuild:** mtime watch on each source dir; only re-embed changed entries.
- **Cold start:** ~2 minutes one-time on the full corpus.

### L2 · Reranker (TO BUILD — `tribal-rerank.mjs`)
- **Engine:** `CrossDisciplinaryDeepLearningEngine` (already wired) — its existing pattern-recognition layer is the right shape; pass it (task_text, candidate_text) pairs and rank.
- **Alternative if engine isn't directly callable:** Ollama LLM-as-judge with a constrained prompt; ~50ms per pair × 50 pairs = 2.5s budget. Acceptable on PreToolUse.
- **Outputs:** top-3 with confidence scores. Drop anything below 0.4 confidence to avoid noise.

### L3 · Synthesis (TO BUILD — `tribal-synthesize.mjs`, OPTIONAL)
- **Engine:** `prismCreativeReasoningEngine.explore(problem, "optimal")` — already exists, already does cross-domain synthesis.
- **When to invoke:** only when top-3 candidates contradict OR when the user explicitly asks `/shop-knowledge --synth`. Default path skips L3 — raw top-3 with citations is usually better than LLM rewrite.
- **Anti-hallucination gate:** every synthesized claim must cite ≥1 source entry by id. No source → claim rejected.

### L4 · Inject (TO BUILD — `tribal-inject-on-edit.mjs` PreToolUse hook)
- **Trigger:** PreToolUse on `Edit|Write|MultiEdit` for files under `src/engines/`, `src/tools/dispatchers/`, `src/algorithms/`, `.claude/scripts/`, `.claude/hooks/`.
- **Output format:**
  ```
  📚 Tribal precheck (top 3, relevance ≥0.4):
  - [[entry-name-1]] (0.87) — one-line summary (path)
  - [[entry-name-2]] (0.71) — one-line summary (path)
  - [[entry-name-3]] (0.52) — one-line summary (path)
  ```
- **Token budget:** ≤200 tokens injected. Hard cap.
- **Replaces:** `wiki-precheck-inject.mjs` for code files (which uses fuzzy keyword match — strictly worse than vector ranking).

### L5 · Distill (PARTIAL — peer `claude-845cf238` is shipping `distill-tribal.mjs` right now)
- **Engine:** `TribalKnowledgeEngine.distillFromCommit({sha, files, message})` — auto-categorization is already built in per `[[tribal_auto_categorization]]`.
- **Trigger:** Stop hook OR PostCommit hook on successful commit.
- **Novelty gate:** new tip's embedding cosine-distance to nearest existing entry ≥ 0.15 (i.e., ≥85% novel). Below that, dedupe into the closer entry as an addendum.
- **Output destination:** `wiki/lessons/<milestone>-<sha8>.md` with full frontmatter + citations.

### L6 · Auto-wire (TO BUILD — `tribal-autowire.mjs` cron + PostToolUse trigger)
- **PostToolUse trigger:** any write under `knowledge/wiki/**` or `knowledge/memories/**` fires re-embed for that entry only (~50ms).
- **Cron trigger:** hourly full-corpus consistency check; rebuilds index if more than 5% of mtime stamps drifted from index entries.
- **Updates `wiki/index.md`** frontmatter with new entry metadata (auto-categorization tags, novelty score, source-corpus tag).
- **Citation log emission:** append to `tribal-citation-log.jsonl` so retrieval quality can be measured later.

---

## How current engines map onto this

| Layer | Existing PRISM engine | New script wraps it |
|------:|----------------------|---------------------|
| L0 | `telemetry-autofire.mjs` derive-* | _(reuse)_ |
| L1 | None (Ollama embed model) | `tribal-embed-index.mjs` |
| L2 | `CrossDisciplinaryDeepLearningEngine` | `tribal-rerank.mjs` |
| L3 | `prismCreativeReasoningEngine.explore()` | `tribal-synthesize.mjs` |
| L4 | _(hook orchestrates L0→L1→L2→L4)_ | `tribal-inject-on-edit.mjs` |
| L5 | `TribalKnowledgeEngine.distillFromCommit()` | (peer chat is shipping `distill-tribal.mjs`) |
| L6 | `WikiIndexMaintainerEngine` (per inventory) | `tribal-autowire.mjs` |
| Routing | `aiSystemRouterEngine.route(task)` | _(used inside L2/L3 to pick local-vs-cloud LLM)_ |

**Net new code: ~5 small scripts (L1, L2, L3-optional, L4, L6).** Total ~600 LOC. All wrappers around existing engines.

---

## Auto-wire — the "as we add" property

The pipeline is **monotonically self-extending** because:

1. New entry lands (any path: human-authored wiki, auto-distill on commit, memory promotion).
2. PostToolUse / PostCommit hook fires `tribal-autowire.mjs` on the new file.
3. Autowire embeds the entry, drops it into the vector index, updates `wiki/index.md`.
4. **Next** PreToolUse query benefits from the new entry — no human action required.

The only manual action ever needed is the initial `tribal-embed-index.mjs --bootstrap` to seed the store with the existing 1,200 entries.

---

## Failure modes (and the mitigation built into each layer)

| Failure | Layer | Mitigation |
|---------|-------|-----------|
| **Hallucination in synthesis** | L3 | Hard rule: every claim cites ≥1 source entry id. No citation → claim rejected. |
| **Reward hacking via auto-emit flood** | L5 | Novelty gate (cosine ≥ 0.15) blocks near-duplicates. Distill rate hard-capped at 1/commit. |
| **Mode collapse in continual fine-tune** | L1 | We embed, we don't fine-tune. Fine-tune (per-domain LoRA) only runs quarterly with EWC++ regularization. |
| **Stale tribal references renamed engines** | L6 | `tribal-decay.mjs` (planned L6 in earlier plan) flags entries whose cited file path no longer resolves. |
| **Self-citation graveyard** | L4 | Citation log + `pipeline-telemetry zero-records` (just shipped) measures actual hit rate. Decay applies. |
| **Format heterogeneity** | L1 | Unified store schema-tags each entry by source corpus; query can filter or weight by source. No format migration needed. |
| **Cross-domain over-bridging** | L2 | Reranker uses tier + domain in its scoring; mill-only tip won't bubble for lathe queries unless it has explicit `cross-domain:` tag. |
| **Cold start (corpus too small)** | L1 | At 1,200 entries the embed store has plenty of signal. Sublinear-search performance is irrelevant at this scale. |

---

## Cold-start path (works today)

```bash
# 1. Bootstrap the embed index (one-time, ~2 min)
node H:/prism/.claude/scripts/tribal-embed-index.mjs --bootstrap

# 2. Verify retrieval works against the active milestone
node H:/prism/.claude/scripts/tribal-rerank.mjs --milestone CAD-FUSION-LIVE-MS0 --top 5

# 3. Wire the PreToolUse hook
# (settings.json: PreToolUse → matcher Edit|Write|MultiEdit → tribal-inject-on-edit.mjs)

# 4. Wire the PostCommit autowire (cron + PostToolUse)
# (settings.json: PostToolUse → matcher Write|Edit on knowledge/** → tribal-autowire.mjs)
```

After step 4, the loop is closed. Every commit grows the corpus; every edit benefits from the newly-grown corpus.

---

## Why this works at PRISM's scale (no hand-waving)

- **1,200 entries × 768-dim embedding** = ~3.7 MB. Trivial. Sub-millisecond ANN over this.
- **Local Ollama embed model** = $0/query. Free as long as the box is on.
- **PreToolUse budget** = ~200ms total (50ms vector lookup + 150ms rerank). Imperceptible.
- **TribalKnowledgeEngine, PRISMCreativeReasoningEngine, CrossDisciplinaryDeepLearningEngine, WikiIndexMaintainerEngine** all already exist and are wired. We're adding glue, not engines.
- **Lane-safe:** all 5 new scripts go in `H:/prism/.claude/scripts/` and `H:/prism/.claude/hooks/`. Distill (L5) is `claude-845cf238`'s lane — we hand off cleanly because L5 emits files that L6 immediately picks up.

---

## Decision points for the user

1. **Embedding model:** Ollama `nomic-embed-text` (recommended — small, fast, free) vs `qwen2.5-coder:7b` (richer, code-aware, slower) vs both (split index).
2. **Synthesis layer (L3):** ship now or defer? Default path is `top-3 with citations`, which is often better than LLM rewrite. Recommend **defer L3** until citation log shows synthesis would help.
3. **Continual fine-tune:** ship a quarterly LoRA-refresh skill that trains a small adapter on the citation-positive subset of the corpus? High effort, marginal ROI until citation log is mature. Recommend **defer until 6 months of citation data**.
4. **Bootstrap timing:** run L1 bootstrap now (~2 min) or wait for `claude-845cf238` to finish distill? They're independent — bootstrap can run anytime.

---

## Action this session — if user approves

Day-1 build (~3 hours, all in our lane, no peer conflicts):
- [ ] L1: `tribal-embed-index.mjs` (~1h)
- [ ] L2: `tribal-rerank.mjs` (~45m)
- [ ] L4: `tribal-inject-on-edit.mjs` PreToolUse hook + settings.json wiring (~30m)
- [ ] L6: `tribal-autowire.mjs` (~45m)
- [ ] Bootstrap run + verification

L3 (synthesis) and quarterly LoRA (continual fine-tune) deferred until L4 produces citation data.
