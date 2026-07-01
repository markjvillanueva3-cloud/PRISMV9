# SYSTEM-VIZ-FS-COVERAGE-MS2/U-GHOST-UNWIRED — [SYSTEM-VIZ-FS-COVERAGE-MS2]/U-GHOST-UNWIRED + walks: 810 unwired-engine ghosts + 6 namespace walks

**Commit:** `01486528870f` · **By:** markjvillanueva3-cloud · **At:** 2026-05-15T19:58:49-05:00
**Tags:** system-viz-fs-coverage-ms2, u-ghost-unwired, auto-distilled

## Subject
[SYSTEM-VIZ-FS-COVERAGE-MS2]/U-GHOST-UNWIRED + walks: 810 unwired-engine ghosts + 6 namespace walks

## Body
```
[SYSTEM-VIZ-FS-COVERAGE-MS2]/U-GHOST-UNWIRED + walks: 810 unwired-engine ghosts + 6 namespace walks

810 unwired-engine ghosts seeded with heuristic dispatcher proposals:
  - Inference rules: 18 patterns (physics/safety/cam/cad/lathe/wedm/5axis/ai/memory/session/dev/orchestrate/skill/guard/intake/quote)
  - CamelCase splitter handles 'GCodeTemplateEngine' → 'G Code Template Engine' for regex matching
  - MIN_CONFIDENCE=0.5: 354 of 810 ghosts emitted with confident ghost-wire edges
  - 456 ghosts emitted as UNKNOWN (manual review needed)

Top dispatcher targets:
  UNKNOWN: 456 | prism_cam: 118 | prism_turning: 88 | prism_intelligence: 32 | prism_session: 25 | prism_orchestrate: 19 | prism_calc: 14 | prism_cad: 13 | prism_safety: 8 | prism_5axis: 7

6 missing namespaces walked (state-file change, gitignored):
  JMD AltracsTaptite (16f) · Docustrata Test (152f) · PRISM_FLOW (2021f) · LAUNCH (23f) · _Imported_ 1012024 (8f) · mcp-starter-kit-for-friend (441f)

Graph state: 372,824 → 373,634 nodes (+810); 591,567 → 591,921 edges (+354); 67 → 72 namespaces (+5; pruned root-missing earlier).

Tests: 23/23 node:test PASS (splitCamelCase, inferDispatcher per-rule, listUnwiredEngines tmp-dir hermetic, buildGhostFromUnwired confidence gates).

Comprehensive-build R7 satisfied: no defer — full 810 emitted in single pass.
```

## Files touched (3)
- scripts/seed-ghost-from-unwired.mjs      | 281 +++++++++++++++++++++++++++++++
- scripts/seed-ghost-from-unwired.test.mjs | 171 +++++++++++++++++++
- 2 files changed, 452 insertions(+)


## Verification
**Scrutiny ledger**: arms A✗ B✗ C✗ for session 

## Cross-references
- Full commit: `git -C H:/prism show 01486528870f`
- Milestone envelope: `mcp-server/data/milestones/SYSTEM-VIZ-FS-COVERAGE-MS2.json`

---
_Auto-distilled by `scripts/distill-session-learnings.mjs` per [[feedback_auto_close_out]] / SYSTEM-VIZ-BRAIN-MS0/U-P1-POST-SHIP-DISTILL._