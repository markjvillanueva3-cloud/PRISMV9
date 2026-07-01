# OBSIDIAN-VAULT-OPS/U-VAULT-SCRUTINY-FIX — [MAIN] [BOOTSTRAP-SLOT-ENFORCE] [OBSIDIAN-VAULT-OPS]/U-VAULT-SCRUTINY-FIX (slot:sierra): close 3-of-3 arm-B findings

**Commit:** `889076964841` · **By:** markjvillanueva3-cloud · **At:** 2026-06-06T00:31:28-05:00
**Tags:** obsidian-vault-ops, u-vault-scrutiny-fix, auto-distilled

## Subject
[MAIN] [BOOTSTRAP-SLOT-ENFORCE] [OBSIDIAN-VAULT-OPS]/U-VAULT-SCRUTINY-FIX (slot:sierra): close 3-of-3 arm-B findings

## Body
```
[MAIN] [BOOTSTRAP-SLOT-ENFORCE] [OBSIDIAN-VAULT-OPS]/U-VAULT-SCRUTINY-FIX (slot:sierra): close 3-of-3 arm-B findings

P1: reword the WIKILINK_RE comment — the promote-memory regex is a SUPERSET of
WikiLintEngine's (also strips #anchors), NOT 'lockstep'; a future back-sync would
silently re-break anchored-ref counting. P2: +1 test for the indented-provenance
writtenAt date path (the [ \t]* widening was untested). Rot tests 13/13.
3-of-3 scrutiny: all PASS, 0 P0/P1.
```

## Files touched (3)
- scripts/promote-memory-to-wiki.mjs  | 8 +++++---
- scripts/vault-rot-sentinel.test.mjs | 6 ++++++
- 2 files changed, 11 insertions(+), 3 deletions(-)


## Verification
**Scrutiny ledger**: arms A✗ B✗ C✗ for session 

## Cross-references
- Full commit: `git -C H:/prism show 889076964841`
- Milestone envelope: `mcp-server/data/milestones/OBSIDIAN-VAULT-OPS.json`

---
_Auto-distilled by `scripts/distill-session-learnings.mjs` per [[feedback_auto_close_out]] / SYSTEM-VIZ-BRAIN-MS0/U-P1-POST-SHIP-DISTILL._