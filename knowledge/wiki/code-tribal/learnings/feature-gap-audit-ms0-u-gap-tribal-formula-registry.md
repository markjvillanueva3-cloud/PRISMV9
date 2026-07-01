# FEATURE-GAP-AUDIT-MS0/U-GAP-TRIBAL-FORMULA-REGISTRY — [MAIN] [FEATURE-GAP-AUDIT-MS0]/U-GAP-TRIBAL-FORMULA-REGISTRY (slot:foxtrot): wire FormulaHarvesterEngine -> prism_dev + R12 degraded + git-track 3 knowledge files

**Commit:** `4ab0fa591f9b` · **By:** markjvillanueva3-cloud · **At:** 2026-05-18T20:06:23-05:00
**Tags:** feature-gap-audit-ms0, u-gap-tribal-formula-registry, auto-distilled

## Subject
[MAIN] [FEATURE-GAP-AUDIT-MS0]/U-GAP-TRIBAL-FORMULA-REGISTRY (slot:foxtrot): wire FormulaHarvesterEngine -> prism_dev + R12 degraded + git-track 3 knowledge files

## Body
```
[MAIN] [FEATURE-GAP-AUDIT-MS0]/U-GAP-TRIBAL-FORMULA-REGISTRY (slot:foxtrot): wire FormulaHarvesterEngine -> prism_dev + R12 degraded + git-track 3 knowledge files

- devDispatcher: formula_harvest{,_sources,_audit} (RES-MS1 orphan engine now wired)
- FormulaHarvesterEngine: R12 fail-loud degraded/errors/filesRead; FORMULA_ROOT PATHS.PRISM_ROOT-derived; nodePath alias kills extractFormulas shadow
- git-track 3 ~313KB JS knowledge files (.git/info/exclude'd; P0 oracle was machine-local)
- 4-case dispatcher round-trip anti-stub test; engine 19/19 backward-compat

Per-file scrutiny 2 reviewers x3 rounds; P0+P1+P2 closed.

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
```

## Files touched (7)
- .../devDispatcher.formula-harvest-wire.test.ts     |  169 +
- mcp-server/src/engines/FormulaHarvesterEngine.ts   |   50 +-
- mcp-server/src/tools/dispatchers/devDispatcher.ts  |   19 +-
- .../PRISM_ADVANCED_CROSS_DOMAIN_v1.js              |  755 +++++
- .../PRISM_CROSS_DISCIPLINARY_FORMULAS_v1.js        | 3223 ++++++++++++++++++++
- .../PRISM_UNIVERSITY_COURSE_REFERENCE_v1.js        | 2604 ++++++++++++++++
- 6 files changed, 6816 insertions(+), 4 deletions(-)


## Verification
**Scrutiny ledger**: arms A✗ B✗ C✗ for session 

## Cross-references
- Full commit: `git -C H:/prism show 4ab0fa591f9b`
- Milestone envelope: `mcp-server/data/milestones/FEATURE-GAP-AUDIT-MS0.json`

---
_Auto-distilled by `scripts/distill-session-learnings.mjs` per [[feedback_auto_close_out]] / SYSTEM-VIZ-BRAIN-MS0/U-P1-POST-SHIP-DISTILL._