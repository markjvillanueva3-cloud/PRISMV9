# WORKTREE AUDIT — 2026-05-14

**Generated:** 2026-05-14T15:12:09.612Z by `scripts/audit-worktrees.mjs` (READ-ONLY).
**Base:** `origin/cad-fusion-live-ms0` · **Worktrees:** 48

**Classification rules:** PRUNE = 0 ahead & tracked-clean · MERGE = ahead>0, clean, idle>7d, unowned · KEEP = ahead>0 & (active<14d OR live owner), or the base worktree · INVESTIGATE = locked/detached/ahead>500/idle+dirty/0-ahead-but-dirty.

> Advisory only — no worktree/branch is mutated. Human-verify before any prune or land.

## Summary

| Verdict | Count | Meaning |
|---|---:|---|
| KEEP | 27 | Active dev / live owner — do not touch |
| MERGE | 8 | Settled, clean, unowned — ready to land |
| PRUNE | 0 | 0 commits ahead — safe to `git worktree remove` |
| INVESTIGATE | 13 | Contradiction / risk — needs a decision |

## MERGE (8)

| Worktree | Branch | Ahead | Behind | Last commit | Dirty | Live owner | Notes |
|---|---|---:|---:|---|---:|---|---|
| `PRISM/.claude/worktrees/u-fus-api01` | `worktree-u-fus-api01` | 497 | 1548 | 2026-04-27 | ? | — | 497 ahead / 1548 behind origin/cad-fusion-live-ms0; last commit 16.9d ago; dirty-check: skipped (--no-dirty) |
| `prism-mill-worktree` | `work/mill-master` | 489 | 1548 | 2026-04-24 | ? | — | 489 ahead / 1548 behind origin/cad-fusion-live-ms0; last commit 19.4d ago; dirty-check: skipped (--no-dirty) |
| `prism-cam-exhaust` | `work/cam-exhaust-cam43-plus` | 14 | 1404 | 2026-04-24 | ? | — | 14 ahead / 1404 behind origin/cad-fusion-live-ms0; last commit 20.1d ago; dirty-check: skipped (--no-dirty) |
| `prism-knowledge-wiki` | `work/knowledge-wiki-ms0` | 11 | 1066 | 2026-04-27 | ? | — | 11 ahead / 1066 behind origin/cad-fusion-live-ms0; last commit 16.8d ago; dirty-check: skipped (--no-dirty) |
| `prism-session-efficiency` | `work/session-efficiency` | 7 | 1477 | 2026-04-24 | ? | — | 7 ahead / 1477 behind origin/cad-fusion-live-ms0; last commit 19.8d ago; dirty-check: skipped (--no-dirty) |
| `prism-file-claim-fix` | `meta/file-claim-fix` | 4 | 1070 | 2026-04-27 | ? | — | 4 ahead / 1070 behind origin/cad-fusion-live-ms0; last commit 17.0d ago; dirty-check: skipped (--no-dirty) |
| `PRISM/.claude/worktrees/u-fus-api02` | `worktree-u-fus-api02` | 2 | 1050 | 2026-04-27 | ? | — | 2 ahead / 1050 behind origin/cad-fusion-live-ms0; last commit 16.9d ago; dirty-check: skipped (--no-dirty) |
| `prism-claudemd-enforcement` | `meta/claudemd-enforcement` | 1 | 1081 | 2026-04-27 | ? | — | 1 ahead / 1081 behind origin/cad-fusion-live-ms0; last commit 17.1d ago; dirty-check: skipped (--no-dirty) |

## INVESTIGATE (13)

