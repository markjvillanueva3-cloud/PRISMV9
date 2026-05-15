# WORKTREE AUDIT — 2026-05-15

**Generated:** 2026-05-15T02:39:17.073Z by `scripts/audit-worktrees.mjs` (READ-ONLY).
**Base:** `origin/cad-fusion-live-ms0` · **Worktrees:** 51

**Classification rules:** PRUNE = 0 ahead & tracked-clean · MERGE = ahead>0, clean, idle>7d, unowned · KEEP = ahead>0 & (active<14d OR live owner), or the base worktree · INVESTIGATE = locked/detached/ahead>500/idle+dirty/0-ahead-but-dirty.

> Advisory only — no worktree/branch is mutated. Human-verify before any prune or land.

## Summary

| Verdict | Count | Meaning |
|---|---:|---|
| KEEP | 23 | Active dev / live owner — do not touch |
| MERGE | 2 | Settled, clean, unowned — ready to land |
| PRUNE | 3 | 0 commits ahead — safe to `git worktree remove` |
| INVESTIGATE | 23 | Contradiction / risk — needs a decision |

## MERGE (2)

| Worktree | Branch | Ahead | Behind | Last commit | Dirty | Live owner | Notes |
|---|---|---:|---:|---|---:|---|---|
| `prism-tsc-cleanup` | `work/tsc-cleanup-ms0` | 88 | 1110 | 2026-04-30 | 0 | — | 88 ahead / 1110 behind origin/cad-fusion-live-ms0; last commit 14.1d ago |
| `prism-hypermill-ms1` | `work/cam-hypermill-ms1` | 15 | 1026 | 2026-04-30 | 0 | — | 15 ahead / 1026 behind origin/cad-fusion-live-ms0; last commit 14.1d ago |

## PRUNE (3)

| Worktree | Branch | Ahead | Behind | Last commit | Dirty | Live owner | Notes |
|---|---|---:|---:|---|---:|---|---|
| `prism-awareness-mega` | `work/awareness-prod-mega` | 0 | 168 | 2026-05-13 | 0 | — | 0 commits ahead of origin/cad-fusion-live-ms0 — nothing unique to lose; last commit 1.3d ago |
| `prism-docu-print-loop` | `work/docu-print-loop-ms0` | 0 | 17 | 2026-05-14 | 0 | — | 0 commits ahead of origin/cad-fusion-live-ms0 — nothing unique to lose; last commit 0.3d ago |
| `prism-fleet-reaper-ms1` | `work/fleet-reaper-ms1` | 0 | 5 | 2026-05-14 | 0 | — | 0 commits ahead of origin/cad-fusion-live-ms0 — nothing unique to lose; last commit 0.2d ago |

## INVESTIGATE (23)

