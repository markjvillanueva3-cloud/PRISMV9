---
title: git amend staging-loss -> a commit message that claims fixes absent from the code (R12)
type: lesson
layer: L8
created: 2026-06-15
slot: zulu
session: 7efaddb4
tags: [git, amend, staging, fail-loud, R12, scrutiny, slot-worktree, verify-blob, ascii-guard]
related:
  - feedback_verify_committed_blob_not_amend_message
  - feedback_never_amend_on_shared_tree
  - feedback_verify_actual_contract_not_proxy
  - feedback_read_full_content_not_titles
  - feedback_commit_to_slot_worktree
---

# git amend staging-loss -> a commit message that claims fixes absent from the code (R12)

**Source:** ZULU-BUILDLOOP/U-ZBL-CONSUMER (INCR 4), slot:zulu, 2026-06-15. Surfaced by the
3-of-3 scrutiny gate (Arm C) reading the committed blob, not the message.

## What happened

After applying 3 scrutiny P2 fixes via the Edit tool, I tried to fold them into the prior
commit with `git commit --amend`, run across **separate Bash tool invocations** in a slot
worktree:

1. invocation N: `cd slot-worktree && git add <files> && git commit --amend ...` (blocked by a
   commit guard; the `git add` ran, staging the fixed files).
2. invocation N+1: `git commit --amend -m "<multiline>"` -> exit 255 (multiline `-m` broke
   bash quoting).
3. invocation N+2: `git commit --amend -m "<singleline>"` -> SUCCEEDED.

But between invocations the **staging did not persist** (cross-worktree index non-persistence +
peer commit-guards auto-reset the shared index). `git commit --amend` with nothing staged
amends **only the message** and keeps the **original (unfixed) tree**. A subsequent cherry-pick
propagated that unfixed tree to the running branch — carrying a message that asserted
"3xP2 fixed; 9/9 tests" while the code contained none of the three changes.

This is the textbook **R12 fail-loud violation / "title says done"** anti-pattern (sibling of
[[feedback_read_full_content_not_titles]]): a commit message is an **unverified claim**; only
the committed blob is ground truth. A green test run was true but did not cover the
comment/prune edits, so it did not catch the divergence.

## What caught it

Scrutiny **Arm C read the source-at-HEAD blob** (`git show HEAD:<file>`), not the commit
message, and FAILED — listing each claimed fix as absent with file:line. The gate exists for
exactly this. Trust a blob read over a message + a green-but-non-covering test run.

## The fix + the rule

- Re-applied the fixes and committed **atomically in ONE invocation** via
  `git commit -m "[MAIN-FORCE] ..." -- <pathspec>` (tracked files; needs no separate `git add`,
  so `git-add-lane-guard` is not triggered; `[MAIN-FORCE]` clears `worktree-commit-route` +
  `slot-commit-enforce`).
- **After any amend/commit, verify the blob:** `git show HEAD:<file> | grep -c "<expected>"`
  (>= 1) before claiming the fix shipped.
- Stage + commit in one Bash invocation; never assume staging from a prior invocation persists
  in a shared/worktree index.
- **ASCII-guard trap (same session):** a regex character-range typed into an Edit tool
  `new_string` can write literal control BYTES (NUL / 0x1f) into the source -> binary file ->
  ascii-guard fail + parse break. Use `\s+` for whitespace collapse; if a file goes binary,
  rewrite it whole with Write.

## Cross-refs

Sibling rule — the amend itself is risky on a shared tree:
[[feedback_never_amend_on_shared_tree]]. Slot-worktree commit routing:
[[feedback_commit_to_slot_worktree]]. The general "verify the real artifact, not a proxy"
rule: [[feedback_verify_actual_contract_not_proxy]].
