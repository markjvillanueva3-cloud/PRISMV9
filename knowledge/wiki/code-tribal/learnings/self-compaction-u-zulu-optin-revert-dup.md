# SELF-COMPACTION/U-ZULU-OPTIN-REVERT-DUP — [MAIN] [SELF-COMPACTION]/U-ZULU-OPTIN-REVERT-DUP (slot:alpha): REVERT the broken duplicate scripts/zulu-opt-in.mjs -- it wrote the WRONG store and was a silent no-op (R12 correction caught by 2 scrutiny reviewers)

**Commit:** `c29af6ee1d7a` · **By:** markjvillanueva3-cloud · **At:** 2026-06-11T21:16:36-05:00
**Tags:** self-compaction, u-zulu-optin-revert-dup, auto-distilled

## Subject
[MAIN] [SELF-COMPACTION]/U-ZULU-OPTIN-REVERT-DUP (slot:alpha): REVERT the broken duplicate scripts/zulu-opt-in.mjs -- it wrote the WRONG store and was a silent no-op (R12 correction caught by 2 scrutiny reviewers)

## Body
```
[MAIN] [SELF-COMPACTION]/U-ZULU-OPTIN-REVERT-DUP (slot:alpha): REVERT the broken duplicate scripts/zulu-opt-in.mjs -- it wrote the WRONG store and was a silent no-op (R12 correction caught by 2 scrutiny reviewers)

Verify-before-build failure: I built scripts/zulu-opt-in.mjs writing zuluOptIn onto chat-slots.json, but the canonical opt-in system already existed at scripts/lib/zulu-opt-in.mjs with its OWN store state/shared/zulu-opt-in.json. The sweep calls applyOptInToSlotsDoc() which OVERWRITES chat-slots.json from that store every pass, so my writes were wiped before pickActionableSlots -- the CLI was a dead no-op that falsely reported {ok:true,changed:[21]}. Reverted per dedup/R8 (DuplicationGuard would have THROWN). GROUND TRUTH from the real CLI (node scripts/lib/zulu-opt-in.mjs status): 24/24 work slots ALREADY opted-in since 2026-05-22, grace-EXPIRED, single-gated by the scheduled-task --dry-run flag. The precompact-wait fix (5aad20f5cd) + rename recovery (1736b1c7c2) both passed review and STAND.
```

## Files touched (2)
- scripts/zulu-opt-in.mjs | 87 ---------------------------------------------------------------------------------------
- 1 file changed, 87 deletions(-)

## Lessons surfaced in commit body
- WRONG store and was a silent no-op (R12 correction caught by 2 scrutiny reviewers)

## Verification
**Scrutiny ledger**: arms A✗ B✗ C✗ for session 

## Cross-references
- Full commit: `git -C H:/prism show c29af6ee1d7a`
- Milestone envelope: `mcp-server/data/milestones/SELF-COMPACTION.json`

---
_Auto-distilled by `scripts/distill-session-learnings.mjs` per [[feedback_auto_close_out]] / SYSTEM-VIZ-BRAIN-MS0/U-P1-POST-SHIP-DISTILL._