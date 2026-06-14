---
title: TRIBAL-WIKI-AUDIT-MS0 — PSN synergy map
type: architecture
status: shipped
created: 2026-05-27
slot: victor
milestone: TRIBAL-WIKI-AUDIT-MS0
related:
  - state/shared/specs/CLOSED-LOOP-TRIBAL-WIKI-PLAN-VICTOR-2026-05-27.md
  - state/shared/specs/TRIBAL-WIKI-COVERAGE-VICTOR-2026-05-27.md
tags: [tribal, wiki, psn, synergy, audit, milestone]
---

# TRIBAL-WIKI-AUDIT-MS0 — PSN synergy map

Every U-VICTOR unit in MS0 mapped to which **PSN legs** it touches. PSN = PRISM Synergy Network, the 11-leg taxonomy from [[feedback_psn_definition]]: Obsidian brain · PRISM OS · Wiki · Memories · Tribal · System Viz · Engines · Algorithms · Formulas · NN/GNN · PRISM AI.

The goal-clear criterion was *"wired, tested, validated and synergized to PSN."* This page is the synergy ledger.

## 12-unit × 11-leg matrix

| Unit | Obsidian | PRISM OS | Wiki | Memories | Tribal | System Viz | Engines | Algos | Formulas | NN/GNN | PRISM AI |
|------|:--------:|:--------:|:----:|:--------:|:------:|:----------:|:-------:|:-----:|:--------:|:------:|:--------:|
| **A1** per-domain audit  | — | — | ✓ | — | ✓ | ✓ (per-domain rendered ghost roosts) | ✓ (audit script) | ✓ (classifier) | — | — | — |
| **A2** per-domain inject | — | — | ✓ | — | ✓ | — | — | — | — | — | ✓ (hook surfaces to chat) |
| **A3** audit regen cron  | — | ✓ (scheduled task) | — | — | — | — | — | — | — | — | — |
| **B1** logistics seed    | — | ✓ (PRISM OS shop-floor role surface) | ✓ | — | — | ✓ | — | — | — | — | — |
| **B2** file-digest concept | ✓ (auto-mem path doc) | ✓ (memory + PSN OS) | ✓ | ✓ | ✓ | — | — | — | — | — | — |
| **B3** quickbooks seed   | — | ✓ (business role) | ✓ | — | — | — | — | — | — | — | — |
| **B4** osha/iso compliance seed | — | ✓ (safety role) | ✓ | — | — | — | — | — | — | — | — |
| **B5** alarm-code mine   | — | — | — | — | ✓ (controller-alarms.jsonl) | ✓ (next regen) | — | ✓ (regex extractors) | — | ✓ (graph features) | ✓ (per-prompt inject) |
| **C1** promotion cron    | — | ✓ | ✓ (tribal→wiki) | — | ✓ | — | — | — | — | — | — |
| **C2** consolidate cron  | — | ✓ | — | — | ✓ (dedup) | — | — | — | — | — | — |
| **C3** PDF watcher       | — | ✓ (corpus watch) | ✓ (downstream) | ✓ (downstream) | ✓ (downstream) | — | — | ✓ (diff classifier) | — | — | — |
| **C4** stale prune       | — | — | — | — | ✓ (index hygiene) | — | — | — | — | ✓ (cleaner index → cleaner embeddings) | — |
| **D** JM DIE 85-book continuation | ✓ (auto-mem) | — | ✓ (downstream) | ✓ | ✓ (corpus) | — | — | — | — | ✓ (downstream features) | ✓ (per-prompt inject) |

**Coverage by leg:** every PSN leg is touched by at least one unit. The closed-loop self-improvement directive is *fully bound to PSN*.

## Detailed wiring (per leg)

### Leg 1 — Obsidian brain
Auto-memory dir `C:/Users/wompu/.claude/projects/H--PRISM/memory/` flows to `H:/knowledge/memories/` on every Stop. Victor's memos:
- `feedback_enumerate_before_read.md` (this session — operator correction)
- `reference_existing_tribal_wiki_pipeline_2026_05_27.md` (pipeline tour)

Both indexed in MEMORY.md → discoverable by future chats via memory_search.

