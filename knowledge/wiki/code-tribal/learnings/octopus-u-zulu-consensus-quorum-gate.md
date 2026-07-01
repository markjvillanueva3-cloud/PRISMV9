# OCTOPUS/U-ZULU-CONSENSUS-QUORUM-GATE — [MAIN-FORCE] [OCTOPUS]/U-ZULU-CONSENSUS-QUORUM-GATE (slot:zulu): don't trust a single-voice octopus run as a real consensus on safety-critical edits (R12 -- never overclaim)

**Commit:** `4e0c2c2a4562` · **By:** markjvillanueva3-cloud · **At:** 2026-06-24T20:20:27-05:00
**Tags:** octopus, u-zulu-consensus-quorum-gate, auto-distilled

## Subject
[MAIN-FORCE] [OCTOPUS]/U-ZULU-CONSENSUS-QUORUM-GATE (slot:zulu): don't trust a single-voice octopus run as a real consensus on safety-critical edits (R12 -- never overclaim)

## Body
```
[MAIN-FORCE] [OCTOPUS]/U-ZULU-CONSENSUS-QUORUM-GATE (slot:zulu): don't trust a single-voice octopus run as a real consensus on safety-critical edits (R12 -- never overclaim)

GAP (safety-adjacent): auto-consensus-critical-edit.mjs gates edits to CRITICAL
files (physics constants, dispatcher schemas, S(x)/Tolerance validators) by recalling
a cached consensus run. The octopus drain (consensus-queue-drain.mjs) gracefully
DEGRADES to a single voice under GPU contention (documented + intended), so 1-voter
runs DO land in the cache -- recorded as `recommendation: accept, agreement_score: 1`,
indistinguishable from a real 2-voice consensus. Live evidence: ledger 26e979b4
(2026-06-25, a cadDispatcher.ts edit) = accept/agreement-1 from
model_voters:["qwen2.5-coder:32b"] ALONE. A single voice "agrees with itself" -- the
consumer then surfaced "consensus cache hit: rec=accept" = false "consensus approved"
confidence on a safety-critical edit. The octopus LIVE-RECORD path already enforces
requireMinVoices:2 (R12 fail-loud); the DRAIN-fed critical-edit cache did not.

FIX (one-file, at the trust boundary; clone-don't-fork of requireMinVoices:2):
- voterCount(model_voters): distinct-voice count, fail-soft 0 on junk/empty/non-array
  (an unreadable voter list is NEVER a quorum).
- main() cache-hit gate: only an accept/review backed by >= MIN_CONSENSUS_VOICES (2,
  env PRISM_CONSENSUS_MIN_VOICES) is surfaced as an authoritative "consensus cache hit"
  (now also prints voters=N). A <2-voice accept/review FALLS THROUGH to the cache-miss
  path -> re-queues a proper multi-model fan-out + an honest "NOT a real consensus,
  treat as UNREVIEWED" notice. ESCALATE still forces `ask` regardless of voice count
  (a lone voice erring toward MORE scrutiny is safe-direction). Never blocks an edit.

VALIDATE: 9/9 tests (+5: voterCount parse/fail-soft incl. a real bug the test caught --
non-bracketed garbage was miscounted as 1, fixed to require brackets; + 3 E2E driving
the hook over stdin: single-voice accept -> degraded+re-queue, 2-voice accept ->
authoritative, single-voice escalate -> ask). Reversible: PRISM_CONSENSUS_MIN_VOICES=1
restores the old behavior. Doesn't change the drain/recording -- pure consumer-side
quorum enforcement.
```

## Files touched (3)
- .claude/hooks/auto-consensus-critical-edit.mjs      | 60 ++++++++++++++++++++++++++++++++++++++++++++++++++++++------
- .claude/hooks/auto-consensus-critical-edit.test.mjs | 71 ++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++-
- 2 files changed, 124 insertions(+), 7 deletions(-)

## Lessons surfaced in commit body
- till forces `ask` regardless of voice count

## Verification
**Scrutiny ledger**: arms A✗ B✗ C✗ for session 

## Cross-references
- Full commit: `git -C H:/prism show 4e0c2c2a4562`
- Milestone envelope: `mcp-server/data/milestones/OCTOPUS.json`

---
_Auto-distilled by `scripts/distill-session-learnings.mjs` per [[feedback_auto_close_out]] / SYSTEM-VIZ-BRAIN-MS0/U-P1-POST-SHIP-DISTILL._