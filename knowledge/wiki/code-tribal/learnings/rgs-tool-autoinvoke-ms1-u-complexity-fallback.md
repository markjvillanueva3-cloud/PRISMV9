# RGS-TOOL-AUTOINVOKE-MS1/U-COMPLEXITY-FALLBACK — [MAIN] [RGS-TOOL-AUTOINVOKE-MS1]/U-COMPLEXITY-FALLBACK: multi-signal complexity cascade fixes 57.6% M-default

**Commit:** `3d416cb040af` · **By:** markjvillanueva3-cloud · **At:** 2026-05-17T00:13:23-05:00
**Tags:** rgs-tool-autoinvoke-ms1, u-complexity-fallback, auto-distilled

## Subject
[MAIN] [RGS-TOOL-AUTOINVOKE-MS1]/U-COMPLEXITY-FALLBACK: multi-signal complexity cascade fixes 57.6% M-default

## Body
```
[MAIN] [RGS-TOOL-AUTOINVOKE-MS1]/U-COMPLEXITY-FALLBACK: multi-signal complexity cascade fixes 57.6% M-default

P1 punch-list item (docs/superpowers/specs/2026-05-16-rgs-tool-autoinvoke-MS1-punchlist.md:29):
"complexityFor heuristic: 57.6% of units have effort:0 -> all default to
tier M; verdict regex crude."

Replaces in-line MS0 heuristic at rgs-tool-planner.mjs:64 with a
multi-signal cascade in scripts/lib/rgs-complexity.mjs:

  1. effort (min) > 0          - current authoritative signal
  2. estimated_hours (x60)     - alt schema some upstream feeds emit
  3. estimated_minutes         - alt schema
  4. title keyword markers     - typo/rename/audit -> S; rewrite/redesign
                                 -> L; new-system/greenfield -> XL
  5. description-length proxy  - <80 chars S; <200 M; <500 L; else XL
  6. default M                 - existing floor preserved for empty units

Verdict expanded from /integrat|reuse|existing|wire|compose/i to also
cover doc/rename/audit/cleanup work the MS0 regex miscategorised as
build. Verdict regex uses leading \b but NOT trailing - on truncated
stem 'integrat', trailing \b would FAIL on "integrate" (the 'e' suffix
prevents the word boundary). Leading \b still excludes false positives
like "rewire" matching "wire". Captured in source comment + test.

MS0 back-compat invariant: explicit-effort units produce identical
{tier,verdict} as before -> identical sourceHash -> NO checkpoint
invalidation, NO fleet-wide re-plan stampede.

Tests: 41/41 PASS via node:test (scripts/lib/rgs-complexity.test.mjs).
Covers each cascade signal in isolation, boundary transitions, cascade
priority (effort > kw > desc-len), adversarial inputs (NaN, Infinity,
negative, null/undefined unit, 100K-char title for ReDoS guard, unicode,
regex metacharacters in title), and MS0 back-compat invariant assertion.

Planner-level: 27/27 of existing rgs-tool-planner.test.mjs still pass
(the public complexityFor() export from rgs-tool-planner.mjs is now a
thin re-export to the lib - API contract unchanged).

The full LLM-backed RoadmapIntelligenceEngine adapter (punch-list line
42-44) is still pending as U-RIE-ADAPTER (M-sized, needs synthetic-
Milestone shape + per-MS cache + ESM-TS bridge). This unit shipped the
deterministic-fallback portion only.

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
```

## Files touched (4)
- scripts/lib/rgs-complexity.mjs      | 186 ++++++++++++++++++++++++++++
- scripts/lib/rgs-complexity.test.mjs | 236 ++++++++++++++++++++++++++++++++++++
- scripts/rgs-tool-planner.mjs        |  36 +++---
- 3 files changed, 444 insertions(+), 14 deletions(-)

## Lessons surfaced in commit body
- till excludes false positives
- till pass
- till pending as U-RIE-ADAPTER (M-sized, needs synthetic-

## Verification
**Scrutiny ledger**: arms A✗ B✗ C✗ for session 

## Cross-references
- Full commit: `git -C H:/prism show 3d416cb040af`
- Milestone envelope: `mcp-server/data/milestones/RGS-TOOL-AUTOINVOKE-MS1.json`

---
_Auto-distilled by `scripts/distill-session-learnings.mjs` per [[feedback_auto_close_out]] / SYSTEM-VIZ-BRAIN-MS0/U-P1-POST-SHIP-DISTILL._