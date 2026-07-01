---
name: feedback_stage_own_hunks_not_whole_file
description: "On the shared tree, git add <whole-file> sweeps in pre-existing uncommitted changes you didn't author — diff-first, stage only your own hunks"
type: feedback
source: prism-memory
synced: 2026-06-27T20:30:46.445Z
aliases: feedback_stage_own_hunks_not_whole_file
---


On the shared `H:/prism` tree (routinely 12k+ uncommitted peer/prior-session files), `git add <path>` on a
file that ALREADY had uncommitted changes commits THOSE too — not just your edit.

2026-06-27 (slot:oscar): `git add SpeedFeedOrchestratorEngine.ts` for a ~10-line `resolveMachine` wire swept
in a pre-existing uncommitted `U-OSC-ORCH-FORCE-PARITY` force-model refactor (57 engine-line changes) and left
its proving test untracked → the 3-of-3 scrutiny gate (arm A) correctly FAILED on a safety-critical physics
change shipped undocumented with an untracked test.

**Why:** the working tree carries everyone's in-flight edits; a whole-file `git add` ignores authorship and
bundles them into your commit under your `[SCOPE]/U-ID` subject — corrupting attribution + auditability.

**How to apply:**
- BEFORE `git add <file>` on a shared-tree file, run `git diff <file>` — if it shows hunks you didn't write,
  do NOT whole-file add.
- Prefer the slot-worktree model ([[feedback_commit_to_slot_worktree]]): a private `H:/prism-slot-<nato>` tree
  has no foreign uncommitted hunks, so whole-file add is safe there.
- `git add -p` is interactive (unsupported in this harness). On the shared tree, only fully-own the files you
  edit this session; for a shared file you must touch, diff-first and, if you accidentally bundle, fix-forward
  with an explicit R12 disclosure commit (track any orphaned test, document the bundled change) rather than
  risky history surgery on the shared tree.

Sibling: [[feedback_commit_to_slot_worktree]] · [[feedback_commit_prefix_main_on_shared_tree]].
