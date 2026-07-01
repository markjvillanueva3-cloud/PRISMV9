---
title: build-brief — deep pre-build knowledge pack
type: architecture
created: 2026-05-19
slot: juliett
milestone: BACKEND-DEV-LOOP
unit: U-BUILD-BRIEF-KNOWLEDGE-PACK
tags: [knowledge-injection, search, pre-build, dev-velocity]
---

# build-brief — deep pre-build knowledge pack

> The high-ROI knowledge-injection layer that sits BETWEEN the auto-injected SessionStart digests (~350 tokens, headlines only) and a multi-file build. Composes wiki bodies + memory bodies + tribal tips + git commits + regressions into one query-prioritized markdown brief.

## What it is

A skill (`/build-brief`) + a CLI (`scripts/build-brief.mjs`) + a node:test suite (34 cases) that, given a unit-id / milestone-id / topic / slot keyword, reads FULL bodies of the most relevant wiki entries, memory files, tribal tips, and prior commits — then renders one markdown brief, persisted to `state/shared/briefs/<slug>.md`.

The motivating principle: **the more you know about the subject, the higher the quality output.** The PRISM SessionStart stack already does this for the *session* — `master-index-precheck-inject`, `wiki-precheck-inject`, `tribal-by-domain-inject`, `awareness-snapshot`, `BUILD_STATE`. But each of those returns *headlines and links*, not *bodies*. When the next step is "go build something multi-file", headlines aren't enough — you need the body of the top-3 wiki entries, the rule in the relevant feedback memory, the prior commit messages in the milestone, and any regression notes touching the area. `build-brief` is the composer that pulls all of that into one artifact.

## Why high-ROI

The compounding-leverage rule from PRISM doctrine: **a backend tool pays on all 13 slots; a feature pays once.** Every chat that runs `/build-brief <target>` before starting work ships with deeper context, which means:

- Fewer Grep round-trips (one read of the brief replaces 5-10 individual lookups)
- Fewer dead-end implementations ("I already started building X — turns out it exists")
- Fewer post-/compact context losses (a fresh chat can re-build the same brief deterministically)
- The brief is persisted on disk; subsequent iterations in the same loop re-read it for free

Token-cost ladder (relative):

| Surface | Cost | Returns |
|---------|------|---------|
| `master-index-precheck-inject` (auto on every prompt) | ~200 | top-5 hit headlines |
| `wiki-precheck-inject` (auto on every prompt) | ~150 | top-3 wiki entry titles |
| `/master-index <q>` (manual stage 1) | ~200 | top-10 hits, no bodies |
| `/wiki-query <name>` | ~300 | ONE wiki entry's body |
| **`/build-brief <target>`** | **~1500-3000** | **5 wiki bodies + 3 memory bodies + 5 tribal tips + git history + regressions, all query-ranked** |

The 10× token cost buys ~20× context depth — the right trade when the next action is a multi-file build.

## Architecture

```
target  ──►  resolve mode (unit / milestone / topic / slot)
              │
              │── unit-knowledge-pack::lookupUnit  ─►  unit + milestone + title
              │── unit-knowledge-pack::resolveSlotToUnit
              │── master-index-search-lib::runMasterIndexSearch  (graph + obsidian)
              │── searchWikiLeaves  (28K leaves, IDF + meaty-type bonus)
              │── master-index-search-lib::runTribalSearch  (domain-inferred)
              │── memory file resolver  (feedback / reference / lesson namespaces)
              │── git log via spawnImpl  (last N in milestone)
              │── CLAUDE.md ## Recent regressions token-grep
              │
              ▼
        collectBodies (path-traversal containment guard)
              │
              ▼
        excerptBody (budget-aware, query-relevant sections first)
              │
              ▼
        renderBriefMarkdown + JSON  ─►  state/shared/briefs/<slug>.{md,json}
```

### Pure functions

All composition is pure + injected-readers. Production code exports:

