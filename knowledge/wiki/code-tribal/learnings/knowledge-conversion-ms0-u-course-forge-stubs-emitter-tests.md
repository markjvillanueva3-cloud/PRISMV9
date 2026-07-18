# KNOWLEDGE-CONVERSION-MS0/U-COURSE-FORGE-STUBS-EMITTER-TESTS — [MAIN] [KNOWLEDGE-CONVERSION-MS0]/U-COURSE-FORGE-STUBS-EMITTER-TESTS: 13-case CLI test suite

**Commit:** `6ae539960828` · **By:** markjvillanueva3-cloud · **At:** 2026-05-17T10:53:08-05:00
**Tags:** knowledge-conversion-ms0, u-course-forge-stubs-emitter-tests, auto-distilled

## Subject
[MAIN] [KNOWLEDGE-CONVERSION-MS0]/U-COURSE-FORGE-STUBS-EMITTER-TESTS: 13-case CLI test suite

## Body
```
[MAIN] [KNOWLEDGE-CONVERSION-MS0]/U-COURSE-FORGE-STUBS-EMITTER-TESTS: 13-case CLI test suite

Closes the comprehensive-build-enforce gap on the --emit forge-stubs path
shipped in 5d5c363f0e. node:test (scripts/ infra) — hermetic fixture writes
INPUT-shape candidate JSONL (schemaVersion 1.0.0, candidateAssets[]) to a
temp dir and spawnSync's the live CLI.

Coverage (Karpathy R10 — every meaningful path):
- happy path: file emission, JSON mode, dry-run
- filter behavior: --min-relevance >=0.8 filters 0.5+0.7 items
- kind-aware: PascalCase paths (algorithms/<P>.ts, engines/<P>Engine.ts,
  physics/constants.ts for formula)
- REJECT auto-flag: solidworks → REJECT + 'first-party PRISM stack' verbiage
- physics_gate=required: moody-diagram formula
- adversarial: unknown --emit value, --min-relevance < 0, > 1, non-numeric
- regression guard: default mode (no --emit) still produces ledger JSON+MD

Fixture-schema lesson captured: candidate INPUT uses candidateAssets[] +
prismDomains[]; the decisions[] shape I initially used is the OUTPUT
ledger shape, not the input. Wrong fixture surfaced 9/13 failures —
diagnosed via spawnSync stderr capture (router lib threw R12 TypeError
'candidate.candidateAssets must be array'). Schema-read-first lesson
(per Recent regression 2026-05-16 META-tool calculation bugs) applied.

13/13 PASS via node --test in 870ms.

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
```

## Files touched (2)
- scripts/course-data-router.cli.test.mjs | 421 ++++++++++++++++++++++++++++++++
- 1 file changed, 421 insertions(+)

## Lessons surfaced in commit body
- till produces ledger JSON+MD
- lesson captured: candidate INPUT uses candidateAssets[] +
- Wrong fixture surfaced 9/13 failures —

## Verification
**Scrutiny ledger**: arms A✗ B✗ C✗ for session 

## Cross-references
- Full commit: `git -C H:/prism show 6ae539960828`
- Milestone envelope: `mcp-server/data/milestones/KNOWLEDGE-CONVERSION-MS0.json`

---
_Auto-distilled by `scripts/distill-session-learnings.mjs` per [[feedback_auto_close_out]] / SYSTEM-VIZ-BRAIN-MS0/U-P1-POST-SHIP-DISTILL._