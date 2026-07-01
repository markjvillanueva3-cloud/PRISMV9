---
name: feedback_verify_committed_blob_not_amend_message
description: "A git amend across separate Bash invocations can silently keep the OLD tree (staging lost) while changing only the message -> a commit whose message claims fixes not in the code (R12 fail-loud violation). Verify the committed BLOB, not the message."
type: feedback
source: prism-memory
synced: 2026-06-27T20:30:46.450Z
aliases: feedback_verify_committed_blob_not_amend_message
---


When `git commit --amend` runs in a slot worktree across SEPARATE Bash tool invocations, the staging from a prior invocation's `git add` may NOT persist (cross-worktree index non-persistence + peer commit-guards auto-reset the shared index). `git commit --amend` with nothing staged amends ONLY the message and keeps the ORIGINAL tree. Result: a commit whose message CLAIMS fixes that are absent from the code — exactly the R12 fail-loud / "title says done" anti-pattern.

**Live case (2026-06-15, slot:zulu, U-ZBL-CONSUMER INCR4):** I applied 3 scrutiny P2 fixes via Edit, then `cd slot-worktree && git add && git commit --amend -m "...fixed..."` across multiple invocations. The amend changed the message (1494621072) but the staging hadn't persisted, so the tree stayed UNFIXED. A cherry-pick then propagated the unfixed tree (03daf25dfa) to the running branch — with a message asserting "3xP2 fixed; 9/9 tests". Scrutiny Arm C (reading the committed BLOB, not the message) caught it and FAILED. Re-applied the fixes and committed atomically via `git commit -m "..." -- <pathspec>` (856e8ad93a) -> Arm C PASS.

**Why:** a commit message is an unverified claim; only the committed blob is ground truth (sibling of [[feedback_read_full_content_not_titles]] applied to git). Edit tool edits + a stale/lost index = silent divergence.

**How to apply:**
- Stage + commit in ONE Bash invocation: `git add <files> && git commit -m "..."` OR `git commit -m "..." -- <pathspec>` (the latter needs no `git add` and so is not blocked by `git-add-lane-guard` for already-tracked files).
- After ANY amend/commit, VERIFY the blob: `git show HEAD:<file> | grep -c "<expected-change>"` (>=1) before claiming the fix shipped.
- Scrutiny that reads the committed blob (not the message) is the backstop — Arm C reading source-at-HEAD caught this; trust that over a green test run (the tests didn't cover the comment/prune changes).
- Avoid the literal-control-char trap: a regex char-range typed into an Edit `new_string` can write actual control BYTES (NUL/0x1f) -> binary file -> ascii-guard fail. Use `\s+` for whitespace collapse; rewrite the whole file with Write if a file goes binary.
