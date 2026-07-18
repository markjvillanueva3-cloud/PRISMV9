# FLEET-HYGIENE/U-EFFICIENCY-SPEC-CORRECT — [MAIN-FORCE] [FLEET-HYGIENE]/U-EFFICIENCY-SPEC-CORRECT (slot:golf): measure-first correction -- injection fixes 1-3 were already done

**Commit:** `5f5a0b5de9c0` · **By:** markjvillanueva3-cloud · **At:** 2026-06-17T20:51:39-05:00
**Tags:** fleet-hygiene, u-efficiency-spec-correct, auto-distilled

## Subject
[MAIN-FORCE] [FLEET-HYGIENE]/U-EFFICIENCY-SPEC-CORRECT (slot:golf): measure-first correction -- injection fixes 1-3 were already done

## Body
```
[MAIN-FORCE] [FLEET-HYGIENE]/U-EFFICIENCY-SPEC-CORRECT (slot:golf): measure-first correction -- injection fixes 1-3 were already done

Corrected SYSTEM-APPLY-EFFICIENCY-ASSESSMENT: the measurement (audit + live code
read) overturned the spec's own "finish dedup rollout = 429 relief" premise. Every
named heavy injector already has a working mitigation (dedup/throttle/rate-limit/
keyword-gate/once-per-session). Re-ranked to the genuine remaining gaps: 192 drift
milestones (free-model job), re-arm PRISM_ALLOW_UNWIRED. Anti-waste doc-reflection
so the fleet does not re-chase a non-problem.
```

## Files touched (2)
- state/shared/specs/SYSTEM-APPLY-EFFICIENCY-ASSESSMENT-2026-06-17.md | 86 ++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++
- 1 file changed, 86 insertions(+)


## Verification
**Scrutiny ledger**: arms A✗ B✗ C✗ for session 

## Cross-references
- Full commit: `git -C H:/prism show 5f5a0b5de9c0`
- Milestone envelope: `mcp-server/data/milestones/FLEET-HYGIENE.json`

---
_Auto-distilled by `scripts/distill-session-learnings.mjs` per [[feedback_auto_close_out]] / SYSTEM-VIZ-BRAIN-MS0/U-P1-POST-SHIP-DISTILL._