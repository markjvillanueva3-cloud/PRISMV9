# RGS-TOOL-AUTOINVOKE-MS1/U-DOMAIN-RULES — [MAIN] [RGS-TOOL-AUTOINVOKE-MS1]/U-DOMAIN-RULES: 5 domain rules + Wire-EDM exclusion + polysemy guard + deep-freeze + 5 skill triggers

**Commit:** `e11def3f9361` · **By:** markjvillanueva3-cloud · **At:** 2026-05-16T16:05:44-05:00
**Tags:** rgs-tool-autoinvoke-ms1, u-domain-rules, auto-distilled

## Subject
[MAIN] [RGS-TOOL-AUTOINVOKE-MS1]/U-DOMAIN-RULES: 5 domain rules + Wire-EDM exclusion + polysemy guard + deep-freeze + 5 skill triggers

## Body
```
[MAIN] [RGS-TOOL-AUTOINVOKE-MS1]/U-DOMAIN-RULES: 5 domain rules + Wire-EDM exclusion + polysemy guard + deep-freeze + 5 skill triggers

31/31 tests GREEN. Per-file scrutiny: Arm A FAIL -> all P0/P1 fixed -> re-verified. Arm B PASS WITH P1 (deferred downstream).

Closes MS1 punch-list 42% generic-fallback gap. Rules: mill/lathe/wedm/cam/cad with \b boundaries. Structural Wire-EDM exclusion in /wire-unwired + AGENT_RULES (same bug class). /lathe polysemy guard (Okuma+model, turning+context). Dropped \bdrawing\b. deepFreezeArray fulfills file-header contract.

Skill triggers: YAML added to mill/lathe/wedm/cam-strategy/cad-from-blueprint (.claude/commands/ is .gitignored per fleet convention).

Deferred P2: rgs-signal-fusion.mjs:194 mean()->max() aggregator (Arm B P1, pre-existing). MS1: 3/8 complete.
```

## Files touched (6)
- CLAUDE.md                                          |   1 +
- .../wiki/architecture/rgs-tool-autoinvoke-ms1.md   |  63 +++++++++
- .../data/milestones/RGS-TOOL-AUTOINVOKE-MS1.json   |  19 ++-
- scripts/lib/rgs-pipeline-rules.mjs                 | 109 ++++++++++++++-
- scripts/lib/rgs-pipeline-rules.test.mjs            | 149 +++++++++++++++++++++
- 5 files changed, 330 insertions(+), 11 deletions(-)


## Verification
**Scrutiny ledger**: arms A✗ B✗ C✗ for session 

## Cross-references
- Full commit: `git -C H:/prism show e11def3f9361`
- Milestone envelope: `mcp-server/data/milestones/RGS-TOOL-AUTOINVOKE-MS1.json`

---
_Auto-distilled by `scripts/distill-session-learnings.mjs` per [[feedback_auto_close_out]] / SYSTEM-VIZ-BRAIN-MS0/U-P1-POST-SHIP-DISTILL._