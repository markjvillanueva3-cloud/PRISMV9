---
name: reference_shared_tree_uncommitted_clobber_2026_06_22
description: "On the shared H:/prism tree, uncommitted multi-file edits can be reverted to HEAD by a peer git-sync mid-iteration -- COMMIT promptly, never leave a multi-file change uncommitted across a long agent dispatch"
metadata: 
  node_type: memory
  type: feedback
  originSessionId: 6a8a0fc5-4275-43b0-b847-449c590c706b
---

**Observed (slot:xray, 2026-06-22, cad-fusion-live-ms0 shared tree):** mid-iteration I edited 4 files (region-glue-lib.mjs + its test, region-classify.mjs + its test), ran tests green (22+11), then dispatched 2 scrutiny agents (~7 min). During that window a git operation on the SHARED tree reverted 3 of the 4 files to HEAD -- the clean-revertable ones (whose ONLY changes were uncommitted) got reset (identical mtimes), while region-classify.mjs (edited last, after the reset) survived. Result: a BROKEN intermediate state -- region-classify.mjs called a 3-arg `buildRegionRoutedFused` signature that the reverted lib no longer had. Tests still passed (none exercised the new path + the extra arg was silently ignored), so it was a SILENT corruption. Detected only because a scrutiny agent reported lower test counts (10/18 not 11/22) than I'd just seen.

**Why:** the slot-worktree model (`H:/prism-slot-<nato>`) exists precisely to isolate from this; working directly on shared `H:/prism` exposes uncommitted work to peer git-sync / checkout / reset. A long agent dispatch (scrutiny, fan-out) is exactly the window where a peer git op lands.

**How to apply (FLEET-WIDE):**
1. **Commit each unit's files IMMEDIATELY after tests pass + BEFORE any long agent dispatch.** Durability first. A committed change survives a working-tree reset (it just re-materializes HEAD = your commit).
2. After an external "modified by user or linter" harness notice on files you just edited, **VERIFY live state** (`git status` + grep your sentinel symbol) before continuing -- never assume your edits survived. (Here: `grep -c fallbackNModels` showed 0 in the lib = reverted.)
3. When recovering, **re-read the current on-disk file** before re-editing (R8) -- it was externally rewritten; editing from memory risks a mismatched old_string or a double-apply.
4. Prefer the slot worktree (`/checkin-<slot>` cutover) for multi-file builds on a busy shared tree.

Sibling: [[feedback_commit_to_slot_worktree]] · [[feedback_conflict_fork_rule]]. Context: [[reference_xray_p15_region_routing_arc_complete_2026_06_22]].
