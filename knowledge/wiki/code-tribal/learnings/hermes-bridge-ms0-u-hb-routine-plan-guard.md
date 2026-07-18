# HERMES-BRIDGE-MS0/U-HB-ROUTINE-PLAN-GUARD — [MAIN-FORCE] [HERMES-BRIDGE-MS0]/U-HB-ROUTINE-PLAN-GUARD (slot:zulu): make routinePlan paste-safety guard cover what it claims (R12)

**Commit:** `3ecb2a4a7bda` · **By:** markjvillanueva3-cloud · **At:** 2026-06-16T16:11:26-05:00
**Tags:** hermes-bridge-ms0, u-hb-routine-plan-guard, auto-distilled

## Subject
[MAIN-FORCE] [HERMES-BRIDGE-MS0]/U-HB-ROUTINE-PLAN-GUARD (slot:zulu): make routinePlan paste-safety guard cover what it claims (R12)

## Body
```
[MAIN-FORCE] [HERMES-BRIDGE-MS0]/U-HB-ROUTINE-PLAN-GUARD (slot:zulu): make routinePlan paste-safety guard cover what it claims (R12)

3-of-3 arm C P2: the 'fail-loud guards' comment over-claimed -- it scanned prompt/name/schedule for double-quote/backtick but not $ command-substitution (which a prismRoot like H:/$(cmd)/prism injects into prompts), did not scan the --script path, and pushed deliver UNQUOTED with no format check. Extend the shell-unsafe scan to ["`$] over all emitted fields incl. r.script, and warn on a deliver with shell-unsafe chars. Operator-self-injection only (emit-only, no untrusted boundary), but the guard now matches its claim. +2 tests ($-in-root, unsafe-deliver). 36/36.
```

## Files touched (3)
- mcp-server/src/engines/HermesAutomationBridge.test.ts | 12 ++++++++++++
- mcp-server/src/engines/HermesAutomationBridge.ts      | 14 ++++++++++++--
- 2 files changed, 24 insertions(+), 2 deletions(-)


## Verification
**Scrutiny ledger**: arms A✗ B✗ C✗ for session 

## Cross-references
- Full commit: `git -C H:/prism show 3ecb2a4a7bda`
- Milestone envelope: `mcp-server/data/milestones/HERMES-BRIDGE-MS0.json`

---
_Auto-distilled by `scripts/distill-session-learnings.mjs` per [[feedback_auto_close_out]] / SYSTEM-VIZ-BRAIN-MS0/U-P1-POST-SHIP-DISTILL._