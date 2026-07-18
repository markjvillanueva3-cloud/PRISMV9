# OBSIDIAN-AI-SYNERGY/U-AUDIT-WIRED-VIA-ENGINE-SCRUTINY-FIX — [MAIN] [BOOTSTRAP-SLOT-ENFORCE] [OBSIDIAN-AI-SYNERGY]/U-AUDIT-WIRED-VIA-ENGINE-SCRUTINY-FIX (slot:sierra): harden WIRE-EXEMPT test + single-hop doc honesty (3-of-3 reviewer P2)

**Commit:** `037f61dc8696` · **By:** markjvillanueva3-cloud · **At:** 2026-06-10T11:07:52-05:00
**Tags:** obsidian-ai-synergy, u-audit-wired-via-engine-scrutiny-fix, auto-distilled

## Subject
[MAIN] [BOOTSTRAP-SLOT-ENFORCE] [OBSIDIAN-AI-SYNERGY]/U-AUDIT-WIRED-VIA-ENGINE-SCRUTINY-FIX (slot:sierra): harden WIRE-EXEMPT test + single-hop doc honesty (3-of-3 reviewer P2)

## Body
```
[MAIN] [BOOTSTRAP-SLOT-ENFORCE] [OBSIDIAN-AI-SYNERGY]/U-AUDIT-WIRED-VIA-ENGINE-SCRUTINY-FIX (slot:sierra): harden WIRE-EXEMPT test + single-hop doc honesty (3-of-3 reviewer P2)

Reviewer B (3-of-3 arm) caught the WIRE-EXEMPT test passed for the WRONG reason -- the priority guard preserved classified independently, so removing the classified===WIRE-EXEMPT skip did NOT fail it (the prior 'WIRE-EXEMPT-preserved fail-on-revert' claim was overstated, R12). Fix: assert reasons stays [] -- removing the exempt-skip pushes a spurious WIRED-VIA-ENGINE reason, which deepEqual now catches (true fail-on-revert of the skip itself). Reviewers A+B also flagged the doc said 'transitively' but the pass is SINGLE-HOP (does not verify the consuming engine is itself wired); reworded header + notes to state it honestly (dormant ROOT stays UNWIRED = the actionable signal). 23/23 green. No production-logic change -- the shipped exempt-skip + single-hop pass were already correct; this makes test + docs match reality.
```

## Files touched (3)
- scripts/audit-unwired-engines.mjs      | 11 ++++++++---
- scripts/audit-unwired-engines.test.mjs |  9 +++++++++
- 2 files changed, 17 insertions(+), 3 deletions(-)

## Lessons surfaced in commit body
- WRONG reason -- the priority guard preserved classified independently, so removing the classified===WIRE-EXEMPT skip did NOT fail it (the prior 'WIRE-EXEMPT-preserved fail-on-revert' claim was overstated, R12). Fix: assert reasons stays [] -- removing the exempt-skip pushes a spurious WIRED-VIA-ENGINE reason, which deepEqual now catches (true fail-on-revert of the skip itself). Reviewers A+B also flagg

## Verification
**Scrutiny ledger**: arms A✗ B✗ C✗ for session 

## Cross-references
- Full commit: `git -C H:/prism show 037f61dc8696`
- Milestone envelope: `mcp-server/data/milestones/OBSIDIAN-AI-SYNERGY.json`

---
_Auto-distilled by `scripts/distill-session-learnings.mjs` per [[feedback_auto_close_out]] / SYSTEM-VIZ-BRAIN-MS0/U-P1-POST-SHIP-DISTILL._