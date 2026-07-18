---
name: priority-queue-ms0-2026-05-16
description: "PRIORITY-QUEUE-MS0 — master color-coded queue + helper API for the 5826-item remaining-work set. Backend-dev top, bridge middle, app bottom. Slot juliett."
metadata:  
source: prism-memory
synced: 2026-05-18T01:02:09.864Z
aliases: reference_priority_queue_ms0_2026_05_16
---


# PRIORITY-QUEUE-MS0 (2026-05-16, slot juliett, forge7)

## What shipped

- `scripts/generate-priority-queue-features.mjs` (+test 11/11) — system-viz
  augmentation generator. `ghost.priority_queue` roost + color-coded
  `priority-unit` children, sorted backend-dev → bridge → app.
- `.claude/helpers/priority-queue.mjs` (+test 7/7) — runtime API:
  `pickNextUnit({slot, excludeIds, topN})` returns the next eligible unit
  (already-shipped via MILESTONE_PROGRESS + peer-claimed via chat-slots
  filtered out). Shares `classifyUnit` with the generator — no drift between
  viz and runtime.
- Wired into `regen-viz.mjs` FAST[] + `merge-augmentations.mjs` splice
  (loadOptional + version + summary log + `G.meta.priorityQueue`).
- CLAUDE.md `## /checkin-<nato> /loop` full-stack contract extended with
  step-4 pickup-source pointer.

## First-run numbers

- 5,508 units classified · **245 backend-dev (blue)** · 42 bridge (amber)
  · 5,221 app-functionality (green) · roost emitted; 3,588 nodes (rest
  collapsed on idless-title collisions)
- Smoke test (`--pick --top 3`): correctly returns CLEANUP-MS0 A1/A2/A3
  (backend-dev) as the top 3, confirming the priority sort.

## Categorization

`classifyUnit({milestone, suggested_domain, source})` — pure, exported,
shared by viz + runtime. Backend-dev keywords: `BACKEND-DEVTOOLS|RGS|INFRA|
HOOK|DEV-VELOCITY|COMMAND-KERNEL|SYSTEM-VIZ|FLEET-REAPER|CLEANUP|TRIBAL-GRAPH|
MEMORY|CHECKIN|OLLAMA|AUTOCOMPACT|SLOT-WORKTREE|MISC-TASKS|ROADMAP-CONSOL|
PRIORITY-QUEUE|NN-GRAPH|OBSIDIAN-INTELLIGENCE` OR domains `{hooks,infra,docs}`.
Bridge = `source==='bridge'`. App = everything else.

## Deferred follow-ups (next session)

Three Stop hooks planned but not built (context budget):
- `stop-auto-pickup-next.mjs` — advisory: on Stop, surface next-best unit.
- `stop-wiring-check.mjs` — advisory: verify shipped engines wired in /system-viz.
- `stop-high-roi-proposer.mjs` — advisory: scan deliverables for compounding-gains extensions.

The helper API (`pickNextUnit`) is ready to consume in those hooks.

## Durable lesson

`generate-priority-queue-features.mjs` and `.claude/helpers/priority-queue.mjs`
share `classifyUnit` via direct import. Same source-of-truth for viz + runtime
= no drift. When building a new domain-specific surface (e.g., a different
priority ordering), keep the classifier pure + exported + shared, never inline
it in two places.

Wiki: [[priority-queue]]. Companions: [[roadmap-consolidation-2026-05-16]],
[[checkin-loop-fullstack-2026-05-16]].


## Related
[[skills/generate-priority-queue-features|/generate-priority-queue-features]] • [[skills/helpers|/helpers]] • [[skills/priority-queue|/priority-queue]] • [[skills/checkin-|/checkin-]] • [[skills/loop|/loop]] • [[skills/system-viz|/system-viz]]