---
name: feedback-never-amend-on-shared-tree
description: "NEVER git --amend on the shared cad-fusion-live-ms0 tree — a peer commit landing between your add and amend makes --amend replace the PEER's commit, absorbing their files under your subject"
type: feedback
source: prism-memory
synced: 2026-06-27T20:30:46.435Z
aliases: feedback_never_amend_on_shared_tree
---


# NEVER `git --amend` on the shared `cad-fusion-live-ms0` tree

**Why:** the shared main tree is high-peer-contention (26 chats commit to it). `git --amend` rewrites the *current HEAD* commit. On a shared tree, a peer commit can land between your `git add` and your `git commit --amend` — at which point HEAD is no longer YOUR commit, and `--amend` rewrites the PEER's commit instead. Their files get absorbed under your commit subject (the [[reference_h8_misattribution_2026_05_20|H8 misattribution]] class the slot-commit-enforce hook exists to prevent), and their original commit is orphaned to the reflog.

**Observed 2026-06-08 (slot:papa):** I committed `U-LEARN-REVIVE01` (`1a5c7f8`, correct, 4 files). Golf's `U-ULTRACODE-GOLF` (`23ad2cdf`) landed on top. I then ran `git commit --amend` intending to fold a scrutiny fix into MY commit — but `--amend` operated on golf's commit (now HEAD), producing `b4a8ecd1` carrying golf's 5 files (intake-quarantine-guard, tournament-rank, ULTRACODE-SYNERGY spec) under MY `U-LEARN-REVIVE01` subject. No work was lost (files intact in tree) but golf's attribution was destroyed. Couldn't safely fix: 2 peer commits had already built on the bad ancestry, so a rebase would rewrite peer history (worse). Resolved by chat-bus attribution-correction + this lesson, NOT a rewrite.

**Recurred 2026-06-12 (slot:romeo) — 3rd time (papa 6-08, sierra 6-09 [[reference_amend_shared_tree_hazard_2026_06_09]], romeo 6-12):** committed `241140e6b6` (U-DBCON-G1), then ~minutes later `--amend --no-edit` to fold a 6-line reviewer-B test hardening. charlie + india had each committed on top meanwhile, so `--amend` rewrote **india's** `c15c5a2183` -> `b2c85e0843`, folding my romeo test change into india's commit under india's subject; zulu then built on top, baking it in. Tree correct at HEAD, no data lost, ACCEPTED (no rebase — 2 peers already on top). **This rule is documented yet keeps recurring** -- the durable fix is structural: do slot-domain work from the slot worktree (`slot/<nato>`), and for the rare MAIN [MAIN-FORCE] commit, fold ALL post-review hardening BEFORE the single commit so there is never anything to amend.

**How to apply:**
- On the shared tree, ALWAYS commit a **follow-up** commit for fixes (a new `-FIX` commit), NEVER `--amend`. A follow-up touches only your staged files and can't absorb a peer's HEAD. (I did exactly this for the actual scrutiny fix → `0c2250f1` `U-LEARN-REVIVE01-FIX`, clean 2-file commit.)
- The real fix is the slot-worktree model: commit from `H:/prism-slot-papa` on `slot/papa` (own HEAD pointer + git lock = no race). The slot-commit-enforce hook blocks shared-tree commits for exactly this reason; the `[BOOTSTRAP-SLOT-ENFORCE]` token is a one-shot bypass that does NOT make `--amend` safe.
- Before ANY `--amend`, verify `git rev-parse HEAD` is still YOUR last commit (`git log -1 --format=%s` shows your subject). If a peer commit is on top, `--amend` is unsafe — commit a follow-up.

Related: [[feedback_commit_to_slot_worktree]], [[feedback_commit_prefix_main_on_shared_tree]], [[reference_obsidian_learning_revival_2026_06_08]] (the unit during which this happened). CLAUDE.md §PER-CHAT HANDOFF ([[reference_h8_misattribution_2026_05_20|H8 misattribution]]), §SLOT-WORKTREE-MS0.
