---
title: Per-Subagent Master-Index + Tribal Pre-Search
slug: subagent-per-task-presearch
kind: architecture
domain: ai-routing
status: shipped
shipped_at: 2026-05-15
shipped_by: claude-6eac1b66 (slot bravo)
commit: d7797a6e7
milestone: CHECKIN-UPGRADE-MS0
phase: P4-SUBAGENT-PRESEARCH
related:
  - master-index-surface
  - awareness-stack
  - session-continuity-stack
  - parallel-scrutiny-per-file
---

# Per-Subagent Master-Index + Tribal Pre-Search

Every spawned subagent (Agent-tool invocation) now receives two fresh keyword-search blocks in its context bundle, queried against the subagent's OWN task prompt (not just the parent's). The goal is to cut 3-5 search-tool calls per reviewer/code-analyzer/explore subagent and improve first-pass output quality.

## Problem

The shipped `subagent-start-context.mjs` (SubagentStart hook) + `spawned-agent-context-lib.mjs` (391 LOC) built a rich context bundle for every Agent-tool spawn:

- Identity + parent lineage
- Live PRISM scale (engines/dispatchers/actions/hooks)
- System-viz headline + query helpers
- BUILD_STATE + MILESTONE_PROGRESS summaries
- Tribal embed-index stats (entries count + domain breakdown)
- AI-priority ranks
- Lane discipline + peer claims (chat bus)
- CLAUDE.md doctrine pointers
- Per-subagent-type guidance (review/audit/forge/build/explore)

BUT — the `taskNote` (first 240 chars of the subagent prompt) was used **only for the header line**, never as a search query. Every spawned subagent got the PARENT's awareness, never per-task hits relevant to its own work.

## Solution

Two new sections in `buildSpawnedAgentAdditionalContext()`, inserted between "## Knowledge surfaces you can query" and "## Doctrine & memory":

### `## 🧭 Master-index pre-search for THIS subagent's task`

Top-K hits from `state/shared/system-viz/system-graph.json` matching the subagent's prompt. BM25-lite weighted scoring (label > id > info > vault). Same weights, stopwords, and layer exclusions (L9, L11) as the parent's `master-index-precheck-inject.mjs`.

### `## 🧠 Relevant tribal knowledge for THIS subagent's task`

Top-K hits from `state/shared/tribal-embed-index.json` matching the subagent's prompt. Keyword path only (embeddings stripped during load — sync, no Ollama, no network). The deeper cosine-rerank stays in `.claude/scripts/tribal-rerank.mjs` for CLI use.

In-domain boost: `subagentType` is mapped to a tribal domain. Hits in that domain get a 2x score multiplier (matches `tribal-rerank.mjs` `IN_DOMAIN_WEIGHT` convention).

## Subagent-type → tribal-domain inference

| `subagentType` substring | Inferred domain |
|--------------------------|-----------------|
| `physics-reviewer` or `mill` | `mill` |
| `lathe` or `turn` | `lathe` |
| `wedm` or `edm` | `wedm` |
| `cad` | `cad` |
| `cam` or `toolpath` | `cam` |
| `wiring-review-agent`, `test-review-agent`, anything else | `null` (no boost) |

## Shared lib

`scripts/lib/master-index-search-lib.mjs` — 320 LOC, 7 exports:

- `tokenize(text, opts)` — stopword/dedup/length-floor/token-cap, unicode-aware
- `loadGraph(graphPath)` — mtime-cached system-graph load
- `searchGraphHits(graph, tokens, opts)` — weighted scoring + layer exclude + label dedup
- `runMasterIndexSearch(query, opts)` — convenience: tokenize + load + search
- `loadTribalIndex(indexPath)` — mtime-cached tribal-index load (strips embedding arrays during parse)
- `searchTribalHits(index, tokens, opts)` — title/text/domain-token weighted + prefDomain 2x boost
- `runTribalSearch(query, opts)` — convenience: tokenize + load + search

Pure (no I/O on import). Sync. Network-free. Failures return `[]` (never throw).

**Process-lifetime cache:** keyed on path + mtimeMs. Subsequent calls with same path+mtime return the SAME wrapper object (reference-stable per scrutiny). Cache auto-invalidates when peers regenerate the file.

## Sync-to-system-viz invariant

The lib reads `system-graph.json` via mtime cache. When the peer chat `claude-b6c4b196` expanding system-viz to cover all files on H: drive (the SYSTEM-VIZ-FS-COVERAGE-MS0 milestone, adding L12 filesystem leaves) completes its work, the cache invalidates automatically on the next subagent spawn — no manual refresh required.

Same invariant for `tribal-embed-index.json`: when `nightly-tribal-index-rebuild` cron updates the file, the next caller's mtime check sees the new mtime, re-parses, and serves fresh hits.

## Refactor (no behavior change)

