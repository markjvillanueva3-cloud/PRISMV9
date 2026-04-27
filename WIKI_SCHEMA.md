# PRISM Wiki Schema — Karpathy LLM-Wiki Pattern Adapted to PRISM

> **Source:** Andrej Karpathy's LLM-Wiki document (popularized by [@defileo](https://x.com/defileo/status/2042241063612502162)).
> **Adopted:** 2026-04-27 in milestone `KNOWLEDGE-WIKI-MS0` / `U-WIKI01`.
> **Vault location:** `H:/prism/knowledge/` (existing — extends OBSIDIAN-MS0 wiring).

This document codifies the wiki maintenance protocol for ALL agents (Claude, Codex, Ollama) operating on the PRISM wiki. Read it before performing ingest/query/lint operations on `H:/prism/knowledge/wiki/`.

---

## 1. The Core Idea

Most RAG systems re-derive knowledge on every query. The wiki is different: **the LLM incrementally builds and maintains a persistent markdown wiki**, so knowledge compiles once and stays current. The wiki is a compounding artifact — cross-references, contradictions, and synthesis already in place.

**Reasons to use wiki vs raw search:**
- A 500-page wiki answers more questions than 10,000 raw sources
- Contradictions surface during ingest, not at query time
- Multi-chat coordination becomes possible (one shared knowledge layer)
- Token cost amortizes — write once, read N times

**Reasons NOT to use wiki:**
- One-off queries with no recurring use
- Highly volatile data (real-time machine telemetry)
- Information that already lives in canonical source (physics constants, registries)

---

## 2. Three Layers

### 2.1 Raw Sources (`H:/prism/knowledge/raw/`)
- Immutable. The LLM reads but **never modifies**.
- Examples: PDF manuals, harvested articles, tribal tip exports, customer call transcripts, blueprint OCR output.
- Every wiki page MUST cite at least one raw source OR a canonical PRISM source (engine, formula, registry).

### 2.2 Wiki (`H:/prism/knowledge/wiki/`)
- LLM-owned markdown. Created, updated, cross-referenced, lint-flagged by agents.
- You read it; the LLM writes it.
- Subdirectories (semantic, not file-system-rigid):
  - `concepts/` — domain concepts (force, thermal, surface, stability, …)
  - `entities/` — customers, machines, materials, tools (ITW.md, Mazak-VM-855.md, Ti-6Al-4V.md)
  - `decisions/` — synthesis outputs from Creative Reasoning + AGI master facades
  - `patterns/` — DL/ML pattern outputs from CrossDisciplinaryDeepLearningEngine; LoRA adapter telemetry
  - `trajectories/` — SONA reinforcement trajectories keyed by date
  - `summaries/` — per-source ingest summaries
  - `code-tribal/` — coding-pattern tribal knowledge from feedback memories
  - `architecture/` — PipelineArchitecture, plugin patterns, distributed locking
  - `software-engineering/` — SOLID, completeness gates, test legitimacy
  - `ux-design/` — frontend feedback memories, web/page audits
  - `lessons/` — error→recovery patterns from CADTrialErrorLearningEngine + LessonRendererEngine

### 2.3 Schema (this document + `H:/prism/CLAUDE.md` + `~/.claude/CLAUDE.md`)
- The protocol the LLM follows.
- Co-evolves with the wiki — when conventions change, update this file FIRST.

---

## 3. Three Operations

### 3.1 INGEST — `prism_wiki:ingest`

Pipeline (5 stages, model-routed per WikiIngestRouterEngine):

| Stage | Op | Model | Cost |
|---|---|---|---|
| 1 | Read raw source via `prism_knowledge:learn_ingest_*` | (existing infra) | I/O only |
| 2 | Summarize (200-500 words) | **Ollama qwen2.5-coder:7b** | free |
| 3 | Suggest cross-refs against existing pages | **Ollama qwen2.5-coder:7b** | free |
| 4 | Synthesize + resolve contradictions | **Claude (Sonnet/Opus)** | paid |
| 5 | File via WikiIndexMaintainer + WikiLogAppender | (existing engines) | I/O only |

Target: **≥70% of total ingest tokens via Ollama.**

### 3.2 QUERY — `prism_wiki:query`

Pipeline:
1. **HNSW similarity** against `wiki/index.md` semantic index (Ollama embed, free)
2. Read top 1-3 wiki pages (cheap)
3. **Synthesize answer** with citations to wiki page IDs (Claude — only step that needs reasoning)
4. Optionally file the synthesis back as a new `wiki/decisions/*.md` page