| Worktree | Branch | Ahead | Behind | Last commit | Dirty | Live owner | Notes |
|---|---|---:|---:|---|---:|---|---|
| `prism-iooms0` | `work/intel-ollama-obsidian-ms0` | 983 | 1548 | 2026-05-08 | ? | — | 983 ahead / 1548 behind origin/cad-fusion-live-ms0; last commit 6.1d ago; dirty-check: skipped (--no-dirty); ahead > 500 — needs scoped cherry-pick plan, not a blind land |
| `prism-merge-staging` | `work/merge-staging-ms0` | 874 | 1548 | 2026-05-06 | ? | — | 874 ahead / 1548 behind origin/cad-fusion-live-ms0; last commit 7.5d ago; dirty-check: skipped (--no-dirty); ahead > 500 — needs scoped cherry-pick plan, not a blind land |
| `prism-forge-archive` | `archive/forge-orphans-2026-05-01` | 502 | 1548 | 2026-05-01 | ? | — | 502 ahead / 1548 behind origin/cad-fusion-live-ms0; last commit 12.7d ago; dirty-check: skipped (--no-dirty); ahead > 500 — needs scoped cherry-pick plan, not a blind land |
| `PRISM/.claude/worktrees/psau-sav2` | `work/psau-sav2` | 0 | 1496 | 2026-04-22 | ? | — | 0 commits ahead of origin/cad-fusion-live-ms0 — nothing unique to lose; last commit 21.9d ago; dirty-check: skipped (--no-dirty); 0 ahead but dirty state could not be confirmed — verify before pruning |
| `prism-awareness-mega` | `work/awareness-prod-mega` | 0 | 104 | 2026-05-13 | ? | — | 0 commits ahead of origin/cad-fusion-live-ms0 — nothing unique to lose; last commit 0.8d ago; dirty-check: skipped (--no-dirty); 0 ahead but dirty state could not be confirmed — verify before pruning |
| `prism-blueprint-ocr-training` | `work/blueprint-ocr-training-ms1` | 0 | 258 | 2026-05-12 | ? | — | 0 commits ahead of origin/cad-fusion-live-ms0 — nothing unique to lose; last commit 1.7d ago; dirty-check: skipped (--no-dirty); 0 ahead but dirty state could not be confirmed — verify before pruning |
| `prism-cad-complete` | `work/cad-complete-ms0` | 0 | 1522 | 2026-04-22 | ? | — | 0 commits ahead of origin/cad-fusion-live-ms0 — nothing unique to lose; last commit 22.0d ago; dirty-check: skipped (--no-dirty); 0 ahead but dirty state could not be confirmed — verify before pruning |
| `prism-cost-cascade` | `work/cost-cascade-ms0` | 0 | 371 | 2026-05-11 | ? | — | 0 commits ahead of origin/cad-fusion-live-ms0 — nothing unique to lose; last commit 2.8d ago; dirty-check: skipped (--no-dirty); 0 ahead but dirty state could not be confirmed — verify before pruning |
| `prism-devtools-charlie` | `work/devtools-charlie` | 0 | 105 | 2026-05-13 | ? | — | 0 commits ahead of origin/cad-fusion-live-ms0 — nothing unique to lose; last commit 0.8d ago; dirty-check: skipped (--no-dirty); 0 ahead but dirty state could not be confirmed — verify before pruning |
| `prism-graph-context` | `work/graph-context-ms0` | 0 | 371 | 2026-05-11 | ? | — | 0 commits ahead of origin/cad-fusion-live-ms0 — nothing unique to lose; last commit 2.8d ago; dirty-check: skipped (--no-dirty); 0 ahead but dirty state could not be confirmed — verify before pruning |
| `prism-octopus-neural-ms0` | `work/octopus-neural-ms0-v2` | 0 | 273 | 2026-05-12 | ? | — | 0 commits ahead of origin/cad-fusion-live-ms0 — nothing unique to lose; last commit 1.8d ago; dirty-check: skipped (--no-dirty); 0 ahead but dirty state could not be confirmed — verify before pruning |
| `prism-sfc-calibrate` | `work/sfc-calibrate` | 0 | 368 | 2026-05-11 | ? | — | 0 commits ahead of origin/cad-fusion-live-ms0 — nothing unique to lose; last commit 2.6d ago; dirty-check: skipped (--no-dirty); 0 ahead but dirty state could not be confirmed — verify before pruning |
| `prism-skills-util` | `work/skills-utilization-ms0` | 0 | 301 | 2026-05-12 | ? | — | 0 commits ahead of origin/cad-fusion-live-ms0 — nothing unique to lose; last commit 1.9d ago; dirty-check: skipped (--no-dirty); 0 ahead but dirty state could not be confirmed — verify before pruning |

