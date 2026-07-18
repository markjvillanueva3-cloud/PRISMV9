---
name: fleet-git-contention-golf-pickup-2026-06-04
description: "Golf pickup of alpha's FLEET-GIT-CONTENTION-MS0. U-FGC-1 (mutex) done; U-FGC-2 (churn quarantine) INCOMPLETE (git status still 56,571, 93% regenerated noise; target >90% drop); U-FGC-3 (slot-worktree adoption = commit-to-own-branch) pending. Both golf-owned. Exact next steps inside."
type: reference
source: prism-memory
synced: 2026-06-27T20:30:46.574Z
aliases: reference_fleet_git_contention_golf_pickup_2026_06_04
---


2026-06-04 (slot golf). Operator: "pick up where alpha left off with fleet coordination on the git tree — tying up loose ends for each galaxy/domain/chat slot staging and committing to their own branches."

**What alpha was actually doing** = `state/shared/specs/FLEET-GIT-CONTENTION-MS0.md` (authored 2026-06-03 slot:alpha, operator-directed). Root cause: all ~26 NATO chats share ONE git tree/index/HEAD (`H:/prism` @ `cad-fusion-live-ms0`) → ref-races, index.lock contention, foreign-staged-file absorption. 3 units:

- **U-FGC-1 (alpha) — commit-mutex — DONE.** `.claude/helpers/git-commit-mutex.mjs` (withCommitLock + ref-race retry + foreign-staged guard) + `git-index-lock-sweep` PreToolUse hook (observed self-healing a dead `.git/index.lock` mid-commit this session). Commits 606424dc12, 9bd4b22abd..24478d31aa.
- **U-FGC-2 (golf) — quarantine generated-file churn — INCOMPLETE.** Acceptance: `git status --porcelain | wc -l` drops >90%. CURRENT: **56,571 uncommitted** (breakdown: state/ 30,478 · knowledge/ 22,259 · mcp-server 1,851 · scripts 456 · .claude 298 · web 280 · data 178 · docs 147 · rest small). ~93% is regenerated/transient (system-viz graph chunks, caches, dashboards, ledgers, cron-locks, cag-route sidecars, the auto-memory/Obsidian mirror, tribal embeds, .hook-cache). Alpha shipped U-FGC-2b (root `.gitattributes`) + U-FGC-2c (`git rm --cached` the 675MB system-graph) but the bulk still shows. **NEXT (fresh full-budget session):** per-category discrimination — `git rm --cached` the tracked-but-regenerated dirs + `.gitignore` the untracked-transient ones, WITHOUT untracking canonical files (real specs, wiki entries, code). Verify status drops >90% + no auto-gen file reappears modified after a clean SessionStart regen. DELICATE: wrong pattern loses real tracking OR misses noise — fleet-wide blast radius.
- **U-FGC-3 (golf + fleet) — slot-worktree adoption — PENDING.** = the operator's "commit to their own branches." Make each chat default to `H:/prism-slot-<nato>` (own branch+HEAD = zero contention); fix `/checkin` Step-2c cutover; tighten `[BOOTSTRAP-SLOT-ENFORCE]` (currently the default bypass — every recent commit uses it to route onto the shared tree); golf integrates `slot/*` → `cad-fusion-live-ms0`. Acceptance: >80% of a day's commits land from `slot/*`, `[BOOTSTRAP-SLOT-ENFORCE]` <10%. NOTE: all 20 `slot/*` branches exist but are STALE — `cad-fusion-live-ms0` is 2436 ahead of slot/alpha (fleet commits to shared tree, not slot branches). Build order per spec: 1 → (2 ∥ 3).

**Framing reconciliation (R7):** the operator said "staging+committing 56K to their own branches" — but alpha's scheme was UNTRACK-the-noise (U-FGC-2), and the per-branch piece is the structural U-FGC-3 (adoption), NOT committing the 56K regenerated files anywhere. Do NOT commit the 52K regenerated churn to slot branches (massive noise + cross-chat collision + repo bloat).

**Why golf deferred live execution (2026-06-04):** hit at ~70% session context after shipping U-BOOTGRACE-PRODUCER-WIRE; a 52K-file quarantine on the shared fleet tree needs careful full-budget work (the milestone exists to PREVENT git-tree damage — rushing it would be self-defeating). Recommended: /compact → golf executes U-FGC-2 fresh (bounded, clear acceptance), then U-FGC-3. [[reference_mcp_bootgrace_dormant_wiring_2026_06_04]] · spec `FLEET-GIT-CONTENTION-MS0.md` + `GIT-TREE-REMEDIATION-MS0-SCRUTINY-1.html`.
