---
name: misc-tasks-extraction-2026-05-16
description: "10-agent scan of all PRISM chats for orphaned incomplete work → MISC-TASKS-INVENTORY + ghost.misc_tasks node in /system-viz. Slot juliett, forge7."
aliases: reference_misc_tasks_extraction_2026_05_16
type: reference
source: prism-memory
synced: 2026-06-09T14:54:09.219Z
---


# Misc-Tasks Extraction (2026-05-16, slot juliett, forge7)

One-shot extraction of **orphaned incomplete work** — work identified/promised
across PRISM chats that was never finished AND never formalized into a roadmap
unit / milestone envelope. The inverse of `/close-out-audit` (which finds
shipped-but-unclosed); this finds unshipped-and-unroadmapped.

## What shipped

- `scripts/extract-misc-tasks.mjs` (+`.test.mjs`, 11/11) — pure deterministic
  merge: dedupe → exclude completed → cross-ref `milestone_or_unit_id` against
  the KNOWN id set (roadmap-index + 694 envelopes + MILESTONE_PROGRESS) → misc.
- `scripts/generate-misc-tasks-features.mjs` (+`.test.mjs`, 10/10) — system-viz
  augmentation generator modeled on `generate-stagnant-features.mjs`. Emits a
  `ghost.misc_tasks` roost (kind `ghost-roost`, parent `ghost.planned_features`)
  + one `misc-task` child per inventory item.
- Wired into `scripts/regen-viz.mjs` FAST[] (after generate-stagnant-features)
  AND `scripts/merge-augmentations.mjs` (loadOptional + splice block + version
  + summary-log). merge-augmentations does NOT auto-discover — every
  augmentation must be registered there by name.
- `state/shared/specs/MISC-TASKS-INVENTORY.{json,md,html}` — durable inventory.
- `state/shared/system-viz/misc-tasks-augmentation.json` — viz source.

## First-run numbers

10 agents scanned 912 transcripts + 504 handoffs + 184 loop-state/plans + 25
curated files → 522 raw items → 417 deduped → **318 misc tasks** (20 completed,
79 already-roadmapped excluded). KNOWN id set = 4067.

## Durable lessons

- The system-viz flat staging adapter (`system-viz-add-node.mjs`) cannot make a
  parent/child hierarchy and won't survive regen. The regen-surviving pattern is
  an **augmentation generator** (`generate-*-augmentation.json` consumed by
  `merge-augmentations.mjs`) — model on `generate-stagnant-features.mjs`.
- `merge-augmentations.mjs` enumerates each augmentation by name (`loadOptional`)
  — a new augmentation needs THREE additions there: the loadOptional line, a
  newNodes/newEdges splice block, and (optionally) the version + summary log.
- Set-merge / dedup / cross-ref is deterministic work → a script, NOT an agent
  (CLAUDE.md R5). Agents only do the fuzzy scan + extraction.
- 10 simultaneous heavy agents hit a server-side rate limit; relaunch in
  batches of ~3-4, not all 10 at once.

## Next phase (DEFERRED)

Combine `MISC-TASKS-INVENTORY.json` into the unified roadmap
(`PRISM-UNIFIED-ROADMAP-v2.md` / `roadmap-index.json`) after human review.
Inventory is advisory + `mustHumanVerify` — do not auto-promote.

Wiki: [[misc-tasks-extraction]]. Companion: [[close-out-audit]].
