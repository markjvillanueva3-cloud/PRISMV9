# QUOTING-SYNERGY-MS0/U-QP-BOOTSTRAP-REAL-DEFAULTS — [MAIN] [BOOTSTRAP-SLOT-ENFORCE] [QUOTING-SYNERGY-MS0]/U-QP-BOOTSTRAP-REAL-DEFAULTS (slot:charlie iter45 2026-05-26): mirror QuotingMaterialBridgeEngine ISO-group cost brackets into training bootstrap. iter44 shipped runtime-side bridge (mcp-server); iter45 wires the SAME ISO defaults into scripts/quoting-baseline-bootstrap.mjs so training-time records and runtime quote-time material lookups converge on identical cost brackets. New: detectMaterialFromPath (6-ISO regex table with letter-boundary lookarounds — fixed iter46-class bug where word-boundary treats underscore as word-char, breaking AL_6061 / aluminum_6061 detection), estimateStockWeightKg (size-bucket proxy until CAD volume wired), material_iso field on every output record (null when no detection). 7 new tests (36/36 PASS) covering all 6 ISO groups across naming styles (AL7075-T6, aluminum_6061, 304-SS, hardened-HRC55, gray-iron, 4140-steel) + adversarial null/undefined/non-string + fallback to MATERIAL_BY_CLASS when path lacks material keyword + ISO-S spend >>5x ISO-N validation. LIVE regen: 75 records, all carry material_iso field (0 non-null in current JM Die corpus — files organized by customer not material; U-QP-MATERIAL-FROM-GCODE-PARSE next-iter to extract from G-code comments). Phase 1 unit 2 of 15 per QUOTING-DEEP-WIRE-AND-ALGO-2026-05-26.md spec.

**Commit:** `f900c322de3a` · **By:** markjvillanueva3-cloud · **At:** 2026-05-26T19:39:15-05:00
**Tags:** quoting-synergy-ms0, u-qp-bootstrap-real-defaults, auto-distilled

## Subject
[MAIN] [BOOTSTRAP-SLOT-ENFORCE] [QUOTING-SYNERGY-MS0]/U-QP-BOOTSTRAP-REAL-DEFAULTS (slot:charlie iter45 2026-05-26): mirror QuotingMaterialBridgeEngine ISO-group cost brackets into training bootstrap. iter44 shipped runtime-side bridge (mcp-server); iter45 wires the SAME ISO defaults into scripts/quoting-baseline-bootstrap.mjs so training-time records and runtime quote-time material lookups converge on identical cost brackets. New: detectMaterialFromPath (6-ISO regex table with letter-boundary lookarounds — fixed iter46-class bug where word-boundary treats underscore as word-char, breaking AL_6061 / aluminum_6061 detection), estimateStockWeightKg (size-bucket proxy until CAD volume wired), material_iso field on every output record (null when no detection). 7 new tests (36/36 PASS) covering all 6 ISO groups across naming styles (AL7075-T6, aluminum_6061, 304-SS, hardened-HRC55, gray-iron, 4140-steel) + adversarial null/undefined/non-string + fallback to MATERIAL_BY_CLASS when path lacks material keyword + ISO-S spend >>5x ISO-N validation. LIVE regen: 75 records, all carry material_iso field (0 non-null in current JM Die corpus — files organized by customer not material; U-QP-MATERIAL-FROM-GCODE-PARSE next-iter to extract from G-code comments). Phase 1 unit 2 of 15 per QUOTING-DEEP-WIRE-AND-ALGO-2026-05-26.md spec.

## Body
```
[MAIN] [BOOTSTRAP-SLOT-ENFORCE] [QUOTING-SYNERGY-MS0]/U-QP-BOOTSTRAP-REAL-DEFAULTS (slot:charlie iter45 2026-05-26): mirror QuotingMaterialBridgeEngine ISO-group cost brackets into training bootstrap. iter44 shipped runtime-side bridge (mcp-server); iter45 wires the SAME ISO defaults into scripts/quoting-baseline-bootstrap.mjs so training-time records and runtime quote-time material lookups converge on identical cost brackets. New: detectMaterialFromPath (6-ISO regex table with letter-boundary lookarounds — fixed iter46-class bug where word-boundary treats underscore as word-char, breaking AL_6061 / aluminum_6061 detection), estimateStockWeightKg (size-bucket proxy until CAD volume wired), material_iso field on every output record (null when no detection). 7 new tests (36/36 PASS) covering all 6 ISO groups across naming styles (AL7075-T6, aluminum_6061, 304-SS, hardened-HRC55, gray-iron, 4140-steel) + adversarial null/undefined/non-string + fallback to MATERIAL_BY_CLASS when path lacks material keyword + ISO-S spend >>5x ISO-N validation. LIVE regen: 75 records, all carry material_iso field (0 non-null in current JM Die corpus — files organized by customer not material; U-QP-MATERIAL-FROM-GCODE-PARSE next-iter to extract from G-code comments). Phase 1 unit 2 of 15 per QUOTING-DEEP-WIRE-AND-ALGO-2026-05-26.md spec.
```

## Files touched (4)
- scripts/quoting-baseline-bootstrap.filter.test.mjs | 107 +++++
- scripts/quoting-baseline-bootstrap.mjs             |  86 +++-
- state/shared/quoting/baseline-records.json         | 497 ++++++++++++---------
- 3 files changed, 477 insertions(+), 213 deletions(-)

## Lessons surfaced in commit body
- til CAD volume wired), material_iso field on every output record (null when no detection). 7 new tests (36/36 PASS) covering all 6 ISO groups across naming styles (AL7075-T6, aluminum_6061, 304-SS, hardened-HRC55, gray-iron, 4140-steel) + adversarial null/undefined/non-string + fallback to MATERIAL_BY_CLASS when path lacks material keyword + ISO-S spend >>5x ISO-N validation. LIVE regen: 75 records,

## Verification
**Scrutiny ledger**: arms A✗ B✗ C✗ for session 

## Cross-references
- Full commit: `git -C H:/prism show f900c322de3a`
- Milestone envelope: `mcp-server/data/milestones/QUOTING-SYNERGY-MS0.json`

---
_Auto-distilled by `scripts/distill-session-learnings.mjs` per [[feedback_auto_close_out]] / SYSTEM-VIZ-BRAIN-MS0/U-P1-POST-SHIP-DISTILL._