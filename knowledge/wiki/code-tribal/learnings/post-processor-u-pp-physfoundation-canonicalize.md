# POST-PROCESSOR/U-PP-PHYSFOUNDATION-CANONICALIZE — [MAIN-FORCE] [POST-PROCESSOR]/U-PP-PHYSFOUNDATION-CANONICALIZE (slot:echo): finish canonicalization -- rebaseline characterization tests to canonical Kienzle/Taylor

**Commit:** `5f925dfd137c` · **By:** markjvillanueva3-cloud · **At:** 2026-06-26T10:29:19-05:00
**Tags:** post-processor, u-pp-physfoundation-canonicalize, auto-distilled

## Subject
[MAIN-FORCE] [POST-PROCESSOR]/U-PP-PHYSFOUNDATION-CANONICALIZE (slot:echo): finish canonicalization -- rebaseline characterization tests to canonical Kienzle/Taylor

## Body
```
[MAIN-FORCE] [POST-PROCESSOR]/U-PP-PHYSFOUNDATION-CANONICALIZE (slot:echo): finish canonicalization -- rebaseline characterization tests to canonical Kienzle/Taylor

Prior session canonicalized PostPhysicsFoundationEngine (KC_ISO=CANONICAL_KIENZLE,
MATERIAL_PROPS Taylor n/C from CANONICAL_TAYLOR) but left it uncommitted with 2 failing
characterization-lock tests (the designed fail-signal). Finished:
- material.mc H assert 0.20 -> 0.30 (canonical CANONICAL_KIENZLE.H).
- rewrote "harder steel shorter life" test: old assertion compared each material at its OWN
  recommended Vc -- NOT a true invariant. New test proves engine matches canonical closed-form
  Taylor within ~5% (ratio toBeCloseTo(1,1), CANONICAL_TAYLOR oracle) + genuine equal-Vc
  invariant (lower C -> shorter life at SAME speed, ratio>2). Title "inline" -> "canonical".
52/52 green. 2-arm scrutiny PASS (physics-review-agent + reviewer).
```

## Files touched (3)
- mcp-server/src/__tests__/PostPhysicsFoundationEngine.test.ts | 74 +++++++++++++++++++++++++++---------------------
- mcp-server/src/engines/PostPhysicsFoundationEngine.ts        | 41 +++++++++++++--------------
- 2 files changed, 62 insertions(+), 53 deletions(-)


## Verification
**Scrutiny ledger**: arms A✗ B✗ C✗ for session 

## Cross-references
- Full commit: `git -C H:/prism show 5f925dfd137c`
- Milestone envelope: `mcp-server/data/milestones/POST-PROCESSOR.json`

---
_Auto-distilled by `scripts/distill-session-learnings.mjs` per [[feedback_auto_close_out]] / SYSTEM-VIZ-BRAIN-MS0/U-P1-POST-SHIP-DISTILL._