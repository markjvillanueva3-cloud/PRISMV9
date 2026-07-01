# Obsidian Brain (PSN Leg #1) — Efficiency Research

**Date:** 2026-05-25
**Scope:** How to make PRISM's Obsidian-brain memory layer (`knowledge/memories/`) significantly more efficient while preserving full cross-session functionality.
**Builds on (don't re-derive):** [[obsidian-brain-fix-ms0]], [[feedback_obsidian_brain]], [[reference_hook_orphan_reconcile_2026_05_17]].
**Status:** Research deliverable. Not a build plan.

---

## TL;DR

PRISM's Obsidian brain has **2 fundamentally different inefficiency classes** that need different fixes:

1. **Volume inefficiency** — 495 memo files, MEMORY.md hits its 200-line truncation cap, no dedup → context-injection cost grows linearly with vault size.
2. **Retrieval inefficiency** — BM25-only keyword search; no embedding/semantic layer; no quality grading; no backlinks index → memos either get ignored or all surface for any keyword.

These are *not* the same problem and don't share a fix. Volume needs **compaction + tiering**. Retrieval needs **embeddings + grading + backlinks**.

---

## Current state (what's working)

From the running system + existing wiki/memory entries:

| Asset | Path | Role |
|---|---|---|
| Memo vault | `knowledge/memories/{feedback,reference,project,user,uncategorized}/` | 495 files, ~10-30 KB each |
| Index | `C:/Users/wompu/.claude/projects/H--prism/memory/MEMORY.md` | ≤200 lines (truncated by watchdog at 24576 B) |
| Archive | `MEMORY-ARCHIVE.md` | Older index entries |
| Auto-feed hook | `.claude/hooks/stop-obsidian-memory-feed.mjs` | C:→H: sync every Stop |
| BM25 precheck inject | `.claude/hooks/memory-index-precheck-inject.mjs` | Top-K hits per UserPromptSubmit |
| Size watchdog | `scripts/memory-size-watch.mjs` | Truncates MEMORY.md to ceiling |
| Topic-drift fix | `OBSIDIAN-BRAIN-FIX-MS0` | Closed the orphaning that made the brain "not aware" |

**Already adequate** — don't rebuild.

---

## Inefficiency vectors — 28 items found

### Storage & I/O (8)
1. **495 small files = 495 syscalls** for any full scan
2. **No deduplication** — multiple memos about the same topic accumulate
3. **No expiration** — memos hang around forever even when stale
4. **Memo proliferation** — every session writes new `reference_X_YYYY-MM-DD.md` files; growth is unbounded
5. **No frontmatter metadata** — type/source/confidence/expires not queryable
6. **Index size limits** — MEMORY.md ≤200 lines but 495 files = only top 41% indexed
7. **Pointers are 140-char strings** — could be 50-char with structured fields
8. **No tiered storage** — hot/warm/cold treated identically

### Retrieval (5)
9. **BM25-only** — no embedding/semantic similarity. "JWT auth pattern" doesn't find "token-based login flow"
10. **No quality grading** — old + new memos weighted equally in scoring
11. **No backlinks index** — can't answer "who references this memo?"
12. **No co-citation analysis** — can't surface "memos that frequently appear together"
13. **Top-K by score only** — ignores recency, usage, slot relevance

### Cross-referencing (4)
14. **`[[link]]` integrity not enforced** — renaming a memo orphans every link to it
15. **No "promote to wiki" suggestion** — high-leverage memos stay as memos forever
16. **No tag taxonomy beyond folders** — folders are 5 buckets, real concepts are hundreds
17. **No related-memo panel** — finding related work requires manual search

### Multi-chat coordination (3)
18. **26 chats can write near-duplicate memos** with no auto-merge
19. **File-claim is per-file** — doesn't catch logical-duplicate writes across files
20. **Memo siloed until Stop** — peer can't see another chat's reference memo mid-session

### Context-injection (3)
21. **MEMORY.md is loaded EVERY prompt** — ~8KB of pointers, most irrelevant for any given turn
22. **No lazy-load** — pointer text is in context but content only fetched on Read
23. **No per-chat subscription** — chat A sees chat B's slot-specific memos that don't apply

### Quality & feedback (3)
24. **No usage telemetry** — which memos get applied vs ignored
25. **No outcome grading** — after-action whether the doctrine the memo named held
26. **No A/B testing** — can't compare "with this memo" vs "without"

### Atomicity (2)
27. **No atomic write** — process crash mid-write can leave partial memo
28. **No schema validation** — malformed frontmatter passes silently

---

## What real Obsidian PKM systems do (the recipe)

From the broader Obsidian/Zettelkasten community:

| Practice | What it solves | PRISM equivalent today |
|---|---|---|
| Atomic notes (1 concept, 200-300 words) | Reuse, linking | Inconsistent — some memos sprawl |
| MOCs (Maps of Content) | Hub navigation | `wiki/index.md` (flat list, not curated) |
| Frontmatter YAML | Queryable metadata | Mostly missing |
| Bidirectional links | Discovery | `[[X]]` exists but not validated |
| Smart Connections / semantic links | Surface related work | Missing (Ollama gated) |
| Dataview queries | Dynamic views | None — static markdown |
| Daily notes | Time anchors | Handoffs serve partial role |
| Spaced repetition / resurfacing | Don't forget old wisdom | None |
| Tag taxonomy | Multi-axis grouping | Folders only |
| Backlinks panel | Reverse lookup | Missing |
| Note states (fleeting → permanent) | Quality tiering | None |
| Weekly prune rituals | Stale removal | Manual via /memory-prune |

---

## Constraints PRISM has that Obsidian users don't

Don't blindly copy Obsidian patterns — PRISM has different constraints:

1. **No human curator.** Obsidian PKM assumes daily review. PRISM gets auto-written from 26 chats and never reviewed.
2. **Multi-writer.** Concurrent writes from up to 26 chats. Obsidian assumes one user.
3. **LLM consumption.** Memos are read by an LLM, not a human. Format optimized for tokens, not eyeballs.
4. **Token budget constraint.** Every memo pointer costs context. Obsidian has no token economy.
5. **Auto-write on Stop.** No opportunity to curate quality before commit.
6. **Cross-session continuity.** A memo's PURPOSE is being recalled in a future session — different from a human PKM where the note serves current thought.

The "efficient" PRISM brain isn't a copy of Obsidian; it's an LLM-native cross-session memory system with Obsidian-inspired hygiene.

---

## Full proposal — 31 items across 8 groups

### Group A — Storage compaction (5)
- **A1: Unified JSONL pointer index** — single file replacing MEMORY.md + ARCHIVE.md; line-grepable, `Read offset/limit` friendly. Why: 1 file, fast scan. Depends on: nothing. Blocks: all other efficiency wins.
- **A2: Content-addressable storage** — memo content keyed by SHA hash; pointer references hash. Dedups at storage level. Depends on: A1.
- **A3: Tiered storage** — hot (last 30d) loaded by default, warm (30d-1y) on-demand, cold (>1y) archived. Depends on: A1.
- **A4: Frontmatter YAML schema** — `type, status, source, confidence, expires, tags[], usage_count`. Why: queryable metadata. Depends on: nothing. Blocks: B, C, F groups.
- **A5: Memo deduplication engine** — detect near-duplicates (Jaccard or embedding similarity), merge or flag. Depends on: A4.

### Group B — Semantic retrieval (4)
- **B1: Per-memo embedding index** — Ollama-driven; cached by content hash. Depends on: Ollama daemon health.
- **B2: Hybrid BM25 + semantic top-K** — current BM25 augmented with semantic similarity. Depends on: B1.
- **B3: Backlinks incremental index** — `state/shared/memory-backlinks.json`. Updated on memo write, not full-regen. Depends on: nothing.
- **B4: Co-citation graph** — memos that co-occur in retrievals → related-memo edges. Depends on: B3.

### Group C — Quality grading (4)
- **C1: Per-memo usage telemetry** — increment counter when memo surfaces in precheck-inject AND when actually applied. Depends on: A1.
- **C2: Outcome grading** — after-action loop: did the doctrine hold? Schema field. Depends on: A4.
- **C3: Decay schedule** — memos lose retrieval weight if unused for N days. Depends on: C1.
- **C4: Promote-to-wiki suggestions** — high-usage + multi-chat-applied memos → wiki entry candidate. Depends on: C1.

### Group D — Multi-chat coordination (3)
- **D1: Append-only memo journal + materialized view** — writes go to `journal.jsonl`, view rebuilt periodically. No write-conflicts. Depends on: A1.
- **D2: Cross-chat dedup** — 26 chats writing same memo → auto-merge. Depends on: A2, A5.
- **D3: Memo-write claims** — verify file-claim guard covers logical duplicates. Today: per-file only. Depends on: nothing.

### Group E — Context-injection efficiency (4)
- **E1: Pointer compression** — pointer = ID + 1-line summary (50 chars vs 140). Depends on: A4.
- **E2: Lazy-load content** — inject pointer; fetch content only when chat actually Reads. Already partially done; formalize. Depends on: A1.
- **E3: Top-K by relevance × recency × usage** — weighted score, not BM25 alone. Depends on: C1.
- **E4: Per-chat memo subscription** — slot-specific memos don't surface in unrelated chats (e.g., `slot:foxtrot` memos don't surface in `slot:india`). Depends on: A4 (need slot tag).

