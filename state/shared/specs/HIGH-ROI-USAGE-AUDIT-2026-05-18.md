# High-ROI Usage Audit — Obsidian Brain, PRISM OS, System-Viz (2026-05-18)

**Slot:** charlie · **Author:** claude-de36f7ad · **Status:** advisory — needs operator review before any wiring change

## TL;DR

Three knowledge surfaces audited for live recall ROI:

| Surface | Size | Recall hits (9-day window) | Hit rate / item | Status |
|---|---|---|---|---|
| **Obsidian brain** | 306 .md (85 feedback + 221 reference) | 410 recalls | 1.34/item avg | **WORKING** (top entry: `MEMORY.md` index, 187 hits = 46%) |
| **System-viz** | 381 MB graph, 23,981 wiki/architecture entries | 154 wiki recalls + active injectors on every UserPromptSubmit | ~0.006/entry | **WORKING** but tail-heavy (Pareto: top-3 dominate) |
| **PRISM OS** | 32 .md (`knowledge/wiki/os/`) | **0 consumer hooks** | 0 | **ORPHAN** (built but never recalled) |

**Total recall events**: 564 across 246 unique entries (9-day window). 73% memory / 27% wiki.

## High-ROI patterns identified

### 1. MEMORY.md index hit 187× — by far the most-recalled artifact

`memory/source/MEMORY` accounts for **33% of all recalls** (187/564). That validates the indexed-pointer pattern: a single small index file with ~150 char pointers dominates recall because every UserPromptSubmit injects it.

**ROI multiplier:** keeping MEMORY.md ≤200 lines + dense pointers is paying off — this is the single highest-leverage knowledge artifact in PRISM. **Keep doing what we're doing here.** The size watchdog (`scripts/memory-size-watch.mjs`) protects this.

### 2. Top-10 non-index recalls cluster around 6-11 hits

After MEMORY.md, the distribution flattens to 6-11 hits per entry across:
- `reference_hook_orphan_reconcile_2026_05_17` (11)
- `reference_course_forge_conversions_2026_05_17` (11)
- `wiki/architecture/nn-graph-ms0` (9)
- `feedback_dont_wire_for_wiring_sake_2026_05_16` (6)
- `wiki/architecture/task-freshness-gate` (6)

**ROI multiplier:** recent (last 2-3 days) entries hit hardest — the recall hook's recency boost is working. Conclusion: **investing in fresh, well-named feedback/reference memories has compounding payoff**.

### 3. System-viz: 154 wiki recalls but 23,981 entries (0.6% coverage)

The system-viz graph has 23,981 architecture entries; only 154 wiki recalls in 9 days. That's a **very long tail** — most of the corpus is dormant. But the 154 hits are valuable because each one is a graph-aware target redirect (saving 50-80% tokens vs Glob/Grep).

**ROI multiplier:** the `viz-first-redirect`, `pre-read-graph-inject`, `master-index-precheck-inject` hooks ARE firing (verified — synergy probe upgrade earlier this session). The 0.6% coverage isn't a bug; it's correct behavior — most graph nodes are *targets*, not query keywords.

**Recommendation:** instrument `master-index-precheck-inject` with a per-query hit counter (similar to wiki-recall-counts.json) to see which graph nodes are queried most often. That'd surface the true high-ROI subset.

### 4. PRISM OS — ORPHAN (0 consumer hooks)

`knowledge/wiki/os/` contains 32 .md files (commands, pipelines, processes, runqueue, sessions, syscalls). **Zero hooks read it.** Only `scripts/validate-pipeline-registry.mjs` references it (validation only).

This is the **highest-leverage opportunity**: PRISM OS represents a structured "operating system" view of PRISM (commands as syscalls, pipelines as processes, sessions as runqueue) but nothing surfaces it to chats. Building a `prism-os-precheck-inject.mjs` hook would unlock recall on this entire surface.

**Without a consumer, PRISM OS is documentation only.** It would have to be queried via `Read` (high-cost) or `Grep` (which doesn't know its semantic structure).

## High-leverage actions ranked by ROI

| Rank | Action | Cost | Payoff |
|---|---|---|---|
| 1 | **Wire PRISM OS into UserPromptSubmit injection** | ~60 LOC for `prism-os-precheck-inject.mjs` + keyword-gated index | Unlocks 32 currently-dormant knowledge entries; mirrors the wiki-precheck pattern that's already producing 154 hits |
| 2 | **Instrument master-index with per-query hit counter** | ~30 LOC in `master-index-precheck-inject.mjs` | Reveals which graph queries are high-value; informs future curation |
| 3 | **Keep MEMORY.md pointer discipline** (already doing) | 0 (status quo) | Sustains the 33%-of-recalls flagship pattern |
| 4 | **Promote 80-day-old top-recalled feedback entries to MEMORY.md pointers** | ~10 LOC per entry as MEMORY.md index lines | If a memory hits 10+ times, it deserves a MEMORY.md anchor — currently only by-handwritten pointer policy |

## Data sources

- Wiki recall counts: `mcp-server/data/state/wiki-recall-counts.json` (564 total, 246 entries, 9-day window)
- Memory recall counts: same file (kind=memory entries)
- Surface sizes: `ls knowledge/memories/{feedback,reference}/`, `ls knowledge/wiki/os/`
- Hook references: grep across `.claude/hooks/*.mjs`
- System-viz size: `stat state/shared/system-viz/system-graph.json` = 381 MB
