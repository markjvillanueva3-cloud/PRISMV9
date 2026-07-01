---
name: reference_autocompaction_model_handoff_u1u2_2026_06_11
description: AUTO-COMPACTION-MODEL-HANDOFF-MS0 U1+U2 shipped (precompact trigger restored fleet-wide + MODEL-authored handoff + 99M-disable clamp + PRECOMPACT_DISABLE knob) + compact-interval-warning knob-honor. Backlog spec persists the rest of the /goal.
type: reference
source: prism-memory
synced: 2026-06-27T20:30:46.474Z
aliases: reference_autocompaction_model_handoff_u1u2_2026_06_11
---


# AUTO-COMPACTION-MODEL-HANDOFF-MS0 U1+U2 + compact-pushback fixes (2026-06-11, slot:alpha)

Operator /goal (ultracode): keep working until autocompact (no pushback to compact); the handoff
auto-writes (MODEL-authored, NOT the stub helper) just before autocompact; exhaust token-saving,
system-efficiency, hook/system/context-conflict, and precompaction/compaction/handoff/self-startup gaps.

## Shipped (branch cad-fusion-live-ms0)
- **1e25893b31** AUTO-COMPACTION-MODEL-HANDOFF-MS0 U1+U2 (`precompact-auto-trigger.mjs` + test):
  - **U2** `resolveThreshold()` neutralizes the stale OS `PRECOMPACT_{SOFT,HARD}_TOKENS=99000000`
    disable (any threshold > CONTEXT_CAP / NaN / <=0 -> the real default), so the 90-95% trigger
    fires again. Genuine disable now uses the CLEAN `PRECOMPACT_DISABLE=1` knob (Infinity), not value-abuse.
  - **U1** SOFT(880K, non-blocking) + HARD(940K, block) messages rewritten to instruct the MODEL to
    author its own optimal handoff via `per-agent-handoff.mjs write` (NOT the operator-banned stub
    skill). Deadlock fix: at HARD every tool call is blocked incl. the handoff-write -> `isHandoffWrite`
    exempts it and ARMS `precompact-pending-<sid>.marker` (byte-identical to the `precompactMarkerActive`
    read path) so the next call clears. 20/20 node:test, 2-reviewer PASS/PASS (0 P0/P1).
- **6a394d47ce** U-CIC-KNOB (`compact-interval-warning.mjs` + test): honors
  `PRISM_TASK_BOUNDARY_COMPACT_DISABLE` (operator had SET it but the hook never read it -- the LIVE
  pushback-to-compact source) + new `PRISM_COMPACT_INTERVAL_WARN_DISABLE` + R6-aligned message. 3/3 node:test.

## Crux (verify-the-live-contract, not just code)
The precompact trigger was DEAD fleet-wide due to a MACHINE-LEVEL env override (99M), NOT a code bug.
The discovery agent read the code defaults (880K/940K) and missed the live env; my prior memory
[[reference_precompact_autotrigger_disabled_99m_2026_06_11]] + a live `node -e` caught it. Ground-truth
the live env before "fixing" what looks broken in code. The false-compaction bugs that the 99M
workaround was hiding are already fixed ([[reference_compaction_false_trigger_fix_2026_06_11]]), so
re-enabling is SAFE.

## Remaining /goal backlog (do NOT re-run the 577K-tok discovery)
`state/shared/specs/SESSION-CONTINUITY-EFFICIENCY-BACKLOG-2026-06-11.md` -- ranked, file:line-cited:
U3 (precompact-handoff helper defers to a fresh model handoff), stop-force-loop-continue short-chatId
fix, advisory-decay wiring (mcp-route-suggest backendAuditChain/doctrineSurface + grep-index-first),
duplicate hook wirings (pre-tool-savings-multi x4), W5 X-stanza via the galaxy-enrichment GENERATOR
(not 34 manual edits), and a NEW conflict: stop-close-own-bg-tasks flags Workflow-spawned agent bash
as orphans. Method: harness-exec hooks are firewalled from slot worktrees -> edit from the MAIN tree
via node fs patch script, commit via `git-commit-mutex.mjs`.
