---
name: reference_wedm_neural_transfer_rollback_2026_06_22
description: "India gap-fill: WEDMNeuralTrainingEngine.transferLearn fail-safe state-restore (the try/finally P2 flagged at the open-learning-loops close). transferLearn WIPES this.state.training_data ([]) on the tech->JM handoff then reloads; with no try/finally a throw mid-train lost the caller's corpus AND left isTraining stuck true. Fixed with entry snapshot + completed flag + finally (always clear isTraining, roll corpus back on incomplete). 5 throw-injection tests (10/10 w/ existing round-trip), tsc clean, 2-arm scrutiny PASS. SHIPPED but ABSORBED into a peer commit (a895131184, quebec) via shared-tree git-add-all -- attribution lost; the feedback_commit_to_slot_worktree hazard recurred."
type: reference
source: prism-memory
synced: 2026-06-27T20:30:47.254Z
aliases: reference_wedm_neural_transfer_rollback_2026_06_22
---


# WEDM-neural transferLearn fail-safe state-restore (slot:india /loop 2026-06-22)

Closed the P2 I flagged at the end of the open-learning-loops session: `WEDMNeuralTrainingEngine.transferLearn`
mutated singleton state with NO try/finally.

## The gap (real, R12/R16 error-path)
`transferLearn` (mcp-server/src/engines/WEDMNeuralTrainingEngine.ts) does a DESTRUCTIVE
`this.state.training_data = []` on the tech->JM handoff, then reloads JM data + fine-tunes. With no
try/finally, a throw between the wipe (line ~1468) and the restore (~1478) -- from `loadJMDieData()` or
either `train()` call -- (1) permanently LOST the caller's training corpus, and (2) left `isTraining`
stuck `true` (set at entry, only cleared on the success path).

## The fix
- Snapshot the corpus at ENTRY (`const snapshotTrainingData = [...this.state.training_data]`).
- `let completed = false`, set true only after the success-path `transfer_state` assignment.
- `finally { this.isTraining = false; if (!completed) this.state.training_data = snapshotTrainingData; }`
- Success path is behavior-identical (completed=true skips the rollback; the loaded transfer corpus stays).
- Shallow snapshot is sufficient: every mutation of `training_data` is a whole-array reassignment, never
  in-place element mutation, and `train()` mutates weights, not the data-point objects (verified by both
  scrutiny arms).
- DELIBERATELY NOT rolled back: pretrain weight updates that ran before a throw (a learning engine may
  re-run for a clean pass). Comment + test header narrowed to say so (R12 precision -- arm A caught the
  original "no-op on state" overstatement).

## Tests (new) -- WEDMNeuralTransferRollback.test.ts, 5 throw-injection cases
post-wipe loader fault · fine-tune train() fault · pretrain train() fault (proves the snapshot is taken
at ENTRY, before the internal loadMitsubishi/loadMakino appends) · adversarial no-partial-transfer_state.
Each FAILS against the pre-fix (no-finally) method. 10/10 with the existing dispatcher round-trip
(dispatcher.wedmNeuralTransfer.test.ts); tsc clean on both touched files. 2-arm per-file scrutiny PASS
(code-analyzer + reviewer). 2 P2s logged (NOT fixed): rollback scope is corpus+flag, not weights;
`isTraining` has no reentrancy guard (latent -- no nesting caller today).

## SHIPPED but mis-attributed (the recurring hazard)
The change is LIVE in HEAD (`git show HEAD:.../WEDMNeuralTrainingEngine.ts | grep snapshotTrainingData`
== 2), but it was **absorbed into a peer commit `a895131184` ([FRONTEND-APP]/U-Q-CAPACITOR-SHELL,
slot:quebec)** via that chat's broad `git add -A`, NOT a `[AI-SYSTEMS-WEDM]/U-WEDM-NEURAL-TRANSFER-ROLLBACK`
india commit. My own pathspec commit kept failing on the shared `H:/prism` tree: a stale ~1h `.git/sequencer`
("cherry-pick in progress", cleared non-destructively with `git cherry-pick --quit`) then `code=null`
signal-kills of the commit's pre-commit hook chain (fleet-reaper reaping long node hooks under load). By
the time I diagnosed it, a peer's git-add-all had already swept my 2 uncommitted files into their commit.
Did NOT rewrite history (shared branch 4851 ahead of origin, peers actively committing -- destructive).
LESSON (reinforces [[feedback_commit_to_slot_worktree]]): on the shared tree, uncommitted files race a
peer's `git add -A` and get absorbed with lost attribution -- the slot worktree `H:/prism-slot-india`
(commit-in-own-worktree) is the real fix; commit FAST or work in the slot tree. The work is durable; only
the [SCOPE]/U-ID attribution was lost.

Backlog detail: [[reference_india_open_loops_rescan_2026_06_22]] (this closes its WEDM-neural P2).
