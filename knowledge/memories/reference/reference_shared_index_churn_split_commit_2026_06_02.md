---
name: reference_shared_index_churn_split_commit_2026_06_02
description: "On the 26-chat shared tree, surgical index staging (git apply --cached) gets WIPED by peer index resets between stage and commit — a wire can land as test-only (broken state, test without its dispatcher actions). Always verify git show HEAD contains BOTH halves."
type: reference
source: prism-memory
synced: 2026-06-27T20:30:47.187Z
aliases: reference_shared_index_churn_split_commit_2026_06_02
---


2026-06-02 slot:bravo, wiring `CodeGenerationIntegrityEngine` → `devDispatcher` (prism_dev). Two compounding shared-tree hazards bit during the commit:

**1. Surgical index-staging gets wiped by peer index resets.** The shared `H:/prism/.git/index` is hammered by ~26 chats. I used `git apply --cached` to stage ONLY my `code_integrity` hunks (excluding slot:papa's 6-day-old stale uncommitted `spreadsheet_parse_csv`/`thinking_assess`/`certificate_query` hunks sitting in the SAME file's working tree). The staging verified clean (26 insertions, 0 papa). But between the verify command and the commit command, a peer git op reset the shared index → my devDispatcher staging was WIPED → the bare `git commit` committed **only the test file** (`6c72c58615`), NOT the dispatcher wire. Result: a committed test that imports `registerDevDispatcher` and calls `code_integrity_*` actions that DON'T EXIST in the committed dispatcher → broken on fresh checkout (R12 latent-broken-build). Had to land the dispatcher hunks in a SECOND commit (`f47a05d285`).

**2. index.lock held by hung/zombie git.** A retry loop hit `index.lock` present on 8/8 tries (24s) — held by 11-min-old git.exe zombies (env degradation). It cleared intermittently; the commit landed on a free window.

**Why (R12 + shared-tree-absorption family):** a "tests pass" claim is a LIE if the test passed only against the *working tree* while the *committed* tree is missing the code the test exercises. **How to apply:**
1. After committing ANY wire (engine+dispatcher+test), VERIFY the committed tree has BOTH halves: `git show HEAD:<dispatcher> | grep -c <action>` (expect the enum+case count) AND `git log -1 -- <test>`. A test-only or dispatcher-only commit is broken — complete it before yielding.
2. Under heavy shared-index churn, do `git apply --cached <my-hunks.patch>` + `git commit` in ONE tight chain (sub-second window), with a guard: `STAGED == my-file && papa-lines==0 && my-action-count>=N` before commit. Re-verify after.
3. Cannot use `git commit -- <pathspec>` to dodge index churn when the file ALSO has a peer's uncommitted working-tree hunks — pathspec re-reads the working tree and ABSORBS the peer's hunks. Index-staging (apply --cached) is the only way to commit a hunk-subset of a file; accept it may need retries.
4. The canonical fix for chronic shared-tree contention is the slot-worktree model ([[feedback_commit_to_slot_worktree]], [[feedback_conflict_fork_rule]]) — a per-slot index with zero peer contention. This session ran on the shared `cad-fusion-live-ms0` tree ([MAIN] commits), so it ate the churn.

Ties to [[feedback_shared_tree_absorption_pattern]], [[reference_session_wire_orphans_tsc_drift_2026_06_02]]. CodeGenerationIntegrityEngine was a true orphan (sole reference was a doc comment in AIDeepKnowledgeIntegrationEngine, not a call).
