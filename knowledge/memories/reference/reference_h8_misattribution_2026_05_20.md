---
name: reference-h8-misattribution-2026-05-20
description: "U-STOP-HOOK-AGGREGATOR (H8) shipped 2026-05-20 by echo (claude-4278393c) but absorbed into hotel-slot peer commit 30b7d45f1d [MAIN] [COST-CASCADE-MS0]/U-COST-DASHBOARD — shared-tree git-add window class. Same pattern as iter2 HTML-adopt 2026-05-18."
aliases: reference_h8_misattribution_2026_05_20
type: reference
source: prism-memory
synced: 2026-06-09T14:54:09.135Z
---


H8 of [[audit-system-synergy-2026-05-09]] shipped functionally — 4 files (`scripts/lib/stop-hook-aggregator-lib.mjs`, `scripts/lib/stop-hook-aggregator-lib.test.mjs`, `.claude/hooks/stop-hook-aggregator.mjs`, `knowledge/wiki/architecture/stop-hook-aggregator.md`) are in HEAD, the hook is wired in both `C:` + `H:` `.claude/settings.json` (Stop chain position 49), 37/37 hermetic tests pass, and a real Stop event in the prior session produced one valid JSONL ledger entry. **Functionally complete.**

**Misattribution**: the introducing commit per `git log --diff-filter=A` is `30b7d45f1d` — `[MAIN] [COST-CASCADE-MS0]/U-COST-DASHBOARD` (hotel slot, slot:hotel directive). The commit body honestly names its own 3 cost-dashboard files; H8's 4 files were swept in by `git add` because echo had staged them on the shared `H:/prism` tree concurrent with hotel's add window. This is identical to [[reference_iter2_html_adopt_misattribution_2026_05_18]] (lima's iter2 work swept into a peer commit, same window class).

**Why it happened (R8 lesson):** echo hit the precompact hard-threshold cap before its own commit could fire — the prior session shows `git reset` was run, `git add` re-staged H8's 4 files explicitly by pathspec, but the `git commit` was REJECTED by the precompact-pending-guard at 99% context. The 4 staged files sat in the shared `.git/index` until the next peer chat's `git add` swept them up. This is the **shared-tree staged-but-uncommitted persistence** failure mode: a stale stage on the shared tree is the next peer's `-A` accident waiting to happen.

**Honest record**: the H8 close-out commit subject `[SYNERGY-AUDIT-CONTINUE]/U-STOP-HOOK-AGGREGATOR (slot:echo)` was never written. Audit + envelope tooling that keys off commit subjects (`build-milestone-progress.mjs`, the `audit-close-out-candidates.mjs` shipped-but-pending detector, slot-task-claim post-commit auto-release) will not credit echo for this unit — `30b7d45f1d` reads as a hotel U-COST-DASHBOARD commit. The work is real; the attribution is wrong.

**Three options (do NOT auto-fix — operator decision):**
1. Leave it. Functional state is correct; `## Recent regressions` carries the lesson. Cheapest.
2. Backfill commit `git commit --allow-empty -m "[MAIN] [SYNERGY-AUDIT-CONTINUE]/U-STOP-HOOK-AGGREGATOR (slot:echo): post-hoc attribution — files landed in 30b7d45f1d"` — makes envelope tooling see echo's name on the unit. Empty commit is the cleanest non-destructive surface.
3. Amend `30b7d45f1d` — REJECTED. It's not echo's commit; rewriting peer history is the destructive class.

**Forward prevention pattern (queue as new unit if recurring):** at `/checkin-<slot>` step 2c or via a new PreToolUse `git-add-stale-stage-guard.mjs` — before any `git add`, scan `git diff --cached --name-only` for files staged by a non-current-slot owner (cross-reference `chat-slots.json[<slot>].cwd` mtime vs file mtime). Refuse to absorb peer-staged files into the current chat's add scope. **The slot-worktree migration is the real fix** ([[reference_slot_worktree_activation_2026_05_16]]) — slot has its own `.git/index` so the absorption window structurally cannot exist. Echo has not migrated; alpha + bravo + delta + lima have.

Related:
- [[reference_iter2_html_adopt_misattribution_2026_05_18]] — sister incident, same class, 2 days prior
- [[reference_u_stop_hook_aggregator_2026_05_20]] — the H8 close-out memory (mentions misattribution honestly)
- [[reference_slot_worktree_activation_2026_05_16]] — structural fix
- [[feedback_commit_prefix_main_on_shared_tree]] — adjacent shared-tree commit discipline