`master-index-precheck-inject.mjs` was monolithic (259 LOC) with inlined BM25. Refactored to 110 LOC delegating to the shared lib. Behavior preserved: same query tokens, same weights, same layer exclusions, same dedup. Smoke-test verified parity (5 hits for "kienzle cutting force model" matches pre-refactor output).

## Wiring

**Settings.json: NO EDIT REQUIRED.** Both consumer hooks were already wired before this commit:

- `subagent-start-context.mjs` — `SubagentStart` matcher `*`, timeout 5000ms
- `master-index-precheck-inject.mjs` — `UserPromptSubmit`

Both hooks pick up the new lib via import path on their next invocation.

## Test coverage

`scripts/lib/master-index-search-lib.test.mjs` — 34 cases via `node --test`, all passing in 555ms:

- `tokenize`: 7 cases (stopwords, dedup, length floor, token cap, empty/null/non-string, unicode, STOPWORDS export)
- `loadGraph`: 6 cases (valid, missing file, bad JSON, bad shape, mtime cache hit, mtime cache invalidate)
- `searchGraphHits`: 7 cases (weighted hits, label dedup, topK, unmatched, null graph, empty tokens, EXCLUDED_LAYERS export)
- `runMasterIndexSearch`: 3 cases (e2e, sub-2-token short-circuit, missing graph)
- `loadTribalIndex`: 4 cases (load + embedding strip, missing file, bad shape, mtime cache)
- `searchTribalHits`: 4 cases (title/text hits, prefDomain boost, unmatched, null index)
- `runTribalSearch`: 3 cases (e2e, tokens<2, missing index)

## Per-file scrutiny verdict

| Reviewer | Verdict | Notes |
|----------|---------|-------|
| A (code-analyzer, content specialist) | **PASS** | All 8 acceptance criteria met. 32 test cases across 7 exported fns. mtime-cache reference-stability invariant verified. Hook fail-safe airtight. |
| B (independent second-pass reviewer) | **PASS** | Integration coupling clean. No network. Named constants verified. Test integrity verified. Backward compat verified (helpers/subagent-context.mjs without taskNote → sections skip cleanly). |

P3 notes (NOT blockers):
- `_resetCachesForTests` JSDoc mismatch (says "not exported" but is exported — minor doc polish)
- Fixture comment about L11+dedup ordering (assertion is still correct)
- No `PRISM_SUBAGENT_PER_TASK_K` env knob (currently hardcoded 5)

## Knobs

| Variable | Default | Effect |
|----------|---------|--------|
| `PRISM_MASTER_INDEX_INJECT` | `1` | Parent UserPromptSubmit injection on/off |
| `PRISM_MASTER_INDEX_K` | `5` (clamp 1-20) | Top-K hits on parent prompt |
| `PRISM_SUBAGENT_PER_TASK_K` | `5` hardcoded | **Proposed** — top-K hits on subagent task |

## Smoke evidence

```text
subagentType: "physics-reviewer"
taskNote:     "Review Kienzle force engine for chatter prediction on
               thin-wall pockets — verify cutting force coefficients
               match canonical kc1.1 values from physics/constants.ts"

OUT:
## 🧭 Master-index pre-search for THIS subagent's task
Query tokens: review, kienzle, force, chatter, prediction, thin, wall, pockets
  • [L10/built] kienzle-force
  • [L10/built] kienzle-force-model
  • [L10/built] ppg-kienzle-force-validation
  • [L10/built] prism-chatter-prediction-engine
  • [L10/built] thin-wall-deflection

## 🧠 Relevant tribal knowledge for THIS subagent's task (boosted: mill)
Query tokens: review, kienzle, force, chatter, prediction, thin, wall, pockets
  • [mill/memory] project_prism_forces_naming
  • [mill/memory] PRISM Forces naming convention
  • [mill/wiki] "hyperMILL Contour Milling: If you want through pockets..."
  • [mill/wiki] Consensus Run `f01d0ccc`
  • [general/memory] Tribal knowledge access — JM Die test shop + 3,700+ tips

Bundle total: 7.1KB
```

## Files shipped

- `scripts/lib/master-index-search-lib.mjs` (NEW, 320 LOC)
- `scripts/lib/master-index-search-lib.test.mjs` (NEW, 330 LOC, 34 tests)
- `.claude/hooks/master-index-precheck-inject.mjs` (REFACTORED, 259→110 LOC)
- `scripts/agents/spawned-agent-context-lib.mjs` (EXTENDED, +101 LOC)

## See also

- [[master-index-surface]] — original master-index from OBSIDIAN-PRISM-OS-MS0
- [[awareness-stack]] — 5 other awareness layers (this is the 6th, per-subagent)
- [[session-continuity-stack]] — parent feature (this is subagent extension)
- [[parallel-scrutiny-per-file]] — gate that approved this changeset
