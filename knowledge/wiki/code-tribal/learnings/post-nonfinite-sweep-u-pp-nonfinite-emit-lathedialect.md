# POST-NONFINITE-SWEEP/U-PP-NONFINITE-EMIT-LATHEDIALECT — [MAIN-FORCE] [POST-NONFINITE-SWEEP]/U-PP-NONFINITE-EMIT-LATHEDIALECT (slot:echo): close the Infinity gap in LathePostGeneratorDialectEngine via schema .finite()

**Commit:** `345128546cae` · **By:** markjvillanueva3-cloud · **At:** 2026-06-26T09:28:18-05:00
**Tags:** post-nonfinite-sweep, u-pp-nonfinite-emit-lathedialect, auto-distilled

## Subject
[MAIN-FORCE] [POST-NONFINITE-SWEEP]/U-PP-NONFINITE-EMIT-LATHEDIALECT (slot:echo): close the Infinity gap in LathePostGeneratorDialectEngine via schema .finite()

## Body
```
[MAIN-FORCE] [POST-NONFINITE-SWEEP]/U-PP-NONFINITE-EMIT-LATHEDIALECT (slot:echo): close the Infinity gap in LathePostGeneratorDialectEngine via schema .finite()

WHAT + R12 HONESTY: this engine was a PARTIAL false-positive in the fleet-wide audit. Its
generate() runs a Zod `safeParse` first, and `z.number()` already REJECTS NaN (early
return success:false) -- so the engine was already NaN-safe (my audit's guard-count
heuristic missed the Zod-schema protection). But `z.number()` ACCEPTS Infinity, which
then reached the dialect templates' `?? default` (which keep Infinity) -> a literal
`ZInfinity`/`XInfinity` in G76/G83/G71 output.

FIX (clean, native, R7-consistent): add `.finite()` to the 16 numeric param schema fields
(`z.number().optional()` -> `z.number().finite().optional()`). Now NaN AND Infinity are
rejected the SAME way (Zod validation error, success:false) -- one mechanism, matching the
engine's existing Zod-validation convention. (I first added a runtime guard, then reverted
it in favor of the schema fix once I traced that Zod already handled NaN -- avoids two
inconsistent mechanisms.)

TEST: +5 cases (regression finite G76 + NaN thread_end_x rejected + Infinity hole_depth
rejected + NaN feed_rate rejected + -Infinity peck_depth rejected), each asserting
success:false + no [XYZQRFKDP](NaN|Infinity) token. 47/47 file, engine tsc-clean.

LESSON (for the fleet-wide campaign): a Zod-validated engine may already reject NaN -- the
guard-count audit heuristic produces PARTIAL false positives; verify each engine's
validation layer before adding a runtime guard. For Zod engines, `.finite()` is the
cleanest fix (catches NaN+Infinity at the schema).
```

## Files touched (3)
- mcp-server/src/__tests__/LathePostGeneratorDialectEngine.test.ts | 48 ++++++++++++++++++++++++++++++++++++++++++++++++
- mcp-server/src/engines/LathePostGeneratorDialectEngine.ts        | 44 ++++++++++++++++++++++----------------------
- 2 files changed, 70 insertions(+), 22 deletions(-)

## Lessons surfaced in commit body
- LESSON (for the fleet-wide campaign): a Zod-validated engine may already reject NaN -- the

## Verification
**Scrutiny ledger**: arms A✗ B✗ C✗ for session 

## Cross-references
- Full commit: `git -C H:/prism show 345128546cae`
- Milestone envelope: `mcp-server/data/milestones/POST-NONFINITE-SWEEP.json`

---
_Auto-distilled by `scripts/distill-session-learnings.mjs` per [[feedback_auto_close_out]] / SYSTEM-VIZ-BRAIN-MS0/U-P1-POST-SHIP-DISTILL._