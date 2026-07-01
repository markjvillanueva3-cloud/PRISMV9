# JM-FUSION-TOOLS/U-MATCAT — [MAIN] [BOOTSTRAP-SLOT-ENFORCE] [JM-FUSION-TOOLS]/U-MATCAT (slot:romeo): tag Fusion presets by stock-material category so per-material cutting presets auto-select

**Commit:** `fb9fc1a08d71` · **By:** markjvillanueva3-cloud · **At:** 2026-06-11T21:16:28-05:00
**Tags:** jm-fusion-tools, u-matcat, auto-distilled

## Subject
[MAIN] [BOOTSTRAP-SLOT-ENFORCE] [JM-FUSION-TOOLS]/U-MATCAT (slot:romeo): tag Fusion presets by stock-material category so per-material cutting presets auto-select

## Body
```
[MAIN] [BOOTSTRAP-SLOT-ENFORCE] [FORGE-PIPELINE-ROUTING-MS0]/U-FORGE-ROUTE-INJECT: wire forge7+forge-hooks into ollama-pipeline-injector (verified gap)

The injector fired on /forge-audit /forge2 /forge3 /forge-triple but NOT /forge7
or /forge-hooks -- so the LATEST forge command (operator's 'use latest forge') got
zero ollama-routing inject. Added a forge7 trigger (/forge[4-7]|forge-hooks) + a
routes block surfacing the U-FORGE-ROUTE per-phase lane plan (mechanical->ollama/
sonnet, opus reserved) + the forgeConcurrencyCap fork-storm guard. Hook already
wired (settings.json untouched). LIVE-TESTED: /forge7 + /forge-hooks both inject
the plan. slot:tango.
```

## Files touched (2)
- .claude/hooks/ollama-pipeline-injector.mjs | 6 ++++++
- 1 file changed, 6 insertions(+)


## Verification
**Scrutiny ledger**: arms A✗ B✗ C✗ for session 

## Cross-references
- Full commit: `git -C H:/prism show fb9fc1a08d71`
- Milestone envelope: `mcp-server/data/milestones/JM-FUSION-TOOLS.json`

---
_Auto-distilled by `scripts/distill-session-learnings.mjs` per [[feedback_auto_close_out]] / SYSTEM-VIZ-BRAIN-MS0/U-P1-POST-SHIP-DISTILL._