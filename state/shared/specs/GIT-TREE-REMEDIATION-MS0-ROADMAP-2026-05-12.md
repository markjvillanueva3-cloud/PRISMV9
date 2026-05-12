# GIT-TREE-REMEDIATION-MS0 — Roadmap

> **Generated:** 2026-05-12 · **Generator:** `/rgs6` pipeline, domain-adapted (git-infra/ops, not engine-build — "wiring" = settings.json hook registration + git config; "tests" = verification commands: `git fsck` / `git count-objects -vH` / `git push --dry-run` / `git merge-base --is-ancestor` assertions). · **Scope tag:** `[GIT-CLEANUP]` · **Status:** PLANNING — no git mutations performed during generation.
> **Source audit:** 4-agent parallel forensic pass 2026-05-12 (forensics / worktree-branch inventory / repo-bloat / PRISM git-tooling recon). Prior artifact: `state/shared/GIT-TOPOLOGY-AUDIT-2026-05-11.md` (commit `2d0859a31`, side branch).
> **Not registered in `mcp-server/data/roadmap-index.json`** — this is single-operator serial ops + decision gates, not 6-chat parallelizable engine work. RGS discipline applied (atomic-first, dependency-ordered, every unit has acceptance criteria, tier floors, no orphan units); the engine-centric S2.5/S2.6 fan-out (ai-priority-rank, atomic-roadmap-emit, per-domain subagent scrutiny) is N/A for this domain and was skipped deliberately.

---

## META

| Field | Value |
|---|---|
| Milestone | `GIT-TREE-REMEDIATION-MS0` |
| Tier | **2** (dev-tools / system-knowledge — git infra; per AI-PRIORITY LAW this is priority-class 2 "development tools" — it accelerates *every* future milestone by making the repo pushable, small, and bifurcation-resistant) |
| Total units | 23 (`U-GC-00` … `U-GC-22`) — 3 decision gates, 5 phases |
| Parallelizable | Mostly NO. P0 units are independent; everything from P2 on is serial + needs a fleet-quiesce window. |
| Leverage rationale | Today: `cad-fusion-live-ms0` cannot push (113 MB blob); `.git` is 42.4 GB; the repo silently re-bifurcates every time a chat creates a worktree. Realized after MS0: pushable trunk, `.git` < 2 GB, one canonical trunk, harness-created worktrees inherit it, `[MAIN]` can't mask trunk drift. Every chat, every session, every commit benefits. Leverage score: **9/10**. |
| Quiesce windows needed | 1 (for P2 — the history rewrite + force-push; ~30–60 min with all 8 chats frozen). |
| Rollback posture | P0/P1 are commits (revertable). P2 force-push is the irreversible point — full mirror backup of `.git` taken at `U-GC-09`. P3 reconciliation done on a staging branch first. |

### Decision gates (BLOCKING — the roadmap cannot proceed past these without the user)

