---
name: reference_amend_shared_tree_hazard_2026_06_09
description: "NEVER git commit --amend on a shared working tree — peers advance HEAD between your commit and the amend, so --amend rewrites a PEER's commit. Folded my doc edit into papa's commit (slot:sierra, 2026-06-09). Content-safe but mis-attributed."
type: reference
source: prism-memory
synced: 2026-06-27T20:30:46.471Z
aliases: reference_amend_shared_tree_hazard_2026_06_09
---


**Incident (slot:sierra, 2026-06-09, branch cad-fusion-live-ms0 — the SHARED H:/prism tree):** ran `git commit --amend --no-edit` to fold a P2 doc-de-stale tweak into my just-made reflect commit `47fe91554f`. The amend instead rewrote **papa's** commit `6e1fd0ab46` (U-SYNERGY-B2-DONE) → `be935e1d80`, folding my doc edit into papa's commit under papa's message.

## Root cause
`git commit --amend` rewrites whatever **HEAD currently points at**. On a shared working tree, 5–26 chats commit to the SAME branch + HEAD. Between my `git commit` (HEAD=47fe91554f) and my `git add` + `git commit --amend`, peers (alpha `c687946644`, papa `6e1fd0ab46`) committed → HEAD advanced onto papa's commit → amend rewrote papa's, not mine. Reflog proof: `HEAD@{1}: commit (amend): ...U-SYNERGY-B2-DONE (slot:papa)`.

## Damage (verified)
NONE functional. `--amend` preserves the existing tree + adds the staged change, so papa's 3 TOOLBELT.md rows are intact in `be935e1d80` (+my 1-line doc edit rode along). My two commits `2d49bf0d33`+`47fe91554f` are intact. The working-tree doc carries ALL edits, correct. The ONLY blemish: my Open-work-A de-stale edit is attributed inside papa's commit. Cosmetic, not data loss.

## Canonical doctrine this instantiates
This is a fresh occurrence of the ALREADY-DOCUMENTED rule [[feedback_never_amend_on_shared_tree]] (and a sibling of incidents [[reference_shared_tree_commit_contamination_2026_06_08]] + [[reference_uwire_ema_absorbed_into_oscar_commit_2026_06_08]]). Logged as a dated data point — the rule is not new, but the repeat across multiple slots in one session-arc confirms the hazard is live and the per-slot-worktree fix is still the real cure.

## The rule (FLEET-WIDE — all 26 slots commit on shared trees)
- **NEVER `git commit --amend` (or rebase/reset --hard) on a shared working tree.** Use a FRESH `git commit` every time — the lane guards + post-commit auto-release are built for fresh commits, and a new commit can't clobber a peer's.
- If you need to add to your last commit, make a SECOND commit (e.g. `U-X-FOLLOWUP`). Squash-on-merge happens later, off the hot tree.
- The fix for "I forgot a P2 line" is a follow-up commit, NOT an amend.
- Recovery if you already amended a peer: do NOT do more history surgery on a live racing branch (it compounds). Verify content+peer-work are intact (they are — amend keeps the tree), document the mis-attribution, move on.

## Recovery decision (R12)
Left history as-is: content complete, papa's + my work both present, zero loss. Rebasing 1 line of attribution on a live racing shared branch would risk orphaning peer commits — net-negative. Related: [[feedback_commit_to_slot_worktree]] (the deeper fix is per-slot worktrees, where amend is safe because the tree is yours), [[feedback_conflict_fork_rule]].
