# TOKEN-SAVINGS-PIVOT/U-ROUTE-STATS-SKILL — [MAIN] [TOKEN-SAVINGS-PIVOT]/U-ROUTE-STATS-SKILL (slot:alpha iter4): /route-suggest-stats ROI reporter

**Commit:** `8aa3a621c788` · **By:** markjvillanueva3-cloud · **At:** 2026-05-22T18:36:23-05:00
**Tags:** token-savings-pivot, u-route-stats-skill, auto-distilled

## Subject
[MAIN] [TOKEN-SAVINGS-PIVOT]/U-ROUTE-STATS-SKILL (slot:alpha iter4): /route-suggest-stats ROI reporter

## Body
```
[MAIN] [TOKEN-SAVINGS-PIVOT]/U-ROUTE-STATS-SKILL (slot:alpha iter4): /route-suggest-stats ROI reporter

Wired-in feedback loop closing the goal — operator-invokable skill that
reads the iter-3 atomic-write telemetry sidecar and reports:
  - totalFires (cumulative TOKEN-SAVE nudges fleet-wide)
  - byToolName breakdown
  - byClassifier breakdown (9 classifiers)
  - recent[] last 10 fires with sessionId truncation
  - lower-bound ROI estimate (totalFires × 30% take-rate × 8K/fire)

Triggers: "route suggest stats", "token save stats", "mcp route roi",
"how much did routing save", "route-suggest telemetry".

model=haiku, effort=low — pure read + format, zero Claude synthesis tokens.
Closes the iter1→iter2→iter3→iter4 chain: route nudges shipped, telemetry
shipped, now operators can SEE the ROI without grepping the sidecar.

Sister skills: ollama-route-check.md (offload-route health).
```

## Files touched (2)
- .claude/commands/route-suggest-stats.md | 67 +++++++++++++++++++++++++++++++++
- 1 file changed, 67 insertions(+)


## Verification
**Scrutiny ledger**: arms A✗ B✗ C✗ for session 

## Cross-references
- Full commit: `git -C H:/prism show 8aa3a621c788`
- Milestone envelope: `mcp-server/data/milestones/TOKEN-SAVINGS-PIVOT.json`

---
_Auto-distilled by `scripts/distill-session-learnings.mjs` per [[feedback_auto_close_out]] / SYSTEM-VIZ-BRAIN-MS0/U-P1-POST-SHIP-DISTILL._