# SYSTEM-SYNERGY/U-HOOK-UNREG-PROTOCOL-FIX — [MAIN] [BOOTSTRAP-SLOT-ENFORCE] [SYSTEM-SYNERGY]/U-HOOK-UNREG-PROTOCOL-FIX (slot:golf): restore the non-functional anti-hook-unregistration Stop gate

**Commit:** `29fb555f1364` · **By:** markjvillanueva3-cloud · **At:** 2026-06-09T01:47:02-05:00
**Tags:** system-synergy, u-hook-unreg-protocol-fix, auto-distilled

## Subject
[MAIN] [BOOTSTRAP-SLOT-ENFORCE] [SYSTEM-SYNERGY]/U-HOOK-UNREG-PROTOCOL-FIX (slot:golf): restore the non-functional anti-hook-unregistration Stop gate

## Body
```
[MAIN] [BOOTSTRAP-SLOT-ENFORCE] [SYSTEM-SYNERGY]/U-HOOK-UNREG-PROTOCOL-FIX (slot:golf): restore the non-functional anti-hook-unregistration Stop gate

It was reported 'NOT evaluated (timeout/crash)' EVERY Stop this session. Root
cause was NOT a timeout (110-130ms standalone, both no-baseline and real-baseline
paths) — it was a PROTOCOL MISMATCH. The hook used the exit-code protocol (allow
= exit 0 with EMPTY stdout; block = stderr box + exit 1), but stop-regression-
bundle.mjs:99-106 keys 'evaluated' + 'block' on PARSED STDOUT JSON, ignoring exit
code. So: (a) allow -> empty stdout -> r.parsed null -> 'NOT evaluated' every turn;
(b) block -> message to stderr only -> bundle never saw {continue:false} -> a real
unregistration would NOT actually block. The gate was a no-op through the bundle
(its only wiring — 0 standalone settings.json refs).

Fix: extract pure buildVerdict(removed) -> {continue:true} | {continue:false,
stopReason, systemMessage}; emit it on stdout at EVERY exit path (allow / no-
baseline / can't-read / block). Add isMain guard so importing buildVerdict for
tests doesn't trigger main()+exit(0). 4 tests (3 pure buildVerdict branches + 1
subprocess integration proving stdout is now parseable JSON, was empty). LIVE:
hook now emits {"continue":true}; subprocess path intact. Current state allows
(removed empty) so re-activation does not false-block.
```

## Files touched (3)
- .claude/hooks/stop_on_hook_unregistration.mjs      | 43 ++++++++++++++++++++++++++++++++++++++++++-
- .claude/hooks/stop_on_hook_unregistration.test.mjs | 58 ++++++++++++++++++++++++++++++++++++++++++++++++++++++++++
- 2 files changed, 100 insertions(+), 1 deletion(-)


## Verification
**Scrutiny ledger**: arms A✗ B✗ C✗ for session 

## Cross-references
- Full commit: `git -C H:/prism show 29fb555f1364`
- Milestone envelope: `mcp-server/data/milestones/SYSTEM-SYNERGY.json`

---
_Auto-distilled by `scripts/distill-session-learnings.mjs` per [[feedback_auto_close_out]] / SYSTEM-VIZ-BRAIN-MS0/U-P1-POST-SHIP-DISTILL._