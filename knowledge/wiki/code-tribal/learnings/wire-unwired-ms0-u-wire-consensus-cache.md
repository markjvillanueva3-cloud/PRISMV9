# WIRE-UNWIRED-MS0/U-WIRE-CONSENSUS-CACHE — [MAIN] [WIRE-UNWIRED-MS0]/U-WIRE-CONSENSUS-CACHE: wire ConsensusRecallCacheEngine read-only into prism_dev (2 actions)

**Commit:** `a9329377c7e4` · **By:** markjvillanueva3-cloud · **At:** 2026-05-16T23:51:45-05:00
**Tags:** wire-unwired-ms0, u-wire-consensus-cache, auto-distilled

## Subject
[MAIN] [WIRE-UNWIRED-MS0]/U-WIRE-CONSENSUS-CACHE: wire ConsensusRecallCacheEngine read-only into prism_dev (2 actions)

## Body
```
[MAIN] [WIRE-UNWIRED-MS0]/U-WIRE-CONSENSUS-CACHE: wire ConsensusRecallCacheEngine read-only into prism_dev (2 actions)

High-leverage dev infra wire — every consensus fan-out costs ~$0.30 of
Codex/Grok tokens + 30-60s wall time. Cache hits short-circuit the
fan-out by reading the wiki second-brain consensus/<sha8>.md artifacts
that ConsensusObsidianPersistenceEngine writes.

Actions (both read-only, NO write methods exist on this engine):
  - consensus_cache_recall → engine.recall(prompt, {ttlMs?, enforceTtl?, wikiRoot?})
                              Returns {hit:false} or {hit:true, cached:{...}}
  - consensus_cache_score  → composes recall + scoreCached on the server
                              (caller does NOT shuttle CachedConsensus
                              over the wire — pure scalar score returned)

DoS guards in schema:
  - ttlMs hard cap 90 days (positive int)
  - prompt non-empty string
  - wikiRoot non-empty string (override for hermetic tests)

Explicit discriminator pattern: {hit:false} / {hit:true, cached:{...}}
avoids slimResponse stripping null hits silently (memory:
reference_slimresponse_strips_empty_arrays). score=0 on miss also
nullish-coalesced in test (slimResponse strips falsy numbers).

Test suite: 18 cases (6 schema + 2 miss + 5 hit + 4 score + 2 error)
including:
  - Hermetic tmpdir per test (no PRISM-state leak)
  - End-to-end persist → recall round-trip through the wire
  - ROUTING PROOF: wire cached.promptHash == persist().promptHash
    (single-source-of-truth hash function preserved)
  - ROUTING PROOF: wire score within 1e-4 of engine-direct
    scoreCached(recall()) (millisecond ageMs drift accounted for)
  - TTL gate verified both directions (enforce=true & enforce=false)
  - Score composite ordering: accept > review > escalate at same agreement

Pre-wire gate: src/__tests__/ConsensusRecallCacheEngine.test.ts 15/15
PASS unmodified. Combined: 33/33 PASS.

Session running total: 10 backend-dev wires / 39 actions / 10 engines.

🤖 Generated with [Claude Code](https://claude.com/claude-code)

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
```

## Files touched (4)
- .../dispatcher.consensusRecallCache.test.ts        | 336 +++++++++++++++++++++
- mcp-server/src/schemas/devActionSchemas.ts         |  23 ++
- mcp-server/src/tools/dispatchers/devDispatcher.ts  |  38 ++-
- 3 files changed, 396 insertions(+), 1 deletion(-)


## Verification
**Scrutiny ledger**: arms A✗ B✗ C✗ for session 

## Cross-references
- Full commit: `git -C H:/prism show a9329377c7e4`
- Milestone envelope: `mcp-server/data/milestones/WIRE-UNWIRED-MS0.json`

---
_Auto-distilled by `scripts/distill-session-learnings.mjs` per [[feedback_auto_close_out]] / SYSTEM-VIZ-BRAIN-MS0/U-P1-POST-SHIP-DISTILL._