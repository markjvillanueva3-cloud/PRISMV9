# OBSIDIAN-VAULT-OPS/U-VAULT-PROMOTE-GATE-TESTFIXTURE — [MAIN-FORCE] [OBSIDIAN-VAULT-OPS]/U-VAULT-PROMOTE-GATE-TESTFIXTURE (slot:sierra): exclude deadbeef test-fixture memories from wiki promotion

**Commit:** `4531d79ae33c` · **By:** markjvillanueva3-cloud · **At:** 2026-06-16T22:08:22-05:00
**Tags:** obsidian-vault-ops, u-vault-promote-gate-testfixture, auto-distilled

## Subject
[MAIN-FORCE] [OBSIDIAN-VAULT-OPS]/U-VAULT-PROMOTE-GATE-TESTFIXTURE (slot:sierra): exclude deadbeef test-fixture memories from wiki promotion

## Body
```
[MAIN-FORCE] [OBSIDIAN-VAULT-OPS]/U-VAULT-PROMOTE-GATE-TESTFIXTURE (slot:sierra): exclude deadbeef test-fixture memories from wiki promotion

4th and final junk class on the promote gate (after node-pointer + unverified-advisory
in 409532c31e, run-log in ee43c54876). The live dry-run's remaining junk was 2 smoke-test
fixtures (feedback_d2_smoke, feedback_d2_bom_smoke) mirrored into the vault by a test run
-- bodies "smoke memo body", provenance.sessionId c0f06deedeadbeefdeadbeefdeadbeef (the
classic deadbeef fake-data sentinel), sourceTool memory-mirror-to-vault. They clear the
gate via the feedback_ FILENAME prefix + inbound refs inflated by ~11 dreams/ hub files.
Promoting test junk to the canonical wiki is R9/R12.

FIX: nonPromotableReason returns "test-fixture" when fm.sessionId / fm.agent /
fm.originSessionId carries a `deadbeef` sentinel. Non-destructive + generalizable.

VALIDATION (real data, R12): gate tests 35/35; LIVE dry-run WOULD PROMOTE -> 5, 0 junk
(no smoke/nn_retrain/node_*) -- the candidate set is now FULLY CLEAN (5 genuine reference
atoms). The gate now excludes all 4 structural junk classes. [MAIN-FORCE]: canonical-only
file, same lane rationale as 409532c31e / ee43c54876.
```

## Files touched (3)
- scripts/promote-memory-to-wiki.mjs      | 12 ++++++++++--
- scripts/promote-memory-to-wiki.test.mjs | 25 +++++++++++++++++++++++++
- 2 files changed, 35 insertions(+), 2 deletions(-)


## Verification
**Scrutiny ledger**: arms A✗ B✗ C✗ for session 

## Cross-references
- Full commit: `git -C H:/prism show 4531d79ae33c`
- Milestone envelope: `mcp-server/data/milestones/OBSIDIAN-VAULT-OPS.json`

---
_Auto-distilled by `scripts/distill-session-learnings.mjs` per [[feedback_auto_close_out]] / SYSTEM-VIZ-BRAIN-MS0/U-P1-POST-SHIP-DISTILL._