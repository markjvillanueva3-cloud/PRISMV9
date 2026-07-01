---
name: reference_slot_cutover_sync_2026_06_04
description: "Slot-worktree cutover procedure when the slot branch is hundreds of commits stale — backup orphan commits, FOREGROUND reset (Windows checkout outlives the bg-task window), and the finding that the fleet de-facto committed to the shared cad-fusion-live-ms0 tree this cycle"
type: reference
source: prism-memory
synced: 2026-06-27T20:30:47.206Z
aliases: reference_slot_cutover_sync_2026_06_04
---


**Slot cutover under stale-branch conditions (sierra, 2026-06-04).** Operator directive: *"you should be staging and committing to your own branch … commit to the chat slot you're attached to."* The whole session had been committing to the SHARED `cad-fusion-live-ms0` tree (H:/prism) — causing repeated `.git/index.lock` contention + peer-absorption (a peer's `git commit -a` swept my unstaged `sessionDispatcher.ts` edit into commit `7ec7c17249`, leaving a BROKEN HEAD whose dispatcher case imported an uncommitted file — repaired by a partial-pathspec commit `git commit -- <paths>`).

**Finding:** the entire active fleet (bravo/romeo/alpha/xray…) has de-facto been committing to `cad-fusion-live-ms0`, so the per-slot `slot/<nato>` branches are **2,000+ commits stale** (slot/sierra was 2,211 behind + 10 ahead with an unmerged `[PSN-SYNERGIZE]` milestone). The slot-routing enforcement hooks (`main-tree-write-block` etc.) did NOT auto-engage despite `chat-slots.json[sierra].branch === "slot/sierra"` — that's why drifting to the shared tree was even possible. (Worth a root-cause: why didn't the routing hooks arm?)

**The safe sync-forward procedure (reusable):**
1. **Preserve unmerged work first** — `git -C <wt> branch -f sierra-orphan-<topic> <slot-tip-sha>` (zero-risk ref). NEVER `reset --hard` away unmerged commits; a "10 ahead" branch may carry a whole un-integrated milestone (verify via `git log --oneline <integration>..<slot>` + U-token grep in the integration branch — 0 matches = unmerged).
2. **Clear stale uncommitted** — `git -C <wt> clean -fd` (stale dashboards/baselines/config) — operator authorized discarding *uncommitted* (NOT committed) state.
3. **`reset --hard <integration-tip>` must run FOREGROUND with a long timeout.** On the slow Windows H: drive a 2,200-commit / ~8,771-file checkout outlives the background-task window — every bg attempt got truncated mid-checkout (HEAD unmoved, ~587 partial files, orphan worktree `index.lock` at `.git/worktrees/<wt>/index.lock`). Clear that lock (`rm`) before retry. Foreground `git -C <wt> reset --hard <sha>` with `timeout 900000` completed in one pass.
4. Sync makes `slot/sierra == integration tip`, so it INHERITS your own already-landed code (e.g. `a1dfb9791f` became an ancestor) → doc-reflect commits on the slot branch are now on a current base. First clean slot commit `9d7abd3f29` landed instantly, no contention.

**Open item for operator/golf:** the `sierra-orphan-psn-synergize` backup ref (10 unmerged PSN-SYNERGIZE commits) needs an integrate-or-discard decision. Related: [[feedback_commit_to_slot_worktree]], [[feedback_conflict_fork_rule]].
