# 07 — /system-viz + PSN + Obsidian + Wiki/Memory Injection Audit
**Slot**: india · **Date**: 2026-05-26 · **Method**: state-file + hook-source inspection · **Karpathy R12**: fail loud

## Q1 — /system-viz regen failure
- **Last failure**: `state/shared/system-viz/.last-regen-failure.json` — 2026-05-26T16:20:43Z, **exit 134** (SIGABRT), stage **merge augmentations**, durationMs 411,436 (~7min), stderr tail = V8 fatal heap (`v8::internal::Version::GetString+435083`).
- **Last success**: 2026-05-23T22:00:30Z — graphBytes **519,458,359 (~496MB)**, durationMs 456,626. **Real age = 62h**, NOT the 2.2h the SessionStart banner reports.
- **Banner lies**: `system-graph.json` mtime is 0:08 today (11.7h, 542MB) — a partial write from a failed regen overwrote the good graph; banner reads mtime, not `.last-successful-regen.json`.
- **Root cause**: `merge-augmentations.mjs` loads ~496MB JSON into heap; 54 generators produce ≥20 augmentations, each merged in-process. Node default heap 4GB; `_tmp.system-graph.json.<pid>` partial = **405MB** sitting in dir = crash mid-merge.
- **R12**: System documented as "live regen substrate" — operationally **3 days stale** + producing corrupt partials.

## Q2 — PSN leg-state
- **No persisted `state/shared/psn/leg-state.json`** — file does not exist. Each `psn-leg-state-inject.mjs` UserPromptSubmit re-computes 6 leg states from raw sources (memStat, graphStat, nnEvalPath, .knowledge-link-audit.json, tribalStat, PRISM-INVENTORY-LATEST.md).
- **Concerning legs**:
  - **SystemViz** — graphStat reads stale 542MB file (mtime 11.7h) but actual content is 62h+ stale + corrupted partial (Q1).
  - **Memories** — `C:/Users/wompu/.claude/projects/H--prism/memory` — auto-feed broken (Q3).
  - **Wiki** — 4136 broken targets (Q4).
  - **Tribal** — file fresh but coverage anomaly (Q5).
- **PSN/ dir contains only** `cad-action-nodes.jsonl` — no leg-state index at all.

## Q3 — Obsidian feed cadence
- `state/shared/obsidian-memory-sync-hook.log` — **mtime 2026-05-05 20:56**, age **494.9h ≈ 20.6 days**.
- `state/shared/obsidian-memory-sync.log` — **mtime 2026-05-05 08:02**, age **507.8h ≈ 21.2 days**.
- Doctrine (CLAUDE.md §Doc reflection rule): *"writing an auto-memory file feeds the Obsidian vault on the next Stop via `.claude/hooks/stop-obsidian-memory-feed.mjs`"*.
- **Operationally dead 20+ days**. Either hook is unwired, throttle is jammed, or O_EXCL lock leak. Memory writes are silently NOT feeding Obsidian.
- R12: documented as "every Stop", actually fires never.

## Q4 — Wiki broken-link top targets
From `.knowledge-link-audit.json` (4,136 broken / 97,673 tokens = 4.2%):
1. `skills/<nato>` — `bravo`, `charlie`, `echo`, `foxtrot`, `disabled`, `corrupted` (from `_legacy-root/feedback_*` files — pre-2026-05-15 paths after vault re-org).
2. `learning-from-mistakes` (duplicate, 2× hits, anchors a missing canonical leaf).
3. `audit-viz-first-skill`, `OCTOPUS-NEURAL-MS0`, `SKILLS-UTILIZATION-MS0` — from `_index/MEMORY.md` — pointer-index lookup misses.
4. `other-memo-slug` — placeholder text left in feedback file.
5. `skills/fleet-reaper-bake-in`, `skills/checkin-` — orphan trailing-dash, never renamed.
- **Pattern**: `_legacy-root/` files are migration debris with stale targets; the live `index/MEMORY.md` itself has broken pointers — pointer-index restructure (2026-05-19) introduced 3 dead refs.

## Q5 — Tribal embedding "0.8%"
- **The embedder script EXISTS and IS RUNNING**: `.claude/scripts/tribal-embed-index.mjs` (L1 of TRIBAL×AI stack). Index file `state/shared/tribal-embed-index.json` is **0.1h fresh, 192MB** — actively rebuilt today.
- **Coverage denominator anomaly**: script embeds 4 corpora — wiki + memories + extraction-log + Obsidian — NOT engines (3,538) or tribal-tips (3,919) or actions. "0.8%" likely measured against a wider universe (full system-graph nodes) where most nodes have no markdown source.
- **38+ `.tmp` files** in `state/shared/` (concurrent-write debris from parallel rebuilds) — atomic-write rename leaking — race-condition pollution.
- **Not broken, mis-measured.** But the tmp-leak is real: ~140 leaked `.tmp` files visible.

## Q6 — Article incorporation → ≤4 units
1. **U-VIZ-REGEN-HEAP-FIX** (P0) — Lean+filter (article L3): `merge-augmentations.mjs` must stream-merge (NDJSON-per-augmentation → incremental write) instead of in-process map merge. Add `--max-old-space-size=8192` interim. **Fail loud**: regen-status banner reads `.last-successful-regen.json.graphMtime`, not on-disk mtime.
2. **U-OBSIDIAN-FEED-RESURRECT** (P0) — NEW-file review-gate (article L4): audit `stop-obsidian-memory-feed.mjs` wiring + throttle + lock; add liveness probe = "last-write-age <24h" surfaced in PSN leg-state inject. Block Stop if Obsidian leg goes >48h dark.
3. **U-WIKI-LINK-CLEAN-LEGACY-ROOT** (P1) — Lean+filter: delete or re-target the `_legacy-root/feedback_*.md` `skills/<nato>` orphans + 3 `_index/MEMORY.md` dead pointers; collapse 4.2% → <1%.
4. **U-TRIBAL-EMBED-TMP-REAP + COVERAGE-METRIC** (P2) — Review-gate: reap leaked `tribal-embed-index.json.*.tmp` (atomic-write needs PID-tracked cleanup); re-define "coverage" to be corpus-relative (currently engine+action denominator skews to 0.8%).

---
**Files inspected**: `.last-regen-failure.json`, `.last-successful-regen.json`, `.regen-viz-full.log`, `psn-leg-state-inject.mjs`, `.knowledge-link-audit.json`, `tribal-embed-index.mjs`, `obsidian-memory-sync-hook.log`. **Tool calls**: 10.
