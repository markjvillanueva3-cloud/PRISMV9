# KNOWLEDGE-CONVERSION-MS0/U-COURSE-FORGE-STUBS-EMITTER — [MAIN] [KNOWLEDGE-CONVERSION-MS0]/U-COURSE-FORGE-STUBS-EMITTER: bulk auto-emit /forge proposal stubs

**Commit:** `5d5c363f0efa` · **By:** markjvillanueva3-cloud · **At:** 2026-05-17T10:33:11-05:00
**Tags:** knowledge-conversion-ms0, u-course-forge-stubs-emitter, auto-distilled

## Subject
[MAIN] [KNOWLEDGE-CONVERSION-MS0]/U-COURSE-FORGE-STUBS-EMITTER: bulk auto-emit /forge proposal stubs

## Body
```
[MAIN] [KNOWLEDGE-CONVERSION-MS0]/U-COURSE-FORGE-STUBS-EMITTER: bulk auto-emit /forge proposal stubs

Extends scripts/course-data-router.mjs with --emit forge-stubs mode that
generates COURSE-FORGE-STUBS.md (+ HTML twin) — operator-actionable proposal
bundle for the full FORGE-QUEUE inventory.

Companion to COURSE-FORGE-PROPOSALS.md (hand-curated P1-P10): this is the
bulk emitter the prior doc named as 'NOT yet implemented; the next /forge
unit'. Strictly additive — existing ledger emission path unchanged.

New flags:
- --emit forge-stubs       enable bulk-stub mode
- --min-relevance N        filter to mfg_relevance >= N (0..1, default 0)
- --out-stubs PATH         override output path
- --json / --dry-run       composable with new mode

Per-stub emit shape:
- proposed_path (kind-aware: algorithms/<Pascal>.ts, engines/<Pascal>Engine.ts,
  physics/constants.ts for formula)
- dispatcher_action (operator-select scaffold)
- physics_gate=required for formula kind
- dedup_preflight name-similarity grep against algorithms/+engines/ inventory
- REJECT auto-flag for tier-1 CAM bridges + first-party stack
- /forge-triple action line

First run (--min-relevance 0.6): 62 stubs surfaced (658 lines).

Advisory + mustHumanVerify. Hard gates spelled out at doc head.
Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
```

## Files touched (4)
- scripts/course-data-router.mjs             | 193 ++++++++-
- state/shared/specs/COURSE-FORGE-STUBS.html | 245 +++++++++++
- state/shared/specs/COURSE-FORGE-STUBS.md   | 658 +++++++++++++++++++++++++++++
- 3 files changed, 1095 insertions(+), 1 deletion(-)


## Verification
**Scrutiny ledger**: arms A✗ B✗ C✗ for session 

## Cross-references
- Full commit: `git -C H:/prism show 5d5c363f0efa`
- Milestone envelope: `mcp-server/data/milestones/KNOWLEDGE-CONVERSION-MS0.json`

---
_Auto-distilled by `scripts/distill-session-learnings.mjs` per [[feedback_auto_close_out]] / SYSTEM-VIZ-BRAIN-MS0/U-P1-POST-SHIP-DISTILL._