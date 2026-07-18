---
name: reference_bravo_slot_worktree_galaxy_split
description: Galaxy lives in integration tree; a stale slot worktree supersets in slot/<nato>; golf merges
type: reference
source: prism-memory
synced: 2026-06-27T20:30:46.487Z
aliases: reference_bravo_slot_worktree_galaxy_split
---


2026-05-28: the hermes-zulu galaxy CLAUDE.md+MEMORY.md existed in the integration tree (`H:/prism`, branch `cad-fusion-live-ms0`) but NOT in bravo's slot worktree (`H:/prism-slot-bravo`, `slot/bravo`, ~1900 commits behind).

Resolution that respects lane discipline (`main-tree-write-block` blocks `H:/prism` writes):
- READ the existing galaxy from `H:/prism` (read-only cross-tree is allowed).
- WRITE the completed SUPERSET into the slot worktree `H:/prism-slot-bravo/...`.
- Commit path-scoped on `slot/bravo`; the integrator (golf) merges to `cad-fusion-live-ms0`.
- A superset file beats a clobber on merge — golf resolves toward the more-complete version.

NEVER `git add -A` (worktree has thousands of unrelated uncommitted files). See [[feedback_commit_to_slot_worktree]].
