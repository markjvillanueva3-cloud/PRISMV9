---
name: feedback_check_inprogress_git_op_before_commit
description: "Before `git commit` on the shared cad-fusion-live-ms0 tree, check for an in-progress cherry-pick/merge/rebase — a peer's mid-cherry-pick state makes YOUR commit complete THEIR cherry-pick using your staged index, folding your files into their commit"
type: feedback
source: prism-memory
synced: 2026-06-27T20:30:46.419Z
aliases: feedback_check_inprogress_git_op_before_commit
---


**Rule:** Before ANY `git commit` on the shared `H:/prism` tree (`cad-fusion-live-ms0`), check for an in-progress git operation:
```bash
ls .git/CHERRY_PICK_HEAD .git/MERGE_HEAD .git/rebase-merge 2>/dev/null
```
If any exists, a peer/automation left the tree mid-operation. Do NOT `git commit` — your `git commit` would **complete THEIR cherry-pick/merge** using the current index (which now includes YOUR `git add`ed files), folding your files into their commit under their message. Wait for the op to clear (it usually resolves in seconds via the peer's automation), then commit.

**Why (lived it 2026-06-14, slot:romeo):** I ran `git add <3 files>` then `git commit -F -` to land U-WIRE-COUNTERFACTUAL-MILL. A peer (papa's autonomous loop) had a cherry-pick IN PROGRESS on the shared tree at that instant. My `git commit` completed papa's cherry-pick — folding my 3 files (counterfactual-wire.test.ts + millActionSchemas.ts + millDispatcher.ts) into papa's commit `a3ab445d1c` (U-WORKLIST). Verified: `git diff HEAD -- <my files>` empty (committed), `git show --stat a3ab445d1c` = my 3 files + 1 papa file, wire LIVE 12/12. No data lost; attribution wrong. Not rewritten (peers built on it). Flagged papa on chat-bus.

**This is a SIBLING of [[feedback_never_amend_on_shared_tree]]** — both are shared-tree commit hazards where HEAD/index state is contaminated by a concurrent peer. The `--amend` variant rewrites a peer's commit; this cherry-pick-in-progress variant folds your files into a peer's pending commit. Same root cause: the shared tree is a multi-writer integration branch and any git op that consumes the index is unsafe while a peer holds it mid-operation.

**How to apply:**
- Pre-commit guard on shared tree: `test -e .git/CHERRY_PICK_HEAD -o -e .git/MERGE_HEAD && { echo "in-progress git op -- wait"; } || git commit ...`
- The durable fix is the slot-worktree model: commit from `H:/prism-slot-romeo` (own HEAD pointer + git lock = no shared-tree contention). The slot worktree being ~3000 commits behind MAIN is the tradeoff ([[feedback_romeo_check_main_not_slot_for_dormancy]]).
- DOMAIN-OVERLAP note: romeo AND papa were both autonomously wiring the same 54-engine UNWIRED-ENGINE-AUDIT backlog -> high collision + double-wire risk. Partition the backlog via chat-bus before wiring (romeo = ROMEO-WIRING-QUEUE.md WIREABLE list; papa = H-DRIVE + cross-domain). A double-wire = duplicate z.enum entry = build break (the "tolerating-ghost-actions-in-zod-enum" romeo refuses).

Recovery if it already happened: the wire is committed + functional under the peer's commit -> leave it (do NOT rebase a shared branch peers built on), flag the peer on chat-bus, record provenance in memory. Re-verify the wire works at HEAD.

**RECURRENCE 2026-06-15 (slot:romeo) — the pre-commit check is INSUFFICIENT against the race.** It happened AGAIN: my `[JM-BY-MACHINE]/U-FLEET-LIBS` (generator + test + 70 by-machine CSV files) folded into **alpha's commit `db02ed6b11`** (`[FORCE-USE-MAP-MS0]/U-GREP-INDEX-FORCE-P2`). This time I DID run the `ls .git/CHERRY_PICK_HEAD .git/MERGE_HEAD` pre-check immediately before `git add` and it was CLEAN — but a peer's cherry-pick STARTED in the race window BETWEEN my `git add` and my `git commit`, so my commit completed it. **The pre-check narrows but does NOT close the race** (the window is add→commit, and the check is before add). Verified intact: 68 by-machine files + generator + test all in HEAD, 7/7 tests pass — data LIVE + correct under alpha's commit, attribution wrong, peers (india, zulu) built on top so NOT rewritten. Also hit an `index.lock` from a crashed peer (92s stale) cleared per the age-gate.

**Durable fixes (the pre-check is a band-aid):** (1) **commit from the slot worktree** `H:/prism-slot-romeo` (own HEAD + own index.lock = the shared cad-fusion-live-ms0 index is never touched, so no peer cherry-pick can consume it) -- this is THE fix; the tradeoff is the slot tree being ~3000 commits behind. (2) If forced to commit in the shared MAIN tree, re-check `CHERRY_PICK_HEAD` AGAIN in the SAME command as `git commit` (`test -e .git/CHERRY_PICK_HEAD && exit 1 || git commit ...`) to shrink the window to near-zero -- still racy but far tighter than a separate-call pre-check. The two-call add-then-commit on a shared multi-writer index is fundamentally unsafe; prefer the worktree. Twice now (papa `a3ab445d1c`, alpha `db02ed6b11`) JM-tool-DATA work has been absorbed this way.

**THIRD OCCURRENCE 2026-06-15 (slot:romeo) — REVERSE direction + a NEW root cause: pathspec-less `git commit` swept a PEER's STAGED files INTO my commit.** Wiring `U-WIRE-HOLDER-SELECT` (commit `988f44e8e5`) I ran `git add <my 2 files>` then `git commit -m ...` (NO `-- pathspec`). The shared index ALREADY held **tango's staged** `TANGO-ENGINE-ALGO-ASSESSMENT-2026-06-15.md` (+21/-5, the 9->29 dormant-algo correction) + 1 `MEMORY-RECENT.md` line -- so my `git commit` committed all FOUR staged entries, folding tango's pending work into MY commit under MY message. This is the MIRROR of the first two (there: my files -> peer commit via peer's cherry-pick consuming the index; here: peer's files -> my commit via my pathspec-less commit consuming the whole index). Same shared-multi-writer-index root cause, opposite direction. Content 100% intact (no loss); not rewritten (shared branch); flagged tango on chat-bus. The dozens of other `M` (unstaged) working-tree files were correctly NOT committed -- only the 4 STAGED entries were, confirming the mechanism is "commit grabs the whole staged index."

**THE clean fix for this variant -- ALWAYS scope the commit with an explicit pathspec on the shared tree:**
```bash
git commit -- mcp-server/src/tools/dispatchers/camDispatcher.ts mcp-server/src/__tests__/foo.test.ts -m "..."
```
`git commit -- <paths>` commits ONLY those paths from the index and leaves every peer-staged entry untouched. This closes the sweep-peer-staged direction completely (it does NOT close the cherry-pick-in-progress direction -- that still needs the slot worktree or the same-command CHERRY_PICK_HEAD guard). **Combined shared-tree commit discipline: (a) commit from the slot worktree when possible; (b) else `git commit -- <explicit pathspec>` (never bare `git commit`/`-a`) AND the same-command `CHERRY_PICK_HEAD` guard.** Three incidents now (`a3ab445d1c`, `db02ed6b11`, `988f44e8e5`) -- the bare add-then-commit on the shared index is proven unsafe in BOTH directions.
