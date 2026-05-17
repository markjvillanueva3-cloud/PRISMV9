---
title: PRISM Dev-Pipeline Toolbox — consolidated reader-index
tags: [architecture, dev-tools, doctrine, search-first, ollama, fleet-hygiene, hooks, token-savings]
created: 2026-05-17
slot: lima
chat: claude-77971357
shipped-with: /forge-audit-v2 token-savings (follow-on)
sibling-memory: reference_dev_pipeline_toolbox_2026_05_17
---

# PRISM dev-pipeline toolbox

The companion to the 2026-05-17 token-savings audit. The audit's central
finding: **PRISM tooling is writer-without-reader** — measurement systems,
caches, suggesters, and search surfaces exist, but the consumer/reader step is
unwired so chats re-derive instead of consulting. This page is the reader-index.

## Why this exists

A new chat post-/compact has ~387 user skills + ~226 project skills + 422
scripts + 523 hooks available and almost no way to know which to use. It
defaults to Grep/Glob/Agent and re-derives what `/system-viz` already indexes.
This page + its sibling memory ([[reference_dev_pipeline_toolbox_2026_05_17]])
are the discovery layer.

## The 7 sections (full detail in the sibling memory)

| # | Surface | One-line | Entry point |
|---|---------|----------|-------------|
| 1 | Search-first | /system-viz before Grep/Glob | `node scripts/system-viz-query.mjs find <kw>` |
| 2 | META measurement | re-runnable health rankers | `scripts/*-rank.mjs` / `*-watch.mjs` |
| 3 | Pipelines | autonomous dev loop | `/checkin-<nato> /loop <task>` · `/forge-audit-v2` |
| 4 | Ollama-when | route mechanical text off Claude | `/ollama-*` · `aiSystemRouterEngine.route()` |
| 5 | Zombie/orphan | live OOM risk mitigation | `/fleet-reaper` (golf owns) |
| 6 | Hook reality | 523 on disk, ~10 fire | `node scripts/hook-fire-rank.mjs` |
| 7 | Doctrine | writer-without-reader is the failure mode | check the consumer is wired |

## Search-first doctrine (section 1, load-bearing)

Before Grep/Glob/Agent, query the 10-layer system-viz graph (~145K nodes):

```bash
node scripts/system-viz-query.mjs find <keyword>   # is X built/wired/orphan
node scripts/system-viz-query.mjs headline          # live counts
node scripts/system-viz-query.mjs coverage-by-domain
```

`/master-index <q>` is the unified search (graph + Obsidian + capability index +
BUILD_STATE). The `audit-viz-first.mjs` hook auto-runs `find` before Grep when
intent=audit. Grep/Glob is the fallback at confidence <0.5, not the default.

## META measurement compounding (section 2)

The audit's own deliverable, `scripts/token-savings-rank.mjs`, is the model:
re-runnable, exits 0/1/2/3, appends a history jsonl for week-over-week drift.
Siblings: `synergy-regression-watch.mjs`, `memory-size-watch.mjs`,
`hook-fire-rank.mjs`, `node-staleness-rank.mjs`, `dev-tool-leverage-rank.mjs`,
`stale-milestone-rank.mjs`. **Run the relevant ranker before building** so you
know the live baseline instead of guessing.

## Fleet hygiene (section 5, CRITICAL)

13 concurrent chats orphan node/bash/git children on crash → commit-memory
pressure → surviving chats OOM. Live 2026-05-17: golf advisory named /compact
targets for 11h; one chat already OOM-crashed. `/fleet-reaper` (golf-owned per
[[feedback_golf_owns_reaper]]) + Fleet Memory Monitor
([[reference_fleet_memory_monitor_2026_05_16]]) mitigate. When golf posts a
MEMORY ADVISORY naming a PID, that window should `/clear` (preferred over
`/compact` per CLEAR-NOT-COMPACT doctrine — 11 bypass systems carry state).

## F5 hook fix shipped alongside this

`error-pattern-promote.mjs` fired ~2400×/17d at 99.83% no-op, paying a full
JSONL read+parse every Stop. Fixed with a size+mtime memo guard skipping the
full work when the ledger is byte-identical and the last decision was a no-op.
Pure decision core extracted to `.claude/hooks/lib/error-pattern-memo-guard.mjs`
(9-case node:test, both per-file scrutiny arms PASS). **Reusable pattern**: any
high-fire low-yield hook → memoize the no-op path on an unchanged-input guard.

## Cross-refs

- Sibling memory: [[reference_dev_pipeline_toolbox_2026_05_17]]
- Audit: `state/shared/specs/AUDIT-TOKEN-SAVINGS-2026-05-17.md` · [[audit-token-savings-2026-05-17]]
- META: `scripts/token-savings-rank.mjs`
- Doctrine sources: [[feedback_system_viz_first_audit]] · [[feedback_ollama_docker_pipeline_dead_code_2026_05_16]] · [[feedback_golf_owns_reaper]]
- F5 fix: `.claude/hooks/error-pattern-promote.mjs` + `lib/error-pattern-memo-guard.mjs`
