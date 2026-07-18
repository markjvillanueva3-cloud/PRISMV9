# TOKEN-EFFICIENCY-INJECT/U-MASTER-INDEX-THROTTLE — [MAIN] [TOKEN-EFFICIENCY-INJECT]/U-MASTER-INDEX-THROTTLE (slot:bravo): same-prompt throttle on master-index-precheck so /loop ticks stop re-injecting the identical block

**Commit:** `7bcdd4b49b6b` · **By:** markjvillanueva3-cloud · **At:** 2026-06-10T12:12:50-05:00
**Tags:** token-efficiency-inject, u-master-index-throttle, auto-distilled

## Subject
[MAIN] [TOKEN-EFFICIENCY-INJECT]/U-MASTER-INDEX-THROTTLE (slot:bravo): same-prompt throttle on master-index-precheck so /loop ticks stop re-injecting the identical block

## Body
```
[MAIN] [TOKEN-EFFICIENCY-INJECT]/U-MASTER-INDEX-THROTTLE (slot:bravo): same-prompt throttle on master-index-precheck so /loop ticks stop re-injecting the identical block

master-index-precheck-inject (UserPromptSubmit) surfaces top-K system-graph
hits but had NO same-prompt throttle -- so a /loop, which re-submits the
IDENTICAL prompt every tick, re-injected the same ~1KB block every tick. Its
sibling memory-index-precheck-inject already throttles via the proven
scripts/lib/inject-throttle.mjs (per-session, atomic-write, fail-open).

FIX: wire the SAME lib + pattern. Adds the import, a THROTTLE_MS knob
(PRISM_MASTER_INDEX_THROTTLE_MS, default 60000, 0=off), and a
shouldThrottleInject() check placed AFTER sid resolves but BEFORE the CAG-skip
+ runMasterIndexSearch work, so a suppressed tick does ZERO downstream work
(no search, no incrementFeature, no recordLegConsult, no emit). Fail-open: no
session id / ttl<=0 / I/O error -> proceeds to inject.

LIVE: tick1 1172B -> tick2 (identical /loop re-fire) 0B = ~290 tokens saved
per repeat tick. 9/9 tests (2 new subprocess: stamps state + suppresses 2nd
within TTL; ttl=0 restores legacy identical-emit + writes no state). 2-arm
per-file scrutiny PASS (0 P0/P1).

Audit note (backlog #4 from reference_injection_surface_token_audit_2026_06_10):
the 11 slot-specific awareness injectors are SOUND, not wasteful -- each gates
own-slot OR domain-keyword-match (shouldInject = keywordHit || activeSlotIsX),
india even stricter (own-slot only). Cross-slot keyword context is a quality
feature, not waste -- VERIFIED no fix warranted.
```

## Files touched (3)
- .claude/hooks/master-index-precheck-inject.mjs      | 20 ++++++++++++++++++++
- .claude/hooks/master-index-precheck-inject.test.mjs | 72 ++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++
- 2 files changed, 92 insertions(+)


## Verification
**Scrutiny ledger**: arms A✗ B✗ C✗ for session 

## Cross-references
- Full commit: `git -C H:/prism show 7bcdd4b49b6b`
- Milestone envelope: `mcp-server/data/milestones/TOKEN-EFFICIENCY-INJECT.json`

---
_Auto-distilled by `scripts/distill-session-learnings.mjs` per [[feedback_auto_close_out]] / SYSTEM-VIZ-BRAIN-MS0/U-P1-POST-SHIP-DISTILL._