| ID | Decision | Default recommendation | Blocks |
|---|---|---|---|
| `U-GC-00` | **Which trunk is canonical?** | `cad-fusion-live-ms0` (1211 vs 874 commits, live vs frozen-5-days, checked out everywhere; all 4 audit agents concur) | `U-GC-06`, `U-GC-07`, `U-GC-12`, `U-GC-13` |
| `U-GC-01` | **`archive/forge-orphans-2026-05-01` (3.09 GB whisper model + ~9881 orphaned files): keep as cold storage, or delete (−3.3 GB)?** | Keep the branch; rely on `gc --prune=now` to reclaim the *loose* garbage without touching it (the 3 GB stays packed on that branch only, doesn't bloat `main`/`cad-f` checkouts). Re-evaluate after `U-GC-04`. | `U-GC-20` |
| `U-GC-02` | **History rewrite + force-push to unblock `cad-f`'s push: do it, or accept `cad-f` never pushes (H:-drive copy stays the source of truth — roughly the current reality)?** | Do it — a pushable trunk is worth one quiesce window. | `U-GC-09`, `U-GC-10` |

---

## DEPENDENCY DAG

```
U-GC-00 (trunk?) ─┬─→ U-GC-06 ─→ U-GC-07 ─→ U-GC-08
                  └─→ U-GC-12 ─→ U-GC-13
U-GC-01 (archive?) ─→ U-GC-20
U-GC-02 (rewrite?) ─→ U-GC-09 ─→ U-GC-10 ─→ (P4 reset --hard ops)

P0  U-GC-03  U-GC-04  U-GC-05            (independent; tier-0; do now, no quiesce)
P1  U-GC-06 ← U-GC-00 ; U-GC-07 ← U-GC-06 ; U-GC-08 ← U-GC-07   (tier-0/1; low risk)
P4-pre  U-GC-14 (sweep dirty worktrees)  ──gates──→  P2
P2  U-GC-09 ← {U-GC-02, U-GC-14, U-GC-03, U-GC-04} ; U-GC-10 ← U-GC-09   (tier-1; QUIESCE)
P3  U-GC-11 ← U-GC-10 ; U-GC-12 ← {U-GC-11, U-GC-00} ; U-GC-13 ← U-GC-12  (tier-2; staging-branch)
P4  U-GC-15..U-GC-20 ← U-GC-13 (SHAs stable)        (tier-3; cleanup)
P5  U-GC-21 ← all ; U-GC-22 ← U-GC-21               (tier-3; verify+doc)
```

Tier-floor invariant: **P0 must complete before P2** (the `.gitignore` + `rm --cached` must land so the rewrite has a clean target); **`U-GC-14` (dirty-worktree sweep) is a HARD prerequisite for `U-GC-09`** (the force-push makes every worktree `reset --hard`, which destroys uncommitted WIP — there's ~17 k+ uncommitted lines across the 40 worktrees today).

---

## PHASE 0 — Zero-risk, no history rewrite (do now; no fleet quiesce)

### `U-GC-03` — Add the `.gitignore` block for generated artifacts
- **Type:** config / commit (`[MAIN] [GIT-CLEANUP]/U-GC-03`)
- **Why:** stops the bleeding — `system-graph.json` and friends never get committed again. Prerequisite for a clean rewrite target in P2.
- **What:** append to root `.gitignore`: `state/shared/system-viz/system-graph.json`, `state/shared/system-viz/graph.cypher`, `state/shared/system-viz/obsidian-augmentation.json`, `state/shared/system-viz/*-augmentation.json`, `state/shared/system-viz/data-catalogs-atomic-augmentation.json`, `**/.serena/cache/`, `mcp-server/.serena/`, `c/tmp/`, `mcp-server/tmp/`, `mcp-server/dev/null`, `models/*.bin`, `state/shared/tribal-embed-index.json`, `mcp-server/data/state/CAM_TRIBAL_RAG_INDEX.json`, `Docustrata/.index/*.json` (keep the `.py` scripts). Verify nothing legitimately-needed matches `models/*.bin` first.
- **Depends on:** nothing. **Blocks:** `U-GC-04`, `U-GC-09`.
- **Acceptance:** `git check-ignore state/shared/system-viz/system-graph.json` → matched; `git status --porcelain | grep system-graph` → empty after `U-GC-04`; `node --check` (n/a, no code).
- **Risk:** none (additive). **Quiesce:** no. **Owner-hint:** any chat / direct.

### `U-GC-04` — `git rm --cached` the now-ignored tracked artifacts
- **Type:** git-op / commit
- **Why:** removes the 118.76 MB `system-graph.json` blob (+ `graph.cypher`, the augmentation JSONs, `mcp-server/dev/null`) from the *next* tree, so future commits don't carry it — partial relief ahead of the full history strip in P2.
- **What:** `git rm --cached state/shared/system-viz/system-graph.json state/shared/system-viz/graph.cypher state/shared/system-viz/obsidian-augmentation.json state/shared/system-viz/*-augmentation.json mcp-server/dev/null` (+ any others from `U-GC-03`'s list that are currently tracked: `git ls-files | grep -E '<patterns>'`). Commit.
- **Depends on:** `U-GC-03`. **Blocks:** `U-GC-09` (cleaner pre-rewrite state).
- **Acceptance:** `git ls-files | grep -c system-graph.json` → 0; `git cat-file -s $(git rev-parse HEAD:state/shared/system-viz/system-graph.json 2>/dev/null)` → errors (path gone from HEAD tree); `/system-viz` still runs (regenerates the file as ignored).
- **Risk:** LOW — confirm `scripts/system-viz-query.mjs` and the `/system-viz` server tolerate `system-graph.json` being absent on a fresh checkout (it regenerates it). **Quiesce:** no. **Owner-hint:** direct.

### `U-GC-05` — `git reflog expire --expire=now --all && git gc --prune=now`
- **Type:** git-op (no commit — repo-local maintenance)
- **Why:** reclaims the bulk of the 41.5 GiB loose-object garbage (16 511 prune-packable objects, dead `system-graph.json` versions, orphaned `.serena` caches, `audit.jsonl` history-but-untracked). Expected `.git`: ~42 GB → ~3–5 GB. Does NOT rewrite any branch.
- **What:** `git reflog expire --expire=now --all` then `git gc --prune=now` (NOT `--aggressive` first time — too slow; can do `--aggressive` later in P5).
- **Depends on:** `U-GC-14` (sweep dirty/abandoned worktrees first — `gc --prune=now` drops objects only reachable from dead-worktree reflogs; if a worktree has uncommitted WIP that's never been committed, it's NOT in any reflog and survives, but a worktree that was `reset --hard`'d loses its old reflog → those objects go. So: sweep first.). **Soft-blocks on `U-GC-14`** but can run before P2 independently.
- **Acceptance:** `git count-objects -vH` → `size` < 5 GiB, `count` (loose) < 50 k; `git fsck --full` → no errors; all worktrees still `git status` cleanly.
- **Risk:** LOW — only drops unreachable objects; irreversible but only affects garbage. **Quiesce:** brief (no chat should be mid-`git gc`); ideally announce. **Owner-hint:** direct.

### `U-GC-06b` *(part of P0 — listed here, executes in P0)* — Remove the `brave-euclid` stray worktree + delete the 14 `worktree-agent-*` cruft branches
- **Type:** git-op (no commit)
- **Why:** `H:/PRISM/.claude/worktrees/brave-euclid` has a `.git` file pointing at `C:/PRISM/.git/...` (wrong drive) — not a worktree of this repo, pure orphan. The 14 `worktree-agent-*` branches are all ancestors of `main`, have no worktree dirs, are auto-generated cruft.
- **What:** `rm -rf H:/PRISM/.claude/worktrees/brave-euclid` (or `git worktree remove --force` if git knows about it — it doesn't, so `rm`); `git worktree prune`; for each `worktree-agent-*`: `git merge-base --is-ancestor <b> main && git branch -D <b>`.
- **Depends on:** nothing. **Blocks:** nothing.
- **Acceptance:** `git worktree list | grep -c brave-euclid` → 0; `git branch | grep -c worktree-agent` → 0; `git fsck` clean.
- **Risk:** LOW (the agent branches are merged-into-main; per "never delete only disable" these are auto-cruft not user assets, but get the user's nod). **Quiesce:** no. **Owner-hint:** direct. *(Renumbered note: this is unit "U-GC-04b" in execution order; kept here for grouping. Use id `U-GC-04` for the rm-cached commit and a sibling `U-GC-04b` for branch cruft, OR merge into one P0 housekeeping commit — operator's choice.)*

---

## PHASE 1 — Process fixes so it doesn't re-bifurcate (low risk; after P0; before/independent of P2)

### `U-GC-05cfg` *(executes in P1)* — `git config worktree.baseRef head`
- **Type:** config (git config, not a commit — `.git/config` is repo-local)
- **Why:** `worktree.baseRef` is currently **unset** → the harness `EnterWorktree` default is `fresh` = "branch from `origin/<default-branch>`" = `origin/main`. So every harness-created worktree forks off `main` while the live repo is `cad-fusion-live-ms0` — a direct, mechanical bifurcation vector. Setting `head` makes new worktrees inherit whatever's checked out.
- **What:** `git config worktree.baseRef head` (or, post-`U-GC-13` when `cad-f`→`main`, this becomes moot but harmless).
- **Depends on:** nothing (independent of `U-GC-00`). **Blocks:** nothing.
- **Acceptance:** `git config --get worktree.baseRef` → `head`; spot-check: `EnterWorktree` (or `git worktree add ../tmp-test`) creates a branch whose merge-base is the current HEAD, not `origin/main`; then remove the test worktree.
- **Risk:** none. **Quiesce:** no. **Owner-hint:** direct. *(Use id `U-GC-05` for the gc, `U-GC-05cfg`→renumber as the operator likes; suggested final numbering: P0 = U-GC-03 gitignore, U-GC-04 rm-cached, U-GC-04b branch-cruft, U-GC-05 gc; P1 = U-GC-06 baseRef-config, U-GC-07 trunk-guard, U-GC-08 worktree-route-fix, U-GC-09… wait — keep the canonical numbering from the DAG above. The DAG numbering is authoritative; this section's sub-ids are illustrative.)*

### `U-GC-06` — New `trunk-guard.mjs` SessionStart hook
- **Type:** hook-create + wiring (commit `[MAIN] [GIT-CLEANUP]/U-GC-06`)
- **Why:** nothing today detects "you're on a branch that doesn't descend from the canonical trunk." This hook asserts it at session start and warns loudly; later (after a grace period) it can refuse new `work/*` branch creation off the wrong base. Single highest-leverage process fix per the audit.
- **What:** `.claude/hooks/trunk-guard.mjs`: read `CANONICAL_TRUNK` (env `PRISM_CANONICAL_TRUNK`, default = the `U-GC-00` decision); `git merge-base --is-ancestor <CANONICAL> HEAD` → if false, emit `additionalContext` warning ("HEAD does not descend from <CANONICAL> — you may be on a bifurcated branch; see GIT-TOPOLOGY.md"). Wire into `.claude/hooks/bundles/sessionstart-bundle.mjs` SUB_HOOKS (timeout 2000). Fail-open.
- **Depends on:** `U-GC-00`. **Blocks:** `U-GC-07`.
- **Acceptance:** `node --check .claude/hooks/trunk-guard.mjs`; `echo '{}' | node trunk-guard.mjs` → exit 0; on a `work/*` branch off the canonical trunk → emits nothing; on `master` (not an ancestor of either) → emits the warning; `node .claude/scripts/verify-hook-refs.mjs --quiet` → clean; `stop_on_hook_unregistration.mjs` allows (bundle-absorbed name auto-recognized via `bundleAbsorbedHookNames()`).
- **Risk:** LOW (warn-only initially). **Quiesce:** no. **Owner-hint:** direct.

### `U-GC-07` — `worktree-commit-route.mjs`: `[MAIN]` bypasses only worktree-routing, never trunk-routing
- **Type:** hook-edit (commit)
- **Why:** `[MAIN]`/`[MAIN-FORCE]` is the bypass everyone uses to dump cross-scope work onto `cad-fusion-live-ms0`. A commit on a branch that doesn't descend from the canonical trunk must be blocked regardless of prefix.
- **What:** add a trunk-ancestry check (`git merge-base --is-ancestor <CANONICAL> HEAD`) that runs *before* the `[MAIN]`/`CROSS_CUTTING_SCOPES`/`[MAIN-FORCE]` bypasses; if HEAD isn't on the canonical trunk and isn't an active `work/<scope>` matching the commit, deny with "switch to the canonical trunk or a matching worktree". Ship as **warn-first** for a grace period (env `PRISM_TRUNK_GUARD_MODE=warn|block`, default `warn` for ~1 week then `block`) so live chats aren't broken mid-task.
- **Depends on:** `U-GC-06` (shares the `CANONICAL_TRUNK` constant). **Blocks:** `U-GC-08`.
- **Acceptance:** `node --check`; test: on canonical trunk, `[MAIN] X: y` → allowed; on a wrong-trunk branch, `[MAIN] X: y` → warn (mode=warn) / deny (mode=block); on `work/lathe-master` committing `[LATHE-PRO] …` → still allowed (existing routing preserved); `verify-hook-refs --quiet` clean.
- **Risk:** MEDIUM — could block live chats; mitigated by warn-first + the existing 3-strike auto-pass escape hatch. **Quiesce:** no, but announce on `AGENT_CHAT.md` when flipping to `block`. **Owner-hint:** direct.

### `U-GC-08` — Reconcile stale doctrine + point `/sync-rebase` at the canonical trunk
- **Type:** doc-edit (commit)
- **Why:** `H:/PRISM/CLAUDE.md` ("Lane discipline") and `mcp-server/data/docs/gsd/GSD_MICRO.md` say `worktree-commit-route` is "NOT YET WIRED" — it *is* (via `bash-bundle`). `RESUME_AT_WORK.md §8` is referenced but the file doesn't exist. "move work via git stash → pop" contradicts `feedback_no_git_stash_shared_tree.md`. `/sync-rebase` rebases onto `main` — wrong trunk for a `cad-f`-derived branch.
- **What:** update both docs to "wired"; either create `state/shared/RESUME_AT_WORK.md` (with the §8 silent-overwrite history) or remove the dangling reference; replace the git-stash instruction with the `git show <ref>:<path>` pattern; change `/sync-rebase`'s default `--base` to `$PRISM_CANONICAL_TRUNK`; add a one-paragraph "canonical trunk" section to `H:/PRISM/CLAUDE.md`.
- **Depends on:** `U-GC-07` (so the docs describe the new behavior). **Blocks:** nothing.
- **Acceptance:** `grep -c "NOT YET WIRED" CLAUDE.md mcp-server/data/docs/gsd/GSD_MICRO.md` → 0; `grep -c "git stash" <those docs>` → 0 (or only in a "DON'T" context); `grep "base.*main" ~/.claude/commands/sync-rebase.md` → references the canonical-trunk var.
- **Risk:** LOW. **Quiesce:** no. **Owner-hint:** direct.

---

## PHASE 4-pre — Dirty-worktree sweep (HARD prerequisite for P2)

### `U-GC-14` — Sweep all 40 worktrees for uncommitted WIP; resolve before P2's `reset --hard`
- **Type:** coordination + per-worktree triage (no single commit — produces a report + per-chat asks)
- **Why:** `U-GC-09`'s force-push makes every worktree need `git fetch && git reset --hard origin/<branch>` — which **destroys uncommitted WIP**. Today there's ~17 k+ uncommitted lines across worktrees: `work/xproc-neural` 13 119 (but that branch has 0 commits — it's broken; the 13 119 are untracked files), `work/cad-complete-ms0` 3 811, `meta/file-claim-fix` 452, `meta/claudemd-enforcement` 97, `work/knowledge-wiki-ms0` 77, `worktree-u-fus-api01` 116, `worktree-u-fus-api02` 77, `work/mill-master` 51, `work/merge-staging-ms0` 47, `work/session-efficiency` 31, `work/cam-exhaust-cam43-plus` 30, `work/psau-sav2` 28, `work/intel-ollama-obsidian-ms0` 19, `work/cam-exhaust-ms0` 18, `work/cam-fusion-ms1` 15, `work/engine-wire-ms0` 14, plus ~15 more with <10 lines each.
- **What:** for each worktree with dirty state: (a) if a chat owns it → post on `AGENT_CHAT.md` asking the owner to commit-or-discard; (b) if abandoned → `git -C <wt> diff > state/shared/wip-archive/<branch>.diff` and `git -C <wt> add -A && git -C <wt> commit -m "[ARCHIVE] WIP snapshot before git-tree remediation"` on that branch (or just archive the diff and leave the worktree to be reset). Special-case `work/xproc-neural`: it's broken — capture wanted files, then `git worktree remove --force`.
- **Depends on:** nothing (can start immediately). **Blocks:** `U-GC-09`, and `U-GC-05`'s `gc --prune` is cleaner after it.
- **Acceptance:** `for wt in $(git worktree list --porcelain | awk '/^worktree/{print $2}'); do echo "$wt: $(git -C "$wt" status --porcelain 2>/dev/null | wc -l)"; done` → every line is `0` OR the non-zero ones are explicitly acknowledged in `state/shared/wip-archive/` / on the chat bus.
- **Risk:** MEDIUM — if a sweep misses a dirty worktree, that WIP dies at P2's reset. The acceptance check above must be re-run immediately before `U-GC-09`. **Quiesce:** partial (chats need to commit their WIP). **Owner-hint:** coordinated across the fleet.

---

## PHASE 2 — Unblock the push + shrink `.git` (QUIESCE WINDOW; force-push; irreversible)

### `U-GC-09` — History rewrite: strip generated blobs (`filter-repo` on a fresh mirror)
- **Type:** history rewrite (NOT a commit — rewrites all of `cad-fusion-live-ms0` and any branch carrying the blobs)
- **Why:** the only way `cad-fusion-live-ms0` ever pushes — 5 commits exceed GitHub's 100 MB hard limit (`e78eeeaaf` 101.8MB, `1f5642dbb` 113.1MB, `43535d2b7` 118.7MB, `02720fd64` 118.76MB at HEAD, + one more); all are `state/shared/system-viz/system-graph.json`.
- **What:**
  1. **Backup:** `git clone --mirror H:/prism H:/prism-git-backup-$(date +%Y%m%d).git` (the irreversibility insurance).
  2. **Quiesce:** announce on `AGENT_CHAT.md`, freeze all commits, confirm `U-GC-14` acceptance is green.
  3. **Fresh mirror** (because `git filter-repo` *refuses to run with linked worktrees* — 40 exist): `git clone --no-local H:/prism /tmp/prism-rewrite && cd /tmp/prism-rewrite`.
  4. `git filter-repo --force --invert-paths --path state/shared/system-viz/system-graph.json --path state/shared/system-viz/graph.cypher --path state/shared/system-viz/obsidian-augmentation.json --path state/shared/system-viz/data-catalogs-atomic-augmentation.json --path mcp-server/dev/null --path-glob 'mcp-server/.serena/cache/*'` then belt-and-suspenders `git filter-repo --force --strip-blobs-bigger-than 20M` (catches `audit.jsonl` history, the `extracted_modules/GIANT/*.js` dumps, `c/tmp/prism-build-check.js`, `mcp-server/tmp/build-check.js`, etc. — NOT `models/*.bin` which are on `archive/forge-orphans` only; handle that branch separately via `U-GC-20`).
  5. `git reflog expire --expire=now --all && git gc --prune=now --aggressive`.
- **Depends on:** `U-GC-02` (decision), `U-GC-03`+`U-GC-04` (clean target), `U-GC-14` (dirty sweep done). **Blocks:** `U-GC-10`, all P4 `reset --hard`.
- **Acceptance:** in the rewritten mirror: `git rev-list --all --objects | git cat-file --batch-check='%(objecttype) %(objectname) %(objectsize) %(rest)' | awk '$3 > 52428800'` → empty (no blob > 50 MB except whatever's on `archive/*`); `git log --all --oneline -- state/shared/system-viz/system-graph.json` → empty; `du -sh .git` → < 2 GB; `git fsck --full` → clean; `git push --dry-run origin cad-fusion-live-ms0` → no `GH001`/size-limit error.
- **Risk:** **HIGH** — every SHA changes; force-push required; all 40 worktrees diverge. Mitigated by the `--mirror` backup + the dirty-worktree sweep. **Quiesce:** YES (~30–60 min, all chats frozen). **Owner-hint:** the user + one operator chat, coordinated.

### `U-GC-10` — Force-push the rewritten history; re-sync every worktree
- **Type:** git-op (force-push + per-worktree reset)
- **Why:** lands the rewrite on origin and re-attaches all local clones/worktrees.
- **What:** from the rewritten mirror, `git push --force-with-lease --all origin && git push --force-with-lease --tags origin`. Then in `H:/prism` (the real repo): `git fetch origin && git reset --hard origin/cad-fusion-live-ms0` (and similarly for `main` etc.). For each of the ~40 worktrees: `git -C <wt> fetch origin && git -C <wt> reset --hard origin/<that-branch>` (skip-or-handle any whose branch was rewritten differently). Re-create `H:/prism-git-backup-*.git`'s value: keep it for ~30 days then delete.
- **Depends on:** `U-GC-09`. **Blocks:** P3, P4.
- **Acceptance:** `git -C H:/prism status` clean and at the new HEAD; `git rev-parse cad-fusion-live-ms0 == git rev-parse origin/cad-fusion-live-ms0`; every worktree `git status` clean; `git -C H:/prism push origin cad-fusion-live-ms0` → "Everything up-to-date"; spot-check 3 chats can `git fetch && git reset --hard` without error.
- **Risk:** HIGH (same window). **Quiesce:** YES (same window as `U-GC-09`). **Owner-hint:** coordinated.

---

## PHASE 3 — Trunk reconciliation (tier-2; on a staging branch; only if `main`'s unique work must be preserved)

### `U-GC-11` — Characterize `main`'s 874 unique commits
- **Type:** analysis (no mutation; produces `state/shared/MAIN-UNIQUE-WORK-AUDIT.md`)
- **Why:** decide whether to merge or discard. Breakdown: 732 untagged + `INTEL-OLLAMA-OBSIDIAN-MS0` (39) + `INFRA-NEURAL-LEDGER-MS1` (36) + `[MAIN]` (29) + `MERGE-STAGING` (12). Which represent code/state NOT already on `cad-f`?
- **What:** per subsystem, `git diff cad-fusion-live-ms0 main -- <area>` + `git log cad-fusion-live-ms0..main --oneline -- <area>`; classify each cluster: (a) superseded by `cad-f`, (b) salvageable from `archive/forge-orphans-2026-05-01`, (c) genuinely-unique-and-wanted. Same for `master` (the 7-week-old divergent line `4e7c67db6`).
- **Depends on:** `U-GC-10` (SHAs stable). **Blocks:** `U-GC-12`.
- **Acceptance:** `MAIN-UNIQUE-WORK-AUDIT.md` exists with every cluster classified (a/b/c) + a recommendation (merge vs discard).
- **Risk:** LOW (read-only). **Quiesce:** no. **Owner-hint:** one chat + the user reviews.

### `U-GC-12` — Reconcile `main`'s unique work onto `cad-f` via the staging branch (OR declare `cad-f` strictly canonical)
- **Type:** merge/cherry-pick on a staging branch (commits land on `work/merge-staging-ms0`, then merge to canonical)
- **Why:** preserve `main`'s genuinely-unique-and-wanted work without a conflict-fest on the live trunk.
- **What:** **Path A (reconcile):** reset `work/merge-staging-ms0` to `cad-f` HEAD; for each "category (c)" cluster from `U-GC-11`, either `git cherry-pick` (if the commits apply cleanly) or `git diff main..cad-f -- <area> | git apply -R` style "import main's state for this area" as a single squashed commit per area; resolve conflicts (unrelated histories → expect conflicts on most files — budget hours); when staging is green and tested, merge `work/merge-staging-ms0` → canonical. **Path B (declare cad-f canonical):** if `U-GC-11` shows all of `main`'s unique work is (a) or (b), skip the reconcile — just archive `main` as `archive/main-pre-remediation-<date>` and proceed to `U-GC-13`.
- **Depends on:** `U-GC-11`, `U-GC-00`. **Blocks:** `U-GC-13`.
- **Acceptance:** if Path A: `git merge-base --is-ancestor <main-unique-cluster-tips> <canonical>` for every "(c)" cluster → true; build + tests green on the canonical trunk after the merge. If Path B: `archive/main-pre-remediation-<date>` exists pointing at the old `main` HEAD; `U-GC-11`'s audit confirms no "(c)" clusters.
- **Risk:** **HIGH** (Path A — unrelated-history merge). Path B is LOW. **Quiesce:** Path A wants a quiet window; Path B doesn't. **Owner-hint:** the user picks A vs B; one chat executes; physics/test reviewer agents validate the merge.

### `U-GC-13` — Promote the canonical trunk to `main`; retire the old trunks
- **Type:** git-op (branch rename + remote head + branch retirement)
- **Why:** end state — one trunk named `main`, `origin/HEAD → origin/main`, the bifurcation history archived not live.
- **What:** `git branch -m main archive/main-pre-remediation-<date>` (if not already done in `U-GC-12` Path B); `git branch -m cad-fusion-live-ms0 main`; `git push origin :cad-fusion-live-ms0` (delete old remote branch) `&& git push -u origin main`; `git remote set-head origin main`; `git symbolic-ref refs/remotes/origin/HEAD refs/remotes/origin/main`; `git config init.defaultBranch main` (already is); update `worktree-commit-route.mjs` / `trunk-guard.mjs` `CANONICAL_TRUNK` default to `main`; re-point `H:/prism` and all worktrees' upstreams. Diff-review `master` (`4e7c67db6`) — if nothing unique, `git branch -m master archive/master-2026-XX`; retire `work/merge-staging-ms0` (now == `main`).
- **Depends on:** `U-GC-12`, `U-GC-00`. **Blocks:** P4, P5.
- **Acceptance:** `git rev-parse --abbrev-ref HEAD` in `H:/prism` → `main`; `git ls-remote origin | grep -c cad-fusion-live-ms0` → 0; `git symbolic-ref refs/remotes/origin/HEAD` → `refs/remotes/origin/main`; `git rev-parse main == origin/main`; all worktrees' `git status -sb` show `...origin/<branch>` tracking correctly.
- **Risk:** MEDIUM (rename + remote-head change; force-push of `main`). **Quiesce:** brief announce. **Owner-hint:** the user + operator chat.

---

## PHASE 4 — Worktree / branch cleanup (tier-3; after SHAs stable, i.e. after `U-GC-13`)

### `U-GC-15` — Retire the broken `work/xproc-neural` worktree
- **Why:** 0 commits, `0000000` HEAD, 13 119 untracked files sitting in `H:/prism-xproc-neural`.
- **What:** capture any wanted files (after `U-GC-14` already triaged it), `git worktree remove --force H:/prism-xproc-neural`, `git branch -D work/xproc-neural` (it's unborn — `git branch -D` may say "not found"; `git update-ref -d refs/heads/work/xproc-neural` if needed).
- **Depends on:** `U-GC-14` (WIP triaged), `U-GC-13`. **Acceptance:** `git worktree list | grep -c xproc-neural` → 0. **Risk:** LOW. **Owner-hint:** direct.

### `U-GC-16` — Retire the stale-merged worktrees/branches
- **Why:** fully absorbed into the canonical trunk — `work/cost-cascade-ms0` and `work/graph-context-ms0` (literally the SAME HEAD `20d8967e1` — collapse the redundant pair first), `work/sfc-calibrate`, `work/cad-complete-ms0` + `work/psau-sav2` (after their WIP from `U-GC-14`), remote `origin/work/ussh-sci` + `recovery/work/intel-ollama-obsidian-ms0` (ancestors of `main`).
- **What:** for each: confirm `git merge-base --is-ancestor <branch> main`, `git worktree remove <path>`, `git branch -d <branch>`, `git push origin :<branch>` (or for remote-only, `git push <remote> :<branch>`).
- **Depends on:** `U-GC-14`, `U-GC-13`. **Acceptance:** `git branch --merged main | grep -E 'cost-cascade|graph-context|sfc-calibrate|cad-complete|psau-sav2'` → empty; the 6+ worktree dirs gone. **Risk:** LOW. **Owner-hint:** direct (with user nod per "never delete only disable" — these are merged work products, the commits live on `main`).

### `U-GC-17` — Triage the ~24 stale-unmerged work-branch forks
- **Why:** these have real unique commits — `intel-ollama-obsidian-ms0` (**983**), `lathe-pro-v3-ms2` (497), `mill-master` (489), `ai-aware-harden` (403), `lathe-master` (443), `wedm-consolidated` (427), `tsc-cleanup-ms0` (88), `engine-wire-cad-ms0` (89), `cad-fidx-solidworks` (66), `ppgh05` (49), `ppg-advancedpost` (43), `cad-fidx-fus-93a0` (40), `intel-p8-schema` (30), `engine-wire-ms0` (28), `intel-ollama-obsidian-ms1` (26), `lathe-prod-ready-ms0` (18), `cam-hypermill-ms1` (15), `cam-exhaust-cam43-plus` (14), `cam-fusion-ms1` (12), `knowledge-wiki-ms0` (11), `session-efficiency` (7), `cam-spcfai-ms0` (3), `cam-engine-fixes` (1), `lathe-pro-v3-bookkeeping` (1), `meta/claudemd-enforcement` (1), `meta/file-claim-fix` (4) — plus the `claude/*` auto-branches (200–1300 unique commits each, pre-fork). These are abandoned milestone forks created by the conflict-fork rule.
- **What:** the user triages each: **revive** (paused work to resume), **merge** (cherry-pick its unique commits onto `main`, then retire), or **archive-and-retire** (`git branch -m work/<x> archive/<x>-2026-XX`, `git worktree remove`). Produce `state/shared/STALE-FORK-TRIAGE.md` with the decision per branch.
- **Depends on:** `U-GC-13`. **Blocks:** nothing (can be done incrementally over weeks). **Acceptance:** `STALE-FORK-TRIAGE.md` has a decision for all ~24 + the `claude/*` branches; the "merge" ones are merged; the "archive-and-retire" ones renamed under `archive/`. **Risk:** MEDIUM (don't lose wanted work — that's why it's user-triaged, not automated). **Owner-hint:** the user decides; chats execute the merges.

### `U-GC-18` — Retire `worktree-u-fus-api01/02`
- **Why:** auto-generated-name worktrees under `.claude/worktrees/`, 2 weeks idle, dirty (116 / 77 lines). `api01` has 497 unique commits (near `main`), `api02` has 2.
- **What:** after `U-GC-14` triages the WIP: if the 497 commits on `api01` are an old milestone fork, fold into `U-GC-17`'s triage; `git worktree remove --force`, `git branch -m worktree-u-fus-api0X archive/u-fus-api0X-2026-XX` or `-D` if confirmed merged.
- **Depends on:** `U-GC-14`, `U-GC-17` (api01's 497 commits). **Acceptance:** the 2 worktrees gone. **Risk:** LOW-MED. **Owner-hint:** direct.

### `U-GC-19` — Clean the `claude/*` auto-branches + `origin/archive-2026-02-01` + `origin/worktree-data-loss-fix`
- **Why:** `claude/fervent-bohr`, `claude/zen-dirac` (+ origin copies) + `origin/claude/affectionate-perlman`, `origin/claude/interesting-shamir` — Claude-Code auto-generated, 7 weeks–3 months old, unmerged into both trunks (pre-fork divergence). `origin/archive-2026-02-01` (2 months, no local) — older cold-storage. `origin/worktree-data-loss-fix` (2 weeks, no local, unmerged).
- **What:** review each for salvageable work (the `claude/*` ones predate the fork — likely abandoned but check); archive-and-retire (`git push origin :claude/<x>` after `git branch -m` to `archive/`). Keep `origin/archive-2026-02-01` (cold storage) unless its contents are confirmed elsewhere.
- **Depends on:** `U-GC-13`. **Acceptance:** `git branch -a | grep -c 'claude/'` reduced to 0 (or all renamed under `archive/`); `STALE-FORK-TRIAGE.md` covers them. **Risk:** LOW-MED. **Owner-hint:** the user reviews; direct executes.

### `U-GC-20` — Decide on `archive/forge-orphans-2026-05-01` (the 3.09 GB whisper model)
- **Why:** it's the *only* thing holding `models/ggml-large-v3.bin` (3.09 GB) + `ggml-base.bin` (148 MB) + ~9 881 orphaned files (502 unique commits). Keeping it means ~3.3 GB stays packed in `.git` (but never checked out on `main`).
- **What:** per `U-GC-01`'s decision — **keep:** no action (the `U-GC-05`/`U-GC-09` `gc --prune` doesn't touch reachable-from-a-branch blobs). **delete:** confirm the ~9 881 files are recoverable elsewhere (or `git diff archive/forge-orphans-2026-05-01 ^main` reviewed), then `git branch -D archive/forge-orphans-2026-05-01 && git push origin :archive/forge-orphans-2026-05-01 && git worktree remove H:/prism-forge-archive && git reflog expire --expire=now --all && git gc --prune=now` → reclaims ~3.3 GB.
- **Depends on:** `U-GC-01`. **Acceptance:** if keep — `git branch | grep -c forge-orphans` → 1, documented in `GIT-TOPOLOGY.md` as intentional cold storage. If delete — `git count-objects -vH` size drops by ~3.3 GB; `git fsck` clean. **Risk:** MED (delete path — irreversible loss of the archive). **Owner-hint:** the user decides.

---

## PHASE 5 — Verify & document (tier-3; after everything)

### `U-GC-21` — Post-cleanup verification suite
- **Type:** verification (the "tests" for this milestone)
- **What:** `git fsck --full` → clean; `git count-objects -vH` → `size` < 2 GiB (target), loose `count` < 10 k; `git push --dry-run origin main` → "Everything up-to-date" (no size errors); `git merge-base --is-ancestor main HEAD` in `H:/prism` → true; `node .claude/scripts/verify-hook-refs.mjs --quiet` → clean; spot-check 3 active chats can `git fetch && git reset --hard origin/<branch>` without error; `git worktree list` → only active worktrees remain (target ≤ ~12, down from 40); `git branch -a | wc -l` → roughly halved; `node .claude/hooks/trunk-guard.mjs` and `worktree-commit-route.mjs` behave per `U-GC-06`/`U-GC-07`; `du -sh .git`.
- **Depends on:** all prior. **Acceptance:** every check above passes; results pasted into the commit message / `GIT-TOPOLOGY.md`.
- **Risk:** none. **Owner-hint:** direct.

### `U-GC-22` — Document the new topology + update memory + CLAUDE.md
- **Type:** doc-create + memory-update (commit + memory file)
- **What:** write `state/shared/GIT-TOPOLOGY.md` — the live trunk (`main`), the active worktree→branch map, the retired/archived branches, the `worktree.baseRef=head` + `trunk-guard` + `[MAIN]`-restriction process model, the rollback note (the `--mirror` backup, kept 30 days). Update `H:/PRISM/CLAUDE.md` (the "Lane discipline / PER-CHAT HANDOFF" sections) to reference it. Add/update memory `reference_git_topology.md` (and update `MEMORY.md` pointer). Mark `GIT-TREE-REMEDIATION-MS0` complete in this roadmap file's status header. Delete the `H:/prism-git-backup-*.git` mirror after 30 days (calendar reminder).
- **Depends on:** `U-GC-21`. **Acceptance:** `GIT-TOPOLOGY.md` exists; `grep -c GIT-TOPOLOGY H:/PRISM/CLAUDE.md` → ≥1; memory file + `MEMORY.md` pointer present; this file's status = `COMPLETE`.
- **Risk:** none. **Owner-hint:** direct.

---

## FAILURE-MODE REGISTER (surfaced, not pruned)

| # | Failure mode | Trigger | Mitigation | Owning unit |
|---|---|---|---|---|
| F1 | `git filter-repo` refuses to run | linked worktrees present (40) | run on a fresh `git clone --no-local` mirror, not the live repo | U-GC-09 |
| F2 | Uncommitted WIP destroyed | `reset --hard` after force-push without sweeping first | `U-GC-14` is a HARD prerequisite; re-run its acceptance check immediately before `U-GC-09` | U-GC-14 → U-GC-09 |
| F3 | Live chat breaks mid-commit | force-push during an active commit | quiesce window + `AGENT_CHAT.md` announcement + commit freeze | U-GC-09/10 |
| F4 | `git stash` clobbers peers' WIP | following the stale "move work via git stash → pop" doctrine | `U-GC-08` removes that instruction; use `git show <ref>:<path>` | U-GC-08 |
| F5 | `master` deleted but had unique work | `branch -d master` without diff-review (it diverged, isn't a clean predecessor) | `U-GC-11`/`U-GC-13` diff-review `master` first | U-GC-13 |
| F6 | Unrelated-history merge conflict-fest | Path A of `U-GC-12` | do it on `work/merge-staging-ms0`, not the live trunk; budget hours; or take Path B | U-GC-12 |
| F7 | `system-graph.json` regen breaks on fresh checkout | `/system-viz` assumes the file exists | confirm it regenerates from scratch (it does — that's why it's generated); test in `U-GC-04` | U-GC-04 |
| F8 | `archive/forge-orphans` deleted, contents lost | `U-GC-20` delete path without confirming recoverability | confirm the ~9 881 files exist elsewhere first; the `--mirror` backup also has it for 30 days | U-GC-20 |
| F9 | Backup mirror deleted too soon | cleanup over-eagerness | keep `H:/prism-git-backup-*.git` 30 days, calendar reminder in `U-GC-22` | U-GC-22 |
| F10 | `trunk-guard` blocks everything (wrong `CANONICAL_TRUNK` default) | mis-set env / decision changed | `PRISM_TRUNK_GUARD_MODE=warn` default for a grace period; fail-open on hook error | U-GC-06/07 |
| F11 | `gc --prune=now` drops a not-yet-committed object | running it before `U-GC-14` | order: `U-GC-14` before `U-GC-05` (uncommitted-but-never-committed files aren't in any reflog, so they survive — but a `reset --hard`'d worktree's old objects go; sweep first) | U-GC-14 → U-GC-05 |

## ROLLBACK PLAN

- **P0 (`U-GC-03/04/04b/05`):** `git revert` the commits; `U-GC-05`'s `gc --prune` is the only irreversible bit and it only drops garbage — no rollback needed.
- **P1 (`U-GC-06/07/08` + `worktree.baseRef`):** `git revert` the hook/doc commits; `git config --unset worktree.baseRef`.
- **P2 (`U-GC-09/10`):** **the irreversibility point.** Insurance = `H:/prism-git-backup-$(date).git` (`--mirror` clone taken in `U-GC-09` step 1). If the rewrite goes wrong: `git remote set-url origin H:/prism-git-backup-*.git && git fetch && git reset --hard <old-sha>` per worktree, then re-push the backup. Keep the backup 30 days.
- **P3 (`U-GC-11/12/13`):** done on `work/merge-staging-ms0` + the old `main`/`master`/`cad-f` are archived under `archive/*-pre-remediation-<date>` before any rename — so the pre-state is always reachable.
- **P4/P5:** retired branches are renamed under `archive/` (not deleted) where there's any doubt; the `--mirror` backup covers the rest for 30 days.

---

## SEQUENCING RECOMMENDATION

1. **Now, no quiesce, low risk:** P0 (`U-GC-03` gitignore → `U-GC-04` rm-cached → `U-GC-04b` branch cruft → `U-GC-05` gc) + P1 (`U-GC-06` baseRef → `U-GC-06`/`U-GC-07`/`U-GC-08` once `U-GC-00` trunk is decided). Biggest hygiene win for zero risk; `.git` 42 GB → ~3–5 GB; bifurcation vectors closed.
2. **Schedule a quiesce window:** `U-GC-14` (dirty-worktree sweep — needs the fleet's cooperation) → then in the window, `U-GC-09` (`--mirror` backup + filter-repo + gc) → `U-GC-10` (force-push + re-sync). After this, `cad-f` pushes.
3. **At leisure, on the staging branch:** `U-GC-11` (audit `main`'s unique work) → `U-GC-12` (Path A reconcile, or Path B declare-cad-f-canonical-and-archive-main) → `U-GC-13` (rename → `main`, retire old trunks).
4. **Incrementally over weeks:** P4 cleanup (`U-GC-15`..`U-GC-20`) — `U-GC-15` (broken xproc-neural) and `U-GC-16` (stale-merged) right away; `U-GC-17` (the 24 stale forks) as the user triages them; `U-GC-20` (the 3 GB archive) per the `U-GC-01` decision.
5. **At the end:** P5 (`U-GC-21` verify, `U-GC-22` document + memory).

---

## OPEN DECISIONS BLOCKING START

- `U-GC-00` — canonical trunk? (recommend `cad-fusion-live-ms0`)
- `U-GC-01` — `archive/forge-orphans-2026-05-01` keep or delete? (recommend keep for now)
- `U-GC-02` — do the history rewrite + force-push? (recommend yes)
- Plus: when can the fleet quiesce for ~30–60 min? (P2)

*(End of roadmap. RGS v6 discipline applied: atomic-first ordering, tier-floor gate (P0 before P2), every unit has why/depends/blocks/acceptance/risk, no orphan units, full failure-mode register, rollback per phase. The engine-centric S2.5/S2.6 stages (ai-priority-rank, atomic-roadmap-emit, per-domain subagent fan-out) were deliberately skipped — N/A for git-infra ops — per the brief's instruction to adapt RGS to the domain.)*