### 3.3 LINT — `prism_wiki:lint`

Periodic health check. Detects:
- **Orphan pages** — zero inbound `[[wikilinks]]`
- **Broken cross-refs** — link points to nonexistent page or dead engine path
- **Stale claims** — page mtime older than referenced source mtime
- **Missing concepts** — a term mentioned ≥3 times across pages but lacking a dedicated page
- **Physics drift** — page asserts a constant that disagrees with `src/physics/constants.ts` by >2%
- **Wiki-vs-wiki contradictions** — pairwise NLI check across pages on same topic

Severity scale: **MINOR (2-5% drift) | MAJOR (5-10%) | CRITICAL (>10%) | BROKEN (orphan/dead-ref)**.

Output: `lint-reports/YYYY-MM-DD.md` with `[CRITICAL|MAJOR|MINOR|BROKEN]` prefix per finding.

---

## 4. Two Index Files

### 4.1 `index.md` — Content Catalog
- LLM-edited, append-on-event (NOT regenerated).
- Every wiki page gets one line: `- [[page-name]] — one-line summary | category:X | source-count:N | confidence:0.85 | last_verified:2026-04-27`
- Owned by `WikiIndexMaintainerEngine`. Atomic writes via `prism_context:claim_file` lock.
- Sorted by category, then alphabetically within category.

### 4.2 `log.md` — Chronological Audit Trail
- Append-only. Grep-friendly prefix: `## [YYYY-MM-DD] op | title | by:claude-{id}`
- Owned by `WikiLogAppenderEngine`.
- Use: `grep '^## \[' log.md | tail -10` for last 10 events.

---

## 5. Frontmatter Spec (every wiki page)

```yaml
---
title: Page Title
category: concept | entity | decision | pattern | trajectory | summary | code-tribal | architecture | software-engineering | ux-design | lesson
sources: [src/engines/X.ts, raw/articles/Y.md, formula:F-1234]
confidence: 0.0-1.0
last_verified: 2026-04-27
author: claude | ollama | hybrid
verified_by: claude-{id}                          # required if author=ollama AND confidence>0.6
quote_lineage: []                                  # paraphrase-laundering tracker
tags: [tag1, tag2]
related: [[other-page-1]], [[other-page-2]]
---
```

**Hard rules:**
- Ollama-authored pages cap at **confidence: 0.6** until Claude-verified (`verified_by` set).
- Pages with `confidence > 0.6` AND `author: ollama` AND no `verified_by` → CRITICAL lint flag.
- Every claim citing a physics constant MUST include the formula ID in `sources`.

**Field checklist (enforced by `WikiLintEngine`):**
- `title` — required, 5-80 chars
- `category` — required, must match the §8 enum exactly
- `sources` — required, ≥1 entry; each must resolve (file path, registry id, or `formula:F-XXXX`)
- `confidence` — required, 0.0-1.0
- `last_verified` — required, ISO date (`YYYY-MM-DD`)
- `author` — required: `claude` | `ollama` | `hybrid`
- `verified_by` — required IF `author=ollama` AND `confidence>0.6`; format `^(claude|codex)-[0-9a-f]{8}$`
- `quote_lineage` — array of `{ source, paraphrased_by, depth }`; depth caps at 3
- `tags` — optional
- `related` — optional, wikilinks: `[[other-page]]`

**Page-size guidance:** target 500-2000 words. Pages under 500 words usually belong merged into an existing concept page; pages over 2000 words usually need splitting along a sub-topic boundary.

**Trajectory retention:** `trajectories/` keeps 30 days at full fidelity. After 30 days, `WikiLogAppenderEngine` summarizes the trajectory into a `decisions/` page and prunes the raw entry. Trajectories cited from a still-live decision page are exempt from pruning.

---

## 6. Multi-Chat Coordination Rules

PRISM runs ~6 concurrent Claude sessions + Codex agents. The wiki is shared.

