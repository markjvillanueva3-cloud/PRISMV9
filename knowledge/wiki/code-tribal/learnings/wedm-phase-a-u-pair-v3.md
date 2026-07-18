# WEDM-PHASE-A/U-PAIR-V3 — [MAIN] [WEDM-PHASE-A]/U-PAIR-V3 (slot:charlie iter29): 3-tier fuzzy pairer — 1→148 high-confidence training pairs

**Commit:** `e2c92d0c5953` · **By:** markjvillanueva3-cloud · **At:** 2026-05-22T18:49:40-05:00
**Tags:** wedm-phase-a, u-pair-v3, auto-distilled

## Subject
[MAIN] [WEDM-PHASE-A]/U-PAIR-V3 (slot:charlie iter29): 3-tier fuzzy pairer — 1→148 high-confidence training pairs

## Body
```
[MAIN] [WEDM-PHASE-A]/U-PAIR-V3 (slot:charlie iter29): 3-tier fuzzy pairer — 1→148 high-confidence training pairs

3-tier matching keeps v2's exact-stem path AND adds:
  T2 substring containment (either direction, ≥4 chars, customer-overlap gate)
  T3 numeric-core extraction (longest [A-Za-z0-9-]{4,} run, customer gate)

Customer-overlap gate (token-set intersection on path segments) prevents
cross-customer false-positives — every tier-2/3 match REQUIRES at least
one customer-token match between program folder and blueprint path.

Full corpus result: 148 high-confidence pairs (1 exact + 66 substring +
81 numeric_core), all 148 high-confidence (0 medium, 0 low). 1198 program
orphans remain. Walked 169,252 blueprint files + 4,044 program files.

Pair-quality sample verified:
  - AF102-05.mcx-8 ↔ AF102-05.dxf/stp (exact, OMG INC) ✓
  - 0137471.mcx-8 ↔ 0137471__Scanned_Document_..._p15.pdf (ALCOA) ✓
  - 10-001-490.mcx-8 ↔ 10-001-490__2024_10_17__p1.pdf (ALLFAST) ✓

148 pairs = first real Phase-A training corpus. Each pair feeds the
print→wizard→compare pipeline: DXFGeometryParserEngine on blueprint →
wedm_print_to_program → wedm_program_compare against the real .mcx-8 →
deviation report = one training datapoint.

Results saved to state/shared/wedm-pair-v3-results.json.

🤖 Generated with Claude Code
Co-Authored-By: Claude <noreply@anthropic.com>
```

## Files touched (3)
- scripts/wedm-pair-jm-die-blueprints-v3.mjs |  329 ++
- state/shared/wedm-pair-v3-results.json     | 4524 ++++++++++++++++++++++++++++
- 2 files changed, 4853 insertions(+)


## Verification
**Scrutiny ledger**: arms A✗ B✗ C✗ for session 

## Cross-references
- Full commit: `git -C H:/prism show e2c92d0c5953`
- Milestone envelope: `mcp-server/data/milestones/WEDM-PHASE-A.json`

---
_Auto-distilled by `scripts/distill-session-learnings.mjs` per [[feedback_auto_close_out]] / SYSTEM-VIZ-BRAIN-MS0/U-P1-POST-SHIP-DISTILL._