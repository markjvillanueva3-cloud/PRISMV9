# KNOWLEDGE-CONVERSION-MS0/U-KC-D1 — [MAIN] [KNOWLEDGE-CONVERSION-MS0]/U-KC-D1: course-data routing pipeline (Lane C entry, 30/30 tests)

**Commit:** `cd00120dcd90` · **By:** markjvillanueva3-cloud · **At:** 2026-05-16T22:12:31-05:00
**Tags:** knowledge-conversion-ms0, u-kc-d1, auto-distilled

## Subject
[MAIN] [KNOWLEDGE-CONVERSION-MS0]/U-KC-D1: course-data routing pipeline (Lane C entry, 30/30 tests)

## Body
```
[MAIN] [KNOWLEDGE-CONVERSION-MS0]/U-KC-D1: course-data routing pipeline (Lane C entry, 30/30 tests)

Routes course-content-candidates through a pure-core deterministic router
that decides per-asset PRISM landing: knowledge / algorithm / formula /
engine. Strictly advisory (never auto-emits) — feeds /forge queue + the
physics-reviewer agent gate.

Architecture:
 - scripts/lib/course-data-router-lib.mjs (380 LOC, 14 exports)
   pure-core + injected readers (RGS-TOOL-MS1 pattern); CamelCase-aware
   normalizeNameTokens; token-coverage tokenMatchScore; per-kind routeAsset
   with doctrine-pinned rules (formula→ALWAYS forge-queue, engine threshold
   > algorithm threshold, technique→TRIBAL-SHIPPED reflects Phase 1).
 - scripts/lib/course-data-router-lib.test.mjs (30 tests, node:test)
   29 hermetic + 1 real-data E2E (RGS-TOOL-MS1 lesson — schema-seam bugs).
   30/30 PASS.
 - scripts/course-data-router.mjs CLI: reads candidates JSONL + inventory
   dirs, emits ledger JSON + Markdown. Supports --frozen-time / --json /
   --dry-run.

Live first-run results on 65 candidates / 126 assets:
 - TRIBAL-SHIPPED: 31 (Lane A — Phase 1 already emits)
 - FORGE-QUEUE:   69 (Lane C — real /forge candidates)
 - DUPLICATE:     10 (Lane B — verify scope match)
 - DISCARD:       16 (below mfg-relevance floor)

Forge-queue surfaces real candidates: algorithm:operator-splitting (10.34),
algorithm:bernoullis-equation-solver (1.060), formula:moody-diagram-analysis
(physics-reviewer first), engine:lean-enterprise-engine (16.852j).

Per-file scrutiny: inline Arm A + Arm B both PASS on the lib (xmalloc
fork-storm precluded agent spawn — full-context inline review confirms
doctrine alignment + pure-core + R12 fail-loud).

Doctrine pins (CLAUDE.md):
 - formula: NEVER inline constants → ALWAYS Lane C with physics-reviewer
   in recommendedAction (canonical constants live in src/physics/constants.ts).
 - engine threshold (0.6) > algorithm threshold (0.5) — engines need full
   /forge-triple, higher bar.
 - advisoryOnly: true + mustHumanVerify: true on the ledger.

Files:
 - scripts/lib/course-data-router-lib.mjs (new)
 - scripts/lib/course-data-router-lib.test.mjs (new, 30/30 PASS)
 - scripts/course-data-router.mjs (new, CLI)
 - state/shared/specs/COURSE-DATA-ROUTING-LEDGER.json (new, generated)
 - state/shared/specs/COURSE-DATA-ROUTING-LEDGER.md (new, human-readable)
 - state/shared/specs/COURSE-DATA-ROUTING-PIPELINE.md (new, design doc)

Closes Phase 3 Lane C entry for KNOWLEDGE-CONVERSION-MS0. Remaining:
 - Phase 4 U-KC-E1 — durable memory + wiki + CLAUDE.md pointer doc-reflection
```

## Files touched (5)
- scripts/course-data-router.mjs                     | 232 +++++++++++++
- scripts/lib/course-data-router-lib.mjs             | 367 +++++++++++++++++++++
- scripts/lib/course-data-router-lib.test.mjs        | 359 ++++++++++++++++++++
- state/shared/specs/COURSE-DATA-ROUTING-PIPELINE.md | 258 +++++++++++++++
- 4 files changed, 1216 insertions(+)

## Lessons surfaced in commit body
- lesson — schema-seam bugs).

## Verification
**Scrutiny ledger**: arms A✗ B✗ C✗ for session 

## Cross-references
- Full commit: `git -C H:/prism show cd00120dcd90`
- Milestone envelope: `mcp-server/data/milestones/KNOWLEDGE-CONVERSION-MS0.json`

---
_Auto-distilled by `scripts/distill-session-learnings.mjs` per [[feedback_auto_close_out]] / SYSTEM-VIZ-BRAIN-MS0/U-P1-POST-SHIP-DISTILL._