1. **All wiki writes acquire a file lock** via `prism_context:claim_file` BEFORE writing. Lock TTL: 60s. Release after write.
2. **All log entries carry chat attribution**: `by:claude-{id}` in the prefix.
3. **chat_post broadcast** required before non-trivial ingest of a new domain (not for routine query-fileback).
4. **Conflict resolution**: if two chats edit the same page within 60s, the second-to-write merges via 3-way diff against `index.md` snapshot, NOT clobbers.
5. **Cross-chat hallucination guard**: paraphrase-laundering surfaces via `quote_lineage` field — every claim chain must terminate at an external `source`.
6. **Stale-lock reaper**: locks default to 60s TTL. After 90s with no heartbeat update from the holder, any chat MAY force-release via `prism_context:claim_release --force` and log a `lock-reap` event in `log.md`. Reapers MUST verify the holder PID is dead before reaping; if the holder is alive but the lock is stale, escalate to `chat_post` and do NOT reap.
7. **Conflict-winner rule (3-way merge)**: when two chats race past the lock check, `WikiIndexMaintainerEngine` resolves with this priority: (a) latest `last_verified` timestamp wins on ties, (b) larger `sources` array wins, (c) content hash is preferred over the chronologically older write. The losing chat's content is preserved in `wiki/conflicts/YYYY-MM-DD-{slug}-{shortHash}.md` for human review — never silently discarded.
8. **`verified_by` format**: must match `^(claude|codex)-[0-9a-f]{8}$` (8-char chat instance id from `stable-session-id.mjs`). `WikiLintEngine` flags any other value as CRITICAL — unverified ollama pages with `confidence > 0.6` are quarantined into `wiki/quarantine/` until a Claude chat verifies and stamps them.
9. **`quote_lineage` schema**: array of objects `{ source, paraphrased_by, depth }`. Every claim must trace through `quote_lineage` to a `source` listed in the page's `sources` array. Lineages with `depth > 3` trigger a MAJOR lint flag — the chain has likely lost grounding.

---

## 7. Ollama vs Claude Responsibility Split

**Ollama owns** (≥70% of wiki maintenance):
- Source summarization (200-500 word ingest summary)
- Index entry drafting
- Cross-reference suggestion
- Orphan page detection
- Stale claim candidate detection (Ollama flags, Claude resolves)
- Cluster naming for tribal tip ingests
- Per-source narrative for time-series outputs
- HNSW embedding generation
- Pairwise NLI check for wiki-vs-wiki contradictions

**Claude owns** (high-value reasoning):
- Synthesis (multi-source)
- Contradiction resolution (after Ollama flags candidates)
- Schema evolution (this doc — only Claude edits)
- Novel concept page creation
- Controversial wiki edits requiring shop-floor expertise
- Cascade revert orchestration

---

## 8. Naming Conventions

- **Page filenames**: lowercase-kebab-case, no extensions in wikilinks (`[[force-kienzle]]` not `[[force-kienzle.md]]`)
- **Categories**: kebab-case in frontmatter — must match directory names exactly (`code-tribal`, `software-engineering`, `ux-design`)
- **Wiki-page IDs in citations**: `wiki:category/page-name` (e.g. `wiki:concepts/force-kienzle`)
- **Decision pages from AGI runs**: `decisions/agi-{system}-{taskId}.md` (e.g. `agi-mill-ABC123.md`)
- **LoRA pattern pages**: `patterns/lora-{adapter-name}.md`
- **Trajectory pages**: `trajectories/{YYYY-MM-DD}/{taskId}.md`

---

## 9. Deprecation Path for `ollama-obsidian-rag.mjs`

`H:/prism/.claude/hooks/ollama-obsidian-rag.mjs` currently does RAG-on-every-query against the vault — Karpathy's anti-pattern. The new wiki layer is **additive**:

- Phase 1 (now): wiki layer ships alongside the RAG hook. Both work.
- Phase 2 (after U-WIKI06 dispatcher ships): operators prefer `/wiki-query` over the RAG hook.
- Phase 3 (after lint stable for 30 days): RAG hook deprecated to advisory-only.
- Phase 4 (next milestone): RAG hook removed. Wiki is sole knowledge layer.

---

## 10. Quick Reference Card

```bash
# Ingest a new article
/wiki-ingest path/to/article.md

# Query the wiki
/wiki-query "what's the right RPM for Inconel 718 finishing?"

# Health check (orphans, drift, contradictions)
/wiki-lint

# Morning briefing (Karpathy pattern)
/wiki-morning

# Sync to Obsidian vault for visual browsing
/wiki-sync

# Open or create a specific page
/wiki-page concepts/force-kienzle
```

---

## 11. Sources

- Karpathy LLM-Wiki document (full text in `data/docs/external/karpathy-llm-wiki.md`)
- @defileo viral thread: https://x.com/defileo/status/2042241063612502162 (6.7M views)
- OBSIDIAN-MS0 milestone (complete) — sync engines this builds on
- KNOWLEDGE-WIKI-MS0 envelope — full unit-by-unit plan

---

_Schema version 1.1 — co-evolves with the wiki. Edit this file when conventions change._