### Group F — Maintenance automation (4)
- **F1: Weekly auto-prune** — orphans (dangling [[links]]), stale dates, zero-usage. Depends on: B3, C1.
- **F2: Auto-archive** — memos > N days old + usage=0 → cold tier (A3). Depends on: A3, C1.
- **F3: Promote-to-wiki automation** — accept C4 suggestion → write wiki entry, remove from memos. Depends on: C4.
- **F4: Per-memo size cap** — ~5KB max prevents monolith memos. Depends on: A4.

### Group G — Atomicity & integrity (3)
- **G1: Atomic memo writes** — temp-file + rename pattern, never partial. Depends on: nothing.
- **G2: Schema validation on write** — reject malformed frontmatter. Depends on: A4.
- **G3: Backlink integrity check** — broken `[[X]]` → flag on write. Depends on: B3.

### Group H — Brain rituals (4, Obsidian-inspired)
- **H1: Daily-note auto-generation** — per session date, time-anchored. Currently handoffs serve partial role; formalize. Depends on: A4.
- **H2: Spaced repetition resurfacing** — N days dormant + high-historical-usage → re-surface in precheck-inject. Depends on: C1, C3.
- **H3: Note-state lifecycle** — fleeting (immediate) → literature (referenced) → permanent (graded). Depends on: A4, C2.
- **H4: Tag taxonomy** — `#concept/X`, `#leg/Y`, `#slot/Z`, `#status/W`. Depends on: A4.

