# QUOTING-SYNERGY-MS0/U-QP-CRON-CWD-FIX — [MAIN] [BOOTSTRAP-SLOT-ENFORCE] [QUOTING-SYNERGY-MS0]/U-QP-CRON-CWD-FIX (slot:charlie): pin the generated nightly-wrapper cwd to PrismRoot via Set-Location -- latent bug exposed completing T4: the scheduled task default cwd is System32 but Stage 0 (from-corpus) resolves state/shared/databases/*.jsonl + baseline-records.json cwd-relative, so without this the rewired Stage 0 fails to find its inputs. Validated via installer -DryRun (generated wrapper shows Set-Location 'H:\prism' + from-corpus Stage0). 19/19 tests, .ps1 PARSE-OK. SCOPE: Stage2 training reads a separate corpus (baseline-records-corpus-with-real.json); Stage0 feeds Stage1

**Commit:** `199db23e78a0` · **By:** markjvillanueva3-cloud · **At:** 2026-06-11T18:36:57-05:00
**Tags:** quoting-synergy-ms0, u-qp-cron-cwd-fix, auto-distilled

## Subject
[MAIN] [BOOTSTRAP-SLOT-ENFORCE] [QUOTING-SYNERGY-MS0]/U-QP-CRON-CWD-FIX (slot:charlie): pin the generated nightly-wrapper cwd to PrismRoot via Set-Location -- latent bug exposed completing T4: the scheduled task default cwd is System32 but Stage 0 (from-corpus) resolves state/shared/databases/*.jsonl + baseline-records.json cwd-relative, so without this the rewired Stage 0 fails to find its inputs. Validated via installer -DryRun (generated wrapper shows Set-Location 'H:\prism' + from-corpus Stage0). 19/19 tests, .ps1 PARSE-OK. SCOPE: Stage2 training reads a separate corpus (baseline-records-corpus-with-real.json); Stage0 feeds Stage1

## Body
```
[MAIN] [BOOTSTRAP-SLOT-ENFORCE] [QUOTING-SYNERGY-MS0]/U-QP-CRON-CWD-FIX (slot:charlie): pin the generated nightly-wrapper cwd to PrismRoot via Set-Location -- latent bug exposed completing T4: the scheduled task default cwd is System32 but Stage 0 (from-corpus) resolves state/shared/databases/*.jsonl + baseline-records.json cwd-relative, so without this the rewired Stage 0 fails to find its inputs. Validated via installer -DryRun (generated wrapper shows Set-Location 'H:\prism' + from-corpus Stage0). 19/19 tests, .ps1 PARSE-OK. SCOPE: Stage2 training reads a separate corpus (baseline-records-corpus-with-real.json); Stage0 feeds Stage1
```

## Files touched (3)
- scripts/install-quoting-pipeline-cron.ps1      | 6 ++++++
- scripts/install-quoting-pipeline-cron.test.mjs | 8 ++++++++
- 2 files changed, 14 insertions(+)


## Verification
**Scrutiny ledger**: arms A✗ B✗ C✗ for session 

## Cross-references
- Full commit: `git -C H:/prism show 199db23e78a0`
- Milestone envelope: `mcp-server/data/milestones/QUOTING-SYNERGY-MS0.json`

---
_Auto-distilled by `scripts/distill-session-learnings.mjs` per [[feedback_auto_close_out]] / SYSTEM-VIZ-BRAIN-MS0/U-P1-POST-SHIP-DISTILL._