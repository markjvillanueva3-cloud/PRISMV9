# DOCKER-HOOK-BROKER/U-DHB-P1 — [MAIN] [DOCKER-HOOK-BROKER]/U-DHB-P1 (slot:hotel): pure-core classifier + CLI walker for 602-hook broker compat survey

**Commit:** `d5f3ac82b1bc` · **By:** markjvillanueva3-cloud · **At:** 2026-05-22T18:17:49-05:00
**Tags:** docker-hook-broker, u-dhb-p1, auto-distilled

## Subject
[MAIN] [DOCKER-HOOK-BROKER]/U-DHB-P1 (slot:hotel): pure-core classifier + CLI walker for 602-hook broker compat survey

## Body
```
[MAIN] [DOCKER-HOOK-BROKER]/U-DHB-P1 (slot:hotel): pure-core classifier + CLI walker for 602-hook broker compat survey

Phase-1 SURVEY for U-DOCKER-HOOK-BROKER (Tier-1 hook-broker daemon).
Concrete artifact informing the broker design BEFORE the migration.

Real run output (state/shared/HOOK-BROKER-COMPAT-REPORT.{json,md}):
  602 hooks scanned across .claude/hooks/
  - module-safe        :  78  (13.0%) share in-process
  - mutates-process    : 372  (61.8%) spawn-isolate REQUIRED
  - unknown            : 146  (24.3%) spawn-isolate (default)
  - imports-only       :   5  ( 0.8%) ignore
  - empty              :   1  ( 0.2%) ignore
  - cli-safe-stdin-stdout: 0  ( 0.0%) spawn-cache (none found)

Key finding: only 13% of hooks are in-process-sharable. The Tier-1 broker's
actual cold-start savings ceiling is ~13% of invocations, not 100% as the
original spec assumed. 87% need spawn-isolation due to runtime mutation
(fs writes / spawn / fetch / network) anywhere in source.

Files:
  scripts/lib/hook-broker-classifier.mjs (pure-core ES module)
  scripts/lib/hook-broker-classifier.test.mjs (43 tests, all pass)
  scripts/classify-hooks-for-broker.mjs (CLI walker, atomic writes)
  scripts/classify-hooks-for-broker.test.mjs (16 tests, all pass)
  state/shared/HOOK-BROKER-COMPAT-REPORT.{json,md} (real artifact)

Total: 59/59 tests pass. Per-file scrutiny dispatched 2 parallel agents per
file; lib initial FAIL on 2 P0s+3 P1s, all fixed before next file.

Conservative-by-design: mutation detection runs against raw source text
(NOT top-level stripped) so a hook that calls fs.promises.writeFile inside
an exported async handler still lands in mutates-process. The cost of
misclassification is always more isolation, never less.

Refs: state/shared/specs/2026-05-09-U-DOCKER-HOOK-BROKER.md (parent spec)
```

## Files touched (6)
- scripts/classify-hooks-for-broker.mjs       |  257 ++
- scripts/classify-hooks-for-broker.test.mjs  |  259 ++
- scripts/lib/hook-broker-classifier.mjs      |  355 ++
- scripts/lib/hook-broker-classifier.test.mjs |  426 +++
- state/shared/HOOK-BROKER-COMPAT-REPORT.json | 5183 +++++++++++++++++++++++++++
- 5 files changed, 6480 insertions(+)

## Lessons surfaced in commit body
- till lands in mutates-process. The cost of

## Verification
**Scrutiny ledger**: arms A✗ B✗ C✗ for session 

## Cross-references
- Full commit: `git -C H:/prism show d5f3ac82b1bc`
- Milestone envelope: `mcp-server/data/milestones/DOCKER-HOOK-BROKER.json`

---
_Auto-distilled by `scripts/distill-session-learnings.mjs` per [[feedback_auto_close_out]] / SYSTEM-VIZ-BRAIN-MS0/U-P1-POST-SHIP-DISTILL._