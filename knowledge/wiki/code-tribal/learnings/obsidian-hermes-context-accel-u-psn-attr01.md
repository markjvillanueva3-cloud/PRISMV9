# OBSIDIAN-HERMES-CONTEXT-ACCEL/U-PSN-ATTR01 — [MAIN] [BOOTSTRAP-SLOT-ENFORCE] [OBSIDIAN-HERMES-CONTEXT-ACCEL]/U-PSN-ATTR01: PSN-leg attribution ledger (papa, lever #2)

**Commit:** `e611001ed223` · **By:** markjvillanueva3-cloud · **At:** 2026-06-06T11:05:42-05:00
**Tags:** obsidian-hermes-context-accel, u-psn-attr01, auto-distilled

## Subject
[MAIN] [BOOTSTRAP-SLOT-ENFORCE] [OBSIDIAN-HERMES-CONTEXT-ACCEL]/U-PSN-ATTR01: PSN-leg attribution ledger (papa, lever #2)

## Body
```
[MAIN] [BOOTSTRAP-SLOT-ENFORCE] [OBSIDIAN-HERMES-CONTEXT-ACCEL]/U-PSN-ATTR01: PSN-leg attribution ledger (papa, lever #2)

Compounds on U-SCP01: maps each retrieval hit's source-chain Citation.source_type -> one of the 11 canonical PSN legs, records per-session N/11 leg coverage to state/shared/psn-attribution.jsonl. Measures the live 'which legs of the brain are actually consulted' blindness. NEW scripts/lib/psn-attribution-lib.mjs (pure leg-map core + fail-soft O_APPEND record + coverage read; 12/12 tests). MOD master-index-precheck-inject.mjs taps decorated hits (fail-soft; PRISM_PSN_ATTRIBUTION_DISABLE=1 reverts). Live-validated: 3/11 legs (wiki,memories,system_viz). [SCOPED] follow-up: prism_session:psn_attribution read action + tap memory/tribal inject hooks.
```

## Files touched (4)
- .claude/hooks/master-index-precheck-inject.mjs |  13 +++++++++
- scripts/lib/psn-attribution-lib.mjs            | 201 ++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++
- scripts/lib/psn-attribution-lib.test.mjs       | 165 ++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++
- 3 files changed, 379 insertions(+)


## Verification
**Scrutiny ledger**: arms A✗ B✗ C✗ for session 

## Cross-references
- Full commit: `git -C H:/prism show e611001ed223`
- Milestone envelope: `mcp-server/data/milestones/OBSIDIAN-HERMES-CONTEXT-ACCEL.json`

---
_Auto-distilled by `scripts/distill-session-learnings.mjs` per [[feedback_auto_close_out]] / SYSTEM-VIZ-BRAIN-MS0/U-P1-POST-SHIP-DISTILL._