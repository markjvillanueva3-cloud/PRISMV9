# BUILD-QUALITY-PAPA/U-TSC-JMDIE-SPINDLE-NARROW — [MAIN-FORCE] [BUILD-QUALITY-PAPA]/U-TSC-JMDIE-SPINDLE-NARROW (slot:papa): JMDieProgramAnalyzer max_rpm never-narrow -- cast to declared shape (behavior-identical)

**Commit:** `40722c3af8ff` · **By:** markjvillanueva3-cloud · **At:** 2026-06-18T09:15:37-05:00
**Tags:** build-quality-papa, u-tsc-jmdie-spindle-narrow, auto-distilled

## Subject
[MAIN-FORCE] [BUILD-QUALITY-PAPA]/U-TSC-JMDIE-SPINDLE-NARROW (slot:papa): JMDieProgramAnalyzer max_rpm never-narrow -- cast to declared shape (behavior-identical)

## Body
```
[MAIN-FORCE] [BUILD-QUALITY-PAPA]/U-TSC-JMDIE-SPINDLE-NARROW (slot:papa): JMDieProgramAnalyzer max_rpm never-narrow -- cast to declared shape (behavior-identical)

§papa backlog (TSC-DEFER-ROUTING-2026-06-17): JMDieProgramAnalyzerEngine.ts:435 TS2339 "Property 'max_rpm' does not exist on type 'never'". ROOT CAUSE: at the G96 self-reassignment `currentSpindle = { ..., max_rpm: currentSpindle?.max_rpm ?? null }`, TS over-narrows the `let currentSpindle` (declared `{mode;value;max_rpm:number|null}|null` at L384) to `null` inside its own reassignment (let + loop + self-reference flow quirk), collapsing the optional-chain non-null arm to `never`.

FIX: cast the read back to the declared shape -- `(currentSpindle as {mode;value;max_rpm}|null)?.max_rpm ?? null`. The cast is ERASED at runtime, so behavior is IDENTICAL to the original optional-chain. This is NOT an any-escape masking an API mismatch (papa trap #3): max_rpm provably exists on the declared type (L384); the cast only defeats a flow false-positive.

GATE: full tsc (16GB heap, --noEmit --incremental false) 88 -> 87; regression-diff (tsc-loop2 vs tsc-loop3) shows EXACTLY this error cleared, ZERO un-masking (the load-bearing proof that the cast hides nothing). No fabricated spindle/machine/unit value.
```

## Files touched (2)
- mcp-server/src/engines/JMDieProgramAnalyzerEngine.ts | 7 ++++++-
- 1 file changed, 6 insertions(+), 1 deletion(-)


## Verification
**Scrutiny ledger**: arms A✗ B✗ C✗ for session 

## Cross-references
- Full commit: `git -C H:/prism show 40722c3af8ff`
- Milestone envelope: `mcp-server/data/milestones/BUILD-QUALITY-PAPA.json`

---
_Auto-distilled by `scripts/distill-session-learnings.mjs` per [[feedback_auto_close_out]] / SYSTEM-VIZ-BRAIN-MS0/U-P1-POST-SHIP-DISTILL._