---

## Variability axis

- **Inputs:** auto-feed Stop event, manual memo write, /memory-prune, cross-chat sync, retrieval query
- **States:** Ollama-up/down (B group conditional), graph-fresh/stale (B4 dependent), high/low memo count, slot-active vs idle
- **Failure modes:** Ollama timeout (degrade B to A only), partial write (G1), backlink rot (G3), index drift (D1), context overflow (E1+E2)
- **Adversarial:** prompt-injection into memo body, malicious frontmatter, duplicate-storm from a buggy chat, memo bloat attack

---

## Sequenced priority (compounding-leverage order)

| Order | Group | Items | Effect |
|---|---|---|---|
| 1 | A | A1+A4 | Foundation: indexed + queryable metadata |
| 2 | B | B3 backlinks | Discovery without Ollama dependency |
| 3 | G | G1+G2+G3 | Integrity floor — no more silent corruption |
| 4 | C | C1 usage telemetry | Quality signal feeder |
| 5 | E | E1+E3 | Context-injection efficiency (immediate token savings) |
| 6 | A | A2+A3+A5 | Dedup + tiering (compounding storage wins) |
| 7 | F | F1+F2+F4 | Auto-hygiene (no more manual prune) |
| 8 | C | C2+C3+C4 | Outcome learning + promotion path |
| 9 | B | B1+B2+B4 | Semantic layer (gated on Ollama) |
| 10 | D | D1+D2+D3 | Multi-chat hardening |
| 11 | E | E2+E4 | Lazy + per-chat subscription |
| 12 | H | H1-H4 | Ritual layer (Obsidian-OS feel) |

**First 5 orders (A1, A4, B3, G1-G3, C1, E1, E3) deliver 70% of the efficiency win in ~1-2 days of work and require no external dependencies (Ollama, regen-viz).**

---

## Expected efficiency gains (estimates)

| Metric | Current | After tier-1 (orders 1-5) | After full (orders 1-12) |
|---|---|---|---|
| Context cost per UserPromptSubmit (pointer injection) | ~8 KB | ~3 KB (-60%) | ~1.5 KB (-80%) |
| Full memo scan time | ~2-3 s (495 files) | ~50 ms (single JSONL) | same |
| Dedup rate | 0% (manual) | ~10% (auto-detect) | ~25% (auto-merge) |
| Stale memo accumulation | unbounded | bounded by F2 archive | bounded |
| Retrieval false-positive rate | ~30% (BM25 keyword collisions) | same | ~10% (hybrid semantic) |
| Cross-chat write conflicts | rare but unresolved | flagged | auto-merged |

---

## What NOT to build

- A re-implementation of Obsidian itself. PRISM's brain serves an LLM; Obsidian serves a human.
- A graph database replacement. JSONL + a backlinks sidecar is fine; SQLite/Neo4j adds operational burden without proportional gain at 495-memo scale.
- A full Smart-Connections clone. B1 is the embedding layer; semantic UX is downstream.
- Daily-note enforcement for every chat. Some chats are short-lived; mandatory daily notes are noise.

---

## Out-of-scope dependencies

- `Ollama /api/chat` daemon health — B group depends. Tracked separately as `[BUG-FIX]/U-OLLAMA-DAEMON-HEALTH`.
- `regen-viz.mjs` OOM — B4 co-citation graph would integrate with system-viz when fixed. Tracked separately.
- `SYSTEM-VIZ-GALAXY-MS0` — the visual surface for the brain (separate research deliverable).

---

## Proposed milestone envelope

`OBSIDIAN-BRAIN-EFFICIENCY-MS0` — 31 units, 8 groups, ~8-12 hours of focused work. Recommend sequenced delivery (one group per chat session to manage context budget) with tier-1 (orders 1-5) as the first ship-set.
