---
name: feedback_galaxy_self_commit
description: "Each chat galaxy/slot handles its OWN git commits now — it lands its own work directly on the integration branch (cad-fusion-live-ms0), it does NOT defer to golf as an integrator. Supersedes the golf-merges-everything model."
type: feedback
source: prism-memory
synced: 2026-06-27T20:30:46.427Z
aliases: feedback_galaxy_self_commit
---


2026-05-30 (operator directive, slot:bravo): **"each chat galaxy handles their own git commits now."**

**Why:** the prior model routed slot work to a `work/`/`slot/` branch and waited for golf to integrate into `cad-fusion-live-ms0`. That created a hand-off dependency + stale work sitting on branches. Each galaxy owning its own commit end-to-end removes the bottleneck. Pairs with [[feedback_all_slots_free_access]] (golf-only-git rule already removed) and supersedes the "golf is the integrator" framing in older CLAUDE.md slot-worktree sections.

**How to apply:**
- Land your galaxy's finished, reviewed work **directly on `cad-fusion-live-ms0`** yourself — do NOT mark "golf merge" as a deferred item.
- Commit format unchanged: `[SCOPE]/U-ID: title`. On the shared main tree, the `[MAIN]` prefix is REQUIRED for the `worktree-commit-route` hook to pass — and it must appear **inline literal in the `git commit -m "..."`** (a `$VAR`-expanded message defeats the hook's command-string parse → it blocks). [[feedback_commit_prefix_main_on_shared_tree]].
- Main is high-contention (`index.lock` held by peers). Use a **retry loop** (`for attempt in 1..8; git commit ... || sleep 4`) — the lock is transient; commits land within a few attempts. Path-scope the commit (`git commit -m "..." -- <files>`, message BEFORE `--`) so a peer's pre-staged file is never swept in. NEVER `git add -A`.
- If main's working tree is dirty on a file you also edited (e.g. CLAUDE.md is frequently peer-dirty), do NOT clobber it — land the rest path-scoped and reconcile that one file separately. To land a clean superset without losing peer edits, first confirm peers didn't touch your edited files (`git diff <base> <head> -- <file>` empty), then `git checkout <yourcommit> -- <paths>` + commit.
- Verify before relying: `git log --oneline -1` + `git show --stat HEAD`.

First applied: ZULU-OBSIDIAN-LIVE-MS0 landed as `34e2a9cdc4` (10 files) directly on main by slot:bravo (after the HEAD-fix `71c7be4e38`), instead of deferring to golf. [[reference_zulu_obsidian_live_2026_05_30]].
