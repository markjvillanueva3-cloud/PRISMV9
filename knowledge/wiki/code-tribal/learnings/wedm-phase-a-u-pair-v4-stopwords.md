# WEDM-PHASE-A/U-PAIR-V4-STOPWORDS — [MAIN] [WEDM-PHASE-A]/U-PAIR-V4-STOPWORDS (slot:charlie iter31): digit-required core filter, 148 to 98 pairs, 0 known FPs

**Commit:** `dc257bb82705` · **By:** markjvillanueva3-cloud · **At:** 2026-05-22T20:09:08-05:00
**Tags:** wedm-phase-a, u-pair-v4-stopwords, auto-distilled

## Subject
[MAIN] [WEDM-PHASE-A]/U-PAIR-V4-STOPWORDS (slot:charlie iter31): digit-required core filter, 148 to 98 pairs, 0 known FPs

## Body
```
[MAIN] [WEDM-PHASE-A]/U-PAIR-V4-STOPWORDS (slot:charlie iter31): digit-required core filter, 148 to 98 pairs, 0 known FPs

v3 (e2c92d0c59) returned 148 high-confidence pairs but the iter-30 audit
found the first tier-3 false-positive class: edm_spring + edm_spring_holder
matched 31366 SPRING PLATE via the generic English word SPRING plus the
HAAS-HURCO customer overlap. Customer-overlap alone is NOT enough when
the matched core is shop-jargon.

v4 adds ONE line to extractCore(): require at least 1 digit in the longest
run. Pure-word cores (spring, plate, holder, washer, ring, gage-model,
serration, bracket) are rejected. Tier 1 (exact) + Tier 2 (substring)
UNCHANGED -- only tier-3 (numeric-core) is affected.

Full corpus result:
  v3: 148 pairs (1 exact + 66 substring + 81 numeric-core)
  v4:  98 pairs (1 exact + 66 substring + 31 numeric-core)
  - 50 tier-3 pairs filtered as risk-class no-digit cores
  - 479 program stems caught by the gate before pairing (audit log)
  - both known false-positives ELIMINATED (edm_spring, edm_spring_holder)
  - AF102-05 (the only verified real DXF pair) RETAINED

Quality > quantity for Phase-A training. 98 verified > 148 with 50 risky.

Results in state/shared/wedm-pair-v4-results.json (canonical going forward).

Generated with Claude Code
Co-Authored-By: Claude <noreply@anthropic.com>
```

## Files touched (3)
- scripts/wedm-pair-jm-die-blueprints-v4.mjs |  374 ++++
- state/shared/wedm-pair-v4-results.json     | 3285 ++++++++++++++++++++++++++++
- 2 files changed, 3659 insertions(+)


## Verification
**Scrutiny ledger**: arms A✗ B✗ C✗ for session 

## Cross-references
- Full commit: `git -C H:/prism show dc257bb82705`
- Milestone envelope: `mcp-server/data/milestones/WEDM-PHASE-A.json`

---
_Auto-distilled by `scripts/distill-session-learnings.mjs` per [[feedback_auto_close_out]] / SYSTEM-VIZ-BRAIN-MS0/U-P1-POST-SHIP-DISTILL._