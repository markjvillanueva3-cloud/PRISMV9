# AI-SYSTEMS-LORA/U-LORA-CORPUS-GALAXY-CAP — [MAIN-FORCE] [AI-SYSTEMS-LORA]/U-LORA-CORPUS-GALAXY-CAP (slot:india): close 2-reviewer P2 -- weight-aware cap keeps highest-weight (verified) rows over advisory when capping (was weight-blind first-N: dropped 1 verified row at cap=300; now kept -> verified 324->325). Ties keep source order so no-weight path is byte-identical. 33/33 tests

**Commit:** `0c18eafcbfe9` · **By:** markjvillanueva3-cloud · **At:** 2026-06-18T14:26:31-05:00
**Tags:** ai-systems-lora, u-lora-corpus-galaxy-cap, auto-distilled

## Subject
[MAIN-FORCE] [AI-SYSTEMS-LORA]/U-LORA-CORPUS-GALAXY-CAP (slot:india): close 2-reviewer P2 -- weight-aware cap keeps highest-weight (verified) rows over advisory when capping (was weight-blind first-N: dropped 1 verified row at cap=300; now kept -> verified 324->325). Ties keep source order so no-weight path is byte-identical. 33/33 tests

## Body
```
[MAIN-FORCE] [AI-SYSTEMS-LORA]/U-LORA-CORPUS-GALAXY-CAP (slot:india): close 2-reviewer P2 -- weight-aware cap keeps highest-weight (verified) rows over advisory when capping (was weight-blind first-N: dropped 1 verified row at cap=300; now kept -> verified 324->325). Ties keep source order so no-weight path is byte-identical. 33/33 tests
```

## Files touched (3)
- scripts/assemble-fleet-lora-corpus.mjs      | 36 +++++++++++++++++++++++++-----------
- scripts/assemble-fleet-lora-corpus.test.mjs | 17 +++++++++++++++++
- 2 files changed, 42 insertions(+), 11 deletions(-)


## Verification
**Scrutiny ledger**: arms A✗ B✗ C✗ for session 

## Cross-references
- Full commit: `git -C H:/prism show 0c18eafcbfe9`
- Milestone envelope: `mcp-server/data/milestones/AI-SYSTEMS-LORA.json`

---
_Auto-distilled by `scripts/distill-session-learnings.mjs` per [[feedback_auto_close_out]] / SYSTEM-VIZ-BRAIN-MS0/U-P1-POST-SHIP-DISTILL._