## KEEP (27)

| Worktree | Branch | Ahead | Behind | Last commit | Dirty | Live owner | Notes |
|---|---|---:|---:|---|---:|---|---|
| `prism-lathe-pro-v3` | `work/lathe-pro-v3-ms2` | 497 | 1548 | 2026-05-05 | ? | — | 497 ahead / 1548 behind origin/cad-fusion-live-ms0; last commit 8.5d ago; dirty-check: skipped (--no-dirty) |
| `prism-intel-p8` | `work/engine-wire-cad-ms0` | 89 | 962 | 2026-05-02 | ? | — | 89 ahead / 962 behind origin/cad-fusion-live-ms0; last commit 12.1d ago; dirty-check: skipped (--no-dirty) |
| `prism-tsc-cleanup` | `work/tsc-cleanup-ms0` | 88 | 1046 | 2026-04-30 | ? | — | 88 ahead / 1046 behind origin/cad-fusion-live-ms0; last commit 13.6d ago; dirty-check: skipped (--no-dirty) |
| `prism-cad-sw-fidx` | `work/cad-fidx-solidworks` | 66 | 962 | 2026-05-05 | ? | — | 66 ahead / 962 behind origin/cad-fusion-live-ms0; last commit 8.6d ago; dirty-check: skipped (--no-dirty) |
| `prism-ppgh05` | `work/ppgh05` | 49 | 788 | 2026-05-06 | ? | — | 49 ahead / 788 behind origin/cad-fusion-live-ms0; last commit 7.6d ago; dirty-check: skipped (--no-dirty) |
| `prism-ppg-advancedpost` | `work/ppg-advancedpost` | 43 | 909 | 2026-05-02 | ? | — | 43 ahead / 909 behind origin/cad-fusion-live-ms0; last commit 11.6d ago; dirty-check: skipped (--no-dirty) |
| `prism-tribal-binder` | `work/tribal-node-binder` | 41 | 513 | 2026-05-11 | ? | — | 41 ahead / 513 behind origin/cad-fusion-live-ms0; last commit 2.9d ago; dirty-check: skipped (--no-dirty) |
| `prism-cam-ms1-93a0` | `work/cad-fidx-fus-93a0` | 40 | 962 | 2026-05-01 | ? | — | 40 ahead / 962 behind origin/cad-fusion-live-ms0; last commit 12.6d ago; dirty-check: skipped (--no-dirty) |
| `prism-cam-exhaust-ms0` | `work/cam-exhaust-ms0` | 29 | 725 | 2026-05-07 | ? | — | 29 ahead / 725 behind origin/cad-fusion-live-ms0; last commit 6.9d ago; dirty-check: skipped (--no-dirty) |
| `prism-engine-wire-ms0` | `work/engine-wire-ms0` | 28 | 963 | 2026-04-30 | ? | — | 28 ahead / 963 behind origin/cad-fusion-live-ms0; last commit 13.6d ago; dirty-check: skipped (--no-dirty) |
| `prism-iooms1` | `work/intel-ollama-obsidian-ms1` | 26 | 962 | 2026-05-01 | ? | — | 26 ahead / 962 behind origin/cad-fusion-live-ms0; last commit 12.7d ago; dirty-check: skipped (--no-dirty) |
| `prism-xproc-neural-aci` | `work/xproc-neural-aci-ms0` | 23 | 579 | 2026-05-09 | ? | — | 23 ahead / 579 behind origin/cad-fusion-live-ms0; last commit 4.5d ago; dirty-check: skipped (--no-dirty) |
| `prism-lathe-prod-ready` | `work/lathe-prod-ready-ms0` | 18 | 1231 | 2026-05-03 | ? | — | 18 ahead / 1231 behind origin/cad-fusion-live-ms0; last commit 10.6d ago; dirty-check: skipped (--no-dirty) |
| `prism-obsidian-ms1` | `work/obsidian-compound-ms1-recover` | 17 | 571 | 2026-05-08 | ? | — | 17 ahead / 571 behind origin/cad-fusion-live-ms0; last commit 5.6d ago; dirty-check: skipped (--no-dirty) |
| `prism-hypermill-ms1` | `work/cam-hypermill-ms1` | 15 | 962 | 2026-04-30 | ? | — | 15 ahead / 962 behind origin/cad-fusion-live-ms0; last commit 13.6d ago; dirty-check: skipped (--no-dirty) |
| `prism-phase27` | `work/cad-phase27-ms0` | 13 | 624 | 2026-05-08 | ? | — | 13 ahead / 624 behind origin/cad-fusion-live-ms0; last commit 6.1d ago; dirty-check: skipped (--no-dirty) |
| `prism-fusion-ms1` | `work/cam-fusion-ms1` | 12 | 962 | 2026-04-30 | ? | — | 12 ahead / 962 behind origin/cad-fusion-live-ms0; last commit 13.7d ago; dirty-check: skipped (--no-dirty) |
| `PRISM/.claude/worktrees/rgs6-audit-v2` | `work/rgs6-audit-v2` | 5 | 405 | 2026-05-11 | ? | — | 5 ahead / 405 behind origin/cad-fusion-live-ms0; last commit 2.9d ago; dirty-check: skipped (--no-dirty) |
| `prism-cam-spcfai-ms0` | `work/cam-spcfai-ms0` | 3 | 792 | 2026-05-05 | ? | — | 3 ahead / 792 behind origin/cad-fusion-live-ms0; last commit 9.0d ago; dirty-check: skipped (--no-dirty) |
| `prism-docu-print-loop` | `work/docu-print-loop-ms0` | 3 | 36 | 2026-05-14 | ? | — | 3 ahead / 36 behind origin/cad-fusion-live-ms0; last commit 0.0d ago; dirty-check: skipped (--no-dirty) |
| `prism-cleanup-g19` | `work/cleanup-g19` | 2 | 71 | 2026-05-13 | ? | — | 2 ahead / 71 behind origin/cad-fusion-live-ms0; last commit 0.7d ago; dirty-check: skipped (--no-dirty) |
| `prism-cam-engine-fixes` | `work/cam-engine-fixes` | 1 | 840 | 2026-05-04 | ? | — | 1 ahead / 840 behind origin/cad-fusion-live-ms0; last commit 10.0d ago; dirty-check: skipped (--no-dirty) |
| `prism-golf-watchdog` | `work/golf-watchdog-ms0` | 1 | 175 | 2026-05-13 | ? | — | 1 ahead / 175 behind origin/cad-fusion-live-ms0; last commit 1.0d ago; dirty-check: skipped (--no-dirty) |
| `prism-lathe-pro-v3-bookkeeping` | `work/lathe-pro-v3-bookkeeping` | 1 | 758 | 2026-05-05 | ? | — | 1 ahead / 758 behind origin/cad-fusion-live-ms0; last commit 8.6d ago; dirty-check: skipped (--no-dirty) |
| `prism-macro-domain` | `work/macro-domain-ms0` | 1 | 297 | 2026-05-12 | ? | — | 1 ahead / 297 behind origin/cad-fusion-live-ms0; last commit 1.9d ago; dirty-check: skipped (--no-dirty) |
| `prism-scrutiny-closeout` | `work/scrutiny-closeout` | 1 | 329 | 2026-05-12 | ? | — | 1 ahead / 329 behind origin/cad-fusion-live-ms0; last commit 1.9d ago; dirty-check: skipped (--no-dirty) |
| `PRISM` | `cad-fusion-live-ms0` | 0 | 0 | 2026-05-14 | ? | bravo | integration branch worktree (== base 'cad-fusion-live-ms0') — never prune |

---
_Re-run: `node scripts/audit-worktrees.mjs`. JSON sibling: `WORKTREE-AUDIT-2026-05-14.json`._
