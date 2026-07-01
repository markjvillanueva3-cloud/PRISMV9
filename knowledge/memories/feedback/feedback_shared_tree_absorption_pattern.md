---
name: feedback-shared-tree-absorption-pattern
description: "Doctrine — when committing on the shared H:/prism tree while peers are active, your files will be absorbed into peer commits (the next `git commit` by any chat catches everything staged). Compensate with explicit re-attribution memos."
type: feedback
source: prism-memory
synced: 2026-06-27T20:30:46.444Z
aliases: feedback_shared_tree_absorption_pattern
---


# Shared-tree commit-absorption — operating procedure

## Rule

When you commit on the shared `H:/prism` tree (because your slot worktree is locked, or because slot-bridge hooks are disabled per `5828080636`):

1. **Your files will be absorbed into the next peer commit**, NOT into a commit subject you author. Even if you `git add ... && git commit -m "..."`, a peer's earlier `git commit` (running concurrently) catches your staged paths first.

2. **The peer's commit subject becomes the attribution of record.** Your unit-id + slot are NOT in the commit subject line. Future `git log --grep="U-MY-UNIT"` returns zero hits.

3. **Operators who search commit history will not find your work via subject-line search.** They must `git log -p -- <file>` per file.

## Why

The shared `H:/prism` tree is co-occupied by all ≤26 chat slots. Each chat's `git add` stages into the SAME `.git/index`. When any chat issues `git commit`, the index is FROZEN at that moment and committed — including every staged file from every other chat. Hooks like `git-add-lane-guard` exist specifically to prevent this by routing chats into per-slot worktrees (`H:/prism-slot-<nato>` on `slot/<nato>` branches), but when those hooks are disabled (per the 2026-05-26 disable in commit `5828080636`) absorption is the default outcome.

## How to apply

When you anticipate or detect absorption:

1. **Write a re-attribution memo as the FINAL commit step.** Memo body lists:
   - All files of your unit
   - The peer commit SHAs that absorbed each file (`git log --oneline -1 -- <file>`)
   - Your canonical unit-id + slot
   - A `git log --diff-filter=A -- <file>` command for searching
   The memo IS attributable to YOU because it's the only thing left in your working tree when peer absorption clears your staging.

2. **Commit the memo with your `[MAIN] [SCOPE]/U-ID` prefix.** Even if THIS commit also gets absorbed, the memo content names the unit.

3. **Cross-reference the memo from MEMORY-RECENT.md + the wiki.** Operator search-by-topic finds the work even when search-by-commit-subject fails.

4. **Do NOT amend or rewrite peer commits to add your attribution.** Per CLAUDE.md "Always create NEW commits rather than amending" + "force-push to main is forbidden" — those are destructive operations that lose peer history.

5. **ROBUST PREVENTION — commit with an explicit pathspec:** `git commit -m "<msg>" -- <path1> <path2>`.
   This commits ONLY the named paths (from the working tree), IGNORING whatever else is staged in the shared
   index. It defeats absorption in BOTH directions — neither do your paths leak into a peer's bare commit, nor
   does a peer's staged file ride along in yours. `git add <paths> && git commit` does NOT protect you: a
   path-scoped `add` is fine, but the bare `commit` still freezes-and-commits the WHOLE shared index. Verify
   with `git diff --stat --cached` before committing (the pathspec form makes this moot). This is strictly
   better than the old "stage+commit fast before a peer sneaks in" race.

   **Inverse-absorption evidence (2026-06-01, slot:bravo, U-DREAM-SCANNER-WIRE):** a path-scoped `git add` of 2
   files + a bare `git commit` swept in 7 peer-staged `install-*.ps1` under MY commit subject (`c7e69d2909`) —
   the peer's work now reads done-by-me. Attempted the guarded soft-reset recovery (#below); the guard CORRECTLY
   ABORTED because peer `8998f53693` had already landed on top (a reset would have clobbered the peer commit).
   So: prevention (pathspec) >> recovery. Once a peer builds on your over-broad commit, it's immutable.

6. **Recovery (only if HEAD is still YOURS):** `git reset --soft HEAD~1 && git reset -q && git commit -- <your paths>`,
   GUARDED on `[ "$(git rev-parse --short=10 HEAD)" = "<your-sha>" ]`. If a peer already committed on top, do
   NOT reset (you'd rewrite their history) — leave it mis-attributed + write a re-attribution memo (#1-3).

## When to cap investigation

Per `feedback_autonomous_loop_drift_discipline`: if you've spent ≥1 extra tick fighting the absorption, **document the state + move on**. The work IS shipped (the absorbed commit has your diff). The attribution drift is a doc-surface problem, not a code-surface problem.

## When this rule does NOT apply

- **Slot worktrees** (`H:/prism-slot-<nato>` on `slot/<nato>`) — index is per-worktree, no cross-chat staging interference. THIS is the canonical fix; this absorption rule is the fallback when worktrees aren't available.
- **Single-chat sessions** — no peers = no absorption.
- **Detached fork worktrees** per `feedback_conflict_fork_rule` — `git worktree add H:/prism-<scope>` creates an isolated index.

## Evidence

Observed 2026-05-26 (slot:papa /goal /loop iter1):
- 10 files of the PSN-EXTRACTED-CONVERT pipeline absorbed into 3 separate peer commits:
  - `7a6952b3ad` [POST-PROCESSOR-CONSOLIDATION-2026-05-25] absorbed 5 files
  - `b210018020` [UI-UX-IMPROVEMENT-MS0]/U-F7 (slot:quebec) absorbed 4 files
  - `8050164a65` [JULIETT-DB-BRIDGE-MS0]/U-DB-BRIDGE-03-EXT (slot:juliett) absorbed the re-attribution memo itself

- Pre-existing observation (alpha 2026-05-23 noted in [[reference_psn_nudge_r12_audit_chain_2026_05_23]]): "U-BRIDGE-WIRE-AGENT absorbed into hotel peer commit (oscar 2026-05-23)". Pattern is recurring across many chats.

## Related

- [[feedback_commit_to_slot_worktree]] — canonical fix (use slot worktrees)
- [[feedback_conflict_fork_rule]] — sibling fork as second fallback
- [[feedback_commit_prefix_main_on_shared_tree]] — `[MAIN]` prefix when forced into shared tree
- [[reference_extracted_modules_pipeline_2026_05_26]] — first deliberate use of re-attribution discipline
