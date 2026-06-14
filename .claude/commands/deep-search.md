---
description: Search-first then deep-reason fallback. Runs master_index_query first; if top hits all score below the confidence floor, escalates to model deep-reasoning with the master-index hits pre-loaded as context. Cuts token waste on shallow lookups while keeping neural-grade answers for ambiguous queries.
allowed-tools: mcp__prism_safe__prism_session, mcp__prism_safe__prism_intelligence, Read, Grep, Glob
composes_with:
  - "/awareness-snapshot"
  - "/build-state"
  - "/master-index"
  - "/system-viz"
  - "/utilization-dashboard"
consumes:
  - "prism_intelligence:ai_milling_deep_reason"
  - "prism_session:master_index_node_status"
  - "prism_session:master_index_query"
---
# /deep-search — Search first · reason second · neural last

The deliberate two-stage pattern the user asked for: *"set it up so we can utilize the obsidian brain and /system-viz as a master index for quick searching to hopefully save on search tool calls"* + *"utilize our deep learning and deep reasoning and neural network effectively."*

This skill enforces the right order:

```
  query                                                           tokens spent
    │
    ├─► [1] master_index_query                                    ~200
    │       └─ if top-3 hits avg confidence ≥ 0.5  ───► RETURN    (search-first wins)
    │
    ├─► [2] master_index_node_status on top hit (if id is clear)  +~50
    │       └─ adds in/out degree + utilization
    │
    ├─► [3] If still unresolved → load top-K hits as context      +~600
    │       └─ ask the model to synthesize (deep reasoning on
    │          PRE-LOADED context — no Grep, no Glob, no Agent)
    │
    └─► [4] Last resort → escalate to prism_intelligence /         +~1500
            prism_ai for cross-domain synthesis when the answer
            requires multiple PRISM domains
```

Stages 1+2 cover **80% of "where is X / what handles Y"** questions for ~250 tokens. Stages 3+4 stay reserved for the cases that actually need neural reasoning, not for routine code archaeology.

## When to use

- Default to `/deep-search` for any "where / what / how" question about PRISM internals
- DO NOT use `Grep` / `Glob` / `Agent` for a question that could plausibly hit the master index — those tools are the LAST resort, not the first
- For pure literal-string searches (a specific error message, a comment) → `Grep` is still correct
- For roadmap-status questions → `/build-state` is faster

## How to run

```
/deep-search <your question or query text>
```

The skill body below tells the model the exact sequence to follow. There's no separate script — this is an orchestration directive.

## The protocol (what the model MUST do when this skill fires)

1. **Tokenize the user's query** mentally — pull 2-5 meaningful nouns.
2. **Call `prism_session:master_index_query`** with the full query (NOT individual tokens). Pass `limit: 10`, no source/layer filter unless the user named one.
3. **Inspect the response:**
   - If `totalHits === 0` → jump to step 6.
   - If `hits[0].confidence ≥ 0.5` AND the user asked for a single answer → return `hits[0..2]` formatted. Done.
   - If `hits[0..2].confidence` average ≥ 0.5 → summarize the top 3 with their `buildClass` + `utilization` + paths. Done.
4. **If confidence is borderline (0.3..0.5)** → call `prism_session:master_index_node_status` on `hits[0].id`. That gets in/out-degree which often disambiguates. If the augmented data resolves the question, return.
5. **If still unresolved** → load `hits[0..4]` as context, then **reason on what's already loaded** (no further tool calls). Synthesize. State what the data DOES say + what it DOESN'T. If the user wants a recommendation, give one with the data backing it.
6. **Last resort, deep-reason fallback** → call `prism_intelligence:ai_milling_deep_reason` or another `prism_ai:*` action with the original query + the master-index hits embedded as context. Only do this if the question genuinely requires cross-domain synthesis (physics + business + safety, or similar). For "where is X" questions this stage is wasted tokens.
7. **NEVER call `Grep` / `Glob` / `Agent` from this skill unless steps 1-6 produced zero usable signal.** Those tools are the fallback for "the master index didn't index this and the model can't reason it out" — which is rare.

## Confidence floor tuning

The 0.5 floor is the default. Override per-invocation if the user asks for stricter / looser matching:

| Floor | Meaning |
|-------|---------|
| 0.7 | Return only highly-relevant hits; otherwise reason |
| 0.5 | Default — balanced |
| 0.3 | Return most hits; reason only when truly ambiguous |

## What this skill does NOT do

- It does NOT run an HTTP call to Ollama or any external service. The "neural" part is the model itself reasoning on master-index context — no separate inference.
- It does NOT regenerate the system-graph or BUILD_STATE. Those are background jobs; this skill reads the existing artifacts.
- It does NOT modify any files. Pure read + reasoning workflow.

## Companion surfaces

- `/master-index <query>` — direct call (stage 1 only)
- `/utilization-dashboard` — graph-wide bucket classification (orphans / ghosts)
- `/awareness-snapshot` — one-shot session warmup digest
- `prism_session:master_index_query` — the underlying action
- `prism_session:master_index_node_status` — single-node degree lookup

## Why it exists

Builds on:
- iter 1 — U-MASTER-INDEX (3cd27c288): unified search engine + dispatcher action + skill + auto-inject hook
- iter 2 — U-NODE-UTILIZATION (28fccde44): per-node hub/sink/source/orphan/ghost classifier
- iter 3 — U-AWARENESS-SNAPSHOT (b13f220cd): one-shot session-warmup digest
- iter 4 — U-AWARENESS-INJECT (0089b2de7): SessionStart auto-inject of the digest

This is the **policy layer** on top — tells the model HOW to use the four search surfaces in the right order. Without this skill, the model defaults to `Grep` + `Agent` (expensive, noisy) instead of `master_index` (cheap, provenance-rich). With it, the search-first discipline becomes automatic.

Shipped 2026-05-13 OBSIDIAN-PRISM-OS-MS0/U-DEEP-SEARCH (slot alpha, loop iter 5).
