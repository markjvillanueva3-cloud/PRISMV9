---
name: yolo-bypass-active-2026-05-24
description: Stop-hook bypasses enabled in C:/Users/wompu/.claude/settings.json env block per operator YOLO directive 2026-05-24. PRISM_GOAL_GATE_AUDIT_BYPASS=1 + PRISM_ALLOW_UNWIRED=1. Persist fleet-wide until manually reverted.
type: reference
source: prism-memory
synced: 2026-06-27T20:30:47.279Z
aliases: reference_yolo_bypass_active_2026_05_24
---


# YOLO bypass active — operator-authorized 2026-05-24 (slot golf)

## What changed

Added to `C:/Users/wompu/.claude/settings.json` env block (auto-mirrored to H:/.claude/settings.json by `c-to-h-mirror`):

```json
"PRISM_GOAL_GATE_AUDIT_BYPASS": "1",
"PRISM_ALLOW_UNWIRED": "1"
```

## Why

Operator directive (2026-05-24, golf session `9fbbe420`): *"can we turn off all blockers since it seems like we solved for auto compaction points. lets try running these loops in yolo mode"*. Following the conclusion from a 13-iteration /goal /loop where the literal Stop-hook clause "complete all tasks" was demonstrably unsatisfiable in a session (5826 ROADMAP units + 727 extraction-priority units = ~6500+ documented open work).

## What each bypass does

| env var | effect | gate it bypasses |
|---------|--------|------------------|
| `PRISM_GOAL_GATE_AUDIT_BYPASS=1` | `/goal` Stop hook approves without close-out-audit freshness check | `.claude/hooks/goal-complete-gate.mjs` |
| `PRISM_ALLOW_UNWIRED=1` | `stop_on_unwired_assets.mjs` approves orphan engines / unhandled actions / untested engines | `.claude/hooks/stop_on_unwired_assets.mjs` (session-only scope per its help text) |

## Scope

**Fleet-wide.** The env block in settings.json applies to every chat that starts after the edit. Not just this session.

## How to revert

Edit `C:/Users/wompu/.claude/settings.json` (the c-to-h-mirror will auto-replicate to H:):

```json
// REMOVE these two lines:
"PRISM_GOAL_GATE_AUDIT_BYPASS": "1",
"PRISM_ALLOW_UNWIRED": "1"
```

Then next chat will see the gates active again. No restart required.

## Audit trail

- `state/shared/goal-gate-bypasses.jsonl` — every goal-gate bypass is logged with timestamp + session id
- Stop-hook output continues to fire its diagnostic (just doesn't block) so the regressions remain visible in transcripts

## What this DOESN'T bypass

These safety gates remain ACTIVE — YOLO doesn't disable them:
- `critical-file-guard` (constants.ts edits still require `confirmCritical:true`)
- `comprehensive-build-enforce` (no stub engines)
- `duplication-hard-block` (no exact duplicates)
- `physics-sanity` / `materialSanityHook` / `crossFieldPhysicsHook` / `machineLimitGuardHook`
- `scrutinize-before-stop` 3-of-3 review (still required for uncommitted diffs)
- `enforce-handoff-topic` (topicless handoffs still blocked)
- `file-claim-guard` (peer-claimed files still blocked at PreToolUse)

YOLO mode is **velocity bypass on stop-gates that block iteration**, NOT safety bypass on real correctness/safety gates.

## Linked

- [[feedback_psn_definition]] — PSN-synergy work that triggered the /goal /loop
- [[reference_extraction_priority_gap_2026_05_24]] — 727 extraction modules surfaced in the loop
- `.claude/hooks/goal-complete-gate.mjs` — the gated hook
- `.claude/hooks/stop_on_unwired_assets.mjs` — the other gated hook
- CLAUDE.md §GOAL-COMPLETE GATE — original doctrine