| Worktree | Branch | Ahead | Behind | Last commit | Dirty | Live owner | Notes |
|---|---|---:|---:|---|---:|---|---|
| `prism-iooms0` | `work/intel-ollama-obsidian-ms0` | 983 | 1612 | 2026-05-08 | 2 | — | 983 ahead / 1612 behind origin/cad-fusion-live-ms0; last commit 6.6d ago; 2 tracked-dirty file(s); ahead > 500 — needs scoped cherry-pick plan, not a blind land |
| `prism-merge-staging` | `work/merge-staging-ms0` | 874 | 1612 | 2026-05-06 | 0 | — | 874 ahead / 1612 behind origin/cad-fusion-live-ms0; last commit 8.0d ago; ahead > 500 — needs scoped cherry-pick plan, not a blind land |
| `prism-forge-archive` | `archive/forge-orphans-2026-05-01` | 502 | 1612 | 2026-05-01 | 15 | — | 502 ahead / 1612 behind origin/cad-fusion-live-ms0; last commit 13.2d ago; 15 tracked-dirty file(s); ahead > 500 — needs scoped cherry-pick plan, not a blind land |
| `PRISM/.claude/worktrees/u-fus-api01` | `worktree-u-fus-api01` | 497 | 1612 | 2026-04-27 | 110 | — | 497 ahead / 1612 behind origin/cad-fusion-live-ms0; last commit 17.4d ago; 110 tracked-dirty file(s); idle but carries uncommitted tracked WIP — resolve before landing |
| `prism-mill-worktree` | `work/mill-master` | 489 | 1612 | 2026-04-24 | 41 | — | 489 ahead / 1612 behind origin/cad-fusion-live-ms0; last commit 19.9d ago; 41 tracked-dirty file(s); idle but carries uncommitted tracked WIP — resolve before landing |
| `prism-engine-wire-ms0` | `work/engine-wire-ms0` | 28 | 1027 | 2026-04-30 | 2 | — | 28 ahead / 1027 behind origin/cad-fusion-live-ms0; last commit 14.1d ago; 2 tracked-dirty file(s); idle but carries uncommitted tracked WIP — resolve before landing |
| `prism-cam-exhaust` | `work/cam-exhaust-cam43-plus` | 14 | 1468 | 2026-04-24 | 29 | — | 14 ahead / 1468 behind origin/cad-fusion-live-ms0; last commit 20.6d ago; 29 tracked-dirty file(s); idle but carries uncommitted tracked WIP — resolve before landing |
| `prism-fusion-ms1` | `work/cam-fusion-ms1` | 12 | 1026 | 2026-04-30 | 2 | — | 12 ahead / 1026 behind origin/cad-fusion-live-ms0; last commit 14.1d ago; 2 tracked-dirty file(s); idle but carries uncommitted tracked WIP — resolve before landing |
| `prism-knowledge-wiki` | `work/knowledge-wiki-ms0` | 11 | 1130 | 2026-04-27 | 76 | — | 11 ahead / 1130 behind origin/cad-fusion-live-ms0; last commit 17.3d ago; 76 tracked-dirty file(s); idle but carries uncommitted tracked WIP — resolve before landing |
| `prism-session-efficiency` | `work/session-efficiency` | 7 | 1541 | 2026-04-24 | 29 | — | 7 ahead / 1541 behind origin/cad-fusion-live-ms0; last commit 20.3d ago; 29 tracked-dirty file(s); idle but carries uncommitted tracked WIP — resolve before landing |
| `prism-file-claim-fix` | `meta/file-claim-fix` | 4 | 1134 | 2026-04-27 | 451 | — | 4 ahead / 1134 behind origin/cad-fusion-live-ms0; last commit 17.5d ago; 451 tracked-dirty file(s); idle but carries uncommitted tracked WIP — resolve before landing |
| `PRISM/.claude/worktrees/u-fus-api02` | `worktree-u-fus-api02` | 2 | 1114 | 2026-04-27 | 76 | — | 2 ahead / 1114 behind origin/cad-fusion-live-ms0; last commit 17.4d ago; 76 tracked-dirty file(s); idle but carries uncommitted tracked WIP — resolve before landing |
| `prism-claudemd-enforcement` | `meta/claudemd-enforcement` | 1 | 1145 | 2026-04-27 | 97 | — | 1 ahead / 1145 behind origin/cad-fusion-live-ms0; last commit 17.5d ago; 97 tracked-dirty file(s); idle but carries uncommitted tracked WIP — resolve before landing |
| `PRISM/.claude/worktrees/psau-sav2` | `work/psau-sav2` | 0 | 1560 | 2026-04-22 | 28 | — | 0 commits ahead of origin/cad-fusion-live-ms0 — nothing unique to lose; last commit 22.3d ago; 28 tracked-dirty file(s); 0 ahead but carries uncommitted tracked work — pruning would lose it |
| `prism-blueprint-ocr-training` | `work/blueprint-ocr-training-ms1` | 0 | 322 | 2026-05-12 | 79 | — | 0 commits ahead of origin/cad-fusion-live-ms0 — nothing unique to lose; last commit 2.2d ago; 79 tracked-dirty file(s); 0 ahead but carries uncommitted tracked work — pruning would lose it |
| `prism-cad-complete` | `work/cad-complete-ms0` | 0 | 1586 | 2026-04-22 | 3775 | — | 0 commits ahead of origin/cad-fusion-live-ms0 — nothing unique to lose; last commit 22.4d ago; 3775 tracked-dirty file(s); 0 ahead but carries uncommitted tracked work — pruning would lose it |
| `prism-cost-cascade` | `work/cost-cascade-ms0` | 0 | 435 | 2026-05-11 | 47 | — | 0 commits ahead of origin/cad-fusion-live-ms0 — nothing unique to lose; last commit 3.3d ago; 47 tracked-dirty file(s); 0 ahead but carries uncommitted tracked work — pruning would lose it |
| `prism-devtools-charlie` | `work/devtools-charlie` | 0 | 169 | 2026-05-13 | 1 | — | 0 commits ahead of origin/cad-fusion-live-ms0 — nothing unique to lose; last commit 1.3d ago; 1 tracked-dirty file(s); 0 ahead but carries uncommitted tracked work — pruning would lose it |
| `prism-graph-context` | `work/graph-context-ms0` | 0 | 435 | 2026-05-11 | 47 | — | 0 commits ahead of origin/cad-fusion-live-ms0 — nothing unique to lose; last commit 3.3d ago; 47 tracked-dirty file(s); 0 ahead but carries uncommitted tracked work — pruning would lose it |
| `prism-octopus-neural-ms0` | `work/octopus-neural-ms0-v2` | 0 | 337 | 2026-05-12 | 47 | — | 0 commits ahead of origin/cad-fusion-live-ms0 — nothing unique to lose; last commit 2.3d ago; 47 tracked-dirty file(s); 0 ahead but carries uncommitted tracked work — pruning would lose it |
| `prism-sfc-calibrate` | `work/sfc-calibrate` | 0 | 432 | 2026-05-11 | 47 | — | 0 commits ahead of origin/cad-fusion-live-ms0 — nothing unique to lose; last commit 3.1d ago; 47 tracked-dirty file(s); 0 ahead but carries uncommitted tracked work — pruning would lose it |
| `prism-skills-util` | `work/skills-utilization-ms0` | 0 | 365 | 2026-05-12 | 49 | — | 0 commits ahead of origin/cad-fusion-live-ms0 — nothing unique to lose; last commit 2.4d ago; 49 tracked-dirty file(s); 0 ahead but carries uncommitted tracked work — pruning would lose it |
| `prism-slot-alpha` | `slot/alpha` | 0 | 60 | 2026-05-14 | 34328 | — | 0 commits ahead of origin/cad-fusion-live-ms0 — nothing unique to lose; last commit 0.5d ago; 34328 tracked-dirty file(s); 0 ahead but carries uncommitted tracked work — pruning would lose it |

