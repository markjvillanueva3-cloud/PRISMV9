# SLOT-DRIFT-FIX-MS0/U-SDF16 — [MAIN] [SLOT-DRIFT-FIX-MS0]/U-SDF16: cross-reference CLOSE-OUT-DEFERRED in /goal pre-flight injector

**Commit:** `bc11938c6fba` · **By:** markjvillanueva3-cloud · **At:** 2026-05-17T10:57:24-05:00
**Tags:** slot-drift-fix-ms0, u-sdf16, auto-distilled

## Subject
[MAIN] [SLOT-DRIFT-FIX-MS0]/U-SDF16: cross-reference CLOSE-OUT-DEFERRED in /goal pre-flight injector

## Body
```
[MAIN] [SLOT-DRIFT-FIX-MS0]/U-SDF16: cross-reference CLOSE-OUT-DEFERRED in /goal pre-flight injector

Bug surfaced live this session: the /goal pre-flight panel claimed "3 candidate(s) Pending triage: U-CAMP01, U-CAMP14, U-CAMP15" while all 3 ALREADY had deferral entries in CLOSE-OUT-DEFERRED.md dated 2026-05-13 — 4 days stale "needs-triage" flag.

ROOT CAUSE: goal-prereq-inject.mjs displayed every candidate from CLOSE-OUT-CANDIDATES.json unconditionally. It tallied deferrals as a SEPARATE line but did not subtract them from the "Pending triage" list. The Stop-gate (goal-complete-gate.mjs) DOES cross-reference correctly (regex check against deferredText) — only this pre-flight panel was blind. Operators were getting misleading "needs work" panels for units that were correctly deferred and would clear at /goal complete.

FIX: load deferred IDs FIRST (composite + bare unit_id), then filter candidates. Header now reads "N pending triage (M already deferred)" — both surfaces (pre-flight panel + Stop-gate) agree.

Smoke: empty /goal stdin yields "0 pending triage (3 already deferred)" with the 3 CAM-PARITY entries correctly subtracted.

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
```

## Files touched (2)
- .claude/hooks/goal-prereq-inject.mjs | 57 ++++++++++++++++++++++++++----------
- 1 file changed, 42 insertions(+), 15 deletions(-)


## Verification
**Scrutiny ledger**: arms A✗ B✗ C✗ for session 

## Cross-references
- Full commit: `git -C H:/prism show bc11938c6fba`
- Milestone envelope: `mcp-server/data/milestones/SLOT-DRIFT-FIX-MS0.json`

---
_Auto-distilled by `scripts/distill-session-learnings.mjs` per [[feedback_auto_close_out]] / SYSTEM-VIZ-BRAIN-MS0/U-P1-POST-SHIP-DISTILL._