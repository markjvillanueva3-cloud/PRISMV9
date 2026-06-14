---
name: p06-misattribution-2026-05-23
description: "U-DEA-november-P06 test file (263 LOC) shipped on disk but was absorbed into golf's NN-TRAINER-EXPORT-RESTORE commit 29529f05b2 by their broad `git add`. Content correct (probe_dispatcher_p06.test.ts 17/17 pass), attribution broken. Confirms documented misattribution class for shared-tree commit races."
aliases: reference_p06_misattribution_2026_05_23
type: reference
source: prism-memory
synced: 2026-06-09T14:54:09.262Z
---


# P06 Misattribution — golf broad-add absorbed november work (2026-05-23)

## What happened

- Slot november built `mcp-server/src/__tests__/probe_dispatcher_p06.test.ts` (263 LOC, 17/17 pass) for U-DEA-november-P06.
- Test was written + scrutiny PASS (test-review-agent + reviewer arms) on shared `H:/prism` tree.
- During my commit attempt, golf chat's `[NN-GRAPH-MS1]/U-NN-TRAINER-EXPORT-RESTORE` commit ran `git add` broadly + held the index lock for ~3-4 minutes.
- When lock released, P06 file was already in golf's commit `29529f05b2` (verified via `git log -- <path>` + `git show --stat`).
- Net result: work shipped, attribution wrong.

## Why

- Shared `H:/prism` tree without slot worktrees → any chat's broad `git add` (especially `git add -A` or `git add <dir>/`) picks up peer-untracked files.
- This is the same class as documented in:
  - [[reference_sf_miner_misattribution_2026_05_21]]
  - [[reference_token_savings_iter22_misattribution_2026_05_22]]
  - [[reference_h8_misattribution_2026_05_20]]

## How to apply

- **Operator/PM:** P06 IS shipped. The DEA-MS0 envelope close-out should credit november for P06 even though git log credits golf.
- **Future november chats:** P06 doctrine — match `cad_probe_drift_record/analyze` (cadDispatcher) + `probe_routine_generate` (calcDispatcher) → tested via dispatcher anti-regression regex + algebraic invariants. Pattern documented in `HANDOFF-claude-83e063ad-november-dea-ms0.md`.
- **Mitigation for future commits:** migrate november to its slot worktree per [[reference_slot_worktree_activation_2026_05_16]]. The slot-worktree-cwd-advisory hook surfaces this on shared-tree work.
- **Cross-check:** scripts/audit-close-out-candidates.mjs should pick this up — file presence resolves the unit even though commit message doesn't carry the U-DEA-november-P06 prefix.

## Files

- `mcp-server/src/__tests__/probe_dispatcher_p06.test.ts` — landed in `29529f05b2` (golf attribution); content correct.
- `state/shared/handoffs/HANDOFF-claude-83e063ad-november-dea-ms0.md` — handoff still names P06 + P05 explicitly.
- Loop state `loop-83e063ad-0a9e-4e49-b8fa-5d2cc51b10b4.json` — iter 2 ticked with misattribution note.
