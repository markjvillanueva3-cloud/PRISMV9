---
name: zulu-commit-own-slot-branch
description: "RULE -- zulu stages + commits to its own NATO-named slot branch (slot/zulu in H:/prism-slot-zulu), NOT the shared tree via [BOOTSTRAP-SLOT-ENFORCE] escape"
type: feedback
source: prism-memory
synced: 2026-06-27T20:30:46.456Z
aliases: feedback_zulu_commit_own_slot_branch
---


**RULE (operator directive 2026-06-11): the zulu chat slot stages + commits its work to its OWN NATO-named branch `slot/zulu` in the worktree `H:/prism-slot-zulu` -- NOT the shared `cad-fusion-live-ms0` tree.**

**Why:** the shared `H:/prism` tree is high-peer-contention (24+ concurrent /loop sessions). Commits from there get peer-absorbed into other slots' subjects (the H8 misattribution class). The `slot-commit-enforce.mjs` hook BLOCKS a shared-tree commit and points at `H:/prism-slot-zulu` / `slot/zulu`. I had been bypassing it with the `[BOOTSTRAP-SLOT-ENFORCE]` one-shot escape (which the whole fleet currently does) -- the operator wants zulu specifically OFF that escape and ON its own slot branch for clean attribution + no contention.

**How to apply:**
1. My chat-slot is ALREADY bound to `branch: slot/zulu` in `state/shared/chat-slots.json` (verified 2026-06-11). The `slot/zulu` branch + `H:/prism-slot-zulu` worktree exist.
2. Stage + commit there: `git -C H:/prism-slot-zulu add <my-files>` then `git -C H:/prism-slot-zulu commit -m "[<SCOPE>]/U-ID (slot:zulu): ..."` -- NO `[BOOTSTRAP-SLOT-ENFORCE]` prefix needed (the enforce hook is satisfied by committing from the slot worktree on slot/zulu).
3. Stage ONLY my own named files (the worktree may carry pre-existing peer/mirror M files -- never blanket `git add -A` there).
4. Canonical migration if the binding drifts: `/checkin-zulu` Step 2c cutover.

**Known caveat (2026-06-11):** `H:/prism-slot-zulu` is currently ~2998 commits behind `cad-fusion-live-ms0` and `locked`. NEW standalone files (markdown specs/rules/docs) commit there cleanly (no code dependency, no merge conflict); golf (integrator) merges `slot/<nato>` -> shared. For artifacts that must be IMMEDIATELY accessible fleet-wide (context-retention), ALSO write them as Obsidian memories (C:/ auto-memory -> auto-fed to `knowledge/memories/` at Stop -> recall-searchable now), since a stale slot branch may not merge promptly. Do NOT edit stale shared files in the 2998-behind worktree (merge hell) -- new files only.

Related: [[feedback_commit_to_slot_worktree]] · [[feedback_commit_prefix_main_on_shared_tree]] · [[reference_slot_worktree_activation_2026_05_16]].
