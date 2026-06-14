---
title: "Never delete or move original files — always disable + copy"
name: never-delete-or-move-original-files---always-disable---copy
kind: reference
status: promoted
category: lessons
domain: knowledge-vault
promoted_from: knowledge/memories/feedback/feedback_never_delete_only_disable.md
promoted_at: 2026-06-06T04:55:48.179Z
source_refs: 60
---

# Never delete or move original files — always disable + copy

Operating constraint for any "cleanup" task (settings hooks, leaked worktrees, dead code, registry entries, state files, etc.):

**Rule:** Never delete or move original files. If something needs to be "removed":
1. Find a way to **disable** it (e.g. `hooks: []` + `_disabled_by:` comment, env var off-switch, comment-out config block, lock file rename, feature-flag).
2. If you must produce a "clean" version, **copy** the original to a backup path BEFORE altering. Never overwrite without a backup.
3. Every cleanup must be **reversible without git restore** — the original artifact stays on disk somewhere.

**Why:** Mark has had work clobbered by overly aggressive cleanups across the 6-chat concurrent setup. A peer chat "cleaning up dead code" has destroyed legitimately-WIP code more than once. Reversibility is non-negotiable.

**How to apply:**
- Hooks in settings.json: use the `hooks: []` + `_disabled_by:` pattern (already established).
- Engines: if they look orphaned, tag with `// WIRE-EXEMPT: <reason>` instead of removing.
- Leaked git worktrees: `git worktree unlock` + `git worktree prune` (metadata cleanup) is OK; `git worktree remove --force` (deletes directory) is NOT OK without explicit user OK per-worktree.
- Memory files / state files: rename to `<name>.archive.<date>` rather than delete.
- Skills / commands: prefix the file with `_` to disable or set `disabled: true` in frontmatter.
- Engine deletion specifically: also gated by the existing `/delete` skill which checks dependencies — still requires the user-approved "really delete?" step.

**Counter-example:** "Free up 50GB by removing leaked worktrees" — wrong framing. Correct framing: "release git locks without deleting any files; leave the 50GB on disk as evidence of the prior state."

**Exception:** Files I created in the current session (untracked) can be deleted/moved freely. Only PREVIOUSLY-EXISTING files are protected.

## Source

Promoted from memory [[feedback_never_delete_only_disable]] (referenced 60x across the vault). The memory remains the editable source of truth.