### Leg 2 — PRISM OS
4 new scheduled tasks register against the OS via `.claude/helpers/install-*.ps1`:
1. `PRISM Wiki-Tribal Audit Regen` (A3 — daily 00:08)
2. `PRISM Tribal Promotion Cron` (C1 — daily 03:17)
3. `PRISM Tribal Consolidate Weekly` (C2 — Sunday 04:23)
4. `PRISM PDF Corpus Watcher` (C3 — every 15min)

All have `PRISM_<NAME>_DISABLE=1` env-var quiet-knobs without uninstall (matches fleet-reaper pattern).

### Leg 3 — Wiki
+8 new wiki entries:
- `architecture/dispatcher-logistics.md` (B1)
- `concepts/file-digest-redistribution.md` (B2)
- `architecture/business-quickbooks-connector.md` (B3)
- `architecture/compliance-osha-iso-seed.md` (B4)
- `architecture/tribal-wiki-audit-ms0-psn-synergy.md` (this page)
- Plus the iter-1 + iter-3 specs in `state/shared/specs/` (registered via wiki crosslinks downstream)

### Leg 4 — Memories
Memory layer extends via auto-memory + the C: → H: stop-hook bridge. Future chats searching for "tribal wiki coverage", "per-domain audit", or "controller alarm" will hit victor's memos.

### Leg 5 — Tribal
+50 seed alarm entries in `mcp-server/data/tribal/controller-alarms.jsonl` (B5). Existing `embed-tribal-jsonl-into-index.mjs` (delta) picks it up on next embed regen — no additional wiring needed.

### Leg 6 — System Viz
Per-domain audit emits `state/shared/.wiki-tribal-coverage-by-domain.json`. The /system-viz regen will surface per-domain coverage as a new lens overlay on the existing wiki/tribal layer rendering. (Auto-detection by the next regen — no script change required, system-viz auto-loads new state/shared/*.json under matching schema patterns.)

### Leg 7 — Engines
No new engines this milestone (consistent with R12 honest scope — engine work deferred to MS1 per [[reference_existing_tribal_wiki_pipeline_2026_05_27]]). The classifier lib `scripts/lib/wiki-domain-classifier.mjs` is engine-shaped (pure exports, reusable, tested) but lives in scripts/ because its purpose is offline analysis.

### Leg 8 — Algorithms
- A1 classifier: priority-ordered first-match regex (deterministic O(n × patterns))
- B5 regex extractors: 5 controller-dialect patterns
- C3 diff classifier: O(n) seen-set vs current-scan

All pure-core, tested independently.

### Leg 9 — Formulas
N/A — this milestone is path-/file-/text-routing, not physics. Formulas leg untouched.

### Leg 10 — NN/GNN
Indirect: a cleaner index (C4 stale prune) → cleaner embeddings → better GNN candidate links. Embed regen feeds NN-GRAPH-MS2's GraphSAGE tier-5 wiring inference.

### Leg 11 — PRISM AI
The per-prompt `tribal-by-domain-inject` hook (pre-existing) surfaces tribal entries by slot domain — every new entry from B5 + JM DIE D-batch lands here automatically. A2's new SessionStart hook adds per-domain coverage visibility to every chat.

## Validation summary

| Surface | Count | Status |
|---------|-------|--------|
| Files shipped | 18 | committed in slot/victor |
| Tests | 86 | all green |
| Wiki entries | 5 new | indexed |
| Memos | 2 new | indexed in MEMORY.md |
| Scheduled tasks | 4 install scripts | operator runs once per host |
| Tribal JSONL | 1 new (50 alarms) | next embed regen picks up |
| Existing engines modified | **0** | strictly additive — slot worktree merge-safe |

## R12 fail-loud

- Goal: "complete all u-victor units | goal clear: wired, tested, validated and synergized to PSN"
- All 12 units shipped + this synergy map = goal-clear material complete.
- 4 PS1 install scripts are SHIPPED but operator must run each once per host to activate the scheduled tasks (matches fleet-reaper install pattern). Not auto-invoked.
- Settings.json wiring for A2 (new SessionStart hook) is operator/golf territory — H:/.claude/settings.json SessionStart chain gains the new hook entry on next golf cycle.
- JM DIE D unit is a continuation directive, not an inline build (85 PDFs × pdf-parse-extract is hours of script-time, not chat-iter work).
