---
name: reference-combo-efficiency-followups-2026-05-25
description: COMBO-EFFICIENCY-MS0 follow-ups shipped (slot:alpha, 2026-05-25) — bridge-priority viz, wiki-link auto-applier, cron installer
metadata:
  type: reference
---

# COMBO-EFFICIENCY-MS0 follow-ups (slot:alpha, 2026-05-25)

**Goal:** "complete all followups. wired, active and synergized to psn + /system-viz" (autonomous /loop).

Builds on [[reference_combo_efficiency_ms0_2026_05_25]] (the 6/6 unit ship) +
[[reference_combo_efficiency_p1_u01_2026_05_25]] (take-rate root cause).

## What shipped this session

3 follow-ups, each wired+active+synergized:

### 1. P1-U03 viz wire — bridge-priority roost in /system-viz
- `scripts/generate-bridge-priority-features.mjs` (+ 20/20 tests)
- Registered in `scripts/regen-viz.mjs` FAST[]
- Spliced in `scripts/merge-augmentations.mjs` (loadOptional + splice block + version)
- Emits `ghost.bridge_priority` roost + tier-coloured `ghost.unwired-bridge.<safeid>` children
- Tier-color: platinum/gold/silver/fringe with 💎/🌟/🥈/⚪ icons
- Reads `state/shared/UNWIRED-BRIDGES-TOP10.json` (P1-U03 output)
- **Active:** next `node scripts/regen-viz.mjs` produces the bridge_priority roost in `system-graph.json`

### 2. P1-U02 auto-applier — `wiki-link-fix-apply.mjs`
- `scripts/wiki-link-fix-apply.mjs` (+ 32/32 tests)
- Consumes `wiki-link-fix-candidates.json` from the suggester
- DRY RUN default + `--apply` required + knowledge/ safety perimeter + idempotent + max-edits cap + per-file backup option
- Stop-on-first-write-error (never partially corrupt)
- Pure exports: `buildReplacementToken`, `eligibleCandidate`, `applyReplacementToText`, `inSafetyPerimeter`
- Pipe-alias form `[[X|alt]]` untouched (audit doesn't track aliases)
- **Active:** consumes the suggester output and produces `state/shared/wiki-link-fix-apply-report.json`

### 3. Cron installer — 4 scheduled tasks
- `.claude/helpers/install-combo-efficiency-tasks.ps1` (~140 LOC PowerShell)
- 4 Windows scheduled tasks registered via S4U principal:
  - `PRISM Combo Efficiency Baseline` — every 5min @ phase +180s (P0-U02)
  - `PRISM Combo Efficiency Dashboard` — every 5min @ phase +210s (P2-U01, 30s after baseline)
  - `PRISM Wiki Link Healer Suggest` — daily 02:17 (full 4136-link batch)
  - `PRISM Wiki Link Healer Apply` — daily 02:23 (DRY-RUN by default — operator must add `--apply`)
- Phase offsets avoid contention with fleet-reaper (+210s base) + fleet-memory-monitor (+330s)
- Suggester→apply 6min gap so candidates JSON exists before applier reads
- `-Unregister` flag for clean uninstall
- **Active:** install once → self-tuning loop runs autonomously

## Deferred follow-up (explicit, scoped)

**P1-U02 Ollama stage-2 (semantic match for ambiguous):** Suggester's stage-1
structural scorer catches ~70% of broken links at HIGH confidence (renames,
case drift, prefix/substring matches). Ollama stage-2 would address the
remaining ~30% (conceptual matches where slug similarity is low but semantic
intent matches). Purely incremental quality boost — not a wiring/synergy
concern. Suggester has `PRISM_WIKI_LINK_FIX_OLLAMA_OFF` knob already wired
as opt-out scaffolding. Pickup hint: extend `rankCandidates()` to invoke
Ollama via `ollama-hook-bridge.mjs` when stage-1 returns 0 above LOW_CONFIDENCE.

## Commits this session (4 new)

- `(slot/alpha)` `[COMBO-EFFICIENCY-MS0]/P1-U03-VIZ-WIRE`: bridge-priority generator + regen-viz + merge-augmentations splice
- `(slot/alpha)` `[COMBO-EFFICIENCY-MS0]/P1-U02-AUTO-APPLY`: wiki-link auto-applier with safety contracts
- `(slot/alpha)` `[COMBO-EFFICIENCY-MS0]/CRON-INSTALL`: PowerShell installer for 4 scheduled tasks

## How to activate (operator action)

```pwsh
pwsh -NoProfile -ExecutionPolicy Bypass `
  -File H:/prism/.claude/helpers/install-combo-efficiency-tasks.ps1 -RunNow
```

After install:
- Baseline + dashboard refresh every 5min (no operator action needed)
- Suggester populates `wiki-link-fix-candidates.json` nightly @ 02:17
- Apply task runs nightly @ 02:23 in DRY-RUN — review the report at
  `state/shared/wiki-link-fix-apply-report.json` and if happy, edit the
  Apply task action to add `--apply` flag

## Doctrine notes

- Per [[reference_u_regen_viz_merge_faillod_2026_05_17]]: viz merge splice
  uses dedupe-by-id + dedupe-by-edge-key — no double-emit on re-run.
- Per [[feedback_commit_to_slot_worktree]]: all code commits land in
  `H:/prism-slot-alpha` (slot/alpha branch); memory + spec docs commit
  to shared tree with `[BOOTSTRAP-SLOT-ENFORCE]`.
- Per [[feedback_psn_definition]]: this work touches PSN legs:
  - Leg #2 (PRISM OS) — cron scheduling
  - Leg #3 (Wiki) — link densifier closes broken `[[name]]` tokens
  - Leg #4 (Memories) — this very memo + suggester applies to memories too
  - Leg #6 (System Viz) — bridge_priority roost
  - Leg #11 (PRISM AI) — Ollama stage-2 (deferred) would touch
