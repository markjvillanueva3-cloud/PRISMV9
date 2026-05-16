---
name: misc-tasks-extraction
type: architecture
layer: automation
created: 2026-05-16
boost_keywords: [misc tasks, orphaned work, incomplete work, never finished, never roadmapped, misc-tasks node, 10-agent scan, MISC-TASKS-INVENTORY, unshipped unroadmapped]
description: 10-agent parallel scan of every PRISM chat for orphaned incomplete work — work identified or promised but never finished AND never formalized into a roadmap unit/milestone envelope. Deterministically merged into MISC-TASKS-INVENTORY and surfaced as the ghost.misc_tasks roost in /system-viz.
links:
  - script: scripts/extract-misc-tasks.mjs
  - script: scripts/generate-misc-tasks-features.mjs
  - test: scripts/extract-misc-tasks.test.mjs
  - test: scripts/generate-misc-tasks-features.test.mjs
  - reports: state/shared/specs/MISC-TASKS-INVENTORY.json, state/shared/specs/MISC-TASKS-INVENTORY.md, state/shared/specs/MISC-TASKS-INVENTORY.html
  - augmentation: state/shared/system-viz/misc-tasks-augmentation.json
  - wired: scripts/regen-viz.mjs (FAST[]), scripts/merge-augmentations.mjs (splice)
  - memory: reference_misc_tasks_extraction_2026_05_16
  - companion: close-out-audit, system-viz-first-audit
---

# Misc-Tasks Extraction

## Problem

PRISM has run ~900+ Claude chats. Work was constantly identified, started, or
promised, then lost when a chat ended — and most of it was **never finished AND
never formalized** into a roadmap unit or milestone envelope. `/close-out-audit`
catches the *inverse* class (shipped-but-unclosed); nothing surfaced this
*unshipped-and-unroadmapped* residue. It was invisible debt.

## What it does

A one-shot 10-agent parallel scan of **every chat surface**, deterministically
merged into a durable inventory and a `/system-viz` node.

1. **10 read-only scanner agents** (`misc-tasks-scan/manifest-{1..10}.txt`):
   - A1–A6: 912 chat transcripts (`C:/Users/<u>/.claude/projects/H--prism/*.jsonl`)
   - A7–A8: 504 per-chat handoffs (`state/shared/handoffs/HANDOFF-*.md`)
   - A9: 47 loop-state files + 137 plan docs
   - A10: 25 curated debt files (CLOSE-OUT-*, RESUME_POSTS*, AGENT_CHAT.jsonl, _orphans, specs)
   - Each greps an incomplete-work signal regex, window-reads matches, emits
     `agent-<N>.json` of candidate items. Token-disciplined: grep-first, never
     full-Reads a multi-MB transcript.
2. **Deterministic merge** — `extract-misc-tasks.mjs` (pure, set-ops, NOT model
   judgement per CLAUDE.md R5):
   - dedupe (key = unit_id, else normalized title) → merge groups
   - exclude `looks_completed` items
   - cross-reference each remaining item's `milestone_or_unit_id` against the
     **KNOWN set** — every milestone + unit id in `roadmap-index.json`, the 694
     milestone envelopes, and `MILESTONE_PROGRESS.json`. Items with a KNOWN id
     were already roadmapped → excluded. The remainder is the misc set.
3. **Inventory** — `MISC-TASKS-INVENTORY.{json,md,html}` (schemaVersioned,
   advisory, `mustHumanVerify:true`).
4. **/system-viz node** — `generate-misc-tasks-features.mjs` emits
   `misc-tasks-augmentation.json`: a `ghost.misc_tasks` roost (kind `ghost-roost`,
   under `ghost.planned_features`) + one `misc-task` child per inventory item.
   Modeled on `generate-stagnant-features.mjs`. Registered in `regen-viz.mjs`
   FAST[] and spliced by `merge-augmentations.mjs`, so it survives every regen.

## First run (2026-05-16, slot juliett)

522 raw items → 417 deduped → **318 misc tasks** (20 excluded as completed, 79
excluded as already-roadmapped). KNOWN id set: 4067 across 694 envelopes.
Domain split: infra 140 · cam 54 · hooks 34 · lathe 24 · cad 21 · wedm 15 ·
docs 12 · other 12 · mill 6.

## Deferred next phase

Combine `MISC-TASKS-INVENTORY.json` into the unified roadmap
(`PRISM-UNIFIED-ROADMAP-v2.md` / `roadmap-index.json`) after human review —
NOT done in the extraction session by design (advisory → reviewed → promoted).

## Safety

Advisory only — never flips an envelope, never mutates a roadmap. File presence
≠ spec correctness; every item is `mustHumanVerify`. Scanner agents are
read-only and write only their own scratch JSON.
