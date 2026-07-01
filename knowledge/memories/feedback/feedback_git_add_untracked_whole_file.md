---
name: git-add-of-a-file-you-only-comment-edited-commits-the-whole-file-peer-absorption-risk
description: "On the shared H:/prism tree, `git add -- <file>` stages the ENTIRE working-tree state of that file, not just your hunk. If the file was UNTRACKED, this first-commits the whole thing — you can inadvertently capture a peer's untracked work under your commit message. Always `git diff --cached --stat` before committing; a line-count far larger than your edit = absorption."
type: feedback
source: prism-memory
synced: 2026-06-27T20:30:46.427Z
aliases: feedback_git_add_untracked_whole_file
---


**Operator/fleet lesson (caught 2026-06-09, slot papa, doc-drift campaign).**

`git add -- <file>` stages the file's **entire** working-tree content, not just the lines you changed. Two failure modes on the shared multi-slot tree:
1. **Untracked-file capture** — if the file was UNTRACKED, `git add` first-commits the WHOLE file. A 2-line docstring edit to `IdeaBlockGovernanceEngine.ts` (an untracked OBSIDIAN-INTELLIGENCE-MS3 engine, alpha's) → a 225-line first-commit under a "COMMENT-only" message (commit `02d682b4aa`). The engine was complete+valid (no harm to the code — an untracked engine is an at-risk orphan, so committing it is net-safe), but the commit message lied and the engine landed WITHOUT its companion test (R15 gap).
2. **Peer-mid-edit capture** — if a tracked file has a peer's uncommitted hunks alongside yours, `git add -- <file>` commits theirs too.

**How to apply (every shared-tree commit):**
- **`git diff --cached --stat` BEFORE `git commit`.** If a file's line-count is far larger than the edit you made, STOP — you're absorbing untracked/peer content. (`git show --stat <sha>` catches it after the fact, but before is better.)
- For a file you only comment-edited, expect a tiny diff. 225 insertions for a "2-line fix" is the tell.
- Reset-first (`git reset -q && git add -- <exact paths>`) limits WHICH files, but does NOT limit WHICH LINES within a file — the whole file's state still goes in.
- If you catch absorption AFTER committing on a shared tree (can't rewrite shared history): verify the captured content is complete+valid (not broken WIP), complete any R15 pair (commit the green companion test), flag the owner via chat-bus, and correct the record in a follow-up commit message.

**Remediation done 2026-06-09:** committed the green companion test (`fa19b8fbdf`, 28 tests), flagged alpha via chat-bus for the remaining untracked MS3 pieces (IdeaBlockRagEngine + wiki + memories), wrote this lesson.

Related: [[feedback_commit_to_slot_worktree]] · [[feedback_commit_prefix_main_on_shared_tree]] · [[reference_doc_drift_campaign_2026_06_09]]
