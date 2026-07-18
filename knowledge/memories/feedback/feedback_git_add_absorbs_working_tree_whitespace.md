---
name: feedback_git_add_absorbs_working_tree_whitespace
description: "On the shared tree, `git add <file>` stages the file's ENTIRE current state incl pre-existing whitespace/EOL reindents — verify raw-vs-ignore-space diff before committing small edits"
type: feedback
source: prism-memory
synced: 2026-06-27T20:30:46.427Z
aliases: feedback_git_add_absorbs_working_tree_whitespace
---


On the shared `H:/prism` tree (5907+ files already modified by the fleet), `git add <specific-file>` stages the file's **entire current working-tree state**, not just the lines you edited. If that file already carried a pre-existing whitespace-only reindent or LF→CRLF flip (from another tool/slot/generator), your commit silently absorbs it — a 1-line edit shows up as a 900–1200-line diff, obscuring your real change and creating peer-merge noise.

**Why:** the working tree is shared and constantly churned. The Edit tool writes only your lines correctly, but the rest of the file may already differ from HEAD by whitespace. Observed twice in one session (2026-06-03, slot:alpha, BLACKWELL-TOKEN-SYNERGY-MS0): `orchestrationActionSchemas.ts` (1-line edit → 902-line diff) and `ollama-task-offloader.mjs` (10-line edit → 1210-line diff).

**How to apply:** before committing a small edit on the shared tree, run BOTH:
```
real=$(git diff --ignore-all-space HEAD -- <f> | grep -E '^[+-]' | grep -vE '^[+-][+-]' | wc -l)
raw=$(git diff HEAD -- <f> | grep -E '^[+-]' | grep -vE '^[+-][+-]' | wc -l)
```
If `raw >> real`, the file is carrying absorbed noise. Fix: `git show HEAD:<f> > <f>` to restore the clean baseline, then re-apply your real edits via Edit (re-read the region first — the baseline indentation may differ from the reindented working copy), then stage. This keeps the commit surgical (R3) and avoids the H8 peer-absorption class. Also note: a blocked commit (SLOT-COMMIT-ENFORCE) UNSTAGES your files — re-`git add` before retrying. See [[feedback_commit_to_slot_worktree]] · [[feedback_commit_prefix_main_on_shared_tree]].