## KEEP (23)

| Worktree | Branch | Ahead | Behind | Last commit | Dirty | Live owner | Notes |
|---|---|---:|---:|---|---:|---|---|
| `prism-lathe-pro-v3` | `work/lathe-pro-v3-ms2` | 497 | 1612 | 2026-05-05 | 0 | — | 497 ahead / 1612 behind origin/cad-fusion-live-ms0; last commit 9.0d ago |
| `prism-intel-p8` | `work/engine-wire-cad-ms0` | 89 | 1026 | 2026-05-02 | 2 | — | 89 ahead / 1026 behind origin/cad-fusion-live-ms0; last commit 12.6d ago; 2 tracked-dirty file(s) |
| `prism-cad-sw-fidx` | `work/cad-fidx-solidworks` | 66 | 1026 | 2026-05-05 | 0 | — | 66 ahead / 1026 behind origin/cad-fusion-live-ms0; last commit 9.1d ago |
| `prism-ppgh05` | `work/ppgh05` | 49 | 852 | 2026-05-06 | 0 | — | 49 ahead / 852 behind origin/cad-fusion-live-ms0; last commit 8.0d ago |
| `prism-ppg-advancedpost` | `work/ppg-advancedpost` | 43 | 973 | 2026-05-02 | 2 | — | 43 ahead / 973 behind origin/cad-fusion-live-ms0; last commit 12.1d ago; 2 tracked-dirty file(s) |
| `prism-tribal-binder` | `work/tribal-node-binder` | 41 | 577 | 2026-05-11 | 4 | — | 41 ahead / 577 behind origin/cad-fusion-live-ms0; last commit 3.4d ago; 4 tracked-dirty file(s) |
| `prism-cam-ms1-93a0` | `work/cad-fidx-fus-93a0` | 40 | 1026 | 2026-05-01 | 0 | — | 40 ahead / 1026 behind origin/cad-fusion-live-ms0; last commit 13.0d ago |
| `prism-cam-exhaust-ms0` | `work/cam-exhaust-ms0` | 29 | 789 | 2026-05-07 | 3 | — | 29 ahead / 789 behind origin/cad-fusion-live-ms0; last commit 7.4d ago; 3 tracked-dirty file(s) |
| `prism-iooms1` | `work/intel-ollama-obsidian-ms1` | 26 | 1026 | 2026-05-01 | 0 | — | 26 ahead / 1026 behind origin/cad-fusion-live-ms0; last commit 13.2d ago |
| `prism-xproc-neural-aci` | `work/xproc-neural-aci-ms0` | 23 | 643 | 2026-05-09 | 0 | — | 23 ahead / 643 behind origin/cad-fusion-live-ms0; last commit 5.0d ago |
| `prism-lathe-prod-ready` | `work/lathe-prod-ready-ms0` | 18 | 1295 | 2026-05-03 | 4 | — | 18 ahead / 1295 behind origin/cad-fusion-live-ms0; last commit 11.1d ago; 4 tracked-dirty file(s) |
| `prism-obsidian-ms1` | `work/obsidian-compound-ms1-recover` | 17 | 635 | 2026-05-08 | 2 | — | 17 ahead / 635 behind origin/cad-fusion-live-ms0; last commit 6.1d ago; 2 tracked-dirty file(s) |
| `prism-phase27` | `work/cad-phase27-ms0` | 13 | 688 | 2026-05-08 | 0 | — | 13 ahead / 688 behind origin/cad-fusion-live-ms0; last commit 6.5d ago |
| `PRISM/.claude/worktrees/rgs6-audit-v2` | `work/rgs6-audit-v2` | 5 | 469 | 2026-05-11 | 40 | — | 5 ahead / 469 behind origin/cad-fusion-live-ms0; last commit 3.4d ago; 40 tracked-dirty file(s) |
| `prism-cam-spcfai-ms0` | `work/cam-spcfai-ms0` | 3 | 856 | 2026-05-05 | 5 | — | 3 ahead / 856 behind origin/cad-fusion-live-ms0; last commit 9.5d ago; 5 tracked-dirty file(s) |
| `prism-tsc-fix` | `work/tsc-fix` | 3 | 16 | 2026-05-14 | 1 | — | 3 ahead / 16 behind origin/cad-fusion-live-ms0; last commit 0.2d ago; 1 tracked-dirty file(s) |
| `prism-cleanup-g19` | `work/cleanup-g19` | 2 | 135 | 2026-05-13 | 0 | — | 2 ahead / 135 behind origin/cad-fusion-live-ms0; last commit 1.1d ago |
| `prism-cam-engine-fixes` | `work/cam-engine-fixes` | 1 | 904 | 2026-05-04 | 0 | — | 1 ahead / 904 behind origin/cad-fusion-live-ms0; last commit 10.5d ago |
| `prism-golf-watchdog` | `work/golf-watchdog-ms0` | 1 | 239 | 2026-05-13 | 0 | — | 1 ahead / 239 behind origin/cad-fusion-live-ms0; last commit 1.5d ago |
| `prism-lathe-pro-v3-bookkeeping` | `work/lathe-pro-v3-bookkeeping` | 1 | 822 | 2026-05-05 | 0 | — | 1 ahead / 822 behind origin/cad-fusion-live-ms0; last commit 9.1d ago |
| `prism-macro-domain` | `work/macro-domain-ms0` | 1 | 361 | 2026-05-12 | 48 | — | 1 ahead / 361 behind origin/cad-fusion-live-ms0; last commit 2.3d ago; 48 tracked-dirty file(s) |
| `prism-scrutiny-closeout` | `work/scrutiny-closeout` | 1 | 393 | 2026-05-12 | 47 | — | 1 ahead / 393 behind origin/cad-fusion-live-ms0; last commit 2.4d ago; 47 tracked-dirty file(s) |
| `PRISM` | `cad-fusion-live-ms0` | 0 | 0 | 2026-05-14 | 684 | alpha ⚠ALIVE | integration branch worktree (== base 'cad-fusion-live-ms0') — never prune; 684 tracked-dirty file(s) |

---
_Re-run: `node scripts/audit-worktrees.mjs`. JSON sibling: `WORKTREE-AUDIT-2026-05-15.json`._
