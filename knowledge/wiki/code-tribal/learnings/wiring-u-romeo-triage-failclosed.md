# WIRING/U-ROMEO-TRIAGE-FAILCLOSED — [MAIN] [MAIN-FORCE] [WIRING]/U-ROMEO-TRIAGE-FAILCLOSED (slot:romeo): fix fail-open constructability (scrutiny arm-A P1)

**Commit:** `6dce57a23789` · **By:** markjvillanueva3-cloud · **At:** 2026-06-14T20:41:18-05:00
**Tags:** wiring, u-romeo-triage-failclosed, auto-distilled

## Subject
[MAIN] [MAIN-FORCE] [WIRING]/U-ROMEO-TRIAGE-FAILCLOSED (slot:romeo): fix fail-open constructability (scrutiny arm-A P1)

## Body
```
[MAIN] [MAIN-FORCE] [WIRING]/U-ROMEO-TRIAGE-FAILCLOSED (slot:romeo): fix fail-open constructability (scrutiny arm-A P1)

Scrutiny arm-A FAIL on 86ebbf15f5: engineConstructability returned {found:false}
on ANY readFileSync failure, and the DI guard was then BYPASSED -> an unverifiable
or dependency-injected engine got promoted to WIREABLE. Under fleet FS contention
(transient EMFILE/EBUSY) the partition went NON-DETERMINISTIC (EmbeddingGuardEngine
flipped WIREABLE<->NEEDS-REVIEW; test shipped flaky 6/7). romeo's /loop could then
wire an engine that throws on every dispatcher call.

FIX:
- engineConstructability distinguishes ENOENT (missing -> found:false) from a
  transient read failure (-> notReadable:true), with a bounded retry (READ_RETRIES=4,
  50ms sync backoff) to ride out contention.
- classify FAILS CLOSED: notReadable -> NEEDS-REVIEW, NEVER WIREABLE.
- dispatcherExists tightened from loose startsWith to exact `<stem>dispatcher.ts`
  (arm-A P2).

VERIFY: partition DETERMINISTIC across repeated runs (W=21 X=5 E=23 R=5, 3x identical);
node --test scripts/romeo-wiring-triage.test.mjs -> 8/8 (+ new determinism guard).
```

## Files touched (3)
- scripts/romeo-wiring-triage.mjs      | 30 ++++++++++++++++++++++++++----
- scripts/romeo-wiring-triage.test.mjs | 14 ++++++++++++++
- 2 files changed, 40 insertions(+), 4 deletions(-)


## Verification
**Scrutiny ledger**: arms A✗ B✗ C✗ for session 

## Cross-references
- Full commit: `git -C H:/prism show 6dce57a23789`
- Milestone envelope: `mcp-server/data/milestones/WIRING.json`

---
_Auto-distilled by `scripts/distill-session-learnings.mjs` per [[feedback_auto_close_out]] / SYSTEM-VIZ-BRAIN-MS0/U-P1-POST-SHIP-DISTILL._