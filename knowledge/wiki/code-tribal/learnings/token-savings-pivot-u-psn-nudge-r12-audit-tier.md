# TOKEN-SAVINGS-PIVOT/U-PSN-NUDGE-R12-AUDIT-TIER — [MAIN] [TOKEN-SAVINGS-PIVOT]/U-PSN-NUDGE-R12-AUDIT-TIER (slot:alpha iter9): tier-classify unknown action refs by dispatcher-existence — 16 Tier B (R12 fakes) vs 26 Tier A (Zod-routed/stale)

**Commit:** `583e4b7393a0` · **By:** markjvillanueva3-cloud · **At:** 2026-05-23T14:10:26-05:00
**Tags:** token-savings-pivot, u-psn-nudge-r12-audit-tier, auto-distilled

## Subject
[MAIN] [TOKEN-SAVINGS-PIVOT]/U-PSN-NUDGE-R12-AUDIT-TIER (slot:alpha iter9): tier-classify unknown action refs by dispatcher-existence — 16 Tier B (R12 fakes) vs 26 Tier A (Zod-routed/stale)

## Body
```
[MAIN] [TOKEN-SAVINGS-PIVOT]/U-PSN-NUDGE-R12-AUDIT-TIER (slot:alpha iter9): tier-classify unknown action refs by dispatcher-existence — 16 Tier B (R12 fakes) vs 26 Tier A (Zod-routed/stale)

iter8's auto-derive cut the punch list 33→19 hooks but flat-listed
"action might be Zod-routed in real dispatcher" alongside "dispatcher
doesn't exist". iter9 splits unknowns into tiers so subsequent fix
iters can target the truly-fake ones first.

New exports:
  • loadKnownDispatcherPrefixes(dir) — set of `prism_<key>` from
    *Dispatcher.ts filenames
  • classifyUnknowns(refs, knownPrefixes) — { tierA, tierB }

CLI emits per-hook Tier A + Tier B sections with totals.

Outcome:
  Known-real set: 10,317 actions across 101 dispatchers
  Tier A: 26 refs — warm follow-up (dispatcher real, action Zod-routed or stale doc)
  Tier B: 16 refs — definite R12 fakes (dispatcher doesn't exist)

Tier B punch list:
  • prism_ai:* (multiple hooks) — aiDispatcher.ts apparently absent
  • prism_shop_practice:* (stop-playbook-corpus-drift-advisory)
  • prism_intelligence:ai_feature_discover — needs deeper check

Tests: 32/32 pass (7 new for classifyUnknowns).
```

## Files touched (3)
- .../stop-playbook-corpus-drift-advisory.test.mjs   | 164 ++++++++++++++++++
- .../hooks/stop-playbook-corpus-drift-advisory.mjs  | 190 +++++++++++++++++++++
- 2 files changed, 354 insertions(+)


## Verification
**Scrutiny ledger**: arms A✗ B✗ C✗ for session 

## Cross-references
- Full commit: `git -C H:/prism show 583e4b7393a0`
- Milestone envelope: `mcp-server/data/milestones/TOKEN-SAVINGS-PIVOT.json`

---
_Auto-distilled by `scripts/distill-session-learnings.mjs` per [[feedback_auto_close_out]] / SYSTEM-VIZ-BRAIN-MS0/U-P1-POST-SHIP-DISTILL._