---
name: reference_midturn_workingset_2026_06_12
description: "U-MIDTURN-WORKINGSET (slot:zulu, 2026-06-12) — mid-turn re-anchor enriched with captured working set (files+decisions) + search-first surfaces; landed delta's pending capture-revival diff; context-warner sweep re-verified all-disabled. Live-proven at 75 tool calls."
type: reference
source: prism-memory
synced: 2026-06-27T20:30:46.655Z
aliases: reference_midturn_workingset_2026_06_12
---


# Mid-turn working-set re-anchor (slot:zulu, 2026-06-12)

Third pass on the operator's recurring directive "improve PRISM awareness + context injection mid-session (1M-context extension) + keep all context-tightness warners disabled" — chain: zulu 06-11 (`6ca11a2146`, prompt-boundary re-anchor) → delta 06-12 ([[reference_midturn_reanchor_capture_2026_06_12]], capture revival + goal-only mid-turn re-anchor, left UNCOMMITTED) → this unit.

## Shipped (commit on cad-fusion-live-ms0, [MAIN-FORCE] slot:zulu)
1. **Working-set enrichment**: `buildMidTurnBrief(goal, calls, state)` now also emits ACTIVE FILES (newest-first dedup from captured anchors, top 5), RECENT DECISIONS (last 3), and a PRISM search-first surfaces line (R8) — per-prompt injectors (master-index/wiki/memory prechecks) only fire on UserPromptSubmit, so mid-turn (PostToolUse) is exactly where that awareness decays in long agentic stretches. Emits on goal OR working set; returns null when neither (no bare-header noise). Cap `MAX_MIDTURN_CHARS=2400`.
2. **Anti-duplicate (scrutiny P2)**: inject's brief-EMIT path resets `toolCallsSinceMidTurnAnchor` so a fresh prompt-boundary brief DEFERS the next mid-turn re-anchor; the empty-brief SKIP path does NOT (pinned by coordination tests both directions).
3. **Anti-spam (scrutiny P2)**: `saveState` returns boolean; mid-turn emission gates on the PERSISTED counter reset — a readable-but-unwritable state file can no longer cause per-tool-call brief spam.
4. **Landed delta's pending diff** (capture revival: HS-01 sid chain, atomic writes, `tool_response` field, anti-clobber; R6 doctrine-fork fix in `.claude/CLAUDE.md`).

36/36 `node --test`; 2× 2-arm per-file scrutiny PASS. **LIVE PROOF**: the wired hook fired at exactly 75 tool calls on the building session itself, emitting the standing goal + the new surfaces line.

## Context-warner sweep (re-verified 2026-06-12, third verification)
All wired warn surfaces disabled via settings env: `PRISM_TASK_BOUNDARY_COMPACT_DISABLE=1` (covers `compact-interval-warning` + `stop-task-boundary-compact-nudge`), `PRISM_CRIT_MEM_NUDGE_DISABLE=1`, `PRISM_TOKEN_BUDGET_WARN_DISABLE=1`, `PRISM_TOKEN_AWARE_INJECT=0`, `PRISM_TOKEN_AWARE_STOP_DISABLE=1`, `PRISM_MEMORY_AUTOCOMPACT_DISABLE=1`, `PRISM_COMPOUND_BUDGET_DISABLE=1`, `PRISM_MAX_CONTEXT_TOKENS=1000000`, `CLAUDE_AUTOCOMPACT_PCT_OVERRIDE=95`. Self-compaction machinery KEPT armed: `precompact-auto-trigger`, `token-awareness-sidecar` (writer), zulu orchestrator automation, compaction-survival. Doctrine: [[feedback_context_growth_not_a_stop_signal]].

## Known/follow-ups
- Stale-goal data: the re-anchor surfaces the NEWEST handoff for the sid — if the slot changed mid-day (echo→zulu) the goal lags until the next handoff write. Not a hook bug.
- P3s logged (arm A/B): surrogate-pair split at the 2400 cap edge; fixed-path E2E collision under concurrent suite runs; inject's own emission not gated on persisted save (bounded: once per prompt).