- `parseArgs(argv)` — CLI parser with clamps (topK ≤ 40, maxExcerpt ≥ 200)
- `stripFrontmatter(body)` — YAML + BOM stripper
- `excerptBody(body, queryTokens, maxChars)` — budget-aware excerptor; lead-budget fraction 0.55 when relevant sections exist; reserves space for the truncation marker
- `loadWikiLeafIndex(path, readers)` — mtime-keyed cache over `_leaf-index.jsonl`
- `searchWikiLeaves(index, tokens, opts)` — IDF-weighted (log((N+1)/(df+1))+1) name/title/desc keyword scorer with LEAF_MEATY_MULT=1.25 bonus for architecture/lesson/decision/concept/pattern types
- `collectBodies(items, readers)` — body reader with absolute-path containment guard
- `scanRegressions(claudeMdPath, tokens, n)` — CLAUDE.md regression-block token-grep
- `composeBrief(target, options)` — the orchestrator
- `renderBriefMarkdown(brief)` — markdown renderer
- `writeBrief(brief, opts)` — atomic disk persistence

### Reused engines

`build-brief` is a thin composer over existing engines — no new search/index logic, no new constants:

- `scripts/unit-knowledge-pack.mjs` — unit/milestone/slot resolver (2026-05-18 charlie U-UKP01)
- `scripts/lib/master-index-search-lib.mjs` — BM25-lite + tribal search lib (2026-05-15 echo, [[reference_subagent_per_task_presearch_2026_05_15]])
- `knowledge/wiki/architecture/_leaf-index.jsonl` — 28K-entry wiki leaf index, mtime-stable
- `knowledge/wiki/architecture/_embeddings.jsonl` — int8 nomic-embed-text vectors (not used directly here; used by wiki-precheck-inject for paraphrase fallback)

This is the [[wiki-automation-discipline]] applied — every artifact must propagate or it sits stagnant. `build-brief` is the propagation layer that turns "wiki leaf exists" into "wiki leaf body in the build context".

## Test invariants (34 cases)

Load-bearing fail-on-revert oracles:

- `parseArgs([])` pins DEFAULT_MAX_EXCERPT=1400, gitN=20, regrN=6, etc — silent default drift fails.
- `excerptBody` 200-case property fuzz with `maxChars` floor 100 — covers all 3 branches (no-op / plain-clip / sectioned); the invariant `out.length <= maxChars` holds for ALL inputs.
- `searchWikiLeaves` IDF score-ratio assertion `hits[0].score > hits[1].score * 2` — empirical ratio ≈4.36, removing IDF collapses to 1.0 → test fails.
- `searchWikiLeaves` LEAF_MEATY_MULT regression guard — architecture entry must outrank an action stub on equal token hits; lowering the multiplier to 1.0 breaks the assertion.
- `loadWikiLeafIndex` mtime cache — same mtime returns the same wrapper reference; changed mtime re-reads.
- `loadWikiLeafIndex` malformed JSONL → skip + continue (fail-soft, not throw).
- `collectBodies` path-traversal containment — `../../../etc/passwd` blocked.
- `composeBrief` topic-mode + unit-mode + searchImpl-throw fail-soft.
- Two real-repo E2E tests — direct `composeBrief("fleet reaper orphan reap classifier")` + subprocess `main()`.

## When NOT to use

- Pure literal-string searches (`Grep` is correct)
- Roadmap-status questions (`/build-state` is faster)
- Trivial lookups already covered by SessionStart auto-injections (~350 tokens for free)
- Inside the brief composition itself (would recurse)

## Related surfaces

- [[unit-knowledge-pack-2026-05-18]] — the unit/slot resolver this composer wraps
- [[subagent-per-task-presearch-2026-05-15]] — the search-lib shared with subagent spawn injection
- [[wiki-automation-discipline]] — the broader doctrine this artifact propagates
- `/deep-search` — search-first / reason-second / neural-last orchestrator (stage 1-4)
- `/master-index` — direct keyword query (stage 1 only)
- `/wiki-query` — single wiki entry body

## Provenance

- Built: 2026-05-19, slot juliett, BACKEND-DEV-LOOP `/loop` iter — unit `U-BUILD-BRIEF-KNOWLEDGE-PACK`
- Per-file scrutiny: 4 reviewers across 2 rounds — production PASS/PASS, test PASS/PASS
- Memory: [[reference_build_brief_2026_05_19]]
- CLAUDE.md pointer: `BACKEND-DEV-LOOP` section
- Skill manifest: `.claude/commands/build-brief.md`
- Production: `scripts/build-brief.mjs` (32.7K, 14 exports)
- Tests: `scripts/build-brief.test.mjs` (34 cases, all PASS)
