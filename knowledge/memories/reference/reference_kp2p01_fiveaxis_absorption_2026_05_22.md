---
name: kp2p01-fiveaxis-absorption-2026-05-22
description: "Commit fef972036f (U-KP2P-01, slot kilo) absorbed peer alpha's U-BRIDGE-WIRE-MILL iter-5 FiveAxis wiring via the shared-tree git-add window"
aliases: reference_kp2p01_fiveaxis_absorption_2026_05_22
type: reference
source: prism-memory
synced: 2026-06-09T14:54:09.186Z
---


2026-05-22, slot kilo (claude-fee91401), milestone KILO-P2P-RECONCILE-MS0.

Commit `fef972036f` (`[MAIN] [KILO-P2P-RECONCILE-MS0]/U-KP2P-01`) absorbed the
alpha slot's uncommitted `U-BRIDGE-WIRE-MILL iter-5` FiveAxis wiring — 5
`mill_5axis_orch_*` actions (dsl_examples, parse_dsl, rtcp_dialect,
machine_dynamics, sequences) + the `_fiveAxisOrch` engine cache var +
`getEngine("fiveaxis_orch")` case + 5 schema consts + 5 `MILL_ACTIONS` enum
entries — across `millDispatcher.ts` and `millActionSchemas.ts`.

**Cause:** the shared-`H:/prism`-tree `git add` window. Alpha had uncommitted
iter-5 hunks in millDispatcher.ts + millActionSchemas.ts; kilo edited the SAME
two files for U-KP2P-01. `git add <file>` stages the whole file's working-tree
diff vs HEAD — including the peer's hunks. `git commit -- <pathspec>` then
commits them. A pathspec narrows WHICH files commit, not WHICH hunks within a
file — so a peer's hunks in a co-edited file ride along.

**Detection:** caught by the 3-of-3 Stop-gate. Reviewer B FAILed it correctly;
reviewers A and C initially mis-verified (a broken `^+` ripgrep pattern under
RTK + checking the wrong ref made the absorption look pre-existing). The raw
`git --no-pager show fef972036f -- <files>` diff was authoritative — always
verify a contested reviewer claim against the raw diff, not a grep pipeline.

**Why not reverted:** peer commits (embed-all-wiki + others) already sit on top
of fef972036f on the shared branch. A history rewrite to split the commit would
clobber those peers (feedback_no_git_stash_shared_tree spirit). The absorbed
FiveAxis code is functionally correct, fully wired, tsc-clean. Non-destructive
resolution = disclosure, not rewrite.

**Disclosure surfaces:** chat-bus broadcast to alpha (msg 89a81cb1-8115); this
memory; the session handoff; CLAUDE.md `## Recent regressions` entry requested
of the golf slot (CLAUDE.md is golf-write-gated). Alpha closes its
U-BRIDGE-WIRE-MILL iter-5 envelope citing fef972036f.

**Prevention:** the slot-worktree model (each slot on its own
`H:/prism-slot-<name>` tree) eliminates this — concurrent chats never share a
working tree. Until a chat migrates, the conflict-fork rule applies. Same
recurring pattern as [[reference_h8_misattribution]] and
[[reference_iter2_html_adopt_misattribution]]; standing rule
[[feedback_commit_prefix_main_on_shared_tree]].
