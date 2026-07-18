# WIRING/U-ROMEO-TRIAGE-CTOR-PARSE-FIX — [MAIN-FORCE] [WIRING]/U-ROMEO-TRIAGE-CTOR-PARSE-FIX (slot:romeo): fix false-WIREABLE on object/multiline constructors + de-rot the test

**Commit:** `3aec6d3c59fe` · **By:** markjvillanueva3-cloud · **At:** 2026-06-16T21:58:04-05:00
**Tags:** wiring, u-romeo-triage-ctor-parse-fix, auto-distilled

## Subject
[MAIN-FORCE] [WIRING]/U-ROMEO-TRIAGE-CTOR-PARSE-FIX (slot:romeo): fix false-WIREABLE on object/multiline constructors + de-rot the test

## Body
```
[MAIN-FORCE] [WIRING]/U-ROMEO-TRIAGE-CTOR-PARSE-FIX (slot:romeo): fix false-WIREABLE on object/multiline constructors + de-rot the test

BUG (false-WIREABLE, the dangerous direction): engineConstructability counted
required ctor args with match(/constructor\(([^)]*)\)/) + split(',') + /[?=]/
filter. An object-param ctor -- constructor(opts: { a: A; b: B; clock?: C }) --
breaks both heuristics: object fields are ';'-separated (so split(',') keeps the
whole object as ONE segment) and the segment contains '?' from an optional FIELD
(clock?), so the filter dropped the entire REQUIRED opts param -> ctorArgs 0 ->
classify() returned WIREABLE. NXOpenAssemblyDrawingEngine (a DI engine needing
injected assemblyTransport+drawingTransport) was ranked WIREABLE; trusting it
would make romeo wire an engine that throws on zero-arg construct (its own
'wiring-an-engine-that-throws' refuse). Empirically: old parser ctorArgs=0; fixed
parser ctorArgs=1 -> NEEDS-REVIEW. Live partition WIREABLE 1->0 (honest: romeo's
clean in-lane queue is genuinely empty).

FIX: replace the regex/split with balanced-paren extraction (extractCtorParamList)
+ top-level comma split across (){}[] (splitTopLevelCommas) + name-level
optionality (isOptionalCtorParam: param is optional iff its NAME before the first
top-level ':' ends with '?' OR it has a top-level '=' default; '?'/'=' inside the
type annotation never counts). Angle brackets are ignored for depth -> a
generic-with-internal-comma at worst OVER-counts = fail-safe (NEEDS-REVIEW, never
false-WIREABLE). Exported the helpers + classify/engineConstructability/
dispatcherExists + guarded the run block (function main() behind an entry-point
check) so the test can import without overwriting the live queue.

TEST de-rotted: the prior suite pinned a TRANSIENT backlog (total>=40 magnitude
floor + 4 named engines now wired out) -> it was 5/8 RED *because romeo succeeded*
at wiring the backlog down to 18. Rewrote to (a) pure ctor-parser unit tests over
synthetic source (incl. the NXOpen object-ctor regression, RED on old parser),
(b) direct classify() logic tests (engine .ts persists on disk even when wired),
(c) live invariants asserted against the live audit COUNT (no magnitude floor).
17/17 pass.
```

## Files touched (4)
- scripts/romeo-wiring-triage.mjs      | 179 ++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++----------------------------------------
- scripts/romeo-wiring-triage.test.mjs | 177 ++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++--------------------------------------
- state/shared/ROMEO-WIRING-QUEUE.md   |   4 ++--
- 3 files changed, 261 insertions(+), 99 deletions(-)

## Lessons surfaced in commit body
- tiline constructors + de-rot the test

## Verification
**Scrutiny ledger**: arms A✗ B✗ C✗ for session 

## Cross-references
- Full commit: `git -C H:/prism show 3aec6d3c59fe`
- Milestone envelope: `mcp-server/data/milestones/WIRING.json`

---
_Auto-distilled by `scripts/distill-session-learnings.mjs` per [[feedback_auto_close_out]] / SYSTEM-VIZ-BRAIN-MS0/U-P1-POST-SHIP-DISTILL._